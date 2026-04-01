-- Total agents = périmètre "hierarchical-report" (base uniquement, id_ministere = 1)
SELECT COUNT(*) AS total_rapport_hierarchique
FROM agents a
LEFT JOIN (
    SELECT DISTINCT ON (ga.id_agent)
        ga.id_agent,
        g.libele AS libele
    FROM grades_agents ga
    LEFT JOIN grades g ON ga.id_grade = g.id
    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
) ga_actuelle ON a.id = ga_actuelle.id_agent
WHERE LOWER(TRIM(COALESCE(a.statut_emploi, ''))) NOT IN ('licencie', 'demission', 'retraite')
  AND (a.retire IS NULL OR a.retire = false)
  AND a.id_ministere = 1
  AND (
        (
            a.date_retraite IS NULL
            AND (
                a.date_de_naissance IS NULL
                OR DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) <
                    CASE
                        WHEN ga_actuelle.libele IS NOT NULL
                             AND UPPER(TRIM(ga_actuelle.libele)) IN ('A4', 'A5', 'A6', 'A7')
                        THEN 65
                        ELSE 60
                    END
            )
        )
        OR (a.date_retraite IS NOT NULL AND a.date_retraite::date > CURRENT_DATE)
    );