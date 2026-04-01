-- ============================================
-- TEST COMPLET - Vérifier et tester
-- ============================================

-- ÉTAPE 1: Vérifier si l'agent 1811 est marqué comme retiré
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

-- ÉTAPE 2: Tester une insertion manuelle dans l'historique
-- Exécutez cette requête pour voir si l'insertion fonctionne :
INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) 
VALUES (1811, 'retrait', 'Test de motif manuel depuis SQL', CURRENT_TIMESTAMP) 
RETURNING id, id_agent, type_action, motif, date_action;

-- ÉTAPE 3: Vérifier que l'insertion a fonctionné
SELECT * FROM historique_retrait_restauration 
WHERE id_agent = 1811
ORDER BY id DESC;

