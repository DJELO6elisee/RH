--
-- PostgreSQL database dump
--



-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;  -- Commenté: non disponible dans PostgreSQL 10.23
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

-- CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;  -- Commenté pour compatibilité hébergeur


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION btree_gin IS 'Extension pour les index GIN sur les types de donnees B-tree';  -- Commenté car extension non disponible


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

-- CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;  -- Commenté pour compatibilité hébergeur


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION pg_trgm IS 'Extension pour les recherches textuelles avec trigrammes';  -- Commenté car extension non disponible


--
--
-- Suppression de toutes les fonctions existantes
--

DROP FUNCTION IF EXISTS public.generate_unique_entity_code(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.get_hierarchy_for_agent(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_services_by_entite(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_services_by_ministere(integer) CASCADE;
DROP FUNCTION IF EXISTS public.tr_demandes_assign_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS public.tr_demandes_historique_update() CASCADE;
DROP FUNCTION IF EXISTS public.update_modified_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.validate_entity_code_uniqueness() CASCADE;
DROP FUNCTION IF EXISTS public.validate_institution_code_uniqueness() CASCADE;

-- Name: generate_unique_entity_code(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
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

        -- Verifier dans entites_administratives

        WHILE EXISTS (SELECT 1 FROM entites_administratives WHERE code = new_code) LOOP

            new_code := p_base_code || '_' || counter;

            counter := counter + 1;

        END LOOP;

    ELSIF p_table_name = 'entites_institutions' THEN

        -- Verifier dans entites_institutions

        WHILE EXISTS (SELECT 1 FROM entites_institutions WHERE code = new_code) LOOP

            new_code := p_base_code || '_' || counter;

            counter := counter + 1;

        END LOOP;

    END IF;

    

    RETURN new_code;

END;

$$;


-- ALTER FUNCTION public.generate_unique_entity_code(p_base_code character varying, p_table_name character varying) OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: get_hierarchy_for_agent(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_hierarchy_for_agent(agent_id integer) RETURNS json
    LANGUAGE plpgsql
    AS $$

DECLARE

    result JSON;

    agent_ministere_id INTEGER;

    agent_service_id INTEGER;

BEGIN

    -- Recuperer les informations de l'agent

    SELECT id_ministere, id_service 

    INTO agent_ministere_id, agent_service_id

    FROM agents 

    WHERE id = agent_id;

    

    -- Construire la hierarchie en utilisant les IDs de reference

    SELECT json_build_object(

        'chef_service', (

            SELECT a.id FROM agents a

            WHERE a.id_service = agent_service_id 

            AND a.fonction_actuelle ILIKE '%chef%'

            LIMIT 1

        ),

        'drh', (

            SELECT a.id FROM agents a

            WHERE a.id_ministere = agent_ministere_id 

            AND a.fonction_actuelle ILIKE '%DRH%'

            LIMIT 1

        ),

        'directeur', (

            SELECT a.id FROM agents a

            WHERE a.id_ministere = agent_ministere_id 

            AND a.fonction_actuelle ILIKE '%directeur%'

            LIMIT 1

        ),

        'ministre', (

            SELECT a.id FROM agents a

            WHERE a.id_ministere = agent_ministere_id 

            AND a.fonction_actuelle ILIKE '%ministre%'

            LIMIT 1

        )

    ) INTO result;

    

    RETURN result;

END;

$$;


-- ALTER FUNCTION public.get_hierarchy_for_agent(agent_id integer) OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: get_services_by_entite(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


-- ALTER FUNCTION public.get_services_by_entite(p_id_entite integer) OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: FUNCTION get_services_by_entite(p_id_entite integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_services_by_entite(p_id_entite integer) IS 'Recupere tous les services actifs d''une entite';


--
-- Name: get_services_by_ministere(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


-- ALTER FUNCTION public.get_services_by_ministere(p_id_ministere integer) OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: FUNCTION get_services_by_ministere(p_id_ministere integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_services_by_ministere(p_id_ministere integer) IS 'Recupere tous les services actifs d''un ministere avec leurs entites';


--
-- Name: tr_demandes_assign_hierarchy(); Type: FUNCTION; Schema: public; Owner: postgres
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

            'Nouvelle demande a valider',

            'Une nouvelle demande de type "' || NEW.type_demande || '" a ete soumise par un agent et necessite votre validation.'

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

        'Demande soumise avec succes',

        'Votre demande de type "' || NEW.type_demande || '" a ete soumise et est en cours de traitement.'

    );

    RETURN NEW;

END;

$$;


-- ALTER FUNCTION public.tr_demandes_assign_hierarchy() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: tr_demandes_historique_update(); Type: FUNCTION; Schema: public; Owner: postgres
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


-- ALTER FUNCTION public.tr_demandes_historique_update() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.date_modification = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


-- ALTER FUNCTION public.update_modified_column() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


-- ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: validate_entity_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_entity_code_uniqueness() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Verifier l'unicite dans entites_administratives

    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN

        RAISE EXCEPTION 'Le code % existe deja dans entites_administratives', NEW.code;

    END IF;

    

    -- Verifier l'unicite dans entites_institutions

    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code) THEN

        RAISE EXCEPTION 'Le code % existe deja dans entites_institutions', NEW.code;

    END IF;

    

    RETURN NEW;

END;

$$;


-- ALTER FUNCTION public.validate_entity_code_uniqueness() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: validate_institution_code_uniqueness(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_institution_code_uniqueness() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Verifier l'unicite dans entites_institutions

    IF EXISTS (SELECT 1 FROM entites_institutions WHERE code = NEW.code AND id != COALESCE(NEW.id, 0)) THEN

        RAISE EXCEPTION 'Le code % existe deja dans entites_institutions', NEW.code;

    END IF;

    

    -- Verifier l'unicite dans entites_administratives

    IF EXISTS (SELECT 1 FROM entites_administratives WHERE code = NEW.code) THEN

        RAISE EXCEPTION 'Le code % existe deja dans entites_administratives', NEW.code;

    END IF;

    

    RETURN NEW;

END;

$$;


-- ALTER FUNCTION public.validate_institution_code_uniqueness() OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Suppression de toutes les tables existantes (dans l'ordre inverse des dependances)
--

DROP TABLE IF EXISTS public.workflow_demandes CASCADE;
DROP TABLE IF EXISTS public.utilisateurs CASCADE;
DROP TABLE IF EXISTS public.unite_administratives CASCADE;
DROP TABLE IF EXISTS public.type_etablissements CASCADE;
DROP TABLE IF EXISTS public.type_de_seminaire_de_formation_institutions CASCADE;
DROP TABLE IF EXISTS public.type_de_seminaire_de_formation CASCADE;
DROP TABLE IF EXISTS public.type_de_retraites CASCADE;
DROP TABLE IF EXISTS public.type_de_materiels CASCADE;
DROP TABLE IF EXISTS public.type_de_documents_institutions CASCADE;
DROP TABLE IF EXISTS public.type_de_documents CASCADE;
DROP TABLE IF EXISTS public.type_de_destinations CASCADE;
DROP TABLE IF EXISTS public.type_de_couriers CASCADE;
DROP TABLE IF EXISTS public.type_de_conges CASCADE;
DROP TABLE IF EXISTS public.type_d_agents CASCADE;
DROP TABLE IF EXISTS public.tiers_institutions CASCADE;
DROP TABLE IF EXISTS public.tiers CASCADE;
DROP TABLE IF EXISTS public.stage CASCADE;
DROP TABLE IF EXISTS public.specialites CASCADE;
DROP TABLE IF EXISTS public.situation_matrimonials CASCADE;
DROP TABLE IF EXISTS public.sindicats CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.services_institutions CASCADE;
DROP TABLE IF EXISTS public.services_entites CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.seminaire_participants CASCADE;
DROP TABLE IF EXISTS public.seminaire_formation CASCADE;
DROP TABLE IF EXISTS public.sanctions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.permissions_entites_institutions CASCADE;
DROP TABLE IF EXISTS public.permissions_entites CASCADE;
DROP TABLE IF EXISTS public.pays CASCADE;
DROP TABLE IF EXISTS public.pathologies CASCADE;
DROP TABLE IF EXISTS public.notifications_demandes CASCADE;
DROP TABLE IF EXISTS public.nominations CASCADE;
DROP TABLE IF EXISTS public.niveau_langues CASCADE;
DROP TABLE IF EXISTS public.niveau_informatiques CASCADE;
DROP TABLE IF EXISTS public.nature_d_accidents CASCADE;
DROP TABLE IF EXISTS public.nature_actes CASCADE;
DROP TABLE IF EXISTS public.nationalites CASCADE;
DROP TABLE IF EXISTS public.motif_de_departs CASCADE;
DROP TABLE IF EXISTS public.mode_d_entrees CASCADE;
DROP TABLE IF EXISTS public.ministeres CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.logiciels CASCADE;
DROP TABLE IF EXISTS public.localites CASCADE;
DROP TABLE IF EXISTS public.langues CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.handicaps CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.fonctions CASCADE;
DROP TABLE IF EXISTS public.fonction_agents CASCADE;
DROP TABLE IF EXISTS public.etude_diplome CASCADE;
DROP TABLE IF EXISTS public.entites_institutions CASCADE;
DROP TABLE IF EXISTS public.entites_administratives CASCADE;
DROP TABLE IF EXISTS public.enfants_institutions CASCADE;
DROP TABLE IF EXISTS public.enfants CASCADE;
DROP TABLE IF EXISTS public.emplois CASCADE;
DROP TABLE IF EXISTS public.emploi_agents CASCADE;
DROP TABLE IF EXISTS public.echelons CASCADE;
DROP TABLE IF EXISTS public.dossiers_institutions CASCADE;
DROP TABLE IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.documents_autorisation CASCADE;
DROP TABLE IF EXISTS public.distinctions CASCADE;
DROP TABLE IF EXISTS public.diplomes CASCADE;
DROP TABLE IF EXISTS public.departements CASCADE;
DROP TABLE IF EXISTS public.demandes_historique CASCADE;
DROP TABLE IF EXISTS public.demandes CASCADE;
DROP TABLE IF EXISTS public.classeurs_institutions CASCADE;
DROP TABLE IF EXISTS public.classeurs CASCADE;
DROP TABLE IF EXISTS public.civilites CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.autre_absences CASCADE;
DROP TABLE IF EXISTS public.agents_institutions_main CASCADE;
DROP TABLE IF EXISTS public.agents_entites_institutions CASCADE;
DROP TABLE IF EXISTS public.agents_entites CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.agent_photos CASCADE;
DROP TABLE IF EXISTS public.agent_login_codes CASCADE;
DROP TABLE IF EXISTS public.agent_logiciels CASCADE;
DROP TABLE IF EXISTS public.agent_langues CASCADE;
DROP TABLE IF EXISTS public.agent_documents CASCADE;
DROP TABLE IF EXISTS public.affectations_temporaires_institutions CASCADE;
DROP TABLE IF EXISTS public.affectations_temporaires CASCADE;

-- Suppression des vues si elles existent
DROP VIEW IF EXISTS public.v_services_avec_entites CASCADE;
DROP VIEW IF EXISTS public.v_demandes_en_attente CASCADE;
DROP VIEW IF EXISTS public.v_notifications_non_lues CASCADE;

SET default_tablespace = '';

-- SET default_table_access_method = heap;  -- Commenté: non supporté par PostgreSQL 10.x (disponible depuis v12)

--
-- Name: affectations_temporaires; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT affectations_temporaires_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_cours'::character varying, 'terminee'::character varying, 'annulee'::character varying])::text[])))
);


-- ALTER TABLE public.affectations_temporaires OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affectations_temporaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.affectations_temporaires_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affectations_temporaires_id_seq OWNED BY public.affectations_temporaires.id;


--
-- Name: affectations_temporaires_institutions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT affectations_temporaires_institutions_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_cours'::character varying, 'terminee'::character varying, 'annulee'::character varying])::text[])))
);


-- ALTER TABLE public.affectations_temporaires_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affectations_temporaires_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.affectations_temporaires_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affectations_temporaires_institutions_id_seq OWNED BY public.affectations_temporaires_institutions.id;


--
-- Name: agent_documents; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.agent_documents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE agent_documents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_documents IS 'Documents des agents (diplomes, certificats, etc.)';


--
-- Name: COLUMN agent_documents.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.id IS 'Identifiant unique du document';


--
-- Name: COLUMN agent_documents.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN agent_documents.document_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.document_type IS 'Type de document (diplome, certificat, attestation, autre)';


--
-- Name: COLUMN agent_documents.document_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.document_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_documents.document_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.document_url IS 'URL ou chemin du document';


--
-- Name: COLUMN agent_documents.document_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.document_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_documents.document_mime_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.document_mime_type IS 'Type MIME du document';


--
-- Name: COLUMN agent_documents.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_documents.description IS 'Description du document';


--
-- Name: agent_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agent_documents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agent_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_documents_id_seq OWNED BY public.agent_documents.id;


--
-- Name: agent_langues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_langues (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_langue integer NOT NULL,
    id_niveau_langue integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.agent_langues OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE agent_langues; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_langues IS 'Table de liaison entre agents et langues avec niveau et certification';


--
-- Name: COLUMN agent_langues.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_langues.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN agent_langues.id_langue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_langues.id_langue IS 'Reference vers la langue';


--
-- Name: COLUMN agent_langues.id_niveau_langue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_langues.id_niveau_langue IS 'Niveau de maitrise de la langue';


--
-- Name: agent_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agent_langues_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agent_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_langues_id_seq OWNED BY public.agent_langues.id;


--
-- Name: agent_logiciels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_logiciels (
    id integer NOT NULL,
    id_agent integer NOT NULL,
    id_logiciel integer NOT NULL,
    id_niveau_informatique integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.agent_logiciels OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE agent_logiciels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_logiciels IS 'Table de liaison entre agents et logiciels avec niveau et certification';


--
-- Name: COLUMN agent_logiciels.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_logiciels.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN agent_logiciels.id_logiciel; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_logiciels.id_logiciel IS 'Reference vers le logiciel';


--
-- Name: COLUMN agent_logiciels.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_logiciels.id_niveau_informatique IS 'Niveau de maitrise du logiciel';


--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agent_logiciels_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_logiciels_id_seq OWNED BY public.agent_logiciels.id;


--
-- Name: agent_login_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_login_codes (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    code character varying(8) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.agent_login_codes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE agent_login_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_login_codes IS 'Codes de connexion temporaires pour les agents';


--
-- Name: COLUMN agent_login_codes.agent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_login_codes.agent_id IS 'ID de l\''agent';


--
-- Name: COLUMN agent_login_codes.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_login_codes.code IS 'Code de connexion (8 caracteres hexadecimaux)';


--
-- Name: COLUMN agent_login_codes.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_login_codes.expires_at IS 'Date et heure d\expiration du code';


--
-- Name: COLUMN agent_login_codes.used_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_login_codes.used_at IS 'Date et heure d\utilisation du code (NULL si non utilise)';


--
-- Name: COLUMN agent_login_codes.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_login_codes.created_at IS 'Date et heure de creation du code';


--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_login_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agent_login_codes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_login_codes_id_seq OWNED BY public.agent_login_codes.id;


--
-- Name: agent_photos; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.agent_photos OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE agent_photos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_photos IS 'Photos des agents (photo de profil)';


--
-- Name: COLUMN agent_photos.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.id IS 'Identifiant unique de la photo';


--
-- Name: COLUMN agent_photos.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN agent_photos.photo_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.photo_url IS 'URL ou chemin de la photo';


--
-- Name: COLUMN agent_photos.photo_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.photo_name IS 'Nom original du fichier';


--
-- Name: COLUMN agent_photos.photo_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.photo_size IS 'Taille du fichier en octets';


--
-- Name: COLUMN agent_photos.photo_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.photo_type IS 'Type MIME de la photo';


--
-- Name: COLUMN agent_photos.is_profile_photo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_photos.is_profile_photo IS 'Indique si c''est la photo de profil';


--
-- Name: agent_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agent_photos_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agent_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_photos_id_seq OWNED BY public.agent_photos.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: postgres
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
    id_service integer,
    date_retraite date,
    fonction_actuelle character varying(200),
    fonction_anterieure character varying(200),
    situation_militaire character varying(50),
    numero_cnps character varying(50),
    date_declaration_cnps date,
    CONSTRAINT agents_sexe_check CHECK ((sexe = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
    CONSTRAINT agents_situation_militaire_check CHECK ((((situation_militaire)::text = ANY ((ARRAY['Exempte'::character varying, 'Reforme'::character varying, 'Bon pour le service'::character varying, 'Dispense'::character varying, 'Non concerne'::character varying])::text[])) OR (situation_militaire IS NULL))),
    CONSTRAINT agents_statut_emploi_check CHECK (((statut_emploi)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying, 'retraite'::character varying, 'demission'::character varying, 'licencie'::character varying])::text[])))
);


-- ALTER TABLE public.agents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: COLUMN agents.id_fonction; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_fonction IS 'Reference vers la fonction de l''agent';


--
-- Name: COLUMN agents.id_pays; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_pays IS 'Reference vers le pays de l''agent';


--
-- Name: COLUMN agents.id_categorie; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_categorie IS 'Reference vers la categorie de l''agent';


--
-- Name: COLUMN agents.id_grade; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_grade IS 'Reference vers le grade de l''agent';


--
-- Name: COLUMN agents.id_emploi; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_emploi IS 'Reference vers l''emploi de l''agent';


--
-- Name: COLUMN agents.id_echelon; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_echelon IS 'Reference vers l''echelon de l''agent';


--
-- Name: COLUMN agents.id_specialite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_specialite IS 'Reference vers la specialite de l''agent';


--
-- Name: COLUMN agents.id_langue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_langue IS 'Reference vers la langue de l''agent';


--
-- Name: COLUMN agents.id_niveau_langue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_niveau_langue IS 'Reference vers le niveau de langue de l''agent';


--
-- Name: COLUMN agents.id_motif_depart; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_motif_depart IS 'Reference vers le motif de depart de l''agent';


--
-- Name: COLUMN agents.id_type_conge; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_conge IS 'Reference vers le type de conge de l''agent';


--
-- Name: COLUMN agents.id_autre_absence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_autre_absence IS 'Reference vers le type d''autre absence de l''agent';


--
-- Name: COLUMN agents.id_distinction; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_distinction IS 'Reference vers la distinction de l''agent';


--
-- Name: COLUMN agents.id_type_etablissement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_etablissement IS 'Reference vers le type d''etablissement de l''agent';


--
-- Name: COLUMN agents.id_unite_administrative; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_unite_administrative IS 'Reference vers l''unite administrative de l''agent';


--
-- Name: COLUMN agents.id_diplome; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_diplome IS 'Reference vers le diplome de l''agent';


--
-- Name: COLUMN agents.id_type_materiel; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_materiel IS 'Reference vers le type de materiel de l''agent';


--
-- Name: COLUMN agents.id_type_destination; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_destination IS 'Reference vers le type de destination de l''agent';


--
-- Name: COLUMN agents.id_nature_accident; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_nature_accident IS 'Reference vers la nature d''accident de l''agent';


--
-- Name: COLUMN agents.id_sanction; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_sanction IS 'Reference vers la sanction de l''agent';


--
-- Name: COLUMN agents.id_sindicat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_sindicat IS 'Reference vers le syndicat de l''agent';


--
-- Name: COLUMN agents.id_type_courrier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_courrier IS 'Reference vers le type de courrier de l''agent';


--
-- Name: COLUMN agents.id_nature_acte; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_nature_acte IS 'Reference vers la nature d''acte de l''agent';


--
-- Name: COLUMN agents.id_localite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_localite IS 'Reference vers la localite de l''agent';


--
-- Name: COLUMN agents.id_mode_entree; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_mode_entree IS 'Reference vers le mode d''entree de l''agent';


--
-- Name: COLUMN agents.id_position; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_position IS 'Reference vers la position de l''agent';


--
-- Name: COLUMN agents.id_pathologie; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_pathologie IS 'Reference vers la pathologie de l''agent';


--
-- Name: COLUMN agents.id_handicap; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_handicap IS 'Reference vers le handicap de l''agent';


--
-- Name: COLUMN agents.id_niveau_informatique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_niveau_informatique IS 'Reference vers le niveau informatique de l''agent';


--
-- Name: COLUMN agents.id_logiciel; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_logiciel IS 'Reference vers le logiciel de l''agent';


--
-- Name: COLUMN agents.id_type_retraite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_type_retraite IS 'Reference vers le type de retraite de l''agent';


--
-- Name: COLUMN agents.id_service; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id_service IS 'Reference vers le service d''affectation de l''agent';


--
-- Name: COLUMN agents.date_retraite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.date_retraite IS 'Date de retraite de l''agent';


--
-- Name: COLUMN agents.fonction_actuelle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.fonction_actuelle IS 'Fonction actuelle de l''agent';


--
-- Name: COLUMN agents.fonction_anterieure; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.fonction_anterieure IS 'Fonction anterieure de l''agent';


--
-- Name: COLUMN agents.situation_militaire; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.situation_militaire IS 'Situation militaire de l''agent';


--
-- Name: COLUMN agents.numero_cnps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.numero_cnps IS 'Numero CNPS pour les agents non fonctionnaires';


--
-- Name: COLUMN agents.date_declaration_cnps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.date_declaration_cnps IS 'Date de declaration CNPS pour les agents non fonctionnaires';


--
-- Name: agents_entites; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.agents_entites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agents_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agents_entites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agents_entites_id_seq OWNED BY public.agents_entites.id;


--
-- Name: agents_entites_institutions; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.agents_entites_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agents_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agents_entites_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agents_entites_institutions_id_seq OWNED BY public.agents_entites_institutions.id;


--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: agents_institutions_main; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT agents_institutions_main_statut_emploi_check CHECK (((statut_emploi)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying, 'retraite'::character varying, 'demission'::character varying, 'licencie'::character varying])::text[])))
);


-- ALTER TABLE public.agents_institutions_main OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agents_institutions_main_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.agents_institutions_main_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agents_institutions_main_id_seq OWNED BY public.agents_institutions_main.id;


--
-- Name: autre_absences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.autre_absences (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.autre_absences OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: autre_absences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.autre_absences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.autre_absences_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: autre_absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.autre_absences_id_seq OWNED BY public.autre_absences.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.categories OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: civilites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.civilites (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.civilites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: civilites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.civilites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.civilites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: civilites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.civilites_id_seq OWNED BY public.civilites.id;


--
-- Name: classeurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classeurs (
    id integer NOT NULL,
    id_ministere integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.classeurs OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: classeurs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classeurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.classeurs_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: classeurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classeurs_id_seq OWNED BY public.classeurs.id;


--
-- Name: classeurs_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classeurs_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_dossier integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.classeurs_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classeurs_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.classeurs_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classeurs_institutions_id_seq OWNED BY public.classeurs_institutions.id;


--
-- Name: demandes; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT demandes_niveau_actuel_check CHECK (((niveau_actuel)::text = ANY ((ARRAY['chef_service'::character varying, 'drh'::character varying, 'directeur'::character varying, 'ministre'::character varying, 'finalise'::character varying])::text[]))),
    CONSTRAINT demandes_niveau_evolution_demande_check CHECK (((niveau_evolution_demande)::text = ANY ((ARRAY['soumis'::character varying, 'en_cours_traitement'::character varying, 'valide_par_superieur'::character varying, 'valide_par_drh'::character varying, 'valide_par_direction'::character varying, 'valide_par_ministre'::character varying, 'retour_ministre'::character varying, 'retour_drh'::character varying, 'retour_chef_service'::character varying, 'finalise'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_phase_actuelle_check CHECK (((phase_actuelle)::text = ANY ((ARRAY['aller'::character varying, 'retour'::character varying])::text[]))),
    CONSTRAINT demandes_phase_check CHECK (((phase)::text = ANY ((ARRAY['aller'::character varying, 'retour'::character varying])::text[]))),
    CONSTRAINT demandes_priorite_check CHECK (((priorite)::text = ANY ((ARRAY['normale'::character varying, 'urgente'::character varying, 'critique'::character varying])::text[]))),
    CONSTRAINT demandes_status_check CHECK (((status)::text = ANY ((ARRAY['en_attente'::character varying, 'approuve'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_statut_chef_service_check CHECK (((statut_chef_service)::text = ANY ((ARRAY['en_attente'::character varying, 'approuve'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_statut_directeur_check CHECK (((statut_directeur)::text = ANY ((ARRAY['en_attente'::character varying, 'approuve'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_statut_drh_check CHECK (((statut_drh)::text = ANY ((ARRAY['en_attente'::character varying, 'approuve'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_statut_ministre_check CHECK (((statut_ministre)::text = ANY ((ARRAY['en_attente'::character varying, 'approuve'::character varying, 'rejete'::character varying])::text[]))),
    CONSTRAINT demandes_type_demande_check CHECK (((type_demande)::text = ANY ((ARRAY['absence'::character varying, 'sortie_territoire'::character varying, 'attestation_travail'::character varying, 'attestation_presence'::character varying, 'note_service'::character varying, 'certificat_cessation'::character varying])::text[])))
);


-- ALTER TABLE public.demandes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: demandes_historique; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.demandes_historique OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.demandes_historique_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.demandes_historique_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: demandes_historique_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demandes_historique_id_seq OWNED BY public.demandes_historique.id;


--
-- Name: demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.demandes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demandes_id_seq OWNED BY public.demandes.id;


--
-- Name: departements; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.departements OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE departements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.departements IS 'Table des departements avec reference aux regions';


--
-- Name: COLUMN departements.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departements.code IS 'Code unique du departement (ex: ABJ-01)';


--
-- Name: departements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.departements_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: departements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departements_id_seq OWNED BY public.departements.id;


--
-- Name: diplomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diplomes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    type_de_diplome character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.diplomes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: diplomes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diplomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.diplomes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: diplomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diplomes_id_seq OWNED BY public.diplomes.id;


--
-- Name: distinctions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distinctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nature character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.distinctions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: distinctions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.distinctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.distinctions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: distinctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.distinctions_id_seq OWNED BY public.distinctions.id;


--
-- Name: documents_autorisation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents_autorisation (
    id integer NOT NULL,
    id_demande integer NOT NULL,
    type_document character varying(50) NOT NULL,
    titre character varying(255) NOT NULL,
    contenu text NOT NULL,
    chemin_fichier character varying(500),
    statut character varying(20) DEFAULT 'genere'::character varying,
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


-- ALTER TABLE public.documents_autorisation OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE documents_autorisation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documents_autorisation IS 'Documents generes automatiquement lors de la validation des demandes';


--
-- Name: COLUMN documents_autorisation.type_document; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents_autorisation.type_document IS 'Type de document: autorisation_absence, autorisation_sortie, etc.';


--
-- Name: COLUMN documents_autorisation.contenu; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents_autorisation.contenu IS 'Contenu du document en HTML ou JSON structure';


--
-- Name: COLUMN documents_autorisation.chemin_fichier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents_autorisation.chemin_fichier IS 'Chemin vers le fichier PDF genere (optionnel)';


--
-- Name: COLUMN documents_autorisation.statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents_autorisation.statut IS 'Statut du document: genere, envoye, signe';


--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_autorisation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.documents_autorisation_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_autorisation_id_seq OWNED BY public.documents_autorisation.id;


--
-- Name: dossiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dossiers (
    id integer NOT NULL,
    id_ministere integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.dossiers OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: dossiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dossiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.dossiers_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: dossiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dossiers_id_seq OWNED BY public.dossiers.id;


--
-- Name: dossiers_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dossiers_institutions (
    id integer NOT NULL,
    id_institution integer,
    id_entite integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.dossiers_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dossiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.dossiers_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dossiers_institutions_id_seq OWNED BY public.dossiers_institutions.id;


--
-- Name: echelons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.echelons (
    id integer NOT NULL,
    indice character varying(20) NOT NULL,
    salaire_net numeric(10,2),
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.echelons OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: echelons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.echelons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.echelons_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: echelons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.echelons_id_seq OWNED BY public.echelons.id;


--
-- Name: emploi_agents; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.emploi_agents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emploi_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.emploi_agents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: emploi_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emploi_agents_id_seq OWNED BY public.emploi_agents.id;


--
-- Name: emplois; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emplois (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    libele_court character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.emplois OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: emplois_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emplois_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.emplois_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: emplois_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emplois_id_seq OWNED BY public.emplois.id;


--
-- Name: enfants; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.enfants OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: enfants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enfants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.enfants_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: enfants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enfants_id_seq OWNED BY public.enfants.id;


--
-- Name: enfants_institutions; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.enfants_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enfants_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.enfants_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enfants_institutions_id_seq OWNED BY public.enfants_institutions.id;


--
-- Name: entites_administratives; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT entites_administratives_type_entite_check CHECK (((type_entite)::text = ANY ((ARRAY['direction'::character varying, 'departement'::character varying, 'service'::character varying, 'bureau'::character varying, 'division'::character varying])::text[])))
);


-- ALTER TABLE public.entites_administratives OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: COLUMN entites_administratives.id_region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entites_administratives.id_region IS 'Region d''implantation de l''entite administrative';


--
-- Name: COLUMN entites_administratives.id_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entites_administratives.id_departement IS 'Departement d''implantation de l''entite administrative';


--
-- Name: entites_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entites_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.entites_administratives_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: entites_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entites_administratives_id_seq OWNED BY public.entites_administratives.id;


--
-- Name: entites_institutions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT entites_institutions_type_entite_check CHECK (((type_entite)::text = ANY ((ARRAY['direction'::character varying, 'departement'::character varying, 'service'::character varying, 'bureau'::character varying, 'division'::character varying])::text[])))
);


-- ALTER TABLE public.entites_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: COLUMN entites_institutions.id_region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entites_institutions.id_region IS 'Region d''implantation de l''entite institution';


--
-- Name: COLUMN entites_institutions.id_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entites_institutions.id_departement IS 'Departement d''implantation de l''entite institution';


--
-- Name: entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.entites_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entites_institutions_id_seq OWNED BY public.entites_institutions.id;


--
-- Name: etude_diplome; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.etude_diplome OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE etude_diplome; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.etude_diplome IS 'Historique des etudes et diplomes des agents';


--
-- Name: COLUMN etude_diplome.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.id IS 'Identifiant unique du diplome';


--
-- Name: COLUMN etude_diplome.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN etude_diplome.diplome; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.diplome IS 'Nom du diplome obtenu';


--
-- Name: COLUMN etude_diplome.date_diplome; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.date_diplome IS 'Date d''obtention du diplome';


--
-- Name: COLUMN etude_diplome.ecole; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.ecole IS 'Ecole ou universite';


--
-- Name: COLUMN etude_diplome.ville; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.ville IS 'Ville de l''ecole';


--
-- Name: COLUMN etude_diplome.pays; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.pays IS 'Pays de l''ecole';


--
-- Name: COLUMN etude_diplome.id_agent_document; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.etude_diplome.id_agent_document IS 'Reference vers le document uploade dans agent_documents';


--
-- Name: etude_diplome_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.etude_diplome_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.etude_diplome_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: etude_diplome_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.etude_diplome_id_seq OWNED BY public.etude_diplome.id;


--
-- Name: fonction_agents; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.fonction_agents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fonction_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.fonction_agents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: fonction_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fonction_agents_id_seq OWNED BY public.fonction_agents.id;


--
-- Name: fonctions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fonctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    nbr_agent integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.fonctions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: fonctions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fonctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.fonctions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: fonctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fonctions_id_seq OWNED BY public.fonctions.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    id_categorie integer,
    libele character varying(100) NOT NULL,
    numero_ordre integer NOT NULL,
    age_de_retraite integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.grades OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.grades_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: handicaps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.handicaps (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.handicaps OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: handicaps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.handicaps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.handicaps_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: handicaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.handicaps_id_seq OWNED BY public.handicaps.id;


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: COLUMN institutions.id_region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.institutions.id_region IS 'Region d''implantation de l''institution';


--
-- Name: COLUMN institutions.id_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.institutions.id_departement IS 'Departement d''implantation de l''institution';


--
-- Name: institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;


--
-- Name: langues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.langues (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.langues OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: langues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.langues_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.langues_id_seq OWNED BY public.langues.id;


--
-- Name: localites; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT localites_type_localite_check CHECK (((type_localite)::text = ANY ((ARRAY['commune'::character varying, 'ville'::character varying, 'village'::character varying, 'quartier'::character varying, 'secteur'::character varying])::text[])))
);


-- ALTER TABLE public.localites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: localites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.localites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.localites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: localites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.localites_id_seq OWNED BY public.localites.id;


--
-- Name: logiciels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logiciels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.logiciels OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: logiciels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logiciels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.logiciels_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: logiciels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logiciels_id_seq OWNED BY public.logiciels.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    ip_address inet,
    success boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.login_attempts OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.login_attempts_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: ministeres; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.ministeres OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: COLUMN ministeres.id_region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ministeres.id_region IS 'Region d''implantation du ministere';


--
-- Name: COLUMN ministeres.id_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ministeres.id_departement IS 'Departement d''implantation du ministere';


--
-- Name: COLUMN ministeres.responsable_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ministeres.responsable_id IS 'Reference vers l''agent responsable (DRH) du ministere';


--
-- Name: ministeres_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ministeres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.ministeres_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: ministeres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ministeres_id_seq OWNED BY public.ministeres.id;


--
-- Name: mode_d_entrees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mode_d_entrees (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.mode_d_entrees OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mode_d_entrees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.mode_d_entrees_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mode_d_entrees_id_seq OWNED BY public.mode_d_entrees.id;


--
-- Name: motif_de_departs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.motif_de_departs (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.motif_de_departs OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.motif_de_departs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.motif_de_departs_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.motif_de_departs_id_seq OWNED BY public.motif_de_departs.id;


--
-- Name: nationalites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nationalites (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.nationalites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nationalites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nationalites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.nationalites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nationalites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nationalites_id_seq OWNED BY public.nationalites.id;


--
-- Name: nature_actes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nature_actes (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.nature_actes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nature_actes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nature_actes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.nature_actes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nature_actes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nature_actes_id_seq OWNED BY public.nature_actes.id;


--
-- Name: nature_d_accidents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nature_d_accidents (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.nature_d_accidents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nature_d_accidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.nature_d_accidents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nature_d_accidents_id_seq OWNED BY public.nature_d_accidents.id;


--
-- Name: niveau_informatiques; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niveau_informatiques (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.niveau_informatiques OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.niveau_informatiques_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.niveau_informatiques_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.niveau_informatiques_id_seq OWNED BY public.niveau_informatiques.id;


--
-- Name: niveau_langues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niveau_langues (
    id integer NOT NULL,
    libele character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.niveau_langues OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.niveau_langues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.niveau_langues_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: niveau_langues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.niveau_langues_id_seq OWNED BY public.niveau_langues.id;


--
-- Name: nominations; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_statut_nomination CHECK (((statut)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspendue'::character varying, 'terminee'::character varying])::text[]))),
    CONSTRAINT chk_type_nomination CHECK (((type_nomination)::text = ANY ((ARRAY['fonction'::character varying, 'emploi'::character varying])::text[])))
);


-- ALTER TABLE public.nominations OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE nominations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.nominations IS 'Table des nominations des agents';


--
-- Name: COLUMN nominations.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.id IS 'Identifiant unique de la nomination';


--
-- Name: COLUMN nominations.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.id_agent IS 'Reference vers l''agent concerne';


--
-- Name: COLUMN nominations.nature; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.nature IS 'Nature de la nomination (ex: nomination, promotion, mutation, etc.)';


--
-- Name: COLUMN nominations.numero; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.numero IS 'Numero de la nomination';


--
-- Name: COLUMN nominations.date_signature; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.date_signature IS 'Date de signature de la nomination';


--
-- Name: COLUMN nominations.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.created_at IS 'Date de creation de l''enregistrement';


--
-- Name: COLUMN nominations.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nominations.updated_at IS 'Date de derniere modification';


--
-- Name: nominations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nominations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.nominations_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: nominations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nominations_id_seq OWNED BY public.nominations.id;


--
-- Name: notifications_demandes; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT notifications_demandes_type_notification_check CHECK (((type_notification)::text = ANY ((ARRAY['nouvelle_demande'::character varying, 'demande_approuvee'::character varying, 'demande_rejetee'::character varying, 'demande_en_cours'::character varying, 'demande_finalisee'::character varying, 'rappel_validation'::character varying])::text[])))
);


-- ALTER TABLE public.notifications_demandes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.notifications_demandes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_demandes_id_seq OWNED BY public.notifications_demandes.id;


--
-- Name: pathologies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pathologies (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.pathologies OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: pathologies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pathologies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.pathologies_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: pathologies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pathologies_id_seq OWNED BY public.pathologies.id;


--
-- Name: pays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pays (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_nationalite integer
);


-- ALTER TABLE public.pays OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: pays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.pays_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: pays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pays_id_seq OWNED BY public.pays.id;


--
-- Name: permissions_entites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions_entites (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.permissions_entites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.permissions_entites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: permissions_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_entites_id_seq OWNED BY public.permissions_entites.id;


--
-- Name: permissions_entites_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions_entites_institutions (
    id integer NOT NULL,
    id_role integer,
    id_entite integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.permissions_entites_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_entites_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.permissions_entites_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_entites_institutions_id_seq OWNED BY public.permissions_entites_institutions.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.positions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.positions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.regions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE regions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.regions IS 'Table des regions administratives';


--
-- Name: COLUMN regions.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.regions.code IS 'Code unique de la region (ex: ABJ, YAM)';


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.regions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nom character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.roles OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sanctions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sanctions (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.sanctions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sanctions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sanctions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.sanctions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sanctions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sanctions_id_seq OWNED BY public.sanctions.id;


--
-- Name: seminaire_formation; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT seminaire_formation_type_organisme_check CHECK (((type_organisme)::text = ANY ((ARRAY['ministere'::character varying, 'entite'::character varying])::text[])))
);


-- ALTER TABLE public.seminaire_formation OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE seminaire_formation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.seminaire_formation IS 'Table pour gerer les seminaires et formations suivis par les agents';


--
-- Name: COLUMN seminaire_formation.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.id IS 'Identifiant unique du seminaire';


--
-- Name: COLUMN seminaire_formation.theme_seminaire; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.theme_seminaire IS 'Theme ou titre du seminaire de formation';


--
-- Name: COLUMN seminaire_formation.date_debut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.date_debut IS 'Date de debut du seminaire';


--
-- Name: COLUMN seminaire_formation.date_fin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.date_fin IS 'Date de fin du seminaire';


--
-- Name: COLUMN seminaire_formation.lieu; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.lieu IS 'Lieu ou s''est deroule le seminaire';


--
-- Name: COLUMN seminaire_formation.id_entite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.id_entite IS 'Identifiant de l''entite ou ministere qui organise le seminaire';


--
-- Name: COLUMN seminaire_formation.type_organisme; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_formation.type_organisme IS 'Type d''organisme: ministere ou entite';


--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seminaire_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.seminaire_formation_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seminaire_formation_id_seq OWNED BY public.seminaire_formation.id;


--
-- Name: seminaire_participants; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.seminaire_participants OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE seminaire_participants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.seminaire_participants IS 'Table pour gerer les participants aux seminaires de formation';


--
-- Name: COLUMN seminaire_participants.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_participants.id IS 'Identifiant unique de la participation';


--
-- Name: COLUMN seminaire_participants.id_seminaire; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_participants.id_seminaire IS 'Identifiant du seminaire';


--
-- Name: COLUMN seminaire_participants.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_participants.id_agent IS 'Identifiant de l''agent participant';


--
-- Name: COLUMN seminaire_participants.statut_participation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_participants.statut_participation IS 'Statut de participation (inscrit, present, absent, excuse)';


--
-- Name: COLUMN seminaire_participants.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seminaire_participants.notes IS 'Notes sur la participation de l''agent';


--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seminaire_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.seminaire_participants_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seminaire_participants_id_seq OWNED BY public.seminaire_participants.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id integer NOT NULL,
    id_ministere integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responsable_id integer,
    description text
);


-- ALTER TABLE public.services OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: services_entites; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_services_entites_libelle_not_empty CHECK ((length(TRIM(BOTH FROM libelle)) > 0))
);


-- ALTER TABLE public.services_entites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE services_entites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.services_entites IS 'Services rattaches aux entites administratives des ministeres';


--
-- Name: services_entites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_entites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.services_entites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: services_entites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_entites_id_seq OWNED BY public.services_entites.id;


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.services_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: services_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.services_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: services_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.services_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: services_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_institutions_id_seq OWNED BY public.services_institutions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    id_utilisateur integer,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.sessions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sindicats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sindicats (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.sindicats OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sindicats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sindicats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.sindicats_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: sindicats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sindicats_id_seq OWNED BY public.sindicats.id;


--
-- Name: situation_matrimonials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.situation_matrimonials (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.situation_matrimonials OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.situation_matrimonials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.situation_matrimonials_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.situation_matrimonials_id_seq OWNED BY public.situation_matrimonials.id;


--
-- Name: specialites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specialites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.specialites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: specialites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specialites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.specialites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: specialites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specialites_id_seq OWNED BY public.specialites.id;


--
-- Name: stage; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.stage OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: TABLE stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stage IS 'Historique des stages des agents';


--
-- Name: COLUMN stage.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.id IS 'Identifiant unique du stage';


--
-- Name: COLUMN stage.id_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.id_agent IS 'Reference vers l''agent';


--
-- Name: COLUMN stage.intitule_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.intitule_stage IS 'Intitule du stage';


--
-- Name: COLUMN stage.date_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.date_stage IS 'Date du stage';


--
-- Name: COLUMN stage.duree_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.duree_stage IS 'Duree du stage en jours';


--
-- Name: COLUMN stage.etablissement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.etablissement IS 'Etablissement ou le stage s''est deroule';


--
-- Name: COLUMN stage.ville; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.ville IS 'Ville de l''etablissement';


--
-- Name: COLUMN stage.pays; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stage.pays IS 'Pays de l''etablissement';


--
-- Name: stage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.stage_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stage_id_seq OWNED BY public.stage.id;


--
-- Name: tiers; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.tiers OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.tiers_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiers_id_seq OWNED BY public.tiers.id;


--
-- Name: tiers_institutions; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.tiers_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiers_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.tiers_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiers_institutions_id_seq OWNED BY public.tiers_institutions.id;


--
-- Name: type_d_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_d_agents (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    automatique boolean DEFAULT false,
    numero_initial integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_d_agents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_d_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_d_agents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_d_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_d_agents_id_seq OWNED BY public.type_d_agents.id;


--
-- Name: type_de_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_conges (
    id integer NOT NULL,
    libele character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_conges OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_conges_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_conges_id_seq OWNED BY public.type_de_conges.id;


--
-- Name: type_de_couriers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_couriers (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_couriers OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_couriers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_couriers_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_couriers_id_seq OWNED BY public.type_de_couriers.id;


--
-- Name: type_de_destinations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_destinations (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_destinations OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_destinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_destinations_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_destinations_id_seq OWNED BY public.type_de_destinations.id;


--
-- Name: type_de_documents; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.type_de_documents OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_documents_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_documents_id_seq OWNED BY public.type_de_documents.id;


--
-- Name: type_de_documents_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_documents_institutions (
    id integer NOT NULL,
    id_service integer,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_documents_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_documents_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_documents_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_documents_institutions_id_seq OWNED BY public.type_de_documents_institutions.id;


--
-- Name: type_de_materiels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_materiels (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_materiels OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_materiels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_materiels_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_materiels_id_seq OWNED BY public.type_de_materiels.id;


--
-- Name: type_de_retraites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_retraites (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_retraites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_retraites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_retraites_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_retraites_id_seq OWNED BY public.type_de_retraites.id;


--
-- Name: type_de_seminaire_de_formation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_seminaire_de_formation (
    id integer NOT NULL,
    id_ministere integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_seminaire_de_formation OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_seminaire_de_formation_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_id_seq OWNED BY public.type_de_seminaire_de_formation.id;


--
-- Name: type_de_seminaire_de_formation_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_de_seminaire_de_formation_institutions (
    id integer NOT NULL,
    id_institution integer,
    libelle character varying(200) NOT NULL,
    annee integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_de_seminaire_de_formation_institutions OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_de_seminaire_de_formation_institutions_id_seq OWNED BY public.type_de_seminaire_de_formation_institutions.id;


--
-- Name: type_etablissements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_etablissements (
    id integer NOT NULL,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.type_etablissements OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_etablissements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.type_etablissements_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: type_etablissements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_etablissements_id_seq OWNED BY public.type_etablissements.id;


--
-- Name: unite_administratives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unite_administratives (
    id integer NOT NULL,
    id_fonction integer,
    capacite_acceuil integer,
    libele character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


-- ALTER TABLE public.unite_administratives OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unite_administratives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.unite_administratives_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: unite_administratives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unite_administratives_id_seq OWNED BY public.unite_administratives.id;


--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: postgres
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


-- ALTER TABLE public.utilisateurs OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utilisateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.utilisateurs_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilisateurs_id_seq OWNED BY public.utilisateurs.id;


--
-- Name: v_demandes_en_attente; Type: VIEW; Schema: public; Owner: postgres
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


-- ALTER VIEW public.v_demandes_en_attente OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: v_notifications_non_lues; Type: VIEW; Schema: public; Owner: postgres
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


-- ALTER VIEW public.v_notifications_non_lues OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: v_services_avec_entites; Type: VIEW; Schema: public; Owner: postgres
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


-- ALTER VIEW public.v_services_avec_entites OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: VIEW v_services_avec_entites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_services_avec_entites IS 'Vue des services avec leurs entites et ministeres';


--
-- Name: workflow_demandes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_demandes (
    id integer NOT NULL,
    id_demande integer NOT NULL,
    niveau_validation character varying(20) NOT NULL,
    id_validateur integer NOT NULL,
    action character varying(20) NOT NULL,
    commentaire text,
    date_action timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflow_demandes_action_check CHECK (((action)::text = ANY ((ARRAY['approuve'::character varying, 'rejete'::character varying, 'transfere'::character varying])::text[]))),
    CONSTRAINT workflow_demandes_niveau_validation_check CHECK (((niveau_validation)::text = ANY ((ARRAY['chef_service'::character varying, 'drh'::character varying, 'directeur'::character varying, 'ministre'::character varying])::text[])))
);


-- ALTER TABLE public.workflow_demandes OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_demandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER SEQUENCE public.workflow_demandes_id_seq OWNER TO postgres;  -- Commenté: droits insuffisants sur hébergeur

--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_demandes_id_seq OWNED BY public.workflow_demandes.id;


--
-- Name: affectations_temporaires id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_id_seq'::regclass);


--
-- Name: affectations_temporaires_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires_institutions ALTER COLUMN id SET DEFAULT nextval('public.affectations_temporaires_institutions_id_seq'::regclass);


--
-- Name: agent_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_documents ALTER COLUMN id SET DEFAULT nextval('public.agent_documents_id_seq'::regclass);


--
-- Name: agent_langues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues ALTER COLUMN id SET DEFAULT nextval('public.agent_langues_id_seq'::regclass);


--
-- Name: agent_logiciels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels ALTER COLUMN id SET DEFAULT nextval('public.agent_logiciels_id_seq'::regclass);


--
-- Name: agent_login_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_login_codes ALTER COLUMN id SET DEFAULT nextval('public.agent_login_codes_id_seq'::regclass);


--
-- Name: agent_photos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_photos ALTER COLUMN id SET DEFAULT nextval('public.agent_photos_id_seq'::regclass);


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: agents_entites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_id_seq'::regclass);


--
-- Name: agents_entites_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.agents_entites_institutions_id_seq'::regclass);


--
-- Name: agents_institutions_main id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main ALTER COLUMN id SET DEFAULT nextval('public.agents_institutions_main_id_seq'::regclass);


--
-- Name: autre_absences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.autre_absences ALTER COLUMN id SET DEFAULT nextval('public.autre_absences_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: civilites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.civilites ALTER COLUMN id SET DEFAULT nextval('public.civilites_id_seq'::regclass);


--
-- Name: classeurs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs ALTER COLUMN id SET DEFAULT nextval('public.classeurs_id_seq'::regclass);


--
-- Name: classeurs_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs_institutions ALTER COLUMN id SET DEFAULT nextval('public.classeurs_institutions_id_seq'::regclass);


--
-- Name: demandes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes ALTER COLUMN id SET DEFAULT nextval('public.demandes_id_seq'::regclass);


--
-- Name: demandes_historique id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_historique ALTER COLUMN id SET DEFAULT nextval('public.demandes_historique_id_seq'::regclass);


--
-- Name: departements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departements ALTER COLUMN id SET DEFAULT nextval('public.departements_id_seq'::regclass);


--
-- Name: diplomes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diplomes ALTER COLUMN id SET DEFAULT nextval('public.diplomes_id_seq'::regclass);


--
-- Name: distinctions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distinctions ALTER COLUMN id SET DEFAULT nextval('public.distinctions_id_seq'::regclass);


--
-- Name: documents_autorisation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation ALTER COLUMN id SET DEFAULT nextval('public.documents_autorisation_id_seq'::regclass);


--
-- Name: dossiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers ALTER COLUMN id SET DEFAULT nextval('public.dossiers_id_seq'::regclass);


--
-- Name: dossiers_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.dossiers_institutions_id_seq'::regclass);


--
-- Name: echelons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.echelons ALTER COLUMN id SET DEFAULT nextval('public.echelons_id_seq'::regclass);


--
-- Name: emploi_agents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents ALTER COLUMN id SET DEFAULT nextval('public.emploi_agents_id_seq'::regclass);


--
-- Name: emplois id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emplois ALTER COLUMN id SET DEFAULT nextval('public.emplois_id_seq'::regclass);


--
-- Name: enfants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants ALTER COLUMN id SET DEFAULT nextval('public.enfants_id_seq'::regclass);


--
-- Name: enfants_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants_institutions ALTER COLUMN id SET DEFAULT nextval('public.enfants_institutions_id_seq'::regclass);


--
-- Name: entites_administratives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives ALTER COLUMN id SET DEFAULT nextval('public.entites_administratives_id_seq'::regclass);


--
-- Name: entites_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.entites_institutions_id_seq'::regclass);


--
-- Name: etude_diplome id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etude_diplome ALTER COLUMN id SET DEFAULT nextval('public.etude_diplome_id_seq'::regclass);


--
-- Name: fonction_agents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents ALTER COLUMN id SET DEFAULT nextval('public.fonction_agents_id_seq'::regclass);


--
-- Name: fonctions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonctions ALTER COLUMN id SET DEFAULT nextval('public.fonctions_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: handicaps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.handicaps ALTER COLUMN id SET DEFAULT nextval('public.handicaps_id_seq'::regclass);


--
-- Name: institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);


--
-- Name: langues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.langues ALTER COLUMN id SET DEFAULT nextval('public.langues_id_seq'::regclass);


--
-- Name: localites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localites ALTER COLUMN id SET DEFAULT nextval('public.localites_id_seq'::regclass);


--
-- Name: logiciels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logiciels ALTER COLUMN id SET DEFAULT nextval('public.logiciels_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: ministeres id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres ALTER COLUMN id SET DEFAULT nextval('public.ministeres_id_seq'::regclass);


--
-- Name: mode_d_entrees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mode_d_entrees ALTER COLUMN id SET DEFAULT nextval('public.mode_d_entrees_id_seq'::regclass);


--
-- Name: motif_de_departs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motif_de_departs ALTER COLUMN id SET DEFAULT nextval('public.motif_de_departs_id_seq'::regclass);


--
-- Name: nationalites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nationalites ALTER COLUMN id SET DEFAULT nextval('public.nationalites_id_seq'::regclass);


--
-- Name: nature_actes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_actes ALTER COLUMN id SET DEFAULT nextval('public.nature_actes_id_seq'::regclass);


--
-- Name: nature_d_accidents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_d_accidents ALTER COLUMN id SET DEFAULT nextval('public.nature_d_accidents_id_seq'::regclass);


--
-- Name: niveau_informatiques id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_informatiques ALTER COLUMN id SET DEFAULT nextval('public.niveau_informatiques_id_seq'::regclass);


--
-- Name: niveau_langues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_langues ALTER COLUMN id SET DEFAULT nextval('public.niveau_langues_id_seq'::regclass);


--
-- Name: nominations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nominations ALTER COLUMN id SET DEFAULT nextval('public.nominations_id_seq'::regclass);


--
-- Name: notifications_demandes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications_demandes ALTER COLUMN id SET DEFAULT nextval('public.notifications_demandes_id_seq'::regclass);


--
-- Name: pathologies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pathologies ALTER COLUMN id SET DEFAULT nextval('public.pathologies_id_seq'::regclass);


--
-- Name: pays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays ALTER COLUMN id SET DEFAULT nextval('public.pays_id_seq'::regclass);


--
-- Name: permissions_entites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_id_seq'::regclass);


--
-- Name: permissions_entites_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites_institutions ALTER COLUMN id SET DEFAULT nextval('public.permissions_entites_institutions_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sanctions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sanctions ALTER COLUMN id SET DEFAULT nextval('public.sanctions_id_seq'::regclass);


--
-- Name: seminaire_formation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_formation ALTER COLUMN id SET DEFAULT nextval('public.seminaire_formation_id_seq'::regclass);


--
-- Name: seminaire_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_participants ALTER COLUMN id SET DEFAULT nextval('public.seminaire_participants_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: services_entites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_entites ALTER COLUMN id SET DEFAULT nextval('public.services_entites_id_seq'::regclass);


--
-- Name: services_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_institutions ALTER COLUMN id SET DEFAULT nextval('public.services_institutions_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sindicats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sindicats ALTER COLUMN id SET DEFAULT nextval('public.sindicats_id_seq'::regclass);


--
-- Name: situation_matrimonials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.situation_matrimonials ALTER COLUMN id SET DEFAULT nextval('public.situation_matrimonials_id_seq'::regclass);


--
-- Name: specialites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialites ALTER COLUMN id SET DEFAULT nextval('public.specialites_id_seq'::regclass);


--
-- Name: stage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage ALTER COLUMN id SET DEFAULT nextval('public.stage_id_seq'::regclass);


--
-- Name: tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers ALTER COLUMN id SET DEFAULT nextval('public.tiers_id_seq'::regclass);


--
-- Name: tiers_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers_institutions ALTER COLUMN id SET DEFAULT nextval('public.tiers_institutions_id_seq'::regclass);


--
-- Name: type_d_agents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_d_agents ALTER COLUMN id SET DEFAULT nextval('public.type_d_agents_id_seq'::regclass);


--
-- Name: type_de_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_conges ALTER COLUMN id SET DEFAULT nextval('public.type_de_conges_id_seq'::regclass);


--
-- Name: type_de_couriers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_couriers ALTER COLUMN id SET DEFAULT nextval('public.type_de_couriers_id_seq'::regclass);


--
-- Name: type_de_destinations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_destinations ALTER COLUMN id SET DEFAULT nextval('public.type_de_destinations_id_seq'::regclass);


--
-- Name: type_de_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_id_seq'::regclass);


--
-- Name: type_de_documents_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_documents_institutions_id_seq'::regclass);


--
-- Name: type_de_materiels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_materiels ALTER COLUMN id SET DEFAULT nextval('public.type_de_materiels_id_seq'::regclass);


--
-- Name: type_de_retraites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_retraites ALTER COLUMN id SET DEFAULT nextval('public.type_de_retraites_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_id_seq'::regclass);


--
-- Name: type_de_seminaire_de_formation_institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions ALTER COLUMN id SET DEFAULT nextval('public.type_de_seminaire_de_formation_institutions_id_seq'::regclass);


--
-- Name: type_etablissements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_etablissements ALTER COLUMN id SET DEFAULT nextval('public.type_etablissements_id_seq'::regclass);


--
-- Name: unite_administratives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unite_administratives ALTER COLUMN id SET DEFAULT nextval('public.unite_administratives_id_seq'::regclass);


--
-- Name: utilisateurs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_id_seq'::regclass);


--
-- Name: workflow_demandes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_demandes ALTER COLUMN id SET DEFAULT nextval('public.workflow_demandes_id_seq'::regclass);


--
-- Data for Name: affectations_temporaires; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: affectations_temporaires_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: agent_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('114', '61', 'diplome', 'Bulletin_Kouyo_Victoire_1er trimestre_2024-2025.pdf', '/uploads/diplomes/diplome_documents-1759493680572-266409246.pdf', '486195', 'application/pdf', NULL, '2025-10-03 14:14:40.827259', '2025-10-03 14:14:40.827259', '2025-10-03 14:14:40.827259');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('121', '85', 'diplome', 'Devis_app.pdf', '/uploads/diplomes/diplome_documents-1759506576591-177588325.pdf', '158301', 'application/pdf', NULL, '2025-10-03 17:49:36.819209', '2025-10-03 17:49:36.819209', '2025-10-03 17:49:36.819209');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('122', '85', 'autre', 'document 1', '/uploads/documents/dynamic_documents-1759410206242-698288391.pdf', '158301', 'autre', 'Document personnalise: document 1', '2025-10-03 17:49:36.88878', '2025-10-03 17:49:36.88878', '2025-10-03 17:49:36.88878');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('123', '85', 'autre', 'document 2', '/uploads/documents/dynamic_documents-1759410484563-591519405.pdf', '158301', 'autre', 'Document personnalise: document 2', '2025-10-03 17:49:36.892979', '2025-10-03 17:49:36.892979', '2025-10-03 17:49:36.892979');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('124', '118', 'autre', 'Certificat de travail', '/uploads/documents/dynamic_documents-1759709332933-552014080.pdf', '486195', 'application/pdf', 'Document personnalise: Certificat de travail', '2025-10-06 02:08:53.105247', '2025-10-06 02:08:53.105247', '2025-10-06 02:08:53.105247');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('102', '73', 'diplome', 'Bulletin_Kouyo_Victoire_1er trimestre_2024-2025.pdf', '/uploads/diplomes/diplome_documents-1759411892178-693739903.pdf', '486195', 'application/pdf', NULL, '2025-10-02 15:31:32.395675', '2025-10-02 15:31:32.395675', '2025-10-02 15:31:32.395675');
INSERT INTO public.agent_documents (id, id_agent, document_type, document_name, document_url, document_size, document_mime_type, description, uploaded_at, created_at, updated_at) VALUES ('103', '73', 'autre', 'Certificat', '/uploads/documents/dynamic_documents-1759411892197-869993585.pdf', '158301', 'application/pdf', 'Document personnalise: Certificat', '2025-10-02 15:31:32.43323', '2025-10-02 15:31:32.43323', '2025-10-02 15:31:32.43323');



--
-- Data for Name: agent_langues; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent_langues (id, id_agent, id_langue, id_niveau_langue, created_at, updated_at) VALUES ('7', '61', '6', '3', '2025-10-03 14:14:40.980412', '2025-10-03 14:14:40.980412');
INSERT INTO public.agent_langues (id, id_agent, id_langue, id_niveau_langue, created_at, updated_at) VALUES ('12', '85', '4', '2', '2025-10-03 17:49:37.000776', '2025-10-03 17:49:37.000776');
INSERT INTO public.agent_langues (id, id_agent, id_langue, id_niveau_langue, created_at, updated_at) VALUES ('13', '85', '3', '3', '2025-10-03 17:49:37.005013', '2025-10-03 17:49:37.005013');
INSERT INTO public.agent_langues (id, id_agent, id_langue, id_niveau_langue, created_at, updated_at) VALUES ('14', '118', '3', '5', '2025-10-06 02:08:53.113495', '2025-10-06 02:08:53.113495');
INSERT INTO public.agent_langues (id, id_agent, id_langue, id_niveau_langue, created_at, updated_at) VALUES ('15', '128', '3', '4', '2025-10-06 11:53:46.916053', '2025-10-06 11:53:46.916053');



--
-- Data for Name: agent_logiciels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('7', '61', '8', '3', '2025-10-03 14:14:40.997391', '2025-10-03 14:14:40.997391');
INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('12', '85', '6', '4', '2025-10-03 17:49:37.02099', '2025-10-03 17:49:37.02099');
INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('13', '85', '10', '5', '2025-10-03 17:49:37.023538', '2025-10-03 17:49:37.023538');
INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('14', '118', '6', '4', '2025-10-06 02:08:53.130608', '2025-10-06 02:08:53.130608');
INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('15', '128', '10', '5', '2025-10-06 11:53:46.928772', '2025-10-06 11:53:46.928772');
INSERT INTO public.agent_logiciels (id, id_agent, id_logiciel, id_niveau_informatique, created_at, updated_at) VALUES ('16', '128', '11', '5', '2025-10-06 11:53:46.932433', '2025-10-06 11:53:46.932433');



--
-- Data for Name: agent_login_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('4', '52', '8A4FCACC', '2025-09-24 00:23:09.195', NULL, '2025-09-23 00:23:09.209642');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('5', '53', 'DB71AD06', '2025-09-24 00:31:38.661', NULL, '2025-09-23 00:31:38.675705');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('6', '54', 'EECEB99D', '2025-09-24 00:47:46.706', NULL, '2025-09-23 00:47:46.716225');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('7', '56', 'DAB05120', '2025-09-24 00:58:20.013', NULL, '2025-09-23 00:58:20.024911');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('8', '57', 'C887FCA9', '2025-09-24 01:07:58.211', NULL, '2025-09-23 01:07:58.225161');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('9', '58', '1E8A1A89', '2025-09-24 01:29:05.016', NULL, '2025-09-23 01:29:05.024294');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('12', '73', '03912458', '2025-09-26 15:00:06.948', NULL, '2025-09-25 15:00:06.954308');
INSERT INTO public.agent_login_codes (id, agent_id, code, expires_at, used_at, created_at) VALUES ('21', '118', '321A3CFA', '2025-10-07 02:08:53.269', NULL, '2025-10-06 02:08:53.281102');



--
-- Data for Name: agent_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent_photos (id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo, uploaded_at, created_at, updated_at) VALUES ('2', '85', '/uploads/photos/photo_profil-1759370791514-789975995.webp', 'equipe2.webp', '6040', 'image/webp', 't', '2025-10-02 04:06:31.615769', '2025-10-02 04:06:31.615769', '2025-10-02 04:06:31.615769');
INSERT INTO public.agent_photos (id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo, uploaded_at, created_at, updated_at) VALUES ('3', '73', '/uploads/photos/photo_profil-1759411892173-290059037.jpg', 'lycee7.jpg', '6232', 'image/jpeg', 't', '2025-10-02 15:31:32.344963', '2025-10-02 15:31:32.344963', '2025-10-02 15:31:32.344963');
INSERT INTO public.agent_photos (id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo, uploaded_at, created_at, updated_at) VALUES ('4', '61', '/uploads/photos/photo_profil-1759486991196-573925586.jpg', 'WhatsApp Image 2025-02-10 A 14.06.09_d5b3ebc5.jpg', '92860', 'image/jpeg', 't', '2025-10-03 12:23:11.482342', '2025-10-03 12:23:11.482342', '2025-10-03 12:23:11.482342');
INSERT INTO public.agent_photos (id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo, uploaded_at, created_at, updated_at) VALUES ('5', '118', '/uploads/photos/photo_profil-1759709332929-442925392.jpg', 'lycee7.jpg', '6232', 'image/jpeg', 't', '2025-10-06 02:08:53.071312', '2025-10-06 02:08:53.071312', '2025-10-06 02:08:53.071312');
INSERT INTO public.agent_photos (id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo, uploaded_at, created_at, updated_at) VALUES ('6', '128', '/uploads/photos/photo_profil-1759744426540-440961643.jpg', 'image.jpg', '111374', 'image/jpeg', 't', '2025-10-06 11:53:46.781708', '2025-10-06 11:53:46.781708', '2025-10-06 11:53:46.781708');



--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('53', '3', '1', '20', NULL, '1', NULL, 'jeane', 'koffi', '4747k', '2025-09-19', 'heheh', '0', '+2250507145484', NULL, 'M', 'hyui', 'jgu', 'gnantihourejjosudde@gmail.com', NULL, NULL, '5', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'inactif', '2025-09-27', '2025-09-27', '2025-09-23 00:31:38.083391', '2025-09-30 19:35:32.899833', '6', '18', '8', '8', '17', '20', '11', '15', '4', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '17', '19', '15', '5', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('52', '7', '1', '13', NULL, '1', NULL, 'kouassi', 'ange', '5555h', '2025-09-12', 'divo', '0', '+2250507145484', '0758999073', 'M', 'jeane', 'jean', 'gnantihourejosudde@gmail.com', NULL, NULL, '5', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'inactif', '2025-09-26', '2025-09-27', '2025-09-23 00:23:08.882122', '2025-09-30 19:35:32.899833', '6', '18', '12', '6', '18', '20', '11', '15', '5', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '18', '19', '15', '10', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('3', '2', '1', '1', '1', '1', '2', 'TRAORE', 'Marie', 'RH002', '1985-03-20', 'BouakA', '39', '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'TRAORE Fatou', 'TRAORE Ibrahim', 'marie.traore@rh.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-03-20', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:39:53.692597', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('4', '1', '2', '1', '2', '1', '3', 'DIABATE', 'Paul', 'RH003', '1978-07-10', 'Daloa', '46', '+225 07 34 56 78', '+225 05 34 56 78', 'M', 'DIABATE Aminata', 'DIABATE SAkou', 'paul.diabate@rh.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-07-10', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:39:53.692597', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('36', '1', '2', '1', '2', '3', '9', 'KONE', 'Moussa', 'SAN-DP-001', '1981-08-22', 'Divo', NULL, '+225 07 90 12 34', NULL, 'M', 'KONE Fatou', 'KONE Sekou', 'drh.dp@sante.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-08-22', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('6', '1', '1', '1', '1', '2', '5', 'SANGARE', 'Ibrahim', 'EDU002', '1975-05-12', 'San-PAdro', '49', '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'SANGARE AAcha', 'SANGARE Oumar', 'ibrahim.sangare@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-05-12', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('7', '2', '2', '1', '2', '2', '6', 'OUATTARA', 'Aminata', 'EDU003', '1988-09-08', 'Yamoussoukro', '36', '+225 07 67 89 01', '+225 05 67 89 01', 'F', 'OUATTARA Kadi', 'OUATTARA Ali', 'aminata.ouattara@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-09-08', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('37', '1', '2', '1', '1', '4', '10', 'TRAORE', 'Mariam', 'FIN-DB-001', '1984-06-14', 'Anyama', NULL, '+225 07 01 23 45', NULL, 'F', 'TRAORE Aicha', 'TRAORE Ibrahim', 'drh.db@finances.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-06-14', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('9', '2', '1', '1', '1', '3', '8', 'KOUADIO', 'Henriette', 'SANTE002', '1987-12-03', 'Man', '37', '+225 07 89 01 23', '+225 05 89 01 23', 'F', 'KOUADIO Rose', 'KOUADIO Jean', 'henriette.kouadio@sante.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-12-03', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('10', '1', '2', '1', '2', '3', '9', 'KONE', 'Moussa', 'SANTE003', '1981-08-22', 'Divo', '43', '+225 07 90 12 34', '+225 05 90 12 34', 'M', 'KONE Fatou', 'KONE SAkou', 'moussa.kone@sante.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-08-22', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('38', '1', '1', '1', '1', '4', '11', 'DIABATE', 'Sekou', 'FIN-DC-001', '1979-02-28', 'Bingerville', NULL, '+225 07 12 34 56', NULL, 'M', 'DIABATE Mariam', 'DIABATE Oumar', 'drh.dc@finances.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-02-28', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('12', '1', '1', '1', '1', '4', '11', 'DIABATE', 'SAkou', 'FIN002', '1979-02-28', 'Bingerville', '45', '+225 07 12 34 56', '+225 05 12 34 56', 'M', 'DIABATE Mariam', 'DIABATE Oumar', 'sekou.diabate@finances.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2008-02-28', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('13', '2', '2', '1', '2', '4', '12', 'KOUAME', 'AAcha', 'FIN003', '1986-10-17', 'Cocody', '38', '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'KOUAME Fatou', 'KOUAME Paul', 'aicha.kouame@finances.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-10-17', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('39', '2', '2', '1', '2', '4', '12', 'KOUAME', 'Aicha', 'FIN-DI-001', '1986-10-17', 'Cocody', NULL, '+225 07 23 45 67', NULL, 'F', 'KOUAME Fatou', 'KOUAME Paul', 'drh.di@finances.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-10-17', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('15', '1', '1', '1', '1', '5', '14', 'KONE', 'Kadi', 'INT002', '1983-11-12', 'Plateau', '41', '+225 07 45 67 89', '+225 05 45 67 89', 'F', 'KONE AAcha', 'KONE Moussa', 'kadi.kone@interieur.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-12', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('16', '2', '2', '1', '2', '5', '15', 'TRAORE', 'Yaya', 'INT003', '1985-07-25', 'Treichville', '39', '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'TRAORE Fatou', 'TRAORE SAkou', 'yaya.traore@interieur.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-07-25', NULL, '2025-09-10 22:39:53.692597', '2025-09-10 22:56:54.600413', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('31', '1', '2', '1', '1', '2', '4', 'KONE', 'Fatou', 'EDU-DEP-001', '1982-11-25', 'Korhogo', NULL, '+225 07 45 67 89', NULL, 'F', 'KONE Mariam', 'KONE Moussa', 'drh.dep@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-25', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('32', '1', '1', '1', '1', '2', '5', 'SANGARE', 'Ibrahim', 'EDU-DES-001', '1975-05-12', 'San-Pedro', NULL, '+225 07 56 78 90', NULL, 'M', 'SANGARE Aicha', 'SANGARE Oumar', 'drh.des@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2009-05-12', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('33', '2', '2', '1', '2', '2', '6', 'OUATTARA', 'Aminata', 'EDU-DALF-001', '1988-09-08', 'Yamoussoukro', NULL, '+225 07 67 89 01', NULL, 'F', 'OUATTARA Kadi', 'OUATTARA Ali', 'drh.dalf@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2013-09-08', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('34', '1', '2', '1', '1', '3', '7', 'BAMBA', 'Drissa', 'SAN-DSP-001', '1983-04-18', 'Gagnoa', NULL, '+225 07 78 90 12', NULL, 'M', 'BAMBA Mariam', 'BAMBA Yaya', 'drh.dsp@sante.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-04-18', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('35', '2', '1', '1', '1', '3', '8', 'KOUADIO', 'Henriette', 'SAN-DH-001', '1987-12-03', 'Man', NULL, '+225 07 89 01 23', NULL, 'F', 'KOUADIO Rose', 'KOUADIO Jean', 'drh.dh@sante.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-12-03', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('40', '1', '2', '1', '1', '5', '13', 'SANGARE', 'Oumar', 'INT-DS-001', '1980-03-05', 'Marcory', NULL, '+225 07 34 56 78', NULL, 'M', 'SANGARE Mariam', 'SANGARE Ibrahim', 'drh.ds@interieur.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2010-03-05', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('41', '1', '1', '1', '1', '5', '14', 'KONE', 'Kadi', 'INT-DCC-001', '1983-11-12', 'Plateau', NULL, '+225 07 45 67 89', NULL, 'F', 'KONE Aicha', 'KONE Moussa', 'drh.dcc@interieur.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2011-11-12', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('42', '2', '2', '1', '2', '5', '15', 'TRAORE', 'Yaya', 'INT-DPP-001', '1985-07-25', 'Treichville', NULL, '+225 07 56 78 90', NULL, 'M', 'TRAORE Fatou', 'TRAORE Sekou', 'drh.dpp@interieur.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2012-07-25', NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('45', '1', NULL, '1', '1', '1', '1', 'KOUAME', 'Jean-Baptiste', 'DRH001', '1980-05-15', 'Abidjan, Cote d''Ivoire', NULL, '+225 20 30 40 51', NULL, NULL, NULL, NULL, 'jeanbaptiste.kouame@rh.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, 'Cocody, Abidjan', 'Cote d''Ivoire', NULL, 'actif', '2020-01-15', NULL, '2025-09-13 16:03:05.880683', '2025-09-13 16:03:05.880683', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('54', '7', '1', '20', '11', '1', NULL, 'GNANTI', 'HOURE JOSUE', '555', '2025-09-11', 'kjkjk', '0', '+2250507145484', NULL, 'M', 'gdgdg', 'dgdgd', 'gnantihourejjosuddde@gmail.com', NULL, NULL, '5', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'actif', '2025-09-09', '2025-09-04', '2025-09-23 00:47:46.434216', '2025-09-23 00:47:46.434216', '6', '18', '12', '6', '18', '20', '14', '15', '5', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '17', '19', '15', '10', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('55', '1', '1', '9', '1', '2', NULL, 'DRH', 'Education', 'DRH-EDU-001', '1980-01-01', 'Abidjan', '45', '+225 07 00 00 01', NULL, NULL, NULL, NULL, 'drh.education@education.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2024-01-01', NULL, '2025-09-23 00:54:46.625395', '2025-09-23 00:54:46.625395', '1', NULL, NULL, NULL, '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('57', '7', '1', '20', '11', '1', NULL, 'madou dera', 'kokou', '555k', '2025-09-11', 'divo', '0', '+2250507145484', NULL, 'M', 'hui', 'kfkk', 'gnantihourdeeejjosuddde@gmail.com', NULL, NULL, '9', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'inactif', '2025-09-10', '2025-09-11', '2025-09-23 01:07:57.945273', '2025-09-23 01:07:57.945273', '6', '18', '8', '6', '17', '20', '11', '15', '5', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '17', '19', '15', '10', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('56', '7', '1', '20', '11', '1', NULL, 'KAKI', 'KOGUE', '4444J', '2025-09-02', 'JUFU', '0', '+2250507145484', NULL, 'M', 'ferea', 'heu', 'gnantihoureeejjosuddde@gmail.com', NULL, NULL, '1', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'inactif', '2025-09-09', '2025-09-18', '2025-09-23 00:58:19.779621', '2025-09-24 23:44:16.216993', '6', '18', '12', '6', '19', '20', '11', '15', '5', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, '19', '15', '10', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('60', NULL, NULL, NULL, '1', '1', NULL, 'admin', 'User', 'MAT-001', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin@rh-system.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.145625', '2025-09-25 02:42:00.145625', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('62', NULL, NULL, NULL, '1', '2', NULL, 'admin', 'education', 'MAT-006', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.education@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.289206', '2025-09-25 02:42:00.289206', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('63', NULL, NULL, NULL, '2', '2', NULL, 'agent', 'education1', 'MAT-007', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.education1@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.303865', '2025-09-25 02:42:00.303865', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('64', NULL, NULL, NULL, '1', '3', NULL, 'admin', 'sante', 'MAT-009', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.sante@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.309648', '2025-09-25 02:42:00.309648', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('65', NULL, NULL, NULL, '2', '3', NULL, 'agent', 'sante1', 'MAT-010', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.sante1@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.320955', '2025-09-25 02:42:00.320955', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('66', NULL, NULL, NULL, '1', '4', NULL, 'admin', 'finances', 'MAT-012', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.finances@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.326538', '2025-09-25 02:42:00.326538', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('67', NULL, NULL, NULL, '2', '4', NULL, 'agent', 'finances1', 'MAT-013', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.finances1@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.336579', '2025-09-25 02:42:00.336579', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('68', NULL, NULL, NULL, '1', '5', NULL, 'admin', 'interieur', 'MAT-015', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'admin.interieur@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.342119', '2025-09-25 02:42:00.342119', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('69', NULL, NULL, NULL, '2', '5', NULL, 'agent', 'interieur1', 'MAT-016', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'agent.interieur1@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.353028', '2025-09-25 02:42:00.353028', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('70', NULL, NULL, NULL, '1', '1', NULL, 'super', 'admin', 'MAT-018', '1980-01-01', 'Abidjan', NULL, '+225 20 30 40 00', NULL, NULL, NULL, NULL, 'super.admin@gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-25 02:42:00.359795', '2025-09-25 02:42:00.359795', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('58', '8', '1', '20', NULL, '1', NULL, 'morel', 'sea', '4747j', '2025-09-11', 'ger', '0', '+2250507145484', NULL, 'M', 'juji', 'lopu', 'hyhyy@gmail.com', NULL, NULL, '2', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'inactif', '2025-09-26', '2025-09-27', '2025-09-23 01:29:04.807706', '2025-09-30 19:35:32.899833', '6', '18', '8', '6', '17', '20', '11', '15', '5', NULL, NULL, NULL, NULL, NULL, NULL, '18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '17', '19', '15', '10', '10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('128', '1', '1', '18', '1', '1', NULL, 'KOUAME', 'Jean-Baptiste', 'CS-TOUR-003', '1982-03-15', 'Daloa', '43', '+225 07 12 34 56 78', '+22507584546251', 'M', 'Akkissi', 'Norbert', 'jeanbaptiste.kouame3@tourisme.gouv.ci', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-04', NULL, '2025-10-06 06:00:24.747486', '2025-10-06 11:53:46.771038', NULL, '18', '8', '8', '7', '9', '11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '8', NULL, NULL, NULL, NULL, NULL, '6', NULL, 'Chef de Service Comptabilite', NULL, 'Exempte', NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('130', NULL, NULL, NULL, NULL, '2', NULL, 'Test', 'DRH', 'DRH1759761880997', '1990-01-01', NULL, NULL, '0123456789', NULL, NULL, NULL, NULL, 'drh.test@ministere.gov', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-06 16:44:41.00234', '2025-10-06 16:44:41.00234', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('112', '1', '1', '1', '1', '2', '4', 'Test', 'New Document', 'TEST-NEW-DOC-1759403897871', '1990-01-01', NULL, NULL, '0123456789', NULL, 'M', NULL, NULL, 'test.newdoc@example.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-02 13:18:17.988219', '2025-10-02 13:18:17.988219', '1', NULL, '1', '1', '1', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, NULL, NULL, NULL, NULL, '5', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('85', '7', '1', '18', '1', '1', NULL, 'Kouadio', 'Armand', '153333', '2025-10-07', 'Lakota', '-1', '+2250507654284', '+225007654284', 'M', 'Marie', 'Paul', 'jeaneli@gmail.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-23', '2025-10-16', '2025-10-02 01:39:13.315158', '2025-10-03 17:49:36.740767', '6', '18', '5', '8', '20', '7', '24', '21', '5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2', '8', NULL, NULL, NULL, NULL, NULL, '6', NULL, NULL, NULL, 'Exempte', '14138K', '2024-09-30');
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('118', '1', '1', '18', '1', '1', NULL, 'Kouadio', 'Jaques', '15718484H', '2003-09-30', 'Soubre', '22', '+2250785412545', '+2250506984524', 'M', NULL, NULL, 'gnantihourejosue@gmail.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', '2025-10-05', NULL, '2025-10-06 02:08:52.996402', '2025-10-06 02:08:52.996402', NULL, NULL, '8', '1', '4', '8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '8', NULL, NULL, NULL, NULL, NULL, '6', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('114', '1', '1', '1', '1', '2', '4', 'Test', 'File Debug', 'TEST-FILE-DEBUG-1759404519642', '1990-01-01', NULL, NULL, '0123456789', NULL, 'M', NULL, NULL, 'test.filedebug@example.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-02 13:28:39.645975', '2025-10-02 13:28:39.645975', '1', NULL, '1', '1', '1', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, NULL, NULL, NULL, NULL, '5', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('117', '1', '1', '1', '1', '2', '4', 'Test', 'Real Backend', 'TEST-REAL-BACKEND-1759406274167', '1990-01-01', NULL, NULL, '0123456789', NULL, 'M', NULL, NULL, 'test.realbackend@example.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-02 13:57:54.322907', '2025-10-02 13:57:54.322907', '1', NULL, '1', '1', '1', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, NULL, NULL, NULL, NULL, '5', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('73', '1', '2', '18', '3', '2', NULL, 'kuyo', 'djelo', '1405121Q', '2002-09-25', 'Lakota', '23', '+2250507145485', '+225074512121', 'M', 'Marie', 'Paul', 'gouda@gmail.com', '2028-05-25', 'Blesson', '0', 'cocody', 'palmeraie', '654', 'cocody', 'palmeraie', '5412', 'actif', '2025-09-25', NULL, '2025-09-25 15:00:06.775692', '2025-10-02 15:31:32.341534', '6', '18', '8', '8', '20', '15', '14', '21', '5', NULL, NULL, NULL, NULL, NULL, NULL, '3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2', '8', '19', '15', '4', '6', NULL, '5', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('61', '3', '1', '18', '2', '1', NULL, 'Kouadio', 'Nadine', 'MAT-004', '1980-01-01', 'Abidjan', '45', '+225 20 30 40 00', '+2250788754565', 'F', 'marie', 'koffi', 'agent.rh1@gouv.ci', NULL, NULL, '0', 'cocody centre', '0758999073', '103', NULL, '2587', 'b102', 'actif', '2025-10-15', '2025-10-18', '2025-09-25 02:42:00.278224', '2025-10-03 14:14:40.770669', '7', '18', '12', '1', '20', '20', '11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '8', NULL, NULL, NULL, NULL, NULL, '6', '2025-10-22', 'DIRECTEUR DES AFFAIRES ADMINISTRATIVES ET FINANCIERE', NULL, 'Exempte', '1414', '2025-10-29');
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('132', NULL, NULL, NULL, NULL, '2', NULL, 'Test', 'DRH', 'DRH1759761905804', '1990-01-01', NULL, NULL, '0123456789', NULL, NULL, NULL, NULL, 'drh.test.1759761905804@ministere.gov', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-06 16:45:05.808636', '2025-10-06 16:45:05.808636', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('133', NULL, NULL, NULL, NULL, '2', NULL, 'Test', 'DRH', 'DRH1759761937116', '1990-01-01', NULL, NULL, '0123456789', NULL, NULL, NULL, NULL, 'drh.test.1759761937116@ministere.gov', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-06 16:45:37.120366', '2025-10-06 16:45:37.120366', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('134', NULL, NULL, NULL, NULL, '2', NULL, 'Test', 'DRH', 'DRH1759761951725', '1990-01-01', NULL, NULL, '0123456789', NULL, NULL, NULL, NULL, 'drh.test.1759761951725@ministere.gov', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-06 16:45:51.728408', '2025-10-06 16:45:51.728408', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('135', NULL, NULL, NULL, NULL, '1', NULL, 'Test', 'DRH', 'DRH1759761980181', '1990-01-01', NULL, NULL, '0123456789', NULL, NULL, NULL, NULL, 'drh.test.1759761980181@ministere.gov', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-10-06 16:46:20.184365', '2025-10-06 16:47:14.058032', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.agents (id, id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale, nom, prenom, matricule, date_de_naissance, lieu_de_naissance, age, telephone1, telephone2, sexe, nom_de_la_mere, nom_du_pere, email, date_mariage, nom_conjointe, nombre_enfant, ad_pro_rue, ad_pro_ville, ad_pro_batiment, ad_pri_rue, ad_pri_ville, ad_pri_batiment, statut_emploi, date_embauche, date_fin_contrat, created_at, updated_at, id_fonction, id_pays, id_categorie, id_grade, id_emploi, id_echelon, id_specialite, id_langue, id_niveau_langue, id_motif_depart, id_type_conge, id_autre_absence, id_distinction, id_type_etablissement, id_unite_administrative, id_diplome, id_type_materiel, id_type_destination, id_nature_accident, id_sanction, id_sindicat, id_type_courrier, id_nature_acte, id_localite, id_mode_entree, id_position, id_pathologie, id_handicap, id_niveau_informatique, id_logiciel, id_type_retraite, id_service, date_retraite, fonction_actuelle, fonction_anterieure, situation_militaire, numero_cnps, date_declaration_cnps) VALUES ('59', '1', '1', '20', '1', '1', NULL, 'KONE', 'DAVID', 'ADMIN-RH-001', '1980-01-01', 'Tingrela', '45', '+2250504658754', '+2254684752565', 'M', NULL, NULL, 'adminl@school.com', NULL, NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, 'actif', NULL, NULL, '2025-09-23 02:42:34.464874', '2025-10-08 15:20:01.540658', NULL, '18', '8', '1', '4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6', NULL, NULL, NULL, NULL, NULL, NULL);



--
-- Data for Name: agents_entites; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: agents_entites_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: agents_institutions_main; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: autre_absences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('1', 'Absence pour formation', '2025-09-09 11:37:54.1642', '2025-09-09 11:37:54.1642');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('2', 'Absence pour mission', '2025-09-09 11:37:54.167777', '2025-09-09 11:37:54.167777');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('3', 'Absence pour greve', '2025-09-09 11:37:54.168585', '2025-09-09 11:37:54.168585');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('4', 'Absence injustifiee', '2025-09-09 11:37:54.169294', '2025-09-09 11:37:54.169294');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('5', 'Absence pour accident de travail', '2025-09-09 11:37:54.170007', '2025-09-09 11:37:54.170007');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('6', 'Absence pour maladie professionnelle', '2025-09-09 11:37:54.170723', '2025-09-09 11:37:54.170723');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('7', 'Absence non justifiee', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('8', 'Absence justifiee', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('9', 'Retard', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('10', 'Sortie autorisee', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('11', 'Mission', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('12', 'Formation', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('13', 'Reunion', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');
INSERT INTO public.autre_absences (id, libele, created_at, updated_at) VALUES ('14', 'Autre', '2025-09-10 22:31:55.605938', '2025-09-10 22:31:55.605938');



--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('1', 'Categorie A', '2025-09-09 11:37:54.105399', '2025-09-09 11:37:54.105399');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('2', 'Categorie B', '2025-09-09 11:37:54.107575', '2025-09-09 11:37:54.107575');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('3', 'Categorie C', '2025-09-09 11:37:54.108225', '2025-09-09 11:37:54.108225');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('4', 'Categorie D', '2025-09-09 11:37:54.108892', '2025-09-09 11:37:54.108892');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('5', 'A', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('6', 'B', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('7', 'C', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('8', 'D', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('9', 'E', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('10', 'F', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('11', 'G', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');
INSERT INTO public.categories (id, libele, created_at, updated_at) VALUES ('12', 'H', '2025-09-10 22:31:55.538451', '2025-09-10 22:31:55.538451');



--
-- Data for Name: civilites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.civilites (id, libele, created_at, updated_at) VALUES ('1', 'Monsieur', '2025-09-09 11:37:54.075711', '2025-09-09 11:37:54.075711');
INSERT INTO public.civilites (id, libele, created_at, updated_at) VALUES ('2', 'Madame', '2025-09-09 11:37:54.079722', '2025-09-09 11:37:54.079722');
INSERT INTO public.civilites (id, libele, created_at, updated_at) VALUES ('3', 'Mademoiselle', '2025-09-09 11:37:54.080979', '2025-09-09 11:37:54.080979');
INSERT INTO public.civilites (id, libele, created_at, updated_at) VALUES ('7', 'Docteur', '2025-09-10 22:31:55.503079', '2025-09-10 22:31:55.503079');
INSERT INTO public.civilites (id, libele, created_at, updated_at) VALUES ('8', 'Professeur', '2025-09-10 22:31:55.503079', '2025-09-10 22:31:55.503079');



--
-- Data for Name: classeurs; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: classeurs_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: demandes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('68', '118', 'absence', 'Voyage d''affaire', '2025-10-10', '2025-10-12', 'Divo', 'approuve', 'finalise', '128', NULL, '61', NULL, 'approuve', 'approuve', 'en_attente', 'en_attente', '2025-10-08 16:16:09.166437', '2025-10-08 16:17:41.919027', NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 16:13:59.21056', '2025-10-08 16:21:17.695211', NULL, '[]', '83', '3', 'aller', 'retour');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('69', '118', 'attestation_presence', 'Demande d''attestation de presence', '2025-10-08', '2025-10-08', 'Service', 'approuve', 'valide_par_drh', '128', NULL, '61', NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2025-10-08 16:23:28.714592', NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 16:23:01.702407', '2025-10-08 16:23:28.720495', NULL, '[]', '83', '3', 'aller', 'retour');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('72', '59', 'note_service', 'ughi isbs isb is is igis \n1-gss hvuis juugd ujs \n2-hgjvsx jgujjdgusd d dbdjb d', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 21:17:58.643695', '2025-10-08 21:17:58.643695', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('73', '59', 'note_service', 'ughi isbs isb is is igis \n1-gss hvuis juugd ujs \n2-hgjvsx jgujjdgusd d dbdjb d', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 21:19:07.259423', '2025-10-08 21:19:07.259423', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('74', '59', 'note_service', 'ughi isbs isb is is igis \n1-gss hvuis juugd ujs \n2-hgjvsx jgujjdgusd d dbdjb d', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 21:20:58.702918', '2025-10-08 21:20:58.702918', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('75', '59', 'note_service', 'je veux voir', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 23:19:52.472718', '2025-10-08 23:19:52.472718', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('76', '59', 'note_service', 'je suis la', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 23:20:42.322004', '2025-10-08 23:20:42.322004', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('77', '59', 'note_service', 'la vie', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 23:34:16.159509', '2025-10-08 23:34:16.159509', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('78', '59', 'note_service', 'la sortie est prevue pour le 25decembre 2022', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 23:51:04.486569', '2025-10-08 23:51:04.486569', NULL, NULL, NULL, NULL, 'aller', 'aller');
INSERT INTO public.demandes (id, id_agent, type_demande, description, date_debut, date_fin, lieu, status, niveau_evolution_demande, id_chef_service, id_drh, id_directeur, id_ministre, statut_chef_service, statut_drh, statut_directeur, statut_ministre, date_validation_chef_service, date_validation_drh, date_validation_directeur, date_validation_ministre, commentaire_chef_service, commentaire_drh, commentaire_directeur, commentaire_ministre, niveau_actuel, priorite, date_creation, date_modification, commentaires, documents_joints, created_by, updated_by, phase_actuelle, phase) VALUES ('79', '59', 'note_service', 'je vois', NULL, NULL, NULL, 'approuve', 'soumis', '128', NULL, '61', NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2025-10-08 23:58:54.864899', '2025-10-08 23:58:54.864899', NULL, NULL, NULL, NULL, 'aller', 'aller');



--
-- Data for Name: demandes_historique; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.demandes_historique (id, id_demande, ancien_status, nouveau_status, ancien_niveau, nouveau_niveau, commentaire_modification, modifie_par, date_modification) VALUES ('136', '68', 'en_attente', 'en_attente', 'soumis', 'valide_par_superieur', 'Modification automatique - Status: en_attente -> en_attente, Niveau: soumis -> valide_par_superieur', '87', '2025-10-08 16:16:09.173962');
INSERT INTO public.demandes_historique (id, id_demande, ancien_status, nouveau_status, ancien_niveau, nouveau_niveau, commentaire_modification, modifie_par, date_modification) VALUES ('137', '68', 'en_attente', 'en_attente', 'valide_par_superieur', 'retour_drh', 'Modification automatique - Status: en_attente -> en_attente, Niveau: valide_par_superieur -> retour_drh', '3', '2025-10-08 16:17:41.924058');
INSERT INTO public.demandes_historique (id, id_demande, ancien_status, nouveau_status, ancien_niveau, nouveau_niveau, commentaire_modification, modifie_par, date_modification) VALUES ('138', '68', 'en_attente', 'approuve', 'retour_drh', 'finalise', 'Modification automatique - Status: en_attente -> approuve, Niveau: retour_drh -> finalise', '3', '2025-10-08 16:21:17.695211');
INSERT INTO public.demandes_historique (id, id_demande, ancien_status, nouveau_status, ancien_niveau, nouveau_niveau, commentaire_modification, modifie_par, date_modification) VALUES ('139', '69', 'en_attente', 'approuve', 'valide_par_superieur', 'valide_par_drh', 'Modification automatique - Status: en_attente -> approuve, Niveau: valide_par_superieur -> valide_par_drh', '3', '2025-10-08 16:23:28.720495');



--
-- Data for Name: departements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('20', '10', 'ABJ-01', 'Abidjan', 'Abidjan', 'Departement d''Abidjan', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('21', '10', 'ABJ-02', 'Anyama', 'Anyama', 'Departement d''Anyama', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('22', '10', 'ABJ-03', 'Bingerville', 'Bingerville', 'Departement de Bingerville', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('23', '11', 'YAM-01', 'Yamoussoukro', 'Yamoussoukro', 'Departement de Yamoussoukro', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('24', '11', 'YAM-02', 'Toumodi', 'Toumodi', 'Departement de Toumodi', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('25', '12', 'BOU-01', 'Bouake', 'Bouake', 'Departement de Bouake', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('26', '12', 'BOU-02', 'Sakassou', 'Sakassou', 'Departement de Sakassou', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('27', '12', 'BOU-03', 'Beoumi', 'Beoumi', 'Departement de Beoumi', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('28', '13', 'DAL-01', 'Daloa', 'Daloa', 'Departement de Daloa', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('29', '13', 'DAL-02', 'Issia', 'Issia', 'Departement d''Issia', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('30', '13', 'DAL-03', 'Vavoua', 'Vavoua', 'Departement de Vavoua', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('31', '14', 'KOR-01', 'Korhogo', 'Korhogo', 'Departement de Korhogo', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('32', '14', 'KOR-02', 'Ferkessedougou', 'Ferkessedougou', 'Departement de Ferkessedougou', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('33', '15', 'MAN-01', 'Man', 'Man', 'Departement de Man', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('34', '15', 'MAN-02', 'Danane', 'Danane', 'Departement de Danane', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('35', '16', 'SAN-01', 'San-Pedro', 'San-Pedro', 'Departement de San-Pedro', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('36', '16', 'SAN-02', 'Sassandra', 'Sassandra', 'Departement de Sassandra', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('37', '17', 'BON-01', 'Bondoukou', 'Bondoukou', 'Departement de Bondoukou', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.departements (id, id_region, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('38', '17', 'BON-02', 'Bouna', 'Bouna', 'Departement de Bouna', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');



--
-- Data for Name: diplomes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('1', 'Baccalaureat', 'Bac', '2025-09-09 11:37:54.206023', '2025-09-09 11:37:54.206023');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('2', 'Licence', 'Licence', '2025-09-09 11:37:54.208784', '2025-09-09 11:37:54.208784');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('3', 'Master', 'Master', '2025-09-09 11:37:54.21', '2025-09-09 11:37:54.21');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('4', 'Doctorat', 'Doctorat', '2025-09-09 11:37:54.211467', '2025-09-09 11:37:54.211467');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('5', 'BTS', 'BTS', '2025-09-09 11:37:54.212678', '2025-09-09 11:37:54.212678');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('6', 'DUT', 'DUT', '2025-09-09 11:37:54.21372', '2025-09-09 11:37:54.21372');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('7', 'CAP', 'CAP', '2025-09-09 11:37:54.214843', '2025-09-09 11:37:54.214843');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('8', 'BEP', 'BEP', '2025-09-09 11:37:54.215824', '2025-09-09 11:37:54.215824');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('17', 'Certificat', 'Formation', '2025-09-10 22:31:55.630004', '2025-09-10 22:31:55.630004');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('18', 'Attestation', 'Formation', '2025-09-10 22:31:55.630004', '2025-09-10 22:31:55.630004');
INSERT INTO public.diplomes (id, libele, type_de_diplome, created_at, updated_at) VALUES ('19', 'Autre', 'Autre', '2025-09-10 22:31:55.630004', '2025-09-10 22:31:55.630004');



--
-- Data for Name: distinctions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('1', 'Medaille du travail', 'Medaille', '2025-09-09 11:37:54.171457', '2025-09-09 11:37:54.171457');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('2', 'Ordre du merite', 'Ordre', '2025-09-09 11:37:54.175825', '2025-09-09 11:37:54.175825');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('3', 'Legion d''honneur', 'Ordre', '2025-09-09 11:37:54.176588', '2025-09-09 11:37:54.176588');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('4', 'Medaille militaire', 'Medaille', '2025-09-09 11:37:54.177382', '2025-09-09 11:37:54.177382');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('5', 'Croix de guerre', 'Croix', '2025-09-09 11:37:54.178405', '2025-09-09 11:37:54.178405');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('6', 'Medaille de la resistance', 'Medaille', '2025-09-09 11:37:54.179571', '2025-09-09 11:37:54.179571');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('7', 'Ordre National', 'Decoration', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('8', 'Medaille du Travail', 'Decoration', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('9', 'Medaille d''Honneur', 'Decoration', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('10', 'Lettre de Felicitations', 'Reconnaissance', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('11', 'Certificat de Merite', 'Reconnaissance', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('12', 'Prix d''Excellence', 'Reconnaissance', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');
INSERT INTO public.distinctions (id, libele, nature, created_at, updated_at) VALUES ('13', 'Autre', 'Autre', '2025-09-10 22:31:55.608913', '2025-09-10 22:31:55.608913');



--
-- Data for Name: documents_autorisation; Type: TABLE DATA; Schema: public; Owner: postgres
--




--

-- Les données de cette table ont été supprimées car elles contiennent du HTML complexe
-- qui cause des erreurs SQL. La structure de la table est conservée.
-- Vous pourrez ajouter de nouvelles données via votre application.

-- Data for Name: dossiers; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: dossiers_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: echelons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('1', '100', '5000.00', 'Echelon 1', '2025-09-09 11:37:54.122753', '2025-09-09 11:37:54.122753');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('2', '200', '6000.00', 'Echelon 2', '2025-09-09 11:37:54.12656', '2025-09-09 11:37:54.12656');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('3', '300', '7000.00', 'Echelon 3', '2025-09-09 11:37:54.12723', '2025-09-09 11:37:54.12723');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('4', '400', '8000.00', 'Echelon 4', '2025-09-09 11:37:54.128251', '2025-09-09 11:37:54.128251');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('5', '500', '9000.00', 'Echelon 5', '2025-09-09 11:37:54.129313', '2025-09-09 11:37:54.129313');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('6', '1000', '500000.00', 'Echelon 1', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('7', '1100', '550000.00', 'Echelon 2', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('8', '1200', '600000.00', 'Echelon 3', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('9', '1300', '650000.00', 'Echelon 4', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('10', '1400', '700000.00', 'Echelon 5', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('11', '1500', '750000.00', 'Echelon 6', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('12', '1600', '800000.00', 'Echelon 7', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('13', '1700', '850000.00', 'Echelon 8', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('14', '1800', '900000.00', 'Echelon 9', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('15', '1900', '950000.00', 'Echelon 10', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('16', '2000', '1000000.00', 'Echelon 11', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('17', '2100', '1050000.00', 'Echelon 12', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('18', '2200', '1100000.00', 'Echelon 13', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('19', '2300', '1150000.00', 'Echelon 14', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');
INSERT INTO public.echelons (id, indice, salaire_net, libele, created_at, updated_at) VALUES ('20', '2400', '1200000.00', 'Echelon 15', '2025-09-10 22:31:55.560032', '2025-09-10 22:31:55.560032');



--
-- Data for Name: emploi_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.emploi_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_emploi) VALUES ('1', '85', '7', '2025-09-30', 'DIRECTEUR TECH', '2025-10-05 23:11:27.507022', '2025-10-05 23:11:27.507022', '6');



--
-- Data for Name: emplois; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('1', 'Emploi permanent', 'PERM', '2025-09-09 11:37:54.119215', '2025-09-09 11:37:54.119215');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('2', 'Emploi temporaire', 'TEMP', '2025-09-09 11:37:54.121437', '2025-09-09 11:37:54.121437');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('3', 'Emploi saisonnier', 'SAIS', '2025-09-09 11:37:54.122056', '2025-09-09 11:37:54.122056');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('4', 'Directeur des Ressources Humaines', 'DRH', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('5', 'Directeur Administratif et Financier', 'DAF', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('6', 'Directeur Technique', 'DT', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('7', 'Chef de Service RH', 'CSRH', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('8', 'Chef de Service Administratif', 'CSA', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('9', 'Chef de Service Financier', 'CSF', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('10', 'Chef de Service Technique', 'CST', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('11', 'Secretaire de Direction', 'SD', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('12', 'Secretaire Administrative', 'SA', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('13', 'Comptable', 'COMPT', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('14', 'Agent de Bureau', 'AB', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('15', 'Agent de Maintenance', 'AM', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('16', 'Agent de Securite', 'AS', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('17', 'Chauffeur', 'CHAUF', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('18', 'Gardien', 'GARD', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('19', 'Femme de Menage', 'FM', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');
INSERT INTO public.emplois (id, libele, libele_court, created_at, updated_at) VALUES ('20', 'Stagiaire', 'STAG', '2025-09-10 22:31:55.556183', '2025-09-10 22:31:55.556183');



--
-- Data for Name: enfants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.enfants (id, id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, created_at, updated_at) VALUES ('12', '4', 'KONE', 'Fatou', 'F', '2011-11-25', 't', 't', '2025-09-10 22:39:53.785107', '2025-09-10 22:39:53.785107');
INSERT INTO public.enfants (id, id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, created_at, updated_at) VALUES ('13', '4', 'KONE', 'Moussa', 'M', '2014-07-18', 't', 't', '2025-09-10 22:39:53.785107', '2025-09-10 22:39:53.785107');
INSERT INTO public.enfants (id, id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, created_at, updated_at) VALUES ('14', '7', 'BAMBA', 'AAcha', 'F', '2013-09-12', 't', 't', '2025-09-10 22:39:53.785107', '2025-09-10 22:39:53.785107');
INSERT INTO public.enfants (id, id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, created_at, updated_at) VALUES ('15', '10', 'TRAORE', 'SAkou', 'M', '2016-01-30', 't', 't', '2025-09-10 22:39:53.785107', '2025-09-10 22:39:53.785107');
INSERT INTO public.enfants (id, id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, created_at, updated_at) VALUES ('16', '13', 'SANGARE', 'Mariam', 'F', '2012-04-22', 't', 't', '2025-09-10 22:39:53.785107', '2025-09-10 22:39:53.785107');



--
-- Data for Name: enfants_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: entites_administratives; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('4', '2', NULL, 'DEP', 'Direction de l''Education Primaire', 'DEP', NULL, 'direction', '1', NULL, '+225 20 30 40 61', 'dep@education.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('5', '2', NULL, 'DES', 'Direction de l''Education Secondaire', 'DES', NULL, 'direction', '1', NULL, '+225 20 30 40 62', 'des@education.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('6', '2', NULL, 'DALF', 'Direction de l''Alphabetisation et de la Formation', 'DALF', NULL, 'direction', '1', NULL, '+225 20 30 40 63', 'dalf@education.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('7', '3', NULL, 'DSP', 'Direction de la Sante Publique', 'DSP', NULL, 'direction', '1', NULL, '+225 20 30 40 71', 'dsp@sante.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('8', '3', NULL, 'DH', 'Direction des Hopitaux', 'DH', NULL, 'direction', '1', NULL, '+225 20 30 40 72', 'dh@sante.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('9', '3', NULL, 'DP', 'Direction de la Pharmacie', 'DP', NULL, 'direction', '1', NULL, '+225 20 30 40 73', 'dp@sante.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('10', '4', NULL, 'DB', 'Direction du Budget', 'DB', NULL, 'direction', '1', NULL, '+225 20 30 40 81', 'db@finances.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('11', '4', NULL, 'DC', 'Direction de la Comptabilite', 'DC', NULL, 'direction', '1', NULL, '+225 20 30 40 82', 'dc@finances.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('12', '4', NULL, 'DI', 'Direction des Impots', 'DI', NULL, 'direction', '1', NULL, '+225 20 30 40 83', 'di@finances.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('13', '5', NULL, 'DS', 'Direction de la Securite', 'DS', NULL, 'direction', '1', NULL, '+225 20 30 40 91', 'ds@interieur.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-10 22:31:55.704777', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('14', '5', NULL, 'DC_2', 'Direction de la Circulation', 'DC', NULL, 'direction', '1', NULL, '+225 20 30 40 92', 'dc@interieur.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-14 18:16:38.211763', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('15', '5', NULL, 'DP_2', 'Direction de la Police', 'DP', NULL, 'direction', '1', NULL, '+225 20 30 40 93', 'dp@interieur.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-14 18:16:38.211763', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('1', '1', NULL, 'ONT', 'Office National du Tourisme', 'ONT', NULL, 'direction', '1', NULL, '+225 20 30 40 51', 'drh@rh.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-15 13:09:33.526581', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('2', '1', NULL, 'DSE', 'Direction des Services Exterieurs ', 'DSE', NULL, 'service', '2', NULL, '+225 20 30 40 52', 'srh@rh.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-15 13:09:33.526581', NULL, NULL, NULL);
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('3', '1', NULL, 'CNT', 'Conseil National du Tourisme', 'CNT', NULL, 'service', '2', NULL, '+225 20 30 40 53', 'sadm@rh.gouv.ci', NULL, 't', '2025-09-10 22:31:55.704777', '2025-09-30 00:42:21.124927', '10', '20', '52');
INSERT INTO public.entites_administratives (id, id_ministere, id_entite_parent, code, nom, sigle, description, type_entite, niveau_hierarchique, adresse, telephone, email, responsable_id, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('29', '1', NULL, 'ENS7UHGV', 'Cote dIvoire Tourisme', 'CIT', 'EPIC charge de la promotion touristique', 'direction', '1', 'Plateau, a la Place de la Republique 01 BP 8538 ABIDJAN 01', '+225 27 20 25 16 00', 'entitecit@gmail.com', NULL, 't', '2025-09-30 00:58:31.682479', '2025-09-30 00:58:31.682479', '10', '20', '52');



--
-- Data for Name: entites_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: etude_diplome; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.etude_diplome (id, id_agent, diplome, date_diplome, ecole, ville, pays, created_at, updated_at, id_agent_document) VALUES ('72', '61', 'BAC', '2023-10-15', 'Lycee Moderne HKB', 'Sinfra', 'Cote d''Ivoire', '2025-10-03 14:14:40.806175', '2025-10-03 14:14:40.806175', '114');
INSERT INTO public.etude_diplome (id, id_agent, diplome, date_diplome, ecole, ville, pays, created_at, updated_at, id_agent_document) VALUES ('77', '85', 'BAC', '2025-09-30', 'ESMA', 'Abidjan', 'Cote d''ivoire', '2025-10-03 17:49:36.803081', '2025-10-03 17:49:36.803081', '121');
INSERT INTO public.etude_diplome (id, id_agent, diplome, date_diplome, ecole, ville, pays, created_at, updated_at, id_agent_document) VALUES ('78', '85', 'BTS', '2024-10-01', 'ESMA', 'Abidjan', 'Cote D''Ivoire', '2025-10-03 17:49:36.833742', '2025-10-03 17:49:36.833742', NULL);
INSERT INTO public.etude_diplome (id, id_agent, diplome, date_diplome, ecole, ville, pays, created_at, updated_at, id_agent_document) VALUES ('67', '73', 'BAC', '2025-10-01', 'ESMA', 'Abidjan', 'Cote dIvoire', '2025-10-02 15:31:32.379', '2025-10-02 15:31:32.379', '102');



--
-- Data for Name: fonction_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('2', '85', '5', '2025-09-28', 'DIRECTEUR DE CABINET', '2025-10-05 22:18:50.291634', '2025-10-05 22:18:50.291634', '1');
INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('3', '85', '8', '2025-10-03', 'DIRECTEUR GENERALE DU TOURISME', '2025-10-06 00:51:40.112793', '2025-10-06 00:51:40.112793', '17');
INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('4', '118', '9', '2025-10-01', 'CHEF DE SERVICE', '2025-10-06 05:43:28.20366', '2025-10-06 05:43:28.20366', '3');
INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('6', '128', '12', '2025-10-06', 'Chef de Service Comptabilite', '2025-10-06 06:00:25.086688', '2025-10-06 06:00:25.086688', NULL);
INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('8', '135', '13', '2025-10-06', 'DRH', '2025-10-06 16:46:20.212511', '2025-10-06 16:46:20.212511', '27');
INSERT INTO public.fonction_agents (id, id_agent, id_nomination, date_entree, designation_poste, created_at, updated_at, id_fonction) VALUES ('9', '59', '14', '2025-10-07', 'Directeur des Ressources Humaines', '2025-10-08 19:08:46.669055', '2025-10-08 19:08:46.669055', '1');



--
-- Data for Name: fonctions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('1', 'Directeur', NULL, '2025-09-09 11:37:54.377311', '2025-09-09 11:37:54.377311');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('2', 'Sous-directeur', NULL, '2025-09-09 11:37:54.381464', '2025-09-09 11:37:54.381464');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('3', 'Chef de service', NULL, '2025-09-09 11:37:54.382641', '2025-09-09 11:37:54.382641');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('4', 'Chef de bureau', NULL, '2025-09-09 11:37:54.38368', '2025-09-09 11:37:54.38368');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('5', 'Attache', NULL, '2025-09-09 11:37:54.385398', '2025-09-09 11:37:54.385398');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('6', 'Adjoint administratif', NULL, '2025-09-09 11:37:54.386711', '2025-09-09 11:37:54.386711');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('7', 'Agent de service', NULL, '2025-09-09 11:37:54.388035', '2025-09-09 11:37:54.388035');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('8', 'Secretaire', NULL, '2025-09-09 11:37:54.389137', '2025-09-09 11:37:54.389137');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('9', 'Comptable', NULL, '2025-09-09 11:37:54.390365', '2025-09-09 11:37:54.390365');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('10', 'Informaticien', NULL, '2025-09-09 11:37:54.391703', '2025-09-09 11:37:54.391703');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('11', 'Direction Generale', '5', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('12', 'Direction Administrative', '8', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('13', 'Direction Technique', '6', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('14', 'Service RH', '12', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('15', 'Service Comptable', '10', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('16', 'Service Maintenance', '8', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('17', 'Bureau du Directeur', '3', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('18', 'Secretariat', '15', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('19', 'Accueil', '5', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('20', 'Securite', '20', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('21', 'Transport', '8', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('22', 'Nettoyage', '12', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('23', 'Autre', '0', '2025-09-10 22:31:55.722406', '2025-09-10 22:31:55.722406');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('24', 'Directeur des Ressources Humaines', NULL, '2025-10-06 16:45:05.842506', '2025-10-06 16:45:05.842506');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('26', 'Directeur des Ressources Humaines 1759761951739', NULL, '2025-10-06 16:45:51.74078', '2025-10-06 16:45:51.74078');
INSERT INTO public.fonctions (id, libele, nbr_agent, created_at, updated_at) VALUES ('27', 'Directeur des Ressources Humaines 1759761980203', NULL, '2025-10-06 16:46:20.203499', '2025-10-06 16:46:20.203499');



--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('1', '1', 'Directeur', '1', '65', '2025-09-09 11:37:54.109477', '2025-09-09 11:37:54.109477');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('2', '1', 'Sous-directeur', '2', '65', '2025-09-09 11:37:54.114121', '2025-09-09 11:37:54.114121');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('3', '1', 'Chef de service', '3', '65', '2025-09-09 11:37:54.114943', '2025-09-09 11:37:54.114943');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('4', '2', 'Attache principal', '1', '65', '2025-09-09 11:37:54.115768', '2025-09-09 11:37:54.115768');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('5', '2', 'Attache', '2', '65', '2025-09-09 11:37:54.116451', '2025-09-09 11:37:54.116451');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('6', '3', 'Adjoint administratif principal', '1', '65', '2025-09-09 11:37:54.117223', '2025-09-09 11:37:54.117223');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('7', '3', 'Adjoint administratif', '2', '65', '2025-09-09 11:37:54.117889', '2025-09-09 11:37:54.117889');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('8', '4', 'Agent de service', '1', '65', '2025-09-09 11:37:54.118607', '2025-09-09 11:37:54.118607');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('12', '1', 'Chef de Service', '4', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('13', '1', 'Chef de Bureau', '5', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('14', '1', 'Chef de Division', '6', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('15', '1', 'Inspecteur Principal', '7', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('16', '1', 'Inspecteur', '8', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('17', '1', 'Controleur Principal', '9', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('18', '1', 'Controleur', '10', '65', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('21', '2', 'Secretaire de Direction Principal', '3', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('22', '2', 'Secretaire de Direction', '4', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('23', '2', 'Redacteur Principal', '5', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('24', '2', 'Redacteur', '6', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('25', '2', 'Comptable Principal', '7', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('26', '2', 'Comptable', '8', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('29', '3', 'Commis Principal', '3', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('30', '3', 'Commis', '4', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('31', '3', 'Ouvrier Principal', '5', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('32', '3', 'Ouvrier', '6', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('34', '4', 'Aide-Secretaire', '2', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('35', '4', 'Aide-Agent', '3', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');
INSERT INTO public.grades (id, id_categorie, libele, numero_ordre, age_de_retraite, created_at, updated_at) VALUES ('36', '4', 'Stagiaire', '4', '60', '2025-09-10 22:31:55.541758', '2025-09-10 22:31:55.541758');



--
-- Data for Name: handicaps; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('1', 'Handicap moteur', '2025-09-09 11:37:54.324477', '2025-09-09 11:37:54.324477');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('2', 'Handicap visuel', '2025-09-09 11:37:54.327401', '2025-09-09 11:37:54.327401');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('3', 'Handicap auditif', '2025-09-09 11:37:54.32882', '2025-09-09 11:37:54.32882');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('4', 'Handicap mental', '2025-09-09 11:37:54.329911', '2025-09-09 11:37:54.329911');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('5', 'Handicap psychique', '2025-09-09 11:37:54.330906', '2025-09-09 11:37:54.330906');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('6', 'Handicap cognitif', '2025-09-09 11:37:54.331808', '2025-09-09 11:37:54.331808');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('7', 'Handicap invisible', '2025-09-09 11:37:54.333049', '2025-09-09 11:37:54.333049');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('13', 'Handicap multiple', '2025-09-10 22:31:55.685962', '2025-09-10 22:31:55.685962');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('14', 'Autre', '2025-09-10 22:31:55.685962', '2025-09-10 22:31:55.685962');
INSERT INTO public.handicaps (id, libele, created_at, updated_at) VALUES ('15', 'Aucun', '2025-09-10 22:31:55.685962', '2025-09-10 22:31:55.685962');



--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('1', 'INST001', 'Universite Felix Houphouet-Boigny', 'UFHB', 'Universite publique d''Abidjan', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);
INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('2', 'INST002', 'Centre Hospitalier Universitaire de Cocody', 'CHU Cocody', 'Hopital universitaire d''Abidjan', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);
INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('3', 'INST003', 'Banque Atlantique Cote d''Ivoire', 'BACI', 'Institution bancaire ivoirienne', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);
INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('4', 'INST004', 'Societe Ivoirienne de Raffinage', 'SIR', 'Entreprise petroliere nationale', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);
INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('5', 'INST005', 'Compagnie Ivoirienne d''Electricite', 'CIE', 'Entreprise d''electricite nationale', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);
INSERT INTO public.institutions (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite) VALUES ('6', 'INST006', 'Port Autonome d''Abidjan', 'PAA', 'Autorite portuaire d''Abidjan', NULL, NULL, NULL, NULL, NULL, 't', '2025-09-09 11:37:54.06898', '2025-09-09 11:37:54.06898', NULL, NULL, NULL);



--
-- Data for Name: langues; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('1', 'Arabe', '2025-09-09 11:37:54.136796', '2025-09-09 11:37:54.136796');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('2', 'Francais', '2025-09-09 11:37:54.138903', '2025-09-09 11:37:54.138903');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('3', 'Anglais', '2025-09-09 11:37:54.139558', '2025-09-09 11:37:54.139558');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('4', 'Espagnol', '2025-09-09 11:37:54.140163', '2025-09-09 11:37:54.140163');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('5', 'Allemand', '2025-09-09 11:37:54.140761', '2025-09-09 11:37:54.140761');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('6', 'Italien', '2025-09-09 11:37:54.141346', '2025-09-09 11:37:54.141346');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('7', 'Portugais', '2025-09-09 11:37:54.141907', '2025-09-09 11:37:54.141907');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('8', 'Russe', '2025-09-09 11:37:54.142468', '2025-09-09 11:37:54.142468');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('9', 'Chinois', '2025-09-09 11:37:54.143109', '2025-09-09 11:37:54.143109');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('10', 'Japonais', '2025-09-09 11:37:54.143691', '2025-09-09 11:37:54.143691');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('15', 'Mandarin', '2025-09-10 22:31:55.571054', '2025-09-10 22:31:55.571054');
INSERT INTO public.langues (id, libele, created_at, updated_at) VALUES ('21', 'Autre', '2025-09-10 22:31:55.571054', '2025-09-10 22:31:55.571054');



--
-- Data for Name: localites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('50', 'Abidjan', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '20', 'ABJ-01-001', 'ville', 'Capitale economique de la Cote d''Ivoire', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('51', 'Cocody', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '20', 'ABJ-01-002', 'commune', 'Commune residentielle d''Abidjan', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('52', 'Plateau', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '20', 'ABJ-01-003', 'commune', 'Centre des affaires d''Abidjan', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('53', 'Marcory', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '20', 'ABJ-01-004', 'commune', 'Commune industrielle d''Abidjan', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('54', 'Yopougon', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '20', 'ABJ-01-005', 'commune', 'Plus grande commune d''Abidjan', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('55', 'Anyama', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '21', 'ABJ-02-001', 'ville', 'Ville d''Anyama', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('56', 'Songon', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '21', 'ABJ-02-002', 'commune', 'Commune de Songon', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('57', 'Bingerville', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '22', 'ABJ-03-001', 'ville', 'Ancienne capitale de la Cote d''Ivoire', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('58', 'Adjame', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '22', 'ABJ-03-002', 'commune', 'Commune d''Adjame', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('59', 'Yamoussoukro', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '23', 'YAM-01-001', 'ville', 'Capitale politique de la Cote d''Ivoire', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('60', 'Attiegouakro', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '23', 'YAM-01-002', 'village', 'Village d''Attiegouakro', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('61', 'Bouake', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '25', 'BOU-01-001', 'ville', 'Deuxieme ville de Cote d''Ivoire', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('62', 'Sakassou', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '25', 'BOU-01-002', 'ville', 'Ville de Sakassou', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('63', 'Daloa', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '28', 'DAL-01-001', 'ville', 'Ville de Daloa', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('64', 'Issia', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '28', 'DAL-01-002', 'ville', 'Ville d''Issia', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('65', 'Korhogo', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '31', 'KOR-01-001', 'ville', 'Ville de Korhogo', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('66', 'Ferkessedougou', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '31', 'KOR-01-002', 'ville', 'Ville de Ferkessedougou', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('67', 'Man', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '33', 'MAN-01-001', 'ville', 'Ville de Man', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('68', 'Danane', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '33', 'MAN-01-002', 'ville', 'Ville de Danane', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('69', 'San-Pedro', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '35', 'SAN-01-001', 'ville', 'Port de San-Pedro', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('70', 'Sassandra', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '35', 'SAN-01-002', 'ville', 'Ville de Sassandra', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('71', 'Bondoukou', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '37', 'BON-01-001', 'ville', 'Ville de Bondoukou', 't');
INSERT INTO public.localites (id, libele, created_at, updated_at, id_departement, code, type_localite, description, is_active) VALUES ('72', 'Bouna', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441', '37', 'BON-01-002', 'ville', 'Ville de Bouna', 't');



--
-- Data for Name: logiciels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('1', 'Microsoft Office', '2025-09-09 11:37:54.341975', '2025-09-09 11:37:54.341975');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('2', 'Adobe Creative Suite', '2025-09-09 11:37:54.345584', '2025-09-09 11:37:54.345584');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('3', 'AutoCAD', '2025-09-09 11:37:54.347131', '2025-09-09 11:37:54.347131');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('4', 'SAP', '2025-09-09 11:37:54.348063', '2025-09-09 11:37:54.348063');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('5', 'Oracle', '2025-09-09 11:37:54.348992', '2025-09-09 11:37:54.348992');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('6', 'Visual Studio', '2025-09-09 11:37:54.350234', '2025-09-09 11:37:54.350234');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('7', 'Eclipse', '2025-09-09 11:37:54.351188', '2025-09-09 11:37:54.351188');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('8', 'IntelliJ IDEA', '2025-09-09 11:37:54.352358', '2025-09-09 11:37:54.352358');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('10', 'Microsoft Word', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('11', 'Microsoft Excel', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('12', 'Microsoft PowerPoint', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('13', 'Microsoft Access', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('14', 'Adobe Acrobat', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('15', 'Photoshop', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');
INSERT INTO public.logiciels (id, libele, created_at, updated_at) VALUES ('19', 'Autre', '2025-09-10 22:31:55.692035', '2025-09-10 22:31:55.692035');



--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('1', 'admin', '::1', 't', '2025-09-09 14:58:13.791998');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('2', 'admin', '::1', 't', '2025-09-09 15:02:52.418378');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('3', 'admin', '::1', 't', '2025-09-09 15:21:24.233511');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('4', 'admin', '::1', 't', '2025-09-09 15:51:18.646381');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('5', 'admin', '::1', 't', '2025-09-09 16:34:46.289894');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('6', 'admin', '::1', 't', '2025-09-09 17:40:48.825025');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('7', 'admin', '::1', 't', '2025-09-09 17:57:32.687556');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('8', 'drh.mrh', '::1', 't', '2025-09-09 19:06:18.154731');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('9', 'drh.mrh', '::1', 't', '2025-09-09 19:07:03.557983');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('10', 'drh.mrh', '::1', 't', '2025-09-09 19:09:33.437229');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('11', 'drh.mrh', '::1', 't', '2025-09-09 19:14:55.750783');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('12', 'drh.mrh', '::1', 't', '2025-09-09 19:34:10.11898');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('13', 'drh.mrh', '::1', 't', '2025-09-09 20:18:45.819053');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('14', 'drh.mrh', '::1', 't', '2025-09-09 20:52:34.002323');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('15', 'drh.mrh', '::1', 't', '2025-09-09 20:53:46.168679');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('16', 'admin', '::1', 't', '2025-09-09 22:01:21.25716');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('17', 'drh.mrh', '::1', 't', '2025-09-09 22:24:06.39498');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('18', 'admin', '::1', 't', '2025-09-10 13:22:28.755214');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('19', 'drh.mrh', '::1', 't', '2025-09-10 13:23:07.832952');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('20', 'drh.mrh', '::1', 't', '2025-09-10 17:34:54.569894');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('21', 'admin', '::1', 't', '2025-09-10 18:23:36.889109');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('22', 'admin.rh', '::1', 'f', '2025-09-10 22:52:53.301428');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('23', 'admin.rh', '::1', 'f', '2025-09-10 22:56:20.241952');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('24', 'admin.rh', '::1', 'f', '2025-09-10 22:57:17.278455');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('25', 'admin.rh', '::1', 'f', '2025-09-10 22:58:12.295564');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('26', 'admin.education', '::1', 'f', '2025-09-10 22:58:13.01562');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('27', 'admin.sante', '::1', 'f', '2025-09-10 22:58:13.959209');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('28', 'admin.finances', '::1', 'f', '2025-09-10 22:58:14.660379');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('29', 'admin.interieur', '::1', 'f', '2025-09-10 22:58:15.69241');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('30', 'admin.rh', '::1', 'f', '2025-09-10 22:58:48.858681');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('31', 'drh.mrh', '::1', 't', '2025-09-10 23:44:24.541998');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('32', 'drh.mrh', '::1', 't', '2025-09-10 23:48:26.745685');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('33', 'admin.education', '::1', 't', '2025-09-11 02:15:39.730493');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('34', 'admin.education', '::1', 't', '2025-09-11 02:17:27.980737');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('35', 'admin.education', '::1', 't', '2025-09-11 02:28:11.981472');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('36', 'drh.mrh', '::1', 'f', '2025-09-11 02:32:52.873256');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('37', 'drh.mrh', '::1', 'f', '2025-09-11 02:33:23.421971');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('38', 'drh.mrh', '::1', 't', '2025-09-11 02:34:20.255133');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('39', 'admin.education', '::1', 't', '2025-09-11 02:42:17.883173');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('40', 'drh.mrh', '::1', 'f', '2025-09-11 02:42:18.232454');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('41', 'drh.mrh', '::1', 'f', '2025-09-11 02:44:24.823476');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('42', 'admin', '::1', 't', '2025-09-11 02:51:04.103804');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('43', 'drh.mrh', '::1', 't', '2025-09-11 02:51:04.403466');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('44', 'admin.rh', '::1', 't', '2025-09-11 02:51:04.5952');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('45', 'admin.education', '::1', 't', '2025-09-11 02:51:04.804337');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('46', 'admin.sante', '::1', 't', '2025-09-11 02:51:05.005381');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('47', 'admin.finances', '::1', 't', '2025-09-11 02:51:05.227544');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('48', 'admin.interieur', '::1', 't', '2025-09-11 02:51:05.507167');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('49', 'agent.rh1', '::1', 't', '2025-09-11 02:51:05.742391');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('50', 'agent.rh2', '::1', 't', '2025-09-11 02:51:05.987111');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('51', 'agent.education1', '::1', 't', '2025-09-11 02:51:06.22126');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('52', 'agent.education2', '::1', 't', '2025-09-11 02:51:06.432241');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('53', 'agent.sante1', '::1', 't', '2025-09-11 02:51:06.60609');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('54', 'agent.sante2', '::1', 't', '2025-09-11 02:51:06.790208');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('55', 'agent.finances1', '::1', 't', '2025-09-11 02:51:06.975017');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('56', 'agent.finances2', '::1', 't', '2025-09-11 02:51:07.141264');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('57', 'agent.interieur1', '::1', 't', '2025-09-11 02:51:07.359539');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('58', 'agent.interieur2', '::1', 't', '2025-09-11 02:51:07.718356');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('59', 'super.admin', '::1', 't', '2025-09-11 02:51:07.923184');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('60', 'drh.mrh', '::1', 't', '2025-09-11 02:52:20.519256');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('61', 'drh.mrh', '::1', 't', '2025-09-11 02:52:57.859848');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('62', 'admin.education', '::1', 't', '2025-09-11 02:58:30.292601');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('63', 'admin.education', '::1', 't', '2025-09-11 03:01:13.218478');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('64', 'admin.education', '::1', 't', '2025-09-11 03:01:24.559363');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('65', 'drh.mrh', '::1', 't', '2025-09-13 12:25:47.616255');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('66', 'admin.education', '::1', 't', '2025-09-13 12:26:23.983193');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('67', 'drh.drh', '::1', 't', '2025-09-13 16:06:37.472251');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('68', 'drh.drh', '::1', 't', '2025-09-13 18:42:04.279205');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('69', 'drh.drh', '::1', 't', '2025-09-13 21:40:08.630346');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('70', 'drh.drh', '::1', 't', '2025-09-14 00:19:42.536308');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('71', 'admin.rh', '::1', 't', '2025-09-14 02:43:10.674651');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('72', 'admin.education', '::1', 't', '2025-09-14 02:43:33.168137');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('73', 'admin.education', '::1', 't', '2025-09-14 02:45:31.46458');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('74', 'admin.rh', '::1', 't', '2025-09-14 02:45:31.615652');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('75', 'admin.education', '::1', 't', '2025-09-14 02:45:31.748813');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('76', 'admin.education', '::1', 't', '2025-09-14 16:54:48.82266');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('77', 'drh.drh', '::1', 'f', '2025-09-14 17:11:53.368115');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('78', 'drh.drh', '::1', 't', '2025-09-14 17:12:09.293995');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('79', 'super.admin', '::1', 't', '2025-09-14 18:04:44.945295');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('80', 'drh.drh', '::1', 't', '2025-09-14 19:17:09.684965');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('81', 'admin.rh', '::1', 't', '2025-09-14 19:17:16.656849');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('82', 'admin.rh', '::1', 't', '2025-09-14 19:17:22.083314');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('83', 'drh.drh', '::1', 't', '2025-09-14 19:17:35.213248');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('84', 'admin.education', '::1', 't', '2025-09-14 19:17:56.623688');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('85', 'admin.rh', '::1', 't', '2025-09-14 19:18:18.492192');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('86', 'admin.rh', '::1', 't', '2025-09-14 21:39:08.700403');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('87', 'drh.drh', '::1', 't', '2025-09-15 02:03:40.498502');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('88', 'admin.education', '::1', 't', '2025-09-15 02:04:10.580638');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('89', 'admin.rh', '::1', 't', '2025-09-15 02:04:56.349271');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('90', 'drh.drh', '::1', 't', '2025-09-15 13:34:16.932991');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('91', 'admin.rh', '::1', 't', '2025-09-15 13:35:05.696099');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('92', 'admin.education', '::1', 't', '2025-09-15 13:35:42.701966');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('93', 'admin.rh', '::1', 't', '2025-09-15 13:42:12.873515');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('94', 'admin.education', '::1', 't', '2025-09-15 13:47:16.16098');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('95', 'admin.rh', '::1', 't', '2025-09-15 13:51:57.28141');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('96', 'drh.drh', '::1', 't', '2025-09-15 15:29:30.997293');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('97', 'admin.education', '::1', 't', '2025-09-15 15:55:57.257796');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('98', 'drh.drh', '::1', 't', '2025-09-22 15:52:36.504123');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('99', 'admin.rh', '::1', 't', '2025-09-22 15:53:20.659703');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('100', 'admin.education', '::1', 't', '2025-09-22 15:53:41.426346');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('101', 'admin.education', '::1', 't', '2025-09-22 22:26:54.012485');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('102', 'drh.drh', '::1', 't', '2025-09-22 23:02:59.485671');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('103', 'admin.rh', '::1', 't', '2025-09-22 23:27:47.459726');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('104', 'drh.education', '::1', 't', '2025-09-23 01:14:47.94239');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('105', 'admin.education', '::1', 'f', '2025-09-23 01:26:39.937738');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('106', 'admin.education', '::1', 't', '2025-09-23 01:26:50.95579');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('107', 'sea.morel', '::1', 't', '2025-09-23 02:11:42.272421');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('108', 'sea.morel', '::1', 't', '2025-09-23 02:12:56.953939');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('109', 'sea.morel', '::1', 't', '2025-09-23 02:20:30.957951');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('110', 'sea.morel', '::1', 't', '2025-09-23 02:21:07.710594');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('111', 'sea.morel', '::1', 't', '2025-09-23 02:25:22.390976');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('112', 'sea.morel', '::1', 't', '2025-09-23 02:31:23.0276');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('113', 'sea.morel', '::1', 't', '2025-09-23 02:31:33.441511');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('114', 'drh.education', '::1', 't', '2025-09-23 02:31:57.109729');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('115', 'drh.drh', '::1', 't', '2025-09-23 02:39:17.896262');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('116', 'admin.rh', '::1', 't', '2025-09-23 02:41:40.588113');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('117', 'admin.rh', '::1', 't', '2025-09-23 02:42:42.621338');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('118', 'admin.rh', '::1', 't', '2025-09-23 02:43:59.573365');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('119', 'admin.rh', '::1', 't', '2025-09-23 02:45:03.993404');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('120', 'admin.rh', '::1', 't', '2025-09-23 02:48:08.694899');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('121', 'admin.rh', '::1', 't', '2025-09-23 02:48:44.527214');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('122', 'admin.rh', '::1', 't', '2025-09-23 02:49:48.780776');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('123', 'admin.rh', '::1', 't', '2025-09-23 02:50:44.942753');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('124', 'admin.rh', '::1', 't', '2025-09-23 02:51:39.551579');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('125', 'admin.rh', '::1', 't', '2025-09-23 02:56:23.89141');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('126', 'admin.rh', '::1', 't', '2025-09-23 02:59:27.236696');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('127', 'admin.rh', '::1', 't', '2025-09-23 03:00:38.274765');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('128', 'admin.rh', '::1', 't', '2025-09-23 03:01:50.750235');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('129', 'admin.rh', '::1', 't', '2025-09-23 03:09:57.217913');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('130', 'sea.morel', '::1', 't', '2025-09-23 03:20:11.274884');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('131', 'sea.morel', '::1', 't', '2025-09-23 03:20:41.355085');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('132', 'sea.morel', '::1', 't', '2025-09-23 03:21:29.507221');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('133', 'sea.morel', '::1', 't', '2025-09-23 03:25:19.244578');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('134', 'sea.morel', '::1', 't', '2025-09-23 03:28:23.962993');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('135', 'sea.morel', '::1', 't', '2025-09-23 03:35:39.600091');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('136', 'sea.morel', '::1', 't', '2025-09-23 04:20:12.155883');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('137', 'sea.morel', '::1', 't', '2025-09-23 04:28:01.264045');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('138', 'sea.morel', '::1', 't', '2025-09-23 04:28:31.042631');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('139', 'sea.morel', '::1', 't', '2025-09-23 04:29:03.146826');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('140', 'sea.morel', '::1', 't', '2025-09-23 04:34:52.593323');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('141', 'admin.education', '::1', 'f', '2025-09-23 04:40:29.951736');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('142', 'admin.education', '::1', 't', '2025-09-23 04:40:47.055364');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('143', 'admin.rh', '::1', 't', '2025-09-24 15:10:00.1637');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('144', 'sea.morel', '::1', 't', '2025-09-24 15:36:37.295632');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('145', 'drh.drh', '::1', 't', '2025-09-24 21:34:50.040203');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('146', 'admin.education', '::1', 't', '2025-09-24 21:35:45.374127');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('147', 'admin.rh', '::1', 't', '2025-09-25 00:42:47.873137');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('148', 'admin.education', '::1', 't', '2025-09-25 00:47:13.080173');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('149', 'admin.rh', '::1', 't', '2025-09-25 03:22:37.323538');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('150', 'drh.drh', '::1', 't', '2025-09-25 04:34:08.408766');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('151', 'admin.education', '::1', 't', '2025-09-25 04:50:26.664023');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('152', 'super.admin', '::1', 't', '2025-09-25 18:01:44.522871');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('153', 'admin.rh', '::1', 't', '2025-09-25 22:20:21.016175');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('154', 'super.admin', '::1', 't', '2025-09-25 22:44:08.850638');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('155', 'super.admin', '::1', 'f', '2025-09-26 14:52:58.585564');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('156', 'super.admin', '::1', 't', '2025-09-26 14:53:08.166611');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('157', 'admin.education', '::1', 't', '2025-09-26 14:53:38.493966');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('158', 'super.admin', '::1', 't', '2025-09-29 22:13:29.905264');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('159', 'admin.rh', '::1', 't', '2025-09-29 22:14:13.876378');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('160', 'admin.education', '::1', 't', '2025-09-29 22:14:45.514194');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('161', 'drh.drh', '::1', 't', '2025-09-30 01:21:12.712264');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('162', 'admin.rh', '::1', 't', '2025-09-30 18:31:32.298464');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('163', 'admin.rh', '::1', 't', '2025-09-30 20:17:53.957251');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('164', 'admin.education', '::1', 't', '2025-09-30 22:32:16.341731');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('165', 'super.admin', '::1', 't', '2025-09-30 23:02:42.051026');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('166', 'admin.rh', '::1', 't', '2025-10-01 12:05:47.328538');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('167', 'super.admin', '::1', 't', '2025-10-02 00:03:20.787622');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('168', 'super.admin', '::1', 't', '2025-10-02 00:13:51.900598');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('169', 'admin.education', '::1', 't', '2025-10-02 02:02:00.530611');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('170', 'admin.rh', '::1', 't', '2025-10-02 12:17:20.291228');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('171', 'admin.rh', '::1', 't', '2025-10-02 14:34:33.544031');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('172', 'admin.rh', '::1', 't', '2025-10-02 17:20:04.03893');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('173', 'admin.rh', '::1', 't', '2025-10-02 17:41:42.027997');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('174', 'admin.education', '::1', 't', '2025-10-03 00:28:03.257789');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('175', 'admin.rh', '::1', 't', '2025-10-03 00:28:09.498113');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('176', 'admin.rh', '::1', 't', '2025-10-03 02:54:32.579055');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('177', 'admin.rh', '::1', 't', '2025-10-03 04:45:28.12987');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('178', 'admin.rh', '::1', 't', '2025-10-03 11:14:41.558677');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('179', 'admin.rh', '::1', 'f', '2025-10-04 18:05:46.61973');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('180', 'admin.rh', '::1', 'f', '2025-10-04 18:05:55.793325');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('181', 'drh.drh', '::1', 't', '2025-10-04 18:07:30.195339');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('182', 'drh.drh', '::1', 't', '2025-10-04 18:07:51.754616');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('183', 'admin.rh', '::1', 'f', '2025-10-04 18:09:26.301711');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('184', 'drh.drh', '::1', 't', '2025-10-04 18:14:23.639052');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('185', 'drh.drh', '::1', 't', '2025-10-04 18:14:37.945351');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('186', 'admin.rh', '::1', 'f', '2025-10-04 18:15:55.48107');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('187', 'drh.drh', '::1', 't', '2025-10-04 18:16:16.454669');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('188', 'admin.rh', '::1', 't', '2025-10-04 18:19:10.43711');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('189', 'admin', '::1', 'f', '2025-10-04 19:11:13.716696');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('190', 'admin.education', '::1', 'f', '2025-10-04 19:11:51.549711');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('191', 'test.nomination', '::1', 't', '2025-10-04 19:13:13.472238');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('192', 'test.nomination', '::1', 't', '2025-10-04 19:13:31.692788');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('193', 'admin.rh', '::1', 't', '2025-10-04 19:16:07.410019');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('194', 'test.nomination', '::1', 't', '2025-10-04 19:21:28.810968');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('195', 'admin.rh', '::1', 'f', '2025-10-05 19:59:22.532183');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('196', 'admin.rh', '::1', 't', '2025-10-05 19:59:35.530748');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('197', 'admin.education', '::1', 'f', '2025-10-06 01:51:54.068953');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('198', 'admin.education', '::1', 't', '2025-10-06 01:52:11.972294');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('199', 'jaques.kouadio', '::1', 'f', '2025-10-06 02:11:04.825694');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('200', 'jaques.kouadio', '::1', 't', '2025-10-06 02:11:29.449959');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('201', 'jaques.kouadio', '::1', 't', '2025-10-06 04:23:48.979991');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('202', 'admin.rh', '::1', 't', '2025-10-06 04:45:43.887411');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('203', 'admin.education', '::1', 't', '2025-10-06 04:57:01.744983');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('204', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:41:11.882911');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('205', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:41:20.744108');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('206', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:41:56.95054');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('207', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:45:23.762736');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('208', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:46:34.848463');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('209', 'chef.service.tourisme3', '::1', 't', '2025-10-06 11:49:56.412668');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('210', 'admin.rh', '::1', 'f', '2025-10-06 16:50:37.305533');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('211', 'admin.rh', '::1', 't', '2025-10-06 16:50:50.836456');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('212', 'admin.rh', '::1', 't', '2025-10-06 17:09:49.067927');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('213', 'chef.service.tourisme3', '::1', 't', '2025-10-06 17:12:48.177228');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('214', 'jaques.kouadio', '::1', 't', '2025-10-07 12:30:06.24871');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('215', 'jaques.kouadio', '::1', 't', '2025-10-07 13:26:55.221671');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('216', 'chef.service.tourisme3', '::1', 't', '2025-10-07 13:28:21.56526');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('217', 'chef.service.tourisme3', '::1', 't', '2025-10-07 14:22:29.570469');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('218', 'chef.service.tourisme3', '::1', 't', '2025-10-07 16:29:46.577268');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('219', 'chef.service.tourisme3', '::1', 'f', '2025-10-07 17:08:44.555146');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('220', 'chef.service.tourisme3', '::1', 't', '2025-10-07 17:08:50.702695');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('221', 'admin.rh', '::1', 't', '2025-10-07 17:22:31.126833');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('222', 'admin.rh', '::1', 't', '2025-10-07 17:31:28.213921');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('223', 'admin.rh', '::1', 't', '2025-10-07 21:04:37.419695');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('224', 'admin.rh', '::1', 'f', '2025-10-07 21:21:02.054803');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('225', 'admin.rh', '::1', 'f', '2025-10-07 21:21:12.516818');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('226', 'admin.rh', '::1', 'f', '2025-10-07 21:21:24.377824');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('227', 'admin.rh', '::1', 'f', '2025-10-07 21:21:38.45541');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('228', 'admin.rh', '::1', 'f', '2025-10-07 21:21:53.019959');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('229', 'admin.rh', '::1', 't', '2025-10-07 21:22:10.497226');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('230', 'admin', '::1', 'f', '2025-10-08 11:52:27.425088');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('231', 'admin.rh', '::1', 'f', '2025-10-08 11:53:40.204073');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('232', 'admin.rh', '::1', 'f', '2025-10-08 11:53:50.952644');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('233', 'jaques.kouadio', '::1', 't', '2025-10-08 13:28:44.778645');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('234', 'admin.rh', '::1', 't', '2025-10-08 17:07:15.522287');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('235', 'chef.service.tourisme3', '::1', 't', '2025-10-08 18:50:31.616752');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('236', 'admin.rh', '::1', 't', '2025-10-08 21:03:38.423016');
INSERT INTO public.login_attempts (id, username, ip_address, success, created_at) VALUES ('237', 'admin.rh', '::1', 't', '2025-10-08 21:07:47.723692');



--
-- Data for Name: ministeres; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('2', 'MIN002', 'Ministere de l''Education Nationale et de l''Alphabetisation', 'MENA', 'Ministere charge de l''education et de l''alphabetisation', 'Avenue Franchet d''Esperey, Abidjan', '+225 20 30 40 60', 'contact@education.gouv.ci', NULL, NULL, 't', '2025-09-10 22:31:55.697312', '2025-09-10 22:31:55.697312', NULL, NULL, NULL, NULL);
INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('3', 'MIN003', 'Ministere de la Sante et de l''Hygiene Publique', 'MSHP', 'Ministere charge de la sante publique', 'Boulevard de la Republique, Abidjan', '+225 20 30 40 70', 'contact@sante.gouv.ci', NULL, NULL, 't', '2025-09-10 22:31:55.697312', '2025-09-10 22:31:55.697312', NULL, NULL, NULL, NULL);
INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('4', 'MIN004', 'Ministere de l''Economie et des Finances', 'MEF', 'Ministere charge de l''economie et des finances', 'Avenue du General de Gaulle, Abidjan', '+225 20 30 40 80', 'contact@finances.gouv.ci', NULL, NULL, 't', '2025-09-10 22:31:55.697312', '2025-09-10 22:31:55.697312', NULL, NULL, NULL, NULL);
INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('5', 'MIN005', 'Ministere de l''Interieur et de la Securite', 'MIS', 'Ministere charge de l''interieur et de la securite', 'Avenue de la Paix, Abidjan', '+225 20 30 40 90', 'contact@interieur.gouv.ci', NULL, NULL, 't', '2025-09-10 22:31:55.697312', '2025-09-10 22:31:55.697312', NULL, NULL, NULL, NULL);
INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('8', 'MIN006', 'Ministere du Tourisme 2', 'MT2', 'Ministere du Tourisme 2', 'cocody', NULL, 'sionpredestine10@gmail.com', NULL, NULL, 't', '2025-09-30 01:50:59.348895', '2025-09-30 01:50:59.348895', '10', '20', '52', NULL);
INSERT INTO public.ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at, id_region, id_departement, id_localite, responsable_id) VALUES ('1', 'MIN001', 'MINISTERE DU TOURISME ET DES LOISIRS', 'MT-RESP', 'Ministere mis a jour avec responsable', 'Avenue de la Republique, Abidjan', '+225 20 30 40 50', 'contact@rh.gouv.ci', NULL, NULL, 't', '2025-09-10 22:31:55.697312', '2025-10-08 17:17:06.390896', NULL, NULL, NULL, '3');



--
-- Data for Name: mode_d_entrees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('1', 'Concours', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('2', 'Recrutement direct', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('3', 'Mutation', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('4', 'Detachement', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('5', 'Mise a disposition', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('6', 'Contrat', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('7', 'Stage', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');
INSERT INTO public.mode_d_entrees (id, libele, created_at, updated_at) VALUES ('8', 'Autre', '2025-09-10 22:31:55.670244', '2025-09-10 22:31:55.670244');



--
-- Data for Name: motif_de_departs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('1', 'Retraite', '2025-09-09 11:37:54.151147', '2025-09-09 11:37:54.151147');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('2', 'Demission', '2025-09-09 11:37:54.153168', '2025-09-09 11:37:54.153168');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('3', 'Licenciement', '2025-09-09 11:37:54.153803', '2025-09-09 11:37:54.153803');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('4', 'Fin de contrat', '2025-09-09 11:37:54.154406', '2025-09-09 11:37:54.154406');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('5', 'Mutation', '2025-09-09 11:37:54.155019', '2025-09-09 11:37:54.155019');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('6', 'Deces', '2025-09-09 11:37:54.155601', '2025-09-09 11:37:54.155601');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('7', 'Invalidite', '2025-09-09 11:37:54.156175', '2025-09-09 11:37:54.156175');
INSERT INTO public.motif_de_departs (id, libele, created_at, updated_at) VALUES ('15', 'Autre', '2025-09-10 22:31:55.594193', '2025-09-10 22:31:55.594193');



--
-- Data for Name: nationalites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('1', 'Ivoirienne', '2025-09-09 11:37:54.082099', '2025-09-09 11:37:54.082099');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('2', 'Francaise', '2025-09-09 11:37:54.085033', '2025-09-09 11:37:54.085033');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('3', 'Burkinabe', '2025-09-09 11:37:54.086389', '2025-09-09 11:37:54.086389');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('4', 'Malienne', '2025-09-09 11:37:54.087483', '2025-09-09 11:37:54.087483');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('5', 'Guineenne', '2025-09-09 11:37:54.088373', '2025-09-09 11:37:54.088373');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('6', 'Liberienne', '2025-09-09 11:37:54.089241', '2025-09-09 11:37:54.089241');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('7', 'Ghaneenne', '2025-09-09 11:37:54.090293', '2025-09-09 11:37:54.090293');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('8', 'Nigerienne', '2025-09-09 11:37:54.091093', '2025-09-09 11:37:54.091093');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('9', 'Senegalaise', '2025-09-09 11:37:54.091791', '2025-09-09 11:37:54.091791');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('10', 'Autre', '2025-09-09 11:37:54.092435', '2025-09-09 11:37:54.092435');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('13', 'Maliienne', '2025-09-10 22:31:55.512185', '2025-09-10 22:31:55.512185');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('14', 'Burkina Faso', '2025-09-10 22:31:55.512185', '2025-09-10 22:31:55.512185');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('18', 'Nigeriane', '2025-09-10 22:31:55.512185', '2025-09-10 22:31:55.512185');
INSERT INTO public.nationalites (id, libele, created_at, updated_at) VALUES ('20', 'Sierra Leonaise', '2025-09-10 22:31:55.512185', '2025-09-10 22:31:55.512185');



--
-- Data for Name: nature_actes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('1', 'Arrete', '2025-09-09 11:37:54.278539', '2025-09-09 11:37:54.278539');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('2', 'Decret', '2025-09-09 11:37:54.282225', '2025-09-09 11:37:54.282225');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('3', 'Loi', '2025-09-09 11:37:54.283379', '2025-09-09 11:37:54.283379');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('4', 'Circulaire', '2025-09-09 11:37:54.284539', '2025-09-09 11:37:54.284539');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('5', 'Note de service', '2025-09-09 11:37:54.285632', '2025-09-09 11:37:54.285632');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('6', 'Decision', '2025-09-09 11:37:54.286797', '2025-09-09 11:37:54.286797');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('7', 'Resolution', '2025-09-09 11:37:54.287756', '2025-09-09 11:37:54.287756');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('8', 'Recrutement', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('9', 'Promotion', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('10', 'Mutation', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('11', 'Sanction', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('12', 'Formation', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('13', 'Evaluation', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('14', 'Retraite', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('15', 'Depart', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');
INSERT INTO public.nature_actes (id, libele, created_at, updated_at) VALUES ('16', 'Autre', '2025-09-10 22:31:55.661342', '2025-09-10 22:31:55.661342');



--
-- Data for Name: nature_d_accidents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('1', 'Accident de travail', '2025-09-09 11:37:54.239544', '2025-09-09 11:37:54.239544');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('2', 'Accident de trajet', '2025-09-09 11:37:54.243126', '2025-09-09 11:37:54.243126');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('3', 'Accident de service', '2025-09-09 11:37:54.244592', '2025-09-09 11:37:54.244592');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('4', 'Maladie professionnelle', '2025-09-09 11:37:54.246054', '2025-09-09 11:37:54.246054');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('5', 'Accident domestique', '2025-09-09 11:37:54.247178', '2025-09-09 11:37:54.247178');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('6', 'Accident de circulation', '2025-09-09 11:37:54.248079', '2025-09-09 11:37:54.248079');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('10', 'Accident de la route', '2025-09-10 22:31:55.647023', '2025-09-10 22:31:55.647023');
INSERT INTO public.nature_d_accidents (id, libele, created_at, updated_at) VALUES ('12', 'Autre', '2025-09-10 22:31:55.647023', '2025-09-10 22:31:55.647023');



--
-- Data for Name: niveau_informatiques; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('1', 'Debutant', '2025-09-09 11:37:54.334279', '2025-09-09 11:37:54.334279');
INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('2', 'Intermediaire', '2025-09-09 11:37:54.337269', '2025-09-09 11:37:54.337269');
INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('3', 'Avance', '2025-09-09 11:37:54.338248', '2025-09-09 11:37:54.338248');
INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('4', 'Expert', '2025-09-09 11:37:54.339423', '2025-09-09 11:37:54.339423');
INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('5', 'Specialiste', '2025-09-09 11:37:54.340711', '2025-09-09 11:37:54.340711');
INSERT INTO public.niveau_informatiques (id, libele, created_at, updated_at) VALUES ('10', 'Autre', '2025-09-10 22:31:55.689229', '2025-09-10 22:31:55.689229');



--
-- Data for Name: niveau_langues; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('1', 'Debutant', '2025-09-09 11:37:54.1444', '2025-09-09 11:37:54.1444');
INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('2', 'Intermediaire', '2025-09-09 11:37:54.148149', '2025-09-09 11:37:54.148149');
INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('3', 'Avance', '2025-09-09 11:37:54.148821', '2025-09-09 11:37:54.148821');
INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('4', 'Courant', '2025-09-09 11:37:54.149423', '2025-09-09 11:37:54.149423');
INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('5', 'Bilingue', '2025-09-09 11:37:54.150017', '2025-09-09 11:37:54.150017');
INSERT INTO public.niveau_langues (id, libele, created_at, updated_at) VALUES ('6', 'Natif', '2025-09-09 11:37:54.150584', '2025-09-09 11:37:54.150584');



--
-- Data for Name: nominations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('5', '85', 'ARRETER', 'GGHJYV', '2025-09-30', '2025-10-05 22:18:50.287814', '2025-10-05 22:18:50.287814', 'fonction', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('7', '85', 'ARRETER', 'GGHJYVFG', '2025-10-02', '2025-10-05 23:11:27.500095', '2025-10-05 23:11:27.500095', 'emploi', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('8', '85', 'ARRETER', 'GGHJYVFGSD', '2025-10-05', '2025-10-06 00:51:40.096709', '2025-10-06 00:51:40.096709', 'fonction', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('9', '118', 'ARRETER', '1455211D', '2025-10-08', '2025-10-06 05:43:28.173726', '2025-10-06 05:43:28.173726', 'fonction', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('12', '128', 'Nomination', 'NOM-001', '2025-10-06', '2025-10-06 06:00:25.076153', '2025-10-06 06:00:25.076153', 'fonction', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('13', '135', 'ARRETE', 'DRH1759761980206', '2025-10-06', '2025-10-06 16:46:20.206832', '2025-10-06 16:46:20.206832', 'fonction', 'active');
INSERT INTO public.nominations (id, id_agent, nature, numero, date_signature, created_at, updated_at, type_nomination, statut) VALUES ('14', '59', 'ARRETE', 'GGHJYVFGSDg', '2025-10-07', '2025-10-08 19:08:46.639118', '2025-10-08 19:08:46.639118', 'fonction', 'active');



--
-- Data for Name: notifications_demandes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('450', '74', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 21:20:58.702918', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('451', '74', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 21:20:58.702918', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('452', '74', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.729127', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('453', '74', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.731899', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('454', '74', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.733978', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('455', '74', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.735799', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('456', '74', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.73743', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('457', '74', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.738636', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('458', '74', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.739769', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('459', '74', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.741178', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('460', '74', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.745008', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('461', '74', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.746743', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('462', '74', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.748286', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('463', '74', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.749798', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('464', '74', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.751329', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('466', '74', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.75402', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('432', '68', '59', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une demande de absence necessite votre validation au niveau DRH.', 'f', '2025-10-08 16:16:09.182095', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('433', '68', '45', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une demande de absence necessite votre validation au niveau DRH.', 'f', '2025-10-08 16:16:09.185606', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('434', '68', '4', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une demande de absence necessite votre validation au niveau DRH.', 'f', '2025-10-08 16:16:09.187765', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('467', '74', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.755301', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('468', '74', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue', 'f', '2025-10-08 21:20:58.756581', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('526', '78', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 23:51:04.486569', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('435', '68', '118', 'demande_approuvee', 'Demande approuvee', 'Votre demande de absence a ete approuvee par votre chef de service.', 't', '2025-10-08 16:16:09.196284', '2025-10-08 20:38:03.257202');
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('488', '76', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 23:20:42.322004', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('442', '69', '118', 'demande_approuvee', 'Attestation de presence validee par le DRH', 'Votre demande d''attestation de presence a ete validee par le DRH. Votre document d''attestation de presence a ete genere automatiquement et est maintenant disponible dans votre espace.', 't', '2025-10-08 16:23:28.74509', '2025-10-08 20:38:09.096314');
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('444', '72', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 21:17:58.643695', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('445', '72', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 21:17:58.643695', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('438', '68', '118', 'demande_approuvee', 'Demande finalisee - Document d''autorisation recu', 'Votre demande d''absence a ete finalisee et votre document d''autorisation a ete transmis par votre chef de service. Vous pouvez maintenant le consulter et le telecharger.', 't', '2025-10-08 16:21:17.695211', '2025-10-08 21:20:29.663843');
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('489', '76', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 23:20:42.322004', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('490', '76', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.339361', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('491', '76', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.341401', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('492', '76', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.343403', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('493', '76', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.345538', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('494', '76', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.347806', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('495', '76', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.349361', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('496', '76', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.351336', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('497', '76', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.353098', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('498', '76', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.354792', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('499', '76', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.356192', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('500', '76', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.357957', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('501', '76', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.359493', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('502', '76', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.361078', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('503', '76', '118', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.362669', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('504', '76', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.364905', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('505', '76', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.36737', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('506', '76', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:20:42.369045', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('527', '78', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 23:51:04.486569', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('528', '78', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.54992', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('529', '78', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.551425', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('530', '78', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.552674', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('469', '75', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 23:19:52.472718', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('470', '75', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 23:19:52.472718', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('471', '75', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.55789', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('472', '75', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.561114', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('473', '75', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.5645', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('474', '75', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.566604', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('475', '75', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.568275', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('476', '75', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.569687', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('477', '75', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.57127', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('478', '75', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.572864', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('479', '75', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.574459', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('480', '75', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.576011', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('481', '75', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.577958', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('482', '75', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.579713', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('483', '75', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.581729', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('485', '75', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.584161', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('486', '75', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.585681', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('487', '75', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:19:52.587034', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('507', '77', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 23:34:16.159509', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('508', '77', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 23:34:16.159509', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('509', '77', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.228831', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('510', '77', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.230555', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('429', '68', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "absence" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 16:13:59.21056', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('430', '68', '118', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "absence" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 16:13:59.21056', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('436', '68', '128', 'demande_approuvee', 'Demande validee par le DRH', 'La demande de absence a ete validee par le DRH et necessite votre action.', 'f', '2025-10-08 16:17:41.956485', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('511', '77', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.23237', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('439', '69', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "attestation_presence" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 16:23:01.702407', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('440', '69', '118', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "attestation_presence" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 16:23:01.702407', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('447', '73', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 21:19:07.259423', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('448', '73', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 21:19:07.259423', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('437', '68', '118', 'demande_approuvee', 'Demande approuvee', 'Votre demande de absence a ete approuvee par votre DRH.', 't', '2025-10-08 16:17:42.007895', '2025-10-08 21:20:40.158277');
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('512', '77', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.23399', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('513', '77', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.235759', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('514', '77', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.237462', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('515', '77', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.238983', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('516', '77', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.24092', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('517', '77', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.242467', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('518', '77', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.243641', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('519', '77', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.244885', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('520', '77', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.246069', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('521', '77', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.247211', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('522', '77', '118', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.248336', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('523', '77', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.249447', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('524', '77', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.250568', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('525', '77', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-09', 'f', '2025-10-08 23:34:16.251571', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('531', '78', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.554121', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('532', '78', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.555657', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('533', '78', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.556619', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('534', '78', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.557544', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('535', '78', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.558603', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('536', '78', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.56114', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('537', '78', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.563909', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('538', '78', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.565369', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('539', '78', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.566446', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('540', '78', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.567391', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('541', '78', '118', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.568348', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('542', '78', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.569401', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('543', '78', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.570353', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('544', '78', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-15', 'f', '2025-10-08 23:51:04.571674', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('545', '79', '128', 'nouvelle_demande', 'Nouvelle demande a valider', 'Une nouvelle demande de type "note_service" a ete soumise par un agent et necessite votre validation.', 'f', '2025-10-08 23:58:54.864899', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('546', '79', '59', 'nouvelle_demande', 'Demande soumise avec succes', 'Votre demande de type "note_service" a ete soumise et est en cours de traitement.', 'f', '2025-10-08 23:58:54.864899', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('547', '79', '53', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.914813', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('548', '79', '52', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.916255', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('549', '79', '3', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.917542', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('550', '79', '4', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.919472', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('551', '79', '45', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.92111', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('552', '79', '54', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.922176', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('553', '79', '57', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.925316', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('554', '79', '56', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.92688', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('555', '79', '60', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.92808', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('556', '79', '70', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.929198', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('557', '79', '58', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.930391', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('558', '79', '128', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.931602', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('559', '79', '85', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.93278', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('561', '79', '61', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.935108', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('562', '79', '135', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.935981', NULL);
INSERT INTO public.notifications_demandes (id, id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation, date_lecture) VALUES ('563', '79', '59', 'demande_approuvee', 'Note de Service', 'Nouvelle note de service recue pour l''evenement du 2025-10-21', 'f', '2025-10-08 23:58:54.937164', NULL);



--
-- Data for Name: pathologies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('1', 'Maladie cardiovasculaire', '2025-09-09 11:37:54.312471', '2025-09-09 11:37:54.312471');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('2', 'Maladie respiratoire', '2025-09-09 11:37:54.315882', '2025-09-09 11:37:54.315882');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('3', 'Maladie digestive', '2025-09-09 11:37:54.317076', '2025-09-09 11:37:54.317076');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('4', 'Maladie neurologique', '2025-09-09 11:37:54.318385', '2025-09-09 11:37:54.318385');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('5', 'Maladie endocrinienne', '2025-09-09 11:37:54.319605', '2025-09-09 11:37:54.319605');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('6', 'Maladie rhumatologique', '2025-09-09 11:37:54.320881', '2025-09-09 11:37:54.320881');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('7', 'Maladie dermatologique', '2025-09-09 11:37:54.322129', '2025-09-09 11:37:54.322129');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('8', 'Maladie psychiatrique', '2025-09-09 11:37:54.323271', '2025-09-09 11:37:54.323271');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('9', 'Hypertension', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('10', 'Diabete', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('11', 'Asthme', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('12', 'Maladie cardiaque', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('13', 'Maladie renale', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('14', 'Maladie hepatique', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('15', 'Cancer', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('16', 'VIH/SIDA', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('17', 'Tuberculose', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('18', 'Autre', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');
INSERT INTO public.pathologies (id, libele, created_at, updated_at) VALUES ('19', 'Aucune', '2025-09-10 22:31:55.679777', '2025-09-10 22:31:55.679777');



--
-- Data for Name: pays; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('1', 'Cote d''Ivoire', '2025-09-09 11:37:54.363288', '2025-09-09 11:37:54.363288', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('2', 'France', '2025-09-09 11:37:54.366785', '2025-09-09 11:37:54.366785', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('4', 'Mali', '2025-09-09 11:37:54.369107', '2025-09-09 11:37:54.369107', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('5', 'Guinee', '2025-09-09 11:37:54.370341', '2025-09-09 11:37:54.370341', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('6', 'Liberia', '2025-09-09 11:37:54.371612', '2025-09-09 11:37:54.371612', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('7', 'Ghana', '2025-09-09 11:37:54.372665', '2025-09-09 11:37:54.372665', NULL);
-- DOUBLON SUPPRIMÉ: INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('8', 'Nigeria', '2025-09-09 11:37:54.373857', '2025-09-09 11:37:54.373857', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('9', 'Senegal', '2025-09-09 11:37:54.375057', '2025-09-09 11:37:54.375057', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('10', 'Etats-Unis', '2025-09-09 11:37:54.376316', '2025-09-09 11:37:54.376316', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('20', 'Sierra Leone', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('21', 'Maroc', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('22', 'Tunisie', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('23', 'Algerie', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('24', 'Cameroun', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('25', 'Gabon', '2025-09-10 22:31:55.527232', '2025-09-10 22:31:55.527232', NULL);
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('26', 'Autre', '2025-09-10 22:31:55.527232', '2025-09-30 11:08:53.214303', '10');
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('3', 'Burkina Faso', '2025-09-09 11:37:54.367926', '2025-09-30 11:08:53.214303', '14');
INSERT INTO public.pays (id, libele, created_at, updated_at, id_nationalite) VALUES ('18', 'Nigeria', '2025-09-10 22:31:55.527232', '2025-09-30 13:22:53.343666', NULL);



--
-- Data for Name: permissions_entites; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: permissions_entites_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('1', 'En poste', '2025-09-09 11:37:54.302143', '2025-09-09 11:37:54.302143');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('2', 'En conge', '2025-09-09 11:37:54.305086', '2025-09-09 11:37:54.305086');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('3', 'En formation', '2025-09-09 11:37:54.306051', '2025-09-09 11:37:54.306051');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('4', 'En mission', '2025-09-09 11:37:54.30722', '2025-09-09 11:37:54.30722');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('5', 'En disponibilite', '2025-09-09 11:37:54.308514', '2025-09-09 11:37:54.308514');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('6', 'En detachement', '2025-09-09 11:37:54.30977', '2025-09-09 11:37:54.30977');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('7', 'En mise a disposition', '2025-09-09 11:37:54.311151', '2025-09-09 11:37:54.311151');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('8', 'En activite', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('14', 'En retraite', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('15', 'Demissionnaire', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('16', 'Licencie', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('17', 'Decede', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');
INSERT INTO public.positions (id, libele, created_at, updated_at) VALUES ('18', 'Autre', '2025-09-10 22:31:55.677276', '2025-09-10 22:31:55.677276');



--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('10', 'ABJ', 'District Autonome d''Abidjan', 'Abidjan', 'District Autonome', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('11', 'YAM', 'District Autonome de Yamoussoukro', 'Yamoussoukro', 'District Autonome', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('12', 'BOU', 'Gbeke', 'Bouake', 'Region du Centre', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('13', 'DAL', 'Haut-Sassandra', 'Daloa', 'Region de l''Ouest', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('14', 'KOR', 'Poro', 'Korhogo', 'Region du Nord', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('15', 'MAN', 'Tonkpi', 'Man', 'Region de l''Ouest Montagneux', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('16', 'SAN', 'San-Pedro', 'San-Pedro', 'Region du Sud-Ouest', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');
INSERT INTO public.regions (id, code, libele, chef_lieu, description, is_active, created_at, updated_at) VALUES ('17', 'BON', 'Gontougo', 'Bondoukou', 'Region de l''Est', 't', '2025-09-24 23:56:31.919441', '2025-09-24 23:56:31.919441');



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('1', 'super_admin', 'Super administrateur avec acces complet a tous les ministeres', '{"all": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('3', 'agent', 'Agent avec acces limite a ses propres donnees', '{"profile": true, "documents": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('4', 'admin_entite', 'Administrateur d''entite avec acces a son entite', '{"entite": true, "agents_entite": true, "reports_entite": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('2', 'DRH', 'Directeur des Ressources Humaines', '["read", "write", "delete", "manage_agents", "manage_grades", "manage_services", "manage_fonctions", "view_reports", "manage_organization"]', '2025-09-09 11:37:53.960682', '2025-09-09 18:54:53.68447');
INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('6', 'drh', 'Directeur des ressources humaines avec acces a son ministere et entites', '{"agents": true, "entites": true, "reports": true, "ministere": true}', '2025-09-10 22:31:55.068967', '2025-09-10 22:31:55.068967');
INSERT INTO public.roles (id, nom, description, permissions, created_at, updated_at) VALUES ('9', 'chef_service', 'Chef de Service', '{}', '2025-10-06 05:56:50.86962', '2025-10-06 05:56:50.86962');



--
-- Data for Name: sanctions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('1', 'Avertissement', '2025-09-09 11:37:54.249271', '2025-09-09 11:37:54.249271');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('2', 'Blame', '2025-09-09 11:37:54.252259', '2025-09-09 11:37:54.252259');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('3', 'Exclusion temporaire', '2025-09-09 11:37:54.253426', '2025-09-09 11:37:54.253426');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('4', 'Retrogradation', '2025-09-09 11:37:54.254715', '2025-09-09 11:37:54.254715');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('5', 'Mutation d''office', '2025-09-09 11:37:54.25566', '2025-09-09 11:37:54.25566');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('6', 'Revocation', '2025-09-09 11:37:54.256827', '2025-09-09 11:37:54.256827');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('7', 'Suspension', '2025-09-09 11:37:54.258126', '2025-09-09 11:37:54.258126');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('10', 'Mise a pied', '2025-09-10 22:31:55.652706', '2025-09-10 22:31:55.652706');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('12', 'Licenciement', '2025-09-10 22:31:55.652706', '2025-09-10 22:31:55.652706');
INSERT INTO public.sanctions (id, libele, created_at, updated_at) VALUES ('13', 'Autre', '2025-09-10 22:31:55.652706', '2025-09-10 22:31:55.652706');



--
-- Data for Name: seminaire_formation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.seminaire_formation (id, theme_seminaire, date_debut, date_fin, lieu, created_at, updated_at, id_entite, type_organisme) VALUES ('9', 'Gestion de la Qualite dans le Tourisme', '2025-10-02', '2025-10-04', 'Salle de conference Cocody Faya', '2025-10-03 04:53:21.468123', '2025-10-03 04:53:21.468123', '1', 'ministere');
INSERT INTO public.seminaire_formation (id, theme_seminaire, date_debut, date_fin, lieu, created_at, updated_at, id_entite, type_organisme) VALUES ('10', 'Formation informatique', '2025-10-04', '2025-10-06', 'Foyer des jeunes Angre', '2025-10-03 05:21:08.302917', '2025-10-03 05:21:08.302917', '2', 'ministere');
INSERT INTO public.seminaire_formation (id, theme_seminaire, date_debut, date_fin, lieu, created_at, updated_at, id_entite, type_organisme) VALUES ('11', 'Maitriser l''Outil Informatique', '2025-10-02', '2025-10-11', 'Salle de conference Angre Chateau', '2025-10-03 16:51:58.100311', '2025-10-03 16:51:58.100311', '1', 'ministere');



--
-- Data for Name: seminaire_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('2', '9', '85', 'present', NULL, '2025-10-03 05:19:39.58522', '2025-10-03 05:19:39.58522');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('3', '9', '56', 'inscrit', NULL, '2025-10-03 05:19:48.270798', '2025-10-03 05:19:48.270798');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('4', '10', '73', 'present', NULL, '2025-10-03 05:21:50.072358', '2025-10-03 05:21:50.072358');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('5', '9', '54', 'inscrit', NULL, '2025-10-03 10:31:27.059408', '2025-10-03 10:31:27.059408');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('6', '11', '54', 'inscrit', NULL, '2025-10-03 16:52:17.515793', '2025-10-03 16:52:17.515793');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('7', '11', '85', 'inscrit', NULL, '2025-10-03 16:52:35.874211', '2025-10-03 16:52:35.874211');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('8', '11', '56', 'inscrit', NULL, '2025-10-03 16:52:40.597449', '2025-10-03 16:52:40.597449');
INSERT INTO public.seminaire_participants (id, id_seminaire, id_agent, statut_participation, notes, created_at, updated_at) VALUES ('9', '11', '3', 'present', NULL, '2025-10-03 16:52:51.429558', '2025-10-03 16:52:56.262062');



--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.services (id, id_ministere, libelle, created_at, updated_at, responsable_id, description) VALUES ('5', '2', 'Service Informatique', '2025-09-25 05:02:38.120665', '2025-09-25 05:02:38.120665', '55', 'Service Informatique du ministere de l''education national');
INSERT INTO public.services (id, id_ministere, libelle, created_at, updated_at, responsable_id, description) VALUES ('6', '1', 'DIRECTION DES RESSOURCES HUMAIMES', '2025-09-25 05:04:02.350858', '2025-10-08 15:21:52.657388', '128', 'Service Comptabilite du ministee du tourisme');



--
-- Data for Name: services_entites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.services_entites (id, id_entite, libelle, description, code, responsable_id, is_active, created_at, updated_at) VALUES ('4', '1', 'service 4', 'service test', 'SERVICE4', '45', 't', '2025-09-14 19:51:19.243283', '2025-09-14 19:51:19.243283');



--
-- Data for Name: services_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sessions (id, id_utilisateur, token, expires_at, created_at) VALUES ('196', '3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJhZG1pbi5yaCIsInJvbGUiOiJEUkgiLCJwZXJtaXNzaW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiLCJtYW5hZ2VfYWdlbnRzIiwibWFuYWdlX2dyYWRlcyIsIm1hbmFnZV9zZXJ2aWNlcyIsIm1hbmFnZV9mb25jdGlvbnMiLCJ2aWV3X3JlcG9ydHMiLCJtYW5hZ2Vfb3JnYW5pemF0aW9uIl0sImlhdCI6MTc1OTg2NDkzMCwiZXhwIjoxNzU5OTUxMzMwfQ.6LI2x3LT8d158CeUoQAXQxb8Ejrrd84Jy1RPtL-kLkE', '2025-10-08 21:22:10.527', '2025-10-07 21:22:10.528198');
INSERT INTO public.sessions (id, id_utilisateur, token, expires_at, created_at) VALUES ('197', '83', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODMsInVzZXJuYW1lIjoiamFxdWVzLmtvdWFkaW8iLCJyb2xlIjoiYWdlbnQiLCJwZXJtaXNzaW9ucyI6eyJwcm9maWxlIjp0cnVlLCJkb2N1bWVudHMiOnRydWV9LCJpYXQiOjE3NTk5MjI5MjQsImV4cCI6MTc2MDAwOTMyNH0.7oo6KGGnFze_4gZtlRPu8-iembVF7Be8CBBwVJZh4xo', '2025-10-09 13:28:44.8', '2025-10-08 13:28:44.803688');
INSERT INTO public.sessions (id, id_utilisateur, token, expires_at, created_at) VALUES ('199', '87', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODcsInVzZXJuYW1lIjoiY2hlZi5zZXJ2aWNlLnRvdXJpc21lMyIsInJvbGUiOiJjaGVmX3NlcnZpY2UiLCJwZXJtaXNzaW9ucyI6e30sImlhdCI6MTc1OTk0MjIzMiwiZXhwIjoxNzYwMDI4NjMyfQ.XJlfOzH5bCbuZQ1s_xYNlcQdAIfcoVVXudAXNBg70JA', '2025-10-09 18:50:32.226', '2025-10-08 18:50:32.227426');
INSERT INTO public.sessions (id, id_utilisateur, token, expires_at, created_at) VALUES ('201', '3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJhZG1pbi5yaCIsInJvbGUiOiJEUkgiLCJwZXJtaXNzaW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiLCJtYW5hZ2VfYWdlbnRzIiwibWFuYWdlX2dyYWRlcyIsIm1hbmFnZV9zZXJ2aWNlcyIsIm1hbmFnZV9mb25jdGlvbnMiLCJ2aWV3X3JlcG9ydHMiLCJtYW5hZ2Vfb3JnYW5pemF0aW9uIl0sImlhdCI6MTc1OTk1MDQ2NywiZXhwIjoxNzYwMDM2ODY3fQ.Nr3jXgzihgUcotcxqsERCY6HZFsMZr-nSuLwYohXbwc', '2025-10-09 21:07:47.736', '2025-10-08 21:07:47.73724');



--
-- Data for Name: sindicats; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('1', 'Syndicat General des Fonctionnaires', '2025-09-09 11:37:54.259386', '2025-09-09 11:37:54.259386');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('2', 'Federation des Syndicats de l''Education', '2025-09-09 11:37:54.262623', '2025-09-09 11:37:54.262623');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('3', 'Syndicat National des Enseignants', '2025-09-09 11:37:54.263714', '2025-09-09 11:37:54.263714');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('4', 'Confederation Generale du Travail', '2025-09-09 11:37:54.264618', '2025-09-09 11:37:54.264618');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('5', 'Confederation Francaise Democratique du Travail', '2025-09-09 11:37:54.265834', '2025-09-09 11:37:54.265834');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('6', 'Force Ouvriere', '2025-09-09 11:37:54.267068', '2025-09-09 11:37:54.267068');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('7', 'Confederation Generale des Cadres', '2025-09-09 11:37:54.268248', '2025-09-09 11:37:54.268248');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('8', 'SYNACAS-CI', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('9', 'DIGNITE', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('10', 'FESACI', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('11', 'CGTCI', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('12', 'UGTCI', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('13', 'Autre', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');
INSERT INTO public.sindicats (id, libele, created_at, updated_at) VALUES ('14', 'Aucun', '2025-09-10 22:31:55.65589', '2025-09-10 22:31:55.65589');



--
-- Data for Name: situation_matrimonials; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('1', 'Celibataire', '2025-09-09 11:37:54.093086', '2025-09-09 11:37:54.093086');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('2', 'Marie(e)', '2025-09-09 11:37:54.097077', '2025-09-09 11:37:54.097077');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('3', 'Divorce(e)', '2025-09-09 11:37:54.098199', '2025-09-09 11:37:54.098199');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('4', 'Veuf/Veuve', '2025-09-09 11:37:54.099087', '2025-09-09 11:37:54.099087');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('5', 'Separe(e)', '2025-09-09 11:37:54.099907', '2025-09-09 11:37:54.099907');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('10', 'Concubinage', '2025-09-10 22:31:55.522177', '2025-09-10 22:31:55.522177');
INSERT INTO public.situation_matrimonials (id, libele, created_at, updated_at) VALUES ('11', 'Union libre', '2025-09-10 22:31:55.522177', '2025-09-10 22:31:55.522177');



--
-- Data for Name: specialites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('1', 'Informatique', '2025-09-09 11:37:54.13033', '2025-09-09 11:37:54.13033');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('2', 'Administration', '2025-09-09 11:37:54.132605', '2025-09-09 11:37:54.132605');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('3', 'Finance', '2025-09-09 11:37:54.133229', '2025-09-09 11:37:54.133229');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('4', 'Ressources Humaines', '2025-09-09 11:37:54.133898', '2025-09-09 11:37:54.133898');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('5', 'Communication', '2025-09-09 11:37:54.134451', '2025-09-09 11:37:54.134451');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('6', 'Juridique', '2025-09-09 11:37:54.13507', '2025-09-09 11:37:54.13507');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('7', 'Technique', '2025-09-09 11:37:54.135623', '2025-09-09 11:37:54.135623');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('8', 'Scientifique', '2025-09-09 11:37:54.136186', '2025-09-09 11:37:54.136186');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('11', 'Comptabilite', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('14', 'Maintenance', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('15', 'Securite', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('16', 'Transport', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('18', 'Formation', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('20', 'Medical', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('22', 'Commercial', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('23', 'Marketing', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');
INSERT INTO public.specialites (id, libele, created_at, updated_at) VALUES ('24', 'Autre', '2025-09-10 22:31:55.567772', '2025-09-10 22:31:55.567772');



--
-- Data for Name: stage; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: tiers_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: type_d_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('1', 'Fonctionnaire', 'f', '1', '2025-09-09 11:37:54.100689', '2025-09-09 11:37:54.100689');
INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('3', 'Stagiaire', 'f', '2000', '2025-09-09 11:37:54.104129', '2025-09-09 11:37:54.104129');
INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('10', 'Prestataire', 'f', '1', '2025-09-10 22:31:55.636049', '2025-09-10 22:31:55.636049');
INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('11', 'Autre', 'f', '1', '2025-09-10 22:31:55.636049', '2025-09-10 22:31:55.636049');
INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('2', 'Contractuel', 'f', '9100000', '2025-09-09 11:37:54.103481', '2025-09-30 20:19:02.244953');
INSERT INTO public.type_d_agents (id, libele, automatique, numero_initial, created_at, updated_at) VALUES ('12', 'Fonctionnaire Stagiaire', 't', '10', '2025-09-30 20:16:45.396539', '2025-09-30 20:23:56.144515');



--
-- Data for Name: type_de_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('1', 'Conge annuel', '2025-09-09 11:37:54.156771', '2025-09-09 11:37:54.156771');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('2', 'Conge de maladie', '2025-09-09 11:37:54.158849', '2025-09-09 11:37:54.158849');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('3', 'Conge de maternite', '2025-09-09 11:37:54.159525', '2025-09-09 11:37:54.159525');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('4', 'Conge de paternite', '2025-09-09 11:37:54.1602', '2025-09-09 11:37:54.1602');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('5', 'Conge sans solde', '2025-09-09 11:37:54.161003', '2025-09-09 11:37:54.161003');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('6', 'Conge de formation', '2025-09-09 11:37:54.16213', '2025-09-09 11:37:54.16213');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('7', 'Conge sabbatique', '2025-09-09 11:37:54.163177', '2025-09-09 11:37:54.163177');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('9', 'Conge maladie', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('10', 'Conge maternite', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('11', 'Conge paternite', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('12', 'Conge exceptionnel', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('14', 'Conge formation', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');
INSERT INTO public.type_de_conges (id, libele, created_at, updated_at) VALUES ('16', 'Autre', '2025-09-10 22:31:55.597293', '2025-09-10 22:31:55.597293');



--
-- Data for Name: type_de_couriers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('1', 'Courrier administratif', '2025-09-09 11:37:54.269177', '2025-09-09 11:37:54.269177');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('2', 'Courrier personnel', '2025-09-09 11:37:54.271853', '2025-09-09 11:37:54.271853');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('3', 'Courrier confidentiel', '2025-09-09 11:37:54.273075', '2025-09-09 11:37:54.273075');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('4', 'Courrier urgent', '2025-09-09 11:37:54.274348', '2025-09-09 11:37:54.274348');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('5', 'Courrier recommande', '2025-09-09 11:37:54.275581', '2025-09-09 11:37:54.275581');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('6', 'Courrier electronique', '2025-09-09 11:37:54.276892', '2025-09-09 11:37:54.276892');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('7', 'Lettre', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('8', 'Note de service', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('9', 'Circulaire', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('10', 'Decision', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('11', 'Arrete', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('12', 'Decret', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('13', 'Rapport', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('14', 'Proces-verbal', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');
INSERT INTO public.type_de_couriers (id, libele, created_at, updated_at) VALUES ('15', 'Autre', '2025-09-10 22:31:55.658595', '2025-09-10 22:31:55.658595');



--
-- Data for Name: type_de_destinations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('1', 'Formation', '2025-09-09 11:37:54.228099', '2025-09-09 11:37:54.228099');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('2', 'Mission', '2025-09-09 11:37:54.231549', '2025-09-09 11:37:54.231549');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('3', 'Congres', '2025-09-09 11:37:54.232516', '2025-09-09 11:37:54.232516');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('4', 'Seminaire', '2025-09-09 11:37:54.233641', '2025-09-09 11:37:54.233641');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('5', 'Reunion', '2025-09-09 11:37:54.234744', '2025-09-09 11:37:54.234744');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('6', 'Inspection', '2025-09-09 11:37:54.235997', '2025-09-09 11:37:54.235997');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('7', 'Audit', '2025-09-09 11:37:54.237293', '2025-09-09 11:37:54.237293');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('8', 'Visite de terrain', '2025-09-09 11:37:54.238506', '2025-09-09 11:37:54.238506');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('9', 'Ministere', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('10', 'Direction', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('11', 'Service', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('12', 'Bureau', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('13', 'Institution', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('14', 'Organisme', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('15', 'Entreprise', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('16', 'Particulier', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');
INSERT INTO public.type_de_destinations (id, libele, created_at, updated_at) VALUES ('17', 'Autre', '2025-09-10 22:31:55.644328', '2025-09-10 22:31:55.644328');



--
-- Data for Name: type_de_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: type_de_documents_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: type_de_materiels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('1', 'Ordinateur portable', '2025-09-09 11:37:54.216886', '2025-09-09 11:37:54.216886');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('2', 'Ordinateur de bureau', '2025-09-09 11:37:54.219762', '2025-09-09 11:37:54.219762');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('3', 'Imprimante', '2025-09-09 11:37:54.220964', '2025-09-09 11:37:54.220964');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('4', 'Scanner', '2025-09-09 11:37:54.222147', '2025-09-09 11:37:54.222147');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('5', 'Telephone', '2025-09-09 11:37:54.223356', '2025-09-09 11:37:54.223356');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('6', 'Vehicule de service', '2025-09-09 11:37:54.224553', '2025-09-09 11:37:54.224553');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('7', 'Mobilier de bureau', '2025-09-09 11:37:54.225671', '2025-09-09 11:37:54.225671');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('8', 'Equipement de securite', '2025-09-09 11:37:54.22687', '2025-09-09 11:37:54.22687');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('9', 'Ordinateur', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('12', 'Fax', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('13', 'Photocopieuse', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('15', 'Vehicule', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('16', 'Mobilier', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('17', 'Equipement de Bureau', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('18', 'Equipement Technique', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');
INSERT INTO public.type_de_materiels (id, libele, created_at, updated_at) VALUES ('19', 'Autre', '2025-09-10 22:31:55.640461', '2025-09-10 22:31:55.640461');



--
-- Data for Name: type_de_retraites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('1', 'Retraite normale', '2025-09-09 11:37:54.353327', '2025-09-09 11:37:54.353327');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('2', 'Retraite anticipee', '2025-09-09 11:37:54.356269', '2025-09-09 11:37:54.356269');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('3', 'Retraite pour invalidite', '2025-09-09 11:37:54.357479', '2025-09-09 11:37:54.357479');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('4', 'Retraite pour accident de travail', '2025-09-09 11:37:54.358771', '2025-09-09 11:37:54.358771');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('5', 'Retraite pour maladie professionnelle', '2025-09-09 11:37:54.360092', '2025-09-09 11:37:54.360092');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('6', 'Retraite pour longue maladie', '2025-09-09 11:37:54.362094', '2025-09-09 11:37:54.362094');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('10', 'Retraite pour anciennete', '2025-09-10 22:31:55.694743', '2025-09-10 22:31:55.694743');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('11', 'Retraite speciale', '2025-09-10 22:31:55.694743', '2025-09-10 22:31:55.694743');
INSERT INTO public.type_de_retraites (id, libele, created_at, updated_at) VALUES ('12', 'Autre', '2025-09-10 22:31:55.694743', '2025-09-10 22:31:55.694743');



--
-- Data for Name: type_de_seminaire_de_formation; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: type_de_seminaire_de_formation_institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: type_etablissements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('1', 'Ecole primaire', '2025-09-09 11:37:54.180542', '2025-09-09 11:37:54.180542');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('2', 'College', '2025-09-09 11:37:54.184534', '2025-09-09 11:37:54.184534');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('3', 'Lycee', '2025-09-09 11:37:54.185779', '2025-09-09 11:37:54.185779');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('4', 'Universite', '2025-09-09 11:37:54.187054', '2025-09-09 11:37:54.187054');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('5', 'Institut de formation', '2025-09-09 11:37:54.188308', '2025-09-09 11:37:54.188308');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('6', 'Centre de formation', '2025-09-09 11:37:54.189493', '2025-09-09 11:37:54.189493');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('7', 'Ecole specialisee', '2025-09-09 11:37:54.190743', '2025-09-09 11:37:54.190743');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('8', 'Ministere', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('9', 'Direction', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('10', 'Service', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('11', 'Bureau', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('12', 'Division', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('13', 'Cabinet', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('14', 'Secretariat', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');
INSERT INTO public.type_etablissements (id, libele, created_at, updated_at) VALUES ('15', 'Autre', '2025-09-10 22:31:55.612273', '2025-09-10 22:31:55.612273');



--
-- Data for Name: unite_administratives; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('1', NULL, NULL, 'Direction generale', '2025-09-09 11:37:54.191944', '2025-09-09 11:37:54.191944');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('2', NULL, NULL, 'Direction des ressources humaines', '2025-09-09 11:37:54.198095', '2025-09-09 11:37:54.198095');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('3', NULL, NULL, 'Direction financiere', '2025-09-09 11:37:54.199262', '2025-09-09 11:37:54.199262');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('4', NULL, NULL, 'Direction technique', '2025-09-09 11:37:54.200556', '2025-09-09 11:37:54.200556');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('5', NULL, NULL, 'Direction administrative', '2025-09-09 11:37:54.201742', '2025-09-09 11:37:54.201742');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('6', NULL, NULL, 'Service informatique', '2025-09-09 11:37:54.202961', '2025-09-09 11:37:54.202961');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('7', NULL, NULL, 'Service de maintenance', '2025-09-09 11:37:54.204205', '2025-09-09 11:37:54.204205');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('8', NULL, NULL, 'Service de securite', '2025-09-09 11:37:54.20513', '2025-09-09 11:37:54.20513');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('9', '1', '50', 'Direction Generale', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('10', '2', '30', 'Direction Administrative', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('11', '3', '25', 'Direction Technique', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('12', '4', '20', 'Service RH', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('13', '5', '15', 'Service Comptable', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('14', '6', '10', 'Service Maintenance', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('15', '7', '8', 'Bureau du Directeur', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('16', '8', '5', 'Secretariat', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');
INSERT INTO public.unite_administratives (id, id_fonction, capacite_acceuil, libele, created_at, updated_at) VALUES ('17', '9', '3', 'Accueil', '2025-09-10 22:31:55.619469', '2025-09-10 22:31:55.619469');



--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('10', 'agent.sante1', 'agent.sante1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '65', 't', '2025-09-11 02:51:06.607099', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.323366');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('51', 'drh.db', 'drh.db@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '37', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('52', 'drh.dc', 'drh.dc@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '38', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('53', 'drh.di', 'drh.di@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '39', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('54', 'drh.ds', 'drh.ds@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '40', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('3', 'admin.rh', 'admin.rh@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '2', '59', 't', '2025-10-08 21:07:47.727469', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-08 21:07:47.727469');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('55', 'drh.dcc', 'drh.dcc@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '41', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('5', 'agent.rh2', 'agent.rh2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '3', 't', '2025-09-11 02:51:05.98817', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:05.98817');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('56', 'drh.dpp', 'drh.dpp@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '42', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('8', 'agent.education2', 'agent.education2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '6', 't', '2025-09-11 02:51:06.433792', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:06.433792');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('11', 'agent.sante2', 'agent.sante2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '9', 't', '2025-09-11 02:51:06.791601', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:06.791601');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('14', 'agent.finances2', 'agent.finances2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '12', 't', '2025-09-11 02:51:07.142213', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:07.142213');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('70', 'djelo.kuyo', 'goua@gmail.com', '$2b$10$mzhB1vnZhk3qeBjPaEGTzeMSnN6hcN3Z6yyG9r5S22aOXIfcZUoZm', '3', NULL, 't', NULL, NULL, NULL, '2025-09-25 13:38:07.06971', '2025-09-25 13:54:01.801048');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('17', 'agent.interieur2', 'agent.interieur2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '15', 't', '2025-09-11 02:51:07.719301', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:07.719301');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('12', 'admin.finances', 'admin.finances@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '2', '66', 't', '2025-09-11 02:51:05.228547', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.328335');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('69', 'sea.morel', 'hyhyy@gmail.com', '$2b$10$5SdRJuqFD6xfNjH8RlsD4u9W0OB6Gi5n9fJ.lJb3rKz/igQp6IULy', '3', '58', 't', '2025-09-24 15:36:37.31136', NULL, NULL, '2025-09-23 01:29:05.012624', '2025-09-24 15:36:37.31136');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('13', 'agent.finances1', 'agent.finances1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '67', 't', '2025-09-11 02:51:06.97605', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.339088');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('68', 'kokou.madoudera', 'gnantihourdeeejjosuddde@gmail.com', '$2b$10$Lwq5i35N998fxReDDw9RLO6XBN45DxH1IN41o9tKew29MtpEtrVWq', '3', '57', 't', NULL, NULL, NULL, '2025-09-23 01:07:58.201574', '2025-09-23 01:07:58.201574');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('15', 'admin.interieur', 'admin.interieur@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '2', '68', 't', '2025-09-11 02:51:05.508195', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.343966');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('45', 'drh.dep', 'drh.dep@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '31', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('46', 'drh.des', 'drh.des@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '32', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('47', 'drh.dalf', 'drh.dalf@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '33', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('48', 'drh.dsp', 'drh.dsp@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '34', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('49', 'drh.dh', 'drh.dh@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '35', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('50', 'drh.dp', 'drh.dp@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '4', '36', 't', NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('63', 'ange.kouassi', 'gnantihourejosudde@gmail.com', '$2b$10$HJ3Tqj.JijmXwK69CV6k2uCevky5dBCtAdIGzD6H7bbAWpMdak2w.', '3', '52', 't', NULL, NULL, NULL, '2025-09-23 00:23:09.174695', '2025-09-23 00:23:09.174695');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('1', 'admin', 'admin@rh-system.com', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '1', '60', 't', '2025-09-11 02:51:04.108704', NULL, NULL, '2025-09-09 11:37:54.820088', '2025-09-25 02:42:00.227266');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('4', 'agent.rh1', 'agent.rh1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '61', 't', '2025-09-11 02:51:05.743451', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.286343');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('64', 'koffi.jeane', 'gnantihourejjosudde@gmail.com', '$2b$10$aQBGXiTl26gSPi9QCz2dSeoL3ANk7I37d3WwLDQktwBbS.aSgExDa', '3', '53', 't', NULL, NULL, NULL, '2025-09-23 00:31:38.644485', '2025-09-23 00:31:38.644485');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('65', 'hourejosue.gnanti', 'gnantihourejjosuddde@gmail.com', '$2b$10$qfxc4DEKFgd4tNDUBJ.9b.VJ/JfX7FVN9wfRmot65C3Yw.DylsAua', '3', '54', 't', NULL, NULL, NULL, '2025-09-23 00:47:46.697703', '2025-09-23 00:47:46.697703');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('71', 'djelo.kuyo1', 'Goougi@gmail.com', '$2b$10$0IPfI0LIIHEgH3gcpeIb6ODj1z7e3PLMquuc25QHhaiD7DRA2GGiK', '3', NULL, 't', NULL, NULL, NULL, '2025-09-25 14:15:08.264551', '2025-09-25 14:56:02.553929');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('67', 'kogue.kaki', 'gnantihoureeejjosuddde@gmail.com', '$2b$10$/oXZKNhG9ZNBSAr2zCt07.Po1dpbfAji9PzT.cqMy1eCRtV1KYlIq', '3', '56', 't', NULL, NULL, NULL, '2025-09-23 00:58:20.000727', '2025-09-23 00:58:20.000727');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('72', 'djelo.kuyo2', 'gouda@gmail.com', '$2b$10$DcIVCeUml70K.S839q20OeMbTBEBwA/tSUX/2G45/ZnakJDZmIDgO', '3', '73', 't', NULL, NULL, NULL, '2025-09-25 15:00:06.942208', '2025-09-25 15:00:06.942208');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('7', 'agent.education1', 'agent.education1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '63', 't', '2025-09-11 02:51:06.22231', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.306516');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('9', 'admin.sante', 'admin.sante@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '2', '64', 't', '2025-09-11 02:51:05.006866', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.312224');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('16', 'agent.interieur1', 'agent.interieur1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '3', '69', 't', '2025-09-11 02:51:07.360547', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.355822');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('66', 'drh.education', 'drh.education@education.gouv.ci', '$2b$10$ZbRCv/4PBAJ2cqIi7nAz3eFqpxRXtzLeBPTaqvIRVWJbsQHi6Mx82', '6', '55', 't', '2025-09-23 02:31:57.111308', NULL, NULL, '2025-09-23 00:54:46.846583', '2025-09-23 02:31:57.111308');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('58', 'drh.drh', 'jeanbaptiste.kouame@rh.gouv.ci', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '6', '45', 't', '2025-10-04 18:16:16.455921', NULL, NULL, '2025-09-13 16:03:05.880683', '2025-10-04 18:16:16.455921');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('18', 'super.admin', 'super.admin@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '1', '70', 't', '2025-10-02 00:13:51.908158', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-02 00:13:51.908158');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('6', 'admin.education', 'admin.education@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', '2', '62', 't', '2025-10-06 04:57:01.766655', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-06 04:57:01.766655');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('81', 'hhh.parent', 'hhh.parent@agent.local', '$2b$10$lRBQ1KqaXSQpgEZxEyl3p.dGtcOLYpCFWJWDwjDnm4SrtetX94M06', '3', '85', 't', NULL, NULL, NULL, '2025-10-02 01:39:13.530296', '2025-10-02 01:39:13.530296');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('82', 'test.nomination', 'test.nomination@gouv.ci', '$2b$10$R0L9zEM9S3.RONNEnqR7Me4gUCHevYIXe8SYsUuNS9CJNo.kGu0ya', '2', '4', 't', '2025-10-04 19:21:28.813688', NULL, NULL, '2025-10-04 19:13:03.037457', '2025-10-04 19:26:09.947669');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('83', 'jaques.kouadio', 'gnantihourejosue@gmail.com', '$2b$10$9upkQql2awoF8vXLHKkZ3.r.OcvPF0GLRN31l3ea8Pb8lYBbCvIs2', '3', '118', 't', '2025-10-08 13:28:44.783508', NULL, NULL, '2025-10-06 02:08:53.259266', '2025-10-08 13:28:44.783508');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('87', 'chef.service.tourisme3', 'jeanbaptiste.kouame3@tourisme.gouv.ci', '$2b$10$qorBC.1N5SDOBeX99P8yjOZcD3Rm4NnW5RmprX2UUIf11QXLlcLtm', '9', '128', 't', '2025-10-08 18:50:32.18922', NULL, NULL, '2025-10-06 06:00:25.02203', '2025-10-08 18:50:32.18922');
INSERT INTO public.utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, last_login, password_reset_token, password_reset_expires, created_at, updated_at) VALUES ('84', 'chef.service.tourisme', 'jeanbaptiste.kouame@tourisme.gouv.ci', '$2b$10$ifOgoTFyW1.btHi27nMUsOnrbftmK37/GgknwaQl9BO.E3jvcLU76', '9', NULL, 't', NULL, NULL, NULL, '2025-10-06 05:57:48.622051', '2025-10-06 11:35:21.589225');



--
-- Data for Name: workflow_demandes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.workflow_demandes (id, id_demande, niveau_validation, id_validateur, action, commentaire, date_action) VALUES ('125', '68', 'chef_service', '128', 'approuve', NULL, '2025-10-08 16:16:09.190279');
INSERT INTO public.workflow_demandes (id, id_demande, niveau_validation, id_validateur, action, commentaire, date_action) VALUES ('126', '68', 'drh', '59', 'approuve', NULL, '2025-10-08 16:17:41.966518');
INSERT INTO public.workflow_demandes (id, id_demande, niveau_validation, id_validateur, action, commentaire, date_action) VALUES ('127', '68', 'chef_service', '128', 'approuve', 'Document transmis par le chef de service', '2025-10-08 16:21:17.695211');
INSERT INTO public.workflow_demandes (id, id_demande, niveau_validation, id_validateur, action, commentaire, date_action) VALUES ('128', '69', 'drh', '59', 'approuve', NULL, '2025-10-08 16:23:28.738983');



--
-- Name: affectations_temporaires_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affectations_temporaires_id_seq', 1, false);


--
-- Name: affectations_temporaires_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affectations_temporaires_institutions_id_seq', 1, false);


--
-- Name: agent_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_documents_id_seq', 124, true);


--
-- Name: agent_langues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_langues_id_seq', 15, true);


--
-- Name: agent_logiciels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_logiciels_id_seq', 16, true);


--
-- Name: agent_login_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_login_codes_id_seq', 21, true);


--
-- Name: agent_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_photos_id_seq', 6, true);


--
-- Name: agents_entites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agents_entites_id_seq', 36, true);


--
-- Name: agents_entites_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agents_entites_institutions_id_seq', 1, false);


--
-- Name: agents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agents_id_seq', 135, true);


--
-- Name: agents_institutions_main_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agents_institutions_main_id_seq', 1, false);


--
-- Name: autre_absences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.autre_absences_id_seq', 14, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 13, true);


--
-- Name: civilites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.civilites_id_seq', 8, true);


--
-- Name: classeurs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classeurs_id_seq', 1, false);


--
-- Name: classeurs_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classeurs_institutions_id_seq', 1, false);


--
-- Name: demandes_historique_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demandes_historique_id_seq', 139, true);


--
-- Name: demandes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demandes_id_seq', 79, true);


--
-- Name: departements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departements_id_seq', 38, true);


--
-- Name: diplomes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diplomes_id_seq', 19, true);


--
-- Name: distinctions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.distinctions_id_seq', 13, true);


--
-- Name: documents_autorisation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_autorisation_id_seq', 54, true);


--
-- Name: dossiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dossiers_id_seq', 1, false);


--
-- Name: dossiers_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dossiers_institutions_id_seq', 1, false);


--
-- Name: echelons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.echelons_id_seq', 20, true);


--
-- Name: emploi_agents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.emploi_agents_id_seq', 1, true);


--
-- Name: emplois_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.emplois_id_seq', 20, true);


--
-- Name: enfants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enfants_id_seq', 20, true);


--
-- Name: enfants_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enfants_institutions_id_seq', 1, false);


--
-- Name: entites_administratives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entites_administratives_id_seq', 36, true);


--
-- Name: entites_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entites_institutions_id_seq', 1, false);


--
-- Name: etude_diplome_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.etude_diplome_id_seq', 78, true);


--
-- Name: fonction_agents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fonction_agents_id_seq', 9, true);


--
-- Name: fonctions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fonctions_id_seq', 27, true);


--
-- Name: grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grades_id_seq', 36, true);


--
-- Name: handicaps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.handicaps_id_seq', 15, true);


--
-- Name: institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institutions_id_seq', 6, true);


--
-- Name: langues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.langues_id_seq', 21, true);


--
-- Name: localites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.localites_id_seq', 72, true);


--
-- Name: logiciels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logiciels_id_seq', 19, true);


--
-- Name: login_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.login_attempts_id_seq', 237, true);


--
-- Name: ministeres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ministeres_id_seq', 8, true);


--
-- Name: mode_d_entrees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mode_d_entrees_id_seq', 8, true);


--
-- Name: motif_de_departs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.motif_de_departs_id_seq', 15, true);


--
-- Name: nationalites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nationalites_id_seq', 27, true);


--
-- Name: nature_actes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nature_actes_id_seq', 16, true);


--
-- Name: nature_d_accidents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nature_d_accidents_id_seq', 12, true);


--
-- Name: niveau_informatiques_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.niveau_informatiques_id_seq', 10, true);


--
-- Name: niveau_langues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.niveau_langues_id_seq', 12, true);


--
-- Name: nominations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nominations_id_seq', 14, true);


--
-- Name: notifications_demandes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_demandes_id_seq', 563, true);


--
-- Name: pathologies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pathologies_id_seq', 19, true);


--
-- Name: pays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pays_id_seq', 28, true);


--
-- Name: permissions_entites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_entites_id_seq', 1, false);


--
-- Name: permissions_entites_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_entites_institutions_id_seq', 1, false);


--
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.positions_id_seq', 18, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 17, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 9, true);


--
-- Name: sanctions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sanctions_id_seq', 13, true);


--
-- Name: seminaire_formation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seminaire_formation_id_seq', 11, true);


--
-- Name: seminaire_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seminaire_participants_id_seq', 9, true);


--
-- Name: services_entites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_entites_id_seq', 4, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 6, true);


--
-- Name: services_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_institutions_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 201, true);


--
-- Name: sindicats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sindicats_id_seq', 14, true);


--
-- Name: situation_matrimonials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.situation_matrimonials_id_seq', 11, true);


--
-- Name: specialites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.specialites_id_seq', 24, true);


--
-- Name: stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stage_id_seq', 1, false);


--
-- Name: tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tiers_id_seq', 1, false);


--
-- Name: tiers_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tiers_institutions_id_seq', 1, false);


--
-- Name: type_d_agents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_d_agents_id_seq', 12, true);


--
-- Name: type_de_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_conges_id_seq', 16, true);


--
-- Name: type_de_couriers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_couriers_id_seq', 15, true);


--
-- Name: type_de_destinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_destinations_id_seq', 17, true);


--
-- Name: type_de_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_documents_id_seq', 1, false);


--
-- Name: type_de_documents_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_documents_institutions_id_seq', 1, false);


--
-- Name: type_de_materiels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_materiels_id_seq', 19, true);


--
-- Name: type_de_retraites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_retraites_id_seq', 12, true);


--
-- Name: type_de_seminaire_de_formation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_seminaire_de_formation_id_seq', 1, false);


--
-- Name: type_de_seminaire_de_formation_institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_de_seminaire_de_formation_institutions_id_seq', 1, false);


--
-- Name: type_etablissements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_etablissements_id_seq', 15, true);


--
-- Name: unite_administratives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.unite_administratives_id_seq', 17, true);


--
-- Name: utilisateurs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateurs_id_seq', 87, true);


--
-- Name: workflow_demandes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_demandes_id_seq', 128, true);


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institutions_pkey PRIMARY KEY (id);


--
-- Name: affectations_temporaires affectations_temporaires_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_pkey PRIMARY KEY (id);


--
-- Name: agent_documents agent_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_documents
    ADD CONSTRAINT agent_documents_pkey PRIMARY KEY (id);


--
-- Name: agent_langues agent_langues_id_agent_id_langue_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_agent_id_langue_key UNIQUE (id_agent, id_langue);


--
-- Name: agent_langues agent_langues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_pkey PRIMARY KEY (id);


--
-- Name: agent_logiciels agent_logiciels_id_agent_id_logiciel_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_agent_id_logiciel_key UNIQUE (id_agent, id_logiciel);


--
-- Name: agent_logiciels agent_logiciels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_pkey PRIMARY KEY (id);


--
-- Name: agent_login_codes agent_login_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT agent_login_codes_pkey PRIMARY KEY (id);


--
-- Name: agent_photos agent_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_photos
    ADD CONSTRAINT agent_photos_pkey PRIMARY KEY (id);


--
-- Name: agents agents_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_email_key UNIQUE (email);


--
-- Name: agents_entites agents_entites_id_agent_id_entite_date_debut_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_id_agent_id_entite_date_debut_key UNIQUE (id_agent, id_entite, date_debut);


--
-- Name: agents_entites_institutions agents_entites_institutions_id_agent_institution_id_entite__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_id_agent_institution_id_entite__key UNIQUE (id_agent_institution, id_entite, date_debut);


--
-- Name: agents_entites_institutions agents_entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: agents_entites agents_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_pkey PRIMARY KEY (id);


--
-- Name: agents_institutions_main agents_institutions_main_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_email_key UNIQUE (email);


--
-- Name: agents_institutions_main agents_institutions_main_matricule_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_matricule_key UNIQUE (matricule);


--
-- Name: agents_institutions_main agents_institutions_main_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_pkey PRIMARY KEY (id);


--
-- Name: agents agents_matricule_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_matricule_key UNIQUE (matricule);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: autre_absences autre_absences_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.autre_absences
    ADD CONSTRAINT autre_absences_libele_key UNIQUE (libele);


--
-- Name: autre_absences autre_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.autre_absences
    ADD CONSTRAINT autre_absences_pkey PRIMARY KEY (id);


--
-- Name: categories categories_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_libele_key UNIQUE (libele);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: civilites civilites_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.civilites
    ADD CONSTRAINT civilites_libele_key UNIQUE (libele);


--
-- Name: civilites civilites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.civilites
    ADD CONSTRAINT civilites_pkey PRIMARY KEY (id);


--
-- Name: classeurs classeurs_id_ministere_id_dossier_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_ministere_id_dossier_libelle_key UNIQUE (id_ministere, id_dossier, libelle);


--
-- Name: classeurs_institutions classeurs_institutions_id_institution_id_dossier_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_institution_id_dossier_libelle_key UNIQUE (id_institution, id_dossier, libelle);


--
-- Name: classeurs_institutions classeurs_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_pkey PRIMARY KEY (id);


--
-- Name: classeurs classeurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_pkey PRIMARY KEY (id);


--
-- Name: demandes_historique demandes_historique_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT demandes_historique_pkey PRIMARY KEY (id);


--
-- Name: demandes demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_pkey PRIMARY KEY (id);


--
-- Name: departements departements_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_code_key UNIQUE (code);


--
-- Name: departements departements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_pkey PRIMARY KEY (id);


--
-- Name: diplomes diplomes_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diplomes
    ADD CONSTRAINT diplomes_libele_key UNIQUE (libele);


--
-- Name: diplomes diplomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diplomes
    ADD CONSTRAINT diplomes_pkey PRIMARY KEY (id);


--
-- Name: distinctions distinctions_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distinctions
    ADD CONSTRAINT distinctions_libele_key UNIQUE (libele);


--
-- Name: distinctions distinctions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distinctions
    ADD CONSTRAINT distinctions_pkey PRIMARY KEY (id);


--
-- Name: documents_autorisation documents_autorisation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_pkey PRIMARY KEY (id);


--
-- Name: dossiers dossiers_id_ministere_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_ministere_id_entite_libelle_key UNIQUE (id_ministere, id_entite, libelle);


--
-- Name: dossiers_institutions dossiers_institutions_id_institution_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_institution_id_entite_libelle_key UNIQUE (id_institution, id_entite, libelle);


--
-- Name: dossiers_institutions dossiers_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_pkey PRIMARY KEY (id);


--
-- Name: dossiers dossiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_pkey PRIMARY KEY (id);


--
-- Name: echelons echelons_indice_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.echelons
    ADD CONSTRAINT echelons_indice_key UNIQUE (indice);


--
-- Name: echelons echelons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.echelons
    ADD CONSTRAINT echelons_pkey PRIMARY KEY (id);


--
-- Name: emploi_agents emploi_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT emploi_agents_pkey PRIMARY KEY (id);


--
-- Name: emplois emplois_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emplois
    ADD CONSTRAINT emplois_libele_key UNIQUE (libele);


--
-- Name: emplois emplois_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emplois
    ADD CONSTRAINT emplois_pkey PRIMARY KEY (id);


--
-- Name: enfants_institutions enfants_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants_institutions
    ADD CONSTRAINT enfants_institutions_pkey PRIMARY KEY (id);


--
-- Name: enfants enfants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants
    ADD CONSTRAINT enfants_pkey PRIMARY KEY (id);


--
-- Name: entites_administratives entites_administratives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_pkey PRIMARY KEY (id);


--
-- Name: entites_institutions entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: etude_diplome etude_diplome_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_pkey PRIMARY KEY (id);


--
-- Name: fonction_agents fonction_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fonction_agents_pkey PRIMARY KEY (id);


--
-- Name: fonctions fonctions_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonctions
    ADD CONSTRAINT fonctions_libele_key UNIQUE (libele);


--
-- Name: fonctions fonctions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonctions
    ADD CONSTRAINT fonctions_pkey PRIMARY KEY (id);


--
-- Name: grades grades_id_categorie_numero_ordre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_id_categorie_numero_ordre_key UNIQUE (id_categorie, numero_ordre);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: handicaps handicaps_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.handicaps
    ADD CONSTRAINT handicaps_libele_key UNIQUE (libele);


--
-- Name: handicaps handicaps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.handicaps
    ADD CONSTRAINT handicaps_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_code_key UNIQUE (code);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: langues langues_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.langues
    ADD CONSTRAINT langues_libele_key UNIQUE (libele);


--
-- Name: langues langues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.langues
    ADD CONSTRAINT langues_pkey PRIMARY KEY (id);


--
-- Name: localites localites_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_code_key UNIQUE (code);


--
-- Name: localites localites_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_libele_key UNIQUE (libele);


--
-- Name: localites localites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_pkey PRIMARY KEY (id);


--
-- Name: logiciels logiciels_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logiciels
    ADD CONSTRAINT logiciels_libele_key UNIQUE (libele);


--
-- Name: logiciels logiciels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logiciels
    ADD CONSTRAINT logiciels_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: ministeres ministeres_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_code_key UNIQUE (code);


--
-- Name: ministeres ministeres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_pkey PRIMARY KEY (id);


--
-- Name: mode_d_entrees mode_d_entrees_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mode_d_entrees
    ADD CONSTRAINT mode_d_entrees_libele_key UNIQUE (libele);


--
-- Name: mode_d_entrees mode_d_entrees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mode_d_entrees
    ADD CONSTRAINT mode_d_entrees_pkey PRIMARY KEY (id);


--
-- Name: motif_de_departs motif_de_departs_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motif_de_departs
    ADD CONSTRAINT motif_de_departs_libele_key UNIQUE (libele);


--
-- Name: motif_de_departs motif_de_departs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motif_de_departs
    ADD CONSTRAINT motif_de_departs_pkey PRIMARY KEY (id);


--
-- Name: nationalites nationalites_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nationalites
    ADD CONSTRAINT nationalites_libele_key UNIQUE (libele);


--
-- Name: nationalites nationalites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nationalites
    ADD CONSTRAINT nationalites_pkey PRIMARY KEY (id);


--
-- Name: nature_actes nature_actes_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_actes
    ADD CONSTRAINT nature_actes_libele_key UNIQUE (libele);


--
-- Name: nature_actes nature_actes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_actes
    ADD CONSTRAINT nature_actes_pkey PRIMARY KEY (id);


--
-- Name: nature_d_accidents nature_d_accidents_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_d_accidents
    ADD CONSTRAINT nature_d_accidents_libele_key UNIQUE (libele);


--
-- Name: nature_d_accidents nature_d_accidents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nature_d_accidents
    ADD CONSTRAINT nature_d_accidents_pkey PRIMARY KEY (id);


--
-- Name: niveau_informatiques niveau_informatiques_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_informatiques
    ADD CONSTRAINT niveau_informatiques_libele_key UNIQUE (libele);


--
-- Name: niveau_informatiques niveau_informatiques_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_informatiques
    ADD CONSTRAINT niveau_informatiques_pkey PRIMARY KEY (id);


--
-- Name: niveau_langues niveau_langues_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_langues
    ADD CONSTRAINT niveau_langues_libele_key UNIQUE (libele);


--
-- Name: niveau_langues niveau_langues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niveau_langues
    ADD CONSTRAINT niveau_langues_pkey PRIMARY KEY (id);


--
-- Name: nominations nominations_numero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_numero_key UNIQUE (numero);


--
-- Name: nominations nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_pkey PRIMARY KEY (id);


--
-- Name: notifications_demandes notifications_demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT notifications_demandes_pkey PRIMARY KEY (id);


--
-- Name: pathologies pathologies_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pathologies
    ADD CONSTRAINT pathologies_libele_key UNIQUE (libele);


--
-- Name: pathologies pathologies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pathologies
    ADD CONSTRAINT pathologies_pkey PRIMARY KEY (id);


--
-- Name: pays pays_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_libele_key UNIQUE (libele);


--
-- Name: pays pays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_pkey PRIMARY KEY (id);


--
-- Name: permissions_entites permissions_entites_id_role_id_entite_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_id_role_id_entite_key UNIQUE (id_role, id_entite);


--
-- Name: permissions_entites_institutions permissions_entites_institutions_id_role_id_entite_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_id_role_id_entite_key UNIQUE (id_role, id_entite);


--
-- Name: permissions_entites_institutions permissions_entites_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_pkey PRIMARY KEY (id);


--
-- Name: permissions_entites permissions_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_pkey PRIMARY KEY (id);


--
-- Name: positions positions_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_libele_key UNIQUE (libele);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: regions regions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_key UNIQUE (code);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nom_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nom_key UNIQUE (nom);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sanctions sanctions_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sanctions
    ADD CONSTRAINT sanctions_libele_key UNIQUE (libele);


--
-- Name: sanctions sanctions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sanctions
    ADD CONSTRAINT sanctions_pkey PRIMARY KEY (id);


--
-- Name: seminaire_formation seminaire_formation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_formation
    ADD CONSTRAINT seminaire_formation_pkey PRIMARY KEY (id);


--
-- Name: seminaire_participants seminaire_participants_id_seminaire_id_agent_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_seminaire_id_agent_key UNIQUE (id_seminaire, id_agent);


--
-- Name: seminaire_participants seminaire_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_pkey PRIMARY KEY (id);


--
-- Name: services_entites services_entites_id_entite_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_id_entite_libelle_key UNIQUE (id_entite, libelle);


--
-- Name: services_entites services_entites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_pkey PRIMARY KEY (id);


--
-- Name: services services_id_ministere_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_id_ministere_libelle_key UNIQUE (id_ministere, libelle);


--
-- Name: services_institutions services_institutions_id_institution_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_id_institution_libelle_key UNIQUE (id_institution, libelle);


--
-- Name: services_institutions services_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sindicats sindicats_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sindicats
    ADD CONSTRAINT sindicats_libele_key UNIQUE (libele);


--
-- Name: sindicats sindicats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sindicats
    ADD CONSTRAINT sindicats_pkey PRIMARY KEY (id);


--
-- Name: situation_matrimonials situation_matrimonials_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.situation_matrimonials
    ADD CONSTRAINT situation_matrimonials_libele_key UNIQUE (libele);


--
-- Name: situation_matrimonials situation_matrimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.situation_matrimonials
    ADD CONSTRAINT situation_matrimonials_pkey PRIMARY KEY (id);


--
-- Name: specialites specialites_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialites
    ADD CONSTRAINT specialites_libele_key UNIQUE (libele);


--
-- Name: specialites specialites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialites
    ADD CONSTRAINT specialites_pkey PRIMARY KEY (id);


--
-- Name: stage stage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage
    ADD CONSTRAINT stage_pkey PRIMARY KEY (id);


--
-- Name: tiers_institutions tiers_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers_institutions
    ADD CONSTRAINT tiers_institutions_pkey PRIMARY KEY (id);


--
-- Name: tiers tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT tiers_pkey PRIMARY KEY (id);


--
-- Name: type_d_agents type_d_agents_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_d_agents
    ADD CONSTRAINT type_d_agents_libele_key UNIQUE (libele);


--
-- Name: type_d_agents type_d_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_d_agents
    ADD CONSTRAINT type_d_agents_pkey PRIMARY KEY (id);


--
-- Name: type_de_conges type_de_conges_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_conges
    ADD CONSTRAINT type_de_conges_libele_key UNIQUE (libele);


--
-- Name: type_de_conges type_de_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_conges
    ADD CONSTRAINT type_de_conges_pkey PRIMARY KEY (id);


--
-- Name: type_de_couriers type_de_couriers_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_couriers
    ADD CONSTRAINT type_de_couriers_libele_key UNIQUE (libele);


--
-- Name: type_de_couriers type_de_couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_couriers
    ADD CONSTRAINT type_de_couriers_pkey PRIMARY KEY (id);


--
-- Name: type_de_destinations type_de_destinations_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_destinations
    ADD CONSTRAINT type_de_destinations_libele_key UNIQUE (libele);


--
-- Name: type_de_destinations type_de_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_destinations
    ADD CONSTRAINT type_de_destinations_pkey PRIMARY KEY (id);


--
-- Name: type_de_documents_institutions type_de_documents_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_pkey PRIMARY KEY (id);


--
-- Name: type_de_documents type_de_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_pkey PRIMARY KEY (id);


--
-- Name: type_de_materiels type_de_materiels_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_materiels
    ADD CONSTRAINT type_de_materiels_libele_key UNIQUE (libele);


--
-- Name: type_de_materiels type_de_materiels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_materiels
    ADD CONSTRAINT type_de_materiels_pkey PRIMARY KEY (id);


--
-- Name: type_de_retraites type_de_retraites_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_retraites
    ADD CONSTRAINT type_de_retraites_libele_key UNIQUE (libele);


--
-- Name: type_de_retraites type_de_retraites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_retraites
    ADD CONSTRAINT type_de_retraites_pkey PRIMARY KEY (id);


--
-- Name: type_de_seminaire_de_formation_institutions type_de_seminaire_de_formation_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions
    ADD CONSTRAINT type_de_seminaire_de_formation_institutions_pkey PRIMARY KEY (id);


--
-- Name: type_de_seminaire_de_formation type_de_seminaire_de_formation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation
    ADD CONSTRAINT type_de_seminaire_de_formation_pkey PRIMARY KEY (id);


--
-- Name: type_etablissements type_etablissements_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_etablissements
    ADD CONSTRAINT type_etablissements_libele_key UNIQUE (libele);


--
-- Name: type_etablissements type_etablissements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_etablissements
    ADD CONSTRAINT type_etablissements_pkey PRIMARY KEY (id);


--
-- Name: emploi_agents uk_emploi_agents_agent_nomination; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT uk_emploi_agents_agent_nomination UNIQUE (id_agent, id_nomination);


--
-- Name: entites_administratives uk_entites_administratives_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT uk_entites_administratives_code UNIQUE (code);


--
-- Name: entites_institutions uk_entites_institutions_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT uk_entites_institutions_code UNIQUE (code);


--
-- Name: fonction_agents uk_fonction_agents_agent_nomination; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT uk_fonction_agents_agent_nomination UNIQUE (id_agent, id_nomination);


--
-- Name: services_entites uk_services_entites_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT uk_services_entites_code UNIQUE (code);


--
-- Name: agent_login_codes unique_active_code_per_agent; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT unique_active_code_per_agent UNIQUE (agent_id, code);


--
-- Name: unite_administratives unite_administratives_libele_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_libele_key UNIQUE (libele);


--
-- Name: unite_administratives unite_administratives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_username_key UNIQUE (username);


--
-- Name: workflow_demandes workflow_demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT workflow_demandes_pkey PRIMARY KEY (id);


--
-- Name: idx_affectations_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_affectations_id_agent ON public.affectations_temporaires USING btree (id_agent);


--
-- Name: idx_affectations_institutions_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_affectations_institutions_id_agent ON public.affectations_temporaires_institutions USING btree (id_agent);


--
-- Name: idx_affectations_institutions_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_affectations_institutions_statut ON public.affectations_temporaires_institutions USING btree (statut);


--
-- Name: idx_affectations_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_affectations_statut ON public.affectations_temporaires USING btree (statut);


--
-- Name: idx_agent_documents_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_documents_agent ON public.agent_documents USING btree (id_agent);


--
-- Name: idx_agent_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_documents_type ON public.agent_documents USING btree (document_type);


--
-- Name: idx_agent_langues_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_langues_agent ON public.agent_langues USING btree (id_agent);


--
-- Name: idx_agent_langues_langue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_langues_langue ON public.agent_langues USING btree (id_langue);


--
-- Name: idx_agent_logiciels_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_logiciels_agent ON public.agent_logiciels USING btree (id_agent);


--
-- Name: idx_agent_logiciels_logiciel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_logiciels_logiciel ON public.agent_logiciels USING btree (id_logiciel);


--
-- Name: idx_agent_login_codes_agent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_login_codes_agent_id ON public.agent_login_codes USING btree (agent_id);


--
-- Name: idx_agent_login_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_login_codes_code ON public.agent_login_codes USING btree (code);


--
-- Name: idx_agent_login_codes_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_login_codes_expires_at ON public.agent_login_codes USING btree (expires_at);


--
-- Name: idx_agent_login_codes_used_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_login_codes_used_at ON public.agent_login_codes USING btree (used_at);


--
-- Name: idx_agent_photos_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_photos_agent ON public.agent_photos USING btree (id_agent);


--
-- Name: idx_agent_photos_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_photos_profile ON public.agent_photos USING btree (is_profile_photo);


--
-- Name: idx_agents_date_declaration_cnps; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_date_declaration_cnps ON public.agents USING btree (date_declaration_cnps);


--
-- Name: idx_agents_date_embauche; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_date_embauche ON public.agents USING btree (date_embauche);


--
-- Name: idx_agents_entites_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_id_agent ON public.agents_entites USING btree (id_agent);


--
-- Name: idx_agents_entites_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_id_entite ON public.agents_entites USING btree (id_entite);


--
-- Name: idx_agents_entites_institutions_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_institutions_id_agent ON public.agents_entites_institutions USING btree (id_agent_institution);


--
-- Name: idx_agents_entites_institutions_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_institutions_id_entite ON public.agents_entites_institutions USING btree (id_entite);


--
-- Name: idx_agents_entites_institutions_is_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_institutions_is_principal ON public.agents_entites_institutions USING btree (is_principal);


--
-- Name: idx_agents_entites_is_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_entites_is_principal ON public.agents_entites USING btree (is_principal);


--
-- Name: idx_agents_id_autre_absence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_autre_absence ON public.agents USING btree (id_autre_absence);


--
-- Name: idx_agents_id_categorie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_categorie ON public.agents USING btree (id_categorie);


--
-- Name: idx_agents_id_diplome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_diplome ON public.agents USING btree (id_diplome);


--
-- Name: idx_agents_id_distinction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_distinction ON public.agents USING btree (id_distinction);


--
-- Name: idx_agents_id_echelon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_echelon ON public.agents USING btree (id_echelon);


--
-- Name: idx_agents_id_emploi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_emploi ON public.agents USING btree (id_emploi);


--
-- Name: idx_agents_id_entite_principale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_entite_principale ON public.agents USING btree (id_entite_principale);


--
-- Name: idx_agents_id_fonction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_fonction ON public.agents USING btree (id_fonction);


--
-- Name: idx_agents_id_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_grade ON public.agents USING btree (id_grade);


--
-- Name: idx_agents_id_handicap; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_handicap ON public.agents USING btree (id_handicap);


--
-- Name: idx_agents_id_langue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_langue ON public.agents USING btree (id_langue);


--
-- Name: idx_agents_id_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_localite ON public.agents USING btree (id_localite);


--
-- Name: idx_agents_id_logiciel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_logiciel ON public.agents USING btree (id_logiciel);


--
-- Name: idx_agents_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_ministere ON public.agents USING btree (id_ministere);


--
-- Name: idx_agents_id_mode_entree; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_mode_entree ON public.agents USING btree (id_mode_entree);


--
-- Name: idx_agents_id_motif_depart; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_motif_depart ON public.agents USING btree (id_motif_depart);


--
-- Name: idx_agents_id_nature_accident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_nature_accident ON public.agents USING btree (id_nature_accident);


--
-- Name: idx_agents_id_nature_acte; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_nature_acte ON public.agents USING btree (id_nature_acte);


--
-- Name: idx_agents_id_niveau_informatique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_niveau_informatique ON public.agents USING btree (id_niveau_informatique);


--
-- Name: idx_agents_id_niveau_langue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_niveau_langue ON public.agents USING btree (id_niveau_langue);


--
-- Name: idx_agents_id_pathologie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_pathologie ON public.agents USING btree (id_pathologie);


--
-- Name: idx_agents_id_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_pays ON public.agents USING btree (id_pays);


--
-- Name: idx_agents_id_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_position ON public.agents USING btree (id_position);


--
-- Name: idx_agents_id_sanction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_sanction ON public.agents USING btree (id_sanction);


--
-- Name: idx_agents_id_sindicat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_sindicat ON public.agents USING btree (id_sindicat);


--
-- Name: idx_agents_id_specialite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_specialite ON public.agents USING btree (id_specialite);


--
-- Name: idx_agents_id_type_conge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_conge ON public.agents USING btree (id_type_conge);


--
-- Name: idx_agents_id_type_courrier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_courrier ON public.agents USING btree (id_type_courrier);


--
-- Name: idx_agents_id_type_destination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_destination ON public.agents USING btree (id_type_destination);


--
-- Name: idx_agents_id_type_etablissement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_etablissement ON public.agents USING btree (id_type_etablissement);


--
-- Name: idx_agents_id_type_materiel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_materiel ON public.agents USING btree (id_type_materiel);


--
-- Name: idx_agents_id_type_retraite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_type_retraite ON public.agents USING btree (id_type_retraite);


--
-- Name: idx_agents_id_unite_administrative; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_id_unite_administrative ON public.agents USING btree (id_unite_administrative);


--
-- Name: idx_agents_institutions_main_date_embauche; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_institutions_main_date_embauche ON public.agents_institutions_main USING btree (date_embauche);


--
-- Name: idx_agents_institutions_main_id_entite_principale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_institutions_main_id_entite_principale ON public.agents_institutions_main USING btree (id_entite_principale);


--
-- Name: idx_agents_institutions_main_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_institutions_main_id_institution ON public.agents_institutions_main USING btree (id_institution);


--
-- Name: idx_agents_institutions_main_statut_emploi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_institutions_main_statut_emploi ON public.agents_institutions_main USING btree (statut_emploi);


--
-- Name: idx_agents_numero_cnps; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_numero_cnps ON public.agents USING btree (numero_cnps);


--
-- Name: idx_agents_statut_emploi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_statut_emploi ON public.agents USING btree (statut_emploi);


--
-- Name: idx_classeurs_id_dossier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classeurs_id_dossier ON public.classeurs USING btree (id_dossier);


--
-- Name: idx_classeurs_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classeurs_id_ministere ON public.classeurs USING btree (id_ministere);


--
-- Name: idx_classeurs_institutions_id_dossier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classeurs_institutions_id_dossier ON public.classeurs_institutions USING btree (id_dossier);


--
-- Name: idx_classeurs_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classeurs_institutions_id_institution ON public.classeurs_institutions USING btree (id_institution);


--
-- Name: idx_demandes_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_agent ON public.demandes USING btree (id_agent);


--
-- Name: idx_demandes_creation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_creation ON public.demandes USING btree (date_creation);


--
-- Name: idx_demandes_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_dates ON public.demandes USING btree (date_debut, date_fin);


--
-- Name: idx_demandes_niveau; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_niveau ON public.demandes USING btree (niveau_evolution_demande);


--
-- Name: idx_demandes_niveau_actuel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_niveau_actuel ON public.demandes USING btree (niveau_actuel);


--
-- Name: idx_demandes_phase; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_phase ON public.demandes USING btree (phase);


--
-- Name: idx_demandes_priorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_priorite ON public.demandes USING btree (priorite);


--
-- Name: idx_demandes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_status ON public.demandes USING btree (status);


--
-- Name: idx_demandes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demandes_type ON public.demandes USING btree (type_demande);


--
-- Name: idx_departements_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_active ON public.departements USING btree (id) WHERE (is_active = true);


--
-- Name: idx_departements_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_code ON public.departements USING btree (code);


--
-- Name: idx_departements_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_created_at ON public.departements USING btree (created_at);


--
-- Name: idx_departements_id_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_id_region ON public.departements USING btree (id_region);


--
-- Name: INDEX idx_departements_id_region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_departements_id_region IS 'Index sur la relation departement-region';


--
-- Name: idx_departements_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_is_active ON public.departements USING btree (is_active);


--
-- Name: idx_departements_libele; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_libele ON public.departements USING btree (libele);


--
-- Name: idx_departements_libele_trgm; Type: INDEX; Schema: public; Owner: postgres
--

-- CREATE INDEX idx_departements_libele_trgm ON public.departements USING gin (libele public.gin_trgm_ops);  -- Commenté: dépend de pg_trgm


--
-- Name: idx_departements_region_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departements_region_active ON public.departements USING btree (id_region, is_active);


--
-- Name: idx_documents_autorisation_demande; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_autorisation_demande ON public.documents_autorisation USING btree (id_demande);


--
-- Name: idx_documents_autorisation_destinataire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_autorisation_destinataire ON public.documents_autorisation USING btree (id_agent_destinataire);


--
-- Name: idx_documents_autorisation_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_autorisation_statut ON public.documents_autorisation USING btree (statut);


--
-- Name: idx_documents_autorisation_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_autorisation_type ON public.documents_autorisation USING btree (type_document);


--
-- Name: idx_dossiers_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dossiers_id_entite ON public.dossiers USING btree (id_entite);


--
-- Name: idx_dossiers_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dossiers_id_ministere ON public.dossiers USING btree (id_ministere);


--
-- Name: idx_dossiers_institutions_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dossiers_institutions_id_entite ON public.dossiers_institutions USING btree (id_entite);


--
-- Name: idx_dossiers_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dossiers_institutions_id_institution ON public.dossiers_institutions USING btree (id_institution);


--
-- Name: idx_emploi_agents_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emploi_agents_id_agent ON public.emploi_agents USING btree (id_agent);


--
-- Name: idx_emploi_agents_id_emploi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emploi_agents_id_emploi ON public.emploi_agents USING btree (id_emploi);


--
-- Name: idx_emploi_agents_id_nomination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emploi_agents_id_nomination ON public.emploi_agents USING btree (id_nomination);


--
-- Name: idx_entites_admin_geo_hierarchy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_admin_geo_hierarchy ON public.entites_administratives USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_entites_admin_geo_hierarchy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_entites_admin_geo_hierarchy IS 'Index composite pour les requetes geographiques des entites administratives';


--
-- Name: idx_entites_admin_id_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_admin_id_departement ON public.entites_administratives USING btree (id_departement);


--
-- Name: idx_entites_admin_id_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_admin_id_localite ON public.entites_administratives USING btree (id_localite);


--
-- Name: idx_entites_admin_id_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_admin_id_region ON public.entites_administratives USING btree (id_region);


--
-- Name: idx_entites_administratives_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_administratives_code ON public.entites_administratives USING btree (code);


--
-- Name: idx_entites_id_entite_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_id_entite_parent ON public.entites_administratives USING btree (id_entite_parent);


--
-- Name: idx_entites_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_id_institution ON public.entites_institutions USING btree (id_institution);


--
-- Name: idx_entites_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_id_ministere ON public.entites_administratives USING btree (id_ministere);


--
-- Name: idx_entites_institutions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_code ON public.entites_institutions USING btree (code);


--
-- Name: idx_entites_institutions_geo_hierarchy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_geo_hierarchy ON public.entites_institutions USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_entites_institutions_geo_hierarchy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_entites_institutions_geo_hierarchy IS 'Index composite pour les requetes geographiques des entites institutions';


--
-- Name: idx_entites_institutions_id_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_id_departement ON public.entites_institutions USING btree (id_departement);


--
-- Name: idx_entites_institutions_id_entite_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_id_entite_parent ON public.entites_institutions USING btree (id_entite_parent);


--
-- Name: idx_entites_institutions_id_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_id_localite ON public.entites_institutions USING btree (id_localite);


--
-- Name: idx_entites_institutions_id_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_id_region ON public.entites_institutions USING btree (id_region);


--
-- Name: idx_entites_institutions_type_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_institutions_type_entite ON public.entites_institutions USING btree (type_entite);


--
-- Name: idx_entites_type_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entites_type_entite ON public.entites_administratives USING btree (type_entite);


--
-- Name: idx_etude_diplome_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etude_diplome_agent ON public.etude_diplome USING btree (id_agent);


--
-- Name: idx_etude_diplome_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etude_diplome_date ON public.etude_diplome USING btree (date_diplome);


--
-- Name: idx_etude_diplome_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etude_diplome_document ON public.etude_diplome USING btree (id_agent_document);


--
-- Name: idx_etude_diplome_ecole; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etude_diplome_ecole ON public.etude_diplome USING btree (ecole);


--
-- Name: idx_fonction_agents_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fonction_agents_id_agent ON public.fonction_agents USING btree (id_agent);


--
-- Name: idx_fonction_agents_id_fonction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fonction_agents_id_fonction ON public.fonction_agents USING btree (id_fonction);


--
-- Name: idx_fonction_agents_id_nomination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fonction_agents_id_nomination ON public.fonction_agents USING btree (id_nomination);


--
-- Name: idx_geo_hierarchy_departement_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_geo_hierarchy_departement_localite ON public.localites USING btree (id_departement, id);


--
-- Name: INDEX idx_geo_hierarchy_departement_localite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_geo_hierarchy_departement_localite IS 'Index composite pour la hierarchie departement-localite';


--
-- Name: idx_geo_hierarchy_region_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_geo_hierarchy_region_departement ON public.departements USING btree (id_region, id);


--
-- Name: INDEX idx_geo_hierarchy_region_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_geo_hierarchy_region_departement IS 'Index composite pour la hierarchie region-departement';


--
-- Name: idx_geo_stats_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_geo_stats_departement ON public.ministeres USING btree (id_departement) WHERE (id_departement IS NOT NULL);


--
-- Name: idx_geo_stats_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_geo_stats_localite ON public.ministeres USING btree (id_localite) WHERE (id_localite IS NOT NULL);


--
-- Name: idx_geo_stats_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_geo_stats_region ON public.ministeres USING btree (id_region) WHERE (id_region IS NOT NULL);


--
-- Name: idx_historique_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historique_date ON public.demandes_historique USING btree (date_modification);


--
-- Name: idx_historique_demande; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historique_demande ON public.demandes_historique USING btree (id_demande);


--
-- Name: idx_institutions_geo_hierarchy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_institutions_geo_hierarchy ON public.institutions USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_institutions_geo_hierarchy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_institutions_geo_hierarchy IS 'Index composite pour les requetes geographiques des institutions';


--
-- Name: idx_institutions_id_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_institutions_id_departement ON public.institutions USING btree (id_departement);


--
-- Name: idx_institutions_id_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_institutions_id_localite ON public.institutions USING btree (id_localite);


--
-- Name: idx_institutions_id_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_institutions_id_region ON public.institutions USING btree (id_region);


--
-- Name: idx_localites_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_active ON public.localites USING btree (id) WHERE (is_active = true);


--
-- Name: idx_localites_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_code ON public.localites USING btree (code);


--
-- Name: idx_localites_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_created_at ON public.localites USING btree (created_at);


--
-- Name: idx_localites_departement_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_departement_active ON public.localites USING btree (id_departement, is_active);


--
-- Name: idx_localites_id_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_id_departement ON public.localites USING btree (id_departement);


--
-- Name: INDEX idx_localites_id_departement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_localites_id_departement IS 'Index sur la relation localite-departement';


--
-- Name: idx_localites_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_is_active ON public.localites USING btree (is_active);


--
-- Name: idx_localites_libele; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_libele ON public.localites USING btree (libele);


--
-- Name: idx_localites_libele_trgm; Type: INDEX; Schema: public; Owner: postgres
--

-- CREATE INDEX idx_localites_libele_trgm ON public.localites USING gin (libele public.gin_trgm_ops);  -- Commenté: dépend de pg_trgm


--
-- Name: idx_localites_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_type ON public.localites USING btree (type_localite);


--
-- Name: idx_localites_type_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_localites_type_active ON public.localites USING btree (type_localite, is_active);


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address);


--
-- Name: idx_login_attempts_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_username ON public.login_attempts USING btree (username);


--
-- Name: idx_ministeres_geo_hierarchy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ministeres_geo_hierarchy ON public.ministeres USING btree (id_region, id_departement, id_localite);


--
-- Name: INDEX idx_ministeres_geo_hierarchy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_ministeres_geo_hierarchy IS 'Index composite pour les requetes geographiques des ministeres';


--
-- Name: idx_ministeres_id_departement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ministeres_id_departement ON public.ministeres USING btree (id_departement);


--
-- Name: idx_ministeres_id_localite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ministeres_id_localite ON public.ministeres USING btree (id_localite);


--
-- Name: idx_ministeres_id_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ministeres_id_region ON public.ministeres USING btree (id_region);


--
-- Name: idx_ministeres_responsable_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ministeres_responsable_id ON public.ministeres USING btree (responsable_id);


--
-- Name: idx_nominations_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nominations_agent ON public.nominations USING btree (id_agent);


--
-- Name: idx_nominations_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nominations_date ON public.nominations USING btree (date_signature);


--
-- Name: idx_nominations_nature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nominations_nature ON public.nominations USING btree (nature);


--
-- Name: idx_notifications_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_agent ON public.notifications_demandes USING btree (id_agent_destinataire);


--
-- Name: idx_notifications_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_date ON public.notifications_demandes USING btree (date_creation);


--
-- Name: idx_notifications_demande; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_demande ON public.notifications_demandes USING btree (id_demande);


--
-- Name: idx_notifications_lu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_lu ON public.notifications_demandes USING btree (lu);


--
-- Name: idx_pays_nationalite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pays_nationalite ON public.pays USING btree (id_nationalite);


--
-- Name: idx_permissions_entites_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_entites_id_entite ON public.permissions_entites USING btree (id_entite);


--
-- Name: idx_permissions_entites_id_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_entites_id_role ON public.permissions_entites USING btree (id_role);


--
-- Name: idx_permissions_entites_institutions_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_entites_institutions_id_entite ON public.permissions_entites_institutions USING btree (id_entite);


--
-- Name: idx_permissions_entites_institutions_id_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_entites_institutions_id_role ON public.permissions_entites_institutions USING btree (id_role);


--
-- Name: idx_regions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_active ON public.regions USING btree (id) WHERE (is_active = true);


--
-- Name: idx_regions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_code ON public.regions USING btree (code);


--
-- Name: INDEX idx_regions_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_regions_code IS 'Index sur le code de region pour les recherches rapides';


--
-- Name: idx_regions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_created_at ON public.regions USING btree (created_at);


--
-- Name: idx_regions_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_is_active ON public.regions USING btree (is_active);


--
-- Name: idx_regions_libele; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_libele ON public.regions USING btree (libele);


--
-- Name: idx_regions_libele_trgm; Type: INDEX; Schema: public; Owner: postgres
--

-- CREATE INDEX idx_regions_libele_trgm ON public.regions USING gin (libele public.gin_trgm_ops);  -- Commenté: dépend de pg_trgm


--
-- Name: idx_seminaire_formation_date_debut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seminaire_formation_date_debut ON public.seminaire_formation USING btree (date_debut);


--
-- Name: idx_seminaire_formation_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seminaire_formation_id_entite ON public.seminaire_formation USING btree (id_entite);


--
-- Name: idx_seminaire_formation_organisme; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seminaire_formation_organisme ON public.seminaire_formation USING btree (type_organisme, id_entite);


--
-- Name: idx_seminaire_participants_id_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seminaire_participants_id_agent ON public.seminaire_participants USING btree (id_agent);


--
-- Name: idx_seminaire_participants_id_seminaire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seminaire_participants_id_seminaire ON public.seminaire_participants USING btree (id_seminaire);


--
-- Name: idx_services_entites_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_entites_code ON public.services_entites USING btree (code);


--
-- Name: idx_services_entites_id_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_entites_id_entite ON public.services_entites USING btree (id_entite);


--
-- Name: idx_services_entites_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_entites_is_active ON public.services_entites USING btree (is_active);


--
-- Name: idx_services_entites_responsable; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_entites_responsable ON public.services_entites USING btree (responsable_id);


--
-- Name: idx_services_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_id_ministere ON public.services USING btree (id_ministere);


--
-- Name: idx_services_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_institutions_id_institution ON public.services_institutions USING btree (id_institution);


--
-- Name: idx_services_responsable_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_responsable_id ON public.services USING btree (responsable_id);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_stage_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_agent ON public.stage USING btree (id_agent);


--
-- Name: idx_stage_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_date ON public.stage USING btree (date_stage);


--
-- Name: idx_stage_etablissement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_etablissement ON public.stage USING btree (etablissement);


--
-- Name: idx_tiers_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_id_ministere ON public.tiers USING btree (id_ministere);


--
-- Name: idx_tiers_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_institutions_id_institution ON public.tiers_institutions USING btree (id_institution);


--
-- Name: idx_type_documents_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_documents_id_ministere ON public.type_de_documents USING btree (id_ministere);


--
-- Name: idx_type_documents_id_service_entite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_documents_id_service_entite ON public.type_de_documents USING btree (id_service_entite);


--
-- Name: idx_type_documents_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_documents_institutions_id_institution ON public.type_de_documents_institutions USING btree (id_institution);


--
-- Name: idx_type_seminaire_id_ministere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_seminaire_id_ministere ON public.type_de_seminaire_de_formation USING btree (id_ministere);


--
-- Name: idx_type_seminaire_institutions_id_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_seminaire_institutions_id_institution ON public.type_de_seminaire_de_formation_institutions USING btree (id_institution);


--
-- Name: idx_utilisateurs_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateurs_email ON public.utilisateurs USING btree (email);


--
-- Name: idx_utilisateurs_id_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateurs_id_role ON public.utilisateurs USING btree (id_role);


--
-- Name: idx_utilisateurs_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateurs_username ON public.utilisateurs USING btree (username);


--
-- Name: idx_workflow_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_date ON public.workflow_demandes USING btree (date_action);


--
-- Name: idx_workflow_demande; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_demande ON public.workflow_demandes USING btree (id_demande);


--
-- Name: idx_workflow_niveau; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_niveau ON public.workflow_demandes USING btree (niveau_validation);


--
-- Name: demandes tr_demandes_assign_hierarchy; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_demandes_assign_hierarchy AFTER INSERT ON public.demandes FOR EACH ROW EXECUTE PROCEDURE public.tr_demandes_assign_hierarchy();


--
-- Name: demandes tr_demandes_historique_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_demandes_historique_update AFTER UPDATE ON public.demandes FOR EACH ROW EXECUTE PROCEDURE public.tr_demandes_historique_update();


--
-- Name: demandes tr_demandes_update_modified; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_demandes_update_modified BEFORE UPDATE ON public.demandes FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();


--
-- Name: entites_administratives trg_validate_entity_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_entity_code BEFORE INSERT OR UPDATE ON public.entites_administratives FOR EACH ROW EXECUTE PROCEDURE public.validate_entity_code_uniqueness();


--
-- Name: entites_institutions trg_validate_institution_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_institution_code BEFORE INSERT OR UPDATE ON public.entites_institutions FOR EACH ROW EXECUTE PROCEDURE public.validate_institution_code_uniqueness();


--
-- Name: affectations_temporaires update_updated_at_affectations_temporaires; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_affectations_temporaires BEFORE UPDATE ON public.affectations_temporaires FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: affectations_temporaires_institutions update_updated_at_affectations_temporaires_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_affectations_temporaires_institutions BEFORE UPDATE ON public.affectations_temporaires_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: agents update_updated_at_agents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_agents BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: agents_entites update_updated_at_agents_entites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_agents_entites BEFORE UPDATE ON public.agents_entites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: agents_entites_institutions update_updated_at_agents_entites_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_agents_entites_institutions BEFORE UPDATE ON public.agents_entites_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: agents_institutions_main update_updated_at_agents_institutions_main; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_agents_institutions_main BEFORE UPDATE ON public.agents_institutions_main FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: autre_absences update_updated_at_autre_absences; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_autre_absences BEFORE UPDATE ON public.autre_absences FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: categories update_updated_at_categories; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: civilites update_updated_at_civilites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_civilites BEFORE UPDATE ON public.civilites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: classeurs update_updated_at_classeurs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_classeurs BEFORE UPDATE ON public.classeurs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: classeurs_institutions update_updated_at_classeurs_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_classeurs_institutions BEFORE UPDATE ON public.classeurs_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: diplomes update_updated_at_diplomes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_diplomes BEFORE UPDATE ON public.diplomes FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: distinctions update_updated_at_distinctions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_distinctions BEFORE UPDATE ON public.distinctions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: dossiers update_updated_at_dossiers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_dossiers BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: dossiers_institutions update_updated_at_dossiers_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_dossiers_institutions BEFORE UPDATE ON public.dossiers_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: echelons update_updated_at_echelons; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_echelons BEFORE UPDATE ON public.echelons FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: emplois update_updated_at_emplois; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_emplois BEFORE UPDATE ON public.emplois FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: enfants update_updated_at_enfants; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_enfants BEFORE UPDATE ON public.enfants FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: enfants_institutions update_updated_at_enfants_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_enfants_institutions BEFORE UPDATE ON public.enfants_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: entites_administratives update_updated_at_entites_administratives; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_entites_administratives BEFORE UPDATE ON public.entites_administratives FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: entites_institutions update_updated_at_entites_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_entites_institutions BEFORE UPDATE ON public.entites_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: fonctions update_updated_at_fonctions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_fonctions BEFORE UPDATE ON public.fonctions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: grades update_updated_at_grades; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_grades BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: handicaps update_updated_at_handicaps; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_handicaps BEFORE UPDATE ON public.handicaps FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: institutions update_updated_at_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_institutions BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: langues update_updated_at_langues; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_langues BEFORE UPDATE ON public.langues FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: localites update_updated_at_localites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_localites BEFORE UPDATE ON public.localites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: logiciels update_updated_at_logiciels; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_logiciels BEFORE UPDATE ON public.logiciels FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: login_attempts update_updated_at_login_attempts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_login_attempts BEFORE UPDATE ON public.login_attempts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: ministeres update_updated_at_ministeres; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_ministeres BEFORE UPDATE ON public.ministeres FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: mode_d_entrees update_updated_at_mode_d_entrees; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_mode_d_entrees BEFORE UPDATE ON public.mode_d_entrees FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: motif_de_departs update_updated_at_motif_de_departs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_motif_de_departs BEFORE UPDATE ON public.motif_de_departs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: nationalites update_updated_at_nationalites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_nationalites BEFORE UPDATE ON public.nationalites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: nature_actes update_updated_at_nature_actes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_nature_actes BEFORE UPDATE ON public.nature_actes FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: nature_d_accidents update_updated_at_nature_d_accidents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_nature_d_accidents BEFORE UPDATE ON public.nature_d_accidents FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: niveau_informatiques update_updated_at_niveau_informatiques; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_niveau_informatiques BEFORE UPDATE ON public.niveau_informatiques FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: niveau_langues update_updated_at_niveau_langues; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_niveau_langues BEFORE UPDATE ON public.niveau_langues FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: pathologies update_updated_at_pathologies; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_pathologies BEFORE UPDATE ON public.pathologies FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: pays update_updated_at_pays; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_pays BEFORE UPDATE ON public.pays FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: permissions_entites update_updated_at_permissions_entites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_permissions_entites BEFORE UPDATE ON public.permissions_entites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: permissions_entites_institutions update_updated_at_permissions_entites_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_permissions_entites_institutions BEFORE UPDATE ON public.permissions_entites_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: positions update_updated_at_positions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_positions BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: roles update_updated_at_roles; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: sanctions update_updated_at_sanctions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_sanctions BEFORE UPDATE ON public.sanctions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: services update_updated_at_services; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: services_institutions update_updated_at_services_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_services_institutions BEFORE UPDATE ON public.services_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: sessions update_updated_at_sessions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_sessions BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: sindicats update_updated_at_sindicats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_sindicats BEFORE UPDATE ON public.sindicats FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: situation_matrimonials update_updated_at_situation_matrimonials; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_situation_matrimonials BEFORE UPDATE ON public.situation_matrimonials FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: specialites update_updated_at_specialites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_specialites BEFORE UPDATE ON public.specialites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: tiers update_updated_at_tiers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_tiers BEFORE UPDATE ON public.tiers FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: tiers_institutions update_updated_at_tiers_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_tiers_institutions BEFORE UPDATE ON public.tiers_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_d_agents update_updated_at_type_d_agents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_d_agents BEFORE UPDATE ON public.type_d_agents FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_conges update_updated_at_type_de_conges; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_conges BEFORE UPDATE ON public.type_de_conges FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_couriers update_updated_at_type_de_couriers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_couriers BEFORE UPDATE ON public.type_de_couriers FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_destinations update_updated_at_type_de_destinations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_destinations BEFORE UPDATE ON public.type_de_destinations FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_documents update_updated_at_type_de_documents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_documents BEFORE UPDATE ON public.type_de_documents FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_documents_institutions update_updated_at_type_de_documents_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_documents_institutions BEFORE UPDATE ON public.type_de_documents_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_materiels update_updated_at_type_de_materiels; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_materiels BEFORE UPDATE ON public.type_de_materiels FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_retraites update_updated_at_type_de_retraites; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_retraites BEFORE UPDATE ON public.type_de_retraites FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_seminaire_de_formation update_updated_at_type_de_seminaire_de_formation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_seminaire_de_formation BEFORE UPDATE ON public.type_de_seminaire_de_formation FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_de_seminaire_de_formation_institutions update_updated_at_type_de_seminaire_de_formation_institutions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_de_seminaire_de_formation_institutions BEFORE UPDATE ON public.type_de_seminaire_de_formation_institutions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: type_etablissements update_updated_at_type_etablissements; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_type_etablissements BEFORE UPDATE ON public.type_etablissements FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: unite_administratives update_updated_at_unite_administratives; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_unite_administratives BEFORE UPDATE ON public.unite_administratives FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: utilisateurs update_updated_at_utilisateurs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_utilisateurs BEFORE UPDATE ON public.utilisateurs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: affectations_temporaires affectations_temporaires_id_entite_destination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_id_entite_destination_fkey FOREIGN KEY (id_entite_destination) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires affectations_temporaires_id_entite_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT affectations_temporaires_id_entite_source_fkey FOREIGN KEY (id_entite_source) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institution_id_entite_destination_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institution_id_entite_destination_fkey FOREIGN KEY (id_entite_destination) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: affectations_temporaires_institutions affectations_temporaires_institutions_id_entite_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT affectations_temporaires_institutions_id_entite_source_fkey FOREIGN KEY (id_entite_source) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: agent_documents agent_documents_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_documents
    ADD CONSTRAINT agent_documents_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_langue_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_langue_fkey FOREIGN KEY (id_langue) REFERENCES public.langues(id) ON DELETE CASCADE;


--
-- Name: agent_langues agent_langues_id_niveau_langue_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_langues
    ADD CONSTRAINT agent_langues_id_niveau_langue_fkey FOREIGN KEY (id_niveau_langue) REFERENCES public.niveau_langues(id) ON DELETE SET NULL;


--
-- Name: agent_logiciels agent_logiciels_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_logiciels agent_logiciels_id_logiciel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_logiciel_fkey FOREIGN KEY (id_logiciel) REFERENCES public.logiciels(id) ON DELETE CASCADE;


--
-- Name: agent_logiciels agent_logiciels_id_niveau_informatique_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_logiciels
    ADD CONSTRAINT agent_logiciels_id_niveau_informatique_fkey FOREIGN KEY (id_niveau_informatique) REFERENCES public.niveau_informatiques(id) ON DELETE SET NULL;


--
-- Name: agent_photos agent_photos_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_photos
    ADD CONSTRAINT agent_photos_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_entites agents_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT agents_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: agents_entites_institutions agents_entites_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT agents_entites_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: agents agents_id_civilite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_civilite_fkey FOREIGN KEY (id_civilite) REFERENCES public.civilites(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_entite_principale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_entite_principale_fkey FOREIGN KEY (id_entite_principale) REFERENCES public.entites_administratives(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_nationalite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_nationalite_fkey FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_situation_matrimoniale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_situation_matrimoniale_fkey FOREIGN KEY (id_situation_matrimoniale) REFERENCES public.situation_matrimonials(id) ON DELETE SET NULL;


--
-- Name: agents agents_id_type_d_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_id_type_d_agent_fkey FOREIGN KEY (id_type_d_agent) REFERENCES public.type_d_agents(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_civilite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_civilite_fkey FOREIGN KEY (id_civilite) REFERENCES public.civilites(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_entite_principale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_entite_principale_fkey FOREIGN KEY (id_entite_principale) REFERENCES public.entites_institutions(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_nationalite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_nationalite_fkey FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_situation_matrimoniale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_situation_matrimoniale_fkey FOREIGN KEY (id_situation_matrimoniale) REFERENCES public.situation_matrimonials(id) ON DELETE SET NULL;


--
-- Name: agents_institutions_main agents_institutions_main_id_type_d_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_institutions_main
    ADD CONSTRAINT agents_institutions_main_id_type_d_agent_fkey FOREIGN KEY (id_type_d_agent) REFERENCES public.type_d_agents(id) ON DELETE SET NULL;


--
-- Name: classeurs classeurs_id_dossier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_dossier_fkey FOREIGN KEY (id_dossier) REFERENCES public.dossiers(id) ON DELETE CASCADE;


--
-- Name: classeurs classeurs_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs
    ADD CONSTRAINT classeurs_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: classeurs_institutions classeurs_institutions_id_dossier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_dossier_fkey FOREIGN KEY (id_dossier) REFERENCES public.dossiers_institutions(id) ON DELETE CASCADE;


--
-- Name: classeurs_institutions classeurs_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classeurs_institutions
    ADD CONSTRAINT classeurs_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: departements departements_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT departements_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: documents_autorisation documents_autorisation_id_agent_destinataire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_destinataire_fkey FOREIGN KEY (id_agent_destinataire) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_agent_generateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_generateur_fkey FOREIGN KEY (id_agent_generateur) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_agent_transmetteur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_agent_transmetteur_fkey FOREIGN KEY (id_agent_transmetteur) REFERENCES public.agents(id);


--
-- Name: documents_autorisation documents_autorisation_id_demande_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_autorisation
    ADD CONSTRAINT documents_autorisation_id_demande_fkey FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: dossiers dossiers_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: dossiers dossiers_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers
    ADD CONSTRAINT dossiers_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: dossiers_institutions dossiers_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: dossiers_institutions dossiers_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dossiers_institutions
    ADD CONSTRAINT dossiers_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: enfants enfants_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants
    ADD CONSTRAINT enfants_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: enfants_institutions enfants_institutions_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enfants_institutions
    ADD CONSTRAINT enfants_institutions_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: entites_administratives entites_administratives_id_entite_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_entite_parent_fkey FOREIGN KEY (id_entite_parent) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: entites_administratives entites_administratives_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: entites_administratives entites_administratives_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT entites_administratives_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: entites_institutions entites_institutions_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: entites_institutions entites_institutions_id_entite_parent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_entite_parent_fkey FOREIGN KEY (id_entite_parent) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: entites_institutions entites_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: entites_institutions entites_institutions_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: entites_institutions entites_institutions_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT entites_institutions_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: etude_diplome etude_diplome_id_agent_document_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_id_agent_document_fkey FOREIGN KEY (id_agent_document) REFERENCES public.agent_documents(id) ON DELETE SET NULL;


--
-- Name: etude_diplome etude_diplome_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etude_diplome
    ADD CONSTRAINT etude_diplome_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: affectations_temporaires fk_affectations_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires
    ADD CONSTRAINT fk_affectations_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: affectations_temporaires_institutions fk_affectations_institutions_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affectations_temporaires_institutions
    ADD CONSTRAINT fk_affectations_institutions_agent FOREIGN KEY (id_agent) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: agent_login_codes fk_agent_login_codes_agent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_login_codes
    ADD CONSTRAINT fk_agent_login_codes_agent_id FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_entites fk_agents_entites_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites
    ADD CONSTRAINT fk_agents_entites_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents_entites_institutions fk_agents_entites_institutions_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents_entites_institutions
    ADD CONSTRAINT fk_agents_entites_institutions_agent FOREIGN KEY (id_agent_institution) REFERENCES public.agents_institutions_main(id) ON DELETE CASCADE;


--
-- Name: agents fk_agents_id_autre_absence; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_autre_absence FOREIGN KEY (id_autre_absence) REFERENCES public.autre_absences(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_categorie; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_categorie FOREIGN KEY (id_categorie) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_diplome; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_diplome FOREIGN KEY (id_diplome) REFERENCES public.diplomes(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_distinction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_distinction FOREIGN KEY (id_distinction) REFERENCES public.distinctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_echelon; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_echelon FOREIGN KEY (id_echelon) REFERENCES public.echelons(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_emploi; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_emploi FOREIGN KEY (id_emploi) REFERENCES public.emplois(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_fonction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_fonction FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_grade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_grade FOREIGN KEY (id_grade) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_handicap; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_handicap FOREIGN KEY (id_handicap) REFERENCES public.handicaps(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_langue; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_langue FOREIGN KEY (id_langue) REFERENCES public.langues(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_localite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_localite FOREIGN KEY (id_localite) REFERENCES public.localites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_logiciel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_logiciel FOREIGN KEY (id_logiciel) REFERENCES public.logiciels(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_mode_entree; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_mode_entree FOREIGN KEY (id_mode_entree) REFERENCES public.mode_d_entrees(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_motif_depart; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_motif_depart FOREIGN KEY (id_motif_depart) REFERENCES public.motif_de_departs(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_nature_accident; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_nature_accident FOREIGN KEY (id_nature_accident) REFERENCES public.nature_d_accidents(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_nature_acte; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_nature_acte FOREIGN KEY (id_nature_acte) REFERENCES public.nature_actes(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_niveau_informatique; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_niveau_informatique FOREIGN KEY (id_niveau_informatique) REFERENCES public.niveau_informatiques(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_niveau_langue; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_niveau_langue FOREIGN KEY (id_niveau_langue) REFERENCES public.niveau_langues(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_pathologie; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_pathologie FOREIGN KEY (id_pathologie) REFERENCES public.pathologies(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_pays; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_pays FOREIGN KEY (id_pays) REFERENCES public.pays(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_position; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_position FOREIGN KEY (id_position) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_sanction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_sanction FOREIGN KEY (id_sanction) REFERENCES public.sanctions(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_sindicat; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_sindicat FOREIGN KEY (id_sindicat) REFERENCES public.sindicats(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_specialite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_specialite FOREIGN KEY (id_specialite) REFERENCES public.specialites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_conge; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_conge FOREIGN KEY (id_type_conge) REFERENCES public.type_de_conges(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_courrier; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_courrier FOREIGN KEY (id_type_courrier) REFERENCES public.type_de_couriers(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_destination; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_destination FOREIGN KEY (id_type_destination) REFERENCES public.type_de_destinations(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_etablissement; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_etablissement FOREIGN KEY (id_type_etablissement) REFERENCES public.type_etablissements(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_materiel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_materiel FOREIGN KEY (id_type_materiel) REFERENCES public.type_de_materiels(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_type_retraite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_type_retraite FOREIGN KEY (id_type_retraite) REFERENCES public.type_de_retraites(id) ON DELETE SET NULL;


--
-- Name: agents fk_agents_id_unite_administrative; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT fk_agents_id_unite_administrative FOREIGN KEY (id_unite_administrative) REFERENCES public.unite_administratives(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: demandes fk_demandes_chef_service; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_chef_service FOREIGN KEY (id_chef_service) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_created_by FOREIGN KEY (created_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_directeur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_directeur FOREIGN KEY (id_directeur) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_drh; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_drh FOREIGN KEY (id_drh) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_ministre; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_ministre FOREIGN KEY (id_ministre) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes fk_demandes_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT fk_demandes_updated_by FOREIGN KEY (updated_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: emploi_agents fk_emploi_agents_id_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: emploi_agents fk_emploi_agents_id_emploi; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_emploi FOREIGN KEY (id_emploi) REFERENCES public.emplois(id) ON DELETE SET NULL;


--
-- Name: emploi_agents fk_emploi_agents_id_nomination; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emploi_agents
    ADD CONSTRAINT fk_emploi_agents_id_nomination FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: entites_institutions fk_entites_institutions_responsable; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_institutions
    ADD CONSTRAINT fk_entites_institutions_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents_institutions_main(id) ON DELETE SET NULL;


--
-- Name: entites_administratives fk_entites_responsable; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entites_administratives
    ADD CONSTRAINT fk_entites_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: fonction_agents fk_fonction_agents_id_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_agent FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: fonction_agents fk_fonction_agents_id_fonction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_fonction FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: fonction_agents fk_fonction_agents_id_nomination; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonction_agents
    ADD CONSTRAINT fk_fonction_agents_id_nomination FOREIGN KEY (id_nomination) REFERENCES public.nominations(id) ON DELETE CASCADE;


--
-- Name: demandes_historique fk_historique_demande; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT fk_historique_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: demandes_historique fk_historique_modifie_par; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_historique
    ADD CONSTRAINT fk_historique_modifie_par FOREIGN KEY (modifie_par) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: notifications_demandes fk_notifications_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT fk_notifications_agent FOREIGN KEY (id_agent_destinataire) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: notifications_demandes fk_notifications_demande; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications_demandes
    ADD CONSTRAINT fk_notifications_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: pays fk_pays_nationalite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT fk_pays_nationalite FOREIGN KEY (id_nationalite) REFERENCES public.nationalites(id) ON DELETE SET NULL;


--
-- Name: permissions_entites_institutions fk_permissions_entites_institutions_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT fk_permissions_entites_institutions_role FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: permissions_entites fk_permissions_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT fk_permissions_role FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: services fk_services_responsable; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_responsable FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: workflow_demandes fk_workflow_demande; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT fk_workflow_demande FOREIGN KEY (id_demande) REFERENCES public.demandes(id) ON DELETE CASCADE;


--
-- Name: workflow_demandes fk_workflow_validateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_demandes
    ADD CONSTRAINT fk_workflow_validateur FOREIGN KEY (id_validateur) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: grades grades_id_categorie_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_id_categorie_fkey FOREIGN KEY (id_categorie) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: institutions institutions_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: institutions institutions_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: institutions institutions_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: localites localites_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localites
    ADD CONSTRAINT localites_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: ministeres ministeres_id_departement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_departement_fkey FOREIGN KEY (id_departement) REFERENCES public.departements(id);


--
-- Name: ministeres ministeres_id_localite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_localite_fkey FOREIGN KEY (id_localite) REFERENCES public.localites(id);


--
-- Name: ministeres ministeres_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regions(id);


--
-- Name: ministeres ministeres_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ministeres
    ADD CONSTRAINT ministeres_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.agents(id);


--
-- Name: nominations nominations_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nominations
    ADD CONSTRAINT nominations_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: permissions_entites permissions_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites
    ADD CONSTRAINT permissions_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: permissions_entites_institutions permissions_entites_institutions_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions_entites_institutions
    ADD CONSTRAINT permissions_entites_institutions_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_institutions(id) ON DELETE CASCADE;


--
-- Name: seminaire_participants seminaire_participants_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: seminaire_participants seminaire_participants_id_seminaire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seminaire_participants
    ADD CONSTRAINT seminaire_participants_id_seminaire_fkey FOREIGN KEY (id_seminaire) REFERENCES public.seminaire_formation(id) ON DELETE CASCADE;


--
-- Name: services_entites services_entites_id_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_entites
    ADD CONSTRAINT services_entites_id_entite_fkey FOREIGN KEY (id_entite) REFERENCES public.entites_administratives(id) ON DELETE CASCADE;


--
-- Name: services services_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: services_institutions services_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services_institutions
    ADD CONSTRAINT services_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_id_utilisateur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: stage stage_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage
    ADD CONSTRAINT stage_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: tiers tiers_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT tiers_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: tiers_institutions tiers_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers_institutions
    ADD CONSTRAINT tiers_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: type_de_documents type_de_documents_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: type_de_documents type_de_documents_id_service_entite_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_service_entite_fkey FOREIGN KEY (id_service_entite) REFERENCES public.services_entites(id) ON DELETE SET NULL;


--
-- Name: type_de_documents type_de_documents_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents
    ADD CONSTRAINT type_de_documents_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: type_de_documents_institutions type_de_documents_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: type_de_documents_institutions type_de_documents_institutions_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_documents_institutions
    ADD CONSTRAINT type_de_documents_institutions_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services_institutions(id) ON DELETE SET NULL;


--
-- Name: type_de_seminaire_de_formation type_de_seminaire_de_formation_id_ministere_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation
    ADD CONSTRAINT type_de_seminaire_de_formation_id_ministere_fkey FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- Name: type_de_seminaire_de_formation_institutions type_de_seminaire_de_formation_institutions_id_institution_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_de_seminaire_de_formation_institutions
    ADD CONSTRAINT type_de_seminaire_de_formation_institutions_id_institution_fkey FOREIGN KEY (id_institution) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: unite_administratives unite_administratives_id_fonction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unite_administratives
    ADD CONSTRAINT unite_administratives_id_fonction_fkey FOREIGN KEY (id_fonction) REFERENCES public.fonctions(id) ON DELETE SET NULL;


--
-- Name: utilisateurs utilisateurs_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: utilisateurs utilisateurs_id_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_id_role_fkey FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--
