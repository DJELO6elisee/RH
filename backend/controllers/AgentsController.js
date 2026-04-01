const BaseController = require('./BaseController');
const pool = require('../config/database');
const emailService = require('../services/emailService');
const authCodeService = require('../services/authCodeService');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // Pour la conversion d'images
const { formatDateOnly, formatDatesInObject, formatDatesInArray } = require('../utils/dateFormatter');

class AgentsController extends BaseController {
    constructor() {
        super('agents');
    }

    getRetirementExclusionCondition(agentAlias = 'a', gradeAlias = 'g') {
        return `
            (
                (
                    ${agentAlias}.date_retraite IS NULL
                    AND (
                        ${agentAlias}.date_de_naissance IS NULL
                        OR DATE_PART('year', AGE(CURRENT_DATE, ${agentAlias}.date_de_naissance)) <
                            CASE
                                WHEN ${gradeAlias}.libele IS NOT NULL AND UPPER(${gradeAlias}.libele) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                                ELSE 60
                            END
                    )
                )
                OR (${agentAlias}.date_retraite IS NOT NULL AND ${agentAlias}.date_retraite > CURRENT_DATE)
            )
        `;
    }

    /**
     * Date de retraite utilisée pour les projections : date_retraite si renseignée, sinon 31/12 de l'année légale (naissance + 60 ou 65 selon grade courant).
     * @param {string} gradeLibeleExpr — ex. ga_actuelle.grade_libele ou ga_curr.libele
     */
    getEffectiveRetirementDateSQL(agentAlias = 'a', gradeLibeleExpr = 'ga_actuelle.grade_libele') {
        return `(COALESCE(
            NULLIF(${agentAlias}.date_retraite::date, NULL),
            CASE
                WHEN ${agentAlias}.date_de_naissance IS NOT NULL
                    AND NULLIF(TRIM(COALESCE(${gradeLibeleExpr}, '')), '') IS NOT NULL THEN
                    MAKE_DATE(
                        EXTRACT(YEAR FROM ${agentAlias}.date_de_naissance)::integer +
                        CASE
                            WHEN UPPER(REPLACE(TRIM(${gradeLibeleExpr}), ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                            ELSE 60
                        END,
                        12,
                        31
                    )::date
                ELSE NULL
            END
        ))`;
    }

    // Condition SQL pour exclure les agents retirés ET les agents à la retraite
    // Utilisé pour les statistiques et les listes d'agents actifs
    getActiveAgentsExclusionCondition(agentAlias = 'a', gradeAlias = 'g') {
        return `
            (
                -- Exclure les agents retirés manuellement
                (${agentAlias}.retire IS NULL OR ${agentAlias}.retire = false)
                AND
                -- Exclure les agents fonctionnaires à la retraite (calcul basé sur date de naissance + grade)
                NOT (
                    ${agentAlias}.id_type_d_agent = 1
                    AND ${agentAlias}.date_de_naissance IS NOT NULL
                    AND ${gradeAlias}.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM ${agentAlias}.date_de_naissance)::INTEGER + 
                        CASE 
                            WHEN UPPER(REPLACE(${gradeAlias}.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                            ELSE 60
                        END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
            )
        `;
    }

    // Récupérer tous les agents avec pagination et recherche
    async getAll(req, res) {
        try {
            const {
                page = 1,
                    limit = 10,
                    search,
                    sortBy = 'created_at',
                    sortOrder = 'DESC',
                    civilite,
                    nationalite,
                    type_agent,
                    id_type_d_agent, // Accepter aussi ce paramètre du frontend
                    sexe,
                    statut_emploi,
                    service_id, // Variable non utilisée dans la requête SQL actuelle, mais présente dans les filtres
                    id_entite,
                    for_select = false // Nouveau paramètre pour les listes déroulantes
            } = req.query;

            // Unifier les deux paramètres de type d'agent
            const typeAgentParam = id_type_d_agent || type_agent;

            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 Utilisateur connecté - Ministère ID (via agent): ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            // Fallback: utiliser l'id_ministere associé à l'utilisateur (si disponible via middleware)
            if (!userMinistereId && req.user && req.user.id_ministere) {
                userMinistereId = req.user.id_ministere;
                console.log(`🔍 Utilisateur connecté - Ministère ID (via middleware): ${userMinistereId}`);
            }

            if (req.user && req.user.role === 'super_admin') {
                // Pour le super admin, ne pas appliquer de filtrage par défaut
                console.log(`🔍 Super Admin connecté - Pas de filtrage par ministère appliqué`);
            }

            // Pour les listes déroulantes, utiliser une limite plus élevée
            const effectiveLimit = for_select === 'true' ? 100 : limit;
            const offset = (page - 1) * effectiveLimit;
            let query = `
                SELECT
                    a.id,
                    a.id_civilite,
                    a.id_situation_matrimoniale,
                    a.id_nationalite,
                    a.id_type_d_agent,
                    a.id_ministere,
                    a.id_entite_principale,
                    a.id_direction_generale,
                    a.id_direction,
                    a.id_sous_direction,
                    a.id_service,
                    a.id_categorie,
                    a.id_position,

                    a.nom,
                    a.prenom,
                    a.matricule,

                    a.date_de_naissance,
                    a.lieu_de_naissance,
                    a.age,

                    a.sexe,
                    a.telephone1,
                    a.telephone2,
                    a.email,

                    a.nom_de_la_mere,
                    a.nom_du_pere,

                    a.nombre_enfant,
                    a.nom_conjointe,
                    a.prenom_conjointe,
                    a.date_mariage,
                    a.numero_acte_mariage,
                    a.date_delivrance_acte_mariage,

                    a.ad_pro_rue,
                    a.ad_pro_ville,
                    a.ad_pro_batiment,
                    a.ad_pri_rue,
                    a.ad_pri_ville,
                    a.ad_pri_batiment,

                    a.statut_emploi,
                    a.date_embauche,
                    a.date_fin_contrat,

                    a.date_prise_service_au_ministere,
                    a.date_prise_service_dans_la_direction,

                    a.situation_militaire,
                    a.numero_cnps,
                    a.date_declaration_cnps,

                    a.retire,
                    a.date_retrait,
                    a.motif_retrait,
                    a.motif_restauration,

                    a.created_at,
                    a.updated_at,
                    CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                    CONCAT(a.prenom, ' ', a.nom) as nom_prenom,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    ea.nom as entite_nom,
                    m.nom as ministere_nom,
                    d.libelle as direction_libelle,
                    COALESCE(dg.libelle, dg_via_dir.libelle) AS direction_generale_libelle,
                    sd.libelle as sous_direction_libelle,
                    srv.libelle as service_libelle,
                    cat.libele as categorie_libele,
                    p.libele as position_libele,
                    -- Fonctions actuelles depuis fonction_agents
                    fa_actuelle.fonction_libele as fonction_actuelle_libele,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    ech_actuelle.echelon_libele as echelon_libele,
                    CASE 
                        WHEN fa_actuelle.date_entree IS NULL THEN NULL
                        ELSE TO_CHAR(fa_actuelle.date_entree, 'YYYY-MM-DD')
                    END AS fonction_date_entree,
                    -- Emplois actuels depuis emploi_agents
                    ea_actuel.emploi_libele as emploi_actuel_libele,
                    CASE 
                        WHEN ea_actuel.date_entree IS NULL THEN NULL
                        ELSE TO_CHAR(ea_actuel.date_entree, 'YYYY-MM-DD')
                    END AS emploi_date_entree,
                    CASE 
                        WHEN a.sexe = 'M' THEN 'Masculin'
                        WHEN a.sexe = 'F' THEN 'Féminin'
                        WHEN a.sexe IS NULL OR a.sexe = '' THEN 'Non renseigné'
                        ELSE a.sexe
                    END as sexe_libelle,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        WHEN a.statut_emploi IS NULL OR a.statut_emploi = '' THEN 'Non renseigné'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle,
                    -- Gestion des champs manquants avec des valeurs par défaut
                    CASE 
                        WHEN a.date_de_naissance IS NULL THEN 'Non renseigné'
                        ELSE TO_CHAR(a.date_de_naissance, 'YYYY-MM-DD')
                    END as date_de_naissance_formatee,
                    COALESCE(a.lieu_de_naissance, 'Non renseigné') as lieu_de_naissance_formatee,
                    COALESCE(a.ad_pro_rue, a.ad_pri_rue, 'Non renseigné') as adresse_formatee,
                    COALESCE(a.telephone1, a.telephone2, 'Non renseigné') as telephone_formate,
                    -- Alias pour compatibilité avec le frontend (noms sans "de")
                    CASE 
                        WHEN a.date_de_naissance IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_de_naissance, 'YYYY-MM-DD')
                    END as date_naissance,
                    a.lieu_de_naissance as lieu_naissance,
                    -- Adresse combinée (priorité à l'adresse professionnelle, sinon privée)
                    CASE 
                        WHEN a.ad_pro_rue IS NOT NULL AND a.ad_pro_rue != '' THEN 
                            TRIM(
                                COALESCE(a.ad_pro_rue, '') || 
                                CASE WHEN a.ad_pro_ville IS NOT NULL AND a.ad_pro_ville != '' THEN ' ' || a.ad_pro_ville ELSE '' END ||
                                CASE WHEN a.ad_pro_batiment IS NOT NULL AND a.ad_pro_batiment != '' THEN ' ' || a.ad_pro_batiment ELSE '' END
                            )
                        WHEN a.ad_pri_rue IS NOT NULL AND a.ad_pri_rue != '' THEN 
                            TRIM(
                                COALESCE(a.ad_pri_rue, '') || 
                                CASE WHEN a.ad_pri_ville IS NOT NULL AND a.ad_pri_ville != '' THEN ' ' || a.ad_pri_ville ELSE '' END ||
                                CASE WHEN a.ad_pri_batiment IS NOT NULL AND a.ad_pri_batiment != '' THEN ' ' || a.ad_pri_batiment ELSE '' END
                            )
                        ELSE NULL
                    END as adresse
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN entites_administratives ea ON a.id_entite_principale = ea.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
                LEFT JOIN direction_generale dg_via_dir ON d.id_direction_generale = dg_via_dir.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services srv ON a.id_service = srv.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                -- Fonction actuelle depuis fonction_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent)
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                -- Grade actuel depuis grades_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                -- Échelon actuel depuis echelons_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
            `;

            let countQuery = `
                SELECT COUNT(*)
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
            `;
            const params = [];
            let whereConditions = [];

            // Recherche par nom, prénom ou matricule
            if (search) {
                whereConditions.push(`(a.nom ILIKE $${params.length + 1} OR a.prenom ILIKE $${params.length + 1} OR a.matricule ILIKE $${params.length + 1})`);
                params.push(`%${search}%`);
            }

            // Filtres
            if (civilite) {
                whereConditions.push(`a.id_civilite = $${params.length + 1}`);
                params.push(civilite);
            }

            if (nationalite) {
                whereConditions.push(`a.id_nationalite = $${params.length + 1}`);
                params.push(nationalite);
            }

            if (typeAgentParam) {
                // Vérifier si c'est un ID numérique ou un libellé
                if (isNaN(typeAgentParam)) {
                    // C'est un libellé, on doit récupérer l'ID correspondant
                    const typeResult = await pool.query('SELECT id FROM type_d_agents WHERE libele = $1', [typeAgentParam]);
                    if (typeResult.rows.length === 0) {
                        return res.status(400).json({
                            error: `Type d'agent '${typeAgentParam}' non trouvé`
                        });
                    }
                    whereConditions.push(`a.id_type_d_agent = $${params.length + 1}`);
                    params.push(typeResult.rows[0].id);
                } else {
                    // C'est un ID numérique
                    whereConditions.push(`a.id_type_d_agent = $${params.length + 1}`);
                    params.push(typeAgentParam);
                }
            }

            if (sexe) {
                whereConditions.push(`a.sexe = $${params.length + 1}`);
                params.push(sexe);
            }

            if (statut_emploi) {
                whereConditions.push(`a.statut_emploi = $${params.length + 1}`);
                params.push(statut_emploi);
            }

            // Filtrage par catégorie si spécifié
            if (req.query.id_categorie) {
                whereConditions.push(`a.id_categorie = $${params.length + 1}`);
                params.push(req.query.id_categorie);
            }

            // Filtrage par grade si spécifié
            if (req.query.id_grade) {
                whereConditions.push(`a.id_grade = $${params.length + 1}`);
                params.push(req.query.id_grade);
            }

            // Filtrage par entité si spécifié
            if (id_entite) {
                whereConditions.push(`a.id_entite_principale = $${params.length + 1}`);
                params.push(id_entite);
            }

            // Filtrage par direction générale si spécifié : par défaut uniquement agents directement liés (sans direction/sous-direction),
            // sauf pour l'inspection générale où l'on veut toute la direction générale.
            // Ignorer les valeurs non numériques (ex. "false", "undefined") pour éviter erreur SQL
            const idDirectionGeneraleRaw = req.query.id_direction_generale;
            const idDirectionGenerale = (idDirectionGeneraleRaw != null && idDirectionGeneraleRaw !== '' && idDirectionGeneraleRaw !== 'false' && idDirectionGeneraleRaw !== 'undefined')
                ? (typeof idDirectionGeneraleRaw === 'number' ? idDirectionGeneraleRaw : parseInt(idDirectionGeneraleRaw, 10))
                : null;
            if (idDirectionGenerale != null && !isNaN(idDirectionGenerale)) {
                let userRoleNorm = '';
                if (req.user && req.user.role) {
                    userRoleNorm = req.user.role.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');
                }
                const isInspecteurGeneral = userRoleNorm === 'inspecteur_general';

                whereConditions.push(`a.id_direction_generale = $${params.length + 1}`);
                params.push(idDirectionGenerale);
                if (!isInspecteurGeneral) {
                    // Cabinet / DG classiques : uniquement agents directement rattachés à la DG
                    whereConditions.push('a.id_direction IS NULL');
                    whereConditions.push('a.id_sous_direction IS NULL');
                    console.log(`📁 Filtrage par direction générale ID: ${idDirectionGenerale} (agents rattachés uniquement à la DG)`);
                } else {
                    // Inspection générale : inclure toutes les directions/sous-directions de la DG
                    console.log(`📁 Filtrage par direction générale ID: ${idDirectionGenerale} (toute l'inspection générale, y compris directions/sous-directions)`);
                }
            }

            // Filtrage par direction si spécifié (sans direction générale pour éviter conflit)
            let hasDirectionFilter = false;
            if (req.query.id_direction && (!idDirectionGeneraleRaw || idDirectionGeneraleRaw === '' || idDirectionGeneraleRaw === 'false' || !idDirectionGenerale)) {
                whereConditions.push(`a.id_direction = $${params.length + 1}`);
                params.push(req.query.id_direction);
                // Directeur central : uniquement les agents directement rattachés à la direction (exclure les sous-directions)
                const rawRoleDir = (req.user && req.user.role) ? (req.user.role || '').toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e') : '';
                if (rawRoleDir === 'directeur_central') {
                    whereConditions.push('a.id_sous_direction IS NULL');
                }
                hasDirectionFilter = true;
                console.log(`📁 Filtrage par direction ID: ${req.query.id_direction}${rawRoleDir === 'directeur_central' ? ' (directeur central: agents sans sous-direction)' : ''}`);
            }

            // Pour directeur / directeur_service_exterieur / directeur_central / directeur_general : si aucun filtre direction ni DG n'a été appliqué, forcer le filtre
            if (!hasDirectionFilter && idDirectionGenerale == null && req.user && req.user.id_agent) {
                const rawRole = (req.user.role || '').toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');
                const isDirecteurGeneral = (rawRole === 'directeur_general') || (rawRole.includes('directeur') && (rawRole.includes('general') || rawRole.includes('generale')));
                if (isDirecteurGeneral) {
                    try {
                        const dgResult = await pool.query(
                            'SELECT id_direction_generale, id_direction FROM agents WHERE id = $1',
                            [req.user.id_agent]
                        );
                        if (dgResult.rows.length > 0) {
                            let dgId = dgResult.rows[0].id_direction_generale;
                            if (dgId == null && dgResult.rows[0].id_direction != null) {
                                const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [dgResult.rows[0].id_direction]);
                                if (dirRow.rows.length > 0) dgId = dirRow.rows[0].id_direction_generale;
                            }
                            if (dgId != null) {
                                // Directeur général : uniquement les agents directement rattachés à sa DG (id_direction et id_sous_direction NULL)
                                whereConditions.push(`a.id_direction_generale = $${params.length + 1}`);
                                whereConditions.push('a.id_direction IS NULL');
                                whereConditions.push('a.id_sous_direction IS NULL');
                                params.push(dgId);
                                hasDirectionFilter = true;
                                console.log(`📁 Filtrage par direction générale de l'utilisateur (directeur_general, agents rattachés uniquement à la DG): ${dgId}`);
                            }
                        }
                    } catch (err) {
                        console.error('Erreur récupération id_direction_generale utilisateur:', err);
                    }
                } else if (rawRole === 'directeur' || rawRole === 'directeur_service_exterieur' || rawRole === 'directeur_central') {
                    try {
                        const dirResult = await pool.query(
                            'SELECT id_direction FROM agents WHERE id = $1',
                            [req.user.id_agent]
                        );
                        if (dirResult.rows.length > 0 && dirResult.rows[0].id_direction != null) {
                            const userDirectionId = dirResult.rows[0].id_direction;
                            whereConditions.push(`a.id_direction = $${params.length + 1}`);
                            params.push(userDirectionId);
                            // Directeur central : uniquement les agents directement rattachés à la direction (sans sous-direction)
                            if (rawRole === 'directeur_central') {
                                whereConditions.push('a.id_sous_direction IS NULL');
                            }
                            hasDirectionFilter = true;
                            console.log(`📁 Filtrage par direction de l'utilisateur (${rawRole}): ${userDirectionId}${rawRole === 'directeur_central' ? ' (agents sans sous-direction)' : ''}`);
                        }
                    } catch (err) {
                        console.error('Erreur récupération id_direction utilisateur:', err);
                    }
                }
            }

            // Filtrage par sous-direction si spécifié
            if (req.query.id_sous_direction) {
                whereConditions.push(`a.id_sous_direction = $${params.length + 1}`);
                params.push(req.query.id_sous_direction);
                console.log(`📁 Filtrage par sous-direction ID: ${req.query.id_sous_direction}`);
            }

            // Filtrage par ministère - priorité au paramètre de requête, sinon utiliser le ministère de l'utilisateur
            let ministereId = req.query.id_ministere || userMinistereId;

            if (req.user && req.user.role && req.user.role.toLowerCase() === 'drh') {
                ministereId = userMinistereId;
                if (!ministereId) {
                    console.warn('⚠️ DRH connecté sans ministère associé - aucun agent ne sera retourné');
                }
            }
            console.log(`🔍 DEBUG FILTRAGE - Paramètre id_ministere: ${req.query.id_ministere}`);
            console.log(`🔍 DEBUG FILTRAGE - userMinistereId: ${userMinistereId}`);
            console.log(`🔍 DEBUG FILTRAGE - ministereId final: ${ministereId}`);
            console.log(`🔍 DEBUG FILTRAGE - for_select: ${for_select}`);
            console.log(`🔍 DEBUG FILTRAGE - include_entites: ${req.query.include_entites}`);

            if (ministereId) {
                whereConditions.push(`a.id_ministere = $${params.length + 1}`);
                params.push(ministereId);
                console.log(`🏛️ Filtrage par ministère ID: ${ministereId}`);

                // Par défaut, afficher TOUS les agents du ministère (avec et sans entité)
                // Sauf si on demande explicitement seulement les agents centraux
                if (req.query.central_only === 'true') {
                    whereConditions.push(`a.id_entite_principale IS NULL`);
                    console.log(`🏛️ Filtrage: Affichage uniquement des agents centraux (id_entite_principale IS NULL)`);
                } else {
                    console.log(`🏛️ Filtrage: Inclusion de tous les agents du ministère (avec et sans entité)`);
                }
            } else {
                console.log(`⚠️ Aucun filtrage par ministère appliqué - Affichage de tous les agents`);
            }

            // Note: Le filtrage par service sera géré via la relation avec l'entité
            // car les agents sont liés aux services via leur entité principale

            // Toujours exclure les agents ayant atteint la retraite (âge / date_retraite) — le paramètre
            // include_retirement_reached n'est plus pris en compte pour réinclure ces agents.
            whereConditions.push(this.getRetirementExclusionCondition('a', 'g'));

            // Exclure le statut emploi « retraite » (sauf si l'appel filtre explicitement sur ce statut)
            if (!statut_emploi || String(statut_emploi).toLowerCase().trim() !== 'retraite') {
                whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')`);
            }

            // Exclure les agents retirés de la liste principale (si la colonne existe)
            // Vérifier si la colonne retire existe
            const columnExists = async(tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            const retireColumnExists = await columnExists('agents', 'retire');

            // Filtrer par ministère de l'utilisateur connecté
            const idMinistere = req.user && req.user.id_ministere ? req.user.id_ministere : null;
            if (retireColumnExists) {
                // Exclure les agents retirés manuellement (TOUJOURS appliquer cette condition)
                // Utiliser COALESCE pour gérer les valeurs NULL comme false
                whereConditions.push('COALESCE(a.retire, false) = false');
                console.log('🔍 Filtrage: Exclusion des agents retirés (retire = true)');

                // Exclure aussi les agents fonctionnaires à la retraite (calcul basé sur date de naissance + grade)
                whereConditions.push(`
                    NOT (
                        a.id_type_d_agent = 1
                        AND a.date_de_naissance IS NOT NULL
                        AND g.libele IS NOT NULL
                        AND MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                            CASE 
                                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                                ELSE 60
                            END,
                            12,
                            31
                        )::DATE < CURRENT_DATE::DATE
                    )
                `);
                console.log('🔍 Filtrage: Exclusion des agents fonctionnaires à la retraite');
            } else {
                console.warn('⚠️ La colonne retire n\'existe pas dans la table agents. Les agents retirés ne seront pas filtrés.');
            }

            if (whereConditions.length > 0) {
                const whereClause = whereConditions.join(' AND ');
                query += ` WHERE ${whereClause}`;
                countQuery += ` WHERE ${whereClause}`;
                console.log(`🔍 DEBUG SQL - WHERE clause: ${whereClause}`);
                console.log(`🔍 DEBUG SQL - Params:`, params);
            }

            // Tri
            // Pour un tri alphabétique par nom, ajouter aussi le prénom comme critère secondaire
            if (sortBy === 'nom' || sortBy === 'prenom') {
                query += ` ORDER BY a.nom ${sortOrder.toUpperCase()}, a.prenom ${sortOrder.toUpperCase()}`;
            } else {
                query += ` ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(effectiveLimit), offset);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2)) // Le countQuery ne doit pas avoir les paramètres de LIMIT/OFFSET
            ]);

            // Harmoniser la "position actuelle" de la liste avec la logique métier (demandes approuvées effectives).
            // Sans ceci, la liste peut afficher seulement `positions.libele` alors que la fiche agent affiche déjà le motif.
            if (Array.isArray(result.rows) && result.rows.length > 0) {
                const agentIds = result.rows.map((r) => r.id).filter(Boolean);
                if (agentIds.length > 0) {
                    const demandesRes = await pool.query(
                        `
                        SELECT
                            d.id_agent,
                            d.type_demande,
                            d.motif_conge,
                            d.agree_motif,
                            d.description,
                            d.date_debut,
                            d.date_fin,
                            d.agree_date_cessation,
                            d.date_reprise_service,
                            COALESCE(
                                d.date_validation_drh,
                                d.date_validation_ministre,
                                d.date_validation_chef_cabinet,
                                d.date_validation_chef_service,
                                d.date_validation_dir_cabinet,
                                d.date_validation_directeur_general,
                                d.date_validation_directeur_service_exterieur,
                                d.date_validation_directeur,
                                d.date_validation_sous_directeur,
                                d.date_debut,
                                d.date_creation
                            ) AS decision_date
                        FROM demandes d
                        WHERE d.id_agent = ANY($1::int[])
                          AND d.status = 'approuve'
                          AND d.type_demande IN ('absence', 'sortie_territoire', 'certificat_cessation', 'certificat_reprise_service')
                        ORDER BY d.id_agent ASC, decision_date DESC NULLS LAST, d.id DESC
                        `,
                        [agentIds]
                    );

                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const toDateOnlyStr = (v) => {
                        if (!v) return null;
                        if (typeof v === 'string') {
                            const s = v.trim();
                            return s.length >= 10 ? s.slice(0, 10) : null;
                        }
                        const d = v instanceof Date ? v : new Date(v);
                        if (Number.isNaN(d.getTime())) return null;
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    };
                    const normalize = (s) => String(s || '')
                        .toLowerCase()
                        .trim()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                    const isEffectiveToday = (d) => {
                        if (!d || !d.type_demande) return false;
                        if (d.type_demande === 'absence') {
                            const debutStr = toDateOnlyStr(d.date_debut);
                            const finStr = toDateOnlyStr(d.date_fin);
                            if (!debutStr && !finStr) return false;
                            if (debutStr && todayStr < debutStr) return false;
                            // Règle métier: l'absence reste active après date_fin
                            // jusqu'à reprise de service effective.
                            return true;
                        }
                        if (d.type_demande === 'sortie_territoire') {
                            const debutStr = toDateOnlyStr(d.date_debut);
                            if (!debutStr) return false;
                            return todayStr >= debutStr;
                        }
                        if (d.type_demande === 'certificat_cessation') {
                            const cessationStr = toDateOnlyStr(d.agree_date_cessation);
                            return !!cessationStr && todayStr >= cessationStr;
                        }
                        if (d.type_demande === 'certificat_reprise_service') {
                            const repriseStr = toDateOnlyStr(d.date_reprise_service);
                            return !!repriseStr && todayStr >= repriseStr;
                        }
                        return false;
                    };

                    const demandsByAgent = new Map();
                    for (const d of demandesRes.rows || []) {
                        const key = d.id_agent;
                        if (!demandsByAgent.has(key)) demandsByAgent.set(key, []);
                        demandsByAgent.get(key).push(d);
                    }

                    for (const agentRow of result.rows) {
                        const agentDemands = demandsByAgent.get(agentRow.id) || [];
                        if (agentDemands.length === 0) continue;

                        // La liste est déjà triée par decision_date DESC, donc on prend la plus récente effective.
                        const effectiveDemande = agentDemands.find((d) => isEffectiveToday(d)) || null;
                        if (!effectiveDemande) continue;

                        if (effectiveDemande.type_demande === 'certificat_cessation') {
                            const motif = normalize(effectiveDemande.motif_conge || effectiveDemande.agree_motif || '');
                            if (motif.includes('matern')) {
                                agentRow.position_libele = 'CONGE DE MATERNITE';
                            } else if (motif.includes('patern')) {
                                agentRow.position_libele = 'CONGE DE PATERNITE';
                            } else if (motif.includes('annuel') || motif.includes('annuelle')) {
                                agentRow.position_libele = 'CONGE ANNUEL';
                            } else {
                                agentRow.position_libele = 'En congé';
                            }
                        } else if (effectiveDemande.type_demande === 'certificat_reprise_service') {
                            agentRow.position_libele = 'En activité';
                        } else if (effectiveDemande.type_demande === 'absence' || effectiveDemande.type_demande === 'sortie_territoire') {
                            // Règle demandée: pour une absence/sortie du territoire, afficher le motif saisi.
                            const motifRaw = (effectiveDemande.motif_conge || effectiveDemande.agree_motif || effectiveDemande.description || '').trim();
                            if (motifRaw) {
                                // S'assurer que le motif existe aussi dans la table positions.
                                // Si inexistant, on le crée et on synchronise id_position.
                                try {
                                    const existingPos = await pool.query(
                                        'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1',
                                        [motifRaw]
                                    );
                                    let motifPositionId = existingPos.rows && existingPos.rows.length > 0 ? existingPos.rows[0].id : null;
                                    if (!motifPositionId) {
                                        const insertPos = await pool.query(
                                            'INSERT INTO positions (libele) VALUES ($1) RETURNING id',
                                            [motifRaw]
                                        );
                                        motifPositionId = insertPos.rows && insertPos.rows[0] ? insertPos.rows[0].id : null;
                                    }
                                    if (motifPositionId && motifPositionId !== agentRow.id_position) {
                                        await pool.query(
                                            'UPDATE agents SET id_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                                            [motifPositionId, agentRow.id]
                                        );
                                        agentRow.id_position = motifPositionId;
                                    }
                                } catch (_e) {
                                    // Ne pas bloquer l'affichage de la liste.
                                }
                                agentRow.position_libele = motifRaw;
                            }
                        }
                    }
                }
            }

            const totalCount = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalCount / effectiveLimit);

            // Liste d’agents : données sensibles au temps ; éviter 304 / cache navigateur ou proxy
            res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            res.json({
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + parseInt(effectiveLimit), totalCount)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message // Ajouter des détails de l'erreur pour le débogage
            });
        }
    }


    // Générer un matricule automatique pour les agents contractuels (non fonctionnaires)
    // - Ministère 1 (Tourisme) : syntaxe historique [A-Z sauf O et I] + 6 chiffres (ex: A000101)
    // - Autres ministères : préfixe + séquence selon ministere_matricule_config (ex: M2000001)
    async generateMatricule(id_ministere) {
        const ministereId = (id_ministere != null && id_ministere !== '') ? parseInt(id_ministere, 10) : 1;

        // Ministère 1 : syntaxe Lettre + 6 chiffres (uniquement pour le ministère 1)
        if (ministereId === 1) {
            return this._generateMatriculeMinistere1();
        }

        // Autres ministères : préfixe + séquence (table ministere_matricule_config)
        return this._generateMatriculeAutreMinistere(ministereId);
    }

    // Syntaxe ministère 1 : [A-Z sauf O et I][0-9]{6} (ex: A000101, B000102, ...)
    async _generateMatriculeMinistere1() {
        const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
        const maxNumero = 999999;

        const query = `
            SELECT matricule 
            FROM agents 
            WHERE matricule ~ '^[A-Z][0-9]{6}$'
              AND matricule !~ '^[OI][0-9]{6}$'
              AND (id_type_d_agent IS NULL OR id_type_d_agent != 1)
              AND id_ministere = 1
            ORDER BY CAST(SUBSTRING(matricule FROM 2) AS INTEGER) DESC 
            LIMIT 1
        `;
        const result = await pool.query(query);

        let newNumero = result.rows.length === 0 ? 101 : parseInt(result.rows[0].matricule.substring(1), 10) + 1;

        if (newNumero > maxNumero) {
            throw new Error(`Tous les matricules ont été utilisés pour le ministère 1 (maximum ${maxNumero})`);
        }

        let positionDansAlphabet = ((newNumero - 101) % 24);
        let lettre = lettres[positionDansAlphabet];
        let numeroFormate = newNumero.toString().padStart(6, '0');
        let newMatricule = `${lettre}${numeroFormate}`;

        let attempts = 0;
        while (attempts < 100) {
            const checkExist = await pool.query('SELECT id FROM agents WHERE matricule = $1', [newMatricule]);
            if (checkExist.rows.length === 0) break;
            attempts++;
            newNumero++;
            if (newNumero > maxNumero) throw new Error(`Tous les matricules ont été utilisés pour le ministère 1`);
            positionDansAlphabet = ((newNumero - 101) % 24);
            lettre = lettres[positionDansAlphabet];
            numeroFormate = newNumero.toString().padStart(6, '0');
            newMatricule = `${lettre}${numeroFormate}`;
        }
        if (attempts >= 100) throw new Error('Impossible de générer un matricule unique pour le ministère 1');

        console.log(`✅ Matricule généré (ministère 1): ${newMatricule}`);
        return newMatricule;
    }

    // Autres ministères : préfixe + séquence (table ministere_matricule_config)
    async _generateMatriculeAutreMinistere(id_ministere) {
        if (!id_ministere) {
            throw new Error('id_ministere requis pour générer un matricule contractuel');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Créer la config si elle n'existe pas (préfixe par défaut : M + id_ministere)
            await client.query(`
                INSERT INTO ministere_matricule_config (id_ministere, prefix, prochaine_sequence, nb_chiffres, updated_at)
                VALUES ($1, $2, 1, 6, CURRENT_TIMESTAMP)
                ON CONFLICT (id_ministere) DO NOTHING
            `, [id_ministere, `M${id_ministere}`]);

            // Incrémenter et récupérer la séquence à utiliser (atomique)
            const updateResult = await client.query(`
                UPDATE ministere_matricule_config
                SET prochaine_sequence = prochaine_sequence + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_ministere = $1
                RETURNING prefix, (prochaine_sequence - 1) AS sequence_utilisee, nb_chiffres
            `, [id_ministere]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error(`Configuration matricule introuvable pour le ministère ${id_ministere}`);
            }

            const { prefix, sequence_utilisee, nb_chiffres } = updateResult.rows[0];
            const nbChiffres = Math.min(Math.max(parseInt(nb_chiffres, 10) || 6, 1), 10);
            const numeroFormate = String(sequence_utilisee).padStart(nbChiffres, '0');
            const newMatricule = `${prefix}${numeroFormate}`;

            await client.query('COMMIT');

            // Vérifier unicité
            const checkExist = await pool.query('SELECT id FROM agents WHERE matricule = $1', [newMatricule]);
            if (checkExist.rows.length > 0) {
                console.warn(`⚠️ Matricule ${newMatricule} existe déjà, nouvelle tentative...`);
                return this._generateMatriculeAutreMinistere(id_ministere);
            }

            console.log(`✅ Matricule généré (ministère ${id_ministere}): ${newMatricule}`);
            return newMatricule;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Créer un nouvel agent
    async create(req, res) {
        try {
            console.log('🔍 Données reçues pour création d\'agent:', req.body);
            console.log('📁 Fichiers reçus:', req.files);
            console.log('🔍 Vérification des champs familiaux:', {
                nom_de_la_mere: req.body.nom_de_la_mere,
                nom_du_pere: req.body.nom_du_pere,
                id_pays: req.body.id_pays
            });

            const data = req.body;
            const files = req.files;

            // Parser les données JSON si elles sont en string
            let agentData = data;
            let enfants = [];
            let diplomes = [];

            if (typeof data === 'string') {
                agentData = JSON.parse(data);
            }

            if (agentData.enfants) {
                enfants = typeof agentData.enfants === 'string' ? JSON.parse(agentData.enfants) : agentData.enfants;
            }

            if (agentData.diplomes) {
                diplomes = typeof agentData.diplomes === 'string' ? JSON.parse(agentData.diplomes) : agentData.diplomes;
            }

            // Séparer les données de l'agent des fichiers
            const {
                enfants: _enfants,
                diplomes: _diplomes,
                ...cleanAgentData
            } = agentData;

            // Assignation du ministère/entité AVANT génération du matricule (pour que le bon format soit utilisé)
            let userMinistereId = null;
            let userEntiteId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale, a.id_direction
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);
                    if (userQuery.rows.length > 0) {
                        userMinistereId = userQuery.rows[0].id_ministere;
                        userEntiteId = userQuery.rows[0].id_entite_principale;
                        console.log(`🔍 Utilisateur connecté - Ministère: ${userMinistereId}, Entité: ${userEntiteId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }
            if (userMinistereId) {
                agentData.id_ministere = userMinistereId;
                console.log(`✅ Ministère assigné automatiquement (avant matricule): ${userMinistereId}`);
            }
            if (userEntiteId) {
                agentData.id_entite_principale = userEntiteId;
                console.log(`✅ Entité assignée automatiquement (avant matricule): ${userEntiteId}`);
            }

            // Générer automatiquement le matricule pour les agents non fonctionnaires
            // id_type_d_agent = 1 correspond aux fonctionnaires
            // BNETD et ARTICLE 18 doivent avoir leur matricule saisi manuellement (comme les fonctionnaires)
            // Tous les autres agents non fonctionnaires utilisent le même format : [A-Z sauf O et I][0-9]{6}
            const isNonFonctionnaire = agentData.id_type_d_agent && parseInt(agentData.id_type_d_agent) !== 1;

            // Types d'agents qui doivent avoir leur matricule saisi manuellement (pas de génération automatique)
            const manualMatriculeTypes = ['BNETD', 'CONTRACTUEL(ARTICLE 18)'];
            let shouldGenerateMatricule = false;

            if (isNonFonctionnaire && (!agentData.matricule || agentData.matricule.trim() === '')) {
                // Récupérer le libelle du type d'agent pour vérifier s'il faut générer automatiquement
                const typeAgentQuery = await pool.query('SELECT libele FROM type_d_agents WHERE id = $1', [agentData.id_type_d_agent]);
                const typeAgentLibele = typeAgentQuery.rows.length > 0 ? typeAgentQuery.rows[0].libele : null;

                // Générer automatiquement seulement si ce n'est pas BNETD ni ARTICLE 18
                shouldGenerateMatricule = !manualMatriculeTypes.includes(typeAgentLibele);

                if (shouldGenerateMatricule) {
                    // Générer automatiquement le matricule selon le ministère (syntaxe ministère 1 vs config par ministère)
                    agentData.matricule = await this.generateMatricule(agentData.id_ministere);
                    console.log(`✅ Matricule généré automatiquement pour agent non fonctionnaire (ministère ${agentData.id_ministere}): ${agentData.matricule}`);
                } else {
                    console.log(`ℹ️ Matricule doit être saisi manuellement pour le type d'agent: ${typeAgentLibele}`);
                }
            }

            // Validation des données obligatoires
            if (!agentData.nom || !agentData.prenom || !agentData.matricule || !agentData.date_de_naissance) {
                return res.status(400).json({
                    error: 'Les champs nom, prénom, matricule et date de naissance sont obligatoires'
                });
            }

            // Vérifier si le matricule existe déjà
            const checkMatricule = await pool.query('SELECT id FROM agents WHERE matricule = $1', [agentData.matricule]);
            if (checkMatricule.rows.length > 0) {
                return res.status(400).json({
                    error: 'Ce matricule existe déjà'
                });
            }


            // Validation: Un agent doit toujours avoir un ministère (ministère déjà assigné plus haut si utilisateur connecté)
            if (!agentData.id_ministere) {
                return res.status(400).json({
                    error: 'L\'agent doit être lié à un ministère. Vérifiez que l\'utilisateur connecté a un ministère assigné.'
                });
            }

            // Si l'agent a une entité, s'assurer que l'entité appartient au même ministère
            if (agentData.id_entite_principale) {
                const entiteQuery = await pool.query(
                    'SELECT id_ministere FROM entites_administratives WHERE id = $1 AND is_active = true', [agentData.id_entite_principale]
                );

                if (entiteQuery.rows.length === 0) {
                    return res.status(400).json({
                        error: 'L\'entité spécifiée n\'existe pas ou est inactive'
                    });
                }

                const entiteMinistereId = entiteQuery.rows[0].id_ministere;
                if (entiteMinistereId !== agentData.id_ministere) {
                    return res.status(400).json({
                        error: 'L\'entité doit appartenir au même ministère que l\'agent'
                    });
                }
            }

            // LOGIQUE DE RESPONSABILITÉ AUTOMATIQUE (AVANT INSERTION)
            let isResponsableMinistere = false;
            let isResponsableEntite = false;
            let roleToAssign = 'agent'; // Rôle par défaut

            // Vérifier si c'est le premier agent du ministère (sans entité)
            // Exclure les agents retirés et à la retraite du comptage
            if (!agentData.id_entite_principale) {
                const ministereAgentsCount = await pool.query(
                    `SELECT COUNT(*) as count 
                    FROM agents a
                    LEFT JOIN grades g ON a.id_grade = g.id
                    WHERE a.id_ministere = $1 
                    AND a.id_entite_principale IS NULL 
                    AND a.statut_emploi = 'actif'
                    AND (a.retire IS NULL OR a.retire = false)
                    AND NOT (
                        a.id_type_d_agent = 1
                        AND a.date_de_naissance IS NOT NULL
                        AND g.libele IS NOT NULL
                        AND MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                            CASE 
                                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                                ELSE 60
                            END,
                            12,
                            31
                        )::DATE < CURRENT_DATE::DATE
                    )`, [agentData.id_ministere]
                );

                if (parseInt(ministereAgentsCount.rows[0].count) === 0) {
                    isResponsableMinistere = true;
                    roleToAssign = 'DRH'; // DRH en majuscule pour les ministères
                    console.log(`🎯 PREMIER AGENT DU MINISTÈRE: ${agentData.nom} ${agentData.prenom} deviendra DRH du ministère ${agentData.id_ministere}`);
                }
            }

            // Vérifier si c'est le premier agent de l'entité
            // Exclure les agents retirés et à la retraite du comptage
            if (agentData.id_entite_principale) {
                const entiteAgentsCount = await pool.query(
                    `SELECT COUNT(*) as count 
                    FROM agents a
                    LEFT JOIN grades g ON a.id_grade = g.id
                    WHERE a.id_entite_principale = $1 
                    AND a.statut_emploi = 'actif'
                    AND (a.retire IS NULL OR a.retire = false)
                    AND NOT (
                        a.id_type_d_agent = 1
                        AND a.date_de_naissance IS NOT NULL
                        AND g.libele IS NOT NULL
                        AND MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                            CASE 
                                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                                ELSE 60
                            END,
                            12,
                            31
                        )::DATE < CURRENT_DATE::DATE
                    )`, [agentData.id_entite_principale]
                );

                if (parseInt(entiteAgentsCount.rows[0].count) === 0) {
                    isResponsableEntite = true;
                    roleToAssign = 'drh'; // drh en minuscule pour les entités
                    console.log(`🎯 PREMIER AGENT DE L'ENTITÉ: ${agentData.nom} ${agentData.prenom} deviendra drh de l'entité ${agentData.id_entite_principale}`);
                }
            }

            // Calculer l'âge
            const dateNaissance = new Date(agentData.date_de_naissance);
            const aujourdhui = new Date();
            let age = aujourdhui.getFullYear() - dateNaissance.getFullYear();
            const mois = aujourdhui.getMonth() - dateNaissance.getMonth();
            if (mois < 0 || (mois === 0 && aujourdhui.getDate() < dateNaissance.getDate())) {
                age--;
            }
            agentData.age = age;

            // Mapper les noms de champs du frontend vers les noms de colonnes de la DB
            // Convertir les chaînes vides en null pour éviter les erreurs de type integer
            if (agentData.sous_direction_id !== undefined) {
                agentData.id_sous_direction = agentData.sous_direction_id === '' ? null : agentData.sous_direction_id;
                delete agentData.sous_direction_id;
            }
            if (agentData.service_id !== undefined) {
                agentData.id_service = agentData.service_id === '' ? null : agentData.service_id;
                delete agentData.service_id;
            }

            // Filtrer les colonnes valides pour la table agents
            // NOTE: id_emploi et id_fonction sont exclus car ils doivent être enregistrés dans emploi_agents et fonction_agents
            const validAgentColumns = [
                'nom', 'prenom', 'matricule', 'date_de_naissance', 'lieu_de_naissance', 'sexe',
                'email', 'telephone1', 'telephone2', 'telephone3', 'adresse', 'id_civilite', 'id_nationalite',
                'id_type_d_agent', 'id_situation_matrimoniale', 'id_entite_principale', 'id_ministere',
                'id_direction_generale', 'id_direction', 'id_service', 'id_sous_direction', 'id_grade', 'id_echelon', 'id_categorie',
                'id_position', 'id_handicap', 'statut_emploi', 'date_embauche', 'date_prise_service_au_ministere',
                'date_prise_service_dans_la_direction', 'date_fin_contrat', 'salaire',
                'numero_cnps', 'numero_cni', 'numero_passeport', 'numero_permis_conduire',
                'numero_compte_bancaire', 'nom_banque', 'nom_urgence', 'telephone_urgence',
                'relation_urgence', 'adresse_urgence', 'observations', 'age', 'handicap_personnalise',
                'numero_acte_mariage', 'date_delivrance_acte_mariage', 'nom_conjointe', 'prenom_conjointe',
                'nom_de_la_mere', 'nom_du_pere', 'id_pays',
                'ad_pro_rue', 'ad_pro_ville', 'ad_pro_batiment',
                'ad_pri_rue', 'ad_pri_ville', 'ad_pri_batiment', 'nombre_enfant', 'date_mariage', 'date_retraite',
                'corps_prefectoral', 'grade_prefectoral', 'echelon_prefectoral'
            ];

            // Gérer le handicap personnalisé
            if ((agentData.id_handicap === '14' || agentData.id_handicap === 14) && agentData.handicap_personnalise) {
                // Si "Autre" est sélectionné et qu'il y a un handicap personnalisé
                console.log('🔧 Gestion du handicap personnalisé:', agentData.handicap_personnalise);
                // Le handicap personnalisé sera sauvegardé dans la colonne handicap_personnalise
            } else if ((agentData.id_handicap === '14' || agentData.id_handicap === 14) && !agentData.handicap_personnalise) {
                // Si "Autre" est sélectionné mais pas de handicap personnalisé, mettre null
                agentData.handicap_personnalise = null;
            } else {
                // Si un autre handicap est sélectionné, effacer le handicap personnalisé
                agentData.handicap_personnalise = null;
            }

            // Liste des champs de type integer qui doivent être null si vides
            const integerFields = [
                'id_civilite', 'id_nationalite', 'id_type_d_agent', 'id_situation_matrimoniale',
                'id_entite_principale', 'id_ministere', 'id_direction_generale', 'id_direction', 'id_service', 'id_sous_direction',
                'id_fonction', 'id_emploi', 'id_grade', 'id_echelon', 'id_categorie', 'id_position',
                'id_handicap', 'id_pays', 'id_specialite', 'id_langue', 'id_niveau_langue',
                'id_motif_depart', 'id_type_conge', 'id_autre_absence', 'id_distinction',
                'id_type_etablissement', 'id_unite_administrative', 'id_type_materiel',
                'id_type_destination', 'id_nature_accident', 'id_sanction', 'id_sindicat',
                'id_type_courrier', 'id_nature_acte', 'id_localite', 'id_mode_entree',
                'nombre_enfant', 'salaire', 'age'
            ];

            // Filtrer agentData pour ne garder que les colonnes valides
            const filteredAgentData = {};
            Object.keys(agentData).forEach(key => {
                if (validAgentColumns.includes(key)) {
                    const value = agentData[key];

                    // Convertir les chaînes vides en null pour les champs de type integer
                    if (integerFields.includes(key)) {
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            filteredAgentData[key] = value;
                        }
                    }
                    // Gérer les champs de date vides
                    else if (['date_mariage', 'date_retraite', 'date_embauche', 'date_fin_contrat', 'date_de_naissance', 'date_declaration_cnps', 'date_prise_service_au_ministere', 'date_prise_service_dans_la_direction', 'date_delivrance_acte_mariage'].includes(key)) {
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            filteredAgentData[key] = value;
                        }
                    }
                    // Convertir le statut_emploi en minuscules pour respecter la contrainte de la base de données
                    else if (key === 'statut_emploi') {
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = 'actif'; // Valeur par défaut
                        } else {
                            filteredAgentData[key] = value.toLowerCase();
                        }
                    } else if (key === 'situation_militaire') {
                        // Normaliser les valeurs de situation militaire
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            // Normaliser vers les valeurs acceptées
                            const normalizedValue = value.toString().trim();
                            if (['Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné'].includes(normalizedValue)) {
                                filteredAgentData[key] = normalizedValue;
                            } else if (['EXEMPTÉ', 'RÉFORMÉ', 'BON POUR LE SERVICE', 'DISPENSÉ', 'NON CONCERNÉ'].includes(normalizedValue)) {
                                // Convertir les majuscules vers le format standard
                                const mapping = {
                                    'EXEMPTÉ': 'Exempté',
                                    'RÉFORMÉ': 'Réformé',
                                    'BON POUR LE SERVICE': 'Bon pour le service',
                                    'DISPENSÉ': 'Dispensé',
                                    'NON CONCERNÉ': 'Non concerné'
                                };
                                filteredAgentData[key] = mapping[normalizedValue];
                            } else {
                                // Valeur non reconnue, laisser telle quelle (sera rejetée par la contrainte)
                                filteredAgentData[key] = normalizedValue;
                            }
                        }
                    }
                    // Gérer les champs texte qui peuvent être vides
                    else if (['numero_cnps', 'numero_cni', 'numero_passeport', 'numero_permis_conduire', 'numero_acte_mariage', 'nom_conjointe', 'prenom_conjointe', 'nom_de_la_mere', 'nom_du_pere'].includes(key)) {
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            filteredAgentData[key] = typeof value === 'string' ? value.trim() : value;
                        }
                    } else {
                        filteredAgentData[key] = value;
                    }
                }
            });

            // Calculer automatiquement la date de retraite si elle n'est pas fournie
            // Seulement pour les agents fonctionnaires (id_type_d_agent = 1)
            if (!filteredAgentData.date_retraite &&
                filteredAgentData.date_de_naissance &&
                filteredAgentData.id_grade &&
                filteredAgentData.id_type_d_agent === 1) {

                try {
                    // Récupérer le libellé du grade
                    const gradeQuery = await pool.query('SELECT libele FROM grades WHERE id = $1', [filteredAgentData.id_grade]);

                    if (gradeQuery.rows.length > 0 && gradeQuery.rows[0].libele) {
                        const gradeLibele = gradeQuery.rows[0].libele;

                        // Calculer la date de retraite
                        const calculatedRetirementDate = this.calculateRetirementDate(
                            filteredAgentData.date_de_naissance,
                            gradeLibele
                        );

                        if (calculatedRetirementDate) {
                            // Formater la date au format YYYY-MM-DD pour la base de données
                            const year = calculatedRetirementDate.getFullYear();
                            const month = String(calculatedRetirementDate.getMonth() + 1).padStart(2, '0');
                            const day = String(calculatedRetirementDate.getDate()).padStart(2, '0');
                            const formattedDate = `${year}-${month}-${day}`;

                            filteredAgentData.date_retraite = formattedDate;
                            console.log(`✅ Date de retraite calculée automatiquement: ${formattedDate} (Grade: ${gradeLibele}, Date de naissance: ${filteredAgentData.date_de_naissance})`);
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur lors du calcul automatique de la date de retraite:', error);
                    // Ne pas bloquer la création si le calcul échoue, continuer sans date de retraite
                }
            }

            // Insérer l'agent
            const agentColumns = Object.keys(filteredAgentData);
            const agentValues = Object.values(filteredAgentData);
            const agentPlaceholders = agentColumns.map((_, index) => `$${index + 1}`).join(', ');

            console.log('🔍 Colonnes à insérer:', agentColumns);
            console.log('🔍 Vérification des champs familiaux dans filteredAgentData:', {
                nom_de_la_mere: filteredAgentData.nom_de_la_mere,
                nom_du_pere: filteredAgentData.nom_du_pere,
                id_pays: filteredAgentData.id_pays
            });

            const agentQuery = `
                INSERT INTO agents (${agentColumns.join(', ')}, created_at, updated_at)
                VALUES (${agentPlaceholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const agentResult = await pool.query(agentQuery, agentValues);
            const agent = agentResult.rows[0];

            // Enregistrer l'emploi (uniquement pour les fonctionnaires) et la fonction dans les tables de liaison
            const dateEntreeEmploiFonction = filteredAgentData.date_prise_service_au_ministere || filteredAgentData.date_embauche || null;
            const idTypeAgent = parseInt(filteredAgentData.id_type_d_agent, 10);

            // Log pour déboguer les valeurs de fonction et emploi
            console.log('🔍 AgentsController - Vérification fonction/emploi:', {
                id_agent: agent.id,
                id_type_d_agent: idTypeAgent,
                id_emploi: agentData.id_emploi,
                id_emploi_type: typeof agentData.id_emploi,
                id_fonction: agentData.id_fonction,
                id_fonction_type: typeof agentData.id_fonction,
                dateEntreeEmploiFonction: dateEntreeEmploiFonction
            });

            // Enregistrer l'emploi (uniquement pour les fonctionnaires)
            if (idTypeAgent === 1 && agentData.id_emploi) {
                try {
                    // Convertir en entier si nécessaire
                    const idEmploi = parseInt(agentData.id_emploi, 10);
                    if (isNaN(idEmploi)) {
                        console.error('⚠️ AgentsController - id_emploi invalide:', agentData.id_emploi);
                    } else {
                        const dateEntree = dateEntreeEmploiFonction || new Date().toISOString().slice(0, 10);

                        // Créer une nomination pour l'emploi avec un numéro unique
                        const currentYear = new Date().getFullYear();
                        const timestamp = Date.now();
                        const numeroNomination = `AUTO-EMPLOI-${agent.id}-${currentYear}-${timestamp}`;
                        const nominationQuery = `
                            INSERT INTO nominations (id_agent, type_nomination, nature, numero, date_signature, statut)
                            VALUES ($1, 'emploi', 'Initiale', $2, CURRENT_DATE, 'active')
                            RETURNING id
                        `;
                        const nominationResult = await pool.query(nominationQuery, [agent.id, numeroNomination]);
                        const idNomination = nominationResult.rows[0].id;

                        await pool.query(
                            `INSERT INTO emploi_agents (id_agent, id_nomination, id_emploi, date_entree, designation_poste)
                             VALUES ($1, $2, $3, $4::DATE, $5)`, [agent.id, idNomination, idEmploi, dateEntree, null]
                        );
                        console.log(`✅ Emploi enregistré pour l'agent ${agent.id} (fonctionnaire) - id_emploi: ${idEmploi}, id_nomination: ${idNomination}`);
                    }
                } catch (err) {
                    console.error('⚠️ Erreur insertion emploi_agents (non bloquante):', err.message);
                    console.error('⚠️ Détails de l\'erreur:', err);
                }
            } else {
                if (idTypeAgent !== 1) {
                    console.log(`ℹ️ AgentsController - Agent non fonctionnaire (type: ${idTypeAgent}), emploi non enregistré`);
                } else if (!agentData.id_emploi) {
                    console.log(`ℹ️ AgentsController - Pas d'emploi fourni pour l'agent ${agent.id}`);
                }
            }

            // Enregistrer la fonction
            console.log(`🔍 AgentsController - Vérification id_fonction pour enregistrement:`, {
                id_fonction: agentData.id_fonction,
                id_fonction_type: typeof agentData.id_fonction,
                id_fonction_truthy: !!agentData.id_fonction
            });

            if (agentData.id_fonction) {
                try {
                    // Convertir en entier si nécessaire
                    const idFonction = parseInt(agentData.id_fonction, 10);
                    if (isNaN(idFonction)) {
                        console.error('⚠️ AgentsController - id_fonction invalide:', agentData.id_fonction);
                    } else {
                        const dateEntree = dateEntreeEmploiFonction || new Date().toISOString().slice(0, 10);

                        // Créer une nomination pour la fonction avec un numéro unique
                        const currentYear = new Date().getFullYear();
                        const timestamp = Date.now();
                        const numeroNomination = `AUTO-FONCTION-${agent.id}-${currentYear}-${timestamp}`;
                        const nominationQuery = `
                            INSERT INTO nominations (id_agent, type_nomination, nature, numero, date_signature, statut)
                            VALUES ($1, 'fonction', 'Initiale', $2, CURRENT_DATE, 'active')
                            RETURNING id
                        `;
                        const nominationResult = await pool.query(nominationQuery, [agent.id, numeroNomination]);
                        const idNomination = nominationResult.rows[0].id;

                        await pool.query(
                            `INSERT INTO fonction_agents (id_agent, id_nomination, id_fonction, date_entree, designation_poste)
                             VALUES ($1, $2, $3, $4::DATE, $5)`, [agent.id, idNomination, idFonction, dateEntree, null]
                        );
                        console.log(`✅ Fonction enregistrée pour l'agent ${agent.id} - id_fonction: ${idFonction}, id_nomination: ${idNomination}`);
                    }
                } catch (err) {
                    console.error('⚠️ Erreur insertion fonction_agents (non bloquante):', err.message);
                    console.error('⚠️ Détails de l\'erreur:', err);
                }
            } else {
                console.log(`ℹ️ AgentsController - Pas de fonction fournie pour l'agent ${agent.id}`);
            }

            // Remplir les tables de liaison grade / échelon / catégorie (historique carrière)
            const dateEntreeCarriere = filteredAgentData.date_prise_service_au_ministere || filteredAgentData.date_embauche || new Date().toISOString().slice(0, 10);
            if (filteredAgentData.id_grade) {
                try {
                    await pool.query(
                        `INSERT INTO grades_agents (id_agent, id_grade, id_nomination, date_entree, date_sortie)
                         VALUES ($1, $2, NULL, $3::DATE, NULL)
                         ON CONFLICT (id_agent, id_grade, date_entree) DO NOTHING`, [agent.id, filteredAgentData.id_grade, dateEntreeCarriere]
                    );
                    console.log(`✅ Grade enregistré dans grades_agents pour l'agent ${agent.id}`);
                } catch (err) {
                    console.error('⚠️ Erreur insertion grades_agents (non bloquante):', err.message);
                }
            }
            if (filteredAgentData.id_echelon) {
                try {
                    await pool.query(
                        `INSERT INTO echelons_agents (id_agent, id_echelon, id_nomination, date_entree, date_sortie)
                         VALUES ($1, $2, NULL, $3::DATE, NULL)
                         ON CONFLICT (id_agent, id_echelon, date_entree) DO NOTHING`, [agent.id, filteredAgentData.id_echelon, dateEntreeCarriere]
                    );
                    console.log(`✅ Échelon enregistré dans echelons_agents pour l'agent ${agent.id}`);
                } catch (err) {
                    console.error('⚠️ Erreur insertion echelons_agents (non bloquante):', err.message);
                }
            }
            if (filteredAgentData.id_categorie) {
                try {
                    await pool.query(
                        `INSERT INTO categories_agents (id_agent, id_categorie, id_nomination, date_entree, date_sortie)
                         VALUES ($1, $2, NULL, $3::DATE, NULL)
                         ON CONFLICT (id_agent, id_categorie, date_entree) DO NOTHING`, [agent.id, filteredAgentData.id_categorie, dateEntreeCarriere]
                    );
                    console.log(`✅ Catégorie enregistrée dans categories_agents pour l'agent ${agent.id}`);
                } catch (err) {
                    console.error('⚠️ Erreur insertion categories_agents (non bloquante):', err.message);
                }
            }

            // Gérer les fichiers uploadés
            if (files) {
                await this.handleUploadedFiles(agent.id, files);
            }

            // Gérer les diplômes
            if (diplomes && Array.isArray(diplomes) && diplomes.length > 0) {
                await this.handleAgentDiplomes(agent.id, diplomes, files);
            }

            // Gérer les documents dynamiques
            console.log('🔍 DEBUG DOCUMENTS DYNAMIQUES (CREATE):');
            console.log('🔍 agentData.keys:', Object.keys(agentData));
            console.log('🔍 agentData.documents:', agentData.documents);
            console.log('🔍 typeof agentData.documents:', typeof agentData.documents);

            // Extraire les documents dynamiques du corps de la requête
            let documentsArray = null;
            if (agentData.documents) {
                try {
                    documentsArray = typeof agentData.documents === 'string' ? JSON.parse(agentData.documents) : agentData.documents;
                } catch (error) {
                    console.log('⚠️ Erreur lors du parsing des documents:', error);
                    documentsArray = agentData.documents;
                }
            }

            console.log('🔍 documentsArray après extraction:', documentsArray);

            if (documentsArray && Array.isArray(documentsArray) && documentsArray.length > 0) {
                console.log('📄 Création des documents dynamiques pour l\'agent:', agent.id);
                console.log('📄 Nombre de documents à traiter:', documentsArray.length);
                await this.handleDynamicDocuments(agent.id, documentsArray, files);
            }

            // Insérer les enfants s'il y en a
            if (enfants && Array.isArray(enfants) && enfants.length > 0) {
                // Filtrer les enfants avec des données valides
                const enfantsValides = enfants.filter(enfant =>
                    enfant.nom &&
                    enfant.prenom &&
                    enfant.sexe &&
                    (enfant.sexe === 'M' || enfant.sexe === 'F') &&
                    enfant.date_de_naissance
                );

                console.log(`👶 Enfants reçus: ${enfants.length}, Enfants valides: ${enfantsValides.length}`);

                for (const enfant of enfantsValides) {
                    // Exclure lieu_de_naissance et autres champs non valides de la table enfants
                    // IMPORTANT: Renommer 'id' en 'enfantId' pour éviter toute confusion
                    const { lieu_de_naissance, id: enfantId, ...enfantSansChampsInvalides } = enfant;
                    const enfantData = {
                        ...enfantSansChampsInvalides,
                        id_agent: agent.id, // Utiliser l'ID de l'agent créé (pas depuis l'enfant)
                        nom: enfant.nom,
                        prenom: enfant.prenom,
                        sexe: enfant.sexe,
                        date_de_naissance: enfant.date_de_naissance,
                        scolarise: enfant.scolarise !== null && enfant.scolarise !== undefined ? Boolean(enfant.scolarise) : false,
                        ayant_droit: enfant.ayant_droit !== null && enfant.ayant_droit !== undefined ? Boolean(enfant.ayant_droit) : false
                    };

                    // S'assurer que id_agent est toujours défini
                    if (!enfantData.id_agent) {
                        console.error(`❌ create - id_agent manquant pour enfant, agent.id: ${agent.id}`);
                        throw new Error('ID agent manquant lors de la création de l\'enfant');
                    }
                    console.log(`🔍 create - Création enfant avec id_agent: ${enfantData.id_agent} (agent.id: ${agent.id})`, {
                        nom: enfantData.nom,
                        prenom: enfantData.prenom,
                        id_agent: enfantData.id_agent
                    });

                    const enfantColumns = Object.keys(enfantData);
                    const enfantValues = Object.values(enfantData);
                    const enfantPlaceholders = enfantColumns.map((_, index) => `$${index + 1}`).join(', ');

                    const enfantQuery = `
                        INSERT INTO enfants (${enfantColumns.join(', ')}, created_at, updated_at)
                        VALUES (${enfantPlaceholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `;

                    await pool.query(enfantQuery, enfantValues);
                }

                // Mettre à jour le nombre d'enfants avec le nombre saisi par l'utilisateur (pas le nombre d'enfants valides)
                // L'utilisateur peut saisir 3 enfants mais n'en renseigner qu'un seul, le nombre sera 3
                const nombreEnfantSaisi = agentData.nombre_enfant !== null && agentData.nombre_enfant !== undefined ?
                    parseInt(agentData.nombre_enfant) :
                    enfantsValides.length;
                await pool.query(
                    'UPDATE agents SET nombre_enfant = $1 WHERE id = $2', [nombreEnfantSaisi, agent.id]
                );
            }

            // Gérer les langues de l'agent
            if (agentData.agent_langues !== undefined) {
                console.log('🌍 Création des langues pour l\'agent:', agent.id);
                console.log('🔍 DEBUG LANGUES CREATE - agentData.agent_langues:', agentData.agent_langues);
                console.log('🔍 DEBUG LANGUES CREATE - typeof:', typeof agentData.agent_langues);

                // Parser les langues si c'est une string
                let languesArray = agentData.agent_langues;
                if (typeof agentData.agent_langues === 'string') {
                    // Détecter le cas spécial "[object Object],[object Object]"
                    if (agentData.agent_langues.includes('[object Object]')) {
                        console.log('🔍 DEBUG LANGUES CREATE - Détection du cas spécial [object Object]');
                        // Dans ce cas, on ignore les données car elles sont corrompues
                        languesArray = [];
                    } else {
                        try {
                            languesArray = JSON.parse(agentData.agent_langues);
                            console.log('🔍 DEBUG LANGUES CREATE - Après parsing:', languesArray);
                        } catch (error) {
                            console.error('❌ Erreur lors du parsing des langues:', error);
                            languesArray = [];
                        }
                    }
                }

                if (languesArray && Array.isArray(languesArray) && languesArray.length > 0) {
                    console.log('🌍 Ajout des langues:', languesArray);
                    await this.handleAgentLangues(agent.id, languesArray);
                } else {
                    console.log('🌍 Aucune langue à ajouter (tableau vide ou invalide)');
                }
            }

            // Gérer les logiciels de l'agent
            if (agentData.agent_logiciels !== undefined) {
                console.log('💻 Création des logiciels pour l\'agent:', agent.id);
                console.log('🔍 DEBUG LOGICIELS CREATE - agentData.agent_logiciels:', agentData.agent_logiciels);
                console.log('🔍 DEBUG LOGICIELS CREATE - typeof:', typeof agentData.agent_logiciels);

                // Parser les logiciels si c'est une string
                let logicielsArray = agentData.agent_logiciels;
                if (typeof agentData.agent_logiciels === 'string') {
                    // Détecter le cas spécial "[object Object],[object Object]"
                    if (agentData.agent_logiciels.includes('[object Object]')) {
                        console.log('🔍 DEBUG LOGICIELS CREATE - Détection du cas spécial [object Object]');
                        // Dans ce cas, on ignore les données car elles sont corrompues
                        logicielsArray = [];
                    } else {
                        try {
                            logicielsArray = JSON.parse(agentData.agent_logiciels);
                            console.log('🔍 DEBUG LOGICIELS CREATE - Après parsing:', logicielsArray);
                        } catch (error) {
                            console.error('❌ Erreur lors du parsing des logiciels:', error);
                            logicielsArray = [];
                        }
                    }
                }

                if (logicielsArray && Array.isArray(logicielsArray) && logicielsArray.length > 0) {
                    console.log('💻 Ajout des logiciels:', logicielsArray);
                    await this.handleAgentLogiciels(agent.id, logicielsArray);
                } else {
                    console.log('💻 Aucun logiciel à ajouter (tableau vide ou invalide)');
                }
            }


            // Créer automatiquement un compte utilisateur pour l'agent
            let userCreated = false;
            let userError = null;
            let finalUsername = null;
            let tempPassword = null;

            console.log(`🔗 [CREATE AGENT] Début de la création du compte utilisateur pour l'agent ID: ${agent.id}`);

            try {
                // Récupérer l'ID du rôle approprié
                console.log(`🔍 [CREATE AGENT] Recherche du rôle: ${roleToAssign}`);
                const roleResult = await pool.query('SELECT id FROM roles WHERE nom = $1', [roleToAssign]);
                if (roleResult.rows.length === 0) {
                    throw new Error(`Rôle "${roleToAssign}" non trouvé dans la base de données`);
                }
                const selectedRoleId = roleResult.rows[0].id;
                console.log(`✅ [CREATE AGENT] Rôle trouvé: ${roleToAssign} (ID: ${selectedRoleId})`);

                // Vérifier que l'agent a un matricule (obligatoire pour créer le compte)
                if (!agent.matricule || agent.matricule.trim() === '') {
                    throw new Error('Impossible de créer le compte utilisateur : l\'agent doit avoir un matricule');
                }

                // Le nom d'utilisateur est le matricule de l'agent
                finalUsername = agent.matricule.trim();
                console.log(`📝 [CREATE AGENT] Username (matricule): ${finalUsername}`);

                // Vérifier l'unicité du nom d'utilisateur (matricule)
                const checkUsername = await pool.query('SELECT id FROM utilisateurs WHERE username = $1', [finalUsername]);
                if (checkUsername.rows.length > 0) {
                    throw new Error(`Le matricule ${finalUsername} est déjà utilisé comme nom d'utilisateur`);
                }
                console.log(`✅ [CREATE AGENT] Username disponible: ${finalUsername}`);

                // Vérifier que l'agent a une date de naissance (obligatoire pour générer le mot de passe)
                if (!agent.date_de_naissance) {
                    throw new Error('Impossible de créer le compte utilisateur : l\'agent doit avoir une date de naissance');
                }
                console.log(`✅ [CREATE AGENT] Date de naissance présente: ${agent.date_de_naissance}`);

                // Générer le mot de passe : nom + année de naissance
                // Normaliser le nom (enlever accents, espaces, caractères spéciaux)
                const normalizeName = (name) => {
                    return name.toLowerCase()
                        .replace(/[àáâãäå]/g, 'a')
                        .replace(/[èéêë]/g, 'e')
                        .replace(/[ìíîï]/g, 'i')
                        .replace(/[òóôõö]/g, 'o')
                        .replace(/[ùúûü]/g, 'u')
                        .replace(/[ç]/g, 'c')
                        .replace(/[^a-z0-9]/g, ''); // Supprimer tout sauf lettres et chiffres
                };

                const cleanNom = normalizeName(agent.nom);

                // Extraire l'année de naissance
                const dateNaissance = new Date(agent.date_de_naissance);
                const anneeNaissance = dateNaissance.getFullYear();

                // Mot de passe = nom + année de naissance
                tempPassword = cleanNom + anneeNaissance;

                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

                // Créer le compte utilisateur
                const userQuery = `
                    INSERT INTO utilisateurs (username, email, password_hash, id_role, id_agent, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, username, email
                `;

                console.log(`🔗 Création du compte utilisateur pour l'agent ID: ${agent.id}, Nom: ${agent.nom} ${agent.prenom}`);
                console.log(`📝 Username (matricule): ${finalUsername}`);
                console.log(`🔑 Mot de passe: ${tempPassword} (nom + année de naissance)`);

                const userResult = await pool.query(userQuery, [
                    finalUsername, // username = matricule
                    agent.email || `${finalUsername}@agent.local`, // email ou email par défaut
                    passwordHash,
                    selectedRoleId, // Rôle déterminé par la logique
                    agent.id, // ID de l'agent créé
                    true
                ]);

                if (userResult.rows.length > 0) {
                    userCreated = true;
                    console.log(`✅ Compte utilisateur créé pour l'agent ${agent.nom} ${agent.prenom} (ID: ${userResult.rows[0].id})`);
                    console.log(`🔗 Liaison agent-utilisateur: Agent ID ${agent.id} → Utilisateur ID ${userResult.rows[0].id}`);
                    console.log(`📝 Username: ${finalUsername} (matricule)`);
                    console.log(`🔑 Mot de passe: ${tempPassword} (nom + année de naissance)`);
                    console.log(`🎭 Rôle assigné: ${roleToAssign}`);
                }
            } catch (userCreationError) {
                console.error('❌ [CREATE AGENT] Erreur lors de la création du compte utilisateur:', userCreationError);
                console.error('❌ [CREATE AGENT] Stack trace:', userCreationError.stack);
                userError = userCreationError.message;
                // Ne pas faire échouer la création de l'agent si la création du compte échoue
                // Mais logger l'erreur pour diagnostic
            }

            // ASSIGNATION AUTOMATIQUE DES RESPONSABILITÉS
            try {
                // Assigner comme responsable du ministère si c'est le premier agent du ministère
                if (isResponsableMinistere) {
                    await pool.query(
                        'UPDATE ministeres SET responsable_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [agent.id, agentData.id_ministere]
                    );
                    console.log(`🏛️ RESPONSABLE MINISTÈRE: ${agent.nom} ${agent.prenom} assigné comme responsable du ministère ${agentData.id_ministere}`);
                }

                // Assigner comme responsable de l'entité si c'est le premier agent de l'entité
                if (isResponsableEntite) {
                    await pool.query(
                        'UPDATE entites_administratives SET responsable_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [agent.id, agentData.id_entite_principale]
                    );
                    console.log(`🏢 RESPONSABLE ENTITÉ: ${agent.nom} ${agent.prenom} assigné comme responsable de l'entité ${agentData.id_entite_principale}`);
                }
            } catch (responsableError) {
                console.error('Erreur lors de l\'assignation des responsabilités:', responsableError);
                // Ne pas faire échouer la création de l'agent si l'assignation des responsabilités échoue
            }

            // Générer et envoyer le code de connexion par email
            let emailResult = null;
            if (agent.email) {
                try {
                    // Générer un code de connexion
                    const loginCode = authCodeService.generateLoginCode();

                    // Sauvegarder le code en base
                    await authCodeService.saveLoginCode(agent.id, loginCode);

                    // Envoyer l'email avec les informations de connexion
                    const agentWithUsername = {...agent,
                        username: userCreated ? finalUsername : null
                    };
                    emailResult = await emailService.sendWelcomeEmail(agentWithUsername, loginCode, userCreated ? tempPassword : null);

                    if (emailResult.success) {
                        console.log(`✅ Email de bienvenue envoyé à ${agent.email} pour l'agent ${agent.nom} ${agent.prenom}`);
                    } else {
                        console.error(`❌ Échec envoi email à ${agent.email}:`, emailResult.error);
                    }
                } catch (emailError) {
                    console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', emailError);
                    // Ne pas faire échouer la création de l'agent si l'email échoue
                }
            } else {
                console.log(`⚠️ Aucun email fourni pour l'agent ${agent.nom} ${agent.prenom}, code de connexion non envoyé`);
            }

            // Générer automatiquement la note de service pour l'agent
            let noteDeServiceResult = null;
            try {
                console.log(`📄 Génération automatique de la note de service pour l'agent ${agent.id}...`);

                // Récupérer les informations complètes de l'agent avec grade et échelon
                const agentFullQuery = `
                    SELECT a.*, 
                           c.libele as civilite,
                           s.libelle as service_nom,
                           s.libelle as direction_nom,
                           d.libelle as direction_libelle,
                           m.nom as ministere_nom,
                           m.sigle as ministere_sigle,
                           cat.libele as categorie_libele,
                           COALESCE(a.date_embauche, a.date_prise_service_au_ministere) as grade_date_entree,
                           COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                           ech_actuelle.echelon_libele as echelon_libele
                    FROM agents a
                    LEFT JOIN civilites c ON a.id_civilite = c.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN directions d ON a.id_direction = d.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN categories cat ON a.id_categorie = cat.id
                    LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                    LEFT JOIN (
                        SELECT DISTINCT ON (ga.id_agent)
                            ga.id_agent,
                            g.libele as grade_libele
                        FROM grades_agents ga
                        LEFT JOIN grades g ON ga.id_grade = g.id
                        ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                    ) ga_actuelle ON a.id = ga_actuelle.id_agent
                    LEFT JOIN (
                        SELECT DISTINCT ON (ea.id_agent)
                            ea.id_agent,
                            e.libele as echelon_libele
                        FROM echelons_agents ea
                        LEFT JOIN echelons e ON ea.id_echelon = e.id
                        ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                    ) ech_actuelle ON a.id = ech_actuelle.id_agent
                    WHERE a.id = $1
                `;

                const agentFullResult = await pool.query(agentFullQuery, [agent.id]);
                const agentFull = agentFullResult.rows[0];

                if (!agentFull) {
                    throw new Error(`Agent ${agent.id} non trouvé après création`);
                }

                console.log(`✅ [CREATE AGENT] Agent complet récupéré pour génération de la note de service: ${agentFull.nom} ${agentFull.prenom}`);

                // Récupérer le validateur (DRH ou utilisateur connecté)
                let validateur = null;
                if (req.user && req.user.id_agent) {
                    const validateurQuery = `
                        SELECT a.*, 
                               c.libele as civilite,
                               s.libelle as direction_nom,
                               m.nom as ministere_nom,
                               m.sigle as ministere_sigle
                        FROM agents a
                        LEFT JOIN civilites c ON a.id_civilite = c.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        WHERE a.id = $1
                    `;
                    const validateurResult = await pool.query(validateurQuery, [req.user.id_agent]);
                    if (validateurResult.rows.length > 0) {
                        validateur = validateurResult.rows[0];
                    }
                }

                // Si pas de validateur, utiliser un validateur par défaut
                if (!validateur) {
                    console.warn('⚠️ [CREATE AGENT] Validateur (utilisateur connecté) non trouvé pour la génération de la note de service.');
                    // Chercher un DRH du même ministère comme validateur
                    const drhQuery = `
                        SELECT a.*, 
                               c.libele as civilite,
                               s.libelle as direction_nom,
                               m.nom as ministere_nom,
                               m.sigle as ministere_sigle
                        FROM agents a
                        LEFT JOIN utilisateurs u ON a.id = u.id_agent
                        LEFT JOIN roles r ON u.id_role = r.id
                        LEFT JOIN civilites c ON a.id_civilite = c.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        WHERE a.id_ministere = $1
                        AND (r.nom = 'DRH' OR r.nom = 'drh')
                        AND a.statut_emploi = 'actif'
                        LIMIT 1
                    `;
                    const drhResult = await pool.query(drhQuery, [agentFull.id_ministere]);

                    if (drhResult.rows.length > 0) {
                        validateur = drhResult.rows[0];
                        console.log(`✅ [CREATE AGENT] DRH trouvé pour le ministère: ${validateur.prenom} ${validateur.nom}`);
                    } else {
                        // Utiliser l'agent créé comme validateur si aucun DRH trouvé
                        validateur = {
                            id: agentFull.id,
                            prenom: agentFull.prenom || 'DRH',
                            nom: agentFull.nom || 'Ministère',
                            email: agentFull.email || 'drh@ministere.ci',
                            fonction_actuelle: agentFull.fonction_actuelle || 'Administrateur Système',
                            ministere_nom: agentFull.ministere_nom || 'Ministère de la Fonction Publique',
                            ministere_sigle: agentFull.ministere_sigle || 'MFP',
                            direction_nom: agentFull.direction_nom || 'Direction des Ressources Humaines',
                            civilite: agentFull.civilite || 'M.'
                        };
                        console.log(`⚠️ [CREATE AGENT] Aucun DRH trouvé, utilisation de l'agent créé comme validateur`);
                    }
                }

                // Préparer les options
                const options = {
                    date_effet: agentFull.date_embauche || agentFull.date_prise_service_au_ministere || new Date(),
                    date_generation: new Date(),
                    date_echelon: agentFull.grade_date_entree
                };

                console.log(`📄 [CREATE AGENT] Génération de la note de service avec validateur: ${validateur.prenom} ${validateur.nom}`);

                // Utiliser la DRH comme signataire (signature, nom, "Le Directeur")
                const { fetchDRHForSignature, attachActiveSignature } = require('../services/utils/signatureUtils');
                const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');
                const drh = await fetchDRHForSignature(agentFull.id_direction, agentFull.id_ministere);
                if (drh) {
                    Object.assign(validateur, drh);
                    validateur.signatureRoleOverride = 'Le Directeur';
                }

                // Utiliser la méthode generateNoteService qui fait tout automatiquement
                const DocumentGenerationService = require('../services/DocumentGenerationService');
                const generatedNote = await DocumentGenerationService.generateNoteService(agentFull, validateur, options);

                // Générer le PDF après la création du document
                // Utiliser MemoryPDFService qui a la méthode generateNoteDeServicePDFBuffer
                const MemoryPDFService = require('../services/MemoryPDFService');
                const fs = require('fs');
                const path = require('path');

                // S'assurer que le validateur a sa signature attachée
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                let pdfPath = null;
                try {
                    // Générer le PDF en mémoire
                    const pdfBuffer = await MemoryPDFService.generateNoteDeServicePDFBuffer(agentFull, validateur, {
                        ...options,
                        document_id: generatedNote.id,
                        numero_document: generatedNote.numero_document
                    });

                    // Créer un nom de fichier unique
                    const timestamp = Date.now();
                    const fileName = `note_de_service_${agentFull.id}_${timestamp}.pdf`;
                    const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');

                    // Créer le répertoire s'il n'existe pas
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }

                    // Sauvegarder le PDF
                    const filePath = path.join(uploadsDir, fileName);
                    fs.writeFileSync(filePath, pdfBuffer);

                    // Chemin relatif pour la base de données
                    pdfPath = `uploads/documents/${fileName}`;

                    // Mettre à jour le document avec le chemin du PDF
                    await pool.query(
                        'UPDATE documents_autorisation SET chemin_fichier = $1 WHERE id = $2', [pdfPath, generatedNote.id]
                    );

                    console.log(`✅ [CREATE AGENT] PDF généré pour la note de service: ${pdfPath}`);
                } catch (pdfError) {
                    console.error('❌ [CREATE AGENT] Erreur lors de la génération du PDF:', pdfError);
                    // Ne pas faire échouer la création de la note de service si le PDF échoue
                    pdfPath = null;
                }

                noteDeServiceResult = {
                    success: true,
                    document_id: generatedNote.id,
                    pdf_path: pdfPath,
                    numero_document: generatedNote.numero_document
                };

                console.log(`✅ [CREATE AGENT] Note de service générée automatiquement pour l'agent ${agent.id} (Document ID: ${generatedNote.id})`);
            } catch (noteError) {
                console.error('❌ [CREATE AGENT] Erreur lors de la génération automatique de la note de service:', noteError);
                console.error('❌ [CREATE AGENT] Message:', noteError.message);
                console.error('❌ [CREATE AGENT] Stack trace:', noteError.stack);
                noteDeServiceResult = {
                    success: false,
                    error: noteError.message,
                    stack: process.env.NODE_ENV === 'development' ? noteError.stack : undefined
                };
                // Ne pas faire échouer la création de l'agent si la génération de la note échoue
                // Mais logger l'erreur pour diagnostic
            }

            // Retourner la réponse avec les informations sur l'email, le compte utilisateur, les responsabilités et la note de service
            res.status(201).json({
                ...agent,
                username: userCreated ? finalUsername : null,
                userCreated: userCreated,
                userError: userError,
                roleAssigned: roleToAssign,
                isResponsableMinistere: isResponsableMinistere,
                isResponsableEntite: isResponsableEntite,
                emailSent: emailResult ? emailResult.success : false,
                emailError: emailResult && !emailResult.success ? emailResult.error : null,
                noteDeService: noteDeServiceResult
            });
        } catch (error) {
            console.error('Erreur lors de la création de l\'agent:', error);

            if (error.code === '23505') {
                res.status(400).json({
                    error: 'Cette valeur existe déjà'
                });
            } else if (error.code === '23502') {
                res.status(400).json({
                    error: 'Tous les champs obligatoires doivent être remplis'
                });
            } else if (error.message && error.message.includes('Type de fichier non autorisé')) {
                res.status(400).json({
                    error: 'Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT'
                });
            } else {
                res.status(500).json({
                    error: 'Erreur interne du serveur',
                    details: error.message
                });
            }
        }
    }

    // Mettre à jour un agent
    async update(req, res) {
        try {
            const {
                id
            } = req.params;
            const data = req.body;
            const files = req.files;

            console.log('🔍 ===== DÉBUT MISE À JOUR AGENT =====');
            console.log('🔍 Agent ID:', id);
            console.log('🔍 Données reçues pour mise à jour d\'agent:', data);
            console.log('📁 Fichiers reçus pour mise à jour:', files);
            console.log('🔍 Type de data.diplomes:', typeof data.diplomes);
            console.log('🔍 Contenu de data.diplomes:', data.diplomes);
            console.log('🔍 ===== VÉRIFICATION ENFANTS =====');
            console.log('🔍 data.enfants existe:', 'enfants' in data);
            console.log('🔍 data.enfants valeur:', data.enfants);
            console.log('🔍 data.enfants type:', typeof data.enfants);
            console.log('🔍 data.nombre_enfant:', data.nombre_enfant);
            console.log('🔍 Toutes les clés de data:', Object.keys(data));
            // Vérifier aussi req.body directement
            console.log('🔍 req.body.enfants:', req.body ? req.body.enfants : 'Aucun');
            console.log('🔍 req.body.nombre_enfant:', req.body ? req.body.nombre_enfant : 'Aucun');

            // Logs d'erreurs détaillés
            console.log('🚨 ===== DIAGNOSTIC ERREURS =====');
            console.log('🚨 req.method:', req.method);
            console.log('🚨 req.headers.content-type:', req.headers['content-type']);
            console.log('🚨 req.body existe:', !!req.body);
            console.log('🚨 req.files existe:', !!req.files);
            console.log('🚨 req.files type:', typeof req.files);
            console.log('🚨 req.files keys:', req.files ? Object.keys(req.files) : 'Aucun');

            if (req.files) {
                Object.keys(req.files).forEach(key => {
                    console.log(`🚨 Fichier ${key}:`, req.files[key]);
                });
            } else {
                console.log('🚨 AUCUN FICHIER REÇU - PROBLÈME IDENTIFIÉ !');
            }

            // DIAGNOSTIC DÉTAILLÉ DES FICHIERS
            if (files) {
                console.log('📁 === DIAGNOSTIC FICHIERS DÉTAILLÉ ===');
                console.log('📁 Nombre de champs de fichiers:', Object.keys(files).length);
                console.log('📁 Champs disponibles:', Object.keys(files));

                Object.keys(files).forEach(fieldName => {
                    const fieldFiles = files[fieldName];
                    console.log(`📁 Champ "${fieldName}":`);
                    console.log(`   - Type: ${typeof fieldFiles}`);
                    console.log(`   - Is Array: ${Array.isArray(fieldFiles)}`);
                    if (Array.isArray(fieldFiles)) {
                        console.log(`   - Longueur: ${fieldFiles.length}`);
                        fieldFiles.forEach((file, index) => {
                            console.log(`   - [${index}] ${file.originalname} (${file.fieldname})`);
                        });
                    } else if (fieldFiles) {
                        console.log(`   - Fichier unique: ${fieldFiles.originalname} (${fieldFiles.fieldname})`);
                    }
                });
            } else {
                console.log('❌ AUCUN FICHIER REÇU DANS LA REQUÊTE');
            }

            // Debug détaillé des fichiers
            if (files) {
                console.log('🔍 DEBUG FICHIERS - Structure complète des fichiers:');
                console.log('🔍 DEBUG FICHIERS - Object.keys(files):', Object.keys(files));
                Object.keys(files).forEach(key => {
                    console.log(`   - ${key}:`, files[key]);
                    if (Array.isArray(files[key])) {
                        files[key].forEach((file, index) => {
                            console.log(`     [${index}] fieldname: ${file.fieldname}, originalname: ${file.originalname}, filename: ${file.filename}`);
                        });
                    }
                });

                // Vérifier spécifiquement les champs de diplômes
                console.log('🔍 DEBUG FICHIERS - Vérification des champs de diplômes:');
                console.log('   - files.diplome_documents:', files.diplome_documents);
                console.log('   - files.diplomes:', files.diplomes);
                console.log('   - files.diplome:', files.diplome);
                console.log('   - files.document_diplome:', files.document_diplome);
                console.log('   - files.document_diplomes:', files.document_diplomes);
            } else {
                console.log('❌ Aucun fichier reçu dans la requête');
            }

            // Extraire enfants et diplomes AVANT de destructurer pour éviter les problèmes
            let enfants = data.enfants;
            let diplomes = data.diplomes;
            const nombre_enfant = data.nombre_enfant;

            // Parser les enfants si c'est une string (venant de FormData)
            if (enfants !== undefined) {
                if (typeof enfants === 'string') {
                    try {
                        enfants = JSON.parse(enfants);
                        console.log('🔍 Enfants parsés depuis string:', enfants);
                    } catch (error) {
                        console.error('❌ Erreur lors du parsing des enfants (string):', error);
                        console.error('❌ Contenu de la string enfants:', enfants);
                        enfants = [];
                    }
                }
                console.log('🔍 Enfants après parsing:', enfants);
                console.log('🔍 Type de enfants:', typeof enfants);
                console.log('🔍 Est un array:', Array.isArray(enfants));
                if (Array.isArray(enfants)) {
                    console.log('🔍 Nombre d\'enfants dans le array:', enfants.length);
                    enfants.forEach((enfant, index) => {
                        console.log(`🔍 Enfant ${index}:`, enfant);
                    });
                }
            } else {
                console.log('⚠️ enfants est undefined dans data');
            }

            const {
                enfants: _enfants,
                diplomes: _diplomes,
                nombre_enfant: _nombre_enfant,
                ...agentData
            } = data;

            // Conserver nombre_enfant pour l'utiliser plus tard lors de la mise à jour
            const nombreEnfantSaisi = nombre_enfant;

            // S'assurer que nombre_enfant est inclus dans agentData pour la mise à jour principale
            // Cela garantit qu'il sera mis à jour même si on ne modifie pas la liste des enfants
            if (nombre_enfant !== undefined) {
                agentData.nombre_enfant = nombre_enfant;
            }

            // Parser les diplômes si c'est une string
            let diplomesArray = diplomes;
            if (typeof diplomes === 'string') {
                try {
                    diplomesArray = JSON.parse(diplomes);
                } catch (error) {
                    console.error('Erreur lors du parsing des diplômes:', error);
                    diplomesArray = [];
                }
            }

            // Parser agent_langues et agent_logiciels si ce sont des strings (venant de FormData)
            if (agentData.agent_langues !== undefined && typeof agentData.agent_langues === 'string') {
                try {
                    if (!agentData.agent_langues.includes('[object Object]')) {
                        agentData.agent_langues = JSON.parse(agentData.agent_langues);
                        console.log('🔍 agent_langues parsés depuis string:', agentData.agent_langues?.length);
                    } else {
                        agentData.agent_langues = [];
                    }
                } catch (e) {
                    console.error('Erreur parsing agent_langues:', e);
                    agentData.agent_langues = [];
                }
            }
            if (agentData.agent_logiciels !== undefined && typeof agentData.agent_logiciels === 'string') {
                try {
                    if (!agentData.agent_logiciels.includes('[object Object]')) {
                        agentData.agent_logiciels = JSON.parse(agentData.agent_logiciels);
                        console.log('🔍 agent_logiciels parsés depuis string:', agentData.agent_logiciels?.length);
                    } else {
                        agentData.agent_logiciels = [];
                    }
                } catch (e) {
                    console.error('Erreur parsing agent_logiciels:', e);
                    agentData.agent_logiciels = [];
                }
            }

            // Vérifier si l'agent existe
            const checkAgent = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
            if (checkAgent.rows.length === 0) {
                return res.status(404).json({
                    error: 'Agent non trouvé'
                });
            }

            // Vérifier si le matricule existe déjà (sauf pour cet agent)
            if (agentData.matricule && agentData.matricule.trim() !== '') {
                const checkMatricule = await pool.query(
                    'SELECT id FROM agents WHERE matricule = $1 AND id != $2', [agentData.matricule.trim(), id]
                );
                if (checkMatricule.rows.length > 0) {
                    return res.status(400).json({
                        error: 'Ce matricule existe déjà',
                        field: 'matricule'
                    });
                }
            }

            // Vérifier si l'email existe déjà (sauf pour cet agent) si un email valide est fourni
            // Ne pas vérifier si l'email est vide, null ou undefined (sera converti en NULL)
            if (agentData.email &&
                typeof agentData.email === 'string' &&
                agentData.email.trim() !== '') {
                const trimmedEmail = agentData.email.trim();
                const checkEmail = await pool.query(
                    'SELECT id FROM agents WHERE email = $1 AND email IS NOT NULL AND email != \'\' AND id != $2', [trimmedEmail, id]
                );
                if (checkEmail.rows.length > 0) {
                    return res.status(400).json({
                        error: 'Cet email existe déjà',
                        field: 'email'
                    });
                }
            }

            // Si l'agent a une entité principale, récupérer automatiquement le ministère de cette entité
            if (agentData.id_entite_principale && !agentData.id_ministere) {
                const entiteQuery = await pool.query(
                    'SELECT id_ministere FROM entites_administratives WHERE id = $1', [agentData.id_entite_principale]
                );

                if (entiteQuery.rows.length > 0) {
                    agentData.id_ministere = entiteQuery.rows[0].id_ministere;
                    console.log(`Ministère automatiquement assigné à l'agent (mise à jour): ${agentData.id_ministere} (depuis l'entité ${agentData.id_entite_principale})`);
                }
            }

            // Calculer l'âge si la date de naissance a changé
            if (agentData.date_de_naissance) {
                const dateNaissance = new Date(agentData.date_de_naissance);
                const aujourdhui = new Date();
                let age = aujourdhui.getFullYear() - dateNaissance.getFullYear();
                const mois = aujourdhui.getMonth() - dateNaissance.getMonth();
                if (mois < 0 || (mois === 0 && aujourdhui.getDate() < dateNaissance.getDate())) {
                    age--;
                }
                agentData.age = age;
            }

            // Mapper les noms de champs du frontend vers les noms de colonnes de la DB
            // Convertir les chaînes vides en null pour éviter les erreurs de type integer

            // Log des données reçues pour id_sous_direction
            console.log('🔍 Backend - Vérification id_sous_direction avant mapping:', {
                id_sous_direction: agentData.id_sous_direction,
                sous_direction_id: agentData.sous_direction_id,
                id_sous_direction_type: typeof agentData.id_sous_direction,
                sous_direction_id_type: typeof agentData.sous_direction_id,
                id_sous_direction_undefined: agentData.id_sous_direction === undefined,
                sous_direction_id_undefined: agentData.sous_direction_id === undefined
            });

            // Gérer id_sous_direction (envoyé directement depuis le frontend)
            if (agentData.id_sous_direction !== undefined) {
                // Normaliser id_sous_direction : chaînes vides -> null
                const originalValue = agentData.id_sous_direction;
                const originalType = typeof agentData.id_sous_direction;

                // Si c'est une chaîne non vide, convertir en nombre
                if (typeof agentData.id_sous_direction === 'string' && agentData.id_sous_direction.trim() !== '') {
                    const numValue = Number(agentData.id_sous_direction);
                    agentData.id_sous_direction = isNaN(numValue) ? null : numValue;
                } else if (agentData.id_sous_direction === '' ||
                    agentData.id_sous_direction === null ||
                    agentData.id_sous_direction === 'null' ||
                    agentData.id_sous_direction === 'undefined') {
                    agentData.id_sous_direction = null;
                } else if (typeof agentData.id_sous_direction === 'number') {
                    // Déjà un nombre, garder tel quel
                    agentData.id_sous_direction = agentData.id_sous_direction;
                } else {
                    // Autre type, essayer de convertir en nombre
                    agentData.id_sous_direction = Number(agentData.id_sous_direction) || null;
                }

                console.log(`🔧 Backend - id_sous_direction normalisé: ${originalValue} (${originalType}) -> ${agentData.id_sous_direction} (${typeof agentData.id_sous_direction})`);
            }
            // Gérer sous_direction_id (variante du nom de champ)
            if (agentData.sous_direction_id !== undefined) {
                const originalValue = agentData.sous_direction_id;
                agentData.id_sous_direction = (agentData.sous_direction_id === '' ||
                        agentData.sous_direction_id === null ||
                        agentData.sous_direction_id === 'null' ||
                        agentData.sous_direction_id === 'undefined') ?
                    null :
                    Number(agentData.sous_direction_id) || null;
                delete agentData.sous_direction_id;
                console.log(`🔧 Backend - sous_direction_id mappé vers id_sous_direction: ${originalValue} -> ${agentData.id_sous_direction}`);
            }

            // Gérer service_id (envoyé directement depuis le frontend)
            if (agentData.service_id !== undefined) {
                const originalValue = agentData.service_id;
                agentData.id_service = (agentData.service_id === '' ||
                        agentData.service_id === null ||
                        agentData.service_id === 'null' ||
                        agentData.service_id === 'undefined') ?
                    null :
                    Number(agentData.service_id) || null;
                console.log(`🔧 Backend - service_id normalisé: ${originalValue} -> ${agentData.id_service}`);
            }

            // Filtrer les colonnes pour ne garder que celles de la table agents
            const allowedAgentColumns = [
                'id_civilite', 'id_situation_matrimoniale', 'id_nationalite', 'id_type_d_agent',
                'id_ministere', 'id_entite_principale', 'nom', 'prenom', 'matricule',
                'date_de_naissance', 'lieu_de_naissance', 'age', 'telephone1', 'telephone2', 'telephone3',
                'sexe', 'nom_de_la_mere', 'nom_du_pere', 'email', 'date_mariage',
                'nom_conjointe', 'prenom_conjointe', 'nombre_enfant', 'ad_pro_rue', 'ad_pro_ville', 'ad_pro_batiment',
                'ad_pri_rue', 'ad_pri_ville', 'ad_pri_batiment', 'statut_emploi',
                'date_embauche', 'date_prise_service_au_ministere', 'date_prise_service_dans_la_direction',
                'date_fin_contrat', 'id_pays', 'id_categorie',
                'id_grade', 'id_emploi', 'id_echelon', 'id_specialite', 'id_langue',
                'id_niveau_langue', 'id_motif_depart', 'id_type_conge', 'id_autre_absence',
                'id_distinction', 'id_type_etablissement', 'id_unite_administrative',
                'id_type_materiel', 'id_type_destination', 'id_nature_accident',
                'id_sanction', 'id_sindicat', 'id_type_courrier', 'id_nature_acte',
                'id_localite', 'id_mode_entree', 'id_position', 'id_direction_generale', 'id_direction', 'id_service', 'id_sous_direction',
                'date_retraite', 'situation_militaire', 'id_handicap', 'handicap_personnalise',
                'numero_cnps', 'date_declaration_cnps', 'numero_acte_mariage', 'date_delivrance_acte_mariage',
                'corps_prefectoral', 'grade_prefectoral', 'echelon_prefectoral'
            ];

            // Exclure les colonnes de timestamp qui sont gérées automatiquement
            const excludedColumns = ['created_at', 'updated_at', 'id', 'civilite_libele', 'nationalite_libele', 'type_agent_libele', 'situation_matrimoniale_libele', 'ministere_nom', 'fonction_libele', 'emploi_libele', 'grade_libele', 'echelon_libele', 'categorie_libele', 'service_libelle', 'mode_entree_libele', 'photos', 'documents', 'diplomes', 'fonctions_anterieures', 'emplois_anterieurs', 'stages', 'etudes_diplomes', 'langues', 'logiciels', 'existingFiles', 'nombre_diplomes', 'agent_langues', 'agent_logiciels', 'enfants'];

            // Gérer le handicap personnalisé
            if ((agentData.id_handicap === '14' || agentData.id_handicap === 14) && agentData.handicap_personnalise) {
                // Si "Autre" est sélectionné et qu'il y a un handicap personnalisé
                console.log('🔧 Gestion du handicap personnalisé (mise à jour):', agentData.handicap_personnalise);
                // Le handicap personnalisé sera sauvegardé dans la colonne handicap_personnalise
            } else if ((agentData.id_handicap === '14' || agentData.id_handicap === 14) && !agentData.handicap_personnalise) {
                // Si "Autre" est sélectionné mais pas de handicap personnalisé, mettre null
                agentData.handicap_personnalise = null;
            } else {
                // Si un autre handicap est sélectionné, effacer le handicap personnalisé
                agentData.handicap_personnalise = null;
            }

            // Liste des champs de type integer qui doivent être null si vides
            const integerFields = [
                'id_civilite', 'id_nationalite', 'id_type_d_agent', 'id_situation_matrimoniale',
                'id_entite_principale', 'id_ministere', 'id_direction_generale', 'id_direction', 'id_service', 'id_sous_direction',
                'id_fonction', 'id_emploi', 'id_grade', 'id_echelon', 'id_categorie', 'id_position',
                'id_handicap', 'id_pays', 'id_specialite', 'id_langue', 'id_niveau_langue',
                'id_motif_depart', 'id_type_conge', 'id_autre_absence', 'id_distinction',
                'id_type_etablissement', 'id_unite_administrative', 'id_type_materiel',
                'id_type_destination', 'id_nature_accident', 'id_sanction', 'id_sindicat',
                'id_type_courrier', 'id_nature_acte', 'id_localite', 'id_mode_entree',
                'nombre_enfant', 'salaire', 'age', 'grade_prefectoral', 'echelon_prefectoral'
            ];

            // Filtrer les données pour ne garder que les colonnes autorisées
            const filteredAgentData = {};
            Object.keys(agentData).forEach(key => {
                if (allowedAgentColumns.includes(key) && !excludedColumns.includes(key)) {
                    const value = agentData[key];

                    // Convertir les chaînes vides en null pour les champs de type integer
                    if (integerFields.includes(key)) {
                        if (value === '' || value === null || value === undefined || value === 'null' || value === 'undefined') {
                            filteredAgentData[key] = null;
                        } else {
                            // Convertir en nombre si c'est une chaîne numérique
                            if (typeof value === 'string') {
                                const trimmedValue = value.trim();
                                // Gérer le cas spécial de nombre_enfant : 0 est une valeur valide, ne pas convertir en null
                                if (key === 'nombre_enfant' && trimmedValue === '0') {
                                    filteredAgentData[key] = 0;
                                } else {
                                    const numValue = Number(trimmedValue);
                                    filteredAgentData[key] = isNaN(numValue) ? null : numValue;
                                }
                            } else if (typeof value === 'number') {
                                // Déjà un nombre, garder tel quel
                                filteredAgentData[key] = value;
                            } else {
                                // Autre type, essayer de convertir en nombre
                                // Gérer le cas spécial de nombre_enfant : 0 est une valeur valide
                                if (key === 'nombre_enfant') {
                                    const numValue = Number(value);
                                    // Pour nombre_enfant, 0 est une valeur valide, ne pas convertir en null
                                    filteredAgentData[key] = isNaN(numValue) ? null : numValue;
                                } else {
                                    filteredAgentData[key] = Number(value) || null;
                                }
                            }
                        }
                    }
                    // Gérer les champs de date vides et les chaînes vides
                    else if (['date_mariage', 'date_retraite', 'date_embauche', 'date_fin_contrat', 'date_de_naissance', 'date_declaration_cnps', 'date_prise_service_au_ministere', 'date_prise_service_dans_la_direction', 'date_delivrance_acte_mariage'].includes(key)) {
                        // Si c'est une chaîne vide ou null, on met null
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            filteredAgentData[key] = value;
                        }
                    } else if (key === 'statut_emploi') {
                        // Convertir le statut_emploi en minuscules pour respecter la contrainte de la base de données
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = 'actif'; // Valeur par défaut
                        } else {
                            filteredAgentData[key] = value.toLowerCase();
                        }
                    } else if (key === 'situation_militaire') {
                        // Normaliser les valeurs de situation militaire
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            // Normaliser vers les valeurs acceptées
                            const normalizedValue = value.toString().trim();
                            if (['Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné'].includes(normalizedValue)) {
                                filteredAgentData[key] = normalizedValue;
                            } else if (['EXEMPTÉ', 'RÉFORMÉ', 'BON POUR LE SERVICE', 'DISPENSÉ', 'NON CONCERNÉ'].includes(normalizedValue)) {
                                // Convertir les majuscules vers le format standard
                                const mapping = {
                                    'EXEMPTÉ': 'Exempté',
                                    'RÉFORMÉ': 'Réformé',
                                    'BON POUR LE SERVICE': 'Bon pour le service',
                                    'DISPENSÉ': 'Dispensé',
                                    'NON CONCERNÉ': 'Non concerné'
                                };
                                filteredAgentData[key] = mapping[normalizedValue];
                            } else {
                                // Valeur non reconnue, laisser telle quelle (sera rejetée par la contrainte)
                                filteredAgentData[key] = normalizedValue;
                            }
                        }
                    } else if (['numero_cnps', 'numero_cni', 'numero_passeport', 'numero_permis_conduire', 'numero_acte_mariage', 'nom_conjointe', 'prenom_conjointe'].includes(key)) {
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            filteredAgentData[key] = typeof value === 'string' ? value.trim() : value;
                        }
                    } else if (key === 'email') {
                        // Convertir les chaînes vides en NULL pour éviter les violations de contrainte unique
                        if (value === '' || value === null || value === undefined) {
                            filteredAgentData[key] = null;
                        } else {
                            // Trim et valider l'email
                            const trimmedEmail = typeof value === 'string' ? value.trim() : value;
                            filteredAgentData[key] = trimmedEmail === '' ? null : trimmedEmail;
                        }
                    } else {
                        filteredAgentData[key] = value;
                    }
                }
            });

            // Vérification spécifique que id_sous_direction est dans les données filtrées
            console.log('🔍 Backend - Vérification id_sous_direction AVANT filtrage:', {
                agentDataKeys: Object.keys(agentData),
                agentDataHasIdSousDirection: 'id_sous_direction' in agentData,
                agentDataIdSousDirectionValue: agentData.id_sous_direction,
                agentDataIdSousDirectionType: typeof agentData.id_sous_direction,
                allowedAgentColumnsHasIdSousDirection: allowedAgentColumns.includes('id_sous_direction'),
                excludedColumnsHasIdSousDirection: excludedColumns.includes('id_sous_direction')
            });

            // S'assurer que id_sous_direction est TOUJOURS inclus dans filteredAgentData
            // Même s'il n'est pas dans agentData initialement, on doit l'inclure
            // Cela garantit qu'il sera mis à jour dans la base de données (y compris pour mettre null)
            if ('id_sous_direction' in agentData) {
                // Si id_sous_direction est présent dans agentData, s'assurer qu'il est dans filteredAgentData
                if (!('id_sous_direction' in filteredAgentData)) {
                    // Normaliser la valeur
                    const value = agentData.id_sous_direction;
                    filteredAgentData.id_sous_direction = (value === '' || value === null || value === undefined || value === 'null' || value === 'undefined') ?
                        null :
                        Number(value) || null;
                    console.log(`⚠️ Backend - id_sous_direction présent dans agentData mais manquant dans filteredAgentData, ajouté: ${filteredAgentData.id_sous_direction}`);
                } else {
                    // Vérifier que la valeur est correcte
                    console.log(`✅ Backend - id_sous_direction déjà dans filteredAgentData: ${filteredAgentData.id_sous_direction}`);
                }
            } else {
                console.log(`⚠️ Backend - id_sous_direction PAS présent dans agentData initialement`);
                // Même si pas dans agentData, on devrait peut-être le forcer si on veut le mettre à null
                // Mais pour l'instant, ne forçons que si présent dans agentData
            }

            // Vérification après filtrage
            console.log('🔍 Backend - Vérification id_sous_direction APRÈS filtrage:', {
                hasIdSousDirection: 'id_sous_direction' in filteredAgentData,
                idSousDirectionValue: filteredAgentData.id_sous_direction,
                idSousDirectionType: typeof filteredAgentData.id_sous_direction
            });

            // Mettre à jour l'agent
            const agentColumns = Object.keys(filteredAgentData);
            const agentValues = Object.values(filteredAgentData);

            // Vérification supplémentaire pour exclure les colonnes de timestamp
            const finalAgentColumns = agentColumns.filter(col => !excludedColumns.includes(col));
            const finalAgentValues = finalAgentColumns.map(col => filteredAgentData[col]);

            // Vérification finale que id_sous_direction est dans les colonnes finales
            console.log('🔍 Backend - Vérification finale id_sous_direction AVANT correction:', {
                inFilteredAgentData: 'id_sous_direction' in filteredAgentData,
                inFinalColumns: finalAgentColumns.includes('id_sous_direction'),
                indexInColumns: finalAgentColumns.indexOf('id_sous_direction'),
                value: finalAgentColumns.includes('id_sous_direction') ?
                    filteredAgentData.id_sous_direction :
                    ('id_sous_direction' in filteredAgentData ? filteredAgentData.id_sous_direction : 'NON INCLUS'),
                agentDataOriginal: agentData.id_sous_direction
            });

            // FORCER l'inclusion de id_sous_direction dans la requête SQL si présent dans agentData
            // Même s'il a été filtré par erreur, on doit l'inclure pour mettre à jour la base de données
            if ('id_sous_direction' in agentData || 'id_sous_direction' in filteredAgentData) {
                const sousDirectionValue = ('id_sous_direction' in filteredAgentData) ?
                    filteredAgentData.id_sous_direction :
                    (agentData.id_sous_direction === '' || agentData.id_sous_direction === null || agentData.id_sous_direction === undefined || agentData.id_sous_direction === 'null' || agentData.id_sous_direction === 'undefined') ?
                    null :
                    Number(agentData.id_sous_direction) || null;

                // S'assurer que id_sous_direction est dans filteredAgentData
                filteredAgentData.id_sous_direction = sousDirectionValue;

                // S'assurer qu'il est dans finalAgentColumns
                if (!finalAgentColumns.includes('id_sous_direction')) {
                    finalAgentColumns.push('id_sous_direction');
                    finalAgentValues.push(sousDirectionValue);
                    console.log(`✅ Backend - id_sous_direction FORCÉ dans finalAgentColumns: ${sousDirectionValue}`);
                } else {
                    // Mettre à jour la valeur dans finalAgentValues
                    const index = finalAgentColumns.indexOf('id_sous_direction');
                    finalAgentValues[index] = sousDirectionValue;
                    console.log(`✅ Backend - id_sous_direction mis à jour dans finalAgentValues: ${sousDirectionValue}`);
                }
            }

            console.log('🔍 Backend - Vérification finale id_sous_direction APRÈS correction:', {
                inFinalColumns: finalAgentColumns.includes('id_sous_direction'),
                indexInColumns: finalAgentColumns.indexOf('id_sous_direction'),
                value: finalAgentColumns.includes('id_sous_direction') ?
                    finalAgentValues[finalAgentColumns.indexOf('id_sous_direction')] : 'NON INCLUS'
            });

            console.log('🔍 Colonnes filtrées pour la mise à jour:', finalAgentColumns);
            console.log('🔍 Valeurs filtrées pour la mise à jour:', finalAgentValues);
            console.log('🔍 Données filtrées complètes:', filteredAgentData);

            // Log spécifique pour l'email pour vérifier la conversion
            if ('email' in filteredAgentData) {
                console.log('📧 Email dans filteredAgentData:', {
                    original: agentData.email,
                    filtered: filteredAgentData.email,
                    type: typeof filteredAgentData.email,
                    isNull: filteredAgentData.email === null,
                    isEmpty: filteredAgentData.email === ''
                });
            }

            // Calculer automatiquement la date de retraite si nécessaire
            // Seulement pour les agents fonctionnaires (id_type_d_agent = 1)
            // On recalcule si :
            // 1. date_retraite n'est pas fournie dans la mise à jour OU
            // 2. date_de_naissance ou id_grade a changé (ce qui nécessite un recalcul)
            const shouldRecalculateRetirement =
                (!filteredAgentData.date_retraite || filteredAgentData.date_retraite === null || filteredAgentData.date_retraite === '') &&
                (filteredAgentData.date_de_naissance || 'date_de_naissance' in agentData) &&
                (filteredAgentData.id_grade || 'id_grade' in agentData);

            if (shouldRecalculateRetirement) {
                try {
                    // Récupérer le type d'agent (fonctionnaire ou non) depuis la base de données si pas fourni
                    let isFonctionnaire = false;
                    if (filteredAgentData.id_type_d_agent) {
                        isFonctionnaire = filteredAgentData.id_type_d_agent === 1;
                    } else {
                        // Récupérer depuis la base de données
                        const agentTypeQuery = await pool.query('SELECT id_type_d_agent FROM agents WHERE id = $1', [id]);
                        if (agentTypeQuery.rows.length > 0 && agentTypeQuery.rows[0].id_type_d_agent === 1) {
                            isFonctionnaire = true;
                        }
                    }

                    // Récupérer la date de naissance (utiliser celle fournie ou celle en base)
                    let dateNaissance = filteredAgentData.date_de_naissance;
                    if (!dateNaissance) {
                        const birthDateQuery = await pool.query('SELECT date_de_naissance FROM agents WHERE id = $1', [id]);
                        if (birthDateQuery.rows.length > 0) {
                            dateNaissance = birthDateQuery.rows[0].date_de_naissance;
                        }
                    }

                    // Récupérer le grade (utiliser celui fourni ou celui en base)
                    let gradeId = filteredAgentData.id_grade;
                    if (!gradeId) {
                        const gradeQuery = await pool.query('SELECT id_grade FROM agents WHERE id = $1', [id]);
                        if (gradeQuery.rows.length > 0 && gradeQuery.rows[0].id_grade) {
                            gradeId = gradeQuery.rows[0].id_grade;
                        }
                    }

                    if (isFonctionnaire && dateNaissance && gradeId) {
                        // Récupérer le libellé du grade
                        const gradeQuery = await pool.query('SELECT libele FROM grades WHERE id = $1', [gradeId]);

                        if (gradeQuery.rows.length > 0 && gradeQuery.rows[0].libele) {
                            const gradeLibele = gradeQuery.rows[0].libele;

                            // Calculer la date de retraite
                            const calculatedRetirementDate = this.calculateRetirementDate(
                                dateNaissance,
                                gradeLibele
                            );

                            if (calculatedRetirementDate) {
                                // Formater la date au format YYYY-MM-DD pour la base de données
                                const year = calculatedRetirementDate.getFullYear();
                                const month = String(calculatedRetirementDate.getMonth() + 1).padStart(2, '0');
                                const day = String(calculatedRetirementDate.getDate()).padStart(2, '0');
                                const formattedDate = `${year}-${month}-${day}`;

                                filteredAgentData.date_retraite = formattedDate;

                                // S'assurer que date_retraite est dans finalAgentColumns
                                if (!finalAgentColumns.includes('date_retraite')) {
                                    finalAgentColumns.push('date_retraite');
                                }
                                // Mettre à jour la valeur dans finalAgentValues
                                const index = finalAgentColumns.indexOf('date_retraite');
                                if (index >= 0 && index < finalAgentValues.length) {
                                    finalAgentValues[index] = formattedDate;
                                } else {
                                    finalAgentValues.push(formattedDate);
                                }

                                console.log(`✅ Date de retraite calculée automatiquement lors de la mise à jour: ${formattedDate} (Grade: ${gradeLibele}, Date de naissance: ${dateNaissance})`);
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur lors du calcul automatique de la date de retraite (update):', error);
                    // Ne pas bloquer la mise à jour si le calcul échoue
                }
            }

            const agentSetClause = finalAgentColumns.map((col, index) => `${col} = $${index + 2}`).join(', ');

            const agentQuery = `
                UPDATE agents 
                SET ${agentSetClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            // Log de la requête SQL finale pour débogage
            console.log('🔍 Backend - Requête SQL UPDATE finale:');
            console.log(`   ${agentQuery}`);
            console.log('🔍 Backend - Paramètres de la requête:', [id, ...finalAgentValues]);
            console.log('🔍 Backend - Index de id_sous_direction dans finalAgentColumns:', finalAgentColumns.indexOf('id_sous_direction'));
            if (finalAgentColumns.includes('id_sous_direction')) {
                const index = finalAgentColumns.indexOf('id_sous_direction');
                console.log(`   -> id_sous_direction sera mis à jour avec la valeur à l'index ${index + 1}: ${finalAgentValues[index]}`);
            } else {
                console.log('   ❌ id_sous_direction N\'EST PAS dans la requête SQL !');
            }

            const agentResult = await pool.query(agentQuery, [id, ...finalAgentValues]);
            const agent = agentResult.rows[0];


            // Mettre à jour les enfants si fournis
            // NOTE: enfants a déjà été parsé plus haut, donc on utilise directement la variable
            // MAIS on vérifie aussi directement dans data au cas où le parsing n'aurait pas fonctionné
            let enfantsToProcess = enfants;

            // Si enfants n'a pas été parsé correctement, essayer de le récupérer directement depuis data
            if ((enfantsToProcess === undefined || enfantsToProcess === null) && data.enfants !== undefined) {
                console.log('⚠️ enfants n\'a pas été parsé, tentative de récupération directe depuis data');
                enfantsToProcess = data.enfants;
                if (typeof enfantsToProcess === 'string') {
                    try {
                        enfantsToProcess = JSON.parse(enfantsToProcess);
                        console.log('✅ Enfants récupérés et parsés depuis data.enfants:', enfantsToProcess);
                    } catch (error) {
                        console.error('❌ Erreur lors du parsing des enfants depuis data.enfants:', error);
                        enfantsToProcess = [];
                    }
                }
            }

            if (enfantsToProcess !== undefined && enfantsToProcess !== null) {
                let enfantsArray = enfantsToProcess;

                // S'assurer que c'est un array
                if (!Array.isArray(enfantsArray)) {
                    console.error('❌ enfants n\'est pas un array:', typeof enfantsArray, enfantsArray);
                    enfantsArray = [];
                }

                console.log('🔍 ===== TRAITEMENT DES ENFANTS =====');
                console.log('🔍 Nombre d\'enfants reçus:', enfantsArray.length);
                console.log('🔍 Contenu des enfants:', JSON.stringify(enfantsArray, null, 2));

                // Gérer les enfants de manière intelligente : UPDATE les existants, INSERT les nouveaux, DELETE les supprimés
                // Traiter même si le tableau est vide (pour supprimer les enfants existants si nécessaire)
                if (Array.isArray(enfantsArray)) {
                    // Récupérer les enfants existants dans la base de données
                    const existingEnfantsQuery = await pool.query('SELECT id FROM enfants WHERE id_agent = $1', [id]);
                    const existingEnfantIds = new Set(existingEnfantsQuery.rows.map(row => row.id));
                    console.log(`🔍 Enfants existants dans la base pour agent ${id}:`, Array.from(existingEnfantIds));

                    // Filtrer les enfants avec des données valides
                    const enfantsValides = enfantsArray.filter(enfant => {
                        const isValid = enfant &&
                            enfant.nom &&
                            typeof enfant.nom === 'string' &&
                            enfant.nom.trim() !== '' &&
                            enfant.prenom &&
                            typeof enfant.prenom === 'string' &&
                            enfant.prenom.trim() !== '' &&
                            enfant.sexe &&
                            (enfant.sexe === 'M' || enfant.sexe === 'F') &&
                            enfant.date_de_naissance &&
                            typeof enfant.date_de_naissance === 'string' &&
                            enfant.date_de_naissance.trim() !== '';

                        if (!isValid && enfant) {
                            console.log('⚠️ Enfant invalide filtré:', {
                                nom: enfant.nom,
                                prenom: enfant.prenom,
                                sexe: enfant.sexe,
                                date_de_naissance: enfant.date_de_naissance,
                                enfant_complet: enfant
                            });
                        }

                        return isValid;
                    });

                    console.log(`👶 Enfants reçus: ${enfantsArray.length}, Enfants valides: ${enfantsValides.length}`);
                    if (enfantsValides.length !== enfantsArray.length) {
                        console.log('⚠️ Certains enfants ont été filtrés car invalides');
                    }

                    // Set pour tracker les IDs des enfants qui sont mis à jour/insérés
                    const processedEnfantIds = new Set();

                    for (const enfant of enfantsValides) {
                        // Exclure lieu_de_naissance et autres champs non valides de la table enfants
                        // IMPORTANT: Renommer 'id' en 'enfantId' pour éviter la collision avec req.params.id (ID de l'agent)
                        const { lieu_de_naissance, id: enfantId, ...enfantSansChampsInvalides } = enfant;

                        // Nettoyer et normaliser les données de l'enfant
                        // Normaliser le sexe : accepter 'M', 'F', 'm', 'f', 'Masculin', 'Féminin', etc.
                        let sexeNormalise = (enfant.sexe || '').toString().trim().toUpperCase();
                        if (sexeNormalise === 'MASCULIN' || sexeNormalise === 'MALE' || sexeNormalise === 'M') {
                            sexeNormalise = 'M';
                        } else if (sexeNormalise === 'FÉMININ' || sexeNormalise === 'FEMININ' || sexeNormalise === 'FEMALE' || sexeNormalise === 'F') {
                            sexeNormalise = 'F';
                        } else {
                            // Si le sexe n'est pas valide, essayer de le récupérer depuis l'objet enfant original
                            sexeNormalise = (enfant.sexe || '').toString().trim().toUpperCase();
                        }

                        const enfantData = {
                            id_agent: id, // Utiliser l'ID de l'agent depuis req.params.id (pas depuis l'enfant)
                            nom: (enfant.nom || '').toString().trim(),
                            prenom: (enfant.prenom || '').toString().trim(),
                            sexe: sexeNormalise,
                            date_de_naissance: (enfant.date_de_naissance || '').toString().trim(),
                            scolarise: enfant.scolarise !== null && enfant.scolarise !== undefined ? Boolean(enfant.scolarise) : false,
                            ayant_droit: enfant.ayant_droit !== null && enfant.ayant_droit !== undefined ? Boolean(enfant.ayant_droit) : false
                        };

                        // Validation finale avant insertion/mise à jour
                        // Vérifier que toutes les données requises sont présentes
                        const hasRequiredFields = enfantData.nom &&
                            enfantData.prenom &&
                            enfantData.sexe &&
                            enfantData.date_de_naissance;

                        if (!hasRequiredFields) {
                            console.error(`❌ Données d'enfant incomplètes, ignoré:`, {
                                nom: enfantData.nom,
                                prenom: enfantData.prenom,
                                sexe: enfantData.sexe,
                                date_de_naissance: enfantData.date_de_naissance,
                                enfant_complet: enfantData
                            });
                            continue; // Passer à l'enfant suivant
                        }

                        if (enfantData.sexe !== 'M' && enfantData.sexe !== 'F') {
                            console.error(`❌ Sexe invalide pour enfant, ignoré:`, {
                                sexe: enfantData.sexe,
                                enfant_complet: enfantData
                            });
                            continue; // Passer à l'enfant suivant
                        }

                        // Vérifier que les champs ne sont pas vides après trim
                        if (enfantData.nom.trim() === '' ||
                            enfantData.prenom.trim() === '' ||
                            enfantData.date_de_naissance.trim() === '') {
                            console.error(`❌ Champs vides après trim, ignoré:`, enfantData);
                            continue; // Passer à l'enfant suivant
                        }

                        console.log(`🔍 Traitement enfant:`, {
                            enfantId: enfantId || 'Nouveau',
                            nom: enfantData.nom,
                            prenom: enfantData.prenom,
                            sexe: enfantData.sexe,
                            date_de_naissance: enfantData.date_de_naissance,
                            id_agent: enfantData.id_agent
                        });

                        // S'assurer que id_agent est toujours défini (depuis les paramètres de la route)
                        if (!enfantData.id_agent) {
                            console.error(`❌ update - id_agent manquant pour enfant, utilisation de l'ID de la route: ${id}`);
                            enfantData.id_agent = id;
                        }

                        // Si l'enfant a un ID et qu'il existe dans la base, faire un UPDATE
                        if (enfantId && existingEnfantIds.has(parseInt(enfantId))) {
                            console.log(`🔄 update - Mise à jour enfant existant avec id: ${enfantId}`, {
                                nom: enfantData.nom,
                                prenom: enfantData.prenom,
                                id_agent: enfantData.id_agent
                            });

                            // Construire dynamiquement la requête UPDATE
                            const enfantColumns = ['nom', 'prenom', 'sexe', 'date_de_naissance', 'scolarise', 'ayant_droit'];
                            const enfantValues = [
                                enfantData.nom,
                                enfantData.prenom,
                                enfantData.sexe,
                                enfantData.date_de_naissance,
                                enfantData.scolarise,
                                enfantData.ayant_droit,
                                enfantId // Pour la clause WHERE
                            ];
                            const enfantSetClause = enfantColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');

                            const enfantUpdateQuery = `
                                UPDATE enfants 
                                SET ${enfantSetClause}, updated_at = CURRENT_TIMESTAMP
                                WHERE id = $${enfantColumns.length + 1}
                            `;

                            await pool.query(enfantUpdateQuery, enfantValues);
                            processedEnfantIds.add(parseInt(enfantId));
                        } else {
                            // Sinon, c'est un nouvel enfant, faire un INSERT
                            console.log(`➕ update - Création nouveau enfant (enfantId: ${enfantId || 'N/A'})`, {
                                nom: enfantData.nom,
                                prenom: enfantData.prenom,
                                id_agent: enfantData.id_agent
                            });

                            // Construire dynamiquement la requête INSERT
                            const enfantColumns = ['id_agent', 'nom', 'prenom', 'sexe', 'date_de_naissance', 'scolarise', 'ayant_droit'];
                            const enfantValues = [
                                enfantData.id_agent,
                                enfantData.nom,
                                enfantData.prenom,
                                enfantData.sexe,
                                enfantData.date_de_naissance,
                                enfantData.scolarise,
                                enfantData.ayant_droit
                            ];
                            const enfantPlaceholders = enfantValues.map((_, index) => `$${index + 1}`).join(', ');

                            const enfantInsertQuery = `
                                INSERT INTO enfants (${enfantColumns.join(', ')}, created_at, updated_at)
                                VALUES (${enfantPlaceholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                RETURNING id
                            `;

                            const insertResult = await pool.query(enfantInsertQuery, enfantValues);
                            if (insertResult.rows.length > 0) {
                                processedEnfantIds.add(insertResult.rows[0].id);
                            }
                        }
                    }

                    // Supprimer les enfants qui n'ont pas été traités (supprimés par l'utilisateur)
                    const enfantsToDelete = Array.from(existingEnfantIds).filter(id => !processedEnfantIds.has(id));
                    if (enfantsToDelete.length > 0) {
                        console.log(`🗑️ Suppression des enfants non présents dans la nouvelle liste:`, enfantsToDelete);
                        await pool.query('DELETE FROM enfants WHERE id = ANY($1::int[])', [enfantsToDelete]);
                    }

                    console.log(`✅ Traitement des enfants terminé: ${enfantsValides.length} enfant(s) traité(s), ${enfantsToDelete.length} enfant(s) supprimé(s)`);
                } else {
                    console.log('⚠️ enfantsArray n\'est pas un array valide:', typeof enfantsArray, enfantsArray);
                }
            } else {
                console.log('⚠️ enfants n\'est pas défini ou est null - aucun enfant à traiter');
                console.log('⚠️ Vérification data.enfants:', data.enfants);
                console.log('⚠️ Vérification variable enfants:', enfants);
            }

            // Mettre à jour le nombre d'enfants avec le nombre saisi par l'utilisateur (pas le nombre d'enfants valides)
            // L'utilisateur peut saisir 3 enfants mais n'en renseigner qu'un seul, le nombre sera 3
            // IMPORTANT: nombre_enfant est déjà mis à jour dans la requête principale (ligne 1693)
            // Cette mise à jour supplémentaire n'est nécessaire que si on veut forcer la valeur
            // même si elle n'était pas dans filteredAgentData
            if (nombreEnfantSaisi !== null && nombreEnfantSaisi !== undefined) {
                const nombreEnfantFinal = parseInt(nombreEnfantSaisi);
                // Ne mettre à jour que si la valeur est différente de celle déjà mise à jour
                // ou si nombre_enfant n'était pas dans filteredAgentData
                if (!('nombre_enfant' in filteredAgentData) || filteredAgentData.nombre_enfant !== nombreEnfantFinal) {
                    await pool.query(
                        'UPDATE agents SET nombre_enfant = $1 WHERE id = $2', [nombreEnfantFinal, id]
                    );
                }
            }

            // Gérer les fichiers uploadés si fournis
            if (files && Object.keys(files).length > 0) {
                console.log('📁 Gestion des fichiers pour mise à jour:', Object.keys(files));

                // Gérer les photos de profil
                if (files.photo_profil && files.photo_profil.length > 0) {
                    // Supprimer l'ancienne photo de profil
                    await pool.query('DELETE FROM agent_photos WHERE id_agent = $1 AND is_profile_photo = true', [id]);

                    // Insérer la nouvelle photo
                    for (const photo of files.photo_profil) {
                        const photoUrl = `/uploads/photos/${photo.filename}`;
                        await pool.query(
                            'INSERT INTO agent_photos (id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo) VALUES ($1, $2, $3, $4, $5, $6)', [id, photoUrl, photo.originalname, photo.size, photo.mimetype, true]
                        );
                    }
                }

                // Gérer les anciens types de documents (pour compatibilité)
                const documentTypes = ['certificat_travail', 'attestation_formation', 'autres_documents', 'acte_mariage'];
                for (const docType of documentTypes) {
                    if (files[docType] && files[docType].length > 0) {
                        // Supprimer les anciens documents de ce type
                        await pool.query('DELETE FROM agent_documents WHERE id_agent = $1 AND document_type = $2', [id, docType]);

                        // Insérer les nouveaux documents
                        for (const doc of files[docType]) {
                            const documentUrl = `/uploads/documents/${doc.filename}`;
                            await pool.query(
                                'INSERT INTO agent_documents (id_agent, document_type, document_url, document_name, document_size, document_mime_type) VALUES ($1, $2, $3, $4, $5, $6)', [id, docType, documentUrl, doc.originalname, doc.size, doc.mimetype]
                            );
                        }
                    }
                }

                // Gérer les nouveaux documents dynamiques
                if (files.dynamic_documents && files.dynamic_documents.length > 0) {
                    console.log('📄 Traitement des documents dynamiques dans la gestion des fichiers');
                    console.log('📄 Nombre de fichiers dynamic_documents:', files.dynamic_documents.length);

                    // Les documents dynamiques sont traités par la méthode handleDynamicDocuments
                    // qui est appelée plus bas dans le code
                }

                // NOTE: Les diplômes sont gérés par handleAgentDiplomes ci-dessous
                // pour éviter le double traitement et gérer correctement diplome_documents
            }

            // Gérer les diplômes avec la méthode dédiée
            console.log('🔍 DEBUG UPDATE - diplomesArray:', diplomesArray);
            console.log('🔍 DEBUG UPDATE - files:', files);
            console.log('🔍 DEBUG UPDATE - typeof diplomesArray:', typeof diplomesArray);
            console.log('🔍 DEBUG UPDATE - Array.isArray(diplomesArray):', Array.isArray(diplomesArray));

            // Vérifier aussi si des fichiers de diplômes sont présents même sans diplomesArray
            const hasDiplomeFiles = files && (
                (files.diplomes && (Array.isArray(files.diplomes) ? files.diplomes.length > 0 : true)) ||
                (files.diplome_documents && (Array.isArray(files.diplome_documents) ? files.diplome_documents.length > 0 : true)) ||
                (files.diplome && (Array.isArray(files.diplome) ? files.diplome.length > 0 : true))
            );

            if ((diplomesArray && Array.isArray(diplomesArray) && diplomesArray.length > 0) || hasDiplomeFiles) {
                console.log('🎓 Mise à jour des diplômes pour l\'agent:', id);
                if (diplomesArray && Array.isArray(diplomesArray)) {
                    console.log('🎓 Nombre de diplômes à traiter:', diplomesArray.length);
                    try {
                        await this.handleAgentDiplomes(id, diplomesArray, files, true);
                        console.log('✅ Diplômes mis à jour avec succès');
                    } catch (diplomeError) {
                        console.error('❌ Erreur lors de la mise à jour des diplômes:', diplomeError);
                        // Ne pas bloquer la mise à jour de l'agent si les diplômes échouent
                        console.warn('⚠️ La mise à jour de l\'agent continue malgré l\'erreur des diplômes');
                    }
                } else {
                    console.log('⚠️ DiplômesArray invalide, mais des fichiers de diplômes sont présents');
                }
            } else {
                console.log('⚠️ Aucun diplôme à traiter');
                if (diplomesArray === null || diplomesArray === undefined) {
                    console.log('⚠️ diplomesArray est null/undefined');
                } else if (!Array.isArray(diplomesArray)) {
                    console.log('⚠️ diplomesArray n\'est pas un array:', typeof diplomesArray);
                } else if (diplomesArray.length === 0) {
                    console.log('⚠️ diplomesArray est vide');
                }
            }

            // Gérer les documents dynamiques
            console.log('🔍 DEBUG DOCUMENTS DYNAMIQUES:');
            console.log('🔍 agentData.keys:', Object.keys(agentData));
            console.log('🔍 agentData.documents:', agentData.documents);
            console.log('🔍 typeof agentData.documents:', typeof agentData.documents);
            console.log('🔍 Array.isArray(agentData.documents):', Array.isArray(agentData.documents));

            // Extraire les documents dynamiques du corps de la requête
            let documentsArray = null;
            if (agentData.documents) {
                try {
                    documentsArray = typeof agentData.documents === 'string' ? JSON.parse(agentData.documents) : agentData.documents;
                } catch (error) {
                    console.log('⚠️ Erreur lors du parsing des documents:', error);
                    documentsArray = agentData.documents;
                }
            }

            console.log('🔍 documentsArray après extraction:', documentsArray);
            console.log('🔍 typeof documentsArray:', typeof documentsArray);
            console.log('🔍 Array.isArray(documentsArray):', Array.isArray(documentsArray));

            if (documentsArray && Array.isArray(documentsArray) && documentsArray.length > 0) {
                // Filtrer pour ne traiter que les vrais documents dynamiques (pas les diplômes)
                const dynamicDocuments = documentsArray.filter(doc =>
                    doc.document_type !== 'diplome' &&
                    (typeof doc.id === 'string' && doc.id.startsWith('new_')) ||
                    (doc.existingDocument !== null && doc.existingDocument !== undefined)
                );

                console.log('📄 Mise à jour des documents dynamiques pour l\'agent:', id);
                console.log('📄 Nombre total de documents:', documentsArray.length);
                console.log('📄 Nombre de documents dynamiques à traiter:', dynamicDocuments.length);
                console.log('📄 Documents dynamiques filtrés:', dynamicDocuments);

                if (dynamicDocuments.length > 0) {
                    await this.handleDynamicDocuments(id, dynamicDocuments, files);
                } else {
                    console.log('⚠️ Aucun document dynamique à traiter après filtrage');
                }
            } else {
                console.log('⚠️ Aucun document dynamique à traiter');
            }

            // Gérer les langues de l'agent (mise à jour)
            console.log('🔍 DEBUG LANGUES - agentData.agent_langues:', agentData.agent_langues);
            console.log('🔍 DEBUG LANGUES - typeof:', typeof agentData.agent_langues);
            console.log('🔍 DEBUG LANGUES - isArray:', Array.isArray(agentData.agent_langues));
            console.log('🔍 DEBUG LANGUES - length:', agentData.agent_langues ? agentData.agent_langues.length : 'undefined');

            if (agentData.agent_langues !== undefined) {
                console.log('🌍 Mise à jour des langues pour l\'agent:', id);
                // Supprimer les anciennes langues
                await pool.query('DELETE FROM agent_langues WHERE id_agent = $1', [id]);
                // Ajouter les nouvelles langues
                if (agentData.agent_langues && Array.isArray(agentData.agent_langues) && agentData.agent_langues.length > 0) {
                    console.log('🌍 Langues à ajouter:', agentData.agent_langues);
                    await this.handleAgentLangues(id, agentData.agent_langues);
                } else {
                    console.log('🌍 Aucune langue à ajouter (tableau vide ou invalide)');
                }
            } else {
                console.log('🌍 agent_langues est undefined - pas de mise à jour des langues');
            }

            // Gérer les logiciels de l'agent (mise à jour)
            console.log('🔍 DEBUG LOGICIELS - agentData.agent_logiciels:', agentData.agent_logiciels);
            console.log('🔍 DEBUG LOGICIELS - typeof:', typeof agentData.agent_logiciels);
            console.log('🔍 DEBUG LOGICIELS - isArray:', Array.isArray(agentData.agent_logiciels));
            console.log('🔍 DEBUG LOGICIELS - length:', agentData.agent_logiciels ? agentData.agent_logiciels.length : 'undefined');

            if (agentData.agent_logiciels !== undefined) {
                console.log('💻 Mise à jour des logiciels pour l\'agent:', id);
                // Supprimer les anciens logiciels
                await pool.query('DELETE FROM agent_logiciels WHERE id_agent = $1', [id]);
                // Ajouter les nouveaux logiciels
                if (agentData.agent_logiciels && Array.isArray(agentData.agent_logiciels) && agentData.agent_logiciels.length > 0) {
                    console.log('💻 Logiciels à ajouter:', agentData.agent_logiciels);
                    await this.handleAgentLogiciels(id, agentData.agent_logiciels);
                } else {
                    console.log('💻 Aucun logiciel à ajouter (tableau vide ou invalide)');
                }
            } else {
                console.log('💻 agent_logiciels est undefined - pas de mise à jour des logiciels');
            }

            // Récupérer l'agent complet avec toutes les informations
            let completeAgent;
            try {
                const completeAgentQuery = `
                    SELECT 
                        a.*,
                        c.libele as civilite_libele,
                        n.libele as nationalite_libele,
                        ta.libele as type_agent_libele,
                        sm.libele as situation_matrimoniale_libele,
                        m.nom as ministere_nom,
                        m.sigle as ministere_sigle,
                        m.logo_url as ministere_logo,
                        e.nom as entite_nom,
                        fa_actuelle.fonction_libele as fonction_libele,
                        ea_actuel.emploi_libele as emploi_libele,
                        ga_actuelle.grade_libele as grade_libele,
                        ech_actuelle.echelon_libele as echelon_libele,
                        cat.libele as categorie_libele,
                        p.libele as position_libele,
                        s.libelle as direction_libelle,
                        me.libele as mode_entree_libele
                    FROM agents a
                    LEFT JOIN civilites c ON a.id_civilite = c.id
                    LEFT JOIN nationalites n ON a.id_nationalite = n.id
                    LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                    LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                    -- Fonction actuelle depuis fonction_agents
                    LEFT JOIN (
                        SELECT DISTINCT ON (fa.id_agent) 
                            fa.id_agent,
                            f.libele as fonction_libele,
                            fa.date_entree
                        FROM fonction_agents fa
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        ORDER BY fa.id_agent, fa.date_entree DESC
                    ) fa_actuelle ON a.id = fa_actuelle.id_agent
                    -- Emploi actuel depuis emploi_agents
                    LEFT JOIN (
                        SELECT DISTINCT ON (ea.id_agent) 
                            ea.id_agent,
                            e.libele as emploi_libele,
                            ea.date_entree
                        FROM emploi_agents ea
                        LEFT JOIN emplois e ON ea.id_emploi = e.id
                        ORDER BY ea.id_agent, ea.date_entree DESC
                    ) ea_actuel ON a.id = ea_actuel.id_agent
                    LEFT JOIN categories cat ON a.id_categorie = cat.id
                    LEFT JOIN positions p ON a.id_position = p.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN mode_d_entrees me ON a.id_mode_entree = me.id
                    -- Grade actuel depuis grades_agents
                    LEFT JOIN (
                        SELECT DISTINCT ON (ga.id_agent)
                            ga.id_agent,
                            g.libele as grade_libele
                        FROM grades_agents ga
                        LEFT JOIN grades g ON ga.id_grade = g.id
                        ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                    ) ga_actuelle ON a.id = ga_actuelle.id_agent
                    -- Échelon actuel depuis echelons_agents
                    LEFT JOIN (
                        SELECT DISTINCT ON (ea.id_agent)
                            ea.id_agent,
                            e.libele as echelon_libele
                        FROM echelons_agents ea
                        LEFT JOIN echelons e ON ea.id_echelon = e.id
                        ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                    ) ech_actuelle ON a.id = ech_actuelle.id_agent
                    WHERE a.id = $1
                `;

                const completeAgentResult = await pool.query(completeAgentQuery, [id]);

                if (!completeAgentResult.rows || completeAgentResult.rows.length === 0) {
                    console.error('⚠️ Aucun agent trouvé après mise à jour, récupération avec données de base');
                    // Si l'agent n'est pas trouvé avec toutes les jointures, récupérer au moins les données de base
                    const basicAgentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
                    completeAgent = basicAgentResult.rows[0];
                } else {
                    completeAgent = completeAgentResult.rows[0];
                }
            } catch (queryError) {
                console.error('⚠️ Erreur lors de la récupération de l\'agent complet, récupération avec données de base:', queryError);
                // En cas d'erreur, récupérer au moins les données de base de l'agent
                const basicAgentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
                completeAgent = basicAgentResult.rows[0] || agent; // Utiliser agent mis à jour comme fallback
            }

            // Récupérer les enfants de l'agent
            let enfantsQuery;
            try {
                enfantsQuery = await pool.query(
                    `
                    SELECT id, nom, prenom, sexe, date_de_naissance
                    FROM enfants
                    WHERE id_agent = $1
                    ORDER BY date_de_naissance ASC, id ASC
                    `, [id]
                );
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des enfants:', error);
                enfantsQuery = { rows: [] };
            }

            // Récupérer les photos de l'agent
            let photosResult;
            try {
                const photosQuery = `SELECT * FROM agent_photos WHERE id_agent = $1 ORDER BY is_profile_photo DESC, uploaded_at ASC`;
                photosResult = await pool.query(photosQuery, [id]);
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des photos:', error);
                photosResult = { rows: [] };
            }

            // Récupérer les documents de l'agent
            let documentsResult;
            try {
                const documentsQuery = `SELECT * FROM agent_documents WHERE id_agent = $1 ORDER BY document_type, uploaded_at ASC`;
                documentsResult = await pool.query(documentsQuery, [id]);
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des documents:', error);
                documentsResult = { rows: [] };
            }

            // Récupérer les diplômes de l'agent
            let diplomesResult;
            try {
                const diplomesQuery = `
                    SELECT ed.*, ad.document_url, ad.document_name, ad.document_size, ad.document_mime_type
                    FROM etude_diplome ed
                    LEFT JOIN agent_documents ad ON ed.id_agent_document = ad.id
                    WHERE ed.id_agent = $1
                    ORDER BY 
                        CASE 
                            WHEN ed.date_diplome IS NOT NULL THEN ed.date_diplome 
                            ELSE 1900 
                        END DESC,
                        ed.id ASC
                `;
                diplomesResult = await pool.query(diplomesQuery, [id]);
                console.log('✅ Diplômes récupérés:', diplomesResult.rows.length);
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des diplômes:', error);
                diplomesResult = { rows: [] };
            }

            // Récupérer les langues de l'agent
            let languesResult;
            try {
                const languesQuery = `
                    SELECT
                        al.*,
                        l.libele as langue_nom,
                        nl.libele as niveau_libele
                    FROM agent_langues al
                    LEFT JOIN langues l ON al.id_langue = l.id
                    LEFT JOIN niveau_langues nl ON al.id_niveau_langue = nl.id
                    WHERE al.id_agent = $1
                    ORDER BY al.created_at DESC
                `;
                languesResult = await pool.query(languesQuery, [id]);
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des langues:', error);
                languesResult = { rows: [] };
            }

            // Récupérer les logiciels de l'agent
            let logicielsResult;
            try {
                const logicielsQuery = `
                    SELECT
                        al.*,
                        l.libele as logiciel_nom,
                        ni.libele as niveau_libele
                    FROM agent_logiciels al
                    LEFT JOIN logiciels l ON al.id_logiciel = l.id
                    LEFT JOIN niveau_informatiques ni ON al.id_niveau_informatique = ni.id
                    WHERE al.id_agent = $1
                    ORDER BY al.created_at DESC
                `;
                logicielsResult = await pool.query(logicielsQuery, [id]);
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération des logiciels:', error);
                logicielsResult = { rows: [] };
            }

            // Ajouter les données liées à l'agent
            try {
                if (!completeAgent) {
                    console.error('❌ completeAgent est undefined');
                    // Récupérer au moins les données de base
                    const basicAgentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
                    completeAgent = basicAgentResult.rows[0] || agent;
                }

                completeAgent.photos = (photosResult && photosResult.rows) || [];
                completeAgent.documents = (documentsResult && documentsResult.rows) || [];
                completeAgent.diplomes = (diplomesResult && diplomesResult.rows) || [];
                completeAgent.langues = (languesResult && languesResult.rows) || [];
                completeAgent.logiciels = (logicielsResult && logicielsResult.rows) || [];
                completeAgent.enfants = (enfantsQuery && enfantsQuery.rows) || [];

                console.log('✅ Mise à jour réussie pour l\'agent:', id);
                console.log('✅ Diplômes dans la réponse:', completeAgent.diplomes.length);
                console.log('✅ Structure des diplômes:', completeAgent.diplomes.map(d => ({
                    id: d.id,
                    diplome: d.diplome,
                    document_name: d.document_name,
                    document_url: d.document_url
                })));

                res.json({
                    success: true,
                    message: 'Agent modifié avec succès',
                    data: completeAgent
                });
            } catch (finalError) {
                console.error('⚠️ Erreur lors de l\'ajout des données liées, mais l\'agent a été mis à jour:', finalError);
                console.error('⚠️ Stack trace:', finalError.stack);
                // L'agent a été mis à jour, donc on renvoie quand même un succès avec les données de base
                if (!completeAgent) {
                    const basicAgentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
                    completeAgent = basicAgentResult.rows[0] || agent;
                }
                res.json({
                    success: true,
                    message: 'Agent modifié avec succès',
                    data: completeAgent
                });
            }
        } catch (error) {
            console.error('❌ ===== ERREUR MISE À JOUR AGENT =====');
            console.error('❌ Erreur lors de la mise à jour de l\'agent:', error);
            console.error('❌ Code d\'erreur:', error.code);
            console.error('❌ Message d\'erreur:', error.message);
            console.error('❌ Contrainte violée:', error.constraint);
            console.error('❌ Détail de l\'erreur:', error.detail);
            console.error('❌ Table concernée:', error.table);
            console.error('❌ Colonne concernée:', error.column);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Agent ID:', req.params.id);
            console.error('❌ Données reçues:', req.body);
            console.error('❌ Fichiers reçus:', req.files);

            if (error.code === '23505') {
                // Violation de contrainte unique - identifier le champ concerné
                let fieldName = 'inconnu';
                let errorMessage = 'Cette valeur existe déjà';

                // Extraire le nom du champ depuis la contrainte ou le détail de l'erreur
                if (error.constraint) {
                    // Le nom de la contrainte contient souvent le nom du champ
                    if (error.constraint.includes('matricule')) {
                        fieldName = 'matricule';
                        errorMessage = 'Ce matricule existe déjà';
                    } else if (error.constraint.includes('email')) {
                        fieldName = 'email';
                        errorMessage = 'Cet email existe déjà';
                    } else {
                        // Essayer d'extraire le nom du champ depuis le détail
                        if (error.detail) {
                            const detailMatch = error.detail.match(/Key \((.+?)\)=/);
                            if (detailMatch) {
                                fieldName = detailMatch[1];
                            }
                        }
                    }
                }

                // Logger les détails pour le débogage
                console.error('❌ Violation de contrainte unique:', {
                    constraint: error.constraint,
                    detail: error.detail,
                    field: fieldName,
                    message: error.message
                });

                res.status(400).json({
                    error: errorMessage,
                    field: fieldName,
                    constraint: error.constraint,
                    detail: process.env.NODE_ENV === 'development' ? error.detail : undefined
                });
            } else if (error.message && error.message.includes('Type de fichier non autorisé')) {
                res.status(400).json({
                    error: 'Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT'
                });
            } else {
                res.status(500).json({
                    error: 'Erreur interne du serveur',
                    details: error.message
                });
            }
        }
    }

    // Supprimer un agent
    async delete(req, res) {
        try {
            const {
                id
            } = req.params;

            // Vérifier si l'agent existe
            const checkAgent = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
            if (checkAgent.rows.length === 0) {
                return res.status(404).json({
                    error: 'Agent non trouvé'
                });
            }

            // Vérifier si l'agent est déjà retiré
            const agent = checkAgent.rows[0];
            if (agent.retire === true) {
                return res.status(400).json({
                    error: 'Cet agent est déjà retiré'
                });
            }

            // Fonction helper pour vérifier si une colonne existe dans une table
            const columnExists = async(tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            // Vérifier si la colonne 'retire' existe, sinon la créer
            const retireColumnExists = await columnExists('agents', 'retire');
            if (!retireColumnExists) {
                await pool.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS retire BOOLEAN DEFAULT FALSE');
                await pool.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS date_retrait TIMESTAMP');
            }

            // Désactiver le compte utilisateur associé si existe
            try {
                const userTableExists = await pool.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'utilisateurs'
                    )`
                );
                if (userTableExists.rows[0].exists) {
                    await pool.query(
                        'UPDATE utilisateurs SET is_active = false WHERE id_agent = $1', [id]
                    );
                }
            } catch (error) {
                console.error('Erreur lors de la désactivation du compte utilisateur:', error.message);
            }

            // Récupérer le motif de retrait depuis le body, query params ou headers (pour être robuste)
            // Les requêtes DELETE peuvent avoir des problèmes avec le body selon le client HTTP
            // IMPORTANT: Pour les requêtes DELETE, le body peut ne pas être parsé automatiquement
            // On doit s'assurer que express.json() parse aussi les DELETE

            // Debug complet de la requête
            console.log('📥 ========== DEBUG REQUÊTE RETRAIT ==========');
            console.log('📥 Method:', req.method);
            console.log('📥 Body brut:', req.body);
            console.log('📥 Body stringifié:', JSON.stringify(req.body));
            console.log('📥 Body type:', typeof req.body);
            console.log('📥 Body keys:', Object.keys(req.body || {}));
            console.log('📥 Query params:', JSON.stringify(req.query));
            console.log('📥 Headers:', JSON.stringify(req.headers));
            console.log('📥 Content-Type:', req.headers['content-type']);

            // Essayer d'abord le body, puis query params, puis header
            let motif_retrait = req.body ? req.body.motif_retrait || req.body.motif || req.query ? req.query.motif_retrait || req.query.motif || req.headers['x-motif-retrait'] : undefined : undefined;

            // Si le body est une string (non parsé), essayer de le parser
            if (!motif_retrait && typeof req.body === 'string' && req.body.length > 0) {
                try {
                    const parsedBody = JSON.parse(req.body);
                    motif_retrait = parsedBody.motif_retrait || parsedBody.motif;
                    console.log('📥 Body parsé manuellement:', parsedBody);
                } catch (parseError) {
                    console.warn('⚠️ Impossible de parser le body comme JSON:', parseError.message);
                }
            }

            console.log('📥 motif_retrait extrait:', motif_retrait);
            console.log('📥 Type de motif_retrait:', typeof motif_retrait);
            console.log('📥 ===========================================');

            // Valider que le motif de retrait est présent et non vide
            if (!motif_retrait || (typeof motif_retrait === 'string' && !motif_retrait.trim())) {
                console.error('❌ Validation échouée - motif_retrait manquant ou invalide');
                console.error('   Body reçu:', req.body);
                console.error('   Query reçu:', req.query);
                return res.status(400).json({
                    error: 'Le motif de retrait est obligatoire',
                    details: 'Vous devez fournir un motif de retrait pour retirer cet agent. Vous pouvez l\'envoyer via: body.motif_retrait, query.motif_retrait, ou header x-motif-retrait',
                    debug: {
                        body: req.body,
                        query: req.query,
                        method: req.method
                    }
                });
            }

            // Vérifier si la colonne motif_retrait existe, sinon la créer
            const motifRetraitColumnExists = await columnExists('agents', 'motif_retrait');
            if (!motifRetraitColumnExists) {
                await pool.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS motif_retrait TEXT');
            }

            // Vérifier si la table d'historique existe avant d'essayer d'insérer
            const checkHistoriqueTable = await pool.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'historique_retrait_restauration'
                )`
            );

            // Créer la table d'historique si elle n'existe pas (si on a les permissions)
            if (!checkHistoriqueTable.rows[0].exists) {
                console.log('📝 Tentative de création de la table historique_retrait_restauration...');
                try {
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS historique_retrait_restauration (
                            id SERIAL PRIMARY KEY,
                            id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                            type_action VARCHAR(20) NOT NULL CHECK (type_action IN ('retrait', 'restauration')),
                            motif TEXT,
                            date_action TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action)');
                    console.log('✅ Table historique_retrait_restauration créée automatiquement');

                    // Vérifier à nouveau après création
                    const recheckTable = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'historique_retrait_restauration'
                        )`
                    );
                    checkHistoriqueTable.rows[0].exists = recheckTable.rows[0].exists;
                } catch (createError) {
                    // Si erreur de permissions, on continue quand même (l'admin devra créer la table manuellement)
                    // Ne pas lancer d'erreur, juste logger un warning
                    if (createError.code === '42501' || createError.message.includes('permission') || createError.message.includes('owner')) {
                        console.warn('⚠️ Permissions insuffisantes pour créer la table. La table doit être créée manuellement par un administrateur.');
                        console.warn('   Script SQL disponible: backend/database/create_historique_retrait_restauration.sql');
                        console.warn('   L\'opération continue mais l\'historique ne sera pas enregistré si la table n\'existe pas.');
                        // Vérifier si la table existe quand même (peut-être créée entre-temps)
                        try {
                            const recheckTable = await pool.query(
                                `SELECT EXISTS (
                                    SELECT FROM information_schema.tables 
                                    WHERE table_schema = 'public' 
                                    AND table_name = 'historique_retrait_restauration'
                                )`
                            );
                            checkHistoriqueTable.rows[0].exists = recheckTable.rows[0].exists;
                            if (checkHistoriqueTable.rows[0].exists) {
                                console.log('✅ La table existe finalement, on peut continuer');
                            }
                        } catch (recheckError) {
                            // Ignorer l'erreur de vérification
                            checkHistoriqueTable.rows[0].exists = false;
                        }
                    } else {
                        console.warn('⚠️ ERREUR lors de la création de la table:', createError.message);
                        console.warn('   L\'opération continue mais l\'historique ne sera pas enregistré.');
                        checkHistoriqueTable.rows[0].exists = false;
                    }
                }
            } else {
                console.log('✅ La table historique_retrait_restauration existe déjà');

                // Vérifier et ajouter les colonnes manquantes si nécessaire
                try {
                    const requiredColumns = [
                        { name: 'id_agent', type: 'INTEGER NOT NULL', constraint: 'REFERENCES agents(id) ON DELETE CASCADE' },
                        { name: 'type_action', type: 'VARCHAR(20) NOT NULL', constraint: "CHECK (type_action IN ('retrait', 'restauration'))" },
                        { name: 'motif', type: 'TEXT', constraint: null },
                        { name: 'date_action', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null },
                        { name: 'created_at', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null },
                        { name: 'updated_at', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null }
                    ];

                    for (const col of requiredColumns) {
                        const columnCheck = await pool.query(
                            `SELECT EXISTS (
                                SELECT FROM information_schema.columns 
                                WHERE table_schema = 'public' 
                                  AND table_name = 'historique_retrait_restauration' 
                                  AND column_name = $1
                            )`, [col.name]
                        );

                        if (!columnCheck.rows[0].exists) {
                            console.log(`📝 Ajout de la colonne manquante: ${col.name}`);

                            // Pour les colonnes avec FOREIGN KEY, on ajoute d'abord sans la contrainte REFERENCES
                            if (col.constraint && col.constraint.includes('REFERENCES')) {
                                // Ajouter la colonne sans la contrainte REFERENCES d'abord
                                const typeWithoutRef = col.type.replace(' NOT NULL', '');
                                await pool.query(
                                    `ALTER TABLE historique_retrait_restauration ADD COLUMN ${col.name} ${typeWithoutRef}`
                                );

                                // Rendre NOT NULL si nécessaire (seulement si la table est vide ou après avoir rempli les valeurs)
                                if (col.type.includes('NOT NULL')) {
                                    // Vérifier si la table a des données
                                    const countResult = await pool.query('SELECT COUNT(*) as count FROM historique_retrait_restauration');
                                    if (countResult.rows[0].count === '0') {
                                        await pool.query(`ALTER TABLE historique_retrait_restauration ALTER COLUMN ${col.name} SET NOT NULL`);
                                    }
                                }

                                // Ajouter la contrainte FOREIGN KEY séparément
                                try {
                                    await pool.query(
                                        `ALTER TABLE historique_retrait_restauration ADD CONSTRAINT fk_historique_${col.name} ${col.constraint}`
                                    );
                                } catch (fkError) {
                                    console.warn(`⚠️ Impossible d'ajouter la contrainte FOREIGN KEY pour ${col.name}:`, fkError.message);
                                }
                            } else {
                                // Pour les autres colonnes, ajouter directement avec le type complet
                                await pool.query(
                                    `ALTER TABLE historique_retrait_restauration ADD COLUMN ${col.name} ${col.type}`
                                );

                                // Ajouter la contrainte CHECK si nécessaire
                                if (col.constraint && col.constraint.includes('CHECK')) {
                                    try {
                                        await pool.query(
                                            `ALTER TABLE historique_retrait_restauration ADD CONSTRAINT check_${col.name} ${col.constraint}`
                                        );
                                    } catch (checkError) {
                                        console.warn(`⚠️ Impossible d'ajouter la contrainte CHECK pour ${col.name}:`, checkError.message);
                                    }
                                }
                            }
                            console.log(`✅ Colonne ${col.name} ajoutée avec succès`);
                        }
                    }

                    // Créer les index si manquants
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_type ON historique_retrait_restauration(type_action)');

                } catch (alterError) {
                    console.warn('⚠️ Erreur lors de la vérification/correction de la structure:', alterError.message);
                    console.warn('   L\'opération continue mais certaines colonnes peuvent être manquantes.');
                }
            }

            // Enregistrer dans l'historique (si la table existe et qu'on a les permissions)
            const agentIdInt = parseInt(id, 10);
            const motifTrimmed = String(motif_retrait).trim();

            // Validation finale du motif avant de continuer
            if (!motifTrimmed || motifTrimmed.length === 0) {
                console.error('❌ ERREUR: Le motif est vide après trim');
                return res.status(400).json({
                    error: 'Le motif de retrait est obligatoire et ne peut pas être vide',
                    details: 'Le motif fourni est vide ou invalide'
                });
            }

            console.log('✅ Motif validé:', {
                original: motif_retrait,
                trimmed: motifTrimmed,
                length: motifTrimmed.length
            });

            console.log(`📝 Tentative d'enregistrement du retrait dans l'historique pour l'agent ID: ${agentIdInt}`);
            console.log(`📝 Motif de retrait: "${motifTrimmed}"`);
            console.log(`📝 Type de motif: ${typeof motifTrimmed}, Longueur: ${motifTrimmed.length}`);

            // Utiliser une transaction pour garantir la cohérence des données
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Vérifier si la table d'historique existe dans la transaction
                const checkHistoriqueInTransaction = await client.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'historique_retrait_restauration'
                    )`
                );

                const tableExists = checkHistoriqueInTransaction.rows[0].exists;
                console.log('🔍 Vérification de l\'existence de la table historique dans la transaction:', tableExists);

                // Marquer l'agent comme retiré (TOUJOURS en premier pour garantir la cohérence)
                const updateResult = await client.query(
                    'UPDATE agents SET retire = $1, date_retrait = CURRENT_TIMESTAMP, motif_retrait = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, retire, date_retrait', [true, motifTrimmed, id]
                );

                if (updateResult.rows.length === 0) {
                    throw new Error('L\'agent n\'a pas pu être mis à jour');
                }

                console.log('✅ Agent marqué comme retiré dans la table agents:', {
                    id: updateResult.rows[0].id,
                    retire: updateResult.rows[0].retire,
                    date_retrait: updateResult.rows[0].date_retrait
                });

                // Vérifier immédiatement que l'agent est bien marqué comme retiré
                const verifyAgent = await client.query(
                    'SELECT id, retire, date_retrait FROM agents WHERE id = $1', [id]
                );
                if (verifyAgent.rows.length > 0 && verifyAgent.rows[0].retire !== true) {
                    throw new Error('ERREUR CRITIQUE: L\'agent n\'est pas marqué comme retiré après la mise à jour!');
                }
                console.log('✅ Vérification post-update: Agent correctement marqué comme retiré');

                // Enregistrer dans l'historique - CRITIQUE: Cette insertion DOIT réussir
                // La table existe déjà dans la base de données, on ne tente PAS de la créer
                if (!tableExists) {
                    console.error('❌ ERREUR CRITIQUE: La table historique_retrait_restauration n\'existe pas!');
                    console.error('   La table doit être créée manuellement par un administrateur de la base de données.');
                    throw new Error('La table historique_retrait_restauration n\'existe pas. Veuillez contacter l\'administrateur de la base de données.');
                }

                console.log('✅ La table historique_retrait_restauration existe, on peut procéder à l\'insertion');

                // Vérifier que la colonne motif existe (sans essayer de la créer si on n'a pas les permissions)
                let motifColumnExists = false;
                try {
                    const motifColumnCheck = await client.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'historique_retrait_restauration' 
                            AND column_name = 'motif'
                        )`
                    );
                    motifColumnExists = motifColumnCheck.rows[0].exists;
                    console.log('🔍 Colonne motif existe:', motifColumnExists);
                } catch (checkError) {
                    console.warn('⚠️ Impossible de vérifier l\'existence de la colonne motif:', checkError.message);
                    // On continue quand même, on essaiera l'insertion
                }

                // Si la colonne n'existe pas, essayer de l'ajouter (mais ne pas bloquer si on n'a pas les permissions)
                if (!motifColumnExists) {
                    console.log('📝 La colonne motif n\'existe pas. Tentative d\'ajout...');
                    try {
                        await client.query(
                            'ALTER TABLE historique_retrait_restauration ADD COLUMN IF NOT EXISTS motif TEXT'
                        );
                        console.log('✅ Colonne motif ajoutée avec succès');
                        motifColumnExists = true;
                    } catch (alterError) {
                        // Si on n'a pas les permissions, on continue quand même
                        // L'insertion échouera si la colonne n'existe vraiment pas
                        console.warn('⚠️ Impossible d\'ajouter la colonne motif (permissions insuffisantes?):', alterError.message);
                        console.warn('   On continue quand même - l\'insertion indiquera si la colonne est vraiment manquante');
                    }
                }

                // Étape 3: Insérer dans l'historique - OBLIGATOIRE
                console.log('📝 ========== INSERTION DANS L\'HISTORIQUE ==========');
                console.log('   Agent ID:', agentIdInt);
                console.log('   Type action: retrait');
                console.log('   Motif:', motifTrimmed);
                console.log('   Longueur motif:', motifTrimmed.length);
                console.log('   Colonne motif existe:', motifColumnExists);

                // Préparer les valeurs pour l'insertion
                // Si la colonne motif n'existe pas, on essaie quand même (l'erreur SQL nous dira)
                const valuesToInsert = [agentIdInt, 'retrait', motifTrimmed];

                try {
                    // Essayer d'abord avec la colonne motif
                    let insertQuery = 'INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, id_agent, type_action, motif, date_action';

                    // Si on n'est pas sûr que la colonne motif existe, on peut essayer sans elle d'abord
                    // Mais comme la table existe et a normalement la colonne, on essaie directement avec
                    const insertResult = await client.query(
                        insertQuery,
                        valuesToInsert
                    );

                    if (!insertResult || !insertResult.rows || insertResult.rows.length === 0) {
                        throw new Error('L\'insertion a réussi mais aucun résultat n\'a été retourné');
                    }

                    const insertedRecord = insertResult.rows[0];
                    console.log('✅ INSERTION RÉUSSIE dans l\'historique:');
                    console.log('   - ID historique:', insertedRecord.id);
                    console.log('   - ID agent:', insertedRecord.id_agent);
                    console.log('   - Type action:', insertedRecord.type_action);
                    console.log('   - Motif:', insertedRecord.motif);
                    console.log('   - Date action:', insertedRecord.date_action);

                    // Vérification immédiate dans la même transaction
                    const verifyResult = await client.query(
                        'SELECT id, id_agent, type_action, motif, date_action FROM historique_retrait_restauration WHERE id = $1', [insertedRecord.id]
                    );

                    if (verifyResult.rows.length === 0) {
                        throw new Error('L\'enregistrement n\'existe pas après insertion - problème de transaction');
                    }

                    const verified = verifyResult.rows[0];
                    if (verified.motif !== motifTrimmed) {
                        console.error('⚠️ ATTENTION: Le motif enregistré ne correspond pas exactement');
                        console.error('   Attendu:', motifTrimmed);
                        console.error('   Reçu:', verified.motif);
                    } else {
                        console.log('✅ Vérification: Le motif est correctement enregistré');
                    }

                    console.log('📝 ============================================');

                } catch (insertError) {
                    console.error('❌ ========== ERREUR CRITIQUE LORS DE L\'INSERTION ==========');
                    console.error('   Code:', insertError.code);
                    console.error('   Message:', insertError.message);
                    console.error('   Detail:', insertError.detail);
                    console.error('   Hint:', insertError.hint);
                    console.error('   Position:', insertError.position);
                    console.error('   Valeurs tentées:', {
                        id_agent: agentIdInt,
                        type_action: 'retrait',
                        motif: motifTrimmed,
                        motif_length: motifTrimmed.length
                    });
                    console.error('❌ ============================================');

                    // FORCER LE ROLLBACK - L'historique est OBLIGATOIRE
                    throw new Error(`ÉCHEC CRITIQUE: Impossible d'enregistrer dans l'historique. ${insertError.message}. L'opération est annulée.`);
                }

                // Valider la transaction
                await client.query('COMMIT');
                console.log('✅ Transaction validée avec succès');

            } catch (transactionError) {
                // Rollback en cas d'erreur
                try {
                    await client.query('ROLLBACK');
                    console.error('❌ Erreur dans la transaction, rollback effectué:', transactionError);
                    console.error('   Message:', transactionError.message);
                    console.error('   Stack:', transactionError.stack);
                } catch (rollbackError) {
                    console.error('❌ Erreur lors du rollback:', rollbackError);
                } finally {
                    // Libérer le client même en cas d'erreur
                    client.release();
                }

                // Relancer l'erreur pour que l'utilisateur soit informé
                // L'historique est maintenant CRITIQUE et doit être enregistré
                throw transactionError;
            }

            // Vérifier que l'historique a bien été enregistré
            let historiqueEnregistre = false;
            let historiqueId = null;
            try {
                const checkHistorique = await pool.query(
                    'SELECT id, motif FROM historique_retrait_restauration WHERE id_agent = $1 AND type_action = $2 ORDER BY date_action DESC LIMIT 1', [id, 'retrait']
                );
                if (checkHistorique.rows.length > 0) {
                    historiqueEnregistre = true;
                    historiqueId = checkHistorique.rows[0].id;
                    console.log('✅ Vérification finale: Historique trouvé avec ID:', historiqueId);
                    console.log('   Motif enregistré:', checkHistorique.rows[0].motif);
                } else {
                    console.error('❌ PROBLÈME: Aucun historique trouvé après le retrait!');
                }
            } catch (checkError) {
                console.error('❌ Erreur lors de la vérification de l\'historique:', checkError.message);
            }

            res.json({
                success: true,
                message: 'Agent retiré avec succès',
                agent: {
                    id: id,
                    retire: true,
                    date_retrait: new Date()
                },
                historique: {
                    enregistre: historiqueEnregistre,
                    id: historiqueId,
                    message: historiqueEnregistre ?
                        'Le motif a été enregistré dans l\'historique' : 'ATTENTION: Le motif n\'a pas pu être enregistré dans l\'historique'
                }
            });
        } catch (error) {
            console.error('Erreur lors du retrait de l\'agent:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Restaurer un agent retiré
    async restore(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si l'agent existe
            const checkAgent = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
            if (checkAgent.rows.length === 0) {
                return res.status(404).json({
                    error: 'Agent non trouvé'
                });
            }

            const agent = checkAgent.rows[0];
            if (agent.retire !== true) {
                return res.status(400).json({
                    error: 'Cet agent n\'est pas retiré'
                });
            }

            // Récupérer le motif de restauration depuis le body de la requête
            console.log('📥 Body de la requête reçu:', JSON.stringify(req.body));
            console.log('📥 Type de req.body:', typeof req.body);
            console.log('📥 Clés dans req.body:', Object.keys(req.body || {}));

            const { motif_restauration } = req.body;
            console.log('📥 motif_restauration extrait:', motif_restauration);
            console.log('📥 Type de motif_restauration:', typeof motif_restauration);

            // Valider que le motif de restauration est fourni
            if (!motif_restauration || typeof motif_restauration !== 'string' || !motif_restauration.trim()) {
                console.error('❌ Validation échouée - motif_restauration manquant ou invalide');
                return res.status(400).json({
                    error: 'Le motif de restauration est obligatoire',
                    details: 'Vous devez fournir un motif de restauration pour restaurer cet agent'
                });
            }

            // Fonction helper pour vérifier si une colonne existe dans une table
            const columnExists = async(tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            // Vérifier si la colonne motif_restauration existe, sinon la créer
            const motifRestorationColumnExists = await columnExists('agents', 'motif_restauration');
            if (!motifRestorationColumnExists) {
                await pool.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS motif_restauration TEXT');
            }

            // Vérifier si la table d'historique existe avant d'essayer d'insérer
            const checkHistoriqueTable = await pool.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'historique_retrait_restauration'
                )`
            );

            // Créer la table d'historique si elle n'existe pas
            if (!checkHistoriqueTable.rows[0].exists) {
                console.log('📝 Création de la table historique_retrait_restauration...');
                try {
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS historique_retrait_restauration (
                            id SERIAL PRIMARY KEY,
                            id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                            type_action VARCHAR(20) NOT NULL CHECK (type_action IN ('retrait', 'restauration')),
                            motif TEXT,
                            date_action TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action)');
                    console.log('✅ Table historique_retrait_restauration créée automatiquement');

                    // Vérifier à nouveau après création
                    const recheckTable = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'historique_retrait_restauration'
                        )`
                    );
                    checkHistoriqueTable.rows[0].exists = recheckTable.rows[0].exists;

                    if (!checkHistoriqueTable.rows[0].exists) {
                        console.warn('⚠️ La table n\'existe toujours pas après création. L\'opération continue mais l\'historique ne sera pas enregistré.');
                    }
                } catch (createError) {
                    // Si erreur de permissions, on continue quand même (l'admin devra créer la table manuellement)
                    // NE PAS LANCER D'ERREUR - juste logger un warning et continuer
                    if (createError.code === '42501' || createError.message.includes('permission') || createError.message.includes('owner')) {
                        console.warn('⚠️ Permissions insuffisantes pour créer la table. La table doit être créée manuellement par un administrateur.');
                        console.warn('   Script SQL disponible: backend/database/create_historique_retrait_restauration.sql');
                        console.warn('   L\'opération continue mais l\'historique ne sera pas enregistré si la table n\'existe pas.');
                        // Vérifier si la table existe quand même (peut-être créée entre-temps)
                        try {
                            const recheckTable = await pool.query(
                                `SELECT EXISTS (
                                    SELECT FROM information_schema.tables 
                                    WHERE table_schema = 'public' 
                                    AND table_name = 'historique_retrait_restauration'
                                )`
                            );
                            checkHistoriqueTable.rows[0].exists = recheckTable.rows[0].exists;
                            if (checkHistoriqueTable.rows[0].exists) {
                                console.log('✅ La table existe finalement, on peut continuer');
                            }
                        } catch (recheckError) {
                            // Ignorer l'erreur de vérification
                            checkHistoriqueTable.rows[0].exists = false;
                        }
                    } else {
                        console.warn('⚠️ ERREUR lors de la création de la table:', createError.message);
                        console.warn('   L\'opération continue mais l\'historique ne sera pas enregistré.');
                        checkHistoriqueTable.rows[0].exists = false;
                    }
                }
            } else {
                console.log('✅ La table historique_retrait_restauration existe déjà');

                // Vérifier et ajouter les colonnes manquantes si nécessaire
                try {
                    const requiredColumns = [
                        { name: 'id_agent', type: 'INTEGER NOT NULL', constraint: 'REFERENCES agents(id) ON DELETE CASCADE' },
                        { name: 'type_action', type: 'VARCHAR(20) NOT NULL', constraint: "CHECK (type_action IN ('retrait', 'restauration'))" },
                        { name: 'motif', type: 'TEXT', constraint: null },
                        { name: 'date_action', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null },
                        { name: 'created_at', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null },
                        { name: 'updated_at', type: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', constraint: null }
                    ];

                    for (const col of requiredColumns) {
                        const columnCheck = await pool.query(
                            `SELECT EXISTS (
                                SELECT FROM information_schema.columns 
                                WHERE table_schema = 'public' 
                                  AND table_name = 'historique_retrait_restauration' 
                                  AND column_name = $1
                            )`, [col.name]
                        );

                        if (!columnCheck.rows[0].exists) {
                            console.log(`📝 Ajout de la colonne manquante: ${col.name}`);

                            // Pour les colonnes avec FOREIGN KEY, on ajoute d'abord sans la contrainte REFERENCES
                            if (col.constraint && col.constraint.includes('REFERENCES')) {
                                // Ajouter la colonne sans la contrainte REFERENCES d'abord
                                const typeWithoutRef = col.type.replace(' NOT NULL', '');
                                await pool.query(
                                    `ALTER TABLE historique_retrait_restauration ADD COLUMN ${col.name} ${typeWithoutRef}`
                                );

                                // Rendre NOT NULL si nécessaire (seulement si la table est vide ou après avoir rempli les valeurs)
                                if (col.type.includes('NOT NULL')) {
                                    // Vérifier si la table a des données
                                    const countResult = await pool.query('SELECT COUNT(*) as count FROM historique_retrait_restauration');
                                    if (countResult.rows[0].count === '0') {
                                        await pool.query(`ALTER TABLE historique_retrait_restauration ALTER COLUMN ${col.name} SET NOT NULL`);
                                    }
                                }

                                // Ajouter la contrainte FOREIGN KEY séparément
                                try {
                                    await pool.query(
                                        `ALTER TABLE historique_retrait_restauration ADD CONSTRAINT fk_historique_${col.name} ${col.constraint}`
                                    );
                                } catch (fkError) {
                                    console.warn(`⚠️ Impossible d'ajouter la contrainte FOREIGN KEY pour ${col.name}:`, fkError.message);
                                }
                            } else {
                                // Pour les autres colonnes, ajouter directement avec le type complet
                                await pool.query(
                                    `ALTER TABLE historique_retrait_restauration ADD COLUMN ${col.name} ${col.type}`
                                );

                                // Ajouter la contrainte CHECK si nécessaire
                                if (col.constraint && col.constraint.includes('CHECK')) {
                                    try {
                                        await pool.query(
                                            `ALTER TABLE historique_retrait_restauration ADD CONSTRAINT check_${col.name} ${col.constraint}`
                                        );
                                    } catch (checkError) {
                                        console.warn(`⚠️ Impossible d'ajouter la contrainte CHECK pour ${col.name}:`, checkError.message);
                                    }
                                }
                            }
                            console.log(`✅ Colonne ${col.name} ajoutée avec succès`);
                        }
                    }

                    // Créer les index si manquants
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action)');
                    await pool.query('CREATE INDEX IF NOT EXISTS idx_historique_type ON historique_retrait_restauration(type_action)');

                } catch (alterError) {
                    console.warn('⚠️ Erreur lors de la vérification/correction de la structure:', alterError.message);
                    console.warn('   L\'opération continue mais certaines colonnes peuvent être manquantes.');
                }
            }

            // Enregistrer dans l'historique (si la table existe et qu'on a les permissions)
            const agentIdInt = parseInt(id, 10);
            const motifTrimmed = motif_restauration ? motif_restauration.trim() : null;

            console.log(`📝 Tentative d'enregistrement de la restauration dans l'historique pour l'agent ID: ${agentIdInt}`);
            console.log(`📝 Motif de restauration: "${motifTrimmed}"`);
            console.log(`📝 Type de motif: ${typeof motifTrimmed}, Longueur: ${motifTrimmed ? motifTrimmed.length : 0}`);

            // Utiliser une transaction pour garantir la cohérence des données
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Vérifier si la table d'historique existe dans la transaction
                const checkHistoriqueInTransaction = await client.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'historique_retrait_restauration'
                    )`
                );

                const tableExists = checkHistoriqueInTransaction.rows[0].exists;
                console.log('🔍 Vérification de l\'existence de la table historique dans la transaction:', tableExists);

                // Restaurer l'agent
                await client.query(
                    'UPDATE agents SET retire = false, date_retrait = NULL, motif_restauration = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [motifTrimmed, id]
                );
                console.log('✅ Agent restauré dans la table agents');

                // Réactiver le compte utilisateur associé si existe
                try {
                    const userTableExists = await client.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'utilisateurs'
                        )`
                    );
                    if (userTableExists.rows[0].exists) {
                        await client.query(
                            'UPDATE utilisateurs SET is_active = true WHERE id_agent = $1', [id]
                        );
                        console.log('✅ Compte utilisateur réactivé');
                    }
                } catch (error) {
                    console.error('Erreur lors de la réactivation du compte utilisateur:', error.message);
                }

                // Enregistrer dans l'historique - La table existe, on insère directement
                // Note: La colonne motif existe déjà dans la table, pas besoin de la créer
                try {
                    // Préparer les valeurs pour l'insertion
                    const valuesToInsert = [agentIdInt, 'restauration', motifTrimmed];
                    console.log('📝 Tentative d\'insertion dans l\'historique avec les valeurs:', {
                        id_agent: agentIdInt,
                        type_action: 'restauration',
                        motif: motifTrimmed
                    });

                    // Insérer dans l'historique
                    const insertResult = await client.query(
                        'INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, id_agent, type_action, motif, date_action',
                        valuesToInsert
                    );

                    if (insertResult && insertResult.rows && insertResult.rows.length > 0) {
                        const insertedRecord = insertResult.rows[0];
                        console.log(`✅ Événement de restauration ENREGISTRÉ avec succès dans l'historique:`);
                        console.log(`   - ID historique: ${insertedRecord.id}`);
                        console.log(`   - ID agent: ${insertedRecord.id_agent}`);
                        console.log(`   - Type action: ${insertedRecord.type_action}`);
                        console.log(`   - Motif: "${insertedRecord.motif}"`);
                        console.log(`   - Date action: ${insertedRecord.date_action}`);

                        // Vérifier que l'enregistrement existe vraiment dans la base
                        const verifyResult = await client.query(
                            'SELECT * FROM historique_retrait_restauration WHERE id = $1', [insertedRecord.id]
                        );
                        if (verifyResult.rows.length > 0) {
                            console.log('✅ Vérification post-insertion réussie - L\'enregistrement existe dans la base');
                        } else {
                            console.error('❌ PROBLÈME: L\'enregistrement n\'existe pas après insertion!');
                        }
                    } else {
                        console.error('❌ L\'insertion a réussi mais aucun résultat retourné');
                        console.error('   insertResult:', insertResult);
                    }
                } catch (insertError) {
                    // Logger l'erreur complète pour le débogage
                    console.error('❌ ERREUR DÉTAILLÉE lors de l\'INSERT dans l\'historique:');
                    console.error('   Code:', insertError.code);
                    console.error('   Message:', insertError.message);
                    console.error('   Detail:', insertError.detail);
                    console.error('   Hint:', insertError.hint);
                    console.error('   Position:', insertError.position);
                    console.error('   Stack:', insertError.stack);

                    // Pour TOUTES les erreurs d'insertion dans l'historique, on continue quand même
                    // L'opération principale (retrait/restauration de l'agent) doit réussir même si l'historique échoue
                    console.warn('⚠️ Erreur lors de l\'enregistrement dans l\'historique. L\'opération principale continue.');
                    console.warn('   L\'agent sera retiré/restauré mais l\'historique ne sera pas enregistré.');
                    console.warn('   Vérifiez les permissions et la structure de la table historique_retrait_restauration.');

                    // On ne fait PAS de rollback - l'opération principale doit réussir
                    // L'historique est secondaire
                }

                // Si la table n'existe pas (ne devrait pas arriver si elle existe déjà)
                if (!tableExists) {
                    console.error('❌ La table historique_retrait_restauration n\'existe pas. Tentative de création...');
                    try {
                        await client.query(`
                            CREATE TABLE IF NOT EXISTS historique_retrait_restauration (
                                id SERIAL PRIMARY KEY,
                                id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                                type_action VARCHAR(20) NOT NULL CHECK (type_action IN ('retrait', 'restauration')),
                                motif TEXT,
                                date_action TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                        await client.query('CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent)');
                        await client.query('CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action)');
                        console.log('✅ Table historique_retrait_restauration créée dans la transaction');

                        // Réessayer l'insertion
                        const insertResult = await client.query(
                            'INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, id_agent, type_action, motif, date_action', [agentIdInt, 'restauration', motifTrimmed]
                        );

                        if (insertResult && insertResult.rows && insertResult.rows.length > 0) {
                            const insertedRecord = insertResult.rows[0];
                            console.log(`✅ Événement de restauration ENREGISTRÉ avec succès dans l'historique (après création de la table):`);
                            console.log(`   - ID historique: ${insertedRecord.id}`);
                            console.log(`   - ID agent: ${insertedRecord.id_agent}`);
                            console.log(`   - Type action: ${insertedRecord.type_action}`);
                            console.log(`   - Motif: "${insertedRecord.motif}"`);
                            console.log(`   - Date action: ${insertedRecord.date_action}`);
                        }
                    } catch (createError) {
                        console.error('❌ Impossible de créer la table ou d\'insérer dans l\'historique:', createError.message);
                        console.error('   Code:', createError.code);
                        console.error('   Detail:', createError.detail);
                    }
                }

                // Valider la transaction
                await client.query('COMMIT');
                console.log('✅ Transaction validée avec succès');

            } catch (transactionError) {
                // Rollback en cas d'erreur
                try {
                    await client.query('ROLLBACK');
                    console.error('❌ Erreur dans la transaction, rollback effectué:', transactionError);
                } catch (rollbackError) {
                    console.error('❌ Erreur lors du rollback:', rollbackError);
                }
                // Ne pas relancer l'erreur si c'est juste un problème d'historique
                // L'agent doit être retiré même si l'historique échoue
                if (transactionError.message && transactionError.message.includes('historique')) {
                    console.warn('⚠️ Erreur d\'historique ignorée - L\'agent a été retiré avec succès');
                } else {
                    throw transactionError;
                }
            } finally {
                // Libérer le client
                client.release();
            }

            res.json({
                success: true,
                message: 'Agent restauré avec succès',
                agent: {
                    id: id,
                    retire: false
                }
            });
        } catch (error) {
            console.error('Erreur lors de la restauration de l\'agent:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer l'historique des retraits et restaurations d'un agent
    // MÉTHODE ROBUSTE : Récupère TOUS les motifs liés à l'agent, qu'ils forment des paires ou non
    async getHistoriqueRetraitRestauration(req, res) {
        try {
            const { id } = req.params;
            const agentId = parseInt(id, 10);

            if (isNaN(agentId)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID agent invalide'
                });
            }

            // Ajouter des headers pour éviter le cache
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            console.log(`🔍 Récupération de l'historique pour l'agent ID: ${agentId}`);

            // ÉTAPE 1: Récupérer TOUS les événements depuis la base de données
            let tousLesEvenements = [];

            // Vérifier si la table d'historique existe
            const checkHistoriqueTable = await pool.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'historique_retrait_restauration'
                )`
            );

            const tableExists = checkHistoriqueTable.rows[0].exists;
            console.log(`📊 Table historique_retrait_restauration existe: ${tableExists}`);

            // VÉRIFICATION COMPLÈTE : Vérifier si les données existent vraiment dans la table
            if (tableExists) {
                try {
                    console.log(`\n🔍 ===== VÉRIFICATION COMPLÈTE DE LA BASE DE DONNÉES POUR L'AGENT ${agentId} =====`);

                    // 1. Compter TOUS les événements dans la table (tous agents confondus)
                    try {
                        const totalCount = await pool.query(
                            `SELECT COUNT(*) as total FROM historique_retrait_restauration`
                        );
                        console.log(`📊 Total d'événements dans la table (tous agents): ${totalCount.rows[0].total}`);
                    } catch (err) {
                        if (err.code === '42501' || err.message.includes('permission')) {
                            console.warn(`⚠️ Permissions insuffisantes pour compter les événements: ${err.message}`);
                        } else {
                            console.error(`❌ Erreur lors du comptage: ${err.message}`);
                        }
                    }

                    // 2. Récupérer TOUS les événements pour voir ce qui existe
                    try {
                        const allEventsCheck = await pool.query(
                            `SELECT id, id_agent, type_action, motif, date_action 
                             FROM historique_retrait_restauration 
                             ORDER BY id DESC LIMIT 100`
                        );
                        console.log(`📊 ${allEventsCheck.rows.length} événement(s) récent(s) dans la table:`);

                        // Vérifier combien correspondent à cet agent
                        let matchingCount = 0;
                        allEventsCheck.rows.forEach((row, idx) => {
                            const rowId = row.id_agent;
                            const matches = (rowId == agentId ||
                                parseInt(rowId) === agentId ||
                                String(rowId) === String(agentId));
                            if (matches) {
                                matchingCount++;
                                console.log(`   ✅ ${idx + 1}. ID: ${row.id}, id_agent: ${row.id_agent} (type: ${typeof row.id_agent}), Type: ${row.type_action}, Motif: "${row.motif}", Date: ${row.date_action}`);
                            } else if (idx < 10) {
                                console.log(`   ❌ ${idx + 1}. ID: ${row.id}, id_agent: ${row.id_agent} (type: ${typeof row.id_agent}), Type: ${row.type_action}, Motif: "${row.motif}"`);
                            }
                        });
                        console.log(`📊 ${matchingCount} événement(s) trouvé(s) pour l'agent ${agentId} dans les 100 plus récents`);
                    } catch (err) {
                        if (err.code === '42501' || err.message.includes('permission')) {
                            console.warn(`⚠️ Permissions insuffisantes pour lire les événements: ${err.message}`);
                        } else {
                            console.error(`❌ Erreur lors de la récupération: ${err.message}`);
                        }
                    }

                    // 3. Compter avec différentes méthodes SQL
                    const countMethods = [
                        { name: 'id_agent = $1', query: `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE id_agent = $1`, params: [agentId] },
                        { name: 'CAST(id_agent AS INTEGER) = $1', query: `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE CAST(id_agent AS INTEGER) = $1`, params: [agentId] },
                        { name: 'id_agent::text = $1', query: `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE id_agent::text = $1`, params: [agentId.toString()] },
                        { name: 'id_agent = $1::integer', query: `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE id_agent = $1::integer`, params: [agentId] }
                    ];

                    console.log(`\n📊 Comptage avec différentes méthodes SQL:`);
                    for (const method of countMethods) {
                        try {
                            const result = await pool.query(method.query, method.params);
                            console.log(`   ${method.name}: ${result.rows[0].count} événement(s)`);
                        } catch (err) {
                            if (err.code === '42501' || err.message.includes('permission')) {
                                console.log(`   ${method.name}: PERMISSION DENIED`);
                            } else {
                                console.log(`   ${method.name}: ERREUR - ${err.message}`);
                            }
                        }
                    }

                    // 4. Récupérer directement avec différentes méthodes
                    console.log(`\n📊 Récupération directe avec différentes méthodes:`);
                    const selectMethods = [
                        { name: 'id_agent = $1', query: `SELECT id, id_agent, type_action, motif, date_action FROM historique_retrait_restauration WHERE id_agent = $1`, params: [agentId] },
                        { name: 'CAST(id_agent AS INTEGER) = $1', query: `SELECT id, id_agent, type_action, motif, date_action FROM historique_retrait_restauration WHERE CAST(id_agent AS INTEGER) = $1`, params: [agentId] },
                        { name: 'id_agent::text = $1', query: `SELECT id, id_agent, type_action, motif, date_action FROM historique_retrait_restauration WHERE id_agent::text = $1`, params: [agentId.toString()] }
                    ];

                    for (const method of selectMethods) {
                        try {
                            const result = await pool.query(method.query, method.params);
                            console.log(`   ${method.name}: ${result.rows.length} événement(s)`);
                            if (result.rows.length > 0) {
                                result.rows.forEach((row, idx) => {
                                    console.log(`      ${idx + 1}. ID: ${row.id}, Type: ${row.type_action}, Motif: "${row.motif}", Date: ${row.date_action}`);
                                });
                            }
                        } catch (err) {
                            if (err.code === '42501' || err.message.includes('permission')) {
                                console.log(`   ${method.name}: PERMISSION DENIED`);
                            } else {
                                console.log(`   ${method.name}: ERREUR - ${err.message}`);
                            }
                        }
                    }

                    console.log(`🔍 ===== FIN DE LA VÉRIFICATION =====\n`);

                } catch (checkError) {
                    if (checkError.code === '42501' || checkError.message.includes('permission')) {
                        console.warn(`⚠️ Permissions insuffisantes pour vérifier la table: ${checkError.message}`);
                    } else {
                        console.error(`❌ Erreur lors de la vérification: ${checkError.message}`);
                        console.error('Stack:', checkError.stack);
                    }
                }
            } else {
                console.error(`❌ La table historique_retrait_restauration n'existe pas!`);
            }

            // NOUVELLE MÉTHODE ROBUSTE : Récupérer TOUS les événements de la table puis filtrer en JavaScript
            // Cette méthode garantit qu'on ne manque aucun événement, peu importe le type de données de id_agent
            if (tableExists) {
                try {
                    console.log(`🔍 Récupération de TOUS les événements depuis historique_retrait_restauration pour l'agent ${agentId}...`);

                    // ÉTAPE 1: Récupérer TOUS les événements de la table (sans filtre WHERE)
                    // Cela garantit qu'on ne manque rien, même si le type de id_agent est différent
                    let allEventsResult;
                    try {
                        allEventsResult = await pool.query(
                            `SELECT 
                                id,
                                id_agent,
                                type_action,
                                motif,
                                date_action,
                                created_at
                            FROM historique_retrait_restauration
                            ORDER BY date_action ASC, id ASC`
                        );
                    } catch (queryError) {
                        if (queryError.code === '42501' || queryError.message.includes('permission')) {
                            console.warn(`⚠️ Permissions insuffisantes pour lire la table historique_retrait_restauration`);
                            console.warn(`   Contactez un administrateur pour accorder les permissions nécessaires.`);
                            allEventsResult = { rows: [] };
                        } else {
                            throw queryError;
                        }
                    }

                    const allEvents = allEventsResult.rows || [];
                    console.log(`📊 Total d'événements dans la table historique_retrait_restauration: ${allEvents.length}`);

                    // ÉTAPE 2: Filtrer en JavaScript pour cet agent avec plusieurs méthodes de comparaison
                    // Cela gère tous les cas : id_agent en integer, text, string, etc.
                    const agentIdStr = String(agentId);
                    const agentIdInt = parseInt(agentId, 10);

                    tousLesEvenements = allEvents.filter(row => {
                        const rowAgentId = row.id_agent;

                        // Comparer de plusieurs manières pour être sûr de ne rien manquer
                        const match1 = rowAgentId === agentId; // Comparaison stricte
                        const match2 = rowAgentId == agentId; // Comparaison lâche
                        const match3 = parseInt(rowAgentId) === agentIdInt; // Conversion en integer
                        const match4 = String(rowAgentId) === agentIdStr; // Conversion en string
                        const match5 = Number(rowAgentId) === agentIdInt; // Conversion en number

                        return match1 || match2 || match3 || match4 || match5;
                    });

                    console.log(`✅ ${tousLesEvenements.length} événement(s) trouvé(s) pour l'agent ${agentId} après filtrage JavaScript`);

                    // Log détaillé des événements trouvés
                    if (tousLesEvenements.length > 0) {
                        console.log(`📋 Détail des événements récupérés:`);
                        tousLesEvenements.forEach((e, index) => {
                            console.log(`   ${index + 1}. ID: ${e.id}, id_agent: ${e.id_agent} (type: ${typeof e.id_agent}), Type: ${e.type_action}, Date: ${e.date_action}, Motif: "${e.motif}"`);
                        });
                    } else {
                        console.warn(`⚠️ Aucun événement trouvé pour l'agent ${agentId} après filtrage`);

                        // Afficher des exemples pour débogage
                        if (allEvents.length > 0) {
                            console.log(`🔍 Exemples d'événements dans la table (20 premiers):`);
                            allEvents.slice(0, 20).forEach((row, idx) => {
                                const rowIdStr = String(row.id_agent);
                                const rowIdInt = parseInt(row.id_agent, 10);
                                const matches = (row.id_agent === agentId ||
                                    row.id_agent == agentId ||
                                    rowIdInt === agentIdInt ||
                                    rowIdStr === agentIdStr);
                                const matchMark = matches ? ' ✅ MATCH!' : '';
                                console.log(`   ${idx + 1}. ID: ${row.id}, id_agent: ${row.id_agent} (type: ${typeof row.id_agent}, parsed: ${rowIdInt}), Type: ${row.type_action}, Motif: "${row.motif}"${matchMark}`);
                            });
                        }
                    }

                    // Utiliser une Map pour éviter les doublons (basé sur l'ID)
                    const uniqueEvents = new Map();
                    tousLesEvenements.forEach(event => {
                        if (event.id) {
                            uniqueEvents.set(event.id, event);
                        } else {
                            // Pour les événements sans ID, utiliser une clé composite
                            const key = `${event.type_action}_${event.motif}_${event.date_action}`;
                            uniqueEvents.set(key, event);
                        }
                    });

                    tousLesEvenements = Array.from(uniqueEvents.values());
                    console.log(`✅ ${tousLesEvenements.length} événement(s) unique(s) après dédoublonnage`);

                } catch (error) {
                    if (error.code === '42501' || error.message.includes('permission')) {
                        console.warn(`⚠️ Permissions insuffisantes pour lire la table: ${error.message}`);
                        tousLesEvenements = [];
                    } else {
                        console.error('❌ Erreur lors de la récupération depuis historique_retrait_restauration:', error.message);
                        console.error('Détails:', error);
                        console.error('Stack:', error.stack);
                        tousLesEvenements = [];
                    }
                }
            } else {
                console.warn(`⚠️ La table historique_retrait_restauration n'existe pas`);
                tousLesEvenements = [];
            }

            // IMPORTANT: On récupère UNIQUEMENT depuis la table historique_retrait_restauration
            // Ne pas ajouter depuis la table agents car tous les motifs doivent être dans l'historique
            if (tousLesEvenements.length === 0) {
                console.warn(`⚠️ ATTENTION: Aucun événement trouvé dans l'historique pour l'agent ${agentId}`);
                console.warn(`   Cela signifie que soit:`);
                console.warn(`   1. Aucun retrait/restauration n'a encore été effectué pour cet agent`);
                console.warn(`   2. Il y a un problème avec les requêtes (vérifier les logs ci-dessus)`);
                console.warn(`   3. Les événements existent mais avec un id_agent de type différent`);

                // Requête de débogage: récupérer TOUS les événements de la table pour voir ce qui se passe
                try {
                    const debugQuery = await pool.query(
                        `SELECT id, id_agent, type_action, motif, date_action 
                         FROM historique_retrait_restauration 
                         ORDER BY id DESC LIMIT 50`
                    );
                    console.log(`🔍 DEBUG: ${debugQuery.rows.length} événement(s) récents dans la table (tous agents confondus):`);
                    debugQuery.rows.forEach((row, idx) => {
                        const matches = (row.id_agent == agentId || parseInt(row.id_agent) === agentId || String(row.id_agent) === String(agentId));
                        const matchMark = matches ? ' ✅ MATCH' : '';
                        console.log(`   ${idx + 1}. ID: ${row.id}, id_agent: ${row.id_agent} (type: ${typeof row.id_agent}), type: ${row.type_action}, motif: "${row.motif}"${matchMark}`);
                    });

                    // Vérifier spécifiquement pour cet agent avec une requête directe
                    try {
                        const directCheck = await pool.query(
                            `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE id_agent = $1`, [agentId]
                        );
                        console.log(`🔍 Vérification directe (id_agent = $1): ${directCheck.rows[0].count} événement(s)`);
                    } catch (err) {
                        if (err.code === '42501' || err.message.includes('permission')) {
                            console.log(`🔍 Vérification directe: PERMISSION DENIED`);
                        } else {
                            console.log(`🔍 Vérification directe: ERREUR - ${err.message}`);
                        }
                    }

                    // Vérifier avec CAST
                    try {
                        const castCheck = await pool.query(
                            `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE CAST(id_agent AS INTEGER) = $1`, [agentId]
                        );
                        console.log(`🔍 Vérification avec CAST: ${castCheck.rows[0].count} événement(s)`);
                    } catch (err) {
                        if (err.code === '42501' || err.message.includes('permission')) {
                            console.log(`🔍 Vérification avec CAST: PERMISSION DENIED`);
                        } else {
                            console.log(`🔍 Vérification avec CAST: ERREUR - ${err.message}`);
                        }
                    }

                    // Vérifier avec texte
                    try {
                        const textCheck = await pool.query(
                            `SELECT COUNT(*) as count FROM historique_retrait_restauration WHERE id_agent::text = $1`, [agentId.toString()]
                        );
                        console.log(`🔍 Vérification avec texte: ${textCheck.rows[0].count} événement(s)`);
                    } catch (err) {
                        if (err.code === '42501' || err.message.includes('permission')) {
                            console.log(`🔍 Vérification avec texte: PERMISSION DENIED`);
                        } else {
                            console.log(`🔍 Vérification avec texte: ERREUR - ${err.message}`);
                        }
                    }
                } catch (debugError) {
                    if (debugError.code === '42501' || debugError.message.includes('permission')) {
                        console.warn('⚠️ Permissions insuffisantes pour la requête de débogage');
                    } else {
                        console.error('❌ Erreur lors de la requête de débogage:', debugError.message);
                    }
                }
            }

            // ÉTAPE 2: Trier tous les événements par date (du plus ancien au plus récent)
            tousLesEvenements.sort((a, b) => {
                const dateA = a.date_action ? new Date(a.date_action).getTime() : 0;
                const dateB = b.date_action ? new Date(b.date_action).getTime() : 0;
                if (dateA !== dateB) {
                    return dateA - dateB;
                }
                // Si même date, prioriser retrait avant restauration
                if (a.type_action !== b.type_action) {
                    return a.type_action === 'retrait' ? -1 : 1;
                }
                return (a.id || 0) - (b.id || 0);
            });

            console.log(`📊 ${tousLesEvenements.length} événement(s) trié(s) chronologiquement`);

            // ÉTAPE 3: Grouper en paires de manière simple
            // IMPORTANT: S'assurer que TOUS les événements sont inclus, même s'ils ne forment pas de paires complètes
            let historiquePaires = [];
            const evenementsTraites = new Set(); // Pour suivre tous les événements traités

            for (let i = 0; i < tousLesEvenements.length; i++) {
                const event = tousLesEvenements[i];

                // Si l'événement a déjà été traité, passer au suivant
                if (evenementsTraites.has(i)) {
                    continue;
                }

                if (event.type_action === 'retrait') {
                    // Chercher la première restauration non utilisée qui vient après ce retrait
                    let restauration = null;
                    let indexRestauration = -1;

                    for (let j = i + 1; j < tousLesEvenements.length; j++) {
                        const nextEvent = tousLesEvenements[j];
                        if (nextEvent.type_action === 'restauration' && !evenementsTraites.has(j)) {
                            restauration = nextEvent;
                            indexRestauration = j;
                            evenementsTraites.add(j); // Marquer la restauration comme utilisée
                            break;
                        }
                        // Si on trouve un autre retrait, on s'arrête
                        if (nextEvent.type_action === 'retrait') {
                            break;
                        }
                    }

                    historiquePaires.push({
                        retrait: event,
                        restauration: restauration,
                        date_retrait: event.date_action,
                        date_restauration: restauration ? restauration.date_action : null
                    });
                    evenementsTraites.add(i); // Marquer le retrait comme traité
                } else if (event.type_action === 'restauration') {
                    // Restauration orpheline (sans retrait précédent) - TOUJOURS l'inclure
                    historiquePaires.push({
                        retrait: null,
                        restauration: event,
                        date_retrait: null,
                        date_restauration: event.date_action
                    });
                    evenementsTraites.add(i); // Marquer la restauration comme traitée
                }
            }

            // VÉRIFICATION FINALE: S'assurer qu'aucun événement n'a été perdu
            const evenementsManquants = [];
            for (let i = 0; i < tousLesEvenements.length; i++) {
                if (!evenementsTraites.has(i)) {
                    evenementsManquants.push(tousLesEvenements[i]);
                }
            }

            // Ajouter les événements manquants comme paires incomplètes
            if (evenementsManquants.length > 0) {
                console.warn(`⚠️ ${evenementsManquants.length} événement(s) n'ont pas été inclus dans les paires, ajout en cours...`);
                evenementsManquants.forEach(event => {
                    if (event.type_action === 'retrait') {
                        historiquePaires.push({
                            retrait: event,
                            restauration: null,
                            date_retrait: event.date_action,
                            date_restauration: null
                        });
                    } else if (event.type_action === 'restauration') {
                        historiquePaires.push({
                            retrait: null,
                            restauration: event,
                            date_retrait: null,
                            date_restauration: event.date_action
                        });
                    }
                });
                console.log(`✅ ${evenementsManquants.length} événement(s) manquant(s) ajouté(s) comme paires incomplètes`);
            }

            // ÉTAPE 4: Trier les paires par date décroissante (plus récent en premier)
            historiquePaires.sort((a, b) => {
                const dateA = a.date_retrait ? new Date(a.date_retrait).getTime() : (a.date_restauration ? new Date(a.date_restauration).getTime() : 0);
                const dateB = b.date_retrait ? new Date(b.date_retrait).getTime() : (b.date_restauration ? new Date(b.date_restauration).getTime() : 0);
                return dateB - dateA;
            });

            console.log(`✅ ${historiquePaires.length} paire(s) formée(s) pour l'agent ${agentId}`);
            console.log(`📊 Résumé final:`);
            console.log(`   - Événements récupérés depuis historique_retrait_restauration: ${tousLesEvenements.length}`);
            console.log(`   - Paires formées (incluant événements seuls): ${historiquePaires.length}`);

            historiquePaires.forEach((paire, index) => {
                if (paire.retrait && paire.restauration) {
                    console.log(`  ${index + 1}. Retrait (${paire.date_retrait}) + Restauration (${paire.date_restauration})`);
                } else if (paire.retrait) {
                    console.log(`  ${index + 1}. Retrait seul (${paire.date_retrait})`);
                } else if (paire.restauration) {
                    console.log(`  ${index + 1}. Restauration seule (${paire.date_restauration})`);
                }
            });

            // Vérification finale: s'assurer qu'on retourne bien tous les événements
            if (tousLesEvenements.length > 0 && historiquePaires.length === 0) {
                console.error(`❌ ERREUR: ${tousLesEvenements.length} événement(s) récupéré(s) mais aucune paire formée!`);
            }

            res.json({
                success: true,
                data: historiquePaires
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les agents retirés (pour l'historique)
    async getRetiredAgents(req, res) {
        try {
            // Vérifier si la colonne retire existe
            const columnExists = async(tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            const retireColumnExists = await columnExists('agents', 'retire');

            // Si la colonne n'existe pas, retourner une liste vide
            if (!retireColumnExists) {
                return res.json({
                    data: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalCount: 0,
                        limit: 10,
                        hasNextPage: false,
                        hasPrevPage: false,
                        startIndex: 0,
                        endIndex: 0
                    }
                });
            }

            // Si la colonne n'existe pas, retourner une liste vide
            if (!retireColumnExists) {
                return res.json({
                    data: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalCount: 0,
                        limit: 10,
                        hasNextPage: false,
                        hasPrevPage: false,
                        startIndex: 0,
                        endIndex: 0
                    }
                });
            }

            const {
                page = 1,
                    limit = 10,
                    search,
                    sortBy = 'date_retrait',
                    sortOrder = 'DESC'
            } = req.query;

            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    a.*,
                    a.email,
                    a.telephone1,
                    a.telephone2,
                    CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                    CONCAT(a.prenom, ' ', a.nom) as nom_prenom,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    ea.nom as entite_nom,
                    m.nom as ministere_nom,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    srv.libelle as service_libelle,
                    cat.libele as categorie_libele,
                    p.libele as position_libele,
                    fa_actuelle.fonction_libele as fonction_actuelle_libele,
                    ea_actuel.emploi_libele as emploi_actuel_libele,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    ech_actuelle.echelon_libele as echelon_libele,
                    CASE 
                        WHEN a.sexe = 'M' THEN 'Masculin'
                        WHEN a.sexe = 'F' THEN 'Féminin'
                        WHEN a.sexe IS NULL OR a.sexe = '' THEN 'Non renseigné'
                        ELSE a.sexe
                    END as sexe_libelle,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        WHEN a.statut_emploi IS NULL OR a.statut_emploi = '' THEN 'Non renseigné'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN entites_administratives ea ON a.id_entite_principale = ea.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services srv ON a.id_service = srv.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE a.retire = true
            `;

            let countQuery = `SELECT COUNT(*) FROM agents a WHERE a.retire = true`;
            const params = [];
            let whereConditions = [];

            // Recherche par nom, prénom ou matricule
            if (search) {
                whereConditions.push(`(a.nom ILIKE $${params.length + 1} OR a.prenom ILIKE $${params.length + 1} OR a.matricule ILIKE $${params.length + 1})`);
                params.push(`%${search}%`);
            }

            if (whereConditions.length > 0) {
                const whereClause = whereConditions.join(' AND ');
                query += ` AND ${whereClause}`;
                countQuery += ` AND ${whereClause}`;
            }

            // Tri sécurisé
            const allowedSortFields = ['nom', 'prenom', 'matricule', 'date_retrait', 'created_at', 'updated_at'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date_retrait';
            const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            if (safeSortBy === 'nom' || safeSortBy === 'prenom') {
                query += ` ORDER BY a.nom ${safeSortOrder}, a.prenom ${safeSortOrder}`;
            } else if (safeSortBy === 'date_retrait') {
                // Gérer les valeurs NULL en les mettant en dernier
                query += ` ORDER BY a.date_retrait ${safeSortOrder} NULLS LAST`;
            } else {
                query += ` ORDER BY a.${safeSortBy} ${safeSortOrder}`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), offset);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            const totalCount = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalCount / limit);

            res.json({
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + parseInt(limit), totalCount)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents retirés:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Récupérer les agents à la retraite (date de retraite atteinte et non prolongée)
    async getRetiredByRetirement(req, res) {
        try {
            // Vérifier si la colonne retire existe
            const columnExists = async(tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            const retireColumnExists = await columnExists('agents', 'retire');

            const {
                page = 1,
                    limit = 10,
                    search,
                    sortBy = 'date_retraite',
                    sortOrder = 'DESC'
            } = req.query;

            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    a.*,
                    a.email,
                    a.telephone1,
                    a.telephone2,
                    CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                    CONCAT(a.prenom, ' ', a.nom) as nom_prenom,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    ea.nom as entite_nom,
                    m.nom as ministere_nom,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    srv.libelle as service_libelle,
                    cat.libele as categorie_libele,
                    p.libele as position_libele,
                    fa_actuelle.fonction_libele as fonction_actuelle_libele,
                    ea_actuel.emploi_libele as emploi_actuel_libele,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    ech_actuelle.echelon_libele as echelon_libele,
                    CASE 
                        WHEN a.sexe = 'M' THEN 'Masculin'
                        WHEN a.sexe = 'F' THEN 'Féminin'
                        WHEN a.sexe IS NULL OR a.sexe = '' THEN 'Non renseigné'
                        ELSE a.sexe
                    END as sexe_libelle,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        WHEN a.statut_emploi IS NULL OR a.statut_emploi = '' THEN 'Non renseigné'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN entites_administratives ea ON a.id_entite_principale = ea.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services srv ON a.id_service = srv.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                LEFT JOIN echelons ech ON a.id_echelon = ech.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                -- Grade actuel depuis grades_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                -- Échelon actuel depuis echelons_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE a.date_de_naissance IS NOT NULL
                AND a.id_type_d_agent = 1
                AND g.libele IS NOT NULL
            `;

            // Si un ministère est connu, restreindre aux agents de ce ministère
            if (idMinistere) {
                query += ` AND a.id_ministere = $1`;
            }

            // Calcul de l'âge de retraite selon le grade
            // Grades A4, A5, A6, A7 : 65 ans, autres : 60 ans
            const calculateRetirementAgeSQL = `
                CASE 
                    WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                    ELSE 60
                END
            `;

            // Calcul de la date de retraite (31 décembre de l'année de retraite)
            // Basé sur date_de_naissance + age_retraite selon grade
            const calculateRetirementDateSQL = `
                MAKE_DATE(
                    EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + (${calculateRetirementAgeSQL})::INTEGER,
                    12,
                    31
                )
            `;

            // Ajouter la condition : date de retraite calculée < date actuelle
            query += ` AND ${calculateRetirementDateSQL}::DATE < CURRENT_DATE::DATE`;

            // Exclure les agents retirés manuellement si la colonne existe
            if (retireColumnExists) {
                query += ` AND (a.retire IS NULL OR a.retire = false)`;
            }

            // Ajouter la date de retraite calculée dans le SELECT pour l'affichage
            query = query.replace(
                'SELECT \n                    a.*,',
                `SELECT 
                    a.*,
                    ${calculateRetirementDateSQL} as date_retraite_calculee,
                    ${calculateRetirementAgeSQL} as age_retraite_requis,`
            );

            let countQuery = `
                SELECT COUNT(*) 
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.date_de_naissance IS NOT NULL
                AND a.id_type_d_agent = 1
                AND g.libele IS NOT NULL
                AND ${calculateRetirementDateSQL}::DATE < CURRENT_DATE::DATE
            `;

            if (idMinistere) {
                countQuery += ` AND a.id_ministere = $1`;
            }

            if (retireColumnExists) {
                countQuery += ` AND (a.retire IS NULL OR a.retire = false)`;
            }

            // Préparer les paramètres en tenant compte du filtre ministère
            const params = [];

            if (idMinistere) {
                params.push(idMinistere);
            }
            let whereConditions = [];

            // Recherche par nom, prénom ou matricule
            if (search) {
                whereConditions.push(`(a.nom ILIKE $${params.length + 1} OR a.prenom ILIKE $${params.length + 1} OR a.matricule ILIKE $${params.length + 1})`);
                params.push(`%${search}%`);
            }

            if (whereConditions.length > 0) {
                const whereClause = whereConditions.join(' AND ');
                query += ` AND ${whereClause}`;
                countQuery += ` AND ${whereClause}`;
            }

            // Tri sécurisé
            const allowedSortFields = ['nom', 'prenom', 'matricule', 'date_retraite', 'created_at', 'updated_at'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date_retraite';
            const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            if (safeSortBy === 'nom' || safeSortBy === 'prenom') {
                query += ` ORDER BY a.nom ${safeSortOrder}, a.prenom ${safeSortOrder}`;
            } else if (safeSortBy === 'date_retraite') {
                // Trier par date de retraite calculée
                query += ` ORDER BY ${calculateRetirementDateSQL}::DATE ${safeSortOrder}`;
            } else {
                query += ` ORDER BY a.${safeSortBy} ${safeSortOrder}`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), offset);

            // Récupérer la date actuelle pour le débogage
            const currentDateResult = await pool.query('SELECT CURRENT_DATE as today, CURRENT_TIMESTAMP as now');
            const currentDate = currentDateResult.rows[0].today;
            const currentTimestamp = currentDateResult.rows[0].now;

            // Vérifier la requête SQL générée pour le débogage
            console.log(`[getRetiredByRetirement] Date actuelle (CURRENT_DATE): ${currentDate}`);
            console.log(`[getRetiredByRetirement] Timestamp actuel: ${currentTimestamp}`);
            console.log(`[getRetiredByRetirement] Logique appliquée:`);
            console.log(`  - Agents fonctionnaires uniquement (id_type_d_agent = 1)`);
            console.log(`  - Calcul basé sur date_de_naissance + age_retraite (selon grade)`);
            console.log(`  - Grades A4, A5, A6, A7 : 65 ans, autres : 60 ans`);
            console.log(`  - Date de retraite = 31 décembre de l'année de retraite`);
            console.log(`  - Condition : date_retraite_calculee < CURRENT_DATE (strictement inférieur)`);
            console.log(`  - Exclure retire=true: ${retireColumnExists}`);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            const totalCount = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalCount / limit);

            // Log de débogage détaillé pour vérifier les dates
            console.log(`[getRetiredByRetirement] Nombre d'agents trouvés: ${totalCount}`);
            if (result.rows.length > 0) {
                console.log(`[getRetiredByRetirement] Exemples d'agents trouvés (vérification de la logique):`);
                result.rows.slice(0, 5).forEach(agent => {
                    const dateRetraiteCalculee = agent.date_retraite_calculee || agent.date_retraite;
                    const dateRetraiteObj = new Date(dateRetraiteCalculee);
                    const currentDateObj = new Date(currentDate);
                    const isBeforeToday = dateRetraiteObj < currentDateObj;
                    const daysDiff = Math.floor((currentDateObj - dateRetraiteObj) / (1000 * 60 * 60 * 24));
                    console.log(`  - ${agent.nom} ${agent.prenom} (${agent.matricule}):`);
                    console.log(`    type_agent = ${agent.type_agent_libele || 'N/A'}`);
                    console.log(`    grade = ${agent.grade_libele || 'N/A'}`);
                    console.log(`    date_de_naissance = ${agent.date_de_naissance || 'N/A'}`);
                    console.log(`    age_retraite_requis = ${agent.age_retraite_requis || 'N/A'} ans`);
                    console.log(`    date_retraite_calculee = ${dateRetraiteCalculee}`);
                    console.log(`    date_actuelle = ${currentDate}`);
                    console.log(`    est_avant_aujourdhui = ${isBeforeToday}`);
                    console.log(`    jours_ecoules = ${daysDiff}`);
                    console.log(`    retire = ${agent.retire}`);
                });
            } else {
                console.log(`[getRetiredByRetirement] Aucun agent trouvé - Aucun agent fonctionnaire avec date de retraite calculée passée`);
            }

            res.json({
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + parseInt(limit), totalCount)
                },
                debug: process.env.NODE_ENV === 'development' ? {
                    currentDate: currentDate,
                    logic: 'Calcul basé sur date_de_naissance + age_retraite (selon grade)',
                    conditions: [
                        'Agents fonctionnaires uniquement (id_type_d_agent = 1)',
                        'Grades A4, A5, A6, A7 : 65 ans, autres : 60 ans',
                        'Date de retraite = 31 décembre de l\'année de retraite',
                        'date_retraite_calculee < CURRENT_DATE (strictement inférieur)'
                    ]
                } : undefined
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents à la retraite:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Diagnostic : Comprendre pourquoi des agents apparaissent dans la liste
    async diagnoseRetiredAgents(req, res) {
        try {
            // Récupérer la date actuelle du serveur
            const currentDateResult = await pool.query('SELECT CURRENT_DATE as today, CURRENT_TIMESTAMP as now');
            const currentDate = currentDateResult.rows[0].today;
            const currentTimestamp = currentDateResult.rows[0].now;

            // Tous les agents avec une date_retraite
            const allAgentsWithDate = await pool.query(`
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_retraite,
                    a.retire as retire_manuellement,
                    a.date_de_naissance,
                    CASE 
                        WHEN a.date_retraite IS NULL THEN 'NULL'
                        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN 'PASSÉE'
                        WHEN a.date_retraite::DATE = CURRENT_DATE::DATE THEN 'AUJOURD''HUI'
                        WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN 'FUTURE'
                        ELSE 'INCONNU'
                    END as statut_date,
                    CURRENT_DATE::DATE - a.date_retraite::DATE as difference_jours
                FROM agents a
                WHERE a.date_retraite IS NOT NULL
                ORDER BY a.date_retraite DESC
            `);

            // Agents qui apparaîtraient selon la logique actuelle
            const agentsInList = await pool.query(`
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_retraite,
                    a.retire as retire_manuellement,
                    CURRENT_DATE::DATE - a.date_retraite::DATE as jours_ecoules
                FROM agents a
                WHERE a.date_retraite IS NOT NULL 
                AND a.date_retraite::DATE < CURRENT_DATE::DATE
                AND (a.retire IS NULL OR a.retire = false)
                ORDER BY a.date_retraite DESC
            `);

            // Statistiques
            const stats = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL) as total_avec_date,
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE < CURRENT_DATE::DATE) as avec_date_passee,
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE = CURRENT_DATE::DATE) as avec_date_aujourdhui,
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE > CURRENT_DATE::DATE) as avec_date_future,
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                                     AND (a.retire IS NULL OR a.retire = false)) as apparait_dans_liste,
                    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                                     AND a.retire = true) as exclus_car_retire
                FROM agents a
            `);

            // Test de comparaison avec les dates visibles dans l'interface
            const testDates = await pool.query(`
                SELECT 
                    '2024-12-31'::DATE as date_test,
                    CURRENT_DATE::DATE as date_actuelle,
                    CASE 
                        WHEN '2024-12-31'::DATE < CURRENT_DATE::DATE THEN true
                        ELSE false
                    END as date_2024_est_passee,
                    CASE 
                        WHEN '2023-12-31'::DATE < CURRENT_DATE::DATE THEN true
                        ELSE false
                    END as date_2023_est_passee,
                    CASE 
                        WHEN '2022-12-31'::DATE < CURRENT_DATE::DATE THEN true
                        ELSE false
                    END as date_2022_est_passee
            `);

            res.json({
                diagnostic: {
                    date_actuelle_serveur: currentDate,
                    timestamp_actuel_serveur: currentTimestamp,
                    query_utilisee: 'WHERE date_retraite IS NOT NULL AND date_retraite::DATE < CURRENT_DATE::DATE AND (retire IS NULL OR retire = false)'
                },
                test_dates: testDates.rows[0],
                statistiques: stats.rows[0],
                tous_agents_avec_date: {
                    total: allAgentsWithDate.rows.length,
                    details: allAgentsWithDate.rows
                },
                agents_qui_apparaissent: {
                    total: agentsInList.rows.length,
                    details: agentsInList.rows
                },
                explication: {
                    regle_actuelle: "Un agent apparaît dans la liste 'Agents à la Retraite' si:",
                    conditions: [
                        "1. Il a une date_retraite stockée dans la base de données (date_retraite IS NOT NULL)",
                        "2. Cette date est strictement inférieure à la date actuelle du serveur (date_retraite::DATE < CURRENT_DATE::DATE)",
                        "3. L'agent n'est pas retiré manuellement (retire IS NULL OR retire = false)"
                    ],
                    note: "La logique utilise uniquement la colonne 'date_retraite' stockée dans la table agents, pas un calcul basé sur la date de naissance et le grade."
                }
            });
        } catch (error) {
            console.error('Erreur lors du diagnostic des agents retraités:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Vérifier les agents qui sont déjà à la retraite selon les conditions données
    async checkAgentsAlreadyRetired(req, res) {
        try {
            const {
                page = 1,
                    limit = 100,
                    search,
                    onlyRetired = true // Si true, retourne seulement ceux déjà retirés
            } = req.query;

            const offset = (page - 1) * limit;

            // Fonction SQL pour calculer l'âge de retraite basé sur le grade
            // Grades A4, A5, A6, A7 : 65 ans, autres : 60 ans
            const calculateRetirementAgeSQL = `
                CASE 
                    WHEN g.libele IS NULL THEN 60
                    WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                    ELSE 60
                END
            `;

            // Fonction SQL pour calculer la date de retraite (31 décembre de l'année de retraite)
            const calculateRetirementDateSQL = `
                CASE 
                    WHEN a.date_de_naissance IS NULL THEN NULL
                    ELSE MAKE_DATE(
                        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + (${calculateRetirementAgeSQL})::INTEGER,
                        12,
                        31
                    )
                END
            `;

            let query = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    EXTRACT(YEAR FROM a.date_de_naissance) as annee_naissance,
                    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_de_naissance) as age_actuel,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    ${calculateRetirementAgeSQL} as age_retraite_requis,
                    EXTRACT(YEAR FROM a.date_de_naissance) + ${calculateRetirementAgeSQL} as annee_retraite_calculee,
                    ${calculateRetirementDateSQL} as date_retraite_calculee,
                    a.date_retraite as date_retraite_stockee,
                    a.retire as retire_manuellement,
                    CASE 
                        WHEN ${calculateRetirementDateSQL} < CURRENT_DATE THEN 
                            CURRENT_DATE - ${calculateRetirementDateSQL}
                        ELSE NULL
                    END as jours_ecoules_depuis_retraite,
                    CASE 
                        WHEN ${calculateRetirementDateSQL} < CURRENT_DATE THEN '✅ DÉJÀ À LA RETRAITE'
                        WHEN ${calculateRetirementDateSQL} = CURRENT_DATE THEN '⚠️ RETRAITE AUJOURD''HUI'
                        WHEN ${calculateRetirementDateSQL} > CURRENT_DATE THEN '⏳ PAS ENCORE'
                        ELSE '❌ INCONNU'
                    END as statut_retraite
                FROM agents a
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                WHERE a.date_de_naissance IS NOT NULL
            `;

            // Filtrer uniquement ceux déjà à la retraite si onlyRetired = true
            if (onlyRetired === 'true' || onlyRetired === true) {
                query += ` AND ${calculateRetirementDateSQL} < CURRENT_DATE`;
                query += ` AND (a.retire IS NULL OR a.retire = false)`;
            }

            // Recherche par nom, prénom ou matricule
            const params = [];
            if (search) {
                query += ` AND (a.nom ILIKE $${params.length + 1} OR a.prenom ILIKE $${params.length + 1} OR a.matricule ILIKE $${params.length + 1})`;
                params.push(`%${search}%`);
            }

            // Compte total
            let countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
            countQuery = countQuery.replace(/ORDER BY[\s\S]*$/, '');

            // Tri
            query += ` ORDER BY ${calculateRetirementDateSQL} DESC, a.nom ASC, a.prenom ASC`;

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), offset);

            // Exécuter les requêtes
            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            const totalCount = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalCount / limit);

            // Statistiques
            const statsQuery = `
                SELECT 
                    COUNT(*) FILTER (WHERE ${calculateRetirementDateSQL} < CURRENT_DATE AND (a.retire IS NULL OR a.retire = false)) as deja_a_la_retraite,
                    COUNT(*) FILTER (WHERE ${calculateRetirementDateSQL} = CURRENT_DATE AND (a.retire IS NULL OR a.retire = false)) as retraite_aujourdhui,
                    COUNT(*) FILTER (WHERE ${calculateRetirementDateSQL} > CURRENT_DATE) as pas_encore_retraite,
                    COUNT(*) FILTER (WHERE a.retire = true) as retires_manuellement
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.date_de_naissance IS NOT NULL
            `;

            const statsResult = await pool.query(statsQuery);

            res.json({
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + parseInt(limit), totalCount)
                },
                statistics: statsResult.rows[0] || {
                    deja_a_la_retraite: 0,
                    retraite_aujourdhui: 0,
                    pas_encore_retraite: 0,
                    retires_manuellement: 0
                },
                filters: {
                    onlyRetired: onlyRetired === 'true' || onlyRetired === true,
                    search: search || null
                }
            });
        } catch (error) {
            console.error('Erreur lors de la vérification des agents déjà à la retraite:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Désactiver un agent (alternative à la suppression)
    async deactivate(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si l'agent existe
            const checkAgent = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
            if (checkAgent.rows.length === 0) {
                return res.status(404).json({
                    error: 'Agent non trouvé'
                });
            }

            // Mettre à jour le statut de l'agent
            await pool.query(
                'UPDATE agents SET statut_emploi = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['inactif', id]
            );

            // Désactiver aussi le compte utilisateur associé si existe
            try {
                const userTableExists = await pool.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'utilisateurs'
                    )`
                );
                if (userTableExists.rows[0].exists) {
                    await pool.query(
                        'UPDATE utilisateurs SET is_active = false WHERE id_agent = $1', [id]
                    );
                }
            } catch (error) {
                console.error('Erreur lors de la désactivation du compte utilisateur:', error.message);
            }

            res.json({
                message: 'Agent désactivé avec succès',
                agent: {
                    id: id,
                    statut_emploi: 'inactif'
                }
            });
        } catch (error) {
            console.error('Erreur lors de la désactivation de l\'agent:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }


    // Recherche avancée d'agents
    async searchAdvanced(req, res) {
        try {
            const {
                nom,
                prenom,
                matricule,
                civilite,
                nationalite,
                type_agent,
                sexe,
                age_min,
                age_max,
                date_naissance_debut,
                date_naissance_fin,
                id_grade,
                id_categorie
            } = req.query;

            let query = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (nom) {
                query += ` AND a.nom ILIKE $${paramIndex}`;
                params.push(`%${nom}%`);
                paramIndex++;
            }

            if (prenom) {
                query += ` AND a.prenom ILIKE $${paramIndex}`;
                params.push(`%${prenom}%`);
                paramIndex++;
            }

            if (matricule) {
                query += ` AND a.matricule ILIKE $${paramIndex}`;
                params.push(`%${matricule}%`);
                paramIndex++;
            }

            if (civilite) {
                query += ` AND a.id_civilite = $${paramIndex}`;
                params.push(civilite);
                paramIndex++;
            }

            if (nationalite) {
                query += ` AND a.id_nationalite = $${paramIndex}`;
                params.push(nationalite);
                paramIndex++;
            }

            if (type_agent) {
                query += ` AND a.id_type_d_agent = $${paramIndex}`;
                params.push(type_agent);
                paramIndex++;
            }

            if (sexe) {
                query += ` AND a.sexe = $${paramIndex}`;
                params.push(sexe);
                paramIndex++;
            }

            if (id_categorie) {
                query += ` AND a.id_categorie = $${paramIndex}`;
                params.push(id_categorie);
                paramIndex++;
            }

            if (id_grade) {
                query += ` AND a.id_grade = $${paramIndex}`;
                params.push(id_grade);
                paramIndex++;
            }

            if (age_min) {
                query += ` AND a.age >= $${paramIndex}`;
                params.push(parseInt(age_min));
                paramIndex++;
            }

            if (age_max) {
                query += ` AND a.age <= $${paramIndex}`;
                params.push(parseInt(age_max));
                paramIndex++;
            }

            if (date_naissance_debut) {
                query += ` AND a.date_de_naissance >= $${paramIndex}`;
                params.push(date_naissance_debut);
                paramIndex++;
            }

            if (date_naissance_fin) {
                query += ` AND a.date_de_naissance <= $${paramIndex}`;
                params.push(date_naissance_fin);
                paramIndex++;
            }

            query += ` ORDER BY a.nom, a.prenom`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la recherche avancée:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Statistiques des agents
    async getStats(req, res) {
        try {
            const stats = {};

            // Condition pour exclure les agents retirés et les agents à la retraite
            const exclusionCondition = `
                (a.retire IS NULL OR a.retire = false)
                AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')
                AND ${this.getRetirementExclusionCondition('a', 'g')}
                AND NOT (
                    a.id_type_d_agent = 1
                    AND a.date_de_naissance IS NOT NULL
                    AND g.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                        CASE 
                            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                            ELSE 60
                        END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
            `;

            // Total des agents (excluant retirés et à la retraite)
            const totalResult = await pool.query(`
                SELECT COUNT(*) 
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE ${exclusionCondition}
            `);
            stats.total = parseInt(totalResult.rows[0].count);

            // Par sexe (excluant retirés et à la retraite)
            const sexeResult = await pool.query(`
                SELECT a.sexe, COUNT(*) 
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE ${exclusionCondition}
                GROUP BY a.sexe
            `);
            stats.parSexe = sexeResult.rows.reduce((acc, row) => {
                acc[row.sexe] = parseInt(row.count);
                return acc;
            }, {});

            // Par type d'agent (excluant retirés et à la retraite)
            const typeAgentResult = await pool.query(`
                SELECT ta.libele, COUNT(*) 
                FROM agents a 
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE ${exclusionCondition}
                GROUP BY ta.libele, ta.id
            `);
            stats.parTypeAgent = typeAgentResult.rows.reduce((acc, row) => {
                acc[row.libele || 'Non défini'] = parseInt(row.count);
                return acc;
            }, {});

            // Par nationalité (excluant retirés et à la retraite)
            const nationaliteResult = await pool.query(`
                SELECT n.libele, COUNT(*) 
                FROM agents a 
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE ${exclusionCondition}
                GROUP BY n.libele, n.id
                ORDER BY COUNT(*) DESC
                LIMIT 10
            `);
            stats.parNationalite = nationaliteResult.rows.reduce((acc, row) => {
                acc[row.libele || 'Non définie'] = parseInt(row.count);
                return acc;
            }, {});

            // Moyenne d'âge (excluant retirés et à la retraite)
            const ageResult = await pool.query(`
                SELECT AVG(a.age) 
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.age IS NOT NULL
                AND ${exclusionCondition}
            `);
            stats.moyenneAge = Math.round(parseFloat(ageResult.rows[0].avg) || 0);

            // Agents avec enfants (excluant retirés et à la retraite)
            const avecEnfantsResult = await pool.query(`
                SELECT COUNT(*) 
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.nombre_enfant > 0
                AND ${exclusionCondition}
            `);
            stats.avecEnfants = parseInt(avecEnfantsResult.rows[0].count);

            res.json(stats);
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Statistiques par type d'agent
    async getStatsByType(req, res) {
        try {
            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 Stats par type - Ministère ID: ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            // Construire la requête avec filtrage par ministère si nécessaire
            let whereClause = '';
            let subQueryWhereClause = '';
            let params = [];

            if (userMinistereId) {
                whereClause = ' WHERE a.id_ministere = $1';
                subQueryWhereClause = ' WHERE id_ministere = $2';
                params = [userMinistereId, userMinistereId];
            }

            const query = `
                SELECT 
                    ta.libele as type_agent_libele,
                    COUNT(a.id) as count,
                    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM agents${subQueryWhereClause}), 2) as percentage
                FROM agents a
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                ${whereClause}
                GROUP BY ta.id, ta.libele
                ORDER BY count DESC
            `;

            const result = await pool.query(query, params);
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques par type:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques par type',
                error: error.message
            });
        }
    }

    // Statistiques par service
    async getStatsByService(req, res) {
        try {
            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 Stats par service - Ministère ID: ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            // Construire la requête avec filtrage par ministère si nécessaire
            let whereClause = '';
            let subQueryWhereClause = '';
            let params = [];

            if (userMinistereId) {
                whereClause = ' WHERE a.id_ministere = $1';
                subQueryWhereClause = ' WHERE id_ministere = $2';
                params = [userMinistereId, userMinistereId];
            }

            const query = `
                SELECT 
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    COUNT(a.id) as count,
                    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM agents${subQueryWhereClause}), 2) as percentage
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON s.id_ministere = m.id
                ${whereClause}
                GROUP BY s.id, s.libelle, m.id, m.nom
                ORDER BY count DESC
            `;

            const result = await pool.query(query, params);
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques par service:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques par service',
                error: error.message
            });
        }
    }

    async getStatsByDirection(req, res) {
        try {
            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 Stats par direction - Ministère ID: ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            // Construire la requête avec filtrage par ministère si nécessaire
            let whereClause = '';
            let subQueryWhereClause = '';
            let params = [];

            if (userMinistereId) {
                whereClause = ' WHERE a.id_ministere = $1';
                subQueryWhereClause = ' WHERE id_ministere = $2';
                params = [userMinistereId, userMinistereId];
            }

            const query = `
                SELECT 
                    d.libelle as direction_libelle,
                    m.nom as ministere_nom,
                    COUNT(a.id) as count,
                    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM agents${subQueryWhereClause}), 2) as percentage
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN ministeres m ON d.id_ministere = m.id
                ${whereClause}
                GROUP BY d.id, d.libelle, m.id, m.nom
                HAVING COUNT(a.id) > 0
                ORDER BY count DESC
            `;

            const result = await pool.query(query, params);
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques par direction:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques par direction',
                error: error.message
            });
        }
    }

    // Statistiques filtrées par organisation (direction/sous-direction) selon le rôle
    async getStatsByOrganization(req, res) {
        try {
            if (!req.user || !req.user.id_agent) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non authentifié'
                });
            }

            // Récupérer les informations de l'agent utilisateur (inclure id_direction_generale pour cabinet, id_service pour chef_service)
            const userAgentQuery = await pool.query(
                'SELECT id_direction, id_sous_direction, id_ministere, id_direction_generale, id_service FROM agents WHERE id = $1', [req.user.id_agent]
            );

            if (userAgentQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const userAgent = userAgentQuery.rows[0];
            let userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e') : '';
            // Normaliser les rôles cabinet (libellé "Chef de Cabinet" / "CABINET CHEF" -> chef_cabinet, "Directeur de Cabinet" -> dir_cabinet)
            if (userRole && ((userRole.includes('chef') && userRole.includes('cabinet')) || userRole === 'cabinet_chef')) userRole = 'chef_cabinet';
            else if (userRole && (userRole.includes('cabinet') && (userRole.includes('directeur') || userRole.includes('dir')))) userRole = 'dir_cabinet';
            // Normaliser Chef de Service (libellé "Chef de Service" ou role_code chef_service)
            else if (userRole && (userRole === 'chef_service' || (userRole.includes('chef') && userRole.includes('service')))) userRole = 'chef_service';
            // Normaliser Directeur Général (libellé "Directeur Général" / "directeur général" -> directeur_general)
            else if (userRole && (userRole === 'directeur_general' || (userRole.includes('directeur') && (userRole.includes('general') || userRole.includes('generale'))))) userRole = 'directeur_general';
            const effectiveMinistereId = userAgent.id_ministere ?? req.user?.id_ministere ?? null;

            // Même périmètre que getHierarchicalReport (rapport hiérarchique) : statut emploi, retraités, grade courant depuis grades_agents
            const statsGradeActuelJoin = `
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
            `;
            const exclusionCondition = `
                (a.retire IS NULL OR a.retire = false)
                AND LOWER(TRIM(COALESCE(a.statut_emploi, ''))) NOT IN ('licencie', 'demission', 'retraite')
                AND ${this.getRetirementExclusionCondition('a', 'ga_actuelle')}
            `;

            // Construire le filtre selon le rôle
            let whereClause = `WHERE ${exclusionCondition}`;
            let params = [];
            let paramIndex = 1;
            let organizationLabel = '';

            // Cabinet : dir_cabinet / chef_cabinet → statistiques de la direction générale CABINET (id_direction_generale) ou, à défaut, de la direction (id_direction)
            if (userRole === 'chef_cabinet' || userRole === 'dir_cabinet') {
                if (userAgent.id_direction_generale) {
                    whereClause += ` AND a.id_direction_generale = $${paramIndex}`;
                    params.push(userAgent.id_direction_generale);
                    paramIndex++;
                    whereClause += ` AND a.id_direction IS NULL AND a.id_sous_direction IS NULL`;

                    if (effectiveMinistereId) {
                        whereClause += ` AND a.id_ministere = $${paramIndex}`;
                        params.push(effectiveMinistereId);
                        paramIndex++;
                    }

                    const dgQuery = await pool.query(
                        'SELECT libelle FROM direction_generale WHERE id = $1', [userAgent.id_direction_generale]
                    );
                    if (dgQuery.rows.length > 0) {
                        organizationLabel = dgQuery.rows[0].libelle;
                    }
                } else if (userAgent.id_direction) {
                    // Fallback : cabinet représenté comme direction (id_direction)
                    whereClause += ` AND a.id_direction = $${paramIndex}`;
                    params.push(userAgent.id_direction);
                    paramIndex++;

                    if (effectiveMinistereId) {
                        whereClause += ` AND a.id_ministere = $${paramIndex}`;
                        params.push(effectiveMinistereId);
                        paramIndex++;
                    }

                    const directionQuery = await pool.query(
                        'SELECT libelle FROM directions WHERE id = $1', [userAgent.id_direction]
                    );
                    if (directionQuery.rows.length > 0) {
                        organizationLabel = directionQuery.rows[0].libelle;
                    }
                }
            } else if (userRole === 'directeur_general') {
                // Directeur général : uniquement les agents propres à la direction générale (rattachés directement à la DG, sans direction ni sous-direction)
                let dgId = userAgent.id_direction_generale;
                if (dgId == null && userAgent.id_direction != null) {
                    const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                    if (dirRow.rows.length > 0 && dirRow.rows[0].id_direction_generale != null) dgId = dirRow.rows[0].id_direction_generale;
                }
                if (dgId == null && req.user && req.user.id_direction_generale != null) {
                    dgId = req.user.id_direction_generale;
                }
                if (dgId != null) {
                    whereClause += ` AND a.id_direction_generale = $${paramIndex}`;
                    whereClause += ` AND a.id_direction IS NULL AND a.id_sous_direction IS NULL`;
                    params.push(dgId);
                    paramIndex++;

                    if (effectiveMinistereId) {
                        whereClause += ` AND a.id_ministere = $${paramIndex}`;
                        params.push(effectiveMinistereId);
                        paramIndex++;
                    }

                    const dgQuery = await pool.query(
                        'SELECT libelle FROM direction_generale WHERE id = $1', [dgId]
                    );
                    if (dgQuery.rows.length > 0) {
                        organizationLabel = dgQuery.rows[0].libelle;
                    }
                } else {
                    // Directeur général sans direction générale configurée : ne jamais afficher tout le ministère (0 agent)
                    whereClause += ' AND 1 = 0';
                }
            } else if (userRole === 'inspecteur_general') {
                // Inspecteur général : statistiques de toute sa direction générale (toutes les directions/sous-directions rattachées)
                let dgId = userAgent.id_direction_generale;
                if (dgId == null && userAgent.id_direction != null) {
                    const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                    if (dirRow.rows.length > 0 && dirRow.rows[0].id_direction_generale != null) dgId = dirRow.rows[0].id_direction_generale;
                }
                if (dgId == null && req.user && req.user.id_direction_generale != null) {
                    dgId = req.user.id_direction_generale;
                }
                if (dgId != null) {
                    whereClause += ` AND a.id_direction_generale = $${paramIndex}`;
                    params.push(dgId);
                    paramIndex++;

                    if (effectiveMinistereId) {
                        whereClause += ` AND a.id_ministere = $${paramIndex}`;
                        params.push(effectiveMinistereId);
                        paramIndex++;
                    }

                    const dgQuery = await pool.query(
                        'SELECT libelle FROM direction_generale WHERE id = $1', [dgId]
                    );
                    if (dgQuery.rows.length > 0) {
                        organizationLabel = dgQuery.rows[0].libelle;
                    }
                } else {
                    // Pas de direction générale associée : ne rien retourner plutôt que tout le ministère
                    whereClause += ' AND 1 = 0';
                }
            } else if ((userRole === 'directeur' || userRole === 'directeur_service_exterieur' || userRole === 'directeur_central' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation') && userAgent.id_direction) {
                // directeur / directeur_service_exterieur / gestionnaire_du_patrimoine / president_du_fond / responsble_cellule_de_passation : tous les agents de leur direction (y compris sous-directions)
                // directeur_central : uniquement les agents directement rattachés à la direction (sans sous-direction)
                whereClause += ` AND a.id_direction = $${paramIndex}`;
                params.push(userAgent.id_direction);
                paramIndex++;
                if (userRole === 'directeur_central') {
                    whereClause += ` AND a.id_sous_direction IS NULL`;
                }

                if (effectiveMinistereId) {
                    whereClause += ` AND a.id_ministere = $${paramIndex}`;
                    params.push(effectiveMinistereId);
                    paramIndex++;
                }

                const directionQuery = await pool.query(
                    'SELECT libelle FROM directions WHERE id = $1', [userAgent.id_direction]
                );
                if (directionQuery.rows.length > 0) {
                    organizationLabel = directionQuery.rows[0].libelle;
                }
            } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && userAgent.id_sous_direction) {
                whereClause += ` AND a.id_sous_direction = $${paramIndex}`;
                params.push(userAgent.id_sous_direction);
                paramIndex++;

                if (effectiveMinistereId) {
                    whereClause += ` AND a.id_ministere = $${paramIndex}`;
                    params.push(effectiveMinistereId);
                    paramIndex++;
                }

                // Récupérer le nom de la sous-direction
                const sousDirectionQuery = await pool.query(
                    'SELECT libelle FROM sous_directions WHERE id = $1', [userAgent.id_sous_direction]
                );
                if (sousDirectionQuery.rows.length > 0) {
                    organizationLabel = sousDirectionQuery.rows[0].libelle;
                }
            } else if (userRole === 'chef_service' && userAgent.id_service) {
                // Chef de service : statistiques de son service
                whereClause += ` AND a.id_service = $${paramIndex}`;
                params.push(userAgent.id_service);
                paramIndex++;

                if (effectiveMinistereId) {
                    whereClause += ` AND a.id_ministere = $${paramIndex}`;
                    params.push(effectiveMinistereId);
                    paramIndex++;
                }

                const serviceQuery = await pool.query(
                    'SELECT libelle FROM services WHERE id = $1', [userAgent.id_service]
                );
                if (serviceQuery.rows.length > 0) {
                    organizationLabel = serviceQuery.rows[0].libelle;
                }
            } else if (effectiveMinistereId) {
                // Pour les autres rôles, filtrer par ministère
                whereClause += ` AND a.id_ministere = $${paramIndex}`;
                params.push(effectiveMinistereId);
                paramIndex++;
            }

            // Toujours restreindre au ministère si connu (sauf super_admin) pour ne jamais afficher d'autres ministères
            if (effectiveMinistereId && userRole !== 'super_admin' && !whereClause.includes('a.id_ministere')) {
                whereClause += ` AND a.id_ministere = $${paramIndex}`;
                params.push(effectiveMinistereId);
                paramIndex++;
            }

            const stats = {};

            // Total des agents
            const totalResult = await pool.query(`
                SELECT COUNT(*) 
                FROM agents a
                ${statsGradeActuelJoin}
                ${whereClause}
            `, params);
            stats.total = parseInt(totalResult.rows[0].count);

            // Par sexe
            const sexeResult = await pool.query(`
                SELECT a.sexe, COUNT(*) as count
                FROM agents a
                ${statsGradeActuelJoin}
                ${whereClause}
                GROUP BY a.sexe
            `, params);
            stats.parSexe = {
                hommes: 0,
                femmes: 0
            };
            sexeResult.rows.forEach(row => {
                if (row.sexe === 'M' || row.sexe === 'Homme') {
                    stats.parSexe.hommes = parseInt(row.count);
                } else if (row.sexe === 'F' || row.sexe === 'Femme') {
                    stats.parSexe.femmes = parseInt(row.count);
                }
            });

            // Par type d'agent (statut)
            const statutResult = await pool.query(`
                SELECT ta.libele, a.sexe, COUNT(*) as count
                FROM agents a
                ${statsGradeActuelJoin}
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                ${whereClause}
                GROUP BY ta.libele, ta.id, a.sexe
                ORDER BY ta.libele, a.sexe
            `, params);

            stats.parStatut = {};
            statutResult.rows.forEach(row => {
                const statut = row.libele || 'Non défini';
                if (!stats.parStatut[statut]) {
                    stats.parStatut[statut] = {
                        hommes: 0,
                        femmes: 0,
                        total: 0
                    };
                }
                if (row.sexe === 'M' || row.sexe === 'Homme') {
                    stats.parStatut[statut].hommes += parseInt(row.count);
                } else if (row.sexe === 'F' || row.sexe === 'Femme') {
                    stats.parStatut[statut].femmes += parseInt(row.count);
                }
                stats.parStatut[statut].total += parseInt(row.count);
            });

            // Nombre de services (pour les directeurs et directeur des services extérieurs et les 3 rôles direction)
            if ((userRole === 'directeur' || userRole === 'directeur_service_exterieur' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation') && userAgent.id_direction) {
                const servicesResult = await pool.query(`
                    SELECT COUNT(DISTINCT s.id) as count
                    FROM services s
                    WHERE s.id_direction = $1
                `, [userAgent.id_direction]);
                stats.nombreServices = parseInt(servicesResult.rows[0].count);
            }

            // Nombre de sous-directions (pour les directeurs et directeur des services extérieurs et les 3 rôles direction)
            if ((userRole === 'directeur' || userRole === 'directeur_service_exterieur' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation') && userAgent.id_direction) {
                const sousDirectionsResult = await pool.query(`
                    SELECT COUNT(DISTINCT sd.id) as count
                    FROM sous_directions sd
                    WHERE sd.id_direction = $1
                `, [userAgent.id_direction]);
                stats.nombreSousDirections = parseInt(sousDirectionsResult.rows[0].count);
            }

            // Nombre de services (pour les sous-directeurs)
            if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && userAgent.id_sous_direction) {
                const servicesResult = await pool.query(`
                    SELECT COUNT(DISTINCT s.id) as count
                    FROM services s
                    WHERE s.id_sous_direction = $1
                `, [userAgent.id_sous_direction]);
                stats.nombreServices = parseInt(servicesResult.rows[0].count);
            }

            res.json({
                success: true,
                data: {
                    ...stats,
                    organizationLabel: organizationLabel,
                    role: userRole
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques par organisation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques par organisation',
                error: error.message
            });
        }
    }

    // Gérer les fichiers uploadés
    async handleUploadedFiles(agentId, files) {
        try {
            console.log('📁 Gestion des fichiers uploadés pour l\'agent:', agentId);
            console.log('📁 Fichiers reçus:', files);

            // Gérer la photo de profil
            if (files.photo_profil && files.photo_profil.length > 0) {
                const photo = files.photo_profil[0];
                const photoUrl = `/uploads/photos/${photo.filename}`;

                await pool.query(`
                    INSERT INTO agent_photos (id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    agentId,
                    photoUrl,
                    photo.originalname,
                    photo.size,
                    photo.mimetype,
                    true
                ]);
                console.log('✅ Photo de profil sauvegardée');
            }

            // Gérer les documents
            const documentTypes = [
                { field: 'certificat_travail', type: 'certificat_travail' },
                { field: 'attestation_formation', type: 'attestation_formation' },
                { field: 'autres_documents', type: 'autres_documents' },
                { field: 'acte_mariage', type: 'acte_mariage' }
            ];

            for (const docType of documentTypes) {
                if (files[docType.field] && files[docType.field].length > 0) {
                    const document = files[docType.field][0];
                    const documentUrl = `/uploads/documents/${document.filename}`;

                    await pool.query(`
                        INSERT INTO agent_documents (id_agent, document_type, document_url, document_name, document_size, document_mime_type)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        agentId,
                        docType.type,
                        documentUrl,
                        document.originalname,
                        document.size,
                        document.mimetype
                    ]);
                    console.log(`✅ Document ${docType.type} sauvegardé`);
                }
            }

            console.log(`📁 Fichiers gérés pour l'agent ${agentId}`);
        } catch (error) {
            console.error('❌ Erreur lors de la gestion des fichiers:', error);
            // Ne pas faire échouer la création de l'agent pour les fichiers
        }
    }

    // Gérer les diplômes de l'agent
    async handleAgentDiplomes(agentId, diplomes, files = null, isUpdate = false) {
        try {
            console.log('🎓 Gestion des diplômes pour l\'agent:', agentId);
            console.log('🎓 Diplômes reçus:', diplomes);
            console.log('🎓 Mode mise à jour:', isUpdate);

            // Logs d'erreurs détaillés
            console.log('🚨 ===== DIAGNOSTIC ERREURS DIPLÔMES =====');
            console.log('🚨 agentId:', agentId);
            console.log('🚨 diplomes type:', typeof diplomes);
            console.log('🚨 diplomes length:', diplomes ? diplomes.length : 'undefined');
            console.log('🚨 files type:', typeof files);
            console.log('🚨 files existe:', !!files);
            console.log('🚨 isUpdate:', isUpdate);

            if (files) {
                console.log('🚨 Fichiers détectés - clés disponibles:', Object.keys(files));
                Object.keys(files).forEach(key => {
                    console.log(`🚨 Fichier ${key}:`, files[key]);
                });
            } else {
                console.log('🚨 AUCUN FICHIER POUR LES DIPLÔMES - PROBLÈME IDENTIFIÉ !');
            }

            if (!diplomes || diplomes.length === 0) {
                console.log('🎓 Aucun diplôme à traiter');
                // Si c'est une mise à jour et qu'il n'y a pas de diplômes, supprimer tous les anciens diplômes
                if (isUpdate) {
                    console.log('🗑️ Suppression des anciens diplômes (mise à jour sans diplômes)');
                    // Supprimer d'abord les documents liés
                    const linkedDocsQuery = await pool.query(`
                        SELECT id_agent_document 
                        FROM etude_diplome 
                        WHERE id_agent = $1 AND id_agent_document IS NOT NULL
                    `, [agentId]);

                    if (linkedDocsQuery.rows.length > 0) {
                        const docIds = linkedDocsQuery.rows.map(row => row.id_agent_document).filter(id => id !== null);
                        if (docIds.length > 0) {
                            const placeholders = docIds.map((_, i) => `$${i + 2}`).join(',');
                            await pool.query(`
                                DELETE FROM agent_documents 
                                WHERE id_agent = $1 AND document_type = 'diplome' AND id IN (${placeholders})
                            `, [agentId, ...docIds]);
                        }
                    }
                    // Puis supprimer les diplômes
                    await pool.query('DELETE FROM etude_diplome WHERE id_agent = $1', [agentId]);
                }
                return;
            }

            // Si c'est une mise à jour, nettoyer les anciens diplômes et documents
            if (isUpdate) {
                console.log('🗑️ Nettoyage des anciens diplômes et documents avant mise à jour');

                // Récupérer les IDs des documents liés aux diplômes
                const linkedDocsQuery = await pool.query(`
                    SELECT id_agent_document 
                    FROM etude_diplome 
                    WHERE id_agent = $1 AND id_agent_document IS NOT NULL
                `, [agentId]);

                console.log(`🔍 Anciens documents liés trouvés: ${linkedDocsQuery.rows.length}`);

                // Supprimer les diplômes d'abord
                await pool.query('DELETE FROM etude_diplome WHERE id_agent = $1', [agentId]);
                console.log(`🗑️ Anciens diplômes supprimés`);

                // Supprimer les documents de diplômes orphelins
                if (linkedDocsQuery.rows.length > 0) {
                    const docIds = linkedDocsQuery.rows.map(row => row.id_agent_document).filter(id => id !== null);
                    console.log(`🔍 IDs des documents à supprimer: ${docIds}`);

                    if (docIds.length > 0) {
                        const placeholders = docIds.map((_, i) => `$${i + 2}`).join(',');
                        await pool.query(`
                            DELETE FROM agent_documents 
                            WHERE id_agent = $1 AND document_type = 'diplome' AND id IN (${placeholders})
                        `, [agentId, ...docIds]);
                        console.log(`🗑️ ${docIds.length} anciens documents de diplômes supprimés`);
                    }
                }
            }

            for (let i = 0; i < diplomes.length; i++) {
                const diplome = diplomes[i];
                console.log(`🎓 Traitement du diplôme ${i + 1}:`, diplome);

                if (diplome.diplome) {
                    // Valider et formater l'année du diplôme (entier)
                    let formattedYear = null;
                    if (diplome.date_diplome) {
                        try {
                            const dateStr = diplome.date_diplome.toString().trim();
                            // Si c'est une année (4 chiffres), utiliser directement
                            if (/^\d{4}$/.test(dateStr)) {
                                formattedYear = parseInt(dateStr, 10);
                            } else {
                                // Sinon, extraire l'année d'une date complète
                                const date = new Date(diplome.date_diplome);
                                if (!isNaN(date.getTime())) {
                                    formattedYear = date.getFullYear();
                                }
                            }
                            // Valider que l'année est dans une plage raisonnable
                            if (formattedYear && (formattedYear < 1900 || formattedYear > new Date().getFullYear() + 10)) {
                                console.warn(`⚠️ Année de diplôme invalide pour "${diplome.diplome}": ${formattedYear}`);
                                formattedYear = null;
                            }
                        } catch (error) {
                            console.warn(`⚠️ Année de diplôme invalide pour "${diplome.diplome}": ${diplome.date_diplome}`);
                        }
                    }

                    // Insérer le diplôme dans etude_diplome
                    const diplomeResult = await pool.query(`
                        INSERT INTO etude_diplome (id_agent, diplome, date_diplome, ecole, ville, pays, options)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id
                    `, [
                        agentId,
                        diplome.diplome,
                        formattedYear,
                        diplome.ecole || '',
                        diplome.ville || '',
                        diplome.pays || '',
                        diplome.options || null
                    ]);

                    const diplomeId = diplomeResult.rows[0].id;
                    console.log(`✅ Diplôme ${i + 1} inséré avec l'ID: ${diplomeId}`);

                    // APPROCHE SIMPLIFIÉE : Liaison par ordre séquentiel
                    let documentToLink = null;

                    console.log(`🔍 DEBUG SIMPLIFIÉ - Diplôme ${i + 1} - Recherche de document:`);
                    console.log(`   - files existe: ${!!files}`);

                    if (files) {
                        console.log(`   - Champs disponibles:`, Object.keys(files));
                        console.log(`   - Contenu détaillé des fichiers:`, JSON.stringify(files, null, 2));

                        // Chercher dans tous les champs possibles
                        const possibleFields = ['diplome_documents', 'diplomes', 'diplome', 'document_diplome', 'document_diplomes'];

                        for (const fieldName of possibleFields) {
                            console.log(`   🔍 Vérification du champ: ${fieldName}`);
                            if (files[fieldName]) {
                                console.log(`     - Type: ${typeof files[fieldName]}`);
                                console.log(`     - Is Array: ${Array.isArray(files[fieldName])}`);

                                // Normaliser : si c'est un fichier unique, le convertir en array
                                const fileArray = Array.isArray(files[fieldName]) ? files[fieldName] : [files[fieldName]];

                                if (fileArray.length > 0) {
                                    console.log(`     - Longueur: ${fileArray.length}`);
                                    console.log(`     - Éléments:`, fileArray.map(f => ({ originalname: f.originalname || f.name, fieldname: f.fieldname })));

                                    if (fileArray.length > i) {
                                        documentToLink = fileArray[i];
                                        console.log(`📄 Document trouvé dans ${fieldName}[${i}]: ${documentToLink.originalname || documentToLink.name}`);
                                        break;
                                    }
                                }
                            }
                        }

                        // APPROCHE ALTERNATIVE: Si aucun document trouvé, essayer de lier par ordre séquentiel
                        if (!documentToLink) {
                            console.log(`   🔄 APPROCHE ALTERNATIVE: Recherche séquentielle dans tous les fichiers`);

                            // Parcourir tous les champs de fichiers disponibles
                            for (const fieldName of Object.keys(files)) {
                                if (Array.isArray(files[fieldName]) && files[fieldName].length > 0) {
                                    console.log(`     - Champ ${fieldName}: ${files[fieldName].length} fichier(s)`);

                                    // Si c'est un champ de diplômes, utiliser l'index
                                    if (fieldName.includes('diplome') && files[fieldName].length > i) {
                                        documentToLink = files[fieldName][i];
                                        console.log(`📄 Document trouvé par approche alternative dans ${fieldName}[${i}]: ${documentToLink.originalname}`);
                                        break;
                                    }
                                }
                            }

                            // APPROCHE FINALE: Si toujours pas de document, utiliser l'index global
                            if (!documentToLink) {
                                // Compter tous les fichiers de diplômes disponibles
                                let totalDiplomeFiles = 0;
                                const diplomeFileArrays = [];

                                for (const fieldName of Object.keys(files)) {
                                    if (fieldName.includes('diplome')) {
                                        // Normaliser : convertir en array si nécessaire
                                        const fileArray = Array.isArray(files[fieldName]) ? files[fieldName] : [files[fieldName]];
                                        totalDiplomeFiles += fileArray.length;
                                        diplomeFileArrays.push(...fileArray);
                                    }
                                }

                                console.log(`   📊 Total fichiers de diplômes disponibles: ${totalDiplomeFiles}`);
                                console.log(`   📊 Index du diplôme actuel: ${i}`);

                                if (i < diplomeFileArrays.length) {
                                    documentToLink = diplomeFileArrays[i];
                                    console.log(`📄 Document trouvé par index global [${i}]: ${documentToLink.originalname}`);
                                }
                            }
                        }

                        if (!documentToLink) {
                            console.log(`⚠️ Aucun document trouvé pour le diplôme ${i + 1} dans aucun champ`);
                            console.log(`   Champs vérifiés:`, possibleFields);
                            console.log(`   Contenu des champs:`);
                            possibleFields.forEach(field => {
                                if (files[field]) {
                                    console.log(`     - ${field}: ${files[field].length} fichier(s)`);
                                }
                            });
                        }
                    } else {
                        console.log(`❌ Aucun fichier reçu dans la requête`);
                    }

                    // Si un document a été trouvé, le sauvegarder et le lier
                    if (documentToLink) {
                        console.log(`📄 Document à sauvegarder:`, {
                            originalname: documentToLink.originalname,
                            filename: documentToLink.filename,
                            size: documentToLink.size,
                            mimetype: documentToLink.mimetype
                        });

                        const documentUrl = `/uploads/diplomes/${documentToLink.filename}`;

                        // Utiliser une transaction pour s'assurer que la liaison se fait correctement
                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');

                            // Insérer le document
                            const documentResult = await client.query(`
                                INSERT INTO agent_documents (id_agent, document_type, document_url, document_name, document_size, document_mime_type)
                                VALUES ($1, $2, $3, $4, $5, $6)
                                RETURNING id
                            `, [
                                agentId,
                                'diplome',
                                documentUrl,
                                documentToLink.originalname,
                                documentToLink.size,
                                documentToLink.mimetype
                            ]);

                            const documentId = documentResult.rows[0].id;
                            console.log(`📄 Document inséré avec l'ID: ${documentId}`);

                            // Lier immédiatement le diplôme au document
                            const updateResult = await client.query(`
                                UPDATE etude_diplome 
                                SET id_agent_document = $1 
                                WHERE id = $2
                            `, [documentId, diplomeId]);

                            if (updateResult.rowCount === 0) {
                                throw new Error(`Échec de la liaison: diplôme ${diplomeId} non trouvé`);
                            }

                            await client.query('COMMIT');

                            console.log(`🔗 Liaison effectuée: diplôme ${diplomeId} -> document ${documentId}`);
                            console.log(`   Nombre de lignes affectées: ${updateResult.rowCount}`);

                            // Vérifier que la liaison a bien fonctionné
                            const verifyQuery = await client.query(`
                                SELECT id_agent_document FROM etude_diplome WHERE id = $1
                            `, [diplomeId]);

                            if (verifyQuery.rows.length > 0 && verifyQuery.rows[0].id_agent_document === documentId) {
                                console.log(`✅ VÉRIFICATION: Liaison confirmée - diplôme ${diplomeId} -> document ${documentId}`);
                            } else {
                                console.log(`❌ VÉRIFICATION: Liaison échouée - diplôme ${diplomeId} -> document ${documentId}`);
                                throw new Error('La liaison du document au diplôme a échoué');
                            }

                            console.log(`✅ Document de diplôme "${documentToLink.originalname}" sauvegardé et lié avec l'ID: ${documentId}`);
                        } catch (error) {
                            await client.query('ROLLBACK');
                            console.error(`❌ Erreur lors de la liaison du document:`, error);
                            throw error;
                        } finally {
                            client.release();
                        }
                    } else {
                        console.log(`⚠️ Aucun document trouvé pour le diplôme ${i + 1}`);
                        console.log(`   Diplôme: ${diplome.diplome}`);
                        console.log(`   fileName: ${diplome.fileName}`);
                        console.log(`   documentIndex: ${diplome.documentIndex}`);
                    }
                } else {
                    console.log(`⚠️ Diplôme ${i + 1} ignoré - données manquantes:`, diplome);
                }
            }

            console.log(`🎓 Diplômes gérés pour l'agent ${agentId}`);
        } catch (error) {
            console.error('❌ Erreur lors de la gestion des diplômes:', error);
            throw error; // Re-lancer l'erreur pour la debug
        }
    }

    // Gérer les documents dynamiques de l'agent
    async handleDynamicDocuments(agentId, documents, files = null) {
        try {
            console.log('📄 Gestion des documents dynamiques pour l\'agent:', agentId);
            console.log('📄 Documents reçus:', documents);

            if (!documents || documents.length === 0) {
                console.log('📄 Aucun document dynamique à traiter');
                return;
            }

            // Si c'est une mise à jour, nettoyer les anciens documents dynamiques
            if (files) {
                console.log('🗑️ Nettoyage des anciens documents dynamiques');
                await pool.query(`
                    DELETE FROM agent_documents 
                    WHERE id_agent = $1 AND document_type != 'diplome'
                `, [agentId]);
            }

            // Créer un mapping des fichiers disponibles
            const availableFiles = files && files.dynamic_documents ? files.dynamic_documents : [];
            let fileIndex = 0;

            console.log(`📄 Fichiers disponibles pour documents dynamiques:`, availableFiles.length);
            availableFiles.forEach((file, index) => {
                console.log(`   Fichier ${index + 1}: ${file.originalname} -> ${file.filename}`);
            });

            for (let i = 0; i < documents.length; i++) {
                const document = documents[i];
                console.log(`📄 Traitement du document ${i + 1}:`, document);

                if (document.name) {
                    let documentUrl = null;
                    let documentSize = null;
                    let documentMimeType = null;

                    // Vérifier si c'est un nouveau document (ID commence par 'new_')
                    const isNewDocument = document.id && typeof document.id === 'string' && document.id.startsWith('new_');
                    console.log(`📄 Document ${i + 1} "${document.name}" - est nouveau:`, isNewDocument);

                    // Pour les nouveaux documents, vérifier s'il y a un fichier correspondant
                    if (isNewDocument && fileIndex < availableFiles.length) {
                        // Nouveau document avec fichier
                        const file = availableFiles[fileIndex];
                        documentUrl = `/uploads/documents/${file.filename}`;
                        documentSize = file.size;
                        documentMimeType = file.mimetype;
                        fileIndex++; // Passer au fichier suivant
                        console.log(`📄 Nouveau document avec fichier ${i + 1}:`, file.originalname);
                    } else if (document.existingDocument && document.existingDocument.url) {
                        // Document existant - conserver les données existantes
                        documentUrl = document.existingDocument.url;
                        documentSize = document.existingDocument.size;
                        documentMimeType = document.existingDocument.type || 'application/pdf';
                        console.log(`📄 Document existant conservé ${i + 1}:`, document.existingDocument.name);
                    } else if (isNewDocument) {
                        // Nouveau document sans fichier
                        console.log(`📄 Nouveau document sans fichier ${i + 1}: ${document.name}`);
                        documentUrl = ''; // Chaîne vide pour les documents sans fichier (contrainte NOT NULL)
                        documentSize = null;
                        documentMimeType = null;
                    } else {
                        // Document existant sans données - utiliser les données par défaut
                        console.log(`📄 Document existant sans données ${i + 1}: ${document.name}`);
                        documentUrl = ''; // Chaîne vide par défaut
                        documentSize = null;
                        documentMimeType = null;
                    }

                    // Insérer le document dans la base de données
                    const documentResult = await pool.query(`
                        INSERT INTO agent_documents (
                            id_agent, 
                            document_type, 
                            document_name, 
                            document_url, 
                            document_size, 
                            document_mime_type,
                            description
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id
                    `, [
                        agentId,
                        'autre', // Type générique pour les documents dynamiques
                        document.name,
                        documentUrl,
                        documentSize,
                        documentMimeType,
                        `Document personnalisé: ${document.name}`
                    ]);

                    const documentId = documentResult.rows[0].id;
                    console.log(`✅ Document dynamique "${document.name}" sauvegardé avec l'ID: ${documentId}`);
                } else {
                    console.log(`⚠️ Document ${i + 1} ignoré - nom manquant`);
                }
            }

            console.log(`📄 Documents dynamiques gérés pour l'agent ${agentId}`);
        } catch (error) {
            console.error('❌ Erreur lors de la gestion des documents dynamiques:', error);
            throw error;
        }
    }

    // Gérer les langues de l'agent
    async handleAgentLangues(agentId, langues) {
        try {
            console.log('🌍 Gestion des langues pour l\'agent:', agentId);
            console.log('🌍 Langues reçues:', langues);

            if (!langues || langues.length === 0) {
                console.log('🌍 Aucune langue à traiter');
                return;
            }

            for (const langue of langues) {
                if (langue.id_langue && langue.id_niveau_langue) {
                    // Si c'est une langue personnalisée (autre)
                    if (langue.id_langue === 'autre' && langue.langue_personnalisee) {
                        // D'abord, vérifier si cette langue personnalisée existe déjà dans la table langues
                        let langueId = null;
                        const existingLangue = await pool.query(
                            'SELECT id FROM langues WHERE libele = $1', [langue.langue_personnalisee]
                        );

                        if (existingLangue.rows.length > 0) {
                            langueId = existingLangue.rows[0].id;
                        } else {
                            // Créer une nouvelle langue personnalisée
                            const newLangue = await pool.query(
                                'INSERT INTO langues (libele) VALUES ($1) RETURNING id', [langue.langue_personnalisee]
                            );
                            langueId = newLangue.rows[0].id;
                            console.log(`✅ Nouvelle langue créée: ${langue.langue_personnalisee} (ID: ${langueId})`);
                        }

                        // Insérer dans agent_langues avec l'ID de la langue
                        await pool.query(`
                            INSERT INTO agent_langues (id_agent, id_langue, id_niveau_langue)
                            VALUES ($1, $2, $3)
                        `, [agentId, langueId, langue.id_niveau_langue]);
                        console.log(`✅ Langue personnalisée ajoutée: ${langue.langue_personnalisee} - Niveau: ${langue.id_niveau_langue}`);
                    } else {
                        // Langue standard
                        await pool.query(`
                            INSERT INTO agent_langues (id_agent, id_langue, id_niveau_langue)
                            VALUES ($1, $2, $3)
                        `, [agentId, langue.id_langue, langue.id_niveau_langue]);
                        console.log(`✅ Langue ajoutée: ${langue.id_langue} - Niveau: ${langue.id_niveau_langue}`);
                    }
                }
            }

            console.log(`🌍 Langues gérées pour l'agent ${agentId}`);
        } catch (error) {
            console.error('❌ Erreur lors de la gestion des langues:', error);
            throw error;
        }
    }

    // Gérer les logiciels de l'agent
    async handleAgentLogiciels(agentId, logiciels) {
        try {
            console.log('💻 Gestion des logiciels pour l\'agent:', agentId);
            console.log('💻 Logiciels reçus:', logiciels);

            if (!logiciels || logiciels.length === 0) {
                console.log('💻 Aucun logiciel à traiter');
                return;
            }

            for (const logiciel of logiciels) {
                if (logiciel.id_logiciel && logiciel.id_niveau_informatique) {
                    // Si c'est un logiciel personnalisé (autre)
                    if (logiciel.id_logiciel === 'autre' && logiciel.logiciel_personnalise) {
                        // D'abord, vérifier si ce logiciel personnalisé existe déjà dans la table logiciels
                        let logicielId = null;
                        const existingLogiciel = await pool.query(
                            'SELECT id FROM logiciels WHERE libele = $1', [logiciel.logiciel_personnalise]
                        );

                        if (existingLogiciel.rows.length > 0) {
                            logicielId = existingLogiciel.rows[0].id;
                        } else {
                            // Créer un nouveau logiciel personnalisé
                            const newLogiciel = await pool.query(
                                'INSERT INTO logiciels (libele) VALUES ($1) RETURNING id', [logiciel.logiciel_personnalise]
                            );
                            logicielId = newLogiciel.rows[0].id;
                            console.log(`✅ Nouveau logiciel créé: ${logiciel.logiciel_personnalise} (ID: ${logicielId})`);
                        }

                        // Insérer dans agent_logiciels avec l'ID du logiciel
                        await pool.query(`
                            INSERT INTO agent_logiciels (id_agent, id_logiciel, id_niveau_informatique)
                            VALUES ($1, $2, $3)
                        `, [agentId, logicielId, logiciel.id_niveau_informatique]);
                        console.log(`✅ Logiciel personnalisé ajouté: ${logiciel.logiciel_personnalise} - Niveau: ${logiciel.id_niveau_informatique}`);
                    } else {
                        // Logiciel standard
                        await pool.query(`
                            INSERT INTO agent_logiciels (id_agent, id_logiciel, id_niveau_informatique)
                            VALUES ($1, $2, $3)
                        `, [agentId, logiciel.id_logiciel, logiciel.id_niveau_informatique]);
                        console.log(`✅ Logiciel ajouté: ${logiciel.id_logiciel} - Niveau: ${logiciel.id_niveau_informatique}`);
                    }
                }
            }

            console.log(`💻 Logiciels gérés pour l'agent ${agentId}`);
        } catch (error) {
            console.error('❌ Erreur lors de la gestion des logiciels:', error);
            throw error;
        }
    }

    // Méthode de diagnostic pour vérifier l'état des diplômes
    async diagnoseDiplomes(agentId) {
        try {
            console.log(`🔍 DIAGNOSTIC - Vérification des diplômes pour l'agent ${agentId}`);

            // Vérifier les diplômes sans documents
            const diplomesWithoutDocs = await pool.query(`
                SELECT ed.id, ed.diplome, ed.date_diplome, ed.id_agent_document
                FROM etude_diplome ed
                WHERE ed.id_agent = $1 AND ed.id_agent_document IS NULL
            `, [agentId]);

            console.log(`📊 Diplômes sans documents: ${diplomesWithoutDocs.rows.length}`);
            diplomesWithoutDocs.rows.forEach(diplome => {
                console.log(`   - Diplôme ID ${diplome.id}: ${diplome.diplome} (${diplome.date_diplome})`);
            });

            // Vérifier les documents orphelins
            const orphanDocs = await pool.query(`
                SELECT ad.id, ad.document_name, ad.document_type
                FROM agent_documents ad
                LEFT JOIN etude_diplome ed ON ad.id = ed.id_agent_document
                WHERE ad.id_agent = $1 AND ad.document_type = 'diplome' AND ed.id IS NULL
            `, [agentId]);

            console.log(`📊 Documents orphelins: ${orphanDocs.rows.length}`);
            orphanDocs.rows.forEach(doc => {
                console.log(`   - Document ID ${doc.id}: ${doc.document_name}`);
            });

            // Vérifier les diplômes avec documents
            const diplomesWithDocs = await pool.query(`
                SELECT ed.id, ed.diplome, ed.date_diplome, ad.document_name, ad.document_url
                FROM etude_diplome ed
                LEFT JOIN agent_documents ad ON ed.id_agent_document = ad.id
                WHERE ed.id_agent = $1 AND ed.id_agent_document IS NOT NULL
            `, [agentId]);

            console.log(`📊 Diplômes avec documents: ${diplomesWithDocs.rows.length}`);
            diplomesWithDocs.rows.forEach(diplome => {
                console.log(`   - Diplôme ID ${diplome.id}: ${diplome.diplome} -> Document: ${diplome.document_name}`);
            });

            return {
                diplomesWithoutDocs: diplomesWithoutDocs.rows,
                orphanDocs: orphanDocs.rows,
                diplomesWithDocs: diplomesWithDocs.rows
            };
        } catch (error) {
            console.error('❌ Erreur lors du diagnostic des diplômes:', error);
            throw error;
        }
    }


    // Fonction pour générer un PDF simple avec PDFKit
    async generateFicheSignaletiquePDFKit(agent) {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 50 });

            // Collecter les données du PDF dans un buffer
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));

            return new Promise(async(resolve, reject) => {
                        doc.on('end', () => {
                            const pdfBuffer = Buffer.concat(chunks);
                            resolve(pdfBuffer);
                        });

                        doc.on('error', reject);

                        try {
                            // Log des données de l'agent pour débogage
                            console.log('🔍 Données de l\'agent pour PDF:');
                            console.log('   - Nom:', agent.nom);
                            console.log('   - Prénoms:', agent.prenom);
                            console.log('   - Nationalité:', agent.nationalite_libele);
                            console.log('   - Situation matrimoniale:', agent.situation_matrimoniale_libele);
                            console.log('   - Handicap:', agent.handicap_nom);
                            console.log('   - Grade:', agent.grade_libele);
                            console.log('   - Emploi:', agent.emploi_libele);
                            console.log('   - Ministère:', agent.ministere_nom);
                            console.log('   - Service:', agent.service_libelle);
                            console.log('   - Type d\'agent:', agent.type_agent_libele);
                            console.log('   - Emploi actuel:', agent.emploi_actuel);
                            console.log('   - Fonction actuelle:', agent.fonction_actuelle);

                            // En-tête officiel selon l'image
                            const pageWidth = doc.page.width;
                            const margin = 50;
                            const headerY = 50;

                            // Bloc gauche - Ministère
                            doc.fontSize(12).font('Helvetica-Bold').text('MINISTERE DU TOURISME', margin, headerY);
                            doc.fontSize(12).font('Helvetica-Bold').text('ET DES LOISIRS', margin, headerY + 15);

                            // Ligne horizontale sous "ET DES LOISIRS"
                            doc.moveTo(margin, headerY + 30).lineTo(margin + 80, headerY + 30).stroke();

                            doc.fontSize(12).font('Helvetica-Bold').text('DIRECTION DES RESSOURCES', margin, headerY + 40);
                            doc.fontSize(12).font('Helvetica-Bold').text('HUMAINES', margin, headerY + 55);

                            // Ligne horizontale sous "HUMAINES"
                            doc.moveTo(margin, headerY + 70).lineTo(margin + 80, headerY + 70).stroke();

                            // Bloc droit - République (déplacé plus à gauche pour éviter l'entremêlement)
                            const rightBlockX = pageWidth - margin - 200; // Augmenté de 80 pixels vers la gauche
                            doc.fontSize(12).font('Helvetica-Bold').text('REPUBLIQUE DE CÔTE D\'IVOIRE', rightBlockX, headerY, { align: 'right' });
                            doc.fontSize(12).font('Helvetica-Bold').text('Union-Discipline-Travail', rightBlockX, headerY + 15, { align: 'right' });

                            // Ligne horizontale en pointillés sous "Union-Discipline-Travail" - centrée sous le texte
                            const dashLength = 3;
                            const dashGap = 2;
                            const dashLineLength = 80; // Longueur de la ligne en pointillés
                            const dashStartX = rightBlockX + (200 - dashLineLength) / 2; // Centrer la ligne sous le texte
                            let currentX = dashStartX;
                            while (currentX < dashStartX + dashLineLength) {
                                doc.moveTo(currentX, headerY + 30).lineTo(currentX + dashLength, headerY + 30).stroke();
                                currentX += dashLength + dashGap;
                            }

                            // Titre central dans une boîte grise
                            const titleBoxY = headerY + 90;
                            const titleBoxWidth = 200;
                            const titleBoxHeight = 40;
                            const titleBoxX = (pageWidth - titleBoxWidth) / 2;

                            // Dessiner la boîte grise pour le titre
                            doc.rect(titleBoxX, titleBoxY, titleBoxWidth, titleBoxHeight)
                                .fillAndStroke('#808080', '#000000');

                            // Texte du titre en blanc dans la boîte
                            doc.fillColor('white')
                                .fontSize(14).font('Helvetica-Bold')
                                .text('FICHE SIGNALETIQUE', titleBoxX + 10, titleBoxY + 8, {
                                    width: titleBoxWidth - 20,
                                    align: 'center'
                                });

                            // Déterminer le statut selon le type d'agent
                            const agentStatus = (agent.type_agent_libele && agent.type_agent_libele.toUpperCase() === 'FONCTIONNAIRE') ? 'AGENTS FONCTIONNAIRES' : 'AGENT NON FONCTIONNAIRE';

                            doc.fontSize(12).font('Helvetica-Bold')
                                .text(agentStatus, titleBoxX + 10, titleBoxY + 25, {
                                    width: titleBoxWidth - 20,
                                    align: 'center'
                                });

                            // Remettre la couleur noire pour la suite
                            doc.fillColor('black');

                            // Positionner le curseur après l'en-tête
                            doc.y = titleBoxY + titleBoxHeight + 30;

                            // Position de départ pour les informations
                            const startY = doc.y;
                            const leftColumnX = 50;
                            const rightColumnX = 450; // Déplacé plus à droite

                            // État Civil - titre à gauche avec espacement
                            const etatCivilY = startY - 30; // Positionner le titre plus haut
                            doc.fontSize(12).font('Helvetica-Bold').text('ÉTAT CIVIL', leftColumnX, etatCivilY, { underline: true });
                            const photoSize = 100; // Hauteur augmentée

                            // Afficher la photo de l'agent si disponible
                            console.log(`🔍 DEBUG PHOTO - agent.photos:`, agent.photos);
                            console.log(`🔍 DEBUG PHOTO - agent.photos.length:`, agent.photos ? agent.photos.length : 'undefined');

                            if (agent.photos && agent.photos.length > 0) {
                                try {
                                    const photo = agent.photos[0];
                                    console.log(`🔍 Photo trouvée: ${photo.photo_url}`);
                                    console.log(`🔍 Photo complète:`, photo);

                                    // Construire le chemin complet vers la photo
                                    let photoPath;
                                    const baseDir = path.join(__dirname, '..'); // Remonter au dossier backend

                                    if (photo.photo_url.startsWith('/uploads/')) {
                                        // Si l'URL commence par /uploads/, construire le chemin vers backend/uploads
                                        photoPath = path.join(baseDir, photo.photo_url.substring(1)); // Enlever le premier /
                                    } else if (photo.photo_url.startsWith('uploads/')) {
                                        // Si l'URL commence par uploads/, ajouter directement
                                        photoPath = path.join(baseDir, photo.photo_url);
                                    } else {
                                        // Sinon, utiliser le chemin tel quel
                                        photoPath = path.join(baseDir, photo.photo_url);
                                    }

                                    console.log(`🔍 Chemin de la photo: ${photoPath}`);
                                    console.log(`🔍 Répertoire backend: ${baseDir}`);

                                    // Vérifier si le fichier existe
                                    if (fs.existsSync(photoPath)) {
                                        // Vérifier le format de l'image
                                        const fileExtension = path.extname(photoPath).toLowerCase();
                                        console.log(`🔍 Extension du fichier: ${fileExtension}`);

                                        // PDFKit supporte: JPEG, PNG, GIF, TIFF, BMP
                                        const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp'];

                                        if (!supportedFormats.includes(fileExtension)) {
                                            console.log(`⚠️ Format ${fileExtension} détecté - Tentative de conversion vers JPEG`);

                                            // Créer un fichier temporaire pour la conversion
                                            const tempDir = path.join(__dirname, '..', 'temp');
                                            if (!fs.existsSync(tempDir)) {
                                                fs.mkdirSync(tempDir, { recursive: true });
                                            }

                                            const convertedPath = path.join(tempDir, `converted_${Date.now()}.jpg`);

                                            try {
                                                // Convertir l'image vers JPEG
                                                const conversionSuccess = await this.convertImageToPDFSupported(photoPath, convertedPath);

                                                if (conversionSuccess && fs.existsSync(convertedPath)) {
                                                    const imageBuffer = fs.readFileSync(convertedPath);
                                                    console.log(`📷 Taille du buffer image convertie: ${imageBuffer.length} bytes`);

                                                    doc.image(imageBuffer, rightColumnX, startY, {
                                                        width: photoSize,
                                                        height: photoSize + 20,
                                                        fit: [photoSize, photoSize + 20],
                                                        align: 'center'
                                                    });
                                                    console.log(`✅ Photo convertie et ajoutée avec succès: ${photo.photo_url}`);

                                                    // Nettoyer le fichier temporaire
                                                    fs.unlinkSync(convertedPath);
                                                } else {
                                                    console.log(`❌ Échec de la conversion - Photo ignorée: ${photo.photo_url}`);
                                                }
                                            } catch (conversionError) {
                                                console.log(`❌ Erreur lors de la conversion: ${conversionError.message}`);
                                                console.log(`⚠️ Photo ignorée: ${photo.photo_url}`);
                                            }
                                        } else {
                                            try {
                                                // Lire le fichier et l'utiliser directement avec PDFKit
                                                const imageBuffer = fs.readFileSync(photoPath);
                                                console.log(`📷 Taille du buffer image: ${imageBuffer.length} bytes`);

                                                // Ajouter l'image avec gestion d'erreur améliorée
                                                doc.image(imageBuffer, rightColumnX, startY, {
                                                    width: photoSize,
                                                    height: photoSize + 20,
                                                    fit: [photoSize, photoSize + 20],
                                                    align: 'center'
                                                });
                                                console.log(`✅ Photo de l'agent ajoutée avec succès: ${photo.photo_url}`);
                                            } catch (imageError) {
                                                console.log(`❌ Erreur lors de l'ajout de l'image: ${imageError.message}`);
                                                console.log(`❌ Stack trace:`, imageError.stack);
                                                console.log(`⚠️ Photo ignorée: ${photo.photo_url}`);
                                            }
                                        }
                                    } else {
                                        console.log(`⚠️ Photo non trouvée: ${photoPath}`);
                                        console.log(`⚠️ Vérification des chemins alternatifs...`);

                                        // Essayer des chemins alternatifs plus complets
                                        const alternativePaths = [
                                            // Chemins relatifs au backend
                                            path.join(baseDir, 'uploads', 'photos', path.basename(photo.photo_url)),
                                            path.join(baseDir, '..', 'uploads', 'photos', path.basename(photo.photo_url)),
                                            // Chemins avec URL complète
                                            path.join(baseDir, photo.photo_url.replace('/uploads/', 'uploads/')),
                                            // Chemins absolus possibles
                                            path.join(process.cwd(), 'backend', 'uploads', 'photos', path.basename(photo.photo_url)),
                                            path.join(process.cwd(), 'uploads', 'photos', path.basename(photo.photo_url))
                                        ];

                                        let photoFound = false;
                                        for (const altPath of alternativePaths) {
                                            console.log(`🔍 Test du chemin alternatif: ${altPath}`);
                                            if (fs.existsSync(altPath)) {
                                                try {
                                                    const fileExtension = path.extname(altPath).toLowerCase();
                                                    const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp'];

                                                    if (supportedFormats.includes(fileExtension)) {
                                                        const imageBuffer = fs.readFileSync(altPath);
                                                        doc.image(imageBuffer, rightColumnX, startY, {
                                                            width: photoSize,
                                                            height: photoSize + 20,
                                                            fit: [photoSize, photoSize + 20],
                                                            align: 'center'
                                                        });
                                                        console.log(`✅ Photo trouvée avec chemin alternatif: ${altPath}`);
                                                        photoFound = true;
                                                        break;
                                                    } else {
                                                        console.log(`⚠️ Format non supporté pour le chemin alternatif: ${fileExtension} - Tentative de conversion`);

                                                        // Créer un fichier temporaire pour la conversion
                                                        const tempDir = path.join(__dirname, '..', 'temp');
                                                        if (!fs.existsSync(tempDir)) {
                                                            fs.mkdirSync(tempDir, { recursive: true });
                                                        }

                                                        const convertedPath = path.join(tempDir, `converted_alt_${Date.now()}.jpg`);

                                                        try {
                                                            const conversionSuccess = await this.convertImageToPDFSupported(altPath, convertedPath);

                                                            if (conversionSuccess && fs.existsSync(convertedPath)) {
                                                                const imageBuffer = fs.readFileSync(convertedPath);
                                                                doc.image(imageBuffer, rightColumnX, startY, {
                                                                    width: photoSize,
                                                                    height: photoSize + 20,
                                                                    fit: [photoSize, photoSize + 20],
                                                                    align: 'center'
                                                                });
                                                                console.log(`✅ Photo convertie trouvée avec chemin alternatif: ${altPath}`);
                                                                photoFound = true;

                                                                // Nettoyer le fichier temporaire
                                                                fs.unlinkSync(convertedPath);
                                                                break;
                                                            }
                                                        } catch (conversionError) {
                                                            console.log(`❌ Erreur lors de la conversion du chemin alternatif: ${conversionError.message}`);
                                                        }
                                                    }
                                                } catch (imageError) {
                                                    console.log(`❌ Erreur avec le chemin alternatif: ${imageError.message}`);
                                                }
                                            }
                                        }

                                        if (!photoFound) {
                                            console.log(`⚠️ Aucun chemin alternatif n'a fonctionné`);
                                            console.log(`⚠️ Liste des fichiers dans uploads/photos:`,
                                                fs.existsSync(path.join(baseDir, 'uploads', 'photos')) ?
                                                fs.readdirSync(path.join(baseDir, 'uploads', 'photos')) : 'Dossier non trouvé');
                                        }
                                    }
                                } catch (error) {
                                    console.error('❌ Erreur lors de l\'ajout de la photo:', error);
                                    console.error('❌ Stack trace:', error.stack);
                                }
                            } else {
                                console.log(`⚠️ Aucune photo trouvée pour l'agent ${agent.id}`);
                            }

                            // Informations personnelles (colonne de gauche)
                            doc.fontSize(11).font('Helvetica').text(`Nom: ${agent.nom || 'N/A'}`, leftColumnX, startY);
                            doc.text(`Prénoms: ${agent.prenom || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Date de naissance: ${agent.date_de_naissance ? new Date(agent.date_de_naissance).toLocaleDateString('fr-FR') : 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Lieu de naissance: ${agent.lieu_de_naissance || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Nationalité: ${agent.nationalite_libele || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Sexe: ${agent.sexe === 'M' ? 'Masculin' : agent.sexe === 'F' ? 'Féminin' : 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Nom du père: ${agent.nom_du_pere || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Nom de la mère: ${agent.nom_de_la_mere || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Situation matrimoniale: ${agent.situation_matrimoniale_libele || 'N/A'}`, leftColumnX, doc.y);
                            doc.text(`Handicap: ${agent.handicap_nom || 'Aucun'}`, leftColumnX, doc.y);
                            doc.text(`Nombre d'enfants: ${agent.nombre_enfant || '0'}`, leftColumnX, doc.y);

                            // Positionner le curseur après la photo pour la suite
                            const maxY = Math.max(doc.y, startY + photoSize + 30);
                            doc.y = maxY;
                            doc.moveDown();

                            // Renseignements Administratifs
                            doc.fontSize(12).font('Helvetica-Bold').text('RENSEIGNEMENTS ADMINISTRATIFS', { underline: true });
                            doc.moveDown();

                            if (agent.type_agent_libele === 'Fonctionnaire') {
                                // Informations pour les fonctionnaires
                                doc.fontSize(11).font('Helvetica').text(`Matricule: ${agent.matricule || 'N/A'}`);
                                doc.text(`Grade: ${agent.grade_libele || 'N/A'}`);
                                doc.text(`Emploi: ${agent.emploi_libele || 'N/A'}`);
                                doc.text(`Date de nomination: ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}`);
                                doc.text(`Ministère d'affectation: ${agent.ministere_nom || 'N/A'}`);
                                doc.text(`Date de départ à la retraite: ${agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : 'N/A'}`);
                                doc.text(`Situation militaire: ${agent.situation_militaire || 'N/A'}`);
                                doc.text(`Date de première prise de service: ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}`);
                                doc.text(`Adresse personnelle: ${agent.ad_pri_rue || agent.ad_pri_ville || agent.ad_pri_batiment ? `${agent.ad_pri_rue || ''} ${agent.ad_pri_ville || ''} ${agent.ad_pri_batiment || ''}`.trim() : 'N/A'}`);
                                doc.text(`Téléphone: ${agent.telephone1 || 'N/A'}`);
                                doc.text(`Personne à contacter en cas de besoin: ${agent.telephone2 || 'N/A'}`);
                                doc.text(`Email: ${agent.email || 'N/A'}`);
                            } else {
                                // Informations spécifiques pour les agents non fonctionnaires
                                doc.fontSize(11).font('Helvetica').text(`Type de contrat: ${agent.type_agent_libele || 'N/A'}`);
                                doc.text(`Matricule: ${agent.matricule || 'N/A'}`);
                                doc.text(`Emploi: ${agent.emploi_libele || 'N/A'}`);
                                doc.text(`Date de prise de service: ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}`);
                                doc.text(`Service d'affectation: ${agent.service_libelle || 'N/A'}`);
                                doc.text(`Numéro CNPS: ${agent.numero_cnps || 'N/A'}`);
                                doc.text(`Date de déclaration: ${agent.date_declaration_cnps ? new Date(agent.date_declaration_cnps).toLocaleDateString('fr-FR') : 'N/A'}`);
                                doc.text(`Adresse personnelle: ${agent.ad_pri_rue || agent.ad_pri_ville || agent.ad_pri_batiment ? `${agent.ad_pri_rue || ''} ${agent.ad_pri_ville || ''} ${agent.ad_pri_batiment || ''}`.trim() : 'N/A'}`);
                                doc.text(`Téléphone: ${agent.telephone1 || 'N/A'}`);
                                doc.text(`Email: ${agent.email || 'N/A'}`);
                                doc.text(`Personne à contacter en cas de besoin: ${agent.telephone2 || 'N/A'}`);
                            }

                            // Ajouter la section des emplois actuels
                            if (agent.emploi_actuel) {
                                doc.moveDown();
                                doc.fontSize(12).font('Helvetica-Bold').text('EMPLOI ACTUEL', { underline: true });
                                doc.moveDown();
                                
                                doc.fontSize(11).font('Helvetica').text(`Emploi: ${agent.emploi_actuel.emploi_libele || 'N/A'}`);
                                doc.text(`Date de nomination: ${agent.emploi_actuel.date_entree ? new Date(agent.emploi_actuel.date_entree).toLocaleDateString('fr-FR') : 'N/A'}`);
                                
                                // Acte de nomination
                                doc.moveDown();
                                doc.fontSize(11).font('Helvetica-Bold').text(`Acte de nomination comme ${agent.emploi_actuel.emploi_libele || 'N/A'}:`, { underline: true });
                                doc.moveDown();
                                
                                doc.fontSize(11).font('Helvetica').text(`Nature: ${agent.emploi_actuel.nature || 'N/A'}`);
                                doc.text(`Numéro: ${agent.emploi_actuel.numero || 'N/A'}`);
                                doc.text(`Date signature: ${agent.emploi_actuel.date_signature ? new Date(agent.emploi_actuel.date_signature).toLocaleDateString('fr-FR') : 'N/A'}`);
                            }
                doc.moveDown();

                // Expérience Professionnelle
                doc.fontSize(12).font('Helvetica-Bold').text('EXPÉRIENCE PROFESSIONNELLE', { underline: true });
                doc.moveDown();

                // Fonction actuelle
                if (agent.fonction_actuelle) {
                    doc.fontSize(11).font('Helvetica-Bold').text('Fonctions actuelles:', { underline: true });
                    doc.moveDown();
                    
                    doc.fontSize(11).font('Helvetica').text(`Date d'entrée: ${agent.fonction_actuelle.date_entree ? new Date(agent.fonction_actuelle.date_entree).toLocaleDateString('fr-FR') : 'N/A'}`);
                    doc.text(`Désignation du poste: ${agent.fonction_actuelle.designation_poste || 'N/A'}`);
                    doc.moveDown();
                    
                    // Acte de nomination
                    doc.fontSize(11).font('Helvetica-Bold').text(`Acte de nomination comme ${agent.fonction_actuelle.fonction_libele || 'N/A'}:`, { underline: true });
                    doc.moveDown();
                    
                    doc.fontSize(11).font('Helvetica').text(`Nature: ${agent.fonction_actuelle.nature || 'N/A'}`);
                    doc.text(`Numéro: ${agent.fonction_actuelle.numero || 'N/A'}`);
                    doc.text(`Date signature: ${agent.fonction_actuelle.date_signature ? new Date(agent.fonction_actuelle.date_signature).toLocaleDateString('fr-FR') : 'N/A'}`);
                    doc.moveDown();
                } else {
                    doc.fontSize(11).font('Helvetica-Bold').text('Fonctions actuelles', { underline: true });
                    doc.moveDown();
                    doc.fontSize(11).font('Helvetica').text('Aucune fonction actuelle renseignée');
                    doc.moveDown();
                }
                
               
                // Fonctions antérieures - Tableau
                if (agent.fonctions_anterieures && agent.fonctions_anterieures.length > 0) {
                    const pageWidth = doc.page.width;
                    const titleText = 'FONCTIONS ANTÉRIEURES';
                    const textWidth = doc.widthOfString(titleText);
                    const xPosition = (pageWidth - textWidth) / 2;
                    doc.fontSize(12).font('Helvetica-Bold').text(titleText, xPosition, doc.y, { underline: true });
                    doc.moveDown();
                    
                    // Créer un tableau pour les fonctions antérieures
                    const fonctionsTable = {
                        headers: ['Du', 'Au', 'Désignation du poste', 'Structure', 'Position admin.', 'Acte de nomination'],
                        rows: agent.fonctions_anterieures.map((fonction, index) => {
                            // La première fonction (index 0) est la fonction actuelle
                            const isCurrentFunction = index === 0;
                            const dateSortie = isCurrentFunction ? 'En cours' : 
                                (fonction.date_sortie ? new Date(fonction.date_sortie).toLocaleDateString('fr-FR') : 'Antérieur');
                            
                            // Construire l'information de l'acte de nomination
                            const acteInfo = [];
                            if (fonction.nature) acteInfo.push(`Nature: ${fonction.nature}`);
                            if (fonction.numero) acteInfo.push(`N°: ${fonction.numero}`);
                            if (fonction.date_signature) acteInfo.push(`Date: ${new Date(fonction.date_signature).toLocaleDateString('fr-FR')}`);
                            const acteNomination = acteInfo.length > 0 ? acteInfo.join('\n') : 'N/A';
                            
                            return [
                                fonction.date_entree ? new Date(fonction.date_entree).toLocaleDateString('fr-FR') : 'N/A',
                                dateSortie,
                                fonction.designation_poste || 'N/A',
                                agent.ministere_sigle || 'N/A', // Sigle du ministère de l'agent
                                'PRESENT', // Position administrative par défaut
                                acteNomination
                            ];
                        })
                    };
                    
                    // Dessiner le tableau
                    this.drawTable(doc, fonctionsTable, 50, doc.y);
                    doc.moveDown();
                } else {
                    doc.fontSize(11).font('Helvetica').text('Aucune fonction antérieure renseignée');
                    doc.moveDown();
                }

                // Emplois antérieurs - Tableau
                if (agent.emplois_anterieurs && agent.emplois_anterieurs.length > 0) {
                    const pageWidth = doc.page.width;
                    const titleText = 'EMPLOIS ANTÉRIEURS';
                    const textWidth = doc.widthOfString(titleText);
                    const xPosition = (pageWidth - textWidth) / 2;
                    doc.fontSize(12).font('Helvetica-Bold').text(titleText, xPosition, doc.y, { underline: true });
                    doc.moveDown();
                    
                    // Créer un tableau pour les emplois antérieurs
                    const emploisTable = {
                        headers: ['Du', 'Au', 'Désignation du poste', 'Structure', 'Position admin.', 'Acte de nomination'],
                        rows: agent.emplois_anterieurs.map((emploi, index) => {
                            // Le premier emploi (index 0) est l'emploi actuel
                            const isCurrentEmploi = index === 0;
                            const dateSortie = isCurrentEmploi ? 'En cours' : 
                                (emploi.date_sortie ? new Date(emploi.date_sortie).toLocaleDateString('fr-FR') : 'Antérieur');
                            
                            // Construire l'information de l'acte de nomination
                            const acteInfo = [];
                            if (emploi.nature) acteInfo.push(`Nature: ${emploi.nature}`);
                            if (emploi.numero) acteInfo.push(`N°: ${emploi.numero}`);
                            if (emploi.date_signature) acteInfo.push(`Date: ${new Date(emploi.date_signature).toLocaleDateString('fr-FR')}`);
                            const acteNomination = acteInfo.length > 0 ? acteInfo.join('\n') : 'N/A';
                            
                            return [
                                emploi.date_entree ? new Date(emploi.date_entree).toLocaleDateString('fr-FR') : 'N/A',
                                dateSortie,
                                emploi.designation_poste || 'N/A',
                                agent.ministere_sigle || 'N/A', // Sigle du ministère de l'agent
                                'PRESENT', // Position administrative par défaut
                                acteNomination
                            ];
                        })
                    };
                    
                    // Dessiner le tableau
                    this.drawTable(doc, emploisTable, 50, doc.y);
                    doc.moveDown();
                } else {
                    doc.fontSize(11).font('Helvetica').text('Aucun emploi antérieur renseigné');
                    doc.moveDown();
                }

                // Formations professionnelles - Centré
                const pageWidthFormations = doc.page.width;
                const titleTextFormations = 'Formations professionnelles: N/A';
                const textWidthFormations = doc.widthOfString(titleTextFormations);
                const xPositionFormations = (pageWidthFormations - textWidthFormations) / 2;
                doc.fontSize(11).font('Helvetica').text(titleTextFormations, xPositionFormations, doc.y);
                doc.moveDown();

                // Stages
                if (agent.stages && agent.stages.length > 0) {
                    const pageWidthStages = doc.page.width;
                    const titleTextStages = 'Stages:';
                    const textWidthStages = doc.widthOfString(titleTextStages);
                    const xPositionStages = (pageWidthStages - textWidthStages) / 2;
                    doc.fontSize(11).font('Helvetica-Bold').text(titleTextStages, xPositionStages, doc.y, { underline: true });
                    doc.moveDown();
                    
                    agent.stages.forEach((stage, index) => {
                        doc.fontSize(11).font('Helvetica').text(`${index + 1}. ${stage.intitule_stage || 'N/A'}`);
                        doc.text(`   Établissement: ${stage.etablissement || 'N/A'}`);
                        doc.text(`   Ville: ${stage.ville || 'N/A'} - Pays: ${stage.pays || 'N/A'}`);
                        doc.text(`   Date stage: ${stage.date_stage ? new Date(stage.date_stage).toLocaleDateString('fr-FR') : 'N/A'}`);
                        doc.text(`   Durée: ${stage.duree_stage ? `${stage.duree_stage} jours` : 'N/A'}`);
                        doc.moveDown(0.5);
                    });
                } else {
                    const pageWidthNoStages = doc.page.width;
                    const titleTextNoStages = 'Aucun stage renseigné';
                    const textWidthNoStages = doc.widthOfString(titleTextNoStages);
                    const xPositionNoStages = (pageWidthNoStages - textWidthNoStages) / 2;
                    doc.fontSize(11).font('Helvetica').text(titleTextNoStages, xPositionNoStages, doc.y);
                    doc.moveDown();
                }

                // Titres et diplômes - Tableau
                if (agent.etudes_diplomes && agent.etudes_diplomes.length > 0) {
                    const pageWidthDiplomes = doc.page.width;
                    const titleTextDiplomes = 'Titres et diplômes:';
                    const textWidthDiplomes = doc.widthOfString(titleTextDiplomes);
                    const xPositionDiplomes = (pageWidthDiplomes - textWidthDiplomes) / 2;
                    doc.fontSize(11).font('Helvetica-Bold').text(titleTextDiplomes, xPositionDiplomes, doc.y, { underline: true });
                    doc.moveDown();
                    
                    // Créer un tableau pour les diplômes
                    const diplomesTable = {
                        headers: ['Diplôme', 'École', 'Ville', 'Pays', 'Année d\'obtention'],
                        rows: agent.etudes_diplomes.map(etude => [
                            etude.diplome || 'N/A',
                            etude.ecole || 'N/A',
                            etude.ville || 'N/A',
                            etude.pays || 'N/A',
                            etude.date_diplome ? etude.date_diplome.toString() : 'N/A'
                        ])
                    };
                    
                    // Dessiner le tableau
                    this.drawTable(doc, diplomesTable, 50, doc.y);
                    doc.moveDown();
                }

                // Connaissance des langues étrangères - Tableau
                if (agent.langues && agent.langues.length > 0) {
                    const pageWidth = doc.page.width;
                    const titleText = 'CONNAISSANCE ET MAÎTRISE DES LANGUES ÉTRANGÈRES';
                    const textWidth = doc.widthOfString(titleText);
                    const xPosition = (pageWidth - textWidth) / 2;
                    doc.fontSize(12).font('Helvetica-Bold').text(titleText, xPosition, doc.y, { underline: true });
                    doc.moveDown();

                    // Créer un tableau pour les langues
                    const languesTable = {
                        headers: ['Langue', 'Niveau'],
                        rows: agent.langues.map(langue => [
                            langue.langue_nom || 'N/A',
                            langue.niveau_libele || 'N/A'
                        ])
                    };
                    
                    // Dessiner le tableau
                    this.drawTable(doc, languesTable, 50, doc.y);
                    doc.moveDown();
                }

                // Connaissance des outils informatiques - Tableau
                if (agent.logiciels && agent.logiciels.length > 0) {
                    const pageWidth = doc.page.width;
                    const titleText = 'CONNAISSANCE ET MAÎTRISE DE L\'OUTIL INFORMATIQUE';
                    const textWidth = doc.widthOfString(titleText);
                    const xPosition = (pageWidth - textWidth) / 2;
                    doc.fontSize(12).font('Helvetica-Bold').text(titleText, xPosition, doc.y, { underline: true });
                    doc.moveDown();

                    
                    // Créer un tableau pour les logiciels
                    const logicielsTable = {
                        headers: ['Logiciel/Outil', 'Niveau'],
                        rows: agent.logiciels.map(logiciel => [
                            logiciel.logiciel_nom || 'N/A',
                            logiciel.niveau_libele || 'N/A'
                        ])
                    };
                    
                    // Dessiner le tableau
                    this.drawTable(doc, logicielsTable, 50, doc.y);
                    doc.moveDown();
                }

                // Pied de page
                doc.moveDown(2);
                doc.fontSize(10).font('Helvetica').text(`Date d'établissement: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
                doc.text('Signature et cachet: _________________________', { align: 'center' });

                // Finaliser le document
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Fonction utilitaire pour convertir une image vers un format supporté par PDFKit
    async convertImageToPDFSupported(inputPath, outputPath) {
        try {
            console.log(`🔄 Conversion de l'image: ${inputPath} vers ${outputPath}`);
            
            await sharp(inputPath)
                .jpeg({ quality: 90 }) // Convertir en JPEG avec une bonne qualité
                .toFile(outputPath);
            
            console.log(`✅ Image convertie avec succès: ${outputPath}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur lors de la conversion de l'image: ${error.message}`);
            return false;
        }
    }

    // Fonction pour dessiner un tableau dans le PDF
    drawTable(doc, table, startX, startY) {
        const { headers, rows } = table;
        const cellPadding = 5;
        const baseRowHeight = 20;
        const pageWidth = doc.page.width;
        const tableWidth = pageWidth - 100; // Marge de 50 de chaque côté
        
        // Définir des largeurs de colonnes personnalisées pour une meilleure répartition
        let colWidths;
        if (headers.length === 6) { // Tableaux FONCTIONS ANTÉRIEURES et EMPLOIS ANTÉRIEURS
            // Largeurs optimisées pour ces tableaux spécifiques
            const totalWidth = tableWidth;
            colWidths = [
                totalWidth * 0.12, // Du (12%)
                totalWidth * 0.12, // Au (12%)
                totalWidth * 0.25, // Désignation (25% - plus large)
                totalWidth * 0.12, // Structure (12%)
                totalWidth * 0.12, // Position (12%)
                totalWidth * 0.27  // Acte de nomination (27% - plus large)
            ];
        } else {
            // Pour les autres tableaux, utiliser une répartition égale
            colWidths = new Array(headers.length).fill(tableWidth / headers.length);
        }
        
        let currentY = startY;
        
        // Dessiner l'en-tête du tableau
        doc.rect(startX, currentY, tableWidth, baseRowHeight).stroke();
        doc.fontSize(11).font('Helvetica-Bold');
        
        let currentCellX = startX;
        headers.forEach((header, index) => {
            const cellWidth = colWidths[index];
            doc.rect(currentCellX, currentY, cellWidth, baseRowHeight).stroke();
            doc.text(header, currentCellX + cellPadding, currentY + cellPadding, {
                width: cellWidth - (cellPadding * 2),
                height: baseRowHeight - (cellPadding * 2),
                align: 'left'
            });
            currentCellX += cellWidth;
        });
        
        currentY += baseRowHeight;
        
        // Dessiner les lignes de données
        doc.fontSize(10).font('Helvetica');
        rows.forEach((row, rowIndex) => {
            // Calculer la hauteur nécessaire pour cette ligne
            let maxCellHeight = baseRowHeight;
            
            // Calculer la hauteur nécessaire pour chaque cellule
            row.forEach((cell, colIndex) => {
                if (cell && cell !== 'N/A') {
                    // Calculer la hauteur nécessaire pour ce contenu
                    const cellText = cell.toString();
                    const lines = cellText.split('\n');
                    const lineHeight = 12; // Hauteur approximative d'une ligne
                    const cellHeight = Math.max(baseRowHeight, (lines.length * lineHeight) + (cellPadding * 2));
                    maxCellHeight = Math.max(maxCellHeight, cellHeight);
                }
            });
            
            // Vérifier si on a besoin d'une nouvelle page
            if (currentY + maxCellHeight > doc.page.height - 50) {
                doc.addPage();
                currentY = 50;
            }
            
            // Dessiner la ligne avec la hauteur calculée
            doc.rect(startX, currentY, tableWidth, maxCellHeight).stroke();
            
            let currentCellX = startX;
            row.forEach((cell, colIndex) => {
                const cellWidth = colWidths[colIndex];
                doc.rect(currentCellX, currentY, cellWidth, maxCellHeight).stroke();
                
                // Ajuster la hauteur du texte pour s'adapter à la cellule
                doc.text(cell || 'N/A', currentCellX + cellPadding, currentY + cellPadding, {
                    width: cellWidth - (cellPadding * 2),
                    height: maxCellHeight - (cellPadding * 2),
                    align: 'left',
                    lineGap: 2 // Espacement entre les lignes
                });
                currentCellX += cellWidth;
            });
            
            currentY += maxCellHeight;
        });
        
        // Mettre à jour la position Y du document
        doc.y = currentY + 10;
    }

    // Fonction pour générer le HTML de la fiche signalétique
    generateFicheSignaletiqueHTML(agent) {
            const formatDate = (date) => {
                if (!date) return 'N/A';
                return new Date(date).toLocaleDateString('fr-FR');
            };

            return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fiche Signalétique - ${agent.nom} ${agent.prenom}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #f8f9fa;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
        }
        .header h2 {
            margin: 5px 0;
            font-size: 14px;
        }
        .section {
            margin-bottom: 20px;
            border: 1px solid #000;
        }
        .section-header {
            background-color: #e9ecef;
            padding: 8px;
            font-weight: bold;
            border-bottom: 1px solid #000;
        }
        .section-content {
            padding: 10px;
        }
        .row {
            display: flex;
            margin-bottom: 5px;
        }
        .col-6 {
            width: 50%;
            padding-right: 10px;
        }
        .photo {
            width: 120px;
            height: 150px;
            border: 2px solid #000;
            margin: 10px;
            float: right;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #000;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <!-- En-tête -->
    <div class="header">
        <h1>RÉPUBLIQUE DE CÔTE D'IVOIRE</h1>
        <h2>Union-Discipline-Travail</h2>
        <hr style="border: 1px dashed #000; width: 200px; margin: 10px auto;">
        <h1>MINISTÈRE DU TOURISME ET DES LOISIRS</h1>
        <h2>DIRECTION DES RESSOURCES HUMAINES</h2>
        <hr style="border: 1px dashed #000; width: 200px; margin: 10px auto;">
        <h1>FICHE SIGNALÉTIQUE</h1>
        <h2>AGENTS FONCTIONNAIRES</h2>
    </div>

    <!-- Photo et État Civil -->
    <div class="section">
        <div class="section-header">ÉTAT CIVIL</div>
        <div class="section-content">
            <div style="display: flex;">
                <div style="flex: 1;">
                    <div class="row">
                        <div class="col-6"><strong>Nom :</strong> ${agent.nom || 'N/A'}</div>
                        <div class="col-6"><strong>Prénoms :</strong> ${agent.prenom || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-6"><strong>Date de naissance :</strong> ${formatDate(agent.date_de_naissance)}</div>
                        <div class="col-6"><strong>Lieu de naissance :</strong> ${agent.lieu_de_naissance || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-6"><strong>Nationalité :</strong> ${agent.nationalite_libele || 'N/A'}</div>
                        <div class="col-6"><strong>Sexe :</strong> ${agent.sexe === 'M' ? 'Masculin' : agent.sexe === 'F' ? 'Féminin' : 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-6"><strong>Nom du père :</strong> ${agent.nom_du_pere || 'N/A'}</div>
                        <div class="col-6"><strong>Nom de la mère :</strong> ${agent.nom_de_la_mere || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-6"><strong>Situation matrimoniale :</strong> ${agent.situation_matrimoniale_libele || 'N/A'}</div>
                        <div class="col-6"><strong>Handicap :</strong> ${agent.handicap_nom || 'Aucun'}</div>
                    </div>
                    <div class="row">
                        <div class="col-6"><strong>Nombre d'enfants :</strong> ${agent.nombre_enfant || '0'}</div>
                        <div class="col-6"></div>
                    </div>
                </div>
                <div style="width: 120px; text-align: center;">
                    <div class="photo">
                        ${agent.photos && agent.photos.length > 0 ? 
                            `<img src="http://localhost:5000${agent.photos[0].photo_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Photo de profil">` :
                            '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f8f9fa;">Photo</div>'
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Renseignements Administratifs -->
    <div class="section">
        <div class="section-header">RENSEIGNEMENTS ADMINISTRATIFS</div>
        <div class="section-content">
            <div class="row">
                <div class="col-6"><strong>Matricule :</strong> ${agent.matricule || 'N/A'}</div>
                <div class="col-6"><strong>Grade :</strong> ${agent.grade_libele || 'N/A'}</div>
            </div>
            <div class="row">
                <div class="col-6"><strong>Emploi :</strong> ${agent.emploi_libele || 'N/A'}</div>
                <div class="col-6"><strong>Date de nomination :</strong> ${formatDate(agent.date_embauche)}</div>
            </div>
            <div class="row">
                <div class="col-6"><strong>Ministère d'affectation :</strong> ${agent.ministere_nom || 'N/A'}</div>
                <div class="col-6"><strong>Service :</strong> ${agent.service_libelle || 'N/A'}</div>
            </div>
            <div class="row">
                <div class="col-6"><strong>Date de départ à la retraite :</strong> ${formatDate(agent.date_retraite)}</div>
                <div class="col-6"><strong>Situation militaire :</strong> ${agent.situation_militaire || 'N/A'}</div>
            </div>
        </div>
    </div>

    <!-- Expérience Professionnelle -->
    <div class="section">
        <div class="section-header">EXPÉRIENCE PROFESSIONNELLE</div>
        <div class="section-content">
            <div class="row">
                <div class="col-6"><strong>Fonction actuelle :</strong> ${agent.fonction_actuelle || 'N/A'}</div>
                <div class="col-6"><strong>Fonction précédente :</strong> ${agent.fonction_anterieure || 'N/A'}</div>
            </div>
            <div class="row">
                <div class="col-6"><strong>Stages :</strong> N/A</div>
                <div class="col-6"><strong>Études :</strong> N/A</div>
            </div>
            <div class="row">
                <div class="col-6"><strong>Formations professionnelles :</strong> N/A</div>
                <div class="col-6"></div>
            </div>
            
            ${agent.diplomes && agent.diplomes.length > 0 ? `
            <h4><strong>Titres et diplômes :</strong></h4>
            <table>
                <thead>
                    <tr>
                        <th>Diplôme</th>
                        <th>Type</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${agent.diplomes.map(diplome => `
                        <tr>
                            <td>${diplome.nom || 'N/A'}</td>
                            <td>${diplome.type_diplome_nom || 'N/A'}</td>
                            <td>${formatDate(diplome.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : ''}
        </div>
    </div>

    <!-- Langues Étrangères -->
    <div class="section">
        <div class="section-header">CONNAISSANCE ET MAÎTRISE DES LANGUES ÉTRANGÈRES</div>
        <div class="section-content">
            ${agent.langues && agent.langues.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Langue</th>
                        <th>Niveau</th>
                    </tr>
                </thead>
                <tbody>
                    ${agent.langues.map(langue => `
                        <tr>
                            <td>${langue.nom || 'N/A'}</td>
                            <td>${langue.niveau || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p>Aucune langue étrangère renseignée</p>'}
        </div>
    </div>

    <!-- Outils Informatiques -->
    <div class="section">
        <div class="section-header">CONNAISSANCE ET MAÎTRISE DE L'OUTIL INFORMATIQUE</div>
        <div class="section-content">
            ${agent.logiciels && agent.logiciels.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Logiciel/Outil</th>
                        <th>Niveau</th>
                    </tr>
                </thead>
                <tbody>
                    ${agent.logiciels.map(logiciel => `
                        <tr>
                            <td>${logiciel.nom || 'N/A'}</td>
                            <td>${logiciel.niveau || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p>Aucun outil informatique renseigné</p>'}
        </div>
    </div>

    <!-- Pied de page -->
    <div class="footer">
        <p><strong>Date d'établissement :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Signature et cachet :</strong> _________________________</p>
    </div>
</body>
</html>
        `;
    }

    // Générer la fiche signalétique en PDF
    async generateFicheSignaletiquePDF(req, res) {
        try {
            const { id } = req.params;

            // Récupérer les détails complets de l'agent (même requête que getById)
            const agentQuery = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    m.logo_url as ministere_logo,
                    e.nom as entite_nom,
                    fa_actuelle.fonction_libele as fonction_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    cat.libele as categorie_libele,
                    p.libele as position_libele,
                    s.libelle as direction_libelle,
                    me.libele as mode_entree_libele,
                    h.libele as handicap_nom,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    ech_actuelle.echelon_libele as echelon_libele
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                -- Fonction actuelle depuis fonction_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                -- Grade actuel depuis grades_agents (ou grade préfectoral)
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                -- Échelon actuel depuis echelons_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN echelons ech ON a.id_echelon = ech.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN mode_d_entrees me ON a.id_mode_entree = me.id
                LEFT JOIN handicaps h ON a.id_handicap = h.id
                WHERE a.id = $1
            `;

            const agentResult = await pool.query(agentQuery, [id]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agent = agentResult.rows[0];

            // Récupérer les photos de l'agent
            const photosQuery = `SELECT * FROM agent_photos WHERE id_agent = $1 ORDER BY is_profile_photo DESC, uploaded_at ASC`;
            const photosResult = await pool.query(photosQuery, [id]);
            agent.photos = photosResult.rows;
            
            console.log(`🔍 Photos récupérées pour l'agent ${id}:`, agent.photos.length);
            if (agent.photos.length > 0) {
                console.log(`📸 Première photo:`, agent.photos[0]);
            }

            // Récupérer les diplômes de l'agent
            const diplomesQuery = `
                SELECT 
                    ad.document_name as nom,
                    ad.document_type as type_diplome_nom,
                    ad.uploaded_at as created_at,
                    ad.description
                FROM agent_documents ad
                WHERE ad.id_agent = $1 AND ad.document_type = 'diplome'
                ORDER BY ad.uploaded_at DESC
            `;
            const diplomesResult = await pool.query(diplomesQuery, [id]);
            agent.diplomes = diplomesResult.rows;


            // Récupérer les fonctions antérieures depuis la nouvelle table fonction_agents
            const fonctionsAnterieuresQuery = `
                SELECT 
                    fa.*,
                    f.libele as libele_poste,
                    n.nature,
                    n.numero,
                    n.date_signature
                FROM fonction_agents fa
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                LEFT JOIN nominations n ON fa.id_nomination = n.id
                WHERE fa.id_agent = $1 
                ORDER BY fa.date_entree DESC
            `;
            const fonctionsAnterieuresResult = await pool.query(fonctionsAnterieuresQuery, [id]);
            agent.fonctions_anterieures = fonctionsAnterieuresResult.rows;

            // Récupérer les emplois antérieurs depuis la nouvelle table emploi_agents
            const emploisAnterieursQuery = `
                SELECT 
                    ea.*,
                    e.libele as emploi,
                    n.nature,
                    n.numero,
                    n.date_signature
                FROM emploi_agents ea
                LEFT JOIN emplois e ON ea.id_emploi = e.id
                LEFT JOIN nominations n ON ea.id_nomination = n.id
                WHERE ea.id_agent = $1 
                ORDER BY ea.date_entree DESC
            `;
            const emploisAnterieursResult = await pool.query(emploisAnterieursQuery, [id]);
            agent.emplois_anterieurs = emploisAnterieursResult.rows;

            // Récupérer l'emploi actuel depuis emploi_agents (le plus récent)
            const emploiActuelQuery = `
                SELECT 
                    ea.*,
                    e.libele as emploi_libele,
                    n.nature,
                    n.numero,
                    n.date_signature
                FROM emploi_agents ea
                LEFT JOIN emplois e ON ea.id_emploi = e.id
                LEFT JOIN nominations n ON ea.id_nomination = n.id
                WHERE ea.id_agent = $1 
                ORDER BY ea.date_entree DESC
                LIMIT 1
            `;
            const emploiActuelResult = await pool.query(emploiActuelQuery, [id]);
            agent.emploi_actuel = emploiActuelResult.rows[0] || null;

            // Récupérer la fonction actuelle depuis fonction_agents (la plus récente)
            const fonctionActuelleQuery = `
                SELECT 
                    fa.*,
                    f.libele as fonction_libele,
                    n.nature,
                    n.numero,
                    n.date_signature
                FROM fonction_agents fa
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                LEFT JOIN nominations n ON fa.id_nomination = n.id
                WHERE fa.id_agent = $1 
                ORDER BY fa.date_entree DESC
                LIMIT 1
            `;
            const fonctionActuelleResult = await pool.query(fonctionActuelleQuery, [id]);
            agent.fonction_actuelle = fonctionActuelleResult.rows[0] || null;

            // Récupérer les stages
            const stagesQuery = `
                SELECT * FROM stage 
                WHERE id_agent = $1 
                ORDER BY date_stage DESC
            `;
            const stagesResult = await pool.query(stagesQuery, [id]);
            agent.stages = stagesResult.rows;

            // Récupérer les études et diplômes
            const etudesDiplomesQuery = `
                SELECT * FROM etude_diplome 
                WHERE id_agent = $1 
                ORDER BY date_diplome DESC
            `;
            const etudesDiplomesResult = await pool.query(etudesDiplomesQuery, [id]);
            agent.etudes_diplomes = etudesDiplomesResult.rows;

            // Récupérer les langues de l'agent
            const languesQuery = `
                SELECT 
                    al.*,
                    l.libele as langue_nom,
                    nl.libele as niveau_libele
                FROM agent_langues al
                LEFT JOIN langues l ON al.id_langue = l.id
                LEFT JOIN niveau_langues nl ON al.id_niveau_langue = nl.id
                WHERE al.id_agent = $1
                ORDER BY al.created_at DESC
            `;
            const languesResult = await pool.query(languesQuery, [id]);
            agent.langues = languesResult.rows;

            // Récupérer les logiciels de l'agent
            const logicielsQuery = `
                SELECT 
                    al.*,
                    l.libele as logiciel_nom,
                    ni.libele as niveau_libele
                FROM agent_logiciels al
                LEFT JOIN logiciels l ON al.id_logiciel = l.id
                LEFT JOIN niveau_informatiques ni ON al.id_niveau_informatique = ni.id
                WHERE al.id_agent = $1
                ORDER BY al.created_at DESC
            `;
            const logicielsResult = await pool.query(logicielsQuery, [id]);
            agent.logiciels = logicielsResult.rows;

            // Générer le PDF avec PDFKit
            console.log('🚀 Début de la génération PDF pour l\'agent:', id);
            console.log('📦 Génération du PDF avec PDFKit...');
            
            const pdfBuffer = await this.generateFicheSignaletiquePDFKit(agent);
            console.log('✅ PDF généré avec PDFKit, taille:', pdfBuffer.length, 'bytes');
            
            // Retourner le PDF
            console.log('📤 Envoi du PDF au client...');
            console.log('📊 Taille du buffer à envoyer:', pdfBuffer.length, 'bytes');
            
            // S'assurer que les headers sont corrects
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Content-Disposition', `attachment; filename="fiche-signaletique-${agent.nom}-${agent.prenom}.pdf"`);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            
            // Envoyer le buffer directement
            res.end(pdfBuffer);
            console.log('✅ PDF envoyé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la fiche signalétique:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la génération de la fiche signalétique',
                error: error.message
            });
        }
    }

    /**
     * Lister les documents d'un agent (table agent_documents).
     * Utilisé par le dashboard agent pour afficher tous les documents enregistrés.
     */
    async listDocuments(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (!id || isNaN(id)) {
                return res.status(400).json({ success: false, error: 'ID agent invalide' });
            }
            const result = await pool.query(
                `SELECT id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at
                 FROM agent_documents
                 WHERE id_agent = $1
                 ORDER BY uploaded_at DESC`,
                [id]
            );
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('❌ listDocuments:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Enregistrer un ou plusieurs documents pour un agent (table agent_documents).
     * Les agents peuvent enregistrer autant de documents qu'ils veulent (limite 50 par requête).
     */
    async uploadDocuments(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (!id || isNaN(id)) {
                return res.status(400).json({ success: false, error: 'ID agent invalide' });
            }
            const files = req.files && req.files.length ? req.files : [];
            if (files.length === 0) {
                return res.status(400).json({ success: false, error: 'Aucun fichier envoyé' });
            }
            let documentType = (req.body && req.body.document_type) ? String(req.body.document_type).trim() : 'autre';
            if (documentType.length > 100) documentType = documentType.substring(0, 100);
            const description = (req.body && req.body.description) ? String(req.body.description).trim() : null;
            const inserted = [];
            for (const file of files) {
                const documentUrl = `/uploads/documents/${file.filename}`;
                const result = await pool.query(
                    `INSERT INTO agent_documents (id_agent, document_type, document_name, document_url, document_size, document_mime_type, description)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING id, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at`,
                    [id, documentType, file.originalname, documentUrl, file.size, file.mimetype || null, description]
                );
                inserted.push(result.rows[0]);
            }
            return res.json({ success: true, data: inserted, count: inserted.length });
        } catch (error) {
            console.error('❌ uploadDocuments:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Servir le fichier d'un document agent (table agent_documents) par ID.
     * GET /api/agents/:id/documents/:docId/file
     * Évite de passer le chemin dans l'URL (problèmes avec proxies/encodage) et vérifie que l'agent est propriétaire.
     */
    async serveAgentDocumentFile(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const docId = parseInt(req.params.docId, 10);
            if (!id || isNaN(id) || !docId || isNaN(docId)) {
                return res.status(400).json({ success: false, error: 'Paramètres invalides' });
            }
            const docResult = await pool.query(
                'SELECT id, document_url, document_name, document_mime_type FROM agent_documents WHERE id = $1 AND id_agent = $2',
                [docId, id]
            );
            if (docResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Document non trouvé ou non autorisé' });
            }
            const doc = docResult.rows[0];
            const documentUrl = (doc.document_url || '').replace(/^\/+/, '');
            if (!documentUrl) {
                return res.status(404).json({ success: false, error: 'Document sans fichier associé' });
            }
            const uploadsRoot = path.join(__dirname, '..', 'uploads');
            const withoutUploadsPrefix = documentUrl.replace(/^uploads[\\/]/, '');
            const absolutePath = path.join(uploadsRoot, withoutUploadsPrefix);
            if (!absolutePath.startsWith(uploadsRoot)) {
                return res.status(400).json({ success: false, error: 'Chemin de fichier invalide.' });
            }
            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Le fichier est introuvable sur le serveur.'
                });
            }
            const ext = path.extname(absolutePath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
                '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
                '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
            
            // Prioriser le type MIME de la base de données, puis l'extension, sinon par défaut
            let mimeType = doc.document_mime_type;
            if (!mimeType || mimeType === 'application/octet-stream') {
                mimeType = mimeTypes[ext] || 'application/octet-stream';
            }
            
            // S'assurer que le type MIME est valide - si toujours octet-stream, essayer depuis le nom de fichier
            if (!mimeType || mimeType === 'application/octet-stream') {
                const fileName = doc.document_name || path.basename(absolutePath);
                const fileNameExt = path.extname(fileName).toLowerCase();
                mimeType = mimeTypes[fileNameExt] || 'application/octet-stream';
            }
            
            // Détection finale : si c'est un PDF (commence par %PDF), forcer le type
            if (mimeType === 'application/octet-stream' && ext === '.pdf') {
                mimeType = 'application/pdf';
            }
            
            console.log('🔍 Envoi du fichier:', {
                docId,
                agentId: id,
                documentName: doc.document_name,
                documentUrl: doc.document_url,
                absolutePath,
                mimeType,
                extension: ext,
                fileExists: fs.existsSync(absolutePath),
                fileSize: fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0
            });
            
            // Lire le fichier en binaire
            const fileBuffer = fs.readFileSync(absolutePath);
            const fileStats = fs.statSync(absolutePath);
            
            // Définir les headers CORS pour permettre l'accès au fichier depuis le frontend
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', fileStats.size);
            // Utiliser 'attachment' pour forcer le téléchargement au lieu de l'ouverture
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.document_name || path.basename(absolutePath))}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('Accept-Ranges', 'bytes');
            
            console.log('📤 Envoi du fichier:', {
                size: fileStats.size,
                mimeType,
                fileName: doc.document_name,
                contentType: mimeType
            });
            
            // Envoyer le fichier en binaire
            res.send(fileBuffer);
        } catch (error) {
            console.error('❌ serveAgentDocumentFile:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Supprimer un document d'un agent (table agent_documents).
     */
    async deleteDocument(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const docId = parseInt(req.params.docId, 10);
            if (!id || isNaN(id) || !docId || isNaN(docId)) {
                return res.status(400).json({ success: false, error: 'Paramètres invalides' });
            }
            const result = await pool.query(
                'DELETE FROM agent_documents WHERE id = $1 AND id_agent = $2 RETURNING id',
                [docId, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Document non trouvé ou non autorisé' });
            }
            return res.json({ success: true, message: 'Document supprimé' });
        } catch (error) {
            console.error('❌ deleteDocument:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // Récupérer un agent par ID avec les noms des relations
    async getById(req, res) {
        try {
            const { id } = req.params;
            
            // Requête complète pour récupérer l'agent avec toutes les informations
            // Formater les dates directement dans la requête SQL pour éviter les décalages de fuseau horaire
            const query = `
                SELECT 
                    a.id, a.id_civilite, a.id_situation_matrimoniale, a.id_nationalite, a.id_type_d_agent,
                    a.id_ministere, a.id_entite_principale, a.nom, a.prenom, a.matricule,
                    TO_CHAR(a.date_de_naissance::date, 'YYYY-MM-DD') AS date_de_naissance,
                    a.lieu_de_naissance, a.age, a.telephone1, a.telephone2, a.sexe,
                    a.nom_de_la_mere, a.nom_du_pere, a.email,
                    TO_CHAR(a.date_mariage::date, 'YYYY-MM-DD') AS date_mariage,
                    a.nom_conjointe, a.nombre_enfant, a.ad_pro_rue, a.ad_pro_ville, a.ad_pro_batiment,
                    a.ad_pri_rue, a.ad_pri_ville, a.ad_pri_batiment, a.statut_emploi,
                    TO_CHAR(a.date_embauche::date, 'YYYY-MM-DD') AS date_embauche,
                    TO_CHAR(a.date_fin_contrat::date, 'YYYY-MM-DD') AS date_fin_contrat,
                    a.created_at, a.updated_at, a.id_fonction, a.id_pays, a.id_categorie,
                    a.id_grade, a.id_emploi, a.id_echelon, a.id_specialite, a.id_langue,
                    a.id_niveau_langue, a.id_motif_depart, a.id_type_conge, a.id_autre_absence,
                    a.id_distinction, a.id_type_etablissement, a.id_unite_administrative,
                    a.id_diplome, a.id_type_materiel, a.id_type_destination, a.id_nature_accident,
                    a.id_sanction, a.id_sindicat, a.id_type_courrier, a.id_nature_acte,
                    a.id_localite, a.id_mode_entree, a.id_position, a.id_pathologie,
                    a.id_handicap, a.id_niveau_informatique, a.id_logiciel, a.id_type_retraite,
                    COALESCE(a.id_direction_generale, d.id_direction_generale) AS id_direction_generale,
                    a.id_direction,
                    TO_CHAR(a.date_retraite::date, 'YYYY-MM-DD') AS date_retraite,
                    a.fonction_actuelle, a.fonction_anterieure, a.situation_militaire,
                    a.numero_cnps,
                    TO_CHAR(a.date_declaration_cnps::date, 'YYYY-MM-DD') AS date_declaration_cnps,
                    a.handicap_personnalise,
                    TO_CHAR(a.date_prise_service_au_ministere::date, 'YYYY-MM-DD') AS date_prise_service_au_ministere,
                    TO_CHAR(a.date_prise_service_dans_la_direction::date, 'YYYY-MM-DD') AS date_prise_service_dans_la_direction,
                    a.numero_acte_mariage, a.id_sous_direction, a.id_service,
                    a.prenom_conjointe, a.retire,
                    TO_CHAR(a.date_retrait::date, 'YYYY-MM-DD') AS date_retrait,
                    a.motif_retrait, a.motif_restauration, a.lieu_mariage, a.lieu_reception,
                    a.telephone3, a.corps_prefectoral, a.grade_prefectoral, a.echelon_prefectoral,
                    TO_CHAR(a.date_delivrance_acte_mariage::date, 'YYYY-MM-DD') AS date_delivrance_acte_mariage,
                    ta.libele AS type_agent_libele,
                    n.libele AS nationalite_libele,
                    m.nom AS ministere_nom,
                    e.nom AS entite_nom,
                    COALESCE(dg.libelle, dg_via_dir.libelle) AS direction_generale_libelle,
                    d.libelle AS direction_libelle,
                    sd.libelle AS sous_direction_libelle,
                    s.libelle AS service_libelle,
                    p.libele AS position_libele,
                    cat.libele AS categorie_libele,
                    fa_actuelle.fonction_libele AS fonction_libele,
                    fa_actuelle.date_entree AS fonction_date_entree,
                    fa_actuelle.id_fonction AS fonction_id,
                    ea_actuelle.emploi_libele AS emploi_libele,
                    ea_actuelle.date_entree AS emploi_date_entree,
                    ea_actuelle.id_emploi AS emploi_id,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) AS grade_libele,
                    ga_actuelle.grade_date_entree AS grade_date_entree,
                    ech_actuelle.echelon_libele AS echelon_libele,
                    ech_actuelle.echelon_date_entree AS echelon_date_entree
                FROM agents a
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN direction_generale dg_via_dir ON d.id_direction_generale = dg_via_dir.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent)
                        fa.id_agent,
                        fa.id_fonction,
                        f.libele AS fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, COALESCE(fa.date_entree, fa.created_at) DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        ea.id_emploi,
                        emp.libele AS emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois emp ON ea.id_emploi = emp.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ea_actuelle ON a.id = ea_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele,
                        ga.date_entree AS grade_date_entree
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libele,
                        ea.date_entree AS echelon_date_entree
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE a.id = $1
            `;
            
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Agent non trouvé' 
                });
            }

            const agent = result.rows[0];
            agent.langues = [];
            agent.logiciels = [];

            // Calculer les informations de retraite estimées
            let computedRetirementDate = null;
            if (agent.date_retraite) {
                const parsed = new Date(agent.date_retraite);
                if (!Number.isNaN(parsed.getTime())) {
                    computedRetirementDate = parsed;
                }
            }
            if (!computedRetirementDate) {
                computedRetirementDate = this.calculateRetirementDate(agent.date_de_naissance, agent.grade_libele);
            }

            if (computedRetirementDate && !Number.isNaN(computedRetirementDate.getTime())) {
                const retirementYear = computedRetirementDate.getUTCFullYear();
                let retirementAge = null;
                if (agent.date_de_naissance) {
                    const birthDate = new Date(agent.date_de_naissance);
                    if (!Number.isNaN(birthDate.getTime())) {
                        retirementAge = retirementYear - birthDate.getUTCFullYear();
                    }
                }

                // Formater la date de retraite calculée au format YYYY-MM-DD
                const retYear = computedRetirementDate.getUTCFullYear();
                const retMonth = String(computedRetirementDate.getUTCMonth() + 1).padStart(2, '0');
                const retDay = String(computedRetirementDate.getUTCDate()).padStart(2, '0');
                agent.date_retraite_calculee = `${retYear}-${retMonth}-${retDay}`;
                agent.annee_depart_retraite = retirementYear;
                agent.age_retraite_calcule = retirementAge;
            } else {
                agent.date_retraite_calculee = null;
                agent.annee_depart_retraite = null;
                agent.age_retraite_calcule = null;
            }

            // Mise à jour automatique de la position lors de l'arrivée de la retraite
            // Objectif: forcer la position sur "En retraite" quand la date (réelle ou calculée) est atteinte.
            // On utilise ensuite cette variable pour décider si on doit (ou non) recalculer à partir des dernières demandes approuvées.
            let retirementReached = false;
            try {
                const normalizePositionLabel = (label) => String(label || '')
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                // Utiliser la date locale (et non UTC via toISOString)
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const retirementDateStr = agent.date_retraite || agent.date_retraite_calculee;

                if (retirementDateStr && String(retirementDateStr).slice(0, 10) <= todayStr) {
                    retirementReached = true;
                    const currentPosNorm = normalizePositionLabel(agent.position_libele);
                    const targetPosNorm = normalizePositionLabel('En retraite');

                    if (currentPosNorm !== targetPosNorm) {
                        const positionsRes = await pool.query('SELECT id, libele FROM positions');
                        const positionId = (positionsRes.rows || []).find(
                            (p) => normalizePositionLabel(p.libele) === targetPosNorm
                        )?.id;

                        if (positionId) {
                            await pool.query(
                                'UPDATE agents SET id_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                                [positionId, id]
                            );
                            agent.id_position = positionId;
                            agent.position_libele = 'En retraite';
                            console.log(`✅ Position auto mise à jour (retraite atteinte): agent=${id}, id_position=${positionId}`);
                        } else {
                            console.warn('⚠️ Position "En retraite" introuvable dans la table positions.');
                        }
                    }
                }
            } catch (autoRetirementPosError) {
                // Ne jamais bloquer l'affichage de l'agent en cas d'erreur sur la mise à jour automatique.
                console.error('❌ Erreur lors de la mise à jour automatique de la position retraite:', autoRetirementPosError);
            }

            // Recalcul de la position selon la dernière demande approuvée (hors retraite)
            if (!retirementReached) {
                try {
                    const normalizePositionLabel = (label) => String(label || '')
                        .toLowerCase()
                        .trim()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');

                    const latestDemandeQuery = `
                        SELECT
                            d.type_demande,
                            d.motif_conge,
                            d.agree_motif,
                            d.description,
                            d.date_debut,
                            d.date_fin,
                            d.agree_date_cessation,
                            d.date_reprise_service,
                            COALESCE(
                                d.date_validation_drh,
                                d.date_validation_ministre,
                                d.date_validation_chef_cabinet,
                                d.date_validation_chef_service,
                                d.date_validation_dir_cabinet,
                                d.date_validation_directeur_general,
                                d.date_validation_directeur_service_exterieur,
                                d.date_validation_directeur,
                                d.date_validation_sous_directeur,
                                d.date_debut,
                                d.date_creation
                            ) AS decision_date
                        FROM demandes d
                        WHERE d.id_agent = $1
                          AND d.status = 'approuve'
                          AND d.type_demande IN ('absence', 'sortie_territoire', 'certificat_cessation', 'certificat_reprise_service')
                        ORDER BY decision_date DESC NULLS LAST
                        LIMIT 10
                    `;

                    const latestResult = await pool.query(latestDemandeQuery, [id]);
                    const demands = latestResult.rows || [];

                    // Utiliser la date locale (et non UTC via toISOString)
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const toDateOnlyStr = (v) => {
                        if (!v) return null;
                        if (typeof v === 'string') {
                            const s = v.trim();
                            return s.length >= 10 ? s.slice(0, 10) : null;
                        }
                        const d = v instanceof Date ? v : new Date(v);
                        if (Number.isNaN(d.getTime())) return null;
                        // Conversion locale pour éviter les décalages UTC.
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    };

                    const isDemandEffectiveToday = (d) => {
                        const typeDemande = d?.type_demande;
                        if (!typeDemande) return false;

                        if (typeDemande === 'absence') {
                            const debutStr = toDateOnlyStr(d.date_debut);
                            const finStr = toDateOnlyStr(d.date_fin);
                            if (!debutStr && !finStr) return false;
                            if (debutStr && todayStr < debutStr) return false;
                            // Règle métier: l'absence reste active après date_fin
                            // jusqu'à reprise de service effective.
                            return true;
                        }
                        if (typeDemande === 'sortie_territoire') {
                            const debutStr = toDateOnlyStr(d.date_debut);
                            if (!debutStr) return false;
                            return todayStr >= debutStr;
                        }

                        if (typeDemande === 'certificat_cessation') {
                            const cessationStr = toDateOnlyStr(d.agree_date_cessation);
                            if (!cessationStr) return false;
                            return todayStr >= cessationStr;
                        }

                        if (typeDemande === 'certificat_reprise_service') {
                            const repriseStr = toDateOnlyStr(d.date_reprise_service);
                            if (!repriseStr) return false;
                            return todayStr >= repriseStr;
                        }

                        return false;
                    };

                    // Prendre la demande effective la plus récente (la requête est déjà triée par decision_date DESC).
                    // Ceci évite qu'une vieille cessation "annuelle" écrase une absence plus récente.
                    const effectiveDemande = demands.find((d) => isDemandEffectiveToday(d)) || null;

                    let labels = null;
                    let effectiveTypeDemande = null;
                    let absenceMotifLabel = null;

                    if (effectiveDemande && effectiveDemande.type_demande === 'certificat_cessation') {
                        effectiveTypeDemande = 'certificat_cessation';
                        const motifCongeRaw = effectiveDemande.motif_conge || effectiveDemande.agree_motif || '';
                        const motifConge = normalizePositionLabel(motifCongeRaw);

                        labels = ['En conge', 'En congé'];
                        if (motifConge.includes('matern')) {
                            labels = ['CONGE DE MATERNITE', 'En conge', 'En congé'];
                        } else if (motifConge.includes('patern')) {
                            labels = ['CONGE DE PATERNITE', 'En conge', 'En congé'];
                        } else if (motifConge.includes('annuel') || motifConge.includes('annuelle')) {
                            labels = ['CONGE ANNUEL', 'En conge', 'En congé'];
                        }
                    } else if (effectiveDemande && effectiveDemande.type_demande === 'certificat_reprise_service') {
                        effectiveTypeDemande = 'certificat_reprise_service';
                        labels = ['En activite', 'En activité'];
                    } else if (effectiveDemande && (effectiveDemande.type_demande === 'absence' || effectiveDemande.type_demande === 'sortie_territoire')) {
                        effectiveTypeDemande = effectiveDemande.type_demande;
                        // `id_position` doit rester une clé valide dans la table `positions`.
                        // Donc on force la position générique "En congé".
                        // Le motif saisi doit être affiché côté API via `position_libele`.
                        const motifCongeRaw = effectiveDemande.motif_conge || effectiveDemande.agree_motif || effectiveDemande.description || '';
                        absenceMotifLabel = motifCongeRaw && motifCongeRaw.trim() ? motifCongeRaw.trim() : null;
                        // Pour déclencher l'insertion, on ne met que le motif dans `labels`.
                        // Le fallback générique est géré ailleurs si nécessaire.
                        labels = absenceMotifLabel ? [absenceMotifLabel] : ['En conge', 'En congé'];
                    } else {
                        // Rien d'effectif aujourd'hui => on ne force pas un retour en activité.
                        // La position restera telle qu'elle est stockée (mise à jour via les certificats).
                        labels = null;
                        effectiveTypeDemande = null;
                    }

                    if (labels && labels.length > 0) {
                        const positionsRes = await pool.query('SELECT id, libele FROM positions');
                        const normalizedMap = new Map();
                        (positionsRes.rows || []).forEach((p) => {
                            normalizedMap.set(normalizePositionLabel(p.libele), p.id);
                        });

                        const targetPositionId = (() => {
                            for (const label of labels) {
                                const idPos = normalizedMap.get(normalizePositionLabel(label));
                                if (idPos) return idPos;
                            }
                            return null;
                        })();

                        // Pour une absence/sortie du territoire, on ne dépend pas du motif pour résoudre `id_position` :
                        // on s'attend à trouver la position générique "En congé".
                        let resolvedTargetPositionId = targetPositionId;

                        // Pour une absence/sortie, si le motif n'existe pas encore dans `positions`,
                        // on le crée et on récupère son id.
                        if (!resolvedTargetPositionId && (effectiveTypeDemande === 'absence' || effectiveTypeDemande === 'sortie_territoire') && absenceMotifLabel) {
                            try {
                                const existingPos = await pool.query(
                                    'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1',
                                    [absenceMotifLabel]
                                );
                                if (existingPos.rows && existingPos.rows.length > 0) {
                                    resolvedTargetPositionId = existingPos.rows[0].id;
                                } else {
                                    const insertPos = await pool.query(
                                        'INSERT INTO positions (libele) VALUES ($1) RETURNING id',
                                        [absenceMotifLabel]
                                    );
                                    resolvedTargetPositionId = insertPos.rows && insertPos.rows[0] ? insertPos.rows[0].id : null;
                                }
                            } catch (e) {
                                // Ne jamais bloquer l'affichage si insertion impossible.
                                console.error('❌ Erreur insertion position (absence/sortie motif):', e?.message || e);
                                // En cas de collision concurrente, récupérer l'ID inséré par une autre requête.
                                try {
                                    const retryPos = await pool.query(
                                        'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1',
                                        [absenceMotifLabel]
                                    );
                                    resolvedTargetPositionId = retryPos.rows && retryPos.rows.length > 0
                                        ? retryPos.rows[0].id
                                        : (normalizedMap.get(normalizePositionLabel('En congé')) ??
                                            normalizedMap.get(normalizePositionLabel('En conge')) ??
                                            null);
                                } catch (_retryErr) {
                                    resolvedTargetPositionId =
                                        normalizedMap.get(normalizePositionLabel('En congé')) ??
                                        normalizedMap.get(normalizePositionLabel('En conge')) ??
                                        null;
                                }
                            }
                        }

                        if (resolvedTargetPositionId && resolvedTargetPositionId !== agent.id_position) {
                            await pool.query(
                                'UPDATE agents SET id_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                                [resolvedTargetPositionId, id]
                            );
                            agent.id_position = resolvedTargetPositionId;
                            // On met à jour aussi le libellé côté API pour éviter un décalage visuel immédiat.
                            const posRow = (positionsRes.rows || []).find((p) => p.id === resolvedTargetPositionId);
                            agent.position_libele = posRow ? posRow.libele : agent.position_libele;
                            console.log(`✅ Position recalculée sur la base d'une demande effective: agent=${id}, type_demande=${effectiveTypeDemande || 'aucune'}, id_position=${resolvedTargetPositionId}`);
                        }

                        // Si absence/sortie: on force l'affichage sur le motif saisi
                        // (même si le libellé de `positions` ne correspond pas).
                        if ((effectiveTypeDemande === 'absence' || effectiveTypeDemande === 'sortie_territoire') && absenceMotifLabel) {
                            agent.position_libele = absenceMotifLabel;
                        }
                    }
                } catch (autoDemandesPosError) {
                    console.error('❌ Erreur lors du recalcul de la position via dernières demandes approuvées:', autoDemandesPosError);
                }
            }
            
            // Mapper les noms de colonnes de la DB vers les noms de champs du frontend
            if (agent.id_sous_direction !== undefined) {
                agent.sous_direction_id = agent.id_sous_direction;
            }
            if (agent.id_service !== undefined) {
                agent.service_id = agent.id_service;
            }
            if (agent.id_direction !== undefined) {
                agent.direction_id = agent.id_direction;
            }

            try {
                const enfantsQuery = await pool.query(
                    `
                    SELECT id, nom, prenom, sexe, 
                           TO_CHAR(date_de_naissance::date, 'YYYY-MM-DD') AS date_de_naissance,
                           COALESCE(scolarise, false) as scolarise, 
                           COALESCE(ayant_droit, false) as ayant_droit
                    FROM enfants
                    WHERE id_agent = $1
                    ORDER BY date_de_naissance ASC, id ASC
                    `,
                    [id]
                );
                agent.enfants = enfantsQuery.rows || [];
                console.log(`🔍 getById - Enfants récupérés pour agent ${id}:`, agent.enfants.length, agent.enfants);
            } catch (childError) {
                console.error('❌ Erreur lors de la récupération des enfants:', childError);
                console.error('❌ Détails de l\'erreur:', {
                    message: childError.message,
                    stack: childError.stack,
                    code: childError.code
                });
                agent.enfants = [];
            }
            
            // Récupérer les langues de l'agent (agent_langues + libellés via requêtes séparées pour robustesse)
            try {
                const linkRows = await pool.query(
                    `SELECT id, id_agent, id_langue, id_niveau_langue FROM agent_langues WHERE id_agent = $1 ORDER BY created_at DESC`,
                    [id]
                );
                const rows = Array.isArray(linkRows.rows) ? linkRows.rows : [];
                if (rows.length > 0) {
                    const idsLangues = [...new Set(rows.map(r => r.id_langue).filter(Boolean))];
                    const idsNiveaux = [...new Set(rows.map(r => r.id_niveau_langue).filter(Boolean))];
                    const libelesLangues = {};
                    const libelesNiveaux = {};
                    if (idsLangues.length > 0) {
                        const rL = await pool.query('SELECT id, libele FROM langues WHERE id = ANY($1::int[])', [idsLangues]);
                        (rL.rows || []).forEach(r => { libelesLangues[r.id] = r.libele || ''; });
                    }
                    if (idsNiveaux.length > 0) {
                        const rN = await pool.query('SELECT id, libele FROM niveau_langues WHERE id = ANY($1::int[])', [idsNiveaux]);
                        (rN.rows || []).forEach(r => { libelesNiveaux[r.id] = r.libele || ''; });
                    }
                    agent.langues = rows.map(al => ({
                        id: al.id,
                        id_agent: al.id_agent,
                        id_langue: al.id_langue,
                        id_niveau_langue: al.id_niveau_langue,
                        langue_nom: libelesLangues[al.id_langue] ?? '',
                        niveau_libele: libelesNiveaux[al.id_niveau_langue] ?? ''
                    }));
                } else if (agent.id_langue != null) {
                    const legLangue = await pool.query(`
                        SELECT a.id_langue, a.id_niveau_langue,
                            (SELECT libele FROM langues WHERE id = a.id_langue LIMIT 1) as langue_nom,
                            (SELECT libele FROM niveau_langues WHERE id = a.id_niveau_langue LIMIT 1) as niveau_libele
                        FROM agents a WHERE a.id = $1 AND a.id_langue IS NOT NULL
                    `, [id]);
                    if (legLangue.rows && legLangue.rows.length > 0) {
                        agent.langues = legLangue.rows.map(r => ({
                            id_langue: r.id_langue,
                            id_niveau_langue: r.id_niveau_langue,
                            langue_nom: r.langue_nom || '',
                            niveau_libele: r.niveau_libele || ''
                        }));
                    }
                }
                console.log('✅ getById - Langues récupérées pour agent', id, ':', agent.langues.length);
            } catch (err) {
                console.error('Erreur lors de la récupération des langues:', err);
                agent.langues = [];
            }
            
            // Récupérer les logiciels de l'agent (agent_logiciels + libellés via requêtes séparées)
            try {
                const linkRows = await pool.query(
                    `SELECT id, id_agent, id_logiciel, id_niveau_informatique FROM agent_logiciels WHERE id_agent = $1 ORDER BY created_at DESC`,
                    [id]
                );
                const rows = Array.isArray(linkRows.rows) ? linkRows.rows : [];
                if (rows.length > 0) {
                    const idsLogiciels = [...new Set(rows.map(r => r.id_logiciel).filter(Boolean))];
                    const idsNiveaux = [...new Set(rows.map(r => r.id_niveau_informatique).filter(Boolean))];
                    const libelesLogiciels = {};
                    const libelesNiveaux = {};
                    if (idsLogiciels.length > 0) {
                        const rL = await pool.query('SELECT id, libele FROM logiciels WHERE id = ANY($1::int[])', [idsLogiciels]);
                        (rL.rows || []).forEach(r => { libelesLogiciels[r.id] = r.libele || ''; });
                    }
                    if (idsNiveaux.length > 0) {
                        const rN = await pool.query('SELECT id, libele FROM niveau_informatiques WHERE id = ANY($1::int[])', [idsNiveaux]);
                        (rN.rows || []).forEach(r => { libelesNiveaux[r.id] = r.libele || ''; });
                    }
                    agent.logiciels = rows.map(al => ({
                        id: al.id,
                        id_agent: al.id_agent,
                        id_logiciel: al.id_logiciel,
                        id_niveau_informatique: al.id_niveau_informatique,
                        logiciel_nom: libelesLogiciels[al.id_logiciel] ?? '',
                        niveau_libele: libelesNiveaux[al.id_niveau_informatique] ?? ''
                    }));
                } else if (agent.id_logiciel != null) {
                    const legLogiciel = await pool.query(`
                        SELECT a.id_logiciel, a.id_niveau_informatique,
                            (SELECT libele FROM logiciels WHERE id = a.id_logiciel LIMIT 1) as logiciel_nom,
                            (SELECT libele FROM niveau_informatiques WHERE id = a.id_niveau_informatique LIMIT 1) as niveau_libele
                        FROM agents a WHERE a.id = $1 AND a.id_logiciel IS NOT NULL
                    `, [id]);
                    if (legLogiciel.rows && legLogiciel.rows.length > 0) {
                        agent.logiciels = legLogiciel.rows.map(r => ({
                            id_logiciel: r.id_logiciel,
                            id_niveau_informatique: r.id_niveau_informatique,
                            logiciel_nom: r.logiciel_nom || '',
                            niveau_libele: r.niveau_libele || ''
                        }));
                    }
                }
                console.log('✅ getById - Logiciels récupérés pour agent', id, ':', agent.logiciels.length);
            } catch (err) {
                console.error('Erreur lors de la récupération des logiciels:', err);
                agent.logiciels = [];
            }

            try {
                const photosQuery = `
                    SELECT *
                    FROM agent_photos
                    WHERE id_agent = $1
                    ORDER BY is_profile_photo DESC, uploaded_at DESC
                `;
                const photosResult = await pool.query(photosQuery, [id]);
                agent.photos = photosResult.rows;
            } catch (err) {
                console.error('Erreur lors de la récupération des photos:', err);
                agent.photos = [];
            }

            // Récupérer les diplômes de l'agent
            try {
                const diplomesQuery = `
                    SELECT ed.id, ed.id_agent, ed.diplome, ed.ecole, ed.ville, ed.pays, ed.options,
                           ed.id_agent_document, ed.created_at, ed.updated_at,
                           ed.date_diplome,
                           ad.document_url, ad.document_name, ad.document_size, ad.document_mime_type
                    FROM etude_diplome ed
                    LEFT JOIN agent_documents ad ON ed.id_agent_document = ad.id
                    WHERE ed.id_agent = $1
                    ORDER BY 
                        CASE 
                            WHEN ed.date_diplome IS NOT NULL THEN ed.date_diplome 
                            ELSE 1900 
                        END DESC,
                        ed.id ASC
                `;
                const diplomesResult = await pool.query(diplomesQuery, [id]);
                agent.diplomes = diplomesResult.rows || [];
                agent.etudes_diplomes = agent.diplomes;
                console.log('✅ Diplômes récupérés dans getById:', agent.diplomes.length);
            } catch (err) {
                console.error('Erreur lors de la récupération des diplômes:', err);
                agent.diplomes = [];
                agent.etudes_diplomes = [];
            }

            // Récupérer les documents de l'agent (excluant les diplômes)
            try {
                const documentsQuery = `
                    SELECT * 
                    FROM agent_documents 
                    WHERE id_agent = $1 AND document_type != 'diplome'
                    ORDER BY document_type, uploaded_at ASC
                `;
                const documentsResult = await pool.query(documentsQuery, [id]);
                agent.documents = documentsResult.rows || [];
            } catch (err) {
                console.error('Erreur lors de la récupération des documents:', err);
                agent.documents = [];
            }

            // Récupérer les fonctions antérieures depuis la table fonction_agents
            try {
                const fonctionsAnterieuresQuery = `
                    SELECT 
                        fa.*,
                        f.libele as libele_poste,
                        COALESCE(d.libelle, m.nom, 'N/A') as structure,
                        n.nature,
                        n.numero,
                        n.date_signature,
                        TO_CHAR(fa.date_entree, 'YYYY-MM-DD') AS date_entree,
                        TO_CHAR(fa.date_entree, 'YYYY-MM-DD') AS date_debut,
                        TO_CHAR(fa.date_sortie, 'YYYY-MM-DD') AS date_sortie,
                        TO_CHAR(fa.date_sortie, 'YYYY-MM-DD') AS date_fin
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN nominations n ON fa.id_nomination = n.id
                    LEFT JOIN agents a_fonction ON fa.id_agent = a_fonction.id
                    LEFT JOIN directions d ON a_fonction.id_direction = d.id
                    LEFT JOIN ministeres m ON a_fonction.id_ministere = m.id
                    WHERE fa.id_agent = $1 
                    ORDER BY COALESCE(fa.date_entree, fa.created_at) DESC
                `;
                const fonctionsAnterieuresResult = await pool.query(fonctionsAnterieuresQuery, [id]);
                agent.fonctions_anterieures = fonctionsAnterieuresResult.rows || [];
            } catch (err) {
                console.error('Erreur lors de la récupération des fonctions antérieures:', err);
                agent.fonctions_anterieures = [];
            }

            // Récupérer les emplois antérieurs depuis la table emploi_agents
            // Récupérer tous les emplois, puis exclure l'emploi actuel (le plus récent)
            try {
                const tousEmploisQuery = `
                    SELECT 
                        ea.*,
                        e.libele as emploi,
                        COALESCE(ea.designation_poste, e.libele) as designation_poste,
                        COALESCE(d.libelle, m.nom, 'N/A') as structure,
                        n.nature,
                        n.numero,
                        n.date_signature,
                        TO_CHAR(ea.date_entree, 'YYYY-MM-DD') AS date_entree,
                        TO_CHAR(ea.date_entree, 'YYYY-MM-DD') AS date_emploi,
                        TO_CHAR(ea.date_sortie, 'YYYY-MM-DD') AS date_sortie
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    LEFT JOIN nominations n ON ea.id_nomination = n.id
                    LEFT JOIN agents a_emp ON ea.id_agent = a_emp.id
                    LEFT JOIN directions d ON a_emp.id_direction = d.id
                    LEFT JOIN ministeres m ON a_emp.id_ministere = m.id
                    WHERE ea.id_agent = $1 
                    ORDER BY COALESCE(ea.date_entree, ea.created_at) DESC
                `;
                const tousEmploisResult = await pool.query(tousEmploisQuery, [id]);
                const tousEmplois = tousEmploisResult.rows || [];
                
                // Exclure l'emploi actuel (le plus récent) pour ne garder que les antérieurs
                if (tousEmplois.length > 0) {
                    // Le premier élément est l'emploi actuel, on le retire
                    agent.emplois_anterieurs = tousEmplois.slice(1);
                } else {
                    agent.emplois_anterieurs = [];
                }
                
                console.log(`✅ Emplois antérieurs récupérés pour l'agent ${id}:`, agent.emplois_anterieurs.length, 'sur', tousEmplois.length, 'emplois totaux');
            } catch (err) {
                console.error('Erreur lors de la récupération des emplois antérieurs:', err);
                agent.emplois_anterieurs = [];
            }

            // Récupérer les stages depuis la table stage
            try {
                const stagesQuery = `
                    SELECT 
                        s.*,
                        TO_CHAR(s.date_stage, 'YYYY-MM-DD') AS date_stage,
                        TO_CHAR(s.date_stage, 'YYYY-MM-DD') AS date_debut
                    FROM stage s
                    WHERE s.id_agent = $1 
                    ORDER BY COALESCE(s.date_stage, s.created_at) DESC
                `;
                const stagesResult = await pool.query(stagesQuery, [id]);
                agent.stages = stagesResult.rows || [];
            } catch (err) {
                console.error('Erreur lors de la récupération des stages:', err);
                agent.stages = [];
            }

            // Les dates sont déjà formatées avec TO_CHAR dans la requête SQL
            // Plus besoin de formater ici, sauf pour date_retraite_calculee qui est calculée
            // (déjà formatée ci-dessus)


            res.json({
                success: true,
                data: agent
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'agent:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Nouvelle fonction pour récupérer les agents avec informations hiérarchiques complètes
    async getHierarchicalReport(req, res) {
        try {
            const { id_ministere, include_entites = 'true' } = req.query;
            
            // Récupérer le ministère de l'utilisateur connecté si pas fourni dans la requête
            let userMinistereId = null;
            if (!id_ministere && req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 Utilisateur connecté - Ministère ID: ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            } else if (req.user && req.user.role === 'super_admin') {
                // Pour le super admin, ne pas appliquer de filtrage par défaut
                console.log(`🔍 Super Admin connecté - Pas de filtrage par ministère appliqué`);
            }
            
            // Utiliser l'ID du ministère fourni en paramètre ou celui de l'utilisateur
            const finalMinistereId = id_ministere || userMinistereId;
            
            console.log('🔍 Récupération du rapport hiérarchique pour le ministère:', finalMinistereId);
            console.log('🔍 Include entités:', include_entites);
            console.log('🔍 Paramètre id_ministere original:', id_ministere);
            console.log('🔍 userMinistereId récupéré:', userMinistereId);
            console.log('🔍 finalMinistereId utilisé:', finalMinistereId);

            const excludeYearsRaw = parseInt(req.query.exclude_retirement_within_years, 10);
            const excludeRetirementWithinYears =
                Number.isFinite(excludeYearsRaw) && excludeYearsRaw >= 1 && excludeYearsRaw <= 60
                    ? excludeYearsRaw
                    : 0;

            const effRetHier = this.getEffectiveRetirementDateSQL('a', 'ga_curr.libele');
            const hierRetirementParamIndex = finalMinistereId ? 2 : 1;
            const hierarchyExcludeRetirementClause =
                excludeRetirementWithinYears > 0
                    ? ` AND NOT (
                ${effRetHier} IS NOT NULL
                AND ${effRetHier}::date > CURRENT_DATE
                AND ${effRetHier}::date <= (CURRENT_DATE + ($${hierRetirementParamIndex}::int * INTERVAL '1 year'))::date
            )`
                    : '';
            
            // Étape 1: Identifier les services, directions et sous-directions qui ont au moins un agent
            // Inclure aussi les agents sans entité hiérarchique (grade depuis grades_agents)
            const hierarchyQuery = `
                SELECT DISTINCT
                    a.id_direction,
                    a.id_sous_direction,
                    a.id_service,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    s.libelle as service_libelle,
                    CASE 
                        WHEN a.id_direction IS NULL AND a.id_sous_direction IS NULL AND a.id_service IS NULL 
                        THEN 'Agents sans service spécifique'
                        ELSE 'Avec service'
                    END as service_type
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent) ga.id_agent, g.libele as libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_curr ON a.id = ga_curr.id_agent
                WHERE LOWER(TRIM(COALESCE(a.statut_emploi, ''))) NOT IN ('licencie', 'demission', 'retraite')
                AND (a.retire IS NULL OR a.retire = false)
                ${finalMinistereId ? 'AND a.id_ministere = $1' : ''}
                AND ${this.getRetirementExclusionCondition('a', 'ga_curr')}
                ${hierarchyExcludeRetirementClause}
            `;
            
            const hierarchyParams = [];
            if (finalMinistereId) hierarchyParams.push(finalMinistereId);
            if (excludeRetirementWithinYears > 0) hierarchyParams.push(excludeRetirementWithinYears);
            const hierarchyResult = await pool.query(hierarchyQuery, hierarchyParams);
            
            // Extraire les IDs des entités qui ont des agents
            const activeDirectionIds = [...new Set(hierarchyResult.rows.map(row => row.id_direction).filter(id => id !== null))];
            const activeSousDirectionIds = [...new Set(hierarchyResult.rows.map(row => row.id_sous_direction).filter(id => id !== null))];
            const activeServiceIds = [...new Set(hierarchyResult.rows.map(row => row.id_service).filter(id => id !== null))];
            
            console.log('🔍 Entités hiérarchiques avec agents:');
            console.log('   - Directions actives:', activeDirectionIds.length);
            console.log('   - Sous-directions actives:', activeSousDirectionIds.length);
            console.log('   - Services actifs:', activeServiceIds.length);
            
            // Étape 2: Requête principale pour récupérer les agents avec filtrage dynamique
            let mainQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.nom || ' ' || a.prenom as nom_complet,
                    a.sexe,
                    CASE 
                        WHEN a.date_de_naissance IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_de_naissance, 'YYYY-MM-DD')
                    END AS date_de_naissance,
                    a.lieu_de_naissance,
                    a.telephone1,
                    a.telephone2,
                    a.email,
                    a.statut_emploi,
                    CASE 
                        WHEN a.date_embauche IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_embauche, 'YYYY-MM-DD')
                    END AS date_embauche,
                    CASE 
                        WHEN a.date_prise_service_au_ministere IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_prise_service_au_ministere, 'YYYY-MM-DD')
                    END AS date_prise_service_au_ministere,
                    CASE 
                        WHEN a.date_prise_service_dans_la_direction IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_prise_service_dans_la_direction, 'YYYY-MM-DD')
                    END AS date_prise_service_dans_la_direction,
                    CASE 
                        WHEN a.date_fin_contrat IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_fin_contrat, 'YYYY-MM-DD')
                    END AS date_fin_contrat,
                    CASE 
                        WHEN a.date_retraite IS NULL THEN NULL
                        ELSE TO_CHAR(a.date_retraite, 'YYYY-MM-DD')
                    END AS date_retraite,
                    a.situation_militaire,
                    a.id_direction,
                    a.id_sous_direction,
                    a.id_service,
                    a.id_ministere,
                    a.id_direction_generale,
                    ga_actuelle.id_grade,
                    ca_actuelle.id_categorie,
                    fa_actuelle.id_fonction,
                    ea_actuelle.id_emploi,
                    
                    -- Informations des relations
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    e.nom as entite_nom,
                    fa_actuelle.fonction_libele as fonction_actuelle_libele,
                    fa_actuelle.numero_nomination as numero_nomination,
                    fa_actuelle.type_acte as type_acte,
                    fa_actuelle.date_signature_nomination as date_signature_nomination,
                    fa_actuelle.date_entree as fonction_date_entree,
                    ea_actuelle.emploi_libele as emploi_libele,
                    ea_actuelle.type_acte_emploi as type_acte_emploi,
                    ea_actuelle.date_nomination_emploi as date_nomination_emploi,
                    ea_actuelle.date_entree as emploi_date_entree,
                    ca_actuelle.categorie_libele as categorie_libele,
                    p.libele as position_libelle,
                    -- Adresse combinée (priorité à l'adresse professionnelle, sinon privée)
                    CASE 
                        WHEN a.ad_pro_rue IS NOT NULL AND a.ad_pro_rue != '' THEN 
                            TRIM(
                                COALESCE(a.ad_pro_rue, '') || 
                                CASE WHEN a.ad_pro_ville IS NOT NULL AND a.ad_pro_ville != '' THEN ' ' || a.ad_pro_ville ELSE '' END ||
                                CASE WHEN a.ad_pro_batiment IS NOT NULL AND a.ad_pro_batiment != '' THEN ' ' || a.ad_pro_batiment ELSE '' END
                            )
                        WHEN a.ad_pri_rue IS NOT NULL AND a.ad_pri_rue != '' THEN 
                            TRIM(
                                COALESCE(a.ad_pri_rue, '') || 
                                CASE WHEN a.ad_pri_ville IS NOT NULL AND a.ad_pri_ville != '' THEN ' ' || a.ad_pri_ville ELSE '' END ||
                                CASE WHEN a.ad_pri_batiment IS NOT NULL AND a.ad_pri_batiment != '' THEN ' ' || a.ad_pri_batiment ELSE '' END
                            )
                        ELSE NULL
                    END as adresse,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    s.libelle as service_libelle,
                    dg.libelle as direction_generale_libelle,
                    me.libele as mode_entree_libele,
                    h.libele as handicap_nom,
                    COALESCE(ga_actuelle.grade_libele, g_pref.libele, a.grade_prefectoral) as grade_libele,
                    COALESCE(ech_actuelle.echelon_libele, ech.libele) as echelon_libele
                    
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                LEFT JOIN positions p ON a.id_position = p.id
                LEFT JOIN grades g_pref ON a.grade_prefectoral IS NOT NULL AND a.grade_prefectoral ~ '^[0-9]+$' AND g_pref.id = (a.grade_prefectoral::INTEGER)
                LEFT JOIN echelons ech ON a.id_echelon = ech.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
                LEFT JOIN mode_d_entrees me ON a.id_mode_entree = me.id
                LEFT JOIN handicaps h ON a.id_handicap = h.id
                -- Fonction actuelle depuis fonction_agents avec informations de nomination
                LEFT JOIN (
                   SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        fa.id_fonction,
                        f.libele as fonction_libele,
                        CASE 
                            WHEN fa.date_entree IS NULL THEN NULL
                            ELSE TO_CHAR(fa.date_entree, 'YYYY-MM-DD')
                        END AS date_entree,
                        n.numero as numero_nomination,
                        n.nature as type_acte,
                        CASE 
                            WHEN n.date_signature IS NULL THEN NULL
                            ELSE TO_CHAR(n.date_signature, 'YYYY-MM-DD')
                        END AS date_signature_nomination
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN nominations n ON fa.id_nomination = n.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                -- Emploi actuel depuis emploi_agents avec informations de nomination
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        ea.id_emploi,
                        e.libele as emploi_libele,
                        CASE 
                            WHEN ea.date_entree IS NULL THEN NULL
                            ELSE TO_CHAR(ea.date_entree, 'YYYY-MM-DD')
                        END AS date_entree,
                        n.nature as type_acte_emploi,
                        CASE 
                            WHEN n.date_signature IS NULL THEN NULL
                            ELSE TO_CHAR(n.date_signature, 'YYYY-MM-DD')
                        END AS date_nomination_emploi
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    LEFT JOIN nominations n ON ea.id_nomination = n.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuelle ON a.id = ea_actuelle.id_agent
                -- Grade actuel depuis grades_agents (pas depuis agents)
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        ga.id_grade,
                        g.libele as grade_libele,
                        g.libele as libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                -- Catégorie actuelle depuis categories_agents (pas depuis agents)
                LEFT JOIN (
                    SELECT DISTINCT ON (ca.id_agent)
                        ca.id_agent,
                        ca.id_categorie,
                        c.libele as categorie_libele
                    FROM categories_agents ca
                    LEFT JOIN categories c ON ca.id_categorie = c.id
                    ORDER BY ca.id_agent, COALESCE(ca.date_entree, ca.created_at) DESC
                ) ca_actuelle ON a.id = ca_actuelle.id_agent
                -- Échelon actuel depuis echelons_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE LOWER(TRIM(COALESCE(a.statut_emploi, ''))) NOT IN ('licencie', 'demission', 'retraite')
                AND (a.retire IS NULL OR a.retire = false)
                ${finalMinistereId ? 'AND a.id_ministere = $1' : ''}
                AND ${this.getRetirementExclusionCondition('a', 'ga_actuelle')}
            `;
            
            // Construire les conditions de filtrage dynamique
            const conditions = [];
            const queryParams = [];
            let paramIndex = finalMinistereId ? 2 : 1;

            if (excludeRetirementWithinYears > 0) {
                const effMain = this.getEffectiveRetirementDateSQL('a', 'ga_actuelle.grade_libele');
                conditions.push(`NOT (
                    ${effMain} IS NOT NULL
                    AND ${effMain}::date > CURRENT_DATE
                    AND ${effMain}::date <= (CURRENT_DATE + ($${paramIndex}::int * INTERVAL '1 year'))::date
                )`);
                queryParams.push(excludeRetirementWithinYears);
                paramIndex++;
            }
            
            // Appliquer le filtre include_entites comme dans getAll
            if (include_entites === 'false') {
                conditions.push(`a.id_entite_principale IS NULL`);
            }
            
            // Filtre par type d'agent
            if (req.query.type_agent && req.query.type_agent !== '') {
                conditions.push(`ta.libele = $${paramIndex}`);
                queryParams.push(req.query.type_agent);
                paramIndex++;
            }
            
            // Filtre par sexe
            if (req.query.sexe && req.query.sexe !== '') {
                conditions.push(`a.sexe = $${paramIndex}`);
                queryParams.push(req.query.sexe);
                paramIndex++;
            }
            
            // Filtre par statut emploi
            if (req.query.statut_emploi && req.query.statut_emploi !== '') {
                conditions.push(`a.statut_emploi = $${paramIndex}`);
                queryParams.push(req.query.statut_emploi);
                paramIndex++;
            }
            
            // Filtre par catégorie (depuis categories_agents)
            if (req.query.id_categorie && req.query.id_categorie !== '') {
                conditions.push(`ca_actuelle.id_categorie = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_categorie));
                paramIndex++;
            }
            
            // Filtre par grade (depuis grades_agents)
            if (req.query.id_grade && req.query.id_grade !== '') {
                conditions.push(`ga_actuelle.id_grade = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_grade));
                paramIndex++;
            }
            
            // Filtre par direction générale : uniquement agents directement liés (sans direction/sous-direction)
            if (req.query.id_direction_generale && req.query.id_direction_generale !== '') {
                conditions.push(`a.id_direction_generale = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_direction_generale));
                paramIndex++;
                conditions.push('a.id_direction IS NULL');
                conditions.push('a.id_sous_direction IS NULL');
            }
            
            // Filtre par direction
            if (req.query.id_direction && req.query.id_direction !== '') {
                conditions.push(`a.id_direction = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_direction));
                paramIndex++;
            }
            
            // Filtre par sous-direction
            if (req.query.id_sous_direction && req.query.id_sous_direction !== '') {
                conditions.push(`a.id_sous_direction = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_sous_direction));
                paramIndex++;
            }
            
            // Filtre par service
            if (req.query.id_service && req.query.id_service !== '') {
                conditions.push(`a.id_service = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_service));
                paramIndex++;
            }
            
            // Filtre par emploi (depuis emploi_agents)
            if (req.query.id_emploi && req.query.id_emploi !== '') {
                conditions.push(`ea_actuelle.id_emploi = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_emploi));
                paramIndex++;
            }
            
            // Filtre par fonction (depuis fonction_agents)
            if (req.query.id_fonction && req.query.id_fonction !== '') {
                conditions.push(`fa_actuelle.id_fonction = $${paramIndex}`);
                queryParams.push(parseInt(req.query.id_fonction));
                paramIndex++;
            }
            
            // Filtre par année de prise de service (agents inscrits sur une année donnée)
            if (req.query.annee_prise_service && req.query.annee_prise_service !== '') {
                conditions.push(`EXTRACT(YEAR FROM a.date_prise_service_au_ministere) = $${paramIndex}`);
                queryParams.push(parseInt(req.query.annee_prise_service));
                paramIndex++;
            }
            
            // Filtre par période (date début / date fin) - prise de service au ministère
            if (req.query.date_debut && req.query.date_debut !== '') {
                conditions.push(`a.date_prise_service_au_ministere::date >= $${paramIndex}`);
                queryParams.push(req.query.date_debut);
                paramIndex++;
            }
            if (req.query.date_fin && req.query.date_fin !== '') {
                conditions.push(`a.date_prise_service_au_ministere::date <= $${paramIndex}`);
                queryParams.push(req.query.date_fin);
                paramIndex++;
            }
            
            // Inclure TOUS les agents du ministère (avec et sans entité hiérarchique)
            // Ne pas filtrer par entité hiérarchique pour s'assurer que tous les agents sont inclus
            
            if (conditions.length > 0) {
                mainQuery += ` AND (${conditions.join(' AND ')})`;
            }
            
            mainQuery += `
                ORDER BY 
                    COALESCE(d.libelle, 'ZZZ') ASC,
                    COALESCE(sd.libelle, 'ZZZ') ASC,
                    COALESCE(s.libelle, 'ZZZ') ASC,
                    a.nom ASC,
                    a.prenom ASC
            `;
            
            const finalParams = finalMinistereId ? [finalMinistereId, ...queryParams] : queryParams;
            const result = await pool.query(mainQuery, finalParams);

            // Uniquement pour le Ministère du Tourisme et des Loisirs : ordre spécifique (CABINET puis INSPECTION GENERALE)
            const ministereNom = (result.rows[0] && result.rows[0].ministere_nom) ? String(result.rows[0].ministere_nom).toUpperCase() : '';
            const isMinistereTourismeLoisirs = ministereNom.includes('TOURISME') && ministereNom.includes('LOISIRS');
            
            console.log('🔍 Agents récupérés pour le rapport hiérarchique (avec filtrage dynamique):', result.rows.length);
            console.log('🔍 Échantillon des agents:', result.rows.slice(0, 3).map(agent => ({
                nom: agent.nom_complet,
                direction: agent.direction_libelle,
                sous_direction: agent.sous_direction_libelle,
                service: agent.service_libelle,
                statut: agent.statut_emploi
            })));
            
            // Ajouter les informations sur les entités actives pour le frontend (listes à plat pour les filtres)
            const activeHierarchy = {
                directions: hierarchyResult.rows
                    .filter(row => row.id_direction !== null)
                    .map(row => ({
                        id: row.id_direction,
                        libelle: row.direction_libelle
                    }))
                    .reduce((acc, curr) => {
                        if (!acc.find(item => item.id === curr.id)) {
                            acc.push(curr);
                        }
                        return acc;
                    }, []),
                sousDirections: hierarchyResult.rows
                    .filter(row => row.id_sous_direction !== null)
                    .map(row => ({
                        id: row.id_sous_direction,
                        libelle: row.sous_direction_libelle
                    }))
                    .reduce((acc, curr) => {
                        if (!acc.find(item => item.id === curr.id)) {
                            acc.push(curr);
                        }
                        return acc;
                    }, []),
                services: hierarchyResult.rows
                    .filter(row => row.id_service !== null)
                    .map(row => ({
                        id: row.id_service,
                        libelle: row.service_libelle
                    }))
                    .reduce((acc, curr) => {
                        if (!acc.find(item => item.id === curr.id)) {
                            acc.push(curr);
                        }
                        return acc;
                    }, [])
            };

            // Construire une structure hiérarchique complète DG → Direction → Sous-direction → Service → Agents
            const hierarchyTreeMap = {};

            // Inclure toutes les DG du ministère (y compris sans agents) pour que l'ordre d'affichage soit respecté (ex. INSPECTION GENERALE après CABINET)
            if (finalMinistereId) {
                const dgListResult = await pool.query(
                    'SELECT id, libelle FROM direction_generale WHERE id_ministere = $1 AND (is_active IS NULL OR is_active = true) ORDER BY libelle',
                    [finalMinistereId]
                );
                for (const dg of dgListResult.rows) {
                    const dgKey = dg.id;
                    if (!hierarchyTreeMap[dgKey]) {
                        const dgLibelle = dg.libelle || '';
                        hierarchyTreeMap[dgKey] = {
                            id_direction_generale: dg.id,
                            direction_generale_libelle: dgLibelle,
                            directions: {
                                sans_direction: {
                                    id_direction: null,
                                    direction_libelle: dgLibelle,
                                    sous_directions: {},
                                    services_sans_sous_direction: {},
                                    agents_sans_sous_ni_service: []
                                }
                            }
                        };
                    }
                }
            }

            for (const agent of result.rows) {
                // Préparer un résumé léger de l'agent pour éviter de dupliquer tout l'objet
                const agentSummary = {
                    id: agent.id,
                    matricule: agent.matricule,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    nom_complet: agent.nom_complet,
                    sexe: agent.sexe,
                    fonction: agent.fonction_actuelle_libele,
                    grade: agent.grade_libele,
                    categorie: agent.categorie_libele,
                    direction_id: agent.id_direction,
                    direction_libelle: agent.direction_libelle,
                    sous_direction_id: agent.id_sous_direction,
                    sous_direction_libelle: agent.sous_direction_libelle,
                    service_id: agent.id_service,
                    service_libelle: agent.service_libelle,
                    direction_generale_id: agent.id_direction_generale,
                    direction_generale_libelle: agent.direction_generale_libelle
                };

                const dgKey = agent.id_direction_generale || 'sans_dg';
                if (!hierarchyTreeMap[dgKey]) {
                    hierarchyTreeMap[dgKey] = {
                        id_direction_generale: agent.id_direction_generale || null,
                        direction_generale_libelle: agent.direction_generale_libelle || (agent.id_direction_generale ? 'Direction générale' : 'Sans direction générale'),
                        directions: {}
                    };
                }
                const dgNode = hierarchyTreeMap[dgKey];

                const dirKey = agent.id_direction || 'sans_direction';
                if (!dgNode.directions[dirKey]) {
                    // Agents directement rattachés à la DG (sans direction) : utiliser le libellé de la DG pour affichage cohérent
                    const libelleDirection = agent.id_direction
                        ? (agent.direction_libelle || 'Direction')
                        : (agent.direction_generale_libelle || 'Agents rattachés à la DG');
                    dgNode.directions[dirKey] = {
                        id_direction: agent.id_direction || null,
                        direction_libelle: libelleDirection,
                        sous_directions: {},
                        services_sans_sous_direction: {},
                        agents_sans_sous_ni_service: []
                    };
                }
                const dirNode = dgNode.directions[dirKey];

                if (agent.id_sous_direction) {
                    // Agent rattaché à une sous-direction
                    const sdKey = agent.id_sous_direction;
                    if (!dirNode.sous_directions[sdKey]) {
                        dirNode.sous_directions[sdKey] = {
                            id_sous_direction: agent.id_sous_direction,
                            sous_direction_libelle: agent.sous_direction_libelle || 'Sous-direction',
                            services: {},
                            agents_sans_service: []
                        };
                    }
                    const sdNode = dirNode.sous_directions[sdKey];

                    if (agent.id_service) {
                        const serviceKey = agent.id_service;
                        if (!sdNode.services[serviceKey]) {
                            sdNode.services[serviceKey] = {
                                id_service: agent.id_service,
                                service_libelle: agent.service_libelle || 'Service',
                                agents: []
                            };
                        }
                        sdNode.services[serviceKey].agents.push(agentSummary);
                    } else {
                        // Agent dans une sous-direction sans service explicite
                        sdNode.agents_sans_service.push(agentSummary);
                    }
                } else if (agent.id_service) {
                    // Agent rattaché à un service directement sous la direction (sans sous-direction)
                    const serviceKey = agent.id_service;
                    if (!dirNode.services_sans_sous_direction[serviceKey]) {
                        dirNode.services_sans_sous_direction[serviceKey] = {
                            id_service: agent.id_service,
                            service_libelle: agent.service_libelle || 'Service',
                            agents: []
                        };
                    }
                    dirNode.services_sans_sous_direction[serviceKey].agents.push(agentSummary);
                } else {
                    // Agent rattaché à la direction (ou à la DG) sans sous-direction ni service
                    dirNode.agents_sans_sous_ni_service.push(agentSummary);
                }
            }

            // MTL uniquement : fusionner la DG INSPECTION GENERALE dans le Cabinet pour qu'elle s'affiche juste après les agents du Cabinet
            const normalizeLib = (s) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
            if (isMinistereTourismeLoisirs) {
                let cabinetKey = null;
                let igKey = null;
                for (const [key, dgNode] of Object.entries(hierarchyTreeMap)) {
                    const lib = normalizeLib(dgNode.direction_generale_libelle);
                    if (cabinetKey == null && lib.includes('CABINET')) cabinetKey = key;
                    // INSPECTION GENERALE : par libellé ou par id connu (51 en base MTL)
                    if (igKey == null && ((lib.includes('INSPECTION') && lib.includes('GENERALE')) || dgNode.id_direction_generale === 51)) igKey = key;
                }
                if (cabinetKey != null && igKey != null && cabinetKey !== igKey) {
                    const cabinetNode = hierarchyTreeMap[cabinetKey];
                    const igNode = hierarchyTreeMap[igKey];
                    for (const [dirKey, dirNode] of Object.entries(igNode.directions)) {
                        const clone = JSON.parse(JSON.stringify(dirNode));
                        clone._fromInspectionGenerale = true;
                        cabinetNode.directions['ig_' + dirKey] = clone;
                    }
                    delete hierarchyTreeMap[igKey];
                }
            }

            // Transformer les maps en tableaux propres pour l'API
            // et appliquer un ordre hiérarchique :
            // 1) Cabinet (direction générale dont le libellé contient 'CABINET')
            // 2) Autres directions générales
            // 3) Directions simples (sans direction générale)
            const hierarchyTree = Object.values(hierarchyTreeMap)
                .map((dgNode) => {
                    // Trier les sous-niveaux : 1) agents directs DG, 2) MTL: contenu INSPECTION GENERALE (fusionné), 3) reste alphabétique
                    const sortedDirections = Object.values(dgNode.directions)
                        .sort((a, b) => {
                            const sansDirA = a.id_direction === null && !a._fromInspectionGenerale;
                            const sansDirB = b.id_direction === null && !b._fromInspectionGenerale;
                            if (sansDirA && !sansDirB) return -1;
                            if (!sansDirA && sansDirB) return 1;
                            const igA = a._fromInspectionGenerale === true;
                            const igB = b._fromInspectionGenerale === true;
                            if (igA && !igB) return -1;
                            if (!igA && igB) return 1;
                            const labelA = (a.direction_libelle || '').toUpperCase();
                            const labelB = (b.direction_libelle || '').toUpperCase();
                            return labelA.localeCompare(labelB, 'fr');
                        })
                        .map((dirNode) => {
                            const sortedSousDirections = Object.values(dirNode.sous_directions)
                                .sort((a, b) => {
                                    const labelA = (a.sous_direction_libelle || '').toUpperCase();
                                    const labelB = (b.sous_direction_libelle || '').toUpperCase();
                                    return labelA.localeCompare(labelB, 'fr');
                                })
                                .map((sdNode) => {
                                    const sortedServices = Object.values(sdNode.services)
                                        .sort((a, b) => {
                                            const labelA = (a.service_libelle || '').toUpperCase();
                                            const labelB = (b.service_libelle || '').toUpperCase();
                                            return labelA.localeCompare(labelB, 'fr');
                                        });
                                    return {
                                        id_sous_direction: sdNode.id_sous_direction,
                                        sous_direction_libelle: sdNode.sous_direction_libelle,
                                        services: sortedServices,
                                        agents_sans_service: sdNode.agents_sans_service
                                    };
                                });

                            const sortedServicesSansSousDir = Object.values(dirNode.services_sans_sous_direction)
                                .sort((a, b) => {
                                    const labelA = (a.service_libelle || '').toUpperCase();
                                    const labelB = (b.service_libelle || '').toUpperCase();
                                    return labelA.localeCompare(labelB, 'fr');
                                });

                            return {
                                id_direction: dirNode.id_direction,
                                direction_libelle: dirNode.direction_libelle,
                                sous_directions: sortedSousDirections,
                                services_sans_sous_direction: sortedServicesSansSousDir,
                                agents_sans_sous_ni_service: dirNode.agents_sans_sous_ni_service
                            };
                        });

                    return {
                        id_direction_generale: dgNode.id_direction_generale,
                        direction_generale_libelle: dgNode.direction_generale_libelle,
                        directions: sortedDirections
                    };
                })
                .sort((a, b) => {
                    const labelA = (a.direction_generale_libelle || '').toUpperCase();
                    const labelB = (b.direction_generale_libelle || '').toUpperCase();

                    const isSansDgA = a.id_direction_generale === null;
                    const isSansDgB = b.id_direction_generale === null;
                    const isCabinetA = !isSansDgA && labelA.includes('CABINET');
                    const isCabinetB = !isSansDgB && labelB.includes('CABINET');

                    // 1. Cabinet d'abord (tous ministères)
                    if (isCabinetA && !isCabinetB) return -1;
                    if (!isCabinetA && isCabinetB) return 1;

                    // 2. Uniquement MTL : INSPECTION GENERALE DU TOURISME ET DES LOISIRS juste après le Cabinet
                    if (isMinistereTourismeLoisirs) {
                        const isInspectionGeneraleA = !isSansDgA && labelA.includes('INSPECTION') && labelA.includes('GENERALE') && (labelA.includes('TOURISME') || labelA.includes('LOISIRS'));
                        const isInspectionGeneraleB = !isSansDgB && labelB.includes('INSPECTION') && labelB.includes('GENERALE') && (labelB.includes('TOURISME') || labelB.includes('LOISIRS'));
                        if (isInspectionGeneraleA && !isInspectionGeneraleB) return -1;
                        if (!isInspectionGeneraleA && isInspectionGeneraleB) return 1;
                    }

                    // 3. Directions générales (avec id_direction_generale) avant les directions simples (sans DG)
                    if (!isSansDgA && isSansDgB) return -1;
                    if (isSansDgA && !isSansDgB) return 1;

                    // 4. À l'intérieur du même groupe, trier par libellé
                    return labelA.localeCompare(labelB, 'fr');
                });

            // Données RH évolutives : éviter 304 / cache navigateur ou proxy (listes d'agents obsolètes)
            res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            res.json({
                success: true,
                data: result.rows,
                total: result.rows.length,
                activeHierarchy: activeHierarchy,
                metadata: {
                    totalDirections: activeDirectionIds.length,
                    totalSousDirections: activeSousDirectionIds.length,
                    totalServices: activeServiceIds.length,
                    message: "Seules les entités hiérarchiques contenant au moins un agent sont affichées"
                },
                hierarchyTree
            });
            
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du rapport hiérarchique:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les anniversaires à venir
    async getUpcomingBirthdays(req, res) {
        try {
            const { days = 30, id_ministere, id_direction, id_direction_generale, id_sous_direction } = req.query;

            // Valeur effective de la direction générale (query ou, pour directeur_general / inspecteur_general, celle de l'agent)
            let effectiveIdDirectionGenerale = id_direction_generale;
            let isDirecteurGeneral = false;
            let isInspecteurGeneral = false;
            let isDirecteurCentral = false;

            // Récupérer le ministère de l'utilisateur connecté si non fourni
            let ministereId = id_ministere;
            if (!ministereId && req.user && req.user.id_agent) {
                const userAgentQuery = await pool.query(
                    'SELECT id_ministere, id_direction, id_direction_generale, id_sous_direction FROM agents WHERE id = $1', 
                    [req.user.id_agent]
                );
                if (userAgentQuery.rows.length > 0) {
                    const userAgent = userAgentQuery.rows[0];
                    ministereId = userAgent.id_ministere;
                    const rawRole = (req.user.role || '').toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');
                    const userRole = rawRole;

                    if (rawRole === 'directeur_general' || rawRole === 'directeur_generale' || (rawRole.includes('directeur') && (rawRole.includes('general') || rawRole.includes('generale')))) {
                        isDirecteurGeneral = true;
                        if (!effectiveIdDirectionGenerale) effectiveIdDirectionGenerale = userAgent.id_direction_generale;
                        if (!effectiveIdDirectionGenerale && userAgent.id_direction) {
                            const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                            if (dirRow.rows.length > 0 && dirRow.rows[0].id_direction_generale != null) effectiveIdDirectionGenerale = dirRow.rows[0].id_direction_generale;
                        }
                        if (!effectiveIdDirectionGenerale && req.user && req.user.id_direction_generale != null) {
                            effectiveIdDirectionGenerale = req.user.id_direction_generale;
                        }
                    } else if (rawRole === 'inspecteur_general') {
                        isInspecteurGeneral = true;
                        // Inspecteur général : utiliser toujours sa direction générale (comme les stats)
                        let dgId = userAgent.id_direction_generale;
                        if (dgId == null && userAgent.id_direction != null) {
                            const dirRow = await pool.query('SELECT id_direction_generale FROM directions WHERE id = $1', [userAgent.id_direction]);
                            if (dirRow.rows.length > 0 && dirRow.rows[0].id_direction_generale != null) dgId = dirRow.rows[0].id_direction_generale;
                        }
                        if (dgId == null && req.user && req.user.id_direction_generale != null) {
                            dgId = req.user.id_direction_generale;
                        }
                        if (dgId != null && !effectiveIdDirectionGenerale) {
                            effectiveIdDirectionGenerale = dgId;
                        }
                    } else if (rawRole === 'directeur_central') {
                        isDirecteurCentral = true;
                    }

                    // Si l'utilisateur est directeur, cabinet ou sous-directeur ou directeur_general, utiliser sa direction/direction générale/sous-direction
                    if (!id_direction && !id_direction_generale && (userRole === 'directeur' || userRole === 'directeur_central' || userRole === 'dir_cabinet' || userRole === 'chef_cabinet' || userRole === 'sous_directeur' || userRole === 'sous-directeur' || userRole === 'directeur_general' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation')) {
                        if ((userRole === 'dir_cabinet' || userRole === 'chef_cabinet') && userAgent.id_direction_generale) {
                            // id_direction_generale sera pris en compte plus bas via req.query (frontend doit l'envoyer)
                        } else if ((userRole === 'directeur' || userRole === 'gestionnaire_du_patrimoine' || userRole === 'president_du_fond' || userRole === 'responsble_cellule_de_passation') && userAgent.id_direction) {
                            // id_direction sera utilisé plus bas (ou envoyé par le front)
                        } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && userAgent.id_sous_direction) {
                            // id_sous_direction sera utilisé plus bas
                        }
                    }
                }
            }

            // Construire la requête SQL pour récupérer les anniversaires à venir
            let whereClause = 'WHERE a.date_de_naissance IS NOT NULL AND a.statut_emploi = \'actif\'';
            const queryParams = [];
            
            if (ministereId && req.user.role !== 'super_admin') {
                queryParams.push(ministereId);
                whereClause += ` AND a.id_ministere = $${queryParams.length}`;
            }

            // Filtrer par direction générale
            if (effectiveIdDirectionGenerale) {
                queryParams.push(effectiveIdDirectionGenerale);
                whereClause += ` AND a.id_direction_generale = $${queryParams.length}`;
                // Directeur général / Cabinet : uniquement les agents directement rattachés à la DG
                // Inspecteur général : inclure toute la direction générale (directions et sous-directions)
                if (!isInspecteurGeneral) {
                    whereClause += ` AND a.id_direction IS NULL AND a.id_sous_direction IS NULL`;
                }
            }
            
            // Filtrer par direction si fourni (et pas déjà filtré par direction générale)
            if (id_direction && !id_direction_generale) {
                queryParams.push(id_direction);
                whereClause += ` AND a.id_direction = $${queryParams.length}`;
                // Directeur central : uniquement les agents directement rattachés à la direction (sans sous-direction)
                // gestionnaire_du_patrimoine, president_du_fond, responsble_cellule_de_passation : toute la direction (comme directeur)
                if (isDirecteurCentral) {
                    whereClause += ` AND a.id_sous_direction IS NULL`;
                }
            }
            
            // Filtrer par sous-direction si fourni
            if (id_sous_direction) {
                queryParams.push(id_sous_direction);
                whereClause += ` AND a.id_sous_direction = $${queryParams.length}`;
            }

            const query = `
                WITH agent_birthdays AS (
                    SELECT 
                        a.id,
                        a.matricule,
                        a.nom,
                        a.prenom,
                        a.date_de_naissance,
                        a.sexe,
                        a.telephone1,
                        a.telephone2,
                        a.email,
                        ap.photo_url as photo,
                        c.libele as civilite,
                        d.libelle as direction,
                        s.libelle as service,
                        -- Calculer le prochain anniversaire
                        CASE 
                            WHEN DATE_PART('month', CURRENT_DATE) > DATE_PART('month', a.date_de_naissance) 
                                 OR (DATE_PART('month', CURRENT_DATE) = DATE_PART('month', a.date_de_naissance) 
                                     AND DATE_PART('day', CURRENT_DATE) > DATE_PART('day', a.date_de_naissance))
                            THEN 
                                MAKE_DATE(
                                    EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
                                    EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                    EXTRACT(DAY FROM a.date_de_naissance)::integer
                                )
                            ELSE 
                                MAKE_DATE(
                                    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
                                    EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                    EXTRACT(DAY FROM a.date_de_naissance)::integer
                                )
                        END as prochain_anniversaire,
                        -- Calculer les jours restants
                        CASE 
                            WHEN DATE_PART('month', CURRENT_DATE) > DATE_PART('month', a.date_de_naissance) 
                                 OR (DATE_PART('month', CURRENT_DATE) = DATE_PART('month', a.date_de_naissance) 
                                     AND DATE_PART('day', CURRENT_DATE) > DATE_PART('day', a.date_de_naissance))
                            THEN 
                                (MAKE_DATE(
                                    EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
                                    EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                    EXTRACT(DAY FROM a.date_de_naissance)::integer
                                ) - CURRENT_DATE)
                            ELSE 
                                (MAKE_DATE(
                                    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
                                    EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                    EXTRACT(DAY FROM a.date_de_naissance)::integer
                                ) - CURRENT_DATE)
                        END as jours_restants,
                        -- Calculer l'âge qu'aura l'agent
                        EXTRACT(YEAR FROM AGE(
                            CASE 
                                WHEN DATE_PART('month', CURRENT_DATE) > DATE_PART('month', a.date_de_naissance) 
                                     OR (DATE_PART('month', CURRENT_DATE) = DATE_PART('month', a.date_de_naissance) 
                                         AND DATE_PART('day', CURRENT_DATE) > DATE_PART('day', a.date_de_naissance))
                                THEN 
                                    MAKE_DATE(
                                        EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
                                        EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                        EXTRACT(DAY FROM a.date_de_naissance)::integer
                                    )
                                ELSE 
                                    MAKE_DATE(
                                        EXTRACT(YEAR FROM CURRENT_DATE)::integer,
                                        EXTRACT(MONTH FROM a.date_de_naissance)::integer,
                                        EXTRACT(DAY FROM a.date_de_naissance)::integer
                                    )
                            END,
                            a.date_de_naissance
                        ))::integer as age_futur
                    FROM agents a
                    LEFT JOIN civilites c ON a.id_civilite = c.id
                    LEFT JOIN directions d ON a.id_direction = d.id
                    LEFT JOIN services s ON a.id_service = s.id
                    LEFT JOIN agent_photos ap ON a.id = ap.id_agent AND ap.is_profile_photo = true
                    ${whereClause}
                )
                SELECT * FROM agent_birthdays
                WHERE jours_restants <= $${queryParams.length + 1}
                ORDER BY jours_restants ASC, nom ASC
            `;

            queryParams.push(days);
            const result = await pool.query(query, queryParams);

            res.json({
                success: true,
                data: result.rows,
                total: result.rows.length
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des anniversaires:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Envoyer un message aux agents concernés par les anniversaires
    async sendBirthdayMessage(req, res) {
        try {
            const { agent_ids, message, type } = req.body;

            if (!agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'La liste des agents est requise'
                });
            }

            if (!message || message.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Le message est requis'
                });
            }

            // Vérifier que tous les agents existent et sont actifs
            const placeholders = agent_ids.map((_, index) => `$${index + 1}`).join(',');
            const checkAgentsQuery = `
                SELECT id FROM agents 
                WHERE id IN (${placeholders}) AND statut_emploi = 'actif'
            `;
            const agentsCheck = await pool.query(checkAgentsQuery, agent_ids);

            if (agentsCheck.rows.length !== agent_ids.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Certains agents n\'existent pas ou ne sont pas actifs'
                });
            }

            // Déterminer le titre du message selon le type
            let titre = 'Message d\'anniversaire';
            if (type === 'today') {
                titre = '🎂 Félicitations pour votre anniversaire !';
            } else if (type === 'upcoming') {
                titre = '🎉 Rappel : Votre anniversaire approche !';
            }

            // Créer les notifications pour chaque agent dans notifications_demandes
            const notificationPromises = agent_ids.map(async (agentId) => {
                try {
                    // Insérer dans la table notifications_demandes pour que les notifications apparaissent dans la boîte de réception
                    const notificationQuery = `
                        INSERT INTO notifications_demandes (
                            id_demande,
                            id_agent_destinataire, 
                            type_notification, 
                            titre, 
                            message,
                            lu,
                            date_creation
                        ) VALUES (NULL, $1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
                        RETURNING id
                    `;
                    
                    const notificationType = type === 'today' ? 'anniversaire_aujourdhui' : 'anniversaire_avenir';
                    const notificationResult = await pool.query(notificationQuery, [
                        agentId,
                        notificationType,
                        titre,
                        message.trim()
                    ]);

                    return notificationResult.rows[0].id;
                } catch (error) {
                    console.error(`Erreur lors de la création de la notification pour l'agent ${agentId}:`, error);
                    throw error;
                }
            });

            await Promise.all(notificationPromises);

            console.log(`✅ ${agent_ids.length} message(s) d'anniversaire envoyé(s) avec succès`);

            res.json({
                success: true,
                message: `${agent_ids.length} message(s) envoyé(s) avec succès`,
                count: agent_ids.length
            });

        } catch (error) {
            console.error('Erreur lors de l\'envoi des messages d\'anniversaire:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'envoi des messages',
                details: error.message
            });
        }
    }

    /**
     * Calculer l'âge de retraite basé sur le grade
     * - Grades A4, A5, A6, A7 : 65 ans
     * - Autres grades (A3, B1-B3, C1-C2, D1) : 60 ans
     * Note: La comparaison est insensible à la casse et aux espaces
     */
    calculateRetirementAge(gradeLibele) {
        if (!gradeLibele) return 60; // Par défaut 60 ans si pas de grade
        
        // Normaliser le grade : supprimer les espaces et mettre en majuscules
        const gradeNormalise = String(gradeLibele).replace(/\s+/g, '').toUpperCase();
        
        // Grades spéciaux qui partent à 65 ans
        const gradesSpeciaux = ['A4', 'A5', 'A6', 'A7'];
        
        // Vérifier si le grade normalisé correspond à un grade spécial
        // Gère les cas comme "A4", "A 4", "a4", etc.
        return gradesSpeciaux.includes(gradeNormalise) ? 65 : 60;
    }

    /**
     * Calculer la date de retraite d'un agent
     * 
     * Règles de calcul :
     * - Grades A4, A5, A6, A7 : Retraite à 65 ans
     * - Autres grades (A3, B1-B3, C1-C2, D1) : Retraite à 60 ans
     * - La date de retraite est toujours fixée au 31 décembre de l'année où l'agent atteint l'âge de retraite
     * 
     * Exemple :
     * - Agent né le 15/06/1960, grade A4 (65 ans)
     * - Année de retraite : 1960 + 65 = 2025
     * - Date de retraite : 31/12/2025
     * - L'agent apparaîtra dans "Agents à la Retraite" à partir du 01/01/2026
     */
    calculateRetirementDate(dateNaissance, gradeLibele) {
        if (!dateNaissance) return null;
        
        const birthDate = new Date(dateNaissance);
        const birthYear = birthDate.getFullYear();
        
        const retirementAge = this.calculateRetirementAge(gradeLibele);
        const retirementYear = birthYear + retirementAge;
        
        // La date de retraite est toujours le 31 décembre de l'année de retraite
        // Mois 11 = Décembre (0-indexed en JavaScript)
        return new Date(retirementYear, 11, 31);
    }

    /**
     * Mettre à jour la date de retraite d'un agent spécifique
     * GET /api/agents/:id/calculate-retirement
     */
    async calculateAgentRetirement(req, res) {
        try {
            const { id } = req.params;
            
            // Récupérer l'agent avec son grade (exclure les contractuels)
            const agentQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.id_grade,
                    g.libele as grade_libele,
                    ta.libele as type_agent_libele
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.id = $1
            `;
            
            const agentResult = await pool.query(agentQuery, [id]);
            
            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }
            
            const agent = agentResult.rows[0];
            
            // Vérifier si l'agent est contractuel
            if (agent.type_agent_libele && agent.type_agent_libele.toUpperCase().includes('CONTRACTUEL')) {
                return res.status(400).json({
                    success: false,
                    message: 'Les agents contractuels n\'ont pas de date de retraite automatique'
                });
            }
            
            if (!agent.date_de_naissance) {
                return res.status(400).json({
                    success: false,
                    message: 'Date de naissance non renseignée pour cet agent'
                });
            }
            
            // Calculer la date de retraite
            const retirementDate = this.calculateRetirementDate(agent.date_de_naissance, agent.grade_libele);
            const retirementAge = this.calculateRetirementAge(agent.grade_libele);
            
            // Mettre à jour la date de retraite
            const updateQuery = `
                UPDATE agents 
                SET date_retraite = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            
            await pool.query(updateQuery, [retirementDate, id]);
            
            res.json({
                success: true,
                message: 'Date de retraite calculée et mise à jour',
                data: {
                    agent: `${agent.nom} ${agent.prenom}`,
                    matricule: agent.matricule,
                    grade: agent.grade_libele || 'Sans grade',
                    date_naissance: agent.date_de_naissance,
                    age_retraite: retirementAge,
                    date_retraite: retirementDate
                }
            });
            
        } catch (error) {
            console.error('Erreur lors du calcul de la retraite:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Prolonger la date/âge de retraite d'un agent spécifique
     * PATCH /api/agents/:id/extend-retirement
     */
    async extendRetirement(req, res) {
        try {
            const { id } = req.params;
            // Gérer les données qui peuvent venir de FormData ou JSON
            let { additional_years, target_age, numero_acte, nombre_annees, nature_acte, date_acte } = req.body || {};
            
            // Si les données viennent de FormData, les valeurs sont des strings
            if (target_age && typeof target_age === 'string') {
                target_age = parseInt(target_age, 10);
            }
            if (nombre_annees && typeof nombre_annees === 'string') {
                nombre_annees = parseInt(nombre_annees, 10);
            }
            if (additional_years && typeof additional_years === 'string') {
                additional_years = parseInt(additional_years, 10);
            }

            // Gérer le fichier uploadé
            const uploadedFile = req.file;

            // Valider que le numéro de l'acte est fourni (obligatoire)
            if (!numero_acte || (typeof numero_acte === 'string' && numero_acte.trim() === '')) {
                return res.status(400).json({
                    success: false,
                    message: 'Le numéro de l\'acte est obligatoire'
                });
            }

            // Valider que la nature de l'acte est fournie (obligatoire)
            if (!nature_acte || (typeof nature_acte === 'string' && nature_acte.trim() === '')) {
                return res.status(400).json({
                    success: false,
                    message: 'La nature de l\'acte est obligatoire'
                });
            }

            // Valider que la date de l'acte est fournie (obligatoire)
            if (!date_acte || (typeof date_acte === 'string' && date_acte.trim() === '')) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de l\'acte est obligatoire'
                });
            }

            // S'assurer que nature_acte est en majuscules
            if (nature_acte && typeof nature_acte === 'string') {
                nature_acte = nature_acte.toUpperCase().trim();
            }

            // Valider que le fichier est uploadé (obligatoire)
            if (!uploadedFile) {
                return res.status(400).json({
                    success: false,
                    message: 'Le fichier de prolongation est obligatoire'
                });
            }

            // Utiliser nombre_annees si fourni, sinon utiliser additional_years
            if (nombre_annees !== undefined && nombre_annees !== null) {
                nombre_annees = parseInt(nombre_annees, 10);
                if (isNaN(nombre_annees) || nombre_annees <= 0 || nombre_annees > 15) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le nombre d\'années de prolongement doit être compris entre 1 et 15'
                    });
                }
                // Utiliser nombre_annees comme additional_years pour le calcul
                additional_years = nombre_annees;
            } else if (additional_years !== undefined && additional_years !== null) {
                additional_years = parseInt(additional_years, 10);
                if (isNaN(additional_years) || additional_years <= 0 || additional_years > 15) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le nombre d\'années supplémentaires doit être compris entre 1 et 15'
                    });
                }
            } else {
                additional_years = null;
            }

            if (target_age !== undefined && target_age !== null) {
                target_age = parseInt(target_age, 10);
                if (isNaN(target_age) || target_age < 60 || target_age > 75) {
                    return res.status(400).json({
                        success: false,
                        message: 'L\'âge cible doit être compris entre 60 et 75 ans'
                    });
                }
            } else {
                target_age = null;
            }

            // Valider que nombre_annees est fourni (obligatoire)
            if (!nombre_annees && !additional_years && !target_age) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nombre d\'années de prolongement est obligatoire'
                });
            }

            const agentQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.date_retraite,
                    a.id_grade,
                    a.id_type_d_agent,
                    g.libele as grade_libele,
                    ta.libele as type_agent_libele
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.id = $1
            `;

            const { rows } = await pool.query(agentQuery, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agent = rows[0];
            const isFonctionnaire =
                (agent.id_type_d_agent && Number(agent.id_type_d_agent) === 1) ||
                (agent.type_agent_libele && agent.type_agent_libele.toUpperCase().includes('FONCTIONNAIRE'));

            if (!isFonctionnaire) {
                return res.status(400).json({
                    success: false,
                    message: 'Seuls les agents fonctionnaires peuvent bénéficier d\'un prolongement de retraite'
                });
            }

            if (!agent.date_de_naissance) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de naissance de l\'agent est requise pour calculer la retraite'
                });
            }

            const birthDate = new Date(agent.date_de_naissance);

            if (Number.isNaN(birthDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Date de naissance invalide pour cet agent'
                });
            }

            let retirementDate = agent.date_retraite ? new Date(agent.date_retraite) : null;

            if (!retirementDate || Number.isNaN(retirementDate.getTime())) {
                retirementDate = this.calculateRetirementDate(agent.date_de_naissance, agent.grade_libele);
            }

            const birthYear = birthDate.getUTCFullYear();
            const currentRetirementAge = retirementDate
                ? retirementDate.getUTCFullYear() - birthYear
                : this.calculateRetirementAge(agent.grade_libele);

            if (!currentRetirementAge) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de déterminer l\'âge actuel de retraite pour cet agent'
                });
            }

            let desiredRetirementAge = target_age;

            if (!desiredRetirementAge) {
                desiredRetirementAge = currentRetirementAge + additional_years;
            }

            if (desiredRetirementAge <= currentRetirementAge) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nouvel âge de retraite doit être supérieur à l\'âge actuel'
                });
            }

            if (desiredRetirementAge < 60 || desiredRetirementAge > 75) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nouvel âge de retraite doit être compris entre 60 et 75 ans'
                });
            }

            const newRetirementYear = birthYear + desiredRetirementAge;
            const newRetirementDate = new Date(Date.UTC(newRetirementYear, 11, 31));

            // Sauvegarder la date de retraite initiale avant la mise à jour
            const initialRetirementDate = retirementDate ? new Date(retirementDate) : null;

            // Mettre à jour la date de retraite de l'agent
            await pool.query(
                `UPDATE agents SET date_retraite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [newRetirementDate, id]
            );

            // Préparer les données pour l'insertion dans prolongements_retraite
            let cheminFichier = null;
            let nomFichier = null;
            let tailleFichier = null;
            let typeFichier = null;

            if (uploadedFile) {
                // Le fichier est stocké dans le dossier documents par défaut (voir middleware/upload.js)
                cheminFichier = `/uploads/documents/${uploadedFile.filename}`;
                nomFichier = uploadedFile.originalname;
                tailleFichier = uploadedFile.size;
                typeFichier = uploadedFile.mimetype;
            }

            // Insérer les informations dans la table prolongements_retraite
            console.log('💾 Sauvegarde du prolongement dans la base de données pour agent', id);
            console.log('📋 Données:', {
                id_agent: id,
                numero_acte: numero_acte || null,
                nombre_annees: nombre_annees || null,
                hasFile: !!uploadedFile,
                age_retraite_initial: currentRetirementAge,
                age_retraite_prolonge: desiredRetirementAge
            });

            const insertProlongementQuery = `
                INSERT INTO prolongements_retraite (
                    id_agent,
                    numero_acte,
                    nature_acte,
                    date_acte,
                    nombre_annees,
                    chemin_fichier,
                    nom_fichier,
                    taille_fichier,
                    type_fichier,
                    age_retraite_initial,
                    age_retraite_prolonge,
                    date_retraite_initial,
                    date_retraite_prolongee,
                    date_prolongement,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            let prolongementResult;
            try {
                prolongementResult = await pool.query(insertProlongementQuery, [
                    id,
                    numero_acte || null,
                    nature_acte || null,
                    date_acte || null,
                    nombre_annees || null,
                    cheminFichier,
                    nomFichier,
                    tailleFichier,
                    typeFichier,
                    currentRetirementAge,
                    desiredRetirementAge,
                    initialRetirementDate,
                    newRetirementDate,
                ]);
                console.log('✅ Prolongement sauvegardé avec succès, ID:', prolongementResult.rows[0]?.id);
            } catch (dbError) {
                console.error('❌ Erreur lors de la sauvegarde du prolongement:', dbError);
                // Ne pas faire échouer le prolongement si l'insertion échoue
                // Mais logger l'erreur pour débogage
                if (dbError.message.includes('does not exist') || dbError.message.includes('relation') || dbError.message.includes('table')) {
                    console.error('⚠️  La table prolongements_retraite n\'existe pas. Veuillez exécuter le script SQL: backend/database/create_prolongements_retraite_table.sql');
                }
                // Continuer même si l'insertion échoue pour ne pas bloquer le prolongement
                prolongementResult = { rows: [{ id: null }] };
            }

            res.json({
                success: true,
                message: 'Date de retraite prolongée avec succès',
                data: {
                    agent: {
                        id: agent.id,
                        nom: agent.nom,
                        prenom: agent.prenom,
                        matricule: agent.matricule
                    },
                    previous_age: currentRetirementAge,
                    new_age: desiredRetirementAge,
                    retirement_year: newRetirementYear,
                    date_retraite: newRetirementDate.toISOString(),
                    prolongement_id: prolongementResult.rows[0]?.id,
                    numero_acte: numero_acte || null,
                    nature_acte: nature_acte || null,
                    date_acte: date_acte || null,
                    nombre_annees: nombre_annees || null,
                    fichier_uploaded: uploadedFile ? {
                        nom: nomFichier,
                        chemin: cheminFichier,
                        taille: tailleFichier,
                        type: typeFichier
                    } : null
                }
            });
        } catch (error) {
            console.error('Erreur lors du prolongement de la retraite:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les informations de prolongement de retraite d'un agent
     * GET /api/agents/:id/prolongement-retraite
     */
    async getProlongementRetraite(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    pr.id,
                    pr.id_agent,
                    pr.numero_acte,
                    pr.nature_acte,
                    pr.date_acte,
                    pr.nombre_annees,
                    pr.chemin_fichier,
                    pr.nom_fichier,
                    pr.taille_fichier,
                    pr.type_fichier,
                    pr.age_retraite_initial,
                    pr.age_retraite_prolonge,
                    pr.date_retraite_initial,
                    pr.date_retraite_prolongee,
                    pr.date_prolongement,
                    pr.created_at,
                    pr.updated_at
                FROM prolongements_retraite pr
                WHERE pr.id_agent = $1
                ORDER BY pr.date_prolongement DESC
                LIMIT 1
            `;

            const { rows } = await pool.query(query, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Aucun prolongement de retraite trouvé pour cet agent'
                });
            }

            const prolongement = rows[0];

            res.json({
                success: true,
                data: {
                    id: prolongement.id,
                    id_agent: prolongement.id_agent,
                    numero_acte: prolongement.numero_acte,
                    nature_acte: prolongement.nature_acte,
                    date_acte: prolongement.date_acte,
                    nombre_annees: prolongement.nombre_annees,
                    fichier: prolongement.chemin_fichier ? {
                        chemin: prolongement.chemin_fichier,
                        nom: prolongement.nom_fichier,
                        taille: prolongement.taille_fichier,
                        type: prolongement.type_fichier
                    } : null,
                    age_retraite_initial: prolongement.age_retraite_initial,
                    age_retraite_prolonge: prolongement.age_retraite_prolonge,
                    date_retraite_initial: prolongement.date_retraite_initial,
                    date_retraite_prolongee: prolongement.date_retraite_prolongee,
                    date_prolongement: prolongement.date_prolongement
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du prolongement:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Télécharger le fichier attaché au prolongement de retraite d'un agent
     * GET /api/agents/:id/prolongement-retraite/file
     */
    async downloadProlongementFile(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    pr.chemin_fichier,
                    pr.nom_fichier,
                    pr.taille_fichier,
                    pr.type_fichier
                FROM prolongements_retraite pr
                WHERE pr.id_agent = $1
                ORDER BY pr.date_prolongement DESC
                LIMIT 1
            `;

            const { rows } = await pool.query(query, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Aucun prolongement de retraite trouvé pour cet agent'
                });
            }

            const prolongement = rows[0];

            if (!prolongement.chemin_fichier) {
                return res.status(404).json({
                    success: false,
                    message: 'Aucun fichier n\'est attaché à cet acte de prolongement.'
                });
            }

            const uploadsRoot = path.join(__dirname, '..', 'uploads');
            const cleanedPath = prolongement.chemin_fichier.replace(/^\/+/, '');
            const normalizedPath = path.normalize(cleanedPath);
            const withoutUploadsPrefix = normalizedPath.startsWith('uploads')
                ? normalizedPath.replace(/^uploads[\\/]/, '')
                : normalizedPath;
            const absolutePath = path.join(uploadsRoot, withoutUploadsPrefix);

            if (!absolutePath.startsWith(uploadsRoot)) {
                return res.status(400).json({
                    success: false,
                    message: 'Chemin de fichier invalide.'
                });
            }

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Le fichier demandé est introuvable sur le serveur.'
                });
            }

            const mimeType = prolongement.type_fichier || 'application/octet-stream';
            const downloadName = prolongement.nom_fichier || path.basename(absolutePath);

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
            res.sendFile(absolutePath);
        } catch (error) {
            console.error('Erreur lors du téléchargement du fichier de prolongement:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Servir un document de diplôme
     * GET /api/agents/diplome-document/:documentPath
     */
    async serveDiplomeDocument(req, res) {
        try {
            // Récupérer le chemin du document depuis les paramètres
            // Le chemin est encodé en base64 pour éviter les problèmes avec les caractères spéciaux
            let documentPath = req.params.documentPath;
            
            // Décoder le chemin depuis base64
            try {
                // Décoder le base64
                const decoded = Buffer.from(documentPath, 'base64').toString('utf-8');
                // Décoder l'URI component si nécessaire
                documentPath = decodeURIComponent(decoded);
                console.log('✅ Chemin décodé:', documentPath);
            } catch (e) {
                console.error('Erreur lors du décodage du chemin:', e);
                console.error('Chemin reçu:', documentPath);
                // Si le décodage échoue, essayer de décoder directement
                try {
                    documentPath = decodeURIComponent(documentPath);
                } catch (e2) {
                    // Si tout échoue, utiliser le chemin tel quel
                    console.warn('Impossible de décoder le chemin, utilisation tel quel');
                }
            }

            // Nettoyer le chemin
            const uploadsRoot = path.join(__dirname, '..', 'uploads');
            const cleanedPath = documentPath.replace(/^\/+/, '');
            const normalizedPath = path.normalize(cleanedPath);
            const withoutUploadsPrefix = normalizedPath.startsWith('uploads')
                ? normalizedPath.replace(/^uploads[\\/]/, '')
                : normalizedPath;
            const absolutePath = path.join(uploadsRoot, withoutUploadsPrefix);

            // Sécurité : s'assurer que le chemin est dans le dossier uploads
            if (!absolutePath.startsWith(uploadsRoot)) {
                return res.status(400).json({
                    success: false,
                    message: 'Chemin de fichier invalide.'
                });
            }

            // Vérifier que le fichier existe
            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Le fichier demandé est introuvable sur le serveur.'
                });
            }

            // Déterminer le type MIME
            const ext = path.extname(absolutePath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.bmp': 'image/bmp'
            };
            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            // Définir les headers CORS pour permettre l'affichage de l'image
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(absolutePath))}"`);
            res.setHeader('Cache-Control', 'public, max-age=3600');

            console.log('📤 Envoi du fichier:', {
                path: absolutePath,
                mimeType: mimeType,
                exists: fs.existsSync(absolutePath)
            });

            res.sendFile(absolutePath);
        } catch (error) {
            console.error('Erreur lors du service du document de diplôme:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Mettre à jour les dates de retraite de TOUS les agents
     * POST /api/agents/batch-calculate-retirement
     */
    async batchCalculateRetirement(req, res) {
        try {
            console.log('🔄 Début du calcul en masse des dates de retraite...');

            // Filtrer par ministère (évite de calculer toutes les données multi-ministères)
            const requestedIdMinistere = req.query && req.query.id_ministere ? req.query.id_ministere : null;
            const userRoleLower = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
            const userMinistereId = req.user && req.user.id_ministere ? req.user.id_ministere : null;
            // Priorité: le ministère du user connecté (fiable). Le query est un fallback.
            const idMinistere =
                userRoleLower === 'super_admin'
                    ? null
                    : (userMinistereId || requestedIdMinistere);
            const ministereClause = idMinistere ? ' AND a.id_ministere = $1 ' : '';
            const ministereParams = idMinistere ? [idMinistere] : [];
            
            // Récupérer tous les agents avec leur grade et date de naissance (exclure les contractuels)
            const agentsQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.id_grade,
                    g.libele as grade_libele,
                    ta.libele as type_agent_libele
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.date_de_naissance IS NOT NULL
                    AND LOWER(TRIM(COALESCE(a.statut_emploi, ''))) NOT IN ('licencie', 'demission', 'retraite')
                    AND (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')
                    ${ministereClause}
                ORDER BY a.id
            `;
            
            const agentsResult = await pool.query(agentsQuery, ministereParams);
            const agents = agentsResult.rows;
            
            console.log(`📊 ${agents.length} agents à traiter`);
            
            let updatedCount = 0;
            let errors = [];
            
            // Mettre à jour chaque agent
            for (const agent of agents) {
                try {
                    const retirementDate = this.calculateRetirementDate(agent.date_de_naissance, agent.grade_libele);
                    const retirementAge = this.calculateRetirementAge(agent.grade_libele);
                    
                    if (retirementDate) {
                        await pool.query(
                            'UPDATE agents SET date_retraite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                            [retirementDate, agent.id]
                        );
                        updatedCount++;
                        
                        if (updatedCount % 100 === 0) {
                            console.log(`✅ ${updatedCount} agents traités...`);
                        }
                    }
                } catch (error) {
                    errors.push({
                        agent_id: agent.id,
                        matricule: agent.matricule,
                        error: error.message
                    });
                }
            }
            
            console.log(`✅ Mise à jour terminée : ${updatedCount} agents mis à jour`);
            
            if (errors.length > 0) {
                console.log(`⚠️ ${errors.length} erreurs rencontrées`);
            }
            
            res.json({
                success: true,
                message: 'Calcul des dates de retraite terminé',
                data: {
                    total_agents: agents.length,
                    updated: updatedCount,
                    errors: errors.length,
                    error_details: errors.length > 0 ? errors : undefined
                }
            });
            
        } catch (error) {
            console.error('Erreur lors du calcul en masse des retraites:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Récupérer les statistiques des retraites
     * GET /api/agents/retirement-stats
     */
    async getRetirementStats(req, res) {
        try {
            // Filtrer par ministère
            const requestedIdMinistere = req.query && req.query.id_ministere ? req.query.id_ministere : null;
            const userRoleLower = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
            const userMinistereId = req.user && req.user.id_ministere ? req.user.id_ministere : null;
            // Priorité: le ministère du user connecté (fiable). Le query est un fallback.
            const idMinistere =
                userRoleLower === 'super_admin'
                    ? null
                    : (userMinistereId || requestedIdMinistere);
            const ministereClause = idMinistere ? ' AND a.id_ministere = $1' : '';
            const params = idMinistere ? [idMinistere] : [];

            const statsQuery = `
                SELECT 
                    COUNT(*) FILTER (WHERE statut_emploi = 'retraite') as deja_retraites,
                    COUNT(*) FILTER (
                        WHERE statut_emploi = 'actif' 
                        AND date_retraite IS NOT NULL 
                        AND date_retraite <= CURRENT_DATE + INTERVAL '1 year'
                    ) as retraites_prochaine_annee,
                    COUNT(*) FILTER (
                        WHERE statut_emploi = 'actif' 
                        AND date_retraite IS NOT NULL 
                        AND date_retraite > CURRENT_DATE + INTERVAL '1 year'
                        AND date_retraite <= CURRENT_DATE + INTERVAL '5 years'
                    ) as retraites_5_ans,
                    COUNT(*) FILTER (
                        WHERE statut_emploi = 'actif' 
                        AND date_retraite IS NULL
                    ) as sans_date_retraite
                FROM agents a
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')${ministereClause};
            `;
            
            const statsResult = await pool.query(statsQuery, params);
            
            // Récupérer les agents qui partiront à la retraite dans l'année (exclure les contractuels)
            const upcomingQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.date_retraite,
                    g.libele as grade_libele,
                    cat.libele as categorie_libele,
                    d.libelle as direction_libelle,
                    EXTRACT(YEAR FROM AGE(a.date_retraite, CURRENT_DATE)) * 12 + 
                    EXTRACT(MONTH FROM AGE(a.date_retraite, CURRENT_DATE)) as mois_restants
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.statut_emploi = 'actif' 
                    AND a.date_retraite IS NOT NULL 
                    AND a.date_retraite <= CURRENT_DATE + INTERVAL '1 year'
                    AND (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')${ministereClause}
                ORDER BY a.date_retraite ASC
                LIMIT 50
            `;
            
            const upcomingResult = await pool.query(upcomingQuery, params);
            
            res.json({
                success: true,
                data: {
                    statistics: statsResult.rows[0],
                    upcoming_retirements: upcomingResult.rows
                }
            });
            
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques de retraite:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    /**
     * Projection/Estimation des retraites sur une période donnée
     * GET /api/agents/retirement-projection?years=5
     */
    async getRetirementProjection(req, res) {
        try {
            const { years = 5 } = req.query;
            const yearsInt = parseInt(years);

            // Filtrer par ministère
            const requestedIdMinistere = req.query && req.query.id_ministere ? req.query.id_ministere : null;
            const userRoleLower = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
            const userMinistereId = req.user && req.user.id_ministere ? req.user.id_ministere : null;
            // Priorité: le ministère du user connecté (fiable). Le query est un fallback.
            const idMinistere =
                userRoleLower === 'super_admin'
                    ? null
                    : (userMinistereId || requestedIdMinistere);
            const ministereClause = idMinistere ? ' AND a.id_ministere = $1' : '';
            const params = idMinistere ? [idMinistere] : [];
            
            if (isNaN(yearsInt) || yearsInt < 1 || yearsInt > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nombre d\'années doit être entre 1 et 50'
                });
            }
            
            // Projection année par année (exclure les contractuels)
            const projectionQuery = `
                WITH retirement_years AS (
                    SELECT 
                        EXTRACT(YEAR FROM a.date_retraite) as annee_retraite,
                        COUNT(*) as nombre_agents,
                        STRING_AGG(DISTINCT g.libele, ', ' ORDER BY g.libele) as grades,
                        STRING_AGG(DISTINCT cat.libele, ', ' ORDER BY cat.libele) as categories,
                        AVG(EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance))::integer as age_moyen_retraite
                    FROM agents a
                    LEFT JOIN grades g ON a.id_grade = g.id
                    LEFT JOIN categories cat ON a.id_categorie = cat.id
                    LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                    WHERE a.statut_emploi = 'actif'
                        AND a.date_retraite IS NOT NULL
                        AND a.date_retraite >= CURRENT_DATE
                        AND a.date_retraite <= CURRENT_DATE + INTERVAL '${yearsInt} years'
                        AND (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')
                        ${ministereClause}
                    GROUP BY EXTRACT(YEAR FROM a.date_retraite)
                    ORDER BY annee_retraite
                )
                SELECT * FROM retirement_years;
            `;
            
            const projectionResult = await pool.query(projectionQuery, params);
            
            // Liste détaillée des agents par année (exclure les contractuels)
            const detailedQuery = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.date_retraite,
                    a.sexe,
                    a.telephone1,
                    a.email,
                    EXTRACT(YEAR FROM a.date_retraite) as annee_retraite,
                    g.libele as grade_libele,
                    cat.libele as categorie_libele,
                    ta.libele as type_agent_libele,
                    d.libelle as direction_libelle,
                    fa_actuelle.fonction_libele as fonction_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    m.nom as ministere_nom,
                    EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance) as age_retraite
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN directions d ON a.id_direction = d.id
                -- Fonction actuelle depuis fonction_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.statut_emploi = 'actif'
                    AND a.date_retraite IS NOT NULL
                    AND a.date_retraite >= CURRENT_DATE
                    AND a.date_retraite <= CURRENT_DATE + INTERVAL '${yearsInt} years'
                    AND (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')
                    ${ministereClause}
                ORDER BY a.date_retraite, a.nom, a.prenom
            `;
            
            const detailedResult = await pool.query(detailedQuery, params);
            
            // Statistiques globales (exclure les contractuels)
            const globalStatsQuery = `
                SELECT 
                    COUNT(*) as total_departs_prevus,
                    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance) = 65) as departs_65_ans,
                    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance) = 60) as departs_60_ans,
                    STRING_AGG(DISTINCT d.libelle, ', ') as directions_impactees
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.statut_emploi = 'actif'
                    AND a.date_retraite IS NOT NULL
                    AND a.date_retraite >= CURRENT_DATE
                    AND a.date_retraite <= CURRENT_DATE + INTERVAL '${yearsInt} years'
                    AND (ta.libele IS NULL OR UPPER(ta.libele) NOT LIKE '%CONTRACTUEL%')
                    ${ministereClause}
            `;
            
            const globalStatsResult = await pool.query(globalStatsQuery, params);
            
            res.json({
                success: true,
                data: {
                    periode: {
                        annees: yearsInt,
                        date_debut: new Date().toISOString().split('T')[0],
                        date_fin: new Date(new Date().setFullYear(new Date().getFullYear() + yearsInt)).toISOString().split('T')[0]
                    },
                    statistiques_globales: globalStatsResult.rows[0],
                    projection_par_annee: projectionResult.rows,
                    liste_agents: detailedResult.rows
                }
            });
            
        } catch (error) {
            console.error('Erreur lors de la projection des retraites:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }
}

module.exports = AgentsController;