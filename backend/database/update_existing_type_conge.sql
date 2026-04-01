-- Script pour mettre à jour le type_conge des enregistrements existants
-- Ce script met à jour les enregistrements qui ont une date_depart_conges mais pas de type_conge
-- Logique: 
-- - Si plusieurs agents ont la même date de départ → 'grouped'
-- - Si un seul agent a cette date de départ → 'individual'

-- Étape 1: Mettre à jour les congés groupés (dates avec plusieurs agents)
UPDATE public.agent_conges ac
SET type_conge = 'grouped'
WHERE ac.date_depart_conges IS NOT NULL 
  AND ac.type_conge IS NULL
  AND EXISTS (
      SELECT 1 
      FROM public.agent_conges ac2 
      WHERE ac2.date_depart_conges = ac.date_depart_conges 
        AND ac2.annee = ac.annee
        AND ac2.id_agent != ac.id_agent
        AND ac2.date_depart_conges IS NOT NULL
  );

-- Étape 2: Mettre à jour les congés individuels (dates avec un seul agent)
UPDATE public.agent_conges ac
SET type_conge = 'individual'
WHERE ac.date_depart_conges IS NOT NULL 
  AND ac.type_conge IS NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.agent_conges ac2 
      WHERE ac2.date_depart_conges = ac.date_depart_conges 
        AND ac2.annee = ac.annee
        AND ac2.id_agent != ac.id_agent
        AND ac2.date_depart_conges IS NOT NULL
  );

-- Étape 3: Pour les cas restants (sécurité), marquer comme 'individual'
UPDATE public.agent_conges
SET type_conge = 'individual'
WHERE date_depart_conges IS NOT NULL 
  AND type_conge IS NULL;

-- Afficher le nombre d'enregistrements mis à jour
SELECT 
    type_conge,
    COUNT(*) as count
FROM public.agent_conges
WHERE date_depart_conges IS NOT NULL
GROUP BY type_conge
ORDER BY type_conge;

