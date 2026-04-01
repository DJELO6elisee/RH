-- Ajout des colonnes de validation pour les nouveaux rôles : Chef de Cabinet, DG, DC
-- Date : 12 Octobre 2025

-- Colonnes pour Chef de Cabinet
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_chef_cabinet VARCHAR(50);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_chef_cabinet TIMESTAMP;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_chef_cabinet TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_chef_cabinet INTEGER REFERENCES agents(id) ON DELETE SET NULL;

-- Colonnes pour Directeur Général (DG)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_directeur_general VARCHAR(50);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_directeur_general TIMESTAMP;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_directeur_general TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_directeur_general INTEGER REFERENCES agents(id) ON DELETE SET NULL;


-- Colonnes pour Directeur Central (DC)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_directeur_central VARCHAR(50);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_directeur_central TIMESTAMP;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_directeur_central TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_directeur_central INTEGER REFERENCES agents(id) ON DELETE SET NULL;

-- Création des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_demandes_statut_chef_cabinet ON demandes(statut_chef_cabinet);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur_general ON demandes(statut_directeur_general);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur_central ON demandes(statut_directeur_central);

CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_chef_cabinet ON demandes(id_validateur_chef_cabinet);
CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_directeur_general ON demandes(id_validateur_directeur_general);
CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_directeur_central ON demandes(id_validateur_directeur_central);

-- Vérification des colonnes ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'demandes' 
AND column_name LIKE '%chef_cabinet%' 
OR column_name LIKE '%directeur_general%' 
OR column_name LIKE '%directeur_central%'
ORDER BY column_name;
