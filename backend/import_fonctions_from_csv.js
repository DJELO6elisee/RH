const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

// Fonction pour parser les dates
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '' || 
        ['n/a', '-', 'na', 'cps abs.', 'ns abste', '00 00 00', 'inconnue'].includes(dateStr.toLowerCase().trim())) {
        return null;
    }
    
    // Format M/D/YYYY
    const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match1) {
        const [, month, day, year] = match1;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format D/M/YYYY
    const match2 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match2) {
        const [, day, month, year] = match2;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
}

// Fonction pour nettoyer les chaînes SQL
function cleanSqlString(text) {
    if (!text || text.trim() === '' || text.trim().toUpperCase() === 'INCONNUE') {
        return null;
    }
    return text.trim();
}

async function importFonctions() {
    const client = await pool.connect();
    
    try {
        console.log('\n🚀 Début de l\'importation des fonctions depuis le CSV...\n');
        
        // Lire le fichier CSV
        const csvPath = path.join(__dirname, '..', 'Liste-du-Personel-_1_.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Ignorer la première ligne (en-tête)
        const dataLines = lines.slice(1);
        
        console.log(`📄 Fichier CSV chargé: ${dataLines.length} lignes trouvées\n`);
        
        // Démarrer une transaction
        await client.query('BEGIN');
        
        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        const functionsSet = new Set();
        const errors = [];
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;
            
            // Parser la ligne CSV (attention aux guillemets et virgules)
            const row = line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g).map(cell => {
                const value = cell.replace(/,$/, '').trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    return value.slice(1, -1).replace(/""/g, '"');
                }
                return value;
            });
            
            if (row.length < 38) {
                continue;
            }
            
            const matricule = cleanSqlString(row[0]);
            if (!matricule || matricule.startsWith('DIR / SER')) {
                continue;
            }
            
            const fonction = cleanSqlString(row[7]);
            const refNomination = cleanSqlString(row[35]);
            const typeActe = cleanSqlString(row[36]) || 'Arrêté';
            const dateSignature = parseDate(row[37]);
            
            if (!fonction) {
                continue;
            }
            
            processedCount++;
            const fonctionUpper = fonction.toUpperCase();
            functionsSet.add(fonctionUpper);
            
            try {
                // Vérifier si l'agent existe
                const agentResult = await client.query(
                    'SELECT id FROM agents WHERE matricule = $1',
                    [matricule]
                );
                
                if (agentResult.rows.length === 0) {
                    skipCount++;
                    errors.push(`⚠️  Agent ${matricule} non trouvé`);
                    continue;
                }
                
                const agentId = agentResult.rows[0].id;
                
                // Vérifier si l'agent a déjà une fonction
                const existingFonction = await client.query(
                    'SELECT id FROM fonction_agents WHERE id_agent = $1',
                    [agentId]
                );
                
                if (existingFonction.rows.length > 0) {
                    skipCount++;
                    continue;
                }
                
                // Créer ou récupérer la fonction
                let fonctionId;
                const fonctionExist = await client.query(
                    'SELECT id FROM fonctions WHERE UPPER(libele) = $1',
                    [fonctionUpper]
                );
                
                if (fonctionExist.rows.length > 0) {
                    fonctionId = fonctionExist.rows[0].id;
                } else {
                    const fonctionInsert = await client.query(
                        'INSERT INTO fonctions (libele, nbr_agent, created_at, updated_at) VALUES ($1, 0, NOW(), NOW()) RETURNING id',
                        [fonctionUpper]
                    );
                    fonctionId = fonctionInsert.rows[0].id;
                }
                
                // Créer la nomination
                const nominationNumero = refNomination || `AUTO-${matricule}-FONC`;
                const nominationDate = dateSignature || new Date().toISOString().split('T')[0];
                
                let nominationId;
                try {
                    const nominationInsert = await client.query(
                        `INSERT INTO nominations (id_agent, nature, numero, date_signature, type_nomination, statut, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, 'fonction', 'active', NOW(), NOW())
                         ON CONFLICT (numero) DO UPDATE SET updated_at = NOW()
                         RETURNING id`,
                        [agentId, typeActe, nominationNumero, nominationDate]
                    );
                    nominationId = nominationInsert.rows[0].id;
                } catch (e) {
                    // Si conflit, récupérer l'ID existant
                    const nominationExist = await client.query(
                        'SELECT id FROM nominations WHERE numero = $1',
                        [nominationNumero]
                    );
                    nominationId = nominationExist.rows[0].id;
                }
                
                // Créer le lien fonction_agent
                await client.query(
                    `INSERT INTO fonction_agents (id_agent, id_fonction, id_nomination, date_entree, designation_poste, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                    [agentId, fonctionId, nominationId, nominationDate, fonction]
                );
                
                successCount++;
                
                if (successCount % 50 === 0) {
                    console.log(`✅ ${successCount} fonctions importées...`);
                }
                
            } catch (error) {
                errorCount++;
                errors.push(`❌ Erreur pour agent ${matricule}: ${error.message}`);
            }
        }
        
        // Mettre à jour les compteurs des fonctions
        await client.query(`
            UPDATE fonctions f
            SET nbr_agent = (SELECT COUNT(*) FROM fonction_agents fa WHERE fa.id_fonction = f.id),
                updated_at = NOW()
        `);
        
        // Valider la transaction
        await client.query('COMMIT');
        
        console.log('\n✅ Importation terminée avec succès !\n');
        console.log('📊 STATISTIQUES:');
        console.log('================');
        console.log(`Lignes traitées: ${processedCount}`);
        console.log(`Fonctions importées: ${successCount}`);
        console.log(`Agents ignorés (déjà avec fonction): ${skipCount}`);
        console.log(`Erreurs: ${errorCount}`);
        console.log(`Fonctions uniques: ${functionsSet.size}`);
        
        if (errors.length > 0 && errors.length <= 20) {
            console.log('\n⚠️  ERREURS:');
            errors.forEach(err => console.log(err));
        } else if (errors.length > 20) {
            console.log(`\n⚠️  ${errors.length} erreurs (trop nombreuses pour les afficher toutes)`);
            console.log('Premières erreurs:');
            errors.slice(0, 10).forEach(err => console.log(err));
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERREUR FATALE:', error);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

// Exécuter l'importation
importFonctions().catch(console.error);


















