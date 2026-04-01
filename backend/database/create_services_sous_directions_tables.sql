-- =====================================================
-- Script de création des tables services et sous_directions
-- =====================================================

-- 1. Créer la table services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    id_entite INTEGER,
    libelle VARCHAR(255) NOT NULL,
    responsable_id INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_services_ministere 
        FOREIGN KEY (id_ministere) REFERENCES ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_services_entite 
        FOREIGN KEY (id_entite) REFERENCES entites_administratives(id) ON DELETE SET NULL,
    CONSTRAINT fk_services_responsable 
        FOREIGN KEY (responsable_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Contraintes d'unicité
    CONSTRAINT uk_services_libelle_ministere 
        UNIQUE (libelle, id_ministere)
);

-- 2. Créer la table sous_directions
CREATE TABLE IF NOT EXISTS sous_directions (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    id_entite INTEGER,
    libelle VARCHAR(255) NOT NULL,
    sous_directeur_id INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_sous_directions_ministere 
        FOREIGN KEY (id_ministere) REFERENCES ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_sous_directions_entite 
        FOREIGN KEY (id_entite) REFERENCES entites_administratives(id) ON DELETE SET NULL,
    CONSTRAINT fk_sous_directions_sous_directeur 
        FOREIGN KEY (sous_directeur_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Contraintes d'unicité
    CONSTRAINT uk_sous_directions_libelle_ministere 
        UNIQUE (libelle, id_ministere)
);

-- 3. Ajouter les nouvelles colonnes à la table agents
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS id_sous_direction INTEGER,
ADD COLUMN IF NOT EXISTS id_service INTEGER;

-- 4. Ajouter les contraintes de clés étrangères pour les nouvelles colonnes
ALTER TABLE agents 
ADD CONSTRAINT IF NOT EXISTS fk_agents_sous_direction 
    FOREIGN KEY (id_sous_direction) REFERENCES sous_directions(id) ON DELETE SET NULL;

ALTER TABLE agents 
ADD CONSTRAINT IF NOT EXISTS fk_agents_service 
    FOREIGN KEY (id_service) REFERENCES services(id) ON DELETE SET NULL;

-- 5. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_services_ministere ON services(id_ministere);
CREATE INDEX IF NOT EXISTS idx_services_entite ON services(id_entite);
CREATE INDEX IF NOT EXISTS idx_services_responsable ON services(responsable_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

CREATE INDEX IF NOT EXISTS idx_sous_directions_ministere ON sous_directions(id_ministere);
CREATE INDEX IF NOT EXISTS idx_sous_directions_entite ON sous_directions(id_entite);
CREATE INDEX IF NOT EXISTS idx_sous_directions_sous_directeur ON sous_directions(sous_directeur_id);
CREATE INDEX IF NOT EXISTS idx_sous_directions_active ON sous_directions(is_active);

CREATE INDEX IF NOT EXISTS idx_agents_sous_direction ON agents(id_sous_direction);
CREATE INDEX IF NOT EXISTS idx_agents_service ON agents(id_service);

-- 6. Insérer des données de test pour le ministère 1
INSERT INTO services (id_ministere, id_entite, libelle, description) VALUES
(1, NULL, 'Service des Ressources Humaines', 'Gestion du personnel et des ressources humaines'),
(1, NULL, 'Service Informatique', 'Gestion des systèmes d''information et de la technologie'),
(1, NULL, 'Service Financier', 'Gestion financière et comptable'),
(1, NULL, 'Service Administratif', 'Gestion administrative générale')
ON CONFLICT (libelle, id_ministere) DO NOTHING;

INSERT INTO sous_directions (id_ministere, id_entite, libelle, description) VALUES
(1, NULL, 'Sous-direction des Affaires Administratives', 'Gestion des affaires administratives'),
(1, NULL, 'Sous-direction des Affaires Financières', 'Gestion des affaires financières'),
(1, NULL, 'Sous-direction des Affaires Techniques', 'Gestion des affaires techniques'),
(1, NULL, 'Sous-direction des Affaires Pédagogiques', 'Gestion des affaires pédagogiques')
ON CONFLICT (libelle, id_ministere) DO NOTHING;

-- 7. Créer des triggers pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour services
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour sous_directions
DROP TRIGGER IF EXISTS update_sous_directions_updated_at ON sous_directions;
CREATE TRIGGER update_sous_directions_updated_at
    BEFORE UPDATE ON sous_directions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Créer des vues pour faciliter les requêtes
CREATE OR REPLACE VIEW v_services_complets AS
SELECT 
    s.id,
    s.id_ministere,
    s.id_entite,
    s.libelle,
    s.responsable_id,
    s.description,
    s.is_active,
    s.created_at,
    s.updated_at,
    m.nom as ministere_nom,
    m.code as ministere_code,
    e.nom as entite_nom,
    a.prenom as responsable_prenom,
    a.nom as responsable_nom,
    a.matricule as responsable_matricule
FROM services s
LEFT JOIN ministeres m ON s.id_ministere = m.id
LEFT JOIN entites_administratives e ON s.id_entite = e.id
LEFT JOIN agents a ON s.responsable_id = a.id;

CREATE OR REPLACE VIEW v_sous_directions_completes AS
SELECT 
    sd.id,
    sd.id_ministere,
    sd.id_entite,
    sd.libelle,
    sd.sous_directeur_id,
    sd.description,
    sd.is_active,
    sd.created_at,
    sd.updated_at,
    m.nom as ministere_nom,
    m.code as ministere_code,
    e.nom as entite_nom,
    a.prenom as sous_directeur_prenom,
    a.nom as sous_directeur_nom,
    a.matricule as sous_directeur_matricule
FROM sous_directions sd
LEFT JOIN ministeres m ON sd.id_ministere = m.id
LEFT JOIN entites_administratives e ON sd.id_entite = e.id
LEFT JOIN agents a ON sd.sous_directeur_id = a.id;

-- 9. Créer une vue pour les agents avec leurs services et sous-directions
CREATE OR REPLACE VIEW v_agents_complets AS
SELECT 
    a.*,
    s.libelle as service_nom,
    s.description as service_description,
    sd.libelle as sous_direction_nom,
    sd.description as sous_direction_description,
    d.libelle as direction_nom,
    m.nom as ministere_nom,
    m.code as ministere_code
FROM agents a
LEFT JOIN services s ON a.id_service = s.id
LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
LEFT JOIN directions d ON a.id_direction = d.id
LEFT JOIN ministeres m ON a.id_ministere = m.id;

-- 10. Commentaires sur les tables
COMMENT ON TABLE services IS 'Table des services au sein des ministères et entités';
COMMENT ON TABLE sous_directions IS 'Table des sous-directions au sein des ministères et entités';

COMMENT ON COLUMN services.id_ministere IS 'ID du ministère auquel appartient le service';
COMMENT ON COLUMN services.id_entite IS 'ID de l\'entité administrative (optionnel)';
COMMENT ON COLUMN services.libelle IS 'Nom du service';
COMMENT ON COLUMN services.responsable_id IS 'ID de l\'agent responsable du service';

COMMENT ON COLUMN sous_directions.id_ministere IS 'ID du ministère auquel appartient la sous-direction';
COMMENT ON COLUMN sous_directions.id_entite IS 'ID de l\'entité administrative (optionnel)';
COMMENT ON COLUMN sous_directions.libelle IS 'Nom de la sous-direction';
COMMENT ON COLUMN sous_directions.sous_directeur_id IS 'ID de l\'agent sous-directeur';

COMMENT ON COLUMN agents.id_sous_direction IS 'ID de la sous-direction de l\'agent';
COMMENT ON COLUMN agents.id_service IS 'ID du service de l\'agent';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Tables services et sous_directions créées avec succès !';
    RAISE NOTICE 'Colonnes id_sous_direction et id_service ajoutées à la table agents !';
    RAISE NOTICE 'Vues et index créés !';
    RAISE NOTICE 'Données de test insérées !';
END $$;
