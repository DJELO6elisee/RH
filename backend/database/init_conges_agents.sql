-- Script pour initialiser les congés de l'année en cours pour tous les agents actifs
-- Tous les agents recevront 30 jours de congés pour l'année en cours
-- Version optimisée utilisant INSERT ... SELECT

INSERT INTO agent_conges (
    id_agent,
    annee,
    jours_pris,
    jours_alloues,
    jours_restants,
    jours_reportes,
    created_at,
    updated_at
)
SELECT 
    a.id,
    EXTRACT(YEAR FROM CURRENT_DATE) as annee,
    0 as jours_pris,              -- Aucun jour pris au début
    30 as jours_alloues,          -- 30 jours alloués
    30 as jours_restants,         -- 30 jours restants
    0 as jours_reportes,          -- Aucun jour reporté (début du système)
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM agents a
WHERE a.id NOT IN (
      SELECT id_agent 
      FROM agent_conges 
      WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE)
  )  -- Éviter de créer des doublons
ON CONFLICT (id_agent, annee) DO NOTHING;  -- Protection supplémentaire contre les doublons

-- Vérification : Afficher le nombre d'agents avec des congés pour l'année en cours
SELECT 
    COUNT(*) as nombre_agents_avec_conges,
    EXTRACT(YEAR FROM CURRENT_DATE) as annee
FROM agent_conges
WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE);

-- Afficher un résumé des congés initialisés
SELECT 
    COUNT(*) as total_agents,
    SUM(jours_alloues) as total_jours_alloues,
    SUM(jours_pris) as total_jours_pris,
    SUM(jours_restants) as total_jours_restants,
    AVG(jours_alloues) as moyenne_jours_alloues
FROM agent_conges
WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE);

