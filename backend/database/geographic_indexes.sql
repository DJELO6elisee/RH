-- Index pour optimiser les performances des tables géographiques
-- =============================================================

-- Index pour la table regions
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_nom ON regions(nom);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_created_at ON regions(created_at);

-- Index pour la table departements
CREATE INDEX IF NOT EXISTS idx_departements_id_region ON departements(id_region);
CREATE INDEX IF NOT EXISTS idx_departements_code ON departements(code);
CREATE INDEX IF NOT EXISTS idx_departements_nom ON departements(nom);
CREATE INDEX IF NOT EXISTS idx_departements_is_active ON departements(is_active);
CREATE INDEX IF NOT EXISTS idx_departements_created_at ON departements(created_at);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_departements_region_active ON departements(id_region, is_active);

-- Index pour la table localites
CREATE INDEX IF NOT EXISTS idx_localites_id_departement ON localites(id_departement);
CREATE INDEX IF NOT EXISTS idx_localites_code ON localites(code);
CREATE INDEX IF NOT EXISTS idx_localites_nom ON localites(nom);
CREATE INDEX IF NOT EXISTS idx_localites_type ON localites(type_localite);
CREATE INDEX IF NOT EXISTS idx_localites_is_active ON localites(is_active);
CREATE INDEX IF NOT EXISTS idx_localites_created_at ON localites(created_at);

-- Index géographique pour les coordonnées
CREATE INDEX IF NOT EXISTS idx_localites_coordinates ON localites(latitude, longitude);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_localites_departement_active ON localites(id_departement, is_active);
CREATE INDEX IF NOT EXISTS idx_localites_type_active ON localites(type_localite, is_active);

-- Index pour la table agents_localites
CREATE INDEX IF NOT EXISTS idx_agents_localites_id_agent ON agents_localites(id_agent);
CREATE INDEX IF NOT EXISTS idx_agents_localites_id_localite ON agents_localites(id_localite);
CREATE INDEX IF NOT EXISTS idx_agents_localites_type_adresse ON agents_localites(type_adresse);
CREATE INDEX IF NOT EXISTS idx_agents_localites_is_principal ON agents_localites(is_principal);
CREATE INDEX IF NOT EXISTS idx_agents_localites_created_at ON agents_localites(created_at);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_agents_localites_agent_principal ON agents_localites(id_agent, is_principal);
CREATE INDEX IF NOT EXISTS idx_agents_localites_agent_type ON agents_localites(id_agent, type_adresse);

-- Index pour la table affectations_geographiques
CREATE INDEX IF NOT EXISTS idx_affectations_geo_id_agent ON affectations_geographiques(id_agent);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_localite_source ON affectations_geographiques(id_localite_source);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_localite_destination ON affectations_geographiques(id_localite_destination);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_date_debut ON affectations_geographiques(date_debut);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_date_fin ON affectations_geographiques(date_fin);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_statut ON affectations_geographiques(statut);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_created_at ON affectations_geographiques(created_at);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_affectations_geo_agent_statut ON affectations_geographiques(id_agent, statut);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_dates ON affectations_geographiques(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_affectations_geo_agent_dates ON affectations_geographiques(id_agent, date_debut, date_fin);

-- Index pour les requêtes de hiérarchie géographique
CREATE INDEX IF NOT EXISTS idx_geo_hierarchy_region_departement ON departements(id_region, id);
CREATE INDEX IF NOT EXISTS idx_geo_hierarchy_departement_localite ON localites(id_departement, id);

-- Index pour les recherches textuelles
CREATE INDEX IF NOT EXISTS idx_regions_nom_trgm ON regions USING gin(nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_departements_nom_trgm ON departements USING gin(nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_localites_nom_trgm ON localites USING gin(nom gin_trgm_ops);

-- Index partiels pour les données actives uniquement
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_departements_active ON departements(id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_localites_active ON localites(id) WHERE is_active = TRUE;

-- Commentaires sur les index
COMMENT ON INDEX idx_regions_code IS 'Index sur le code de région pour les recherches rapides';
COMMENT ON INDEX idx_departements_id_region IS 'Index sur la relation département-région';
COMMENT ON INDEX idx_localites_id_departement IS 'Index sur la relation localité-département';
COMMENT ON INDEX idx_agents_localites_id_agent IS 'Index sur l\'agent pour les recherches d\'adresses';
COMMENT ON INDEX idx_affectations_geo_id_agent IS 'Index sur l\'agent pour l\'historique des affectations';
COMMENT ON INDEX idx_geo_hierarchy_region_departement IS 'Index composite pour la hiérarchie région-département';
COMMENT ON INDEX idx_geo_hierarchy_departement_localite IS 'Index composite pour la hiérarchie département-localité';
