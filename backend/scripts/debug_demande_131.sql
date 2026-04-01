-- Script de débogage pour la demande 131
-- Vérifier l'état actuel de la demande dans la base de données

SELECT 
    id,
    type_demande,
    status,
    niveau_actuel,
    niveau_evolution_demande,
    phase,
    statut_sous_directeur,
    statut_directeur,
    statut_drh,
    date_validation_sous_directeur,
    date_validation_directeur,
    date_validation_drh,
    id_agent,
    created_at,
    updated_at
FROM demandes
WHERE id = 131;

-- Vérifier le rôle du validateur (ID agent 1811)
SELECT 
    u.id as user_id,
    u.id_agent,
    r.nom as role_nom,
    a.prenom,
    a.nom
FROM utilisateurs u
LEFT JOIN roles r ON u.id_role = r.id
LEFT JOIN agents a ON u.id_agent = a.id
WHERE u.id_agent = 1811 OR u.id = (SELECT id FROM utilisateurs WHERE id_agent = 1811 LIMIT 1);

-- Vérifier toutes les demandes en attente qui devraient être visibles par le DRH
SELECT 
    d.id,
    d.type_demande,
    d.status,
    d.niveau_actuel,
    d.niveau_evolution_demande,
    d.phase,
    a.prenom,
    a.nom,
    a.id_ministere
FROM demandes d
LEFT JOIN agents a ON d.id_agent = a.id
WHERE d.status = 'en_attente'
AND (d.niveau_actuel = 'drh' OR d.niveau_evolution_demande IN ('valide_par_sous_directeur', 'valide_par_directeur', 'valide_par_superieur', 'retour_ministre'))
ORDER BY d.date_creation DESC;

