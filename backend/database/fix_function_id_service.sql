-- Script pour corriger la fonction get_hierarchy_for_agent
-- qui utilise encore l'ancienne colonne id_service

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS get_hierarchy_for_agent(integer);

-- Recréer la fonction avec la bonne colonne id_direction
CREATE OR REPLACE FUNCTION get_hierarchy_for_agent(agent_id integer)
RETURNS JSON AS $$
DECLARE
    result JSON;
    agent_ministere_id INTEGER;
    agent_direction_id INTEGER;
BEGIN
    -- Récupérer les informations de l'agent
    SELECT id_ministere, id_direction
    INTO agent_ministere_id, agent_direction_id
    FROM agents 
    WHERE id = agent_id;
    
    -- Construire le résultat JSON
    result := json_build_object(
        'agent_id', agent_id,
        'ministere_id', agent_ministere_id,
        'direction_id', agent_direction_id,
        'status', 'success'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'agent_id', agent_id,
            'ministere_id', NULL,
            'direction_id', NULL,
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Afficher un message de confirmation
SELECT 'Fonction get_hierarchy_for_agent corrigée avec succès!' as message;
