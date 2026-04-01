-- ============================================================================
-- Données de test pour la table direction_generale
-- ============================================================================
-- Ce fichier contient des données d'exemple pour tester la table
-- ⚠️  À utiliser UNIQUEMENT en environnement de développement/test
-- ============================================================================

-- Vérifier d'abord l'existence de données
\echo '=========================================='
\echo 'DONNÉES DE TEST - Direction Générale'
\echo '=========================================='
\echo ''
\echo '⚠️  Ces données sont destinées aux tests uniquement'
\echo '    Ne PAS exécuter en production avec des données réelles!'
\echo ''

-- ============================================================================
-- 1. Vérification des prérequis
-- ============================================================================

\echo '1. Vérification des prérequis...'
\echo ''

-- Vérifier qu'il y a des ministères
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ministeres LIMIT 1) THEN
        RAISE EXCEPTION 'Aucun ministère trouvé. Créez au moins un ministère avant d''insérer des directions générales.';
    END IF;
END $$;

\echo '   ✓ Ministères disponibles'

-- Vérifier qu'il y a des agents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM agents LIMIT 1) THEN
        RAISE WARNING 'Aucun agent trouvé. Les directeurs généraux ne seront pas affectés.';
    END IF;
END $$;

\echo '   ✓ Vérification des agents'
\echo ''

-- ============================================================================
-- 2. Afficher les ministères disponibles
-- ============================================================================

\echo '2. Ministères disponibles:'
SELECT id, code, nom, sigle FROM ministeres ORDER BY id LIMIT 10;
\echo ''

-- ============================================================================
-- 3. Insertion des directions générales de test
-- ============================================================================

\echo '3. Insertion des directions générales de test...'
\echo ''

-- Commencer une transaction
BEGIN;

-- Insérer des directions générales pour le premier ministère disponible
INSERT INTO direction_generale (id_ministere, libelle, code, description, email, telephone, is_active)
SELECT 
    m.id,
    'Direction Générale des Ressources Humaines',
    'DGRH',
    'Gestion stratégique des ressources humaines, recrutement, formation et développement des compétences',
    'dgrh@' || LOWER(REPLACE(m.sigle, ' ', '')) || '.gouv.ma',
    '+212 5 37 XX XX 01',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO direction_generale (id_ministere, libelle, code, description, email, telephone, is_active)
SELECT 
    m.id,
    'Direction Générale du Budget et des Finances',
    'DGBF',
    'Gestion budgétaire, financière et comptable du ministère',
    'dgbf@' || LOWER(REPLACE(m.sigle, ' ', '')) || '.gouv.ma',
    '+212 5 37 XX XX 02',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO direction_generale (id_ministere, libelle, code, description, email, telephone, is_active)
SELECT 
    m.id,
    'Direction Générale de la Planification et des Études',
    'DGPE',
    'Planification stratégique, études prospectives et évaluation des politiques publiques',
    'dgpe@' || LOWER(REPLACE(m.sigle, ' ', '')) || '.gouv.ma',
    '+212 5 37 XX XX 03',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO direction_generale (id_ministere, libelle, code, description, email, telephone, is_active)
SELECT 
    m.id,
    'Direction Générale des Affaires Juridiques et du Contentieux',
    'DGAJC',
    'Conseil juridique, rédaction des textes réglementaires et gestion du contentieux',
    'dgajc@' || LOWER(REPLACE(m.sigle, ' ', '')) || '.gouv.ma',
    '+212 5 37 XX XX 04',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO direction_generale (id_ministere, libelle, code, description, email, telephone, is_active)
SELECT 
    m.id,
    'Direction Générale des Systèmes d''Information',
    'DGSI',
    'Gestion des systèmes d''information, infrastructure IT et transformation digitale',
    'dgsi@' || LOWER(REPLACE(m.sigle, ' ', '')) || '.gouv.ma',
    '+212 5 37 XX XX 05',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO direction_generale (id_ministere, libelle, code, description, is_active)
SELECT 
    m.id,
    'Direction Générale de la Communication',
    'DGC',
    'Communication institutionnelle, relations publiques et gestion de l''image du ministère',
    true
FROM ministeres m
ORDER BY m.id
LIMIT 1
ON CONFLICT DO NOTHING;

-- Si vous avez plusieurs ministères, vous pouvez en ajouter pour le second
INSERT INTO direction_generale (id_ministere, libelle, code, description, is_active)
SELECT 
    m.id,
    'Direction Générale de l''Administration',
    'DGA',
    'Gestion administrative générale du ministère',
    true
FROM ministeres m
ORDER BY m.id
OFFSET 1
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;

\echo '   ✓ Directions générales insérées'
\echo ''

-- ============================================================================
-- 4. Affecter des directeurs généraux (si des agents existent)
-- ============================================================================

\echo '4. Affectation des directeurs généraux (si possible)...'
\echo ''

-- Affecter le premier agent disponible comme directeur de la DGRH
UPDATE direction_generale dg
SET directeur_general_id = (
    SELECT a.id 
    FROM agents a 
    WHERE a.id_ministere = dg.id_ministere 
    ORDER BY a.id 
    LIMIT 1
)
WHERE dg.code = 'DGRH'
AND EXISTS (SELECT 1 FROM agents WHERE id_ministere = dg.id_ministere);

\echo '   ✓ Directeurs affectés (si agents disponibles)'
\echo ''

-- ============================================================================
-- 5. Rattacher des directions existantes (si elles existent)
-- ============================================================================

\echo '5. Rattachement des directions existantes...'
\echo ''

-- Rattacher les directions qui contiennent "Ressources Humaines" à la DGRH
UPDATE directions d
SET id_direction_generale = dg.id
FROM direction_generale dg
WHERE d.id_ministere = dg.id_ministere
AND dg.code = 'DGRH'
AND (d.libelle ILIKE '%ressources humaines%' OR d.libelle ILIKE '%rh%')
AND d.id_direction_generale IS NULL;

-- Rattacher les directions financières à la DGBF
UPDATE directions d
SET id_direction_generale = dg.id
FROM direction_generale dg
WHERE d.id_ministere = dg.id_ministere
AND dg.code = 'DGBF'
AND (d.libelle ILIKE '%budget%' OR d.libelle ILIKE '%financ%' OR d.libelle ILIKE '%comptab%')
AND d.id_direction_generale IS NULL;

-- Rattacher les directions juridiques à la DGAJC
UPDATE directions d
SET id_direction_generale = dg.id
FROM direction_generale dg
WHERE d.id_ministere = dg.id_ministere
AND dg.code = 'DGAJC'
AND (d.libelle ILIKE '%juridique%' OR d.libelle ILIKE '%contentieux%' OR d.libelle ILIKE '%affaires%')
AND d.id_direction_generale IS NULL;

-- Rattacher les directions informatiques à la DGSI
UPDATE directions d
SET id_direction_generale = dg.id
FROM direction_generale dg
WHERE d.id_ministere = dg.id_ministere
AND dg.code = 'DGSI'
AND (d.libelle ILIKE '%informatique%' OR d.libelle ILIKE '%système%' OR d.libelle ILIKE '%digital%')
AND d.id_direction_generale IS NULL;

\echo '   ✓ Directions rattachées'
\echo ''

-- ============================================================================
-- 6. Afficher les résultats
-- ============================================================================

\echo '6. Résultats de l''insertion:'
\echo ''

SELECT 
    dg.id,
    dg.code,
    dg.libelle,
    m.nom as ministere,
    COALESCE(a.nom || ' ' || a.prenom, 'Non affecté') as directeur_general,
    COUNT(DISTINCT d.id) as nb_directions
FROM direction_generale dg
LEFT JOIN ministeres m ON dg.id_ministere = m.id
LEFT JOIN agents a ON dg.directeur_general_id = a.id
LEFT JOIN directions d ON d.id_direction_generale = dg.id
GROUP BY dg.id, dg.code, dg.libelle, m.nom, a.nom, a.prenom
ORDER BY dg.id;

\echo ''
\echo '=========================================='
\echo 'Données de test insérées avec succès!'
\echo '=========================================='
\echo ''

-- ============================================================================
-- 7. Requêtes de vérification utiles
-- ============================================================================

\echo '7. Statistiques:'
\echo ''

SELECT 
    COUNT(*) as total_directions_generales,
    COUNT(CASE WHEN is_active THEN 1 END) as actives,
    COUNT(CASE WHEN directeur_general_id IS NOT NULL THEN 1 END) as avec_directeur,
    COUNT(DISTINCT id_ministere) as nombre_ministeres
FROM direction_generale;

\echo ''
\echo '=========================================='
\echo 'Tests terminés!'
\echo '=========================================='
\echo ''
\echo 'Vous pouvez maintenant:'
\echo '  1. Tester les routes API'
\echo '  2. Modifier les données de test'
\echo '  3. Créer vos propres directions générales'
\echo ''
\echo 'Pour supprimer les données de test:'
\echo '  DELETE FROM direction_generale WHERE code IN (''DGRH'', ''DGBF'', ''DGPE'', ''DGAJC'', ''DGSI'', ''DGC'', ''DGA'');'
\echo ''

-- ============================================================================
-- 8. Script de nettoyage (commenté par défaut)
-- ============================================================================

/*
-- Décommenter pour supprimer les données de test

BEGIN;

\echo 'Suppression des données de test...'

-- Retirer les rattachements
UPDATE directions SET id_direction_generale = NULL 
WHERE id_direction_generale IN (
    SELECT id FROM direction_generale 
    WHERE code IN ('DGRH', 'DGBF', 'DGPE', 'DGAJC', 'DGSI', 'DGC', 'DGA')
);

-- Supprimer les directions générales de test
DELETE FROM direction_generale 
WHERE code IN ('DGRH', 'DGBF', 'DGPE', 'DGAJC', 'DGSI', 'DGC', 'DGA');

COMMIT;

\echo 'Données de test supprimées.'
*/

