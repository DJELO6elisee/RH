-- Script pour créer les tables de gestion des fichiers des agents
-- 1. Table pour les photos de profil
-- 2. Table pour les documents des agents

-- ============================================
-- 1. TABLE AGENT_PHOTOS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_photos (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_name VARCHAR(255) NOT NULL,
    photo_size INTEGER,
    photo_type VARCHAR(100),
    is_profile_photo BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour agent_photos
CREATE INDEX IF NOT EXISTS idx_agent_photos_agent ON agent_photos(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_photos_profile ON agent_photos(is_profile_photo);

-- Commentaires pour agent_photos
COMMENT ON TABLE agent_photos IS 'Photos des agents (photo de profil)';
COMMENT ON COLUMN agent_photos.id IS 'Identifiant unique de la photo';
COMMENT ON COLUMN agent_photos.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN agent_photos.photo_url IS 'URL ou chemin de la photo';
COMMENT ON COLUMN agent_photos.photo_name IS 'Nom original du fichier';
COMMENT ON COLUMN agent_photos.photo_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN agent_photos.photo_type IS 'Type MIME de la photo';
COMMENT ON COLUMN agent_photos.is_profile_photo IS 'Indique si c''est la photo de profil';

-- ============================================
-- 2. TABLE AGENT_DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_documents (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'diplome', 'certificat', 'attestation', 'autre'
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    document_size INTEGER,
    document_mime_type VARCHAR(100),
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour agent_documents
CREATE INDEX IF NOT EXISTS idx_agent_documents_agent ON agent_documents(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_documents_type ON agent_documents(document_type);

-- Commentaires pour agent_documents
COMMENT ON TABLE agent_documents IS 'Documents des agents (diplômes, certificats, etc.)';
COMMENT ON COLUMN agent_documents.id IS 'Identifiant unique du document';
COMMENT ON COLUMN agent_documents.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN agent_documents.document_type IS 'Type de document (diplome, certificat, attestation, autre)';
COMMENT ON COLUMN agent_documents.document_name IS 'Nom original du fichier';
COMMENT ON COLUMN agent_documents.document_url IS 'URL ou chemin du document';
COMMENT ON COLUMN agent_documents.document_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN agent_documents.document_mime_type IS 'Type MIME du document';
COMMENT ON COLUMN agent_documents.description IS 'Description du document';

-- ============================================
-- MESSAGE DE CONFIRMATION
-- ============================================
SELECT 'Tables de gestion des fichiers des agents créées avec succès' as message;
