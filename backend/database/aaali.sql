-- ============================================
-- SUPPRESSION DEMANDES + DOCUMENTS + HISTORIQUE SUR UNE PÉRIODE
-- ============================================
-- Remplacez '2026-01-01' et '2026-12-31' par votre date_debut et date_fin (période à effacer).
-- Ordre obligatoire à cause des clés étrangères (enfants avant parents).

-- ÉTAPE 0 (optionnel) : Vérifier les demandes concernées
-- SELECT id, id_agent, type_demande, date_creation, status FROM demandes
-- WHERE date_creation::date BETWEEN '2026-01-01' AND '2026-12-31';

-- ÉTAPE 1 : Supprimer workflow_demandes (référence demandes)
-- DELETE FROM workflow_demandes
-- WHERE id_demande IN (SELECT id FROM demandes WHERE date_creation::date BETWEEN '2026-03-05' AND '2026-03-24');

-- ÉTAPE 2 : Supprimer demandes_historique (référence demandes)
-- DELETE FROM demandes_historique
-- WHERE id_demande IN (SELECT id FROM demandes WHERE date_creation::date BETWEEN '2026-03-05' AND '2026-03-24');

-- ÉTAPE 3 : Supprimer notifications_demandes si la table existe (référence demandes)
-- DELETE FROM notifications_demandes
-- WHERE id_demande IN (SELECT id FROM demandes WHERE date_creation::date BETWEEN '2026-03-05' AND '2026-03-24');

-- ÉTAPE 4 : Supprimer documents_autorisation liés aux demandes de la période (par types)
-- Types possibles : 'certificat_cessation', 'attestation_presence', 'attestation_travail', 'autorisation_absence',
--                   'autorisation_sortie_territoire', 'note_de_service_mutation', 'certificat_reprise_service',
--                   'certificat_non_jouissance_conge', 'note_de_service', etc.
-- Adapter la liste type_document selon les types à effacer (ou retirer la condition pour tous les types).
-- DELETE FROM documents_autorisation
-- WHERE id_demande IN (SELECT id FROM demandes WHERE date_creation::date BETWEEN '2026-01-24' AND '2026-03-24')
--   AND type_document IN (
--       'certificat_cessation',
--       'attestation_presence',
--       'autorisation_absence',
--       'attestation_travail',
--       'certificat_prise_service',
--       'autorisation_sortie_territoire',
--       'certificat_reprise_service'
--   );

-- ÉTAPE 5 : Supprimer les demandes de la période
-- DELETE FROM demandes
-- WHERE date_creation::date BETWEEN '2026-03-05' AND '2026-03-05';


-- ALTER TABLE public.demandes
--     ALTER COLUMN status TYPE character varying(50),
--     ALTER COLUMN niveau_actuel TYPE character varying(50),
--     ALTER COLUMN priorite TYPE character varying(50),
--     ALTER COLUMN phase_actuelle TYPE character varying(50),
--     ALTER COLUMN phase TYPE character varying(50),
--     ALTER COLUMN statut_chef_service TYPE character varying(50),
--     ALTER COLUMN statut_drh TYPE character varying(50),
--     ALTER COLUMN statut_directeur TYPE character varying(50),
--     ALTER COLUMN statut_ministre TYPE character varying(50);

-- ============================================
-- REQUÊTE POUR SUPPRIMER DES DOCUMENTS
-- ============================================
-- DELETE FROM documents_autorisation 
-- WHERE type_document = 'certificat_prise_service' 
-- AND date_generation < '2026-01-25';  -- Remplacez par la date souhaitée

-- UPDATE fonction_agents
-- SET id_fonction = 124
-- WHERE designation_poste = 'AGENT DE BUREAU';

-- ALTER TABLE public.emplois
-- DROP CONSTRAINT emplois_libele_key;

-- ALTER TABLE public.emplois
-- ADD CONSTRAINT unique_libele_ministere_emplois
-- UNIQUE (libele, id_ministere);
-- Remplacer 123 par l'id de la direction générale, 'MAT001' par le matricule
-- UPDATE agents
-- SET id_direction_generale = 28
-- WHERE matricule = 'M0008';

-- Table demandes : niveau_evolution_demande (déjà fait si erreur "varchar(30)" sur UPDATE demandes)
-- ALTER TABLE public.demandes
--     ALTER COLUMN niveau_evolution_demande TYPE VARCHAR(255);

-- Table demandes_historique : le trigger écrit ancien_niveau / nouveau_niveau depuis niveau_evolution_demande
-- Il faut agrandir ces 2 colonnes pour accepter 'valide_par_directeur_service_exterieur', etc.
-- ALTER TABLE public.demandes_historique
--     ALTER COLUMN ancien_niveau TYPE VARCHAR(255);
-- ALTER TABLE public.demandes_historique
--     ALTER COLUMN nouveau_niveau TYPE VARCHAR(255);

-- Si besoin sur workflow_demandes (niveau_validation reçoit 'directeur_service_exterieur')
-- ALTER TABLE public.workflow_demandes
--     ALTER COLUMN niveau_validation TYPE VARCHAR(50);
    
DELETE FROM demandes
WHERE id_agent = 1848;
DELETE FROM documents_autorisation
WHERE id_agent_destinataire = 1848;
-- DELETE FROM decisions
-- WHERE created_by IN (1082, 3);

DELETE FROM agents
WHERE matricule = '5461515';

DELETE FROM utilisateurs
WHERE username = '5461515';

-- UPDATE agents
-- SET date_de_naissance = '1970-03-09'
-- WHERE date_de_naissance = '1965-04-09' AND id = 1910;

-- ============================================
-- REQUÊTE POUR MODIFIER LA DATE DE GÉNÉRATION
-- ============================================

-- Exemple 1: Modifier la date de génération d'un document spécifique par son ID
-- Remplacez {DOCUMENT_ID} par l'ID du document
-- Remplacez '2025-12-30 10:00:00' par la nouvelle date souhaitée
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = {DOCUMENT_ID}
  AND type_document = 'note_de_service';
*/

-- Exemple 2: Modifier la date de génération pour un agent spécifique
-- Remplacez {AGENT_ID} par l'ID de l'agent

-- ÉTAPE 1: Vérifier d'abord si des documents existent pour cet agent
-- SELECT 
--     id,
--     type_document,
--     titre,
--     date_generation,
--     id_agent_destinataire,
--     id_agent_generateur
-- FROM documents_autorisation 
-- WHERE id_agent_destinataire = 1082
--   AND type_document = 'note_de_service';

-- ÉTAPE 2: Si des documents existent, exécutez cette requête pour modifier la date

-- UPDATE documents_autorisation 
-- SET date_generation = '2025-12-30 10:00:00',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE id_agent_destinataire = 1840
--   AND type_document = 'note_de_service';


-- ÉTAPE 3: Vérifier aussi avec type_document IN au cas où il y aurait des variations
/*
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    id_agent_destinataire
FROM documents_autorisation 
WHERE id_agent_destinataire = 1082
  AND type_document IN ('note_de_service', 'note_de_service_mutation');
*/


-- Exemple 3: Modifier la date de génération pour mettre la date actuelle
/*
UPDATE documents_autorisation 
SET date_generation = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND id = {DOCUMENT_ID};
*/

-- Exemple 4: Modifier la date de génération pour tous les documents créés après une date
/*
UPDATE documents_autorisation 
SET date_generation = '2025-12-30 10:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE type_document = 'note_de_service'
  AND date_generation > '2025-12-30';
*/

-- ============================================
-- INSERTION DE NOUVEAUX RÔLES
-- ============================================
-- Rôles : gestionnaire_du_patrimoine, president_du_fond, responsble_cellule_de_passation
-- Adapter les id (27, 28, 29) si la séquence roles_id_seq a déjà des valeurs plus élevées.

-- INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at)
-- VALUES
--   (27, 'gestionnaire_du_patrimoine', 'Gestionnaire du patrimoine avec accès à la gestion des actifs et biens', '{"patrimoine": true, "documents": true, "reports": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--   (28, 'president_du_fond', 'Président du fond avec accès à la supervision et validation des opérations', '{"fond": true, "supervision": true, "validations": true, "reports": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--   (29, 'responsble_cellule_de_passation', 'Responsable de la cellule de passation avec accès aux dossiers de passation', '{"passation": true, "documents": true, "validations": true, "reports": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
-- ON CONFLICT (id) DO NOTHING;

-- Mettre à jour la séquence si nécessaire (après les INSERT manuels)
-- SELECT setval('public.roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.roles));
