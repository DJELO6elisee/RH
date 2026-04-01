-- Script pour vérifier les agents et leurs directions

-- 1. Vérifier les agents sans direction
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.id_direction,
    d.libelle as direction_name,
    m.nom as ministere_nom
FROM agents a
LEFT JOIN directions d ON a.id_direction = d.id
LEFT JOIN ministeres m ON a.id_ministere = m.id
WHERE a.id_direction IS NULL OR d.libelle IS NULL
ORDER BY m.nom, a.matricule;

-- 2. Vérifier les directions disponibles
SELECT 
    d.id,
    d.libelle,
    d.id_ministere,
    m.nom as ministere_nom
FROM directions d
LEFT JOIN ministeres m ON d.id_ministere = m.id
ORDER BY m.nom, d.libelle;

-- 3. Compter les agents par direction
SELECT 
    COALESCE(d.libelle, 'Direction non spécifiée') as direction_name,
    m.nom as ministere_nom,
    COUNT(a.id) as nombre_agents
FROM agents a
LEFT JOIN directions d ON a.id_direction = d.id
LEFT JOIN ministeres m ON a.id_ministere = m.id
GROUP BY d.libelle, m.nom
ORDER BY m.nom, d.libelle;
