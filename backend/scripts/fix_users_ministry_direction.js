const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function fixUsersMinistryDirection() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction des utilisateurs pour le ministère 1...');

        // 1. Vérifier les directions du ministère 1
        console.log('\n🔍 Vérification des directions du ministère 1...');
        const directionsQuery = `
            SELECT d.id, d.libelle, d.description, d.id_ministere
            FROM directions d
            WHERE d.id_ministere = 1
            ORDER BY d.id
        `;

        const directionsResult = await client.query(directionsQuery);

        if (directionsResult.rows.length === 0) {
            console.log('⚠️ Aucune direction trouvée pour le ministère 1. Création d\'une direction par défaut...');

            // Créer une direction par défaut pour le ministère 1
            const createDirectionQuery = `
                INSERT INTO directions (libelle, description, id_ministere, created_at, updated_at)
                VALUES ('Direction Générale', 'Direction générale du ministère de l\'éducation', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            const createResult = await client.query(createDirectionQuery);
            const directionId = createResult.rows[0].id;

            console.log(`✅ Direction créée avec l'ID: ${directionId}`);
        } else {
            console.log('\n📋 Directions disponibles pour le ministère 1 :');
            directionsResult.rows.forEach((dir, index) => {
                console.log(`${index + 1}. ID: ${dir.id} - ${dir.libelle}`);
            });
        }

        // 2. Récupérer la première direction du ministère 1
        const firstDirectionResult = await client.query(directionsQuery);
        const targetDirectionId = firstDirectionResult.rows[0].id;

        console.log(`\n🎯 Utilisation de la direction ID: ${targetDirectionId} (${firstDirectionResult.rows[0].libelle})`);

        // 3. Corriger les agents créés
        console.log('\n🔧 Correction des agents...');

        const agentsToFix = [
            { username: 'm.chefcabinet', role: 'chef_cabinet' },
            { username: 'p.directeurgeneral', role: 'directeur_general' },
            { username: 'f.directeurcentral', role: 'directeur_central' }
        ];

        for (const agentInfo of agentsToFix) {
            console.log(`\n📝 Correction de ${agentInfo.username} (${agentInfo.role})...`);

            // Mettre à jour l'agent pour le ministère 1 et la direction
            const updateAgentQuery = `
                UPDATE agents 
                SET id_ministere = 1, 
                    id_direction = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = (
                    SELECT u.id_agent 
                    FROM utilisateurs u 
                    JOIN roles r ON u.id_role = r.id 
                    WHERE u.username = $2 AND r.nom = $3
                )
                RETURNING id, prenom, nom, matricule
            `;

            const updateResult = await client.query(updateAgentQuery, [targetDirectionId, agentInfo.username, agentInfo.role]);

            if (updateResult.rows.length > 0) {
                const agent = updateResult.rows[0];
                console.log(`   ✅ Agent corrigé: ${agent.prenom} ${agent.nom} (${agent.matricule})`);
                console.log(`   - Ministère: 1 (Ministère de l'Éducation)`);
                console.log(`   - Direction: ${targetDirectionId} (${firstDirectionResult.rows[0].libelle})`);
            } else {
                console.log(`   ⚠️ Agent non trouvé: ${agentInfo.username}`);
            }
        }

        // 4. Vérification finale
        console.log('\n🔍 Vérification finale...');
        const finalCheckQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                a.id_ministere,
                a.id_direction,
                m.nom as ministere_nom,
                d.libelle as direction_nom,
                r.nom as role_nom,
                u.username
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            LEFT JOIN directions d ON a.id_direction = d.id
            WHERE r.nom IN ('chef_cabinet', 'directeur_general', 'directeur_central')
            ORDER BY a.created_at DESC
        `;

        const finalResult = await client.query(finalCheckQuery);

        console.log('\n✅ Utilisateurs corrigés :');
        finalResult.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.prenom} ${user.nom} (${user.matricule})`);
            console.log(`   - Rôle: ${user.role_nom}`);
            console.log(`   - Username: ${user.username}`);
            console.log(`   - Ministère: ${user.ministere_nom} (ID: ${user.id_ministere})`);
            console.log(`   - Direction: ${user.direction_nom} (ID: ${user.id_direction})`);
            console.log('');
        });

        // Vérifier que tous sont bien dans le ministère 1
        const allInMinistry1 = finalResult.rows.every(user => user.id_ministere === 1);
        if (allInMinistry1) {
            console.log('🎉 Tous les utilisateurs sont maintenant dans le ministère 1 !');
        } else {
            console.log('⚠️ Certains utilisateurs ne sont pas dans le ministère 1');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
fixUsersMinistryDirection()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });