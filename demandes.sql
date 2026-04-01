--
-- PostgreSQL database dump
--

\restrict WaGX9SNofuQOP7YfnRoGlahmAIRqom4byxFyvLsQoHcp5qTHudiLwZPG5KN10dT

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    niveau_evolution_demande character varying(255) DEFAULT 'soumis'::character varying,
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
    niveau_actuel character varying(50) DEFAULT 'chef_service'::character varying,
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
    statut_directeur_service_exterieur character varying(50) DEFAULT 'en_attente'::character varying,
    date_validation_directeur_service_exterieur timestamp without time zone,
    commentaire_directeur_service_exterieur text,
    id_validateur_directeur_service_exterieur integer,
    CONSTRAINT demandes_niveau_actuel_check CHECK (((niveau_actuel)::text = ANY (ARRAY['soumis'::text, 'chef_service'::text, 'sous_directeur'::text, 'directeur'::text, 'drh'::text, 'dir_cabinet'::text, 'chef_cabinet'::text, 'directeur_central'::text, 'directeur_general'::text, 'directeur_service_exterieur'::text, 'ministre'::text, 'finalise'::text, 'rejete'::text]))),
    CONSTRAINT demandes_niveau_evolution_demande_check CHECK (((niveau_evolution_demande)::text = ANY (ARRAY['soumis'::text, 'valide_par_superieur'::text, 'valide_par_chef_service'::text, 'valide_par_sous_directeur'::text, 'valide_par_directeur'::text, 'valide_par_drh'::text, 'valide_par_dir_cabinet'::text, 'valide_par_chef_cabinet'::text, 'valide_par_directeur_central'::text, 'valide_par_directeur_general'::text, 'valide_par_ministre'::text, 'valide_par_directeur_service_exterieur'::text, 'retour_ministre'::text, 'retour_directeur_general'::text, 'retour_directeur_central'::text, 'retour_chef_cabinet'::text, 'retour_dir_cabinet'::text, 'retour_drh'::text, 'retour_directeur'::text, 'retour_sous_directeur'::text, 'retour_chef_service'::text, 'finalise'::text, 'rejete'::text, 'rejete_par_chef_service'::text, 'rejete_par_sous_directeur'::text, 'rejete_par_directeur'::text, 'rejete_par_drh'::text, 'rejete_par_dir_cabinet'::text, 'rejete_par_chef_cabinet'::text, 'rejete_par_directeur_central'::text, 'rejete_par_directeur_general'::text, 'rejete_par_ministre'::text, 'rejete_par_directeur_service_exterieur'::text]))),
    CONSTRAINT demandes_phase_actuelle_check CHECK (((phase_actuelle)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_phase_check CHECK (((phase)::text = ANY (ARRAY[('aller'::character varying)::text, ('retour'::character varying)::text]))),
    CONSTRAINT demandes_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('normale'::character varying)::text, ('urgente'::character varying)::text, ('critique'::character varying)::text]))),
    CONSTRAINT demandes_status_check CHECK (((status)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_chef_service_check CHECK (((statut_chef_service)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_directeur_check CHECK (((statut_directeur)::text = ANY (ARRAY[('en_attente'::character varying)::text, ('approuve'::character varying)::text, ('rejete'::character varying)::text]))),
    CONSTRAINT demandes_statut_directeur_service_exterieur_check CHECK (((statut_directeur_service_exterieur)::text = ANY (ARRAY['en_attente'::text, 'approuve'::text, 'rejete'::text]))),
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
-- Name: demandes id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes ALTER COLUMN id SET DEFAULT nextval('public.demandes_id_seq'::regclass);


--
-- Data for Name: demandes; Type: TABLE DATA; Schema: public; Owner: isegroup_tourisme
--

INSERT INTO public.demandes VALUES (241, 1811, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'directeur', 'normale', '2026-03-18 08:27:27.927292', '2026-03-18 08:27:27.927292', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (225, 1819, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-05 05:57:41.107506', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-05 05:57:06.55425', '2026-03-05 05:57:41.114822', NULL, '[]', 946, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:57:18.571396', '', 1883, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (220, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_chef_cabinet', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2026-03-05 05:25:27.176527', '2026-03-05 05:26:58.252001', NULL, '[]', 939, 1010, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:26:58.247315', '', 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (231, 1082, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-05', '2026-03-05', 'Service', 'en_attente', 'valide_par_dir_cabinet', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'dir_cabinet', 'normale', '2026-03-05 06:55:14.736972', '2026-03-05 06:55:14.736972', NULL, '[]', 409, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 995, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (250, 1824, 'certificat_reprise_service', 'Demande de certificat de reprise de service', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 05:40:48.651534', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 05:40:10.731203', '2026-03-23 05:40:48.669177', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 05:40:25.694509', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-29', '2026-03-24', NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (228, 1883, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_ministre', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'approuve', NULL, NULL, NULL, '2026-03-05 06:57:50.391317', NULL, NULL, NULL, '', 'finalise', 'normale', '2026-03-05 06:53:47.846738', '2026-03-05 06:57:50.408684', NULL, '[]', 1010, 939, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (253, 1824, 'certificat_reprise_service', 'Demande de certificat de reprise de service', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 09:01:25.018268', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 09:00:04.564969', '2026-03-23 09:01:25.117448', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 09:00:47.053193', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-29', '2026-03-24', NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (244, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 10:02:51.189065', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 08:58:55.728916', '2026-03-18 10:02:51.194173', NULL, '[]', 939, 947, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (232, 1821, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, 1811, 'en_attente', 'approuve', 'en_attente', 'approuve', NULL, '2026-03-05 07:17:49.457295', NULL, '2026-03-05 07:17:02.870254', NULL, '', NULL, '', 'finalise', 'normale', '2026-03-05 07:15:22.524672', '2026-03-05 07:17:49.467647', NULL, '[]', 948, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (233, 1852, 'absence', 'voyage en famille', '2026-03-18', '2026-03-20', 'Bouake', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normale', '2026-03-17 10:28:27.404099', '2026-03-17 10:28:27.404099', NULL, '[]', 983, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (234, 1873, 'absence', 'voyage en famille', '2026-03-18', '2026-03-20', 'Abengourou', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normale', '2026-03-17 10:35:54.879426', '2026-03-17 10:35:54.879426', NULL, '[]', 1000, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (235, 1811, 'absence', 'voyage en famille', '2026-03-19', '2026-03-21', 'Bouake', 'en_attente', 'valide_par_chef_cabinet', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'chef_cabinet', 'normale', '2026-03-18 07:24:44.259547', '2026-03-18 07:24:44.259547', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (238, 1811, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'drh', 'normale', '2026-03-18 07:52:17.109708', '2026-03-18 07:52:17.109708', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (258, 1824, 'absence', 'voyage famille', '2026-03-24', '2026-03-29', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:25:05.078676', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:24:31.744217', '2026-03-24 06:25:06.176361', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:24:49.90997', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (247, 1824, 'absence', 'voyage famille', '2026-03-24', '2026-03-27', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 04:30:24.010192', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 04:29:44.299471', '2026-03-23 04:30:24.228024', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 04:30:05.336427', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 24, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (223, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-05 05:51:20.258646', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-05 05:50:31.396024', '2026-03-05 05:51:20.279211', NULL, '[]', 939, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:50:48.187391', '', 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (262, 1824, 'certificat_cessation', 'congé annuel - 5 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:45:21.749028', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:44:18.311311', '2026-03-24 06:45:21.945024', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:45:05.234111', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 5, NULL, 16, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (265, 1824, 'certificat_reprise_service', 'Demande de certificat de reprise de service', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 07:14:06.660051', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 07:13:03.506337', '2026-03-24 07:14:06.690618', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 07:13:32.240365', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-30', NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (224, 1819, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-05 05:52:48.467988', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-05 05:52:10.185058', '2026-03-05 05:52:48.476219', NULL, '[]', 946, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:52:24.44318', '', 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (226, 1819, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-05 06:00:06.927732', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-05 05:59:22.359545', '2026-03-05 06:00:06.948449', NULL, '[]', 946, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:59:36.431951', '', 1883, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (254, 1824, 'absence', 'voyage en famille', '2026-03-23', '2026-03-27', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 10:23:24.229224', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 10:22:28.089736', '2026-03-23 10:23:24.595822', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 10:23:02.931568', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (242, 1811, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 10:02:26.609334', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 08:46:49.209211', '2026-03-18 10:02:26.620162', NULL, '[]', 939, 947, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (245, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 10:02:57.597996', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 09:02:54.256481', '2026-03-18 10:02:57.603978', NULL, '[]', 939, 947, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (229, 1821, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'approuve', NULL, '2026-03-05 07:10:50.244754', NULL, '2026-03-05 07:04:24.929501', NULL, '', NULL, '', 'finalise', 'normale', '2026-03-05 06:54:28.303966', '2026-03-05 07:10:50.519212', NULL, '[]', 948, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (221, 1819, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_chef_cabinet', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2026-03-05 05:25:46.675538', '2026-03-05 05:27:04.500455', NULL, '[]', 946, 1010, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:27:04.493064', '', 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (236, 1811, 'absence', 'voyage au village', '2026-03-19', '2026-03-22', 'Bouake', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normale', '2026-03-18 07:39:15.845078', '2026-03-18 07:39:15.845078', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (256, 1824, 'absence', 'voyage en famille', '2026-03-25', '2026-03-28', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:12:17.435205', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:11:43.485853', '2026-03-24 06:12:17.985689', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:11:58.346327', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 12, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (239, 1824, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 08:25:19.787219', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 07:54:31.956421', '2026-03-18 08:25:19.800136', NULL, '[]', 951, 947, 'aller', 'aller', 'approuve', '2026-03-18 07:54:59.527801', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (260, 1824, 'certificat_cessation', 'congé annuel - 10 jour(s)', NULL, NULL, NULL, 'rejete', 'rejete_par_sous_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2026-03-24 06:27:34.625315', '2026-03-24 06:28:20.085746', NULL, '[]', 951, 939, 'aller', 'retour', 'rejete', '2026-03-24 06:28:20.070933', 'pas bon', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 10, NULL, NULL, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (251, 1824, 'certificat_cessation', 'congé de paternité - 30 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 08:58:07.597204', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 08:56:38.192509', '2026-03-23 08:58:07.638677', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 08:57:36.098147', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé de paternité', '2026-03-24', 'congé de paternité', 30, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (248, 1824, 'certificat_reprise_service', 'Demande de certificat de reprise de service', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 04:32:12.925983', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 04:31:32.563725', '2026-03-23 04:32:12.969837', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 04:31:44.966507', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-29', '2026-03-24', NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (259, 1824, 'certificat_cessation', 'congé annuel - 5 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:28:39.475273', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:27:12.435237', '2026-03-24 06:28:39.739402', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:27:58.013408', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 5, NULL, 26, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (266, 1824, 'certificat_cessation', 'congé annuel - 5 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 08:16:38.734828', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 08:15:59.544288', '2026-03-24 08:16:38.84098', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 08:16:14.619834', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 5, NULL, 10, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (263, 1824, 'absence', 'voyage a soubre', '2026-03-24', '2026-03-28', 'abidjan', 'rejete', 'rejete_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'rejete', 'en_attente', 'en_attente', NULL, '2026-03-24 07:07:56.060574', NULL, NULL, NULL, 'pas bon', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:56:23.104274', '2026-03-24 07:07:56.06493', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 07:07:30.191681', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (252, 1824, 'certificat_cessation', 'congé annuel - 9 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 08:58:53.448003', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 08:57:13.930224', '2026-03-23 08:58:53.58652', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 08:57:42.549745', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 9, NULL, 1, NULL, NULL, NULL, 2024, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (243, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 10:02:43.225478', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 08:55:25.052366', '2026-03-18 10:02:43.255816', NULL, '[]', 939, 947, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (267, 1824, 'certificat_reprise_service', 'Demande de certificat de reprise de service', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 08:17:36.93083', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 08:17:08.933269', '2026-03-24 08:17:36.952381', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 08:17:20.279124', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27', NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (222, 1811, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_chef_cabinet', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'finalise', 'normale', '2026-03-05 05:46:44.557037', '2026-03-05 05:47:02.869364', NULL, '[]', 939, 1010, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 05:47:02.856899', '', 979, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (227, 1819, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-05 06:02:21.106729', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-05 06:01:34.325407', '2026-03-05 06:02:21.11818', NULL, '[]', 946, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approuve', '2026-03-05 06:01:46.646209', '', 1883, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (255, 1824, 'absence', 'voyage famille', '2026-03-23', '2026-03-26', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 10:31:54.604656', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 10:31:26.858094', '2026-03-23 10:31:54.750771', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 10:31:40.093936', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 15, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (261, 1824, 'certificat_cessation', 'congé annuel - 5 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:42:03.046568', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:37:33.061334', '2026-03-24 06:42:03.805626', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:41:46.565366', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-24', 'congé annuel', 5, NULL, 21, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (230, 995, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-05', '2026-03-05', 'Service', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'approuve', NULL, '2026-03-05 07:17:35.019935', NULL, '2026-03-05 07:12:48.893936', NULL, '', NULL, '', 'finalise', 'normale', '2026-03-05 06:54:48.164902', '2026-03-05 07:17:35.027214', NULL, '[]', 191, 409, 'aller', 'retour', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (237, 1811, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'directeur', 'normale', '2026-03-18 07:44:27.201545', '2026-03-18 07:44:27.201545', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (257, 1824, 'absence', 'voyage en famille', '2026-03-24', '2026-03-28', 'abidjan', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 06:17:08.267729', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 06:16:34.385975', '2026-03-24 06:17:08.473765', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 06:16:46.992011', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, NULL, NULL, 2025, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (240, 1824, 'attestation_travail', 'Demande d''attestation de travail', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'valide_par_directeur', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'approuve', 'en_attente', NULL, NULL, '2026-03-18 08:25:25.902987', NULL, NULL, NULL, '', NULL, 'drh', 'normale', '2026-03-18 08:24:27.410128', '2026-03-18 08:25:25.920191', NULL, '[]', 951, 947, 'aller', 'aller', 'approuve', '2026-03-18 08:24:46.564672', '', 1114, 1820, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (246, 1811, 'attestation_presence', 'Demande d''attestation de présence', '2026-03-18', '2026-03-18', 'Service', 'en_attente', 'soumis', NULL, NULL, NULL, NULL, 'en_attente', 'en_attente', 'en_attente', 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'directeur_central', 'normale', '2026-03-18 09:22:01.596278', '2026-03-18 09:22:01.596278', NULL, '[]', 939, NULL, 'aller', 'aller', NULL, NULL, NULL, NULL, 1108, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (249, 1824, 'certificat_cessation', 'congé annuel - 10 jour(s)', NULL, NULL, NULL, 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-23 05:38:33.692006', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-23 05:37:47.164446', '2026-03-23 05:38:33.795123', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-23 05:38:00.544301', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'congé annuel', '2026-03-25', 'congé annuel', 10, NULL, 10, NULL, NULL, NULL, 2024, 'en_attente', NULL, NULL, NULL);
INSERT INTO public.demandes VALUES (264, 1824, 'sortie_territoire', 'Déplacement a l''étranger pour formation', '2026-03-24', '2026-05-25', 'paris', 'approuve', 'valide_par_drh', NULL, NULL, NULL, NULL, 'en_attente', 'approuve', 'en_attente', 'en_attente', NULL, '2026-03-24 07:08:10.914803', NULL, NULL, NULL, '', NULL, NULL, 'finalise', 'normale', '2026-03-24 07:07:10.666042', '2026-03-24 07:08:10.946431', NULL, '[]', 951, 409, 'aller', 'retour', 'approuve', '2026-03-24 07:07:24.496649', '', 1097, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'en_attente', NULL, NULL, NULL);


--
-- Name: demandes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: isegroup_tourisme
--

SELECT pg_catalog.setval('public.demandes_id_seq', 267, true);


--
-- Name: demandes demandes_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_pkey PRIMARY KEY (id);


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
-- Name: demandes demandes_id_validateur_directeur_service_exterieur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_directeur_service_exterieur_fkey FOREIGN KEY (id_validateur_directeur_service_exterieur) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: demandes demandes_id_validateur_sous_directeur_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.demandes
    ADD CONSTRAINT demandes_id_validateur_sous_directeur_fkey FOREIGN KEY (id_validateur_sous_directeur) REFERENCES public.agents(id) ON DELETE SET NULL;


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
-- PostgreSQL database dump complete
--

\unrestrict WaGX9SNofuQOP7YfnRoGlahmAIRqom4byxFyvLsQoHcp5qTHudiLwZPG5KN10dT
