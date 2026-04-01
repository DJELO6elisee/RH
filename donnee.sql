--
-- PostgreSQL database dump
--

\restrict p4pscTRzjn3v1IfeOE3feUo8aPsZkhyFRG4fWznMiQPAJlDzmT5ejLBqSmVqJ01

-- Dumped from database version 13.23
-- Dumped by pg_dump version 13.23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assign_emploi_to_agent(character varying, character varying, date); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.assign_emploi_to_agent(p_matricule character varying, p_emploi_libelle character varying, p_date_nomination date DEFAULT NULL::date) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_agent_id INTEGER;

    v_emploi_id INTEGER;

    v_nomination_id INTEGER;

    v_nomination_numero VARCHAR;

    v_date_nomination DATE;

BEGIN

    -- 1. Récupérer l'ID de l'agent

    SELECT id INTO v_agent_id FROM public.agents WHERE matricule = p_matricule;

    IF v_agent_id IS NULL THEN

        RAISE NOTICE 'Agent non trouvé: %', p_matricule;

        RETURN;

    END IF;

    -- 2. Récupérer l'ID de l'emploi

    SELECT id INTO v_emploi_id FROM public.emplois WHERE libele = UPPER(TRIM(p_emploi_libelle));

    IF v_emploi_id IS NULL THEN

        RAISE NOTICE 'Emploi non trouvé: %', p_emploi_libelle;

        RETURN;

    END IF;

    -- 3. Vérifier si l'agent a déjà un emploi assigné

    IF EXISTS (SELECT 1 FROM public.emploi_agents WHERE id_agent = v_agent_id) THEN

        RAISE NOTICE 'Agent % a déjà un emploi assigné (ignoré)', p_matricule;

        RETURN;

    END IF;

    -- 4. Créer le numéro de nomination automatique

    v_nomination_numero := 'AUTO-' || p_matricule || '-EMPLOI';

    -- 5. Déterminer la date de nomination

    v_date_nomination := COALESCE(p_date_nomination, CURRENT_DATE);

    -- 6. Créer la nomination (ou récupérer si existe déjà)

    INSERT INTO public.nominations (id_agent, nature, numero, date_signature, type_nomination, statut, created_at, updated_at)

    VALUES (v_agent_id, 'Autre', v_nomination_numero, v_date_nomination, 'emploi', 'active', NOW(), NOW())

    ON CONFLICT (numero) DO UPDATE SET updated_at = NOW()

    RETURNING id INTO v_nomination_id;

    -- 7. Si RETURNING n'a pas fonctionné (cas ON CONFLICT), récupérer l'ID

    IF v_nomination_id IS NULL THEN

        SELECT id INTO v_nomination_id FROM public.nominations WHERE numero = v_nomination_numero;

    END IF;

    -- 8. Créer la liaison emploi_agents

    INSERT INTO public.emploi_agents (id_agent, id_emploi, id_nomination, date_entree, designation_poste, created_at, updated_at)

    VALUES (v_agent_id, v_emploi_id, v_nomination_id, v_date_nomination, p_emploi_libelle, NOW(), NOW())

    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Emploi assigné: Agent % → Emploi %', p_matricule, p_emploi_libelle;

EXCEPTION WHEN OTHERS THEN

    RAISE NOTICE 'Erreur pour agent %: %', p_matricule, SQLERRM;

END;

$$;


ALTER FUNCTION public.assign_emploi_to_agent(p_matricule character varying, p_emploi_libelle character varying, p_date_nomination date) OWNER TO isegroup_tourisme;

--
-- Name: calculer_jours_ouvres(date, date); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.calculer_jours_ouvres(date_debut date, date_fin date) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

    jour_courant DATE;

    jours_ouvres INTEGER := 0;

    jour_semaine INTEGER;

BEGIN

    -- Valider les dates

    IF date_debut > date_fin THEN

        RAISE EXCEPTION 'La date de début doit être antérieure ou égale à la date de fin';

    END IF;

    jour_courant := date_debut;

    -- Parcourir chaque jour entre date_debut et date_fin (inclus)

    WHILE jour_courant <= date_fin LOOP

        -- Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)

        jour_semaine := EXTRACT(DOW FROM jour_courant)::INTEGER;

        -- Vérifier si c'est un jour ouvré (pas un weekend : samedi = 6, dimanche = 0)

        -- Les jours fériés officiels (1er janvier, 7 juillet, etc.) SONT comptabilisés comme jours ouvrés

        IF jour_semaine != 0 AND jour_semaine != 6 THEN

            -- C'est un jour ouvré (lundi à vendredi), on l'ajoute au compteur

            jours_ouvres := jours_ouvres + 1;

        END IF;

        -- Passer au jour suivant

        jour_courant := jour_courant + INTERVAL '1 day';

    END LOOP;

    RETURN jours_ouvres;

END;

$$;


ALTER FUNCTION public.calculer_jours_ouvres(date_debut date, date_fin date) OWNER TO isegroup_tourisme;

--
-- Name: FUNCTION calculer_jours_ouvres(date_debut date, date_fin date); Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON FUNCTION public.calculer_jours_ouvres(date_debut date, date_fin date) IS 'Calcule le nombre de jours ouvrés (hors weekends : samedi et dimanche uniquement) entre deux dates. Les jours fériés officiels SONT comptabilisés.';


--
-- Name: calculer_jours_ouvres_institutions(date, date); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.calculer_jours_ouvres_institutions(p_date_debut date, p_date_fin date) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_jours INTEGER := 0;

    v_date_courante DATE;

BEGIN

    v_date_courante := p_date_debut;

    WHILE v_date_courante <= p_date_fin LOOP

        -- Compter seulement les jours de semaine (lundi à vendredi)

        IF EXTRACT(DOW FROM v_date_courante) BETWEEN 1 AND 5 THEN

            v_jours := v_jours + 1;

        END IF;

        v_date_courante := v_date_courante + 1;

    END LOOP;

    RETURN v_jours;

END;

$$;


ALTER FUNCTION public.calculer_jours_ouvres_institutions(p_date_debut date, p_date_fin date) OWNER TO isegroup_tourisme;

--
-- Name: FUNCTION calculer_jours_ouvres_institutions(p_date_debut date, p_date_fin date); Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON FUNCTION public.calculer_jours_ouvres_institutions(p_date_debut date, p_date_fin date) IS 'Calcule le nombre de jours ouvrés entre deux dates (exclut samedi/dimanche)';


--
-- Name: generate_unique_entity_code(character varying, character varying); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.generate_unique_entity_code(p_base_code character varying, p_table_name character varying DEFAULT 'entites_administratives'::character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$

DECLARE

    new_code VARCHAR(20);

    counter INTEGER := 1;

BEGIN

    new_code := p_base_code;

    IF p_table_name = 'entites_administratives' THEN

        -- Vérifier dans entites_administratives

        WHILE EXISTS (SELECT 1 FROM entites_administratives WHERE code = new_code) LOOP

            new_code := p_base_code || '_' || counter;

            counter := counter + 1;

        END LOOP;

    ELSIF p_table_name = 'entites_institutions' THEN

        -- Vérifier dans entites_institutions

        WHILE EXISTS (SELECT 1 FROM entites_institutions WHERE code = new_code) LOOP

            new_code := p_base_code || '_' || counter;

            counter := counter + 1;

        END LOOP;

    END IF;

    RETURN new_code;

END;

$$;


ALTER FUNCTION public.generate_unique_entity_code(p_base_code character varying, p_table_name character varying) OWNER TO isegroup_tourisme;

--
-- Name: get_hierarchy_for_agent(integer); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.get_hierarchy_for_agent(agent_id integer) RETURNS json
    LANGUAGE plpgsql
    AS $$

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

        'id_direction', agent_direction_id,

        'status', 'success'

    );

    RETURN result;

EXCEPTION

    WHEN OTHERS THEN

        RETURN json_build_object(

            'agent_id', agent_id,

            'ministere_id', NULL,

            'id_direction', NULL,

            'status', 'error',

            'message', SQLERRM

        );

END;

$$;


ALTER FUNCTION public.get_hierarchy_for_agent(agent_id integer) OWNER TO isegroup_tourisme;

--
-- Name: get_services_by_entite(integer); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.get_services_by_entite(p_id_entite integer) RETURNS TABLE(id integer, libelle character varying, description text, code character varying, is_active boolean)
    LANGUAGE plpgsql
    AS $$

BEGIN

    RETURN QUERY

    SELECT 

        se.id,

        se.libelle,

        se.description,

        se.code,

        se.is_active

    FROM services_entites se

    WHERE se.id_entite = p_id_entite

    AND se.is_active = TRUE

    ORDER BY se.libelle;

END;

$$;


ALTER FUNCTION public.get_services_by_entite(p_id_entite integer) OWNER TO isegroup_tourisme;

--
-- Name: FUNCTION get_services_by_entite(p_id_entite integer); Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON FUNCTION public.get_services_by_entite(p_id_entite integer) IS 'Récupère tous les services actifs d''une entité';


--
-- Name: get_services_by_ministere(integer); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.get_services_by_ministere(p_id_ministere integer) RETURNS TABLE(id integer, libelle character varying, description text, code character varying, id_entite integer, nom_entite character varying, type_entite character varying)
    LANGUAGE plpgsql
    AS $$

BEGIN

    RETURN QUERY

    SELECT 

        se.id,

        se.libelle,

        se.description,

        se.code,

        ea.id as id_entite,

        ea.nom as nom_entite,

        ea.type_entite

    FROM services_entites se

    JOIN entites_administratives ea ON se.id_entite = ea.id

    WHERE ea.id_ministere = p_id_ministere

    AND se.is_active = TRUE

    ORDER BY ea.niveau_hierarchique, ea.nom, se.libelle;

END;

$$;


ALTER FUNCTION public.get_services_by_ministere(p_id_ministere integer) OWNER TO isegroup_tourisme;

--
-- Name: FUNCTION get_services_by_ministere(p_id_ministere integer); Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON FUNCTION public.get_services_by_ministere(p_id_ministere integer) IS 'Récupère tous les services actifs d''un ministère avec leurs entités';


--
-- Name: init_conges_agent_institution(integer, integer); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.init_conges_agent_institution(p_agent_id integer, p_annee integer DEFAULT date_part('year'::text, CURRENT_DATE)) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

    INSERT INTO agent_conges_institutions (id_agent, annee, jours_alloues, jours_pris, jours_restants)

    VALUES (p_agent_id, p_annee, 30, 0, 30)

    ON CONFLICT (id_agent, annee) DO NOTHING;

END;

$$;


ALTER FUNCTION public.init_conges_agent_institution(p_agent_id integer, p_annee integer) OWNER TO isegroup_tourisme;

--
-- Name: FUNCTION init_conges_agent_institution(p_agent_id integer, p_annee integer); Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON FUNCTION public.init_conges_agent_institution(p_agent_id integer, p_annee integer) IS 'Initialise les congés d''un agent pour une année donnée';


--
-- Name: recalculer_jours_restants(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.recalculer_jours_restants() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- TOUJOURS recalculer jours_restants = jours_alloues - jours_pris

    -- S'assurer que jours_restants ne peut pas être négatif

    -- Ce calcul est DYNAMIQUE et se fait automatiquement à chaque INSERT/UPDATE

    -- Même si jours_restants est passé dans l'UPDATE, cette valeur sera IGNORÉE et recalculée

    NEW.jours_restants = GREATEST(0, COALESCE(NEW.jours_alloues, 30) - COALESCE(NEW.jours_pris, 0));

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.recalculer_jours_restants() OWNER TO isegroup_tourisme;

--
-- Name: tr_demandes_assign_hierarchy(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.tr_demandes_assign_hierarchy() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

DECLARE

    hierarchy JSON;

    chef_service_id INTEGER;

    drh_id INTEGER;

    directeur_id INTEGER;

    ministre_id INTEGER;

BEGIN

    hierarchy := get_hierarchy_for_agent(NEW.id_agent);

    chef_service_id := (hierarchy->>'chef_service')::INTEGER;

    drh_id := (hierarchy->>'drh')::INTEGER;

    directeur_id := (hierarchy->>'directeur')::INTEGER;

    ministre_id := (hierarchy->>'ministre')::INTEGER;

    UPDATE demandes 

    SET 

        id_chef_service = chef_service_id,

        id_drh = drh_id,

        id_directeur = directeur_id,

        id_ministre = ministre_id

    WHERE id = NEW.id;

    IF chef_service_id IS NOT NULL THEN

        INSERT INTO notifications_demandes (

            id_demande, 

            id_agent_destinataire, 

            type_notification, 

            titre, 

            message

        ) VALUES (

            NEW.id,

            chef_service_id,

            'nouvelle_demande',

            'Nouvelle demande à valider',

            'Une nouvelle demande de type "' || NEW.type_demande || '" a été soumise par un agent et nécessite votre validation.'

        );

    END IF;

    INSERT INTO notifications_demandes (

        id_demande, 

        id_agent_destinataire, 

        type_notification, 

        titre, 

        message

    ) VALUES (

        NEW.id,

        NEW.id_agent,

        'nouvelle_demande',

        'Demande soumise avec succès',

        'Votre demande de type "' || NEW.type_demande || '" a été soumise et est en cours de traitement.'

    );

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.tr_demandes_assign_hierarchy() OWNER TO isegroup_tourisme;

--
-- Name: tr_demandes_historique_update(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.tr_demandes_historique_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF (OLD.status != NEW.status OR OLD.niveau_evolution_demande != NEW.niveau_evolution_demande) THEN

        INSERT INTO demandes_historique (

            id_demande,

            ancien_status,

            nouveau_status,

            ancien_niveau,

            nouveau_niveau,

            commentaire_modification,

            modifie_par

        ) VALUES (

            NEW.id,

            OLD.status,

            NEW.status,

            OLD.niveau_evolution_demande,

            NEW.niveau_evolution_demande,

            'Modification automatique - Status: ' || OLD.status || ' -> ' || NEW.status || 

            ', Niveau: ' || OLD.niveau_evolution_demande || ' -> ' || NEW.niveau_evolution_demande,

            NEW.updated_by

        );

    END IF;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.tr_demandes_historique_update() OWNER TO isegroup_tourisme;

--
-- Name: update_agent_conges_updated_at(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_agent_conges_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_agent_conges_updated_at() OWNER TO isegroup_tourisme;

--
-- Name: update_categories_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_categories_agents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_categories_agents_updated_at() OWNER TO isegroup_tourisme;

--
-- Name: update_echelons_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_echelons_agents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_echelons_agents_updated_at() OWNER TO isegroup_tourisme;

--
-- Name: update_grades_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_grades_agents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_grades_agents_updated_at() OWNER TO isegroup_tourisme;

--
-- Name: update_jours_feries_updated_at(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_jours_feries_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_jours_feries_updated_at() OWNER TO isegroup_tourisme;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.date_modification = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_modified_column() OWNER TO isegroup_tourisme;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO isegroup_tourisme;

--
-- Name: validate_entity_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.validate_entity_code_uniqueness() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Vérifier l'unicité dans entites_administratives

    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN

        RAISE EXCEPTION 'Le code % existe déjà dans entites_administratives', NEW.code;

    END IF;

    -- Vérifier l'unicité dans entites_institutions

    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code) THEN

        RAISE EXCEPTION 'Le code % existe déjà dans entites_institutions', NEW.code;

    END IF;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.validate_entity_code_uniqueness() OWNER TO isegroup_tourisme;

--
-- Name: validate_institution_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: isegroup_tourisme
--

CREATE FUNCTION public.validate_institution_code_uniqueness() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Vérifier l'unicité dans entites_institutions

    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN

        RAISE EXCEPTION 'Le code % existe déjà dans entites_institutions', NEW.code;

    END IF;

    -- Vérifier l'unicité dans entites_administratives

    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code) THEN

        RAISE EXCEPTION 'Le code % existe déjà dans entites_administratives', NEW.code;

    END IF;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.validate_institution_code_uniqueness() OWNER TO isegroup_tourisme;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: affectations_temporaires; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.affectations_temporaires (
    id integer NOT NULL,
    id_agent integer,
    id_entite_source integer,
    id_entite_destination integer,
    motif text NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    statut character varying(20) DEFAULT 'en_cours'::character varying,
    approbation_drh boolean DEFAULT false,
    approbation_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT affectations_temporaires_statut_check CHECK (((statut)::text = ANY (ARRAY[('en_cours'::character varying)::text, ('terminee'::character varying)::text, ('annulee'::character varying)::text])))
);


ALTER TABLE public.affectations_temporaires OWNER TO isegroup_tourisme;

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.affectations_temporaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.affectations_temporaires_id_seq OWNER TO isegroup_tourisme;

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.affectations_temporaires_id_seq OWNED BY public.affectations_temporaires.id;


--
-- Name: affectations_temporaires_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.affectations_temporaires_institutions (
    id integer NOT NULL,
    id_agent integer,
    id_entite_source integer,
    id_entite_destination integer,
    motif text NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    statut character varying(20) DEFAULT 'en_cours'::character varying,
    approbation_drh boolean DEFAULT false,
    approbation_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT affectations_temporaires_institutions_statut_check CHECK (((statut)::text = ANY (ARRAY[('en_cours'::character varying)::text, ('terminee'::character varying)::text, ('annulee'::character varying)::text])))
);


ALTER TABLE public.affectations_temporaires_institutions OWNER TO isegroup_tourisme;

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.affectations_temporaires_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.affectations_temporaires_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.affectations_temporaires_institutions_id_seq OWNED BY public.affectations_temporaires_institutions.id;


--
-- Name: agent_conges; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_conges (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    annee integer NOT NULL,
    jours_pris integer DEFAULT 0,
    jours_alloues integer DEFAULT 30,
    jours_restants integer DEFAULT 30,
    jours_reportes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    dette_annee_suivante integer DEFAULT 0,
    date_depart_conges date,
    type_conge character varying(20) DEFAULT NULL::character varying
);


ALTER TABLE public.agent_conges OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_conges; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_conges IS 'Table pour gérer les congés annuels des agents';


--
-- Name: COLUMN agent_conges.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.id_agent IS 'Identifiant de l''agent';


--
-- Name: COLUMN agent_conges.annee; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.annee IS 'Année de référence pour les congés';


--
-- Name: COLUMN agent_conges.jours_pris; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.jours_pris IS 'Nombre de jours de congés pris dans l''année';


--
-- Name: COLUMN agent_conges.jours_alloues; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.jours_alloues IS 'Nombre de jours de congés alloués pour l''année (30 par défaut + jours reportés)';


--
-- Name: COLUMN agent_conges.jours_restants; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.jours_restants IS 'Nombre de jours de congés restants';


--
-- Name: COLUMN agent_conges.jours_reportes; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.jours_reportes IS 'Nombre de jours reportés de l''année précédente';


--
-- Name: COLUMN agent_conges.dette_annee_suivante; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.dette_annee_suivante IS 'Nombre de jours dus à l''année suivante (pour congés exceptionnels). Exemple: si solde négatif = 10, dette_annee_suivante = 10, et l''agent aura 20 jours l''année suivante (30 - 10)';


--
-- Name: COLUMN agent_conges.date_depart_conges; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.date_depart_conges IS 'Date de départ prévisionnelle en congés pour l''agent pour l''année de référence';


--
-- Name: COLUMN agent_conges.type_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges.type_conge IS 'Type de congé: ''grouped'' pour congés groupés, ''individual'' pour congés individuels';


--
-- Name: agent_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_conges_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_conges_id_seq OWNED BY public.agent_conges.id;


--
-- Name: agent_conges_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_conges_institutions (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    annee integer NOT NULL,
    jours_alloues integer DEFAULT 30,
    jours_pris integer DEFAULT 0,
    jours_restants integer DEFAULT 30,
    jours_reportes integer DEFAULT 0,
    dette_annee_suivante integer DEFAULT 0,
    commentaires text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_conges_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_conges_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_conges_institutions IS 'Gestion des congés des agents d''institutions';


--
-- Name: COLUMN agent_conges_institutions.jours_alloues; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges_institutions.jours_alloues IS 'Nombre de jours de congés alloués pour l''année';


--
-- Name: COLUMN agent_conges_institutions.jours_pris; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges_institutions.jours_pris IS 'Nombre de jours déjà pris';


--
-- Name: COLUMN agent_conges_institutions.jours_restants; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges_institutions.jours_restants IS 'Nombre de jours restants';


--
-- Name: COLUMN agent_conges_institutions.jours_reportes; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges_institutions.jours_reportes IS 'Jours reportés de l''année précédente';


--
-- Name: COLUMN agent_conges_institutions.dette_annee_suivante; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_conges_institutions.dette_annee_suivante IS 'Dette à reporter sur l''année suivante (congés négatifs)';


--
-- Name: agent_conges_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_conges_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_conges_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_conges_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_conges_institutions_id_seq OWNED BY public.agent_conges_institutions.id;


--
-- Name: agent_documents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_documents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    document_type character varying(100) NOT NULL,
    document_name character varying(255) NOT NULL,
    document_url character varying(500) NOT NULL,
    document_size integer,
    document_mime_type character varying(100),
    description text,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_documents OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_documents; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_documents IS 'Documents des agents (diplômes, certificats, etc.)';


--
-- Name: COLUMN agent_documents.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.id IS 'Identifiant unique du document';


--
-- Name: COLUMN agent_documents.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_documents.document_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.document_type IS 'Type de document (diplome, certificat, attestation, autre)';


--
-- Name: COLUMN agent_documents.document_name; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.document_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_documents.document_url; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.document_url IS 'URL ou chemin du document';


--
-- Name: COLUMN agent_documents.document_size; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.document_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_documents.document_mime_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.document_mime_type IS 'Type MIME du document';


--
-- Name: COLUMN agent_documents.description; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_documents.description IS 'Description du document';


--
-- Name: agent_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_documents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_documents_id_seq OWNED BY public.agent_documents.id;


--
-- Name: agent_langues; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_langues (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_langue integer NOT NULL,
    id_niveau_langue integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_langues OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_langues; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_langues IS 'Table de liaison entre agents et langues avec niveau et certification';


--
-- Name: COLUMN agent_langues.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_langues.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_langues.id_langue; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_langues.id_langue IS 'Référence vers la langue';


--
-- Name: COLUMN agent_langues.id_niveau_langue; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_langues.id_niveau_langue IS 'Niveau de maîtrise de la langue';


--
-- Name: agent_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_langues_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_langues_id_seq OWNED BY public.agent_langues.id;


--
-- Name: agent_logiciels; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_logiciels (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_logiciel integer NOT NULL,
    id_niveau_informatique integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_logiciels OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_logiciels; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_logiciels IS 'Table de liaison entre agents et logiciels avec niveau et certification';


--
-- Name: COLUMN agent_logiciels.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_logiciels.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_logiciels.id_logiciel; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_logiciels.id_logiciel IS 'Référence vers le logiciel';


--
-- Name: COLUMN agent_logiciels.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_logiciels.id_niveau_informatique IS 'Niveau de maîtrise du logiciel';


--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_logiciels_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_logiciels_id_seq OWNED BY public.agent_logiciels.id;


--
-- Name: agent_login_codes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_login_codes (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    code character varying(8) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_login_codes OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_login_codes; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_login_codes IS 'Codes de connexion temporaires pour les agents';


--
-- Name: COLUMN agent_login_codes.agent_id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_login_codes.agent_id IS 'ID de l\''agent';


--
-- Name: COLUMN agent_login_codes.code; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_login_codes.code IS 'Code de connexion (8 caractères hexadécimaux)';


--
-- Name: COLUMN agent_login_codes.expires_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_login_codes.expires_at IS 'Date et heure d\expiration du code';


--
-- Name: COLUMN agent_login_codes.used_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_login_codes.used_at IS 'Date et heure d\utilisation du code (NULL si non utilisé)';


--
-- Name: COLUMN agent_login_codes.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_login_codes.created_at IS 'Date et heure de création du code';


--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_login_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_login_codes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_login_codes_id_seq OWNED BY public.agent_login_codes.id;


--
-- Name: agent_photos; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_photos (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    photo_url character varying(500) NOT NULL,
    photo_name character varying(255) NOT NULL,
    photo_size integer,
    photo_type character varying(100),
    is_profile_photo boolean DEFAULT true,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_photos OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_photos; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_photos IS 'Photos des agents (photo de profil)';


--
-- Name: COLUMN agent_photos.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.id IS 'Identifiant unique de la photo';


--
-- Name: COLUMN agent_photos.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_photos.photo_url; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.photo_url IS 'URL ou chemin de la photo';


--
-- Name: COLUMN agent_photos.photo_name; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.photo_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_photos.photo_size; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.photo_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_photos.photo_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.photo_type IS 'Type MIME de la photo';


--
-- Name: COLUMN agent_photos.is_profile_photo; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_photos.is_profile_photo IS 'Indique si c''est la photo de profil';


--
-- Name: agent_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_photos_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_photos_id_seq OWNED BY public.agent_photos.id;


--
-- Name: agent_route_assignments; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_route_assignments (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    route_id character varying(100) NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_route_assignments OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_route_assignments; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_route_assignments IS 'Table de liaison pour assigner des routes (onglets sidebar) aux agents';


--
-- Name: COLUMN agent_route_assignments.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_route_assignments.id_agent IS 'ID de l''agent à qui la route est assignée';


--
-- Name: COLUMN agent_route_assignments.route_id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_route_assignments.route_id IS 'ID de la route assignée (correspond à l''id dans routes.js)';


--
-- Name: COLUMN agent_route_assignments.assigned_by; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_route_assignments.assigned_by IS 'ID de l''utilisateur (DRH) qui a fait l''assignation';


--
-- Name: agent_route_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_route_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_route_assignments_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_route_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_route_assignments_id_seq OWNED BY public.agent_route_assignments.id;


--
-- Name: agent_signatures; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agent_signatures (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    signature_url character varying(500) NOT NULL,
    signature_path character varying(255) NOT NULL,
    signature_name character varying(255),
    signature_size integer,
    signature_type character varying(100),
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_signatures OWNER TO isegroup_tourisme;

--
-- Name: TABLE agent_signatures; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agent_signatures IS 'Signatures numériques des agents utilisées pour l''émargement';


--
-- Name: COLUMN agent_signatures.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.id IS 'Identifiant unique de la signature';


--
-- Name: COLUMN agent_signatures.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN agent_signatures.signature_url; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.signature_url IS 'URL publique de la signature';


--
-- Name: COLUMN agent_signatures.signature_path; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.signature_path IS 'Chemin relatif du fichier de signature';


--
-- Name: COLUMN agent_signatures.signature_name; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.signature_name IS 'Nom original du fichier de signature';


--
-- Name: COLUMN agent_signatures.signature_size; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.signature_size IS 'Taille du fichier de signature en octets';


--
-- Name: COLUMN agent_signatures.signature_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.signature_type IS 'Type MIME de la signature';


--
-- Name: COLUMN agent_signatures.is_active; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agent_signatures.is_active IS 'Indique si la signature est active pour l''agent';


--
-- Name: agent_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agent_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_signatures_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agent_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agent_signatures_id_seq OWNED BY public.agent_signatures.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents (
    id integer NOT NULL,
    id_civilite integer,
    id_situation_matrimoniale integer,
    id_nationalite integer,
    id_type_d_agent integer,
    id_ministere integer,
    id_entite_principale integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    matricule character varying(50) NOT NULL,
    date_de_naissance date NOT NULL,
    lieu_de_naissance character varying(200),
    age integer,
    telephone1 character varying(20),
    telephone2 character varying(20),
    sexe character(1),
    nom_de_la_mere character varying(100),
    nom_du_pere character varying(100),
    email character varying(255),
    date_mariage date,
    nom_conjointe character varying(100),
    nombre_enfant integer DEFAULT 0,
    ad_pro_rue character varying(255),
    ad_pro_ville character varying(100),
    ad_pro_batiment character varying(100),
    ad_pri_rue character varying(255),
    ad_pri_ville character varying(100),
    ad_pri_batiment character varying(100),
    statut_emploi character varying(20) DEFAULT 'actif'::character varying,
    date_embauche date,
    date_fin_contrat date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_fonction integer,
    id_pays integer,
    id_categorie integer,
    id_grade integer,
    id_emploi integer,
    id_echelon integer,
    id_specialite integer,
    id_langue integer,
    id_niveau_langue integer,
    id_motif_depart integer,
    id_type_conge integer,
    id_autre_absence integer,
    id_distinction integer,
    id_type_etablissement integer,
    id_unite_administrative integer,
    id_diplome integer,
    id_type_materiel integer,
    id_type_destination integer,
    id_nature_accident integer,
    id_sanction integer,
    id_sindicat integer,
    id_type_courrier integer,
    id_nature_acte integer,
    id_localite integer,
    id_mode_entree integer,
    id_position integer,
    id_pathologie integer,
    id_handicap integer,
    id_niveau_informatique integer,
    id_logiciel integer,
    id_type_retraite integer,
    id_direction_generale integer,
    id_direction integer,
    date_retraite date,
    fonction_actuelle character varying(200),
    fonction_anterieure character varying(200),
    situation_militaire character varying(50),
    numero_cnps character varying(50),
    date_declaration_cnps date,
    handicap_personnalise character varying(255),
    date_prise_service_au_ministere date,
    date_prise_service_dans_la_direction date,
    numero_acte_mariage character varying(255),
    id_sous_direction integer,
    id_service integer,
    prenom_conjointe character varying(100),
    retire boolean DEFAULT false,
    date_retrait timestamp without time zone,
    motif_retrait text,
    motif_restauration text,
    lieu_mariage character varying(255),
    lieu_reception character varying(255),
    telephone3 character varying(20),
    corps_prefectoral character varying(50),
    grade_prefectoral character varying(50),
    echelon_prefectoral integer,
    date_delivrance_acte_mariage date,
    CONSTRAINT agents_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
    CONSTRAINT agents_situation_militaire_check CHECK ((((situation_militaire)::text = ANY (ARRAY[('Exempté'::character varying)::text, ('Réformé'::character varying)::text, ('Bon pour le service'::character varying)::text, ('Dispensé'::character varying)::text, ('Non concerné'::character varying)::text])) OR (situation_militaire IS NULL))),
    CONSTRAINT agents_statut_emploi_check CHECK (((statut_emploi)::text = ANY (ARRAY[('actif'::character varying)::text, ('inactif'::character varying)::text, ('retraite'::character varying)::text, ('demission'::character varying)::text, ('licencie'::character varying)::text])))
);


ALTER TABLE public.agents OWNER TO isegroup_tourisme;

--
-- Name: COLUMN agents.id_fonction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_fonction IS 'Référence vers la fonction de l''agent';


--
-- Name: COLUMN agents.id_pays; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_pays IS 'Référence vers le pays de l''agent';


--
-- Name: COLUMN agents.id_categorie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_categorie IS 'Référence vers la catégorie de l''agent';


--
-- Name: COLUMN agents.id_grade; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_grade IS 'Référence vers le grade de l''agent';


--
-- Name: COLUMN agents.id_emploi; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_emploi IS 'Référence vers l''emploi de l''agent';


--
-- Name: COLUMN agents.id_echelon; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_echelon IS 'Référence vers l''échelon de l''agent';


--
-- Name: COLUMN agents.id_specialite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_specialite IS 'Référence vers la spécialité de l''agent';


--
-- Name: COLUMN agents.id_langue; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_langue IS 'Référence vers la langue de l''agent';


--
-- Name: COLUMN agents.id_niveau_langue; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_niveau_langue IS 'Référence vers le niveau de langue de l''agent';


--
-- Name: COLUMN agents.id_motif_depart; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_motif_depart IS 'Référence vers le motif de départ de l''agent';


--
-- Name: COLUMN agents.id_type_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_conge IS 'Référence vers le type de congé de l''agent';


--
-- Name: COLUMN agents.id_autre_absence; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_autre_absence IS 'Référence vers le type d''autre absence de l''agent';


--
-- Name: COLUMN agents.id_distinction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_distinction IS 'Référence vers la distinction de l''agent';


--
-- Name: COLUMN agents.id_type_etablissement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_etablissement IS 'Référence vers le type d''établissement de l''agent';


--
-- Name: COLUMN agents.id_unite_administrative; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_unite_administrative IS 'Référence vers l''unité administrative de l''agent';


--
-- Name: COLUMN agents.id_diplome; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_diplome IS 'Référence vers le diplôme de l''agent';


--
-- Name: COLUMN agents.id_type_materiel; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_materiel IS 'Référence vers le type de matériel de l''agent';


--
-- Name: COLUMN agents.id_type_destination; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_destination IS 'Référence vers le type de destination de l''agent';


--
-- Name: COLUMN agents.id_nature_accident; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_nature_accident IS 'Référence vers la nature d''accident de l''agent';


--
-- Name: COLUMN agents.id_sanction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_sanction IS 'Référence vers la sanction de l''agent';


--
-- Name: COLUMN agents.id_sindicat; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_sindicat IS 'Référence vers le syndicat de l''agent';


--
-- Name: COLUMN agents.id_type_courrier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_courrier IS 'Référence vers le type de courrier de l''agent';


--
-- Name: COLUMN agents.id_nature_acte; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_nature_acte IS 'Référence vers la nature d''acte de l''agent';


--
-- Name: COLUMN agents.id_localite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_localite IS 'Référence vers la localité de l''agent';


--
-- Name: COLUMN agents.id_mode_entree; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_mode_entree IS 'Référence vers le mode d''entrée de l''agent';


--
-- Name: COLUMN agents.id_position; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_position IS 'Référence vers la position de l''agent';


--
-- Name: COLUMN agents.id_pathologie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_pathologie IS 'Référence vers la pathologie de l''agent';


--
-- Name: COLUMN agents.id_handicap; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_handicap IS 'Référence vers le handicap de l''agent';


--
-- Name: COLUMN agents.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_niveau_informatique IS 'Référence vers le niveau informatique de l''agent';


--
-- Name: COLUMN agents.id_logiciel; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_logiciel IS 'Référence vers le logiciel de l''agent';


--
-- Name: COLUMN agents.id_type_retraite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_type_retraite IS 'Référence vers le type de retraite de l''agent';


--
-- Name: COLUMN agents.id_direction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.id_direction IS 'Référence vers la direction d''affectation de l''agent';


--
-- Name: COLUMN agents.date_retraite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.date_retraite IS 'Date de retraite de l''agent';


--
-- Name: COLUMN agents.fonction_actuelle; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.fonction_actuelle IS 'Fonction actuelle de l''agent';


--
-- Name: COLUMN agents.fonction_anterieure; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.fonction_anterieure IS 'Fonction antérieure de l''agent';


--
-- Name: COLUMN agents.situation_militaire; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.situation_militaire IS 'Situation militaire de l''agent';


--
-- Name: COLUMN agents.numero_cnps; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.numero_cnps IS 'Numéro CNPS pour les agents non fonctionnaires';


--
-- Name: COLUMN agents.date_declaration_cnps; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.date_declaration_cnps IS 'Date de déclaration CNPS pour les agents non fonctionnaires';


--
-- Name: COLUMN agents.numero_acte_mariage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.numero_acte_mariage IS 'Numéro de l''acte de mariage de l''agent';


--
-- Name: COLUMN agents.lieu_mariage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.lieu_mariage IS 'Lieu de mariage (mairie) de l''agent';


--
-- Name: COLUMN agents.lieu_reception; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.lieu_reception IS 'Lieu de réception du mariage de l''agent';


--
-- Name: COLUMN agents.telephone3; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.telephone3 IS 'Deuxième numéro d''urgence de l''agent';


--
-- Name: COLUMN agents.corps_prefectoral; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.corps_prefectoral IS 'Corps préfectoral de l''agent (prefet_hors_grade, prefet, secretaire_general, sous_prefet)';


--
-- Name: COLUMN agents.grade_prefectoral; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.grade_prefectoral IS 'Grade préfectoral automatique (HG, G1, G2, G3)';


--
-- Name: COLUMN agents.echelon_prefectoral; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.echelon_prefectoral IS 'Échelon préfectoral (1, 2, 3)';


--
-- Name: COLUMN agents.date_delivrance_acte_mariage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents.date_delivrance_acte_mariage IS 'Date de délivrance de l''acte de mariage';


--
-- Name: agents_associations; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents_associations (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_association integer NOT NULL,
    date_adhesion date NOT NULL,
    date_fin date,
    role character varying(200),
    statut character varying(50) DEFAULT 'actif'::character varying,
    fichier_attestation_url character varying(500),
    fichier_attestation_nom character varying(255),
    fichier_attestation_taille integer,
    fichier_attestation_type character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agents_associations_statut_check CHECK (((statut)::text = ANY (ARRAY[('actif'::character varying)::text, ('inactif'::character varying)::text, ('resigne'::character varying)::text])))
);


ALTER TABLE public.agents_associations OWNER TO isegroup_tourisme;

--
-- Name: TABLE agents_associations; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agents_associations IS 'Table de liaison entre agents et associations';


--
-- Name: COLUMN agents_associations.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.id_agent IS 'Référence à l''agent';


--
-- Name: COLUMN agents_associations.id_association; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.id_association IS 'Référence à l''association';


--
-- Name: COLUMN agents_associations.date_adhesion; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.date_adhesion IS 'Date d''adhésion à l''association';


--
-- Name: COLUMN agents_associations.date_fin; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.date_fin IS 'Date de fin d''adhésion (si applicable)';


--
-- Name: COLUMN agents_associations.role; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.role IS 'Rôle de l''agent dans l''association';


--
-- Name: COLUMN agents_associations.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.statut IS 'Statut de l''adhésion: actif, inactif, resigne';


--
-- Name: COLUMN agents_associations.fichier_attestation_url; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.fichier_attestation_url IS 'URL ou chemin du fichier d''attestation d''adhésion';


--
-- Name: COLUMN agents_associations.fichier_attestation_nom; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.fichier_attestation_nom IS 'Nom original du fichier d''attestation';


--
-- Name: COLUMN agents_associations.fichier_attestation_taille; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.fichier_attestation_taille IS 'Taille du fichier d''attestation en octets';


--
-- Name: COLUMN agents_associations.fichier_attestation_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_associations.fichier_attestation_type IS 'Type MIME du fichier d''attestation';


--
-- Name: agents_associations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_associations_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_associations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_associations_id_seq OWNED BY public.agents_associations.id;


--
-- Name: agents_entites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents_entites (
    id integer NOT NULL,
    id_agent integer,
    id_entite integer,
    poste character varying(200),
    date_debut date NOT NULL,
    date_fin date,
    is_principal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agents_entites OWNER TO isegroup_tourisme;

--
-- Name: agents_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_entites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_entites_id_seq OWNED BY public.agents_entites.id;


--
-- Name: agents_entites_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents_entites_institutions (
    id integer NOT NULL,
    id_agent_institution integer,
    id_entite integer,
    poste character varying(200),
    date_debut date NOT NULL,
    date_fin date,
    is_principal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agents_entites_institutions OWNER TO isegroup_tourisme;

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_entites_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_entites_institutions_id_seq OWNED BY public.agents_entites_institutions.id;


--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: agents_institutions_main; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents_institutions_main (
    id integer NOT NULL,
    id_civilite integer,
    id_situation_matrimoniale integer,
    id_nationalite integer,
    id_type_d_agent integer,
    id_institution integer,
    id_entite_principale integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    matricule character varying(50) NOT NULL,
    date_de_naissance date NOT NULL,
    lieu_de_naissance character varying(200),
    age integer,
    telephone1 character varying(20),
    telephone2 character varying(20),
    sexe character(1),
    nom_de_la_mere character varying(100),
    nom_du_pere character varying(100),
    email character varying(255),
    date_mariage date,
    nom_conjointe character varying(100),
    nombre_enfant integer DEFAULT 0,
    ad_pro_rue character varying(255),
    ad_pro_ville character varying(100),
    ad_pro_batiment character varying(100),
    ad_pri_rue character varying(255),
    ad_pri_ville character varying(100),
    ad_pri_batiment character varying(100),
    statut_emploi character varying(20) DEFAULT 'actif'::character varying,
    date_embauche date,
    date_fin_contrat date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agents_institutions_main_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
    CONSTRAINT agents_institutions_main_statut_emploi_check CHECK (((statut_emploi)::text = ANY (ARRAY[('actif'::character varying)::text, ('inactif'::character varying)::text, ('retraite'::character varying)::text, ('demission'::character varying)::text, ('licencie'::character varying)::text])))
);


ALTER TABLE public.agents_institutions_main OWNER TO isegroup_tourisme;

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_institutions_main_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_institutions_main_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_institutions_main_id_seq OWNED BY public.agents_institutions_main.id;


--
-- Name: agents_sindicats; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.agents_sindicats (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_sindicat integer NOT NULL,
    date_adhesion date NOT NULL,
    date_fin date,
    role character varying(200),
    statut character varying(50) DEFAULT 'actif'::character varying,
    fichier_attestation_url character varying(500),
    fichier_attestation_nom character varying(255),
    fichier_attestation_taille integer,
    fichier_attestation_type character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agents_sindicats_statut_check CHECK (((statut)::text = ANY (ARRAY[('actif'::character varying)::text, ('inactif'::character varying)::text, ('resigne'::character varying)::text])))
);


ALTER TABLE public.agents_sindicats OWNER TO isegroup_tourisme;

--
-- Name: TABLE agents_sindicats; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.agents_sindicats IS 'Table de liaison entre agents et syndicats';


--
-- Name: COLUMN agents_sindicats.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.id_agent IS 'Référence à l''agent';


--
-- Name: COLUMN agents_sindicats.id_sindicat; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.id_sindicat IS 'Référence au syndicat';


--
-- Name: COLUMN agents_sindicats.date_adhesion; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.date_adhesion IS 'Date d''adhésion au syndicat';


--
-- Name: COLUMN agents_sindicats.date_fin; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.date_fin IS 'Date de fin d''adhésion (si applicable)';


--
-- Name: COLUMN agents_sindicats.role; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.role IS 'Rôle de l''agent dans le syndicat';


--
-- Name: COLUMN agents_sindicats.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.statut IS 'Statut de l''adhésion: actif, inactif, resigne';


--
-- Name: COLUMN agents_sindicats.fichier_attestation_url; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.fichier_attestation_url IS 'URL ou chemin du fichier d''attestation d''adhésion';


--
-- Name: COLUMN agents_sindicats.fichier_attestation_nom; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.fichier_attestation_nom IS 'Nom original du fichier d''attestation';


--
-- Name: COLUMN agents_sindicats.fichier_attestation_taille; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.fichier_attestation_taille IS 'Taille du fichier d''attestation en octets';


--
-- Name: COLUMN agents_sindicats.fichier_attestation_type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.agents_sindicats.fichier_attestation_type IS 'Type MIME du fichier d''attestation';


--
-- Name: agents_sindicats_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.agents_sindicats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_sindicats_id_seq OWNER TO isegroup_tourisme;

--
-- Name: agents_sindicats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.agents_sindicats_id_seq OWNED BY public.agents_sindicats.id;


--
-- Name: associations; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.associations (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.associations OWNER TO isegroup_tourisme;

--
-- Name: TABLE associations; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.associations IS 'Table des associations (distincte des syndicats)';


--
-- Name: COLUMN associations.libele; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.associations.libele IS 'Nom de l''association';


--
-- Name: COLUMN associations.description; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.associations.description IS 'Description de l''association';


--
-- Name: associations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.associations_id_seq OWNER TO isegroup_tourisme;

--
-- Name: associations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.associations_id_seq OWNED BY public.associations.id;


--
-- Name: autre_absences; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.autre_absences (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.autre_absences OWNER TO isegroup_tourisme;

--
-- Name: autre_absences_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.autre_absences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.autre_absences_id_seq OWNER TO isegroup_tourisme;

--
-- Name: autre_absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.autre_absences_id_seq OWNED BY public.autre_absences.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO isegroup_tourisme;

--
-- Name: categories_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.categories_agents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_categorie integer NOT NULL,
    id_nomination integer,
    date_entree date NOT NULL,
    date_sortie date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories_agents OWNER TO isegroup_tourisme;

--
-- Name: TABLE categories_agents; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.categories_agents IS 'Table de suivi de l''historique des catégories des agents';


--
-- Name: COLUMN categories_agents.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.id IS 'Identifiant unique de l''enregistrement';


--
-- Name: COLUMN categories_agents.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN categories_agents.id_categorie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.id_categorie IS 'Référence vers la catégorie';


--
-- Name: COLUMN categories_agents.id_nomination; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';


--
-- Name: COLUMN categories_agents.date_entree; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.date_entree IS 'Date d''entrée dans cette catégorie';


--
-- Name: COLUMN categories_agents.date_sortie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.date_sortie IS 'Date de sortie de cette catégorie (optionnelle)';


--
-- Name: COLUMN categories_agents.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN categories_agents.updated_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.categories_agents.updated_at IS 'Date de dernière modification';


--
-- Name: categories_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.categories_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: categories_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.categories_agents_id_seq OWNED BY public.categories_agents.id;


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO isegroup_tourisme;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: civilites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.civilites (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.civilites OWNER TO isegroup_tourisme;

--
-- Name: civilites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.civilites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.civilites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: civilites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.civilites_id_seq OWNED BY public.civilites.id;


--
-- Name: classeurs; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.classeurs (
    id integer NOT NULL,
    id_ministere integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.classeurs OWNER TO isegroup_tourisme;

--
-- Name: classeurs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.classeurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.classeurs_id_seq OWNER TO isegroup_tourisme;

--
-- Name: classeurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.classeurs_id_seq OWNED BY public.classeurs.id;


--
-- Name: classeurs_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.classeurs_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.classeurs_institutions OWNER TO isegroup_tourisme;

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.classeurs_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.classeurs_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.classeurs_institutions_id_seq OWNED BY public.classeurs_institutions.id;


--
-- Name: decisions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.decisions (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    numero_acte character varying(255),
    chemin_document character varying(500),
    date_decision date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    is_active boolean DEFAULT false,
    id_direction integer,
    id_sous_direction integer,
    id_agent integer,
    annee_decision integer,
    CONSTRAINT check_decision_data CHECK ((((numero_acte IS NOT NULL) AND ((numero_acte)::text <> ''::text)) OR ((chemin_document IS NOT NULL) AND ((chemin_document)::text <> ''::text)))),
    CONSTRAINT decisions_type_check CHECK (((type)::text = ANY (ARRAY[('collective'::character varying)::text, ('individuelle'::character varying)::text])))
);


ALTER TABLE public.decisions OWNER TO isegroup_tourisme;

--
-- Name: TABLE decisions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.decisions IS 'Table pour gérer les décisions collectives et individuelles de cessation de service';


--
-- Name: COLUMN decisions.type; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.type IS 'Type de décision: collective (agents simples) ou individuelle (directeurs/sous-directeurs)';


--
-- Name: COLUMN decisions.numero_acte; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.numero_acte IS 'Numéro de l''acte de décision';


--
-- Name: COLUMN decisions.chemin_document; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.chemin_document IS 'Chemin vers le document uploadé';


--
-- Name: COLUMN decisions.date_decision; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.date_decision IS 'Date de la décision';


--
-- Name: COLUMN decisions.is_active; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.is_active IS 'Indique si la décision est active (une seule décision active par type)';


--
-- Name: COLUMN decisions.id_direction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.id_direction IS 'ID de la direction concernée par la décision collective (si applicable)';


--
-- Name: COLUMN decisions.id_sous_direction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.id_sous_direction IS 'ID de la sous-direction concernée par la décision collective (si applicable)';


--
-- Name: COLUMN decisions.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.id_agent IS 'ID de l''agent concerné par la décision individuelle (directeur, sous-directeur, DRH, etc.)';


--
-- Name: COLUMN decisions.annee_decision; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions.annee_decision IS 'Année de la décision (pour la génération du numéro, année en cours ou 2 années précédentes)';


--
-- Name: decisions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.decisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.decisions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: decisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.decisions_id_seq OWNED BY public.decisions.id;


--
-- Name: decisions_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.decisions_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_agent integer,
    numero_decision character varying(50) NOT NULL,
    type_decision character varying(50) NOT NULL,
    objet text NOT NULL,
    date_decision date NOT NULL,
    date_effet date,
    signataire character varying(200),
    contenu text,
    fichier_url character varying(500),
    statut character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.decisions_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE decisions_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.decisions_institutions IS 'Décisions administratives concernant les agents d''institutions';


--
-- Name: COLUMN decisions_institutions.type_decision; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions_institutions.type_decision IS 'nomination, affectation, promotion, sanction, etc.';


--
-- Name: COLUMN decisions_institutions.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.decisions_institutions.statut IS 'active, annulee, suspendue';


--
-- Name: decisions_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.decisions_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.decisions_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: decisions_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.decisions_institutions_id_seq OWNED BY public.decisions_institutions.id;


--
-- Name: demandes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.demandes (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    type_demande character varying(50) NOT NULL,
    description text,
    date_debut date,
    date_fin date,
    lieu character varying(255),
    status character varying(20) DEFAULT 'en_attente'::character varying,
    niveau_evolution_demande character varying(30) DEFAULT 'soumis'::character varying,
    id_chef_service integer,
    id_drh integer,
    id_directeur integer,
    id_ministre integer,
    statut_chef_service character varying(20) DEFAULT 'en_attente'::character varying,
    statut_drh character varying(20) DEFAULT 'en_attente'::character varying,
    statut_directeur character varying(20) DEFAULT 'en_attente'::character varying,
    statut_ministre character varying(20) DEFAULT 'en_attente'::character varying,
    date_validation_chef_service timestamp without time zone,
    date_validation_drh timestamp without time zone,
    date_validation_directeur timestamp without time zone,
    date_validation_ministre timestamp without time zone,
    commentaire_chef_service text,
    commentaire_drh text,
    commentaire_directeur text,
    commentaire_ministre text,
    niveau_actuel character varying(20) DEFAULT 'chef_service'::character varying,
    priorite character varying(20) DEFAULT 'normale'::character varying,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_modification timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    commentaires text,
    documents_joints jsonb,
    created_by integer,
    updated_by integer,
    phase_actuelle character varying(20) DEFAULT 'aller'::character varying,
    phase character varying(20) DEFAULT 'aller'::character varying,
    statut_sous_directeur character varying(50) DEFAULT NULL::character varying,
    date_validation_sous_directeur timestamp without time zone,
    commentaire_sous_directeur text,
    id_validateur_sous_directeur integer,
    id_validateur_directeur integer,
    statut_dir_cabinet character varying(50) DEFAULT NULL::character varying,
    date_validation_dir_cabinet timestamp without time zone,
    commentaire_dir_cabinet text,
    id_validateur_dir_cabinet integer,
    statut_chef_cabinet character varying(50),
    date_validation_chef_cabinet timestamp without time zone,
    commentaire_chef_cabinet text,
    id_validateur_chef_cabinet integer,
    statut_directeur_general character varying(50),
    date_validation_directeur_general timestamp without time zone,
    commentaire_directeur_general text,
    id_validateur_directeur_general integer,
    statut_directeur_central character varying(50),
    date_validation_directeur_central timestamp without time zone,
    commentaire_directeur_central text,
    id_validateur_directeur_central integer,
    motif text,
    date_cessation date,
    agree_motif text,
    agree_date_cessation date,
    motif_conge character varying(100),
    nombre_jours integer,
    raison_exceptionnelle text,
    jours_restants_apres_deduction integer,
    date_reprise_service date,
    date_fin_conges date,
    annee_non_jouissance_conge integer,
    annee_au_titre_conge integer,
    CONSTRAINT demandes_niveau_actuel_check CHECK (((niveau_actuel)::text = ANY (ARRAY[('soumis'::character varying)::text, ('chef_service'::character varying)::text, ('sous_directeur'::character varying)::text, ('directeur'::character varying)::text, ('drh'::character varying)::text, ('dir_cabinet'::character varying)::text, ('chef_cabinet'::character varying)::text, ('directeur_central'::character varying)::text, ('directeur_general'::character varying)::text, ('ministre'::character varying)::text, ('finalise'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_niveau_evolution_demande_check CHECK (((niveau_evolution_demande)::text = ANY (ARRAY[('soumis'::character varying)::text, ('valide_par_superieur'::character varying)::text, ('valide_par_chef_service'::character varying)::text, ('valide_par_sous_directeur'::character varying)::text, ('valide_par_directeur'::character varying)::text, ('valide_par_drh'::character varying)::text, ('valide_par_dir_cabinet'::character varying)::text, ('valide_par_chef_cabinet'::character varying)::text, ('valide_par_directeur_central'::character varying)::text, ('valide_par_directeur_general'::character varying)::text, ('valide_par_ministre'::character varying)::text, ('retour_ministre'::character varying)::text, ('retour_directeur_general'::character varying)::text, ('retour_directeur_central'::character varying)::text, ('retour_chef_cabinet'::character varying)::text, ('retour_dir_cabinet'::character varying)::text, ('retour_drh'::character varying)::text, ('retour_directeur'::character varying)::text, ('retour_sous_directeur'::character varying)::text, ('retour_chef_service'::character varying)::text, ('finalise'::character varying)::text, ('rejete'::character varying)::text, ('rejete_par_chef_service'::character varying)::text, ('rejete_par_sous_directeur'::character varying)::text, ('rejete_par_directeur'::character varying)::text, ('rejete_par_drh'::character varying)::text, ('rejete_par_dir_cabinet'::character varying)::text, ('rejete_par_chef_cabinet'::character varying)::text, ('rejete_par_directeur_central'::character varying)::text, ('rejete_par_directeur_general'::character varying)::text, ('rejete_par_ministre'::character varying)::text]))),
    CONSTRAINT demandes_phase_actuelle_check CHECK (((phase_actuelle)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_phase_check CHECK (((phase)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('normale'::character varying)::text, ('urgente'::character varying)::text, ('critique'::character varying)::text]))),
    CONSTRAINT demandes_status_check CHECK (((status)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_chef_service_check CHECK (((statut_chef_service)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_directeur_check CHECK (((statut_directeur)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_drh_check CHECK (((statut_drh)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_ministre_check CHECK (((statut_ministre)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_type_demande_check CHECK (((type_demande)::text = ANY (ARRAY[('absence'::character varying)::text, ('sortie_territoire'::character varying)::text, ('attestation_travail'::character varying)::text, ('attestation_presence'::character varying)::text, ('note_service'::character varying)::text, ('certificat_cessation'::character varying)::text, ('certificat_reprise_service'::character varying)::text, ('certificat_non_jouissance_conge'::character varying)::text, ('mutation'::character varying)::text])))
);


ALTER TABLE public.demandes OWNER TO isegroup_tourisme;

--
-- Name: COLUMN demandes.motif; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.motif IS 'Motif de cessation de service pour les certificats de cessation (démission, retraite, licenciement, etc.)';


--
-- Name: COLUMN demandes.date_cessation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.date_cessation IS 'Date de cessation de service pour les certificats de cessation';


--
-- Name: COLUMN demandes.motif_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.motif_conge IS 'Motif du congé: congé annuel, congé de paternité, congé de maternité, congé partiel, congé exceptionnel';


--
-- Name: COLUMN demandes.nombre_jours; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.nombre_jours IS 'Nombre de jours de congé demandés (jours ouvrés)';


--
-- Name: COLUMN demandes.raison_exceptionnelle; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.raison_exceptionnelle IS 'Raison justifiant le congé exceptionnel (si motif = congé exceptionnel)';


--
-- Name: COLUMN demandes.jours_restants_apres_deduction; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.jours_restants_apres_deduction IS 'Jours restants après déduction de ce congé (peut être négatif pour congés exceptionnels)';


--
-- Name: COLUMN demandes.date_reprise_service; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.date_reprise_service IS 'Date de reprise de service pour les certificats de reprise de service';


--
-- Name: COLUMN demandes.date_fin_conges; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.date_fin_conges IS 'Date de fin de congés pour les certificats de reprise de service';


--
-- Name: COLUMN demandes.annee_non_jouissance_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.annee_non_jouissance_conge IS 'Année pour laquelle l''agent n''a pas joui de ses congés (pour les demandes de type certificat_non_jouissance_conge)';


--
-- Name: COLUMN demandes.annee_au_titre_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes.annee_au_titre_conge IS 'Année au titre de laquelle le congé est demandé (congé annuel). Utilisée pour sélectionner le numéro de décision affiché sur le certificat.';


--
-- Name: demandes_historique; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.demandes_historique (
    id integer NOT NULL,
    id_demande integer NOT NULL,
    ancien_status character varying(20),
    nouveau_status character varying(20),
    ancien_niveau character varying(30),
    nouveau_niveau character varying(30),
    commentaire_modification text,
    modifie_par integer,
    date_modification timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.demandes_historique OWNER TO isegroup_tourisme;

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.demandes_historique_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.demandes_historique_id_seq OWNER TO isegroup_tourisme;

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.demandes_historique_id_seq OWNED BY public.demandes_historique.id;


--
-- Name: demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.demandes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.demandes_id_seq OWNED BY public.demandes.id;


--
-- Name: demandes_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.demandes_institutions (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_institution integer,
    type_demande character varying(50) NOT NULL,
    description text,
    date_debut date,
    date_fin date,
    nombre_jours integer,
    lieu character varying(255),
    status character varying(20) DEFAULT 'en_attente'::character varying,
    niveau_evolution_demande character varying(30) DEFAULT 'soumis'::character varying,
    id_chef_service integer,
    id_sous_directeur integer,
    id_directeur integer,
    id_drh integer,
    id_president integer,
    statut_chef_service character varying(20) DEFAULT 'en_attente'::character varying,
    statut_sous_directeur character varying(20) DEFAULT 'en_attente'::character varying,
    statut_directeur character varying(20) DEFAULT 'en_attente'::character varying,
    statut_drh character varying(20) DEFAULT 'en_attente'::character varying,
    statut_president character varying(20) DEFAULT 'en_attente'::character varying,
    date_validation_chef_service timestamp without time zone,
    date_validation_sous_directeur timestamp without time zone,
    date_validation_directeur timestamp without time zone,
    date_validation_drh timestamp without time zone,
    date_validation_president timestamp without time zone,
    commentaire_chef_service text,
    commentaire_sous_directeur text,
    commentaire_directeur text,
    commentaire_drh text,
    commentaire_president text,
    niveau_actuel character varying(20) DEFAULT 'chef_service'::character varying,
    priorite character varying(20) DEFAULT 'normale'::character varying,
    phase character varying(20) DEFAULT 'aller'::character varying,
    documents_joints jsonb,
    created_by integer,
    updated_by integer,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_modification timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    motif_conge character varying(100),
    raison_exceptionnelle text,
    jours_restants_avant_deduction integer,
    jours_restants_apres_deduction integer,
    solde_negatif integer DEFAULT 0,
    pays_destination character varying(100),
    ville_destination character varying(100),
    objet_mission text
);


ALTER TABLE public.demandes_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE demandes_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.demandes_institutions IS 'Demandes des agents d''institutions (congés, autorisations, missions, etc.)';


--
-- Name: COLUMN demandes_institutions.type_demande; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes_institutions.type_demande IS 'Type: conge, autorisation_absence, sortie_territoire, mission, etc.';


--
-- Name: COLUMN demandes_institutions.status; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes_institutions.status IS 'Status global: en_attente, validee, rejetee, annulee';


--
-- Name: COLUMN demandes_institutions.niveau_actuel; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes_institutions.niveau_actuel IS 'Niveau actuel de validation: chef_service, sous_directeur, directeur, drh, president';


--
-- Name: COLUMN demandes_institutions.phase; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.demandes_institutions.phase IS 'Phase du workflow: aller (validation) ou retour (après validation finale)';


--
-- Name: demandes_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.demandes_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.demandes_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: demandes_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.demandes_institutions_id_seq OWNED BY public.demandes_institutions.id;


--
-- Name: departements; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.departements (
    id integer NOT NULL,
    id_region integer,
    code character varying(10) NOT NULL,
    libele character varying(100) NOT NULL,
    chef_lieu character varying(100),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departements OWNER TO isegroup_tourisme;

--
-- Name: TABLE departements; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.departements IS 'Table des départements avec référence aux régions';


--
-- Name: COLUMN departements.code; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.departements.code IS 'Code unique du département (ex: ABJ-01)';


--
-- Name: departements_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.departements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departements_id_seq OWNER TO isegroup_tourisme;

--
-- Name: departements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.departements_id_seq OWNED BY public.departements.id;


--
-- Name: diplomes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.diplomes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    type_de_diplome character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.diplomes OWNER TO isegroup_tourisme;

--
-- Name: diplomes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.diplomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.diplomes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: diplomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.diplomes_id_seq OWNED BY public.diplomes.id;


--
-- Name: direction_generale; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.direction_generale (
    id integer NOT NULL,
    id_ministere integer NOT NULL,
    libelle character varying(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.direction_generale OWNER TO isegroup_tourisme;

--
-- Name: direction_generale_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.direction_generale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.direction_generale_id_seq OWNER TO isegroup_tourisme;

--
-- Name: direction_generale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.direction_generale_id_seq OWNED BY public.direction_generale.id;


--
-- Name: directions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.directions (
    id integer NOT NULL,
    id_ministere integer,
    id_direction_generale integer,
    code character varying(50),
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responsable_id integer,
    description text,
    is_active boolean DEFAULT true
);


ALTER TABLE public.directions OWNER TO isegroup_tourisme;

--
-- Name: TABLE directions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.directions IS 'Table des directions du ministère';


--
-- Name: directions_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.directions_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    code character varying(20),
    description text,
    responsable_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.directions_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE directions_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.directions_institutions IS 'Directions des institutions (équivalent directions pour ministères)';


--
-- Name: COLUMN directions_institutions.responsable_id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.directions_institutions.responsable_id IS 'ID de l''agent responsable (directeur)';


--
-- Name: directions_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.directions_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directions_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: directions_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.directions_institutions_id_seq OWNED BY public.directions_institutions.id;


--
-- Name: distinctions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.distinctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nature character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.distinctions OWNER TO isegroup_tourisme;

--
-- Name: distinctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.distinctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.distinctions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: distinctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.distinctions_id_seq OWNED BY public.distinctions.id;


--
-- Name: documents_autorisation; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.documents_autorisation (
    id integer NOT NULL,
    id_demande integer,
    type_document character varying(50) NOT NULL,
    titre character varying(255) NOT NULL,
    contenu text NOT NULL,
    chemin_fichier character varying(500),
    statut character varying(20) DEFAULT 'generé'::character varying,
    date_generation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_envoi timestamp without time zone,
    date_signature timestamp without time zone,
    id_agent_generateur integer,
    id_agent_destinataire integer,
    commentaires text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_transmission timestamp without time zone,
    date_reception timestamp without time zone,
    commentaire_transmission text,
    id_agent_transmetteur integer,
    motif_cessation text,
    date_cessation date,
    CONSTRAINT documents_autorisation_type_document_check CHECK (((type_document)::text = ANY (ARRAY[('autorisation_absence'::character varying)::text, ('autorisation_sortie_territoire'::character varying)::text, ('attestation_presence'::character varying)::text, ('attestation_travail'::character varying)::text, ('certificat_cessation'::character varying)::text, ('certificat_reprise_service'::character varying)::text, ('certificat_non_jouissance_conge'::character varying)::text, ('certificat_prise_service'::character varying)::text, ('note_de_service'::character varying)::text, ('note_de_service_mutation'::character varying)::text])))
);


ALTER TABLE public.documents_autorisation OWNER TO isegroup_tourisme;

--
-- Name: TABLE documents_autorisation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.documents_autorisation IS 'Documents générés automatiquement lors de la validation des demandes';


--
-- Name: COLUMN documents_autorisation.type_document; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.type_document IS 'Type de document: autorisation_absence, autorisation_sortie, etc.';


--
-- Name: COLUMN documents_autorisation.contenu; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.contenu IS 'Contenu du document en HTML ou JSON structuré';


--
-- Name: COLUMN documents_autorisation.chemin_fichier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.chemin_fichier IS 'Chemin vers le fichier PDF généré (optionnel)';


--
-- Name: COLUMN documents_autorisation.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.statut IS 'Statut du document: generé, envoyé, signé';


--
-- Name: COLUMN documents_autorisation.motif_cessation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.motif_cessation IS 'Motif de cessation de service (pour les certificats de cessation générés sans demande)';


--
-- Name: COLUMN documents_autorisation.date_cessation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.documents_autorisation.date_cessation IS 'Date de cessation de service (pour les certificats de cessation générés sans demande)';


--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.documents_autorisation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_autorisation_id_seq OWNER TO isegroup_tourisme;

--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.documents_autorisation_id_seq OWNED BY public.documents_autorisation.id;


--
-- Name: dossiers; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.dossiers (
    id integer NOT NULL,
    id_ministere integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dossiers OWNER TO isegroup_tourisme;

--
-- Name: dossiers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.dossiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dossiers_id_seq OWNER TO isegroup_tourisme;

--
-- Name: dossiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.dossiers_id_seq OWNED BY public.dossiers.id;


--
-- Name: dossiers_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.dossiers_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dossiers_institutions OWNER TO isegroup_tourisme;

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.dossiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dossiers_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.dossiers_institutions_id_seq OWNED BY public.dossiers_institutions.id;


--
-- Name: echelons; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.echelons (
    id integer NOT NULL,
    indice character varying(20),
    salaire_net numeric(10,2),
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_prefectoral boolean DEFAULT false
);


ALTER TABLE public.echelons OWNER TO isegroup_tourisme;

--
-- Name: COLUMN echelons.indice; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons.indice IS 'Indice de l''échelon (optionnel)';


--
-- Name: COLUMN echelons.salaire_net; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons.salaire_net IS 'Salaire net de l''échelon (optionnel)';


--
-- Name: COLUMN echelons.libele; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons.libele IS 'Libellé de l''échelon (obligatoire)';


--
-- Name: COLUMN echelons.is_prefectoral; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons.is_prefectoral IS 'Indique si l''échelon est un échelon préfectoral';


--
-- Name: echelons_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.echelons_agents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_echelon integer NOT NULL,
    id_nomination integer,
    date_entree date NOT NULL,
    date_sortie date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.echelons_agents OWNER TO isegroup_tourisme;

--
-- Name: TABLE echelons_agents; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.echelons_agents IS 'Table de suivi de l''historique des échelons des agents';


--
-- Name: COLUMN echelons_agents.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.id IS 'Identifiant unique de l''enregistrement';


--
-- Name: COLUMN echelons_agents.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN echelons_agents.id_echelon; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.id_echelon IS 'Référence vers l''échelon';


--
-- Name: COLUMN echelons_agents.id_nomination; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';


--
-- Name: COLUMN echelons_agents.date_entree; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.date_entree IS 'Date d''entrée dans cet échelon';


--
-- Name: COLUMN echelons_agents.date_sortie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.date_sortie IS 'Date de sortie de cet échelon (optionnelle)';


--
-- Name: COLUMN echelons_agents.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN echelons_agents.updated_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.echelons_agents.updated_at IS 'Date de dernière modification';


--
-- Name: echelons_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.echelons_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.echelons_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: echelons_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.echelons_agents_id_seq OWNED BY public.echelons_agents.id;


--
-- Name: echelons_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.echelons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.echelons_id_seq OWNER TO isegroup_tourisme;

--
-- Name: echelons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.echelons_id_seq OWNED BY public.echelons.id;


--
-- Name: emploi_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.emploi_agents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_nomination integer NOT NULL,
    date_entree date NOT NULL,
    designation_poste text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_emploi integer
);


ALTER TABLE public.emploi_agents OWNER TO isegroup_tourisme;

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.emploi_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emploi_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.emploi_agents_id_seq OWNED BY public.emploi_agents.id;


--
-- Name: emplois; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.emplois (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    libele_court character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_ministere integer
);


ALTER TABLE public.emplois OWNER TO isegroup_tourisme;

--
-- Name: COLUMN emplois.id_ministere; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.emplois.id_ministere IS 'Ministère de rattachement (null = commun à tous)';


--
-- Name: emplois_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.emplois_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emplois_id_seq OWNER TO isegroup_tourisme;

--
-- Name: emplois_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.emplois_id_seq OWNED BY public.emplois.id;


--
-- Name: enfants; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.enfants (
    id integer NOT NULL,
    id_agent integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    sexe character(1),
    date_de_naissance date NOT NULL,
    scolarise boolean DEFAULT false,
    ayant_droit boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT enfants_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);


ALTER TABLE public.enfants OWNER TO isegroup_tourisme;

--
-- Name: enfants_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.enfants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.enfants_id_seq OWNER TO isegroup_tourisme;

--
-- Name: enfants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.enfants_id_seq OWNED BY public.enfants.id;


--
-- Name: enfants_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.enfants_institutions (
    id integer NOT NULL,
    id_agent integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    sexe character(1),
    date_de_naissance date NOT NULL,
    scolarise boolean DEFAULT false,
    ayant_droit boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT enfants_institutions_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);


ALTER TABLE public.enfants_institutions OWNER TO isegroup_tourisme;

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.enfants_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.enfants_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.enfants_institutions_id_seq OWNED BY public.enfants_institutions.id;


--
-- Name: entites_administratives; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.entites_administratives (
    id integer NOT NULL,
    id_ministere integer,
    id_entite_parent integer,
    code character varying(20) NOT NULL,
    nom character varying(200) NOT NULL,
    sigle character varying(20),
    description text,
    type_entite character varying(50),
    niveau_hierarchique integer DEFAULT 1,
    adresse text,
    telephone character varying(20),
    email character varying(255),
    responsable_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_region integer,
    id_departement integer,
    id_localite integer,
    CONSTRAINT chk_niveau_hierarchique CHECK (((niveau_hierarchique >= 1) AND (niveau_hierarchique <= 10))),
    CONSTRAINT entites_administratives_type_entite_check CHECK (((type_entite)::text = ANY (ARRAY[('direction'::character varying)::text, ('departement'::character varying)::text, ('service'::character varying)::text, ('bureau'::character varying)::text, ('division'::character varying)::text])))
);


ALTER TABLE public.entites_administratives OWNER TO isegroup_tourisme;

--
-- Name: COLUMN entites_administratives.id_region; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.entites_administratives.id_region IS 'Région d''implantation de l''entité administrative';


--
-- Name: COLUMN entites_administratives.id_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.entites_administratives.id_departement IS 'Département d''implantation de l''entité administrative';


--
-- Name: entites_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.entites_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entites_administratives_id_seq OWNER TO isegroup_tourisme;

--
-- Name: entites_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.entites_administratives_id_seq OWNED BY public.entites_administratives.id;


--
-- Name: entites_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.entites_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_entite_parent integer,
    code character varying(20) NOT NULL,
    nom character varying(200) NOT NULL,
    sigle character varying(20),
    description text,
    type_entite character varying(50),
    niveau_hierarchique integer DEFAULT 1,
    adresse text,
    telephone character varying(20),
    email character varying(255),
    responsable_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_region integer,
    id_departement integer,
    id_localite integer,
    CONSTRAINT chk_niveau_hierarchique CHECK (((niveau_hierarchique >= 1) AND (niveau_hierarchique <= 10))),
    CONSTRAINT entites_institutions_type_entite_check CHECK (((type_entite)::text = ANY (ARRAY[('direction'::character varying)::text, ('departement'::character varying)::text, ('service'::character varying)::text, ('bureau'::character varying)::text, ('division'::character varying)::text])))
);


ALTER TABLE public.entites_institutions OWNER TO isegroup_tourisme;

--
-- Name: COLUMN entites_institutions.id_region; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.entites_institutions.id_region IS 'Région d''implantation de l''entité institution';


--
-- Name: COLUMN entites_institutions.id_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.entites_institutions.id_departement IS 'Département d''implantation de l''entité institution';


--
-- Name: entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entites_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.entites_institutions_id_seq OWNED BY public.entites_institutions.id;


--
-- Name: etude_diplome; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.etude_diplome (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    diplome character varying(300) NOT NULL,
    ecole character varying(200) NOT NULL,
    ville character varying(100) NOT NULL,
    pays character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_agent_document integer,
    options character varying(255),
    date_diplome integer NOT NULL
);


ALTER TABLE public.etude_diplome OWNER TO isegroup_tourisme;

--
-- Name: TABLE etude_diplome; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.etude_diplome IS 'Historique des études et diplômes des agents';


--
-- Name: COLUMN etude_diplome.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.id IS 'Identifiant unique du diplôme';


--
-- Name: COLUMN etude_diplome.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN etude_diplome.diplome; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.diplome IS 'Nom du diplôme obtenu';


--
-- Name: COLUMN etude_diplome.ecole; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.ecole IS 'École ou université';


--
-- Name: COLUMN etude_diplome.ville; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.ville IS 'Ville de l''école';


--
-- Name: COLUMN etude_diplome.pays; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.pays IS 'Pays de l''école';


--
-- Name: COLUMN etude_diplome.id_agent_document; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.id_agent_document IS 'Référence vers le document uploadé dans agent_documents';


--
-- Name: COLUMN etude_diplome.options; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.options IS 'Options ou informations supplémentaires sur le diplôme';


--
-- Name: COLUMN etude_diplome.date_diplome; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.etude_diplome.date_diplome IS 'Année d''obtention du diplôme';


--
-- Name: etude_diplome_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.etude_diplome_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.etude_diplome_id_seq OWNER TO isegroup_tourisme;

--
-- Name: etude_diplome_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.etude_diplome_id_seq OWNED BY public.etude_diplome.id;


--
-- Name: evenements; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.evenements (
    id integer NOT NULL,
    titre character varying(255) NOT NULL,
    description text,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    lieu character varying(255) NOT NULL,
    organisateur character varying(255),
    id_entite integer,
    type_organisme character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT evenements_type_organisme_check CHECK (((type_organisme)::text = ANY (ARRAY[('ministere'::character varying)::text, ('entite'::character varying)::text])))
);


ALTER TABLE public.evenements OWNER TO isegroup_tourisme;

--
-- Name: evenements_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.evenements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.evenements_id_seq OWNER TO isegroup_tourisme;

--
-- Name: evenements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.evenements_id_seq OWNED BY public.evenements.id;


--
-- Name: fonction_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.fonction_agents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_nomination integer NOT NULL,
    date_entree date NOT NULL,
    designation_poste text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_fonction integer
);


ALTER TABLE public.fonction_agents OWNER TO isegroup_tourisme;

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.fonction_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fonction_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.fonction_agents_id_seq OWNED BY public.fonction_agents.id;


--
-- Name: fonctions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.fonctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nbr_agent integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_ministere integer
);


ALTER TABLE public.fonctions OWNER TO isegroup_tourisme;

--
-- Name: COLUMN fonctions.id_ministere; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.fonctions.id_ministere IS 'Ministère de rattachement (null = commun à tous)';


--
-- Name: fonctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.fonctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fonctions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: fonctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.fonctions_id_seq OWNED BY public.fonctions.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_prefectoral boolean DEFAULT false,
    id_categorie integer
);


ALTER TABLE public.grades OWNER TO isegroup_tourisme;

--
-- Name: TABLE grades; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.grades IS 'Table des grades simplifiée - ne contient que le libellé';


--
-- Name: COLUMN grades.libele; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades.libele IS 'Libellé du grade (obligatoire)';


--
-- Name: COLUMN grades.is_prefectoral; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades.is_prefectoral IS 'Indique si le grade est un grade préfectoral (HG, GI, GII, GIII)';


--
-- Name: COLUMN grades.id_categorie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades.id_categorie IS 'Référence vers la catégorie associée au grade';


--
-- Name: grades_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.grades_agents (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_grade integer NOT NULL,
    id_nomination integer,
    date_entree date NOT NULL,
    date_sortie date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grades_agents OWNER TO isegroup_tourisme;

--
-- Name: TABLE grades_agents; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.grades_agents IS 'Table de suivi de l''historique des grades des agents';


--
-- Name: COLUMN grades_agents.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.id IS 'Identifiant unique de l''enregistrement';


--
-- Name: COLUMN grades_agents.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN grades_agents.id_grade; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.id_grade IS 'Référence vers le grade';


--
-- Name: COLUMN grades_agents.id_nomination; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';


--
-- Name: COLUMN grades_agents.date_entree; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.date_entree IS 'Date d''entrée dans ce grade';


--
-- Name: COLUMN grades_agents.date_sortie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.date_sortie IS 'Date de sortie de ce grade (optionnelle)';


--
-- Name: COLUMN grades_agents.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN grades_agents.updated_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.grades_agents.updated_at IS 'Date de dernière modification';


--
-- Name: grades_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.grades_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grades_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: grades_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.grades_agents_id_seq OWNED BY public.grades_agents.id;


--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grades_id_seq OWNER TO isegroup_tourisme;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: handicaps; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.handicaps (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.handicaps OWNER TO isegroup_tourisme;

--
-- Name: handicaps_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.handicaps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.handicaps_id_seq OWNER TO isegroup_tourisme;

--
-- Name: handicaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.handicaps_id_seq OWNED BY public.handicaps.id;


--
-- Name: historique_retrait_restauration; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.historique_retrait_restauration (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    type_action character varying(20) NOT NULL,
    motif text,
    date_action timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT historique_retrait_restauration_type_action_check CHECK (((type_action)::text = ANY (ARRAY[('retrait'::character varying)::text, ('restauration'::character varying)::text])))
);


ALTER TABLE public.historique_retrait_restauration OWNER TO isegroup_tourisme;

--
-- Name: TABLE historique_retrait_restauration; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.historique_retrait_restauration IS 'Historique complet de tous les retraits et restaurations d''agents';


--
-- Name: COLUMN historique_retrait_restauration.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.historique_retrait_restauration.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN historique_retrait_restauration.type_action; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.historique_retrait_restauration.type_action IS 'Type d''action: retrait ou restauration';


--
-- Name: COLUMN historique_retrait_restauration.motif; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.historique_retrait_restauration.motif IS 'Motif de l''action (retrait ou restauration)';


--
-- Name: COLUMN historique_retrait_restauration.date_action; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.historique_retrait_restauration.date_action IS 'Date et heure exacte de l''action';


--
-- Name: historique_retrait_restauration_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.historique_retrait_restauration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.historique_retrait_restauration_id_seq OWNER TO isegroup_tourisme;

--
-- Name: historique_retrait_restauration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.historique_retrait_restauration_id_seq OWNED BY public.historique_retrait_restauration.id;


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.institutions (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    nom character varying(200) NOT NULL,
    sigle character varying(20),
    description text,
    adresse text,
    telephone character varying(20),
    email character varying(255),
    website character varying(255),
    logo_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_region integer,
    id_departement integer,
    id_localite integer
);


ALTER TABLE public.institutions OWNER TO isegroup_tourisme;

--
-- Name: COLUMN institutions.id_region; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.institutions.id_region IS 'Région d''implantation de l''institution';


--
-- Name: COLUMN institutions.id_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.institutions.id_departement IS 'Département d''implantation de l''institution';


--
-- Name: institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;


--
-- Name: jours_feries; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.jours_feries (
    id integer NOT NULL,
    date_feriee date NOT NULL,
    libelle character varying(255) NOT NULL,
    type_ferie character varying(50) DEFAULT 'national'::character varying,
    est_fixe boolean DEFAULT true,
    annee integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.jours_feries OWNER TO isegroup_tourisme;

--
-- Name: TABLE jours_feries; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.jours_feries IS 'Table pour gérer les jours fériés de Côte d''Ivoire (exclus du calcul des jours de congés)';


--
-- Name: COLUMN jours_feries.date_feriee; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.jours_feries.date_feriee IS 'Date du jour férié';


--
-- Name: COLUMN jours_feries.libelle; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.jours_feries.libelle IS 'Libellé du jour férié';


--
-- Name: COLUMN jours_feries.type_ferie; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.jours_feries.type_ferie IS 'Type de jour férié (national, régional, religieux, etc.)';


--
-- Name: COLUMN jours_feries.est_fixe; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.jours_feries.est_fixe IS 'Indique si le jour férié est fixe (même date chaque année) ou mobile';


--
-- Name: COLUMN jours_feries.annee; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.jours_feries.annee IS 'Année spécifique pour les jours mobiles, NULL pour les jours fixes annuels';


--
-- Name: jours_feries_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.jours_feries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.jours_feries_id_seq OWNER TO isegroup_tourisme;

--
-- Name: jours_feries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.jours_feries_id_seq OWNED BY public.jours_feries.id;


--
-- Name: langues; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.langues (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.langues OWNER TO isegroup_tourisme;

--
-- Name: langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.langues_id_seq OWNER TO isegroup_tourisme;

--
-- Name: langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.langues_id_seq OWNED BY public.langues.id;


--
-- Name: localites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.localites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_departement integer,
    code character varying(20) DEFAULT '1001'::character varying,
    type_localite character varying(50),
    description text,
    is_active boolean DEFAULT true,
    CONSTRAINT localites_type_localite_check CHECK (((type_localite)::text = ANY (ARRAY[('commune'::character varying)::text, ('ville'::character varying)::text, ('village'::character varying)::text, ('quartier'::character varying)::text, ('secteur'::character varying)::text])))
);


ALTER TABLE public.localites OWNER TO isegroup_tourisme;

--
-- Name: localites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.localites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.localites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: localites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.localites_id_seq OWNED BY public.localites.id;


--
-- Name: logiciels; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.logiciels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logiciels OWNER TO isegroup_tourisme;

--
-- Name: logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.logiciels_id_seq OWNER TO isegroup_tourisme;

--
-- Name: logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.logiciels_id_seq OWNED BY public.logiciels.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    ip_address inet,
    success boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_attempts OWNER TO isegroup_tourisme;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_attempts_id_seq OWNER TO isegroup_tourisme;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: ministere_matricule_config; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.ministere_matricule_config (
    id_ministere integer NOT NULL,
    prefix character varying(50) NOT NULL,
    prochaine_sequence integer DEFAULT 1 NOT NULL,
    nb_chiffres integer DEFAULT 6 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ministere_matricule_config OWNER TO isegroup_tourisme;

--
-- Name: TABLE ministere_matricule_config; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.ministere_matricule_config IS 'Configuration de la génération du matricule des agents contractuels par ministère';


--
-- Name: COLUMN ministere_matricule_config.id_ministere; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministere_matricule_config.id_ministere IS 'ID du ministère';


--
-- Name: COLUMN ministere_matricule_config.prefix; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministere_matricule_config.prefix IS 'Préfixe du matricule (ex: M2, M10, CONTRAT)';


--
-- Name: COLUMN ministere_matricule_config.prochaine_sequence; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministere_matricule_config.prochaine_sequence IS 'Prochain numéro de séquence à attribuer';


--
-- Name: COLUMN ministere_matricule_config.nb_chiffres; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministere_matricule_config.nb_chiffres IS 'Nombre de chiffres pour la partie numérique (ex: 6 donne 000001)';


--
-- Name: ministeres; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.ministeres (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    nom character varying(200) NOT NULL,
    sigle character varying(20),
    description text,
    adresse text,
    telephone character varying(20),
    email character varying(255),
    website character varying(255),
    logo_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_region integer,
    id_departement integer,
    id_localite integer,
    responsable_id integer
);


ALTER TABLE public.ministeres OWNER TO isegroup_tourisme;

--
-- Name: COLUMN ministeres.id_region; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministeres.id_region IS 'Région d''implantation du ministère';


--
-- Name: COLUMN ministeres.id_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministeres.id_departement IS 'Département d''implantation du ministère';


--
-- Name: COLUMN ministeres.responsable_id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.ministeres.responsable_id IS 'Référence vers l''agent responsable (DRH) du ministère';


--
-- Name: ministeres_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.ministeres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ministeres_id_seq OWNER TO isegroup_tourisme;

--
-- Name: ministeres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.ministeres_id_seq OWNED BY public.ministeres.id;


--
-- Name: mode_d_entrees; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.mode_d_entrees (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mode_d_entrees OWNER TO isegroup_tourisme;

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.mode_d_entrees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mode_d_entrees_id_seq OWNER TO isegroup_tourisme;

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.mode_d_entrees_id_seq OWNED BY public.mode_d_entrees.id;


--
-- Name: motif_de_departs; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.motif_de_departs (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.motif_de_departs OWNER TO isegroup_tourisme;

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.motif_de_departs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.motif_de_departs_id_seq OWNER TO isegroup_tourisme;

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.motif_de_departs_id_seq OWNED BY public.motif_de_departs.id;


--
-- Name: nationalites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.nationalites (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nationalites OWNER TO isegroup_tourisme;

--
-- Name: nationalites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.nationalites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nationalites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: nationalites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.nationalites_id_seq OWNED BY public.nationalites.id;


--
-- Name: nature_actes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.nature_actes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nature_actes OWNER TO isegroup_tourisme;

--
-- Name: nature_actes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.nature_actes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nature_actes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: nature_actes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.nature_actes_id_seq OWNED BY public.nature_actes.id;


--
-- Name: nature_d_accidents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.nature_d_accidents (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nature_d_accidents OWNER TO isegroup_tourisme;

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.nature_d_accidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nature_d_accidents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.nature_d_accidents_id_seq OWNED BY public.nature_d_accidents.id;


--
-- Name: niveau_informatiques; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.niveau_informatiques (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.niveau_informatiques OWNER TO isegroup_tourisme;

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.niveau_informatiques_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.niveau_informatiques_id_seq OWNER TO isegroup_tourisme;

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.niveau_informatiques_id_seq OWNED BY public.niveau_informatiques.id;


--
-- Name: niveau_langues; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.niveau_langues (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.niveau_langues OWNER TO isegroup_tourisme;

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.niveau_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.niveau_langues_id_seq OWNER TO isegroup_tourisme;

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.niveau_langues_id_seq OWNED BY public.niveau_langues.id;


--
-- Name: nominations; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.nominations (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    nature character varying(200) NOT NULL,
    numero character varying(100) NOT NULL,
    date_signature date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type_nomination character varying(20) DEFAULT 'fonction'::character varying,
    statut character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT chk_statut_nomination CHECK (((statut)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('suspendue'::character varying)::text, ('terminee'::character varying)::text]))),
    CONSTRAINT chk_type_nomination CHECK (((type_nomination)::text = ANY (ARRAY[('fonction'::character varying)::text, ('emploi'::character varying)::text])))
);


ALTER TABLE public.nominations OWNER TO isegroup_tourisme;

--
-- Name: TABLE nominations; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.nominations IS 'Table des nominations des agents';


--
-- Name: COLUMN nominations.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.id IS 'Identifiant unique de la nomination';


--
-- Name: COLUMN nominations.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN nominations.nature; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.nature IS 'Nature de la nomination (ex: nomination, promotion, mutation, etc.)';


--
-- Name: COLUMN nominations.numero; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.numero IS 'Numéro de la nomination';


--
-- Name: COLUMN nominations.date_signature; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.date_signature IS 'Date de signature de la nomination';


--
-- Name: COLUMN nominations.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN nominations.updated_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.nominations.updated_at IS 'Date de dernière modification';


--
-- Name: nominations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.nominations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nominations_id_seq OWNER TO isegroup_tourisme;

--
-- Name: nominations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.nominations_id_seq OWNED BY public.nominations.id;


--
-- Name: notifications_demandes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.notifications_demandes (
    id integer NOT NULL,
    id_demande integer NOT NULL,
    id_agent_destinataire integer NOT NULL,
    type_notification character varying(30) NOT NULL,
    titre character varying(255) NOT NULL,
    message text NOT NULL,
    lu boolean DEFAULT false,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_lecture timestamp without time zone,
    CONSTRAINT notifications_demandes_type_notification_check CHECK (((type_notification)::text = ANY (ARRAY[('nouvelle_demande'::character varying)::text, ('demande_approuvee'::character varying)::text, ('demande_rejetee'::character varying)::text, ('demande_en_cours'::character varying)::text, ('demande_finalisee'::character varying)::text, ('rappel_validation'::character varying)::text, ('document_transmis'::character varying)::text, ('note_service'::character varying)::text, ('anniversaire_aujourdhui'::character varying)::text, ('anniversaire_avenir'::character varying)::text, ('mariage_30_jours'::character varying)::text, ('mariage_7_jours'::character varying)::text, ('mariage_3_jours'::character varying)::text, ('conges_previsionnel'::character varying)::text])))
);


ALTER TABLE public.notifications_demandes OWNER TO isegroup_tourisme;

--
-- Name: CONSTRAINT notifications_demandes_type_notification_check ON notifications_demandes; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON CONSTRAINT notifications_demandes_type_notification_check ON public.notifications_demandes IS 'Types de notification incluant les notifications de congés prévisionnels (1 mois avant la date de départ)';


--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.notifications_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_demandes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.notifications_demandes_id_seq OWNED BY public.notifications_demandes.id;


--
-- Name: pathologies; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.pathologies (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pathologies OWNER TO isegroup_tourisme;

--
-- Name: pathologies_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.pathologies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pathologies_id_seq OWNER TO isegroup_tourisme;

--
-- Name: pathologies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.pathologies_id_seq OWNED BY public.pathologies.id;


--
-- Name: pays; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.pays (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_nationalite integer
);


ALTER TABLE public.pays OWNER TO isegroup_tourisme;

--
-- Name: pays_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.pays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pays_id_seq OWNER TO isegroup_tourisme;

--
-- Name: pays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.pays_id_seq OWNED BY public.pays.id;


--
-- Name: permissions_entites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.permissions_entites (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions_entites OWNER TO isegroup_tourisme;

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.permissions_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_entites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.permissions_entites_id_seq OWNED BY public.permissions_entites.id;


--
-- Name: permissions_entites_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.permissions_entites_institutions (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions_entites_institutions OWNER TO isegroup_tourisme;

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.permissions_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_entites_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.permissions_entites_institutions_id_seq OWNED BY public.permissions_entites_institutions.id;


--
-- Name: planning_previsionnel_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.planning_previsionnel_institutions (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_institution integer,
    annee integer NOT NULL,
    trimestre integer,
    mois integer,
    date_debut_prevue date,
    date_fin_prevue date,
    nombre_jours_prevus integer,
    type_conge character varying(50) DEFAULT 'conge_annuel'::character varying,
    statut character varying(20) DEFAULT 'previsionnel'::character varying,
    commentaires text,
    valide_par integer,
    date_validation timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT planning_previsionnel_institutions_mois_check CHECK (((mois >= 1) AND (mois <= 12))),
    CONSTRAINT planning_previsionnel_institutions_trimestre_check CHECK (((trimestre >= 1) AND (trimestre <= 4)))
);


ALTER TABLE public.planning_previsionnel_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE planning_previsionnel_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.planning_previsionnel_institutions IS 'Planning prévisionnel des congés des agents d''institutions';


--
-- Name: COLUMN planning_previsionnel_institutions.type_conge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.planning_previsionnel_institutions.type_conge IS 'conge_annuel, conge_maladie, conge_maternite, etc.';


--
-- Name: COLUMN planning_previsionnel_institutions.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.planning_previsionnel_institutions.statut IS 'previsionnel, valide, realise, annule';


--
-- Name: planning_previsionnel_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.planning_previsionnel_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.planning_previsionnel_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: planning_previsionnel_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.planning_previsionnel_institutions_id_seq OWNED BY public.planning_previsionnel_institutions.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.positions OWNER TO isegroup_tourisme;

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.positions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: prolongements_retraite; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.prolongements_retraite (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    numero_acte character varying(255),
    nombre_annees integer,
    chemin_fichier character varying(500),
    nom_fichier character varying(255),
    taille_fichier bigint,
    type_fichier character varying(100),
    age_retraite_initial integer,
    age_retraite_prolonge integer,
    date_retraite_initial date,
    date_retraite_prolongee date,
    date_prolongement timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nature_acte character varying(100),
    date_acte date
);


ALTER TABLE public.prolongements_retraite OWNER TO isegroup_tourisme;

--
-- Name: TABLE prolongements_retraite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.prolongements_retraite IS 'Historique des prolongements de retraite des agents';


--
-- Name: COLUMN prolongements_retraite.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN prolongements_retraite.numero_acte; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.numero_acte IS 'Numéro de l''acte de prolongement';


--
-- Name: COLUMN prolongements_retraite.nombre_annees; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.nombre_annees IS 'Nombre d''années de prolongement';


--
-- Name: COLUMN prolongements_retraite.chemin_fichier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.chemin_fichier IS 'Chemin relatif du fichier uploadé';


--
-- Name: COLUMN prolongements_retraite.nom_fichier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.nom_fichier IS 'Nom original du fichier';


--
-- Name: COLUMN prolongements_retraite.taille_fichier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.taille_fichier IS 'Taille du fichier en octets';


--
-- Name: COLUMN prolongements_retraite.type_fichier; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.type_fichier IS 'Type MIME du fichier';


--
-- Name: COLUMN prolongements_retraite.age_retraite_initial; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.age_retraite_initial IS 'Âge de retraite avant le prolongement';


--
-- Name: COLUMN prolongements_retraite.age_retraite_prolonge; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.age_retraite_prolonge IS 'Nouvel âge de retraite après prolongement';


--
-- Name: COLUMN prolongements_retraite.date_retraite_initial; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.date_retraite_initial IS 'Date de retraite avant le prolongement';


--
-- Name: COLUMN prolongements_retraite.date_retraite_prolongee; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.date_retraite_prolongee IS 'Nouvelle date de retraite après prolongement';


--
-- Name: COLUMN prolongements_retraite.date_prolongement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.date_prolongement IS 'Date et heure du prolongement';


--
-- Name: COLUMN prolongements_retraite.nature_acte; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.nature_acte IS 'Nature de l''acte (DÉCRET, ARRÊTÉ, AUTRES, etc.) - toujours en majuscules';


--
-- Name: COLUMN prolongements_retraite.date_acte; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.prolongements_retraite.date_acte IS 'Date de l''acte de prolongement';


--
-- Name: prolongements_retraite_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.prolongements_retraite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.prolongements_retraite_id_seq OWNER TO isegroup_tourisme;

--
-- Name: prolongements_retraite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.prolongements_retraite_id_seq OWNED BY public.prolongements_retraite.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    libele character varying(100) NOT NULL,
    chef_lieu character varying(100),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.regions OWNER TO isegroup_tourisme;

--
-- Name: TABLE regions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.regions IS 'Table des régions administratives';


--
-- Name: COLUMN regions.code; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.regions.code IS 'Code unique de la région (ex: ABJ, YAM)';


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.regions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nom character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO isegroup_tourisme;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO isegroup_tourisme;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sanctions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.sanctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sanctions OWNER TO isegroup_tourisme;

--
-- Name: sanctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.sanctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sanctions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: sanctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.sanctions_id_seq OWNED BY public.sanctions.id;


--
-- Name: seminaire_formation; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.seminaire_formation (
    id integer NOT NULL,
    theme_seminaire character varying(500) NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    lieu character varying(300) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_entite integer,
    type_organisme character varying(20),
    CONSTRAINT seminaire_formation_type_organisme_check CHECK (((type_organisme)::text = ANY (ARRAY[('ministere'::character varying)::text, ('entite'::character varying)::text])))
);


ALTER TABLE public.seminaire_formation OWNER TO isegroup_tourisme;

--
-- Name: TABLE seminaire_formation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.seminaire_formation IS 'Table pour gérer les séminaires et formations suivis par les agents';


--
-- Name: COLUMN seminaire_formation.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.id IS 'Identifiant unique du séminaire';


--
-- Name: COLUMN seminaire_formation.theme_seminaire; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.theme_seminaire IS 'Thème ou titre du séminaire de formation';


--
-- Name: COLUMN seminaire_formation.date_debut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.date_debut IS 'Date de début du séminaire';


--
-- Name: COLUMN seminaire_formation.date_fin; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.date_fin IS 'Date de fin du séminaire';


--
-- Name: COLUMN seminaire_formation.lieu; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.lieu IS 'Lieu où s''est déroulé le séminaire';


--
-- Name: COLUMN seminaire_formation.id_entite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.id_entite IS 'Identifiant de l''entité ou ministère qui organise le séminaire';


--
-- Name: COLUMN seminaire_formation.type_organisme; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation.type_organisme IS 'Type d''organisme: ministere ou entite';


--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.seminaire_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_formation_id_seq OWNER TO isegroup_tourisme;

--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.seminaire_formation_id_seq OWNED BY public.seminaire_formation.id;


--
-- Name: seminaire_formation_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.seminaire_formation_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_type_seminaire integer,
    titre character varying(200) NOT NULL,
    description text,
    objectifs text,
    lieu character varying(200),
    date_debut date,
    date_fin date,
    duree_jours integer,
    nombre_participants_max integer,
    nombre_participants_inscrits integer DEFAULT 0,
    formateur character varying(200),
    organisme_formateur character varying(200),
    cout_total numeric(12,2),
    cout_par_participant numeric(12,2),
    statut character varying(20) DEFAULT 'planifie'::character varying,
    documents_joints jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seminaire_formation_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE seminaire_formation_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.seminaire_formation_institutions IS 'Séminaires et formations pour agents d''institutions';


--
-- Name: COLUMN seminaire_formation_institutions.statut; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_formation_institutions.statut IS 'planifie, en_cours, termine, annule';


--
-- Name: seminaire_formation_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.seminaire_formation_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_formation_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: seminaire_formation_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.seminaire_formation_institutions_id_seq OWNED BY public.seminaire_formation_institutions.id;


--
-- Name: seminaire_participants; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.seminaire_participants (
    id integer NOT NULL,
    id_seminaire integer NOT NULL,
    id_agent integer NOT NULL,
    statut_participation character varying(50) DEFAULT 'inscrit'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seminaire_participants OWNER TO isegroup_tourisme;

--
-- Name: TABLE seminaire_participants; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.seminaire_participants IS 'Table pour gérer les participants aux séminaires de formation';


--
-- Name: COLUMN seminaire_participants.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants.id IS 'Identifiant unique de la participation';


--
-- Name: COLUMN seminaire_participants.id_seminaire; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants.id_seminaire IS 'Identifiant du séminaire';


--
-- Name: COLUMN seminaire_participants.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants.id_agent IS 'Identifiant de l''agent participant';


--
-- Name: COLUMN seminaire_participants.statut_participation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants.statut_participation IS 'Statut de participation (inscrit, present, absent, excuse)';


--
-- Name: COLUMN seminaire_participants.notes; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants.notes IS 'Notes sur la participation de l''agent';


--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.seminaire_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_participants_id_seq OWNER TO isegroup_tourisme;

--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.seminaire_participants_id_seq OWNED BY public.seminaire_participants.id;


--
-- Name: seminaire_participants_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.seminaire_participants_institutions (
    id integer NOT NULL,
    id_seminaire integer,
    id_agent integer NOT NULL,
    statut_participation character varying(20) DEFAULT 'inscrit'::character varying,
    date_inscription timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    present boolean,
    note_evaluation numeric(5,2),
    commentaires text,
    certificat_obtenu boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seminaire_participants_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE seminaire_participants_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.seminaire_participants_institutions IS 'Participation des agents aux séminaires/formations';


--
-- Name: COLUMN seminaire_participants_institutions.statut_participation; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.seminaire_participants_institutions.statut_participation IS 'inscrit, confirme, present, absent, annule';


--
-- Name: seminaire_participants_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.seminaire_participants_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_participants_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: seminaire_participants_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.seminaire_participants_institutions_id_seq OWNED BY public.seminaire_participants_institutions.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.services (
    id integer NOT NULL,
    id_ministere integer NOT NULL,
    id_entite integer,
    id_direction integer,
    id_sous_direction integer,
    code character varying(50),
    libelle character varying(255) NOT NULL,
    responsable_id integer,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type_service character varying(50)
);


ALTER TABLE public.services OWNER TO isegroup_tourisme;

--
-- Name: services_entites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.services_entites (
    id integer NOT NULL,
    id_entite integer NOT NULL,
    libelle character varying(200) NOT NULL,
    description text,
    code character varying(20),
    responsable_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_services_entites_libelle_not_empty CHECK ((length(btrim((libelle)::text)) > 0))
);


ALTER TABLE public.services_entites OWNER TO isegroup_tourisme;

--
-- Name: TABLE services_entites; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.services_entites IS 'Services rattachés aux entités administratives des ministères';


--
-- Name: services_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.services_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_entites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: services_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.services_entites_id_seq OWNED BY public.services_entites.id;


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_id_seq OWNER TO isegroup_tourisme;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.directions.id;


--
-- Name: services_id_seq1; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.services_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_id_seq1 OWNER TO isegroup_tourisme;

--
-- Name: services_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.services_id_seq1 OWNED BY public.services.id;


--
-- Name: services_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.services_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.services_institutions OWNER TO isegroup_tourisme;

--
-- Name: services_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.services_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: services_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.services_institutions_id_seq OWNED BY public.services_institutions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    id_utilisateur integer,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO isegroup_tourisme;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sindicats; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.sindicats (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sindicats OWNER TO isegroup_tourisme;

--
-- Name: sindicats_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.sindicats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sindicats_id_seq OWNER TO isegroup_tourisme;

--
-- Name: sindicats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.sindicats_id_seq OWNED BY public.sindicats.id;


--
-- Name: situation_matrimonials; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.situation_matrimonials (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.situation_matrimonials OWNER TO isegroup_tourisme;

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.situation_matrimonials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.situation_matrimonials_id_seq OWNER TO isegroup_tourisme;

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.situation_matrimonials_id_seq OWNED BY public.situation_matrimonials.id;


--
-- Name: sous_directions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.sous_directions (
    id integer NOT NULL,
    id_ministere integer NOT NULL,
    id_entite integer,
    id_direction integer,
    code character varying(50),
    libelle character varying(255) NOT NULL,
    sous_directeur_id integer,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sous_directions OWNER TO isegroup_tourisme;

--
-- Name: sous_directions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.sous_directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sous_directions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: sous_directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.sous_directions_id_seq OWNED BY public.sous_directions.id;


--
-- Name: sous_directions_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.sous_directions_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_direction integer,
    libelle character varying(200) NOT NULL,
    code character varying(20),
    description text,
    responsable_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sous_directions_institutions OWNER TO isegroup_tourisme;

--
-- Name: TABLE sous_directions_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.sous_directions_institutions IS 'Sous-directions des institutions';


--
-- Name: COLUMN sous_directions_institutions.responsable_id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.sous_directions_institutions.responsable_id IS 'ID de l''agent responsable (sous-directeur)';


--
-- Name: sous_directions_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.sous_directions_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sous_directions_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: sous_directions_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.sous_directions_institutions_id_seq OWNED BY public.sous_directions_institutions.id;


--
-- Name: specialites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.specialites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specialites OWNER TO isegroup_tourisme;

--
-- Name: specialites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.specialites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.specialites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: specialites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.specialites_id_seq OWNED BY public.specialites.id;


--
-- Name: stage; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.stage (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    intitule_stage character varying(300) NOT NULL,
    date_stage date NOT NULL,
    duree_stage integer,
    etablissement character varying(200) NOT NULL,
    ville character varying(100) NOT NULL,
    pays character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stage OWNER TO isegroup_tourisme;

--
-- Name: TABLE stage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.stage IS 'Historique des stages des agents';


--
-- Name: COLUMN stage.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.id IS 'Identifiant unique du stage';


--
-- Name: COLUMN stage.id_agent; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN stage.intitule_stage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.intitule_stage IS 'Intitulé du stage';


--
-- Name: COLUMN stage.date_stage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.date_stage IS 'Date du stage';


--
-- Name: COLUMN stage.duree_stage; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.duree_stage IS 'Durée du stage en jours';


--
-- Name: COLUMN stage.etablissement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.etablissement IS 'Établissement où le stage s''est déroulé';


--
-- Name: COLUMN stage.ville; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.ville IS 'Ville de l''établissement';


--
-- Name: COLUMN stage.pays; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.stage.pays IS 'Pays de l''établissement';


--
-- Name: stage_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.stage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stage_id_seq OWNER TO isegroup_tourisme;

--
-- Name: stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.stage_id_seq OWNED BY public.stage.id;


--
-- Name: tiers; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.tiers (
    id integer NOT NULL,
    id_ministere integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    adresse text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tiers OWNER TO isegroup_tourisme;

--
-- Name: tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tiers_id_seq OWNER TO isegroup_tourisme;

--
-- Name: tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.tiers_id_seq OWNED BY public.tiers.id;


--
-- Name: tiers_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.tiers_institutions (
    id integer NOT NULL,
    id_institution integer,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    adresse text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tiers_institutions OWNER TO isegroup_tourisme;

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.tiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tiers_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.tiers_institutions_id_seq OWNED BY public.tiers_institutions.id;


--
-- Name: type_d_agents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_d_agents (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    automatique boolean DEFAULT false,
    numero_initial integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_d_agents OWNER TO isegroup_tourisme;

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_d_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_d_agents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_d_agents_id_seq OWNED BY public.type_d_agents.id;


--
-- Name: type_de_conges; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_conges (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_conges OWNER TO isegroup_tourisme;

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_conges_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_conges_id_seq OWNED BY public.type_de_conges.id;


--
-- Name: type_de_couriers; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_couriers (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_couriers OWNER TO isegroup_tourisme;

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_couriers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_couriers_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_couriers_id_seq OWNED BY public.type_de_couriers.id;


--
-- Name: type_de_destinations; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_destinations (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_destinations OWNER TO isegroup_tourisme;

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_destinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_destinations_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_destinations_id_seq OWNED BY public.type_de_destinations.id;


--
-- Name: type_de_documents; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_documents (
    id integer NOT NULL,
    id_service integer,
    id_ministere integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_service_entite integer
);


ALTER TABLE public.type_de_documents OWNER TO isegroup_tourisme;

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_documents_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_documents_id_seq OWNED BY public.type_de_documents.id;


--
-- Name: type_de_documents_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_documents_institutions (
    id integer NOT NULL,
    id_service integer,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_documents_institutions OWNER TO isegroup_tourisme;

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_documents_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_documents_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_documents_institutions_id_seq OWNED BY public.type_de_documents_institutions.id;


--
-- Name: type_de_materiels; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_materiels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_materiels OWNER TO isegroup_tourisme;

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_materiels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_materiels_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_materiels_id_seq OWNED BY public.type_de_materiels.id;


--
-- Name: type_de_retraites; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_retraites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_retraites OWNER TO isegroup_tourisme;

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_retraites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_retraites_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_retraites_id_seq OWNED BY public.type_de_retraites.id;


--
-- Name: type_de_seminaire_de_formation; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_seminaire_de_formation (
    id integer NOT NULL,
    id_ministere integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_seminaire_de_formation OWNER TO isegroup_tourisme;

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_seminaire_de_formation_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_id_seq OWNED BY public.type_de_seminaire_de_formation.id;


--
-- Name: type_de_seminaire_de_formation_institutions; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_de_seminaire_de_formation_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_seminaire_de_formation_institutions OWNER TO isegroup_tourisme;

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_seminaire_de_formation_institutions_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq OWNED BY public.type_de_seminaire_de_formation_institutions.id;


--
-- Name: type_etablissements; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_etablissements (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_etablissements OWNER TO isegroup_tourisme;

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_etablissements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_etablissements_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_etablissements_id_seq OWNED BY public.type_etablissements.id;


--
-- Name: type_formations; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.type_formations (
    id integer NOT NULL,
    libele character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_formations OWNER TO isegroup_tourisme;

--
-- Name: TABLE type_formations; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON TABLE public.type_formations IS 'Table des types de formations disponibles dans le système';


--
-- Name: COLUMN type_formations.id; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.type_formations.id IS 'Identifiant unique du type de formation';


--
-- Name: COLUMN type_formations.libele; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.type_formations.libele IS 'Libellé du type de formation (ex: Formation continue, Séminaire, Atelier, etc.)';


--
-- Name: COLUMN type_formations.created_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.type_formations.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN type_formations.updated_at; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON COLUMN public.type_formations.updated_at IS 'Date de dernière modification de l''enregistrement';


--
-- Name: type_formations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.type_formations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_formations_id_seq OWNER TO isegroup_tourisme;

--
-- Name: type_formations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.type_formations_id_seq OWNED BY public.type_formations.id;


--
-- Name: unite_administratives; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.unite_administratives (
    id integer NOT NULL,
    id_fonction integer,
    capacite_acceuil integer,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unite_administratives OWNER TO isegroup_tourisme;

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.unite_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unite_administratives_id_seq OWNER TO isegroup_tourisme;

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.unite_administratives_id_seq OWNED BY public.unite_administratives.id;


--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.utilisateurs (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    id_role integer,
    id_agent integer,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.utilisateurs OWNER TO isegroup_tourisme;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.utilisateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.utilisateurs_id_seq OWNER TO isegroup_tourisme;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.utilisateurs_id_seq OWNED BY public.utilisateurs.id;


--
-- Name: v_agents_complets; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_agents_complets AS
 SELECT a.id,
    a.id_civilite,
    a.id_situation_matrimoniale,
    a.id_nationalite,
    a.id_type_d_agent,
    a.id_ministere,
    a.id_entite_principale,
    a.nom,
    a.prenom,
    a.matricule,
    a.date_de_naissance,
    a.lieu_de_naissance,
    a.age,
    a.telephone1,
    a.telephone2,
    a.sexe,
    a.nom_de_la_mere,
    a.nom_du_pere,
    a.email,
    a.date_mariage,
    a.nom_conjointe,
    a.nombre_enfant,
    a.ad_pro_rue,
    a.ad_pro_ville,
    a.ad_pro_batiment,
    a.ad_pri_rue,
    a.ad_pri_ville,
    a.ad_pri_batiment,
    a.statut_emploi,
    a.date_embauche,
    a.date_fin_contrat,
    a.created_at,
    a.updated_at,
    a.id_fonction,
    a.id_pays,
    a.id_categorie,
    a.id_grade,
    a.id_emploi,
    a.id_echelon,
    a.id_specialite,
    a.id_langue,
    a.id_niveau_langue,
    a.id_motif_depart,
    a.id_type_conge,
    a.id_autre_absence,
    a.id_distinction,
    a.id_type_etablissement,
    a.id_unite_administrative,
    a.id_diplome,
    a.id_type_materiel,
    a.id_type_destination,
    a.id_nature_accident,
    a.id_sanction,
    a.id_sindicat,
    a.id_type_courrier,
    a.id_nature_acte,
    a.id_localite,
    a.id_mode_entree,
    a.id_position,
    a.id_pathologie,
    a.id_handicap,
    a.id_niveau_informatique,
    a.id_logiciel,
    a.id_type_retraite,
    a.id_direction,
    a.date_retraite,
    a.fonction_actuelle,
    a.fonction_anterieure,
    a.situation_militaire,
    a.numero_cnps,
    a.date_declaration_cnps,
    a.handicap_personnalise,
    a.date_prise_service_au_ministere,
    a.date_prise_service_dans_la_direction,
    a.numero_acte_mariage,
    a.id_sous_direction,
    a.id_service,
    s.libelle AS service_nom,
    s.description AS service_description,
    sd.libelle AS sous_direction_nom,
    sd.description AS sous_direction_description,
    d.libelle AS direction_nom,
    m.nom AS ministere_nom,
    m.code AS ministere_code
   FROM ((((public.agents a
     LEFT JOIN public.services s ON ((a.id_service = s.id)))
     LEFT JOIN public.sous_directions sd ON ((a.id_sous_direction = sd.id)))
     LEFT JOIN public.directions d ON ((a.id_direction = d.id)))
     LEFT JOIN public.ministeres m ON ((a.id_ministere = m.id)));


ALTER TABLE public.v_agents_complets OWNER TO isegroup_tourisme;

--
-- Name: v_agents_conges_institutions; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_agents_conges_institutions AS
 SELECT a.id AS agent_id,
    a.nom,
    a.prenom,
    a.matricule,
    a.id_institution,
    i.nom AS institution_nom,
    ac.annee,
    ac.jours_alloues,
    ac.jours_pris,
    ac.jours_restants,
    ac.jours_reportes
   FROM ((public.agents_institutions_main a
     LEFT JOIN public.institutions i ON ((a.id_institution = i.id)))
     LEFT JOIN public.agent_conges_institutions ac ON (((a.id = ac.id_agent) AND ((ac.annee)::double precision = date_part('year'::text, CURRENT_DATE)))));


ALTER TABLE public.v_agents_conges_institutions OWNER TO isegroup_tourisme;

--
-- Name: VIEW v_agents_conges_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON VIEW public.v_agents_conges_institutions IS 'Vue simplifiée des agents avec leurs congés de l''année en cours';


--
-- Name: v_demandes_en_attente; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_demandes_en_attente AS
 SELECT d.id,
    d.id_agent,
    a.prenom,
    a.nom,
    a.matricule,
    d.type_demande,
    d.description,
    d.niveau_actuel,
    d.priorite,
    d.date_creation,
        CASE d.niveau_actuel
            WHEN 'chef_service'::text THEN d.id_chef_service
            WHEN 'drh'::text THEN d.id_drh
            WHEN 'directeur'::text THEN d.id_directeur
            WHEN 'ministre'::text THEN d.id_ministre
            ELSE NULL::integer
        END AS id_validateur_actuel
   FROM (public.demandes d
     LEFT JOIN public.agents a ON ((d.id_agent = a.id)))
  WHERE (((d.status)::text = 'en_attente'::text) AND ((d.niveau_actuel)::text <> 'finalise'::text));


ALTER TABLE public.v_demandes_en_attente OWNER TO isegroup_tourisme;

--
-- Name: v_demandes_en_attente_institutions; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_demandes_en_attente_institutions AS
 SELECT d.id,
    d.id_agent,
    a.nom AS agent_nom,
    a.prenom AS agent_prenom,
    a.matricule AS agent_matricule,
    d.id_institution,
    i.nom AS institution_nom,
    d.type_demande,
    d.date_debut,
    d.date_fin,
    d.nombre_jours,
    d.status,
    d.niveau_actuel,
    d.date_creation
   FROM ((public.demandes_institutions d
     JOIN public.agents_institutions_main a ON ((d.id_agent = a.id)))
     LEFT JOIN public.institutions i ON ((d.id_institution = i.id)))
  WHERE ((d.status)::text = 'en_attente'::text)
  ORDER BY d.date_creation DESC;


ALTER TABLE public.v_demandes_en_attente_institutions OWNER TO isegroup_tourisme;

--
-- Name: VIEW v_demandes_en_attente_institutions; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON VIEW public.v_demandes_en_attente_institutions IS 'Vue des demandes en attente pour suivi facile';


--
-- Name: v_notifications_non_lues; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_notifications_non_lues AS
 SELECT n.id,
    n.id_demande,
    n.type_notification,
    n.titre,
    n.message,
    n.date_creation,
    d.type_demande,
    d.description,
    d.niveau_actuel,
    d.status
   FROM (public.notifications_demandes n
     LEFT JOIN public.demandes d ON ((n.id_demande = d.id)))
  WHERE (n.lu = false)
  ORDER BY n.date_creation DESC;


ALTER TABLE public.v_notifications_non_lues OWNER TO isegroup_tourisme;

--
-- Name: v_services_avec_entites; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_services_avec_entites AS
 SELECT se.id,
    se.libelle,
    se.description,
    se.code,
    se.is_active,
    ea.id AS id_entite,
    ea.nom AS nom_entite,
    ea.sigle AS sigle_entite,
    ea.type_entite,
    m.id AS id_ministere,
    m.nom AS nom_ministere,
    m.sigle AS sigle_ministere,
    se.created_at,
    se.updated_at
   FROM ((public.services_entites se
     JOIN public.entites_administratives ea ON ((se.id_entite = ea.id)))
     JOIN public.ministeres m ON ((ea.id_ministere = m.id)));


ALTER TABLE public.v_services_avec_entites OWNER TO isegroup_tourisme;

--
-- Name: VIEW v_services_avec_entites; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON VIEW public.v_services_avec_entites IS 'Vue des services avec leurs entités et ministères';


--
-- Name: v_services_complets; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_services_complets AS
 SELECT s.id,
    s.id_ministere,
    s.id_entite,
    s.libelle,
    s.responsable_id,
    s.description,
    s.is_active,
    s.created_at,
    s.updated_at,
    m.nom AS ministere_nom,
    m.code AS ministere_code,
    e.nom AS entite_nom,
    a.prenom AS responsable_prenom,
    a.nom AS responsable_nom,
    a.matricule AS responsable_matricule
   FROM (((public.services s
     LEFT JOIN public.ministeres m ON ((s.id_ministere = m.id)))
     LEFT JOIN public.entites_administratives e ON ((s.id_entite = e.id)))
     LEFT JOIN public.agents a ON ((s.responsable_id = a.id)));


ALTER TABLE public.v_services_complets OWNER TO isegroup_tourisme;

--
-- Name: v_sous_directions_completes; Type: VIEW; Schema: public; Owner: isegroup_tourisme
--

CREATE VIEW public.v_sous_directions_completes AS
 SELECT sd.id,
    sd.id_ministere,
    sd.id_entite,
    sd.id_direction,
    sd.libelle,
    sd.sous_directeur_id,
    sd.description,
    sd.is_active,
    sd.created_at,
    sd.updated_at,
    m.nom AS ministere_nom,
    m.code AS ministere_code,
    e.nom AS entite_nom,
    e.code AS entite_code,
    d.libelle AS direction_nom,
    a.prenom AS sous_directeur_prenom,
    a.nom AS sous_directeur_nom,
    a.matricule AS sous_directeur_matricule,
    a.email AS sous_directeur_email
   FROM ((((public.sous_directions sd
     LEFT JOIN public.ministeres m ON ((sd.id_ministere = m.id)))
     LEFT JOIN public.entites_administratives e ON ((sd.id_entite = e.id)))
     LEFT JOIN public.directions d ON ((sd.id_direction = d.id)))
     LEFT JOIN public.agents a ON ((sd.sous_directeur_id = a.id)));


ALTER TABLE public.v_sous_directions_completes OWNER TO isegroup_tourisme;

--
-- Name: webauthn_challenges; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.webauthn_challenges (
    id integer NOT NULL,
    challenge text NOT NULL,
    id_utilisateur integer,
    type character varying(50) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.webauthn_challenges OWNER TO isegroup_tourisme;

--
-- Name: webauthn_challenges_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.webauthn_challenges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webauthn_challenges_id_seq OWNER TO isegroup_tourisme;

--
-- Name: webauthn_challenges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.webauthn_challenges_id_seq OWNED BY public.webauthn_challenges.id;


--
-- Name: webauthn_credentials; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.webauthn_credentials (
    id integer NOT NULL,
    id_utilisateur integer NOT NULL,
    credential_id text NOT NULL,
    public_key text NOT NULL,
    counter bigint DEFAULT 0,
    device_name character varying(255),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp without time zone,
    is_active boolean DEFAULT true
);


ALTER TABLE public.webauthn_credentials OWNER TO isegroup_tourisme;

--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.webauthn_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webauthn_credentials_id_seq OWNER TO isegroup_tourisme;

--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.webauthn_credentials_id_seq OWNED BY public.webauthn_credentials.id;


--
-- Name: workflow_demandes; Type: TABLE; Schema: public; Owner: isegroup_tourisme
--

CREATE TABLE public.workflow_demandes (
    id integer NOT NULL,
    id_demande integer NOT NULL,
    niveau_validation character varying(20) NOT NULL,
    id_validateur integer NOT NULL,
    action character varying(20) NOT NULL,
    commentaire text,
    date_action timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflow_demandes_action_check CHECK (((action)::text = ANY (ARRAY[('approuve'::character varying)::text, ('rejete'::character varying)::text, ('transfere'::character varying)::text]))),
    CONSTRAINT workflow_demandes_niveau_validation_check CHECK (((niveau_validation)::text = ANY (ARRAY[('chef_service'::character varying)::text, ('sous_directeur'::character varying)::text, ('directeur'::character varying)::text, ('drh'::character varying)::text, ('dir_cabinet'::character varying)::text, ('chef_cabinet'::character varying)::text, ('directeur_central'::character varying)::text, ('directeur_general'::character varying)::text, ('ministre'::character varying)::text])))
);


ALTER TABLE public.workflow_demandes OWNER TO isegroup_tourisme;

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup_tourisme
--

CREATE SEQUENCE public.workflow_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_demandes_id_seq OWNER TO isegroup_tourisme;

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup_tourisme
--

ALTER SEQUENCE public.workflow_demandes_id_seq OWNED BY public.workflow_demandes.id;


--
-- Name: affectations_temporaires id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_id_seq'::regclass);


--
-- Name: affectations_temporaires_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires_institutions ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_institutions_id_seq'::regclass);


--
-- Name: agent_conges id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges ALTER COLUMN id SET DEFAULT nextval('public.agent_conges_id_seq'::regclass);


--
-- Name: agent_conges_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges_institutions ALTER COLUMN id SET DEFAULT nextval('public.agent_conges_institutions_id_seq'::regclass);


--
-- Name: agent_documents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_documents ALTER COLUMN id SET DEFAULT nextval('public.agent_documents_id_seq'::regclass);


--
-- Name: agent_langues id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues ALTER COLUMN id SET DEFAULT nextval('public.agent_langues_id_seq'::regclass);


--
-- Name: agent_logiciels id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels ALTER COLUMN id SET DEFAULT nextval('public.agent_logiciels_id_seq'::regclass);


--
-- Name: agent_login_codes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_login_codes ALTER COLUMN id SET DEFAULT nextval('public.agent_login_codes_id_seq'::regclass);


--
-- Name: agent_photos id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_photos ALTER COLUMN id SET DEFAULT nextval('public.agent_photos_id_seq'::regclass);


--
-- Name: agent_route_assignments id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_route_assignments ALTER COLUMN id SET DEFAULT nextval('public.agent_route_assignments_id_seq'::regclass);


--
-- Name: agent_signatures id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_signatures ALTER COLUMN id SET DEFAULT nextval('public.agent_signatures_id_seq'::regclass);


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: agents_associations id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_associations ALTER COLUMN id SET DEFAULT nextval('public.agents_associations_id_seq'::regclass);


--
-- Name: agents_entites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_id_seq'::regclass);


--
-- Name: agents_entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_institutions_id_seq'::regclass);


--
-- Name: agents_institutions_main id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main ALTER COLUMN id SET DEFAULT nextval('public.agents_institutions_main_id_seq'::regclass);


--
-- Name: agents_sindicats id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_sindicats ALTER COLUMN id SET DEFAULT nextval('public.agents_sindicats_id_seq'::regclass);


--
-- Name: associations id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.associations ALTER COLUMN id SET DEFAULT nextval('public.associations_id_seq'::regclass);


--
-- Name: autre_absences id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.autre_absences ALTER COLUMN id SET DEFAULT nextval('public.autre_absences_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: categories_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents ALTER COLUMN id SET DEFAULT nextval('public.categories_agents_id_seq'::regclass);


--
-- Name: civilites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.civilites ALTER COLUMN id SET DEFAULT nextval('public.civilites_id_seq'::regclass);


--
-- Name: classeurs id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs ALTER COLUMN id SET DEFAULT nextval('public.classeurs_id_seq'::regclass);


--
-- Name: classeurs_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs_institutions ALTER COLUMN id SET DEFAULT nextval('public.classeurs_institutions_id_seq'::regclass);


--
-- Name: decisions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions ALTER COLUMN id SET DEFAULT nextval('public.decisions_id_seq'::regclass);


--
-- Name: decisions_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions_institutions ALTER COLUMN id SET DEFAULT nextval('public.decisions_institutions_id_seq'::regclass);


--
-- Name: demandes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes ALTER COLUMN id SET DEFAULT nextval('public.demandes_id_seq'::regclass);


--
-- Name: demandes_historique id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_historique ALTER COLUMN id SET DEFAULT nextval('public.demandes_historique_id_seq'::regclass);


--
-- Name: demandes_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_institutions ALTER COLUMN id SET DEFAULT nextval('public.demandes_institutions_id_seq'::regclass);


--
-- Name: departements id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.departements ALTER COLUMN id SET DEFAULT nextval('public.departements_id_seq'::regclass);


--
-- Name: diplomes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.diplomes ALTER COLUMN id SET DEFAULT nextval('public.diplomes_id_seq'::regclass);


--
-- Name: direction_generale id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale ALTER COLUMN id SET DEFAULT nextval('public.direction_generale_id_seq'::regclass);


--
-- Name: directions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: directions_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions_institutions ALTER COLUMN id SET DEFAULT nextval('public.directions_institutions_id_seq'::regclass);


--
-- Name: distinctions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.distinctions ALTER COLUMN id SET DEFAULT nextval('public.distinctions_id_seq'::regclass);


--
-- Name: documents_autorisation id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation ALTER COLUMN id SET DEFAULT nextval('public.documents_autorisation_id_seq'::regclass);


--
-- Name: dossiers id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers ALTER COLUMN id SET DEFAULT nextval('public.dossiers_id_seq'::regclass);


--
-- Name: dossiers_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.dossiers_institutions_id_seq'::regclass);


--
-- Name: echelons id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons ALTER COLUMN id SET DEFAULT nextval('public.echelons_id_seq'::regclass);


--
-- Name: echelons_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents ALTER COLUMN id SET DEFAULT nextval('public.echelons_agents_id_seq'::regclass);


--
-- Name: emploi_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents ALTER COLUMN id SET DEFAULT nextval('public.emploi_agents_id_seq'::regclass);


--
-- Name: emplois id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emplois ALTER COLUMN id SET DEFAULT nextval('public.emplois_id_seq'::regclass);


--
-- Name: enfants id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants ALTER COLUMN id SET DEFAULT nextval('public.enfants_id_seq'::regclass);


--
-- Name: enfants_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants_institutions ALTER COLUMN id SET DEFAULT nextval('public.enfants_institutions_id_seq'::regclass);


--
-- Name: entites_administratives id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives ALTER COLUMN id SET DEFAULT nextval('public.entites_administratives_id_seq'::regclass);


--
-- Name: entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.entites_institutions_id_seq'::regclass);


--
-- Name: etude_diplome id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.etude_diplome ALTER COLUMN id SET DEFAULT nextval('public.etude_diplome_id_seq'::regclass);


--
-- Name: evenements id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.evenements ALTER COLUMN id SET DEFAULT nextval('public.evenements_id_seq'::regclass);


--
-- Name: fonction_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents ALTER COLUMN id SET DEFAULT nextval('public.fonction_agents_id_seq'::regclass);


--
-- Name: fonctions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonctions ALTER COLUMN id SET DEFAULT nextval('public.fonctions_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: grades_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents ALTER COLUMN id SET DEFAULT nextval('public.grades_agents_id_seq'::regclass);


--
-- Name: handicaps id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.handicaps ALTER COLUMN id SET DEFAULT nextval('public.handicaps_id_seq'::regclass);


--
-- Name: historique_retrait_restauration id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.historique_retrait_restauration ALTER COLUMN id SET DEFAULT nextval('public.historique_retrait_restauration_id_seq'::regclass);


--
-- Name: institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);


--
-- Name: jours_feries id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.jours_feries ALTER COLUMN id SET DEFAULT nextval('public.jours_feries_id_seq'::regclass);


--
-- Name: langues id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.langues ALTER COLUMN id SET DEFAULT nextval('public.langues_id_seq'::regclass);


--
-- Name: localites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.localites ALTER COLUMN id SET DEFAULT nextval('public.localites_id_seq'::regclass);


--
-- Name: logiciels id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.logiciels ALTER COLUMN id SET DEFAULT nextval('public.logiciels_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: ministeres id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres ALTER COLUMN id SET DEFAULT nextval('public.ministeres_id_seq'::regclass);


--
-- Name: mode_d_entrees id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.mode_d_entrees ALTER COLUMN id SET DEFAULT nextval('public.mode_d_entrees_id_seq'::regclass);


--
-- Name: motif_de_departs id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.motif_de_departs ALTER COLUMN id SET DEFAULT nextval('public.motif_de_departs_id_seq'::regclass);


--
-- Name: nationalites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nationalites ALTER COLUMN id SET DEFAULT nextval('public.nationalites_id_seq'::regclass);


--
-- Name: nature_actes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_actes ALTER COLUMN id SET DEFAULT nextval('public.nature_actes_id_seq'::regclass);


--
-- Name: nature_d_accidents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_d_accidents ALTER COLUMN id SET DEFAULT nextval('public.nature_d_accidents_id_seq'::regclass);


--
-- Name: niveau_informatiques id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_informatiques ALTER COLUMN id SET DEFAULT nextval('public.niveau_informatiques_id_seq'::regclass);


--
-- Name: niveau_langues id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_langues ALTER COLUMN id SET DEFAULT nextval('public.niveau_langues_id_seq'::regclass);


--
-- Name: nominations id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nominations ALTER COLUMN id SET DEFAULT nextval('public.nominations_id_seq'::regclass);


--
-- Name: notifications_demandes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.notifications_demandes ALTER COLUMN id SET DEFAULT nextval('public.notifications_demandes_id_seq'::regclass);


--
-- Name: pathologies id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pathologies ALTER COLUMN id SET DEFAULT nextval('public.pathologies_id_seq'::regclass);


--
-- Name: pays id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pays ALTER COLUMN id SET DEFAULT nextval('public.pays_id_seq'::regclass);


--
-- Name: permissions_entites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_id_seq'::regclass);


--
-- Name: permissions_entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_institutions_id_seq'::regclass);


--
-- Name: planning_previsionnel_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.planning_previsionnel_institutions ALTER COLUMN id SET DEFAULT nextval('public.planning_previsionnel_institutions_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: prolongements_retraite id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.prolongements_retraite ALTER COLUMN id SET DEFAULT nextval('public.prolongements_retraite_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sanctions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sanctions ALTER COLUMN id SET DEFAULT nextval('public.sanctions_id_seq'::regclass);


--
-- Name: seminaire_formation id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation ALTER COLUMN id SET DEFAULT nextval('public.seminaire_formation_id_seq'::regclass);


--
-- Name: seminaire_formation_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation_institutions ALTER COLUMN id SET DEFAULT nextval('public.seminaire_formation_institutions_id_seq'::regclass);


--
-- Name: seminaire_participants id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants ALTER COLUMN id SET DEFAULT nextval('public.seminaire_participants_id_seq'::regclass);


--
-- Name: seminaire_participants_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants_institutions ALTER COLUMN id SET DEFAULT nextval('public.seminaire_participants_institutions_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq1'::regclass);


--
-- Name: services_entites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_entites ALTER COLUMN id SET DEFAULT nextval('public.services_entites_id_seq'::regclass);


--
-- Name: services_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_institutions ALTER COLUMN id SET DEFAULT nextval('public.services_institutions_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sindicats id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sindicats ALTER COLUMN id SET DEFAULT nextval('public.sindicats_id_seq'::regclass);


--
-- Name: situation_matrimonials id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.situation_matrimonials ALTER COLUMN id SET DEFAULT nextval('public.situation_matrimonials_id_seq'::regclass);


--
-- Name: sous_directions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions ALTER COLUMN id SET DEFAULT nextval('public.sous_directions_id_seq'::regclass);


--
-- Name: sous_directions_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions_institutions ALTER COLUMN id SET DEFAULT nextval('public.sous_directions_institutions_id_seq'::regclass);


--
-- Name: specialites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.specialites ALTER COLUMN id SET DEFAULT nextval('public.specialites_id_seq'::regclass);


--
-- Name: stage id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.stage ALTER COLUMN id SET DEFAULT nextval('public.stage_id_seq'::regclass);


--
-- Name: tiers id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers ALTER COLUMN id SET DEFAULT nextval('public.tiers_id_seq'::regclass);


--
-- Name: tiers_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.tiers_institutions_id_seq'::regclass);


--
-- Name: type_d_agents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_d_agents ALTER COLUMN id SET DEFAULT nextval('public.type_d_agents_id_seq'::regclass);


--
-- Name: type_de_conges id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_conges ALTER COLUMN id SET DEFAULT nextval('public.type_de_conges_id_seq'::regclass);


--
-- Name: type_de_couriers id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_couriers ALTER COLUMN id SET DEFAULT nextval('public.type_de_couriers_id_seq'::regclass);


--
-- Name: type_de_destinations id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_destinations ALTER COLUMN id SET DEFAULT nextval('public.type_de_destinations_id_seq'::regclass);


--
-- Name: type_de_documents id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_id_seq'::regclass);


--
-- Name: type_de_documents_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_institutions_id_seq'::regclass);


--
-- Name: type_de_materiels id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_materiels ALTER COLUMN id SET DEFAULT nextval('public.type_de_materiels_id_seq'::regclass);


--
-- Name: type_de_retraites id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_retraites ALTER COLUMN id SET DEFAULT nextval('public.type_de_retraites_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_institutions_id_seq'::regclass);


--
-- Name: type_etablissements id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_etablissements ALTER COLUMN id SET DEFAULT nextval('public.type_etablissements_id_seq'::regclass);


--
-- Name: type_formations id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_formations ALTER COLUMN id SET DEFAULT nextval('public.type_formations_id_seq'::regclass);


--
-- Name: unite_administratives id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.unite_administratives ALTER COLUMN id SET DEFAULT nextval('public.unite_administratives_id_seq'::regclass);


--
-- Name: utilisateurs id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.utilisateurs ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_id_seq'::regclass);


--
-- Name: webauthn_challenges id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_challenges ALTER COLUMN id SET DEFAULT nextval('public.webauthn_challenges_id_seq'::regclass);


--
-- Name: webauthn_credentials id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_credentials ALTER COLUMN id SET DEFAULT nextval('public.webauthn_credentials_id_seq'::regclass);


--
-- Name: workflow_demandes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.workflow_demandes ALTER COLUMN id SET DEFAULT nextval('public.workflow_demandes_id_seq'::regclass);


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institutions_pkey PRIMARY KEY (id);


--
-- Name: affectations_temporaires affectations_temporaires_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_pkey PRIMARY KEY (id);


--
-- Name: agent_conges agent_conges_id_agent_annee_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges
    ADD CONSTRAINT agent_conges_id_agent_annee_key UNIQUE (id_agent, annee);


--
-- Name: agent_conges_institutions agent_conges_institutions_id_agent_annee_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges_institutions
    ADD CONSTRAINT agent_conges_institutions_id_agent_annee_key UNIQUE (id_agent, annee);


--
-- Name: agent_conges_institutions agent_conges_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges_institutions
    ADD CONSTRAINT agent_conges_institutions_pkey PRIMARY KEY (id);


--
-- Name: agent_conges agent_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges
    ADD CONSTRAINT agent_conges_pkey PRIMARY KEY (id);


--
-- Name: agent_documents agent_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_documents
    ADD CONSTRAINT agent_documents_pkey PRIMARY KEY (id);


--
-- Name: agent_langues agent_langues_id_agent_id_langue_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_agent_id_langue_key UNIQUE (id_agent, id_langue);


--
-- Name: agent_langues agent_langues_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_pkey PRIMARY KEY (id);


--
-- Name: agent_logiciels agent_logiciels_id_agent_id_logiciel_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_agent_id_logiciel_key UNIQUE (id_agent, id_logiciel);


--
-- Name: agent_logiciels agent_logiciels_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_pkey PRIMARY KEY (id);


--
-- Name: agent_login_codes agent_login_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT agent_login_codes_pkey PRIMARY KEY (id);


--
-- Name: agent_photos agent_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_photos
    ADD CONSTRAINT agent_photos_pkey PRIMARY KEY (id);


--
-- Name: agent_route_assignments agent_route_assignments_id_agent_route_id_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_route_assignments
    ADD CONSTRAINT agent_route_assignments_id_agent_route_id_key UNIQUE (id_agent, route_id);


--
-- Name: agent_route_assignments agent_route_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_route_assignments
    ADD CONSTRAINT agent_route_assignments_pkey PRIMARY KEY (id);


--
-- Name: agent_signatures agent_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_signatures
    ADD CONSTRAINT agent_signatures_pkey PRIMARY KEY (id);


--
-- Name: agents_associations agents_associations_id_agent_id_association_date_adhesion_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_associations
    ADD CONSTRAINT agents_associations_id_agent_id_association_date_adhesion_key UNIQUE (id_agent, id_association, date_adhesion);


--
-- Name: agents_associations agents_associations_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_associations
    ADD CONSTRAINT agents_associations_pkey PRIMARY KEY (id);


--
-- Name: agents agents_email_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_email_key UNIQUE (email);


--
-- Name: agents_entites agents_entites_id_agent_id_entite_date_debut_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_id_agent_id_entite_date_debut_key UNIQUE (id_agent, id_entite, date_debut);


--
-- Name: agents_entites_institutions agents_entites_institutions_id_agent_institution_id_entite__key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_id_agent_institution_id_entite__key UNIQUE (id_agent_institution, id_entite, date_debut);


--
-- Name: agents_entites_institutions agents_entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: agents_entites agents_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_pkey PRIMARY KEY (id);


--
-- Name: agents_institutions_main agents_institutions_main_email_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_email_key UNIQUE (email);


--
-- Name: agents_institutions_main agents_institutions_main_matricule_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_matricule_key UNIQUE (matricule);


--
-- Name: agents_institutions_main agents_institutions_main_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_pkey PRIMARY KEY (id);


--
-- Name: agents agents_matricule_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_matricule_key UNIQUE (matricule);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents_sindicats agents_sindicats_id_agent_id_sindicat_date_adhesion_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_sindicats
    ADD CONSTRAINT agents_sindicats_id_agent_id_sindicat_date_adhesion_key UNIQUE (id_agent, id_sindicat, date_adhesion);


--
-- Name: agents_sindicats agents_sindicats_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_sindicats
    ADD CONSTRAINT agents_sindicats_pkey PRIMARY KEY (id);


--
-- Name: associations associations_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.associations
    ADD CONSTRAINT associations_libele_key UNIQUE (libele);


--
-- Name: associations associations_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.associations
    ADD CONSTRAINT associations_pkey PRIMARY KEY (id);


--
-- Name: autre_absences autre_absences_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.autre_absences
    ADD CONSTRAINT autre_absences_libele_key UNIQUE (libele);


--
-- Name: autre_absences autre_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.autre_absences
    ADD CONSTRAINT autre_absences_pkey PRIMARY KEY (id);


--
-- Name: categories_agents categories_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents
    ADD CONSTRAINT categories_agents_pkey PRIMARY KEY (id);


--
-- Name: categories categories_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_libele_key UNIQUE (libele);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: civilites civilites_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.civilites
    ADD CONSTRAINT civilites_libele_key UNIQUE (libele);


--
-- Name: civilites civilites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.civilites
    ADD CONSTRAINT civilites_pkey PRIMARY KEY (id);


--
-- Name: classeurs classeurs_id_ministere_id_dossier_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_ministere_id_dossier_libelle_key UNIQUE (id_ministere, id_dossier, libelle);


--
-- Name: classeurs_institutions classeurs_institutions_id_institution_id_dossier_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_institution_id_dossier_libelle_key UNIQUE (id_institution, id_dossier, libelle);


--
-- Name: classeurs_institutions classeurs_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_pkey PRIMARY KEY (id);


--
-- Name: classeurs classeurs_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_pkey PRIMARY KEY (id);


--
-- Name: decisions_institutions decisions_institutions_numero_decision_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions_institutions
    ADD CONSTRAINT decisions_institutions_numero_decision_key UNIQUE (numero_decision);


--
-- Name: decisions_institutions decisions_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions_institutions
    ADD CONSTRAINT decisions_institutions_pkey PRIMARY KEY (id);


--
-- Name: decisions decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_pkey PRIMARY KEY (id);


--
-- Name: demandes_historique demandes_historique_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT demandes_historique_pkey PRIMARY KEY (id);


--
-- Name: demandes_institutions demandes_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_institutions
    ADD CONSTRAINT demandes_institutions_pkey PRIMARY KEY (id);


--
-- Name: demandes demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_pkey PRIMARY KEY (id);


--
-- Name: departements departements_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_code_key UNIQUE (code);


--
-- Name: departements departements_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_pkey PRIMARY KEY (id);


--
-- Name: diplomes diplomes_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.diplomes
    ADD CONSTRAINT diplomes_libele_key UNIQUE (libele);


--
-- Name: diplomes diplomes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.diplomes
    ADD CONSTRAINT diplomes_pkey PRIMARY KEY (id);


--
-- Name: direction_generale direction_generale_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale
    ADD CONSTRAINT direction_generale_pkey PRIMARY KEY (id);


--
-- Name: directions_institutions directions_institutions_id_institution_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions_institutions
    ADD CONSTRAINT directions_institutions_id_institution_code_key UNIQUE (id_institution, code);


--
-- Name: directions_institutions directions_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions_institutions
    ADD CONSTRAINT directions_institutions_pkey PRIMARY KEY (id);


--
-- Name: distinctions distinctions_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.distinctions
    ADD CONSTRAINT distinctions_libele_key UNIQUE (libele);


--
-- Name: distinctions distinctions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.distinctions
    ADD CONSTRAINT distinctions_pkey PRIMARY KEY (id);


--
-- Name: documents_autorisation documents_autorisation_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_pkey PRIMARY KEY (id);


--
-- Name: dossiers dossiers_id_ministere_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_ministere_id_entite_libelle_key UNIQUE (id_ministere, id_entite, libelle);


--
-- Name: dossiers_institutions dossiers_institutions_id_institution_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_institution_id_entite_libelle_key UNIQUE (id_institution, id_entite, libelle);


--
-- Name: dossiers_institutions dossiers_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_pkey PRIMARY KEY (id);


--
-- Name: dossiers dossiers_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_pkey PRIMARY KEY (id);


--
-- Name: echelons_agents echelons_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents
    ADD CONSTRAINT echelons_agents_pkey PRIMARY KEY (id);


--
-- Name: echelons echelons_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons
    ADD CONSTRAINT echelons_pkey PRIMARY KEY (id);


--
-- Name: emploi_agents emploi_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT emploi_agents_pkey PRIMARY KEY (id);


--
-- Name: emplois emplois_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emplois
    ADD CONSTRAINT emplois_pkey PRIMARY KEY (id);


--
-- Name: enfants_institutions enfants_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants_institutions
    ADD CONSTRAINT enfants_institutions_pkey PRIMARY KEY (id);


--
-- Name: enfants enfants_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants
    ADD CONSTRAINT enfants_pkey PRIMARY KEY (id);


--
-- Name: entites_administratives entites_administratives_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_pkey PRIMARY KEY (id);


--
-- Name: entites_institutions entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: etude_diplome etude_diplome_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_pkey PRIMARY KEY (id);


--
-- Name: evenements evenements_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.evenements
    ADD CONSTRAINT evenements_pkey PRIMARY KEY (id);


--
-- Name: fonction_agents fonction_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fonction_agents_pkey PRIMARY KEY (id);


--
-- Name: fonctions fonctions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonctions
    ADD CONSTRAINT fonctions_pkey PRIMARY KEY (id);


--
-- Name: grades_agents grades_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents
    ADD CONSTRAINT grades_agents_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: handicaps handicaps_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.handicaps
    ADD CONSTRAINT handicaps_libele_key UNIQUE (libele);


--
-- Name: handicaps handicaps_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.handicaps
    ADD CONSTRAINT handicaps_pkey PRIMARY KEY (id);


--
-- Name: historique_retrait_restauration historique_retrait_restauration_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.historique_retrait_restauration
    ADD CONSTRAINT historique_retrait_restauration_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_code_key UNIQUE (code);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: jours_feries jours_feries_date_feriee_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.jours_feries
    ADD CONSTRAINT jours_feries_date_feriee_key UNIQUE (date_feriee);


--
-- Name: jours_feries jours_feries_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.jours_feries
    ADD CONSTRAINT jours_feries_pkey PRIMARY KEY (id);


--
-- Name: langues langues_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.langues
    ADD CONSTRAINT langues_libele_key UNIQUE (libele);


--
-- Name: langues langues_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.langues
    ADD CONSTRAINT langues_pkey PRIMARY KEY (id);


--
-- Name: localites localites_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_code_key UNIQUE (code);


--
-- Name: localites localites_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_libele_key UNIQUE (libele);


--
-- Name: localites localites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_pkey PRIMARY KEY (id);


--
-- Name: logiciels logiciels_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.logiciels
    ADD CONSTRAINT logiciels_libele_key UNIQUE (libele);


--
-- Name: logiciels logiciels_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.logiciels
    ADD CONSTRAINT logiciels_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: ministere_matricule_config ministere_matricule_config_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministere_matricule_config
    ADD CONSTRAINT ministere_matricule_config_pkey PRIMARY KEY (id_ministere);


--
-- Name: ministeres ministeres_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_code_key UNIQUE (code);


--
-- Name: ministeres ministeres_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_pkey PRIMARY KEY (id);


--
-- Name: mode_d_entrees mode_d_entrees_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.mode_d_entrees
    ADD CONSTRAINT mode_d_entrees_libele_key UNIQUE (libele);


--
-- Name: mode_d_entrees mode_d_entrees_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.mode_d_entrees
    ADD CONSTRAINT mode_d_entrees_pkey PRIMARY KEY (id);


--
-- Name: motif_de_departs motif_de_departs_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.motif_de_departs
    ADD CONSTRAINT motif_de_departs_libele_key UNIQUE (libele);


--
-- Name: motif_de_departs motif_de_departs_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.motif_de_departs
    ADD CONSTRAINT motif_de_departs_pkey PRIMARY KEY (id);


--
-- Name: nationalites nationalites_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nationalites
    ADD CONSTRAINT nationalites_libele_key UNIQUE (libele);


--
-- Name: nationalites nationalites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nationalites
    ADD CONSTRAINT nationalites_pkey PRIMARY KEY (id);


--
-- Name: nature_actes nature_actes_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_actes
    ADD CONSTRAINT nature_actes_libele_key UNIQUE (libele);


--
-- Name: nature_actes nature_actes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_actes
    ADD CONSTRAINT nature_actes_pkey PRIMARY KEY (id);


--
-- Name: nature_d_accidents nature_d_accidents_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_d_accidents
    ADD CONSTRAINT nature_d_accidents_libele_key UNIQUE (libele);


--
-- Name: nature_d_accidents nature_d_accidents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nature_d_accidents
    ADD CONSTRAINT nature_d_accidents_pkey PRIMARY KEY (id);


--
-- Name: niveau_informatiques niveau_informatiques_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_informatiques
    ADD CONSTRAINT niveau_informatiques_libele_key UNIQUE (libele);


--
-- Name: niveau_informatiques niveau_informatiques_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_informatiques
    ADD CONSTRAINT niveau_informatiques_pkey PRIMARY KEY (id);


--
-- Name: niveau_langues niveau_langues_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_langues
    ADD CONSTRAINT niveau_langues_libele_key UNIQUE (libele);


--
-- Name: niveau_langues niveau_langues_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.niveau_langues
    ADD CONSTRAINT niveau_langues_pkey PRIMARY KEY (id);


--
-- Name: nominations nominations_numero_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_numero_key UNIQUE (numero);


--
-- Name: nominations nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_pkey PRIMARY KEY (id);


--
-- Name: notifications_demandes notifications_demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT notifications_demandes_pkey PRIMARY KEY (id);


--
-- Name: pathologies pathologies_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pathologies
    ADD CONSTRAINT pathologies_libele_key UNIQUE (libele);


--
-- Name: pathologies pathologies_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pathologies
    ADD CONSTRAINT pathologies_pkey PRIMARY KEY (id);


--
-- Name: pays pays_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_libele_key UNIQUE (libele);


--
-- Name: pays pays_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_pkey PRIMARY KEY (id);


--
-- Name: permissions_entites permissions_entites_id_role_id_entite_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_id_role_id_entite_key UNIQUE (id_role, id_entite);


--
-- Name: permissions_entites_institutions permissions_entites_institutions_id_role_id_entite_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_id_role_id_entite_key UNIQUE (id_role, id_entite);


--
-- Name: permissions_entites_institutions permissions_entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: permissions_entites permissions_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_pkey PRIMARY KEY (id);


--
-- Name: planning_previsionnel_institutions planning_previsionnel_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.planning_previsionnel_institutions
    ADD CONSTRAINT planning_previsionnel_institutions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_libele_key UNIQUE (libele);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: prolongements_retraite prolongements_retraite_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.prolongements_retraite
    ADD CONSTRAINT prolongements_retraite_pkey PRIMARY KEY (id);


--
-- Name: regions regions_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_key UNIQUE (code);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nom_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nom_key UNIQUE (nom);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sanctions sanctions_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sanctions
    ADD CONSTRAINT sanctions_libele_key UNIQUE (libele);


--
-- Name: sanctions sanctions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sanctions
    ADD CONSTRAINT sanctions_pkey PRIMARY KEY (id);


--
-- Name: seminaire_formation_institutions seminaire_formation_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation_institutions
    ADD CONSTRAINT seminaire_formation_institutions_pkey PRIMARY KEY (id);


--
-- Name: seminaire_formation seminaire_formation_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation
    ADD CONSTRAINT seminaire_formation_pkey PRIMARY KEY (id);


--
-- Name: seminaire_participants seminaire_participants_id_seminaire_id_agent_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_seminaire_id_agent_key UNIQUE (id_seminaire, id_agent);


--
-- Name: seminaire_participants_institutions seminaire_participants_institutions_id_seminaire_id_agent_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants_institutions
    ADD CONSTRAINT seminaire_participants_institutions_id_seminaire_id_agent_key UNIQUE (id_seminaire, id_agent);


--
-- Name: seminaire_participants_institutions seminaire_participants_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants_institutions
    ADD CONSTRAINT seminaire_participants_institutions_pkey PRIMARY KEY (id);


--
-- Name: seminaire_participants seminaire_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_pkey PRIMARY KEY (id);


--
-- Name: services_entites services_entites_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_id_entite_libelle_key UNIQUE (id_entite, libelle);


--
-- Name: services_entites services_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_pkey PRIMARY KEY (id);


--
-- Name: directions services_id_ministere_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT services_id_ministere_libelle_key UNIQUE (id_ministere, libelle);


--
-- Name: services_institutions services_institutions_id_institution_libelle_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_id_institution_libelle_key UNIQUE (id_institution, libelle);


--
-- Name: services_institutions services_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_pkey PRIMARY KEY (id);


--
-- Name: directions services_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey1; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey1 PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sindicats sindicats_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sindicats
    ADD CONSTRAINT sindicats_libele_key UNIQUE (libele);


--
-- Name: sindicats sindicats_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sindicats
    ADD CONSTRAINT sindicats_pkey PRIMARY KEY (id);


--
-- Name: situation_matrimonials situation_matrimonials_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.situation_matrimonials
    ADD CONSTRAINT situation_matrimonials_libele_key UNIQUE (libele);


--
-- Name: situation_matrimonials situation_matrimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.situation_matrimonials
    ADD CONSTRAINT situation_matrimonials_pkey PRIMARY KEY (id);


--
-- Name: sous_directions_institutions sous_directions_institutions_id_direction_code_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions_institutions
    ADD CONSTRAINT sous_directions_institutions_id_direction_code_key UNIQUE (id_direction, code);


--
-- Name: sous_directions_institutions sous_directions_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions_institutions
    ADD CONSTRAINT sous_directions_institutions_pkey PRIMARY KEY (id);


--
-- Name: sous_directions sous_directions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions
    ADD CONSTRAINT sous_directions_pkey PRIMARY KEY (id);


--
-- Name: specialites specialites_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.specialites
    ADD CONSTRAINT specialites_libele_key UNIQUE (libele);


--
-- Name: specialites specialites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.specialites
    ADD CONSTRAINT specialites_pkey PRIMARY KEY (id);


--
-- Name: stage stage_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.stage
    ADD CONSTRAINT stage_pkey PRIMARY KEY (id);


--
-- Name: tiers_institutions tiers_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers_institutions
    ADD CONSTRAINT tiers_institutions_pkey PRIMARY KEY (id);


--
-- Name: tiers tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT tiers_pkey PRIMARY KEY (id);


--
-- Name: type_d_agents type_d_agents_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_d_agents
    ADD CONSTRAINT type_d_agents_libele_key UNIQUE (libele);


--
-- Name: type_d_agents type_d_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_d_agents
    ADD CONSTRAINT type_d_agents_pkey PRIMARY KEY (id);


--
-- Name: type_de_conges type_de_conges_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_conges
    ADD CONSTRAINT type_de_conges_libele_key UNIQUE (libele);


--
-- Name: type_de_conges type_de_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_conges
    ADD CONSTRAINT type_de_conges_pkey PRIMARY KEY (id);


--
-- Name: type_de_couriers type_de_couriers_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_couriers
    ADD CONSTRAINT type_de_couriers_libele_key UNIQUE (libele);


--
-- Name: type_de_couriers type_de_couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_couriers
    ADD CONSTRAINT type_de_couriers_pkey PRIMARY KEY (id);


--
-- Name: type_de_destinations type_de_destinations_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_destinations
    ADD CONSTRAINT type_de_destinations_libele_key UNIQUE (libele);


--
-- Name: type_de_destinations type_de_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_destinations
    ADD CONSTRAINT type_de_destinations_pkey PRIMARY KEY (id);


--
-- Name: type_de_documents_institutions type_de_documents_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_pkey PRIMARY KEY (id);


--
-- Name: type_de_documents type_de_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_pkey PRIMARY KEY (id);


--
-- Name: type_de_materiels type_de_materiels_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_materiels
    ADD CONSTRAINT type_de_materiels_libele_key UNIQUE (libele);


--
-- Name: type_de_materiels type_de_materiels_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_materiels
    ADD CONSTRAINT type_de_materiels_pkey PRIMARY KEY (id);


--
-- Name: type_de_retraites type_de_retraites_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_retraites
    ADD CONSTRAINT type_de_retraites_libele_key UNIQUE (libele);


--
-- Name: type_de_retraites type_de_retraites_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_retraites
    ADD CONSTRAINT type_de_retraites_pkey PRIMARY KEY (id);


--
-- Name: type_de_seminaire_de_formation_institutions type_de_seminaire_de_formation_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions
    ADD CONSTRAINT type_de_seminaire_de_formation_institutions_pkey PRIMARY KEY (id);


--
-- Name: type_de_seminaire_de_formation type_de_seminaire_de_formation_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation
    ADD CONSTRAINT type_de_seminaire_de_formation_pkey PRIMARY KEY (id);


--
-- Name: type_etablissements type_etablissements_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_etablissements
    ADD CONSTRAINT type_etablissements_libele_key UNIQUE (libele);


--
-- Name: type_etablissements type_etablissements_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_etablissements
    ADD CONSTRAINT type_etablissements_pkey PRIMARY KEY (id);


--
-- Name: type_formations type_formations_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_formations
    ADD CONSTRAINT type_formations_libele_key UNIQUE (libele);


--
-- Name: type_formations type_formations_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_formations
    ADD CONSTRAINT type_formations_pkey PRIMARY KEY (id);


--
-- Name: emploi_agents uk_emploi_agents_agent_nomination; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT uk_emploi_agents_agent_nomination UNIQUE (id_agent, id_nomination);


--
-- Name: entites_administratives uk_entites_administratives_code; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT uk_entites_administratives_code UNIQUE (code);


--
-- Name: entites_institutions uk_entites_institutions_code; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT uk_entites_institutions_code UNIQUE (code);


--
-- Name: fonction_agents uk_fonction_agents_agent_nomination; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT uk_fonction_agents_agent_nomination UNIQUE (id_agent, id_nomination);


--
-- Name: services_entites uk_services_entites_code; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT uk_services_entites_code UNIQUE (code);


--
-- Name: agent_login_codes unique_active_code_per_agent; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT unique_active_code_per_agent UNIQUE (agent_id, code);


--
-- Name: categories_agents unique_agent_categorie_date; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents
    ADD CONSTRAINT unique_agent_categorie_date UNIQUE (id_agent, id_categorie, date_entree);


--
-- Name: echelons_agents unique_agent_echelon_date; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents
    ADD CONSTRAINT unique_agent_echelon_date UNIQUE (id_agent, id_echelon, date_entree);


--
-- Name: grades_agents unique_agent_grade_date; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents
    ADD CONSTRAINT unique_agent_grade_date UNIQUE (id_agent, id_grade, date_entree);


--
-- Name: fonctions unique_libele_ministere; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonctions
    ADD CONSTRAINT unique_libele_ministere UNIQUE (libele, id_ministere);


--
-- Name: emplois unique_libele_ministere_emplois; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emplois
    ADD CONSTRAINT unique_libele_ministere_emplois UNIQUE (libele, id_ministere);


--
-- Name: unite_administratives unite_administratives_libele_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_libele_key UNIQUE (libele);


--
-- Name: unite_administratives unite_administratives_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_username_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_username_key UNIQUE (username);


--
-- Name: webauthn_challenges webauthn_challenges_challenge_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_challenge_key UNIQUE (challenge);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_credential_id_key; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_credential_id_key UNIQUE (credential_id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: workflow_demandes workflow_demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT workflow_demandes_pkey PRIMARY KEY (id);


--
-- Name: idx_affectations_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_affectations_id_agent ON public.affectations_temporaires USING btree (id_agent);


--
-- Name: idx_affectations_institutions_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_affectations_institutions_id_agent ON public.affectations_temporaires_institutions USING btree (id_agent);


--
-- Name: idx_affectations_institutions_statut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_affectations_institutions_statut ON public.affectations_temporaires_institutions USING btree (statut);


--
-- Name: idx_affectations_statut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_affectations_statut ON public.affectations_temporaires USING btree (statut);


--
-- Name: idx_agent_conges_agent_annee; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_agent_annee ON public.agent_conges USING btree (id_agent, annee);


--
-- Name: idx_agent_conges_annee; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_annee ON public.agent_conges USING btree (annee);


--
-- Name: idx_agent_conges_annee_date_depart; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_annee_date_depart ON public.agent_conges USING btree (annee, date_depart_conges);


--
-- Name: idx_agent_conges_annee_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_annee_type ON public.agent_conges USING btree (annee, type_conge);


--
-- Name: idx_agent_conges_date_depart; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_date_depart ON public.agent_conges USING btree (date_depart_conges);


--
-- Name: idx_agent_conges_institutions_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_institutions_agent ON public.agent_conges_institutions USING btree (id_agent);


--
-- Name: idx_agent_conges_institutions_annee; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_institutions_annee ON public.agent_conges_institutions USING btree (annee);


--
-- Name: idx_agent_conges_type_conge; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_conges_type_conge ON public.agent_conges USING btree (type_conge);


--
-- Name: idx_agent_documents_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_documents_agent ON public.agent_documents USING btree (id_agent);


--
-- Name: idx_agent_documents_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_documents_type ON public.agent_documents USING btree (document_type);


--
-- Name: idx_agent_langues_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_langues_agent ON public.agent_langues USING btree (id_agent);


--
-- Name: idx_agent_langues_langue; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_langues_langue ON public.agent_langues USING btree (id_langue);


--
-- Name: idx_agent_logiciels_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_logiciels_agent ON public.agent_logiciels USING btree (id_agent);


--
-- Name: idx_agent_logiciels_logiciel; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_logiciels_logiciel ON public.agent_logiciels USING btree (id_logiciel);


--
-- Name: idx_agent_login_codes_agent_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_login_codes_agent_id ON public.agent_login_codes USING btree (agent_id);


--
-- Name: idx_agent_login_codes_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_login_codes_code ON public.agent_login_codes USING btree (code);


--
-- Name: idx_agent_login_codes_expires_at; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_login_codes_expires_at ON public.agent_login_codes USING btree (expires_at);


--
-- Name: idx_agent_login_codes_used_at; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_login_codes_used_at ON public.agent_login_codes USING btree (used_at);


--
-- Name: idx_agent_photos_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_photos_agent ON public.agent_photos USING btree (id_agent);


--
-- Name: idx_agent_photos_profile; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_photos_profile ON public.agent_photos USING btree (is_profile_photo);


--
-- Name: idx_agent_route_assignments_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_route_assignments_active ON public.agent_route_assignments USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_agent_route_assignments_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_route_assignments_agent ON public.agent_route_assignments USING btree (id_agent);


--
-- Name: idx_agent_route_assignments_route; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_route_assignments_route ON public.agent_route_assignments USING btree (route_id);


--
-- Name: idx_agent_signatures_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agent_signatures_id_agent ON public.agent_signatures USING btree (id_agent);


--
-- Name: idx_agents_associations_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_associations_agent ON public.agents_associations USING btree (id_agent);


--
-- Name: idx_agents_associations_association; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_associations_association ON public.agents_associations USING btree (id_association);


--
-- Name: idx_agents_associations_statut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_associations_statut ON public.agents_associations USING btree (statut);


--
-- Name: idx_agents_date_declaration_cnps; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_date_declaration_cnps ON public.agents USING btree (date_declaration_cnps);


--
-- Name: idx_agents_date_embauche; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_date_embauche ON public.agents USING btree (date_embauche);


--
-- Name: idx_agents_entites_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_id_agent ON public.agents_entites USING btree (id_agent);


--
-- Name: idx_agents_entites_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_id_entite ON public.agents_entites USING btree (id_entite);


--
-- Name: idx_agents_entites_institutions_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_institutions_id_agent ON public.agents_entites_institutions USING btree (id_agent_institution);


--
-- Name: idx_agents_entites_institutions_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_institutions_id_entite ON public.agents_entites_institutions USING btree (id_entite);


--
-- Name: idx_agents_entites_institutions_is_principal; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_institutions_is_principal ON public.agents_entites_institutions USING btree (is_principal);


--
-- Name: idx_agents_entites_is_principal; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_entites_is_principal ON public.agents_entites USING btree (is_principal);


--
-- Name: idx_agents_id_autre_absence; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_autre_absence ON public.agents USING btree (id_autre_absence);


--
-- Name: idx_agents_id_categorie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_categorie ON public.agents USING btree (id_categorie);


--
-- Name: idx_agents_id_diplome; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_diplome ON public.agents USING btree (id_diplome);


--
-- Name: idx_agents_id_distinction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_distinction ON public.agents USING btree (id_distinction);


--
-- Name: idx_agents_id_echelon; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_echelon ON public.agents USING btree (id_echelon);


--
-- Name: idx_agents_id_emploi; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_emploi ON public.agents USING btree (id_emploi);


--
-- Name: idx_agents_id_entite_principale; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_entite_principale ON public.agents USING btree (id_entite_principale);


--
-- Name: idx_agents_id_fonction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_fonction ON public.agents USING btree (id_fonction);


--
-- Name: idx_agents_id_grade; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_grade ON public.agents USING btree (id_grade);


--
-- Name: idx_agents_id_handicap; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_handicap ON public.agents USING btree (id_handicap);


--
-- Name: idx_agents_id_langue; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_langue ON public.agents USING btree (id_langue);


--
-- Name: idx_agents_id_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_localite ON public.agents USING btree (id_localite);


--
-- Name: idx_agents_id_logiciel; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_logiciel ON public.agents USING btree (id_logiciel);


--
-- Name: idx_agents_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_ministere ON public.agents USING btree (id_ministere);


--
-- Name: idx_agents_id_mode_entree; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_mode_entree ON public.agents USING btree (id_mode_entree);


--
-- Name: idx_agents_id_motif_depart; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_motif_depart ON public.agents USING btree (id_motif_depart);


--
-- Name: idx_agents_id_nature_accident; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_nature_accident ON public.agents USING btree (id_nature_accident);


--
-- Name: idx_agents_id_nature_acte; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_nature_acte ON public.agents USING btree (id_nature_acte);


--
-- Name: idx_agents_id_niveau_informatique; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_niveau_informatique ON public.agents USING btree (id_niveau_informatique);


--
-- Name: idx_agents_id_niveau_langue; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_niveau_langue ON public.agents USING btree (id_niveau_langue);


--
-- Name: idx_agents_id_pathologie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_pathologie ON public.agents USING btree (id_pathologie);


--
-- Name: idx_agents_id_pays; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_pays ON public.agents USING btree (id_pays);


--
-- Name: idx_agents_id_position; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_position ON public.agents USING btree (id_position);


--
-- Name: idx_agents_id_sanction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_sanction ON public.agents USING btree (id_sanction);


--
-- Name: idx_agents_id_sindicat; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_sindicat ON public.agents USING btree (id_sindicat);


--
-- Name: idx_agents_id_specialite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_specialite ON public.agents USING btree (id_specialite);


--
-- Name: idx_agents_id_type_conge; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_conge ON public.agents USING btree (id_type_conge);


--
-- Name: idx_agents_id_type_courrier; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_courrier ON public.agents USING btree (id_type_courrier);


--
-- Name: idx_agents_id_type_destination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_destination ON public.agents USING btree (id_type_destination);


--
-- Name: idx_agents_id_type_etablissement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_etablissement ON public.agents USING btree (id_type_etablissement);


--
-- Name: idx_agents_id_type_materiel; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_materiel ON public.agents USING btree (id_type_materiel);


--
-- Name: idx_agents_id_type_retraite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_type_retraite ON public.agents USING btree (id_type_retraite);


--
-- Name: idx_agents_id_unite_administrative; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_id_unite_administrative ON public.agents USING btree (id_unite_administrative);


--
-- Name: idx_agents_institutions_main_date_embauche; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_institutions_main_date_embauche ON public.agents_institutions_main USING btree (date_embauche);


--
-- Name: idx_agents_institutions_main_id_entite_principale; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_institutions_main_id_entite_principale ON public.agents_institutions_main USING btree (id_entite_principale);


--
-- Name: idx_agents_institutions_main_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_institutions_main_id_institution ON public.agents_institutions_main USING btree (id_institution);


--
-- Name: idx_agents_institutions_main_statut_emploi; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_institutions_main_statut_emploi ON public.agents_institutions_main USING btree (statut_emploi);


--
-- Name: idx_agents_numero_cnps; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_numero_cnps ON public.agents USING btree (numero_cnps);


--
-- Name: idx_agents_service; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_service ON public.agents USING btree (id_service);


--
-- Name: idx_agents_sindicats_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_sindicats_agent ON public.agents_sindicats USING btree (id_agent);


--
-- Name: idx_agents_sindicats_sindicat; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_sindicats_sindicat ON public.agents_sindicats USING btree (id_sindicat);


--
-- Name: idx_agents_sindicats_statut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_sindicats_statut ON public.agents_sindicats USING btree (statut);


--
-- Name: idx_agents_sous_direction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_sous_direction ON public.agents USING btree (id_sous_direction);


--
-- Name: idx_agents_statut_emploi; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_agents_statut_emploi ON public.agents USING btree (statut_emploi);


--
-- Name: idx_associations_libele; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_associations_libele ON public.associations USING btree (libele);


--
-- Name: idx_categories_agents_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_categories_agents_agent ON public.categories_agents USING btree (id_agent);


--
-- Name: idx_categories_agents_categorie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_categories_agents_categorie ON public.categories_agents USING btree (id_categorie);


--
-- Name: idx_categories_agents_date_entree; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_categories_agents_date_entree ON public.categories_agents USING btree (date_entree);


--
-- Name: idx_categories_agents_date_sortie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_categories_agents_date_sortie ON public.categories_agents USING btree (date_sortie);


--
-- Name: idx_categories_agents_nomination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_categories_agents_nomination ON public.categories_agents USING btree (id_nomination);


--
-- Name: idx_classeurs_id_dossier; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_classeurs_id_dossier ON public.classeurs USING btree (id_dossier);


--
-- Name: idx_classeurs_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_classeurs_id_ministere ON public.classeurs USING btree (id_ministere);


--
-- Name: idx_classeurs_institutions_id_dossier; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_classeurs_institutions_id_dossier ON public.classeurs_institutions USING btree (id_dossier);


--
-- Name: idx_classeurs_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_classeurs_institutions_id_institution ON public.classeurs_institutions USING btree (id_institution);


--
-- Name: idx_decisions_annee_decision; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_annee_decision ON public.decisions USING btree (annee_decision);


--
-- Name: idx_decisions_created_by; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_created_by ON public.decisions USING btree (created_by);


--
-- Name: idx_decisions_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_date ON public.decisions USING btree (date_decision);


--
-- Name: idx_decisions_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_id_agent ON public.decisions USING btree (id_agent);


--
-- Name: idx_decisions_id_direction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_id_direction ON public.decisions USING btree (id_direction);


--
-- Name: idx_decisions_id_sous_direction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_id_sous_direction ON public.decisions USING btree (id_sous_direction);


--
-- Name: idx_decisions_institutions_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_institutions_agent ON public.decisions_institutions USING btree (id_agent);


--
-- Name: idx_decisions_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_institutions_institution ON public.decisions_institutions USING btree (id_institution);


--
-- Name: idx_decisions_institutions_numero; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_institutions_numero ON public.decisions_institutions USING btree (numero_decision);


--
-- Name: idx_decisions_institutions_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_institutions_type ON public.decisions_institutions USING btree (type_decision);


--
-- Name: idx_decisions_is_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_is_active ON public.decisions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_decisions_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_decisions_type ON public.decisions USING btree (type);


--
-- Name: idx_demandes_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_agent ON public.demandes USING btree (id_agent);


--
-- Name: idx_demandes_certificat_cessation; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_certificat_cessation ON public.demandes USING btree (type_demande, date_cessation) WHERE ((type_demande)::text = 'certificat_cessation'::text);


--
-- Name: idx_demandes_certificat_reprise_service; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_certificat_reprise_service ON public.demandes USING btree (type_demande, date_reprise_service) WHERE ((type_demande)::text = 'certificat_reprise_service'::text);


--
-- Name: idx_demandes_creation; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_creation ON public.demandes USING btree (date_creation);


--
-- Name: idx_demandes_date_cessation; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_cessation ON public.demandes USING btree (date_cessation);


--
-- Name: idx_demandes_date_fin_conges; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_fin_conges ON public.demandes USING btree (date_fin_conges);


--
-- Name: idx_demandes_date_reprise_service; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_reprise_service ON public.demandes USING btree (date_reprise_service);


--
-- Name: idx_demandes_date_validation_dir_cabinet; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_validation_dir_cabinet ON public.demandes USING btree (date_validation_dir_cabinet);


--
-- Name: idx_demandes_date_validation_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_validation_directeur ON public.demandes USING btree (date_validation_directeur);


--
-- Name: idx_demandes_date_validation_sous_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_date_validation_sous_directeur ON public.demandes USING btree (date_validation_sous_directeur);


--
-- Name: idx_demandes_dates; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_dates ON public.demandes USING btree (date_debut, date_fin);


--
-- Name: idx_demandes_id_validateur_chef_cabinet; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_chef_cabinet ON public.demandes USING btree (id_validateur_chef_cabinet);


--
-- Name: idx_demandes_id_validateur_dir_cabinet; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_dir_cabinet ON public.demandes USING btree (id_validateur_dir_cabinet);


--
-- Name: idx_demandes_id_validateur_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_directeur ON public.demandes USING btree (id_validateur_directeur);


--
-- Name: idx_demandes_id_validateur_directeur_central; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_directeur_central ON public.demandes USING btree (id_validateur_directeur_central);


--
-- Name: idx_demandes_id_validateur_directeur_general; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_directeur_general ON public.demandes USING btree (id_validateur_directeur_general);


--
-- Name: idx_demandes_id_validateur_sous_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_id_validateur_sous_directeur ON public.demandes USING btree (id_validateur_sous_directeur);


--
-- Name: idx_demandes_institutions_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_agent ON public.demandes_institutions USING btree (id_agent);


--
-- Name: idx_demandes_institutions_dates; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_dates ON public.demandes_institutions USING btree (date_debut, date_fin);


--
-- Name: idx_demandes_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_institution ON public.demandes_institutions USING btree (id_institution);


--
-- Name: idx_demandes_institutions_niveau; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_niveau ON public.demandes_institutions USING btree (niveau_actuel);


--
-- Name: idx_demandes_institutions_status; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_status ON public.demandes_institutions USING btree (status);


--
-- Name: idx_demandes_institutions_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_institutions_type ON public.demandes_institutions USING btree (type_demande);


--
-- Name: idx_demandes_motif; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_motif ON public.demandes USING btree (motif);


--
-- Name: idx_demandes_niveau; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_niveau ON public.demandes USING btree (niveau_evolution_demande);


--
-- Name: idx_demandes_niveau_actuel; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_niveau_actuel ON public.demandes USING btree (niveau_actuel);


--
-- Name: idx_demandes_phase; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_phase ON public.demandes USING btree (phase);


--
-- Name: idx_demandes_priorite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_priorite ON public.demandes USING btree (priorite);


--
-- Name: idx_demandes_status; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_status ON public.demandes USING btree (status);


--
-- Name: idx_demandes_statut_chef_cabinet; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_chef_cabinet ON public.demandes USING btree (statut_chef_cabinet);


--
-- Name: idx_demandes_statut_dir_cabinet; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_dir_cabinet ON public.demandes USING btree (statut_dir_cabinet);


--
-- Name: idx_demandes_statut_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_directeur ON public.demandes USING btree (statut_directeur);


--
-- Name: idx_demandes_statut_directeur_central; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_directeur_central ON public.demandes USING btree (statut_directeur_central);


--
-- Name: idx_demandes_statut_directeur_general; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_directeur_general ON public.demandes USING btree (statut_directeur_general);


--
-- Name: idx_demandes_statut_sous_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_statut_sous_directeur ON public.demandes USING btree (statut_sous_directeur);


--
-- Name: idx_demandes_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_demandes_type ON public.demandes USING btree (type_demande);


--
-- Name: idx_departements_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_active ON public.departements USING btree (id) WHERE (is_active = true);


--
-- Name: idx_departements_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_code ON public.departements USING btree (code);


--
-- Name: idx_departements_created_at; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_created_at ON public.departements USING btree (created_at);


--
-- Name: idx_departements_id_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_id_region ON public.departements USING btree (id_region);


--
-- Name: INDEX idx_departements_id_region; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_departements_id_region IS 'Index sur la relation département-région';


--
-- Name: idx_departements_is_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_is_active ON public.departements USING btree (is_active);


--
-- Name: idx_departements_libele; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_libele ON public.departements USING btree (libele);


--
-- Name: idx_departements_region_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_departements_region_active ON public.departements USING btree (id_region, is_active);


--
-- Name: idx_directions_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_directions_institutions_institution ON public.directions_institutions USING btree (id_institution);


--
-- Name: idx_directions_institutions_responsable; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_directions_institutions_responsable ON public.directions_institutions USING btree (responsable_id);


--
-- Name: idx_documents_autorisation_demande; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_documents_autorisation_demande ON public.documents_autorisation USING btree (id_demande);


--
-- Name: idx_documents_autorisation_destinataire; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_documents_autorisation_destinataire ON public.documents_autorisation USING btree (id_agent_destinataire);


--
-- Name: idx_documents_autorisation_statut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_documents_autorisation_statut ON public.documents_autorisation USING btree (statut);


--
-- Name: idx_documents_autorisation_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_documents_autorisation_type ON public.documents_autorisation USING btree (type_document);


--
-- Name: idx_dossiers_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_dossiers_id_entite ON public.dossiers USING btree (id_entite);


--
-- Name: idx_dossiers_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_dossiers_id_ministere ON public.dossiers USING btree (id_ministere);


--
-- Name: idx_dossiers_institutions_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_dossiers_institutions_id_entite ON public.dossiers_institutions USING btree (id_entite);


--
-- Name: idx_dossiers_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_dossiers_institutions_id_institution ON public.dossiers_institutions USING btree (id_institution);


--
-- Name: idx_echelons_agents_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_echelons_agents_agent ON public.echelons_agents USING btree (id_agent);


--
-- Name: idx_echelons_agents_date_entree; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_echelons_agents_date_entree ON public.echelons_agents USING btree (date_entree);


--
-- Name: idx_echelons_agents_date_sortie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_echelons_agents_date_sortie ON public.echelons_agents USING btree (date_sortie);


--
-- Name: idx_echelons_agents_echelon; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_echelons_agents_echelon ON public.echelons_agents USING btree (id_echelon);


--
-- Name: idx_echelons_agents_nomination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_echelons_agents_nomination ON public.echelons_agents USING btree (id_nomination);


--
-- Name: idx_emploi_agents_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_emploi_agents_id_agent ON public.emploi_agents USING btree (id_agent);


--
-- Name: idx_emploi_agents_id_emploi; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_emploi_agents_id_emploi ON public.emploi_agents USING btree (id_emploi);


--
-- Name: idx_emploi_agents_id_nomination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_emploi_agents_id_nomination ON public.emploi_agents USING btree (id_nomination);


--
-- Name: idx_emplois_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_emplois_id_ministere ON public.emplois USING btree (id_ministere);


--
-- Name: idx_entites_admin_geo_hierarchy; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_admin_geo_hierarchy ON public.entites_administratives USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_entites_admin_geo_hierarchy; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_entites_admin_geo_hierarchy IS 'Index composite pour les requêtes géographiques des entités administratives';


--
-- Name: idx_entites_admin_id_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_admin_id_departement ON public.entites_administratives USING btree (id_departement);


--
-- Name: idx_entites_admin_id_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_admin_id_localite ON public.entites_administratives USING btree (id_localite);


--
-- Name: idx_entites_admin_id_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_admin_id_region ON public.entites_administratives USING btree (id_region);


--
-- Name: idx_entites_administratives_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_administratives_code ON public.entites_administratives USING btree (code);


--
-- Name: idx_entites_id_entite_parent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_id_entite_parent ON public.entites_administratives USING btree (id_entite_parent);


--
-- Name: idx_entites_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_id_institution ON public.entites_institutions USING btree (id_institution);


--
-- Name: idx_entites_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_id_ministere ON public.entites_administratives USING btree (id_ministere);


--
-- Name: idx_entites_institutions_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_code ON public.entites_institutions USING btree (code);


--
-- Name: idx_entites_institutions_geo_hierarchy; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_geo_hierarchy ON public.entites_institutions USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_entites_institutions_geo_hierarchy; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_entites_institutions_geo_hierarchy IS 'Index composite pour les requêtes géographiques des entités institutions';


--
-- Name: idx_entites_institutions_id_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_id_departement ON public.entites_institutions USING btree (id_departement);


--
-- Name: idx_entites_institutions_id_entite_parent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_id_entite_parent ON public.entites_institutions USING btree (id_entite_parent);


--
-- Name: idx_entites_institutions_id_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_id_localite ON public.entites_institutions USING btree (id_localite);


--
-- Name: idx_entites_institutions_id_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_id_region ON public.entites_institutions USING btree (id_region);


--
-- Name: idx_entites_institutions_type_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_institutions_type_entite ON public.entites_institutions USING btree (type_entite);


--
-- Name: idx_entites_type_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_entites_type_entite ON public.entites_administratives USING btree (type_entite);


--
-- Name: idx_etude_diplome_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_etude_diplome_agent ON public.etude_diplome USING btree (id_agent);


--
-- Name: idx_etude_diplome_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_etude_diplome_date ON public.etude_diplome USING btree (date_diplome);


--
-- Name: idx_etude_diplome_document; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_etude_diplome_document ON public.etude_diplome USING btree (id_agent_document);


--
-- Name: idx_etude_diplome_ecole; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_etude_diplome_ecole ON public.etude_diplome USING btree (ecole);


--
-- Name: idx_fonction_agents_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_fonction_agents_id_agent ON public.fonction_agents USING btree (id_agent);


--
-- Name: idx_fonction_agents_id_fonction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_fonction_agents_id_fonction ON public.fonction_agents USING btree (id_fonction);


--
-- Name: idx_fonction_agents_id_nomination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_fonction_agents_id_nomination ON public.fonction_agents USING btree (id_nomination);


--
-- Name: idx_fonctions_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_fonctions_id_ministere ON public.fonctions USING btree (id_ministere);


--
-- Name: idx_geo_hierarchy_departement_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_geo_hierarchy_departement_localite ON public.localites USING btree (id_departement, id);


--
-- Name: INDEX idx_geo_hierarchy_departement_localite; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_geo_hierarchy_departement_localite IS 'Index composite pour la hiérarchie département-localité';


--
-- Name: idx_geo_hierarchy_region_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_geo_hierarchy_region_departement ON public.departements USING btree (id_region, id);


--
-- Name: INDEX idx_geo_hierarchy_region_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_geo_hierarchy_region_departement IS 'Index composite pour la hiérarchie région-département';


--
-- Name: idx_geo_stats_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_geo_stats_departement ON public.ministeres USING btree (id_departement) WHERE (id_departement IS NOT NULL);


--
-- Name: idx_geo_stats_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_geo_stats_localite ON public.ministeres USING btree (id_localite) WHERE (id_localite IS NOT NULL);


--
-- Name: idx_geo_stats_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_geo_stats_region ON public.ministeres USING btree (id_region) WHERE (id_region IS NOT NULL);


--
-- Name: idx_grades_agents_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_agents_agent ON public.grades_agents USING btree (id_agent);


--
-- Name: idx_grades_agents_date_entree; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_agents_date_entree ON public.grades_agents USING btree (date_entree);


--
-- Name: idx_grades_agents_date_sortie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_agents_date_sortie ON public.grades_agents USING btree (date_sortie);


--
-- Name: idx_grades_agents_grade; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_agents_grade ON public.grades_agents USING btree (id_grade);


--
-- Name: idx_grades_agents_nomination; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_agents_nomination ON public.grades_agents USING btree (id_nomination);


--
-- Name: idx_grades_id_categorie; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_grades_id_categorie ON public.grades USING btree (id_categorie);


--
-- Name: idx_historique_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_historique_agent ON public.historique_retrait_restauration USING btree (id_agent);


--
-- Name: idx_historique_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_historique_date ON public.demandes_historique USING btree (date_modification);


--
-- Name: idx_historique_demande; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_historique_demande ON public.demandes_historique USING btree (id_demande);


--
-- Name: idx_historique_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_historique_type ON public.historique_retrait_restauration USING btree (type_action);


--
-- Name: idx_institutions_geo_hierarchy; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_institutions_geo_hierarchy ON public.institutions USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_institutions_geo_hierarchy; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_institutions_geo_hierarchy IS 'Index composite pour les requêtes géographiques des institutions';


--
-- Name: idx_institutions_id_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_institutions_id_departement ON public.institutions USING btree (id_departement);


--
-- Name: idx_institutions_id_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_institutions_id_localite ON public.institutions USING btree (id_localite);


--
-- Name: idx_institutions_id_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_institutions_id_region ON public.institutions USING btree (id_region);


--
-- Name: idx_jours_feries_annee; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_jours_feries_annee ON public.jours_feries USING btree (annee);


--
-- Name: idx_jours_feries_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_jours_feries_date ON public.jours_feries USING btree (date_feriee);


--
-- Name: idx_localites_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_active ON public.localites USING btree (id) WHERE (is_active = true);


--
-- Name: idx_localites_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_code ON public.localites USING btree (code);


--
-- Name: idx_localites_created_at; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_created_at ON public.localites USING btree (created_at);


--
-- Name: idx_localites_departement_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_departement_active ON public.localites USING btree (id_departement, is_active);


--
-- Name: idx_localites_id_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_id_departement ON public.localites USING btree (id_departement);


--
-- Name: INDEX idx_localites_id_departement; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_localites_id_departement IS 'Index sur la relation localité-département';


--
-- Name: idx_localites_is_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_is_active ON public.localites USING btree (is_active);


--
-- Name: idx_localites_libele; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_libele ON public.localites USING btree (libele);


--
-- Name: idx_localites_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_type ON public.localites USING btree (type_localite);


--
-- Name: idx_localites_type_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_localites_type_active ON public.localites USING btree (type_localite, is_active);


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address);


--
-- Name: idx_login_attempts_username; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_login_attempts_username ON public.login_attempts USING btree (username);


--
-- Name: idx_ministeres_geo_hierarchy; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_ministeres_geo_hierarchy ON public.ministeres USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_ministeres_geo_hierarchy; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_ministeres_geo_hierarchy IS 'Index composite pour les requêtes géographiques des ministères';


--
-- Name: idx_ministeres_id_departement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_ministeres_id_departement ON public.ministeres USING btree (id_departement);


--
-- Name: idx_ministeres_id_localite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_ministeres_id_localite ON public.ministeres USING btree (id_localite);


--
-- Name: idx_ministeres_id_region; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_ministeres_id_region ON public.ministeres USING btree (id_region);


--
-- Name: idx_ministeres_responsable_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_ministeres_responsable_id ON public.ministeres USING btree (responsable_id);


--
-- Name: idx_nominations_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_nominations_agent ON public.nominations USING btree (id_agent);


--
-- Name: idx_nominations_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_nominations_date ON public.nominations USING btree (date_signature);


--
-- Name: idx_nominations_nature; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_nominations_nature ON public.nominations USING btree (nature);


--
-- Name: idx_notifications_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_notifications_agent ON public.notifications_demandes USING btree (id_agent_destinataire);


--
-- Name: idx_notifications_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_notifications_date ON public.notifications_demandes USING btree (date_creation);


--
-- Name: idx_notifications_demande; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_notifications_demande ON public.notifications_demandes USING btree (id_demande);


--
-- Name: idx_notifications_lu; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_notifications_lu ON public.notifications_demandes USING btree (lu);


--
-- Name: idx_pays_nationalite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_pays_nationalite ON public.pays USING btree (id_nationalite);


--
-- Name: idx_permissions_entites_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_permissions_entites_id_entite ON public.permissions_entites USING btree (id_entite);


--
-- Name: idx_permissions_entites_id_role; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_permissions_entites_id_role ON public.permissions_entites USING btree (id_role);


--
-- Name: idx_permissions_entites_institutions_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_permissions_entites_institutions_id_entite ON public.permissions_entites_institutions USING btree (id_entite);


--
-- Name: idx_permissions_entites_institutions_id_role; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_permissions_entites_institutions_id_role ON public.permissions_entites_institutions USING btree (id_role);


--
-- Name: idx_planning_prev_institutions_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_planning_prev_institutions_agent ON public.planning_previsionnel_institutions USING btree (id_agent);


--
-- Name: idx_planning_prev_institutions_annee; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_planning_prev_institutions_annee ON public.planning_previsionnel_institutions USING btree (annee);


--
-- Name: idx_planning_prev_institutions_dates; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_planning_prev_institutions_dates ON public.planning_previsionnel_institutions USING btree (date_debut_prevue, date_fin_prevue);


--
-- Name: idx_planning_prev_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_planning_prev_institutions_institution ON public.planning_previsionnel_institutions USING btree (id_institution);


--
-- Name: idx_prolongements_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_prolongements_agent ON public.prolongements_retraite USING btree (id_agent);


--
-- Name: idx_prolongements_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_prolongements_date ON public.prolongements_retraite USING btree (date_prolongement);


--
-- Name: idx_prolongements_numero_acte; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_prolongements_numero_acte ON public.prolongements_retraite USING btree (numero_acte);


--
-- Name: idx_regions_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_regions_active ON public.regions USING btree (id) WHERE (is_active = true);


--
-- Name: idx_regions_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_regions_code ON public.regions USING btree (code);


--
-- Name: INDEX idx_regions_code; Type: COMMENT; Schema: public; Owner: isegroup_tourisme
--

COMMENT ON INDEX public.idx_regions_code IS 'Index sur le code de région pour les recherches rapides';


--
-- Name: idx_regions_created_at; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_regions_created_at ON public.regions USING btree (created_at);


--
-- Name: idx_regions_is_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_regions_is_active ON public.regions USING btree (is_active);


--
-- Name: idx_regions_libele; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_regions_libele ON public.regions USING btree (libele);


--
-- Name: idx_seminaire_formation_date_debut; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_formation_date_debut ON public.seminaire_formation USING btree (date_debut);


--
-- Name: idx_seminaire_formation_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_formation_id_entite ON public.seminaire_formation USING btree (id_entite);


--
-- Name: idx_seminaire_formation_organisme; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_formation_organisme ON public.seminaire_formation USING btree (type_organisme, id_entite);


--
-- Name: idx_seminaire_institutions_dates; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_institutions_dates ON public.seminaire_formation_institutions USING btree (date_debut, date_fin);


--
-- Name: idx_seminaire_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_institutions_institution ON public.seminaire_formation_institutions USING btree (id_institution);


--
-- Name: idx_seminaire_institutions_type; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_institutions_type ON public.seminaire_formation_institutions USING btree (id_type_seminaire);


--
-- Name: idx_seminaire_part_institutions_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_part_institutions_agent ON public.seminaire_participants_institutions USING btree (id_agent);


--
-- Name: idx_seminaire_part_institutions_seminaire; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_part_institutions_seminaire ON public.seminaire_participants_institutions USING btree (id_seminaire);


--
-- Name: idx_seminaire_participants_id_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_participants_id_agent ON public.seminaire_participants USING btree (id_agent);


--
-- Name: idx_seminaire_participants_id_seminaire; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_seminaire_participants_id_seminaire ON public.seminaire_participants USING btree (id_seminaire);


--
-- Name: idx_services_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_active ON public.services USING btree (is_active);


--
-- Name: idx_services_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_entite ON public.services USING btree (id_entite);


--
-- Name: idx_services_entites_code; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_entites_code ON public.services_entites USING btree (code);


--
-- Name: idx_services_entites_id_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_entites_id_entite ON public.services_entites USING btree (id_entite);


--
-- Name: idx_services_entites_is_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_entites_is_active ON public.services_entites USING btree (is_active);


--
-- Name: idx_services_entites_responsable; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_entites_responsable ON public.services_entites USING btree (responsable_id);


--
-- Name: idx_services_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_id_ministere ON public.directions USING btree (id_ministere);


--
-- Name: idx_services_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_institutions_id_institution ON public.services_institutions USING btree (id_institution);


--
-- Name: idx_services_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_ministere ON public.services USING btree (id_ministere);


--
-- Name: idx_services_responsable; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_responsable ON public.services USING btree (responsable_id);


--
-- Name: idx_services_responsable_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_responsable_id ON public.directions USING btree (responsable_id);


--
-- Name: idx_services_sous_direction_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_sous_direction_id ON public.services USING btree (id_sous_direction);


--
-- Name: idx_services_type_service; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_services_type_service ON public.services USING btree (type_service);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sous_directions_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_active ON public.sous_directions USING btree (is_active);


--
-- Name: idx_sous_directions_direction_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_direction_id ON public.sous_directions USING btree (id_direction);


--
-- Name: idx_sous_directions_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_entite ON public.sous_directions USING btree (id_entite);


--
-- Name: idx_sous_directions_institutions_direction; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_institutions_direction ON public.sous_directions_institutions USING btree (id_direction);


--
-- Name: idx_sous_directions_institutions_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_institutions_institution ON public.sous_directions_institutions USING btree (id_institution);


--
-- Name: idx_sous_directions_institutions_responsable; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_institutions_responsable ON public.sous_directions_institutions USING btree (responsable_id);


--
-- Name: idx_sous_directions_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_ministere ON public.sous_directions USING btree (id_ministere);


--
-- Name: idx_sous_directions_sous_directeur; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_sous_directions_sous_directeur ON public.sous_directions USING btree (sous_directeur_id);


--
-- Name: idx_stage_agent; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_stage_agent ON public.stage USING btree (id_agent);


--
-- Name: idx_stage_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_stage_date ON public.stage USING btree (date_stage);


--
-- Name: idx_stage_etablissement; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_stage_etablissement ON public.stage USING btree (etablissement);


--
-- Name: idx_tiers_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_tiers_id_ministere ON public.tiers USING btree (id_ministere);


--
-- Name: idx_tiers_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_tiers_institutions_id_institution ON public.tiers_institutions USING btree (id_institution);


--
-- Name: idx_type_documents_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_documents_id_ministere ON public.type_de_documents USING btree (id_ministere);


--
-- Name: idx_type_documents_id_service_entite; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_documents_id_service_entite ON public.type_de_documents USING btree (id_service_entite);


--
-- Name: idx_type_documents_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_documents_institutions_id_institution ON public.type_de_documents_institutions USING btree (id_institution);


--
-- Name: idx_type_formations_libele; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_formations_libele ON public.type_formations USING btree (libele);


--
-- Name: idx_type_seminaire_id_ministere; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_seminaire_id_ministere ON public.type_de_seminaire_de_formation USING btree (id_ministere);


--
-- Name: idx_type_seminaire_institutions_id_institution; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_type_seminaire_institutions_id_institution ON public.type_de_seminaire_de_formation_institutions USING btree (id_institution);


--
-- Name: idx_utilisateurs_email; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_utilisateurs_email ON public.utilisateurs USING btree (email);


--
-- Name: idx_utilisateurs_id_role; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_utilisateurs_id_role ON public.utilisateurs USING btree (id_role);


--
-- Name: idx_utilisateurs_username; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_utilisateurs_username ON public.utilisateurs USING btree (username);


--
-- Name: idx_webauthn_challenges_challenge; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_challenges_challenge ON public.webauthn_challenges USING btree (challenge);


--
-- Name: idx_webauthn_challenges_expires; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges USING btree (expires_at);


--
-- Name: idx_webauthn_challenges_user; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_challenges_user ON public.webauthn_challenges USING btree (id_utilisateur);


--
-- Name: idx_webauthn_credentials_active; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_credentials_active ON public.webauthn_credentials USING btree (is_active);


--
-- Name: idx_webauthn_credentials_id; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_credentials_id ON public.webauthn_credentials USING btree (credential_id);


--
-- Name: idx_webauthn_credentials_user; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_webauthn_credentials_user ON public.webauthn_credentials USING btree (id_utilisateur);


--
-- Name: idx_workflow_date; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_workflow_date ON public.workflow_demandes USING btree (date_action);


--
-- Name: idx_workflow_demande; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_workflow_demande ON public.workflow_demandes USING btree (id_demande);


--
-- Name: idx_workflow_niveau; Type: INDEX; Schema: public; Owner: isegroup_tourisme
--

CREATE INDEX idx_workflow_niveau ON public.workflow_demandes USING btree (niveau_validation);


--
-- Name: demandes tr_demandes_assign_hierarchy; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER tr_demandes_assign_hierarchy AFTER INSERT ON public.demandes FOR EACH ROW EXECUTE FUNCTION public.tr_demandes_assign_hierarchy();


--
-- Name: demandes tr_demandes_historique_update; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER tr_demandes_historique_update AFTER UPDATE ON public.demandes FOR EACH ROW EXECUTE FUNCTION public.tr_demandes_historique_update();


--
-- Name: demandes tr_demandes_update_modified; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER tr_demandes_update_modified BEFORE UPDATE ON public.demandes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: entites_administratives trg_validate_entity_code; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trg_validate_entity_code BEFORE INSERT OR UPDATE ON public.entites_administratives FOR EACH ROW EXECUTE FUNCTION public.validate_entity_code_uniqueness();


--
-- Name: entites_institutions trg_validate_institution_code; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trg_validate_institution_code BEFORE INSERT OR UPDATE ON public.entites_institutions FOR EACH ROW EXECUTE FUNCTION public.validate_institution_code_uniqueness();


--
-- Name: agent_conges trigger_recalculer_jours_restants; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_recalculer_jours_restants BEFORE INSERT OR UPDATE ON public.agent_conges FOR EACH ROW EXECUTE FUNCTION public.recalculer_jours_restants();


--
-- Name: agent_conges trigger_update_agent_conges_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_update_agent_conges_updated_at BEFORE UPDATE ON public.agent_conges FOR EACH ROW EXECUTE FUNCTION public.update_agent_conges_updated_at();


--
-- Name: categories_agents trigger_update_categories_agents_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_update_categories_agents_updated_at BEFORE UPDATE ON public.categories_agents FOR EACH ROW EXECUTE FUNCTION public.update_categories_agents_updated_at();


--
-- Name: echelons_agents trigger_update_echelons_agents_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_update_echelons_agents_updated_at BEFORE UPDATE ON public.echelons_agents FOR EACH ROW EXECUTE FUNCTION public.update_echelons_agents_updated_at();


--
-- Name: grades_agents trigger_update_grades_agents_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_update_grades_agents_updated_at BEFORE UPDATE ON public.grades_agents FOR EACH ROW EXECUTE FUNCTION public.update_grades_agents_updated_at();


--
-- Name: jours_feries trigger_update_jours_feries_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER trigger_update_jours_feries_updated_at BEFORE UPDATE ON public.jours_feries FOR EACH ROW EXECUTE FUNCTION public.update_jours_feries_updated_at();


--
-- Name: agent_conges_institutions update_agent_conges_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_agent_conges_institutions_updated_at BEFORE UPDATE ON public.agent_conges_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: decisions_institutions update_decisions_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_decisions_institutions_updated_at BEFORE UPDATE ON public.decisions_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demandes_institutions update_demandes_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_demandes_institutions_updated_at BEFORE UPDATE ON public.demandes_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: directions_institutions update_directions_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_directions_institutions_updated_at BEFORE UPDATE ON public.directions_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: planning_previsionnel_institutions update_planning_previsionnel_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_planning_previsionnel_institutions_updated_at BEFORE UPDATE ON public.planning_previsionnel_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seminaire_formation_institutions update_seminaire_formation_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_seminaire_formation_institutions_updated_at BEFORE UPDATE ON public.seminaire_formation_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services update_services_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sous_directions_institutions update_sous_directions_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_sous_directions_institutions_updated_at BEFORE UPDATE ON public.sous_directions_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sous_directions update_sous_directions_updated_at; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_sous_directions_updated_at BEFORE UPDATE ON public.sous_directions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: affectations_temporaires update_updated_at_affectations_temporaires; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_affectations_temporaires BEFORE UPDATE ON public.affectations_temporaires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: affectations_temporaires_institutions update_updated_at_affectations_temporaires_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_affectations_temporaires_institutions BEFORE UPDATE ON public.affectations_temporaires_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents update_updated_at_agents; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_agents BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents_entites update_updated_at_agents_entites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_agents_entites BEFORE UPDATE ON public.agents_entites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents_entites_institutions update_updated_at_agents_entites_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_agents_entites_institutions BEFORE UPDATE ON public.agents_entites_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents_institutions_main update_updated_at_agents_institutions_main; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_agents_institutions_main BEFORE UPDATE ON public.agents_institutions_main FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: autre_absences update_updated_at_autre_absences; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_autre_absences BEFORE UPDATE ON public.autre_absences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_updated_at_categories; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: civilites update_updated_at_civilites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_civilites BEFORE UPDATE ON public.civilites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classeurs update_updated_at_classeurs; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_classeurs BEFORE UPDATE ON public.classeurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classeurs_institutions update_updated_at_classeurs_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_classeurs_institutions BEFORE UPDATE ON public.classeurs_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: diplomes update_updated_at_diplomes; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_diplomes BEFORE UPDATE ON public.diplomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: distinctions update_updated_at_distinctions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_distinctions BEFORE UPDATE ON public.distinctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dossiers update_updated_at_dossiers; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_dossiers BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dossiers_institutions update_updated_at_dossiers_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_dossiers_institutions BEFORE UPDATE ON public.dossiers_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: echelons update_updated_at_echelons; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_echelons BEFORE UPDATE ON public.echelons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: emplois update_updated_at_emplois; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_emplois BEFORE UPDATE ON public.emplois FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: enfants update_updated_at_enfants; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_enfants BEFORE UPDATE ON public.enfants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: enfants_institutions update_updated_at_enfants_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_enfants_institutions BEFORE UPDATE ON public.enfants_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entites_administratives update_updated_at_entites_administratives; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_entites_administratives BEFORE UPDATE ON public.entites_administratives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entites_institutions update_updated_at_entites_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_entites_institutions BEFORE UPDATE ON public.entites_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fonctions update_updated_at_fonctions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_fonctions BEFORE UPDATE ON public.fonctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grades update_updated_at_grades; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_grades BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: handicaps update_updated_at_handicaps; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_handicaps BEFORE UPDATE ON public.handicaps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: institutions update_updated_at_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_institutions BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: langues update_updated_at_langues; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_langues BEFORE UPDATE ON public.langues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: localites update_updated_at_localites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_localites BEFORE UPDATE ON public.localites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: logiciels update_updated_at_logiciels; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_logiciels BEFORE UPDATE ON public.logiciels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: login_attempts update_updated_at_login_attempts; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_login_attempts BEFORE UPDATE ON public.login_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ministeres update_updated_at_ministeres; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_ministeres BEFORE UPDATE ON public.ministeres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mode_d_entrees update_updated_at_mode_d_entrees; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_mode_d_entrees BEFORE UPDATE ON public.mode_d_entrees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: motif_de_departs update_updated_at_motif_de_departs; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_motif_de_departs BEFORE UPDATE ON public.motif_de_departs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nationalites update_updated_at_nationalites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_nationalites BEFORE UPDATE ON public.nationalites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nature_actes update_updated_at_nature_actes; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_nature_actes BEFORE UPDATE ON public.nature_actes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nature_d_accidents update_updated_at_nature_d_accidents; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_nature_d_accidents BEFORE UPDATE ON public.nature_d_accidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: niveau_informatiques update_updated_at_niveau_informatiques; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_niveau_informatiques BEFORE UPDATE ON public.niveau_informatiques FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: niveau_langues update_updated_at_niveau_langues; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_niveau_langues BEFORE UPDATE ON public.niveau_langues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pathologies update_updated_at_pathologies; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_pathologies BEFORE UPDATE ON public.pathologies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pays update_updated_at_pays; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_pays BEFORE UPDATE ON public.pays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: permissions_entites update_updated_at_permissions_entites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_permissions_entites BEFORE UPDATE ON public.permissions_entites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: permissions_entites_institutions update_updated_at_permissions_entites_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_permissions_entites_institutions BEFORE UPDATE ON public.permissions_entites_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: positions update_updated_at_positions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_positions BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_updated_at_roles; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sanctions update_updated_at_sanctions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_sanctions BEFORE UPDATE ON public.sanctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: directions update_updated_at_services; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_services BEFORE UPDATE ON public.directions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services_institutions update_updated_at_services_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_services_institutions BEFORE UPDATE ON public.services_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_updated_at_sessions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_sessions BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sindicats update_updated_at_sindicats; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_sindicats BEFORE UPDATE ON public.sindicats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: situation_matrimonials update_updated_at_situation_matrimonials; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_situation_matrimonials BEFORE UPDATE ON public.situation_matrimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: specialites update_updated_at_specialites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_specialites BEFORE UPDATE ON public.specialites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiers update_updated_at_tiers; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_tiers BEFORE UPDATE ON public.tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiers_institutions update_updated_at_tiers_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_tiers_institutions BEFORE UPDATE ON public.tiers_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_d_agents update_updated_at_type_d_agents; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_d_agents BEFORE UPDATE ON public.type_d_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_conges update_updated_at_type_de_conges; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_conges BEFORE UPDATE ON public.type_de_conges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_couriers update_updated_at_type_de_couriers; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_couriers BEFORE UPDATE ON public.type_de_couriers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_destinations update_updated_at_type_de_destinations; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_destinations BEFORE UPDATE ON public.type_de_destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_documents update_updated_at_type_de_documents; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_documents BEFORE UPDATE ON public.type_de_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_documents_institutions update_updated_at_type_de_documents_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_documents_institutions BEFORE UPDATE ON public.type_de_documents_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_materiels update_updated_at_type_de_materiels; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_materiels BEFORE UPDATE ON public.type_de_materiels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_retraites update_updated_at_type_de_retraites; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_retraites BEFORE UPDATE ON public.type_de_retraites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_seminaire_de_formation update_updated_at_type_de_seminaire_de_formation; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_seminaire_de_formation BEFORE UPDATE ON public.type_de_seminaire_de_formation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_de_seminaire_de_formation_institutions update_updated_at_type_de_seminaire_de_formation_institutions; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_de_seminaire_de_formation_institutions BEFORE UPDATE ON public.type_de_seminaire_de_formation_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: type_etablissements update_updated_at_type_etablissements; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_type_etablissements BEFORE UPDATE ON public.type_etablissements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unite_administratives update_updated_at_unite_administratives; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_unite_administratives BEFORE UPDATE ON public.unite_administratives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: utilisateurs update_updated_at_utilisateurs; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_utilisateurs BEFORE UPDATE ON public.utilisateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: affectations_temporaires affectations_temporaires_id_entite_destination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_id_entite_destination_fkey FOREIGN KEY (id_entite_destination) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires affectations_temporaires_id_entite_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_id_entite_source_fkey FOREIGN KEY (id_entite_source) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institution_id_entite_destination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institution_id_entite_destination_fkey FOREIGN KEY (id_entite_destination) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institutions_id_entite_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institutions_id_entite_source_fkey FOREIGN KEY (id_entite_source) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: agent_conges agent_conges_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_conges
    ADD CONSTRAINT agent_conges_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_documents agent_documents_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_documents
    ADD CONSTRAINT agent_documents_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_langue_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_langue_fkey FOREIGN KEY (id_langue) REFERENCES public.langues(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_niveau_langue_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_niveau_langue_fkey FOREIGN KEY (id_niveau_langue) REFERENCES public.niveau_langues(id) ON DELETE SET NULL;


--
-- Name: agent_logiciels agent_logiciels_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_logiciels agent_logiciels_id_logiciel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_logiciel_fkey FOREIGN KEY (id_logiciel) REFERENCES public.logiciels(id) ON DELETE CASCADE;


--
-- Name: agent_logiciels agent_logiciels_id_niveau_informatique_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_niveau_informatique_fkey FOREIGN KEY (id_niveau_informatique) REFERENCES public.niveau_informatiques(id) ON DELETE SET NULL;


--
-- Name: agent_photos agent_photos_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_photos
    ADD CONSTRAINT agent_photos_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_route_assignments agent_route_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_route_assignments
    ADD CONSTRAINT agent_route_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.utilisateurs(id);


--
-- Name: agent_route_assignments agent_route_assignments_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_route_assignments
    ADD CONSTRAINT agent_route_assignments_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_signatures agent_signatures_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_signatures
    ADD CONSTRAINT agent_signatures_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_associations agents_associations_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_associations
    ADD CONSTRAINT agents_associations_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_associations agents_associations_id_association_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_associations
    ADD CONSTRAINT agents_associations_id_association_fkey FOREIGN KEY (id_association) REFERENCES public.associations(id) ON DELETE CASCADE;


--
-- Name: agents_entites agents_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: agents_entites_institutions agents_entites_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: agents agents_id_civilite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_civilite_fkey FOREIGN KEY (id_civilite) REFERENCES public.civilites(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_direction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_direction_fkey FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_entite_principale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_entite_principale_fkey FOREIGN KEY (id_entite_principale) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_nationalite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_nationalite_fkey FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_situation_matrimoniale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_situation_matrimoniale_fkey FOREIGN KEY (id_situation_matrimoniale) REFERENCES public.situation_matrimonials(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_type_d_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_type_d_agent_fkey FOREIGN KEY (id_type_d_agent) REFERENCES public.type_d_agents(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_civilite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_civilite_fkey FOREIGN KEY (id_civilite) REFERENCES public.civilites(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_entite_principale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_entite_principale_fkey FOREIGN KEY (id_entite_principale) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_nationalite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_nationalite_fkey FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_situation_matrimoniale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_situation_matrimoniale_fkey FOREIGN KEY (id_situation_matrimoniale) REFERENCES public.situation_matrimonials(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_type_d_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_type_d_agent_fkey FOREIGN KEY (id_type_d_agent) REFERENCES public.type_d_agents(id) ON DELETE SET NULL;


--
-- Name: agents_sindicats agents_sindicats_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_sindicats
    ADD CONSTRAINT agents_sindicats_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_sindicats agents_sindicats_id_sindicat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_sindicats
    ADD CONSTRAINT agents_sindicats_id_sindicat_fkey FOREIGN KEY (id_sindicat) REFERENCES public.sindicats(id) ON DELETE CASCADE;


--
-- Name: categories_agents categories_agents_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents
    ADD CONSTRAINT categories_agents_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: categories_agents categories_agents_id_categorie_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents
    ADD CONSTRAINT categories_agents_id_categorie_fkey FOREIGN KEY (id_categorie) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: categories_agents categories_agents_id_nomination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.categories_agents
    ADD CONSTRAINT categories_agents_id_nomination_fkey FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE SET NULL;


--
-- Name: classeurs classeurs_id_dossier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_dossier_fkey FOREIGN KEY (id_dossier) REFERENCES public.dossiers(id) ON DELETE CASCADE;


--
-- Name: classeurs classeurs_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: classeurs_institutions classeurs_institutions_id_dossier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_dossier_fkey FOREIGN KEY (id_dossier) REFERENCES public.dossiers_institutions(id) ON DELETE CASCADE;


--
-- Name: classeurs_institutions classeurs_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: decisions decisions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.agents(id);


--
-- Name: decisions decisions_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id);


--
-- Name: decisions decisions_id_direction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_id_direction_fkey FOREIGN KEY (id_direction) REFERENCES public.directions(id);


--
-- Name: decisions decisions_id_sous_direction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_id_sous_direction_fkey FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id);


--
-- Name: decisions_institutions decisions_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.decisions_institutions
    ADD CONSTRAINT decisions_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id);


--
-- Name: demandes demandes_id_validateur_chef_cabinet_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_chef_cabinet_fkey FOREIGN KEY (id_validateur_chef_cabinet) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_dir_cabinet_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_dir_cabinet_fkey FOREIGN KEY (id_validateur_dir_cabinet) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_directeur_central_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_directeur_central_fkey FOREIGN KEY (id_validateur_directeur_central) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_directeur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_directeur_fkey FOREIGN KEY (id_validateur_directeur) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_directeur_general_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_directeur_general_fkey FOREIGN KEY (id_validateur_directeur_general) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_sous_directeur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_sous_directeur_fkey FOREIGN KEY (id_validateur_sous_directeur) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes_institutions demandes_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_institutions
    ADD CONSTRAINT demandes_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id);


--
-- Name: departements departements_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: directions_institutions directions_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions_institutions
    ADD CONSTRAINT directions_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: documents_autorisation documents_autorisation_id_agent_destinataire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_destinataire_fkey FOREIGN KEY (id_agent_destinataire) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_agent_generateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_generateur_fkey FOREIGN KEY (id_agent_generateur) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_agent_transmetteur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_transmetteur_fkey FOREIGN KEY (id_agent_transmetteur) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_demande_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_demande_fkey FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: dossiers dossiers_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: dossiers dossiers_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: dossiers_institutions dossiers_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: dossiers_institutions dossiers_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: echelons_agents echelons_agents_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents
    ADD CONSTRAINT echelons_agents_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: echelons_agents echelons_agents_id_echelon_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents
    ADD CONSTRAINT echelons_agents_id_echelon_fkey FOREIGN KEY (id_echelon) REFERENCES public.echelons(id) ON DELETE RESTRICT;


--
-- Name: echelons_agents echelons_agents_id_nomination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.echelons_agents
    ADD CONSTRAINT echelons_agents_id_nomination_fkey FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE SET NULL;


--
-- Name: emplois emplois_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emplois
    ADD CONSTRAINT emplois_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE SET NULL;


--
-- Name: enfants enfants_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants
    ADD CONSTRAINT enfants_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: enfants_institutions enfants_institutions_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.enfants_institutions
    ADD CONSTRAINT enfants_institutions_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: entites_administratives entites_administratives_id_entite_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_entite_parent_fkey FOREIGN KEY (id_entite_parent) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: entites_administratives entites_administratives_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: entites_institutions entites_institutions_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: entites_institutions entites_institutions_id_entite_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_entite_parent_fkey FOREIGN KEY (id_entite_parent) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: entites_institutions entites_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: entites_institutions entites_institutions_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: entites_institutions entites_institutions_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: etude_diplome etude_diplome_id_agent_document_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_id_agent_document_fkey FOREIGN KEY (id_agent_document) REFERENCES public.agent_documents(id) ON DELETE SET NULL;


--
-- Name: etude_diplome etude_diplome_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: affectations_temporaires fk_affectations_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT fk_affectations_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: affectations_temporaires_institutions fk_affectations_institutions_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT fk_affectations_institutions_agent FOREIGN KEY (id_agent) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: agent_login_codes fk_agent_login_codes_agent_id; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT fk_agent_login_codes_agent_id FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_entites fk_agents_entites_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT fk_agents_entites_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_entites_institutions fk_agents_entites_institutions_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT fk_agents_entites_institutions_agent FOREIGN KEY (id_agent_institution) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: agents fk_agents_id_autre_absence; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_autre_absence FOREIGN KEY (id_autre_absence) REFERENCES public.autre_absences(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_categorie; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_categorie FOREIGN KEY (id_categorie) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_diplome; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_diplome FOREIGN KEY (id_diplome) REFERENCES public.diplomes(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_direction_generale; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_direction_generale FOREIGN KEY (id_direction_generale) REFERENCES public.direction_generale(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_distinction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_distinction FOREIGN KEY (id_distinction) REFERENCES public.distinctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_echelon; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_echelon FOREIGN KEY (id_echelon) REFERENCES public.echelons(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_emploi; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_emploi FOREIGN KEY (id_emploi) REFERENCES public.emplois(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_fonction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_fonction FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_grade; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_grade FOREIGN KEY (id_grade) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_handicap; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_handicap FOREIGN KEY (id_handicap) REFERENCES public.handicaps(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_langue; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_langue FOREIGN KEY (id_langue) REFERENCES public.langues(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_localite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_localite FOREIGN KEY (id_localite) REFERENCES public.localites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_logiciel; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_logiciel FOREIGN KEY (id_logiciel) REFERENCES public.logiciels(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_mode_entree; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_mode_entree FOREIGN KEY (id_mode_entree) REFERENCES public.mode_d_entrees(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_motif_depart; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_motif_depart FOREIGN KEY (id_motif_depart) REFERENCES public.motif_de_departs(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_nature_accident; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_nature_accident FOREIGN KEY (id_nature_accident) REFERENCES public.nature_d_accidents(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_nature_acte; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_nature_acte FOREIGN KEY (id_nature_acte) REFERENCES public.nature_actes(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_niveau_informatique; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_niveau_informatique FOREIGN KEY (id_niveau_informatique) REFERENCES public.niveau_informatiques(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_niveau_langue; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_niveau_langue FOREIGN KEY (id_niveau_langue) REFERENCES public.niveau_langues(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_pathologie; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_pathologie FOREIGN KEY (id_pathologie) REFERENCES public.pathologies(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_pays; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_pays FOREIGN KEY (id_pays) REFERENCES public.pays(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_position; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_position FOREIGN KEY (id_position) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_sanction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_sanction FOREIGN KEY (id_sanction) REFERENCES public.sanctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_sindicat; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_sindicat FOREIGN KEY (id_sindicat) REFERENCES public.sindicats(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_sous_direction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_sous_direction FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_specialite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_specialite FOREIGN KEY (id_specialite) REFERENCES public.specialites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_conge; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_conge FOREIGN KEY (id_type_conge) REFERENCES public.type_de_conges(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_courrier; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_courrier FOREIGN KEY (id_type_courrier) REFERENCES public.type_de_couriers(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_destination; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_destination FOREIGN KEY (id_type_destination) REFERENCES public.type_de_destinations(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_etablissement; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_etablissement FOREIGN KEY (id_type_etablissement) REFERENCES public.type_etablissements(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_materiel; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_materiel FOREIGN KEY (id_type_materiel) REFERENCES public.type_de_materiels(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_retraite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_retraite FOREIGN KEY (id_type_retraite) REFERENCES public.type_de_retraites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_unite_administrative; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_unite_administrative FOREIGN KEY (id_unite_administrative) REFERENCES public.unite_administratives(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_service; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_service FOREIGN KEY (id_service) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: demandes fk_demandes_chef_service; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_chef_service FOREIGN KEY (id_chef_service) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_created_by; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_created_by FOREIGN KEY (created_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_directeur; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_directeur FOREIGN KEY (id_directeur) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_drh; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_drh FOREIGN KEY (id_drh) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_ministre; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_ministre FOREIGN KEY (id_ministre) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_updated_by FOREIGN KEY (updated_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: direction_generale fk_direction_generale_id_ministere; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale
    ADD CONSTRAINT fk_direction_generale_id_ministere FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: directions fk_directions_id_direction_generale; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT fk_directions_id_direction_generale FOREIGN KEY (id_direction_generale) REFERENCES public.direction_generale(id) ON DELETE SET NULL;


--
-- Name: emploi_agents fk_emploi_agents_id_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: emploi_agents fk_emploi_agents_id_emploi; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_emploi FOREIGN KEY (id_emploi) REFERENCES public.emplois(id) ON DELETE SET NULL;


--
-- Name: emploi_agents fk_emploi_agents_id_nomination; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_nomination FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: entites_institutions fk_entites_institutions_responsable; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT fk_entites_institutions_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents_institutions_main(id) ON DELETE SET NULL;


--
-- Name: entites_administratives fk_entites_responsable; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT fk_entites_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: fonction_agents fk_fonction_agents_id_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: fonction_agents fk_fonction_agents_id_fonction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_fonction FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: fonction_agents fk_fonction_agents_id_nomination; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_nomination FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: grades fk_grades_id_categorie; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT fk_grades_id_categorie FOREIGN KEY (id_categorie) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: demandes_historique fk_historique_demande; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT fk_historique_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: demandes_historique fk_historique_modifie_par; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT fk_historique_modifie_par FOREIGN KEY (modifie_par) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: notifications_demandes fk_notifications_agent; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT fk_notifications_agent FOREIGN KEY (id_agent_destinataire) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: notifications_demandes fk_notifications_demande; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT fk_notifications_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: pays fk_pays_nationalite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT fk_pays_nationalite FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: permissions_entites_institutions fk_permissions_entites_institutions_role; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT fk_permissions_entites_institutions_role FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: permissions_entites fk_permissions_role; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT fk_permissions_role FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: seminaire_formation_institutions fk_seminaire_formation_type; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation_institutions
    ADD CONSTRAINT fk_seminaire_formation_type FOREIGN KEY (id_type_seminaire) REFERENCES public.type_de_seminaire_de_formation_institutions(id) ON DELETE SET NULL;


--
-- Name: services fk_services_direction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_direction FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: services fk_services_entite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_entite FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: services fk_services_ministere; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_ministere FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: directions fk_services_responsable; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT fk_services_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: services fk_services_responsable; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: services fk_services_sous_direction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_sous_direction FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id) ON DELETE SET NULL;


--
-- Name: sous_directions fk_sous_directions_direction; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions
    ADD CONSTRAINT fk_sous_directions_direction FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: sous_directions fk_sous_directions_entite; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions
    ADD CONSTRAINT fk_sous_directions_entite FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: sous_directions fk_sous_directions_ministere; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions
    ADD CONSTRAINT fk_sous_directions_ministere FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: sous_directions fk_sous_directions_sous_directeur; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions
    ADD CONSTRAINT fk_sous_directions_sous_directeur FOREIGN KEY (sous_directeur_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: workflow_demandes fk_workflow_demande; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT fk_workflow_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: workflow_demandes fk_workflow_validateur; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT fk_workflow_validateur FOREIGN KEY (id_validateur) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: fonctions fonctions_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.fonctions
    ADD CONSTRAINT fonctions_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE SET NULL;


--
-- Name: grades_agents grades_agents_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents
    ADD CONSTRAINT grades_agents_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: grades_agents grades_agents_id_grade_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents
    ADD CONSTRAINT grades_agents_id_grade_fkey FOREIGN KEY (id_grade) REFERENCES public.grades(id) ON DELETE RESTRICT;


--
-- Name: grades_agents grades_agents_id_nomination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.grades_agents
    ADD CONSTRAINT grades_agents_id_nomination_fkey FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE SET NULL;


--
-- Name: historique_retrait_restauration historique_retrait_restauration_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.historique_retrait_restauration
    ADD CONSTRAINT historique_retrait_restauration_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: institutions institutions_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: institutions institutions_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: institutions institutions_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: localites localites_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: ministere_matricule_config ministere_matricule_config_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministere_matricule_config
    ADD CONSTRAINT ministere_matricule_config_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: ministeres ministeres_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: ministeres ministeres_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: ministeres ministeres_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: ministeres ministeres_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.agents(id);


--
-- Name: nominations nominations_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: permissions_entites permissions_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: permissions_entites_institutions permissions_entites_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: planning_previsionnel_institutions planning_previsionnel_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.planning_previsionnel_institutions
    ADD CONSTRAINT planning_previsionnel_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id);


--
-- Name: prolongements_retraite prolongements_retraite_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.prolongements_retraite
    ADD CONSTRAINT prolongements_retraite_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: seminaire_formation_institutions seminaire_formation_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_formation_institutions
    ADD CONSTRAINT seminaire_formation_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id);


--
-- Name: seminaire_participants seminaire_participants_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: seminaire_participants seminaire_participants_id_seminaire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_seminaire_fkey FOREIGN KEY (id_seminaire) REFERENCES public.seminaire_formation(id) ON DELETE CASCADE;


--
-- Name: seminaire_participants_institutions seminaire_participants_institutions_id_seminaire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.seminaire_participants_institutions
    ADD CONSTRAINT seminaire_participants_institutions_id_seminaire_fkey FOREIGN KEY (id_seminaire) REFERENCES public.seminaire_formation_institutions(id) ON DELETE CASCADE;


--
-- Name: services_entites services_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: directions services_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT services_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: services_institutions services_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_id_utilisateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: sous_directions_institutions sous_directions_institutions_id_direction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions_institutions
    ADD CONSTRAINT sous_directions_institutions_id_direction_fkey FOREIGN KEY (id_direction) REFERENCES public.directions_institutions(id) ON DELETE CASCADE;


--
-- Name: sous_directions_institutions sous_directions_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.sous_directions_institutions
    ADD CONSTRAINT sous_directions_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: stage stage_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.stage
    ADD CONSTRAINT stage_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: tiers tiers_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT tiers_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: tiers_institutions tiers_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.tiers_institutions
    ADD CONSTRAINT tiers_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: type_de_documents type_de_documents_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: type_de_documents type_de_documents_id_service_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_service_entite_fkey FOREIGN KEY (id_service_entite) REFERENCES public.services_entites(id) ON DELETE SET NULL;


--
-- Name: type_de_documents type_de_documents_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: type_de_documents_institutions type_de_documents_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: type_de_documents_institutions type_de_documents_institutions_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services_institutions(id) ON DELETE SET NULL;


--
-- Name: type_de_seminaire_de_formation type_de_seminaire_de_formation_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation
    ADD CONSTRAINT type_de_seminaire_de_formation_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: type_de_seminaire_de_formation_institutions type_de_seminaire_de_formation_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions
    ADD CONSTRAINT type_de_seminaire_de_formation_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: unite_administratives unite_administratives_id_fonction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_id_fonction_fkey FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: utilisateurs utilisateurs_id_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_id_role_fkey FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: webauthn_challenges webauthn_challenges_id_utilisateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_id_utilisateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict p4pscTRzjn3v1IfeOE3feUo8aPsZkhyFRG4fWznMiQPAJlDzmT5ejLBqSmVqJ01
