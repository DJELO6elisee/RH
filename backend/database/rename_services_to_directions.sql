-- Script pour renommer la table services en directions
-- et mettre à jour toutes les références

-- 1. Renommer la table services en directions
ALTER TABLE services RENAME TO directions;

-- 2. Renommer la colonne id_service en id_direction dans la table agents
ALTER TABLE agents RENAME COLUMN id_service TO id_direction;

-- 3. Mettre à jour la contrainte de clé étrangère
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_id_service_fkey;
ALTER TABLE agents ADD CONSTRAINT agents_id_direction_fkey 
    FOREIGN KEY (id_direction) REFERENCES directions(id) ON DELETE SET NULL;

-- 4. Mettre à jour les commentaires
COMMENT ON TABLE directions IS 'Table des directions du ministère';
COMMENT ON COLUMN agents.id_direction IS 'Référence vers la direction d''affectation de l''agent';

-- 5. Vérifier que la migration s'est bien passée
SELECT 'Migration terminée avec succès' as status;
