const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function createAgentsWithRoles() {
    const client = await pool.connect();

    try {
        console.log('🚀 Création des agents et comptes utilisateurs pour les nouveaux rôles...\n');

        await client.query('BEGIN');

        // Récupérer le ministère 1
        const ministereResult = await client.query('SELECT id, nom FROM ministeres WHERE id = 1');
        if (ministereResult.rows.length === 0) {
            throw new Error('Ministère avec ID 1 non trouvé');
        }
        const ministere = ministereResult.rows[0];
        console.log(`📋 Ministère cible: ${ministere.nom} (ID: ${ministere.id})\n`);

        // Récupérer une direction pour les associer
        const directionResult = await client.query(
            'SELECT id, libelle FROM directions WHERE id_ministere = $1 LIMIT 1', [ministere.id]
        );
        const direction = directionResult.rows[0];
        const directionId = direction ? direction.id : null;
        console.log(`📁 Direction: ${direction ? direction.libelle : 'Aucune'} (ID: ${directionId})\n`);

        // Récupérer les IDs des nouveaux rôles
        const rolesResult = await client.query(`
            SELECT id, nom FROM roles 
            WHERE nom IN ('directeur', 'sous_directeur', 'dir_cabinet')
            ORDER BY nom
        `);

        const roles = {};
        rolesResult.rows.forEach(role => {
            roles[role.nom] = role.id;
        });

        console.log('🎭 Rôles disponibles:');
        console.table(rolesResult.rows);
        console.log('');

        // Agents à créer
        const agentsToCreate = [{
                role: 'directeur',
                prenom: 'Jean',
                nom: 'DIRECTEUR',
                matricule: 'DIR-2025-001',
                email: 'jean.directeur@ministere.gov',
                telephone1: '+237 690 000 001',
                sexe: 'M',
                date_de_naissance: '1975-05-15',
                username: 'j.directeur',
                password: 'Dir@2025'
            },
            {
                role: 'sous_directeur',
                prenom: 'Marie',
                nom: 'SOUSDIRECTEUR',
                matricule: 'SDIR-2025-001',
                email: 'marie.sousdirecteur@ministere.gov',
                telephone1: '+237 690 000 002',
                sexe: 'F',
                date_de_naissance: '1980-08-22',
                username: 'm.sousdirecteur',
                password: 'SDir@2025'
            },
            {
                role: 'dir_cabinet',
                prenom: 'Paul',
                nom: 'DIRCABINET',
                matricule: 'DCAB-2025-001',
                email: 'paul.dircabinet@ministere.gov',
                telephone1: '+237 690 000 003',
                sexe: 'M',
                date_de_naissance: '1972-03-10',
                username: 'p.dircabinet',
                password: 'DCab@2025'
            }
        ];

        const createdUsers = [];

        for (const agentData of agentsToCreate) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📝 Création de l'agent: ${agentData.prenom} ${agentData.nom}`);
            console.log(`   Rôle: ${agentData.role.toUpperCase()}`);
            console.log(`${'='.repeat(60)}`);

            // 1. Créer l'agent
            const agentInsertQuery = `
                INSERT INTO agents (
                    matricule, nom, prenom, sexe, date_de_naissance,
                    email, telephone1, id_ministere, id_direction,
                    statut_emploi, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
                RETURNING id, matricule, nom, prenom
            `;

            const agentResult = await client.query(agentInsertQuery, [
                agentData.matricule,
                agentData.nom,
                agentData.prenom,
                agentData.sexe,
                agentData.date_de_naissance,
                agentData.email,
                agentData.telephone1,
                ministere.id,
                directionId,
                'actif'
            ]);

            const agent = agentResult.rows[0];
            console.log(`✅ Agent créé: ${agent.prenom} ${agent.nom} (ID: ${agent.id})`);
            console.log(`   Matricule: ${agent.matricule}`);

            // 2. Hash du mot de passe
            const hashedPassword = await bcrypt.hash(agentData.password, 10);

            // 3. Créer l'utilisateur
            const userInsertQuery = `
                INSERT INTO utilisateurs (
                    username, email, password_hash, id_role, id_agent,
                    is_active, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                RETURNING id, username, email
            `;

            const userResult = await client.query(userInsertQuery, [
                agentData.username,
                agentData.email,
                hashedPassword,
                roles[agentData.role],
                agent.id,
                true
            ]);

            const user = userResult.rows[0];
            console.log(`✅ Utilisateur créé: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Rôle ID: ${roles[agentData.role]}`);
            console.log(`   🔑 Mot de passe: ${agentData.password}`);

            createdUsers.push({
                agent: agent,
                user: user,
                role: agentData.role,
                password: agentData.password
            });
        }

        // Commit de la transaction
        await client.query('COMMIT');

        console.log('\n' + '='.repeat(60));
        console.log('✅ CRÉATION TERMINÉE AVEC SUCCÈS !');
        console.log('='.repeat(60));

        // Résumé des comptes créés
        console.log('\n📊 RÉSUMÉ DES COMPTES CRÉÉS:\n');
        console.log('┌────────────────────────────────────────────────────────────┐');
        console.log('│  INFORMATIONS DE CONNEXION                                 │');
        console.log('├────────────────────────────────────────────────────────────┤');

        createdUsers.forEach((userData, index) => {
            console.log(`│                                                            │`);
            console.log(`│  ${index + 1}. ${userData.role.toUpperCase().padEnd(50)} │`);
            console.log(`│     Nom: ${(userData.agent.prenom + ' ' + userData.agent.nom).padEnd(45)} │`);
            console.log(`│     Username: ${userData.user.username.padEnd(40)} │`);
            console.log(`│     Password: ${userData.password.padEnd(40)} │`);
            console.log(`│     Email: ${userData.user.email.padEnd(43)} │`);
        });

        console.log('│                                                            │');
        console.log('└────────────────────────────────────────────────────────────┘');

        console.log('\n🔐 IMPORTANT: Notez ces mots de passe ! Ils ne seront plus affichés.\n');

        // Vérification finale
        console.log('\n📋 VÉRIFICATION DANS LA BASE DE DONNÉES:\n');

        const verificationQuery = `
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                r.nom as role_nom,
                a.id as agent_id,
                a.matricule,
                a.nom,
                a.prenom,
                m.nom as ministere_nom
            FROM utilisateurs u
            JOIN roles r ON u.id_role = r.id
            JOIN agents a ON u.id_agent = a.id
            JOIN ministeres m ON a.id_ministere = m.id
            WHERE r.nom IN ('directeur', 'sous_directeur', 'dir_cabinet')
            AND m.id = $1
            ORDER BY r.nom
        `;

        const verificationResult = await client.query(verificationQuery, [ministere.id]);
        console.table(verificationResult.rows);

        console.log('\n✅ Script terminé avec succès !');
        console.log('🎯 Vous pouvez maintenant vous connecter avec ces comptes.\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la création des agents:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
console.log('='.repeat(60));
console.log('🚀 CRÉATION DES AGENTS AVEC LES NOUVEAUX RÔLES');
console.log('='.repeat(60));
console.log('');

createAgentsWithRoles()
    .then(() => {
        console.log('='.repeat(60));
        console.log('✅ Script terminé');
        console.log('='.repeat(60));
        process.exit(0);
    })
    .catch((error) => {
        console.error('='.repeat(60));
        console.error('❌ Échec du script');
        console.error('='.repeat(60));
        console.error(error);
        process.exit(1);
    });