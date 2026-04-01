-- Migration corrigée : Rendre les codes des entités uniques globalement
-- ===================================================================
-- Ce script gère les cas où les contraintes existent déjà

-- 1. Vérifier et supprimer les contraintes existantes
-- ===================================================

-- Supprimer toutes les contraintes d'unicité existantes pour entites_administratives
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Supprimer les contraintes d'unicité existantes
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'entites_administratives'::regclass 
        AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE entites_administratives DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Contrainte supprimée: %', constraint_name;
    END LOOP;
END $$;

-- Supprimer toutes les contraintes d'unicité existantes pour entites_institutions
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Supprimer les contraintes d'unicité existantes
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'entites_institutions'::regclass 
        AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE entites_institutions DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Contrainte supprimée: %', constraint_name;
    END LOOP;
END $$;

-- 2. Vérifier et corriger les codes en conflit
-- ============================================

-- Identifier et corriger les codes en conflit dans entites_administratives
DO $$
DECLARE
    conflict_record RECORD;
    new_code VARCHAR(20);
    counter INTEGER;
BEGIN
    -- Traiter les conflits dans entites_administratives
    FOR conflict_record IN 
        SELECT code, COUNT(*) as count, MIN(id) as min_id
        FROM entites_administratives 
        GROUP BY code 
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- Mettre à jour tous les enregistrements sauf le premier
        FOR conflict_record IN 
            SELECT id, code 
            FROM entites_administratives 
            WHERE code = conflict_record.code 
            ORDER BY id
        LOOP
            IF counter > 1 THEN
                new_code := conflict_record.code || '_' || counter;
                -- Vérifier que le nouveau code n'existe pas déjà
                WHILE EXISTS (SELECT 1 FROM entites_administratives WHERE code = new_code) LOOP
                    counter := counter + 1;
                    new_code := conflict_record.code || '_' || counter;
                END LOOP;
                
                UPDATE entites_administratives 
                SET code = new_code 
                WHERE id = conflict_record.id;
                
                RAISE NOTICE 'Code mis à jour: % -> %', conflict_record.code, new_code;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Identifier et corriger les codes en conflit dans entites_institutions
DO $$
DECLARE
    conflict_record RECORD;
    new_code VARCHAR(20);
    counter INTEGER;
BEGIN
    -- Traiter les conflits dans entites_institutions
    FOR conflict_record IN 
        SELECT code, COUNT(*) as count, MIN(id) as min_id
        FROM entites_institutions 
        GROUP BY code 
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- Mettre à jour tous les enregistrements sauf le premier
        FOR conflict_record IN 
            SELECT id, code 
            FROM entites_institutions 
            WHERE code = conflict_record.code 
            ORDER BY id
        LOOP
            IF counter > 1 THEN
                new_code := conflict_record.code || '_' || counter;
                -- Vérifier que le nouveau code n'existe pas déjà
                WHILE EXISTS (SELECT 1 FROM entites_institutions WHERE code = new_code) LOOP
                    counter := counter + 1;
                    new_code := conflict_record.code || '_' || counter;
                END LOOP;
                
                UPDATE entites_institutions 
                SET code = new_code 
                WHERE id = conflict_record.id;
                
                RAISE NOTICE 'Code mis à jour: % -> %', conflict_record.code, new_code;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- 3. Ajouter les nouvelles contraintes d'unicité globale (si elles n'existent pas)
-- ================================================================================

-- Ajouter la contrainte d'unicité globale pour entites_administratives
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_entites_administratives_code' 
        AND conrelid = 'entites_administratives'::regclass
    ) THEN
        ALTER TABLE entites_administratives 
        ADD CONSTRAINT uk_entites_administratives_code UNIQUE (code);
        RAISE NOTICE 'Contrainte uk_entites_administratives_code ajoutée';
    ELSE
        RAISE NOTICE 'Contrainte uk_entites_administratives_code existe déjà';
    END IF;
END $$;

-- Ajouter la contrainte d'unicité globale pour entites_institutions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_entites_institutions_code' 
        AND conrelid = 'entites_institutions'::regclass
    ) THEN
        ALTER TABLE entites_institutions 
        ADD CONSTRAINT uk_entites_institutions_code UNIQUE (code);
        RAISE NOTICE 'Contrainte uk_entites_institutions_code ajoutée';
    ELSE
        RAISE NOTICE 'Contrainte uk_entites_institutions_code existe déjà';
    END IF;
END $$;

-- 4. Créer des index pour améliorer les performances (si ils n'existent pas)
-- ==========================================================================

-- Index pour les recherches par code
CREATE INDEX IF NOT EXISTS idx_entites_administratives_code ON entites_administratives(code);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_code ON entites_institutions(code);

-- 5. Créer ou remplacer les fonctions utilitaires
-- ===============================================

-- Fonction pour générer un code unique pour les entités
CREATE OR REPLACE FUNCTION generate_unique_entity_code(
    p_base_code VARCHAR(20),
    p_table_name VARCHAR(50) DEFAULT 'entites_administratives'
)
RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    counter INTEGER := 1;
BEGIN
    new_code := p_base_code;
    
    IF p_table_name = 'entites_administratives' THEN
        -- Vérifier dans entites_administratives
        WHILE EXISTS (SELECT 1 FROM entites_administratives WHERE code = new_code) LOOP
            new_code := p_base_code || '_' || counter;
            counter := counter + 1;
        END LOOP;
    ELSIF p_table_name = 'entites_institutions' THEN
        -- Vérifier dans entites_institutions
        WHILE EXISTS (SELECT 1 FROM entites_institutions WHERE code = new_code) LOOP
            new_code := p_base_code || '_' || counter;
            counter := counter + 1;
        END LOOP;
    END IF;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer ou remplacer les triggers de validation
-- ================================================

-- Trigger pour entites_administratives
CREATE OR REPLACE FUNCTION validate_entity_code_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier l'unicité dans entites_administratives
    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN
        RAISE EXCEPTION 'Le code % existe déjà dans entites_administratives', NEW.code;
    END IF;
    
    -- Vérifier l'unicité dans entites_institutions
    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code) THEN
        RAISE EXCEPTION 'Le code % existe déjà dans entites_institutions', NEW.code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour entites_institutions
CREATE OR REPLACE FUNCTION validate_institution_code_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier l'unicité dans entites_institutions
    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN
        RAISE EXCEPTION 'Le code % existe déjà dans entites_institutions', NEW.code;
    END IF;
    
    -- Vérifier l'unicité dans entites_administratives
    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code) THEN
        RAISE EXCEPTION 'Le code % existe déjà dans entites_administratives', NEW.code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer les triggers (supprimer d'abord s'ils existent)
DROP TRIGGER IF EXISTS trg_validate_entity_code ON entites_administratives;
CREATE TRIGGER trg_validate_entity_code
    BEFORE INSERT OR UPDATE ON entites_administratives
    FOR EACH ROW
    EXECUTE FUNCTION validate_entity_code_uniqueness();

DROP TRIGGER IF EXISTS trg_validate_institution_code ON entites_institutions;
CREATE TRIGGER trg_validate_institution_code
    BEFORE INSERT OR UPDATE ON entites_institutions
    FOR EACH ROW
    EXECUTE FUNCTION validate_institution_code_uniqueness();

-- 7. Vérification finale
-- ======================

-- Vérifier qu'il n'y a plus de codes en conflit
DO $$
DECLARE
    admin_conflicts INTEGER;
    institution_conflicts INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_conflicts
    FROM (
        SELECT code, COUNT(*) as count
        FROM entites_administratives 
        GROUP BY code 
        HAVING COUNT(*) > 1
    ) conflicts;
    
    SELECT COUNT(*) INTO institution_conflicts
    FROM (
        SELECT code, COUNT(*) as count
        FROM entites_institutions 
        GROUP BY code 
        HAVING COUNT(*) > 1
    ) conflicts;
    
    IF admin_conflicts > 0 THEN
        RAISE EXCEPTION 'Il reste % codes en conflit dans entites_administratives', admin_conflicts;
    END IF;
    
    IF institution_conflicts > 0 THEN
        RAISE EXCEPTION 'Il reste % codes en conflit dans entites_institutions', institution_conflicts;
    END IF;
    
    RAISE NOTICE 'Migration terminée avec succès. Tous les codes sont maintenant uniques.';
END $$;

-- 8. Afficher un résumé final
-- ===========================

SELECT 
    'Résumé de la migration' as info,
    (SELECT COUNT(*) FROM entites_administratives) as total_entites_administratives,
    (SELECT COUNT(*) FROM entites_institutions) as total_entites_institutions,
    (SELECT COUNT(DISTINCT code) FROM entites_administratives) as codes_uniques_administratives,
    (SELECT COUNT(DISTINCT code) FROM entites_institutions) as codes_uniques_institutions;
