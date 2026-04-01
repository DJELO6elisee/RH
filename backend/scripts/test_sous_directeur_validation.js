const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testSousDirecteurValidation() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de validation par un sous-directeur...\n');

        // 1. Récupérer une demande en attente avec niveau 'soumis'
        console.log('1️⃣ Récupération d\'une demande en attente:');
        const demandeQuery = `
            SELECT 
                d.id,
                d.type_demande,
                d.description,
                d.status,
                d.niveau_evolution_demande,
                a.prenom,
                a.nom,
                a.matricule
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            WHERE d.status = 'en_attente' 
            AND d.niveau_evolution_demande = 'soumis'
            LIMIT 1
        `;

        const demandeResult = await client.query(demandeQuery);

        if (demandeResult.rows.length === 0) {
            console.log('   ❌ Aucune demande en attente trouvée');
            return;
        }

        const demande = demandeResult.rows[0];
        console.log(`   ✅ Demande trouvée: ID ${demande.id} - ${demande.prenom} ${demande.nom}`);
        console.log(`      Type: ${demande.type_demande}`);
        console.log(`      Description: ${demande.description}`);
        console.log(`      Niveau: ${demande.niveau_evolution_demande}`);

        // 2. Récupérer un sous-directeur
        console.log('\n2️⃣ Récupération d\'un sous-directeur:');
        const sousDirecteurQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                a.id_direction
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'sous_directeur'
            LIMIT 1
        `;

        const sousDirecteurResult = await client.query(sousDirecteurQuery);

        if (sousDirecteurResult.rows.length === 0) {
            console.log('   ❌ Aucun sous-directeur trouvé');
            return;
        }

        const sousDirecteur = sousDirecteurResult.rows[0];
        console.log(`   ✅ Sous-directeur trouvé: ID ${sousDirecteur.id} - ${sousDirecteur.prenom} ${sousDirecteur.nom}`);
        console.log(`      Direction: ${sousDirecteur.id_direction}`);

        // 3. Simuler la validation (sans committer)
        console.log('\n3️⃣ Simulation de la validation:');

        try {
            await client.query('BEGIN');

            // 3.1. Mettre à jour la demande
            console.log('   3.1. Mise à jour de la demande...');
            const updateDemandeQuery = `
                UPDATE demandes 
                SET 
                    statut_sous_directeur = $1,
                    date_validation_sous_directeur = CURRENT_TIMESTAMP,
                    commentaire_sous_directeur = $2,
                    id_validateur_sous_directeur = $3,
                    niveau_evolution_demande = $4
                WHERE id = $5
            `;

            const updateParams = [
                'approuve', // statut_sous_directeur
                'Validation test par sous-directeur', // commentaire_sous_directeur
                sousDirecteur.id, // id_validateur_sous_directeur
                'valide_par_sous_directeur', // niveau_evolution_demande
                demande.id // id
            ];

            await client.query(updateDemandeQuery, updateParams);
            console.log('      ✅ Demande mise à jour');

            // 3.2. Insérer dans workflow_demandes
            console.log('   3.2. Insertion dans workflow_demandes...');
            const workflowQuery = `
                INSERT INTO workflow_demandes (
                    id_demande, 
                    niveau_validation, 
                    id_validateur, 
                    action, 
                    commentaire, 
                    date_action
                ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            `;

            const workflowParams = [
                demande.id, // id_demande
                'sous_directeur', // niveau_validation
                sousDirecteur.id, // id_validateur
                'approuve', // action
                'Validation test par sous-directeur' // commentaire
            ];

            await client.query(workflowQuery, workflowParams);
            console.log('      ✅ Workflow mis à jour');

            // 3.3. Annuler la transaction (test seulement)
            await client.query('ROLLBACK');
            console.log('      ✅ Transaction annulée (test seulement)');

            console.log('   ✅ Simulation de validation réussie !');

        } catch (error) {
            await client.query('ROLLBACK');
            console.log(`   ❌ Erreur lors de la simulation: ${error.message}`);
            console.log(`      Code d'erreur: ${error.code}`);
            console.log(`      Détail: ${error.detail}`);

            if (error.code === '23514') {
                console.log('      💡 Erreur de contrainte de vérification');
            }
            return;
        }

        // 4. Vérifier les contraintes de la table workflow_demandes
        console.log('\n4️⃣ Vérification des contraintes:');

        const constraintsQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'workflow_demandes'::regclass
            AND contype = 'c'
            ORDER BY conname
        `;

        const constraintsResult = await client.query(constraintsQuery);

        console.log(`   📊 ${constraintsResult.rows.length} contraintes trouvées:`);
        constraintsResult.rows.forEach((constraint, index) => {
            console.log(`   ${index + 1}. ${constraint.constraint_name}`);
            console.log(`      ${constraint.constraint_definition}`);
        });

        // 5. Tester l'insertion directe avec différentes valeurs
        console.log('\n5️⃣ Test d\'insertion directe:');

        const testInsertQuery = `
            INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
            VALUES ($1, $2, $3, $4, $5)
        `;

        try {
            await client.query('BEGIN');
            await client.query(testInsertQuery, [999, 'sous_directeur', 999, 'test', 'test direct']);
            await client.query('ROLLBACK');
            console.log('   ✅ Insertion directe avec "sous_directeur" réussie');
        } catch (error) {
            await client.query('ROLLBACK');
            console.log(`   ❌ Insertion directe échouée: ${error.message}`);
            console.log(`      Code: ${error.code}`);
        }

        console.log('\n🎉 Test de validation sous-directeur terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testSousDirecteurValidation()
    .then(() => {
        console.log('\n🎊 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });