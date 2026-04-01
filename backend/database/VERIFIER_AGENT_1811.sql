-- ============================================
-- VÉRIFIER L'AGENT 1811
-- ============================================

-- 1. Vérifier le statut de l'agent 1811
SELECT 
    id,
    matricule,
    nom,
    prenom,
    retire,
    date_retrait,
    motif_retrait
FROM agents
WHERE id = 1811;

-- 2. Tester une insertion manuelle dans l'historique
-- Décommentez et exécutez cette ligne pour tester :
INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) 
VALUES (1811, 'retrait', 'Test de motif manuel', CURRENT_TIMESTAMP) 
RETURNING id, id_agent, type_action, motif, date_action;

-- 3. Vérifier après l'insertion manuelle
SELECT * FROM historique_retrait_restauration 
WHERE id_agent = 1811
ORDER BY id DESC;

