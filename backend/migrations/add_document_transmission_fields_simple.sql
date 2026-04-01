-- Migration simplifiée pour ajouter les champs de transmission des documents
-- Utilise les tables existantes : notifications_demandes et workflow_demandes
-- Date: 2025-01-06

-- Ajouter les colonnes manquantes à la table documents_autorisation
ALTER TABLE documents_autorisation 
ADD COLUMN IF NOT EXISTS date_transmission TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_reception TIMESTAMP,
ADD COLUMN IF NOT EXISTS commentaire_transmission TEXT,
ADD COLUMN IF NOT EXISTS id_agent_transmetteur INTEGER REFERENCES agents(id);

-- Commentaire sur les nouvelles colonnes
COMMENT ON COLUMN documents_autorisation.date_transmission IS 'Date et heure de transmission du document par le chef de service';
COMMENT ON COLUMN documents_autorisation.date_reception IS 'Date et heure de réception du document par l''agent';
COMMENT ON COLUMN documents_autorisation.commentaire_transmission IS 'Commentaire du chef de service lors de la transmission';
COMMENT ON COLUMN documents_autorisation.id_agent_transmetteur IS 'ID de l''agent qui a transmis le document (chef de service)';

-- Vérifier que les tables existantes ont les bonnes colonnes
-- notifications_demandes : id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
-- workflow_demandes : id_demande, niveau_validation, id_validateur, action, commentaire, date_action
