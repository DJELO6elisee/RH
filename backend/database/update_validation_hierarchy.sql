-- Script de mise à jour de la hiérarchie de validation
-- Ajoute les colonnes manquantes pour la nouvelle hiérarchie

-- Vérifier si les colonnes existent déjà avant de les ajouter
-- Colonnes pour sous_directeur (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_sous_directeur') THEN
        ALTER TABLE demandes ADD COLUMN statut_sous_directeur VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_sous_directeur') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_sous_directeur TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_sous_directeur') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_sous_directeur TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_sous_directeur') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_sous_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Colonnes pour directeur (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_directeur') THEN
        ALTER TABLE demandes ADD COLUMN statut_directeur VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_directeur') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_directeur TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_directeur') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_directeur TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_directeur') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Colonnes pour dir_cabinet (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_dir_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN statut_dir_cabinet VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_dir_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_dir_cabinet TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_dir_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_dir_cabinet TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_dir_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_dir_cabinet INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Colonnes pour chef_cabinet (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_chef_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN statut_chef_cabinet VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_chef_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_chef_cabinet TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_chef_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_chef_cabinet TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_chef_cabinet') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_chef_cabinet INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Colonnes pour directeur_general (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_directeur_general') THEN
        ALTER TABLE demandes ADD COLUMN statut_directeur_general VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_directeur_general') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_directeur_general TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_directeur_general') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_directeur_general TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_directeur_general') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_directeur_general INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Colonnes pour directeur_central (si pas déjà ajoutées)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'statut_directeur_central') THEN
        ALTER TABLE demandes ADD COLUMN statut_directeur_central VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'date_validation_directeur_central') THEN
        ALTER TABLE demandes ADD COLUMN date_validation_directeur_central TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'commentaire_directeur_central') THEN
        ALTER TABLE demandes ADD COLUMN commentaire_directeur_central TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'demandes' AND column_name = 'id_validateur_directeur_central') THEN
        ALTER TABLE demandes ADD COLUMN id_validateur_directeur_central INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_demandes_statut_sous_directeur ON demandes(statut_sous_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur ON demandes(statut_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_dir_cabinet ON demandes(statut_dir_cabinet);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_chef_cabinet ON demandes(statut_chef_cabinet);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur_general ON demandes(statut_directeur_general);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur_central ON demandes(statut_directeur_central);

-- Afficher un message de confirmation
SELECT 'Mise à jour de la hiérarchie de validation terminée avec succès!' as message;
