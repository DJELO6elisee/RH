-- Script pour ajouter les contraintes de clé étrangère pour les tables d'institutions
-- ================================================================================

-- Ajouter les contraintes de clé étrangère pour la table entites_institutions
ALTER TABLE entites_institutions 
ADD CONSTRAINT fk_entites_institutions_responsable 
FOREIGN KEY (responsable_id) REFERENCES agents_institutions_main(id) ON DELETE SET NULL;

-- Ajouter les contraintes de clé étrangère pour la table agents_entites_institutions (dans hierarchy_schema.sql)
ALTER TABLE agents_entites_institutions 
ADD CONSTRAINT fk_agents_entites_institutions_agent 
FOREIGN KEY (id_agent_institution) REFERENCES agents_institutions_main(id) ON DELETE CASCADE;

-- Ajouter les contraintes de clé étrangère pour la table affectations_temporaires_institutions
ALTER TABLE affectations_temporaires_institutions 
ADD CONSTRAINT fk_affectations_institutions_agent 
FOREIGN KEY (id_agent) REFERENCES agents_institutions_main(id) ON DELETE CASCADE;

-- Ajouter les contraintes de clé étrangère pour la table permissions_entites_institutions
ALTER TABLE permissions_entites_institutions 
ADD CONSTRAINT fk_permissions_entites_institutions_role 
FOREIGN KEY (id_role) REFERENCES roles(id) ON DELETE CASCADE;
