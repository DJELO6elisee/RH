const pool = require('../config/database');

class MariageNotificationService {
    /**
     * Génère un message de notification pour un mariage
     */
    static generateMessage(agent, delai) {
        const nomAgent = `${agent.prenom} ${agent.nom}`;
        const nomConjoint = `${agent.prenom_conjointe || ''} ${agent.nom_conjointe || ''}`.trim();
        const dateMariage = new Date(agent.date_mariage);
        const dateFormatee = dateMariage.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let delaiTexte = '';
        let urgenceTexte = '';
        if (delai === 30) {
            delaiTexte = 'dans un mois';
            urgenceTexte = 'Rappel - 1 mois';
        } else if (delai === 7) {
            delaiTexte = 'dans une semaine';
            urgenceTexte = 'Rappel - 1 semaine';
        } else if (delai === 3) {
            delaiTexte = 'dans 3 jours';
            urgenceTexte = 'Rappel - 3 jours';
        }

        const lieuMariage = agent.lieu_mariage || 'Non spécifiée';
        const lieuReception = agent.lieu_reception || 'Non spécifié';

        const message = `
╔═══════════════════════════════════════════════════════════════╗
║              💐 CÉLÉBRATION DE MARIAGE 💐                     ║
╚═══════════════════════════════════════════════════════════════╝

Chers collègues,

Nous avons l'immense plaisir de vous annoncer que notre collègue 

    👤 **${nomAgent}**

célébrera son union avec

    💑 **${nomConjoint}**

${delaiTexte}, le **${dateFormatee}**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 **DATE DU MARIAGE**
   ${dateFormatee}

🏛️ **MAIRIE**
   ${lieuMariage}

🎊 **LIEU DE RÉCEPTION**
   ${lieuReception}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En cette occasion exceptionnelle, nous souhaitons à notre cher(e) collègue **${nomAgent}** et à son époux(se) **${nomConjoint}** :

   ❤️  Beaucoup de bonheur et d'amour
   🌟  Une vie commune remplie de joie et de prospérité
   🙏  Que cette union soit bénie et source d'épanouissement

Que cette nouvelle étape de leur vie soit marquée par la complicité, 
le respect mutuel et une harmonie qui grandit chaque jour.

Nous serons tous présents en pensée pour célébrer ce moment unique 
et partager leur bonheur.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avec nos plus sincères félicitations et nos meilleurs vœux,

La Direction des Ressources Humaines
Ministère du Tourisme et des Loisirs

📧 Pour toute information complémentaire, n'hésitez pas à nous contacter.
        `.trim();

        return message;
    }

    /**
     * Envoie les notifications de mariage à tous les agents du ministère
     */
    static async envoyerNotificationsMariage(agentId, delai) {
        try {
            // Récupérer les informations de l'agent qui se marie
            const agentQuery = `
                SELECT 
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.nom_conjointe,
                    a.prenom_conjointe,
                    a.date_mariage,
                    a.lieu_mariage,
                    a.lieu_reception,
                    a.id_ministere
                FROM agents a
                WHERE a.id = $1 
                AND a.id_situation_matrimoniale = 2
                AND a.date_mariage IS NOT NULL
            `;

            const agentResult = await pool.query(agentQuery, [agentId]);
            
            if (agentResult.rows.length === 0) {
                console.log(`⚠️ Agent ${agentId} non trouvé ou non marié`);
                return { success: false, message: 'Agent non trouvé ou non marié' };
            }

            const agent = agentResult.rows[0];
            const ministereId = agent.id_ministere;

            if (!ministereId) {
                console.log(`⚠️ Agent ${agentId} sans ministère`);
                return { success: false, message: 'Agent sans ministère' };
            }

            // Utiliser le format correct pour le type de notification
            let typeNotification = '';
            if (delai === 30) {
                typeNotification = 'mariage_30_jours';
            } else if (delai === 7) {
                typeNotification = 'mariage_7_jours';
            } else if (delai === 3) {
                typeNotification = 'mariage_3_jours';
            } else {
                typeNotification = `mariage_${delai}_jours`;
            }

            // Vérifier si une notification a déjà été envoyée pour ce mariage avec ce délai aujourd'hui
            // On vérifie dans les notifications envoyées aujourd'hui pour éviter les doublons
            const checkQuery = `
                SELECT DISTINCT nd.id 
                FROM notifications_demandes nd
                INNER JOIN demandes d ON nd.id_demande = d.id
                WHERE nd.type_notification = $1 
                AND d.id_agent = $2
                AND DATE(nd.date_creation) = CURRENT_DATE
            `;
            
            const checkResult = await pool.query(checkQuery, [typeNotification, agentId]);
            
            if (checkResult.rows.length > 0) {
                console.log(`ℹ️ Notification déjà envoyée pour le mariage de ${agent.nom} ${agent.prenom} (délai: ${delai} jours)`);
                return { success: true, message: 'Notification déjà envoyée', skipped: true };
            }

            // Récupérer tous les agents du ministère (sauf l'agent qui se marie)
            const agentsQuery = `
                SELECT id 
                FROM agents 
                WHERE id_ministere = $1 
                AND id != $2
                AND statut_emploi = 'actif'
            `;

            const agentsResult = await pool.query(agentsQuery, [ministereId, agentId]);
            const agents = agentsResult.rows;

            if (agents.length === 0) {
                console.log(`⚠️ Aucun agent trouvé dans le ministère ${ministereId}`);
                return { success: false, message: 'Aucun agent trouvé' };
            }

            // Générer le message
            const message = this.generateMessage(agent, delai);
            
            // Créer un titre descriptif selon le délai
            let titreDelai = '';
            if (delai === 30) {
                titreDelai = 'Rappel - 1 mois';
            } else if (delai === 7) {
                titreDelai = 'Rappel - 1 semaine';
            } else if (delai === 3) {
                titreDelai = 'Rappel - 3 jours';
            }
            
            const titre = `💐 Célébration de mariage - ${agent.prenom} ${agent.nom} (${titreDelai})`;

            // Créer une demande fictive pour les notifications de mariage
            const demandeQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, status, niveau_actuel, 
                    date_creation, priorite
                ) VALUES ($1, 'notification_mariage', $2, 'approuve', 'finalise', CURRENT_TIMESTAMP, 'normale')
                RETURNING id
            `;

            const demandeResult = await pool.query(demandeQuery, [
                agentId, 
                `Notification de mariage - ${agent.prenom} ${agent.nom} avec ${agent.prenom_conjointe || ''} ${agent.nom_conjointe || ''}`
            ]);
            const id_demande_fictive = demandeResult.rows[0].id;

            // Créer les notifications pour chaque agent
            let notificationsCreees = 0;
            for (const destAgent of agents) {
                try {
                    const notificationQuery = `
                        INSERT INTO notifications_demandes (
                            id_demande, id_agent_destinataire, type_notification, titre, message
                        ) VALUES ($1, $2, $3, $4, $5)
                        RETURNING id
                    `;

                    await pool.query(notificationQuery, [
                        id_demande_fictive,
                        destAgent.id,
                        typeNotification,
                        titre,
                        message
                    ]);

                    notificationsCreees++;
                } catch (error) {
                    console.error(`Erreur lors de la création de la notification pour l'agent ${destAgent.id}:`, error);
                }
            }

            console.log(`✅ ${notificationsCreees} notifications de mariage envoyées pour ${agent.nom} ${agent.prenom} (délai: ${delai} jours)`);

            return {
                success: true,
                message: `${notificationsCreees} notifications envoyées`,
                nombre_agents: notificationsCreees
            };

        } catch (error) {
            console.error('Erreur lors de l\'envoi des notifications de mariage:', error);
            throw error;
        }
    }

    /**
     * Vérifie les mariages à venir et envoie les notifications
     */
    static async verifierEtEnvoyerNotifications() {
        try {
            console.log('🔍 Vérification des mariages à venir...');

            // Vérifier si les colonnes lieu_mariage et lieu_reception existent
            let hasLieuMariage = false;
            let hasLieuReception = false;

            try {
                const columnCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'agents' 
                    AND column_name IN ('lieu_mariage', 'lieu_reception')
                `);
                
                const existingColumns = columnCheck.rows.map(row => row.column_name);
                hasLieuMariage = existingColumns.includes('lieu_mariage');
                hasLieuReception = existingColumns.includes('lieu_reception');
            } catch (error) {
                console.error('Erreur lors de la vérification des colonnes:', error);
            }

            // Récupérer les agents qui se marient dans 30 jours, 7 jours et 3 jours
            const delais = [30, 7, 3];
            const aujourdhui = new Date();
            aujourdhui.setHours(0, 0, 0, 0);

            let totalNotifications = 0;

            for (const delai of delais) {
                // Calculer la date cible (dans X jours)
                const dateCible = new Date(aujourdhui);
                dateCible.setDate(dateCible.getDate() + delai);
                
                // Créer une plage de dates pour le jour exact (de 00:00:00 à 23:59:59)
                const dateDebut = new Date(dateCible);
                dateDebut.setHours(0, 0, 0, 0);
                
                const dateFin = new Date(dateCible);
                dateFin.setHours(23, 59, 59, 999);

                const query = `
                    SELECT 
                        a.id,
                        a.nom,
                        a.prenom,
                        a.matricule,
                        a.nom_conjointe,
                        a.prenom_conjointe,
                        a.date_mariage
                        ${hasLieuMariage ? ', a.lieu_mariage' : ''}
                        ${hasLieuReception ? ', a.lieu_reception' : ''}
                    FROM agents a
                    WHERE a.id_situation_matrimoniale = 2
                    AND a.date_mariage IS NOT NULL
                    AND a.date_mariage >= $1
                    AND a.date_mariage <= $2
                `;

                const result = await pool.query(query, [
                    dateDebut.toISOString().split('T')[0],
                    dateFin.toISOString().split('T')[0]
                ]);

                console.log(`📅 ${result.rows.length} mariage(s) trouvé(s) dans ${delai} jour(s)`);

                for (const agent of result.rows) {
                    try {
                        const result = await this.envoyerNotificationsMariage(agent.id, delai);
                        if (result.success && !result.skipped) {
                            totalNotifications += result.nombre_agents || 0;
                        }
                    } catch (error) {
                        console.error(`Erreur lors de l'envoi pour l'agent ${agent.id}:`, error);
                    }
                }
            }

            console.log(`✅ Vérification terminée. ${totalNotifications} notifications envoyées au total.`);
            return { success: true, totalNotifications };

        } catch (error) {
            console.error('Erreur lors de la vérification des mariages:', error);
            throw error;
        }
    }
}

module.exports = MariageNotificationService;


