const pool = require('../config/database');

class PlanningPrevisionnelController {
    /**
     * Créer ou mettre à jour la date de départ en congés pour un agent
     * POST /api/planning-previsionnel
     */
    static async createOrUpdate(req, res) {
        try {
            const { id_agent, annee, date_depart_conges, type_conge = 'individual' } = req.body;

            // Validation
            if (!id_agent || !annee || !date_depart_conges) {
                return res.status(400).json({
                    success: false,
                    error: 'Les champs id_agent, annee et date_depart_conges sont requis'
                });
            }

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;
            
            // Vérifier que l'agent existe et appartient au même ministère
            let agentQuery = 'SELECT id, id_ministere FROM agents WHERE id = $1';
            const agentParams = [id_agent];
            
            if (userMinistereId && req.user.role !== 'super_admin') {
                agentQuery += ' AND id_ministere = $2';
                agentParams.push(userMinistereId);
            }
            
            const agentCheck = await pool.query(agentQuery, agentParams);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé ou n\'appartient pas à votre ministère'
                });
            }

            // Vérifier si l'entrée agent_conges existe, sinon la créer
            const congesCheck = await pool.query(
                'SELECT id FROM agent_conges WHERE id_agent = $1 AND annee = $2',
                [id_agent, annee]
            );

            if (congesCheck.rows.length === 0) {
                // Créer l'entrée agent_conges avec les valeurs par défaut
                await pool.query(
                    `INSERT INTO agent_conges (id_agent, annee, jours_pris, jours_alloues, jours_restants, jours_reportes, date_depart_conges, type_conge)
                     VALUES ($1, $2, 0, 30, 30, 0, $3, $4)
                     ON CONFLICT (id_agent, annee) DO UPDATE SET date_depart_conges = $3, type_conge = $4`,
                    [id_agent, annee, date_depart_conges, type_conge]
                );
            } else {
                // Mettre à jour la date de départ et le type
                await pool.query(
                    'UPDATE agent_conges SET date_depart_conges = $1, type_conge = $2 WHERE id_agent = $3 AND annee = $4',
                    [date_depart_conges, type_conge, id_agent, annee]
                );
            }

            // Récupérer l'entrée mise à jour
            const result = await pool.query(
                `SELECT 
                    ac.id,
                    ac.id_agent,
                    ac.annee,
                    ac.date_depart_conges,
                    ac.jours_pris,
                    ac.jours_alloues,
                    ac.jours_restants,
                    a.nom,
                    a.prenom,
                    a.matricule
                FROM agent_conges ac
                JOIN agents a ON ac.id_agent = a.id
                WHERE ac.id_agent = $1 AND ac.annee = $2`,
                [id_agent, annee]
            );

            // Vérifier si une notification doit être créée (si la date est exactement dans 1 mois = 30 jours)
            const dateDepart = new Date(date_depart_conges);
            dateDepart.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculer le nombre exact de jours restants
            const joursRestants = Math.ceil((dateDepart - today) / (1000 * 60 * 60 * 24));
            
            // Créer la notification seulement si on est exactement à 30 jours (±1 jour de tolérance)
            if (joursRestants >= 29 && joursRestants <= 31) {
                try {
                    // Vérifier si une notification existe déjà
                    const checkNotification = await pool.query(
                        `SELECT id FROM notifications_demandes 
                         WHERE id_agent_destinataire = $1 
                           AND type_notification = 'conges_previsionnel'
                           AND message LIKE $2
                           AND date_creation >= CURRENT_DATE - INTERVAL '7 days'`,
                        [
                            id_agent,
                            `%${date_depart_conges}%`
                        ]
                    );
                    
                    if (checkNotification.rows.length === 0) {
                        const dateFormatee = dateDepart.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        
                        const titre = 'Rappel : Départ en congés prévu dans 1 mois';
                        const message = `Votre départ en congés est prévu le ${dateFormatee} (dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}). Veuillez vous préparer en conséquence.`;
                        
                        await pool.query(
                            `INSERT INTO notifications_demandes (
                                id_demande,
                                id_agent_destinataire,
                                type_notification,
                                titre,
                                message,
                                lu,
                                date_creation
                            ) VALUES (NULL, $1, 'conges_previsionnel', $2, $3, false, CURRENT_TIMESTAMP)`,
                            [id_agent, titre, message]
                        );
                        
                        console.log(`✅ Notification de congés prévisionnel créée pour l'agent ${id_agent}`);
                    }
                } catch (notifError) {
                    console.error('Erreur lors de la création de la notification:', notifError);
                    // Ne pas faire échouer la requête principale si la notification échoue
                }
            }

            res.json({
                success: true,
                message: 'Date de départ en congés enregistrée avec succès',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la date de départ en congés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la sauvegarde'
            });
        }
    }

    /**
     * Créer ou mettre à jour la date de départ en congés pour plusieurs agents (congés groupés)
     * POST /api/planning-previsionnel/grouped
     */
    static async createOrUpdateGrouped(req, res) {
        try {
            const { agents, annee, date_depart_conges } = req.body;
            const type_conge = 'grouped';

            // Validation
            if (!agents || !Array.isArray(agents) || agents.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'La liste des agents est requise'
                });
            }

            if (!annee || !date_depart_conges) {
                return res.status(400).json({
                    success: false,
                    error: 'Les champs annee et date_depart_conges sont requis'
                });
            }

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;

            const results = [];
            const errors = [];

            // Traiter chaque agent
            for (const agentId of agents) {
                try {
                    // Vérifier que l'agent existe et appartient au même ministère
                    let agentQuery = 'SELECT id, id_ministere FROM agents WHERE id = $1';
                    const agentParams = [agentId];
                    
                    if (userMinistereId && req.user.role !== 'super_admin') {
                        agentQuery += ' AND id_ministere = $2';
                        agentParams.push(userMinistereId);
                    }
                    
                    const agentCheck = await pool.query(agentQuery, agentParams);
                    if (agentCheck.rows.length === 0) {
                        errors.push({ agentId, error: 'Agent non trouvé ou n\'appartient pas à votre ministère' });
                        continue;
                    }

                    // Vérifier si l'entrée agent_conges existe, sinon la créer
                    const congesCheck = await pool.query(
                        'SELECT id FROM agent_conges WHERE id_agent = $1 AND annee = $2',
                        [agentId, annee]
                    );

                    if (congesCheck.rows.length === 0) {
                        // Créer l'entrée agent_conges avec les valeurs par défaut
                        await pool.query(
                            `INSERT INTO agent_conges (id_agent, annee, jours_pris, jours_alloues, jours_restants, jours_reportes, date_depart_conges, type_conge)
                             VALUES ($1, $2, 0, 30, 30, 0, $3, $4)
                             ON CONFLICT (id_agent, annee) DO UPDATE SET date_depart_conges = $3, type_conge = $4`,
                            [agentId, annee, date_depart_conges, type_conge]
                        );
                    } else {
                        // Mettre à jour la date de départ et le type
                        await pool.query(
                            'UPDATE agent_conges SET date_depart_conges = $1, type_conge = $2 WHERE id_agent = $3 AND annee = $4',
                            [date_depart_conges, type_conge, agentId, annee]
                        );
                    }

                    // Récupérer l'entrée mise à jour
                    const result = await pool.query(
                        `SELECT 
                            ac.id,
                            ac.id_agent,
                            ac.annee,
                            ac.date_depart_conges,
                            a.nom,
                            a.prenom,
                            a.matricule
                        FROM agent_conges ac
                        JOIN agents a ON ac.id_agent = a.id
                        WHERE ac.id_agent = $1 AND ac.annee = $2`,
                        [agentId, annee]
                    );

                    if (result.rows.length > 0) {
                        results.push(result.rows[0]);
                        
                        // Vérifier si une notification doit être créée (si la date est exactement dans 1 mois = 30 jours)
                        const dateDepart = new Date(date_depart_conges);
                        dateDepart.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Calculer le nombre exact de jours restants
                        const joursRestants = Math.ceil((dateDepart - today) / (1000 * 60 * 60 * 24));
                        
                        // Créer la notification seulement si on est exactement à 30 jours (±1 jour de tolérance)
                        if (joursRestants >= 29 && joursRestants <= 31) {
                            try {
                                // Vérifier si une notification existe déjà
                                const checkNotification = await pool.query(
                                    `SELECT id FROM notifications_demandes 
                                     WHERE id_agent_destinataire = $1 
                                       AND type_notification = 'conges_previsionnel'
                                       AND message LIKE $2
                                       AND date_creation >= CURRENT_DATE - INTERVAL '7 days'`,
                                    [
                                        agentId,
                                        `%${date_depart_conges}%`
                                    ]
                                );
                                
                                if (checkNotification.rows.length === 0) {
                                    const dateFormatee = dateDepart.toLocaleDateString('fr-FR', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                    
                                    const titre = 'Rappel : Départ en congés prévu dans 1 mois';
                                    const message = `Votre départ en congés est prévu le ${dateFormatee} (dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}). Veuillez vous préparer en conséquence.`;
                                    
                                    await pool.query(
                                        `INSERT INTO notifications_demandes (
                                            id_demande,
                                            id_agent_destinataire,
                                            type_notification,
                                            titre,
                                            message,
                                            lu,
                                            date_creation
                                        ) VALUES (NULL, $1, 'conges_previsionnel', $2, $3, false, CURRENT_TIMESTAMP)`,
                                        [agentId, titre, message]
                                    );
                                    
                                    console.log(`✅ Notification de congés prévisionnel créée pour l'agent ${agentId}`);
                                }
                            } catch (notifError) {
                                console.error(`Erreur lors de la création de la notification pour l'agent ${agentId}:`, notifError);
                                // Ne pas faire échouer la requête principale si la notification échoue
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Erreur pour l'agent ${agentId}:`, error);
                    errors.push({ agentId, error: error.message });
                }
            }

            res.json({
                success: true,
                message: `${results.length} agent(s) programmé(s) avec succès`,
                data: results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde groupée:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la sauvegarde groupée'
            });
        }
    }

    /**
     * Récupérer la date de départ en congés pour un agent et une année
     * GET /api/planning-previsionnel/agent/:agentId/annee/:annee
     */
    static async getByAgentAndYear(req, res) {
        try {
            const { agentId, annee } = req.params;

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;

            let query = `
                SELECT 
                    ac.id,
                    ac.id_agent,
                    ac.annee,
                    ac.date_depart_conges,
                    ac.jours_pris,
                    ac.jours_alloues,
                    ac.jours_restants,
                    a.nom,
                    a.prenom,
                    a.matricule
                FROM agent_conges ac
                JOIN agents a ON ac.id_agent = a.id
                WHERE ac.id_agent = $1 AND ac.annee = $2
            `;

            const params = [agentId, annee];

            // Filtrer par ministère si l'utilisateur n'est pas super_admin
            if (userMinistereId && req.user.role !== 'super_admin') {
                query += ' AND a.id_ministere = $3';
                params.push(userMinistereId);
            }

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Aucune donnée trouvée pour cet agent et cette année'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la récupération:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la récupération'
            });
        }
    }

    /**
     * Récupérer toutes les dates de départ en congés pour une année donnée
     * GET /api/planning-previsionnel/annee/:annee
     */
    static async getByYear(req, res) {
        try {
            const { annee } = req.params;
            const { direction_id, service_id, type_conge, id_direction, id_direction_generale, id_sous_direction } = req.query;

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;
            
            // Récupérer id_direction, id_direction_generale et id_sous_direction depuis query params ou depuis l'agent
            let finalIdDirection = id_direction || direction_id;
            let finalIdDirectionGenerale = id_direction_generale;
            let finalIdSousDirection = id_sous_direction;
            
            // Normaliser le rôle de l'utilisateur
            const userRoleRaw = (req.user?.role || '').toLowerCase();
            const userRole = userRoleRaw.replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');
            const isDirecteurGeneral = (userRole === 'directeur_general') || (userRole === 'directeur_generale') || (userRoleRaw.includes('directeur') && (userRoleRaw.includes('general') || userRoleRaw.includes('generale')));
            const isInspecteurGeneral = userRole === 'inspecteur_general';
            
            // Si l'utilisateur est directeur, directeur central, directeur général, inspecteur général, cabinet ou sous-directeur, récupérer sa direction/direction générale/sous-direction
            if (req.user && req.user.id_agent && (!finalIdDirection || !finalIdDirectionGenerale || !finalIdSousDirection)) {
                if (['directeur', 'directeur_central', 'sous_directeur', 'sous-directeur', 'dir_cabinet', 'chef_cabinet', 'inspecteur_general', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation'].includes(userRole) || isDirecteurGeneral) {
                    const userAgentQuery = await pool.query(
                        'SELECT id_direction, id_direction_generale, id_sous_direction FROM agents WHERE id = $1',
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userAgent = userAgentQuery.rows[0];
                        if ((userRole === 'dir_cabinet' || userRole === 'chef_cabinet') && userAgent.id_direction_generale) {
                            finalIdDirectionGenerale = finalIdDirectionGenerale || userAgent.id_direction_generale;
                        } else if (isDirecteurGeneral || isInspecteurGeneral) {
                            // Directeur général & Inspecteur général : utiliser systématiquement la direction générale
                            let dgId = userAgent.id_direction_generale;
                            if (dgId == null && userAgent.id_direction != null) {
                                const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                                if (dirRow.rows.length > 0) dgId = dirRow.rows[0].id_direction_generale;
                            }
                            if (dgId != null) finalIdDirectionGenerale = finalIdDirectionGenerale || dgId;
                        } else if ((userRole === 'directeur' || userRole === 'directeur_central' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation') && userAgent.id_direction) {
                            finalIdDirection = finalIdDirection || userAgent.id_direction;
                        } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && userAgent.id_sous_direction) {
                            finalIdSousDirection = finalIdSousDirection || userAgent.id_sous_direction;
                            if (userAgent.id_direction) {
                                finalIdDirection = finalIdDirection || userAgent.id_direction;
                            }
                        }
                    }
                }
            }

            let query = `
                SELECT 
                    ac.id,
                    ac.id_agent,
                    ac.annee,
                    ac.date_depart_conges,
                    ac.jours_pris,
                    ac.jours_alloues,
                    ac.jours_restants,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    srv.libelle as service_libelle,
                    ea_actuel.emploi_libele as emploi_actuel_libele
                FROM agent_conges ac
                JOIN agents a ON ac.id_agent = a.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services srv ON a.id_service = srv.id
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                WHERE ac.annee = $1 AND ac.date_depart_conges IS NOT NULL
            `;

            const params = [annee];

            // Filtrer par ministère si l'utilisateur n'est pas super_admin
            if (userMinistereId && req.user.role !== 'super_admin') {
                query += ' AND a.id_ministere = $' + (params.length + 1);
                params.push(userMinistereId);
            }

            // Filtrer par direction générale si fourni
            // Directeur général et cabinet : uniquement les agents directement rattachés à la DG
            // Inspecteur général : tous les agents de la DG (y compris directions / sous-directions)
            if (finalIdDirectionGenerale) {
                query += ' AND a.id_direction_generale = $' + (params.length + 1);
                params.push(finalIdDirectionGenerale);
                if (!isInspecteurGeneral) {
                    query += ' AND a.id_direction IS NULL AND a.id_sous_direction IS NULL';
                }
            }

            // Utiliser finalIdDirection si fourni (et pas déjà filtré par direction générale)
            if (finalIdDirection && !finalIdDirectionGenerale) {
                query += ' AND a.id_direction = $' + (params.length + 1);
                params.push(finalIdDirection);
                // Directeur central : uniquement les agents directement rattachés à la direction (sans sous-direction)
                if (userRole === 'directeur_central') {
                    query += ' AND a.id_sous_direction IS NULL';
                }
            }

            // Filtrer par sous-direction si fourni
            if (finalIdSousDirection) {
                query += ' AND a.id_sous_direction = $' + (params.length + 1);
                params.push(finalIdSousDirection);
            }

            if (service_id) {
                query += ' AND a.id_service = $' + (params.length + 1);
                params.push(service_id);
            }

            // Filtrer par type de congé si spécifié
            if (type_conge) {
                // Pour les congés groupés, inclure aussi les enregistrements avec type_conge NULL
                // (pour compatibilité avec les données existantes créées avant l'ajout de la colonne)
                if (type_conge === 'grouped') {
                    query += ' AND (ac.type_conge = $' + (params.length + 1) + ' OR ac.type_conge IS NULL)';
                } else if (type_conge === 'individual') {
                    // Pour les congés individuels, afficher UNIQUEMENT ceux avec type_conge = 'individual'
                    // Ne pas inclure les NULL car ils pourraient être des congés groupés non encore classés
                    query += ' AND ac.type_conge = $' + (params.length + 1);
                } else {
                    query += ' AND ac.type_conge = $' + (params.length + 1);
                }
                params.push(type_conge);
            }

            query += ' ORDER BY ac.date_depart_conges, a.nom, a.prenom';

            console.log('🔍 Requête SQL getByYear:', query);
            console.log('🔍 Paramètres:', params);
            console.log('🔍 Type de congé recherché:', type_conge);

            // Requête de diagnostic pour voir ce qui existe dans la base
            const diagnosticQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN ac.type_conge = 'grouped' THEN 1 END) as grouped_count,
                    COUNT(CASE WHEN ac.type_conge = 'individual' THEN 1 END) as individual_count,
                    COUNT(CASE WHEN ac.type_conge IS NULL THEN 1 END) as null_count,
                    COUNT(CASE WHEN ac.date_depart_conges IS NOT NULL THEN 1 END) as with_date_count
                FROM agent_conges ac
                JOIN agents a ON ac.id_agent = a.id
                WHERE ac.annee = $1 AND ac.date_depart_conges IS NOT NULL
            `;
            
            const diagnosticResult = await pool.query(diagnosticQuery, [annee]);
            console.log('🔍 Diagnostic - Données dans la base:', diagnosticResult.rows[0]);

            const result = await pool.query(query, params);

            console.log('✅ Résultats trouvés:', result.rows.length);
            if (result.rows.length > 0) {
                console.log('🔍 Premier résultat:', result.rows[0]);
            } else {
                console.log('⚠️ Aucun résultat trouvé avec les critères suivants:');
                console.log('   - Année:', annee);
                console.log('   - Type de congé:', type_conge || 'tous');
                console.log('   - Ministère:', userMinistereId || 'tous (super_admin)');
            }

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Message d\'erreur:', error.message);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la récupération',
                details: error.message || 'Erreur inconnue'
            });
        }
    }

    /**
     * Vérifier et créer des notifications pour les agents dont la date de départ en congés est exactement dans 1 mois (30 jours)
     * Cette fonction peut être appelée périodiquement (cron job) ou manuellement
     * GET /api/planning-previsionnel/verifier-notifications
     */
    static async verifierEtCreerNotifications(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculer la date exactement dans 30 jours (1 mois)
            const dateDans30Jours = new Date(today);
            dateDans30Jours.setDate(dateDans30Jours.getDate() + 30);
            dateDans30Jours.setHours(23, 59, 59, 999);
            
            console.log('🔍 Vérification des notifications de congés prévisionnels');
            console.log('📅 Date aujourd\'hui:', today.toISOString().split('T')[0]);
            console.log('📅 Date dans exactement 30 jours:', dateDans30Jours.toISOString().split('T')[0]);
            
            // Récupérer tous les agents avec une date de départ en congés exactement dans 30 jours (±1 jour de tolérance)
            const dateMin = new Date(dateDans30Jours);
            dateMin.setDate(dateMin.getDate() - 1);
            dateMin.setHours(0, 0, 0, 0);
            
            const dateMax = new Date(dateDans30Jours);
            dateMax.setDate(dateMax.getDate() + 1);
            dateMax.setHours(23, 59, 59, 999);
            
            const query = `
                SELECT 
                    ac.id_agent,
                    ac.annee,
                    ac.date_depart_conges,
                    a.nom,
                    a.prenom,
                    a.matricule
                FROM agent_conges ac
                JOIN agents a ON ac.id_agent = a.id
                WHERE ac.date_depart_conges IS NOT NULL
                    AND ac.date_depart_conges >= $1
                    AND ac.date_depart_conges <= $2
                    AND ac.date_depart_conges >= CURRENT_DATE
            `;
            
            const result = await pool.query(query, [
                dateMin.toISOString().split('T')[0],
                dateMax.toISOString().split('T')[0]
            ]);
            
            console.log(`✅ ${result.rows.length} agent(s) trouvé(s) avec une date de départ dans environ 30 jours`);
            
            const notificationsCreees = [];
            const notificationsExistantDeja = [];
            
            for (const agent of result.rows) {
                try {
                    // Calculer le nombre exact de jours restants
                    const dateDepart = new Date(agent.date_depart_conges);
                    dateDepart.setHours(0, 0, 0, 0);
                    const joursRestants = Math.ceil((dateDepart - today) / (1000 * 60 * 60 * 24));
                    
                    // Créer la notification seulement si on est exactement à 30 jours (±1 jour de tolérance)
                    if (joursRestants < 29 || joursRestants > 31) {
                        continue;
                    }
                    
                    // Vérifier si une notification existe déjà pour cet agent et cette date
                    const checkNotification = await pool.query(
                        `SELECT id FROM notifications_demandes 
                         WHERE id_agent_destinataire = $1 
                           AND type_notification = 'conges_previsionnel'
                           AND message LIKE $2
                           AND date_creation >= CURRENT_DATE - INTERVAL '7 days'`,
                        [
                            agent.id_agent,
                            `%${agent.date_depart_conges.toISOString().split('T')[0]}%`
                        ]
                    );
                    
                    if (checkNotification.rows.length > 0) {
                        notificationsExistantDeja.push({
                            agent_id: agent.id_agent,
                            nom: agent.nom,
                            prenom: agent.prenom,
                            date_depart: agent.date_depart_conges,
                            jours_restants: joursRestants
                        });
                        continue;
                    }
                    
                    // Formater la date de départ
                    const dateFormatee = dateDepart.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    // Créer la notification
                    const titre = 'Rappel : Départ en congés prévu dans 1 mois';
                    const message = `Votre départ en congés est prévu le ${dateFormatee} (dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}). Veuillez vous préparer en conséquence.`;
                    
                    const insertQuery = `
                        INSERT INTO notifications_demandes (
                            id_demande,
                            id_agent_destinataire,
                            type_notification,
                            titre,
                            message,
                            lu,
                            date_creation
                        ) VALUES (NULL, $1, 'conges_previsionnel', $2, $3, false, CURRENT_TIMESTAMP)
                        RETURNING id
                    `;
                    
                    const insertResult = await pool.query(insertQuery, [
                        agent.id_agent,
                        titre,
                        message
                    ]);
                    
                    notificationsCreees.push({
                        id: insertResult.rows[0].id,
                        agent_id: agent.id_agent,
                        nom: agent.nom,
                        prenom: agent.prenom,
                        date_depart: agent.date_depart_conges,
                        jours_restants: joursRestants
                    });
                    
                    console.log(`✅ Notification créée pour ${agent.nom} ${agent.prenom} (${agent.matricule}) - Départ le ${agent.date_depart_conges.toISOString().split('T')[0]} - Dans ${joursRestants} jours`);
                } catch (error) {
                    console.error(`❌ Erreur lors de la création de la notification pour l'agent ${agent.id_agent}:`, error);
                }
            }
            
            res.json({
                success: true,
                message: `${notificationsCreees.length} notification(s) créée(s), ${notificationsExistantDeja.length} notification(s) existaient déjà`,
                data: {
                    notifications_creees: notificationsCreees.length,
                    notifications_existantes: notificationsExistantDeja.length,
                    details: {
                        creees: notificationsCreees,
                        existantes: notificationsExistantDeja
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la vérification des notifications',
                details: error.message
            });
        }
    }

    /**
     * Récupérer les agents en congés groupés par direction, sous-direction et service
     * Un agent est en congés si :
     * - Agent simple : demande validée par DRH
     * - DRH, directeur, sous directeur, directeur generale, directeur centrale : validée par Directeur de Cabinet
     * - Directeur de Cabinet, Chef de Cabinet : validée par Ministre
     * - L'agent reste en congés tant qu'il n'a pas fait une demande de reprise de service validée
     * GET /api/planning-previsionnel/rapport-organisation/:annee
     */
    static async getRapportParOrganisation(req, res) {
        try {
            const { annee } = req.params;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;
            
            // Récupérer id_direction, id_sous_direction et id_direction_generale depuis query params ou depuis l'agent de l'utilisateur
            let idDirection = req.query.id_direction;
            let idSousDirection = req.query.id_sous_direction;
            let idDirectionGenerale = req.query.id_direction_generale;
            
            const userRoleRaw = (req.user?.role || '').toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');
            const isDirecteurGeneral = userRoleRaw === 'directeur_general' || userRoleRaw === 'directeur_generale' || (userRoleRaw.includes('directeur') && (userRoleRaw.includes('general') || userRoleRaw.includes('generale')));
            const isCabinet = userRoleRaw === 'dir_cabinet' || userRoleRaw === 'chef_cabinet' || userRoleRaw === 'directeur_de_cabinet' || userRoleRaw === 'chef_de_cabinet';
            const isInspecteurGeneral = userRoleRaw === 'inspecteur_general';
            
            if (req.user && req.user.id_agent) {
                const userAgentQuery = await pool.query(
                    'SELECT id_direction, id_sous_direction, id_direction_generale FROM agents WHERE id = $1',
                    [req.user.id_agent]
                );
                if (userAgentQuery.rows.length > 0) {
                    const userAgent = userAgentQuery.rows[0];
                    // Cabinet, directeur général ou inspecteur général : filtrer par leur DG (id_direction_generale)
                    if ((isDirecteurGeneral || isCabinet || isInspecteurGeneral) && (userAgent.id_direction_generale || userAgent.id_direction)) {
                        if (!idDirectionGenerale) {
                            idDirectionGenerale = userAgent.id_direction_generale;
                            if (!idDirectionGenerale && userAgent.id_direction) {
                                const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                                if (dirRow.rows.length > 0 && dirRow.rows[0].id_direction_generale != null) {
                                    idDirectionGenerale = dirRow.rows[0].id_direction_generale;
                                }
                            }
                            if (!idDirectionGenerale && req.user.id_direction_generale != null) {
                                idDirectionGenerale = req.user.id_direction_generale;
                            }
                        }
                    }
                    // Directeur / directeur des services extérieurs / directeur central / gestionnaire_du_patrimoine / president_du_fond / responsble_cellule_de_passation : leur direction uniquement
                    if ((userRoleRaw === 'directeur' || userRoleRaw === 'directeur_service_exterieur' || userRoleRaw === 'directeur_central' || userRoleRaw === 'gestionnaire_du_patrimoine' || userRoleRaw === 'president_du_fond' || userRoleRaw === 'responsble_cellule_de_passation') && userAgent.id_direction && !idDirectionGenerale) {
                        idDirection = idDirection || userAgent.id_direction;
                    }
                    // Sous-directeur : leur sous-direction uniquement
                    if ((userRoleRaw === 'sous_directeur' || userRoleRaw === 'sous-directeur') && userAgent.id_sous_direction && !idDirectionGenerale) {
                        idSousDirection = idSousDirection || userAgent.id_sous_direction;
                        if (userAgent.id_direction) idDirection = idDirection || userAgent.id_direction;
                    }
                }
            }

            // Requête pour récupérer les agents en congés selon les règles de validation
            let query = `
                WITH agents_roles AS (
                    -- Récupérer le rôle de chaque agent
                    SELECT DISTINCT
                        a.id as id_agent,
                        COALESCE(LOWER(r.nom), 'agent') as role_agent
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                ),
                reprises_validees AS (
                    -- Récupérer les agents qui ont une demande de reprise de service validée
                    SELECT DISTINCT
                        d2.id_agent
                    FROM demandes d2
                    JOIN agents_roles ar2 ON d2.id_agent = ar2.id_agent
                    WHERE d2.type_demande IN ('reprise_service', 'certificat_reprise_service', 'reprise', 'certificat_reprise')
                        AND d2.date_debut <= CURRENT_DATE
                        AND d2.status != 'rejete'
                        AND (
                            -- Agent simple : validé par DRH
                            (ar2.role_agent = 'agent' 
                             AND (d2.niveau_evolution_demande = 'valide_par_drh' 
                                  OR d2.statut_drh = 'approuve'
                                  OR (d2.status = 'approuve' AND d2.niveau_actuel = 'finalise')))
                            OR
                            -- DRH, directeur, etc. : validé par Directeur de Cabinet
                            (ar2.role_agent IN ('drh', 'directeur', 'sous_directeur', 'directeur_general', 'directeur_central', 'directeur_generale', 'directeur_centrale')
                             AND (d2.niveau_evolution_demande = 'valide_par_dir_cabinet' 
                                  OR d2.statut_dir_cabinet = 'approuve'))
                            OR
                            -- Directeur de Cabinet, Chef de Cabinet : validé par Ministre
                            (ar2.role_agent IN ('dir_cabinet', 'directeur_de_cabinet', 'chef_cabinet', 'chef_de_cabinet')
                             AND (d2.niveau_evolution_demande = 'valide_par_ministre' 
                                  OR d2.statut_ministre = 'approuve'))
                        )
                ),
                agents_en_conges AS (
                    -- Récupérer les agents en congés validés (inclure id_direction_generale pour filtrage direction générale / cabinet)
                    SELECT DISTINCT
                        d.id_agent,
                        d.date_debut,
                        d.date_fin,
                        d.type_demande,
                        d.status,
                        d.niveau_evolution_demande,
                        a.nom,
                        a.prenom,
                        a.matricule,
                        a.id_direction,
                        a.id_sous_direction,
                        a.id_service,
                        a.id_direction_generale,
                        COALESCE(ar.role_agent, 'agent') as role_agent
                    FROM demandes d
                    JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN agents_roles ar ON a.id = ar.id_agent
                    WHERE d.type_demande IN ('conges', 'absence', 'conge')
                        AND d.date_debut <= CURRENT_DATE
                        AND d.status != 'rejete'
                        AND (
                            -- Agent simple : validé par DRH
                            (COALESCE(ar.role_agent, 'agent') = 'agent' 
                             AND (d.niveau_evolution_demande = 'valide_par_drh' 
                                  OR d.statut_drh = 'approuve'
                                  OR (d.status = 'approuve' AND d.niveau_actuel = 'finalise')))
                            OR
                            -- DRH, directeur, sous directeur, directeur generale, directeur centrale : validé par Directeur de Cabinet
                            (COALESCE(ar.role_agent, 'agent') IN ('drh', 'directeur', 'sous_directeur', 'directeur_general', 'directeur_central', 'directeur_generale', 'directeur_centrale')
                             AND (d.niveau_evolution_demande = 'valide_par_dir_cabinet' 
                                  OR d.statut_dir_cabinet = 'approuve'))
                            OR
                            -- Directeur de Cabinet, Chef de Cabinet : validé par Ministre
                            (COALESCE(ar.role_agent, 'agent') IN ('dir_cabinet', 'directeur_de_cabinet', 'chef_cabinet', 'chef_de_cabinet')
                             AND (d.niveau_evolution_demande = 'valide_par_ministre' 
                                  OR d.statut_ministre = 'approuve'))
                        )
                        -- Exclure les agents qui ont une demande de reprise de service validée
                        AND NOT EXISTS (
                            SELECT 1 FROM reprises_validees rv WHERE rv.id_agent = d.id_agent
                        )
                )
                SELECT 
                    aec.id_agent,
                    aec.date_debut,
                    aec.date_fin,
                    aec.type_demande,
                    aec.role_agent,
                    aec.nom,
                    aec.prenom,
                    aec.matricule,
                    d.id as direction_id,
                    d.libelle as direction_libelle,
                    dg.id as direction_generale_id,
                    dg.libelle as direction_generale_libelle,
                    sd.id as sous_direction_id,
                    sd.libelle as sous_direction_libelle,
                    srv.id as service_id,
                    srv.libelle as service_libelle
                FROM agents_en_conges aec
                LEFT JOIN directions d ON aec.id_direction = d.id
                LEFT JOIN direction_generale dg ON aec.id_direction_generale = dg.id
                LEFT JOIN sous_directions sd ON aec.id_sous_direction = sd.id
                LEFT JOIN services srv ON aec.id_service = srv.id
                WHERE 1=1
            `;

            const params = [];

            // Filtrer par ministère si l'utilisateur n'est pas super_admin
            if (userMinistereId && req.user.role !== 'super_admin') {
                query += ' AND EXISTS (SELECT 1 FROM agents a WHERE a.id = aec.id_agent AND a.id_ministere = $' + (params.length + 1) + ')';
                params.push(userMinistereId);
            }
            
            // Filtrer par direction si fourni
            const isDirecteurCentral = userRoleRaw === 'directeur_central';
            if (idDirection) {
                query += ' AND aec.id_direction = $' + (params.length + 1);
                params.push(idDirection);
                // Directeur central : uniquement les agents directement rattachés à la direction (sans sous-direction)
                if (isDirecteurCentral) {
                    query += ' AND aec.id_sous_direction IS NULL';
                }
            }
            
            // Filtrer par sous-direction si fourni
            if (idSousDirection) {
                query += ' AND aec.id_sous_direction = $' + (params.length + 1);
                params.push(idSousDirection);
            }
            
            // Filtrer par direction générale
            if (idDirectionGenerale) {
                // Chef de cabinet / Directeur de cabinet : uniquement les agents rattachés directement à la DG (Cabinet)
                if (isCabinet) {
                    query += ' AND aec.id_direction_generale = $' + (params.length + 1) + ' AND aec.id_direction IS NULL AND aec.id_sous_direction IS NULL';
                } else {
                    // Directeur général / Inspecteur général : toute la DG (agents rattachés à la DG + agents des directions de cette DG)
                    query += ' AND (aec.id_direction_generale = $' + (params.length + 1) + ' OR aec.id_direction IN (SELECT id FROM directions WHERE id_direction_generale = $' + (params.length + 1) + '))';
                }
                params.push(idDirectionGenerale);
            }

            query += ' ORDER BY d.libelle NULLS LAST, sd.libelle NULLS LAST, srv.libelle NULLS LAST, aec.nom, aec.prenom';

            const result = await pool.query(query, params);

            // Organiser les données par structure hiérarchique
            const structure = {};

            result.rows.forEach(agent => {
                // Grouper par direction, ou par direction générale si l'agent n'a pas de direction (rattaché uniquement à une DG)
                const directionKeyRaw = agent.direction_id != null ? agent.direction_id : (agent.direction_generale_id != null ? 'dg_' + agent.direction_generale_id : 'sans_direction');
                const directionKey = String(directionKeyRaw);
                const sousDirectionKey = agent.sous_direction_id != null ? String(agent.sous_direction_id) : 'sans_sous_direction';
                const serviceKey = agent.service_id != null ? String(agent.service_id) : 'sans_service';

                const directionLibelle = agent.direction_libelle
                    || (agent.direction_generale_libelle ? agent.direction_generale_libelle : 'Sans direction');

                if (!structure[directionKey]) {
                    structure[directionKey] = {
                        id: agent.direction_id,
                        libelle: directionLibelle,
                        sous_directions: {}
                    };
                }

                // Pour les agents rattachés uniquement à une DG (sans direction/sous-direction/service), éviter "Sans sous-direction" / "Sans service"
                const isRattacheDirectementDG = directionKey.startsWith('dg_');
                const sousDirectionLibelle = agent.sous_direction_libelle || (isRattacheDirectementDG ? 'Rattaché directement à la direction générale' : 'Sans sous-direction');
                const serviceLibelle = agent.service_libelle || (isRattacheDirectementDG ? 'Rattaché directement à la direction générale' : 'Sans service');

                if (!structure[directionKey].sous_directions[sousDirectionKey]) {
                    structure[directionKey].sous_directions[sousDirectionKey] = {
                        id: agent.sous_direction_id,
                        libelle: sousDirectionLibelle,
                        services: {}
                    };
                }

                if (!structure[directionKey].sous_directions[sousDirectionKey].services[serviceKey]) {
                    structure[directionKey].sous_directions[sousDirectionKey].services[serviceKey] = {
                        id: agent.service_id,
                        libelle: serviceLibelle,
                        agents: []
                    };
                }

                structure[directionKey].sous_directions[sousDirectionKey].services[serviceKey].agents.push({
                    id_agent: agent.id_agent,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    matricule: agent.matricule,
                    date_debut: agent.date_debut,
                    date_fin: agent.date_fin,
                    type_demande: agent.type_demande,
                    role_agent: agent.role_agent
                });
            });

            res.json({
                success: true,
                count: result.rows.length,
                annee: annee,
                data: structure
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du rapport:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la récupération du rapport',
                details: error.message
            });
        }
    }

    /**
     * Supprimer la date de départ en congés pour un agent
     * DELETE /api/planning-previsionnel/agent/:agentId/annee/:annee
     */
    static async delete(req, res) {
        try {
            const { agentId, annee } = req.params;

            // Récupérer le ministère de l'utilisateur connecté
            const userMinistereId = req.user?.id_ministere;

            // Vérifier que l'agent appartient au même ministère
            let agentCheckQuery = 'SELECT id FROM agents WHERE id = $1';
            const agentCheckParams = [agentId];
            
            if (userMinistereId && req.user.role !== 'super_admin') {
                agentCheckQuery += ' AND id_ministere = $2';
                agentCheckParams.push(userMinistereId);
            }
            
            const agentCheck = await pool.query(agentCheckQuery, agentCheckParams);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé ou n\'appartient pas à votre ministère'
                });
            }

            const result = await pool.query(
                'UPDATE agent_conges SET date_depart_conges = NULL WHERE id_agent = $1 AND annee = $2',
                [agentId, annee]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Aucune donnée trouvée pour cet agent et cette année'
                });
            }

            res.json({
                success: true,
                message: 'Date de départ en congés supprimée avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la suppression'
            });
        }
    }
}

module.exports = PlanningPrevisionnelController;

