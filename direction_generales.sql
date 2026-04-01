--
-- PostgreSQL database dump
--

\restrict zwpO0RyuxD2CrLds9vD2wbFNODu3haa7RGVrIwE9XailEAqlHLmpRGLSMuEZ2Gq

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
-- Name: direction_generale id; Type: DEFAULT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale ALTER COLUMN id SET DEFAULT nextval('public.direction_generale_id_seq'::regclass);


--
-- Data for Name: direction_generale; Type: TABLE DATA; Schema: public; Owner: isegroup_tourisme
--

INSERT INTO public.direction_generale VALUES (28, 1, 'CABINET', true, '2025-11-03 11:58:37.560369', '2025-11-03 11:58:37.560369');
INSERT INTO public.direction_generale VALUES (30, 1, 'DIRECTION GENERALE DES LOISIRS', true, '2025-11-03 11:58:37.560369', '2025-11-03 11:58:37.560369');
INSERT INTO public.direction_generale VALUES (29, 1, 'DIRECTION GENERALE DE L''INDUSTRIE TOURISTIQUE ET HOTELIERE', true, '2025-11-03 11:58:37.560369', '2026-02-18 17:37:52.511945');
INSERT INTO public.direction_generale VALUES (51, 1, 'INSPECTION GENERALE DU TOURISME ET DES LOISIRS', true, '2026-02-25 12:49:34.60417', '2026-02-25 12:49:34.60417');


--
-- Name: direction_generale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: isegroup_tourisme
--

SELECT pg_catalog.setval('public.direction_generale_id_seq', 51, true);


--
-- Name: direction_generale direction_generale_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale
    ADD CONSTRAINT direction_generale_pkey PRIMARY KEY (id);


--
-- Name: direction_generale fk_direction_generale_id_ministere; Type: FK CONSTRAINT; Schema: public; Owner: isegroup_tourisme
--

ALTER TABLE ONLY public.direction_generale
    ADD CONSTRAINT fk_direction_generale_id_ministere FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict zwpO0RyuxD2CrLds9vD2wbFNODu3haa7RGVrIwE9XailEAqlHLmpRGLSMuEZ2Gq
