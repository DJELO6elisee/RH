-- ============================================
-- REQUÊTE POUR VÉRIFIER LES MOTIFS ENREGISTRÉS
-- ============================================
-- Exécutez cette requête pour voir les motifs enregistrés dans la table

SELECT 
    id,
    id_agent,
    type_action,
    motif,
    date_action,
    created_at
FROM historique_retrait_restauration
ORDER BY id DESC
LIMIT 10;

-- ============================================
-- VÉRIFICATION DÉTAILLÉE (optionnel)
-- ============================================
-- Pour voir toutes les colonnes et toutes les données :

-- SELECT * FROM historique_retrait_restauration
-- ORDER BY id DESC;

-- ============================================
-- COMPTER LE NOMBRE D'ENREGISTREMENTS
-- ============================================
-- SELECT COUNT(*) as total_enregistrements 
-- FROM historique_retrait_restauration;

-- ============================================
-- VÉRIFIER LES MOTIFS PAR TYPE D'ACTION
-- ============================================
-- SELECT 
--     type_action,
--     COUNT(*) as nombre,
--     COUNT(motif) as avec_motif,
--     COUNT(*) - COUNT(motif) as sans_motif
-- FROM historique_retrait_restauration
-- GROUP BY type_action;

