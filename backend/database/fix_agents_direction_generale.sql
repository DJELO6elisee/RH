-- =============================================================================
-- Correction : rattacher à la direction générale les agents actuellement
-- affectés à une "direction" qui est en fait une direction générale recréée
-- par erreur (CABINET, DG INDUSTRIE TOURISTIQUE, DG LOISIRS, INSPECTION GÉNÉRALE).
-- =============================================================================
-- Exécution : exécuter dans un outil SQL (psql, pgAdmin, DBeaver, etc.)
-- sur la base concernée.
-- =============================================================================

BEGIN;

-- 1) Vérification : lister les agents et directions concernés AVANT mise à jour
SELECT
    a.id AS agent_id,
    a.matricule,
    a.nom,
    a.prenom,
    d.id AS id_direction_actuelle,
    d.libelle AS libelle_direction,
    dg.id AS id_direction_generale_cible,
    dg.libelle AS libelle_direction_generale
FROM agents a
JOIN directions d ON d.id = a.id_direction
JOIN direction_generale dg ON (
    TRIM(BOTH ' ' FROM UPPER(dg.libelle)) = TRIM(BOTH ' ' FROM UPPER(d.libelle))
    AND (dg.id_ministere = d.id_ministere OR (dg.id_ministere IS NULL AND d.id_ministere IS NULL))
);

-- 2) Mise à jour : assigner id_direction_generale et mettre id_direction à NULL
--    pour tout agent dont la direction a le même libellé (normalisé) qu'une
--    direction générale du même ministère.
UPDATE agents a
SET
    id_direction_generale = dg.id,
    id_direction = NULL
FROM directions d
JOIN direction_generale dg ON (
    TRIM(BOTH ' ' FROM UPPER(dg.libelle)) = TRIM(BOTH ' ' FROM UPPER(d.libelle))
    AND (dg.id_ministere = d.id_ministere OR (dg.id_ministere IS NULL AND d.id_ministere IS NULL))
)
WHERE a.id_direction = d.id;

-- 3) Vérification : aucun agent ne doit plus avoir id_direction pointant
--    vers une direction dont le libellé = une direction générale (résultat attendu : 0 lignes)
SELECT a.id, a.matricule, d.libelle
FROM agents a
JOIN directions d ON d.id = a.id_direction
JOIN direction_generale dg ON TRIM(BOTH ' ' FROM UPPER(dg.libelle)) = TRIM(BOTH ' ' FROM UPPER(d.libelle));

COMMIT;
