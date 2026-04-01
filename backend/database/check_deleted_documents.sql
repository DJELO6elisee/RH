-- ============================================
-- VÉRIFICATION DES DOCUMENTS SUPPRIMÉS
-- ============================================

-- 1. Vérifier s'il reste des documents de notes de service
SELECT 
    COUNT(*) as nombre_documents_restants
FROM documents_autorisation 
WHERE type_document IN ('note_de_service', 'note_de_service_mutation');

-- 2. Vérifier les logs récents (si vous avez une table de logs)
-- SELECT * FROM logs WHERE action = 'DELETE' AND table_name = 'documents_autorisation' ORDER BY created_at DESC LIMIT 10;

-- 3. Vérifier les sauvegardes PostgreSQL disponibles
-- Si vous avez des sauvegardes, vous pouvez restaurer depuis:
-- pg_restore -d votre_base -t documents_autorisation backup_file.dump

-- 4. Vérifier les fichiers PDF dans le dossier uploads/documents
-- Les fichiers sont dans: backend/uploads/documents/
-- Format attendu: note_de_service_{agent_id}_{timestamp}.pdf

-- ============================================
-- OPTIONS DE RÉCUPÉRATION
-- ============================================

-- Option 1: Si vous avez une sauvegarde PostgreSQL récente
-- Utilisez pg_restore pour restaurer uniquement la table documents_autorisation

-- Option 2: Si le fichier PDF existe encore
-- Utilisez le script recreate_document_from_pdf.js pour recréer le document

-- Option 3: Recréer le document manuellement
-- Utilisez l'interface de l'application pour générer une nouvelle note de service

-- Option 4: Vérifier les logs de l'application Node.js
-- Cherchez dans les fichiers de logs les IDs de documents créés récemment
