-- ============================================
-- SCRIPT COMPLET POUR VÉRIFIER ET MODIFIER LA DATE
-- ============================================

-- ÉTAPE 1: Vérifier tous les documents de l'agent 1082
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire,
    id_agent_generateur,
    created_at,
    updated_at
FROM documents_autorisation 
WHERE id_agent_destinataire = 1082
ORDER BY date_generation DESC;

-- ÉTAPE 2: Vérifier spécifiquement les notes de service
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire
FROM documents_autorisation 
WHERE id_agent_destinataire = 1082
  AND type_document = 'note_de_service';

-- ÉTAPE 3: Vérifier avec variations possibles du type
SELECT 
    id,
    type_document,
    titre,
    date_generation
FROM documents_autorisation 
WHERE id_agent_destinataire = 1082
  AND (type_document LIKE '%note%service%' OR type_document = 'note_de_service');

-- ÉTAPE 4: Si un document existe, modifier sa date de génération
-- Décommentez et ajustez la date selon vos besoins
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id_agent_destinataire = 1082
  AND type_document = 'note_de_service';
*/

-- ÉTAPE 5: Modifier par ID de document (si vous connaissez l'ID)
-- Remplacez {DOCUMENT_ID} par l'ID trouvé à l'étape 1
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = {DOCUMENT_ID};
*/

-- ÉTAPE 6: Vérifier le résultat après modification
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    updated_at
FROM documents_autorisation 
WHERE id_agent_destinataire = 1082
  AND type_document = 'note_de_service';
*/
