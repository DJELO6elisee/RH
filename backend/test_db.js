const pool = require('./config/database');
async function run() {
    try {
        const res1 = await pool.query(`
            SELECT a.id, a.nom, a.prenom, a.date_de_naissance, g.libele as grade, a.date_retraite 
            FROM agents a 
            LEFT JOIN grades g ON a.id_grade = g.id 
            WHERE a.id_type_d_agent = 1 
            AND (a.retire IS NULL OR a.retire = false) 
            AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite') 
            AND ( COALESCE(a.id_type_d_agent, 0) != 1 OR ( ( a.date_retraite IS NULL AND ( a.date_de_naissance IS NULL OR DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) < CASE WHEN g.libele IS NOT NULL AND (UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') OR g.libele ILIKE '%PREFEC%' OR g.libele ILIKE '%PRÉFEC%' OR g.libele ILIKE '%PREFET%' OR g.libele ILIKE '%PRÉFET%' OR g.libele ILIKE '%HORS GRADE%') THEN 65 ELSE 60 END ) ) OR (a.date_retraite IS NOT NULL AND a.date_retraite > CURRENT_DATE) ) )
        `);
        const res2 = await pool.query(`
            SELECT a.id, a.nom, a.prenom, a.date_de_naissance, g.libele as grade, a.date_retraite 
            FROM agents a 
            LEFT JOIN grades g ON a.id_grade = g.id 
            WHERE a.id_type_d_agent = 1 
            AND (a.retire IS NULL OR a.retire = false) 
            AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite') 
            AND (a.id_type_d_agent != 1 OR a.date_retraite IS NULL OR a.date_retraite > CURRENT_DATE) 
            AND NOT ( 
                a.id_type_d_agent = 1 
                AND a.date_de_naissance IS NOT NULL 
                AND g.libele IS NOT NULL 
                AND MAKE_DATE( 
                    EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                    CASE WHEN (UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') OR g.libele ILIKE '%PREFEC%' OR g.libele ILIKE '%PRÉFEC%' OR g.libele ILIKE '%PREFET%' OR g.libele ILIKE '%PRÉFET%' OR g.libele ILIKE '%HORS GRADE%') THEN 65 ELSE 60 END, 
                    12, 
                    31 
                )::DATE < CURRENT_DATE 
            )
        `);
        const ids1 = new Set(res1.rows.map(r => r.id));
        const ids2 = new Set(res2.rows.map(r => r.id));
        console.log('GetAll count:', ids1.size);
        console.log('GetStats count:', ids2.size);
        for (const r of res1.rows) {
            if (!ids2.has(r.id)) console.log('In GetAll but NOT GetStats:', r);
        }
        for (const r of res2.rows) {
            if (!ids1.has(r.id)) console.log('In GetStats but NOT GetAll:', r);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
