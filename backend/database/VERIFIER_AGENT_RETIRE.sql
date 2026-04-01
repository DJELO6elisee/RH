-- ============================================
-- VÉRIFIER SI UN AGENT EST BIEN RETIRÉ
-- ============================================
-- Remplacez 1811 par l'ID de l'agent à vérifier

-- 1. Vérifier le statut de l'agent
SELECT 
    id,
    matricule,
    nom,
    prenom,
    retire,
    date_retrait,
    motif_retrait
FROM agents
WHERE id = 1811;

-- 2. Vérifier tous les agents retirés
SELECT 
    id,
    matricule,
    nom,
    prenom,
    retire,
    date_retrait,
    motif_retrait
FROM agents
WHERE retire = true
ORDER BY date_retrait DESC;

-- 3. Vérifier si la colonne retire existe
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'agents'
  AND column_name = 'retire';

-- 4. Si l'agent n'est pas marqué comme retiré, le marquer manuellement
-- Décommentez et exécutez si nécessaire :
-- UPDATE agents 
-- SET retire = true, 
--     date_retrait = CURRENT_TIMESTAMP 
-- WHERE id = 1811;

