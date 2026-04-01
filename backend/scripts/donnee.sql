--
-- PostgreSQL database dump
--

-- Dumped from database version 10.23
-- Dumped by pg_dump version 10.23

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
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: assign_emploi_to_agent(character varying, character varying, date); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.assign_emploi_to_agent(p_matricule character varying, p_emploi_libelle character varying, p_date_nomination date) OWNER TO isegroup;

--
-- Name: generate_unique_entity_code(character varying, character varying); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.generate_unique_entity_code(p_base_code character varying, p_table_name character varying) OWNER TO isegroup;

--
-- Name: get_hierarchy_for_agent(integer); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.get_hierarchy_for_agent(agent_id integer) OWNER TO isegroup;

--
-- Name: get_services_by_entite(integer); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.get_services_by_entite(p_id_entite integer) OWNER TO isegroup;

--
-- Name: FUNCTION get_services_by_entite(p_id_entite integer); Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON FUNCTION public.get_services_by_entite(p_id_entite integer) IS 'Récupère tous les services actifs d''une entité';


--
-- Name: get_services_by_ministere(integer); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.get_services_by_ministere(p_id_ministere integer) OWNER TO isegroup;

--
-- Name: FUNCTION get_services_by_ministere(p_id_ministere integer); Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON FUNCTION public.get_services_by_ministere(p_id_ministere integer) IS 'Récupère tous les services actifs d''un ministère avec leurs entités';


--
-- Name: tr_demandes_assign_hierarchy(); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.tr_demandes_assign_hierarchy() OWNER TO isegroup;

--
-- Name: tr_demandes_historique_update(); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.tr_demandes_historique_update() OWNER TO isegroup;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: isegroup
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.date_modification = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_modified_column() OWNER TO isegroup;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: isegroup
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO isegroup;

--
-- Name: validate_entity_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.validate_entity_code_uniqueness() OWNER TO isegroup;

--
-- Name: validate_institution_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: isegroup
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


ALTER FUNCTION public.validate_institution_code_uniqueness() OWNER TO isegroup;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: affectations_temporaires; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.affectations_temporaires OWNER TO isegroup;

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.affectations_temporaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.affectations_temporaires_id_seq OWNER TO isegroup;

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.affectations_temporaires_id_seq OWNED BY public.affectations_temporaires.id;


--
-- Name: affectations_temporaires_institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.affectations_temporaires_institutions OWNER TO isegroup;

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.affectations_temporaires_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.affectations_temporaires_institutions_id_seq OWNER TO isegroup;

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.affectations_temporaires_institutions_id_seq OWNED BY public.affectations_temporaires_institutions.id;


--
-- Name: agent_documents; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agent_documents OWNER TO isegroup;

--
-- Name: TABLE agent_documents; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_documents IS 'Documents des agents (diplômes, certificats, etc.)';


--
-- Name: COLUMN agent_documents.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.id IS 'Identifiant unique du document';


--
-- Name: COLUMN agent_documents.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_documents.document_type; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.document_type IS 'Type de document (diplome, certificat, attestation, autre)';


--
-- Name: COLUMN agent_documents.document_name; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.document_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_documents.document_url; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.document_url IS 'URL ou chemin du document';


--
-- Name: COLUMN agent_documents.document_size; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.document_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_documents.document_mime_type; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.document_mime_type IS 'Type MIME du document';


--
-- Name: COLUMN agent_documents.description; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_documents.description IS 'Description du document';


--
-- Name: agent_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_documents_id_seq OWNER TO isegroup;

--
-- Name: agent_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_documents_id_seq OWNED BY public.agent_documents.id;


--
-- Name: agent_langues; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.agent_langues (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_langue integer NOT NULL,
    id_niveau_langue integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_langues OWNER TO isegroup;

--
-- Name: TABLE agent_langues; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_langues IS 'Table de liaison entre agents et langues avec niveau et certification';


--
-- Name: COLUMN agent_langues.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_langues.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_langues.id_langue; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_langues.id_langue IS 'Référence vers la langue';


--
-- Name: COLUMN agent_langues.id_niveau_langue; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_langues.id_niveau_langue IS 'Niveau de maîtrise de la langue';


--
-- Name: agent_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_langues_id_seq OWNER TO isegroup;

--
-- Name: agent_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_langues_id_seq OWNED BY public.agent_langues.id;


--
-- Name: agent_logiciels; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.agent_logiciels (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_logiciel integer NOT NULL,
    id_niveau_informatique integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_logiciels OWNER TO isegroup;

--
-- Name: TABLE agent_logiciels; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_logiciels IS 'Table de liaison entre agents et logiciels avec niveau et certification';


--
-- Name: COLUMN agent_logiciels.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_logiciels.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_logiciels.id_logiciel; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_logiciels.id_logiciel IS 'Référence vers le logiciel';


--
-- Name: COLUMN agent_logiciels.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_logiciels.id_niveau_informatique IS 'Niveau de maîtrise du logiciel';


--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_logiciels_id_seq OWNER TO isegroup;

--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_logiciels_id_seq OWNED BY public.agent_logiciels.id;


--
-- Name: agent_login_codes; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.agent_login_codes (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    code character varying(8) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_login_codes OWNER TO isegroup;

--
-- Name: TABLE agent_login_codes; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_login_codes IS 'Codes de connexion temporaires pour les agents';


--
-- Name: COLUMN agent_login_codes.agent_id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_login_codes.agent_id IS 'ID de l\''agent';


--
-- Name: COLUMN agent_login_codes.code; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_login_codes.code IS 'Code de connexion (8 caractères hexadécimaux)';


--
-- Name: COLUMN agent_login_codes.expires_at; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_login_codes.expires_at IS 'Date et heure d\expiration du code';


--
-- Name: COLUMN agent_login_codes.used_at; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_login_codes.used_at IS 'Date et heure d\utilisation du code (NULL si non utilisé)';


--
-- Name: COLUMN agent_login_codes.created_at; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_login_codes.created_at IS 'Date et heure de création du code';


--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_login_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_login_codes_id_seq OWNER TO isegroup;

--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_login_codes_id_seq OWNED BY public.agent_login_codes.id;


--
-- Name: agent_photos; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agent_photos OWNER TO isegroup;

--
-- Name: TABLE agent_photos; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_photos IS 'Photos des agents (photo de profil)';


--
-- Name: COLUMN agent_photos.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.id IS 'Identifiant unique de la photo';


--
-- Name: COLUMN agent_photos.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN agent_photos.photo_url; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.photo_url IS 'URL ou chemin de la photo';


--
-- Name: COLUMN agent_photos.photo_name; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.photo_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_photos.photo_size; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.photo_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_photos.photo_type; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.photo_type IS 'Type MIME de la photo';


--
-- Name: COLUMN agent_photos.is_profile_photo; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_photos.is_profile_photo IS 'Indique si c''est la photo de profil';


--
-- Name: agent_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_photos_id_seq OWNER TO isegroup;

--
-- Name: agent_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_photos_id_seq OWNED BY public.agent_photos.id;


--
-- Name: agent_signatures; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agent_signatures OWNER TO isegroup;

--
-- Name: TABLE agent_signatures; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.agent_signatures IS 'Signatures numériques des agents utilisées pour l''émargement';


--
-- Name: COLUMN agent_signatures.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.id IS 'Identifiant unique de la signature';


--
-- Name: COLUMN agent_signatures.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN agent_signatures.signature_url; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.signature_url IS 'URL publique de la signature';


--
-- Name: COLUMN agent_signatures.signature_path; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.signature_path IS 'Chemin relatif du fichier de signature';


--
-- Name: COLUMN agent_signatures.signature_name; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.signature_name IS 'Nom original du fichier de signature';


--
-- Name: COLUMN agent_signatures.signature_size; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.signature_size IS 'Taille du fichier de signature en octets';


--
-- Name: COLUMN agent_signatures.signature_type; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.signature_type IS 'Type MIME de la signature';


--
-- Name: COLUMN agent_signatures.is_active; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agent_signatures.is_active IS 'Indique si la signature est active pour l''agent';


--
-- Name: agent_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agent_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agent_signatures_id_seq OWNER TO isegroup;

--
-- Name: agent_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agent_signatures_id_seq OWNED BY public.agent_signatures.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: isegroup
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
    CONSTRAINT agents_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
    CONSTRAINT agents_situation_militaire_check CHECK ((((situation_militaire)::text = ANY (ARRAY[('Exempté'::character varying)::text, ('Réformé'::character varying)::text, ('Bon pour le service'::character varying)::text, ('Dispensé'::character varying)::text, ('Non concerné'::character varying)::text])) OR (situation_militaire IS NULL))),
    CONSTRAINT agents_statut_emploi_check CHECK (((statut_emploi)::text = ANY (ARRAY[('actif'::character varying)::text, ('inactif'::character varying)::text, ('retraite'::character varying)::text, ('demission'::character varying)::text, ('licencie'::character varying)::text])))
);


ALTER TABLE public.agents OWNER TO isegroup;

--
-- Name: COLUMN agents.id_fonction; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_fonction IS 'Référence vers la fonction de l''agent';


--
-- Name: COLUMN agents.id_pays; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_pays IS 'Référence vers le pays de l''agent';


--
-- Name: COLUMN agents.id_categorie; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_categorie IS 'Référence vers la catégorie de l''agent';


--
-- Name: COLUMN agents.id_grade; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_grade IS 'Référence vers le grade de l''agent';


--
-- Name: COLUMN agents.id_emploi; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_emploi IS 'Référence vers l''emploi de l''agent';


--
-- Name: COLUMN agents.id_echelon; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_echelon IS 'Référence vers l''échelon de l''agent';


--
-- Name: COLUMN agents.id_specialite; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_specialite IS 'Référence vers la spécialité de l''agent';


--
-- Name: COLUMN agents.id_langue; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_langue IS 'Référence vers la langue de l''agent';


--
-- Name: COLUMN agents.id_niveau_langue; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_niveau_langue IS 'Référence vers le niveau de langue de l''agent';


--
-- Name: COLUMN agents.id_motif_depart; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_motif_depart IS 'Référence vers le motif de départ de l''agent';


--
-- Name: COLUMN agents.id_type_conge; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_conge IS 'Référence vers le type de congé de l''agent';


--
-- Name: COLUMN agents.id_autre_absence; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_autre_absence IS 'Référence vers le type d''autre absence de l''agent';


--
-- Name: COLUMN agents.id_distinction; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_distinction IS 'Référence vers la distinction de l''agent';


--
-- Name: COLUMN agents.id_type_etablissement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_etablissement IS 'Référence vers le type d''établissement de l''agent';


--
-- Name: COLUMN agents.id_unite_administrative; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_unite_administrative IS 'Référence vers l''unité administrative de l''agent';


--
-- Name: COLUMN agents.id_diplome; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_diplome IS 'Référence vers le diplôme de l''agent';


--
-- Name: COLUMN agents.id_type_materiel; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_materiel IS 'Référence vers le type de matériel de l''agent';


--
-- Name: COLUMN agents.id_type_destination; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_destination IS 'Référence vers le type de destination de l''agent';


--
-- Name: COLUMN agents.id_nature_accident; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_nature_accident IS 'Référence vers la nature d''accident de l''agent';


--
-- Name: COLUMN agents.id_sanction; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_sanction IS 'Référence vers la sanction de l''agent';


--
-- Name: COLUMN agents.id_sindicat; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_sindicat IS 'Référence vers le syndicat de l''agent';


--
-- Name: COLUMN agents.id_type_courrier; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_courrier IS 'Référence vers le type de courrier de l''agent';


--
-- Name: COLUMN agents.id_nature_acte; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_nature_acte IS 'Référence vers la nature d''acte de l''agent';


--
-- Name: COLUMN agents.id_localite; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_localite IS 'Référence vers la localité de l''agent';


--
-- Name: COLUMN agents.id_mode_entree; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_mode_entree IS 'Référence vers le mode d''entrée de l''agent';


--
-- Name: COLUMN agents.id_position; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_position IS 'Référence vers la position de l''agent';


--
-- Name: COLUMN agents.id_pathologie; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_pathologie IS 'Référence vers la pathologie de l''agent';


--
-- Name: COLUMN agents.id_handicap; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_handicap IS 'Référence vers le handicap de l''agent';


--
-- Name: COLUMN agents.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_niveau_informatique IS 'Référence vers le niveau informatique de l''agent';


--
-- Name: COLUMN agents.id_logiciel; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_logiciel IS 'Référence vers le logiciel de l''agent';


--
-- Name: COLUMN agents.id_type_retraite; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_type_retraite IS 'Référence vers le type de retraite de l''agent';


--
-- Name: COLUMN agents.id_direction; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.id_direction IS 'Référence vers la direction d''affectation de l''agent';


--
-- Name: COLUMN agents.date_retraite; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.date_retraite IS 'Date de retraite de l''agent';


--
-- Name: COLUMN agents.fonction_actuelle; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.fonction_actuelle IS 'Fonction actuelle de l''agent';


--
-- Name: COLUMN agents.fonction_anterieure; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.fonction_anterieure IS 'Fonction antérieure de l''agent';


--
-- Name: COLUMN agents.situation_militaire; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.situation_militaire IS 'Situation militaire de l''agent';


--
-- Name: COLUMN agents.numero_cnps; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.numero_cnps IS 'Numéro CNPS pour les agents non fonctionnaires';


--
-- Name: COLUMN agents.date_declaration_cnps; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.date_declaration_cnps IS 'Date de déclaration CNPS pour les agents non fonctionnaires';


--
-- Name: COLUMN agents.numero_acte_mariage; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.agents.numero_acte_mariage IS 'Numéro de l''acte de mariage de l''agent';


--
-- Name: agents_entites; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agents_entites OWNER TO isegroup;

--
-- Name: agents_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agents_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_entites_id_seq OWNER TO isegroup;

--
-- Name: agents_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agents_entites_id_seq OWNED BY public.agents_entites.id;


--
-- Name: agents_entites_institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agents_entites_institutions OWNER TO isegroup;

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agents_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_entites_institutions_id_seq OWNER TO isegroup;

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agents_entites_institutions_id_seq OWNED BY public.agents_entites_institutions.id;


--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_id_seq OWNER TO isegroup;

--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: agents_institutions_main; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.agents_institutions_main OWNER TO isegroup;

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.agents_institutions_main_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_institutions_main_id_seq OWNER TO isegroup;

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.agents_institutions_main_id_seq OWNED BY public.agents_institutions_main.id;


--
-- Name: autre_absences; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.autre_absences (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.autre_absences OWNER TO isegroup;

--
-- Name: autre_absences_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.autre_absences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.autre_absences_id_seq OWNER TO isegroup;

--
-- Name: autre_absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.autre_absences_id_seq OWNED BY public.autre_absences.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO isegroup;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO isegroup;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: civilites; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.civilites (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.civilites OWNER TO isegroup;

--
-- Name: civilites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.civilites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.civilites_id_seq OWNER TO isegroup;

--
-- Name: civilites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.civilites_id_seq OWNED BY public.civilites.id;


--
-- Name: classeurs; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.classeurs (
    id integer NOT NULL,
    id_ministere integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.classeurs OWNER TO isegroup;

--
-- Name: classeurs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.classeurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.classeurs_id_seq OWNER TO isegroup;

--
-- Name: classeurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.classeurs_id_seq OWNED BY public.classeurs.id;


--
-- Name: classeurs_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.classeurs_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.classeurs_institutions OWNER TO isegroup;

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.classeurs_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.classeurs_institutions_id_seq OWNER TO isegroup;

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.classeurs_institutions_id_seq OWNED BY public.classeurs_institutions.id;


--
-- Name: demandes; Type: TABLE; Schema: public; Owner: isegroup
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
    CONSTRAINT demandes_niveau_actuel_check CHECK (((niveau_actuel)::text = ANY (ARRAY[('soumis'::character varying)::text, ('chef_service'::character varying)::text, ('sous_directeur'::character varying)::text, ('directeur'::character varying)::text, ('drh'::character varying)::text, ('dir_cabinet'::character varying)::text, ('chef_cabinet'::character varying)::text, ('directeur_central'::character varying)::text, ('directeur_general'::character varying)::text, ('ministre'::character varying)::text, ('finalise'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_niveau_evolution_demande_check CHECK (((niveau_evolution_demande)::text = ANY (ARRAY[('soumis'::character varying)::text, ('valide_par_superieur'::character varying)::text, ('valide_par_chef_service'::character varying)::text, ('valide_par_sous_directeur'::character varying)::text, ('valide_par_drh'::character varying)::text, ('valide_par_dir_cabinet'::character varying)::text, ('valide_par_chef_cabinet'::character varying)::text, ('valide_par_directeur_central'::character varying)::text, ('valide_par_directeur_general'::character varying)::text, ('valide_par_ministre'::character varying)::text, ('retour_ministre'::character varying)::text, ('retour_directeur_general'::character varying)::text, ('retour_directeur_central'::character varying)::text, ('retour_chef_cabinet'::character varying)::text, ('retour_dir_cabinet'::character varying)::text, ('retour_drh'::character varying)::text, ('retour_sous_directeur'::character varying)::text, ('retour_chef_service'::character varying)::text, ('finalise'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_phase_actuelle_check CHECK (((phase_actuelle)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_phase_check CHECK (((phase)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('normale'::character varying)::text, ('urgente'::character varying)::text, ('critique'::character varying)::text]))),
    CONSTRAINT demandes_status_check CHECK (((status)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_chef_service_check CHECK (((statut_chef_service)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_directeur_check CHECK (((statut_directeur)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_drh_check CHECK (((statut_drh)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_ministre_check CHECK (((statut_ministre)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_type_demande_check CHECK (((type_demande)::text = ANY (ARRAY[('absence'::character varying)::text, ('sortie_territoire'::character varying)::text, ('attestation_travail'::character varying)::text, ('attestation_presence'::character varying)::text, ('note_service'::character varying)::text, ('certificat_cessation'::character varying)::text])))
);


ALTER TABLE public.demandes OWNER TO isegroup;

--
-- Name: COLUMN demandes.motif; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.demandes.motif IS 'Motif de cessation de service pour les certificats de cessation (démission, retraite, licenciement, etc.)';


--
-- Name: COLUMN demandes.date_cessation; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.demandes.date_cessation IS 'Date de cessation de service pour les certificats de cessation';


--
-- Name: demandes_historique; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.demandes_historique OWNER TO isegroup;

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.demandes_historique_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.demandes_historique_id_seq OWNER TO isegroup;

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.demandes_historique_id_seq OWNED BY public.demandes_historique.id;


--
-- Name: demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.demandes_id_seq OWNER TO isegroup;

--
-- Name: demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.demandes_id_seq OWNED BY public.demandes.id;


--
-- Name: departements; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.departements OWNER TO isegroup;

--
-- Name: TABLE departements; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.departements IS 'Table des départements avec référence aux régions';


--
-- Name: COLUMN departements.code; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.departements.code IS 'Code unique du département (ex: ABJ-01)';


--
-- Name: departements_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.departements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departements_id_seq OWNER TO isegroup;

--
-- Name: departements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.departements_id_seq OWNED BY public.departements.id;


--
-- Name: diplomes; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.diplomes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    type_de_diplome character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.diplomes OWNER TO isegroup;

--
-- Name: diplomes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.diplomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.diplomes_id_seq OWNER TO isegroup;

--
-- Name: diplomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.diplomes_id_seq OWNED BY public.diplomes.id;


--
-- Name: direction_generale; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.direction_generale (
    id integer NOT NULL,
    id_ministere integer NOT NULL,
    libelle character varying(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.direction_generale OWNER TO isegroup;

--
-- Name: direction_generale_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.direction_generale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.direction_generale_id_seq OWNER TO isegroup;

--
-- Name: direction_generale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.direction_generale_id_seq OWNED BY public.direction_generale.id;


--
-- Name: directions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.directions OWNER TO isegroup;

--
-- Name: TABLE directions; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.directions IS 'Table des directions du ministère';


--
-- Name: distinctions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.distinctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nature character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.distinctions OWNER TO isegroup;

--
-- Name: distinctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.distinctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.distinctions_id_seq OWNER TO isegroup;

--
-- Name: distinctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.distinctions_id_seq OWNED BY public.distinctions.id;


--
-- Name: documents_autorisation; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.documents_autorisation (
    id integer NOT NULL,
    id_demande integer NOT NULL,
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
    id_agent_transmetteur integer
);


ALTER TABLE public.documents_autorisation OWNER TO isegroup;

--
-- Name: TABLE documents_autorisation; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.documents_autorisation IS 'Documents générés automatiquement lors de la validation des demandes';


--
-- Name: COLUMN documents_autorisation.type_document; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.documents_autorisation.type_document IS 'Type de document: autorisation_absence, autorisation_sortie, etc.';


--
-- Name: COLUMN documents_autorisation.contenu; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.documents_autorisation.contenu IS 'Contenu du document en HTML ou JSON structuré';


--
-- Name: COLUMN documents_autorisation.chemin_fichier; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.documents_autorisation.chemin_fichier IS 'Chemin vers le fichier PDF généré (optionnel)';


--
-- Name: COLUMN documents_autorisation.statut; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.documents_autorisation.statut IS 'Statut du document: generé, envoyé, signé';


--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.documents_autorisation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_autorisation_id_seq OWNER TO isegroup;

--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.documents_autorisation_id_seq OWNED BY public.documents_autorisation.id;


--
-- Name: dossiers; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.dossiers (
    id integer NOT NULL,
    id_ministere integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dossiers OWNER TO isegroup;

--
-- Name: dossiers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.dossiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dossiers_id_seq OWNER TO isegroup;

--
-- Name: dossiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.dossiers_id_seq OWNED BY public.dossiers.id;


--
-- Name: dossiers_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.dossiers_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dossiers_institutions OWNER TO isegroup;

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.dossiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dossiers_institutions_id_seq OWNER TO isegroup;

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.dossiers_institutions_id_seq OWNED BY public.dossiers_institutions.id;


--
-- Name: echelons; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.echelons (
    id integer NOT NULL,
    indice character varying(20),
    salaire_net numeric(10,2),
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.echelons OWNER TO isegroup;

--
-- Name: COLUMN echelons.indice; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.echelons.indice IS 'Indice de l''échelon (optionnel)';


--
-- Name: COLUMN echelons.salaire_net; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.echelons.salaire_net IS 'Salaire net de l''échelon (optionnel)';


--
-- Name: COLUMN echelons.libele; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.echelons.libele IS 'Libellé de l''échelon (obligatoire)';


--
-- Name: echelons_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.echelons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.echelons_id_seq OWNER TO isegroup;

--
-- Name: echelons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.echelons_id_seq OWNED BY public.echelons.id;


--
-- Name: emploi_agents; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.emploi_agents OWNER TO isegroup;

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.emploi_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emploi_agents_id_seq OWNER TO isegroup;

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.emploi_agents_id_seq OWNED BY public.emploi_agents.id;


--
-- Name: emplois; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.emplois (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    libele_court character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emplois OWNER TO isegroup;

--
-- Name: emplois_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.emplois_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emplois_id_seq OWNER TO isegroup;

--
-- Name: emplois_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.emplois_id_seq OWNED BY public.emplois.id;


--
-- Name: enfants; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.enfants OWNER TO isegroup;

--
-- Name: enfants_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.enfants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.enfants_id_seq OWNER TO isegroup;

--
-- Name: enfants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.enfants_id_seq OWNED BY public.enfants.id;


--
-- Name: enfants_institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.enfants_institutions OWNER TO isegroup;

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.enfants_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.enfants_institutions_id_seq OWNER TO isegroup;

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.enfants_institutions_id_seq OWNED BY public.enfants_institutions.id;


--
-- Name: entites_administratives; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.entites_administratives OWNER TO isegroup;

--
-- Name: COLUMN entites_administratives.id_region; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.entites_administratives.id_region IS 'Région d''implantation de l''entité administrative';


--
-- Name: COLUMN entites_administratives.id_departement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.entites_administratives.id_departement IS 'Département d''implantation de l''entité administrative';


--
-- Name: entites_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.entites_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entites_administratives_id_seq OWNER TO isegroup;

--
-- Name: entites_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.entites_administratives_id_seq OWNED BY public.entites_administratives.id;


--
-- Name: entites_institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.entites_institutions OWNER TO isegroup;

--
-- Name: COLUMN entites_institutions.id_region; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.entites_institutions.id_region IS 'Région d''implantation de l''entité institution';


--
-- Name: COLUMN entites_institutions.id_departement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.entites_institutions.id_departement IS 'Département d''implantation de l''entité institution';


--
-- Name: entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.entites_institutions_id_seq OWNER TO isegroup;

--
-- Name: entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.entites_institutions_id_seq OWNED BY public.entites_institutions.id;


--
-- Name: etude_diplome; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.etude_diplome (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    diplome character varying(300) NOT NULL,
    date_diplome date NOT NULL,
    ecole character varying(200) NOT NULL,
    ville character varying(100) NOT NULL,
    pays character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_agent_document integer
);


ALTER TABLE public.etude_diplome OWNER TO isegroup;

--
-- Name: TABLE etude_diplome; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.etude_diplome IS 'Historique des études et diplômes des agents';


--
-- Name: COLUMN etude_diplome.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.id IS 'Identifiant unique du diplôme';


--
-- Name: COLUMN etude_diplome.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN etude_diplome.diplome; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.diplome IS 'Nom du diplôme obtenu';


--
-- Name: COLUMN etude_diplome.date_diplome; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.date_diplome IS 'Date d''obtention du diplôme';


--
-- Name: COLUMN etude_diplome.ecole; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.ecole IS 'École ou université';


--
-- Name: COLUMN etude_diplome.ville; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.ville IS 'Ville de l''école';


--
-- Name: COLUMN etude_diplome.pays; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.pays IS 'Pays de l''école';


--
-- Name: COLUMN etude_diplome.id_agent_document; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.etude_diplome.id_agent_document IS 'Référence vers le document uploadé dans agent_documents';


--
-- Name: etude_diplome_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.etude_diplome_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.etude_diplome_id_seq OWNER TO isegroup;

--
-- Name: etude_diplome_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.etude_diplome_id_seq OWNED BY public.etude_diplome.id;


--
-- Name: fonction_agents; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.fonction_agents OWNER TO isegroup;

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.fonction_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fonction_agents_id_seq OWNER TO isegroup;

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.fonction_agents_id_seq OWNED BY public.fonction_agents.id;


--
-- Name: fonctions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.fonctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nbr_agent integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fonctions OWNER TO isegroup;

--
-- Name: fonctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.fonctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fonctions_id_seq OWNER TO isegroup;

--
-- Name: fonctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.fonctions_id_seq OWNED BY public.fonctions.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grades OWNER TO isegroup;

--
-- Name: TABLE grades; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.grades IS 'Table des grades simplifiée - ne contient que le libellé';


--
-- Name: COLUMN grades.libele; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.grades.libele IS 'Libellé du grade (obligatoire)';


--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grades_id_seq OWNER TO isegroup;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: handicaps; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.handicaps (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.handicaps OWNER TO isegroup;

--
-- Name: handicaps_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.handicaps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.handicaps_id_seq OWNER TO isegroup;

--
-- Name: handicaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.handicaps_id_seq OWNED BY public.handicaps.id;


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.institutions OWNER TO isegroup;

--
-- Name: COLUMN institutions.id_region; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.institutions.id_region IS 'Région d''implantation de l''institution';


--
-- Name: COLUMN institutions.id_departement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.institutions.id_departement IS 'Département d''implantation de l''institution';


--
-- Name: institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.institutions_id_seq OWNER TO isegroup;

--
-- Name: institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;


--
-- Name: langues; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.langues (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.langues OWNER TO isegroup;

--
-- Name: langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.langues_id_seq OWNER TO isegroup;

--
-- Name: langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.langues_id_seq OWNED BY public.langues.id;


--
-- Name: localites; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.localites OWNER TO isegroup;

--
-- Name: localites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.localites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.localites_id_seq OWNER TO isegroup;

--
-- Name: localites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.localites_id_seq OWNED BY public.localites.id;


--
-- Name: logiciels; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.logiciels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logiciels OWNER TO isegroup;

--
-- Name: logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.logiciels_id_seq OWNER TO isegroup;

--
-- Name: logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.logiciels_id_seq OWNED BY public.logiciels.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    ip_address inet,
    success boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_attempts OWNER TO isegroup;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_attempts_id_seq OWNER TO isegroup;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: ministeres; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.ministeres OWNER TO isegroup;

--
-- Name: COLUMN ministeres.id_region; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.ministeres.id_region IS 'Région d''implantation du ministère';


--
-- Name: COLUMN ministeres.id_departement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.ministeres.id_departement IS 'Département d''implantation du ministère';


--
-- Name: COLUMN ministeres.responsable_id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.ministeres.responsable_id IS 'Référence vers l''agent responsable (DRH) du ministère';


--
-- Name: ministeres_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.ministeres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ministeres_id_seq OWNER TO isegroup;

--
-- Name: ministeres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.ministeres_id_seq OWNED BY public.ministeres.id;


--
-- Name: mode_d_entrees; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.mode_d_entrees (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mode_d_entrees OWNER TO isegroup;

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.mode_d_entrees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mode_d_entrees_id_seq OWNER TO isegroup;

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.mode_d_entrees_id_seq OWNED BY public.mode_d_entrees.id;


--
-- Name: motif_de_departs; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.motif_de_departs (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.motif_de_departs OWNER TO isegroup;

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.motif_de_departs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.motif_de_departs_id_seq OWNER TO isegroup;

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.motif_de_departs_id_seq OWNED BY public.motif_de_departs.id;


--
-- Name: nationalites; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.nationalites (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nationalites OWNER TO isegroup;

--
-- Name: nationalites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.nationalites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nationalites_id_seq OWNER TO isegroup;

--
-- Name: nationalites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.nationalites_id_seq OWNED BY public.nationalites.id;


--
-- Name: nature_actes; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.nature_actes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nature_actes OWNER TO isegroup;

--
-- Name: nature_actes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.nature_actes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nature_actes_id_seq OWNER TO isegroup;

--
-- Name: nature_actes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.nature_actes_id_seq OWNED BY public.nature_actes.id;


--
-- Name: nature_d_accidents; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.nature_d_accidents (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.nature_d_accidents OWNER TO isegroup;

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.nature_d_accidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nature_d_accidents_id_seq OWNER TO isegroup;

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.nature_d_accidents_id_seq OWNED BY public.nature_d_accidents.id;


--
-- Name: niveau_informatiques; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.niveau_informatiques (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.niveau_informatiques OWNER TO isegroup;

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.niveau_informatiques_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.niveau_informatiques_id_seq OWNER TO isegroup;

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.niveau_informatiques_id_seq OWNED BY public.niveau_informatiques.id;


--
-- Name: niveau_langues; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.niveau_langues (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.niveau_langues OWNER TO isegroup;

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.niveau_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.niveau_langues_id_seq OWNER TO isegroup;

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.niveau_langues_id_seq OWNED BY public.niveau_langues.id;


--
-- Name: nominations; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.nominations OWNER TO isegroup;

--
-- Name: TABLE nominations; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.nominations IS 'Table des nominations des agents';


--
-- Name: COLUMN nominations.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.id IS 'Identifiant unique de la nomination';


--
-- Name: COLUMN nominations.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.id_agent IS 'Référence vers l''agent concerné';


--
-- Name: COLUMN nominations.nature; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.nature IS 'Nature de la nomination (ex: nomination, promotion, mutation, etc.)';


--
-- Name: COLUMN nominations.numero; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.numero IS 'Numéro de la nomination';


--
-- Name: COLUMN nominations.date_signature; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.date_signature IS 'Date de signature de la nomination';


--
-- Name: COLUMN nominations.created_at; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN nominations.updated_at; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.nominations.updated_at IS 'Date de dernière modification';


--
-- Name: nominations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.nominations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nominations_id_seq OWNER TO isegroup;

--
-- Name: nominations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.nominations_id_seq OWNED BY public.nominations.id;


--
-- Name: notifications_demandes; Type: TABLE; Schema: public; Owner: isegroup
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
    CONSTRAINT notifications_demandes_type_notification_check CHECK (((type_notification)::text = ANY (ARRAY[('nouvelle_demande'::character varying)::text, ('demande_approuvee'::character varying)::text, ('demande_rejetee'::character varying)::text, ('demande_en_cours'::character varying)::text, ('demande_finalisee'::character varying)::text, ('rappel_validation'::character varying)::text])))
);


ALTER TABLE public.notifications_demandes OWNER TO isegroup;

--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.notifications_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_demandes_id_seq OWNER TO isegroup;

--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.notifications_demandes_id_seq OWNED BY public.notifications_demandes.id;


--
-- Name: pathologies; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.pathologies (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pathologies OWNER TO isegroup;

--
-- Name: pathologies_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.pathologies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pathologies_id_seq OWNER TO isegroup;

--
-- Name: pathologies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.pathologies_id_seq OWNED BY public.pathologies.id;


--
-- Name: pays; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.pays (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_nationalite integer
);


ALTER TABLE public.pays OWNER TO isegroup;

--
-- Name: pays_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.pays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pays_id_seq OWNER TO isegroup;

--
-- Name: pays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.pays_id_seq OWNED BY public.pays.id;


--
-- Name: permissions_entites; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.permissions_entites (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions_entites OWNER TO isegroup;

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.permissions_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_entites_id_seq OWNER TO isegroup;

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.permissions_entites_id_seq OWNED BY public.permissions_entites.id;


--
-- Name: permissions_entites_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.permissions_entites_institutions (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions_entites_institutions OWNER TO isegroup;

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.permissions_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_entites_institutions_id_seq OWNER TO isegroup;

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.permissions_entites_institutions_id_seq OWNED BY public.permissions_entites_institutions.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.positions OWNER TO isegroup;

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.positions_id_seq OWNER TO isegroup;

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.regions OWNER TO isegroup;

--
-- Name: TABLE regions; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.regions IS 'Table des régions administratives';


--
-- Name: COLUMN regions.code; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.regions.code IS 'Code unique de la région (ex: ABJ, YAM)';


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.regions_id_seq OWNER TO isegroup;

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nom character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO isegroup;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO isegroup;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sanctions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.sanctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sanctions OWNER TO isegroup;

--
-- Name: sanctions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.sanctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sanctions_id_seq OWNER TO isegroup;

--
-- Name: sanctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.sanctions_id_seq OWNED BY public.sanctions.id;


--
-- Name: seminaire_formation; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.seminaire_formation OWNER TO isegroup;

--
-- Name: TABLE seminaire_formation; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.seminaire_formation IS 'Table pour gérer les séminaires et formations suivis par les agents';


--
-- Name: COLUMN seminaire_formation.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.id IS 'Identifiant unique du séminaire';


--
-- Name: COLUMN seminaire_formation.theme_seminaire; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.theme_seminaire IS 'Thème ou titre du séminaire de formation';


--
-- Name: COLUMN seminaire_formation.date_debut; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.date_debut IS 'Date de début du séminaire';


--
-- Name: COLUMN seminaire_formation.date_fin; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.date_fin IS 'Date de fin du séminaire';


--
-- Name: COLUMN seminaire_formation.lieu; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.lieu IS 'Lieu où s''est déroulé le séminaire';


--
-- Name: COLUMN seminaire_formation.id_entite; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.id_entite IS 'Identifiant de l''entité ou ministère qui organise le séminaire';


--
-- Name: COLUMN seminaire_formation.type_organisme; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_formation.type_organisme IS 'Type d''organisme: ministere ou entite';


--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.seminaire_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_formation_id_seq OWNER TO isegroup;

--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.seminaire_formation_id_seq OWNED BY public.seminaire_formation.id;


--
-- Name: seminaire_participants; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.seminaire_participants OWNER TO isegroup;

--
-- Name: TABLE seminaire_participants; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.seminaire_participants IS 'Table pour gérer les participants aux séminaires de formation';


--
-- Name: COLUMN seminaire_participants.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_participants.id IS 'Identifiant unique de la participation';


--
-- Name: COLUMN seminaire_participants.id_seminaire; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_participants.id_seminaire IS 'Identifiant du séminaire';


--
-- Name: COLUMN seminaire_participants.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_participants.id_agent IS 'Identifiant de l''agent participant';


--
-- Name: COLUMN seminaire_participants.statut_participation; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_participants.statut_participation IS 'Statut de participation (inscrit, present, absent, excuse)';


--
-- Name: COLUMN seminaire_participants.notes; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.seminaire_participants.notes IS 'Notes sur la participation de l''agent';


--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.seminaire_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seminaire_participants_id_seq OWNER TO isegroup;

--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.seminaire_participants_id_seq OWNED BY public.seminaire_participants.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.services OWNER TO isegroup;

--
-- Name: services_entites; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.services_entites OWNER TO isegroup;

--
-- Name: TABLE services_entites; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.services_entites IS 'Services rattachés aux entités administratives des ministères';


--
-- Name: services_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.services_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_entites_id_seq OWNER TO isegroup;

--
-- Name: services_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.services_entites_id_seq OWNED BY public.services_entites.id;


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_id_seq OWNER TO isegroup;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.directions.id;


--
-- Name: services_id_seq1; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.services_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_id_seq1 OWNER TO isegroup;

--
-- Name: services_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.services_id_seq1 OWNED BY public.services.id;


--
-- Name: services_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.services_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.services_institutions OWNER TO isegroup;

--
-- Name: services_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.services_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.services_institutions_id_seq OWNER TO isegroup;

--
-- Name: services_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.services_institutions_id_seq OWNED BY public.services_institutions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    id_utilisateur integer,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO isegroup;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO isegroup;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sindicats; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.sindicats (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sindicats OWNER TO isegroup;

--
-- Name: sindicats_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.sindicats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sindicats_id_seq OWNER TO isegroup;

--
-- Name: sindicats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.sindicats_id_seq OWNED BY public.sindicats.id;


--
-- Name: situation_matrimonials; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.situation_matrimonials (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.situation_matrimonials OWNER TO isegroup;

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.situation_matrimonials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.situation_matrimonials_id_seq OWNER TO isegroup;

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.situation_matrimonials_id_seq OWNED BY public.situation_matrimonials.id;


--
-- Name: sous_directions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.sous_directions OWNER TO isegroup;

--
-- Name: sous_directions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.sous_directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sous_directions_id_seq OWNER TO isegroup;

--
-- Name: sous_directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.sous_directions_id_seq OWNED BY public.sous_directions.id;


--
-- Name: specialites; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.specialites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specialites OWNER TO isegroup;

--
-- Name: specialites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.specialites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.specialites_id_seq OWNER TO isegroup;

--
-- Name: specialites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.specialites_id_seq OWNED BY public.specialites.id;


--
-- Name: stage; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.stage OWNER TO isegroup;

--
-- Name: TABLE stage; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON TABLE public.stage IS 'Historique des stages des agents';


--
-- Name: COLUMN stage.id; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.id IS 'Identifiant unique du stage';


--
-- Name: COLUMN stage.id_agent; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.id_agent IS 'Référence vers l''agent';


--
-- Name: COLUMN stage.intitule_stage; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.intitule_stage IS 'Intitulé du stage';


--
-- Name: COLUMN stage.date_stage; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.date_stage IS 'Date du stage';


--
-- Name: COLUMN stage.duree_stage; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.duree_stage IS 'Durée du stage en jours';


--
-- Name: COLUMN stage.etablissement; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.etablissement IS 'Établissement où le stage s''est déroulé';


--
-- Name: COLUMN stage.ville; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.ville IS 'Ville de l''établissement';


--
-- Name: COLUMN stage.pays; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON COLUMN public.stage.pays IS 'Pays de l''établissement';


--
-- Name: stage_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.stage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stage_id_seq OWNER TO isegroup;

--
-- Name: stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.stage_id_seq OWNED BY public.stage.id;


--
-- Name: tiers; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.tiers OWNER TO isegroup;

--
-- Name: tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tiers_id_seq OWNER TO isegroup;

--
-- Name: tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.tiers_id_seq OWNED BY public.tiers.id;


--
-- Name: tiers_institutions; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.tiers_institutions OWNER TO isegroup;

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.tiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tiers_institutions_id_seq OWNER TO isegroup;

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.tiers_institutions_id_seq OWNED BY public.tiers_institutions.id;


--
-- Name: type_d_agents; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_d_agents (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    automatique boolean DEFAULT false,
    numero_initial integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_d_agents OWNER TO isegroup;

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_d_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_d_agents_id_seq OWNER TO isegroup;

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_d_agents_id_seq OWNED BY public.type_d_agents.id;


--
-- Name: type_de_conges; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_conges (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_conges OWNER TO isegroup;

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_conges_id_seq OWNER TO isegroup;

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_conges_id_seq OWNED BY public.type_de_conges.id;


--
-- Name: type_de_couriers; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_couriers (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_couriers OWNER TO isegroup;

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_couriers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_couriers_id_seq OWNER TO isegroup;

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_couriers_id_seq OWNED BY public.type_de_couriers.id;


--
-- Name: type_de_destinations; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_destinations (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_destinations OWNER TO isegroup;

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_destinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_destinations_id_seq OWNER TO isegroup;

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_destinations_id_seq OWNED BY public.type_de_destinations.id;


--
-- Name: type_de_documents; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.type_de_documents OWNER TO isegroup;

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_documents_id_seq OWNER TO isegroup;

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_documents_id_seq OWNED BY public.type_de_documents.id;


--
-- Name: type_de_documents_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_documents_institutions (
    id integer NOT NULL,
    id_service integer,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_documents_institutions OWNER TO isegroup;

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_documents_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_documents_institutions_id_seq OWNER TO isegroup;

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_documents_institutions_id_seq OWNED BY public.type_de_documents_institutions.id;


--
-- Name: type_de_materiels; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_materiels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_materiels OWNER TO isegroup;

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_materiels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_materiels_id_seq OWNER TO isegroup;

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_materiels_id_seq OWNED BY public.type_de_materiels.id;


--
-- Name: type_de_retraites; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_retraites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_retraites OWNER TO isegroup;

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_retraites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_retraites_id_seq OWNER TO isegroup;

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_retraites_id_seq OWNED BY public.type_de_retraites.id;


--
-- Name: type_de_seminaire_de_formation; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_seminaire_de_formation (
    id integer NOT NULL,
    id_ministere integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_seminaire_de_formation OWNER TO isegroup;

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_seminaire_de_formation_id_seq OWNER TO isegroup;

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_id_seq OWNED BY public.type_de_seminaire_de_formation.id;


--
-- Name: type_de_seminaire_de_formation_institutions; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_de_seminaire_de_formation_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_de_seminaire_de_formation_institutions OWNER TO isegroup;

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_de_seminaire_de_formation_institutions_id_seq OWNER TO isegroup;

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq OWNED BY public.type_de_seminaire_de_formation_institutions.id;


--
-- Name: type_etablissements; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.type_etablissements (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_etablissements OWNER TO isegroup;

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.type_etablissements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.type_etablissements_id_seq OWNER TO isegroup;

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.type_etablissements_id_seq OWNED BY public.type_etablissements.id;


--
-- Name: unite_administratives; Type: TABLE; Schema: public; Owner: isegroup
--

CREATE TABLE public.unite_administratives (
    id integer NOT NULL,
    id_fonction integer,
    capacite_acceuil integer,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unite_administratives OWNER TO isegroup;

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.unite_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unite_administratives_id_seq OWNER TO isegroup;

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.unite_administratives_id_seq OWNED BY public.unite_administratives.id;


--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: isegroup
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


ALTER TABLE public.utilisateurs OWNER TO isegroup;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.utilisateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.utilisateurs_id_seq OWNER TO isegroup;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.utilisateurs_id_seq OWNED BY public.utilisateurs.id;


--
-- Name: v_agents_complets; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_agents_complets OWNER TO isegroup;

--
-- Name: v_demandes_en_attente; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_demandes_en_attente OWNER TO isegroup;

--
-- Name: v_notifications_non_lues; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_notifications_non_lues OWNER TO isegroup;

--
-- Name: v_services_avec_entites; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_services_avec_entites OWNER TO isegroup;

--
-- Name: VIEW v_services_avec_entites; Type: COMMENT; Schema: public; Owner: isegroup
--

COMMENT ON VIEW public.v_services_avec_entites IS 'Vue des services avec leurs entités et ministères';


--
-- Name: v_services_complets; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_services_complets OWNER TO isegroup;

--
-- Name: v_sous_directions_completes; Type: VIEW; Schema: public; Owner: isegroup
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


ALTER TABLE public.v_sous_directions_completes OWNER TO isegroup;

--
-- Name: workflow_demandes; Type: TABLE; Schema: public; Owner: isegroup
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
    CONSTRAINT workflow_demandes_niveau_validation_check CHECK (((niveau_validation)::text = ANY (ARRAY[('chef_service'::character varying)::text, ('sous_directeur'::character varying)::text, ('drh'::character varying)::text, ('dir_cabinet'::character varying)::text, ('chef_cabinet'::character varying)::text, ('directeur_central'::character varying)::text, ('directeur_general'::character varying)::text, ('ministre'::character varying)::text])))
);


ALTER TABLE public.workflow_demandes OWNER TO isegroup;

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: isegroup
--

CREATE SEQUENCE public.workflow_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_demandes_id_seq OWNER TO isegroup;

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: isegroup
--

ALTER SEQUENCE public.workflow_demandes_id_seq OWNED BY public.workflow_demandes.id;


--
-- Name: affectations_temporaires id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.affectations_temporaires ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_id_seq'::regclass);


--
-- Name: affectations_temporaires_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.affectations_temporaires_institutions ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_institutions_id_seq'::regclass);


--
-- Name: agent_documents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_documents ALTER COLUMN id SET DEFAULT nextval('public.agent_documents_id_seq'::regclass);


--
-- Name: agent_langues id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_langues ALTER COLUMN id SET DEFAULT nextval('public.agent_langues_id_seq'::regclass);


--
-- Name: agent_logiciels id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_logiciels ALTER COLUMN id SET DEFAULT nextval('public.agent_logiciels_id_seq'::regclass);


--
-- Name: agent_login_codes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_login_codes ALTER COLUMN id SET DEFAULT nextval('public.agent_login_codes_id_seq'::regclass);


--
-- Name: agent_photos id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_photos ALTER COLUMN id SET DEFAULT nextval('public.agent_photos_id_seq'::regclass);


--
-- Name: agent_signatures id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agent_signatures ALTER COLUMN id SET DEFAULT nextval('public.agent_signatures_id_seq'::regclass);


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: agents_entites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agents_entites ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_id_seq'::regclass);


--
-- Name: agents_entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agents_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_institutions_id_seq'::regclass);


--
-- Name: agents_institutions_main id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.agents_institutions_main ALTER COLUMN id SET DEFAULT nextval('public.agents_institutions_main_id_seq'::regclass);


--
-- Name: autre_absences id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.autre_absences ALTER COLUMN id SET DEFAULT nextval('public.autre_absences_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: civilites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.civilites ALTER COLUMN id SET DEFAULT nextval('public.civilites_id_seq'::regclass);


--
-- Name: classeurs id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.classeurs ALTER COLUMN id SET DEFAULT nextval('public.classeurs_id_seq'::regclass);


--
-- Name: classeurs_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.classeurs_institutions ALTER COLUMN id SET DEFAULT nextval('public.classeurs_institutions_id_seq'::regclass);


--
-- Name: demandes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.demandes ALTER COLUMN id SET DEFAULT nextval('public.demandes_id_seq'::regclass);


--
-- Name: demandes_historique id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.demandes_historique ALTER COLUMN id SET DEFAULT nextval('public.demandes_historique_id_seq'::regclass);


--
-- Name: departements id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.departements ALTER COLUMN id SET DEFAULT nextval('public.departements_id_seq'::regclass);


--
-- Name: diplomes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.diplomes ALTER COLUMN id SET DEFAULT nextval('public.diplomes_id_seq'::regclass);


--
-- Name: direction_generale id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.direction_generale ALTER COLUMN id SET DEFAULT nextval('public.direction_generale_id_seq'::regclass);


--
-- Name: directions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.directions ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: distinctions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.distinctions ALTER COLUMN id SET DEFAULT nextval('public.distinctions_id_seq'::regclass);


--
-- Name: documents_autorisation id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.documents_autorisation ALTER COLUMN id SET DEFAULT nextval('public.documents_autorisation_id_seq'::regclass);


--
-- Name: dossiers id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.dossiers ALTER COLUMN id SET DEFAULT nextval('public.dossiers_id_seq'::regclass);


--
-- Name: dossiers_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.dossiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.dossiers_institutions_id_seq'::regclass);


--
-- Name: echelons id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.echelons ALTER COLUMN id SET DEFAULT nextval('public.echelons_id_seq'::regclass);


--
-- Name: emploi_agents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.emploi_agents ALTER COLUMN id SET DEFAULT nextval('public.emploi_agents_id_seq'::regclass);


--
-- Name: emplois id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.emplois ALTER COLUMN id SET DEFAULT nextval('public.emplois_id_seq'::regclass);


--
-- Name: enfants id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.enfants ALTER COLUMN id SET DEFAULT nextval('public.enfants_id_seq'::regclass);


--
-- Name: enfants_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.enfants_institutions ALTER COLUMN id SET DEFAULT nextval('public.enfants_institutions_id_seq'::regclass);


--
-- Name: entites_administratives id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.entites_administratives ALTER COLUMN id SET DEFAULT nextval('public.entites_administratives_id_seq'::regclass);


--
-- Name: entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.entites_institutions_id_seq'::regclass);


--
-- Name: etude_diplome id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.etude_diplome ALTER COLUMN id SET DEFAULT nextval('public.etude_diplome_id_seq'::regclass);


--
-- Name: fonction_agents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.fonction_agents ALTER COLUMN id SET DEFAULT nextval('public.fonction_agents_id_seq'::regclass);


--
-- Name: fonctions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.fonctions ALTER COLUMN id SET DEFAULT nextval('public.fonctions_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: handicaps id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.handicaps ALTER COLUMN id SET DEFAULT nextval('public.handicaps_id_seq'::regclass);


--
-- Name: institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);


--
-- Name: langues id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.langues ALTER COLUMN id SET DEFAULT nextval('public.langues_id_seq'::regclass);


--
-- Name: localites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.localites ALTER COLUMN id SET DEFAULT nextval('public.localites_id_seq'::regclass);


--
-- Name: logiciels id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.logiciels ALTER COLUMN id SET DEFAULT nextval('public.logiciels_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: ministeres id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.ministeres ALTER COLUMN id SET DEFAULT nextval('public.ministeres_id_seq'::regclass);


--
-- Name: mode_d_entrees id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.mode_d_entrees ALTER COLUMN id SET DEFAULT nextval('public.mode_d_entrees_id_seq'::regclass);


--
-- Name: motif_de_departs id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.motif_de_departs ALTER COLUMN id SET DEFAULT nextval('public.motif_de_departs_id_seq'::regclass);


--
-- Name: nationalites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.nationalites ALTER COLUMN id SET DEFAULT nextval('public.nationalites_id_seq'::regclass);


--
-- Name: nature_actes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.nature_actes ALTER COLUMN id SET DEFAULT nextval('public.nature_actes_id_seq'::regclass);


--
-- Name: nature_d_accidents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.nature_d_accidents ALTER COLUMN id SET DEFAULT nextval('public.nature_d_accidents_id_seq'::regclass);


--
-- Name: niveau_informatiques id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.niveau_informatiques ALTER COLUMN id SET DEFAULT nextval('public.niveau_informatiques_id_seq'::regclass);


--
-- Name: niveau_langues id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.niveau_langues ALTER COLUMN id SET DEFAULT nextval('public.niveau_langues_id_seq'::regclass);


--
-- Name: nominations id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.nominations ALTER COLUMN id SET DEFAULT nextval('public.nominations_id_seq'::regclass);


--
-- Name: notifications_demandes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.notifications_demandes ALTER COLUMN id SET DEFAULT nextval('public.notifications_demandes_id_seq'::regclass);


--
-- Name: pathologies id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.pathologies ALTER COLUMN id SET DEFAULT nextval('public.pathologies_id_seq'::regclass);


--
-- Name: pays id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.pays ALTER COLUMN id SET DEFAULT nextval('public.pays_id_seq'::regclass);


--
-- Name: permissions_entites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.permissions_entites ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_id_seq'::regclass);


--
-- Name: permissions_entites_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.permissions_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_institutions_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sanctions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.sanctions ALTER COLUMN id SET DEFAULT nextval('public.sanctions_id_seq'::regclass);


--
-- Name: seminaire_formation id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.seminaire_formation ALTER COLUMN id SET DEFAULT nextval('public.seminaire_formation_id_seq'::regclass);


--
-- Name: seminaire_participants id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.seminaire_participants ALTER COLUMN id SET DEFAULT nextval('public.seminaire_participants_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq1'::regclass);


--
-- Name: services_entites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.services_entites ALTER COLUMN id SET DEFAULT nextval('public.services_entites_id_seq'::regclass);


--
-- Name: services_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.services_institutions ALTER COLUMN id SET DEFAULT nextval('public.services_institutions_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sindicats id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.sindicats ALTER COLUMN id SET DEFAULT nextval('public.sindicats_id_seq'::regclass);


--
-- Name: situation_matrimonials id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.situation_matrimonials ALTER COLUMN id SET DEFAULT nextval('public.situation_matrimonials_id_seq'::regclass);


--
-- Name: sous_directions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.sous_directions ALTER COLUMN id SET DEFAULT nextval('public.sous_directions_id_seq'::regclass);


--
-- Name: specialites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.specialites ALTER COLUMN id SET DEFAULT nextval('public.specialites_id_seq'::regclass);


--
-- Name: stage id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.stage ALTER COLUMN id SET DEFAULT nextval('public.stage_id_seq'::regclass);


--
-- Name: tiers id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.tiers ALTER COLUMN id SET DEFAULT nextval('public.tiers_id_seq'::regclass);


--
-- Name: tiers_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.tiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.tiers_institutions_id_seq'::regclass);


--
-- Name: type_d_agents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_d_agents ALTER COLUMN id SET DEFAULT nextval('public.type_d_agents_id_seq'::regclass);


--
-- Name: type_de_conges id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_conges ALTER COLUMN id SET DEFAULT nextval('public.type_de_conges_id_seq'::regclass);


--
-- Name: type_de_couriers id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_couriers ALTER COLUMN id SET DEFAULT nextval('public.type_de_couriers_id_seq'::regclass);


--
-- Name: type_de_destinations id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_destinations ALTER COLUMN id SET DEFAULT nextval('public.type_de_destinations_id_seq'::regclass);


--
-- Name: type_de_documents id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_documents ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_id_seq'::regclass);


--
-- Name: type_de_documents_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_documents_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_institutions_id_seq'::regclass);


--
-- Name: type_de_materiels id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_materiels ALTER COLUMN id SET DEFAULT nextval('public.type_de_materiels_id_seq'::regclass);


--
-- Name: type_de_retraites id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_retraites ALTER COLUMN id SET DEFAULT nextval('public.type_de_retraites_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation_institutions id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_institutions_id_seq'::regclass);


--
-- Name: type_etablissements id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.type_etablissements ALTER COLUMN id SET DEFAULT nextval('public.type_etablissements_id_seq'::regclass);


--
-- Name: unite_administratives id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.unite_administratives ALTER COLUMN id SET DEFAULT nextval('public.unite_administratives_id_seq'::regclass);


--
-- Name: utilisateurs id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_id_seq'::regclass);


--
-- Name: workflow_demandes id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.workflow_demandes ALTER COLUMN id SET DEFAULT nextval('public.workflow_demandes_id_seq'::regclass);


--
-- Data for Name: affectations_temporaires; Type: TABLE DATA; Schema: public; Owner: isegroup
--



--
-- Data for Name: affectations_temporaires_institutions; Type: TABLE DATA; Schema: public; Owner: isegroup
--



--
-- Data for Name: agent_documents; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_documents VALUES (114, 61, 'diplome', 'Bulletin_Kouyo_Victoire_1er trimestre_2024-2025.pdf', '/uploads/diplomes/diplome_documents-1759493680572-266409246.pdf', 486195, 'application/pdf', NULL, '2025-10-03 14:14:40.827259', '2025-10-03 14:14:40.827259', '2025-10-03 14:14:40.827259');
INSERT INTO public.agent_documents VALUES (121, 85, 'diplome', 'Devis_app.pdf', '/uploads/diplomes/diplome_documents-1759506576591-177588325.pdf', 158301, 'application/pdf', NULL, '2025-10-03 17:49:36.819209', '2025-10-03 17:49:36.819209', '2025-10-03 17:49:36.819209');
INSERT INTO public.agent_documents VALUES (122, 85, 'autre', 'document 1', '/uploads/documents/dynamic_documents-1759410206242-698288391.pdf', 158301, 'autre', 'Document personnalisé: document 1', '2025-10-03 17:49:36.88878', '2025-10-03 17:49:36.88878', '2025-10-03 17:49:36.88878');
INSERT INTO public.agent_documents VALUES (123, 85, 'autre', 'document 2', '/uploads/documents/dynamic_documents-1759410484563-591519405.pdf', 158301, 'autre', 'Document personnalisé: document 2', '2025-10-03 17:49:36.892979', '2025-10-03 17:49:36.892979', '2025-10-03 17:49:36.892979');
INSERT INTO public.agent_documents VALUES (124, 118, 'autre', 'Certificat de travail', '/uploads/documents/dynamic_documents-1759709332933-552014080.pdf', 486195, 'application/pdf', 'Document personnalisé: Certificat de travail', '2025-10-06 02:08:53.105247', '2025-10-06 02:08:53.105247', '2025-10-06 02:08:53.105247');
INSERT INTO public.agent_documents VALUES (125, 148, 'autre', 'attestation', '/uploads/documents/dynamic_documents-1760625537003-347298150.pdf', 116142, 'application/pdf', 'Document personnalisé: attestation', '2025-10-16 16:38:57.16975', '2025-10-16 16:38:57.16975', '2025-10-16 16:38:57.16975');
INSERT INTO public.agent_documents VALUES (102, 73, 'diplome', 'Bulletin_Kouyo_Victoire_1er trimestre_2024-2025.pdf', '/uploads/diplomes/diplome_documents-1759411892178-693739903.pdf', 486195, 'application/pdf', NULL, '2025-10-02 15:31:32.395675', '2025-10-02 15:31:32.395675', '2025-10-02 15:31:32.395675');
INSERT INTO public.agent_documents VALUES (103, 73, 'autre', 'Certificat', '/uploads/documents/dynamic_documents-1759411892197-869993585.pdf', 158301, 'application/pdf', 'Document personnalisé: Certificat', '2025-10-02 15:31:32.43323', '2025-10-02 15:31:32.43323', '2025-10-02 15:31:32.43323');


--
-- Data for Name: agent_langues; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_langues VALUES (16, 148, 3, 2, '2025-10-16 16:38:57.250473', '2025-10-16 16:38:57.250473');
INSERT INTO public.agent_langues VALUES (17, 148, 4, 2, '2025-10-16 16:38:57.256201', '2025-10-16 16:38:57.256201');


--
-- Data for Name: agent_logiciels; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_logiciels VALUES (17, 148, 11, 3, '2025-10-16 16:38:57.265427', '2025-10-16 16:38:57.265427');
INSERT INTO public.agent_logiciels VALUES (18, 148, 6, 4, '2025-10-16 16:38:57.269932', '2025-10-16 16:38:57.269932');


--
-- Data for Name: agent_login_codes; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_login_codes VALUES (4, 52, '8A4FCACC', '2025-09-24 00:23:09.195', NULL, '2025-09-23 00:23:09.209642');
INSERT INTO public.agent_login_codes VALUES (12, 73, '03912458', '2025-09-26 15:00:06.948', NULL, '2025-09-25 15:00:06.954308');
INSERT INTO public.agent_login_codes VALUES (21, 118, '321A3CFA', '2025-10-07 02:08:53.269', NULL, '2025-10-06 02:08:53.281102');
INSERT INTO public.agent_login_codes VALUES (22, 137, '28ECBB3C', '2025-10-11 19:37:27.037', NULL, '2025-10-10 19:37:27.05333');
INSERT INTO public.agent_login_codes VALUES (23, 148, 'E7A716B0', '2025-10-17 00:51:04.773', NULL, '2025-10-16 00:51:04.788787');
INSERT INTO public.agent_login_codes VALUES (24, 149, 'E1CF556B', '2025-10-17 00:53:41.119', NULL, '2025-10-16 00:53:41.134703');
INSERT INTO public.agent_login_codes VALUES (25, 150, '32771CC7', '2025-10-17 00:56:34.226', NULL, '2025-10-16 00:56:34.233503');
INSERT INTO public.agent_login_codes VALUES (26, 1809, '9E3AA327', '2025-11-07 11:20:58.427', NULL, '2025-11-06 11:20:58.435418');
INSERT INTO public.agent_login_codes VALUES (27, 1810, '0B2EA4BB', '2025-11-07 11:22:59.384', NULL, '2025-11-06 11:22:59.385182');


--
-- Data for Name: agent_photos; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_photos VALUES (2, 85, '/uploads/photos/photo_profil-1759370791514-789975995.webp', 'equipe2.webp', 6040, 'image/webp', true, '2025-10-02 04:06:31.615769', '2025-10-02 04:06:31.615769', '2025-10-02 04:06:31.615769');
INSERT INTO public.agent_photos VALUES (3, 73, '/uploads/photos/photo_profil-1759411892173-290059037.jpg', 'lycee7.jpg', 6232, 'image/jpeg', true, '2025-10-02 15:31:32.344963', '2025-10-02 15:31:32.344963', '2025-10-02 15:31:32.344963');
INSERT INTO public.agent_photos VALUES (4, 61, '/uploads/photos/photo_profil-1759486991196-573925586.jpg', 'WhatsApp Image 2025-02-10 Ã  14.06.09_d5b3ebc5.jpg', 92860, 'image/jpeg', true, '2025-10-03 12:23:11.482342', '2025-10-03 12:23:11.482342', '2025-10-03 12:23:11.482342');
INSERT INTO public.agent_photos VALUES (5, 118, '/uploads/photos/photo_profil-1759709332929-442925392.jpg', 'lycee7.jpg', 6232, 'image/jpeg', true, '2025-10-06 02:08:53.071312', '2025-10-06 02:08:53.071312', '2025-10-06 02:08:53.071312');
INSERT INTO public.agent_photos VALUES (6, 128, '/uploads/photos/photo_profil-1759744426540-440961643.jpg', 'image.jpg', 111374, 'image/jpeg', true, '2025-10-06 11:53:46.781708', '2025-10-06 11:53:46.781708', '2025-10-06 11:53:46.781708');
INSERT INTO public.agent_photos VALUES (7, 148, '/uploads/photos/photo_profil-1760625537002-381345461.webp', 'equipe2.webp', 6040, 'image/webp', true, '2025-10-16 16:38:57.145532', '2025-10-16 16:38:57.145532', '2025-10-16 16:38:57.145532');
INSERT INTO public.agent_photos VALUES (8, 1809, '/uploads/photos/photo_profil-1762428058269-86361686.png', 'logo-drh.png', 27441, 'image/png', true, '2025-11-06 11:20:58.341374', '2025-11-06 11:20:58.341374', '2025-11-06 11:20:58.341374');
INSERT INTO public.agent_photos VALUES (9, 1810, '/uploads/photos/photo_profil-1762428179293-477317585.jpg', 'media-article.jpg', 297076, 'image/jpeg', true, '2025-11-06 11:22:59.312955', '2025-11-06 11:22:59.312955', '2025-11-06 11:22:59.312955');


--
-- Data for Name: agent_signatures; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agent_signatures VALUES (2, 59, '/uploads/signatures/signature-1762964057281-445954232.png', 'signatures/signature-1762964057281-445954232.png', 'second.png', 21756, 'image/png', true, '2025-11-12 16:14:17.28648', '2025-11-12 16:43:55.561068');


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.agents VALUES (137, 1, 1, 1, 1, 2, NULL, 'ABOU', 'NORBERT', '14543', '2025-10-09', 'LAKOTA', 0, '0758999073', NULL, 'M', 'KOUADIO', 'ANGE', 'gnantihourejosue102124@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-14', '2025-10-14', '2025-10-10 19:37:26.791091', '2025-11-06 15:29:08.829098', NULL, 1, 5, 37, NULL, 23, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 8, NULL, 15, NULL, NULL, NULL, NULL, NULL, '2085-12-31', NULL, NULL, 'Bon pour le service', NULL, NULL, NULL, '2025-09-29', '2025-10-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (85, 7, 1, 1, 1, 1, NULL, 'KOUADIO', 'ARMAND', '153333', '2025-10-07', 'LAKOTA', 0, '+2250507654284', '+225007654284', 'M', 'MARIE', 'PAUL', 'jeaneli@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-23', '2025-10-16', '2025-10-02 01:39:13.315158', '2025-11-06 15:29:08.574806', 6, 1, 5, NULL, 20, NULL, 24, 21, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2085-12-31', NULL, NULL, 'Exempté', '14138K', '2024-09-30', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1002, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'FRANCK OLIVIER', '982961N', '1977-12-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-01', NULL, '2025-10-27 12:16:50.817152', '2025-11-06 15:29:11.582385', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2037-12-31', 'ASSISTANT', NULL, NULL, NULL, NULL, NULL, '2022-03-01', '2022-03-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (145, 1, NULL, 1, 2, 2, NULL, 'KONE', 'MARIE', 'CC-EDU-2025-001', '1980-01-15', 'ABIDJAN', 45, '+22507000000', NULL, 'M', NULL, NULL, 'm.chefcabinet@nouveau.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-01-01', NULL, '2025-10-13 01:03:18.722679', '2025-11-06 15:29:09.624863', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (149, 1, NULL, 1, 1, 2, NULL, 'SOURA', 'MANOU', '5424K', '2025-10-08', 'GAGNOA', 0, '+2250565452445', NULL, 'M', NULL, NULL, 'dalo@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-16 00:53:40.820974', '2025-11-06 15:29:09.741992', NULL, NULL, 5, 37, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, 15, NULL, NULL, NULL, NULL, NULL, '2085-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1027, NULL, NULL, NULL, 1, 1, NULL, 'KOUADJO', 'AKISSI ROSALIE', '368215R', '1981-04-20', 'ABIDJAN ADM', NULL, '20347245', NULL, 'F', NULL, NULL, 'rosiebledja@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-04-18', NULL, '2025-10-27 12:16:50.960073', '2025-11-06 15:29:15.219877', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-04-18', '2021-12-22', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1026, NULL, NULL, NULL, 1, 1, NULL, 'GLAOU', 'EDDIE FORTUNEZ', '345907H', '1979-02-18', 'ABIDJAN ADM', NULL, '20347929', '01 31 31 23', 'M', NULL, NULL, 'eddys_kiki@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:50.953613', '2025-11-06 15:29:15.21705', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2021-12-22', NULL, 182, NULL);
INSERT INTO public.agents VALUES (142, 1, NULL, 1, 2, 2, NULL, 'KONE', 'MARIE', 'CC-EDU-001', '1980-01-15', 'ABIDJAN', 45, '+22507000000', NULL, 'M', NULL, NULL, 'm.chefcabinet@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-01-01', NULL, '2025-10-13 01:01:50.861398', '2025-11-06 15:29:09.394257', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (146, 1, NULL, 1, 2, 2, NULL, 'TRAORE', 'PIERRE', 'DG-EDU-2025-001', '1980-01-15', 'ABIDJAN', 45, '+22507000000', NULL, 'M', NULL, NULL, 'p.directeurgeneral@nouveau.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-01-01', NULL, '2025-10-13 01:03:18.796481', '2025-11-06 15:29:09.688184', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1019, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'BI VAMI', '982985F', '1978-06-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-05', NULL, '2025-10-27 12:16:50.913288', '2025-11-06 15:29:15.104574', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2038-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-04-05', NULL, 181, NULL);
INSERT INTO public.agents VALUES (1024, NULL, NULL, NULL, 1, 1, NULL, 'TANOH', 'NEMIN ARISTIDE', '437484E', '1985-03-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-03-09', NULL, '2025-10-27 12:16:50.942737', '2025-11-06 15:29:15.17518', NULL, NULL, 5, 38, 38, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2017-03-09', '2022-07-06', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1025, NULL, NULL, NULL, 1, 1, NULL, 'TRA', 'BI NEE GOREDJI BEHIGBA R.', '337228F', '1978-01-16', 'ABIDJAN ADM', NULL, '20347938', NULL, 'F', NULL, NULL, 'goredji78@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-02-06', NULL, '2025-10-27 12:16:50.947069', '2025-11-06 15:29:15.213901', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-02-06', '2022-01-14', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1028, NULL, NULL, NULL, 1, 1, NULL, 'SERY', 'NEE GODRIN- KOUADIO G.A.L', '820764H', '1991-11-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-10-22', NULL, '2025-10-27 12:16:50.965379', '2025-11-06 15:29:15.254044', NULL, NULL, 5, 37, 39, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-14', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1029, NULL, NULL, NULL, 1, 1, NULL, 'TAPE', 'ULSURE DIANE', '480792S', '1995-11-02', 'ABIDJAN ADM', NULL, '09 48 78 51', '54 80 00 50', 'F', NULL, NULL, 'tapedianeulsure@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:50.972267', '2025-11-06 15:29:15.294989', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2022-01-25', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1030, NULL, NULL, NULL, 1, 1, NULL, 'AKOMIAN', 'CHRISTELLE FRANCINE', '815419P', '1979-12-03', 'ABIDJAN ADM', NULL, '07 09 53 59', NULL, 'F', NULL, NULL, 'christakom79@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-28', NULL, '2025-10-27 12:16:50.977219', '2025-11-06 15:29:15.340761', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-28', '2021-07-02', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1031, NULL, NULL, NULL, 1, 1, NULL, 'SANA', 'AMY FLORA', '815488M', '1992-10-05', 'ABIDJAN ADM', NULL, '07 47 66 31', '01 42 65 93', 'F', NULL, NULL, 'amyflorasana@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-05', NULL, '2025-10-27 12:16:50.982367', '2025-11-06 15:29:15.389701', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 28, 218, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-05', '2021-07-02', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1032, NULL, NULL, NULL, 1, 1, NULL, 'OZE', 'LOU SAMINY EDITH C.', '825989M', '1987-09-23', 'ABIDJAN ADM', NULL, '07 09 96 25', NULL, 'F', NULL, NULL, 'aminysoze@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-25', NULL, '2025-10-27 12:16:50.989398', '2025-11-06 15:29:15.481844', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2047-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2014-02-14', '2022-04-04', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1033, NULL, NULL, NULL, 1, 1, NULL, 'DEM', 'AWA AIDA', '481521F', '1994-04-24', 'ABIDJAN ADM', NULL, '77 35 36 19', '53 68 56 46', 'F', NULL, NULL, 'awadem723@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-10', NULL, '2025-10-27 12:16:50.994811', '2025-11-06 15:29:15.485001', NULL, NULL, 6, 44, 41, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2054-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2020-03-10', '2021-06-12', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1034, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'NEE FOSSOU AYA MARTHE', '372134U', '1978-08-14', 'ABIDJAN ADM', NULL, '05 86 87 34', '41 61 43 29', 'F', NULL, NULL, 'fossoumarthe2@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-03-09', NULL, '2025-10-27 12:16:50.999705', '2025-11-06 15:29:15.48787', NULL, NULL, 9, 45, 42, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2012-03-09', '2012-03-26', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1041, NULL, NULL, NULL, 1, 1, NULL, 'YOKORE', 'GAMA LANDRY', '902716Y', '1993-02-16', 'ABIDJAN ADM', NULL, NULL, '40 99 73 24', 'M', NULL, NULL, 'gamayokore@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-09-26', NULL, '2025-10-27 12:16:51.038878', '2025-11-06 15:29:15.833682', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2053-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-09-26', '2024-10-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1042, NULL, NULL, NULL, 1, 1, NULL, 'AHIBO', 'NOGOU LUC-EMMANUEL', '905377F', '1998-10-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-07', NULL, '2025-10-27 12:16:51.045393', '2025-11-06 15:29:15.836906', NULL, NULL, 8, 47, 33, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-01-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1051, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'MOUSTAPHA KHALIL', '885469Y', '1978-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-27', NULL, '2025-10-27 12:16:51.096147', '2025-11-06 15:29:17.028619', NULL, NULL, 5, 38, 46, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-03-27', '2024-06-12', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1052, NULL, NULL, NULL, 1, 1, NULL, 'LOBAKRE', 'DOMPEBIE PRISCA', '323314X', '1978-03-28', 'ABIDJAN ADM', NULL, '777876873', '20 37 67 30', 'F', NULL, NULL, 'priscalobakre@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-04-25', NULL, '2025-10-27 12:16:51.100875', '2025-11-06 15:29:17.182628', NULL, NULL, 5, 37, 27, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 221, '2038-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2021-11-19', '2021-11-19', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1054, NULL, NULL, NULL, 1, 1, NULL, 'AMONCHI', 'AMANEH JOSEE PRISCA', '826175M', '1987-07-09', 'ABIDJAN ADM', NULL, '05 04 73 41', '01 42 16 61', 'F', NULL, NULL, 'amonchijoseeprisca@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-12', NULL, '2025-10-27 12:16:51.118526', '2025-11-06 15:29:17.555478', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2047-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2022-04-12', '2022-04-12', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1055, NULL, NULL, NULL, 1, 1, NULL, 'BINTOU', 'KONE', '826186H', '1981-04-30', 'ABIDJAN ADM', NULL, '141231787', NULL, 'F', NULL, NULL, 'bintoukjumelle@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-12', NULL, '2025-10-27 12:16:51.128078', '2025-11-06 15:29:17.700272', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2041-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2022-04-12', '2022-04-12', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1057, NULL, NULL, NULL, 1, 1, NULL, 'EBENE', 'AYA CONSTANCE', '885397Q', '1976-06-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-05', NULL, '2025-10-27 12:16:51.144585', '2025-11-06 15:29:17.767967', NULL, NULL, 5, 37, 27, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2036-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2024-05-04', '2024-04-05', NULL, 137, NULL);
INSERT INTO public.agents VALUES (1058, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'YACOUBA', '323944X', '1970-01-01', 'ABIDJAN ADM', NULL, '20347974', '01 92 41 84', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-05-18', NULL, '2025-10-27 12:16:51.151569', '2025-11-06 15:29:18.092697', NULL, NULL, 8, 47, 32, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 221, '2030-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2007-05-18', '2017-11-30', NULL, 137, NULL);
INSERT INTO public.agents VALUES (1059, NULL, NULL, NULL, 1, 1, NULL, 'SEKOU', 'BAMBA', '233494K', '1963-12-18', 'ABIDJAN ADM', NULL, '20-34-79-14', NULL, 'M', NULL, NULL, 'cheickbamby@hotmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1988-10-19', NULL, '2025-10-27 12:16:51.161071', '2025-11-06 15:29:18.096135', NULL, NULL, 5, 41, 47, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 222, '2028-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2010-05-31', '2010-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1066, NULL, NULL, NULL, 1, 1, NULL, 'FAGLA', 'ANDREA', '856161V', '1997-03-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'andrea.fagla@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:51.223758', '2025-11-06 15:29:18.302287', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1067, NULL, NULL, NULL, 1, 1, NULL, 'GOURI', 'LOU BALO DANIELLE WILSON', '265431T', '1970-06-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'mariemere09@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-10-16', NULL, '2025-10-27 12:16:51.234173', '2025-11-06 15:29:18.337686', NULL, NULL, 6, 44, 41, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2030-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2017-10-16', '2017-10-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1068, NULL, NULL, NULL, 1, 1, NULL, 'ADJA', 'KAN DIANE CARELLE', '886723P', '1996-03-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'adjadianecarelle@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-21', NULL, '2025-10-27 12:16:51.244056', '2025-11-06 15:29:18.380723', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-03-21', '2024-05-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1069, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'WOTOH BARAKISSA', '826009T', '1993-09-20', 'ABIDJAN ADM', NULL, '05 46 66 33', NULL, 'F', NULL, NULL, 'kissamaxout22@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-07', NULL, '2025-10-27 12:16:51.251821', '2025-11-06 15:29:18.426557', NULL, NULL, 6, 42, 30, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2053-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2022-03-07', '2025-09-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1489, NULL, NULL, NULL, 1, 1, NULL, 'M.', 'L. LAGAUD EPSE VINCENT', '273520G', '1968-04-20', 'BOUAKE PREF', NULL, '07 80 61 40', NULL, 'F', NULL, NULL, 'ellognemarielagaud@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2000-07-07', NULL, '2025-10-27 12:16:54.026238', '2025-11-06 15:29:40.024899', NULL, NULL, 6, 44, 41, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2028-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2012-12-03', '2012-12-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (64, NULL, NULL, NULL, 2, 3, NULL, 'admin', 'sante', 'MAT-009', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.sante@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.309648', '2025-11-06 15:29:07.912521', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (139, 1, NULL, 1, 2, 1, NULL, 'SOUSDIRECTEUR', 'MARIE', 'SDIR-2025-001', '1980-08-22', 'LAKTA', 45, '+237 690 000 002', NULL, 'F', NULL, NULL, 'marie.sousdirecteur@ministere.gov', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-12 21:25:55.585334', '2025-11-06 15:29:09.159874', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1092, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'ABDOULAYE', '307354Q', '1972-12-09', 'ABIDJAN ADM', NULL, '20347951', '49 72 70 94', 'M', NULL, NULL, 'abdoulaye7270@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-01-14', NULL, '2025-10-27 12:16:51.445996', '2025-11-06 15:29:19.002739', NULL, NULL, 5, 37, 25, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2032-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2005-01-14', '2022-02-07', NULL, 141, NULL);
INSERT INTO public.agents VALUES (1091, NULL, NULL, NULL, 2, 1, NULL, 'KONE', 'ZIEPLE YAWA', '982960Z', '1973-11-18', 'ABIDJAN ADM', NULL, '05 74 55 08', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-02', NULL, '2025-10-27 12:16:51.439874', '2025-11-06 15:29:18.985395', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-02', '2021-05-02', NULL, NULL, 17);
INSERT INTO public.agents VALUES (1093, NULL, NULL, NULL, 1, 1, NULL, 'SOKRO', 'GRAH BLAH CATHERINE', '345662J', '1980-01-17', 'ABIDJAN ADM', NULL, '20347971', '07 71 28 41', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-10-12', NULL, '2025-10-27 12:16:51.452054', '2025-11-06 15:29:19.053737', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2009-10-12', '2009-11-30', NULL, 141, NULL);
INSERT INTO public.agents VALUES (1094, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'NEE KONE ATCHOUMTCHO', '832839M', '1988-10-10', 'ABIDJAN ADM', NULL, '05 04 07 39', '01 42 94 98', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-25', NULL, '2025-10-27 12:16:51.460069', '2025-11-06 15:29:19.145368', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-25', '2022-06-14', NULL, 141, NULL);
INSERT INTO public.agents VALUES (1095, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'AZON ELLA NADEGE', '372229K', '1981-02-03', 'ABIDJAN ADM', NULL, '20347971', '01 92 93 17', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-22', NULL, '2025-10-27 12:16:51.466975', '2025-11-06 15:29:19.17383', NULL, NULL, 9, 45, 42, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-11-22', '2015-09-01', NULL, 141, NULL);
INSERT INTO public.agents VALUES (1096, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'ABLAHA YOLANDE', '358599R', '1977-04-21', 'ABIDJAN ADM', NULL, '08 82 27 18', '07 41 74 29', 'F', NULL, NULL, 'yolandebrou@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-01-05', NULL, '2025-10-27 12:16:51.475571', '2025-11-06 15:29:19.238986', NULL, NULL, 5, 39, 22, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-01-05', '2020-09-23', NULL, 142, NULL);
INSERT INTO public.agents VALUES (1097, NULL, NULL, NULL, 1, 1, NULL, 'N''DOUME', 'NEE ADJA AGBEKE M.', '297584N', '1973-11-04', 'ABIDJAN ADM', NULL, '20218914', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-10', NULL, '2025-10-27 12:16:51.481621', '2025-11-06 15:29:19.397814', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2038-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2003-10-10', '2021-12-22', NULL, 142, NULL);
INSERT INTO public.agents VALUES (1098, NULL, NULL, NULL, 1, 1, NULL, 'MEL', 'MINDY FELICITE', '304895V', '1977-12-31', 'ABIDJAN ADM', NULL, '06 35 18 16', '02 72 95 29', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:51.490823', '2025-11-06 15:29:19.441694', NULL, NULL, 5, 37, 25, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2019-07-03', NULL, 142, NULL);
INSERT INTO public.agents VALUES (1099, NULL, NULL, NULL, 1, 1, NULL, 'TOURE', 'ABDELRHAMANE BEN YAYA', '402854W', '1987-07-05', 'ABIDJAN ADM', NULL, '58 -5 5- 89', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2014-05-20', NULL, '2025-10-27 12:16:51.496988', '2025-11-06 15:29:19.953857', NULL, NULL, 5, 37, 53, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2047-12-31', 'EDUCATEUR SPECIALISE', NULL, NULL, NULL, NULL, NULL, '2014-05-20', '2020-04-20', NULL, 142, NULL);
INSERT INTO public.agents VALUES (1100, NULL, NULL, NULL, 1, 1, NULL, 'KOKO', 'ADJOUMANI INNOCENT', '314826Q', '1971-02-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-31', NULL, '2025-10-27 12:16:51.504524', '2025-11-06 15:29:19.956511', NULL, NULL, 5, 39, 22, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2036-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2005-10-31', '2022-02-07', NULL, 143, NULL);
INSERT INTO public.agents VALUES (1101, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AKOLY FRANCK OLIVIER', '855854T', '1987-02-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'kouadio_akoly@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-03', NULL, '2025-10-27 12:16:51.510899', '2025-11-06 15:29:19.95859', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-03', '2023-02-06', NULL, 143, NULL);
INSERT INTO public.agents VALUES (1102, NULL, NULL, NULL, 1, 1, NULL, 'FOUA', 'CLAUDE NAZAIRE', '323854V', '1974-12-28', 'ABIDJAN ADM', NULL, '23540061/04-41', NULL, 'M', NULL, NULL, 'claudefoua@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-14', NULL, '2025-10-27 12:16:51.516486', '2025-11-06 15:29:19.960796', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2034-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-02-14', '2012-06-14', NULL, 143, NULL);
INSERT INTO public.agents VALUES (1117, NULL, NULL, NULL, 2, 1, NULL, 'DAMO', 'JEAN-BAPTISTE', '982949S', '1981-01-31', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-01-04', NULL, '2025-10-27 12:16:51.633341', '2025-11-06 15:29:20.37179', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2041-12-31', 'CHARGE DE COMMUNICATION', NULL, NULL, NULL, NULL, NULL, '2021-01-04', '2022-04-07', NULL, 145, NULL);
INSERT INTO public.agents VALUES (1118, NULL, NULL, NULL, 2, 1, NULL, 'AHOUANAN', 'N''KOUMO GUSTAVE', '982970T', '1987-07-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-11-10', NULL, '2025-10-27 12:16:51.641147', '2025-11-06 15:29:20.450364', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-11-10', '2021-11-10', NULL, 145, NULL);
INSERT INTO public.agents VALUES (1122, NULL, NULL, NULL, 1, 1, NULL, 'SAVADOGO', 'EMMANUEL PAMIWINDE', '855875Y', '1989-09-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:51.667256', '2025-11-06 15:29:20.650825', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 225, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1124, NULL, NULL, NULL, 1, 1, NULL, 'ZOUZOU', 'NEE KOUA BROU LILIANE', '815507Q', '1982-12-16', 'ABIDJAN ADM', NULL, '07 07 19 86', '01 03 54 17', 'F', NULL, NULL, 'kbrouliliane@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:51.68172', '2025-11-06 15:29:20.886669', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1125, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'NEE YEDMEL MARIE NADEGE', '855467X', '1983-11-18', 'ABIDJAN ADM', NULL, '07 09 83 05', NULL, 'F', NULL, NULL, 'nadegeyaopro@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:51.688729', '2025-11-06 15:29:20.896608', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1126, NULL, NULL, NULL, 1, 1, NULL, 'ADOUKO', 'AMOUAN GUY', '855816M', '1983-09-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'adoukoguy@yakoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-03', NULL, '2025-10-27 12:16:51.695124', '2025-11-06 15:29:20.989213', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-03', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1127, NULL, NULL, NULL, 1, 1, NULL, 'AKOSSO', 'TCHAPOBIE MARIE G.', '855818X', '1993-09-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'amarie:ilerte@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:51.700461', '2025-11-06 15:29:21.022403', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1103, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'KOLO', '874067U', '1995-03-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'kolosoro1995@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-07', NULL, '2025-10-27 12:16:51.524473', '2025-11-06 15:29:19.96317', NULL, NULL, 6, 44, 54, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2025-06-16', '2025-07-02', NULL, 143, NULL);
INSERT INTO public.agents VALUES (1108, NULL, NULL, NULL, 2, 1, NULL, 'VOVOR', 'GERALDINE AFI AFEFA M. C', '507038Y', '1986-03-14', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'geraldine.vovor@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-07-18', NULL, '2025-10-27 12:16:51.563939', '2025-11-06 15:29:19.977561', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2046-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2022-07-18', '2022-07-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1109, NULL, NULL, NULL, 2, 1, NULL, 'BACHIROU', 'OSENI ANATOLE', '982908S', '1958-02-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-05', NULL, '2025-10-27 12:16:51.572968', '2025-11-06 15:29:19.980522', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 224, '2018-12-31', 'REPORTER PHOTOGRAPHE', NULL, NULL, NULL, NULL, NULL, '2017-01-05', '2017-01-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1110, NULL, NULL, NULL, 2, 1, NULL, 'COULIBALY', 'ADAMA REMI', '982928M', '1972-01-13', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-07', NULL, '2025-10-27 12:16:51.579916', '2025-11-06 15:29:19.982826', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2032-12-31', 'JOURNALISTE', NULL, NULL, NULL, NULL, NULL, '2019-01-07', '2019-01-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1111, NULL, NULL, NULL, 2, 1, NULL, 'ADO', 'BADIRUS AMAO', '982969W', '1980-10-05', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-02', NULL, '2025-10-27 12:16:51.587041', '2025-11-06 15:29:19.984557', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2040-12-31', 'PHOTOGRAPHE', NULL, NULL, NULL, NULL, NULL, '2021-05-02', '2021-05-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1113, NULL, NULL, NULL, 2, 1, NULL, 'TOUE', 'BI BLY STEPHANE', '982997B', '1981-07-11', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-20', NULL, '2025-10-27 12:16:51.601698', '2025-11-06 15:29:20.109683', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 224, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2023-04-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1128, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'KADIDIATOU', '855852Z', '1997-02-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'konekadi1997@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-23', NULL, '2025-10-27 12:16:51.709223', '2025-11-06 15:29:21.066966', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-23', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1131, NULL, NULL, NULL, 1, 1, NULL, 'MAMBRE', 'GUERA FREDERIC', '268184F', '1969-12-19', 'ABIDJAN ADM', NULL, '07 26 95 00', '05 42 89 72', 'M', NULL, NULL, 'mambreguera2020@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1998-07-28', NULL, '2025-10-27 12:16:51.729065', '2025-11-06 15:29:21.271049', NULL, NULL, 9, 46, 58, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2029-12-31', 'AGENT DE COURRIER', NULL, NULL, NULL, NULL, NULL, '1998-07-28', '1998-07-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1140, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'ELOGE ODILON', '491347S', '1992-06-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'elogeodilon4@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-05-12', NULL, '2025-10-27 12:16:51.798011', '2025-11-06 15:29:21.73421', NULL, NULL, 5, 37, 60, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-03-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1141, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'AYEKOU PATRICK EDDY N.', '855859G', '1994-11-21', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'kpatrickeddy@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-26', NULL, '2025-10-27 12:16:51.806947', '2025-11-06 15:29:21.741332', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-26', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1490, NULL, NULL, NULL, 1, 1, NULL, 'ELIDJE', 'AAHA ERIKA ROSEMONDE', '855837J', '1987-01-01', 'BOUAKE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'elidjerosemonde@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:54.031066', '2025-11-06 15:29:40.026677', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 248, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2024-06-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (61, 3, 1, 1, 2, 1, NULL, 'KOUADIO', 'NADINE', 'MAT-004', '1980-01-01', 'ABIDJAN', 45, '+225 20 30 40 00', '+2250788754565', 'F', 'MARIE', 'KOFFI', 'agent.rh1@gouv.ci', NULL, NULL, 0, 'COCODY CENTRE', '0758999073', '103', NULL, '2587', 'B102', 'actif', '2025-10-15', '2025-10-18', '2025-09-25 02:42:00.278224', '2025-11-06 15:29:07.834609', 7, 1, NULL, NULL, 20, NULL, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 17, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', 'DIRECTEUR DES AFFAIRES ADMINISTRATIVES ET FINANCIERE', NULL, 'Exempté', '1414', '2025-10-29', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (140, 1, NULL, 1, 2, 1, NULL, 'DIRCABINET', 'PAUL', 'DCAB-2025-001', '1972-03-10', 'LAKOTA', 53, '+237 690 000 003', NULL, 'M', NULL, NULL, 'paul.dircabinet@ministere.gov', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-12 21:25:55.585334', '2025-11-06 15:29:09.165442', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2032-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (138, 1, NULL, 1, 2, 1, NULL, 'DIRECTEUR', 'JEAN', 'DIR-2025-001', '1975-05-15', 'LAKOTA', 50, '+237 690 000 001', NULL, 'M', NULL, NULL, 'jean.directeur@ministere.gov', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-12 21:25:55.585334', '2025-11-06 15:29:09.089004', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2035-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (150, 1, NULL, 1, 1, 2, NULL, 'FOUTO', 'JANNE', '542415L', '2024-10-03', 'GAGNOA', 1, '+22505546781', NULL, 'M', NULL, NULL, 'yaop@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-16 00:56:34.011146', '2025-11-06 15:29:09.746419', NULL, NULL, 5, 38, NULL, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, 15, NULL, NULL, NULL, NULL, NULL, '2089-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1142, NULL, NULL, NULL, 1, 1, NULL, 'KAKOU', 'KANGAH MARIE-THERESE', '825999P', '1992-07-22', 'ABIDJAN ADM', NULL, '07 08 65 60', NULL, 'F', NULL, NULL, 'mt.kakou@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-07', NULL, '2025-10-27 12:16:51.813502', '2025-11-06 15:29:21.743964', NULL, NULL, 6, 44, 41, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2052-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-03-07', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (118, 1, 1, 1, 1, 1, NULL, 'KOUADIO', 'JAQUES', '15718484H', '2003-09-30', 'SOUBRE', 22, '+2250785412545', '+2250506984524', 'M', NULL, NULL, 'gnantihourejosue@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-05', NULL, '2025-10-06 02:08:52.996402', '2025-11-06 15:29:08.817445', NULL, 1, 8, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2063-12-31', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-10', NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1154, NULL, NULL, NULL, 1, 1, NULL, 'DIANE', 'ABDOULAYE', '886296L', '1974-12-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'abdoulayedi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-22', NULL, '2025-10-27 12:16:51.89456', '2025-11-06 15:29:24.572488', NULL, NULL, 5, 38, 62, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2039-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2024-04-22', '2024-04-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1149, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'KOUAKOU VICTOR', '827779B', '1985-09-30', 'ABIDJAN ADM', NULL, '05 06 35 64', NULL, 'M', NULL, NULL, 'vic.kouassi@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-11', NULL, '2025-10-27 12:16:51.864127', '2025-11-06 15:29:23.028537', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-11', '2022-06-02', NULL, 149, NULL);
INSERT INTO public.agents VALUES (1152, NULL, NULL, NULL, 2, 1, NULL, 'CODJO', 'PIERRE CHRISTOPHE', '506858A', '1977-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-01-04', NULL, '2025-10-27 12:16:51.88265', '2025-11-06 15:29:24.332244', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 226, '2037-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-02-07', NULL, 150, NULL);
INSERT INTO public.agents VALUES (1155, NULL, NULL, NULL, 1, 1, NULL, 'GONKANOU', 'NANOU VIRGINIE', '886369C', '1987-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'gonkanou80@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-13', NULL, '2025-10-27 12:16:51.899852', '2025-11-06 15:29:24.776486', NULL, NULL, 5, 37, 26, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-13', '2024-05-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1163, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'MADADA', '815459X', '1989-06-28', 'ABIDJAN ADM', NULL, NULL, '05 46 39 39', 'F', NULL, NULL, 'konemadad@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-07', NULL, '2025-10-27 12:16:51.944659', '2025-11-06 15:29:26.01148', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 228, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-07', '2025-08-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1171, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'BABA AMARA', '293402U', '1978-12-22', 'ABIDJAN ADM', NULL, '05 27 87 89', NULL, 'M', NULL, NULL, 'b.traore@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-01-06', NULL, '2025-10-27 12:16:51.990902', '2025-11-06 15:29:26.529122', NULL, NULL, 5, 39, 22, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 229, '2043-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2014-12-15', '2014-12-15', NULL, 154, NULL);
INSERT INTO public.agents VALUES (1156, NULL, NULL, NULL, 1, 1, NULL, 'LOHOUES', 'NAOMIE FRANCK ANGELINA', '890118Z', '1996-06-05', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'naomyhlohoues@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-15', NULL, '2025-10-27 12:16:51.906303', '2025-11-06 15:29:25.396366', NULL, NULL, 6, 44, 36, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-15', '2024-06-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1157, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'FANTA', '481638U', '1996-10-30', 'ABIDJAN ADM', NULL, NULL, '41 07 58 34', 'F', NULL, NULL, 'fatimsylla220@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:51.911633', '2025-11-06 15:29:25.871624', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2056-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2020-04-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1164, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'MINIBENI FATOUMATA', '855829S', '1985-12-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'fatcoolmaka@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-02', NULL, '2025-10-27 12:16:51.949308', '2025-11-06 15:29:26.014166', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 228, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-02', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1165, NULL, NULL, NULL, 1, 1, NULL, 'AYEKOE', 'NEE AKABLA RADIATE S.', '855825N', '1984-01-01', 'ABJ-PLATEAU', NULL, NULL, NULL, 'F', NULL, NULL, 'radiatesabine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-30', NULL, '2025-10-27 12:16:51.955816', '2025-11-06 15:29:26.016422', NULL, NULL, 6, 44, 36, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 238, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 228, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-30', '2023-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1166, NULL, NULL, NULL, 2, 1, NULL, 'SORO', 'KASSOUM', '506867T', '1977-12-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'ckassoum2000@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-07-13', NULL, '2025-10-27 12:16:51.960119', '2025-11-06 15:29:26.097305', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 228, '2037-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-07-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1167, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'NEE KOFFI MELYZANDE P.', '323845U', '1978-01-01', 'ABIDJAN ADM', NULL, '20347418', '40 42 41 35', 'F', NULL, NULL, 'melyzandepatykoffi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:51.964355', '2025-11-06 15:29:26.157641', NULL, NULL, 5, 37, 25, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 228, '2038-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2022-02-07', NULL, 153, NULL);
INSERT INTO public.agents VALUES (1168, NULL, NULL, NULL, 1, 1, NULL, 'KRAH', 'ESTELLE ABENAN MARINA', '480594L', '1990-03-06', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'krahestelle70@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:51.969437', '2025-11-06 15:29:26.25683', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 228, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-07-15', NULL, 153, NULL);
INSERT INTO public.agents VALUES (1169, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'CHIADON TATIANA-RAISSA', '480817K', '1985-10-23', 'ABIDJAN ADM', NULL, '77 78 19 98', '05 19 78 49', 'F', NULL, NULL, 'chiadontatiana@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:51.977306', '2025-11-06 15:29:26.331958', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 228, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, 153, NULL);
INSERT INTO public.agents VALUES (1170, NULL, NULL, NULL, 1, 1, NULL, 'DAGOU', 'NEE AKESSE AMOIN LEA', '337223S', '1980-03-16', 'ABIDJAN ADM', NULL, '01 21 32 33', '07 85 32 08', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:51.983701', '2025-11-06 15:29:26.473845', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 229, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2008-01-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1172, NULL, NULL, NULL, 1, 1, NULL, 'BENIE', 'NEE N''CHO LAURA C.', '323830Z', '1981-08-26', 'ABIDJAN ADM', NULL, NULL, '05 74 79 11', 'F', NULL, NULL, 'lauraclaude11@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-20', NULL, '2025-10-27 12:16:51.995151', '2025-11-06 15:29:26.53249', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 229, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-02-20', '2018-08-23', NULL, 154, NULL);
INSERT INTO public.agents VALUES (1173, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'NEE YEO N. SALIMATA', '827831G', '1990-09-06', 'ABIDJAN ADM', NULL, NULL, '01 02 52 00', 'F', NULL, NULL, 'yeosali6@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-05', NULL, '2025-10-27 12:16:52.000332', '2025-11-06 15:29:26.633832', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 229, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-05', '2022-06-02', NULL, 154, NULL);
INSERT INTO public.agents VALUES (1174, NULL, NULL, NULL, 1, 1, NULL, 'ADOU', 'MIAN DIANE ROSINE', '834867K', '1992-06-08', 'ABIDJAN ADM', NULL, NULL, '05 44 96 59', 'F', NULL, NULL, 'adourosine02@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:52.007826', '2025-11-06 15:29:26.650061', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 229, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-07-01', NULL, 154, NULL);
INSERT INTO public.agents VALUES (1175, NULL, NULL, NULL, 1, 1, NULL, 'LEZOU', 'THIERRY THEOPHILE', '365770W', '1972-02-02', 'ABIDJAN ADM', NULL, '05 38 35 31', '57 15 22 63', 'M', NULL, NULL, 'lezouthierry@yahou.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-01-18', NULL, '2025-10-27 12:16:52.012721', '2025-11-06 15:29:26.653878', NULL, NULL, 5, 38, 43, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 230, '2037-12-31', 'GESTIONNAIRE', NULL, NULL, NULL, NULL, NULL, '2014-02-06', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1176, NULL, NULL, NULL, 1, 1, NULL, 'AGNIMO', 'ZILAHON O. YOLANDE', '359181F', '1979-01-05', 'ABIDJAN ADM', NULL, '3439825', '03 43 98 25', 'F', NULL, NULL, 'agnimoyolande@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:52.01788', '2025-11-06 15:29:26.78556', NULL, NULL, 5, 37, 25, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 230, '2039-12-31', 'RESPONSABLE SERVICE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2022-08-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1177, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'AMOIN LILIANE', '337231S', '1979-02-18', 'ABIDJAN ADM', NULL, '07 72 08 56', '02 88 55 42', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-02-04', NULL, '2025-10-27 12:16:52.026512', '2025-11-06 15:29:26.788714', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 230, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-02-04', '2023-03-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1178, NULL, NULL, NULL, 1, 1, NULL, 'AMBASSY', 'OUMAROU', '493835E', '1985-01-21', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'oumar.abaas@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-06-25', NULL, '2025-10-27 12:16:52.032961', '2025-11-06 15:29:26.790666', NULL, NULL, 6, 44, 63, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 230, '2045-12-31', 'RESPONSABLE DE CELLULE', NULL, NULL, NULL, NULL, NULL, '2020-06-25', '2023-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1179, NULL, NULL, NULL, 1, 1, NULL, 'DEHI', 'FRANCINE', '810016M', '1979-06-26', 'ABIDJAN ADM', NULL, '57 01 01 36', NULL, 'F', NULL, NULL, 'francinedehi09@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:52.04063', '2025-11-06 15:29:26.795149', NULL, NULL, 6, 44, 45, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 230, '2039-12-31', 'RESPONSABLE SERVICE COMPTABILITE', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2022-07-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1180, NULL, NULL, NULL, 1, 1, NULL, 'N''DIN', 'KOUAO LATHO MOREL DORIA', '857121N', '1994-01-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'dorianekouao@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-14', NULL, '2025-10-27 12:16:52.045454', '2025-11-06 15:29:26.797534', NULL, NULL, 6, 42, 31, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 230, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-14', '2025-03-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1186, NULL, NULL, NULL, 1, 1, NULL, 'KOUDOU', 'SAHIRY CHRIS ALEX', '871253G', '1991-09-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'chrisalexsahiry@gmail:com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-01', NULL, '2025-10-27 12:16:52.076966', '2025-11-06 15:29:28.100214', NULL, NULL, 5, 38, 65, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 29, 231, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1187, NULL, NULL, NULL, 1, 1, NULL, 'KLO', 'FAGAMA', '365484V', '1973-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'fagama-k@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-04-05', NULL, '2025-10-27 12:16:52.081074', '2025-11-06 15:29:28.245397', NULL, NULL, 5, 38, 66, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 231, '2038-12-31', 'DIRECTEUR GENERAL', NULL, NULL, NULL, NULL, NULL, '2015-02-18', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1190, NULL, NULL, NULL, 1, 1, NULL, 'ANGAHI', 'NEE TANOH AKUELOU C. M.', '433903N', '1983-07-24', 'ABIDJAN ADM', NULL, '47 91 29 53', '05 50 39 02', 'F', NULL, NULL, 'melanietano@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-29', NULL, '2025-10-27 12:16:52.095615', '2025-11-06 15:29:28.510592', NULL, NULL, 5, 37, 25, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 29, 231, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-29', '2025-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1531, NULL, NULL, NULL, 1, 1, NULL, 'KRA', 'DOMINIQUE AMOIN LAETITIA', '481976P', '1991-12-08', 'DALOA PREF', NULL, '04 44 56 34', NULL, 'F', NULL, NULL, 'domikra@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:54.240938', '2025-11-06 15:29:40.965617', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (9, 2, 1, 1, 2, 2, 8, 'KOUADIO', 'Henriette', 'SANTE002', '1987-12-03', 'Man', 37, '+225 07 89 01 23', '+225 05 89 01 23', 'F', 'KOUADIO Rose', 'KOUADIO Jean', 'henriette.kouadio@sante.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-12-03', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:03.654387', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2047-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1203, NULL, NULL, NULL, 2, 1, NULL, 'BABLE', 'IRENEE PACOME', '982817E', '1980-06-28', 'ABIDJAN ADM', NULL, '07 42 98 33', '45 29 12 44', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-02-12', NULL, '2025-10-27 12:16:52.178187', '2025-11-06 15:29:30.371856', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2040-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2011-02-12', '2017-02-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1204, NULL, NULL, NULL, 2, 1, NULL, 'MONNEY', 'LUCIE ANGE', '982862K', '1986-03-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-11-09', NULL, '2025-10-27 12:16:52.183536', '2025-11-06 15:29:30.523848', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-11-09', '2015-11-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1205, NULL, NULL, NULL, 2, 1, NULL, 'KONE', 'LAMINE', '982905P', '1976-03-06', 'ABIDJAN ADM', NULL, '8285725', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-01-05', NULL, '2025-10-27 12:16:52.191097', '2025-11-06 15:29:30.662497', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 29, 232, '2036-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2015-01-05', '2022-03-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1192, NULL, NULL, NULL, 1, 1, NULL, 'ROAMBA', 'PRISCILLA IRMA VALERIE', '855874X', '1989-04-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-09', NULL, '2025-10-27 12:16:52.106917', '2025-11-06 15:29:28.807696', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-09', '2025-09-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1206, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'AMENAN BRAKISSA', '982929N', '1996-12-15', 'ABIDJAN ADM', NULL, '49 88 76 96', '53 55 29 91', 'F', NULL, NULL, 'amenanbrakissayao@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-02', NULL, '2025-10-27 12:16:52.196219', '2025-11-06 15:29:30.676404', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2056-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2018-01-02', '2018-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1208, NULL, NULL, NULL, 1, 1, NULL, 'BLAIS', 'SAHOUA HORTENSE', '291611S', '1971-01-11', 'ABIDJAN ADM', NULL, '20347412', NULL, 'F', NULL, NULL, '8123309', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-08-14', NULL, '2025-10-27 12:16:52.208376', '2025-11-06 15:29:30.744922', NULL, NULL, 6, 44, 28, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2031-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2003-08-14', '2009-05-25', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1209, NULL, NULL, NULL, 1, 1, NULL, 'ACHI', 'NEE KONAN YABA GERMAINE', '433865P', '1978-08-20', 'ABIDJAN ADM', NULL, '03 73 32 09', '07 31 10 86', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-29', NULL, '2025-10-27 12:16:52.21237', '2025-11-06 15:29:30.82301', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-29', '2018-02-14', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1210, NULL, NULL, NULL, 1, 1, NULL, 'MALAN', 'NEE GUY DAZEER NAHANTOHI', '433879V', '1976-05-19', 'ABIDJAN ADM', NULL, '07 24 89 79', '02 55 05 99', 'F', NULL, NULL, 'fleur', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-29', NULL, '2025-10-27 12:16:52.216379', '2025-11-06 15:29:30.825519', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-29', '2016-12-19', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1211, NULL, NULL, NULL, 1, 1, NULL, 'YOBOU', 'ANTONIN GODEFROY', '482018K', '1991-08-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-28', NULL, '2025-10-27 12:16:52.223028', '2025-11-06 15:29:30.827985', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-28', '2020-02-28', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1229, NULL, NULL, NULL, 2, 1, NULL, 'ABLE', 'KOUAO NICOLAS', '982823C', '1974-12-29', 'ABIDJAN ADM', NULL, '01 73 81 81', '07 84 10 73', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2014-02-14', NULL, '2025-10-27 12:16:52.313725', '2025-11-06 15:29:32.570623', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2034-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2014-02-10', '2024-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1236, NULL, NULL, NULL, 1, 1, NULL, 'GBOGOU', 'DJEDA AMBROISE', '359185B', '1970-05-04', 'ABIDJAN ADM', NULL, '04 98 69 26', NULL, 'M', NULL, NULL, 'www.gabelow@hotmail.frr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:52.350043', '2025-11-06 15:29:32.974119', NULL, NULL, 5, 37, 25, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2030-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1207, NULL, NULL, NULL, 1, 1, NULL, 'KHADIO', 'NEE AKRASSI EDITH', '312887L', '1973-03-19', 'ABIDJAN ADM', NULL, '20347902', '22 48 84 56', 'F', NULL, NULL, 'edithakrassi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:52.201184', '2025-11-06 15:29:30.709288', NULL, NULL, 5, 40, 67, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2038-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2005-10-03', '2005-10-03', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1212, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'KONAN NIHOKA MICHELINE', '815454J', '1995-08-22', 'ABIDJAN ADM', NULL, '07 49 96 54', '05 76 23 25', 'F', NULL, NULL, 'koffikonannihoka@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:52.227208', '2025-11-06 15:29:30.831341', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 232, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2021-07-05', NULL, 155, NULL);
INSERT INTO public.agents VALUES (1213, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'PETANKI MARTIAL', '821059X', '1990-06-30', 'ABIDJAN ADM', NULL, '07 77 85 09', NULL, 'M', NULL, NULL, 'tchelopetanki@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-11-09', NULL, '2025-10-27 12:16:52.231251', '2025-11-06 15:29:30.84267', NULL, NULL, 5, 37, 39, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-11-09', '2021-11-19', NULL, 156, NULL);
INSERT INTO public.agents VALUES (1214, NULL, NULL, NULL, 1, 1, NULL, 'N''GATTA', 'AMOIN PRISCA', '815476Q', '1984-01-01', 'ABIDJAN ADM', NULL, '07 59 10 36', '27 23 45 46', 'F', NULL, NULL, 'damedbattan@yao:fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:52.235025', '2025-11-06 15:29:30.986349', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, 156, NULL);
INSERT INTO public.agents VALUES (1215, NULL, NULL, NULL, 2, 1, NULL, 'KOUAME', 'N''GUESSAN BERNARD', '506863X', '1963-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-11-04', NULL, '2025-10-27 12:16:52.241796', '2025-11-06 15:29:31.046061', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2023-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2019-11-04', '2022-02-07', NULL, 156, NULL);
INSERT INTO public.agents VALUES (1216, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'YOUSSOUF', '265759T', '1969-06-26', 'ABIDJAN ADM', NULL, '20 34 79 76', '47 44 78 54', 'M', NULL, NULL, 'sikobeh@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1997-02-17', NULL, '2025-10-27 12:16:52.246561', '2025-11-06 15:29:31.095013', NULL, NULL, 5, 39, 22, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2034-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2006-12-04', '2008-12-09', NULL, 157, NULL);
INSERT INTO public.agents VALUES (1223, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'AMENAN LARISSA NADEGE', '480631Y', '1989-12-29', 'ABIDJAN ADM', NULL, '45 96 51 08', '78 91 10 06', 'F', NULL, NULL, 'amenanlary@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-26', NULL, '2025-10-27 12:16:52.280616', '2025-11-06 15:29:31.537336', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-26', '2020-02-26', NULL, 158, NULL);
INSERT INTO public.agents VALUES (1227, NULL, NULL, NULL, 1, 1, NULL, 'N''DRI', 'KOUADIO YOCOLLY G', '808046E', '1981-01-08', 'ABIDJAN ADM', NULL, '20-34-79-16', '09 28 61 89', 'M', NULL, NULL, 'ndrikouadio@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-10', NULL, '2025-10-27 12:16:52.301883', '2025-11-06 15:29:31.680328', NULL, NULL, 6, 42, 29, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-02-10', '2021-02-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1228, NULL, NULL, NULL, 1, 1, NULL, 'N''ZOUE', 'NEE KOFFI AFFOUE RACHEL', '806844Z', '1983-11-12', 'ABIDJAN ADM', NULL, '20324492', '40 21 53 59', 'F', NULL, NULL, 'rachelkof@live.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-01', NULL, '2025-10-27 12:16:52.309373', '2025-11-06 15:29:31.819909', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2043-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2021-02-01', '2021-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1232, NULL, NULL, NULL, 1, 1, NULL, 'TRA', 'LOU WILMA BENEDICTE C.', '368216J', '1979-10-20', 'ABIDJAN ADM', NULL, NULL, '03 31 79 91', 'F', NULL, NULL, 'twilmabenedicte11@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-04-18', NULL, '2025-10-27 12:16:52.329855', '2025-11-06 15:29:32.814873', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-04-18', '2011-06-24', NULL, 159, NULL);
INSERT INTO public.agents VALUES (1233, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'AFOUSSATA LOYAGA', '827828M', '1984-10-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'afoussataloyaga@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-04', NULL, '2025-10-27 12:16:52.33364', '2025-11-06 15:29:32.913467', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-04', '2022-06-02', NULL, 159, NULL);
INSERT INTO public.agents VALUES (1234, NULL, NULL, NULL, 1, 1, NULL, 'MAHDOU', 'BI KODIANE ANDRE', '323834R', '1977-10-22', 'ABIDJAN ADM', NULL, '20337322', NULL, 'M', NULL, NULL, 'andrekodiane@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-13', NULL, '2025-10-27 12:16:52.340424', '2025-11-06 15:29:32.93212', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-13', '2022-01-14', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1235, NULL, NULL, NULL, 1, 1, NULL, 'ASSANDE', 'NEE ASSAMOI M''BOYA E.', '323840B', '1976-04-15', 'ABIDJAN ADM', NULL, '06 15 92 28', '03 16 70 38', 'F', NULL, NULL, 'assandeenegie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:52.3461', '2025-11-06 15:29:32.96969', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2021-12-22', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1237, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'NEE BAMBA AICHATA', '464162V', '1985-11-18', 'ABIDJAN ADM', NULL, NULL, '01 /5 4/ 40', 'F', NULL, NULL, 'bambeu.85@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:52.356471', '2025-11-06 15:29:32.977834', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1238, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'NEE DOUMOUYA AYA NINA-J.', '815504M', '1982-01-01', 'ABIDJAN ADM', NULL, NULL, '05 66 98 50', 'F', NULL, NULL, 'ninayao875@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:52.360512', '2025-11-06 15:29:32.981436', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1239, NULL, NULL, NULL, 2, 1, NULL, 'ATTISSOU', 'NEE GOORE K. D. SARAH', '504955Z', '1987-07-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'goore_sarah@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-01-11', NULL, '2025-10-27 12:16:52.366333', '2025-11-06 15:29:33.094271', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2047-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2012-01-11', '2022-02-07', NULL, 160, NULL);
INSERT INTO public.agents VALUES (1240, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'ALLADJE LUC-HERVE', '492302X', '1989-11-29', 'ABIDJAN ADM', NULL, '49 00 39 78', NULL, 'M', NULL, NULL, 'alladjelucherve@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-06-17', NULL, '2025-10-27 12:16:52.378839', '2025-11-06 15:29:33.144225', NULL, NULL, 5, 37, 70, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 234, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-06-17', '2023-03-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1241, NULL, NULL, NULL, 1, 1, NULL, 'GNABRO', 'RITA JULIE', '855841W', '1983-12-22', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'gnabrorita@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-02', NULL, '2025-10-27 12:16:52.383497', '2025-11-06 15:29:33.147913', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-02', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1242, NULL, NULL, NULL, 1, 1, NULL, 'TOKPA', 'NEE ASSAMOI K. FLORE E.', '858378Y', '1985-07-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'aflorestelle@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-17', NULL, '2025-10-27 12:16:52.390039', '2025-11-06 15:29:33.150516', NULL, NULL, 6, 44, 69, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-17', '2023-03-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1809, 1, NULL, 1, 17, 1, NULL, 'TEST', 'MATRICULE', 'A0001', '2000-10-31', 'SINFRA', 25, '+2250504323542', NULL, 'M', NULL, NULL, 'user86@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-11-06 11:20:58.285139', '2025-11-06 15:29:48.991539', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 223, '2060-12-31', NULL, NULL, NULL, '055212', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1191, NULL, NULL, NULL, 1, 1, NULL, 'GUIRAUD', 'BAUHET CORINNE C.', '304886U', '1974-04-27', 'ABIDJAN ADM', NULL, '07 23 59 97', '02 06 52 91', 'F', NULL, NULL, 'guiraudchantal07@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:52.100448', '2025-11-06 15:29:28.750983', NULL, NULL, 6, 44, 28, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2034-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2023-10-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1202, NULL, NULL, NULL, 1, 1, NULL, 'KAMAGATE', 'MARIAM EPSE COULIBALY', '481434G', '1979-12-26', 'ABIDJAN ADM', NULL, '05 62 79 92', '57 83 46 31', 'F', NULL, NULL, 'm.kamagate@gmail', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:52.16266', '2025-11-06 15:29:30.36912', NULL, NULL, 6, 44, 45, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-06-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1247, NULL, NULL, NULL, 1, 1, NULL, 'EHOUMAN', 'ELLOBLA STEPHANIE', '827817A', '1992-02-10', 'ABIDJAN ADM', NULL, NULL, '01 51 28 09', 'F', NULL, NULL, 'ehoumanstephanie2012@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-05', NULL, '2025-10-27 12:16:52.412585', '2025-11-06 15:29:33.205591', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 234, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-05', '2022-06-02', NULL, 161, NULL);
INSERT INTO public.agents VALUES (1248, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'DJENEBOU', '832911D', '1995-08-13', 'ABIDJAN ADM', NULL, NULL, '05 05 41 59', 'F', NULL, NULL, 'djeeneboutraore13@hotmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-25', NULL, '2025-10-27 12:16:52.416285', '2025-11-06 15:29:33.283202', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-25', '2022-06-14', NULL, 161, NULL);
INSERT INTO public.agents VALUES (1249, NULL, NULL, NULL, 1, 1, NULL, 'ASSOUA', 'EPSE BONY KRAMO A.', '251283H', '1965-04-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kbonyassoua@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1993-06-05', NULL, '2025-10-27 12:16:52.42374', '2025-11-06 15:29:33.415966', NULL, NULL, 5, 38, 62, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2030-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1993-06-05', '2022-02-07', NULL, 162, NULL);
INSERT INTO public.agents VALUES (1250, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'DEMICA LYDIE', '487322M', '1989-02-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kouadiodemica@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-05-18', NULL, '2025-10-27 12:16:52.427801', '2025-11-06 15:29:33.456723', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 234, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-05-18', '2022-06-30', NULL, 162, NULL);
INSERT INTO public.agents VALUES (1268, NULL, NULL, NULL, 1, 1, NULL, 'KOPESSO', 'LAURA CARENNE DIDIERE', '865786Z', '1999-11-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-27', NULL, '2025-10-27 12:16:52.518743', '2025-11-06 15:29:34.065625', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2064-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-04-27', '2023-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1300, NULL, NULL, NULL, 1, 1, NULL, 'BLEY', 'MARIE JOCELINE', '345913W', '1974-12-25', 'ABIDJAN ADM', NULL, '20347244', '02 52 11 23', 'F', NULL, NULL, 'mariane710@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:52.692407', '2025-11-06 15:29:35.552187', NULL, NULL, 5, 37, 25, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2034-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1274, NULL, NULL, NULL, 1, 1, NULL, 'KEITA', 'MANH', '338288M', '1973-08-14', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-03-12', NULL, '2025-10-27 12:16:52.547027', '2025-11-06 15:29:34.231081', NULL, NULL, 8, 47, 33, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2033-12-31', 'CHARGE DU COURRIER', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2008-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1287, NULL, NULL, NULL, 1, 1, NULL, 'FOTTO', 'NEE KOFFI GUIGUIA RITA', '897985A', '1986-04-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'koguiri@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-07-08', NULL, '2025-10-27 12:16:52.627327', '2025-11-06 15:29:34.877517', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2046-12-31', 'COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-08-07', '2024-08-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1288, NULL, NULL, NULL, 1, 1, NULL, 'KRAH', 'NEE DIEKE LEBAN F.', '806868H', '1977-06-08', 'ABIDJAN ADM', NULL, '5957154', '02 03 75 82', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-01', NULL, '2025-10-27 12:16:52.632224', '2025-11-06 15:29:34.914961', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 237, '2037-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2021-02-01', '2021-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1289, NULL, NULL, NULL, 1, 1, NULL, 'SOLLAH', 'SON EMMANUEL', '890209M', '1988-05-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'manouci88@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-22', NULL, '2025-10-27 12:16:52.637954', '2025-11-06 15:29:34.953627', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-22', '2024-06-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1291, NULL, NULL, NULL, 1, 1, NULL, 'BINI', 'KOFFI ROLAND', '442433P', '1985-01-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'binirol@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-02-15', NULL, '2025-10-27 12:16:52.646803', '2025-11-06 15:29:34.966525', NULL, NULL, 5, 38, 74, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2050-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2017-02-15', '2022-02-07', NULL, 165, NULL);
INSERT INTO public.agents VALUES (1292, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'NEE WAH G. CLEMENCE', '320381C', '1984-03-21', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'wgclemence20@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-04-21', NULL, '2025-10-27 12:16:52.650894', '2025-11-06 15:29:35.04316', NULL, NULL, 6, 44, 73, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2009-10-05', NULL, 165, NULL);
INSERT INTO public.agents VALUES (1293, NULL, NULL, NULL, 2, 1, NULL, 'ANJA', 'BOGUI EUDES', '982976M', '1987-07-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'abeudes@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-21', NULL, '2025-10-27 12:16:52.656653', '2025-11-06 15:29:35.077722', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-21', '2023-02-21', NULL, 165, NULL);
INSERT INTO public.agents VALUES (1294, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'NEE SERY RACHEL', '344925Z', '1971-07-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'rachelkouadio2019@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-06-17', NULL, '2025-10-27 12:16:52.660651', '2025-11-06 15:29:35.089767', NULL, NULL, 5, 37, 75, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2031-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2014-02-01', NULL, 166, NULL);
INSERT INTO public.agents VALUES (1295, NULL, NULL, NULL, 1, 1, NULL, 'SETONDJI', 'DESIRE', '473683Z', '1983-09-08', 'ABIDJAN ADM', NULL, '07 27 17 65', '06 89 03 13', 'M', NULL, NULL, 'setdezy@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-06-12', NULL, '2025-10-27 12:16:52.664046', '2025-11-06 15:29:35.189914', NULL, NULL, 5, 37, 76, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2043-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2019-06-12', '2019-06-28', NULL, 166, NULL);
INSERT INTO public.agents VALUES (1297, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'KONAN JULES', '390102C', '1981-07-30', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'juleskonankoffi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-02-25', NULL, '2025-10-27 12:16:52.674733', '2025-11-06 15:29:35.383572', NULL, NULL, 6, 44, 36, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2041-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2013-02-25', NULL, 166, NULL);
INSERT INTO public.agents VALUES (1298, NULL, NULL, NULL, 1, 1, NULL, 'KODE', 'KPETCHI', '379660E', '1977-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-05-27', NULL, '2025-10-27 12:16:52.678657', '2025-11-06 15:29:35.39851', NULL, NULL, 6, 44, 77, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2013-05-27', NULL, 166, NULL);
INSERT INTO public.agents VALUES (1301, NULL, NULL, NULL, 1, 1, NULL, 'BERTE', 'NEE KOFFI KOUASSI V.', '313055V', '1976-11-17', 'ABIDJAN ADM', NULL, '05 77 02 13', NULL, 'F', NULL, NULL, 'koffigisele@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:52.698984', '2025-11-06 15:29:35.620412', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 238, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-03', '2023-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1302, NULL, NULL, NULL, 1, 1, NULL, 'ACHIE', 'CHIA AIMEE APOLLINE', '323848F', '1980-09-12', 'ABIDJAN ADM', NULL, '01 32 07 80', '57 01 01 35', 'F', NULL, NULL, 'achieaime@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:52.708285', '2025-11-06 15:29:35.625456', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 238, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-15', '2023-12-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1303, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AMENAN LUCIENNE', '480710B', '1992-10-02', 'ABIDJAN ADM', NULL, '49 09 69 86', NULL, 'F', NULL, NULL, 'luciennekouadio9@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:52.713152', '2025-11-06 15:29:35.632275', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2022-09-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1305, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'NANHDJINMIN PRISCA', '815486B', '1995-06-21', 'ABIDJAN ADM', NULL, '07 47 72 69', '01 02 36 34', 'F', NULL, NULL, 'priscaouattara5@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:52.72855', '2025-11-06 15:29:35.819641', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2023-05-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1307, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'MINATA', '815460U', '1985-11-23', 'ABIDJAN ADM', NULL, '07 68 01 01', '05 05 15 22', 'F', NULL, NULL, 'minatakone1985@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:52.742448', '2025-11-06 15:29:35.828743', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2022-08-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1310, NULL, NULL, NULL, 1, 1, NULL, 'BAIKORO', 'TIEMOKO', '469466B', '1979-05-11', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'tiemokobaikoro403@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-05', NULL, '2025-10-27 12:16:52.765258', '2025-11-06 15:29:36.054944', NULL, NULL, 6, 44, 45, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-10-14', '2022-09-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1312, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'TATIANA E. EPSE AMANI', '826002L', '1981-01-12', 'ABIDJAN ADM', NULL, '07 07 46 24', '05 64 00 01', 'F', NULL, NULL, 'TATIKOUADIO912@GMAIL.COM', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-07', NULL, '2025-10-27 12:16:52.78106', '2025-11-06 15:29:36.059155', NULL, NULL, 6, 42, 30, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2041-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-03-07', '2023-10-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1313, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'ARNAUD JOEL', '421314J', '1984-10-21', 'ABIDJAN ADM', NULL, '58 27 75 24', '05 12 56 48', 'M', NULL, NULL, 'karnaudjoel2110@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-01-15', NULL, '2025-10-27 12:16:52.793912', '2025-11-06 15:29:36.060858', NULL, NULL, 9, 45, 42, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 238, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-01-15', '2025-02-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1314, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'AFFOUE ALIDA DIANE', '468225G', '1983-03-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'alidadianeyapi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-25', NULL, '2025-10-27 12:16:52.803564', '2025-11-06 15:29:36.062594', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-25', '2022-08-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1315, NULL, NULL, NULL, 1, 1, NULL, 'TRA', 'LOU YA ELIANE MODESTINE', '468562A', '1985-02-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'elianemodestine1@mail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-21', NULL, '2025-10-27 12:16:52.810814', '2025-11-06 15:29:36.068417', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-21', '2022-11-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1316, NULL, NULL, NULL, 1, 1, NULL, 'KANGAH', 'AZANE STEPHANE', '802422N', '1984-03-09', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'anzanekeshi34@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-07-20', NULL, '2025-10-27 12:16:52.822924', '2025-11-06 15:29:36.071645', NULL, NULL, 8, 47, 33, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2025-01-07', '2025-01-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1341, NULL, NULL, NULL, 1, 1, NULL, 'SOUMAHORO', 'AWA LAETITIA', '852286X', '1999-04-30', 'DABOU PREF', NULL, '48 60 17 65', NULL, 'F', NULL, NULL, 'laetitiasoumahoro6@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:53.065743', '2025-11-06 15:29:36.645076', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2064-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1342, NULL, NULL, NULL, 1, 1, NULL, 'DJADOU', 'NEE AMALAMAN G. AGNES', '434616N', '1977-01-01', 'DABOU PREF', NULL, '58 91 41 20', NULL, 'F', NULL, NULL, 'amalagenuier@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-12-21', NULL, '2025-10-27 12:16:53.074912', '2025-11-06 15:29:36.648411', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-12-21', '2017-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1810, 1, NULL, 1, 2, 1, NULL, 'ELISEE', 'MATRICULE', 'B0002', '2003-10-29', 'ISSIA', 22, '+2250504323542', NULL, 'M', NULL, NULL, 'zaplazia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-11-06 11:22:59.30388', '2025-11-06 15:29:49.034298', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 223, '2063-12-31', NULL, NULL, NULL, '254152', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1246, NULL, NULL, NULL, 1, 1, NULL, 'THIO', 'AYA', '359188N', '1979-07-24', 'ABIDJAN ADM', NULL, '20347420', '01 43 51 23', 'F', NULL, NULL, 'thioqristine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:52.408403', '2025-11-06 15:29:33.19978', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 234, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2022-09-20', NULL, 161, NULL);
INSERT INTO public.agents VALUES (1349, NULL, NULL, NULL, 1, 1, NULL, 'BOIZO', 'BAI FERNAND', '470972B', '1979-12-22', 'DABOU PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'boizoferdinand@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-15', NULL, '2025-10-27 12:16:53.120659', '2025-11-06 15:29:36.664108', NULL, NULL, 6, 42, 29, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-04-15', '2019-04-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1352, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'AMY', '481445K', '1986-09-11', 'DABOU PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:53.142333', '2025-11-06 15:29:36.733825', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 240, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2025-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1358, NULL, NULL, NULL, 1, 1, NULL, 'BABO', 'NEE MONY TAHONON W. NADIA', '323831N', '1978-09-18', 'ABIDJAN ADM', NULL, '05 07 60 04', '05 07 60 04', 'F', NULL, NULL, 'nadiamony@yahoo.f', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:53.17986', '2025-11-06 15:29:36.845715', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2020-10-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1361, NULL, NULL, NULL, 1, 1, NULL, 'DJAHI', 'LOHORE MARTIN', '323846V', '1980-12-07', 'ABIDJAN ADM', NULL, '20-34-74-31', '04 80 98 47', 'M', NULL, NULL, 'maitredjahi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-11', NULL, '2025-10-27 12:16:53.199311', '2025-11-06 15:29:36.98995', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 241, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-11', '2014-05-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1368, NULL, NULL, NULL, 1, 1, NULL, 'KACOU', 'NEE KOUAKOU BLEDJA E.C.', '855843Y', '1990-03-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.244909', '2025-11-06 15:29:37.269193', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2024-06-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1387, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'SEKOUNA', '855882Q', '1993-08-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'sekounasylla47@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-31', NULL, '2025-10-27 12:16:53.383537', '2025-11-06 15:29:37.844334', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-31', '2025-03-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1388, NULL, NULL, NULL, 1, 1, NULL, 'TOKORE', 'NEE ASSOKO CHIADON B.D.', '855886L', '1983-11-13', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-31', NULL, '2025-10-27 12:16:53.392172', '2025-11-06 15:29:37.966405', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-31', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1389, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'NEE AYEKOUE GAELLE LARISSA', '855889X', '1985-02-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-11', NULL, '2025-10-27 12:16:53.398047', '2025-11-06 15:29:38.012328', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-11', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1391, NULL, NULL, NULL, 1, 1, NULL, 'MABIO', 'ANGELE VICTOIRE', '875678N', '1992-01-28', 'ABIDJAN ADM', NULL, '08 43 24 70', '75 25 51 92', 'F', NULL, NULL, 'mabioangele82@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-12-05', NULL, '2025-10-27 12:16:53.412533', '2025-11-06 15:29:38.03266', NULL, NULL, 6, 44, 28, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-05-12', '2023-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1392, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'N''DRI ERIC', '855857W', '1981-10-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'kneric07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-03', NULL, '2025-10-27 12:16:53.419306', '2025-11-06 15:29:38.110676', NULL, NULL, 6, 42, 31, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-03', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1396, NULL, NULL, NULL, 1, 1, NULL, 'DJOKE', 'NEE N''ZUE LILIANE', '272128A', '1974-05-17', 'GRAND-BASSAM PREF', NULL, '30624981/4983', '49 07 40 69', 'F', NULL, NULL, 'lilianenzue@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:53.448428', '2025-11-06 15:29:38.374187', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 243, '2039-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1398, NULL, NULL, NULL, 1, 1, NULL, 'FEGBO', 'NEE DASSE GRACE LAURENNE', '815446J', '1997-12-20', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'laurennedasse@mail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:53.460711', '2025-11-06 15:29:38.551019', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 243, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1400, NULL, NULL, NULL, 1, 1, NULL, 'GUE', 'NEE VE FLIN VALERIE', '323838V', '1978-04-09', 'GRAND-BASSAM PREF', NULL, '03 18 37 13', '45 41 57 17', 'F', NULL, NULL, 'VALERIEGUELOUA@GMAIL.COM', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-14', NULL, '2025-10-27 12:16:53.475223', '2025-11-06 15:29:38.702571', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-02-14', '2007-02-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1401, NULL, NULL, NULL, 1, 1, NULL, 'MILAN', 'NEE EBA LEONCE H', '323857Y', '1978-12-12', 'GRAND-BASSAM PREF', NULL, '20-34-79-17', '21 25 12 34', 'F', NULL, NULL, 'leonceeba@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:53.480972', '2025-11-06 15:29:38.740275', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2018-11-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1413, NULL, NULL, NULL, 1, 1, NULL, 'GUEDE', 'MARIE-NOELLE CLAUDIA', '855842X', '1987-06-21', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'marie-noelle73@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.56031', '2025-11-06 15:29:39.010161', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 243, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1422, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'AHOU ROSINE', '815455K', '1989-02-25', 'ADZOPE PREF', NULL, '09 87 89 57', NULL, 'F', NULL, NULL, 'ahourosinekonan3@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:53.630333', '2025-11-06 15:29:39.043521', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1423, NULL, NULL, NULL, 1, 1, NULL, 'NADJE', 'GUEDE VILASCO', '815664U', '1983-08-25', 'ADZOPE PREF', NULL, '78 08 96 13', '07 78 08 96', 'M', NULL, NULL, 'delvila3gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-30', NULL, '2025-10-27 12:16:53.635334', '2025-11-06 15:29:39.077212', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-30', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1426, NULL, NULL, NULL, 1, 1, NULL, 'YOBOUA', 'KOSSIA STEPHANIE', '832919M', '1995-01-05', 'ADZOPE PREF', NULL, '49 47 81 96', '01 43 12 43', 'F', NULL, NULL, 'stephanieyoboua2@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:53.649292', '2025-11-06 15:29:39.084601', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1427, NULL, NULL, NULL, 1, 1, NULL, 'DANHO', 'MOYA HELENE FELICITE', '855833N', '1990-09-26', 'ADZOPE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'felimoya41@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:53.656343', '2025-11-06 15:29:39.086541', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 244, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2025-03-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1428, NULL, NULL, NULL, 1, 1, NULL, 'DIABY', 'MORIFERE', '889097K', '1998-08-18', 'ADZOPE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'dmorifere60@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-13', NULL, '2025-10-27 12:16:53.661035', '2025-11-06 15:29:39.121733', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-13', '2024-05-29', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1429, NULL, NULL, NULL, 1, 1, NULL, 'GNABOUA', 'ERIC', '874642H', '1994-08-16', 'ADZOPE PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-10-25', NULL, '2025-10-27 12:16:53.664774', '2025-11-06 15:29:39.158794', NULL, NULL, 6, 42, 29, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2054-12-31', 'SECRETAIRE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2023-10-25', '2023-11-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1430, NULL, NULL, NULL, 1, 1, NULL, 'DIABATE', 'SOMAN', '498943X', '1981-01-01', 'ADZOPE PREF', NULL, '07 74 24 99', '46 57 50 22', 'M', NULL, NULL, 'diabatesoman@yahou.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-09-08', NULL, '2025-10-27 12:16:53.67102', '2025-11-06 15:29:39.17057', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2041-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2020-09-08', '2020-09-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1431, NULL, NULL, NULL, 1, 1, NULL, 'AKRE', 'DJAMA DORGELES FRANKLIN', '481384N', '1990-05-19', 'ADZOPE PREF', NULL, '58 53 11 29', '72 25 87 43', 'M', NULL, NULL, 'akredjama@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:53.676158', '2025-11-06 15:29:39.182565', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 244, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2022-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1434, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'KOUAKOU N''GORAN SAMSON', '435225P', '1982-07-28', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'kouakousamson84@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-16', NULL, '2025-10-27 12:16:53.691896', '2025-11-06 15:29:39.268025', NULL, NULL, 5, 38, 38, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-09-07', '2022-06-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1437, NULL, NULL, NULL, 1, 1, NULL, 'DJAHOURI', 'GOURE JUSTIN', '418988U', '1983-12-31', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'djagojustin@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-29', NULL, '2025-10-27 12:16:53.708298', '2025-11-06 15:29:39.30569', NULL, NULL, 5, 37, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-10-29', '2015-11-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1438, NULL, NULL, NULL, 1, 1, NULL, 'AGNIMEL', 'HENRI-MICHEL DURAND', '475706A', '1982-08-09', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'durandagnimel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-07-29', NULL, '2025-10-27 12:16:53.712361', '2025-11-06 15:29:39.320903', NULL, NULL, 5, 37, 26, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-07-29', '2019-08-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1439, NULL, NULL, NULL, 1, 1, NULL, 'TEHOUA', 'KOUAKOU MICHEL', '855884J', '1981-03-07', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'micheltehouakouakou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-12', NULL, '2025-10-27 12:16:53.716459', '2025-11-06 15:29:39.322811', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-12', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1440, NULL, NULL, NULL, 1, 1, NULL, 'TIA', 'DIMEY HERVEE', '447589Z', '1992-06-17', 'AGBOVILLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'herveetia@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:53.723387', '2025-11-06 15:29:39.326626', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-01-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1441, NULL, NULL, NULL, 1, 1, NULL, 'ADOU', 'ROLAND RODRIGUE-JUDICAEL', '480503Z', '1986-09-15', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'rolandrjadou91gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.727717', '2025-11-06 15:29:39.363397', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 245, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1445, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'IBRAHIM', '898664G', '1990-03-11', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'ibrahimdiarrassouba2016@gmail.', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-07-16', NULL, '2025-10-27 12:16:53.750248', '2025-11-06 15:29:39.543964', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-01-24', '2024-08-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (7, 2, 2, 1, 2, 2, 6, 'OUATTARA', 'Aminata', 'EDU003', '1988-09-08', 'Yamoussoukro', 36, '+225 07 67 89 01', '+225 05 67 89 01', 'F', 'OUATTARA Kadi', 'OUATTARA Ali', 'aminata.ouattara@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-09-08', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:03.480896', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2048-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1354, NULL, NULL, NULL, 1, 1, NULL, 'ASSUE', 'BEATRICE', '265962F', '1970-07-04', 'ABIDJAN ADM', NULL, '20324492', '02 68 04 34', 'F', NULL, NULL, 'assuebla@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1998-04-14', NULL, '2025-10-27 12:16:53.155589', '2025-11-06 15:29:36.837196', NULL, NULL, 5, 39, 78, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2035-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2022-07-07', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1479, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'NEE ODAH AHOU BEATRICE', '480586L', '1978-03-09', 'BOUAKE PREF', NULL, '47 67 81 83', NULL, 'F', NULL, NULL, 'odahbeat@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.933069', '2025-11-06 15:29:39.98896', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2022-07-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1456, NULL, NULL, NULL, 1, 1, NULL, 'KONATE', 'ASSETOU', '855850B', '1997-03-04', 'ABENGOUROU PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'aichakonate@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-23', NULL, '2025-10-27 12:16:53.811936', '2025-11-06 15:29:39.732116', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-23', '2023-07-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1457, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'YEGUETIONRY MARIAM', '858955B', '1985-10-08', 'ABENGOUROU PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'mariamcoulibaly629@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-03-02', NULL, '2025-10-27 12:16:53.816666', '2025-11-06 15:29:39.734123', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-03-02', '2023-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1454, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'AKISSI SIMONE', '480587M', '1982-03-29', 'ABENGOUROU PREF', NULL, '07 86 55 98', '01 17 36 79', 'F', NULL, NULL, 'simonekouame15@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.800232', '2025-11-06 15:29:39.72465', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1455, NULL, NULL, NULL, 1, 1, NULL, 'KANE', 'KADHY ANICETTE', '810584L', '1995-02-11', 'ABENGOUROU PREF', NULL, '08 21 96 94', '07 89 50 97', 'F', NULL, NULL, 'kadhyanicette@mail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-06', NULL, '2025-10-27 12:16:53.806763', '2025-11-06 15:29:39.729504', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 246, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-06', '2021-04-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1459, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'KOUAKOU ARISTIDE', '470988C', '1978-08-31', 'ABENGOUROU PREF', NULL, '07 18 88 37', NULL, 'M', NULL, NULL, 'kouakouaristide1978@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-15', NULL, '2025-10-27 12:16:53.827169', '2025-11-06 15:29:39.73808', NULL, NULL, 6, 44, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-04-15', '2019-05-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1460, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'ELLOH A. MARCELLIN', '481623M', '1983-05-05', 'ABENGOUROU PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:53.83171', '2025-11-06 15:29:39.740928', NULL, NULL, 8, 47, 32, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2024-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1461, NULL, NULL, NULL, 1, 1, NULL, 'GUEI', 'AUBIN', '304896W', '1976-03-05', 'DAOUKRO PREF', NULL, '57 31 79 32', '03 07 98 68', 'M', NULL, NULL, 'gueiaubin01@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-03', NULL, '2025-10-27 12:16:53.839133', '2025-11-06 15:29:39.827453', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2041-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2004-12-03', '2022-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1462, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KOUAKOU BERTRAND', '480601B', '1991-11-20', 'DAOUKRO PREF', NULL, '47 06 62 58', NULL, 'M', NULL, NULL, 'assamoabertrand@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.843578', '2025-11-06 15:29:39.882074', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1463, NULL, NULL, NULL, 1, 1, NULL, 'YEBE', 'WASSIA CHRISTELLE C.', '855469H', '1997-12-31', 'DAOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'yebwassia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-04', NULL, '2025-10-27 12:16:53.847338', '2025-11-06 15:29:39.92851', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-04', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1464, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'AKISSI MELANIE', '855858F', '1981-10-01', 'DAOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'melaniekouakou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:53.853632', '2025-11-06 15:29:39.9308', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1465, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'SIE', '350234N', '1983-10-23', 'DAOUKRO PREF', NULL, '35917121', '49 08 60 60', 'M', NULL, NULL, 'coulgniminsie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-04-24', NULL, '2025-10-27 12:16:53.858578', '2025-11-06 15:29:39.932479', NULL, NULL, 6, 44, 36, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2043-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2012-04-24', '2023-02-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1466, NULL, NULL, NULL, 1, 1, NULL, 'KOKORA', 'ANTOINE PAUL ANNE', '469479Q', '1983-06-12', 'DAOUKRO PREF', NULL, '07 29 73 00', '07 -1 9- 73', 'M', NULL, NULL, 'kokoraantoine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-13', NULL, '2025-10-27 12:16:53.862927', '2025-11-06 15:29:39.933955', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-03-13', '2019-03-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1467, NULL, NULL, NULL, 1, 1, NULL, 'ASSOUMAN', 'KOUADIO N''GUETTIA', '481392N', '1979-01-02', 'DAOUKRO PREF', NULL, '6489486', '03 84 43 46', 'M', NULL, NULL, 'kouadionguettiaa@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:53.867651', '2025-11-06 15:29:39.935628', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1469, NULL, NULL, NULL, 2, 1, NULL, 'SOYA', 'ENSIANI TATIANA', '982947Q', '1996-06-02', 'DAOUKRO PREF', NULL, NULL, '75 67 63 89', 'F', NULL, NULL, 'soyatatiana@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-01-04', NULL, '2025-10-27 12:16:53.879761', '2025-11-06 15:29:39.939037', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2056-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2021-01-04', '2025-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1470, NULL, NULL, NULL, 1, 1, NULL, 'KOBENAN', 'KOFFI SIRIKI', '158733E', '1962-01-02', 'BOUAKE PREF', NULL, '01 86 88 88', '01 01 86 88', 'M', NULL, NULL, 'kobenansriki@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1986-10-03', NULL, '2025-10-27 12:16:53.884595', '2025-11-06 15:29:39.940531', NULL, NULL, 5, 39, 22, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2027-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2022-07-07', '2022-03-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1475, NULL, NULL, NULL, 1, 1, NULL, 'ZEZE', 'ZIBLIHON EMMA B', '323837L', '1978-09-14', 'BOUAKE PREF', NULL, '09 57 84 08', '46 84 55 15', 'F', NULL, NULL, 'emmazeze78@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-14', NULL, '2025-10-27 12:16:53.911635', '2025-11-06 15:29:39.979171', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2038-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2007-02-15', '2009-06-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1477, NULL, NULL, NULL, 1, 1, NULL, 'KPANGBA', 'N''GUESSAN CELESTIN', '323849G', '1971-09-11', 'BOUAKE PREF', NULL, '31-63-78-65', NULL, 'M', NULL, NULL, 'kpangbacelestin@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-07', NULL, '2025-10-27 12:16:53.923969', '2025-11-06 15:29:39.98351', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 248, '2031-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2006-12-07', '2006-12-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1478, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'ADJUA LILIANE-RENEE', '464171W', '1987-03-17', 'BOUAKE PREF', NULL, '758263339', '03 /0 7/ 61', 'F', NULL, NULL, 'kliliane.lk@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.928665', '2025-11-06 15:29:39.986198', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 248, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2022-06-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1480, NULL, NULL, NULL, 1, 1, NULL, 'KARAMOKO', 'MADOUSSOU', '480692W', '1987-01-09', 'BOUAKE PREF', NULL, '07 65 23 64', '42 82 07 76', 'F', NULL, NULL, 'madoussoukaramoko40@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:53.940298', '2025-11-06 15:29:39.991972', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2024-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1481, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KOUADIO STEPHANE-R.', '480743G', '1991-05-07', 'BOUAKE PREF', NULL, '747298843', '02 58 11 12', 'M', NULL, NULL, 'stephanekouadio43@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.946392', '2025-11-06 15:29:39.994658', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2022-02-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1482, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'YAO JOEL', '827945J', '1988-11-18', 'BOUAKE PREF', NULL, '59 90 07 43', '05 04 88 91', 'M', NULL, NULL, 'jojochampion40@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-06', NULL, '2025-10-27 12:16:53.953494', '2025-11-06 15:29:39.997301', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-06', '2022-06-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1483, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'AKAZA JUSTIN', '830050F', '1990-07-25', 'BOUAKE PREF', NULL, '49 88 04 07', NULL, 'M', NULL, NULL, 'akazaelcoche@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-12', NULL, '2025-10-27 12:16:53.958701', '2025-11-06 15:29:39.999685', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-12', '2022-06-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1485, NULL, NULL, NULL, 1, 1, NULL, 'BALO', 'GLAHI MARCELLE CLAUDIA', '834086G', '1989-02-07', 'BOUAKE PREF', NULL, '07 02 19 85', '01 41 09 76', 'F', NULL, NULL, 'marcellebalo@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-09', NULL, '2025-10-27 12:16:53.970806', '2025-11-06 15:29:40.004532', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-09', '2022-06-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1486, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KAKOU BRA LEA', '834133B', '1981-03-22', 'BOUAKE PREF', NULL, '07 17 65 97', NULL, 'F', NULL, NULL, 'bralea@hotemail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:53.999402', '2025-11-06 15:29:40.018348', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-06-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1487, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'MOUSSOKOURA GNOH LILIANE', '855853S', '1985-05-29', 'BOUAKE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'koura85@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:54.00786', '2025-11-06 15:29:40.021292', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1491, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'WONGO S. C. VICTOIRE', '481455M', '1991-02-03', 'BOUAKE PREF', NULL, '77 16 66 44', NULL, 'F', NULL, NULL, 'wongogeniale@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.035044', '2025-11-06 15:29:40.029292', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1492, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'ROKIA', '901902T', '1992-01-01', 'BOUAKE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'outtaramireillessy77@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-09-19', NULL, '2025-10-27 12:16:54.042502', '2025-11-06 15:29:40.031883', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2052-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (6, 1, 1, 1, 2, 2, 5, 'SANGARE', 'Ibrahim', 'EDU002', '1975-05-12', 'San-PÃ©dro', 49, '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'SANGARE AÃ¯cha', 'SANGARE Oumar', 'ibrahim.sangare@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-05-12', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:03.475188', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2035-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1499, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AHOU MARIE CHANTAL', '467420X', '1980-09-11', 'KATIOLA PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'c.kouadio@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-07', NULL, '2025-10-27 12:16:54.086743', '2025-11-06 15:29:40.262547', NULL, NULL, 6, 44, 48, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 249, '2040-12-31', 'INFORMATICIEN', NULL, NULL, NULL, NULL, NULL, '2019-02-07', '2024-05-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1493, NULL, NULL, NULL, 1, 1, NULL, 'AGOH', 'KOUAKOU AVIT', '349302W', '1971-06-17', 'BOUAKE PREF', NULL, '07 87 60 84', NULL, 'M', NULL, NULL, 'kouakouavit@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-05-13', NULL, '2025-10-27 12:16:54.047836', '2025-11-06 15:29:40.034716', NULL, NULL, 9, 46, 58, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2031-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2020-09-07', '2021-06-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1494, NULL, NULL, NULL, 1, 1, NULL, 'BEDA', 'JEAN-JACQUES', '315994J', '1978-08-01', 'BOUAKE PREF', NULL, '20347987', '06 12 06 18', 'M', NULL, NULL, 'merlaincotedivoire@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-02-08', NULL, '2025-10-27 12:16:54.060026', '2025-11-06 15:29:40.037125', NULL, NULL, 9, 45, 42, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-02-08', '2017-11-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1495, NULL, NULL, NULL, 1, 1, NULL, 'KABA', 'ALPHA KABNIN', '297630F', '1974-12-17', 'KATIOLA PREF', NULL, '05 68 17 17', '01 03 70 81', 'M', NULL, NULL, 'kabis05@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-06', NULL, '2025-10-27 12:16:54.066512', '2025-11-06 15:29:40.121797', NULL, NULL, 5, 38, 23, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 249, '2039-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2003-10-06', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1498, NULL, NULL, NULL, 1, 1, NULL, 'DAHO', 'BALAGAZANE', '433357Z', '1978-09-08', 'KATIOLA PREF', NULL, '48 54 05 59', '48 54 05 59', 'M', NULL, NULL, 'dohobalazane@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-14', NULL, '2025-10-27 12:16:54.081439', '2025-11-06 15:29:40.156421', NULL, NULL, 5, 37, 25, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-14', '2020-08-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1500, NULL, NULL, NULL, 1, 1, NULL, 'DAHORA', 'SERGE JOSUE', '855831L', '1992-11-22', 'KATIOLA PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'serjedahora@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-11', NULL, '2025-10-27 12:16:54.09171', '2025-11-06 15:29:40.393861', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-11', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1502, NULL, NULL, NULL, 1, 1, NULL, 'DIEUHOUAN', 'NEE KANOUAN K. E.N.', '816080L', '1989-12-27', 'KATIOLA PREF', NULL, '67 53 20 96', NULL, 'F', NULL, NULL, 'kanouanemilie77@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-07-07', NULL, '2025-10-27 12:16:54.099339', '2025-11-06 15:29:40.407571', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-07-07', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1503, NULL, NULL, NULL, 1, 1, NULL, 'KABA', 'NEE KAMARATE ASSETOU', '810032M', '1975-12-12', 'KATIOLA PREF', NULL, '09 41 07 61', '05 05 82 54', 'F', NULL, NULL, 'assefantis@mail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-09', NULL, '2025-10-27 12:16:54.105556', '2025-11-06 15:29:40.415863', NULL, NULL, 6, 44, 41, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 249, '2035-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2018-01-09', '2022-09-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1512, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'KOUASSI ACHILLE', '481961Q', '1986-05-12', 'BONDOUKOU PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'achille2040@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-28', NULL, '2025-10-27 12:16:54.158384', '2025-11-06 15:29:40.535971', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-28', '2020-02-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1504, NULL, NULL, NULL, 1, 1, NULL, 'N''DRI', 'KOUASSI CHARLES', '874661C', '1991-12-21', 'KATIOLA PREF', NULL, '87 77 92 77', NULL, 'M', NULL, NULL, 'ndrikouassicharles@gmail', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-10-30', NULL, '2025-10-27 12:16:54.109955', '2025-11-06 15:29:40.42511', NULL, NULL, 6, 42, 29, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2051-12-31', 'SECRETAIRE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2023-10-30', '2023-11-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1505, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'ABDOULAYE', '874803U', '1984-05-13', 'KATIOLA PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'blokolepit@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-21', NULL, '2025-10-27 12:16:54.11393', '2025-11-06 15:29:40.428277', NULL, NULL, 6, 42, 29, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 249, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-11-21', '2025-03-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1506, NULL, NULL, NULL, 1, 1, NULL, 'KOUA', 'KINIMO ROMUALD', '482932C', '1985-12-08', 'KATIOLA PREF', NULL, '58 68 38 55', '02 -1 9- 21', 'M', NULL, NULL, 'koua.kromuald@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-18', NULL, '2025-10-27 12:16:54.11791', '2025-11-06 15:29:40.430637', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 249, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-18', '2024-05-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1507, NULL, NULL, NULL, 2, 1, NULL, 'DIGBEU', 'BOLOU VICTORIEN', '982980N', '1976-03-23', 'KATIOLA PREF', NULL, '08 35 32 85', '70 08 83 05', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-01', NULL, '2025-10-27 12:16:54.124223', '2025-11-06 15:29:40.432555', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2036-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2023-01-01', '2023-01-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1508, NULL, NULL, NULL, 1, 1, NULL, 'SARAKA', 'JULES-DAMAS', '291176W', '1976-09-01', 'BONDOUKOU PREF', NULL, '31632957', '01 79 83 44', 'M', NULL, NULL, 'julesdamassaraka@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-24', NULL, '2025-10-27 12:16:54.13085', '2025-11-06 15:29:40.434538', NULL, NULL, 5, 38, 23, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2041-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2002-10-24', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1509, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'BENEDICTE EBAH', '815478S', '1996-06-28', 'BONDOUKOU PREF', NULL, '07 48 68 63', NULL, 'F', NULL, NULL, 'nguessanbenedicte853@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.140049', '2025-11-06 15:29:40.436754', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1510, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'MAMADOU', '888935N', '1985-11-04', 'BONDOUKOU PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'chemoba1985@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-14', NULL, '2025-10-27 12:16:54.146206', '2025-11-06 15:29:40.508366', NULL, NULL, 5, 37, 39, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-14', '2024-09-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1511, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'N''DRI DRAILLIT MARINA', '480624Z', '1986-07-15', 'BONDOUKOU PREF', NULL, '08 58 10 20', NULL, 'F', NULL, NULL, 'koffi-draillit@live.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-26', NULL, '2025-10-27 12:16:54.152851', '2025-11-06 15:29:40.533731', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-26', '2020-02-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1513, NULL, NULL, NULL, 1, 1, NULL, 'MOUROUFIE', 'KOUAME ISAAC', '815475P', '1998-04-03', 'BONDOUKOU PREF', NULL, '07 57 32 17', NULL, 'M', NULL, NULL, 'isaacmouroufie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:54.162009', '2025-11-06 15:29:40.537866', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1514, NULL, NULL, NULL, 1, 1, NULL, 'YADOM', 'YAO EPHRAIME CEDRIC', '815501J', '1995-06-16', 'BONDOUKOU PREF', NULL, NULL, '07 09 16 31', 'M', NULL, NULL, 'yadom01@outlook.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:54.165518', '2025-11-06 15:29:40.543448', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1515, NULL, NULL, NULL, 1, 1, NULL, 'DIABAGATE', 'SALAMATA', '855835Q', '1991-01-13', 'BONDOUGOU-P', NULL, NULL, NULL, 'F', NULL, NULL, 'salamatad35@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-23', NULL, '2025-10-27 12:16:54.170476', '2025-11-06 15:29:40.546715', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 250, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-23', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1516, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'MARIAM', '481494D', '1991-09-24', 'BONDOUKOU PREF', NULL, '49 34 75 09', '53 95 00 21', 'F', NULL, NULL, 'mariamsylla585@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.17527', '2025-11-06 15:29:40.564306', NULL, NULL, 6, 44, 45, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 249, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 250, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1517, NULL, NULL, NULL, 1, 1, NULL, 'TOUKOUBE', 'JANVIER DEDY', '297585P', '1971-01-01', 'BOUNA PREF', NULL, '20-34-79-16', '09 77 24 54', 'M', NULL, NULL, 'dedyjanvier@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:54.179028', '2025-11-06 15:29:40.57285', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 251, '2036-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2003-10-01', '2022-07-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1518, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'GNINFIGUE', '852197N', '1986-11-05', 'BOUNA PREF', NULL, '60 65 08 26', NULL, 'M', NULL, NULL, 'gninfiguecoul@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:54.182597', '2025-11-06 15:29:40.575778', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 251, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1519, NULL, NULL, NULL, 1, 1, NULL, 'ADIANE', 'ABLAN ELISABETH', '481893D', '1980-04-04', 'BOUNA PREF', NULL, '48 44 57 75', NULL, 'F', NULL, NULL, 'adianeablan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-05', NULL, '2025-10-27 12:16:54.188156', '2025-11-06 15:29:40.578337', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 251, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-05', '2020-03-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1521, NULL, NULL, NULL, 1, 1, NULL, 'KOUKOU', 'AZONOUH N. GERALDINE', '885472K', '1993-10-03', 'BOUNA PREF', NULL, '77 54 44 51', NULL, 'F', NULL, NULL, 'koukou.geraldine19@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-13', NULL, '2025-10-27 12:16:54.19602', '2025-11-06 15:29:40.616024', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 251, '2053-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-05-13', '2024-04-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1522, NULL, NULL, NULL, 1, 1, NULL, 'AMON', 'AKOUA JEREMIE', '483687Q', '1989-08-04', 'BOUNA PREF', NULL, '05 45 76 59', '45 76 59 99', 'M', NULL, NULL, 'amonkouajermie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-04-01', NULL, '2025-10-27 12:16:54.199424', '2025-11-06 15:29:40.654836', NULL, NULL, 9, 45, 42, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 251, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-04-01', '2020-04-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1523, NULL, NULL, NULL, 1, 1, NULL, 'SOLO', 'SARKOH INNOCENT', '313773H', '1971-08-24', 'BOUNA PREF', NULL, '20324492', '75 67 63 89', 'M', NULL, NULL, 'solosarkoht@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-01-25', NULL, '2025-10-27 12:16:54.20549', '2025-11-06 15:29:40.658352', NULL, NULL, 8, 47, 32, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 251, '2031-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2006-01-25', '2017-08-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1524, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'SOULEYMANE', '272135Z', '1972-09-25', 'DALOA PREF', NULL, '32740743/0747', '09 95 52 23', 'M', NULL, NULL, 'cit.coulsoul@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:54.209993', '2025-11-06 15:29:40.700803', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 252, '2037-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1529, NULL, NULL, NULL, 1, 1, NULL, 'GLAZAI', 'GNONSIEKPLIN DAMIEN B.', '481925C', '1995-02-22', 'DALOA PREF', NULL, '58 13 11 39', NULL, 'M', NULL, NULL, 'borisglazai@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-26', NULL, '2025-10-27 12:16:54.231506', '2025-11-06 15:29:40.81542', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 252, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-26', '2020-02-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (45, 1, NULL, 1, 2, 1, 1, 'KOUAME', 'JEAN-BAPTISTE', 'DRH001', '1980-05-15', 'ABIDJAN, CÔTE D''IVOIRE', 45, '+225 20 30 40 51', NULL, 'M', NULL, NULL, 'jeanbaptiste.kouame@rh.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, 'COCODY, ABIDJAN', 'CÔTE D''IVOIRE', NULL, 'actif', '2020-01-15', NULL, '2025-09-13 16:03:05.880683', '2025-11-06 15:29:07.598331', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (55, 1, 1, NULL, 2, 1, NULL, 'DRH', 'Éducation', 'DRH-EDU-001', '1980-01-01', 'Abidjan', 45, '+225 07 00 00 01', NULL, NULL, NULL, NULL, 'drh.education@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-01', NULL, '2025-09-23 00:54:46.625395', '2025-11-06 15:29:07.759477', 1, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (148, 1, 1, 1, 1, 2, NULL, 'KIM', 'HAMED', '524124J', '2025-10-08', 'BONOUA', 0, '+22505655542', '+2250565754554', 'M', 'MARIE', 'JACQUE', 'hamed@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-10-08', NULL, '2025-10-16 00:51:04.541132', '2025-11-06 15:29:09.737569', NULL, 1, 5, 37, NULL, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, 15, NULL, NULL, NULL, NULL, NULL, '2085-12-31', NULL, NULL, 'Exempté', NULL, NULL, NULL, '2023-10-20', NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1532, NULL, NULL, NULL, 1, 1, NULL, 'KOMENAN', 'KOUAKOU SOUIMBOU', '418948B', '1976-05-05', 'DALOA PREF', NULL, '56 56 97 01', NULL, 'M', NULL, NULL, 'komenank.souimbou@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-19', NULL, '2025-10-27 12:16:54.244231', '2025-11-06 15:29:40.968469', NULL, NULL, 6, 44, 36, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-10-19', '2015-10-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1535, NULL, NULL, NULL, 1, 1, NULL, 'GBEDJE', 'KOUTOUAN GISELE', '468090H', '1983-08-20', 'DALOA PREF', NULL, '08 76 55 81', '65 53 13 99', 'F', NULL, NULL, 'gbedjegisele@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-22', NULL, '2025-10-27 12:16:54.257673', '2025-11-06 15:29:40.974949', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-22', '2019-03-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1537, NULL, NULL, NULL, 1, 1, NULL, 'SOUMAHORO', 'RAMATOU', '482004N', '1996-12-14', 'DALOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'soumahororamatousr.1996@gmail,', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:54.264767', '2025-11-06 15:29:40.980532', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 252, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2021-07-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1538, NULL, NULL, NULL, 1, 1, NULL, 'BAGOUE', 'DANIELLE LEMANOIS', '897703X', '2000-11-03', 'DALOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'bagouedaniellelemanois@gmail.c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-07-10', NULL, '2025-10-27 12:16:54.270353', '2025-11-06 15:29:40.984148', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1539, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KONAN GUY JEANNOT', '834755S', '1985-06-12', 'GAGNOA PREF', NULL, '07 77 43 65', '05 04 96 79', 'M', NULL, NULL, 'konanguyjeannot@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-25', NULL, '2025-10-27 12:16:54.275047', '2025-11-06 15:29:40.986669', NULL, NULL, 5, 38, 59, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-25', '2022-06-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1540, NULL, NULL, NULL, 1, 1, NULL, 'NANAN', 'KOUAKOU ETIENNE', '277841A', '1970-12-30', 'GAGNOA PREF', NULL, '05 61 28 03', NULL, 'M', NULL, NULL, 'koua-nanan@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-07-19', NULL, '2025-10-27 12:16:54.27854', '2025-11-06 15:29:41.052246', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2035-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '1999-07-10', '2022-07-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1541, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'MARIAM', '815431B', '1996-06-02', 'GAGNOA PREF', NULL, '07 49 17 94', NULL, 'F', NULL, NULL, 'cmariam897@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.282268', '2025-11-06 15:29:41.067288', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1542, NULL, NULL, NULL, 1, 1, NULL, 'AMOA', 'ATTIKORA ERIC', '485169S', '1987-01-04', 'GAGNOA PREF', NULL, '09 27 70 00', NULL, 'M', NULL, NULL, 'ericattikora@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-04-27', NULL, '2025-10-27 12:16:54.288091', '2025-11-06 15:29:41.070191', NULL, NULL, 6, 44, 48, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-04-27', '2022-03-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1543, NULL, NULL, NULL, 1, 1, NULL, 'EKRA', 'DAGO JEAN ARISTIDE A.', '464166Z', '1989-12-31', 'GAGNOA PREF', NULL, '09 /1 9/ 29', '57 /4 2/ 73', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:54.292194', '2025-11-06 15:29:41.072195', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1544, NULL, NULL, NULL, 1, 1, NULL, 'MENSAH', 'KOUASSI ASSOUAN ERIC', '480731U', '1986-06-16', 'GAGNOA PREF', NULL, '46 24 50 77', '49 47 43 05', 'M', NULL, NULL, 'erickmensah99@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:54.295482', '2025-11-06 15:29:41.073937', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1545, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'LORDINE AKOUA NADEGE', '855861S', '1995-10-24', 'GAGNOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:54.300039', '2025-11-06 15:29:41.07582', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1546, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'N''DRI EMMANUELLE', '855862T', '1995-04-03', 'GAGNOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-18', NULL, '2025-10-27 12:16:54.30779', '2025-11-06 15:29:41.077726', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-18', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1547, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'SALI GNOUGO', '855873W', '1994-06-20', 'GAGNOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:54.311373', '2025-11-06 15:29:41.160047', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1548, NULL, NULL, NULL, 1, 1, NULL, 'DIBI', 'AMENAN GENEVIEVE', '826154Q', '1983-01-01', 'GAGNOA PREF', NULL, '07 07 11 34', '01 40 10 10', 'F', NULL, NULL, 'amenangenevievedibi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-21', NULL, '2025-10-27 12:16:54.314851', '2025-11-06 15:29:41.197481', NULL, NULL, 6, 44, 56, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2043-12-31', 'DOCUMENTALISTE', NULL, NULL, NULL, NULL, NULL, '2022-03-21', '2022-04-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1549, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'BI BAMI JEAN FRANCIS', '481590R', '1981-09-12', 'GAGNOA PREF', NULL, '05 06 99 82', '06 99 82 55', 'M', NULL, NULL, 'jeanfrancisbami81@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:54.319897', '2025-11-06 15:29:41.269865', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 253, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 253, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2024-03-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1553, NULL, NULL, NULL, 1, 1, NULL, 'BREGUEHI', 'YEHIRI APPOLINAIRE', '319399R', '1974-01-01', 'DIVO PREF', NULL, '20347950', NULL, 'M', NULL, NULL, 'byehiri@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-08-09', NULL, '2025-10-27 12:16:54.339826', '2025-11-06 15:29:41.394071', NULL, NULL, 5, 37, 26, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2034-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2006-08-09', '2022-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1555, NULL, NULL, NULL, 1, 1, NULL, 'KOUADJO', 'NEE MANDJI MARIE ANNE', '805019Y', '1990-01-01', 'DIVO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-12-29', NULL, '2025-10-27 12:16:54.348148', '2025-11-06 15:29:41.398247', NULL, NULL, 5, 37, 39, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-12-29', '2024-07-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1556, NULL, NULL, NULL, 1, 1, NULL, 'ABOUA', 'SIDJE ADRIENNE', '447557Y', '1977-03-22', 'DIVO PREF', NULL, '49 74 43 59', NULL, 'F', NULL, NULL, 'Adrienneaboua126@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:54.356299', '2025-11-06 15:29:41.404595', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 254, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1557, NULL, NULL, NULL, 1, 1, NULL, 'AKESSE', 'NEE KOUADJANE AMOIN A.N', '480679Q', '1987-01-26', 'DIVO PREF', NULL, '07 91 03 51', '40 49 21 11', 'F', NULL, NULL, 'karmandenbelle@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:54.362347', '2025-11-06 15:29:41.407043', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1558, NULL, NULL, NULL, 1, 1, NULL, 'SOHOU', 'FOUEULOH ANGE JOEL', '855879C', '1992-05-17', 'DIVO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'sohouanyejoel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-23', NULL, '2025-10-27 12:16:54.369878', '2025-11-06 15:29:41.409684', NULL, NULL, 6, 44, 63, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-23', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1559, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'AMOROFI NARCISSE', '418984Q', '1978-07-13', 'DIVO PREF', NULL, '01 58 66 63', NULL, 'M', NULL, NULL, 'kouamenar6@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-28', NULL, '2025-10-27 12:16:54.376135', '2025-11-06 15:29:41.411896', NULL, NULL, 6, 42, 29, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-10-28', '2015-11-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1560, NULL, NULL, NULL, 1, 1, NULL, 'GADJI', 'ESTELLE MURIELLE', '468402B', '1990-11-26', 'DIVO PREF', NULL, '09 32 67 68', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-21', NULL, '2025-10-27 12:16:54.381049', '2025-11-06 15:29:41.413905', NULL, NULL, 6, 42, 30, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2050-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2019-02-21', '2025-07-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1561, NULL, NULL, NULL, 1, 1, NULL, 'SONH', 'JEAN ARTHUR', '371987T', '1976-01-01', 'DIVO PREF', NULL, '07 92 71 04', NULL, 'M', NULL, NULL, 'jeanarthursohh@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-12-19', NULL, '2025-10-27 12:16:54.386917', '2025-11-06 15:29:41.44495', NULL, NULL, 9, 45, 42, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 254, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-12-19', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1562, NULL, NULL, NULL, 1, 1, NULL, 'DIALLO', 'ROKIATOU', '481413B', '1989-06-11', 'DIVO PREF', NULL, '58 99 33 71', '06 64 92 21', 'F', NULL, NULL, 'alphasirani@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.393455', '2025-11-06 15:29:41.468857', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1564, NULL, NULL, NULL, 1, 1, NULL, 'YAPO', 'YAPI ERIC NOGUES', '826158U', '1988-05-25', 'DIVO PREF', NULL, '48 92 29 19', '01 02 89 49', 'M', NULL, NULL, 'yaponogues26@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-09', NULL, '2025-10-27 12:16:54.406804', '2025-11-06 15:29:41.49405', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-03-09', '2024-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1565, NULL, NULL, NULL, 1, 1, NULL, 'ANGO', 'YAH MICHEL DERWIN', '902807V', '1991-04-18', 'DIVO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'yahmichelderwinango@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-10-07', NULL, '2025-10-27 12:16:54.412098', '2025-11-06 15:29:41.649655', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-07-10', '2024-10-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1566, NULL, NULL, NULL, 1, 1, NULL, 'DOUMBIA', 'MOHAMED', '246394B', '1965-06-14', 'MAN PREF', NULL, '34725918/19', '01 15 23 80', 'M', NULL, NULL, 'doumci@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1993-02-26', NULL, '2025-10-27 12:16:54.418641', '2025-11-06 15:29:41.720082', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2030-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2000-05-15', '2022-07-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1567, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'MATENE NINA PASCALINE', '815449V', '1995-12-31', 'MAN PREF', NULL, '07 48 70 44', NULL, 'F', NULL, NULL, 'fofananina95@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.426358', '2025-11-06 15:29:41.820966', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1568, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'TIDIANE', '433367T', '1978-11-24', 'MAN PREF', NULL, '58 78 80 89', '05 63 70 03', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-14', NULL, '2025-10-27 12:16:54.432033', '2025-11-06 15:29:41.824926', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-14', '2016-12-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1348, NULL, NULL, NULL, 1, 1, NULL, 'GOA', 'JEAN LOUIS HERVE', '474937Q', '1984-08-10', 'DABOU PREF', NULL, '48 /5 6/ 60', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-07-02', NULL, '2025-10-27 12:16:53.11373', '2025-11-06 15:29:36.662319', NULL, NULL, 6, 44, 36, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 240, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-07-02', '2024-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1533, NULL, NULL, NULL, 1, 1, NULL, 'NIAMIEN', 'OI NIAMIEN', '885708G', '1980-01-01', 'DALOA PREF', NULL, '09 91 76 74', NULL, 'M', NULL, NULL, 'niamienoi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-28', NULL, '2025-10-27 12:16:54.247659', '2025-11-06 15:29:40.970553', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2040-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-03-28', '2024-04-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1534, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'IBRAHIM', '826153P', '1993-11-12', 'DALOA PREF', NULL, '89 52 18 16', '05 46 32 24', 'M', NULL, NULL, 'bambaibrahim540@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-10', NULL, '2025-10-27 12:16:54.25171', '2025-11-06 15:29:40.972986', NULL, NULL, 6, 42, 29, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-03-10', '2022-06-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1575, NULL, NULL, NULL, 1, 1, NULL, 'KARABOUE', 'MATOMA MARIAM', '481935E', '1993-03-23', 'MAN PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'kmariam507@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:54.489041', '2025-11-06 15:29:41.838621', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 255, '2053-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2024-06-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1570, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'NEE SANOGO BINTA TOKAHA', '481049Z', '1977-05-04', 'MAN PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-04', NULL, '2025-10-27 12:16:54.444494', '2025-11-06 15:29:41.829687', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-04', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1576, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'GNONDAHANA DJENEBA EDWIGE', '819118V', '1988-12-29', 'MAN PREF', NULL, '07 47 47 93', NULL, 'F', NULL, NULL, 'edwigekone48@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-08-04', NULL, '2025-10-27 12:16:54.503491', '2025-11-06 15:29:41.873762', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2048-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2021-08-04', '2021-08-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1586, NULL, NULL, NULL, 1, 1, NULL, 'SOMBO', 'HENRI-MAYOLLE', '855880S', '1994-08-23', 'DANANE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'mayollesombo230@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:54.69936', '2025-11-06 15:29:42.016538', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 257, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1587, NULL, NULL, NULL, 1, 1, NULL, 'SERY', 'NAKA MARIE CHRISTELLE', '491244T', '1989-12-25', 'DANANE PREF', NULL, '09 44 16 25', '71 00 51 58', 'F', NULL, NULL, 'nakasery@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-06-08', NULL, '2025-10-27 12:16:54.719957', '2025-11-06 15:29:42.019746', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 257, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-06-08', '2020-06-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1588, NULL, NULL, NULL, 1, 1, NULL, 'DEVRI', 'EVELINE-PATRICIA', '855834P', '1980-07-12', 'DANANE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'davrieveline@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-17', NULL, '2025-10-27 12:16:54.743214', '2025-11-06 15:29:42.099821', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 257, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-17', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1590, NULL, NULL, NULL, 1, 1, NULL, 'N''CHO', 'CHAYE MOUSSAN EVELYNE', '803543Y', '1995-03-08', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'chayenchoeve@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-11-19', NULL, '2025-10-27 12:16:54.792307', '2025-11-06 15:29:42.263234', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2060-12-31', 'PROFESSEUR', NULL, NULL, NULL, NULL, NULL, '2020-11-19', '2020-11-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1591, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'MARIAM', '875950B', '2002-12-17', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'mariamouattara107@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-13', NULL, '2025-10-27 12:16:54.809179', '2025-11-06 15:29:42.26711', NULL, NULL, 5, 38, 68, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 258, '2067-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1592, NULL, NULL, NULL, 1, 1, NULL, 'YOBOUE', 'FIRMIN', '297588S', '1973-07-09', 'SAN-PEDRO PREF', NULL, '05 42 41 06', '05 68 20 00', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-06', NULL, '2025-10-27 12:16:54.817606', '2025-11-06 15:29:42.269294', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2003-10-06', '2003-10-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1593, NULL, NULL, NULL, 1, 1, NULL, 'DAWOULE', 'B. AKISSI COLETTE', '359186C', '1979-10-22', 'SAN-PEDRO PREF', NULL, '09 93 76 78', NULL, 'F', NULL, NULL, 'dcoolet@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:54.826619', '2025-11-06 15:29:42.273835', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2023-05-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1594, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'KOUASSI JOACHIM', '855856V', '1982-07-26', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'joachino82@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:54.832753', '2025-11-06 15:29:42.275573', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1595, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'JEAN AFFOUE CYNTHIA L.', '480632Z', '1994-05-07', 'SAN-PEDRO PREF', NULL, '09 78 67 27', '75 03 72 68', 'F', NULL, NULL, 'jlover806@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-26', NULL, '2025-10-27 12:16:54.841796', '2025-11-06 15:29:42.281178', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-26', '2020-02-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1596, NULL, NULL, NULL, 1, 1, NULL, 'OKOBE', 'AYA MARIE-JOSIANE', '481541K', '1982-11-14', 'SAN-PEDRO PREF', NULL, '09 80 58 11', NULL, 'F', NULL, NULL, 'okobemariejosiane@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-11', NULL, '2025-10-27 12:16:54.847071', '2025-11-06 15:29:42.320475', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 258, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-11', '2025-02-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1597, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'KOUASSI ANICET', '832885C', '1992-07-24', 'SAN-PEDRO PREF', NULL, '07 88 21 40', '05 65 87 13', 'M', NULL, NULL, 'htour8012@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-12', NULL, '2025-10-27 12:16:54.87084', '2025-11-06 15:29:42.365271', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 258, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-12', '2024-10-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1598, NULL, NULL, NULL, 1, 1, NULL, 'KANH', 'KAMONNAIN MARIE PAULE', '855845S', '1992-02-15', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'mariepaulekan@mail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:54.884328', '2025-11-06 15:29:42.368707', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1599, NULL, NULL, NULL, 1, 1, NULL, 'CAMARA', 'LASSINA', '815427F', '1985-02-20', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'lascoc.2000@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-05', NULL, '2025-10-27 12:16:54.905905', '2025-11-06 15:29:42.370579', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 258, '2045-12-31', 'TECHNICIEN SUPERIEUR COMMUNICATION', NULL, NULL, NULL, NULL, NULL, '2021-05-05', '2025-05-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1600, NULL, NULL, NULL, 1, 1, NULL, 'AKA', 'KOUADIO FREJUS', '481383M', '1987-06-23', 'SAN-PEDRO PREF', NULL, '48 54 12 20', NULL, 'M', NULL, NULL, 'akfrejus@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.915018', '2025-11-06 15:29:42.567794', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1601, NULL, NULL, NULL, 1, 1, NULL, 'DEA', 'FATOU', '481566L', '1986-09-15', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'deafatou13@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:54.922478', '2025-11-06 15:29:42.571106', NULL, NULL, 8, 47, 33, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2020-06-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1603, NULL, NULL, NULL, 1, 1, NULL, 'ENOKOU', 'KOUTOUA ALAIN SERGE', '291179H', '1974-05-14', 'SOUBRE PREF', NULL, '20337321', '57 79 00 20', 'M', NULL, NULL, 'enokou2002@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-07-10', NULL, '2025-10-27 12:16:54.932409', '2025-11-06 15:29:42.578553', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2039-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2012-11-15', '2022-07-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1604, NULL, NULL, NULL, 1, 1, NULL, 'KACOU', 'N''GUESSAN J. MISCHAEL', '357870K', '1978-08-08', 'SOUBRE PREF', NULL, '07 07 65 06', '05 45 78 77', 'M', NULL, NULL, 'kacoujeanmischael@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-01-04', NULL, '2025-10-27 12:16:54.941452', '2025-11-06 15:29:42.581281', NULL, NULL, 5, 38, 81, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-10-07', '2021-10-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1605, NULL, NULL, NULL, 1, 1, NULL, 'KASSI', 'N''GBOTTI PRISCA', '464170H', '1978-10-15', 'SOUBRE PREF', NULL, '07 70 17 48', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:54.947511', '2025-11-06 15:29:42.583525', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1606, NULL, NULL, NULL, 1, 1, NULL, 'KONATE', 'MOUSSA', '464173Y', '1980-03-14', 'SOUBRE PREF', NULL, '01 /2 8/ 67', '05 /4 6/ 27', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:54.95577', '2025-11-06 15:29:42.585238', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1607, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KOFFI EZEKIEL', '815481E', '1993-12-03', 'SOUBRE PREF', NULL, NULL, '07 79 32 34', 'M', NULL, NULL, 'nguessannezekiel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-28', NULL, '2025-10-27 12:16:54.961145', '2025-11-06 15:29:42.586894', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-28', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1608, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'BRALEY MARTHE SANDRINE', '827822F', '1988-10-17', 'SOUBRE PREF', NULL, '47 06 52 66', NULL, 'F', NULL, NULL, 'bnaleysandrine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-05', NULL, '2025-10-27 12:16:54.9669', '2025-11-06 15:29:42.595063', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 259, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-05', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1609, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'N''GUESSAN EDMOND', '827824H', '1990-12-22', 'SOUBRE PREF', NULL, '07 48 00 05', '01 02 98 17', 'M', NULL, NULL, 'KEDMOND01@YAHOU.COM', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-04', NULL, '2025-10-27 12:16:54.973582', '2025-11-06 15:29:42.597438', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 259, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 259, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-04', '2022-06-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1610, NULL, NULL, NULL, 1, 1, NULL, 'ADAMA', 'COULIBALY', '272141F', '1970-09-17', 'SASSANDRA PREF', NULL, '33706634', '07 86 04 09', 'M', NULL, NULL, 'adamscoul70@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:54.978209', '2025-11-06 15:29:42.600285', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 260, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 260, '2035-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1612, NULL, NULL, NULL, 1, 1, NULL, 'ADJOBI', 'ASSOUKO ADELAIDE', '447559A', '1980-11-17', 'SASSANDRA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:54.990382', '2025-11-06 15:29:42.649947', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 260, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 260, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-02-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1617, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'NEE BILE N''GOAN J.E.C', '865406V', '1993-05-20', 'KORHOGO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'bilejoyce@hotmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-24', NULL, '2025-10-27 12:16:55.019616', '2025-11-06 15:29:42.702114', NULL, NULL, 5, 37, 26, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-04-24', '2024-01-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1618, NULL, NULL, NULL, 1, 1, NULL, 'ASSOKO', 'OKON GEORGES', '464161U', '1979-04-23', 'KORHOGO PREF', NULL, '09 /3 6/ 81', '41 /8 4/ 24', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:55.026402', '2025-11-06 15:29:42.781979', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (59, 1, 1, 1, 1, 1, NULL, 'KONE', 'DAVID', 'ADMIN-RH-001', '1980-01-01', 'TINGRELA', 45, '+2250504658754', '+2254684752565', 'M', NULL, NULL, 'adminl@school.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-23 02:42:34.464874', '2025-11-06 15:29:07.800271', NULL, 1, 8, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1572, NULL, NULL, NULL, 1, 1, NULL, 'AHUA', 'BLEDOU GUY STEPHANE', '855817N', '1994-01-01', 'MAN PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'abgshommefort@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:54.462813', '2025-11-06 15:29:41.833549', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1574, NULL, NULL, NULL, 1, 1, NULL, 'MAHAN', 'KEAGNENE ERIC', '856181J', '1990-02-12', 'MAN PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'donybenediction@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-03-06', NULL, '2025-10-27 12:16:54.478263', '2025-11-06 15:29:41.836684', NULL, NULL, 6, 42, 29, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-03-06', '2023-02-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1624, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'KARNON CYRILLE', '830036M', '1988-12-28', 'KORHOGO PREF', NULL, '07 09 58 46', '05 06 75 49', 'M', NULL, NULL, 'cyrillekarnon@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-16', NULL, '2025-10-27 12:16:55.076774', '2025-11-06 15:29:42.802516', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-16', '2022-06-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1621, NULL, NULL, NULL, 1, 1, NULL, 'YEO', 'KOUMONGON ARNAUD', '482017A', '1993-02-11', 'KORHOGO PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-02', NULL, '2025-10-27 12:16:55.057647', '2025-11-06 15:29:42.795995', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-02', '2020-03-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1625, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'KAFOHOLOH KARIM', '470991X', '1990-09-18', 'KORHOGO PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-16', NULL, '2025-10-27 12:16:55.082539', '2025-11-06 15:29:42.841179', NULL, NULL, 6, 42, 29, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-04-16', '2019-04-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1626, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'YOH RAMATA', '470054E', '1983-09-20', 'KORHOGO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-26', NULL, '2025-10-27 12:16:55.094554', '2025-11-06 15:29:42.84373', NULL, NULL, 6, 42, 30, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-26', '2020-09-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1627, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'NEE SORO ABI YOH PILE', '483237L', '1985-01-02', 'KORHOGO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-26', NULL, '2025-10-27 12:16:55.100453', '2025-11-06 15:29:42.882654', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-26', '2020-06-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1628, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'MINATA', '856191L', '1991-06-07', 'KORHOGO PREF', NULL, '09 40 48 68', '85 42 23 59', 'F', NULL, NULL, 'delaflores21@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-17', NULL, '2025-10-27 12:16:55.107452', '2025-11-06 15:29:42.912946', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-17', '2023-09-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1630, NULL, NULL, NULL, 1, 1, NULL, 'POUO', 'NEMLIN SAHE FRANCOIS', '304891Z', '1975-12-15', 'BOUNDIALI PREF', NULL, '20-34-74-24', '46 28 91 01', 'M', NULL, NULL, 'pouoenock@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-14', NULL, '2025-10-27 12:16:55.117537', '2025-11-06 15:29:42.917818', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2040-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2004-12-14', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1631, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'MIGBO ROKIA', '852280D', '1995-11-01', 'BOUNDIALI PREF', NULL, '799775928', NULL, 'F', NULL, NULL, 'soromigborokia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:55.125109', '2025-11-06 15:29:42.954934', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1632, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'N''KOHESSE MURIEL S.', '447572X', '1988-07-17', 'BOUNDIALI PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:55.129696', '2025-11-06 15:29:42.957322', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-01-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1633, NULL, NULL, NULL, 1, 1, NULL, 'SILUE', 'KINDINNIN WOROKIA', '464178D', '1988-09-14', 'BOUNDIALI PREF', NULL, '49 /3 50 9/', '04 /9 9/ 10', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:55.134598', '2025-11-06 15:29:42.989597', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1634, NULL, NULL, NULL, 1, 1, NULL, 'SANOGO', 'ABDOULAYE', '490020V', '1977-05-14', 'BOUNDIALI PREF', NULL, '06 11 52 72', '09 77 57 41', 'M', NULL, NULL, 'abilo_s2006@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-05-25', NULL, '2025-10-27 12:16:55.141194', '2025-11-06 15:29:43.001846', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-05-25', '2020-06-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1636, NULL, NULL, NULL, 1, 1, NULL, 'KONATE', 'CHONKOUHO', '855851Y', '1997-12-29', 'BOUNDIALI PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'konatechonkouho29@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-19', NULL, '2025-10-27 12:16:55.150636', '2025-11-06 15:29:43.00494', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-19', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1638, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'TATA', '826156J', '1990-05-21', 'BOUNDIALI PREF', NULL, '05 45 79 90', '07 67 64 94', 'F', NULL, NULL, 'traoretata4579@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-05', NULL, '2025-10-27 12:16:55.163501', '2025-11-06 15:29:43.122867', NULL, NULL, 6, 44, 36, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-05', '2022-04-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1639, NULL, NULL, NULL, 1, 1, NULL, 'BEUGRE', 'NIMA LOUISE TATIANA', '886245Y', '1990-09-27', 'BOUNDIALI PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'beugrenina@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-18', NULL, '2025-10-27 12:16:55.168805', '2025-11-06 15:29:43.195015', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-03-18', '2024-04-29', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1641, NULL, NULL, NULL, 1, 1, NULL, 'ATTABAH', 'JEAN CLAUDE PACOME', '291183N', '1974-03-04', 'FERKESSEDOUGOU P.', NULL, '20337321', NULL, 'M', NULL, NULL, 'attabf2@gmail.com  attabf2@yah', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-07-10', NULL, '2025-10-27 12:16:55.181588', '2025-11-06 15:29:43.201968', NULL, NULL, 5, 37, 25, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2034-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2002-10-24', '2022-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1642, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KOUAKOU SYLVAIN', '855866X', '1987-04-30', 'FERKESSEDOUGOU P.', NULL, NULL, NULL, 'M', NULL, NULL, 'kouakousylvain30@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-12', NULL, '2025-10-27 12:16:55.189111', '2025-11-06 15:29:43.204083', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-12', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1643, NULL, NULL, NULL, 1, 1, NULL, 'ATTOUNGBRE', 'N''DA PAUL AHOURE', '481905R', '1991-01-01', 'FERKESSEDOUGOU P.', NULL, '57 34 18 26', NULL, 'M', NULL, NULL, 'konanahoure@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-28', NULL, '2025-10-27 12:16:55.194453', '2025-11-06 15:29:43.206554', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-28', '2020-02-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1644, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'BROU MARLEINE', '815480R', '1994-08-22', 'FERKESSEDOUGOU P.', NULL, '47 33 93 27', '05 44 76 95', 'F', NULL, NULL, 'broumarlene560@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-30', NULL, '2025-10-27 12:16:55.199634', '2025-11-06 15:29:43.208876', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-30', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1645, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'AWA BRIGITTE', '855450A', '1986-10-29', 'FERKESSEDOUGOU P.', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:55.207312', '2025-11-06 15:29:43.223829', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1646, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'OUSMANE', '481542L', '1989-09-25', 'FERKESSEDOUGOU P.', NULL, '49 81 38 98', NULL, 'M', NULL, NULL, 'ousmaneouatt45@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-10', NULL, '2025-10-27 12:16:55.212338', '2025-11-06 15:29:43.245527', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-10', '2020-03-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1647, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'N''GUESSAN BRUNO', '855849E', '1990-10-05', 'FERKESSEDOUGOU P.', NULL, NULL, NULL, 'M', NULL, NULL, 'bruno84konan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:55.216639', '2025-11-06 15:29:43.286916', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1649, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'TALTCHO ISABELLE', '815434E', '1994-03-20', 'ODIENNE PREF', NULL, '07 47 14 46', NULL, 'F', NULL, NULL, 'mireillecoulibaly02@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:55.230035', '2025-11-06 15:29:43.340411', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 264, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 264, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1650, NULL, NULL, NULL, 1, 1, NULL, 'TETCHI', 'FLEUR REGINALDE C.', '481640A', '1991-03-25', 'ODIENNE PREF', NULL, '08 40 40 31', '45 18 96 87', 'F', NULL, NULL, 'tfleurchristiane@yahoo.cmm', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:55.235363', '2025-11-06 15:29:43.343893', NULL, NULL, 6, 44, 41, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 264, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 264, '2051-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2020-04-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1651, NULL, NULL, NULL, 1, 1, NULL, 'SEU', 'DRO JONAS', '815492H', '1991-03-05', 'ODIENNE PREF', NULL, NULL, '07 09 37 56', 'M', NULL, NULL, 'seudro1991@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-09', NULL, '2025-10-27 12:16:55.242259', '2025-11-06 15:29:43.347577', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 264, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 264, '2051-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2021-06-09', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1652, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'KOUAME', '358754T', '1975-10-10', 'TOUBA PREF', NULL, '07 21 79 43', NULL, 'M', NULL, NULL, 'kouamefelicieno@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-16', NULL, '2025-10-27 12:16:55.247396', '2025-11-06 15:29:43.35037', NULL, NULL, 5, 39, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 265, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 265, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-05-21', '2019-05-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1653, NULL, NULL, NULL, 1, 1, NULL, 'ZAMBLE', 'BI IRIE RICHARD', '272134Y', '1969-11-04', 'TOUBA PREF', NULL, '36865045', '44 43 37 19', 'M', NULL, NULL, 'benritchi@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:55.253939', '2025-11-06 15:29:43.353752', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 265, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 265, '2034-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1654, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'LOUKOU ERIC', '318251K', '1979-06-29', 'TOUBA PREF', NULL, '47 76 93 87', '03 26 25 28', 'M', NULL, NULL, 'loukouerickonan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-10', NULL, '2025-10-27 12:16:55.260065', '2025-11-06 15:29:43.356862', NULL, NULL, 5, 37, 76, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 265, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 265, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-10', '2024-02-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1655, NULL, NULL, NULL, 1, 1, NULL, 'YORO', 'GONEZIE CYNTHIA LYDIE', '864879D', '1991-06-16', 'TOUBA PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'gonezielydie16@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-03-29', NULL, '2025-10-27 12:16:55.265193', '2025-11-06 15:29:43.359255', NULL, NULL, 6, 44, 36, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 265, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 265, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-03-29', '2023-04-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1656, NULL, NULL, NULL, 1, 1, NULL, 'SOUMAHORO', 'NEE COULIBALY M', '291061W', '1971-04-06', 'YAMOUSSOUKRO PREF', NULL, '20323431', NULL, 'F', NULL, NULL, 'soumahoro.felicite@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-22', NULL, '2025-10-27 12:16:55.27406', '2025-11-06 15:29:43.36125', NULL, NULL, 5, 40, 67, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2036-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1661, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'RICHARD KOMENAN', '304890C', '1971-05-08', 'YAMOUSSOUKRO PREF', NULL, '30640815', '04 46 30 40', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:55.294715', '2025-11-06 15:29:43.462796', NULL, NULL, 5, 37, 25, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 266, '2031-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2022-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (128, 1, 1, 1, 1, 1, NULL, 'KOUAME', 'JEAN-BAPTISTE', 'CS-TOUR-003', '1982-03-15', 'DALOA', 43, '+225 07 12 34 56 78', '+22507584546251', 'M', 'AKKISSI', 'NORBERT', 'jeanbaptiste.kouame3@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-04', NULL, '2025-10-06 06:00:24.747486', '2025-11-06 15:29:08.82184', NULL, 1, 8, NULL, 7, NULL, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2042-12-31', 'Chef de Service Comptabilité', NULL, 'Exempté', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1622, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'YAH KRA FLORENTINE', '815462J', '1992-10-24', 'KORHOGO PREF', NULL, '01 43 93 18', '07 09 24 42', 'F', NULL, NULL, 'k-florentine@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:55.063259', '2025-11-06 15:29:42.797602', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1691, NULL, NULL, NULL, 1, 1, NULL, 'WADJA', 'NEE KASSI ETTIEN', '481505Q', '1980-03-27', 'DIMBOKRO PREF', NULL, '08 13 80 75', NULL, 'F', NULL, NULL, 'elisanannan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:55.425453', '2025-11-06 15:29:43.666401', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1685, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'KOFFI OUMAR', '982955Q', '1996-12-10', 'YAMOUSSOUKRO PREF', NULL, '08 74 14 81', '01 45 67 72', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-21', NULL, '2025-10-27 12:16:55.396964', '2025-11-06 15:29:43.655103', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-03-21', '2022-09-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1686, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'MAMADOU', '297591M', '1974-12-05', 'DIMBOKRO PREF', NULL, '07 34 53 79', '03 70 94 09', 'M', NULL, NULL, 'soroma05@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:55.401072', '2025-11-06 15:29:43.65682', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2039-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2003-10-01', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1688, NULL, NULL, NULL, 1, 1, NULL, 'FAHE', 'HILARION CYRILLE', '359189P', '1981-12-17', 'DIMBOKRO PREF', NULL, '30 62 49 83', NULL, 'M', NULL, NULL, 'fahehilarion@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:55.412011', '2025-11-06 15:29:43.660218', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2021-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1689, NULL, NULL, NULL, 1, 1, NULL, 'DIBY', 'ONSY CHARLINE ANDREE', '885392K', '1986-02-26', 'DIMBOKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-13', NULL, '2025-10-27 12:16:55.415514', '2025-11-06 15:29:43.662348', NULL, NULL, 6, 44, 48, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-03-13', '2024-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1690, NULL, NULL, NULL, 1, 1, NULL, 'GLOU', 'BLANDINE MARINA', '464168B', '1978-06-18', 'DIMBOKRO PREF', NULL, '07 07 27 02', NULL, 'F', NULL, NULL, 'gloumarina17@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:55.421429', '2025-11-06 15:29:43.664742', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1692, NULL, NULL, NULL, 1, 1, NULL, 'N''TAYE', 'ADJOBA LOUISE', '855869A', '1991-12-19', 'DIMBOKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'louisentaye@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:55.428907', '2025-11-06 15:29:43.669443', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2025-02-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1693, NULL, NULL, NULL, 1, 1, NULL, 'DANHO', 'ABONDOBLIE ADELE EMELINE', '820547Y', '1985-10-26', 'DIMBOKRO PREF', NULL, '05 06 56 05', '01 40 43 06', 'F', NULL, NULL, 'adledanho@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-10-05', NULL, '2025-10-27 12:16:55.432966', '2025-11-06 15:29:43.671756', NULL, NULL, 6, 44, 69, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-10-05', '2021-10-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1694, NULL, NULL, NULL, 1, 1, NULL, 'TAHE', 'GLOUDEHI JOEL', '471018X', '1987-04-25', 'DIMBOKRO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'joeltahe01@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-15', NULL, '2025-10-27 12:16:55.439451', '2025-11-06 15:29:43.674162', NULL, NULL, 6, 42, 29, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-04-15', '2019-05-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1695, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'AHOU CHRISTINE', '481207V', '1977-07-07', 'DIMBOKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'ahouchristineko3@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-06', NULL, '2025-10-27 12:16:55.443014', '2025-11-06 15:29:43.802997', NULL, NULL, 8, 47, 33, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-06', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1696, NULL, NULL, NULL, 1, 1, NULL, 'NOUOMAN', 'MIEZANKOU MICHEL', '313051Z', '1975-01-27', 'BOUAFLE PREF', NULL, '05 06 44 12', NULL, 'M', NULL, NULL, 'michelnouoman@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:55.446473', '2025-11-06 15:29:43.832879', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2040-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2005-10-03', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1698, NULL, NULL, NULL, 1, 1, NULL, 'KAMBIRE', 'KOUMBOU ARNAUD', '827761Z', '1992-03-18', 'BOUAFLE PREF', NULL, '07 49 16 59', NULL, 'M', NULL, NULL, 'kambirearnaud@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-11', NULL, '2025-10-27 12:16:55.456347', '2025-11-06 15:29:43.997555', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-11', '2022-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1699, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'NEE BEBLAI TAHAND F.', '323835J', '1975-12-18', 'BOUAFLE PREF', NULL, '20347424', NULL, 'F', NULL, NULL, 'florenciabeblai360@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-19', NULL, '2025-10-27 12:16:55.459725', '2025-11-06 15:29:44.001998', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-02-19', '2022-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1700, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'ADIARATOU EPSE BAMBA', '464179E', '1987-11-18', 'BOUAFLE PREF', NULL, '07 48 51 39', '02 /6 5/ 86', 'F', NULL, NULL, 'adiaratoutraore1984@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:55.463361', '2025-11-06 15:29:44.005402', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1701, NULL, NULL, NULL, 1, 1, NULL, 'KOUA', 'ADJOA JULIETTE', '480580S', '1980-12-27', 'BOUAFLE PREF', NULL, '07 09 54 87', NULL, 'F', NULL, NULL, 'koua_juliette@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:55.466612', '2025-11-06 15:29:44.00834', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2020-02-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1702, NULL, NULL, NULL, 1, 1, NULL, 'ALLOKO', 'AHOU ELISE EPSE KOUADIO', '815420L', '1986-12-29', 'BOUAFLE PREF', NULL, '05 06 89 49', NULL, 'F', NULL, NULL, 'elisealloko10@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:55.473159', '2025-11-06 15:29:44.011247', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1703, NULL, NULL, NULL, 1, 1, NULL, 'AMIA', 'AKISSI ANGE CARINE', '855820V', '1988-12-22', 'BOUAFLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'carineamia5@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-04', NULL, '2025-10-27 12:16:55.476425', '2025-11-06 15:29:44.013543', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-04', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1704, NULL, NULL, NULL, 1, 1, NULL, 'BODIE', 'LETO ARNAUD', '889085P', '1993-12-23', 'BOUAFLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'arnaudbodie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-14', NULL, '2025-10-27 12:16:55.479738', '2025-11-06 15:29:44.017282', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-14', '2024-05-29', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1705, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'N''GUESSAN ROMAIN', '419036M', '1980-02-28', 'BOUAFLE PREF', NULL, '07 07 37 28', NULL, 'M', NULL, NULL, 'romainkouakou80@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-11-03', NULL, '2025-10-27 12:16:55.483485', '2025-11-06 15:29:44.020699', NULL, NULL, 6, 44, 36, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-11-03', '2015-11-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1706, NULL, NULL, NULL, 1, 1, NULL, 'KANGA', 'SIMIGNO NINA ESTELLE', '855844Z', '1994-01-31', 'BOUAFLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'simignoestelle@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:55.489486', '2025-11-06 15:29:44.065158', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 268, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2024-10-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1707, NULL, NULL, NULL, 1, 1, NULL, 'GNONSIAN', 'OLGA FELICITE', '323197K', '1978-06-02', 'BOUAFLE PREF', NULL, '34725918', '57 59 11 20', 'F', NULL, NULL, 'olgagnonsian2018@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-03-22', NULL, '2025-10-27 12:16:55.493075', '2025-11-06 15:29:44.09209', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 268, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-03-22', '2022-07-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1708, NULL, NULL, NULL, 1, 1, NULL, 'KOUAMELAN', 'ADJE JEAN-AUDES', '889420X', '1997-03-20', 'BOUAFLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'kouamelanadje jean10@gmail', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-15', NULL, '2025-10-27 12:16:55.496729', '2025-11-06 15:29:44.095011', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-15', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1709, NULL, NULL, NULL, 1, 1, NULL, 'TEHUA', 'TANOH KOFFI', '231462Y', '1964-03-20', 'SEGUELA PREF', NULL, '33790690', '02 47 03 70', 'M', NULL, NULL, 'tehuatanohkoffi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1988-03-08', NULL, '2025-10-27 12:16:55.500967', '2025-11-06 15:29:44.155243', NULL, NULL, 5, 40, 67, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2029-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2002-01-31', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1710, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'OTHNIEL EBEN-EZER', '815482F', '1994-04-28', 'SEGUELA PREF', NULL, '07 57 12 28', NULL, 'M', NULL, NULL, 'athnielebenezer@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:55.506952', '2025-11-06 15:29:44.247742', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1711, NULL, NULL, NULL, 1, 1, NULL, 'ANZAN', 'AKOUA ADELINE', '815422A', '1991-10-22', 'SEGUELA PREF', NULL, '07 49 53 19', NULL, 'F', NULL, NULL, 'akouaanzan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-07', NULL, '2025-10-27 12:16:55.510266', '2025-11-06 15:29:44.412633', NULL, NULL, 5, 37, 26, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-07', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1712, NULL, NULL, NULL, 1, 1, NULL, 'N''GOU', 'AGRI ANGE PACOME', '323850D', '1972-07-27', 'SEGUELA PREF', NULL, '32740747', '44 48 91 74', 'M', NULL, NULL, 'woropaco@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-02-22', NULL, '2025-10-27 12:16:55.513863', '2025-11-06 15:29:44.416401', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2032-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-02-22', '2007-02-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1713, NULL, NULL, NULL, 1, 1, NULL, 'TINDE', 'TOUSSAINT HABIB', '855885K', '1993-11-01', 'SEGUELA PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-09', NULL, '2025-10-27 12:16:55.517341', '2025-11-06 15:29:44.419089', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-09', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1714, NULL, NULL, NULL, 1, 1, NULL, 'TRA', 'BI TA LANDRY', '482010P', '1990-12-25', 'SEGUELA PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-17', NULL, '2025-10-27 12:16:55.523081', '2025-11-06 15:29:44.42137', NULL, NULL, 6, 44, 45, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-17', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1715, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'DAOUDA', '481500X', '1992-05-10', 'SEGUELA PREF', NULL, '57 12 20 97', '05 72 83 18', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-03-09', NULL, '2025-10-27 12:16:55.526357', '2025-11-06 15:29:44.423583', NULL, NULL, 9, 45, 42, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 269, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 269, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (52, 7, 1, 1, 2, 1, NULL, 'KOUASSI', 'ANGE', '5555H', '2025-09-12', 'DIVO', 0, '+2250507145484', '0758999073', 'M', 'JEANE', 'JEAN', 'gnantihourejosudde@gmail.com', NULL, NULL, 0, 'COCODY', 'PALMERAIE', '654', 'COCODY', 'PALMERAIE', '5412', 'inactif', '2025-09-26', '2025-09-27', '2025-09-23 00:23:08.882122', '2025-11-06 15:29:07.684043', 6, 1, NULL, NULL, 18, NULL, 11, 15, 5, NULL, NULL, NULL, NULL, NULL, NULL, 18, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 18, 19, 15, 10, 10, NULL, NULL, NULL, '2085-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1670, NULL, NULL, NULL, 1, 1, NULL, 'BROU', 'AKISSI PAULINE', '480523L', '1992-07-17', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-24', NULL, '2025-10-27 12:16:55.33483', '2025-11-06 15:29:43.592714', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-24', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1671, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'ANICK-FLORA N''GOTTA', '480694Y', '1990-07-19', 'YAMOUSSOUKRO PREF', NULL, '49 43 02 65', '40 37 66 81', 'F', NULL, NULL, 'koffianickflora19@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:55.340684', '2025-11-06 15:29:43.594456', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1721, NULL, NULL, NULL, 2, 1, NULL, 'CAMARA', 'MAIMOUNA DIT MAKABA', '480288H', '1970-04-12', 'PARIS', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-10-07', NULL, '2025-10-27 12:16:55.555659', '2025-11-06 15:29:44.663613', NULL, NULL, NULL, NULL, 82, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 271, NULL, 21, NULL, NULL, NULL, NULL, NULL, 32, 271, '2030-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1722, NULL, NULL, NULL, 2, 1, NULL, 'CROUZET', 'SONIA MARIE FREDERIQUE', '506215V', '1977-05-19', 'PARIS', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-08-18', NULL, '2025-10-27 12:16:55.561139', '2025-11-06 15:29:44.665854', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 271, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 271, '2037-12-31', 'ASSISTANT DU DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-06-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1719, NULL, NULL, NULL, 1, 1, NULL, 'ZROU', 'TOKPA LOUA', '887753W', '1982-01-01', 'MANKONO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'tokpalouazrou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-16', NULL, '2025-10-27 12:16:55.544768', '2025-11-06 15:29:44.653024', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 270, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 270, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-04-16', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1723, NULL, NULL, NULL, 2, 1, NULL, 'HIE', 'SERGE', '865486M', '1964-01-01', 'MILAN', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-11', NULL, '2025-10-27 12:16:55.564527', '2025-11-06 15:29:44.899326', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 272, NULL, 21, NULL, NULL, NULL, NULL, NULL, 32, 272, '2024-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2019-03-11', '2019-03-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1726, NULL, NULL, NULL, 2, 1, NULL, 'MACAIRE', 'DAGRY', '507163S', '1964-04-10', 'GENEVE', NULL, NULL, NULL, 'M', NULL, NULL, 'macaire.dagry@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-06', NULL, '2025-10-27 12:16:55.578593', '2025-11-06 15:29:44.918334', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 275, NULL, 20, NULL, NULL, NULL, NULL, NULL, 32, 275, '2024-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1727, NULL, NULL, NULL, 2, 1, NULL, 'SASSO', 'NEE TIESSE MEL MARIE S.', '506415N', '1965-05-10', 'MADRID', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1996-05-13', NULL, '2025-10-27 12:16:55.582194', '2025-11-06 15:29:44.985268', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 276, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 276, '2025-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1996-05-13', '1996-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1728, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'NEE COULIBALY MARIAM', '503323W', '1977-01-01', 'WASHINGTON', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-01', NULL, '2025-10-27 12:16:55.587723', '2025-11-06 15:29:45.129877', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 277, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 277, '2037-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2019-03-21', '2019-03-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1730, NULL, NULL, NULL, 1, 1, NULL, 'ADA-KOUASSI', 'AMENAN FREDERIQUE', '809988D', '1979-02-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'frederiqueada@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-05', NULL, '2025-10-27 12:16:55.596718', '2025-11-06 15:29:45.182631', NULL, NULL, 5, 38, 43, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 32, 279, '2044-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2017-06-28', '2021-03-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1732, NULL, NULL, NULL, 2, 1, NULL, 'CURCIO', 'JENNIFER FLORA', '506234Y', '1982-07-07', 'BRASILIA', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-08-18', NULL, '2025-10-27 12:16:55.606474', '2025-11-06 15:29:45.291889', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 280, NULL, 21, NULL, NULL, NULL, NULL, NULL, 32, 281, '2042-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1733, NULL, NULL, NULL, 2, 1, NULL, 'N''KPEOUDJE', 'NEE TANON A. AUDREY', '506864Y', '1983-06-23', 'RABAT', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-12-26', NULL, '2025-10-27 12:16:55.609946', '2025-11-06 15:29:45.352826', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 281, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 282, '2043-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2011-12-26', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1734, NULL, NULL, NULL, 1, 1, NULL, 'ASSEMAN', 'ANGE AURELE KOUADIO', '285815R', '1975-04-03', 'OTTAWA (CANADA)', NULL, '07 77 22 22', '01 28 73 33', 'M', NULL, NULL, 'assemanaurelio@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2001-10-22', NULL, '2025-10-27 12:16:55.613829', '2025-11-06 15:29:45.419957', NULL, NULL, 5, 39, 22, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 282, NULL, 20, NULL, NULL, NULL, NULL, NULL, 32, 283, '2040-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2018-04-30', '2022-02-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1736, NULL, NULL, NULL, 2, 1, NULL, 'COULIBALY', 'LANCINE', '506294V', '1959-12-17', NULL, NULL, NULL, NULL, 'M', NULL, NULL, 'lacine6gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-09-07', NULL, '2025-10-27 12:16:55.623346', '2025-11-06 15:29:45.557555', NULL, NULL, NULL, NULL, 21, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 284, '2019-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2023-07-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1737, NULL, NULL, NULL, 1, 1, NULL, 'SOULAMA', 'NEE KOUAKOU A.CARINE', '866514R', '1977-11-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-05-05', NULL, '2025-10-27 12:16:55.627623', '2025-11-06 15:29:45.69245', NULL, NULL, 5, 38, 62, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-05-05', '2023-05-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1738, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'NEE KOUAKOU AMOIN', '315928X', '1965-10-17', 'ABIDJAN ADM', NULL, '20347908', '05 79 85 83', 'F', NULL, NULL, 'kouakou-amoinsolange@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-01-27', NULL, '2025-10-27 12:16:55.631043', '2025-11-06 15:29:45.816612', NULL, NULL, 5, 37, 85, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2025-12-31', 'CHEF DE SECRETARIAT', NULL, NULL, NULL, NULL, NULL, '2006-01-27', '2006-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1740, NULL, NULL, NULL, 1, 1, NULL, 'HIEN', 'IREDJELA ANAIS RAYMONDE', '815450S', '1993-01-11', 'ABIDJAN ADM', NULL, '07 08 13 45', NULL, 'F', NULL, NULL, 'hienanais03@icloud.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:55.640582', '2025-11-06 15:29:46.345672', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2023-01-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1741, NULL, NULL, NULL, 1, 1, NULL, 'BOCOUM', 'NEE BAMBA KARIDJA', '855827Q', '1982-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kady793@gmai.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-11', NULL, '2025-10-27 12:16:55.644206', '2025-11-06 15:29:46.349409', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 285, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-11', '2023-09-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1753, NULL, NULL, NULL, 1, 1, NULL, 'MANGOUA', 'KOUAKOU EUGENE N', '265045B', '1973-07-18', 'ABIDJAN ADM', NULL, '20251619', NULL, 'M', NULL, NULL, 'mangouaken@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1997-08-21', NULL, '2025-10-27 12:16:55.709587', '2025-11-06 15:29:46.592389', NULL, NULL, 6, 44, 45, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 287, '2033-12-31', 'CHEF DE SERVICE FINANCIER', NULL, NULL, NULL, NULL, NULL, '1997-08-21', '1997-08-21', NULL, 169, NULL);
INSERT INTO public.agents VALUES (1724, NULL, NULL, NULL, 2, 1, NULL, 'DJENEBOU', 'KOMAH', '507095J', '1984-06-15', 'LONDRES', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:55.569213', '2025-11-06 15:29:44.903573', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 273, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 273, '2044-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2023-02-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1725, NULL, NULL, NULL, 1, 1, NULL, 'AKA', 'NEE GAUZE A.M. J.', '251279U', '1963-06-12', 'BERLIN', NULL, '20-34-79-69', '22 52 29 75', 'F', NULL, NULL, 'AKAGAUZEJ@YAHOO.FR', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1993-12-10', NULL, '2025-10-27 12:16:55.575059', '2025-11-06 15:29:44.915416', NULL, NULL, 5, 40, 83, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 274, NULL, 20, NULL, NULL, NULL, NULL, NULL, 32, 274, '2028-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1993-12-10', '2022-05-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1731, NULL, NULL, NULL, 2, 1, NULL, 'SORO', 'AHMED SEKOU', '877587N', '1988-01-29', 'PRETORIA', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-08-18', NULL, '2025-10-27 12:16:55.600335', '2025-11-06 15:29:45.196797', NULL, NULL, NULL, NULL, 84, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 279, NULL, 19, NULL, NULL, NULL, NULL, NULL, 32, 280, '2048-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-06-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1735, NULL, NULL, NULL, 2, 1, NULL, 'KOUASSI', 'BREDOUMY K.H.BADR M.', '506254C', '1984-12-04', 'OTTAWA', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-06-23', NULL, '2025-10-27 12:16:55.616859', '2025-11-06 15:29:45.552065', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 283, NULL, 20, NULL, NULL, NULL, NULL, NULL, 32, 283, '2044-12-31', 'ASSISTANT DU DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1739, NULL, NULL, NULL, 1, 1, NULL, 'DJANE', 'SANSAN', '350428R', '1981-11-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-07-01', NULL, '2025-10-27 12:16:55.634767', '2025-11-06 15:29:46.305701', NULL, NULL, 5, 37, 27, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2041-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2016-06-29', NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1742, NULL, NULL, NULL, 1, 1, NULL, 'ALLADE', 'EKRA WILSON', '821115C', '1980-02-05', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-09-24', NULL, '2025-10-27 12:16:55.647745', '2025-11-06 15:29:46.352262', NULL, NULL, 6, 44, 69, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 285, '2040-12-31', 'ASSISTANT', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1743, NULL, NULL, NULL, 1, 1, NULL, 'DEZAI', 'NEE N''GUESSAN AMANI L.B', '314003T', '1967-03-27', 'ABIDJAN ADM', NULL, '20-25-16-03', '23 46 46 05', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-01-23', NULL, '2025-10-27 12:16:55.651073', '2025-11-06 15:29:46.354327', NULL, NULL, 6, 44, 41, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2027-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2006-01-04', '2009-05-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1744, NULL, NULL, NULL, 1, 1, NULL, 'DIABAGATE', 'NINZIATA', '886292Q', '1986-06-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'minzdiabagate@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-25', NULL, '2025-10-27 12:16:55.658613', '2025-11-06 15:29:46.356209', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2046-12-31', 'ASSISTANT ADMINISTRATION ET FINANCE', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1745, NULL, NULL, NULL, 1, 1, NULL, 'SEGNON', 'YA KOSSANANGBO', '888832P', '1992-05-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'fatimasegnon@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-06', NULL, '2025-10-27 12:16:55.662965', '2025-11-06 15:29:46.378859', NULL, NULL, 6, 44, 73, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 285, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1746, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'DIOBLESSE ELIE BLAISE', '811666S', '1979-05-07', 'ABIDJAN ADM', NULL, '07 07 68 65', '01 40 35 45', 'M', NULL, NULL, 'blaise07yapi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-29', NULL, '2025-10-27 12:16:55.667203', '2025-11-06 15:29:46.444379', NULL, NULL, 6, 42, 29, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-29', '2021-04-29', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1747, NULL, NULL, NULL, 1, 1, NULL, 'LEGRE', 'BOHUI JEAN-CHARLES', '359729T', '1980-07-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-10-17', NULL, '2025-10-27 12:16:55.67412', '2025-11-06 15:29:46.477816', NULL, NULL, 8, 47, 61, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2040-12-31', 'AGENT SPECIALISE DES TP', NULL, NULL, NULL, NULL, NULL, '2012-10-17', '2013-10-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1748, NULL, NULL, NULL, 2, 1, NULL, 'MALEKAH', 'MOURAD CONDE', '500374J', '1976-05-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-10-17', NULL, '2025-10-27 12:16:55.678063', '2025-11-06 15:29:46.480407', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 285, '2036-12-31', 'DIRECTEUR GENERAL', NULL, NULL, NULL, NULL, NULL, NULL, '2021-09-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1749, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'NEE TOURE KIYA C.', '159015T', '1963-03-07', 'ABIDJAN ADM', NULL, '20251639', '23 45 43 67', 'F', NULL, NULL, 'kiyalamini@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1986-10-27', NULL, '2025-10-27 12:16:55.682922', '2025-11-06 15:29:46.482972', NULL, NULL, 5, 39, 86, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 286, '2028-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2006-03-01', '2006-03-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1750, NULL, NULL, NULL, 1, 1, NULL, 'ASSARE', 'A. A. D. V. EPSE TAGRO', '821439R', '1992-01-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-01', NULL, '2025-10-27 12:16:55.691094', '2025-11-06 15:29:46.586527', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 286, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-01', '2021-12-14', NULL, 167, NULL);
INSERT INTO public.agents VALUES (1751, NULL, NULL, NULL, 1, 1, NULL, 'MEA', 'NEE N''DOUBA AMA A. AGNES', '813575R', '1980-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-23', NULL, '2025-10-27 12:16:55.695782', '2025-11-06 15:29:46.588958', NULL, NULL, 6, 44, 87, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 286, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-23', '2021-12-14', NULL, 167, NULL);
INSERT INTO public.agents VALUES (1752, NULL, NULL, NULL, 1, 1, NULL, 'ADIEME', 'NEE N''DJA MARIE F.', '245090H', '1968-01-01', 'ABIDJAN ADM', NULL, '20251605', '22 48 68 12', 'F', NULL, NULL, 'marie-franceit@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1994-07-11', NULL, '2025-10-27 12:16:55.700349', '2025-11-06 15:29:46.590589', NULL, NULL, 5, 38, 62, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 286, '2033-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1995-05-15', NULL, NULL, 168, NULL);
INSERT INTO public.agents VALUES (1808, NULL, NULL, NULL, 2, 1, NULL, 'KAZA', 'SERY JULES', '817164R', '1975-12-31', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-27 12:18:58.410374', '2025-11-06 15:29:48.98653', NULL, NULL, NULL, NULL, 88, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 287, '2035-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2024-03-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1244, NULL, NULL, NULL, 2, 1, NULL, 'KOMAH', 'FATOUMATA', '506862W', '1984-06-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'komah.fatoumata@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-10', NULL, '2025-10-27 12:16:52.397707', '2025-11-06 15:29:33.190669', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2044-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-03-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1720, NULL, NULL, NULL, 1, 1, NULL, 'KOUADJANE', 'SIKAYAH ANITA JOELLE', '890060E', '1989-11-19', 'MANKONO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'kouadjanésikayah@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-15', NULL, '2025-10-27 12:16:55.548956', '2025-11-06 15:29:44.661285', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 270, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 270, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-15', '2024-06-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1755, NULL, NULL, NULL, 1, 1, NULL, 'N''GORAN', 'KOFFI ESOPE', '298230P', '1973-04-07', 'ABIDJAN ADM', NULL, '20251619', NULL, 'M', NULL, NULL, 'ngoranesope@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-11-18', NULL, '2025-10-27 12:16:55.716533', '2025-11-06 15:29:46.595718', NULL, NULL, 9, 46, 49, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 287, '2033-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2003-11-18', '2003-11-18', NULL, 169, NULL);
INSERT INTO public.agents VALUES (1758, NULL, NULL, NULL, 1, 1, NULL, 'AKOUN', 'ARMAND SAMUEL AKE', '827978T', '1970-07-18', 'ABIDJAN ADM', NULL, '101988114', '05 06 83 98', 'M', NULL, NULL, 'samuelake.sa@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-11', NULL, '2025-10-27 12:16:55.732367', '2025-11-06 15:29:46.602753', NULL, NULL, 5, 37, 26, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 287, '2030-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2022-05-11', '2022-08-17', NULL, 172, NULL);
INSERT INTO public.agents VALUES (1759, NULL, NULL, NULL, 1, 1, NULL, 'ALLIALI', 'AYA AIMEE', '809995U', '1975-05-07', 'ABIDJAN ADM', NULL, '05 05 60 46', '01 03 71 34', 'F', NULL, NULL, 'allialiaime7@yao:fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.739473', '2025-11-06 15:29:46.732616', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 287, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, 172, NULL);
INSERT INTO public.agents VALUES (1760, NULL, NULL, NULL, 1, 1, NULL, 'DODO', 'NEE OBRO KOCO B.', '313050C', '1971-07-24', 'ABIDJAN ADM', NULL, '20251616', NULL, 'F', NULL, NULL, 'mmedodo71@gmailcom', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-17', NULL, '2025-10-27 12:16:55.743636', '2025-11-06 15:29:46.737732', NULL, NULL, 5, 37, 25, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2031-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2005-10-12', '2005-10-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1761, NULL, NULL, NULL, 1, 1, NULL, 'N''DRI', 'KOFFI ANGE ERIC W.', '345915Y', '1979-06-02', 'ABIDJAN ADM', NULL, '20251636', '22 43 13 36', 'M', NULL, NULL, 'angeeric94@hotmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-15', NULL, '2025-10-27 12:16:55.74724', '2025-11-06 15:29:46.741104', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 288, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-15', '2022-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1762, NULL, NULL, NULL, 1, 1, NULL, 'SALL', 'SEYDOU', '307272N', '1979-09-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-01-06', NULL, '2025-10-27 12:16:55.754157', '2025-11-06 15:29:46.882593', NULL, NULL, 5, 37, 89, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 288, '2039-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2017-09-07', '2017-09-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1763, NULL, NULL, NULL, 1, 1, NULL, 'AGOUA', 'NEE BAHOU YAO THIKALO L', '337227W', '1976-03-06', 'ABIDJAN ADM', NULL, '20251600', '23 46 50 48', 'F', NULL, NULL, 'leabahou@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:55.75892', '2025-11-06 15:29:46.963002', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 288, '2036-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2008-01-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1764, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'NEE BOUKALO N.', '810020V', '1969-04-16', 'ABIDJAN ADM', NULL, '01 01 60 64', NULL, 'F', NULL, NULL, 'cit.sarah@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.762227', '2025-11-06 15:29:47.028384', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2029-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1765, NULL, NULL, NULL, 1, 1, NULL, 'TIGORI', 'N''GUESSAN ROSIMONE', '810075Y', '1984-02-02', 'ABIDJAN ADM', NULL, '07 07 84 67', '05 44 03 80', 'F', NULL, NULL, 'rosimone88@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.766748', '2025-11-06 15:29:47.031654', NULL, NULL, 6, 44, 69, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1768, NULL, NULL, NULL, 1, 1, NULL, 'CISSE', 'NEE COULIBALY F. KADIDJA', '481519M', '1991-09-19', 'ABIDJAN ADM', NULL, '08 32 98 58', '04 47 60 19', 'F', NULL, NULL, 'coulibalykadidja14@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-11', NULL, '2025-10-27 12:16:55.780087', '2025-11-06 15:29:47.081422', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-11', '2020-03-11', NULL, 173, NULL);
INSERT INTO public.agents VALUES (1769, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'AYA MARLEINE S.', '304899H', '1975-10-31', 'ABIDJAN ADM', NULL, '20251620/00', '23 45 00 20', 'F', NULL, NULL, 'kmarleinesandra@gmail.coom', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-08-27', NULL, '2025-10-27 12:16:55.783972', '2025-11-06 15:29:47.115052', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 288, '2035-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2021-12-22', NULL, 174, NULL);
INSERT INTO public.agents VALUES (1770, NULL, NULL, NULL, 1, 1, NULL, 'TETCHY', 'CYPRIEN', '284351E', '1977-10-15', 'ABIDJAN ADM', NULL, '20251600', NULL, 'M', NULL, NULL, 'tresorcit@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2001-05-30', NULL, '2025-10-27 12:16:55.789988', '2025-11-06 15:29:47.119823', NULL, NULL, 5, 37, 90, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 288, '2037-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2001-05-30', '2001-05-30', NULL, 174, NULL);
INSERT INTO public.agents VALUES (1771, NULL, NULL, NULL, 1, 1, NULL, 'CAMARA', 'MASSY KADIDIATOU DIANA', '865713X', '1997-12-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-05-02', NULL, '2025-10-27 12:16:55.793618', '2025-11-06 15:29:47.123003', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-05-02', '2023-05-15', NULL, 175, NULL);
INSERT INTO public.agents VALUES (1772, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'N''GUESSAN GREGOIRE', '305872E', '1972-11-17', 'ABIDJAN ADM', NULL, '20251621', NULL, 'M', NULL, NULL, 'gregoireayoh@yakoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-08', NULL, '2025-10-27 12:16:55.797401', '2025-11-06 15:29:47.19685', NULL, NULL, 5, 38, 80, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2037-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2009-02-10', '2009-02-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1773, NULL, NULL, NULL, 1, 1, NULL, 'GAGBE', 'KADY MICHELLE ARLETTE', '291172S', '1977-05-17', 'ABIDJAN ADM', NULL, '20251600', NULL, 'F', NULL, NULL, 'kadymichelle_cit@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-28', NULL, '2025-10-27 12:16:55.803137', '2025-11-06 15:29:47.199705', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2042-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2002-10-28', '2021-12-22', NULL, 176, NULL);
INSERT INTO public.agents VALUES (1774, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'KOUASSI MAHOU SYLVIE', '304893T', '1975-06-11', 'ABIDJAN ADM', NULL, '20251638', '21 36 24 51', 'F', NULL, NULL, 'sylviecit@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-08-27', NULL, '2025-10-27 12:16:55.808614', '2025-11-06 15:29:47.201456', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2035-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2005-08-27', '2021-12-22', NULL, 176, NULL);
INSERT INTO public.agents VALUES (1775, NULL, NULL, NULL, 1, 1, NULL, 'SOUME', 'PARFAITE LAURENCE', '323828T', '1975-01-04', 'ABIDJAN ADM', NULL, '20251630', '08 42 41 83', 'F', NULL, NULL, 'soumepargaite@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-12', NULL, '2025-10-27 12:16:55.813243', '2025-11-06 15:29:47.203001', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-12', '2006-12-12', NULL, 176, NULL);
INSERT INTO public.agents VALUES (1776, NULL, NULL, NULL, 1, 1, NULL, 'YOMAN', 'AFFOUET HORTENSE', '251272M', '1964-10-10', 'ABIDJAN ADM', NULL, '20251638', NULL, 'F', NULL, NULL, '.yoman_bi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1993-08-02', NULL, '2025-10-27 12:16:55.816784', '2025-11-06 15:29:47.205169', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2029-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '1993-08-02', NULL, NULL, 177, NULL);
INSERT INTO public.agents VALUES (1777, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'KOUADIO HIPPOLYTE', '291170C', '1972-09-01', 'ABIDJAN ADM', NULL, '05 93 34 84', NULL, 'M', NULL, NULL, 'hyppolite-citourisme@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-21', NULL, '2025-10-27 12:16:55.822824', '2025-11-06 15:29:47.252885', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2037-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2002-10-21', '2021-12-22', NULL, 177, NULL);
INSERT INTO public.agents VALUES (1778, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'DONGO', '272131V', '1971-01-01', 'ABIDJAN ADM', NULL, '20251613', NULL, 'M', NULL, NULL, 'dongo-citourisme@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:55.826143', '2025-11-06 15:29:47.31018', NULL, NULL, 5, 37, 25, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2031-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '1999-05-03', NULL, 177, NULL);
INSERT INTO public.agents VALUES (1779, NULL, NULL, NULL, 1, 1, NULL, 'ASSOKO', 'VICTOIRE STEPHANIE', '304884S', '1977-04-04', 'ABIDJAN ADM', NULL, '20251632', '23 53 69 79', 'F', NULL, NULL, 'assokostephanie@gmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:55.829827', '2025-11-06 15:29:47.313136', NULL, NULL, 5, 37, 25, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2037-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2014-03-10', NULL, 177, NULL);
INSERT INTO public.agents VALUES (1780, NULL, NULL, NULL, 1, 1, NULL, 'BAKAYOKO', 'MATESSO', '810000A', '1983-04-23', 'ABIDJAN ADM', NULL, '07 57 41 00', '01 03 60 35', 'F', NULL, NULL, 'matessob@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.833448', '2025-11-06 15:29:47.628247', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, 177, NULL);
INSERT INTO public.agents VALUES (1781, NULL, NULL, NULL, 1, 1, NULL, 'ANGAMAN', 'NEE ADHEPEAU J.M.E', '291184P', '1975-10-31', 'ABIDJAN ADM', NULL, '08 03 86 40', NULL, 'F', NULL, NULL, 'jocelynecitourisme@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-24', NULL, '2025-10-27 12:16:55.839659', '2025-11-06 15:29:47.85697', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2040-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2002-10-24', '2002-10-24', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1788, NULL, NULL, NULL, 1, 1, NULL, 'KOUACOU', 'JEAN-MARIE ATTA', '365485W', '1970-12-31', 'ABJ-PLATEAU', NULL, '07 07 98 43', '05 54 58 02', 'M', NULL, NULL, 'jeamarie_kouac@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-23', NULL, '2025-10-27 12:16:55.866943', '2025-11-06 15:29:48.443697', NULL, NULL, 5, 39, 91, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 238, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2035-12-31', 'DIRECTEUR EXECUTIF', NULL, NULL, NULL, NULL, NULL, '2021-06-23', '2021-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1789, NULL, NULL, NULL, 1, 1, NULL, 'KRA', 'KOUADIO JOSEPH', '389796E', '1976-11-13', 'ABIDJAN ADM', NULL, '07 07 15 41', '07 40 02 08', 'M', NULL, NULL, 'krajoseph@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-02', NULL, '2025-10-27 12:16:55.872967', '2025-11-06 15:29:48.499451', NULL, NULL, 5, 39, 91, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 34, 14, '2041-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2017-01-02', '2025-10-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1790, NULL, NULL, NULL, 1, 1, NULL, 'NIAMKE', 'NEE KOUASSI A. LUCIE', '206234B', '1962-07-06', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1986-10-03', NULL, '2025-10-27 12:16:55.875962', '2025-11-06 15:29:48.502265', NULL, NULL, 5, 39, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2027-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2020-09-09', '2020-09-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1791, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'NEE KOUASSI A. THERESE', '282337W', '1963-12-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2000-12-13', NULL, '2025-10-27 12:16:55.879088', '2025-11-06 15:29:48.514366', NULL, NULL, 5, 39, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2028-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2020-09-11', '2020-09-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (70, 7, NULL, 1, 1, 1, NULL, 'SUPER', 'ADMIN', 'MAT-018', '1980-01-01', 'ABIDJAN', 45, '+225 20 30 40 00', NULL, 'M', NULL, NULL, 'super.admin@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-15', '2025-10-15', '2025-09-25 02:42:00.359795', '2025-11-06 15:29:08.191607', NULL, 1, 5, 37, NULL, 23, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 18, NULL, 3, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-12', '2025-10-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (983, NULL, NULL, NULL, 1, 1, NULL, 'LEZOUTCHE', 'A. BOGUI JOSEPH', '313044S', '1974-07-11', 'ABIDJAN ADM', NULL, '20347417', NULL, 'M', NULL, NULL, 'josephbogui@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:50.711812', '2025-11-06 15:29:10.067212', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2034-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2005-10-03', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1245, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'NEE YA TRA LOU BOLI', '297590Y', '1974-11-03', 'ABIDJAN ADM', NULL, '3709408', '05 96 56 22', 'F', NULL, NULL, 'alice8ya@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:52.40183', '2025-11-06 15:29:33.194197', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 29, 234, '2039-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2003-10-01', '2022-02-07', NULL, 161, NULL);
INSERT INTO public.agents VALUES (1757, NULL, NULL, NULL, 1, 1, NULL, 'BINATE', 'HADJA DJENEBA', '810493R', '1982-11-11', 'ABIDJAN ADM', NULL, '07 08 96 01', '07 58 54 52', 'F', NULL, NULL, 'hadjabinate@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.726901', '2025-11-06 15:29:46.600509', NULL, NULL, 5, 38, 62, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 287, '2047-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, 171, NULL);
INSERT INTO public.agents VALUES (1756, NULL, NULL, NULL, 1, 1, NULL, 'SAHI', 'JEAN CLAUDE', '313290A', '1979-12-20', 'ABIDJAN ADM', NULL, '20251627', NULL, 'M', NULL, NULL, 'tourismejc@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-01-27', NULL, '2025-10-27 12:16:55.722617', '2025-11-06 15:29:46.597526', NULL, NULL, 8, 47, 32, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 287, '2039-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2006-01-27', '2006-01-27', NULL, 170, NULL);
INSERT INTO public.agents VALUES (1129, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'KOFFI MARIE FAUSTINE A.', '855847U', '1995-04-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'faustinek50@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:51.714777', '2025-11-06 15:29:21.262343', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1181, NULL, NULL, NULL, 2, 1, NULL, 'ORO', 'TOKRAUD CYRILLE', '982968V', '1973-04-28', 'ABIDJAN ADM', NULL, '07 64 10 53', '50 37 64 31', 'M', NULL, NULL, 'orotokraud@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-08-31', NULL, '2025-10-27 12:16:52.049631', '2025-11-06 15:29:27.344276', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 230, '2033-12-31', 'MAGASINIER', NULL, NULL, NULL, NULL, NULL, '2022-08-31', '2022-08-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1353, NULL, NULL, NULL, 1, 1, NULL, 'KAKOU', 'NEE KOUASSI NOHON H.', '231138T', '1967-08-13', 'DABOU PREF', NULL, '01 97 44 37', '01 08 33 39', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1994-05-01', NULL, '2025-10-27 12:16:53.147903', '2025-11-06 15:29:36.802049', NULL, NULL, 8, 47, 33, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2027-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2013-07-22', '2004-09-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1451, NULL, NULL, NULL, 1, 1, NULL, 'TAH', 'ABENAN GENEVIEVE', '272130G', '1971-10-19', 'ABENGOUROU PREF', NULL, '35917120/21', '05 63 03 58', 'F', NULL, NULL, 'tahabenan1@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:53.785465', '2025-11-06 15:29:39.62244', NULL, NULL, 5, 37, 25, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2031-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1530, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'ADJOUA S. RAISSA-PAULE', '481962R', '1989-07-04', 'DALOA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-02', NULL, '2025-10-27 12:16:54.234836', '2025-11-06 15:29:40.927915', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 252, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-02', '2025-05-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1536, NULL, NULL, NULL, 1, 1, NULL, 'DATINHAN', 'MOHOKE LYDIE', '481412A', '1991-11-20', 'DALOA PREF', NULL, '06 62 11 63', '41 65 89 66', 'F', NULL, NULL, 'datinhanmohokelydie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.261429', '2025-11-06 15:29:40.977224', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1017, NULL, NULL, NULL, 1, 1, NULL, 'KANGOUTE', 'FANTA', '811076N', '1994-01-06', 'ABIDJAN ADM', NULL, '07 59 61 98', NULL, 'F', NULL, NULL, 'kangoutefantaa@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-16', NULL, '2025-10-27 12:16:50.902277', '2025-11-06 15:29:14.875607', NULL, NULL, 6, 44, 36, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2054-12-31', 'SECRETAIRE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2021-04-16', '2021-06-10', NULL, 181, NULL);
INSERT INTO public.agents VALUES (1020, NULL, NULL, NULL, 1, 1, NULL, 'NIANGO', 'JEAN PHILIPPE', '255532W', '1967-07-03', 'ABIDJAN ADM', NULL, '34712289/1938', '08 20 32 41', 'M', NULL, NULL, 'phniango@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1996-02-05', NULL, '2025-10-27 12:16:50.917866', '2025-11-06 15:29:15.134551', NULL, NULL, 5, 41, 37, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2032-12-31', 'INSPECTEUR TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2005-06-23', '2022-02-07', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1021, NULL, NULL, NULL, 1, 1, NULL, 'BOKA', 'BI YAO GEORGES', '255533X', '1970-02-22', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'bokabiyaogeorge@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1996-02-05', NULL, '2025-10-27 12:16:50.924945', '2025-11-06 15:29:15.148978', NULL, NULL, 5, 41, 37, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2035-12-31', 'INSPECTEUR GENERAL', NULL, NULL, NULL, NULL, NULL, '2001-11-14', '2009-06-18', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1023, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'SOBE CASIMIR', '275295D', '1966-07-25', 'ABIDJAN ADM', NULL, '02 -2 7- 56', '07 -8 6- 66', 'M', NULL, NULL, 'sobef@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-01-04', NULL, '2025-10-27 12:16:50.935294', '2025-11-06 15:29:15.1557', NULL, NULL, 5, 39, 22, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2031-12-31', 'INSPECTEUR TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2019-07-11', '2021-02-22', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1243, NULL, NULL, NULL, 1, 1, NULL, 'MAMBO', 'CHO GERALDINE', '826007R', '1991-11-22', 'ABIDJAN ADM', NULL, NULL, '01 51 03 09', 'F', NULL, NULL, 'geraldemambo@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-24', NULL, '2025-10-27 12:16:52.394126', '2025-11-06 15:29:33.153912', NULL, NULL, 6, 44, 41, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 234, '2051-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-03-24', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1296, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AYA ANGELINE', '323856X', '1979-04-03', 'ABIDJAN ADM', NULL, '5007650', '01 27 00 55', 'F', NULL, NULL, 'kouadioaya19@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:52.668391', '2025-11-06 15:29:35.227587', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2006-12-06', NULL, 166, NULL);
INSERT INTO public.agents VALUES (1484, NULL, NULL, NULL, 1, 1, NULL, 'DIOMANDE', 'MARIE-DANIELLE', '832854L', '1993-09-12', 'BOUAKE PREF', NULL, '08 58 23 67', '07 08 58 23', 'F', NULL, NULL, 'mariedaniellediomande48@gmail.', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-25', NULL, '2025-10-27 12:16:53.964', '2025-11-06 15:29:40.001882', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-25', '2022-06-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1501, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'DAOUDA', '480518X', '1989-12-16', 'KATIOLA PREF', NULL, '59 58 95 80', NULL, 'M', NULL, NULL, 'daoudbamba222@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:54.095278', '2025-11-06 15:29:40.399615', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1563, NULL, NULL, NULL, 1, 1, NULL, 'GOGOUA', 'AGO ISABELLE', '481526C', '1985-05-19', 'DIVO PREF', NULL, '6 87 88 93', '55 -9 9- 52', 'F', NULL, NULL, 'Deborahtape48@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-10', NULL, '2025-10-27 12:16:54.399284', '2025-11-06 15:29:41.490048', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-10', '2020-03-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1569, NULL, NULL, NULL, 1, 1, NULL, 'BLE', 'NINA HUGUETTE', '434033H', '1978-07-06', 'MAN PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-12-13', NULL, '2025-10-27 12:16:54.439278', '2025-11-06 15:29:41.82717', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-12-13', '2016-12-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1573, NULL, NULL, NULL, 1, 1, NULL, 'SERI', 'LAIKAGNON KARIM INNOCENT', '815490K', '1987-06-08', 'MAN PREF', NULL, '07 48 84 17', '05 05 22 33', 'M', NULL, NULL, 'serilaikagnon@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-15', NULL, '2025-10-27 12:16:54.467854', '2025-11-06 15:29:41.835167', NULL, NULL, 6, 42, 29, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-15', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1583, NULL, NULL, NULL, 1, 1, NULL, 'SABANGNI', 'TIEGNINON IDA AMELIE', '313047V', '1973-12-30', 'DANANE PREF', NULL, '47 16 23 23', '54 94 42 08', 'F', NULL, NULL, 'Idasabangni01@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:54.55937', '2025-11-06 15:29:42.011317', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 257, '2038-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2014-05-22', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1619, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'KOUADIO GERMAIN', '480638F', '1979-11-16', 'KORHOGO PREF', NULL, '89 53 69 21', '76 42 78 25', 'M', NULL, NULL, 'habakukkouadio07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-26', NULL, '2025-10-27 12:16:55.043213', '2025-11-06 15:29:42.792004', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-26', '2020-02-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1620, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'KONAN FIRMIN', '480695Z', '1978-10-11', 'KORHOGO PREF', NULL, '49 40 05 54', '85 64 19 32', 'M', NULL, NULL, 'koffikonanfirmin38@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:55.049337', '2025-11-06 15:29:42.79433', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1648, NULL, NULL, NULL, 1, 1, NULL, 'KAMENAN', 'DESIRE', '291175V', '1972-08-13', 'ODIENNE PREF', NULL, '36850416', '04 28 26 86', 'M', NULL, NULL, 'kamenandesire@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-11-06', NULL, '2025-10-27 12:16:55.224529', '2025-11-06 15:29:43.336993', NULL, NULL, 5, 38, 23, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 264, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 264, '2037-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2002-11-06', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1718, NULL, NULL, NULL, 1, 1, NULL, 'NIGO', 'GBLIMIAN PAUL FLORA', '485206Y', '1993-01-13', 'MANKONO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-04-27', NULL, '2025-10-27 12:16:55.540619', '2025-11-06 15:29:44.64983', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 270, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 270, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-04-27', '2020-05-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1800, NULL, NULL, NULL, 2, 1, NULL, 'N''GUETTIA', 'MARCEL KOUADIO', '506074T', '1967-09-12', 'ABIDJAN ADM', NULL, '07 07 71 00', NULL, 'M', NULL, NULL, 'nguetnaf@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-11', NULL, '2025-10-27 12:16:55.915911', '2025-11-06 15:29:48.905201', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 35, 15, '2027-12-31', 'PRESIDENT', NULL, NULL, NULL, NULL, NULL, NULL, '2019-02-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1806, NULL, NULL, NULL, 2, 1, NULL, 'KONE', 'FANTA FATIM', '982941J', '2001-12-09', NULL, NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-02', NULL, '2025-10-27 12:16:55.941781', '2025-11-06 15:29:48.963553', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19, NULL, NULL, NULL, NULL, NULL, 36, 16, '2061-12-31', 'JURISTE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (147, 7, NULL, 1, 1, 2, NULL, 'DIABATE', 'FATOU', 'DC-EDU-2025-001', '1980-01-15', 'ABIDJAN', 45, '+22507000000', NULL, 'M', NULL, NULL, 'f.directeurcentral@nouveau.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-01-07', '2025-10-16', '2025-10-13 01:03:18.804917', '2025-11-06 15:29:09.692336', NULL, 1, 6, 38, NULL, 23, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2045-12-31', NULL, NULL, 'Exempté', '2555H', '2025-10-22', NULL, '2025-10-20', '2025-10-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1015, NULL, NULL, NULL, 1, 1, NULL, 'OGOU', 'NEE MONNEY EDITH S.', '323311U', '1975-11-01', 'ABIDJAN ADM', NULL, '20347967', '03 07 82 93', 'F', NULL, NULL, 'ogouedithsylvie@gmaim.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-04-20', NULL, '2025-10-27 12:16:50.891011', '2025-11-06 15:29:14.869654', NULL, NULL, 5, 37, 27, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2035-12-31', 'ATTACHE DES FINANCES', NULL, NULL, NULL, NULL, NULL, '2007-04-20', '2024-01-31', NULL, 181, NULL);
INSERT INTO public.agents VALUES (1016, NULL, NULL, NULL, 1, 1, NULL, 'YEHI', 'TEA OLIVE EPSE ILLARY', '419669L', '1977-12-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'yeiteaolive@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-11-24', NULL, '2025-10-27 12:16:50.896444', '2025-11-06 15:29:14.873075', NULL, NULL, 5, 37, 27, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-11-24', '2018-04-20', NULL, 181, NULL);
INSERT INTO public.agents VALUES (1611, NULL, NULL, NULL, 1, 1, NULL, 'LOKO', 'ROHON CHARLES MONDEZIRE', '815473M', '1993-09-20', 'SASSANDRA PREF', NULL, '07 89 81 29', NULL, 'F', NULL, NULL, 'lokomondezire@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.982946', '2025-11-06 15:29:42.60864', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 260, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 260, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1697, NULL, NULL, NULL, 1, 1, NULL, 'ECHIMANE', 'EHUA JEANNE D''ARC V.', '852216Y', '1992-12-28', 'BOUAFLE PREF', NULL, '07 59 16 95', NULL, 'F', NULL, NULL, 'echimanevanessa@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:55.4498', '2025-11-06 15:29:43.912578', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 268, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1801, NULL, NULL, NULL, 2, 1, NULL, 'SANOGO', 'LAMINE', '982973J', '1977-10-09', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-11', NULL, '2025-10-27 12:16:55.922447', '2025-11-06 15:29:48.907778', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 35, 15, '2037-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2019-01-11', '2019-01-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1716, NULL, NULL, NULL, 1, 1, NULL, 'AKMEL', 'JEAN MARTIAL', '304898G', '1981-01-28', 'MANKONO PREF', NULL, '20-33-73-21', '05 31 07 43', 'M', NULL, NULL, 'poussin205@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-27', NULL, '2025-10-27 12:16:55.530279', '2025-11-06 15:29:44.49488', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 270, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 270, '2046-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2004-12-27', '2022-07-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1717, NULL, NULL, NULL, 1, 1, NULL, 'SANGARE', 'FAKOUA', '863462S', '1995-10-02', 'MANKONO PREF', NULL, '57 93 95 32', '05 02 63 75', 'M', NULL, NULL, 'sangarefakoua57@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:55.5335', '2025-11-06 15:29:44.587254', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 270, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 270, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-04-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1754, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'ROSE LAETITIA', '827422E', '1990-06-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'latikouak@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-22', NULL, '2025-10-27 12:16:55.713308', '2025-11-06 15:29:46.593981', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 287, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-22', NULL, NULL, 169, NULL);
INSERT INTO public.agents VALUES (1602, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'MAH MATOGOMA', '887249D', '2001-02-05', 'SAN-PEDRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-20', NULL, '2025-10-27 12:16:54.927565', '2025-11-06 15:29:42.5735', NULL, NULL, 8, 47, 33, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 258, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (4, 1, 2, 1, 2, 2, 3, 'DIABATE', 'PAUL', 'RH003', '1978-07-10', 'DALOA', 47, '+225 07 34 56 78', '+225 05 34 56 78', 'M', 'DIABATE AMINATA', 'DIABATE SÃ©KOU', 'paul.diabate@rh.gouv.ci', NULL, 'FATOU', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-07-10', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:03.47065', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2038-12-31', NULL, NULL, NULL, '12345', '2025-10-13', NULL, NULL, NULL, '1452QS', NULL, NULL);
INSERT INTO public.agents VALUES (65, NULL, NULL, NULL, 2, 4, NULL, 'agent', 'sante1', 'MAT-010', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.sante1@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.320955', '2025-11-06 15:29:08.186031', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1623, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'AHOU EMMA', '815468Y', '1995-01-15', 'KORHOGO PREF', NULL, '07 47 45 04', NULL, 'F', NULL, NULL, 'kouassiemma5@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-05', NULL, '2025-10-27 12:16:55.070113', '2025-11-06 15:29:42.799555', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-05', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (10, 1, 2, 1, 2, 2, 9, 'KONE', 'Moussa', 'SANTE003', '1981-08-22', 'Divo', 43, '+225 07 90 12 34', '+225 05 90 12 34', 'M', 'KONE Fatou', 'KONE SÃ©kou', 'moussa.kone@sante.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-08-22', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:03.885252', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2041-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (13, 2, 2, 1, 2, 2, 12, 'KOUAME', 'AÃ¯cha', 'FIN003', '1986-10-17', 'Cocody', 38, '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'KOUAME Fatou', 'KOUAME Paul', 'aicha.kouame@finances.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-10-17', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:05.716409', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2046-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (16, 2, 2, 1, 2, 2, 15, 'TRAORE', 'Yaya', 'INT003', '1985-07-25', 'Treichville', 39, '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'TRAORE Fatou', 'TRAORE SÃ©kou', 'yaya.traore@interieur.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-07-25', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:06.778463', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2045-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (33, 2, 2, 1, 2, 2, 6, 'OUATTARA', 'Aminata', 'EDU-DALF-001', '1988-09-08', 'Yamoussoukro', NULL, '+225 07 67 89 01', NULL, 'F', 'OUATTARA Kadi', 'OUATTARA Ali', 'drh.dalf@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-09-08', NULL, '2025-09-13 14:40:37.43196', '2025-11-06 15:29:07.586259', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2048-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (63, NULL, NULL, NULL, 2, 2, NULL, 'agent', 'education1', 'MAT-007', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.education1@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.303865', '2025-11-06 15:29:07.902969', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1014, NULL, NULL, NULL, 2, 1, NULL, 'AKA', 'EPSE ALESSOU EBLAKOUBA M.T', '982998L', '1983-06-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'matheaka@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-10-01', NULL, '2025-10-27 12:16:50.883235', '2025-11-06 15:29:14.865057', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2043-12-31', 'CONSEILLER TECHNIQUE', NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1629, NULL, NULL, NULL, 1, 1, NULL, 'SILUE', 'PEGUITANDIO', '471757G', '1977-08-12', 'KORHOGO PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-15', NULL, '2025-10-27 12:16:55.111999', '2025-11-06 15:29:42.915253', NULL, NULL, 8, 47, 32, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2037-12-31', 'AGENT SPECIALISE DES TP', NULL, NULL, NULL, NULL, NULL, '2019-04-15', '2019-04-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1662, NULL, NULL, NULL, 1, 1, NULL, 'TAHA', 'KOULADEROU ATHANASE', '305831V', '1978-01-01', 'YAMOUSSOUKRO PREF', NULL, '30640815', '46 19 08 04', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-10', NULL, '2025-10-27 12:16:55.297888', '2025-11-06 15:29:43.515697', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 266, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-10', '2021-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1664, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'AYA GEORGETTE', '433382K', '1985-02-08', 'YAMOUSSOUKRO PREF', NULL, '07 07 59 05', NULL, 'F', NULL, NULL, 'georgykonan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-18', NULL, '2025-10-27 12:16:55.308868', '2025-11-06 15:29:43.573616', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 266, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-18', '2023-10-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1665, NULL, NULL, NULL, 1, 1, NULL, 'BILE', 'HENRI KONAN BEDIE', '466992Q', '1976-12-15', 'YAMOUSSOUKRO PREF', NULL, '77 -5 1- 51', '07 -6 4- 51', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-04', NULL, '2025-10-27 12:16:55.312228', '2025-11-06 15:29:43.576102', NULL, NULL, 5, 37, 26, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-04', '2024-07-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1666, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'ATHIAILAUD M. CANISIUS', '874654D', '1990-04-27', 'YAMOUSSOUKRO PREF', NULL, '78 17 34 21', NULL, 'M', NULL, NULL, 'kouakoumodeste67@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-06', NULL, '2025-10-27 12:16:55.31541', '2025-11-06 15:29:43.57875', NULL, NULL, 5, 37, 26, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-06-11', '2023-11-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1669, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'NEE TANO AKOUA EMMA', '447588Y', '1982-02-04', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:55.331332', '2025-11-06 15:29:43.590758', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 266, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-01-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (73, 1, 2, 1, 1, 1, NULL, 'TEST', 'DJELO', '1405121Q', '2002-09-25', 'LAKOTA', 23, '+2250507145485', '+225074512121', 'M', 'MARIE', 'PAUL', 'gouda@gmail.com', '2028-05-25', 'BLESSON', 0, 'COCODY', 'PALMERAIE', '654', 'COCODY', 'PALMERAIE', '5412', 'actif', '2025-09-25', NULL, '2025-09-25 15:00:06.775692', '2025-11-06 15:29:08.195082', 6, 1, 8, NULL, 20, NULL, 14, 21, 5, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, 8, 19, 15, 4, 6, NULL, NULL, NULL, '2062-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '14', NULL, NULL);
INSERT INTO public.agents VALUES (3, 2, 1, 1, 2, 2, 2, 'TRAORE', 'MARIE', 'RH002', '1985-03-20', 'BOUAKÃ©', 40, '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'TRAORE FATOU', 'TRAORE IBRAHIM', 'marie.traore@rh.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-03-20', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:02.633898', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2045-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (12, 1, 1, 1, 2, 2, 11, 'DIABATE', 'SÃ©kou', 'FIN002', '1979-02-28', 'Bingerville', 45, '+225 07 12 34 56', '+225 05 12 34 56', 'M', 'DIABATE Mariam', 'DIABATE Oumar', 'sekou.diabate@finances.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-02-28', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:04.34995', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2039-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (15, 1, 1, 1, 2, 2, 14, 'KONE', 'Kadi', 'INT002', '1983-11-12', 'Plateau', 41, '+225 07 45 67 89', '+225 05 45 67 89', 'F', 'KONE AÃ¯cha', 'KONE Moussa', 'kadi.kone@interieur.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-12', NULL, '2025-09-10 22:39:53.692597', '2025-11-06 15:29:06.070325', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2043-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1799, NULL, NULL, NULL, 1, 1, NULL, 'SAHLY', 'NEJLA HASSANE', '827509W', '1993-10-03', 'ABIDJAN ADM', NULL, '07 08 44 02', NULL, 'F', NULL, NULL, 'sahlynejla@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-07', NULL, '2025-10-27 12:16:55.912831', '2025-11-06 15:29:48.902085', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 35, 15, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-07', '2022-05-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1802, NULL, NULL, NULL, 1, 1, NULL, 'GADDAH', 'KOUASSI SERGE OLIVIER', '355870R', '1977-04-11', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'olivier.kada@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-07-24', NULL, '2025-10-27 12:16:55.926141', '2025-11-06 15:29:48.910492', NULL, NULL, 5, 40, 92, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 36, 16, '2042-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2015-06-05', '2015-06-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1803, NULL, NULL, NULL, 1, 1, NULL, 'APHING-KOUASSI', 'N''DRI G.', '290488B', '1966-10-22', 'ABIDJAN ADM', NULL, '20347925', NULL, 'M', NULL, NULL, 'germain_ak@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-02-11', NULL, '2025-10-27 12:16:55.93026', '2025-11-06 15:29:48.912703', NULL, NULL, 5, 39, 91, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 36, 16, '2031-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2006-10-27', '2020-02-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1804, NULL, NULL, NULL, 1, 1, NULL, 'LOUKOU', 'KOUAKOU DANIEL', '343470L', '1973-11-16', NULL, NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-10-25', NULL, '2025-10-27 12:16:55.933273', '2025-11-06 15:29:48.916447', NULL, NULL, 5, 38, 62, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19, NULL, NULL, NULL, NULL, NULL, 36, 16, '2038-12-31', 'INCONNUE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (31, 1, 2, 1, 2, 2, 4, 'KONE', 'Fatou', 'EDU-DEP-001', '1982-11-25', 'Korhogo', NULL, '+225 07 45 67 89', NULL, 'F', 'KONE Mariam', 'KONE Moussa', 'drh.dep@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-25', NULL, '2025-09-13 14:40:37.43196', '2025-11-06 15:29:07.200387', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2042-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (32, 1, 1, 1, 2, 2, 5, 'SANGARE', 'Ibrahim', 'EDU-DES-001', '1975-05-12', 'San-Pédro', NULL, '+225 07 56 78 90', NULL, 'M', 'SANGARE Aïcha', 'SANGARE Oumar', 'drh.des@education.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-05-12', NULL, '2025-09-13 14:40:37.43196', '2025-11-06 15:29:07.496108', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2035-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (62, NULL, NULL, NULL, 2, 2, NULL, 'admin', 'education', 'MAT-006', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.education@gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.289206', '2025-11-06 15:29:07.842692', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2040-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (989, NULL, NULL, NULL, 1, 1, NULL, 'PADOU', 'PADOU SYLVAIN', '889566V', '1972-12-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'padousylvain9@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-13', NULL, '2025-10-27 12:16:50.746452', '2025-11-06 15:29:10.387608', NULL, NULL, 6, 42, 29, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2032-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-13', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1792, NULL, NULL, NULL, 1, 1, NULL, 'KASSI', 'KOUATRIN', '203254L', '1961-01-12', 'ABIDJAN ADM', NULL, '07 72 79 01', '40 90 44 77', 'M', NULL, NULL, 'kassikouatrin@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1987-10-05', NULL, '2025-10-27 12:16:55.882905', '2025-11-06 15:29:48.631826', NULL, NULL, 5, 39, 22, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2026-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2020-09-11', '2020-09-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1793, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'SERGE DIMITRI', '306629K', '1974-07-13', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-11-30', NULL, '2025-10-27 12:16:55.888943', '2025-11-06 15:29:48.714492', NULL, NULL, 5, 39, 22, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2039-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2020-09-11', '2020-09-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1794, NULL, NULL, NULL, 1, 1, NULL, 'BASSEU', 'JAMY', '237252B', '1962-07-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1989-10-20', NULL, '2025-10-27 12:16:55.89212', '2025-11-06 15:29:48.751204', NULL, NULL, 5, 38, 79, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2027-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2021-01-18', '2021-01-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1795, NULL, NULL, NULL, 1, 1, NULL, 'LEKEHI', 'NEE KADIO N. B. BRICE C', '870807G', '1984-04-30', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kadiobrice84@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-02', NULL, '2025-10-27 12:16:55.895704', '2025-11-06 15:29:48.753741', NULL, NULL, 5, 37, 89, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 34, 14, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-01', '2025-05-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1796, NULL, NULL, NULL, 1, 1, NULL, 'ASSABE', 'APO ESTELLE', '483689S', '1983-05-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:55.899639', '2025-11-06 15:29:48.793626', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 34, 14, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2020-06-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1805, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'YAO PIERRE', '162855V', '1960-07-01', 'ABIDJAN ADM', NULL, '33800978', '07 08 62 66', 'M', NULL, NULL, 'pikykouadio@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1984-11-02', NULL, '2025-10-27 12:16:55.939051', '2025-11-06 15:29:48.920961', NULL, NULL, 5, 38, 68, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 36, 16, '2025-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2001-01-31', NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1797, NULL, NULL, NULL, 1, 1, NULL, 'DJANGO', 'JEAN MATHIAS', '885394M', '1974-02-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-27', NULL, '2025-10-27 12:16:55.905807', '2025-11-06 15:29:48.843975', NULL, NULL, 5, 38, 46, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 35, 15, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2024-03-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1798, NULL, NULL, NULL, 1, 1, NULL, 'KOUABRAN', 'KOFFI EL HADJI', '885447J', '1979-01-01', 'ABIDJAN ADM', NULL, '07 81 11 65', NULL, 'M', NULL, NULL, 'koffikouabran@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-27', NULL, '2025-10-27 12:16:55.909445', '2025-11-06 15:29:48.898868', NULL, NULL, 5, 37, 27, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 35, 15, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (979, NULL, NULL, NULL, 2, 1, NULL, 'M''BAHIA', 'BLE LEATITIA JOSEPHA', '503281V', '1977-02-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-07-12', NULL, '2025-10-27 12:16:50.663238', '2025-11-06 15:29:09.7503', NULL, NULL, NULL, NULL, 21, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2037-12-31', 'CHEF DE CABINET', NULL, NULL, NULL, NULL, NULL, '2017-07-12', '2017-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (980, NULL, NULL, NULL, 1, 1, NULL, 'KODJO', 'GUY FRANCIS', '201957B', '1960-03-29', 'ABIDJAN ADM', NULL, '20347919', NULL, 'M', NULL, NULL, 'guykodjo2001@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1991-10-01', NULL, '2025-10-27 12:16:50.692964', '2025-11-06 15:29:09.757267', NULL, NULL, 5, 39, 22, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2025-12-31', 'CONSEILLER TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '1994-08-04', '2018-04-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (984, NULL, NULL, NULL, 1, 1, NULL, 'KOYA', 'MIANGNIN SOKOUA NOEL', '366249Z', '1970-12-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'koyatriomphe03@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-01-13', NULL, '2025-10-27 12:16:50.717143', '2025-11-06 15:29:10.105154', NULL, NULL, 5, 37, 26, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2030-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2018-02-14', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (990, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'AMENAN MANUELA ARSENE', '468207P', '1986-09-22', 'ABIDJAN ADM', NULL, '08 84 61 39', NULL, 'F', NULL, NULL, 'puce', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-25', NULL, '2025-10-27 12:16:50.752201', '2025-11-06 15:29:10.445595', NULL, NULL, 6, 42, 30, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2046-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2019-02-25', '2019-05-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1003, NULL, NULL, NULL, 2, 1, NULL, 'KOBENAN', 'MOUSTAPHA B. ANDERSON', '982982C', '1992-06-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-01-10', NULL, '2025-10-27 12:16:50.823816', '2025-11-06 15:29:12.241199', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2052-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-01-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1004, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'ALIX FLORE N''GUESSAN', '982983D', '1983-01-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-01-10', NULL, '2025-10-27 12:16:50.829135', '2025-11-06 15:29:12.637428', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2043-12-31', 'ASSISTANT', NULL, NULL, NULL, NULL, NULL, NULL, '2022-01-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1005, NULL, NULL, NULL, 2, 1, NULL, 'KOROMPLI', 'MARIE JOSEPHINE', '982984E', '1986-05-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-01-10', NULL, '2025-10-27 12:16:50.833624', '2025-11-06 15:29:13.131005', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2046-12-31', 'SECRETAIRE PARTICULIERE', NULL, NULL, NULL, NULL, NULL, NULL, '2022-01-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1013, NULL, NULL, NULL, 2, 1, NULL, 'GNAPI', 'DJESSOU ARMEL SYLVERE', '982996A', '1984-06-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-02-12', NULL, '2025-10-27 12:16:50.879055', '2025-11-06 15:29:14.703207', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2044-12-31', 'CHAUFFEUR AU CABINET', NULL, NULL, NULL, NULL, NULL, NULL, '2023-01-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (981, NULL, NULL, NULL, 1, 1, NULL, 'DOSSANGO', 'KONE', '272129B', '1972-01-01', 'ABIDJAN ADM', NULL, '07 52 15 09', '45 99 63 35', 'M', NULL, NULL, 'dossangokone72@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:50.698614', '2025-11-06 15:29:10.049783', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2037-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2021-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (991, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'BOMO JULIE', '889425Q', '1985-04-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'missjuliekouassi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-13', NULL, '2025-10-27 12:16:50.75961', '2025-11-06 15:29:10.4558', NULL, NULL, 6, 42, 30, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2045-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2024-05-13', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (992, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'N''GUESSAN TOUSSAINT', '821007L', '1980-11-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-11-03', NULL, '2025-10-27 12:16:50.764044', '2025-11-06 15:29:10.865268', NULL, NULL, 6, 42, 31, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-11-03', '2023-03-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (993, NULL, NULL, NULL, 1, 1, NULL, 'KOUIDE', 'GILLES STEPHANE', '856634X', '1989-03-22', 'ABIDJAN ADM', NULL, '87 46 63 96', NULL, 'M', NULL, NULL, 'angemoreldodo59@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-08', NULL, '2025-10-27 12:16:50.769902', '2025-11-06 15:29:10.86867', NULL, NULL, 8, 47, 32, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-08', '2023-03-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (994, NULL, NULL, NULL, 1, 1, NULL, 'VLONHOU', 'SONZAHI PIERRE', '360923B', '1971-11-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-07-20', NULL, '2025-10-27 12:16:50.776264', '2025-11-06 15:29:10.874744', NULL, NULL, 8, 47, 33, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2031-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-08-17', '2020-08-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1001, NULL, NULL, NULL, 2, 1, NULL, 'CISSE', 'VACABA REHAN', '982953N', '1962-02-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-14', NULL, '2025-10-27 12:16:50.813057', '2025-11-06 15:29:11.543996', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2022-12-31', 'CONSEILLER TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2021-06-14', '2021-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1006, NULL, NULL, NULL, 2, 1, NULL, 'CISSE', 'VASSIRIKI', '982827G', '1968-12-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2014-03-01', NULL, '2025-10-27 12:16:50.840063', '2025-11-06 15:29:13.575891', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2028-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2014-03-01', '2014-12-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1007, NULL, NULL, NULL, 2, 1, NULL, 'KONE', 'DJAKARIDIA', '982864M', '1967-07-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-06', NULL, '2025-10-27 12:16:50.845277', '2025-11-06 15:29:14.056426', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2027-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2015-10-06', '2015-10-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1008, NULL, NULL, NULL, 2, 1, NULL, 'AMBA', 'HYACINTE', '982911C', '1970-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-05', NULL, '2025-10-27 12:16:50.849653', '2025-11-06 15:29:14.163747', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2030-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2017-01-05', '2017-01-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1009, NULL, NULL, NULL, 2, 1, NULL, 'SIAN', 'YAO KOUAME', '982918K', '1982-12-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-02', NULL, '2025-10-27 12:16:50.855891', '2025-11-06 15:29:14.199301', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2042-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2018-01-02', '2018-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1010, NULL, NULL, NULL, 2, 1, NULL, 'BAMBA', 'IBRAHIM', '982965J', '1998-03-13', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-03', NULL, '2025-10-27 12:16:50.861928', '2025-11-06 15:29:14.208465', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-03', '2021-05-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1011, NULL, NULL, NULL, 2, 1, NULL, 'FATH', 'METOU BINTOU MALICK', '982994G', '1983-10-06', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'fsallneuroscience@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-02', NULL, '2025-10-27 12:16:50.866751', '2025-11-06 15:29:14.528254', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2043-12-31', 'ASSISTANTE PARTICULIERE DU MINISTRE', NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1012, NULL, NULL, NULL, 2, 1, NULL, 'KOUAO-BILE', 'AMEID', '982995H', '1999-01-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'ameidhouaobile@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-02', NULL, '2025-10-27 12:16:50.873977', '2025-11-06 15:29:14.595047', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2059-12-31', 'CHEF DE PROTOCOLE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (982, NULL, NULL, NULL, 1, 1, NULL, 'EDY', 'ANDO FABRICE CLAVER', '434689Y', '1990-09-18', 'ABIDJAN ADM', NULL, '47 /7 1/ 66', '46 /2 1/ 09', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-12-29', NULL, '2025-10-27 12:16:50.706342', '2025-11-06 15:29:10.054666', NULL, NULL, 5, 38, 24, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2055-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2018-08-13', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1000, NULL, NULL, NULL, 2, 1, NULL, 'KOUDOU', 'NEE FOFANA KADY', '982922F', '1991-05-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-07', NULL, '2025-10-27 12:16:50.807937', '2025-11-06 15:29:11.478972', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2051-12-31', 'ASSISTANTE PARTICULIERE DU MINISTRE', NULL, NULL, NULL, NULL, NULL, '2019-01-07', '2019-01-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (988, NULL, NULL, NULL, 1, 1, NULL, 'N''DA', 'KOBLE SIDOINE', '826255V', '1983-11-08', 'ABIDJAN ADM', NULL, '07 57 88 48', '01 40 21 97', 'M', NULL, NULL, 'ndasidoine99@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-12', NULL, '2025-10-27 12:16:50.74169', '2025-11-06 15:29:10.351146', NULL, NULL, 6, 42, 29, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2043-12-31', 'SECRETAIRE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2022-04-12', '2022-04-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1060, NULL, NULL, NULL, 1, 1, NULL, 'BLYO', 'PARIA', '272142G', '1976-10-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'pariablyo@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:51.167596', '2025-11-06 15:29:18.098713', NULL, NULL, 5, 38, 23, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 222, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2025-08-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1061, NULL, NULL, NULL, 1, 1, NULL, 'GOGOUA', 'OGOU TANGUY RUFFIN', '468200U', '1986-10-20', 'ABIDJAN ADM', NULL, '49 16 96 34', NULL, 'M', NULL, NULL, 'gogouatanguy@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-25', NULL, '2025-10-27 12:16:51.176365', '2025-11-06 15:29:18.100891', NULL, NULL, 6, 44, 48, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-25', '2019-03-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1062, NULL, NULL, NULL, 1, 1, NULL, 'ADOU', 'NEE N''ZIEN AMAH BOAMIN', '433341Z', '1980-02-26', 'ABIDJAN ADM', NULL, '01 01 77 67', '88 68 41 31', 'F', NULL, NULL, 'felyboamin02@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-17', NULL, '2025-10-27 12:16:51.18766', '2025-11-06 15:29:18.102988', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-17', '2016-12-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1063, NULL, NULL, NULL, 1, 1, NULL, 'KY', 'BARAKISSA', '815472L', '1985-05-01', 'ABIDJAN ADM', NULL, NULL, '05 05 43 56', 'F', NULL, NULL, 'kybarakissa@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:51.196781', '2025-11-06 15:29:18.106699', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1064, NULL, NULL, NULL, 1, 1, NULL, 'MONNY', 'N''GUESSAN MYRIAME LAURE', '855864V', '1983-04-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'mymielaure@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:51.205212', '2025-11-06 15:29:18.212706', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1070, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'TIEMELE MAXIME', '481534C', '1977-07-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-10', NULL, '2025-10-27 12:16:51.260873', '2025-11-06 15:29:18.430253', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-10', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1071, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'NEE YELBI RAMA.', '867627T', '1989-06-05', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-05-25', NULL, '2025-10-27 12:16:51.270389', '2025-11-06 15:29:18.432551', NULL, NULL, 9, 46, 49, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 222, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-05-25', '2023-06-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1072, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'AIME', '982826F', '1983-08-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'aimeouattara566@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-02', NULL, '2025-10-27 12:16:51.279089', '2025-11-06 15:29:18.442527', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 222, '2043-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2025-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1078, NULL, NULL, NULL, 1, 1, NULL, 'GBOKHOU', 'NEE AKPO GEORGETTE', '272132W', '1976-10-03', 'ABIDJAN ADM', NULL, '20347963', '58 09 24 85', 'F', NULL, NULL, 'sephoragbokhou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:51.334597', '2025-11-06 15:29:18.529042', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2041-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-02-07', NULL, 140, NULL);
INSERT INTO public.agents VALUES (1082, NULL, NULL, NULL, 2, 1, NULL, 'ASSARI', 'YAWA F. EPSE AKPALE', '266393E', '1973-10-18', 'ABIDJAN ADM', NULL, '20347925', '20 21 82 96', 'F', NULL, NULL, 'bellicital@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2000-05-08', NULL, '2025-10-27 12:16:51.371493', '2025-11-06 15:29:18.538935', NULL, NULL, NULL, NULL, 50, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2033-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2012-09-24', '2012-09-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1084, NULL, NULL, NULL, 1, 1, NULL, 'KRA', 'KOFFI ROMARIC', '481466Q', '1983-12-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:51.387839', '2025-11-06 15:29:18.702573', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1085, NULL, NULL, NULL, 1, 1, NULL, 'TANO', 'KOUAKOU HABIB', '483528Q', '1986-11-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-11', NULL, '2025-10-27 12:16:51.395107', '2025-11-06 15:29:18.72214', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1086, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'SIDY', '825998N', '1980-01-24', 'ABIDJAN ADM', NULL, '07 47 93 10', '05 44 93 72', 'M', NULL, NULL, 'bambasidy0@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-30', NULL, '2025-10-27 12:16:51.400749', '2025-11-06 15:29:18.729043', NULL, NULL, 8, 47, 32, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2040-12-31', 'AGENT SPECIALISE DES TP', NULL, NULL, NULL, NULL, NULL, '2022-03-30', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1087, NULL, NULL, NULL, 1, 1, NULL, 'ADJOUA', 'FRANCOISE KOUAKOU', '807569E', '1970-03-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-09', NULL, '2025-10-27 12:16:51.408611', '2025-11-06 15:29:18.736802', NULL, NULL, 8, 47, 51, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2030-12-31', 'AGENT DE MENAGE', NULL, NULL, NULL, NULL, NULL, '2021-02-09', '2021-02-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1088, NULL, NULL, NULL, 1, 1, NULL, 'N''CHO', 'NEE OUSSOU NG. NINA B.', '359184A', '1981-07-11', 'ABIDJAN ADM', NULL, '23573208', '48 51 99 34', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:51.416149', '2025-11-06 15:29:18.769748', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2015-12-23', NULL, NULL, 17);
INSERT INTO public.agents VALUES (1089, NULL, NULL, NULL, 1, 1, NULL, 'ZOH', 'ANGE MARIE', '468852D', '1985-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-05', NULL, '2025-10-27 12:16:51.425832', '2025-11-06 15:29:18.772388', NULL, NULL, 6, 44, 52, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 223, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-03-05', '2019-03-20', NULL, NULL, 17);
INSERT INTO public.agents VALUES (1090, NULL, NULL, NULL, 2, 1, NULL, 'KRA', 'YAO FRANCK', '982867Q', '1981-09-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-02-14', NULL, '2025-10-27 12:16:51.43266', '2025-11-06 15:29:18.901125', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2017-02-09', '2017-02-09', NULL, NULL, 17);
INSERT INTO public.agents VALUES (1079, NULL, NULL, NULL, 1, 1, NULL, 'AMANI', 'AHOU BATHE CHRISTINE', '337222Z', '1980-07-24', 'ABIDJAN ADM', NULL, '20347430', '01 89 40 95', 'F', NULL, NULL, 'christineamani25@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:51.344372', '2025-11-06 15:29:18.531097', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2008-01-30', NULL, 140, NULL);
INSERT INTO public.agents VALUES (1080, NULL, NULL, NULL, 1, 1, NULL, 'AMANI', 'NEE BOMO ROSELINE R', '337225U', '1979-06-03', 'ABIDJAN ADM', NULL, '20347429', '40 98 70 96', 'F', NULL, NULL, 'roselineamaniamani@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:51.352031', '2025-11-06 15:29:18.533161', NULL, NULL, 6, 44, 28, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2008-01-30', NULL, 140, NULL);
INSERT INTO public.agents VALUES (1081, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'N''GOLO ISSOUF', '359187D', '1977-12-29', 'ABIDJAN ADM', NULL, '20347432', '03 80 55 56', 'M', NULL, NULL, 'traorengolo72@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:51.36166', '2025-11-06 15:29:18.536889', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, 140, NULL);
INSERT INTO public.agents VALUES (1083, NULL, NULL, NULL, 1, 1, NULL, 'KANGA', 'AHOU FELICITE', '452000F', '1985-12-30', 'ABIDJAN ADM', NULL, '09 30 05 92', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-23', NULL, '2025-10-27 12:16:51.379271', '2025-11-06 15:29:18.608771', NULL, NULL, 6, 42, 30, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 223, '2045-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2018-01-23', '2020-09-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1105, NULL, NULL, NULL, 1, 1, NULL, 'GNEKPE', 'LALLIER RAYMOND', '323855W', '1970-05-02', 'ABIDJAN ADM', NULL, '20-34-79-51', NULL, 'M', NULL, NULL, 'raymondgnekpe@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:51.540035', '2025-11-06 15:29:19.969694', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2030-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2006-12-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1106, NULL, NULL, NULL, 1, 1, NULL, 'DONATIEN', 'MARCELLE AUDREY', '435599P', '1988-06-07', 'ABIDJAN ADM', NULL, '78 75 60 76', NULL, 'F', NULL, NULL, 'audrey.donatien@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-02-13', NULL, '2025-10-27 12:16:51.547927', '2025-11-06 15:29:19.972427', NULL, NULL, 5, 37, 26, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2048-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2017-02-13', '2017-03-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1107, NULL, NULL, NULL, 1, 1, NULL, 'TRA', 'BI BOTTY EMMANUEL', '482009T', '1979-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:51.557488', '2025-11-06 15:29:19.974996', NULL, NULL, 8, 47, 32, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 224, '2039-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2020-07-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1112, NULL, NULL, NULL, 2, 1, NULL, 'DIABAGATE', 'BARAKIS', '982989K', '1994-02-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'barakisdiab@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-02', NULL, '2025-10-27 12:16:51.594224', '2025-11-06 15:29:19.986267', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2054-12-31', 'CHEF DE DEPARTEMENT', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1040, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'ADIZATOU', '902371E', '1997-06-22', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'missbamba2206@gmaill.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-10-01', NULL, '2025-10-27 12:16:51.032344', '2025-11-06 15:29:15.766461', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2057-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-01-10', '2024-10-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1114, NULL, NULL, NULL, 1, 1, NULL, 'MACKY', 'NEE KONE K. ILARIA-R.', '307251R', '1977-09-30', 'ABIDJAN ADM', NULL, '07 88 77 29', NULL, 'F', NULL, NULL, 'koneilaria@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-01-12', NULL, '2025-10-27 12:16:51.611202', '2025-11-06 15:29:20.11493', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 224, '2042-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2005-01-12', '2023-10-09', NULL, 144, NULL);
INSERT INTO public.agents VALUES (1115, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'NAGATCHO FATIMATA', '484367X', '1992-07-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-30', NULL, '2025-10-27 12:16:51.621272', '2025-11-06 15:29:20.118525', NULL, NULL, 6, 44, 56, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 28, 224, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-30', '2020-06-10', NULL, 144, NULL);
INSERT INTO public.agents VALUES (1116, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'KOUAME ALEXIS', '982868Z', '1984-05-13', 'ABIDJAN ADM', NULL, '08 21 18 82', NULL, 'M', NULL, NULL, 'yaokalexis03@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-04-03', NULL, '2025-10-27 12:16:51.627474', '2025-11-06 15:29:20.123132', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2044-12-31', 'ARCHIVISTE', NULL, NULL, NULL, NULL, NULL, '2016-04-03', '2016-04-03', NULL, 144, NULL);
INSERT INTO public.agents VALUES (1132, NULL, NULL, NULL, 1, 1, NULL, 'EBA', 'ROSEMONDE IMELDA AFFOUE', '481418Q', '1997-09-09', 'ABIDJAN ADM', NULL, '87 18 69 04', '88 42 12 72', 'F', NULL, NULL, 'imeldaeba95@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:51.734692', '2025-11-06 15:29:21.339596', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2022-11-29', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1137, NULL, NULL, NULL, 1, 1, NULL, 'GLAROU', 'NEE BAH LARISSA', '483698T', '1979-03-24', 'ABIDJAN ADM', NULL, '48 02 60 40', '07 03 81 71', 'F', NULL, NULL, 'Bahlarissa14@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:51.774044', '2025-11-06 15:29:21.722993', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-04-21', NULL, 147, NULL);
INSERT INTO public.agents VALUES (1138, NULL, NULL, NULL, 1, 1, NULL, 'GUESSAN', 'BI NEE ZEHI SELO E.', '297577W', '1965-09-24', 'ABIDJAN ADM', NULL, '05 63 58 24', '41 23 28 70', 'F', NULL, NULL, 'lisaguessan@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:51.780853', '2025-11-06 15:29:21.725479', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 225, '2025-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2003-10-01', '2021-12-22', NULL, 148, NULL);
INSERT INTO public.agents VALUES (1145, NULL, NULL, NULL, 2, 1, NULL, 'KOUMY', 'CHRISTIAN-E.BOHOUMAN', '506857Z', '1988-05-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'cbohouman@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-09', NULL, '2025-10-27 12:16:51.835391', '2025-11-06 15:29:22.162501', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2048-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1148, NULL, NULL, NULL, 1, 1, NULL, 'ALLADE', 'HERMANN N''DA ASSAMOI', '482306Z', '1981-08-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'h.allade@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-23', NULL, '2025-10-27 12:16:51.858045', '2025-11-06 15:29:22.97263', NULL, NULL, 5, 38, 59, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 226, '2046-12-31', 'INGENIEUR INFORMATICIEN', NULL, NULL, NULL, NULL, NULL, '2020-03-23', '2020-05-18', NULL, 149, NULL);
INSERT INTO public.agents VALUES (1150, NULL, NULL, NULL, 1, 1, NULL, 'LOGBO', 'JEAN BRET JUNIOR', '827781N', '1986-09-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'j.logbo@tourisme.gouve.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-26', NULL, '2025-10-27 12:16:51.870239', '2025-11-06 15:29:23.580999', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-26', '2022-06-02', NULL, 149, NULL);
INSERT INTO public.agents VALUES (1139, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'GNAMA I. EPSE TUO', '291171Z', '1972-02-26', 'ABIDJAN ADM', NULL, '05 02 63 99', '23 48 07 67', 'F', NULL, NULL, 'insatag@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-02-06', NULL, '2025-10-27 12:16:51.791033', '2025-11-06 15:29:21.730612', NULL, NULL, 6, 44, 28, 36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2032-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2003-02-06', '2003-02-06', NULL, 148, NULL);
INSERT INTO public.agents VALUES (1158, NULL, NULL, NULL, 1, 1, NULL, 'DIABATE', 'DOH', '420373G', '1975-10-22', 'ABIDJAN ADM', NULL, '40 33 00 78', NULL, 'M', NULL, NULL, 'diabatedoh@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-12-14', NULL, '2025-10-27 12:16:51.916739', '2025-11-06 15:29:25.998107', NULL, NULL, 8, 47, 32, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2035-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2015-12-14', '2019-11-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1159, NULL, NULL, NULL, 2, 1, NULL, 'SEOUE', 'GOULIZAN SYLVANUS', '506866S', '1972-05-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2014-12-29', NULL, '2025-10-27 12:16:51.923734', '2025-11-06 15:29:26.000984', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 227, '2032-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2014-12-29', '2022-02-07', NULL, 151, NULL);
INSERT INTO public.agents VALUES (1160, NULL, NULL, NULL, 2, 1, NULL, 'KOUAME', 'APPIA MICHEL', '982986G', '1995-12-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-08-01', NULL, '2025-10-27 12:16:51.928812', '2025-11-06 15:29:26.003406', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2055-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2023-08-01', NULL, 152, NULL);
INSERT INTO public.agents VALUES (1161, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'NEE DIBI AMLAN N.', '313054U', '1979-07-25', 'ABIDJAN ADM', NULL, '41 05 00 41', NULL, 'F', NULL, NULL, 'jeandanielledidi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-06', NULL, '2025-10-27 12:16:51.933005', '2025-11-06 15:29:26.005745', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 228, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-06', '2025-02-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1162, NULL, NULL, NULL, 1, 1, NULL, 'YASSELOU', 'NEE N''DA LOUKOU', '359136H', '1980-05-25', 'ABIDJAN ADM', NULL, '20347975', NULL, 'F', NULL, NULL, 'line.yass80@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:51.93964', '2025-11-06 15:29:26.008594', NULL, NULL, 5, 37, 25, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 228, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1183, NULL, NULL, NULL, 1, 1, NULL, 'TOUALY', 'ALAIN DUBONNET', '280155A', '1972-12-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2000-11-14', NULL, '2025-10-27 12:16:52.060658', '2025-11-06 15:29:27.608333', NULL, NULL, 5, 39, 22, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 231, '2037-12-31', 'ASSISTANT DU DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2020-09-07', '2023-01-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1184, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'FOUNGOTIE', '467560B', '1980-01-01', 'ABIDJAN ADM', NULL, '07 -5 6- 17', '05 26 70 99', 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-11', NULL, '2025-10-27 12:16:52.065027', '2025-11-06 15:29:27.736833', NULL, NULL, 5, 38, 59, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 231, '2045-12-31', 'INGENIEUR INFORMATICIEN', NULL, NULL, NULL, NULL, NULL, '2019-02-11', '2022-03-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1188, NULL, NULL, NULL, 1, 1, NULL, 'BOUO', 'MAHAN ALAIN ROLAND', '313048E', '1975-01-18', 'ABIDJAN ADM', NULL, '20337321', '23 45 92 30', 'M', NULL, NULL, 'boualain@gmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-04', NULL, '2025-10-27 12:16:52.08532', '2025-11-06 15:29:28.3162', NULL, NULL, 5, 37, 25, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 231, '2035-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2005-10-04', '2022-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1189, NULL, NULL, NULL, 1, 1, NULL, 'YAPO', 'APPI DOROTHEE VIVIANE', '319370X', '1976-06-23', 'ABIDJAN ADM', NULL, '20347989', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-08-03', NULL, '2025-10-27 12:16:52.091664', '2025-11-06 15:29:28.344345', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-08-03', '2025-03-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1193, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'ADJOUA MARIE-PAULE', '889388B', '1996-03-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kouakou14marie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-10', NULL, '2025-10-27 12:16:52.111308', '2025-11-06 15:29:28.960279', NULL, NULL, 6, 42, 30, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2056-12-31', 'SECRETAIRE ASSISTANT DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2024-10-05', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1194, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'TINNON', '887494C', '1984-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'konelosseny84@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-02', NULL, '2025-10-27 12:16:52.115815', '2025-11-06 15:29:29.224226', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-02-05', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1195, NULL, NULL, NULL, 1, 1, NULL, 'KOUA', 'MATHILDE GILDAS', '827768G', '1994-01-30', 'ABIDJAN ADM', NULL, '07 79 28 98', '05 74 40 19', 'M', NULL, NULL, 'kouagildasmathilde@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-21', NULL, '2025-10-27 12:16:52.121719', '2025-11-06 15:29:29.452862', NULL, NULL, 8, 47, 32, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 231, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-03-21', '2022-07-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1196, NULL, NULL, NULL, 2, 1, NULL, 'KONAN', 'YAO ALBAN', '982975L', '1976-05-11', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'konanyaoalban3@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-03', NULL, '2025-10-27 12:16:52.126171', '2025-11-06 15:29:29.556449', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-03', '2023-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1199, NULL, NULL, NULL, 1, 1, NULL, 'AMOIKON', 'ASSANDOI ANNE-MARIE', '313039V', '1966-01-22', 'ABIDJAN ADM', NULL, '20229150', NULL, 'F', NULL, NULL, 'assamari2007@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-12', NULL, '2025-10-27 12:16:52.14706', '2025-11-06 15:29:29.966762', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2026-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-12', '2018-08-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1200, NULL, NULL, NULL, 1, 1, NULL, 'N''GATTA', 'AMOND GENEROSA M.', '368217K', '1982-01-20', 'ABIDJAN ADM', NULL, '58234449', '46 28 93 92', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-04-18', NULL, '2025-10-27 12:16:52.151585', '2025-11-06 15:29:30.357562', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2011-04-18', '2011-06-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1201, NULL, NULL, NULL, 1, 1, NULL, 'CISSE', 'MOHAMED SEKOU', '855828Z', '1990-01-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-24', NULL, '2025-10-27 12:16:52.157399', '2025-11-06 15:29:30.365684', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-24', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1217, NULL, NULL, NULL, 1, 1, NULL, 'ATTA', 'NEE KABLAN ADAOROMAN', '297586Q', '1973-03-12', 'ABIDJAN ADM', NULL, '20347410', '02 35 45 95', 'F', NULL, NULL, 'adaoroman@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:52.251492', '2025-11-06 15:29:31.129333', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 232, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2003-10-01', '2021-12-22', NULL, 157, NULL);
INSERT INTO public.agents VALUES (1218, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'AKOUA MELANIE', '337226V', '1980-01-02', 'ABIDJAN ADM', NULL, '20347413', '05 95 96 11', 'F', NULL, NULL, 'melakoffi1@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:52.257563', '2025-11-06 15:29:31.131861', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 232, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2008-01-30', NULL, 157, NULL);
INSERT INTO public.agents VALUES (1219, NULL, NULL, NULL, 1, 1, NULL, 'KOMOE', 'AMA CHRISTIANE C. BOWAME', '481942M', '1988-12-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'elaveriekomoe@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-02', NULL, '2025-10-27 12:16:52.261805', '2025-11-06 15:29:31.17765', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-02', '2020-03-02', NULL, 157, NULL);
INSERT INTO public.agents VALUES (1220, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'MARIAME', '506865Z', '1962-06-24', 'ABIDJAN ADM', NULL, '07 92 16 02', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-03-05', NULL, '2025-10-27 12:16:52.265522', '2025-11-06 15:29:31.213486', NULL, NULL, NULL, NULL, 21, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2022-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2018-03-05', '2021-01-27', NULL, 158, NULL);
INSERT INTO public.agents VALUES (1221, NULL, NULL, NULL, 1, 1, NULL, 'TIA', 'NEE DIOP AICHA J. ADIZA', '815497E', '1992-06-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'diopjehane@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:52.272477', '2025-11-06 15:29:31.217064', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 232, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-07-12', NULL, 158, NULL);
INSERT INTO public.agents VALUES (1222, NULL, NULL, NULL, 1, 1, NULL, 'GOUGOU', 'KOUADIO MARCEL', '323836K', '1976-01-20', 'ABIDJAN ADM', NULL, '20347411', '45 58 58 40', 'M', NULL, NULL, 'goukouamar@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-07', NULL, '2025-10-27 12:16:52.276697', '2025-11-06 15:29:31.482295', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-07', '2022-01-14', NULL, 158, NULL);
INSERT INTO public.agents VALUES (1269, NULL, NULL, NULL, 1, 1, NULL, 'SERY', 'NEE YEBOUA AHOU YAH M.', '319371L', '1975-04-08', 'ABIDJAN ADM', NULL, '05 56 36 38', '01 81 95 65', 'F', NULL, NULL, 'mireilleyeboua@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-08-03', NULL, '2025-10-27 12:16:52.524417', '2025-11-06 15:29:34.106337', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-08-03', '2023-03-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1270, NULL, NULL, NULL, 1, 1, NULL, 'BEDA', 'NEE BROU B. S. VIVIANE', '284526N', '1976-03-11', 'ABIDJAN ADM', NULL, '05 40 67 09', NULL, 'F', NULL, NULL, 'bsylvie316@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2000-06-15', NULL, '2025-10-27 12:16:52.528879', '2025-11-06 15:29:34.142612', NULL, NULL, 5, 37, 71, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2025-04-15', '2025-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1271, NULL, NULL, NULL, 1, 1, NULL, 'KANINTAO', 'FATOUMATA', '481934D', '1978-11-12', 'ABIDJAN ADM', NULL, '78999861', '06 59 61 95', 'F', NULL, NULL, 'kanintaofatoumata@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:52.53275', '2025-11-06 15:29:34.184423', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2038-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2020-04-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1273, NULL, NULL, NULL, 1, 1, NULL, 'ATSIN', 'MONNET CLEMENT', '481904Q', '1987-11-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-16', NULL, '2025-10-27 12:16:52.543457', '2025-11-06 15:29:34.226183', NULL, NULL, 8, 47, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2047-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2020-03-16', '2020-07-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1251, NULL, NULL, NULL, 1, 1, NULL, 'BOKO', 'KOFFI YEBOUA RICHARD', '867562S', '1979-12-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-05-26', NULL, '2025-10-27 12:16:52.434382', '2025-11-06 15:29:33.459861', NULL, NULL, 5, 38, 24, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 235, '2044-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2023-05-26', '2023-06-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1252, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'NEE ALLUI AKISSI A.M', '304885T', '1978-12-15', 'ABIDJAN ADM', NULL, '03 58 87 35', NULL, 'F', NULL, NULL, 'annemariallui00@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:52.441815', '2025-11-06 15:29:33.502793', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2025-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1253, NULL, NULL, NULL, 1, 1, NULL, 'EBY', 'NEE ACKA AGOH NICOLE', '368214Q', '1976-07-26', 'ABIDJAN ADM', NULL, '20347249', '02 60 64 11', 'F', NULL, NULL, 'ackanicole@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-04-18', NULL, '2025-10-27 12:16:52.446218', '2025-11-06 15:29:33.609071', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 235, '2036-12-31', 'CHARGE D''ETUDES', NULL, NULL, NULL, NULL, NULL, '2011-04-18', '2022-09-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1254, NULL, NULL, NULL, 1, 1, NULL, 'DAGROU', 'WOTTOU LINDA ANGE-MARIE', '889093P', '1994-04-09', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'lyndadagrou3@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-15', NULL, '2025-10-27 12:16:52.450719', '2025-11-06 15:29:33.692511', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-15', '2024-10-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1255, NULL, NULL, NULL, 1, 1, NULL, 'TAYORO', 'VERONIQUE ESPERANCE', '876799H', '2000-03-18', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-18', NULL, '2025-10-27 12:16:52.456996', '2025-11-06 15:29:33.696344', NULL, NULL, 6, 44, 36, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2060-12-31', 'SECRETAIRE ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1257, NULL, NULL, NULL, 1, 1, NULL, 'BAMBA', 'ENZOUMANA', '855826P', '1989-12-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:52.465209', '2025-11-06 15:29:33.700625', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2049-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1258, NULL, NULL, NULL, 1, 1, NULL, 'ODOUKOU', 'AKOUBA A. CHRISTELLE', '481626Q', '1992-06-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:52.471632', '2025-11-06 15:29:33.736612', NULL, NULL, 6, 42, 31, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 235, '2052-12-31', 'COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2020-06-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1259, NULL, NULL, NULL, 1, 1, NULL, 'KOSSONOU', 'AFFOUAKRA C. ANDREE', '887502L', '1985-12-29', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kossonoucharlene3@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-30', NULL, '2025-10-27 12:16:52.476354', '2025-11-06 15:29:33.739278', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2045-12-31', 'ADJOINT ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2024-04-30', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1260, NULL, NULL, NULL, 1, 1, NULL, 'SOUMAHORO', 'MADOUSSOU RAISSA', '887689X', '1990-05-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'raissa.soumahoro@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-03', NULL, '2025-10-27 12:16:52.480231', '2025-11-06 15:29:33.813302', NULL, NULL, 9, 45, 42, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2050-12-31', 'ADJOINT ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2024-03-05', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1261, NULL, NULL, NULL, 1, 1, NULL, 'TOUGBATE', 'TAHIBE JEAN-HENRI', '826011C', '1982-09-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'clementtougbate@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-14', NULL, '2025-10-27 12:16:52.48693', '2025-11-06 15:29:33.816528', NULL, NULL, 8, 47, 32, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2042-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2022-03-14', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1262, NULL, NULL, NULL, 1, 1, NULL, 'BOA', 'KOFFI RAYMOND', '908887T', '1990-07-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'boaraymondo@gmai.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-05-06', NULL, '2025-10-27 12:16:52.492351', '2025-11-06 15:29:33.818997', NULL, NULL, 8, 47, 32, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2050-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2025-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1263, NULL, NULL, NULL, 2, 1, NULL, 'ANOH', 'N''GNIMAH M. ISABELLE', '504953X', '1974-05-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'isabellean@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-07-06', NULL, '2025-10-27 12:16:52.495835', '2025-11-06 15:29:33.975821', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2034-12-31', 'DIRECTEUR GENERAL', NULL, NULL, NULL, NULL, NULL, '2017-01-13', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1264, NULL, NULL, NULL, 2, 1, NULL, 'TOURE', 'LANFIA', '982951L', '1980-04-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-01-04', NULL, '2025-10-27 12:16:52.499703', '2025-11-06 15:29:33.979013', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 235, '2040-12-31', 'CONSEILLER TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2021-01-04', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1266, NULL, NULL, NULL, 1, 1, NULL, 'DIAWARA', 'KAMAN RAISSA', '852207G', '1996-10-08', 'ABIDJAN ADM', NULL, '07 87 92 64', '05 66 80 47', 'F', NULL, NULL, 'raissadiawara@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:52.510549', '2025-11-06 15:29:33.984648', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1265, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'YEDIESON LAMISSA', '815436G', '1993-10-01', 'ABIDJAN ADM', NULL, '01 01 49 32', NULL, 'M', NULL, NULL, 'coulibalylamissa51@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-07', NULL, '2025-10-27 12:16:52.506253', '2025-11-06 15:29:33.981854', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-07', '2023-01-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1267, NULL, NULL, NULL, 1, 1, NULL, 'KONATE', 'RAMATOU', '852240L', '1997-11-12', 'ABIDJAN ADM', NULL, '07 58 66 94', '07 47 13 45', 'F', NULL, NULL, 'kramatou5@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:52.514626', '2025-11-06 15:29:33.987966', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1272, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'MAMADOU', '855888W', '1993-08-09', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-09', NULL, '2025-10-27 12:16:52.538394', '2025-11-06 15:29:34.22333', NULL, NULL, 6, 42, 31, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2053-12-31', 'COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2023-01-09', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1275, NULL, NULL, NULL, 2, 1, NULL, 'KEITA', 'MAMADOU', '506861V', '1968-11-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-02-07', NULL, '2025-10-27 12:16:52.550814', '2025-11-06 15:29:34.233816', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2028-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2022-02-07', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1281, NULL, NULL, NULL, 2, 1, NULL, 'ASSOFI', 'ASSOFI ACHILLE', '506855X', '1976-06-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-05-02', NULL, '2025-10-27 12:16:52.58802', '2025-11-06 15:29:34.483435', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2036-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2017-05-02', '2022-02-07', NULL, 164, NULL);
INSERT INTO public.agents VALUES (1285, NULL, NULL, NULL, 1, 1, NULL, 'KOUMA', 'ADJA GRACE DESIREE', '865813L', '1999-09-06', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-27', NULL, '2025-10-27 12:16:52.613225', '2025-11-06 15:29:34.692496', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2064-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-04-27', '2023-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1286, NULL, NULL, NULL, 1, 1, NULL, 'TAKI', 'KOUASSI KISSI DAVID', '855883R', '1987-06-04', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'takikouassidavid@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:52.619705', '2025-11-06 15:29:34.86805', NULL, NULL, 5, 37, 39, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 237, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1299, NULL, NULL, NULL, 1, 1, NULL, 'LAMINE', 'NEE YAO AKO', '272140J', '1971-12-01', 'ABIDJAN ADM', NULL, '23573205/08', NULL, 'F', NULL, NULL, 'lamineako@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-04', NULL, '2025-10-27 12:16:52.683156', '2025-11-06 15:29:35.440152', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 238, '2036-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1304, NULL, NULL, NULL, 1, 1, NULL, 'ZAMBLE', 'AFFOUE ANNIE RAYMONDE D', '482019L', '1993-07-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'AFFOUEZAMBLE@GMAIL.COM', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-28', NULL, '2025-10-27 12:16:52.722401', '2025-11-06 15:29:35.762841', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 238, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-28', '2022-08-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1306, NULL, NULL, NULL, 1, 1, NULL, 'KACOU', 'NEE KOFFI EHOUMAN M.L.', '834105Q', '1988-01-24', 'ABIDJAN ADM', NULL, '07 58 57 70', NULL, 'F', NULL, NULL, 'marleinekoffi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-17', NULL, '2025-10-27 12:16:52.734344', '2025-11-06 15:29:35.825964', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-17', '2022-06-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1311, NULL, NULL, NULL, 1, 1, NULL, 'SIA', 'DESIRE AUBIN', '855877S', '1993-03-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'desiresiaaubin@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-09', NULL, '2025-10-27 12:16:52.773425', '2025-11-06 15:29:36.057327', NULL, NULL, 6, 44, 45, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-09', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1182, NULL, NULL, NULL, 1, 1, NULL, 'KANGAH', 'ARMAND', '327124M', '1975-12-13', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-09-07', NULL, '2025-10-27 12:16:52.056476', '2025-11-06 15:29:27.388037', NULL, NULL, 5, 40, 64, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2040-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2015-02-18', '2022-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1256, NULL, NULL, NULL, 1, 1, NULL, 'WADJA', 'NEE KOFFI ZAGBO V. AHOU', '826157K', '1983-04-28', 'ABIDJAN ADM', NULL, '07 08 53 71', '01 02 38 10', 'F', NULL, NULL, 'valeriewadja@yahou.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-14', NULL, '2025-10-27 12:16:52.461419', '2025-11-06 15:29:33.698853', NULL, NULL, 6, 44, 41, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 235, '2043-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-03-14', '2022-04-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1319, NULL, NULL, NULL, 1, 1, NULL, 'KAKOU', 'RENEE VALERIE', '304888E', '1974-10-01', 'ABJ-NORD', NULL, '01 31 13 20', '05 69 72 26', 'F', NULL, NULL, 'kakoun234@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-08', NULL, '2025-10-27 12:16:52.86842', '2025-11-06 15:29:36.098343', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2034-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-08', '2015-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1320, NULL, NULL, NULL, 1, 1, NULL, 'SIDIBE', 'NEE BAKAYOKO MASSIAMY', '304889F', '1972-06-24', 'ABJ-NORD', NULL, '20320031', '41 03 05 58', 'F', NULL, NULL, 'bakayokomassiamy063@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-09', NULL, '2025-10-27 12:16:52.888297', '2025-11-06 15:29:36.137154', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2032-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-09', '2021-03-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1322, NULL, NULL, NULL, 1, 1, NULL, 'OSSE', 'JUDITH J. EPSE DOGROU', '337230D', '1975-01-11', 'ABJ-NORD', NULL, '20347247', NULL, 'F', NULL, NULL, 'judithosse1218@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-01-30', NULL, '2025-10-27 12:16:52.92384', '2025-11-06 15:29:36.198371', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-01-30', '2015-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1323, NULL, NULL, NULL, 1, 1, NULL, 'AMOND', 'AKOUA MARIE-LOUISE', '386459H', '1979-07-19', 'ABJ-NORD', NULL, '1581011', '07 39 36 02', 'F', NULL, NULL, 'amondlouise@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-03-13', NULL, '2025-10-27 12:16:52.930006', '2025-11-06 15:29:36.201518', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2013-02-07', '2019-02-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1324, NULL, NULL, NULL, 1, 1, NULL, 'AKALE', 'KOUAKOU YANNICK WILFRIED', '435328W', '1991-11-07', 'ABJ-NORD', NULL, NULL, NULL, 'M', NULL, NULL, 'akaleyannick@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-12-21', NULL, '2025-10-27 12:16:52.937794', '2025-11-06 15:29:36.204276', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-12-21', '2017-02-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1331, NULL, NULL, NULL, 1, 1, NULL, 'GAHIE', 'ESTHER DOMINIQUE', '855839U', '1994-02-13', 'ABJ-NORD', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:52.99558', '2025-11-06 15:29:36.414733', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2024-01-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1332, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'NEE AGBO .J.PATRICIA', '889312W', '1978-02-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'agbojosy@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-06', NULL, '2025-10-27 12:16:53.00545', '2025-11-06 15:29:36.448745', NULL, NULL, 6, 44, 28, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-06-05', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1337, NULL, NULL, NULL, 1, 1, NULL, 'FADIGA', 'LAMINE DESOHN', '481572J', '1989-08-15', 'ABJ-NORD', NULL, '07 42 62 62', NULL, 'M', NULL, NULL, 'lamine.desohn@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-12', NULL, '2025-10-27 12:16:53.038913', '2025-11-06 15:29:36.50085', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-12', '2020-04-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1339, NULL, NULL, NULL, 1, 1, NULL, 'BRO', 'GUY MARIUS', '291182M', '1974-12-02', 'DABOU PREF', NULL, '23540441/0061', '08 10 47 08', 'M', NULL, NULL, 'guymariusbro@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-03-24', NULL, '2025-10-27 12:16:53.052083', '2025-11-06 15:29:36.504566', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2039-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2002-10-24', '2022-07-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1340, NULL, NULL, NULL, 1, 1, NULL, 'ESSE', 'GUESSEN FABRICE', '802321Y', '1986-11-18', 'DABOU PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'Gguessanfrabricee@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-09-28', NULL, '2025-10-27 12:16:53.060301', '2025-11-06 15:29:36.557759', NULL, NULL, 5, 38, 24, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-09-28', '2021-10-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1344, NULL, NULL, NULL, 1, 1, NULL, 'ZADI', 'KESSAN GHISLAINE', '447591K', '1983-01-29', 'DABOU PREF', NULL, '47 32 34 93', NULL, 'F', NULL, NULL, 'ghislmainezadik@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:53.087551', '2025-11-06 15:29:36.654391', NULL, NULL, 6, 44, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-02-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1018, NULL, NULL, NULL, 2, 1, NULL, 'TOURE', 'LOGOSSINA', '982971Q', '1996-03-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'logossinatoure5@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-02', NULL, '2025-10-27 12:16:50.908956', '2025-11-06 15:29:15.013592', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-02', '2021-05-02', NULL, 181, NULL);
INSERT INTO public.agents VALUES (1036, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIANE', 'NEE OUATTARA A. OLGA', '436116B', '1978-02-07', 'ABIDJAN ADM', NULL, '07 76 29 37', '01 44 75 75', 'F', NULL, NULL, 'anzataolgaouattara@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-09', NULL, '2025-10-27 12:16:51.01147', '2025-11-06 15:29:15.594541', NULL, NULL, 5, 38, 43, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 221, '2043-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2017-09-01', '2024-06-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1037, NULL, NULL, NULL, 1, 1, NULL, 'ASSANDE', 'NEE TIEDE NESMOND M.J.', '464357G', '1980-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-08', NULL, '2025-10-27 12:16:51.016185', '2025-11-06 15:29:15.634299', NULL, NULL, 5, 37, 26, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 221, '2040-12-31', 'CHARGE DE COMMUNICATION', NULL, NULL, NULL, NULL, NULL, '2019-01-08', '2023-07-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1038, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'KONAN MARC', '345381H', '1979-12-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-09-12', NULL, '2025-10-27 12:16:51.022699', '2025-11-06 15:29:15.648803', NULL, NULL, 6, 44, 44, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2039-12-31', 'REGISSEUR', NULL, NULL, NULL, NULL, NULL, '2024-12-09', '2023-09-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1039, NULL, NULL, NULL, 1, 1, NULL, 'TOUVOLI', 'BI GOLI LANDRY', '886661Z', '1992-05-16', 'ABIDJAN ADM', NULL, '77 55 86 27', NULL, 'M', NULL, NULL, 'landrytouvoli@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-02', NULL, '2025-10-27 12:16:51.027582', '2025-11-06 15:29:15.669741', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2052-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-02-04', '2024-05-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1043, NULL, NULL, NULL, 2, 1, NULL, 'COULIBALY', 'SYALLA', '982950X', '1976-11-14', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-01-04', NULL, '2025-10-27 12:16:51.050302', '2025-11-06 15:29:15.839416', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2036-12-31', 'COORDONNATEUR', NULL, NULL, NULL, NULL, NULL, '2021-01-04', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1044, NULL, NULL, NULL, 2, 1, NULL, 'CAMARA', 'AHOU MADELEINE', '982825E', '1983-12-31', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-20', NULL, '2025-10-27 12:16:51.058321', '2025-11-06 15:29:15.880065', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2043-12-31', 'ASSISTANT(E) DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2014-05-22', '2025-01-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1045, NULL, NULL, NULL, 2, 1, NULL, 'TRAORE', 'ANIBOHINI SALI NATACHA', '982828R', '1988-06-10', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'natachatraore7@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-06', NULL, '2025-10-27 12:16:51.062966', '2025-11-06 15:29:16.077321', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2048-12-31', 'ASSISTANT(E) DE DIRECTION', NULL, NULL, NULL, NULL, NULL, NULL, '2025-01-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1046, NULL, NULL, NULL, 2, 1, NULL, 'TIEBO', 'DRISSA GNANOU', '982830P', '1989-03-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-02-05', NULL, '2025-10-27 12:16:51.067297', '2025-11-06 15:29:16.081033', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2049-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2025-02-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1047, NULL, NULL, NULL, 2, 1, NULL, 'ADOM', 'DAMOUA NICOLAS', '982831C', '1999-05-19', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'adomnicolasj@gmilcom', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-08-12', NULL, '2025-10-27 12:16:51.074947', '2025-11-06 15:29:16.207508', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1048, NULL, NULL, NULL, 2, 1, NULL, 'YAO', 'N''GUESSAN MOISE', '982833E', '1998-04-25', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-07-04', NULL, '2025-10-27 12:16:51.080149', '2025-11-06 15:29:16.34577', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2058-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1049, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'MOUSSA', '982863L', '2000-01-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'pankaoloche@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-02-03', NULL, '2025-10-27 12:16:51.084814', '2025-11-06 15:29:16.349174', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2015-11-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1050, NULL, NULL, NULL, 2, 1, NULL, 'KIE', 'BI NEKA IRIE CEDRIC', '982999M', '1995-05-31', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-02', NULL, '2025-10-27 12:16:51.09154', '2025-11-06 15:29:16.648661', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 221, '2055-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, NULL, '2023-01-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1056, NULL, NULL, NULL, 2, 1, NULL, 'DAPA', 'KOUASSI N''GUETTIA EDMOND', '982930K', '1985-07-14', 'ABIDJAN ADM', NULL, '09 -3 6- 55', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-04-30', NULL, '2025-10-27 12:16:51.134872', '2025-11-06 15:29:17.714818', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-04-30', '2019-04-30', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1366, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'NEE YEPI AKE T. SABINE', '834359D', '1989-10-25', 'ABIDJAN ADM', NULL, '40 65 85 65', '04 00 41 37', 'F', NULL, NULL, 'yepisabine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-06-07', NULL, '2025-10-27 12:16:53.231994', '2025-11-06 15:29:37.164479', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-06-07', '2022-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1375, NULL, NULL, NULL, 1, 1, NULL, 'SOMA', 'MAKOURA RAYMONDE', '384378M', '1982-01-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kourasoma@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-06-09', NULL, '2025-10-27 12:16:53.293968', '2025-11-06 15:29:37.641751', NULL, NULL, 5, 38, 79, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-06-09', '2023-06-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1377, NULL, NULL, NULL, 1, 1, NULL, 'ADOU', 'NEE AYEMOU S. ROSINE', '323843S', '1977-01-04', 'ABIDJAN ADM', NULL, '32772624', '06 22 59 67', 'F', NULL, NULL, 'roseayemou22gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:53.310258', '2025-11-06 15:29:37.648023', NULL, NULL, 6, 44, 28, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 242, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2015-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1073, NULL, NULL, NULL, 1, 1, NULL, 'LIDJI', 'SYLVESTRE', '291090Y', '1974-12-30', 'ABIDJAN ADM', NULL, '20347435', NULL, 'M', NULL, NULL, 'lidjisylvestre@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-09-26', NULL, '2025-10-27 12:16:51.288391', '2025-11-06 15:29:18.471973', NULL, NULL, 5, 38, 24, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2039-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2009-10-22', '2010-05-31', NULL, 138, NULL);
INSERT INTO public.agents VALUES (1075, NULL, NULL, NULL, 1, 1, NULL, 'KODDI', 'NEE AHOUTOU N. SIDONIE', '345906G', '1976-04-04', 'ABIDJAN ADM', NULL, '20-34-72-39', '01 83 72 70', 'F', NULL, NULL, 'sidoniendri09@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:51.309012', '2025-11-06 15:29:18.522577', NULL, NULL, 6, 44, 28, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2009-08-26', NULL, 138, NULL);
INSERT INTO public.agents VALUES (1076, NULL, NULL, NULL, 1, 1, NULL, 'DIAKO', 'IBRAHIM', '277838F', '1972-07-24', 'ABIDJAN ADM', NULL, '20347438', NULL, 'M', NULL, NULL, 'ibndiako1@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-07-19', NULL, '2025-10-27 12:16:51.317191', '2025-11-06 15:29:18.525655', NULL, NULL, 5, 37, 25, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 222, '2032-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1999-07-19', '2022-05-16', NULL, 139, NULL);
INSERT INTO public.agents VALUES (1077, NULL, NULL, NULL, 1, 1, NULL, 'TINDE', 'KEI JEROME', '338383C', '1978-09-30', 'ABIDJAN ADM', NULL, '20347433', '01 64 80 68', 'M', NULL, NULL, 'jerometinde@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-03-04', NULL, '2025-10-27 12:16:51.326314', '2025-11-06 15:29:18.527413', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-03-04', '2021-12-22', NULL, 139, NULL);
INSERT INTO public.agents VALUES (1355, NULL, NULL, NULL, 1, 1, NULL, 'ADJIGO', 'ACHI BERTHE JOCELYNE', '803532M', '1990-10-08', 'ABIDJAN ADM', NULL, '08 04 16 17', NULL, 'F', NULL, NULL, 'adjigojocelyne@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-11-19', NULL, '2025-10-27 12:16:53.160775', '2025-11-06 15:29:36.839691', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-11-19', '2021-05-25', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1356, NULL, NULL, NULL, 1, 1, NULL, 'YORO', 'GNONOFIEGLO LYDIE P.', '313043Z', '1980-01-27', 'ABIDJAN ADM', NULL, '05 44 99 19', NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-04', NULL, '2025-10-27 12:16:53.166154', '2025-11-06 15:29:36.841953', NULL, NULL, 5, 37, 25, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-04', '2005-10-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1359, NULL, NULL, NULL, 1, 1, NULL, 'GLASSIANDA', 'NEE N''GUESSAN A. D.', '482328W', '1983-11-23', 'ABIDJAN ADM', NULL, '07 61 35 65', '07 22 42 00', 'F', NULL, NULL, 'annickdesireenguessan@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-23', NULL, '2025-10-27 12:16:53.186785', '2025-11-06 15:29:36.84759', NULL, NULL, 6, 44, 48, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 241, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-23', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1362, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'NEE BOTENISSOGO A.', '359182G', '1979-07-29', 'ABIDJAN ADM', NULL, '20347962', NULL, 'F', NULL, NULL, 'aramata_b@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:53.206292', '2025-11-06 15:29:37.064075', NULL, NULL, 6, 44, 28, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2022-09-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1365, NULL, NULL, NULL, 1, 1, NULL, 'DON', 'ASNATH JACK-ABELLE INCHAUH', '480545S', '1994-03-12', 'ABIDJAN ADM', NULL, '0 80 92 30', NULL, 'F', NULL, NULL, 'asnathjack@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.226248', '2025-11-06 15:29:37.126499', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 31, 241, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1367, NULL, NULL, NULL, 1, 1, NULL, 'ANGBONON', 'BROU MARIE VANESSA', '855822K', '1990-07-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'vanessaangbonon2807@icloud.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:53.238566', '2025-11-06 15:29:37.261508', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1371, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'TIEKPELE FANTA DELPHINE', '467987L', '1983-04-29', 'ABIDJAN ADM', NULL, '49 56 84 14', '06 08 87 71', 'F', NULL, NULL, 'fantadelphine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-20', NULL, '2025-10-27 12:16:53.265522', '2025-11-06 15:29:37.469881', NULL, NULL, 6, 44, 45, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 31, 241, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-20', '2019-03-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1372, NULL, NULL, NULL, 1, 1, NULL, 'NALIMA', 'KAMAGATE', '483707U', '1982-01-21', 'ABIDJAN ADM', NULL, '89 69 41 09', '06 87 00 52', 'F', NULL, NULL, 'kamagatenalima@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-13', NULL, '2025-10-27 12:16:53.273608', '2025-11-06 15:29:37.555291', NULL, NULL, 6, 42, 30, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 241, '2042-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2020-03-13', '2020-09-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1373, NULL, NULL, NULL, 1, 1, NULL, 'YOUZAN', 'BI IRIE JULIEN', '875722S', '1984-05-10', 'ABIDJAN ADM', NULL, '06 02 98 12', NULL, 'M', NULL, NULL, 'biiriejulien4@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-27', NULL, '2025-10-27 12:16:53.278328', '2025-11-06 15:29:37.558171', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-11-27', '2023-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1374, NULL, NULL, NULL, 1, 1, NULL, 'EBA', 'CLOVIS', '304882Y', '1972-05-15', 'ABIDJAN ADM', NULL, '07 07 57 43', '02 72 21 73', 'M', NULL, NULL, 'cloviseba1513@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:53.284754', '2025-11-06 15:29:37.592676', NULL, NULL, 5, 38, 23, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 242, '2037-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2022-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1119, NULL, NULL, NULL, 1, 1, NULL, 'AGNERO', 'SIE ANDRE', '312892R', '1968-03-04', 'ABIDJAN ADM', NULL, '20347242', NULL, 'M', NULL, NULL, 'sie505@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-03', NULL, '2025-10-27 12:16:51.648354', '2025-11-06 15:29:20.607247', NULL, NULL, 5, 39, 57, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2033-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2013-08-05', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1120, NULL, NULL, NULL, 1, 1, NULL, 'BOGBEHIN', 'AKPINI A. PATRICIA', '925925G', '1986-10-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-01', NULL, '2025-10-27 12:16:51.655389', '2025-11-06 15:29:20.610096', NULL, NULL, 5, 37, 26, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 225, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1121, NULL, NULL, NULL, 1, 1, NULL, 'SOKOURY', 'DIGBEU GILLES', '826301U', '1982-12-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-13', NULL, '2025-10-27 12:16:51.661373', '2025-11-06 15:29:20.61585', NULL, NULL, 5, 37, 27, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2042-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1133, NULL, NULL, NULL, 2, 1, NULL, 'METCHRO', 'CHARLES STANISLAS', '982942K', '1987-09-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-01-02', NULL, '2025-10-27 12:16:51.742073', '2025-11-06 15:29:21.431819', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2047-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2022-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1134, NULL, NULL, NULL, 1, 1, NULL, 'DOBRA', 'BEZI DAVID-HERMANN', '467173T', '1979-08-22', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'hermanbezi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-06', NULL, '2025-10-27 12:16:51.748933', '2025-11-06 15:29:21.512988', NULL, NULL, 5, 38, 59, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 225, '2044-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2019-02-06', '2019-03-05', NULL, 146, NULL);
INSERT INTO public.agents VALUES (1135, NULL, NULL, NULL, 1, 1, NULL, 'AMONKAN', 'NEE N''DRY MARIE P.', '297582L', '1973-04-24', 'ABIDJAN ADM', NULL, '05 66 11 50', '42 08 40 74', 'F', NULL, NULL, 'Ndrymariepascale73@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:16:51.757372', '2025-11-06 15:29:21.626686', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2033-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2003-10-07', '2022-01-14', NULL, 146, NULL);
INSERT INTO public.agents VALUES (1136, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'SOPHIE A. HINGANAHON', '815433D', '1982-09-12', 'ABIDJAN ADM', NULL, NULL, '07 07 50 57', 'F', NULL, NULL, 'cange830@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:51.763664', '2025-11-06 15:29:21.718854', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2042-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-02', NULL, 146, NULL);
INSERT INTO public.agents VALUES (1376, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'N''GUESSAN SAINT D.', '323853U', '1981-12-29', 'ABIDJAN ADM', NULL, '7904633', '60 59 52 18', 'M', NULL, NULL, 'kouamedaniel180@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-07', NULL, '2025-10-27 12:16:53.303128', '2025-11-06 15:29:37.644553', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-07', '2023-07-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1378, NULL, NULL, NULL, 1, 1, NULL, 'NEZZI', 'NEE ZIMBRIL OURAH M. P.', '447582J', '1980-09-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'nezzipulcherie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:53.317174', '2025-11-06 15:29:37.681653', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 242, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-02-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1379, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'FATIM RAISSA', '464167S', '1990-09-07', 'ABIDJAN ADM', NULL, '07 08 25 24', NULL, 'F', NULL, NULL, 'fatimefofana2@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.32676', '2025-11-06 15:29:37.684689', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1381, NULL, NULL, NULL, 1, 1, NULL, 'MALICK', 'N''DRI YAYA FRANCK A.', '481978Z', '1980-11-18', 'ABJ-SUD', NULL, '88 19 23 89', NULL, 'M', NULL, NULL, 'malickndri08@gmail,com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-02', NULL, '2025-10-27 12:16:53.341942', '2025-11-06 15:29:37.688504', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 241, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-02', '2023-07-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1382, NULL, NULL, NULL, 1, 1, NULL, 'ASSI', 'ABOUOH NADIA', '815423B', '1995-03-17', 'ABIDJAN ADM', NULL, '07 47 99 58', NULL, 'F', NULL, NULL, 'nadiaassi2013@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:53.34815', '2025-11-06 15:29:37.691713', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 242, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1385, NULL, NULL, NULL, 1, 1, NULL, 'KOBRAN', 'ABRAN N''GUETTA BENEDI.', '855372F', '1993-03-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.371127', '2025-11-06 15:29:37.815433', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 31, 242, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1022, NULL, NULL, NULL, 1, 1, NULL, 'KODDI', 'BI ZOBOU NORBERT', '265648U', '1968-06-06', 'ABIDJAN ADM', NULL, '20347936/37', '20 34 72 43', 'M', NULL, NULL, 'nkoddi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1998-04-09', NULL, '2025-10-27 12:16:50.929513', '2025-11-06 15:29:15.15186', NULL, NULL, 5, 41, 37, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2033-12-31', 'INSPECTEUR TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2001-05-09', '2022-02-07', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1144, NULL, NULL, NULL, 1, 1, NULL, 'ZAN', 'BI MOUANOU NICAISE', '885532F', '1992-04-05', 'ABIDJAN ADM', NULL, '89 91 15 31', NULL, 'M', NULL, NULL, 'nouanoubi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-21', NULL, '2025-10-27 12:16:51.828712', '2025-11-06 15:29:21.960275', NULL, NULL, 8, 47, 61, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-03-21', '2024-04-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1146, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'FADY ADAMA', '467389C', '1986-05-22', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'ad.diarrassouba@tourisme', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-07', NULL, '2025-10-27 12:16:51.844369', '2025-11-06 15:29:22.307813', NULL, NULL, 5, 38, 59, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 226, '2051-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2019-02-07', '2022-02-07', NULL, 149, NULL);
INSERT INTO public.agents VALUES (1147, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'ADAHY GHISLAIN', '467423N', '1982-06-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'gh.kouakou@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-07', NULL, '2025-10-27 12:16:51.850322', '2025-11-06 15:29:22.727254', NULL, NULL, 5, 38, 59, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2047-12-31', 'INGENIEUR INFORMATICIEN', NULL, NULL, NULL, NULL, NULL, '2019-02-07', '2022-03-11', NULL, 149, NULL);
INSERT INTO public.agents VALUES (1151, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'NEE DIGBEU G. L. SANDRINE', '827810P', '1982-07-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'sa.digbeu@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-19', NULL, '2025-10-27 12:16:51.877733', '2025-11-06 15:29:23.804128', NULL, NULL, 5, 37, 60, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 226, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-19', '2022-06-02', NULL, 150, NULL);
INSERT INTO public.agents VALUES (1153, NULL, NULL, NULL, 1, 1, NULL, 'KOUADJANNI', 'ANANGANMAN N''MOBLE', '481073R', '1977-10-25', 'ABIDJAN ADM', NULL, '22433537', '40 09 91 06', 'F', NULL, NULL, 'kouadjannia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-04', NULL, '2025-10-27 12:16:51.89011', '2025-11-06 15:29:24.347702', NULL, NULL, 5, 38, 62, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 227, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-04', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1411, NULL, NULL, NULL, 1, 1, NULL, 'MANZAN', 'NEE YAO ABENAN MARTINE', '855863U', '1990-01-01', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:53.549382', '2025-11-06 15:29:39.004999', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 243, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2024-06-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1053, NULL, NULL, NULL, 1, 1, NULL, 'TCHIEGUEN', 'NEE MEA AFFOUE R', '371880C', '1973-10-02', 'ABIDJAN ADM', NULL, '20347966', '05 25 69 43', 'F', NULL, NULL, 'tmeareine @ yahoo. fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-02-03', NULL, '2025-10-27 12:16:51.11074', '2025-11-06 15:29:17.461032', NULL, NULL, 6, 44, 45, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 221, '2033-12-31', 'REGISSEUR SECONDAIRE', NULL, NULL, NULL, NULL, NULL, '2012-02-03', '2012-02-20', NULL, 136, NULL);
INSERT INTO public.agents VALUES (1065, NULL, NULL, NULL, 1, 1, NULL, 'N''GORAN', 'NEE AKPANGNI SIALOU N.', '855865W', '1981-07-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'elvikenza@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-24', NULL, '2025-10-27 12:16:51.213786', '2025-11-06 15:29:18.248227', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-24', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1074, NULL, NULL, NULL, 1, 1, NULL, 'SIDIBE', 'NEE FOFANA ALIMATA', '345912V', '1977-05-16', 'ABIDJAN ADM', NULL, '20347425', NULL, 'F', NULL, NULL, 'mattazara@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:51.297045', '2025-11-06 15:29:18.515052', NULL, NULL, 5, 37, 25, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 222, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2009-06-11', NULL, 138, NULL);
INSERT INTO public.agents VALUES (1104, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'N''TAHO BLANDINE', '855890U', '1983-07-16', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:51.530275', '2025-11-06 15:29:19.966293', NULL, NULL, 5, 38, 55, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 224, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1123, NULL, NULL, NULL, 1, 1, NULL, 'DJAHA', 'NEE KOUADIO AMOIN H.', '359190L', '1971-03-04', 'ABIDJAN ADM', NULL, NULL, '40 49 88 50', 'F', NULL, NULL, 'kouadiohortense638@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:51.675872', '2025-11-06 15:29:20.755501', NULL, NULL, 6, 44, 28, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 225, '2031-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1143, NULL, NULL, NULL, 1, 1, NULL, 'ADOU', 'NEE KOUADIO E. Y. VANESSA', '886194E', '1994-01-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'vanessakouadio@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-14', NULL, '2025-10-27 12:16:51.820243', '2025-11-06 15:29:21.913273', NULL, NULL, 6, 44, 45, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 226, '2054-12-31', 'ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-04-14', '2024-06-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1185, NULL, NULL, NULL, 1, 1, NULL, 'DALLY', 'AHIPAUD FRANCK ALEX', '855832M', '1979-02-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'franck-michee@live.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-31', NULL, '2025-10-27 12:16:52.072519', '2025-11-06 15:29:27.780856', NULL, NULL, 5, 38, 65, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 231, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-31', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1197, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'N''DA AKISSI EMMA', '277839G', '1976-04-19', 'ABIDJAN ADM', NULL, '30640814/0815', NULL, 'F', NULL, NULL, 'daveq1010@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-07-19', NULL, '2025-10-27 12:16:52.130651', '2025-11-06 15:29:29.707135', NULL, NULL, 5, 38, 23, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2041-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '1999-07-19', '2022-03-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1198, NULL, NULL, NULL, 1, 1, NULL, 'AKUA', 'PRISCA ROSELYNE AKAKPO', '337229G', '1973-01-24', 'ABIDJAN ADM', NULL, '07 57 52 39', NULL, 'F', NULL, NULL, '16priscaakua@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-11-04', NULL, '2025-10-27 12:16:52.134689', '2025-11-06 15:29:29.835217', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 232, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-11-04', '2015-11-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1224, NULL, NULL, NULL, 1, 1, NULL, 'OHOUEU', 'RAOUL MARCEL', '201560R', '1960-01-16', 'ABIDJAN ADM', NULL, '21303312', '05 96 17 18', 'M', NULL, NULL, 'rohoueu@yahoo.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-12-01', NULL, '2025-10-27 12:16:52.286062', '2025-11-06 15:29:31.544257', NULL, NULL, 5, 39, 22, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2025-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2016-12-01', '2022-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1225, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'FRANCK', '855860D', '1984-07-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'kouamefranck014gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:52.292296', '2025-11-06 15:29:31.635182', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1226, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'KOROTOUNOU', '820545W', '1980-12-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'coulibalykoro11@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-09-30', NULL, '2025-10-27 12:16:52.296131', '2025-11-06 15:29:31.67062', NULL, NULL, 6, 44, 69, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 29, 233, '2040-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2021-09-30', '2025-03-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1230, NULL, NULL, NULL, 1, 1, NULL, 'NIAMIEN', 'YAO BERTIN', '286956X', '1975-04-26', 'ABIDJAN ADM', NULL, '47 35 26 85', '05 79 91 39', 'M', NULL, NULL, 'niamienap75@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2001-12-13', NULL, '2025-10-27 12:16:52.320655', '2025-11-06 15:29:32.707422', NULL, NULL, 5, 39, 22, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 29, 233, '2040-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2015-06-29', '2016-02-01', NULL, 159, NULL);
INSERT INTO public.agents VALUES (1231, NULL, NULL, NULL, 1, 1, NULL, 'SESSEGNON', 'NEE KEMAE PRISCA', '323833Q', '1978-01-09', 'ABIDJAN ADM', NULL, '20337321', '60 66 58 27', 'F', NULL, NULL, 'mireillesessegnon@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-21', NULL, '2025-10-27 12:16:52.32553', '2025-11-06 15:29:32.744088', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 29, 233, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-21', '2021-12-22', NULL, 159, NULL);
INSERT INTO public.agents VALUES (1384, NULL, NULL, NULL, 1, 1, NULL, 'AIE', 'CHO RUTH AGATHE GHISLAINE', '834958W', '1986-10-18', 'ABIDJAN ADM', NULL, '07 08 18 66', NULL, 'F', NULL, NULL, 'aieruth225@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-06-24', NULL, '2025-10-27 12:16:53.363346', '2025-11-06 15:29:37.770105', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 22, NULL, NULL, NULL, NULL, NULL, 31, 242, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-06-24', '2022-07-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1399, NULL, NULL, NULL, 1, 1, NULL, 'TENLO', 'COULIBALY KITENI-V. M.', '870454D', '1997-08-24', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-06-19', NULL, '2025-10-27 12:16:53.466512', '2025-11-06 15:29:38.664574', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-06-19', '2023-07-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1403, NULL, NULL, NULL, 1, 1, NULL, 'SESSEGNON', 'NEE COULIBALY N AMY', '433356Y', '1989-02-22', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'coulibalyisabelle73@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-21', NULL, '2025-10-27 12:16:53.496141', '2025-11-06 15:29:38.746132', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 243, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-21', '2016-12-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1404, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'AMOHIN VICTOIRE ALIDA', '433391L', '1977-04-10', 'GRAND-BASSAM PREF', NULL, NULL, '04 12 12 09', 'F', NULL, NULL, 'vickiykouame@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-16', NULL, '2025-10-27 12:16:53.503374', '2025-11-06 15:29:38.787991', NULL, NULL, 5, 37, 25, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-16', '2016-12-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1405, NULL, NULL, NULL, 1, 1, NULL, 'SIO', 'NEE DION BLONDE MATOMA EVA', '447587P', '1979-02-18', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'evaphilomene79@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-05', NULL, '2025-10-27 12:16:53.511029', '2025-11-06 15:29:38.829894', NULL, NULL, 5, 37, 25, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-01-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1410, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'DONOUGO SUZANNE', '832891A', '1979-08-18', 'GRAND-BASSAM PREF', NULL, '01 41 65 48', NULL, 'F', NULL, NULL, 'SUZANNEOUATTARA46@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-19', NULL, '2025-10-27 12:16:53.545253', '2025-11-06 15:29:39.001415', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-19', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1412, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'MAIMOUNA', '885584C', '1976-10-25', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-28', NULL, '2025-10-27 12:16:53.555845', '2025-11-06 15:29:39.007692', NULL, NULL, 6, 44, 28, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-03-28', '2024-04-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1414, NULL, NULL, NULL, 1, 1, NULL, 'LEGRE', 'LETEKEHI AIMEE', '904690D', '1986-01-13', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-10-17', NULL, '2025-10-27 12:16:53.564675', '2025-11-06 15:29:39.013518', NULL, NULL, 6, 44, 73, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2024-12-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1276, NULL, NULL, NULL, 1, 1, NULL, 'NEBIE', 'SIBIRI PHILIPPE', '275045D', '1972-03-01', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'nsibiriphilippe@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-01-06', NULL, '2025-10-27 12:16:52.556688', '2025-11-06 15:29:34.236524', NULL, NULL, 5, 39, 22, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2037-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '1999-01-06', '2020-09-07', NULL, 163, NULL);
INSERT INTO public.agents VALUES (1277, NULL, NULL, NULL, 1, 1, NULL, 'TACKA', 'KENI MARIE-ANTOINETTE G.', '233613Z', '1962-07-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'grahtacka@yao.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1988-10-03', NULL, '2025-10-27 12:16:52.561202', '2025-11-06 15:29:34.239288', NULL, NULL, 5, 39, 22, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2027-12-31', 'SOUS-DIRECTEUR', NULL, NULL, NULL, NULL, NULL, '2016-10-25', '2016-10-25', NULL, 163, NULL);
INSERT INTO public.agents VALUES (1278, NULL, NULL, NULL, 1, 1, NULL, 'GNAHOUA', 'HAFFI GERARD', '355154F', '1975-02-25', 'ABIDJAN ADM', NULL, '05 -5 0- 02', '43 54 60 70', 'M', NULL, NULL, 'gnahoua@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-10-03', NULL, '2025-10-27 12:16:52.565833', '2025-11-06 15:29:34.244842', NULL, NULL, 6, 44, 72, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2035-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2011-10-03', NULL, 163, NULL);
INSERT INTO public.agents VALUES (1279, NULL, NULL, NULL, 1, 1, NULL, 'SAMOU', 'DJAMALA BERNADIN', '390278T', '1977-12-31', 'ABIDJAN ADM', NULL, '07 /2 2/ 00', NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-02-25', NULL, '2025-10-27 12:16:52.574055', '2025-11-06 15:29:34.399532', NULL, NULL, 9, 45, 42, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 236, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2013-02-25', NULL, 163, NULL);
INSERT INTO public.agents VALUES (1280, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'KIBEDIO MARIAM', '456919U', '1983-03-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kibediomariam@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-05-23', NULL, '2025-10-27 12:16:52.579953', '2025-11-06 15:29:34.44877', NULL, NULL, 6, 44, 73, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 30, 236, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2018-05-23', NULL, 164, NULL);
INSERT INTO public.agents VALUES (1282, NULL, NULL, NULL, 1, 1, NULL, 'MOBIO', 'S. LORIANE MARTHE B.', '852135P', '1998-06-08', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:52.594614', '2025-11-06 15:29:34.48616', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2063-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1283, NULL, NULL, NULL, 1, 1, NULL, 'KALOU', 'NAN CHRISTELLE', '865752E', '1995-01-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-27', NULL, '2025-10-27 12:16:52.600439', '2025-11-06 15:29:34.493001', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-04-27', '2023-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1284, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'NEE KABA NENE', '865780F', '1990-09-14', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-04-27', NULL, '2025-10-27 12:16:52.607732', '2025-11-06 15:29:34.602806', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-04-27', '2023-05-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1290, NULL, NULL, NULL, 1, 1, NULL, 'BONI', 'NEE KOUADIO N''GUESSAN PAT', '372652K', '1984-05-26', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'kngussanpatricia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-06-28', NULL, '2025-10-27 12:16:52.642755', '2025-11-06 15:29:34.957162', NULL, NULL, 5, 39, 22, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 30, 237, '2049-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2018-07-10', '2011-07-14', NULL, 165, NULL);
INSERT INTO public.agents VALUES (1402, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'N''GUESSAN ROGER', '345914X', '1982-01-25', 'GRAND-BASSAM PREF', NULL, '20347400', '03 27 97 57', 'M', NULL, NULL, 'yassouakoffi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:53.489579', '2025-11-06 15:29:38.743185', NULL, NULL, 5, 37, 25, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2015-10-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1407, NULL, NULL, NULL, 1, 1, NULL, 'ANANI', 'AHOU D. N.EPSE AKMEL', '464159A', '1986-04-11', 'GRAND-BASSAM PREF', NULL, NULL, '40 /1 4/ 66', 'F', NULL, NULL, 'christineamani25@g:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.525652', '2025-11-06 15:29:38.991411', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1416, NULL, NULL, NULL, 1, 1, NULL, 'DANHO', 'MARIE CHANTAL', '291177X', '1973-10-23', 'ADZOPE PREF', NULL, '20347409', NULL, 'F', NULL, NULL, 'mcdanho06@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-10-23', NULL, '2025-10-27 12:16:53.576309', '2025-11-06 15:29:39.017458', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2033-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2002-10-23', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1417, NULL, NULL, NULL, 1, 1, NULL, 'KOUAHO', 'KOUASSI MICHEL', '313040A', '1976-12-20', 'ADZOPE PREF', NULL, '23540061', '01 03 68 34', 'M', NULL, NULL, 'kouahomichel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-10-04', NULL, '2025-10-27 12:16:53.58059', '2025-11-06 15:29:39.019138', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 244, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2005-10-06', '2022-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1308, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'ZEINAB TCHEMONGO', '855838T', '1998-12-18', 'ABIDJAN ADM', NULL, '07 80 17 67', NULL, 'F', NULL, NULL, 'zeinabfofana76@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-23', NULL, '2025-10-27 12:16:52.750252', '2025-11-06 15:29:35.989017', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-23', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1317, NULL, NULL, NULL, 1, 1, NULL, 'DIBY', 'KOFFI JUSTIN MEDARD', '291178G', '1973-06-02', 'ABJ-NORD', NULL, '20322454', '01 55 94 24', 'M', NULL, NULL, 'dijukome@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-07-10', NULL, '2025-10-27 12:16:52.833055', '2025-11-06 15:29:36.077148', NULL, NULL, 5, 38, 23, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2038-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2002-10-28', '2022-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1346, NULL, NULL, NULL, 1, 1, NULL, 'DAGAN', 'N''G.V. NEE KEAYENI W.L.', '855830X', '1985-01-01', 'DABOU PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'loradagan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.099876', '2025-11-06 15:29:36.658824', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2025-02-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1360, NULL, NULL, NULL, 1, 1, NULL, 'YAPO', 'AYE SIMPLICE', '304892S', '1974-06-02', 'ABIDJAN ADM', NULL, '20-32-34-31', '03 15 21 08', 'M', NULL, NULL, 'ayesimplicey@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-01', NULL, '2025-10-27 12:16:53.193287', '2025-11-06 15:29:36.849968', NULL, NULL, 6, 44, 28, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 241, '2034-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2004-12-01', '2004-12-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1395, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'ATTE STEPHANE RAMY', '855855U', '1988-03-15', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'attestephaneramy@gmail0com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.442378', '2025-11-06 15:29:38.259726', NULL, NULL, 5, 38, 59, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1415, NULL, NULL, NULL, 1, 1, NULL, 'ZEOUA', 'LOU B. MARIE FLORENCE', '852136Q', '1997-11-05', 'ADZOPE PREF', NULL, '78 82 11 44', NULL, 'F', NULL, NULL, 'zeouamarieflorence40@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:53.571396', '2025-11-06 15:29:39.015982', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1418, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'BAKAN VALENTIN', '464176T', '1982-07-22', 'ADZOPE PREF', NULL, '72 43 94 17', NULL, 'M', NULL, NULL, 'bakanvalentin@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.584529', '2025-11-06 15:29:39.021691', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1419, NULL, NULL, NULL, 1, 1, NULL, 'ZAN', 'LOU SOW MATY MICHELE', '464180U', '1987-06-22', 'ADZOPE PREF', NULL, NULL, '04 /5 9/ 10', 'F', NULL, NULL, 'zanloumichel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.591601', '2025-11-06 15:29:39.024003', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2021-08-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1420, NULL, NULL, NULL, 1, 1, NULL, 'SYLLA', 'NEE SYLLA NAWA', '470032Y', '1986-06-11', 'ADZOPE PREF', NULL, '07 19 38 65', '07 -1 9- 38', 'F', NULL, NULL, 'syllanawa@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-25', NULL, '2025-10-27 12:16:53.620289', '2025-11-06 15:29:39.025723', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 244, '2046-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-03-25', '2024-09-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1421, NULL, NULL, NULL, 1, 1, NULL, 'GOH', 'AGUIA ANNELIE SONIA', '480564V', '1991-01-19', 'ADZOPE PREF', NULL, '47 38 11 02', NULL, 'F', NULL, NULL, 'anneliesonia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:53.626242', '2025-11-06 15:29:39.04117', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1447, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'KOUADIO APOLINAIRE', '334707D', '1968-01-01', 'ABENGOUROU PREF', NULL, '07 04 33 29', NULL, 'M', NULL, NULL, 'kouapol@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-12-27', NULL, '2025-10-27 12:16:53.762475', '2025-11-06 15:29:39.548751', NULL, NULL, 5, 38, 24, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-10-12', '2020-10-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1130, NULL, NULL, NULL, 1, 1, NULL, 'KOUYATE', 'ALASSANE', '877509G', '1981-05-12', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-02-09', NULL, '2025-10-27 12:16:51.723144', '2025-11-06 15:29:21.267857', NULL, NULL, 6, 42, 29, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 225, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-09-02', '2024-03-01', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1309, NULL, NULL, NULL, 1, 1, NULL, 'KEITA', 'OUMOU', '874645C', '1996-02-13', 'ABIDJAN ADM', NULL, '67 51 86 62', '64 77 16 55', 'F', NULL, NULL, 'keitadily1@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-10-30', NULL, '2025-10-27 12:16:52.759762', '2025-11-06 15:29:36.046892', NULL, NULL, 6, 44, 40, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 238, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-10-30', '2023-11-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1321, NULL, NULL, NULL, 1, 1, NULL, 'N''GUESSAN', 'NEE BOFFO ADJA C.', '323829U', '1976-07-12', 'ABIDJAN ADM', NULL, '20347428', '07 49 39 56', 'F', NULL, NULL, 'adjalotte@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-05', NULL, '2025-10-27 12:16:52.897623', '2025-11-06 15:29:36.165712', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2006-12-01', '2025-02-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1334, NULL, NULL, NULL, 1, 1, NULL, 'TAFFIN', 'ROLANDE INGRID B.NINZY', '889628B', '1987-06-06', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'jared@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-05-14', NULL, '2025-10-27 12:16:53.017954', '2025-11-06 15:29:36.494887', NULL, NULL, 6, 42, 30, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-05-14', '2024-05-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1357, NULL, NULL, NULL, 1, 1, NULL, 'OYOUROU', 'NEE ATSEBY KOKO', '323827J', '1976-09-21', 'ABIDJAN ADM', NULL, '20323431', '01 02 03 34', 'F', NULL, NULL, 'edithoyorou1@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2007-01-25', NULL, '2025-10-27 12:16:53.173973', '2025-11-06 15:29:36.843855', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 241, '2036-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2007-01-25', '2021-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1370, NULL, NULL, NULL, 1, 1, NULL, 'ZEHIA', 'TROUPA ETIENNE-GERARD', '855891R', '1991-12-20', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'gerardzehia@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.258402', '2025-11-06 15:29:37.402147', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1394, NULL, NULL, NULL, 2, 1, NULL, 'ZAN', 'JESSICA KALOU CASSANDRA', '982940V', '1993-02-02', 'ABIDJAN ADM', NULL, '07 57 80 72', NULL, 'F', NULL, NULL, 'zanjessicakaloucassandra2022@g', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-11-25', NULL, '2025-10-27 12:16:53.433357', '2025-11-06 15:29:38.226197', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2053-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2019-11-25', '2022-08-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1397, NULL, NULL, NULL, 1, 1, NULL, 'KANONA', 'DJAMA CHRISTOPHE', '871901T', '1983-08-30', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-07-24', NULL, '2025-10-27 12:16:53.455187', '2025-11-06 15:29:38.509357', NULL, NULL, 5, 38, 24, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-07-24', '2023-07-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1433, NULL, NULL, NULL, 1, 1, NULL, 'DIARRA', 'MAIMOUNA', '291174U', '1974-01-09', 'AGBOVILLE PREF', NULL, NULL, '03 57 09 24', 'F', NULL, NULL, 'mounadika@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2002-11-04', NULL, '2025-10-27 12:16:53.686819', '2025-11-06 15:29:39.222584', NULL, NULL, 5, 38, 23, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2039-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '2002-11-04', '2022-07-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1435, NULL, NULL, NULL, 1, 1, NULL, 'TOURE', 'ROKIA', '815499Q', '1993-06-27', 'AGBOVILLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'tourerokia42@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:53.695848', '2025-11-06 15:29:39.270636', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1436, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'KONAN EUGENE', '345910F', '1977-12-28', 'AGBOVILLE PREF', NULL, '23-57-32-08', '09 76 92 85', 'M', NULL, NULL, 'eugenekonan551@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:53.702979', '2025-11-06 15:29:39.30324', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 245, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2022-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1442, NULL, NULL, NULL, 1, 1, NULL, 'AMAN', 'TANON ELISE', '481901M', '1993-12-22', 'AGBOVILLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-28', NULL, '2025-10-27 12:16:53.733153', '2025-11-06 15:29:39.42521', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-28', '2024-07-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1443, NULL, NULL, NULL, 1, 1, NULL, 'N''DRI', 'AMENAN ANNICK', '481983F', '1983-02-09', 'AGBOVILLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'ndriamenanannick0902@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-02', NULL, '2025-10-27 12:16:53.740039', '2025-11-06 15:29:39.467123', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-02', '2020-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1444, NULL, NULL, NULL, 1, 1, NULL, 'ASSANVO', 'NEE ASSEMIAN E. T. AYA', '495974K', '1981-01-29', 'AGBOVILLE PREF', NULL, '07 08 14 32', '07 07 84 75', 'F', NULL, NULL, 'evyciboul@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-07-07', NULL, '2025-10-27 12:16:53.744465', '2025-11-06 15:29:39.541334', NULL, NULL, 6, 44, 63, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-07-07', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1446, NULL, NULL, NULL, 1, 1, NULL, 'KOUAME', 'ADJOUA LEA-JUSTINE', '418951W', '1978-04-11', 'AGBOVILLE PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'justinelea.kouame@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-19', NULL, '2025-10-27 12:16:53.756792', '2025-11-06 15:29:39.546379', NULL, NULL, 9, 45, 42, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2038-12-31', 'ADJOINT ADMINISTRATIF', NULL, NULL, NULL, NULL, NULL, '2015-10-19', '2015-11-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1343, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'NATTAUD', '433404J', '1984-06-28', 'DABOU PREF', NULL, '06 82 43 30', '07 53 03 01', 'F', NULL, NULL, 'nattaud@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2016-11-14', NULL, '2025-10-27 12:16:53.081003', '2025-11-06 15:29:36.651704', NULL, NULL, 6, 44, 28, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2016-11-14', '2016-12-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1363, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'SALIMATA', '447958A', '1989-04-30', 'ABIDJAN ADM', NULL, '09 26 52 53', '02 36 53 45', 'F', NULL, NULL, 'lymata2@hotmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2018-01-15', NULL, '2025-10-27 12:16:53.212405', '2025-11-06 15:29:37.067733', NULL, NULL, 6, 44, 28, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2018-01-05', '2018-02-21', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1364, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'TIEKPELE MADELEINE F', '464165Y', '1978-08-11', 'ABIDJAN ADM', NULL, '48 39 59 00', '04 00 41 37', 'F', NULL, NULL, 'coulibafatima@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-01-03', NULL, '2025-10-27 12:16:53.218284', '2025-11-06 15:29:37.116469', NULL, NULL, 6, 44, 28, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-01-03', '2019-01-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1380, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'ABENAN ZIT.EPSE KOUAME', '480581P', '1983-12-06', 'ABIDJAN ADM', NULL, '07 07 45 95', NULL, 'F', NULL, NULL, 'zitakouadio23@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-24', NULL, '2025-10-27 12:16:53.332391', '2025-11-06 15:29:37.686625', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-24', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1406, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'ALLA SILVAIN KOUAKOU', '418949C', '1975-04-03', 'GRAND-BASSAM PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'allasy120kouakou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-10-19', NULL, '2025-10-27 12:16:53.517202', '2025-11-06 15:29:38.903782', NULL, NULL, 6, 44, 28, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2035-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-10-19', '2015-10-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1448, NULL, NULL, NULL, 1, 1, NULL, 'SILUE', 'LAGNINA EMILE', '815669H', '1996-05-22', 'ABENGOUROU PREF', NULL, '58 84 83 11', '01 41 67 62', 'M', NULL, NULL, 'lsilueem@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-03', NULL, '2025-10-27 12:16:53.766954', '2025-11-06 15:29:39.550767', NULL, NULL, 5, 38, 68, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-03', '2021-06-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1449, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'SALI ESTELLE', '820825P', '1995-08-20', 'ABIDJAN ADM', NULL, '57 95 64 38', '05 45 59 21', 'F', NULL, NULL, 'diarrassoubasalieestelle@gmail', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-10-21', NULL, '2025-10-27 12:16:53.773637', '2025-11-06 15:29:39.611849', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2060-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-10-21', '2023-08-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1450, NULL, NULL, NULL, 1, 1, NULL, 'AMANI', 'JOSIANE TATIANA', '866768P', '1998-03-09', 'ABENGOUROU PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'amanjosiane09@icloud.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-05-15', NULL, '2025-10-27 12:16:53.780263', '2025-11-06 15:29:39.619053', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2063-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-05-15', '2024-05-10', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1452, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'AKOISSI CATHERINE', '345916Z', '1980-12-18', 'ABENGOUROU PREF', NULL, '20347428', '02 90 05 03', 'F', NULL, NULL, 'kouassicatherine29@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:53.791717', '2025-11-06 15:29:39.651227', NULL, NULL, 5, 37, 25, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2025-01-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1453, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'FERVENCHE ORGELLINA', '361854B', '1978-12-24', 'ABENGOUROU PREF', NULL, '08 18 44 06', '0 10 27 63', 'F', NULL, NULL, 'josianezoeyapi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:53.795683', '2025-11-06 15:29:39.688855', NULL, NULL, 6, 44, 28, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 246, '2038-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1325, NULL, NULL, NULL, 1, 1, NULL, 'HOUSSOU', 'MAWA M''LEE PRISCA', '480566X', '1991-04-16', 'ABJ-NORD', NULL, NULL, NULL, 'F', NULL, NULL, 'priscahoussou16@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-25', NULL, '2025-10-27 12:16:52.945868', '2025-11-06 15:29:36.206292', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-25', '2022-04-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1336, NULL, NULL, NULL, 1, 1, NULL, 'YAPI', 'APIE LUCIE', '469887S', '1988-11-01', 'ABJ-NORD', NULL, NULL, NULL, 'F', NULL, NULL, 'yapiapielucie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-03-18', NULL, '2025-10-27 12:16:53.030636', '2025-11-06 15:29:36.498472', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-03-18', '2020-08-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1351, NULL, NULL, NULL, 1, 1, NULL, 'SINGO', 'ALBERT', '468537Z', '1980-10-08', 'DABOU PREF', NULL, '03 24 86 48', '04 05 41 78', 'M', NULL, NULL, 'singoalbert01@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2019-02-21', NULL, '2025-10-27 12:16:53.133493', '2025-11-06 15:29:36.66829', NULL, NULL, 9, 45, 42, 27, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2019-02-21', '2019-03-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1471, NULL, NULL, NULL, 1, 1, NULL, 'AMANI', 'NEE TOURE MIGABLIMPENI N', '483686P', '1983-01-09', 'BOUAKE PREF', NULL, '07 44 58 38', '07 44 58 38', 'F', NULL, NULL, 'nathaliemiga@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-04-06', NULL, '2025-10-27 12:16:53.891386', '2025-11-06 15:29:39.969303', NULL, NULL, 5, 38, 80, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-04-06', '2020-09-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1472, NULL, NULL, NULL, 1, 1, NULL, 'ETTY', 'NIAMKEY FLEUR LYZE MARIA', '803534P', '1994-09-10', 'BOUAKE PREF', NULL, NULL, '01 03 27 94', 'F', NULL, NULL, 'lysemariaamp@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-11-19', NULL, '2025-10-27 12:16:53.895724', '2025-11-06 15:29:39.973284', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-11-19', '2021-02-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1473, NULL, NULL, NULL, 1, 1, NULL, 'CONDE', 'KHADY', '852132L', '1999-06-07', 'BOUAKE PREF', NULL, '56 11 64 91', NULL, 'F', NULL, NULL, 'condekhady05@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-12-01', NULL, '2025-10-27 12:16:53.900658', '2025-11-06 15:29:39.975305', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2064-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-12-01', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1474, NULL, NULL, NULL, 1, 1, NULL, 'SANGARE', 'MAMA EDWIGE', '313045T', '1974-07-31', 'BOUAKE PREF', NULL, '707580813', '31 63 00 33', 'F', NULL, NULL, 'mamaedwige2@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2005-01-17', NULL, '2025-10-27 12:16:53.906806', '2025-11-06 15:29:39.977459', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2034-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2005-10-17', '2005-10-17', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1476, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'IBRAHIME KHALIL', '855872V', '1985-03-25', 'BOUAKE PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-31', NULL, '2025-10-27 12:16:53.917008', '2025-11-06 15:29:39.98104', NULL, NULL, 6, 44, 48, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-31', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1326, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'NEE DEMBELE MAHAN A.', '480684W', '1993-10-28', 'ABJ-NORD', NULL, '49 14 15 98', '43 06 81 33', 'F', NULL, NULL, 'amydembele13@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:52.951798', '2025-11-06 15:29:36.208061', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2024-07-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1393, NULL, NULL, NULL, 1, 1, NULL, 'ATTA', 'KOUASSI FELIX-OLIVIER', '481393P', '1993-04-06', 'ABIDJAN ADM', NULL, '79 13 98 16', NULL, 'M', NULL, NULL, 'attaoliviers454@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:53.426568', '2025-11-06 15:29:38.222457', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 242, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-09-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1496, NULL, NULL, NULL, 1, 1, NULL, 'MESSOU', 'MELIN PARFAIT', '815474N', '1994-12-28', 'KATIOLA PREF', NULL, '58 99 42 28', '07 58 99 42', 'M', NULL, NULL, 'parfaitmelinmessou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.073622', '2025-11-06 15:29:40.12467', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2022-08-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1497, NULL, NULL, NULL, 1, 1, NULL, 'EDEOU', 'JACQUES JOEL', '852217Z', '1997-07-25', 'KATIOLA PREF', NULL, '79 36 95 15', NULL, 'M', NULL, NULL, 'edeoujacquesjoel@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:54.077657', '2025-11-06 15:29:40.127352', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 248, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 249, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1520, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'ADIGATA KOUBOURA', '855871U', '1996-11-17', 'BOUNA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-09', NULL, '2025-10-27 12:16:54.192482', '2025-11-06 15:29:40.580688', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 251, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 251, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-09', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1327, NULL, NULL, NULL, 1, 1, NULL, 'ALLOU', 'EHINLIN AMAKAN SIMONE', '815421H', '1992-03-12', 'ABJ-NORD', NULL, NULL, NULL, 'F', NULL, NULL, 'simoneamakan@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-29', NULL, '2025-10-27 12:16:52.959314', '2025-11-06 15:29:36.246203', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 239, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-29', '2022-08-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1338, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'ADJOUA BIENVENUE', '482868U', '1984-10-30', 'ABJ-NORD', NULL, '77 00 19 72', '73 43 12 10', 'F', NULL, NULL, 'kab01distribution@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-25', NULL, '2025-10-27 12:16:53.044866', '2025-11-06 15:29:36.502968', NULL, NULL, 8, 47, 33, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-25', '2022-07-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1525, NULL, NULL, NULL, 1, 1, NULL, 'AKESSE', 'CEDRIC-EVRARD', '815418N', '1993-04-01', 'DALOA PREF', NULL, '78 78 77 21', NULL, 'M', NULL, NULL, 'evrardakesse@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-08', NULL, '2025-10-27 12:16:54.213341', '2025-11-06 15:29:40.734338', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 252, '2058-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-08', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1527, NULL, NULL, NULL, 1, 1, NULL, 'KONATE', 'MOUSSA', '359178T', '1980-06-23', 'DALOA PREF', NULL, '58 41 03 37', '05 47 58 94', 'M', NULL, NULL, 'konatemous1977@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:54.224403', '2025-11-06 15:29:40.737174', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 252, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2021-12-22', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1528, NULL, NULL, NULL, 1, 1, NULL, 'OUOHI', 'KOUADE LAURENT', '387981N', '1973-12-29', 'DALOA PREF', NULL, '59 11 14 23', '59 11 14 23', 'M', NULL, NULL, 'koidelaur73@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-02-11', NULL, '2025-10-27 12:16:54.22769', '2025-11-06 15:29:40.773868', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 252, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2013-02-11', '2022-01-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1807, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'SOUMAILA', '297579G', '1973-01-17', 'DALOA PREF', NULL, '65 65 55 56', '08 24 70 26', 'M', NULL, NULL, 'traore.soumaila@tourisme.gouv.ci', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2003-10-01', NULL, '2025-10-27 12:18:57.614697', '2025-11-06 15:29:48.983', NULL, NULL, 5, 37, 25, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 252, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 252, '2033-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2003-10-10', '2020-05-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1328, NULL, NULL, NULL, 1, 1, NULL, 'COULIBALY', 'TENEDJA KARIDJATOU', '815435F', '1994-01-01', 'ABJ-NORD', NULL, NULL, '07 58 45 98', 'F', NULL, NULL, 'kadycoulibaly308@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:52.965676', '2025-11-06 15:29:36.354855', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1329, NULL, NULL, NULL, 1, 1, NULL, 'SERIFOU', 'MAIMOUNATA', '815491G', '1984-03-13', 'ABJ-NORD', NULL, NULL, '07 58 74 01', 'F', NULL, NULL, 'maimounata48@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-23', NULL, '2025-10-27 12:16:52.976227', '2025-11-06 15:29:36.359717', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 239, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-23', '2021-07-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1390, NULL, NULL, NULL, 1, 1, NULL, 'KOUAGNON', 'FLEUR MARIETTE', '857718C', '1990-10-05', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-02-16', NULL, '2025-10-27 12:16:53.405674', '2025-11-06 15:29:38.027143', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-02-16', '2023-02-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1408, NULL, NULL, NULL, 1, 1, NULL, 'EHOUSSOU', 'L. M.C. EPSE SILUE', '815445R', '1992-10-11', 'GRAND-BASSAM PREF', NULL, '07 48 94 14', NULL, 'F', NULL, NULL, 'marie.chantal476@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:53.532631', '2025-11-06 15:29:38.99551', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1550, NULL, NULL, NULL, 1, 1, NULL, 'OYA', 'CHO MARIE-CHRISTELLE D.', '420435P', '1987-04-03', 'DIVO PREF', NULL, '59 96 73 07', '59 96 73 07', 'F', NULL, NULL, 'oyamariechristelle@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-12-17', NULL, '2025-10-27 12:16:54.32442', '2025-11-06 15:29:41.308645', NULL, NULL, 5, 38, 24, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2015-12-17', '2016-03-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1551, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'N''DRI LUCIEN', '357771K', '1975-03-12', 'DIVO PREF', NULL, '07 07 65 08', '01 40 47 60', 'M', NULL, NULL, 'lucienndrikoffi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-01-05', NULL, '2025-10-27 12:16:54.328014', '2025-11-06 15:29:41.386203', NULL, NULL, 5, 38, 81, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 254, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2010-01-05', '2023-01-24', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1552, NULL, NULL, NULL, 1, 1, NULL, 'KAMATE', 'AISSATA', '852231X', '1998-12-25', 'DIVO PREF', NULL, '48 13 67 27', NULL, 'F', NULL, NULL, 'kamatéaicha83@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:54.333047', '2025-11-06 15:29:41.391329', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2063-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1554, NULL, NULL, NULL, 1, 1, NULL, 'MANGOUEU', 'PEASSEU ANABELLE P.', '908662Q', '2001-06-14', 'DIVO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-04-08', NULL, '2025-10-27 12:16:54.34317', '2025-11-06 15:29:41.396372', NULL, NULL, 5, 37, 75, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 254, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 254, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1383, NULL, NULL, NULL, 1, 1, NULL, 'DOSSO', 'AFFOU CHANTAL', '832859Z', '1993-01-01', 'ABIDJAN ADM', NULL, '07 59 34 39', '01 70 89 49', 'F', NULL, NULL, 'dossoaffouchantal@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-04', NULL, '2025-10-27 12:16:53.355909', '2025-11-06 15:29:37.734193', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2053-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-04', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1409, NULL, NULL, NULL, 1, 1, NULL, 'NANGAH', 'NEE KOUAME TENA EMMA S.', '830080W', '1980-09-15', 'GRAND-BASSAM PREF', NULL, '07 07 86 46', '27 34 76 38', 'F', NULL, NULL, 'philnangah@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-17', NULL, '2025-10-27 12:16:53.540161', '2025-11-06 15:29:38.998622', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 242, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 243, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-17', '2023-06-23', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1424, NULL, NULL, NULL, 1, 1, NULL, 'EVI', 'NINA ROSINE', '832864N', '1988-07-01', 'ADZOPE PREF', NULL, NULL, '40 50 25 10', 'F', NULL, NULL, 'eninarosine@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-06-10', NULL, '2025-10-27 12:16:53.641574', '2025-11-06 15:29:39.080518', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-06-10', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1425, NULL, NULL, NULL, 1, 1, NULL, 'KEBE', 'MAMY YACHOT DENISE M.', '832874Q', '1991-01-07', 'ADZOPE PREF', NULL, '48 47 10 32', '05 84 46 34', 'F', NULL, NULL, 'kebemamy25@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-09', NULL, '2025-10-27 12:16:53.645333', '2025-11-06 15:29:39.082713', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 243, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 244, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-09', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1432, NULL, NULL, NULL, 1, 1, NULL, 'YAO', 'JACQUES MARTIAL', '827809T', '1978-08-02', 'AGBOVILLE PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-03', NULL, '2025-10-27 12:16:53.680948', '2025-11-06 15:29:39.184858', NULL, NULL, 5, 38, 59, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 244, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 245, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-03-05', '2024-12-20', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1458, NULL, NULL, NULL, 1, 1, NULL, 'AKA', 'EHOUMAN HENRI', '820542T', '1985-12-27', 'ABENGOUROU PREF', NULL, '78 79 09 12', NULL, 'M', NULL, NULL, 'henriaka85@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-09-28', NULL, '2025-10-27 12:16:53.823178', '2025-11-06 15:29:39.736074', NULL, NULL, 6, 44, 69, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 245, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 246, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-09-28', '2021-09-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1468, NULL, NULL, NULL, 1, 1, NULL, 'ZAHA', 'GOUSLET JUSTE DEBAYET', '830131R', '1994-01-26', 'DAOUKRO PREF', NULL, '88 45 43 34', '01 03 98 63', 'M', NULL, NULL, 'zahajuste26@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:53.875195', '2025-11-06 15:29:39.937188', NULL, NULL, 9, 45, 42, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 246, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 247, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-06-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1488, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'BEN ISMAEL', '827449Z', '1990-04-06', 'BOUAKE PREF', NULL, '77 23 92 68', '05 05 35 07', 'M', NULL, NULL, 'ysmaelwattara@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-05', NULL, '2025-10-27 12:16:54.015391', '2025-11-06 15:29:40.023203', NULL, NULL, 6, 44, 40, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 247, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 248, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-04-05', '2022-05-03', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1571, NULL, NULL, NULL, 1, 1, NULL, 'KOULIBALY', 'KAKOUGO ABDOUL-KARIM', '827826B', '1982-06-26', 'MAN PREF', NULL, NULL, '05 75 43 31', 'M', NULL, NULL, 'abdkoulibaly07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-05', NULL, '2025-10-27 12:16:54.450751', '2025-11-06 15:29:41.83165', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 255, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 255, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-05', '2024-06-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1577, NULL, NULL, NULL, 1, 1, NULL, 'N''', 'GORAN THOMPSON JACOB S. A.', '815477R', '1996-03-07', 'GUIGLO PREF', NULL, NULL, '01 03 94 41', 'M', NULL, NULL, 'ngoranjacob07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:54.514739', '2025-11-06 15:29:41.877942', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1578, NULL, NULL, NULL, 1, 1, NULL, 'KONOUA', 'JULIEN', '272133X', '1973-04-01', 'GUIGLO PREF', NULL, '05 56 52 83', '47 71 25 86', 'M', NULL, NULL, 'julienkonouadezanka@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:54.524364', '2025-11-06 15:29:41.911681', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2033-12-31', 'DIRECTEUR DEPARTEMENTAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1579, NULL, NULL, NULL, 1, 1, NULL, 'ASSI', 'EDOUARD', '481390Y', '1985-06-24', 'GUIGLO PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'assiedouard85@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-09', NULL, '2025-10-27 12:16:54.530071', '2025-11-06 15:29:41.951359', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2045-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-09', '2020-03-09', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1580, NULL, NULL, NULL, 1, 1, NULL, 'KALOU', 'LOU IRIE MICHELLE', '803457S', '1995-07-12', 'GUIGLO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'loumichelle96@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-11', NULL, '2025-10-27 12:16:54.537078', '2025-11-06 15:29:41.987229', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-11-16', '2020-11-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1581, NULL, NULL, NULL, 1, 1, NULL, 'FERDINAND', 'KASSI PERPETUE', '815447K', '1991-10-09', 'GUIGLO PREF', NULL, NULL, '01 72 97 36', 'F', NULL, NULL, 'kassiperpetueferdinand@gmail.c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:54.543629', '2025-11-06 15:29:42.006846', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1582, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'ANGE ANDREA', '815456L', '1999-09-20', 'GUIGLO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'kangeandrea@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-26', NULL, '2025-10-27 12:16:54.550269', '2025-11-06 15:29:42.009332', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 256, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 256, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-26', '2021-07-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1318, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'LAZENI', '852291U', '1996-12-24', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, 'tlazeni747@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:52.848517', '2025-11-06 15:29:36.079608', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2022-12-12', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1330, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'KINANGORO REGINA', '834142L', '1991-03-12', 'ABIDJAN ADM', NULL, '07 77 15 43', '05 65 76 27', 'F', NULL, NULL, 'regiinakinangoroouattara@gmail', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-27', NULL, '2025-10-27 12:16:52.983198', '2025-11-06 15:29:36.379205', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-27', '2024-01-19', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1345, NULL, NULL, NULL, 1, 1, NULL, 'TANO', 'AHOU BENEDICTE', '832904P', '1982-02-20', 'DABOU PREF', NULL, '77 39 89 63', '07 77 39 89', 'F', NULL, NULL, 'benedictano82@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:53.093918', '2025-11-06 15:29:36.656766', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1584, NULL, NULL, NULL, 1, 1, NULL, 'ASSEKE', 'AHOUA HUGUES DAVY', '855824M', '1991-09-18', 'DANANE PREF', NULL, NULL, NULL, 'M', NULL, NULL, 'ahouahuguesdavy@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-12', NULL, '2025-10-27 12:16:54.607807', '2025-11-06 15:29:42.013132', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 257, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-12', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1585, NULL, NULL, NULL, 1, 1, NULL, 'BOUA', 'GNAZOU BAUDOUIN JOEL', '820543U', '1987-02-11', 'DANANE PREF', NULL, '58 53 19 12', '01 44 12 86', 'M', NULL, NULL, 'jobosll02@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-09-28', NULL, '2025-10-27 12:16:54.660731', '2025-11-06 15:29:42.0148', NULL, NULL, 6, 44, 69, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 257, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 257, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-09-28', '2021-09-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1589, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'NEE N''GORAN N''DRI SUZAN.', '400817T', '1974-05-07', 'SAN-PEDRO PREF', NULL, '08 -8 6- 03', '05 -9 5- 30', 'F', NULL, NULL, 'koffisuzanne1974@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2014-06-10', NULL, '2025-10-27 12:16:54.772074', '2025-11-06 15:29:42.140809', NULL, NULL, 5, 38, 68, 25, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 258, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 258, '2039-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '2019-11-05', '2019-09-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1333, NULL, NULL, NULL, 1, 1, NULL, 'KABRAN', 'YAH FLORENCE', '856590Y', '1981-04-02', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'yahflorence2019@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-26', NULL, '2025-10-27 12:16:53.01206', '2025-11-06 15:29:36.492633', NULL, NULL, 6, 42, 29, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-26', '2023-02-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1347, NULL, NULL, NULL, 1, 1, NULL, 'KAPIE', 'ADJOUA JACQUELINE', '855846T', '1982-12-22', 'DABOU PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'adjouajkapie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-05', NULL, '2025-10-27 12:16:53.107711', '2025-11-06 15:29:36.6607', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-05', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1369, NULL, NULL, NULL, 1, 1, NULL, 'N''KE', 'BAH EVELYNE SUZIE', '855868H', '1990-10-28', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'bahevelynesuzie@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-12', NULL, '2025-10-27 12:16:53.251458', '2025-11-06 15:29:37.360592', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 241, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-12', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1386, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'LILIANE NADEGE', '855848D', '1988-09-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:53.377469', '2025-11-06 15:29:37.841404', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 242, '2048-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1613, NULL, NULL, NULL, 1, 1, NULL, 'KOFFI', 'AMOIN ROSALIE', '481064Q', '1990-12-30', 'SASSANDRA PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-04', NULL, '2025-10-27 12:16:54.994842', '2025-11-06 15:29:42.690938', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 260, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 260, '2050-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-04', '2020-03-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1614, NULL, NULL, NULL, 1, 1, NULL, 'TRAORE', 'MADANE', '855887M', '1997-02-22', 'SASSANDRA PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'madanetraore69@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-10', NULL, '2025-10-27 12:16:54.999974', '2025-11-06 15:29:42.696219', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 260, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 260, '2057-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-10', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1615, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'PELAOUOTERI', '272139D', '1972-10-14', 'KORHOGO PREF', NULL, '32782307', NULL, 'F', NULL, NULL, 'pelaouoteri@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '1999-05-03', NULL, '2025-10-27 12:16:55.00754', '2025-11-06 15:29:42.698473', NULL, NULL, 5, 38, 23, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2037-12-31', 'DIRECTEUR REGIONAL', NULL, NULL, NULL, NULL, NULL, '1999-05-03', '2022-07-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1616, NULL, NULL, NULL, 1, 1, NULL, 'DAHOUE', 'METONGOU IBRAHIM', '815437H', '1994-05-19', 'KORHOGO PREF', NULL, '78 18 96 60', '01 40 51 05', 'M', NULL, NULL, 'dahoue19gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:55.012984', '2025-11-06 15:29:42.700457', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 261, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 261, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-06-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1335, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'YAYA', '874813M', '1980-12-30', 'ABIDJAN ADM', NULL, '07 62 17 86', '04 94 61 22', 'M', NULL, NULL, 'kyaya2356@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-11-16', NULL, '2025-10-27 12:16:53.025446', '2025-11-06 15:29:36.496647', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 239, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-11-16', '2023-12-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1350, NULL, NULL, NULL, 1, 1, NULL, 'GOUMENOU', 'AMOIN VALERIE NADEGE', '885624K', '1989-03-26', 'DABOU PREF', NULL, '08 61 05 84', NULL, 'F', NULL, NULL, 'valeriegoumenou@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-03-14', NULL, '2025-10-27 12:16:53.12766', '2025-11-06 15:29:36.66642', NULL, NULL, 6, 42, 31, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 240, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 240, '2049-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2024-03-14', '2024-04-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1635, NULL, NULL, NULL, 1, 1, NULL, 'ASSE', 'LEA SABINE', '855823L', '1996-09-12', 'BOUNDIALI PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'assalea57@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-18', NULL, '2025-10-27 12:16:55.145472', '2025-11-06 15:29:43.003522', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2056-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-18', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1637, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'KAGAYOMON', '490894K', '1984-06-11', 'BOUNDIALI PREF', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-06-04', NULL, '2025-10-27 12:16:55.158418', '2025-11-06 15:29:43.085172', NULL, NULL, 6, 44, 36, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 262, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 262, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-06-04', '2020-06-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1640, NULL, NULL, NULL, 1, 1, NULL, 'DIARRASSOUBA', 'MASSOGBE', '876947V', '1997-04-17', 'FERKESSEDOUGOU P.', NULL, '47 90 33 19', NULL, 'F', NULL, NULL, 'diarrassoubamassogbe0@gmailcom', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-24', NULL, '2025-10-27 12:16:55.176601', '2025-11-06 15:29:43.199368', NULL, NULL, 5, 38, 68, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 263, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 263, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-01-24', '2024-01-31', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1657, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'AMENAN BRIGITTE', '357504H', '1979-03-28', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'brigittekouakou07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-04-24', NULL, '2025-10-27 12:16:55.277873', '2025-11-06 15:29:43.364672', NULL, NULL, 5, 38, 79, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2024-04-24', '2024-05-08', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1658, NULL, NULL, NULL, 1, 1, NULL, 'KONE', 'ASSATA', '815458W', '1996-06-04', 'YAMOUSSOUKRO PREF', NULL, '05 04 21 08', '01 41 30 29', 'F', NULL, NULL, 'kassata57@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-04', NULL, '2025-10-27 12:16:55.281244', '2025-11-06 15:29:43.366586', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2061-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-04', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1659, NULL, NULL, NULL, 1, 1, NULL, 'SEKA', 'YAPO RAPHAEL RENE-MARIE', '815489N', '1994-10-08', 'YAMOUSSOUKRO PREF', NULL, '07 58 41 67', NULL, 'M', NULL, NULL, 'sekeyaporaphael@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-07', NULL, '2025-10-27 12:16:55.286089', '2025-11-06 15:29:43.401177', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-07', '2021-06-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1660, NULL, NULL, NULL, 1, 1, NULL, 'OUATTARA', 'GNOUNGO', '852269M', '1994-01-01', 'YAMOUSSOUKRO PREF', NULL, '47 82 39 21', '05 44 74 44', 'F', NULL, NULL, 'adjaraouattara@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-11-29', NULL, '2025-10-27 12:16:55.291187', '2025-11-06 15:29:43.432683', NULL, NULL, 5, 38, 68, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2059-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-11-29', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1667, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'FATOUMATA', '482246U', '1987-04-14', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-03-19', NULL, '2025-10-27 12:16:55.322089', '2025-11-06 15:29:43.581482', NULL, NULL, 6, 44, 48, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 20, NULL, NULL, NULL, NULL, NULL, 31, 266, '2047-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-03-19', '2020-05-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1672, NULL, NULL, NULL, 1, 1, NULL, 'KORANDI', 'ANZOUMANA OUATTARA', '480709P', '1989-07-15', 'YAMOUSSOUKRO PREF', NULL, '09 74 58 27', '03 25 29 84', 'M', NULL, NULL, 'ouattarakorandi@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2020-02-27', NULL, '2025-10-27 12:16:55.344085', '2025-11-06 15:29:43.596274', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2020-02-27', '2020-02-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1673, NULL, NULL, NULL, 1, 1, NULL, 'BOSSON', 'YA MARIE', '815426E', '1984-10-19', 'YAMOUSSOUKRO PREF', NULL, NULL, '07 07 61 99', 'F', NULL, NULL, 'mariebetyb@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-04-27', NULL, '2025-10-27 12:16:55.347606', '2025-11-06 15:29:43.597974', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2044-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-04-27', '2021-07-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1674, NULL, NULL, NULL, 1, 1, NULL, 'KEHO', 'AMIINATA', '815451P', '1981-12-16', 'YAMOUSSOUKRO PREF', NULL, '07 08 00 68', '01 40 04 72', 'F', NULL, NULL, 'aminakeho@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-06', NULL, '2025-10-27 12:16:55.351525', '2025-11-06 15:29:43.630811', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2041-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-06', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1675, NULL, NULL, NULL, 1, 1, NULL, 'KONIN', 'TANO DOMINIQUE', '819354H', '1991-04-08', 'YAMOUSSOUKRO PREF', NULL, '07 09 87 69', NULL, 'M', NULL, NULL, 'dominiquekonin91@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-08-24', NULL, '2025-10-27 12:16:55.357074', '2025-11-06 15:29:43.633876', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-08-24', '2021-08-30', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1678, NULL, NULL, NULL, 1, 1, NULL, 'KOUAKOU', 'AKISSY LINDA BELLA B.', '832886D', '1989-04-24', 'YAMOUSSOUKRO PREF', NULL, '07 47 38 11', NULL, 'F', NULL, NULL, 'lindakouakou47@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-10', NULL, '2025-10-27 12:16:55.368041', '2025-11-06 15:29:43.641682', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2049-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-10', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1679, NULL, NULL, NULL, 1, 1, NULL, 'NIAMIEN', 'N''GORAN MICHELLE BETTY', '855867Y', '1994-11-02', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'michellebety55@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:55.373997', '2025-11-06 15:29:43.643791', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2024-05-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1680, NULL, NULL, NULL, 1, 1, NULL, 'SORO', 'LORYAGABA', '855881P', '1991-04-14', 'YAMOUSSOUKRO PREF', NULL, NULL, NULL, 'F', NULL, NULL, 'loryagabasoro@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-06', NULL, '2025-10-27 12:16:55.37741', '2025-11-06 15:29:43.645645', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2051-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-06', '2023-02-06', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1681, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AHOU FLORENTINE', '815461R', '1992-12-24', 'YAMOUSSOUKRO PREF', NULL, '07 58 16 15', NULL, 'F', NULL, NULL, 'kflorentine17@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-05-05', NULL, '2025-10-27 12:16:55.380793', '2025-11-06 15:29:43.647615', NULL, NULL, 6, 44, 40, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2052-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-05-05', '2021-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1683, NULL, NULL, NULL, 1, 1, NULL, 'KOUADIO', 'AYA MARIE AGNES E.', '827419K', '1982-01-22', 'YAMOUSSOUKRO PREF', NULL, '07 57 73 89', '01 40 87 12', 'F', NULL, NULL, 'evekouadio1982@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-22', NULL, '2025-10-27 12:16:55.39006', '2025-11-06 15:29:43.651496', NULL, NULL, 6, 42, 31, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2042-12-31', 'SECRETAIRE ASSISTANT COMPTABLE', NULL, NULL, NULL, NULL, NULL, '2022-04-22', '2025-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1729, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'MOUSTAPHA SOULEYMANE', '396544Y', '1981-01-01', 'LAGOS', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-10-23', NULL, '2025-10-27 12:16:55.592932', '2025-11-06 15:29:45.180122', NULL, NULL, 5, 38, 68, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 278, NULL, 21, NULL, NULL, NULL, NULL, NULL, 32, 278, '2046-12-31', 'DIRECTEUR', NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-04', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (985, NULL, NULL, NULL, 1, 1, NULL, 'OUSSOU', 'VALENTIN OUONGO', '460997T', '1979-02-07', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-09-11', NULL, '2025-10-27 12:16:50.724985', '2025-11-06 15:29:10.112685', NULL, NULL, 5, 37, 27, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-15', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (986, NULL, NULL, NULL, 1, 1, NULL, 'CHATIGRE', 'AHOU KARENE ORNELLA M', '861964X', '1992-09-24', NULL, NULL, NULL, NULL, 'F', NULL, NULL, 'chatigre.karene@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-12-28', NULL, '2025-10-27 12:16:50.72949', '2025-11-06 15:29:10.115235', NULL, NULL, 5, 37, 27, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2052-12-31', 'INCONNUE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-28', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (987, NULL, NULL, NULL, 1, 1, NULL, 'SIALOU', 'NEE ANOMAN YOUWA G.', '855878B', '1982-09-17', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, 'anogigi0311@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2023-01-17', NULL, '2025-10-27 12:16:50.734297', '2025-11-06 15:29:10.232591', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2023-01-17', '2025-01-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (995, NULL, NULL, NULL, 2, 1, NULL, 'ANDI', 'LEAL DANIEL', '504952W', '1972-05-23', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-05', NULL, '2025-10-27 12:16:50.78126', '2025-11-06 15:29:11.098565', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2032-12-31', 'DIRECTEUR DE CABINET', NULL, NULL, NULL, NULL, NULL, '2017-03-27', '2017-03-27', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (996, NULL, NULL, NULL, 2, 1, NULL, 'AOUSSI', 'AURELIA FRANCOISE ETTY', '504954Y', '1987-03-27', 'ABIDJAN ADM', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-13', NULL, '2025-10-27 12:16:50.785597', '2025-11-06 15:29:11.30328', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2047-12-31', 'CONSEILLER TECHNIQUE', NULL, NULL, NULL, NULL, NULL, '2017-01-13', '2017-01-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (997, NULL, NULL, NULL, 2, 1, NULL, 'KOSSONOU', 'KOFFI FRANCK KARL S.', '504956S', '1987-07-03', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-01-05', NULL, '2025-10-27 12:16:50.792454', '2025-11-06 15:29:11.353043', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 28, 218, '2047-12-31', 'CHARGE DE PROJET', NULL, NULL, NULL, NULL, NULL, '2017-01-13', '2017-01-13', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (998, NULL, NULL, NULL, 2, 1, NULL, 'KONE', 'NEE YOBOUE BERTINE', '982675X', '1976-11-06', 'ABIDJAN ADM', NULL, '20347904', '21 26 74 98', 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-11-02', NULL, '2025-10-27 12:16:50.796908', '2025-11-06 15:29:11.422483', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2036-12-31', 'SECRETAIRE', NULL, NULL, NULL, NULL, NULL, '2004-11-02', '2014-06-26', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (999, NULL, NULL, NULL, 2, 1, NULL, 'ADJET', 'GERTRUDE MIREILLE', '982907R', '1981-02-12', 'ABJ-PLATEAU', NULL, NULL, NULL, 'F', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2017-10-16', NULL, '2025-10-27 12:16:50.801435', '2025-11-06 15:29:11.42576', NULL, NULL, NULL, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 238, NULL, 20, NULL, NULL, NULL, NULL, NULL, 28, 218, '2041-12-31', 'CHARGE DE PROJET', NULL, NULL, NULL, NULL, NULL, '2017-10-18', '2017-10-18', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1663, NULL, NULL, NULL, 1, 1, NULL, 'BOGNINI', 'M. T. MARIE-LOUISE', '386604B', '1979-04-08', 'BOUAFLE PREF', NULL, '03 20 76 68', '07 45 21 83', 'F', NULL, NULL, 'laovaht@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-02-07', NULL, '2025-10-27 12:16:55.304245', '2025-11-06 15:29:43.569669', NULL, NULL, 5, 37, 25, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 267, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 266, '2039-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2013-02-07', '2025-10-16', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1668, NULL, NULL, NULL, 1, 1, NULL, 'ALLANGBA', 'FRANCINE ARLETTE A.', '385534K', '1983-06-04', 'YAMOUSSOUKRO PREF', NULL, '5757385', '05 05 45 34', 'F', NULL, NULL, 'afanija@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-03-13', NULL, '2025-10-27 12:16:55.327016', '2025-11-06 15:29:43.588733', NULL, NULL, 6, 44, 28, 29, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 21, NULL, NULL, NULL, NULL, NULL, 31, 266, '2043-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2013-02-11', '2013-02-11', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1676, NULL, NULL, NULL, 1, 1, NULL, 'TAYLOR', 'ADJOUAH MARIE SANDRINE', '827829N', '1994-07-07', 'YAMOUSSOUKRO PREF', NULL, '07 48 65 15', '01 53 65 64', 'F', NULL, NULL, 'sandrinemarietaylor@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-05', NULL, '2025-10-27 12:16:55.360352', '2025-11-06 15:29:43.637299', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2054-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-05', '2022-06-02', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1677, NULL, NULL, NULL, 1, 1, NULL, 'DIBIE', 'AMA ELLA GENEVIEVE', '832853K', '1995-10-04', 'YAMOUSSOUKRO PREF', NULL, '07 07 05 22', NULL, 'F', NULL, NULL, 'dibieella500@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-05-09', NULL, '2025-10-27 12:16:55.364559', '2025-11-06 15:29:43.639636', NULL, NULL, 6, 44, 28, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2055-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2022-05-09', '2022-06-14', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1682, NULL, NULL, NULL, 1, 1, NULL, 'KONAN', 'AFFOUE MARIE-LAURE', '826001K', '1991-07-13', 'YAMOUSSOUKRO PREF', NULL, '07 09 65 03', '05 04 94 79', 'F', NULL, NULL, 'marielaure0965@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-14', NULL, '2025-10-27 12:16:55.384187', '2025-11-06 15:29:43.649559', NULL, NULL, 6, 44, 41, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2051-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-03-14', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1684, NULL, NULL, NULL, 1, 1, NULL, 'KOUASSI', 'N''DRI ROMAIN', '826005P', '1980-01-01', 'YAMOUSSOUKRO PREF', NULL, '07 49 81 72', NULL, 'M', NULL, NULL, 'kouassindriromain07@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-03-17', NULL, '2025-10-27 12:16:55.393384', '2025-11-06 15:29:43.653332', NULL, NULL, 8, 47, 32, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 266, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 266, '2040-12-31', 'AGENT SPECIALISE DES TP', NULL, NULL, NULL, NULL, NULL, '2022-03-17', '2022-04-07', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1035, NULL, NULL, NULL, 2, 1, NULL, 'OUATTARA', 'ADAMAN', '982829J', '1972-05-15', 'ABIDJAN ADM', NULL, NULL, NULL, 'M', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2015-03-10', NULL, '2025-10-27 12:16:51.006128', '2025-11-06 15:29:15.542083', NULL, NULL, NULL, NULL, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 28, 218, '2032-12-31', 'CHAUFFEUR', NULL, NULL, NULL, NULL, NULL, '2015-03-10', '2024-02-02', NULL, 182, NULL);
INSERT INTO public.agents VALUES (1687, NULL, NULL, NULL, 1, 1, NULL, 'FOFANA', 'CHEIK ABDOUL KADER', '815448U', '1997-03-09', 'DIMBOKRO PREF', NULL, '49 05 02 83', '01 70 94 29', 'M', NULL, NULL, 'cheickabdoul.kader@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-06-02', NULL, '2025-10-27 12:16:55.408744', '2025-11-06 15:29:43.65854', NULL, NULL, 5, 38, 68, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 268, NULL, 19, NULL, NULL, NULL, NULL, NULL, 31, 267, '2062-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-06-02', '2021-07-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1766, NULL, NULL, NULL, 1, 1, NULL, 'TOURE', 'NEE YODAN HERMANCE E.', '827511F', '1982-09-12', 'ABIDJAN ADM', NULL, '07 49 02 43', '01 40 41 35', 'F', NULL, NULL, 'estelleyodam@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2022-04-19', NULL, '2025-10-27 12:16:55.77248', '2025-11-06 15:29:47.034486', NULL, NULL, 6, 44, 41, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2042-12-31', 'SECRETAIRE DE DIRECTION', NULL, NULL, NULL, NULL, NULL, '2022-04-19', '2022-05-05', NULL, NULL, NULL);
INSERT INTO public.agents VALUES (1767, NULL, NULL, NULL, 1, 1, NULL, 'DOHI', 'ULRICH ANGE PIERRE', '323842Z', '1973-12-20', 'ABIDJAN ADM', NULL, '20251620', '67 23 26 06', 'M', NULL, NULL, 'lesdohi@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2006-12-06', NULL, '2025-10-27 12:16:55.776697', '2025-11-06 15:29:47.073697', NULL, NULL, 5, 37, 25, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 288, '2033-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2006-12-06', '2006-12-06', NULL, 173, NULL);
INSERT INTO public.agents VALUES (1782, NULL, NULL, NULL, 1, 1, NULL, 'ASSAMOI', 'AFFOUE VALERIE', '361146D', '1973-08-18', 'ABIDJAN ADM', NULL, '09 07 52 12', NULL, 'F', NULL, NULL, 'mamradatou@hotmail.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-10-04', NULL, '2025-10-27 12:16:55.842901', '2025-11-06 15:29:48.228738', NULL, NULL, 5, 38, 62, 24, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2038-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2012-06-04', '2009-10-04', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1783, NULL, NULL, NULL, 1, 1, NULL, 'SEKE', 'ESSOH FRANCOIS', '304897X', '1976-12-30', 'ABIDJAN ADM', NULL, '20251600/13', '05 40 47 83', 'M', NULL, NULL, 'essohseke@gm:c', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2004-12-02', NULL, '2025-10-27 12:16:55.846572', '2025-11-06 15:29:48.248103', NULL, NULL, 5, 37, 25, 26, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2036-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2004-12-02', '2021-12-22', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1784, NULL, NULL, NULL, 1, 1, NULL, 'DOUA', 'FERNARD', '345909K', '1977-01-11', 'ABIDJAN ADM', NULL, '08 73 76 62', NULL, 'M', NULL, NULL, 'fernardb@yahoo.fr', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-12-11', NULL, '2025-10-27 12:16:55.850747', '2025-11-06 15:29:48.251303', NULL, NULL, 5, 37, 25, 35, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2037-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2008-12-11', '2021-02-17', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1785, NULL, NULL, NULL, 1, 1, NULL, 'ASSEMIEN', 'NEE KODJO LEONIE', '359179U', '1972-10-24', 'ABIDJAN ADM', NULL, '05 02 24 12', '20 37 14 70', 'F', NULL, NULL, 'leonierolandeassemienkodjo@yah', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-02-16', NULL, '2025-10-27 12:16:55.856571', '2025-11-06 15:29:48.255042', NULL, NULL, 6, 44, 28, 31, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 21, NULL, NULL, NULL, NULL, NULL, 33, 289, '2032-12-31', 'CHEF DE SERVICE', NULL, NULL, NULL, NULL, NULL, '2010-02-16', '2010-02-16', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1786, NULL, NULL, NULL, 1, 1, NULL, 'DIOMANDE', 'NEE TOURE FATOU', '810021J', '1982-12-10', 'ABIDJAN ADM', NULL, '07 49 88 19', '01 03 97 24', 'F', NULL, NULL, 'fanatoure1@gmail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-03-15', NULL, '2025-10-27 12:16:55.859864', '2025-11-06 15:29:48.397242', NULL, NULL, 6, 44, 28, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2042-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-03-15', '2021-03-15', NULL, 178, NULL);
INSERT INTO public.agents VALUES (1787, NULL, NULL, NULL, 1, 1, NULL, 'DIOMANDE', 'MAFANTA', '807762F', '1980-12-10', 'ABIDJAN ADM', NULL, '07 77 65 55', '05 04 01 04', 'F', NULL, NULL, 'mafantad@ymail.com', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2021-02-09', NULL, '2025-10-27 12:16:55.863172', '2025-11-06 15:29:48.435984', NULL, NULL, 9, 45, 42, 32, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73, NULL, 19, NULL, NULL, NULL, NULL, NULL, 33, 289, '2040-12-31', 'AGENT DE BUREAU', NULL, NULL, NULL, NULL, NULL, '2021-02-09', '2021-02-17', NULL, 178, NULL);
