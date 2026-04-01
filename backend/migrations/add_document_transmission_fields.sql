-- Migration pour ajouter les champs de transmission des documents
-- Date: 2025-01-06

-- Ajouter les colonnes manquantes à la table documents_autorisation
ALTER TABLE documents_autorisation 
ADD COLUMN IF NOT EXISTS date_transmission TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_reception TIMESTAMP,
ADD COLUMN IF NOT EXISTS commentaire_transmission TEXT,
ADD COLUMN IF NOT EXISTS id_agent_transmetteur INTEGER REFERENCES agents(id);

-- Ajouter les colonnes manquantes à la table workflow_demandes si elles n'existent pas
ALTER TABLE workflow_demandes 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Créer la table notifications si elle n'existe pas
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id),
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type_notification VARCHAR(50) DEFAULT 'info',
    id_demande INTEGER REFERENCES demandes(id),
    id_document INTEGER REFERENCES documents_autorisation(id),
    created_by INTEGER REFERENCES agents(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Créer un index sur les notifications pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(id_agent);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type_notification);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Commentaire sur les nouvelles colonnes
COMMENT ON COLUMN documents_autorisation.date_transmission IS 'Date et heure de transmission du document par le chef de service';
COMMENT ON COLUMN documents_autorisation.date_reception IS 'Date et heure de réception du document par l''agent';
COMMENT ON COLUMN documents_autorisation.commentaire_transmission IS 'Commentaire du chef de service lors de la transmission';
COMMENT ON COLUMN documents_autorisation.id_agent_transmetteur IS 'ID de l''agent qui a transmis le document (chef de service)';

COMMENT ON TABLE notifications IS 'Table des notifications pour les agents';
COMMENT ON COLUMN notifications.id_agent IS 'Agent destinataire de la notification';
COMMENT ON COLUMN notifications.type_notification IS 'Type de notification (document_transmis, demande_validee, etc.)';
COMMENT ON COLUMN notifications.id_demande IS 'Demande liée à la notification (optionnel)';
COMMENT ON COLUMN notifications.id_document IS 'Document lié à la notification (optionnel)';
COMMENT ON COLUMN notifications.created_by IS 'Agent qui a créé la notification';
