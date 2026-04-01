-- =====================================================
-- SCRIPT COMPLET POUR AJOUTER TOUTES LES COLONNES NÉCESSAIRES
-- Pour la gestion des congés avec motifs et congés exceptionnels
-- =====================================================
-- À exécuter sur le serveur de production
-- =====================================================

-- 1. Ajouter la colonne dette_annee_suivante dans agent_conges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_conges' AND column_name = 'dette_annee_suivante'
    ) THEN
        ALTER TABLE agent_conges ADD COLUMN dette_annee_suivante INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Colonne dette_annee_suivante ajoutée à agent_conges';
    ELSE
        RAISE NOTICE '⚠️ Colonne dette_annee_suivante existe déjà dans agent_conges';
    END IF;
END $$;

-- 2. Ajouter les colonnes dans demandes
DO $$
BEGIN
    -- motif_conge
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'motif_conge'
    ) THEN
        ALTER TABLE demandes ADD COLUMN motif_conge VARCHAR(100);
        RAISE NOTICE '✅ Colonne motif_conge ajoutée à demandes';
    ELSE
        RAISE NOTICE '⚠️ Colonne motif_conge existe déjà dans demandes';
    END IF;
    
    -- nombre_jours
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'nombre_jours'
    ) THEN
        ALTER TABLE demandes ADD COLUMN nombre_jours INTEGER;
        RAISE NOTICE '✅ Colonne nombre_jours ajoutée à demandes';
    ELSE
        RAISE NOTICE '⚠️ Colonne nombre_jours existe déjà dans demandes';
    END IF;
    
    -- raison_exceptionnelle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'raison_exceptionnelle'
    ) THEN
        ALTER TABLE demandes ADD COLUMN raison_exceptionnelle TEXT;
        RAISE NOTICE '✅ Colonne raison_exceptionnelle ajoutée à demandes';
    ELSE
        RAISE NOTICE '⚠️ Colonne raison_exceptionnelle existe déjà dans demandes';
    END IF;
    
    -- jours_restants_apres_deduction
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'jours_restants_apres_deduction'
    ) THEN
        ALTER TABLE demandes ADD COLUMN jours_restants_apres_deduction INTEGER;
        RAISE NOTICE '✅ Colonne jours_restants_apres_deduction ajoutée à demandes';
    ELSE
        RAISE NOTICE '⚠️ Colonne jours_restants_apres_deduction existe déjà dans demandes';
    END IF;
END $$;

-- 3. Ajouter les commentaires
COMMENT ON COLUMN agent_conges.dette_annee_suivante IS 'Nombre de jours dus à l''année suivante (pour congés exceptionnels). Exemple: si solde négatif = 10, dette_annee_suivante = 10, et l''agent aura 20 jours l''année suivante (30 - 10)';

COMMENT ON COLUMN demandes.motif_conge IS 'Motif du congé: congé annuel, congé de paternité, congé de maternité, congé partiel, congé exceptionnel';
COMMENT ON COLUMN demandes.nombre_jours IS 'Nombre de jours de congé demandés (jours ouvrés)';
COMMENT ON COLUMN demandes.raison_exceptionnelle IS 'Raison justifiant le congé exceptionnel (si motif = congé exceptionnel)';
COMMENT ON COLUMN demandes.jours_restants_apres_deduction IS 'Jours restants après déduction de ce congé (peut être négatif pour congés exceptionnels)';

-- 4. Vérification
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE (table_name = 'agent_conges' AND column_name = 'dette_annee_suivante')
   OR (table_name = 'demandes' AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction'))
ORDER BY table_name, column_name;

