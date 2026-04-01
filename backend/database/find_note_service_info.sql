-- ============================================
-- REQUÊTES POUR TROUVER DES INFORMATIONS SUR LE DOCUMENT SUPPRIMÉ
-- ============================================

-- 1. Vérifier les agents récemment créés (qui auraient pu avoir une note de service)
SELECT 
    a.id as agent_id,
    a.prenom,
    a.nom,
    a.matricule,
    a.created_at as date_creation_agent,
    a.updated_at as date_modification_agent
FROM agents a
WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days'
   OR a.updated_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY a.created_at DESC
LIMIT 20;

-- 2. Vérifier les agents qui ont des documents d'autres types (pour identifier l'agent concerné)
SELECT DISTINCT
    da.id_agent_destinataire as agent_id,
    a.prenom,
    a.nom,
    a.matricule,
    COUNT(*) as nombre_documents
FROM documents_autorisation da
LEFT JOIN agents a ON da.id_agent_destinataire = a.id
WHERE da.type_document != 'note_de_service'
  AND da.date_generation >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY da.id_agent_destinataire, a.prenom, a.nom, a.matricule
ORDER BY nombre_documents DESC
LIMIT 20;

-- 3. Vérifier les validateurs (DRH) qui ont généré des documents récemment
SELECT DISTINCT
    da.id_agent_generateur as validateur_id,
    a.prenom,
    a.nom,
    COUNT(*) as nombre_documents_generes
FROM documents_autorisation da
LEFT JOIN agents a ON da.id_agent_generateur = a.id
WHERE da.date_generation >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY da.id_agent_generateur, a.prenom, a.nom
ORDER BY nombre_documents_generes DESC
LIMIT 10;

-- 4. Vérifier s'il y a des commentaires dans d'autres documents qui mentionnent une note de service
SELECT 
    id,
    type_document,
    titre,
    commentaires,
    date_generation
FROM documents_autorisation
WHERE commentaires ILIKE '%note de service%'
   OR commentaires ILIKE '%note_de_service%'
ORDER BY date_generation DESC
LIMIT 20;

-- 5. Vérifier les documents créés le 30 décembre 2025 (date de votre requête DELETE)
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire,
    id_agent_generateur,
    commentaires
FROM documents_autorisation
WHERE DATE(date_generation) = '2025-12-30'
ORDER BY date_generation DESC;

-- 6. Vérifier les documents créés après le 30 décembre 2025 (ceux qui n'ont pas été supprimés)
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire
FROM documents_autorisation
WHERE date_generation > '2025-12-30'
ORDER BY date_generation ASC
LIMIT 10;
