-- ============================================
-- REQUÊTES SQL POUR MODIFIER LA DATE DE GÉNÉRATION
-- DES DOCUMENTS DE NOTE DE SERVICE
-- ============================================

-- Option 1: Modifier la date de génération d'un document spécifique par son ID
-- Remplacez {DOCUMENT_ID} par l'ID du document
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';
*/

-- Option 2: Modifier la date de génération pour un agent spécifique
-- Remplacez {AGENT_ID} par l'ID de l'agent
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id_agent_destinataire = {AGENT_ID}
  AND type_document = 'note_de_service';
*/

-- Option 3: Modifier la date de génération pour tous les documents créés après une certaine date
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
-- Remplacez '2025-12-30' par la date de référence
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND date_generation > '2025-12-30';
*/

-- Option 4: Modifier la date de génération pour le document le plus récent d'un agent
-- Remplacez {AGENT_ID} par l'ID de l'agent
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = (
    SELECT id 
    FROM documents_autorisation 
    WHERE id_agent_destinataire = {AGENT_ID}
      AND type_document = 'note_de_service'
    ORDER BY date_generation DESC 
    LIMIT 1
);
*/

-- Option 5: Modifier la date de génération pour tous les documents d'un type spécifique
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE type_document IN ('note_de_service', 'note_de_service_mutation');
*/

-- Option 6: Modifier la date de génération avec une date relative (ex: il y a 7 jours)
/*
UPDATE documents_autorisation 
SET date_generation = CURRENT_TIMESTAMP - INTERVAL '7 days',
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND id = {DOCUMENT_ID};
*/

-- Option 7: Modifier la date de génération pour mettre la date actuelle
/*
UPDATE documents_autorisation 
SET date_generation = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND id = {DOCUMENT_ID};
*/

-- ============================================
-- EXEMPLES CONCRETS
-- ============================================

-- Exemple 1: Modifier la date de génération du document ID 123
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 14:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 123
  AND type_document = 'note_de_service';
*/

-- Exemple 2: Modifier la date de génération pour tous les documents créés aujourd'hui
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND DATE(date_generation) = CURRENT_DATE;
*/

-- Exemple 3: Modifier la date de génération pour un agent spécifique (ID 456)
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 09:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id_agent_destinataire = 456
  AND type_document = 'note_de_service';
*/

-- ============================================
-- VÉRIFICATION AVANT MODIFICATION
-- ============================================

-- Toujours vérifier avant de modifier (recommandé)
-- Remplacez {DOCUMENT_ID} par l'ID du document
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire,
    id_agent_generateur
FROM documents_autorisation 
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';
*/

-- Voir tous les documents de note de service avec leurs dates
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire,
    created_at,
    updated_at
FROM documents_autorisation 
WHERE type_document = 'note_de_service'
ORDER BY date_generation DESC;
*/

-- ============================================
-- UTILISATION AVEC TRANSACTION (RECOMMANDÉ)
-- ============================================

-- Pour plus de sécurité, utilisez une transaction :
/*
BEGIN;

-- Vérifier d'abord
SELECT id, date_generation, titre 
FROM documents_autorisation 
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';

-- Modifier
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';

-- Vérifier le résultat
SELECT id, date_generation, titre 
FROM documents_autorisation 
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';

-- Si tout est correct, valider
COMMIT;

-- Sinon, annuler
-- ROLLBACK;
*/
