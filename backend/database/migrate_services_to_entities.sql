-- Migration : Déplacer les services des ministères vers les entités administratives
-- =============================================================================

-- 1. Créer une nouvelle table services liée aux entités
CREATE TABLE IF NOT EXISTS services_entites (
    id SERIAL PRIMARY KEY,
    id_entite INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    code VARCHAR(20),
    responsable_id INTEGER, -- Référence vers un agent responsable
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_entite, libelle)
);

-- 2. Créer une table similaire pour les institutions
CREATE TABLE IF NOT EXISTS services_institutions (
    id SERIAL PRIMARY KEY,
    id_entite INTEGER REFERENCES entites_institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    code VARCHAR(20),
    responsable_id INTEGER, -- Référence vers un agent responsable
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_entite, libelle)
);

-- 3. Migrer les données existantes (si la table services existe déjà)
-- Cette section sera exécutée seulement si des données existent
DO $$
BEGIN
    -- Vérifier si la table services existe et contient des données
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
        -- Migrer les services existants vers les entités
        -- Pour chaque service, on l'associe à la première entité du ministère correspondant
        INSERT INTO services_entites (id_entite, libelle, created_at, updated_at)
        SELECT 
            ea.id as id_entite,
            s.libelle,
            s.created_at,
            s.updated_at
        FROM services s
        JOIN ministeres m ON s.id_ministere = m.id
        JOIN entites_administratives ea ON ea.id_ministere = m.id
        WHERE ea.niveau_hierarchique = 1 -- Prendre les entités de niveau 1 (directions)
        AND NOT EXISTS (
            SELECT 1 FROM services_entites se 
            WHERE se.id_entite = ea.id AND se.libelle = s.libelle
        );
        
        -- Afficher un message de migration
        RAISE NOTICE 'Migration des services vers les entités terminée';
    END IF;
END $$;

-- 4. Mettre à jour la table type_de_documents pour référencer les nouveaux services
-- D'abord, ajouter la nouvelle colonne
ALTER TABLE type_de_documents 
ADD COLUMN IF NOT EXISTS id_service_entite INTEGER REFERENCES services_entites(id) ON DELETE SET NULL;

-- 5. Créer les index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_services_entites_id_entite ON services_entites(id_entite);
CREATE INDEX IF NOT EXISTS idx_services_entites_is_active ON services_entites(is_active);
CREATE INDEX IF NOT EXISTS idx_services_entites_responsable ON services_entites(responsable_id);

CREATE INDEX IF NOT EXISTS idx_services_institutions_id_entite ON services_institutions(id_entite);
CREATE INDEX IF NOT EXISTS idx_services_institutions_is_active ON services_institutions(is_active);
CREATE INDEX IF NOT EXISTS idx_services_institutions_responsable ON services_institutions(responsable_id);

CREATE INDEX IF NOT EXISTS idx_type_documents_id_service_entite ON type_de_documents(id_service_entite);

-- 6. Ajouter des contraintes de validation
ALTER TABLE services_entites 
ADD CONSTRAINT chk_services_entites_libelle_not_empty 
CHECK (LENGTH(TRIM(libelle)) > 0);

ALTER TABLE services_institutions 
ADD CONSTRAINT chk_services_institutions_libelle_not_empty 
CHECK (LENGTH(TRIM(libelle)) > 0);

-- 7. Créer des vues pour faciliter les requêtes
CREATE OR REPLACE VIEW v_services_avec_entites AS
SELECT 
    se.id,
    se.libelle,
    se.description,
    se.code,
    se.is_active,
    ea.id as id_entite,
    ea.nom as nom_entite,
    ea.sigle as sigle_entite,
    ea.type_entite,
    m.id as id_ministere,
    m.nom as nom_ministere,
    m.sigle as sigle_ministere,
    se.created_at,
    se.updated_at
FROM services_entites se
JOIN entites_administratives ea ON se.id_entite = ea.id
JOIN ministeres m ON ea.id_ministere = m.id;

CREATE OR REPLACE VIEW v_services_institutions_avec_entites AS
SELECT 
    si.id,
    si.libelle,
    si.description,
    si.code,
    si.is_active,
    ei.id as id_entite,
    ei.nom as nom_entite,
    ei.sigle as sigle_entite,
    ei.type_entite,
    i.id as id_institution,
    i.nom as nom_institution,
    i.sigle as sigle_institution,
    si.created_at,
    si.updated_at
FROM services_institutions si
JOIN entites_institutions ei ON si.id_entite = ei.id
JOIN institutions i ON ei.id_institution = i.id;

-- 8. Créer des fonctions utilitaires
CREATE OR REPLACE FUNCTION get_services_by_entite(p_id_entite INTEGER)
RETURNS TABLE (
    id INTEGER,
    libelle VARCHAR(200),
    description TEXT,
    code VARCHAR(20),
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id,
        se.libelle,
        se.description,
        se.code,
        se.is_active
    FROM services_entites se
    WHERE se.id_entite = p_id_entite
    AND se.is_active = TRUE
    ORDER BY se.libelle;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_services_by_ministere(p_id_ministere INTEGER)
RETURNS TABLE (
    id INTEGER,
    libelle VARCHAR(200),
    description TEXT,
    code VARCHAR(20),
    id_entite INTEGER,
    nom_entite VARCHAR(200),
    type_entite VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id,
        se.libelle,
        se.description,
        se.code,
        ea.id as id_entite,
        ea.nom as nom_entite,
        ea.type_entite
    FROM services_entites se
    JOIN entites_administratives ea ON se.id_entite = ea.id
    WHERE ea.id_ministere = p_id_ministere
    AND se.is_active = TRUE
    ORDER BY ea.niveau_hierarchique, ea.nom, se.libelle;
END;
$$ LANGUAGE plpgsql;

-- 9. Commentaires pour la documentation
COMMENT ON TABLE services_entites IS 'Services rattachés aux entités administratives des ministères';
COMMENT ON TABLE services_institutions IS 'Services rattachés aux entités des institutions';
COMMENT ON VIEW v_services_avec_entites IS 'Vue des services avec leurs entités et ministères';
COMMENT ON VIEW v_services_institutions_avec_entites IS 'Vue des services d''institutions avec leurs entités';
COMMENT ON FUNCTION get_services_by_entite(INTEGER) IS 'Récupère tous les services actifs d''une entité';
COMMENT ON FUNCTION get_services_by_ministere(INTEGER) IS 'Récupère tous les services actifs d''un ministère avec leurs entités';

-- 10. Message de fin
DO $$
BEGIN
    RAISE NOTICE 'Migration terminée avec succès !';
    RAISE NOTICE 'Nouvelles tables créées : services_entites, services_institutions';
    RAISE NOTICE 'Nouvelles vues créées : v_services_avec_entites, v_services_institutions_avec_entites';
    RAISE NOTICE 'Nouvelles fonctions créées : get_services_by_entite, get_services_by_ministere';
    RAISE NOTICE 'Vous pouvez maintenant supprimer l''ancienne table services si elle existe.';
END $$;
