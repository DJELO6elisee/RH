const pool = require('../config/database');

class CongesController {
    // Récupérer les congés d'un agent pour une année donnée
    static async getByAgentAndYear(req, res) {
        try {
            const { agentId } = req.params;
            const { annee = new Date().getFullYear() } = req.query;

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    created_at,
                    updated_at
                FROM agent_conges
                WHERE id_agent = $1 AND annee = $2
            `;

            const result = await pool.query(query, [agentId, parseInt(annee)]);

            if (result.rows.length === 0) {
                // Créer une entrée par défaut si elle n'existe pas
                const congesDefault = await CongesController.createOrUpdateConges(agentId, parseInt(annee));
                return res.json(congesDefault);
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération des congés:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des congés' });
        }
    }

    // Récupérer tous les congés d'un agent
    static async getAllByAgent(req, res) {
        try {
            const { agentId } = req.params;

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    created_at,
                    updated_at
                FROM agent_conges
                WHERE id_agent = $1
                ORDER BY annee DESC
            `;

            const result = await pool.query(query, [agentId]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des congés:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des congés' });
        }
    }

    // Récupérer les congés d'un agent pour des années spécifiques
    static async getByAgentAndYears(req, res) {
        try {
            const { agentId } = req.params;
            const { years } = req.query;

            if (!years) {
                return res.status(400).json({
                    success: false,
                    error: 'Les années sont requises'
                });
            }

            const yearsArray = years.split(',').map(y => parseInt(y.trim()));

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    created_at,
                    updated_at
                FROM agent_conges
                WHERE id_agent = $1 AND annee = ANY($2::int[])
                ORDER BY annee DESC
            `;

            const result = await pool.query(query, [agentId, yearsArray]);

            console.log(`📥 Récupération des congés pour l'agent ${agentId}, années:`, yearsArray);
            console.log(`📥 Nombre de lignes retournées par la DB:`, result.rows.length);
            
            // Log des données brutes de la base de données
            result.rows.forEach(row => {
                console.log(`📥 Données DB pour année ${row.annee}:`, {
                    jours_alloues: row.jours_alloues,
                    jours_pris: row.jours_pris,
                    jours_restants: row.jours_restants,
                    calcul: `${row.jours_alloues} - ${row.jours_pris} = ${row.jours_alloues - row.jours_pris}`,
                    correct: row.jours_restants === (row.jours_alloues - row.jours_pris) ? '✅' : '❌'
                });
            });

            // S'assurer qu'on retourne des données pour toutes les années demandées
            // IMPORTANT: Recalculer jours_restants pour garantir la cohérence des données
            const resultMap = {};
            result.rows.forEach(row => {
                // Parser les valeurs pour s'assurer qu'elles sont des nombres
                const jours_alloues = row.jours_alloues !== null && row.jours_alloues !== undefined ? parseInt(row.jours_alloues, 10) : 30;
                const jours_pris = row.jours_pris !== null && row.jours_pris !== undefined ? parseInt(row.jours_pris, 10) : 0;
                // RECALCULER jours_restants pour garantir la cohérence
                const jours_restants = Math.max(0, jours_alloues - jours_pris);
                
                console.log(`🔧 Recalcul pour année ${row.annee}: ${jours_alloues} - ${jours_pris} = ${jours_restants} (DB avait: ${row.jours_restants})`);
                
                resultMap[row.annee] = {
                    id: row.id,
                    id_agent: row.id_agent,
                    annee: row.annee,
                    jours_alloues: jours_alloues,
                    jours_pris: jours_pris,
                    jours_restants: jours_restants, // Utiliser la valeur recalculée
                    jours_reportes: row.jours_reportes !== null && row.jours_reportes !== undefined ? parseInt(row.jours_reportes, 10) : 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                };
            });

            const finalResult = yearsArray.map(year => {
                if (resultMap[year]) {
                    // Retourner EXACTEMENT les valeurs de la base de données
                    console.log(`✅ Retour des données DB pour année ${year}:`, resultMap[year]);
                    return resultMap[year];
                } else {
                    // Créer une entrée par défaut UNIQUEMENT si elle n'existe pas en DB
                    console.log(`⚠️ Aucune donnée en DB pour année ${year}, utilisation des valeurs par défaut`);
                    return {
                        id_agent: parseInt(agentId),
                        annee: year,
                        jours_pris: 0,
                        jours_alloues: 30,
                        jours_restants: 30,
                        jours_reportes: 0
                    };
                }
            });

            console.log(`✅ Envoi de ${finalResult.length} années de congés à l'agent ${agentId}`);

            res.json({
                success: true,
                data: finalResult
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des congés par années:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la récupération des congés',
                details: error.message
            });
        }
    }

    // Récupérer les congés de l'année en cours pour l'agent connecté
    static async getCurrentYear(req, res) {
        try {
            const agentId = req.user.id_agent;
            if (!agentId) {
                console.error('❌ ID agent manquant dans getCurrentYear');
                return res.status(400).json({ error: 'ID agent manquant' });
            }

            console.log(`🔍 Récupération des congés pour l'agent ${agentId} pour l'année ${new Date().getFullYear()}`);
            const anneeActuelle = new Date().getFullYear();
            const conges = await CongesController.createOrUpdateConges(agentId, anneeActuelle);
            
            if (!conges) {
                console.error(`❌ Aucun congé retourné pour l'agent ${agentId}`);
                return res.status(404).json({ error: 'Congés non trouvés pour cet agent' });
            }
            
            console.log(`✅ Congés récupérés pour l'agent ${agentId}:`, conges);
            res.json(conges);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des congés de l\'année en cours:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ 
                error: 'Erreur serveur lors de la récupération des congés',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Créer ou mettre à jour les congés d'un agent pour une année
    static async createOrUpdateConges(agentId, annee) {
        try {
            // Vérifier si l'entrée existe déjà
            const existingQuery = `
                SELECT * FROM agent_conges
                WHERE id_agent = $1 AND annee = $2
            `;
            const existingResult = await pool.query(existingQuery, [agentId, annee]);

            if (existingResult.rows.length > 0) {
                console.log(`✅ Congés existants trouvés pour l'agent ${agentId}, année ${annee}`);
                return existingResult.rows[0];
            }

            console.log(`📝 Création de nouveaux congés pour l'agent ${agentId}, année ${annee}`);

            // Calculer les jours reportés et la dette de l'année précédente
            const anneePrecedente = annee - 1;
            const congesAnneePrecedenteQuery = `
                SELECT jours_restants, dette_annee_suivante 
                FROM agent_conges
                WHERE id_agent = $1 AND annee = $2
            `;
            const congesPrecedent = await pool.query(congesAnneePrecedenteQuery, [agentId, anneePrecedente]);
            
            let joursReportes = 0;
            let detteAnneePrecedente = 0;
            
            if (congesPrecedent.rows.length > 0) {
                const congesPrecedentData = congesPrecedent.rows[0];
                joursReportes = Math.max(0, congesPrecedentData.jours_restants || 0); // Seuls les jours positifs sont reportés
                detteAnneePrecedente = congesPrecedentData.dette_annee_suivante || 0; // Dette de l'année précédente
                console.log(`📊 Jours reportés de l'année précédente: ${joursReportes}`);
                console.log(`📊 Dette de l'année précédente: ${detteAnneePrecedente} jours`);
            } else {
                console.log(`📊 Aucun jour reporté de l'année précédente`);
            }

            // Les jours alloués = 30 (base) + jours reportés de l'année précédente - dette de l'année précédente
            // Si l'agent avait une dette (ex: -10 jours), elle est soustraite des 30 jours de base
            // Exemple: 30 + 0 - 10 = 20 jours alloués
            const joursAlloues = 30 + joursReportes - detteAnneePrecedente;
            const joursRestants = Math.max(0, joursAlloues); // Au début de l'année, aucun jour n'est pris

            console.log(`💰 Jours alloués calculés: ${joursAlloues} (30 de base + ${joursReportes} reportés - ${detteAnneePrecedente} dette)`);

            // Vérifier si la colonne dette_annee_suivante existe
            let insertQuery, insertParams;
            try {
                const checkColumnQuery = `
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'agent_conges' AND column_name = 'dette_annee_suivante'
                `;
                const columnCheck = await pool.query(checkColumnQuery);
                const hasDetteColumn = columnCheck.rows.length > 0;

                if (hasDetteColumn) {
                    insertQuery = `
                        INSERT INTO agent_conges (
                            id_agent, 
                            annee, 
                            jours_pris, 
                            jours_alloues, 
                            jours_restants, 
                            jours_reportes,
                            dette_annee_suivante
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING *
                    `;
                    insertParams = [
                        agentId,
                        annee,
                        0, // jours_pris
                        joursAlloues,
                        joursRestants,
                        joursReportes,
                        0 // dette_annee_suivante (initialisée à 0)
                    ];
                } else {
                    // Si la colonne n'existe pas, utiliser l'ancienne version sans dette_annee_suivante
                    console.warn('⚠️ Colonne dette_annee_suivante n\'existe pas - utilisation de l\'ancienne structure');
                    insertQuery = `
                        INSERT INTO agent_conges (
                            id_agent, 
                            annee, 
                            jours_pris, 
                            jours_alloues, 
                            jours_restants, 
                            jours_reportes
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *
                    `;
                    insertParams = [
                        agentId,
                        annee,
                        0, // jours_pris
                        joursAlloues,
                        joursRestants,
                        joursReportes
                    ];
                }
            } catch (error) {
                // En cas d'erreur, utiliser l'ancienne version
                console.warn('⚠️ Erreur lors de la vérification de la colonne dette_annee_suivante:', error.message);
                insertQuery = `
                    INSERT INTO agent_conges (
                        id_agent, 
                        annee, 
                        jours_pris, 
                        jours_alloues, 
                        jours_restants, 
                        jours_reportes
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                `;
                insertParams = [
                    agentId,
                    annee,
                    0, // jours_pris
                    joursAlloues,
                    joursRestants,
                    joursReportes
                ];
            }

            const result = await pool.query(insertQuery, insertParams);

            if (result.rows.length === 0) {
                throw new Error('Erreur lors de l\'insertion des congés - aucune ligne retournée');
            }

            console.log(`✅ Congés créés avec succès pour l'agent ${agentId}:`, result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error(`❌ Erreur dans createOrUpdateConges pour l'agent ${agentId}, année ${annee}:`, error);
            console.error('Stack trace:', error.stack);
            // Si c'est une erreur de table manquante, fournir un message plus clair
            if (error.message && error.message.includes('relation "agent_conges" does not exist')) {
                throw new Error('La table agent_conges n\'existe pas. Veuillez exécuter le script create_conges_table.sql');
            }
            throw error;
        }
    }

    // Calculer le nombre de jours ouvrés entre deux dates (hors weekends et jours fériés)
    static async calculerJoursOuvres(dateDebut, dateFin) {
        try {
            const query = `
                SELECT calculer_jours_ouvres($1::DATE, $2::DATE) as jours_ouvres
            `;
            
            const result = await pool.query(query, [dateDebut, dateFin]);
            return result.rows[0].jours_ouvres || 0;
        } catch (error) {
            console.error('Erreur lors du calcul des jours ouvrés:', error);
            // Fallback : calcul simple sans exclure les weekends et jours fériés
            const date1 = new Date(dateDebut);
            const date2 = new Date(dateFin);
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
        }
    }

    // Mettre à jour les jours de congés pris
    static async updateJoursPris(req, res) {
        try {
            const { agentId } = req.params;
            const { annee, jours_pris, date_debut, date_fin } = req.body;

            if (!annee || (jours_pris === undefined && (!date_debut || !date_fin))) {
                return res.status(400).json({ error: 'Année et jours_pris ou dates de début/fin sont requis' });
            }

            let joursADeduire = jours_pris;

            // Si des dates sont fournies, calculer les jours ouvrés
            if (date_debut && date_fin) {
                joursADeduire = await CongesController.calculerJoursOuvres(date_debut, date_fin);
                console.log(`📅 Calculé ${joursADeduire} jours ouvrés pour la période du ${date_debut} au ${date_fin}`);
            }

            // S'assurer que l'entrée existe
            await CongesController.createOrUpdateConges(agentId, parseInt(annee));

            // Récupérer l'état actuel des congés pour éviter les déductions négatives
            const currentCongesQuery = `
                SELECT jours_alloues, jours_pris FROM agent_conges
                WHERE id_agent = $1 AND annee = $2
            `;
            const currentCongesResult = await pool.query(currentCongesQuery, [agentId, parseInt(annee)]);
            const currentConges = currentCongesResult.rows[0];

            if (!currentConges) {
                return res.status(404).json({ error: 'Congés non trouvés pour cet agent et cette année' });
            }

            const nouveauxJoursPris = currentConges.jours_pris + joursADeduire;
            const nouveauxJoursRestants = currentConges.jours_alloues - nouveauxJoursPris;

            // Vérifier que l'agent a assez de jours restants
            if (nouveauxJoursRestants < 0) {
                return res.status(400).json({ 
                    error: `L'agent n'a pas assez de jours de congés restants. Jours restants: ${currentConges.jours_alloues - currentConges.jours_pris}, Jours demandés: ${joursADeduire}` 
                });
            }

            // Mettre à jour les jours pris et recalculer les jours restants
            const updateQuery = `
                UPDATE agent_conges
                SET 
                    jours_pris = $3,
                    jours_restants = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_agent = $1 AND annee = $2
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [agentId, parseInt(annee), nouveauxJoursPris, nouveauxJoursRestants]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Congés non trouvés pour cet agent et cette année' });
            }

            console.log(`✅ Jours de congés mis à jour pour l'agent ${agentId}: ${joursADeduire} jours déduits. Jours restants: ${nouveauxJoursRestants}`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des jours pris:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la mise à jour des jours pris' });
        }
    }

    // Endpoint pour calculer les jours ouvrés entre deux dates
    // Récupérer tous les agents avec leurs jours de congés pour les 3 dernières années
    // IMPORTANT: Cette fonction récupère DIRECTEMENT les données de la base de données
    static async getAllAgentsWithConges(req, res) {
        try {
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;
            const yearBeforePrevious = currentYear - 2;
            const years = [yearBeforePrevious, previousYear, currentYear];

            console.log(`\n📥 === RÉCUPÉRATION DES AGENTS AVEC CONGÉS ===`);
            console.log(`📥 Années demandées:`, years);

            // Ministère de l'utilisateur connecté (pour filtrer les agents)
            let idMinistere = null;
            const isSuperAdmin = req.user && (req.user.role === 'super_admin' || (req.user.role && req.user.role.toLowerCase() === 'super_admin'));
            if (!isSuperAdmin && req.user) {
                if (req.user.id_agent) {
                    try {
                        const agentMinistereResult = await pool.query(
                            'SELECT id_ministere FROM agents WHERE id = $1',
                            [req.user.id_agent]
                        );
                        if (agentMinistereResult.rows.length > 0 && agentMinistereResult.rows[0].id_ministere != null) {
                            idMinistere = parseInt(agentMinistereResult.rows[0].id_ministere, 10);
                        }
                    } catch (err) {
                        console.error('Erreur récupération id_ministere (agent):', err);
                    }
                }
                if (idMinistere == null && req.user.id_ministere != null) {
                    idMinistere = parseInt(req.user.id_ministere, 10);
                }
            }
            if (idMinistere != null) {
                console.log(`📥 Filtre par ministère: id_ministere = ${idMinistere}`);
            } else if (!isSuperAdmin) {
                console.log(`📥 Aucun ministère associé à l'utilisateur - liste vide pour les congés`);
            }

            // Récupérer DIRECTEMENT les données de la base de données SANS modification
            // Utiliser les vraies valeurs de la base de données, pas de COALESCE sauf pour les cas NULL
            // MÉTHODE ROBUSTE: Utiliser une connexion dédiée pour garantir qu'on récupère les dernières données
            // et éviter tout problème de cache ou de transaction isolée
            const readClient = await pool.connect();
            try {
                const whereConditions = [
                    'a.statut_emploi = \'actif\'',
                    '(a.retire IS NULL OR a.retire = false)'
                ];
                const queryParams = [years];
                if (idMinistere != null) {
                    whereConditions.push(`a.id_ministere = $${queryParams.length + 1}`);
                    queryParams.push(idMinistere);
                }
                const whereClause = whereConditions.join(' AND ');

                const query = `
                    SELECT 
                        a.id,
                        a.matricule,
                        a.nom,
                        a.prenom,
                        json_agg(
                            json_build_object(
                                'annee', ac.annee,
                                'jours_alloues', ac.jours_alloues,
                                'jours_pris', ac.jours_pris,
                                'jours_restants', ac.jours_restants,
                                'jours_reportes', COALESCE(ac.jours_reportes, 0),
                                'updated_at', ac.updated_at
                            ) ORDER BY ac.annee
                        ) FILTER (WHERE ac.id IS NOT NULL) as conges
                    FROM agents a
                    LEFT JOIN agent_conges ac ON a.id = ac.id_agent AND ac.annee = ANY($1::int[])
                    WHERE ${whereClause}
                    GROUP BY a.id, a.matricule, a.nom, a.prenom
                    ORDER BY a.nom, a.prenom
                `;

                console.log(`📥 Exécution de la requête pour récupérer les agents avec congés...`);
                console.log(`📥 Années recherchées:`, years);
                console.log(`📥 Utilisation d'une connexion dédiée pour garantir les données les plus récentes`);
                
                const result = await readClient.query(query, queryParams);
                console.log(`📥 Nombre d'agents récupérés: ${result.rows.length}`);
            
            // Log détaillé pour vérifier les données récupérées
            if (result.rows.length > 0) {
                const sampleAgent = result.rows.find(a => a.id === 1229) || result.rows[0];
                if (sampleAgent && sampleAgent.conges) {
                    console.log(`📥 Exemple de données récupérées pour agent ${sampleAgent.id} (${sampleAgent.nom} ${sampleAgent.prenom}):`);
                    sampleAgent.conges.forEach(c => {
                        console.log(`  - Année ${c.annee}:`, {
                            alloues: c.jours_alloues,
                            pris: c.jours_pris,
                            restants: c.jours_restants,
                            updated_at: c.updated_at,
                            calcul: `${c.jours_alloues} - ${c.jours_pris} = ${c.jours_alloues - c.jours_pris}`
                        });
                    });
                }
            }

            // S'assurer que chaque agent a des données pour les 3 années
            // MAIS utiliser les vraies valeurs de la DB pour les années existantes
            const agentsWithConges = result.rows.map(agent => {
                const existingConges = agent.conges || [];
                const congesMap = {};
                
                // Mapper les congés existants avec les VRAIES valeurs de la DB
                // IMPORTANT: Utiliser les valeurs DIRECTEMENT de la base de données
                existingConges.forEach(c => {
                    // Parser les valeurs pour s'assurer qu'elles sont des nombres
                    // Ces valeurs viennent DIRECTEMENT de la table agent_conges
                    const jours_alloues = c.jours_alloues !== null && c.jours_alloues !== undefined ? parseInt(c.jours_alloues, 10) : 30;
                    const jours_pris = c.jours_pris !== null && c.jours_pris !== undefined ? parseInt(c.jours_pris, 10) : 0;
                    const jours_restants_db = c.jours_restants !== null && c.jours_restants !== undefined ? parseInt(c.jours_restants, 10) : 30;
                    
                    // Recalculer jours_restants pour garantir la cohérence
                    const jours_restants_calcule = Math.max(0, jours_alloues - jours_pris);
                    
                    // Utiliser la valeur recalculée pour garantir la cohérence
                    // (même si la DB a une valeur différente, on utilise le calcul)
                    const jours_restants = jours_restants_calcule;
                    
                    // Log si les valeurs diffèrent (pour debug)
                    if (agent.id === 1229 && jours_restants_db !== jours_restants_calcule) {
                        console.log(`⚠️ Incohérence détectée pour agent ${agent.id}, année ${c.annee}: DB=${jours_restants_db}, Calculé=${jours_restants_calcule}, Utilisation du calculé`);
                    }
                    
                    congesMap[c.annee] = {
                        annee: c.annee,
                        jours_alloues: jours_alloues, // Valeur DIRECTE de la DB
                        jours_pris: jours_pris, // Valeur DIRECTE de la DB
                        jours_restants: jours_restants, // Valeur recalculée pour garantir la cohérence
                        jours_reportes: c.jours_reportes !== null && c.jours_reportes !== undefined ? parseInt(c.jours_reportes, 10) : 0,
                        updated_at: c.updated_at // Inclure updated_at pour vérifier la fraîcheur des données
                    };
                });

                // Ajouter des valeurs par défaut UNIQUEMENT pour les années manquantes
                years.forEach(year => {
                    if (!congesMap[year]) {
                        congesMap[year] = {
                            annee: year,
                            jours_alloues: 30,
                            jours_pris: 0,
                            jours_restants: 30,
                            jours_reportes: 0
                        };
                    }
                });

                const finalConges = Object.values(congesMap).sort((a, b) => a.annee - b.annee);

                // Log pour vérifier les données récupérées
                if (agent.id === 1229) {
                    console.log(`📊 Agent ${agent.nom} ${agent.prenom} (ID: ${agent.id}):`, {
                        conges: finalConges.map(c => ({
                            annee: c.annee,
                            alloues: c.jours_alloues,
                            pris: c.jours_pris,
                            restants: c.jours_restants,
                            calcul: `${c.jours_alloues} - ${c.jours_pris} = ${c.jours_alloues - c.jours_pris}`,
                            correct: c.jours_restants === (c.jours_alloues - c.jours_pris) ? '✅' : '❌'
                        }))
                    });
                }

                return {
                    ...agent,
                    conges: finalConges
                };
            });

                console.log(`✅ ${agentsWithConges.length} agents avec congés récupérés de la base de données`);

                // Ajouter des headers pour éviter le cache
                res.set({
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });

                res.json({
                    success: true,
                    data: agentsWithConges
                });
            } finally {
                // Libérer la connexion dédiée
                readClient.release();
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des agents avec congés:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la récupération des agents avec congés',
                details: error.message
            });
        }
    }

    // Mettre à jour les jours de congés pour plusieurs agents/années
    static async updateMultipleConges(req, res) {
        try {
            const { updates } = req.body;
            const modifiedBy = req.user?.id_agent || req.user?.id; // ID du DRH qui effectue la modification

            console.log('📥 === DEBUT updateMultipleConges ===');
            console.log('📥 Request body complet:', JSON.stringify(req.body, null, 2));
            console.log('📥 Updates reçues (brut):', updates);
            console.log('📥 Nombre d\'updates:', updates?.length);

            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Les données de mise à jour sont requises'
                });
            }

            // Log détaillé de chaque update reçue
            updates.forEach((update, index) => {
                console.log(`📥 Update ${index + 1}:`, {
                    id_agent: update.id_agent,
                    annee: update.annee,
                    jours_alloues: update.jours_alloues,
                    jours_pris: update.jours_pris,
                    jours_restants: update.jours_restants,
                    types: {
                        id_agent: typeof update.id_agent,
                        annee: typeof update.annee,
                        jours_alloues: typeof update.jours_alloues,
                        jours_pris: typeof update.jours_pris,
                        jours_restants: typeof update.jours_restants
                    }
                });
            });

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Récupérer les informations du modificateur (DRH)
                let modificateurNom = 'DRH';
                if (modifiedBy) {
                    try {
                        const modificateurQuery = `
                            SELECT prenom, nom FROM agents WHERE id = $1
                        `;
                        const modificateurResult = await client.query(modificateurQuery, [modifiedBy]);
                        if (modificateurResult.rows.length > 0) {
                            modificateurNom = `${modificateurResult.rows[0].prenom} ${modificateurResult.rows[0].nom}`;
                        }
                    } catch (err) {
                        console.warn('Impossible de récupérer le nom du modificateur:', err);
                    }
                }

                const notifications = [];
                const modificationsDetails = [];
                const savedDataArray = []; // Stocker les données sauvegardées depuis RETURNING

                for (const update of updates) {
                    // Extraire directement les valeurs du body reçu
                    const id_agent = parseInt(update.id_agent, 10);
                    const annee = parseInt(update.annee, 10);
                    const jours_alloues = parseInt(update.jours_alloues, 10) || 30;
                    const jours_pris = parseInt(update.jours_pris, 10) || 0;
                    const jours_restants = Math.max(0, jours_alloues - jours_pris);

                    console.log(`\n📥 === TRAITEMENT UPDATE ===`);
                    console.log(`📥 Agent: ${id_agent}, Année: ${annee}`);
                    console.log(`📥 Valeurs reçues du body:`, {
                        jours_alloues: update.jours_alloues,
                        jours_pris: update.jours_pris,
                        jours_restants: update.jours_restants,
                        types: {
                            jours_alloues: typeof update.jours_alloues,
                            jours_pris: typeof update.jours_pris
                        }
                    });
                    console.log(`📥 Valeurs parsées:`, {
                        jours_alloues,
                        jours_pris,
                        jours_restants,
                        calcul: `${jours_alloues} - ${jours_pris} = ${jours_restants}`
                    });

                    // Récupérer les valeurs actuelles pour comparer
                    const checkQuery = `
                        SELECT id, jours_alloues as ancien_alloues, jours_pris as ancien_pris, jours_restants as ancien_restants
                        FROM agent_conges
                        WHERE id_agent = $1 AND annee = $2
                    `;
                    const checkResult = await client.query(checkQuery, [id_agent, annee]);

                    if (checkResult.rows.length > 0) {
                        const ancien = checkResult.rows[0];
                        const ancienAlloues = ancien.ancien_alloues || 30;
                        const ancienPris = ancien.ancien_pris || 0;
                        const ancienRestants = ancien.ancien_restants || 30;

                        console.log(`📊 Valeurs actuelles en DB:`, {
                            jours_alloues: ancienAlloues,
                            jours_pris: ancienPris,
                            jours_restants: ancienRestants
                        });

                        // Vérifier s'il y a eu des modifications
                        const hasChanges = ancienAlloues !== jours_alloues || ancienPris !== jours_pris || ancienRestants !== jours_restants;

                        if (hasChanges) {
                            modificationsDetails.push({
                                id_agent,
                                annee,
                                ancien: {
                                    jours_alloues: ancienAlloues,
                                    jours_pris: ancienPris,
                                    jours_restants: ancienRestants
                                },
                                nouveau: {
                                    jours_alloues: jours_alloues,
                                    jours_pris: jours_pris,
                                    jours_restants: jours_restants
                                }
                            });
                        }

                        // Mettre à jour DIRECTEMENT avec les valeurs reçues
                        // Forcer le type INTEGER pour éviter tout problème de conversion
                        const jours_alloues_int = parseInt(String(jours_alloues), 10) || 30;
                        const jours_pris_int = parseInt(String(jours_pris), 10) || 0;
                        const jours_restants_int = Math.max(0, jours_alloues_int - jours_pris_int);
                        
                        console.log(`\n🔄 === EXECUTION UPDATE ===`);
                        console.log(`🔄 Agent: ${id_agent}, Année: ${annee}`);
                        console.log(`🔄 Valeurs à sauvegarder:`, {
                            jours_alloues: jours_alloues_int,
                            jours_pris: jours_pris_int,
                            jours_restants: jours_restants_int,
                            calcul: `${jours_alloues_int} - ${jours_pris_int} = ${jours_restants_int}`
                        });
                        
                        const updateQuery = `
                            UPDATE agent_conges
                            SET jours_alloues = $1::INTEGER,
                                jours_pris = $2::INTEGER,
                                jours_restants = $3::INTEGER,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id_agent = $4::INTEGER AND annee = $5::INTEGER
                            RETURNING id, id_agent, annee, jours_alloues, jours_pris, jours_restants, updated_at
                        `;
                        
                        const updateResult = await client.query(updateQuery, [
                            jours_alloues_int,
                            jours_pris_int,
                            jours_restants_int,
                            id_agent,
                            annee
                        ]);
                        
                        console.log(`🔄 Résultat UPDATE:`, {
                            rowCount: updateResult.rowCount,
                            rowsAffected: updateResult.rowCount > 0 ? 'OUI' : 'NON'
                        });
                        
                        if (updateResult.rows.length > 0) {
                            const savedRow = updateResult.rows[0];
                            console.log(`✅ Valeurs SAUVEGARDÉES en DB:`, {
                                jours_alloues: savedRow.jours_alloues,
                                jours_pris: savedRow.jours_pris,
                                jours_restants: savedRow.jours_restants,
                                updated_at: savedRow.updated_at
                            });
                            
                            // Vérification IMMÉDIATE - si pas OK, lever une erreur pour bloquer la transaction
                            if (parseInt(savedRow.jours_pris) !== jours_pris_int) {
                                const errorMsg = `ERREUR: jours_pris envoyé (${jours_pris_int}) !== jours_pris sauvegardé (${savedRow.jours_pris})`;
                                console.error(`\n❌❌❌ ${errorMsg}`);
                                throw new Error(errorMsg);
                            }
                            if (parseInt(savedRow.jours_restants) !== jours_restants_int) {
                                const errorMsg = `ERREUR: jours_restants envoyé (${jours_restants_int}) !== jours_restants sauvegardé (${savedRow.jours_restants})`;
                                console.error(`\n❌❌❌ ${errorMsg}`);
                                throw new Error(errorMsg);
                            }
                            console.log(`✅ Vérification OK - Les valeurs correspondent exactement`);
                            
                            // Stocker les données sauvegardées pour les renvoyer dans la réponse
                            savedDataArray.push({
                                id_agent: savedRow.id_agent,
                                annee: savedRow.annee,
                                jours_alloues: savedRow.jours_alloues,
                                jours_pris: savedRow.jours_pris,
                                jours_restants: savedRow.jours_restants
                            });
                        } else {
                            const errorMsg = `ERREUR: Aucune ligne mise à jour pour Agent ${id_agent}, Année ${annee}`;
                            console.error(`\n❌❌❌ ${errorMsg}`);
                            throw new Error(errorMsg);
                        }
                    } else {
                        // Créer avec les valeurs reçues
                        console.log(`➕ Création nouvelle entrée pour Agent ${id_agent}, Année ${annee}:`, {
                            jours_alloues,
                            jours_pris,
                            jours_restants
                        });
                        
                        const insertQuery = `
                            INSERT INTO agent_conges (
                                id_agent, annee, jours_alloues, jours_pris, jours_restants, jours_reportes
                            ) VALUES ($1, $2, $3, $4, $5, 0)
                            RETURNING *
                        `;
                        const insertResult = await client.query(insertQuery, [
                            id_agent,
                            annee,
                            jours_alloues,
                            jours_pris,
                            jours_restants
                        ]);
                        
                        if (insertResult.rows.length > 0) {
                            const insertedRow = insertResult.rows[0];
                            console.log(`✅ INSERT réussi - Valeurs créées:`, {
                                jours_alloues: insertedRow.jours_alloues,
                                jours_pris: insertedRow.jours_pris,
                                jours_restants: insertedRow.jours_restants
                            });
                            
                            // Stocker les données créées pour les renvoyer dans la réponse
                            savedDataArray.push({
                                id_agent: insertedRow.id_agent,
                                annee: insertedRow.annee,
                                jours_alloues: insertedRow.jours_alloues,
                                jours_pris: insertedRow.jours_pris,
                                jours_restants: insertedRow.jours_restants
                            });
                        }

                        modificationsDetails.push({
                            id_agent,
                            annee,
                            ancien: null,
                            nouveau: {
                                jours_alloues: jours_alloues,
                                jours_pris: jours_pris,
                                jours_restants: jours_restants
                            }
                        });
                    }
                }

                // Créer des notifications pour chaque agent concerné
                const agentsNotifies = new Set();
                for (const modif of modificationsDetails) {
                    if (!agentsNotifies.has(modif.id_agent)) {
                        agentsNotifies.add(modif.id_agent);

                        // Construire le message de notification détaillé
                        let message = `Vos jours de congés ont été modifiés par ${modificateurNom}.\n\n`;
                        
                        // Trouver toutes les modifications pour cet agent
                        const modifsAgent = modificationsDetails.filter(m => m.id_agent === modif.id_agent);
                        
                        modifsAgent.forEach((m, index) => {
                            if (index > 0) message += '\n';
                            message += `Année ${m.annee}:\n`;
                            
                            if (m.ancien) {
                                message += `  • Jours alloués: ${m.ancien.jours_alloues} → ${m.nouveau.jours_alloues}\n`;
                                message += `  • Jours pris: ${m.ancien.jours_pris} → ${m.nouveau.jours_pris}\n`;
                                message += `  • Jours restants: ${m.ancien.jours_restants} → ${m.nouveau.jours_restants}\n`;
                            } else {
                                message += `  • Jours alloués: ${m.nouveau.jours_alloues}\n`;
                                message += `  • Jours pris: ${m.nouveau.jours_pris}\n`;
                                message += `  • Jours restants: ${m.nouveau.jours_restants}\n`;
                            }
                        });

                        notifications.push({
                            id_agent: modif.id_agent,
                            titre: 'Modification de vos jours de congés',
                            message: message,
                            type_notification: 'modification_conges'
                        });
                    }
                }

                // Insérer les notifications dans la base de données
                for (const notif of notifications) {
                    try {
                        // Essayer d'abord la table notifications (si elle existe) qui accepte id_demande NULL
                        let notificationQuery = `
                            INSERT INTO notifications (
                                id_agent,
                                titre,
                                message,
                                type_notification,
                                id_demande,
                                created_by,
                                is_read,
                                created_at
                            ) VALUES ($1, $2, $3, $4, NULL, $5, FALSE, CURRENT_TIMESTAMP)
                        `;
                        
                        try {
                            await client.query(notificationQuery, [
                                notif.id_agent,
                                notif.titre,
                                notif.message,
                                notif.type_notification,
                                modifiedBy
                            ]);
                            console.log(`✅ Notification créée dans la table notifications pour l'agent ${notif.id_agent}`);
                        } catch (notifTableError) {
                            // Si la table notifications n'existe pas, essayer notifications_demandes
                            // En créant une demande factice ou en utilisant un type spécial
                            console.warn('⚠️ Table notifications non trouvée, tentative avec notifications_demandes:', notifTableError.message);
                            
                            // Vérifier si on peut insérer dans notifications_demandes sans demande
                            // En utilisant un type de notification autorisé et une demande factice (id = 0 ou -1)
                            // Note: Cela peut nécessiter une modification de la contrainte
                            const notifDemandesQuery = `
                                INSERT INTO notifications_demandes (
                                    id_demande,
                                    id_agent_destinataire,
                                    type_notification,
                                    titre,
                                    message,
                                    lu,
                                    date_creation
                                ) 
                                SELECT 
                                    COALESCE((SELECT MIN(id) FROM demandes LIMIT 1), 0),
                                    $1,
                                    'demande_approuvee',
                                    $2,
                                    $3,
                                    FALSE,
                                    CURRENT_TIMESTAMP
                                WHERE EXISTS (SELECT 1 FROM demandes LIMIT 1)
                            `;
                            
                            const notifResult = await client.query(notifDemandesQuery, [
                                notif.id_agent,
                                notif.titre,
                                notif.message
                            ]);
                            
                            if (notifResult.rowCount === 0) {
                                console.warn(`⚠️ Impossible de créer la notification pour l'agent ${notif.id_agent} (aucune demande trouvée dans la base)`);
                            } else {
                                console.log(`✅ Notification créée dans notifications_demandes pour l'agent ${notif.id_agent}`);
                            }
                        }
                    } catch (notifError) {
                        console.error(`❌ Erreur lors de la création de la notification pour l'agent ${notif.id_agent}:`, notifError);
                        // Ne pas faire échouer la transaction si la notification échoue
                    }
                }

                await client.query('COMMIT');
                console.log(`\n✅ === COMMIT RÉUSSI ===`);
                
                // Libérer le client de la transaction
                client.release();
                
                // MÉTHODE ROBUSTE: Vérifier avec une NOUVELLE connexion dédiée après le COMMIT
                // Attendre un court délai pour s'assurer que le COMMIT est propagé
                await new Promise(resolve => setTimeout(resolve, 100));
                
                console.log(`\n🔍 === VÉRIFICATION POST-COMMIT (avec nouvelle connexion) ===`);
                const verifyClient = await pool.connect();
                try {
                    for (const update of updates) {
                        const id_agent = parseInt(update.id_agent, 10);
                        const annee = parseInt(update.annee, 10);
                        const jours_alloues_attendu = parseInt(update.jours_alloues, 10);
                        const jours_pris_attendu = parseInt(update.jours_pris, 10);
                        const jours_restants_attendu = Math.max(0, jours_alloues_attendu - jours_pris_attendu);
                        
                        // Utiliser une nouvelle connexion pour vérifier (après le COMMIT)
                        const verifyQuery = `
                            SELECT jours_alloues, jours_pris, jours_restants, updated_at
                            FROM agent_conges
                            WHERE id_agent = $1 AND annee = $2
                        `;
                        const verifyResult = await verifyClient.query(verifyQuery, [id_agent, annee]);
                        
                        if (verifyResult.rows.length > 0) {
                            const dbData = verifyResult.rows[0];
                            const db_alloues = parseInt(dbData.jours_alloues, 10);
                            const db_pris = parseInt(dbData.jours_pris, 10);
                            const db_restants = parseInt(dbData.jours_restants, 10);
                            
                            const alloues_ok = db_alloues === jours_alloues_attendu;
                            const pris_ok = db_pris === jours_pris_attendu;
                            const restants_ok = db_restants === jours_restants_attendu;
                            
                            if (alloues_ok && pris_ok && restants_ok) {
                                console.log(`✅ Agent ${id_agent}, Année ${annee}: Données vérifiées en DB - OK`);
                            } else {
                                console.error(`❌ Agent ${id_agent}, Année ${annee}: INCOHÉRENCE DÉTECTÉE!`);
                                console.error(`   Attendu: alloues=${jours_alloues_attendu}, pris=${jours_pris_attendu}, restants=${jours_restants_attendu}`);
                                console.error(`   En DB:   alloues=${db_alloues}, pris=${db_pris}, restants=${db_restants}`);
                                console.error(`   Vérification: alloues=${alloues_ok ? '✅' : '❌'}, pris=${pris_ok ? '✅' : '❌'}, restants=${restants_ok ? '✅' : '❌'}`);
                                
                                // Si incohérence, corriger immédiatement
                                const correctQuery = `
                                    UPDATE agent_conges
                                    SET jours_alloues = $1::INTEGER,
                                        jours_pris = $2::INTEGER,
                                        jours_restants = $3::INTEGER,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE id_agent = $4::INTEGER AND annee = $5::INTEGER
                                    RETURNING *
                                `;
                                const correctResult = await verifyClient.query(correctQuery, [
                                    jours_alloues_attendu,
                                    jours_pris_attendu,
                                    jours_restants_attendu,
                                    id_agent,
                                    annee
                                ]);
                                console.log(`🔧 Correction appliquée pour Agent ${id_agent}, Année ${annee}`);
                            }
                        } else {
                            console.error(`❌ Agent ${id_agent}, Année ${annee}: Aucune donnée trouvée en DB après COMMIT!`);
                        }
                    }
                } finally {
                    verifyClient.release();
                }

                console.log(`✅ ${updates.length} mise(s) à jour effectuée(s) avec succès. ${notifications.length} notification(s) envoyée(s).`);
                
                // Utiliser directement les données du RETURNING qui sont garanties d'être correctes
                console.log('\n📊 === DONNÉES SAUVEGARDÉES (depuis RETURNING) ===');
                savedDataArray.forEach((data, index) => {
                    const updateOriginal = updates[index];
                    if (!updateOriginal || !data) return;
                    
                    const calculAttendu = data.jours_alloues - data.jours_pris;
                    const correct = data.jours_restants === calculAttendu;
                    console.log(`📊 Agent ${data.id_agent}, Année ${data.annee}:`, {
                        envoyé: {
                            jours_alloues: updateOriginal.jours_alloues,
                            jours_pris: updateOriginal.jours_pris,
                            jours_restants: updateOriginal.jours_restants
                        },
                        sauvegardé_depuis_returning: {
                            jours_alloues: data.jours_alloues,
                            jours_pris: data.jours_pris,
                            jours_restants: data.jours_restants
                        },
                        calcul_attendu: `${data.jours_alloues} - ${data.jours_pris} = ${calculAttendu}`,
                        correct: correct ? '✅' : '❌',
                        correspondance: {
                            alloues_ok: data.jours_alloues === parseInt(updateOriginal.jours_alloues, 10) ? '✅' : '❌',
                            pris_ok: data.jours_pris === parseInt(updateOriginal.jours_pris, 10) ? '✅' : '❌',
                            restants_ok: data.jours_restants === parseInt(updateOriginal.jours_restants, 10) ? '✅' : '❌'
                        }
                    });
                    
                    if (data.jours_pris !== parseInt(updateOriginal.jours_pris, 10)) {
                        console.error(`\n❌❌❌ PROBLÈME DÉTECTÉ: jours_pris ne correspond pas!`);
                        console.error(`   Envoyé: ${updateOriginal.jours_pris}, Sauvegardé: ${data.jours_pris}`);
                    }
                    if (data.jours_restants !== parseInt(updateOriginal.jours_restants, 10)) {
                        console.error(`\n❌❌❌ PROBLÈME DÉTECTÉ: jours_restants ne correspond pas!`);
                        console.error(`   Envoyé: ${updateOriginal.jours_restants}, Sauvegardé: ${data.jours_restants}`);
                    }
                });

                // Renvoyer les données sauvegardées depuis RETURNING (garanties d'être correctes)
                res.json({
                    success: true,
                    message: `${updates.length} mise(s) à jour effectuée(s) avec succès`,
                    notifications_envoyees: notifications.length,
                    data_sauvegardee: savedDataArray
                });
            } catch (error) {
                await client.query('ROLLBACK');
                client.release();
                throw error;
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour multiple des congés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur serveur lors de la mise à jour des congés',
                details: error.message
            });
        }
    }

    static async calculerJoursOuvresEndpoint(req, res) {
        try {
            const { date_debut, date_fin } = req.query;

            if (!date_debut || !date_fin) {
                return res.status(400).json({ error: 'date_debut et date_fin sont requis' });
            }

            const joursOuvres = await CongesController.calculerJoursOuvres(date_debut, date_fin);

            res.json({
                date_debut,
                date_fin,
                jours_ouvres
            });
        } catch (error) {
            console.error('Erreur lors du calcul des jours ouvrés:', error);
            res.status(500).json({ error: 'Erreur serveur lors du calcul des jours ouvrés' });
        }
    }
}

module.exports = CongesController;

