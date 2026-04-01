-- =====================================================
-- SCRIPT : Table pour l'attribution des routes aux agents
-- =====================================================
-- Date : Décembre 2024
-- Description : Permet au DRH d'assigner des routes/onglets
--               de la sidebar à des agents spécifiques
-- =====================================================

-- ==========================================
-- TABLE : agent_route_assignments
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_route_assignments (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    route_id VARCHAR(100) NOT NULL, -- L'ID de la route (ex: 'agents', 'demande-absence', etc.)
    assigned_by INTEGER REFERENCES utilisateurs(id), -- Le DRH qui a fait l'assignation
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, route_id) -- Un agent ne peut avoir qu'une seule assignation par route
);


-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agent_route_assignments_agent ON agent_route_assignments(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_route_assignments_route ON agent_route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_agent_route_assignments_active ON agent_route_assignments(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE agent_route_assignments IS 'Table de liaison pour assigner des routes (onglets sidebar) aux agents';
COMMENT ON COLUMN agent_route_assignments.id_agent IS 'ID de l''agent à qui la route est assignée';
COMMENT ON COLUMN agent_route_assignments.route_id IS 'ID de la route assignée (correspond à l''id dans routes.js)';
COMMENT ON COLUMN agent_route_assignments.assigned_by IS 'ID de l''utilisateur (DRH) qui a fait l''assignation';

-- ==========================================
-- PERMISSIONS POUR L'UTILISATEUR DE LA BASE DE DONNÉES
-- ==========================================
-- Accorder les permissions nécessaires sur la table agent_route_assignments
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_route_assignments TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_route_assignments_id_seq TO "isegroup";

-- Si vous utilisez un autre utilisateur, remplacez "isegroup" par votre nom d'utilisateur
-- Exemple pour un utilisateur nommé "postgres" ou autre:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_route_assignments TO "postgres";
-- GRANT USAGE, SELECT ON SEQUENCE agent_route_assignments_id_seq TO "postgres";

-- ==========================================
-- FONCTION HELPER POUR ASSIGNER TOUTES LES ROUTES À UN AGENT
-- ==========================================
-- CREATE OR REPLACE FUNCTION assign_all_routes_to_agent(
--     p_agent_id INTEGER,
--     p_assigned_by INTEGER
-- ) RETURNS INTEGER AS $$
-- DECLARE
--     v_count INTEGER;
-- BEGIN
--     INSERT INTO agent_route_assignments (id_agent, route_id, assigned_by, is_active)
--     SELECT 
--         p_agent_id,
--         route_id,
--         p_assigned_by,
--         TRUE
--     FROM (VALUES
--     ('fiche-signaletique'),
--     ('agents_reports'),
--     ('agents_by_type_report'),
--     ('agents_by_service_report'),
--     ('auth'),
--     ('civilites'),
--     ('nationalites'),
--     ('situation_matrimonials'),
--     ('type-d-agents'),
--     ('categories'),
--     ('grades'),
--     ('echelons'),
--     ('emplois'),
--     ('ministeres'),
--     ('entites'),
--     ('institutions'),
--     ('agents-institutions'),
--     ('enfants-institutions'),
--     ('entites-institutions'),
--     ('services-institutions'),
--     ('type-seminaire-institutions'),
--     ('type-documents-institutions'),
--     ('tiers-institutions'),
--     ('dossiers-institutions'),
--     ('classeurs-institutions'),
--     ('agents-entites-institutions'),
--     ('affectations-temporaires-institutions'),
--     ('permissions-entites-institutions'),
--     ('directions'),
--     ('sous-directions'),
--     ('services'),
--     ('services-entites-ministres'),
--     ('fonctions'),
--     ('type_d_agents'),
--     ('agents'),
--     ('retraites'),
--     ('verification-retraite'),
--     ('prolongement-retraite'),
--     ('jours-conges'),
--     ('planning-previsionnel-conges'),
--     ('gestion-mariages'),
--     ('historique-des-agents'),
--     ('agent-user-accounts'),
--     ('attribution-taches-agents'),
--     ('diplomes'),
--     ('distinctions'),
--     ('specialites'),
--     ('langues'),
--     ('niveau_langues'),
--     ('logiciels'),
--     ('niveau_informatiques'),
--     ('positions'),
--     ('type_de_conges'),
--     ('autre_absences'),
--     ('mode_d_entrees'),
--     ('motif_de_departs'),
--     ('type_de_retraites'),
--     ('pays'),
--     ('regions'),
--     ('departements'),
--     ('localites'),
--     ('enfants'),
--     ('handicaps'),
--     ('pathologies'),
--     ('nature_d_accidents'),
--     ('sanctions'),
--     ('nature_actes'),
--     ('type_de_documents'),
--     ('type_de_couriers'),
--     ('type_de_destinations'),
--     ('type_de_seminaire_de_formation'),
--     ('seminaire_formation'),
--     ('gestion_evenements'),
--     ('type_etablissements'),
--     ('unite_administratives'),
--     ('sindicats'),
--     ('dossiers'),
--     ('classeurs'),
--     ('agent-fonctions'),
--     ('agent-emplois'),
--     ('demande-absence'),
--     ('demande-sortie-territoire'),
--     ('demande-attestation-travail'),
--     ('autorisation-conges'),
--     ('autorisation-retraite'),
--     ('attestation-presence'),
--     ('note-service'),
--     ('certificat-cessation-service'),
--     ('autorisation-reprise-service'),
--     ('documents-generated'),
--     ('decision'),
--     ('emargement'),
--     ('historiques-demandes'),
--     ('generer-documents')
--     ) AS routes(route_id)
--     ON CONFLICT (id_agent, route_id) DO UPDATE SET
--         is_active = TRUE,
--         assigned_by = EXCLUDED.assigned_by,
--         updated_at = CURRENT_TIMESTAMP;
    
--     GET DIAGNOSTICS v_count = ROW_COUNT;
--     RETURN v_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- COMMENT ON FUNCTION assign_all_routes_to_agent IS 'Fonction helper pour assigner toutes les routes disponibles à un agent. Utilisation: SELECT assign_all_routes_to_agent(agent_id, drh_user_id);';

-- ==========================================
-- EXEMPLES D'UTILISATION
-- ==========================================

-- Exemple 1: Assigner toutes les routes à un agent spécifique
-- Remplacez 1 par l'ID de l'agent et 1 par l'ID du DRH
-- SELECT assign_all_routes_to_agent(1, 1);

-- Exemple 2: Assigner toutes les routes à plusieurs agents
-- SELECT assign_all_routes_to_agent(1, 1);  -- Agent ID 1
-- SELECT assign_all_routes_to_agent(2, 1);  -- Agent ID 2
-- SELECT assign_all_routes_to_agent(3, 1);  -- Agent ID 3

-- Exemple 3: Assigner toutes les routes manuellement (sans fonction)
-- INSERT INTO agent_route_assignments (id_agent, route_id, assigned_by, is_active)
-- SELECT 
--     1 as id_agent,  -- Remplacez par l'ID de l'agent
--     route_id,
--     1 as assigned_by,  -- Remplacez par l'ID du DRH
--     TRUE as is_active
-- FROM (VALUES
--     ('fiche-signaletique'),
--     ('agents_reports'),
--     ('agents_by_type_report'),
--     ('agents_by_service_report'),
--     -- ... (toutes les routes listées ci-dessus dans la fonction)
-- ) AS routes(route_id)
-- ON CONFLICT (id_agent, route_id) DO UPDATE SET
--     is_active = TRUE,
--     assigned_by = EXCLUDED.assigned_by,
--     updated_at = CURRENT_TIMESTAMP;

-- Exemple 4: Voir toutes les routes assignées à un agent
-- SELECT ara.*, a.nom, a.prenom, a.matricule
-- FROM agent_route_assignments ara
-- JOIN agents a ON ara.id_agent = a.id
-- WHERE ara.id_agent = 1 AND ara.is_active = TRUE;

-- Exemple 5: Retirer toutes les routes d'un agent (désactiver)
-- UPDATE agent_route_assignments
-- SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
-- WHERE id_agent = 1;

