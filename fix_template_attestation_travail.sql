-- ============================================================
-- CORRECTION DU TEMPLATE ATTESTATION DE TRAVAIL
-- Problèmes corrigés :
--   1. Double virgule (, ,) causée par {classeInfo} vide
--   2. "est" collé au nom de la direction (espace manquant après </strong>)
-- ============================================================

-- Vérification avant modification
SELECT key, value->>'body' AS body_actuel
FROM configurations
WHERE key = 'template_attestation_travail';

-- Mise à jour : suppression de {classeInfo} et ajout de ", est en service"
-- au lieu de " est en service" pour forcer la séparation visuelle
UPDATE configurations
SET value = jsonb_set(
    value,
    '{body}',
    to_jsonb(
        'Le Directeur soussigné(e), atteste que <strong>{fullWithCivilite}</strong>, matricule <strong>{matricule}</strong>, <strong>{poste}</strong>, à la <strong>{direction}</strong>, est en service dans ledit Ministère depuis le <strong>{dateDebut}</strong> jusqu''à ce jour.'
    )
)
WHERE key = 'template_attestation_travail';

-- Vérification après modification
SELECT key, value->>'body' AS body_apres
FROM configurations
WHERE key = 'template_attestation_travail';
