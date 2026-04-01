-- Script pour ajouter la colonne direction_id à la table sous_directions
-- Date: 2025-01-13

-- 1. Ajouter la colonne direction_id
ALTER TABLE sous_directions ADD COLUMN IF NOT EXISTS direction_id INTEGER;

-- 2. Ajouter la contrainte de clé étrangère
ALTER TABLE sous_directions ADD CONSTRAINT IF NOT EXISTS fk_sous_directions_direction 
    FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE SET NULL;

-- 3. Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sous_directions_direction_id ON sous_directions(direction_id);

-- 4. Mettre à jour les sous-directions existantes avec des directions par défaut
-- (Optionnel - à adapter selon vos besoins)
UPDATE sous_directions 
SET direction_id = (
    SELECT d.id 
    FROM directions d 
    WHERE d.id_ministere = sous_directions.id_ministere 
    LIMIT 1
)
WHERE direction_id IS NULL;

-- 5. Créer une vue mise à jour pour les sous-directions complètes
DROP VIEW IF EXISTS v_sous_directions_completes;

CREATE VIEW v_sous_directions_completes AS
SELECT 
    sd.id,
    sd.id_ministere,
    sd.id_entite,
    sd.direction_id,
    sd.libelle,
    sd.sous_directeur_id,
    sd.description,
    sd.is_active,
    sd.created_at,
    sd.updated_at,
    -- Informations du ministère
    m.nom as ministere_nom,
    m.code as ministere_code,
    -- Informations de l'entité
    e.nom as entite_nom,
    e.code as entite_code,
    -- Informations de la direction
    d.libelle as direction_nom,
    d.code as direction_code,
    -- Informations du sous-directeur
    a.prenom as sous_directeur_prenom,
    a.nom as sous_directeur_nom,
    a.matricule as sous_directeur_matricule,
    a.email as sous_directeur_email
FROM sous_directions sd
LEFT JOIN ministeres m ON sd.id_ministere = m.id
LEFT JOIN entites_administratives e ON sd.id_entite = e.id
LEFT JOIN directions d ON sd.direction_id = d.id
LEFT JOIN agents a ON sd.sous_directeur_id = a.id;

-- 6. Commentaires sur les colonnes
COMMENT ON COLUMN sous_directions.direction_id IS 'Référence vers la direction parente';
COMMENT ON CONSTRAINT fk_sous_directions_direction ON sous_directions IS 'Clé étrangère vers la table directions';

-- 7. Afficher les informations sur la modification
SELECT 
    'Colonne direction_id ajoutée avec succès' as message,
    COUNT(*) as nombre_sous_directions
FROM sous_directions;
