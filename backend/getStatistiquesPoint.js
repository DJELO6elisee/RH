    async getStatistiquesPoint(req, res) {
        try {
            console.log("📥 Requête pour statistiques Point des Agents reçue.");
            
            // Filtre par ministère
            let id_ministere = null;
            if (req.user && req.user.role !== 'super_admin' && req.user.id_ministere) {
                id_ministere = req.user.id_ministere;
            }

            let whereCondition = '1=1';
            let params = [];

            if (id_ministere) {
                params.push(id_ministere);
                whereCondition += ` AND a.id_ministere = $${params.length}`;
            }

            // Exclure les agents inactifs ou retirés
            whereCondition += " AND (a.statut != 'retire' AND a.statut != 'decede' AND a.statut != 'demission' AND a.statut != 'inactif')";
            whereCondition += " AND (a.is_active = true OR a.is_active IS NULL)";

            // On ne prend que les agents non affectés à des institutions (sauf si nécessaire)
            whereCondition += " AND (a.id_institution IS NULL OR a.id_institution = 0)";

            const query = `
                WITH agents_data AS (
                    SELECT 
                        a.id,
                        a.sexe,
                        a.id_type_d_agent,
                        ta.libele as type_agent_libelle,
                        a.id_grade,
                        g.libele as grade_libelle,
                        a.id_direction_generale,
                        dg.libelle as direction_generale_libelle,
                        dg.code as direction_generale_code,
                        a.id_direction,
                        d.libelle as direction_libelle,
                        d.code as direction_code
                    FROM agents a
                    LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                    LEFT JOIN grades g ON a.id_grade = g.id
                    LEFT JOIN directions_generales dg ON a.id_direction_generale = dg.id
                    LEFT JOIN directions d ON a.id_direction = d.id
                    WHERE ${whereCondition}
                )
                SELECT * FROM agents_data;
            `;

            console.log("SQL STATS POINT:", query, params);
            const result = await pool.query(query, params);
            const agents = result.rows;

            // Organiser les données
            // Les services qu'on affiche seront extraits des directions générales (et potentiellement directions)
            // L'utilisateur veut récupérer directions et directions generales de la DB.
            const stats = {
                fonctionnaires: {},
                nonFonctionnaires: {}
            };

            const initServiceData = () => ({
                fonctionnaires: {
                    A: { A5_7: { F: 0, H: 0 }, A4: { F: 0, H: 0 }, A3: { F: 0, H: 0 }, TOT: { F: 0, H: 0 } },
                    B: { B3: { F: 0, H: 0 }, B1: { F: 0, H: 0 }, TOT: { F: 0, H: 0 } },
                    C: { C2: { F: 0, H: 0 }, C1: { F: 0, H: 0 }, TOT: { F: 0, H: 0 } },
                    D: { D1: { F: 0, H: 0 }, TOT: { F: 0, H: 0 } },
                    TOTAL: { F: 0, H: 0 }
                },
                nonFonctionnaires: {
                    ART18: { F: 0, H: 0 },
                    EXP: { F: 0, H: 0 },
                    CONTR: { F: 0, H: 0 },
                    TOTAL: { F: 0, H: 0 }
                }
            });

            // On va regrouper par nom de service (ex: le nom de la DG ou Dir)
            const servicesMap = new Map();

            agents.forEach(agent => {
                // Détermination du service (Priorité à Direction Générale, sinon Direction, sinon "AUTRES")
                let serviceName = 'AUTRES';
                if (agent.direction_generale_libelle) {
                    serviceName = agent.direction_generale_libelle;
                } else if (agent.direction_libelle) {
                    serviceName = agent.direction_libelle;
                }
                
                // Normaliser (enlever les retours à la ligne)
                serviceName = serviceName.trim().toUpperCase();

                if (!servicesMap.has(serviceName)) {
                    servicesMap.set(serviceName, initServiceData());
                }

                const sData = servicesMap.get(serviceName);
                
                // Sexe
                let sexe = 'H';
                if (agent.sexe) {
                    const sexeNorm = agent.sexe.toUpperCase();
                    if (sexeNorm.startsWith('F')) sexe = 'F';
                }

                const typeAgentId = agent.id_type_d_agent;

                // 1 = FONCTIONNAIRE
                // 2 = CONTRACTUEL
                // 16 = BNETD
                // 17 = CONTRACTUEL(ARTICLE 18)

                if (typeAgentId === 1) { // Fonctionnaires
                    const grade = agent.grade_libelle ? agent.grade_libelle.trim().toUpperCase() : '';
                    let matched = false;

                    // Categorie A
                    if (['A5', 'A6', 'A7'].includes(grade)) {
                        sData.fonctionnaires.A.A5_7[sexe]++;
                        sData.fonctionnaires.A.TOT[sexe]++;
                        matched = true;
                    } else if (grade === 'A4') {
                        sData.fonctionnaires.A.A4[sexe]++;
                        sData.fonctionnaires.A.TOT[sexe]++;
                        matched = true;
                    } else if (grade === 'A3') {
                        sData.fonctionnaires.A.A3[sexe]++;
                        sData.fonctionnaires.A.TOT[sexe]++;
                        matched = true;
                    } else if (grade.startsWith('A')) {
                        // Autres A dans TOT A directement pour ne pas les perdre
                        sData.fonctionnaires.A.TOT[sexe]++;
                        matched = true;
                    }
                    
                    // Categorie B
                    if (grade === 'B3') {
                        sData.fonctionnaires.B.B3[sexe]++;
                        sData.fonctionnaires.B.TOT[sexe]++;
                        matched = true;
                    } else if (grade === 'B1') {
                        sData.fonctionnaires.B.B1[sexe]++;
                        sData.fonctionnaires.B.TOT[sexe]++;
                        matched = true;
                    } else if (grade.startsWith('B')) {
                        sData.fonctionnaires.B.TOT[sexe]++;
                        matched = true;
                    }

                    // Categorie C
                    if (grade === 'C2') {
                        sData.fonctionnaires.C.C2[sexe]++;
                        sData.fonctionnaires.C.TOT[sexe]++;
                        matched = true;
                    } else if (grade === 'C1') {
                        sData.fonctionnaires.C.C1[sexe]++;
                        sData.fonctionnaires.C.TOT[sexe]++;
                        matched = true;
                    } else if (grade.startsWith('C')) {
                        sData.fonctionnaires.C.TOT[sexe]++;
                        matched = true;
                    }

                    // Categorie D
                    if (grade === 'D1' || grade.startsWith('D')) {
                        sData.fonctionnaires.D.D1[sexe]++;
                        sData.fonctionnaires.D.TOT[sexe]++;
                        matched = true;
                    }

                    // Si c'est un fonctionnaire mais grade inconnu ou non parsé, on l'ajoute au total global quand même
                    sData.fonctionnaires.TOTAL[sexe]++;

                } else {
                    // Non fonctionnaires
                    if (typeAgentId === 17) {
                        sData.nonFonctionnaires.ART18[sexe]++;
                        sData.nonFonctionnaires.TOTAL[sexe]++;
                    } else if (typeAgentId === 2) {
                        sData.nonFonctionnaires.CONTR[sexe]++;
                        sData.nonFonctionnaires.TOTAL[sexe]++;
                    } else if (typeAgentId === 16) {
                        // BNETD correspond à EXP dans l'image (Expert)
                        sData.nonFonctionnaires.EXP[sexe]++;
                        sData.nonFonctionnaires.TOTAL[sexe]++;
                    } else {
                        // Les autres non-fonctionnaires iront par défaut dans CONTR s'ils sont contractuels divers, 
                        // ou juste dans le total. On va les ajouter au total général pour ne rien perdre
                        sData.nonFonctionnaires.TOTAL[sexe]++;
                    }
                }
            });

            // Préparer la réponse
            const responseData = {
                services: []
            };

            for (const [serviceName, data] of servicesMap.entries()) {
                responseData.services.push({
                    nom: serviceName,
                    ...data
                });
            }

            // Trier par ordre alphabétique pour un affichage propre
            responseData.services.sort((a, b) => a.nom.localeCompare(b.nom));

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques point:', error);
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques point.' });
        }
    }
