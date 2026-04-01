const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addNewRoles() {
    const client = await pool.connect();

    try {
        console.log('🔄 Ajout des nouveaux rôles...\n');

        // Insertion des nouveaux rôles
        const roles = [{
                nom: 'directeur',
                description: 'Directeur avec accès complet à la gestion de sa direction',
                permissions: {
                    direction: true,
                    agents_direction: true,
                    reports_direction: true,
                    validations: true,
                    all_demandes: true
                }
            },
            {
                nom: 'sous_directeur',
                description: 'Sous-directeur avec accès à la gestion de sa sous-direction',
                permissions: {
                    sous_direction: true,
                    agents_sous_direction: true,
                    reports_sous_direction: true,
                    validations: true
                }
            },
            {
                nom: 'dir_cabinet',
                description: 'Directeur de cabinet avec accès stratégique et de supervision',
                permissions: {
                    cabinet: true,
                    supervision: true,
                    reports_cabinet: true,
                    validations_cabinet: true,
                    all_directions: true
                }
            }
        ];

        for (const role of roles) {
            try {
                const result = await client.query(
                    `INSERT INTO roles (nom, description, permissions) 
                     VALUES ($1, $2, $3) 
                     ON CONFLICT (nom) DO UPDATE 
                     SET description = $2, permissions = $3
                     RETURNING *`, [role.nom, role.description, JSON.stringify(role.permissions)]
                );

                console.log(`✅ Rôle '${role.nom}' ajouté/mis à jour avec succès`);
            } catch (error) {
                console.error(`❌ Erreur lors de l'ajout du rôle '${role.nom}':`, error.message);
            }
        }

        // Afficher tous les rôles
        console.log('\n📋 Liste de tous les rôles dans la base de données:\n');
        const allRoles = await client.query('SELECT id, nom, description FROM roles ORDER BY id');

        console.table(allRoles.rows);

        console.log('\n✅ Opération terminée avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
addNewRoles();