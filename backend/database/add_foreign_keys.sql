-- Script pour ajouter les contraintes de clé étrangère
-- ===================================================

-- Ajouter les contraintes de clé étrangère pour la table entites_administratives
ALTER TABLE entites_administratives 
ADD CONSTRAINT fk_entites_responsable 
FOREIGN KEY (responsable_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Ajouter les contraintes de clé étrangère pour la table agents_entites
ALTER TABLE agents_entites 
ADD CONSTRAINT fk_agents_entites_agent 
FOREIGN KEY (id_agent) REFERENCES agents(id) ON DELETE CASCADE;

-- Ajouter les contraintes de clé étrangère pour la table affectations_temporaires
ALTER TABLE affectations_temporaires 
ADD CONSTRAINT fk_affectations_agent 
FOREIGN KEY (id_agent) REFERENCES agents(id) ON DELETE CASCADE;

-- Ajouter les contraintes de clé étrangère pour la table permissions_entites
ALTER TABLE permissions_entites 
ADD CONSTRAINT fk_permissions_role 
FOREIGN KEY (id_role) REFERENCES roles(id) ON DELETE CASCADE;
