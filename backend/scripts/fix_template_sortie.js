const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // or whichever path loads DB config
const db = require('../config/database');

async function fixTemplate() {
    try {
        console.log('Fetching template_autorisation_sortie_territoire...');
        const result = await db.query("SELECT value FROM configurations WHERE key = 'template_autorisation_sortie_territoire'");
        
        if (result.rows.length > 0) {
            const template = result.rows[0].value;
            console.log('Current template:', JSON.stringify(template, null, 2));
            
            if (template && template.body) {
                // Replace 'pour ses congés annuels.' with '{motif}.'
                template.body = template.body.replace('pour ses congés annuels.', '{motif}.');
                template.body = template.body.replace('pour ses congés annuels', '{motif}');
                
                await db.query(
                    "UPDATE configurations SET value = $1 WHERE key = 'template_autorisation_sortie_territoire'",
                    [template]
                );
                console.log('✅ Template updated successfully in database.');
            } else {
                console.log('No body found in template.');
            }
        } else {
            console.log('Template configuration not found in database.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // If your db module requires ending the pool:
        // await db.end();
        process.exit(0);
    }
}

fixTemplate();
