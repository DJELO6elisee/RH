const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvPath = path.join(__dirname, '../../Liste-du-Personel-_1_.csv');
const outputPath = path.join(__dirname, '../database/assign_all_agents_auto_generated.sql');

let currentEntity = null;
const agentsByEntity = {};
const agentsDG = {}; // Stocker la DG de chaque agent
let lineNumber = 0;

console.log('\n📄 Parsing du CSV...\n');

// Fonction pour déterminer le type d'entité basé sur le LIBELLÉ
function getEntityType(libelle) {
    const upperLibelle = libelle.toUpperCase().trim();
    
    // ORDRE IMPORTANT : vérifier d'abord les types les plus spécifiques
    
    // 1. Vérifier si c'est une SOUS-DIRECTION (S/D ou SOUS-DIRECTION)
    if (upperLibelle.includes('S/D') || upperLibelle.includes('SOUS-DIRECTION')) {
        return 'sous_direction';
    }
    
    // 2. Vérifier si c'est une DIRECTION (DIRECTION, DIR.)
    if (upperLibelle.includes('DIRECTION') || upperLibelle.startsWith('DIR.')) {
        return 'direction';
    }
    
    // 3. Vérifier si c'est un SERVICE (commence par "SERVICE")
    if (upperLibelle.startsWith('SERVICE')) {
        return 'service';
    }
    
    // Par défaut, c'est une DIRECTION
    return 'direction';
}

fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
        lineNumber++;
        const matricule = row['Matricule'] || '';
        
        // Vérifier si c'est une ligne DIR / SER
        if (matricule.startsWith('DIR / SER :')) {
            const match = matricule.match(/DIR \/ SER\s*:\s*([\d\s]+)\s+(.+)/);
            if (match) {
                const code = match[1].trim().replace(/\s+/g, ' ');
                const libelle = match[2].trim();
                
                currentEntity = { code, libelle, agents: [] };
                agentsByEntity[code] = currentEntity;
                
                console.log(`Ligne ${lineNumber}: DIR/SER ${code} - ${libelle.substring(0, 40)}...`);
            }
        } else if (matricule && !matricule.includes('sous/total') && !matricule.includes('=')) {
            // C'est un agent - stocker sa DG (colonne 43 "Direction")
            const dg = row['Direction'] || '';
            if (dg) {
                agentsDG[matricule] = dg.trim();
            }
            
            // L'ajouter aussi à l'entité courante si elle existe
            if (currentEntity) {
                currentEntity.agents.push(matricule);
            }
        }
    })
    .on('end', () => {
        console.log(`\n✅ Parsing terminé: ${Object.keys(agentsByEntity).length} entités trouvées\n`);
        console.log(`📋 ${Object.keys(agentsDG).length} agents avec DG trouvés\n`);
        
        // Extraire toutes les DG uniques
        const uniqueDGs = [...new Set(Object.values(agentsDG))].filter(dg => dg);
        console.log(`🏢 ${uniqueDGs.length} Directions Générales uniques:\n`);
        uniqueDGs.forEach(dg => console.log(`   - ${dg}`));
        console.log('');
        
        // Séparer les entités par type (basé sur le LIBELLÉ)
        const directions = [];
        const sousDirections = [];
        const services = [];
        
        Object.values(agentsByEntity).forEach(entity => {
            const type = getEntityType(entity.libelle); // Utiliser le libellé, pas le code
            entity.type = type;
            
            if (type === 'direction') directions.push(entity);
            else if (type === 'sous_direction') sousDirections.push(entity);
            else if (type === 'service') services.push(entity);
        });
        
        console.log(`📊 ${directions.length} directions, ${sousDirections.length} sous-directions, ${services.length} services\n`);
        
        // Générer le SQL
        let sql = `-- ===============================================================================
-- Script d'assignation automatique généré depuis le CSV
-- ===============================================================================
-- Généré automatiquement par generate_assignment_sql_from_csv.js
-- ===============================================================================

-- ===============================================================================
-- PARTIE 1: CRÉATION DES ENTITÉS
-- ===============================================================================

`;

        // 1. Créer les DIRECTIONS GÉNÉRALES
        sql += `-- 1. Créer les Directions Générales\n`;
        sql += `DO $$\nBEGIN\n`;
        uniqueDGs.forEach(dg => {
            const escapedDG = dg.replace(/'/g, "''");
            sql += `    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)\n`;
            sql += `    SELECT 1, '${escapedDG}', true\n`;
            sql += `    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('${escapedDG}'));\n\n`;
        });
        sql += `END $$;\n\n`;
        
        // 2. Créer les DIRECTIONS
        sql += `-- 2. Créer les Directions\n`;
        sql += `DO $$\nBEGIN\n`;
        directions.forEach(entity => {
            const escapedLibelle = entity.libelle.replace(/'/g, "''");
            
            sql += `    -- ${entity.libelle}\n`;
            sql += `    INSERT INTO public.directions (id_ministere, code, libelle, is_active)\n`;
            sql += `    SELECT 1, '${entity.code}', '${escapedLibelle}', true\n`;
            sql += `    WHERE NOT EXISTS (\n`;
            sql += `        SELECT 1 FROM public.directions \n`;
            sql += `        WHERE code = '${entity.code}'\n`;
            sql += `           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('${escapedLibelle}'))\n`;
            sql += `    );\n\n`;
        });
        sql += `END $$;\n\n`;
        
        // 3. Créer les SOUS-DIRECTIONS
        sql += `-- 3. Créer les Sous-Directions\n`;
        sql += `DO $$\nBEGIN\n`;
        sousDirections.forEach(entity => {
            const escapedLibelle = entity.libelle.replace(/'/g, "''");
            
            sql += `    -- ${entity.libelle}\n`;
            sql += `    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)\n`;
            sql += `    SELECT 1, '${entity.code}', '${escapedLibelle}', true\n`;
            sql += `    WHERE NOT EXISTS (\n`;
            sql += `        SELECT 1 FROM public.sous_directions \n`;
            sql += `        WHERE code = '${entity.code}'\n`;
            sql += `           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('${escapedLibelle}'))\n`;
            sql += `    );\n\n`;
        });
        sql += `END $$;\n\n`;
        
        // 4. Créer les SERVICES
        sql += `-- 4. Créer les Services\n`;
        sql += `DO $$\nBEGIN\n`;
        services.forEach(entity => {
            const escapedLibelle = entity.libelle.replace(/'/g, "''");
            
            // Déterminer le parent (direction ou sous-direction)
            const parts = entity.code.split(' ');
            // Créer le code parent en mettant la 5ème partie à 00
            const parentCode = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} 00 00`;
            
            // Trouver le parent dans nos entités
            const parentEntity = agentsByEntity[parentCode];
            const isParentDirection = parentEntity && getEntityType(parentEntity.libelle) === 'direction';
            
            sql += `    -- ${entity.libelle}\n`;
            
            if (isParentDirection) {
                // Service rattaché directement à une direction
                sql += `    INSERT INTO public.services (id_ministere, id_direction, code, libelle, is_active)\n`;
                sql += `    SELECT \n`;
                sql += `        1,\n`;
                sql += `        (SELECT id FROM public.directions WHERE code = '${parentCode}' LIMIT 1),\n`;
                sql += `        '${entity.code}',\n`;
                sql += `        '${escapedLibelle}',\n`;
                sql += `        true\n`;
            } else {
                // Service rattaché à une sous-direction
                sql += `    INSERT INTO public.services (id_ministere, id_sous_direction, code, libelle, is_active)\n`;
                sql += `    SELECT \n`;
                sql += `        1,\n`;
                sql += `        (SELECT id FROM public.sous_directions WHERE code = '${parentCode}' LIMIT 1),\n`;
                sql += `        '${entity.code}',\n`;
                sql += `        '${escapedLibelle}',\n`;
                sql += `        true\n`;
            }
            
            sql += `    WHERE NOT EXISTS (\n`;
            sql += `        SELECT 1 FROM public.services \n`;
            sql += `        WHERE code = '${entity.code}' \n`;
            sql += `           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('${escapedLibelle}'))\n`;
            sql += `    );\n\n`;
        });
        sql += `END $$;\n\n`;

        // PARTIE 2: ASSIGNATION DES AGENTS
        sql += `-- ===============================================================================
-- PARTIE 2: ASSIGNATION DES DIRECTIONS GÉNÉRALES AUX AGENTS
-- ===============================================================================\n\n`;

        // Grouper les agents par DG
        const agentsByDG = {};
        Object.entries(agentsDG).forEach(([matricule, dg]) => {
            if (!agentsByDG[dg]) {
                agentsByDG[dg] = [];
            }
            agentsByDG[dg].push(matricule);
        });

        // Assigner les DG aux agents
        Object.entries(agentsByDG).forEach(([dg, agents]) => {
            const escapedDG = dg.replace(/'/g, "''");
            
            sql += `-- Assigner la DG "${dg}" à ${agents.length} agents\n`;
            sql += `UPDATE public.agents\n`;
            sql += `SET id_direction_generale = (\n`;
            sql += `    SELECT id FROM public.direction_generale\n`;
            sql += `    WHERE UPPER(libelle) = UPPER('${escapedDG}')\n`;
            sql += `    LIMIT 1\n`;
            sql += `)\n`;
            sql += `WHERE matricule IN (\n`;
            
            // Grouper les matricules par lignes de 10
            const chunks = [];
            for (let i = 0; i < agents.length; i += 10) {
                chunks.push(agents.slice(i, i + 10));
            }
            
            chunks.forEach((chunk, idx) => {
                const isLast = idx === chunks.length - 1;
                sql += `    '${chunk.join("', '")}'`;
                sql += isLast ? '\n' : ',\n';
            });
            
            sql += `);\n\n`;
        });

        sql += `-- ===============================================================================
-- PARTIE 3: ASSIGNATION DES DIRECTIONS/SOUS-DIRECTIONS/SERVICES
-- ===============================================================================\n\n`;

        // Pour chaque entité, assigner les agents
        Object.values(agentsByEntity).forEach(entity => {
            if (entity.agents.length === 0) return;
            
            const type = entity.type;
            let fieldToUpdate = 'id_direction';
            let tableName = 'directions';
            
            if (type === 'sous_direction') {
                fieldToUpdate = 'id_sous_direction';
                tableName = 'sous_directions';
            } else if (type === 'service') {
                fieldToUpdate = 'id_service';
                tableName = 'services';
            }
            
            sql += `-- ${entity.libelle} (${entity.agents.length} agents)\n`;
            sql += `UPDATE public.agents\n`;
            sql += `SET ${fieldToUpdate} = (\n`;
            sql += `    SELECT id FROM public.${tableName}\n`;
            sql += `    WHERE code = '${entity.code}'\n`;
            sql += `    LIMIT 1\n`;
            sql += `)\n`;
            sql += `WHERE matricule IN (\n`;
            
            const chunks = [];
            for (let i = 0; i < entity.agents.length; i += 10) {
                chunks.push(entity.agents.slice(i, i + 10));
            }
            
            chunks.forEach((chunk, idx) => {
                const isLast = idx === chunks.length - 1;
                sql += `    '${chunk.join("', '")}'`;
                sql += isLast ? '\n' : ',\n';
            });
            
            sql += `);\n\n`;
        });
        
        // Statistiques
        sql += `-- ===============================================================================\n`;
        sql += `-- STATISTIQUES\n`;
        sql += `-- ===============================================================================\n\n`;
        sql += `DO $$\n`;
        sql += `DECLARE\n`;
        sql += `    v_total INTEGER;\n`;
        sql += `    v_dir INTEGER;\n`;
        sql += `    v_dg INTEGER;\n`;
        sql += `    v_sd INTEGER;\n`;
        sql += `    v_serv INTEGER;\n`;
        sql += `BEGIN\n`;
        sql += `    SELECT COUNT(*) INTO v_total FROM agents;\n`;
        sql += `    SELECT COUNT(*) INTO v_dir FROM agents WHERE id_direction IS NOT NULL;\n`;
        sql += `    SELECT COUNT(*) INTO v_dg FROM agents WHERE id_direction_generale IS NOT NULL;\n`;
        sql += `    SELECT COUNT(*) INTO v_sd FROM agents WHERE id_sous_direction IS NOT NULL;\n`;
        sql += `    SELECT COUNT(*) INTO v_serv FROM agents WHERE id_service IS NOT NULL;\n`;
        sql += `    \n`;
        sql += `    RAISE NOTICE '';\n`;
        sql += `    RAISE NOTICE '✅ Assignation automatique terminée !';\n`;
        sql += `    RAISE NOTICE '   Total: % agents', v_total;\n`;
        sql += `    RAISE NOTICE '   Direction: % (%.1f%%)', v_dir, (v_dir::DECIMAL / v_total * 100);\n`;
        sql += `    RAISE NOTICE '   DG: % (%.1f%%)', v_dg, (v_dg::DECIMAL / v_total * 100);\n`;
        sql += `    RAISE NOTICE '   S/D: % (%.1f%%)', v_sd, (v_sd::DECIMAL / v_total * 100);\n`;
        sql += `    RAISE NOTICE '   Service: % (%.1f%%)', v_serv, (v_serv::DECIMAL / v_total * 100);\n`;
        sql += `    RAISE NOTICE '';\n`;
        sql += `END $$;\n`;
        
        // Écrire le fichier SQL
        fs.writeFileSync(outputPath, sql, 'utf8');
        
        console.log(`✅ Fichier SQL généré: ${outputPath}\n`);
        console.log('📊 Résumé:');
        Object.values(agentsByEntity).forEach(entity => {
            if (entity.agents.length > 0) {
                console.log(`   - ${entity.libelle.substring(0, 50)}: ${entity.agents.length} agents`);
            }
        });
        
        console.log(`\n🎯 Pour exécuter: node backend/database/fix_and_execute_all.js\n`);
    });
