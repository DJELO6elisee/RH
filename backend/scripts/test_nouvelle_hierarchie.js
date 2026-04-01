const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testNouvelleHierarchie() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de la nouvelle hiérarchie de validation...\n');

        // 1. Vérifier les utilisateurs créés avec leurs rôles
        console.log('👥 Vérification des utilisateurs créés :');
        const usersQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                r.nom as role_nom,
                u.username,
                m.nom as ministere_nom,
                d.libelle as direction_nom
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            LEFT JOIN directions d ON a.id_direction = d.id
            WHERE r.nom IN ('chef_cabinet', 'directeur_general', 'directeur_central', 'sous_directeur', 'directeur', 'dir_cabinet')
            ORDER BY r.nom
        `;

        const usersResult = await client.query(usersQuery);

        usersResult.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.prenom} ${user.nom} (${user.matricule})`);
            console.log(`   - Rôle: ${user.role_nom}`);
            console.log(`   - Username: ${user.username}`);
            console.log(`   - Ministère: ${user.ministere_nom}`);
            console.log(`   - Direction: ${user.direction_nom}`);
            console.log('');
        });

        // 2. Vérifier les colonnes de validation ajoutées
        console.log('📋 Vérification des colonnes de validation :');
        const columnsQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'demandes' 
            AND (column_name LIKE '%sous_directeur%' 
                OR column_name LIKE '%directeur%'
                OR column_name LIKE '%dir_cabinet%'
                OR column_name LIKE '%chef_cabinet%')
            AND column_name NOT LIKE '%id_validateur%'
            ORDER BY column_name
        `;

        const columnsResult = await client.query(columnsQuery);
        console.log('Colonnes de statut disponibles :');
        columnsResult.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name} (${col.data_type})`);
        });
        console.log('');

        // 3. Simuler une demande d'agent pour tester la hiérarchie
        console.log('🔄 Simulation de la nouvelle hiérarchie :');

        // Récupérer un agent normal (non cadre)
        const agentQuery = `
            SELECT a.id, a.prenom, a.nom, a.matricule
            FROM agents a
            LEFT JOIN utilisateurs u ON a.id = u.id_agent
            WHERE u.id_agent IS NULL OR u.id_role NOT IN (
                SELECT id FROM roles WHERE nom IN ('chef_service', 'sous_directeur', 'directeur', 'drh', 'dir_cabinet', 'chef_cabinet', 'directeur_general', 'directeur_central', 'ministre')
            )
            LIMIT 1
        `;

        const agentResult = await client.query(agentQuery);

        if (agentResult.rows.length > 0) {
            const agent = agentResult.rows[0];
            console.log(`Agent test: ${agent.prenom} ${agent.nom} (${agent.matricule})`);

            // Simuler la création d'une demande
            const testDemandeQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, date_fin,
                    lieu, priorite, documents_joints, niveau_evolution_demande, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, niveau_evolution_demande
            `;

            const testDemandeValues = [
                agent.id,
                'absence',
                'Test de la nouvelle hiérarchie',
                '2025-01-15',
                '2025-01-17',
                'Test',
                'normale',
                JSON.stringify([]),
                'soumis', // Selon la nouvelle hiérarchie : Agent → Sous-Directeur
                'en_attente'
            ];

            const testDemandeResult = await client.query(testDemandeQuery, testDemandeValues);
            const demandeId = testDemandeResult.rows[0].id;
            const niveauInitial = testDemandeResult.rows[0].niveau_evolution_demande;

            console.log(`✅ Demande test créée avec l'ID: ${demandeId}`);
            console.log(`📊 Niveau initial: ${niveauInitial}`);
            console.log(`🔄 Flux attendu: Agent → Sous-Directeur → Directeur → DRH → Dir Cabinet → Ministre`);

            // Nettoyer la demande de test
            await client.query('DELETE FROM demandes WHERE id = $1', [demandeId]);
            console.log('🧹 Demande test supprimée');

        } else {
            console.log('⚠️ Aucun agent normal trouvé pour le test');
        }

        // 4. Vérifier les rôles dans la table roles
        console.log('\n🎭 Vérification des rôles disponibles :');
        const rolesQuery = `
            SELECT nom, description 
            FROM roles 
            ORDER BY nom
        `;

        const rolesResult = await client.query(rolesQuery);
        rolesResult.rows.forEach((role, index) => {
            console.log(`${index + 1}. ${role.nom} - ${role.description}`);
        });

        // 5. Résumé de la nouvelle hiérarchie
        console.log('\n📊 RÉSUMÉ DE LA NOUVELLE HIÉRARCHIE :');
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log('│                    NOUVELLE HIÉRARCHIE DE VALIDATION            │');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ 1. Dir Cabinet & Chef Cabinet → Ministre (directement)        │');
        console.log('│ 2. Directeur Général & Directeur Central → Dir Cabinet        │');
        console.log('│ 3. Chef de Service → Sous-Directeur → DRH                     │');
        console.log('│ 4. Sous-Directeur → DRH (directement)                         │');
        console.log('│ 5. Agents → Sous-Directeur → Directeur → DRH → Dir Cabinet →  │');
        console.log('│    Ministre                                                    │');
        console.log('│ 6. Notification spéciale : Sous-Directeur informé quand       │');
        console.log('│    Chef Service reçoit validation du DRH                      │');
        console.log('└─────────────────────────────────────────────────────────────────┘');

        console.log('\n✅ Test de la nouvelle hiérarchie terminé avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testNouvelleHierarchie()
    .then(() => {
        console.log('\n🎉 Script de test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });