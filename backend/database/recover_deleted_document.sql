-- ============================================
-- SCRIPT DE RÉCUPÉRATION DE DOCUMENT SUPPRIMÉ
-- ============================================

-- 1. Vérifier les documents de notes de service actuellement en base
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    id_agent_destinataire,
    id_agent_generateur,
    commentaires,
    created_at,
    updated_at
FROM documents_autorisation 
WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
ORDER BY date_generation DESC;

-- 2. Vérifier les fichiers PDF référencés dans la base
SELECT 
    id,
    type_document,
    titre,
    chemin_fichier,
    date_generation
FROM documents_autorisation 
WHERE chemin_fichier IS NOT NULL 
  AND chemin_fichier != ''
  AND type_document IN ('note_de_service', 'note_de_service_mutation')
ORDER BY date_generation DESC;

-- 3. Compter les documents de notes de service par type
SELECT 
    type_document,
    COUNT(*) as nombre_documents
FROM documents_autorisation 
WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
GROUP BY type_document;

-- 4. Vérifier les documents créés récemment (dernières 24 heures)
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    id_agent_destinataire
FROM documents_autorisation 
WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
  AND date_generation >= NOW() - INTERVAL '24 hours'
ORDER BY date_generation DESC;

-- 5. Vérifier les documents créés aujourd'hui
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    id_agent_destinataire
FROM documents_autorisation 
WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
  AND DATE(date_generation) = CURRENT_DATE
ORDER BY date_generation DESC;

-- ============================================
-- OPTIONS DE RÉCUPÉRATION
-- ============================================

-- Option A: Si vous connaissez l'ID de l'agent destinataire
-- Remplacez {AGENT_ID} par l'ID de l'agent
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    commentaires
FROM documents_autorisation 
WHERE type_document = 'note_de_service'
  AND id_agent_destinataire = {AGENT_ID}
ORDER BY date_generation DESC;
*/

-- Option B: Si vous connaissez la date approximative de création
-- Remplacez '2025-12-30' par la date souhaitée
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    id_agent_destinataire
FROM documents_autorisation 
WHERE type_document = 'note_de_service'
  AND DATE(date_generation) = '2025-12-30'
ORDER BY date_generation DESC;
*/

-- Option C: Vérifier les fichiers PDF dans le système de fichiers
-- Les fichiers sont dans: backend/uploads/documents/
-- Format: note_de_service_{agent_id}_{timestamp}.pdf
-- Vous pouvez lister les fichiers avec le script Node.js: find_orphaned_pdfs.js
