-- ============================================================================
-- Exemples de requêtes SQL pour la table direction_generale
-- ============================================================================
-- Ce fichier contient des exemples pratiques de requêtes SQL pour gérer
-- les directions générales
-- ============================================================================

-- ============================================================================
-- 1. CRÉATION ET INSERTION
-- ============================================================================

-- Créer une direction générale simple
INSERT INTO direction_generale (id_ministere, libelle, code, description)
VALUES (1, 'Direction Générale des Ressources Humaines', 'DGRH', 
        'Gestion stratégique des ressources humaines du ministère');

-- Créer une direction générale avec un directeur général
INSERT INTO direction_generale (id_ministere, libelle, code, directeur_general_id, email, telephone)
VALUES (1, 'Direction Générale du Budget et des Finances', 'DGBF', 
        123, 'contact@dgbf.gouv.ma', '+212 5 37 XX XX XX');

-- Insertion multiple
INSERT INTO direction_generale (id_ministere, libelle, code, is_active)
VALUES 
    (1, 'Direction Générale de l''Administration', 'DGA', true),
    (1, 'Direction Générale de la Planification', 'DGP', true),
    (1, 'Direction Générale des Affaires Juridiques', 'DGAJ', true);

-- ============================================================================
-- 2. CONSULTATION (SELECT)
-- ============================================================================

-- Toutes les directions générales actives
SELECT * FROM direction_generale 
WHERE is_active = true 
ORDER BY libelle;

-- Directions générales avec informations du ministère
SELECT 
    dg.id,
    dg.libelle as direction_generale,
    dg.code,
    m.nom as ministere,
    m.sigle as ministere_sigle
FROM direction_generale dg
INNER JOIN ministeres m ON dg.id_ministere = m.id
WHERE dg.is_active = true
ORDER BY m.nom, dg.libelle;

-- Directions générales avec leur directeur général
SELECT 
    dg.id,
    dg.libelle as direction_generale,
    dg.code,
    a.matricule,
    a.nom || ' ' || a.prenom as directeur_general,
    a.email as email_directeur,
    a.telephone1 as tel_directeur
FROM direction_generale dg
LEFT JOIN agents a ON dg.directeur_general_id = a.id
WHERE dg.is_active = true
ORDER BY dg.libelle;

-- Hiérarchie complète : Ministère → DG → Directions
SELECT 
    m.nom as ministere,
    dg.libelle as direction_generale,
    d.libelle as direction,
    dg.code as code_dg,
    COUNT(DISTINCT d.id) OVER (PARTITION BY dg.id) as nb_directions
FROM ministeres m
LEFT JOIN direction_generale dg ON dg.id_ministere = m.id
LEFT JOIN directions d ON d.id_direction_generale = dg.id
WHERE dg.is_active = true
ORDER BY m.nom, dg.libelle, d.libelle;

-- Statistiques par direction générale
SELECT 
    dg.libelle as direction_generale,
    COUNT(DISTINCT d.id) as nombre_directions,
    COUNT(DISTINCT ag.id) as nombre_agents_directs,
    CASE WHEN dg.directeur_general_id IS NOT NULL THEN 'Oui' ELSE 'Non' END as a_directeur
FROM direction_generale dg
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN agents ag ON ag.id_direction_generale = dg.id
WHERE dg.is_active = true
GROUP BY dg.id, dg.libelle, dg.directeur_general_id
ORDER BY nombre_directions DESC;

-- Rechercher une direction générale par mot-clé
SELECT * FROM direction_generale 
WHERE libelle ILIKE '%ressources%' 
   OR description ILIKE '%ressources%'
   OR code ILIKE '%rh%';

-- Directions générales d'un ministère spécifique
SELECT 
    dg.*,
    a.nom || ' ' || a.prenom as directeur_general
FROM direction_generale dg
LEFT JOIN agents a ON dg.directeur_general_id = a.id
WHERE dg.id_ministere = 1  -- Remplacer par l'ID du ministère
  AND dg.is_active = true
ORDER BY dg.libelle;

-- ============================================================================
-- 3. MISE À JOUR (UPDATE)
-- ============================================================================

-- Affecter un directeur général
UPDATE direction_generale 
SET directeur_general_id = 123,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Mettre à jour les informations de contact
UPDATE direction_generale 
SET email = 'contact@dgrh.gouv.ma',
    telephone = '+212 5 37 XX XX XX',
    adresse = '123 Avenue Mohammed V, Rabat'
WHERE id = 1;

-- Désactiver une direction générale
UPDATE direction_generale 
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- Réactiver une direction générale
UPDATE direction_generale 
SET is_active = true
WHERE id = 5;

-- Changer le code d'une direction générale
UPDATE direction_generale 
SET code = 'DG-RH'
WHERE id = 1;

-- ============================================================================
-- 4. GESTION DES RELATIONS
-- ============================================================================

-- Rattacher des directions à une direction générale
UPDATE directions 
SET id_direction_generale = 1
WHERE id IN (5, 8, 12, 15);

-- Rattacher tous les agents d'une direction à sa direction générale
UPDATE agents a
SET id_direction_generale = d.id_direction_generale
FROM directions d
WHERE a.id_entite_principale = d.id
  AND d.id_direction_generale IS NOT NULL
  AND a.id_direction_generale IS NULL;

-- Retirer le rattachement d'une direction
UPDATE directions 
SET id_direction_generale = NULL
WHERE id = 10;

-- ============================================================================
-- 5. REQUÊTES ANALYTIQUES
-- ============================================================================

-- Effectifs par direction générale
SELECT 
    dg.libelle as direction_generale,
    m.nom as ministere,
    COUNT(DISTINCT a.id) as effectif_total,
    COUNT(DISTINCT CASE WHEN a.sexe = 'M' THEN a.id END) as hommes,
    COUNT(DISTINCT CASE WHEN a.sexe = 'F' THEN a.id END) as femmes,
    ROUND(AVG(a.age), 1) as age_moyen
FROM direction_generale dg
LEFT JOIN ministeres m ON dg.id_ministere = m.id
LEFT JOIN agents a ON a.id_direction_generale = dg.id
WHERE dg.is_active = true
GROUP BY dg.libelle, m.nom
ORDER BY effectif_total DESC;

-- Organigramme complet d'une direction générale
WITH RECURSIVE org_hierarchy AS (
    -- Niveau 1: Direction Générale
    SELECT 
        1 as niveau,
        dg.id,
        dg.libelle,
        'Direction Générale' as type,
        NULL::integer as parent_id,
        a.nom || ' ' || a.prenom as responsable
    FROM direction_generale dg
    LEFT JOIN agents a ON dg.directeur_general_id = a.id
    WHERE dg.id = 1  -- ID de la direction générale
    
    UNION ALL
    
    -- Niveau 2: Directions
    SELECT 
        2 as niveau,
        d.id,
        d.libelle,
        'Direction' as type,
        dg.id as parent_id,
        a.nom || ' ' || a.prenom as responsable
    FROM directions d
    LEFT JOIN agents a ON d.responsable_id = a.id
    INNER JOIN direction_generale dg ON d.id_direction_generale = dg.id
    WHERE dg.id = 1
)
SELECT 
    niveau,
    REPEAT('  ', niveau - 1) || libelle as hierarchie,
    type,
    responsable
FROM org_hierarchy
ORDER BY niveau, libelle;

-- Distribution des agents par direction générale et type
SELECT 
    dg.libelle as direction_generale,
    ta.libele as type_agent,
    COUNT(a.id) as nombre
FROM direction_generale dg
LEFT JOIN agents a ON a.id_direction_generale = dg.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE dg.is_active = true
GROUP BY dg.libelle, ta.libele
ORDER BY dg.libelle, nombre DESC;

-- Directions générales sans directeur
SELECT 
    dg.id,
    dg.libelle,
    m.nom as ministere,
    dg.created_at
FROM direction_generale dg
INNER JOIN ministeres m ON dg.id_ministere = m.id
WHERE dg.directeur_general_id IS NULL
  AND dg.is_active = true
ORDER BY dg.created_at DESC;

-- Comparaison entre directions générales
SELECT 
    dg.libelle as direction_generale,
    COUNT(DISTINCT d.id) as nb_directions,
    COUNT(DISTINCT sd.id) as nb_sous_directions,
    COUNT(DISTINCT a.id) as nb_agents,
    ROUND(COUNT(DISTINCT a.id)::numeric / NULLIF(COUNT(DISTINCT d.id), 0), 2) as agents_par_direction
FROM direction_generale dg
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN sous_directions sd ON sd.direction_id = d.id
LEFT JOIN agents a ON a.id_direction_generale = dg.id
WHERE dg.is_active = true
GROUP BY dg.id, dg.libelle
ORDER BY nb_agents DESC;

-- ============================================================================
-- 6. RECHERCHES AVANCÉES
-- ============================================================================

-- Trouver toutes les personnes liées à une direction générale
SELECT 
    'Directeur Général' as role,
    a.matricule,
    a.nom || ' ' || a.prenom as nom_complet,
    a.email,
    a.telephone1 as telephone
FROM direction_generale dg
INNER JOIN agents a ON dg.directeur_general_id = a.id
WHERE dg.id = 1

UNION ALL

SELECT 
    'Responsable de Direction' as role,
    a.matricule,
    a.nom || ' ' || a.prenom as nom_complet,
    a.email,
    a.telephone1
FROM directions d
INNER JOIN agents a ON d.responsable_id = a.id
WHERE d.id_direction_generale = 1

UNION ALL

SELECT 
    'Agent' as role,
    a.matricule,
    a.nom || ' ' || a.prenom as nom_complet,
    a.email,
    a.telephone1
FROM agents a
WHERE a.id_direction_generale = 1
ORDER BY role, nom_complet;

-- Historique des modifications (si vous avez une table d'audit)
SELECT 
    dg.libelle,
    dg.created_at as date_creation,
    dg.updated_at as derniere_modification,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - dg.updated_at)) as jours_depuis_maj
FROM direction_generale dg
ORDER BY dg.updated_at DESC;

-- Vérifier l'intégrité des données
SELECT 
    'Direction générale sans ministère' as probleme,
    COUNT(*) as nombre
FROM direction_generale dg
LEFT JOIN ministeres m ON dg.id_ministere = m.id
WHERE m.id IS NULL

UNION ALL

SELECT 
    'Direction générale avec directeur invalide',
    COUNT(*)
FROM direction_generale dg
LEFT JOIN agents a ON dg.directeur_general_id = a.id
WHERE dg.directeur_general_id IS NOT NULL
  AND a.id IS NULL

UNION ALL

SELECT 
    'Directions sans direction générale',
    COUNT(*)
FROM directions d
WHERE d.id_direction_generale IS NULL;

-- ============================================================================
-- 7. EXPORT ET REPORTING
-- ============================================================================

-- Liste complète pour export Excel
SELECT 
    m.nom as ministere,
    m.sigle as ministere_sigle,
    dg.code as code_dg,
    dg.libelle as direction_generale,
    ag_dir.matricule as matricule_directeur,
    ag_dir.nom || ' ' || ag_dir.prenom as directeur_general,
    dg.email,
    dg.telephone,
    dg.adresse,
    CASE WHEN dg.is_active THEN 'Oui' ELSE 'Non' END as active,
    COUNT(DISTINCT d.id) as nombre_directions,
    COUNT(DISTINCT a.id) as nombre_agents,
    dg.created_at::date as date_creation
FROM direction_generale dg
INNER JOIN ministeres m ON dg.id_ministere = m.id
LEFT JOIN agents ag_dir ON dg.directeur_general_id = ag_dir.id
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN agents a ON a.id_direction_generale = dg.id
GROUP BY 
    m.nom, m.sigle, dg.code, dg.libelle, 
    ag_dir.matricule, ag_dir.nom, ag_dir.prenom,
    dg.email, dg.telephone, dg.adresse, 
    dg.is_active, dg.created_at
ORDER BY m.nom, dg.libelle;

-- ============================================================================
-- 8. SUPPRESSION (DELETE)
-- ============================================================================

-- Supprimer une direction générale (attention aux contraintes)
-- D'abord, retirer les relations
UPDATE directions SET id_direction_generale = NULL WHERE id_direction_generale = 99;
UPDATE agents SET id_direction_generale = NULL WHERE id_direction_generale = 99;

-- Puis supprimer
DELETE FROM direction_generale WHERE id = 99;

-- Suppression en cascade (si configuré)
-- Cela supprimera automatiquement toutes les relations
DELETE FROM direction_generale WHERE id = 99 AND is_active = false;

-- ============================================================================
-- 9. VUES UTILES (Optionnel - à créer si nécessaire)
-- ============================================================================

-- Vue pour les directions générales avec toutes les infos
CREATE OR REPLACE VIEW v_directions_generales_complete AS
SELECT 
    dg.id,
    dg.libelle,
    dg.code,
    dg.description,
    dg.email,
    dg.telephone,
    dg.adresse,
    dg.is_active,
    m.id as ministere_id,
    m.nom as ministere_nom,
    m.sigle as ministere_sigle,
    a.id as directeur_id,
    a.matricule as directeur_matricule,
    a.nom || ' ' || a.prenom as directeur_nom,
    a.email as directeur_email,
    a.telephone1 as directeur_telephone,
    COUNT(DISTINCT d.id) as nombre_directions,
    COUNT(DISTINCT ag.id) as nombre_agents,
    dg.created_at,
    dg.updated_at
FROM direction_generale dg
LEFT JOIN ministeres m ON dg.id_ministere = m.id
LEFT JOIN agents a ON dg.directeur_general_id = a.id
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN agents ag ON ag.id_direction_generale = dg.id
GROUP BY 
    dg.id, dg.libelle, dg.code, dg.description, 
    dg.email, dg.telephone, dg.adresse, dg.is_active,
    m.id, m.nom, m.sigle,
    a.id, a.matricule, a.nom, a.prenom, a.email, a.telephone1,
    dg.created_at, dg.updated_at;

-- Utilisation de la vue
SELECT * FROM v_directions_generales_complete 
WHERE is_active = true 
ORDER BY ministere_nom, libelle;

-- ============================================================================
-- 10. REQUÊTES DE MAINTENANCE
-- ============================================================================

-- Compter les enregistrements
SELECT COUNT(*) as total_directions_generales FROM direction_generale;
SELECT COUNT(*) as actives FROM direction_generale WHERE is_active = true;
SELECT COUNT(*) as inactives FROM direction_generale WHERE is_active = false;

-- Vérifier les doublons potentiels
SELECT libelle, COUNT(*) as nombre
FROM direction_generale
GROUP BY libelle
HAVING COUNT(*) > 1;

-- Réindexer si nécessaire
REINDEX TABLE direction_generale;

-- Analyser les statistiques
ANALYZE direction_generale;

-- Vérifier la taille de la table
SELECT 
    pg_size_pretty(pg_total_relation_size('direction_generale')) as taille_totale,
    pg_size_pretty(pg_relation_size('direction_generale')) as taille_table,
    pg_size_pretty(pg_total_relation_size('direction_generale') - pg_relation_size('direction_generale')) as taille_index;

-- ============================================================================
-- FIN DU FICHIER
-- ============================================================================

