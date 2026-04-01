-- Index pour optimiser les performances des tables géographiques simplifiées
-- =========================================================================

-- Index pour la table regions
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_libele ON regions(libele);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_created_at ON regions(created_at);

-- Index pour la table departements
CREATE INDEX IF NOT EXISTS idx_departements_id_region ON departements(id_region);
CREATE INDEX IF NOT EXISTS idx_departements_code ON departements(code);
CREATE INDEX IF NOT EXISTS idx_departements_libele ON departements(libele);
CREATE INDEX IF NOT EXISTS idx_departements_is_active ON departements(is_active);
CREATE INDEX IF NOT EXISTS idx_departements_created_at ON departements(created_at);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_departements_region_active ON departements(id_region, is_active);

-- Index pour la table localites
CREATE INDEX IF NOT EXISTS idx_localites_id_departement ON localites(id_departement);
CREATE INDEX IF NOT EXISTS idx_localites_code ON localites(code);
CREATE INDEX IF NOT EXISTS idx_localites_libele ON localites(libele);
CREATE INDEX IF NOT EXISTS idx_localites_type ON localites(type_localite);
CREATE INDEX IF NOT EXISTS idx_localites_is_active ON localites(is_active);
CREATE INDEX IF NOT EXISTS idx_localites_created_at ON localites(created_at);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_localites_departement_active ON localites(id_departement, is_active);
CREATE INDEX IF NOT EXISTS idx_localites_type_active ON localites(type_localite, is_active);

-- Index pour les nouvelles colonnes géographiques des tables administratives

-- Index pour les relations géographiques des ministères
CREATE INDEX IF NOT EXISTS idx_ministeres_id_region ON ministeres(id_region);
CREATE INDEX IF NOT EXISTS idx_ministeres_id_departement ON ministeres(id_departement);
CREATE INDEX IF NOT EXISTS idx_ministeres_id_localite ON ministeres(id_localite);

-- Index pour les relations géographiques des entités administratives
CREATE INDEX IF NOT EXISTS idx_entites_admin_id_region ON entites_administratives(id_region);
CREATE INDEX IF NOT EXISTS idx_entites_admin_id_departement ON entites_administratives(id_departement);
CREATE INDEX IF NOT EXISTS idx_entites_admin_id_localite ON entites_administratives(id_localite);

-- Index pour les relations géographiques des institutions
CREATE INDEX IF NOT EXISTS idx_institutions_id_region ON institutions(id_region);
CREATE INDEX IF NOT EXISTS idx_institutions_id_departement ON institutions(id_departement);
CREATE INDEX IF NOT EXISTS idx_institutions_id_localite ON institutions(id_localite);

-- Index pour les relations géographiques des entités institutions
CREATE INDEX IF NOT EXISTS idx_entites_institutions_id_region ON entites_institutions(id_region);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_id_departement ON entites_institutions(id_departement);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_id_localite ON entites_institutions(id_localite);

-- Index composites pour les requêtes géographiques fréquentes
CREATE INDEX IF NOT EXISTS idx_ministeres_geo_hierarchy ON ministeres(id_region, id_departement, id_localite);
CREATE INDEX IF NOT EXISTS idx_entites_admin_geo_hierarchy ON entites_administratives(id_region, id_departement, id_localite);
CREATE INDEX IF NOT EXISTS idx_institutions_geo_hierarchy ON institutions(id_region, id_departement, id_localite);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_geo_hierarchy ON entites_institutions(id_region, id_departement, id_localite);

-- Index pour les requêtes de hiérarchie géographique
CREATE INDEX IF NOT EXISTS idx_geo_hierarchy_region_departement ON departements(id_region, id);
CREATE INDEX IF NOT EXISTS idx_geo_hierarchy_departement_localite ON localites(id_departement, id);

-- Index pour les recherches textuelles (nécessite l'extension pg_trgm)
-- Ces index sont créés seulement si l'extension pg_trgm est disponible
DO $$
BEGIN
    -- Vérifier si l'extension pg_trgm est disponible
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        -- Créer les index trigrammes pour les recherches textuelles avancées
        CREATE INDEX IF NOT EXISTS idx_regions_libele_trgm ON regions USING gin(libele gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_departements_libele_trgm ON departements USING gin(libele gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_localites_libele_trgm ON localites USING gin(libele gin_trgm_ops);
        
        RAISE NOTICE 'Index trigrammes créés avec succès';
    ELSE
        -- Créer des index alternatifs pour les recherches textuelles
        CREATE INDEX IF NOT EXISTS idx_regions_libele_lower ON regions(lower(libele));
        CREATE INDEX IF NOT EXISTS idx_departements_libele_lower ON departements(lower(libele));
        CREATE INDEX IF NOT EXISTS idx_localites_libele_lower ON localites(lower(libele));
        
        RAISE NOTICE 'Index alternatifs créés (extension pg_trgm non disponible)';
    END IF;
END $$;

-- Index partiels pour les données actives uniquement
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_departements_active ON departements(id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_localites_active ON localites(id) WHERE is_active = TRUE;

-- Index pour les requêtes de statistiques géographiques
CREATE INDEX IF NOT EXISTS idx_geo_stats_region ON ministeres(id_region) WHERE id_region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geo_stats_departement ON ministeres(id_departement) WHERE id_departement IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geo_stats_localite ON ministeres(id_localite) WHERE id_localite IS NOT NULL;

-- Commentaires sur les index
COMMENT ON INDEX idx_regions_code IS 'Index sur le code de région pour les recherches rapides';
COMMENT ON INDEX idx_departements_id_region IS 'Index sur la relation département-région';
COMMENT ON INDEX idx_localites_id_departement IS 'Index sur la relation localité-département';
COMMENT ON INDEX idx_geo_hierarchy_region_departement IS 'Index composite pour la hiérarchie région-département';
COMMENT ON INDEX idx_geo_hierarchy_departement_localite IS 'Index composite pour la hiérarchie département-localité';
COMMENT ON INDEX idx_ministeres_geo_hierarchy IS 'Index composite pour les requêtes géographiques des ministères';
COMMENT ON INDEX idx_entites_admin_geo_hierarchy IS 'Index composite pour les requêtes géographiques des entités administratives';
COMMENT ON INDEX idx_institutions_geo_hierarchy IS 'Index composite pour les requêtes géographiques des institutions';
COMMENT ON INDEX idx_entites_institutions_geo_hierarchy IS 'Index composite pour les requêtes géographiques des entités institutions';
