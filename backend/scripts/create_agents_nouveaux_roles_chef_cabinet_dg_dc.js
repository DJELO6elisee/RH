const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function createAgentsAndUsers() {
    const client = await pool.connect();

    try {
        console.log('🔄 Création des agents et utilisateurs pour les nouveaux rôles...');

        // Données des agents à créer
        const agentsData = [{
                prenom: 'Marie',
                nom: 'KONE',
                matricule: 'CC-EDU-2025-001',
                role: 'chef_cabinet',
                username: 'm.chefcabinet',
                password: 'CCab@2025',
                description: 'Chef de Cabinet - Ministère de l\'Éducation'
            },
            {
                prenom: 'Pierre',
                nom: 'TRAORE',
                matricule: 'DG-EDU-2025-001',
                role: 'directeur_general',
                username: 'p.directeurgeneral',
                password: 'DG@2025',
                description: 'Directeur Général - Ministère de l\'Éducation'
            },
            {
                prenom: 'Fatou',
                nom: 'DIABATE',
                matricule: 'DC-EDU-2025-001',
                role: 'directeur_central',
                username: 'f.directeurcentral',
                password: 'DC@2025',
                description: 'Directeur Central - Ministère de l\'Éducation'
            }
        ];

        for (const agentData of agentsData) {
            console.log(`\n📝 Création de ${agentData.description}...`);

            // 1. Créer l'agent
            const agentInsertQuery = `
                INSERT INTO agents (
                    prenom, nom, matricule, date_de_naissance, lieu_de_naissance,
                    email, telephone1, id_ministere, id_direction, 
                    statut_emploi, date_embauche, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            const agentValues = [
                agentData.prenom,
                agentData.nom,
                agentData.matricule,
                '1980-01-15', // Date de naissance par défaut
                'Abidjan', // Lieu de naissance par défaut
                `${agentData.username}@nouveau.gouv.ci`, // Email basé sur le username
                '+22507000000', // Téléphone par défaut
                1, // ID Ministère de l'Éducation
                5, // ID Direction (Service Informatique)
                'actif', // Statut emploi
                '2020-01-01' // Date embauche par défaut
            ];

            const agentResult = await client.query(agentInsertQuery, agentValues);
            const agentId = agentResult.rows[0].id;

            console.log(`   ✅ Agent créé avec l'ID: ${agentId}`);

            // 2. Créer l'utilisateur
            const userInsertQuery = `
                INSERT INTO utilisateurs (
                    username, password_hash, email, id_role, id_agent, 
                    is_active, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            // Récupérer l'ID du rôle
            const roleQuery = 'SELECT id FROM roles WHERE nom = $1';
            const roleResult = await client.query(roleQuery, [agentData.role]);

            if (roleResult.rows.length === 0) {
                throw new Error(`Rôle '${agentData.role}' non trouvé`);
            }

            const roleId = roleResult.rows[0].id;

            const userValues = [
                agentData.username,
                agentData.password, // Le mot de passe sera hashé par le backend
                `${agentData.username}@gouv.ci`,
                roleId,
                agentId,
                true // is_active
            ];

            const userResult = await client.query(userInsertQuery, userValues);
            const userId = userResult.rows[0].id;

            console.log(`   ✅ Utilisateur créé avec l'ID: ${userId}`);
            console.log(`   📋 Informations de connexion:`);
            console.log(`      - Username: ${agentData.username}`);
            console.log(`      - Password: ${agentData.password}`);
            console.log(`      - Rôle: ${agentData.role}`);
            console.log(`      - Matricule: ${agentData.matricule}`);
        }

        // Vérifier les agents créés
        console.log('\n🔍 Vérification des agents créés...');
        const checkQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                r.nom as role_nom,
                u.username,
                u.email
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE r.nom IN ('chef_cabinet', 'directeur_general', 'directeur_central')
            ORDER BY a.created_at DESC
        `;

        const checkResult = await client.query(checkQuery);

        console.log('\n📋 Agents créés avec succès :');
        checkResult.rows.forEach((agent, index) => {
            console.log(`${index + 1}. ${agent.prenom} ${agent.nom} (${agent.matricule})`);
            console.log(`   - Rôle: ${agent.role_nom}`);
            console.log(`   - Username: ${agent.username}`);
            console.log(`   - Email: ${agent.email}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création des agents:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
createAgentsAndUsers()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        console.log('\n📝 Comptes créés pour les tests :');
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│ Chef de Cabinet    │ m.chefcabinet      │ CCab@2025        │');
        console.log('│ Directeur Général  │ p.directeurgeneral │ DG@2025          │');
        console.log('│ Directeur Central  │ f.directeurcentral │ DC@2025          │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });