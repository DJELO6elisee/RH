-- ============================================================================
-- Script de vérification du DRH pour le ministère 10
-- ============================================================================
-- Ce script vérifie que le DRH créé peut se connecter au ministère 10
-- ============================================================================

-- 1. Vérifier le ministère 10
SELECT 
    id,
    code,
    nom,
    sigle,
    is_active
FROM public.ministeres
WHERE id = 10;

-- 2. Vérifier l'agent DRH créé et son ministère
SELECT 
    a.id as agent_id,
    a.matricule,
    a.nom,
    a.prenom,
    a.email,
    a.id_ministere,
    m.id as ministere_id,
    m.code as ministere_code,
    m.nom as ministere_nom
FROM public.agents a
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
WHERE a.matricule = 'DRHMINTEST01';

-- 3. Vérifier l'utilisateur DRH et son agent associé
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.is_active,
    u.id_agent,
    r.nom as role_nom,
    a.id as agent_id,
    a.matricule as agent_matricule,
    a.id_ministere as agent_ministere_id,
    m.id as ministere_id,
    m.code as ministere_code,
    m.nom as ministere_nom
FROM public.utilisateurs u
LEFT JOIN public.roles r ON u.id_role = r.id
LEFT JOIN public.agents a ON u.id_agent = a.id
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
WHERE u.username = 'DRHMINTEST01';

-- 4. Test de la requête de connexion (simulation)
-- Cette requête simule ce que fait AuthController.login pour vérifier l'accès
SELECT 
    u.id,
    u.username,
    u.email,
    u.id_agent,
    r.nom as role_nom,
    r.permissions,
    a.id_ministere,
    CASE 
        WHEN r.nom IN ('DRH', 'drh') AND u.id_agent IS NOT NULL AND EXISTS (
            SELECT 1 FROM agents a2 
            WHERE a2.id = u.id_agent 
            AND a2.id_ministere = 10
        ) THEN 'AUTORISÉ'
        WHEN r.nom = 'super_admin' THEN 'AUTORISÉ (super_admin)'
        ELSE 'NON AUTORISÉ'
    END as statut_acces
FROM public.utilisateurs u
JOIN public.roles r ON u.id_role = r.id
LEFT JOIN public.agents a ON u.id_agent = a.id
WHERE u.username = 'DRHMINTEST01' 
  AND u.is_active = true;

-- 5. Vérifier si l'agent appartient bien au ministère 10
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.id_ministere,
    CASE 
        WHEN a.id_ministere = 10 THEN '✅ Agent appartient au ministère 10'
        ELSE '❌ Agent n''appartient PAS au ministère 10 (appartient au ministère ' || COALESCE(a.id_ministere::text, 'NULL') || ')'
    END as verification
FROM public.agents a
WHERE a.matricule = 'DRHMINTEST01';
