-- Ajouter les colonnes pour le type de service et les relations
ALTER TABLE services ADD COLUMN IF NOT EXISTS type_service VARCHAR(50) DEFAULT 'direction';
ALTER TABLE services ADD COLUMN IF NOT EXISTS direction_id INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sous_direction_id INTEGER;

-- Ajouter une contrainte de vérification pour le type de service
ALTER TABLE services ADD CONSTRAINT check_type_service 
    CHECK (type_service IN ('direction', 'sous_direction'));

-- Ajouter les contraintes de clés étrangères
ALTER TABLE services ADD CONSTRAINT fk_services_direction 
    FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE SET NULL;

ALTER TABLE services ADD CONSTRAINT fk_services_sous_direction 
    FOREIGN KEY (sous_direction_id) REFERENCES sous_directions(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_services_direction_id ON services(direction_id);
CREATE INDEX IF NOT EXISTS idx_services_sous_direction_id ON services(sous_direction_id);
CREATE INDEX IF NOT EXISTS idx_services_type_service ON services(type_service);

-- Mettre à jour la vue des services complètes
DROP VIEW IF EXISTS v_services_completes;
CREATE VIEW v_services_completes AS
SELECT 
    s.*,
    m.nom as ministere_nom,
    m.code as ministere_code,
    e.nom as entite_nom,
    d.libelle as direction_nom,
    sd.libelle as sous_direction_nom,
    a.prenom as responsable_prenom,
    a.nom as responsable_nom,
    a.matricule as responsable_matricule,
    CONCAT(a.prenom, ' ', a.nom) as responsable_nom_complet
FROM services s
LEFT JOIN ministeres m ON s.id_ministere = m.id
LEFT JOIN entites_administratives e ON s.id_entite = e.id
LEFT JOIN directions d ON s.direction_id = d.id
LEFT JOIN sous_directions sd ON s.sous_direction_id = sd.id
LEFT JOIN agents a ON s.responsable_id = a.id;

-- Commentaires sur les colonnes
COMMENT ON COLUMN services.type_service IS 'Type de service: direction ou sous_direction';
COMMENT ON COLUMN services.direction_id IS 'ID de la direction parente (obligatoire)';
COMMENT ON COLUMN services.sous_direction_id IS 'ID de la sous-direction parente (optionnel)';
