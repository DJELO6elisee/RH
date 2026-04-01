-- ============================================
-- ÉTAPE 1: Vérifier que la colonne motif existe
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
  AND column_name = 'motif';

-- ============================================
-- ÉTAPE 2: Voir toutes les colonnes de la table
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
ORDER BY ordinal_position;

-- ============================================
-- ÉTAPE 3: Vérifier les données actuelles (si il y en a)
-- ============================================
SELECT * FROM historique_retrait_restauration 
ORDER BY id DESC 
LIMIT 10;

-- ============================================
-- ÉTAPE 4: Test d'insertion (remplacez 1811 par un ID d'agent valide)
-- ============================================
-- Décommentez et exécutez cette ligne pour tester l'insertion :
-- INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) 
-- VALUES (1811, 'restauration', 'Test de motif', CURRENT_TIMESTAMP) 
-- RETURNING id, id_agent, type_action, motif, date_action;

