-- Installation des extensions PostgreSQL requises
-- ================================================

-- Extension pour les recherches textuelles avec trigrammes
-- Cette extension est nécessaire pour les index GIN avec gin_trgm_ops
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extension pour les opérateurs de similarité de texte
-- Utile pour les recherches de similarité
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Vérification des extensions installées
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('pg_trgm', 'btree_gin');

-- Commentaires sur les extensions
COMMENT ON EXTENSION pg_trgm IS 'Extension pour les recherches textuelles avec trigrammes';
COMMENT ON EXTENSION btree_gin IS 'Extension pour les index GIN sur les types de données B-tree';
