-- Script pour ajouter les champs manquants dans la table agents
-- Basé sur l'analyse des champs du formulaire

-- =====================================================
-- AJOUT DES CHAMPS MANQUANTS DANS LA TABLE AGENTS
-- =====================================================

-- Ajouter les champs CNPS (pour les non-fonctionnaires)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS numero_cnps VARCHAR(50);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS date_declaration_cnps DATE;

-- Ajouter des commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN agents.numero_cnps IS 'Numéro CNPS de l''agent (pour les non-fonctionnaires)';
COMMENT ON COLUMN agents.date_declaration_cnps IS 'Date de déclaration CNPS de l''agent (pour les non-fonctionnaires)';

-- =====================================================
-- VÉRIFICATION DES CHAMPS AJOUTÉS
-- =====================================================

-- Vérifier que les champs ont été ajoutés
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
    AND column_name IN ('numero_cnps', 'date_declaration_cnps')
ORDER BY column_name;

-- Afficher un message de confirmation
SELECT 'Champs CNPS ajoutés avec succès à la table agents' as status;
