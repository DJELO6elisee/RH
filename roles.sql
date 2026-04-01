--
-- PostgreSQL database dump
--

\restrict 5fWCVHlli28uHH3KWhGXvI7y7bMeOunof2pEw5OXEBMF37ogXWkz5efGoUpzQSH

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
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: isegroup_tourisme
--

INSERT INTO public.roles VALUES (1, 'super_admin', 'Super administrateur avec accès complet à tous les ministères', '{"all": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles VALUES (3, 'agent', 'Agent avec accès limité à ses propres données', '{"profile": true, "documents": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles VALUES (4, 'admin_entite', 'Administrateur d''entité avec accès à son entité', '{"entite": true, "agents_entite": true, "reports_entite": true}', '2025-09-09 11:37:53.960682', '2025-09-09 11:37:53.960682');
INSERT INTO public.roles VALUES (6, 'drh', 'Directeur des ressources humaines avec accès à son ministère et entités', '{"agents": true, "entites": true, "reports": true, "ministere": true}', '2025-09-10 22:31:55.068967', '2025-09-10 22:31:55.068967');
INSERT INTO public.roles VALUES (9, 'chef_service', 'Chef de Service', '{}', '2025-10-06 05:56:50.86962', '2025-10-06 05:56:50.86962');
INSERT INTO public.roles VALUES (10, 'directeur', 'Directeur avec accès complet à la gestion de sa direction', '{"direction": true, "validations": true, "all_demandes": true, "agents_direction": true, "reports_direction": true}', '2025-10-12 20:38:23.822923', '2025-10-12 20:38:23.822923');
INSERT INTO public.roles VALUES (11, 'sous_directeur', 'Sous-directeur avec accès à la gestion de sa sous-direction', '{"validations": true, "sous_direction": true, "agents_sous_direction": true, "reports_sous_direction": true}', '2025-10-12 20:38:23.86946', '2025-10-12 20:38:23.86946');
INSERT INTO public.roles VALUES (12, 'dir_cabinet', 'Directeur de cabinet avec accès stratégique et de supervision', '{"cabinet": true, "supervision": true, "all_directions": true, "reports_cabinet": true, "validations_cabinet": true}', '2025-10-12 20:38:23.872293', '2025-10-12 20:38:23.872293');
INSERT INTO public.roles VALUES (13, 'chef_cabinet', 'Chef de Cabinet avec accès stratégique et de coordination', '{"reports": true, "validations": true, "coordination": true, "gestion_cabinet": true, "acces_directions": true}', '2025-10-13 00:50:13.434885', '2025-10-13 00:50:13.434885');
INSERT INTO public.roles VALUES (14, 'directeur_general', 'Directeur Général avec accès complet à l''organisation', '{"reports": true, "demandes": true, "acces_total": true, "supervision": true, "validations": true, "gestion_generale": true}', '2025-10-13 00:50:13.434885', '2025-10-13 00:50:13.434885');
INSERT INTO public.roles VALUES (15, 'directeur_central', 'Directeur Central avec accès à la gestion centralisée', '{"reports": true, "demandes": true, "validations": true, "coordination": true, "acces_central": true, "gestion_centrale": true}', '2025-10-13 00:50:13.434885', '2025-10-13 00:50:13.434885');
INSERT INTO public.roles VALUES (16, 'ministre', 'Ministre avec accès complet et pouvoir de validation final', '{"reports": true, "demandes": true, "acces_total": true, "supervision": true, "validations": true, "gestion_ministere": true, "validation_finale": true}', '2025-11-21 13:04:22.974735', '2025-11-21 13:04:22.974735');
INSERT INTO public.roles VALUES (2, 'DRH', 'Directeur des Ressources Humaines', '["read", "write", "delete", "manage_agents", "manage_grades", "manage_services", "manage_fonctions", "view_reports", "manage_organization"]', '2025-09-09 11:37:53.960682', '2025-12-05 14:02:08.337563');
INSERT INTO public.roles VALUES (21, 'inspecteur_general', 'Inspecteur général avec missions de contrôle et d''inspection', '{"reports": true, "controle": true, "inspection": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (22, 'conseiller_technique', 'Conseiller technique avec accès aux études et recommandations', '{"conseil": true, "reports": true, "documents": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (23, 'charge_d_etude', 'Chargé d''étude avec accès aux dossiers et analyses', '{"etudes": true, "profile": true, "documents": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (24, 'charge_de_mission', 'Chargé de mission avec accès aux missions et suivi', '{"profile": true, "missions": true, "documents": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (25, 'chef_du_secretariat_particulier', 'Chef du secrétariat particulier avec gestion du cabinet', '{"cabinet": true, "documents": true, "secretariat": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (26, 'directeur_service_exterieur', 'Directeur de service extérieur avec gestion des services déconcentrés', '{"reports": true, "direction": true, "validations": true, "service_exterieur": true}', '2026-02-25 12:44:15.240179', '2026-02-25 12:44:15.240179');
INSERT INTO public.roles VALUES (27, 'gestionnaire_du_patrimoine', 'Gestionnaire du patrimoine avec accès à la gestion des actifs et biens', '{"patrimoine": true, "documents": true, "reports": true}', '2026-03-07 00:00:00', '2026-03-07 00:00:00');
INSERT INTO public.roles VALUES (28, 'president_du_fond', 'Président du fond avec accès à la supervision et validation des opérations', '{"fond": true, "supervision": true, "validations": true, "reports": true}', '2026-03-07 00:00:00', '2026-03-07 00:00:00');
INSERT INTO public.roles VALUES (29, 'responsble_cellule_de_passation', 'Responsable de la cellule de passation avec accès aux dossiers de passation', '{"passation": true, "documents": true, "validations": true, "reports": true}', '2026-03-07 00:00:00', '2026-03-07 00:00:00');


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: isegroup_tourisme
--

SELECT pg_catalog.setval('public.roles_id_seq', 29, true);


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
-- Name: roles update_updated_at_roles; Type: TRIGGER; Schema: public; Owner: isegroup_tourisme
--

CREATE TRIGGER update_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- PostgreSQL database dump complete
--

\unrestrict 5fWCVHlli28uHH3KWhGXvI7y7bMeOunof2pEw5OXEBMF37ogXWkz5efGoUpzQSH
