const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

// Fonction pour déterminer le type d'entité basé sur le code DIR/SER
function determineEntityType(code) {
    const parts = code.trim().split(/\s+/);
    if (parts.length < 6) return null;
    
    const p3 = parts[2];
    const p4 = parts[3];
    const p5 = parts[4];
    const p6 = parts[5];
    
    // Compter les paires de 00 à la fin
    if (p6 === '00' && p5 === '00' && p4 === '00') {
        return 'direction'; // 3 paires de 00
    } else if (p6 === '00' && p5 === '00' && p4 !== '00') {
        return 'sous_direction'; // 2 paires de 00
    } else if (p6 === '00' && p5 !== '00') {
        return 'service'; // 1 paire de 00 à la fin
    }
    
    return 'direction'; // Par défaut
}

async function parseCSV() {
    const csvPath = path.join(__dirname, '../../Liste-du-Personel-_1_.csv');
    
    return new Promise((resolve, reject) => {
        const rows = [];
        let currentEntity = null;
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const matricule = row['Matricule'] || '';
                
                // Vérifier si c'est une ligne DIR / SER
                if (matricule.startsWith('DIR / SER :')) {
                    // Extraire le code et le libellé
                    const match = matricule.match(/DIR \/ SER : ([\d\s]+)\s+(.+)/);
                    if (match) {
                        const code = match[1].trim();
                        const libelle = match[2].trim();
                        const type = determineEntityType(code);
                        
                        currentEntity = {
                            code: code.replace(/\s+/g, ' '),
                            libelle: libelle,
                            type: type
                        };
                    }
                } else if (matricule && !matricule.includes('sous/total') && currentEntity) {
                    // C'est un agent
                    rows.push({
                        matricule: matricule,
                        nom: row['Nom et Prénom'] || '',
                        fonction: row['Fonction'] || row[' fonction'] || '',
                        direction_col43: row['Direction'] || '', // Colonne 43
                        service_col45: row['Service'] || '',     // Colonne 45
                        entity_code: currentEntity.code,
                        entity_libelle: currentEntity.libelle,
                        entity_type: currentEntity.type
                    });
                }
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

async function assignAgents() {
    const client = await pool.connect();
    
    try {
        console.log('\n================================================================================');
        console.log('📊 PARSING ET ASSIGNATION DES AGENTS DU CSV');
        console.log('================================================================================\n');
        
        console.log('📄 Lecture du CSV...\n');
        const rows = await parseCSV();
        
        console.log(`✅ ${rows.length} agents trouvés dans le CSV\n`);
        
        // Afficher quelques exemples pour vérifier
        console.log('📋 Premiers exemples parsés:');
        console.table(rows.slice(0, 10).map(r => ({
            Matricule: r.matricule,
            Nom: r.nom.substring(0, 20),
            'Col 43': r.direction_col43,
            'Entité DIR/SER': r.entity_libelle.substring(0, 30),
            'Type': r.entity_type
        })));
        
        console.log('\n🔄 Mise à jour des agents...\n');
        
        let updated = 0;
        let errors = 0;
        
        for (const row of rows) {
            try {
                // Déterminer l'ID de l'entité
                let entityId = null;
                let updateField = null;
                
                if (row.entity_type === 'direction') {
                    const result = await client.query(
                        'SELECT id FROM directions WHERE code = $1 OR UPPER(libelle) = UPPER($2) LIMIT 1',
                        [row.entity_code, row.entity_libelle]
                    );
                    if (result.rows.length > 0) {
                        entityId = result.rows[0].id;
                        updateField = 'id_direction';
                    }
                } else if (row.entity_type === 'sous_direction') {
                    const result = await client.query(
                        'SELECT id FROM sous_directions WHERE code = $1 OR UPPER(libelle) = UPPER($2) LIMIT 1',
                        [row.entity_code, row.entity_libelle]
                    );
                    if (result.rows.length > 0) {
                        entityId = result.rows[0].id;
                        updateField = 'id_sous_direction';
                    }
                } else if (row.entity_type === 'service') {
                    // Pour les services, on cherche ou on crée
                    const result = await client.query(
                        'SELECT id FROM services WHERE UPPER(libelle) = UPPER($1) LIMIT 1',
                        [row.entity_libelle]
                    );
                    if (result.rows.length > 0) {
                        entityId = result.rows[0].id;
                        updateField = 'id_service';
                    }
                }
                
                // Mettre à jour l'agent
                if (entityId && updateField) {
                    await client.query(
                        `UPDATE agents SET ${updateField} = $1 WHERE matricule = $2`,
                        [entityId, row.matricule]
                    );
                    updated++;
                }
                
                // Gérer la colonne 43 (Direction Générale)
                if (row.direction_col43) {
                    // Mapper vers les DG
                    let dgId = null;
                    const dir43 = row.direction_col43.toUpperCase().trim();
                    
                    if (dir43.includes('DG') && dir43.includes('INDUSTRIE')) {
                        dgId = await client.query(
                            'SELECT id FROM direction_generale WHERE code = $1',
                            ['DG ITH']
                        ).then(r => r.rows[0]?.id);
                    } else if (dir43.includes('DG') && dir43.includes('LOISIRS')) {
                        dgId = await client.query(
                            'SELECT id FROM direction_generale WHERE code = $1',
                            ['DG LOISIRS']
                        ).then(r => r.rows[0]?.id);
                    }
                    
                    if (dgId) {
                        await client.query(
                            'UPDATE agents SET id_direction_generale = $1 WHERE matricule = $2',
                            [dgId, row.matricule]
                        );
                    }
                }
                
            } catch (err) {
                errors++;
                if (errors <= 5) {
                    console.error(`   ⚠️  Erreur pour ${row.matricule}: ${err.message}`);
                }
            }
        }
        
        console.log(`\n✅ Assignation terminée: ${updated} agents mis à jour`);
        if (errors > 0) {
            console.log(`⚠️  ${errors} erreurs rencontrées`);
        }
        
        // Statistiques finales
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(id_direction_generale) as avec_dg,
                COUNT(id_direction) as avec_dir,
                COUNT(id_sous_direction) as avec_sd,
                COUNT(id_service) as avec_serv
            FROM agents
        `);
        
        const s = stats.rows[0];
        
        console.log('\n📊 STATISTIQUES FINALES:');
        console.log(`   Total agents: ${s.total}`);
        console.log(`   Avec DG: ${s.avec_dg} (${((s.avec_dg / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Direction: ${s.avec_dir} (${((s.avec_dir / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Sous-Direction: ${s.avec_sd} (${((s.avec_sd / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Service: ${s.avec_serv} (${((s.avec_serv / s.total) * 100).toFixed(1)}%)`);
        
        console.log('\n🎉 TERMINÉ!\n');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

assignAgents();




















