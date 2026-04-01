-- Script pour modifier la table etude_diplome et la lier avec agent_documents

-- Ajouter une colonne pour lier avec agent_documents
ALTER TABLE etude_diplome 
ADD COLUMN IF NOT EXISTS id_agent_document INTEGER REFERENCES agent_documents(id) ON DELETE SET NULL;

-- Ajouter un index pour la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_etude_diplome_document ON etude_diplome(id_agent_document);

-- Ajouter un commentaire
COMMENT ON COLUMN etude_diplome.id_agent_document IS 'Référence vers le document uploadé dans agent_documents';

-- Afficher un message de confirmation
SELECT 'Table etude_diplome mise à jour avec succès' as message;
