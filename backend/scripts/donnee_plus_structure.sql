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

SET default_tablespace = '';

SET default_with_oids = false;

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
-- Name: utilisateurs id; Type: DEFAULT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_id_seq'::regclass);


--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: isegroup
--

INSERT INTO public.utilisateurs VALUES (10, 'agent.sante1', 'agent.sante1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 65, true, '2025-09-11 02:51:06.607099', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.323366');
INSERT INTO public.utilisateurs VALUES (88, 'norbert.abou', 'gnantihourejosue102124@gmail.com', '$2b$10$eh1ijHXqil.HYIZLU24g6OT1ChNKluxEDDtubIuRdFd8mk9BepijC', 3, 137, true, NULL, NULL, NULL, '2025-10-10 19:37:27.014711', '2025-10-10 19:37:27.014711');
INSERT INTO public.utilisateurs VALUES (51, 'drh.db', 'drh.db@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:44:04.557857');
INSERT INTO public.utilisateurs VALUES (92, 'm.chefcabinet', 'm.chefcabinet@gouv.ci', 'CCab@2025', 13, 145, true, NULL, NULL, NULL, '2025-10-13 01:03:18.752016', '2025-10-13 01:03:18.752016');
INSERT INTO public.utilisateurs VALUES (93, 'p.directeurgeneral', 'p.directeurgeneral@gouv.ci', 'DG@2025', 14, 146, true, NULL, NULL, NULL, '2025-10-13 01:03:18.800316', '2025-10-13 01:03:18.800316');
INSERT INTO public.utilisateurs VALUES (94, 'f.directeurcentral', 'f.directeurcentral@gouv.ci', 'DC@2025', 15, 147, true, NULL, NULL, NULL, '2025-10-13 01:03:18.81144', '2025-10-13 01:03:18.81144');
INSERT INTO public.utilisateurs VALUES (96, 'manou.soura', 'dalo@gmail.com', '$2b$10$XKZxM2hIWBxraRf3.l8QiOacYmH3Kkzz2sr5URqA4rdaicQ1a8Awq', 3, 149, true, NULL, NULL, NULL, '2025-10-16 00:53:41.104044', '2025-10-16 00:53:41.104044');
INSERT INTO public.utilisateurs VALUES (98, 'test.sousdirecteur', 'test.sousdirecteur@test.com', '$2b$10$iMK..uAKncZXlMeVz.Zfge2lL46xSqR2qLqywYrd/MtsQNRsk6D/i', 11, 139, true, NULL, NULL, NULL, '2025-10-20 06:16:04.893665', '2025-10-20 06:16:04.893665');
INSERT INTO public.utilisateurs VALUES (55, 'drh.dcc', 'drh.dcc@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:44:17.683959');
INSERT INTO public.utilisateurs VALUES (56, 'drh.dpp', 'drh.dpp@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:44:33.497199');
INSERT INTO public.utilisateurs VALUES (54, 'drh.ds', 'drh.ds@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:44:49.135664');
INSERT INTO public.utilisateurs VALUES (53, 'drh.di', 'drh.di@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:45:03.246805');
INSERT INTO public.utilisateurs VALUES (50, 'drh.dp', 'drh.dp@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:45:08.321407');
INSERT INTO public.utilisateurs VALUES (52, 'drh.dc', 'drh.dc@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:45:14.593821');
INSERT INTO public.utilisateurs VALUES (48, 'drh.dsp', 'drh.dsp@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:45:19.22821');
INSERT INTO public.utilisateurs VALUES (5, 'agent.rh2', 'agent.rh2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 3, true, '2025-09-11 02:51:05.98817', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:05.98817');
INSERT INTO public.utilisateurs VALUES (49, 'drh.dh', 'drh.dh@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, NULL, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-10-27 12:45:40.18327');
INSERT INTO public.utilisateurs VALUES (8, 'agent.education2', 'agent.education2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 6, true, '2025-09-11 02:51:06.433792', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:06.433792');
INSERT INTO public.utilisateurs VALUES (1, 'admin', 'admin@rh-system.com', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 1, NULL, true, '2025-09-11 02:51:04.108704', NULL, NULL, '2025-09-09 11:37:54.820088', '2025-10-27 12:46:37.355571');
INSERT INTO public.utilisateurs VALUES (11, 'agent.sante2', 'agent.sante2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 9, true, '2025-09-11 02:51:06.791601', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:06.791601');
INSERT INTO public.utilisateurs VALUES (69, 'sea.morel', 'hyhyy@gmail.com', '$2b$10$5SdRJuqFD6xfNjH8RlsD4u9W0OB6Gi5n9fJ.lJb3rKz/igQp6IULy', 3, NULL, true, '2025-09-24 15:36:37.31136', NULL, NULL, '2025-09-23 01:29:05.012624', '2025-10-27 12:46:42.978296');
INSERT INTO public.utilisateurs VALUES (68, 'kokou.madoudera', 'gnantihourdeeejjosuddde@gmail.com', '$2b$10$Lwq5i35N998fxReDDw9RLO6XBN45DxH1IN41o9tKew29MtpEtrVWq', 3, NULL, true, NULL, NULL, NULL, '2025-09-23 01:07:58.201574', '2025-10-27 12:46:51.171664');
INSERT INTO public.utilisateurs VALUES (67, 'kogue.kaki', 'gnantihoureeejjosuddde@gmail.com', '$2b$10$/oXZKNhG9ZNBSAr2zCt07.Po1dpbfAji9PzT.cqMy1eCRtV1KYlIq', 3, NULL, true, NULL, NULL, NULL, '2025-09-23 00:58:20.000727', '2025-10-27 12:46:56.749082');
INSERT INTO public.utilisateurs VALUES (65, 'hourejosue.gnanti', 'gnantihourejjosuddde@gmail.com', '$2b$10$qfxc4DEKFgd4tNDUBJ.9b.VJ/JfX7FVN9wfRmot65C3Yw.DylsAua', 3, NULL, true, NULL, NULL, NULL, '2025-09-23 00:47:46.697703', '2025-10-27 12:47:38.118006');
INSERT INTO public.utilisateurs VALUES (64, 'koffi.jeane', 'gnantihourejjosudde@gmail.com', '$2b$10$aQBGXiTl26gSPi9QCz2dSeoL3ANk7I37d3WwLDQktwBbS.aSgExDa', 3, NULL, true, NULL, NULL, NULL, '2025-09-23 00:31:38.644485', '2025-10-27 12:47:45.869281');
INSERT INTO public.utilisateurs VALUES (12, 'admin.finances', 'admin.finances@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 2, NULL, true, '2025-09-11 02:51:05.228547', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-27 12:48:41.949786');
INSERT INTO public.utilisateurs VALUES (14, 'agent.finances2', 'agent.finances2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 12, true, '2025-09-11 02:51:07.142213', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:07.142213');
INSERT INTO public.utilisateurs VALUES (70, 'djelo.kuyo', 'goua@gmail.com', '$2b$10$mzhB1vnZhk3qeBjPaEGTzeMSnN6hcN3Z6yyG9r5S22aOXIfcZUoZm', 3, NULL, true, NULL, NULL, NULL, '2025-09-25 13:38:07.06971', '2025-09-25 13:54:01.801048');
INSERT INTO public.utilisateurs VALUES (17, 'agent.interieur2', 'agent.interieur2@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 15, true, '2025-09-11 02:51:07.719301', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-11 02:51:07.719301');
INSERT INTO public.utilisateurs VALUES (16, 'agent.interieur1', 'agent.interieur1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, NULL, true, '2025-09-11 02:51:07.360547', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-27 12:48:54.40295');
INSERT INTO public.utilisateurs VALUES (13, 'agent.finances1', 'agent.finances1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, NULL, true, '2025-09-11 02:51:06.97605', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-27 12:49:33.61613');
INSERT INTO public.utilisateurs VALUES (15, 'admin.interieur', 'admin.interieur@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 2, NULL, true, '2025-09-11 02:51:05.508195', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-27 12:49:56.997937');
INSERT INTO public.utilisateurs VALUES (45, 'drh.dep', 'drh.dep@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 31, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs VALUES (46, 'drh.des', 'drh.des@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 32, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs VALUES (47, 'drh.dalf', 'drh.dalf@education.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 33, true, NULL, NULL, NULL, '2025-09-13 14:40:37.43196', '2025-09-13 14:40:37.43196');
INSERT INTO public.utilisateurs VALUES (63, 'ange.kouassi', 'gnantihourejosudde@gmail.com', '$2b$10$HJ3Tqj.JijmXwK69CV6k2uCevky5dBCtAdIGzD6H7bbAWpMdak2w.', 3, 52, true, NULL, NULL, NULL, '2025-09-23 00:23:09.174695', '2025-09-23 00:23:09.174695');
INSERT INTO public.utilisateurs VALUES (4, 'agent.rh1', 'agent.rh1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 61, true, '2025-09-11 02:51:05.743451', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.286343');
INSERT INTO public.utilisateurs VALUES (71, 'djelo.kuyo1', 'Goougi@gmail.com', '$2b$10$0IPfI0LIIHEgH3gcpeIb6ODj1z7e3PLMquuc25QHhaiD7DRA2GGiK', 3, NULL, true, NULL, NULL, NULL, '2025-09-25 14:15:08.264551', '2025-09-25 14:56:02.553929');
INSERT INTO public.utilisateurs VALUES (72, 'djelo.kuyo2', 'gouda@gmail.com', '$2b$10$DcIVCeUml70K.S839q20OeMbTBEBwA/tSUX/2G45/ZnakJDZmIDgO', 3, 73, true, NULL, NULL, NULL, '2025-09-25 15:00:06.942208', '2025-09-25 15:00:06.942208');
INSERT INTO public.utilisateurs VALUES (7, 'agent.education1', 'agent.education1@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 3, 63, true, '2025-09-11 02:51:06.22231', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.306516');
INSERT INTO public.utilisateurs VALUES (9, 'admin.sante', 'admin.sante@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 2, 64, true, '2025-09-11 02:51:05.006866', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-09-25 02:42:00.312224');
INSERT INTO public.utilisateurs VALUES (66, 'drh.education', 'drh.education@education.gouv.ci', '$2b$10$ZbRCv/4PBAJ2cqIi7nAz3eFqpxRXtzLeBPTaqvIRVWJbsQHi6Mx82', 6, 55, true, '2025-09-23 02:31:57.111308', NULL, NULL, '2025-09-23 00:54:46.846583', '2025-09-23 02:31:57.111308');
INSERT INTO public.utilisateurs VALUES (58, 'drh.drh', 'jeanbaptiste.kouame@rh.gouv.ci', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 6, 45, true, '2025-10-04 18:16:16.455921', NULL, NULL, '2025-09-13 16:03:05.880683', '2025-10-04 18:16:16.455921');
INSERT INTO public.utilisateurs VALUES (18, 'super.admin', 'super.admin@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 1, 70, true, '2025-10-02 00:13:51.908158', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-02 00:13:51.908158');
INSERT INTO public.utilisateurs VALUES (6, 'admin.education', 'admin.education@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 2, 62, true, '2025-10-06 04:57:01.766655', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-10-06 04:57:01.766655');
INSERT INTO public.utilisateurs VALUES (81, 'hhh.parent', 'hhh.parent@agent.local', '$2b$10$lRBQ1KqaXSQpgEZxEyl3p.dGtcOLYpCFWJWDwjDnm4SrtetX94M06', 3, 85, true, NULL, NULL, NULL, '2025-10-02 01:39:13.530296', '2025-10-02 01:39:13.530296');
INSERT INTO public.utilisateurs VALUES (82, 'test.nomination', 'test.nomination@gouv.ci', '$2b$10$R0L9zEM9S3.RONNEnqR7Me4gUCHevYIXe8SYsUuNS9CJNo.kGu0ya', 2, 4, true, '2025-10-04 19:21:28.813688', NULL, NULL, '2025-10-04 19:13:03.037457', '2025-10-04 19:26:09.947669');
INSERT INTO public.utilisateurs VALUES (148, '452000F', '452000@no-email.local', 'a19ec556530ca4b2b5f4bf6567f3c8be', 3, 1083, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (149, '460997T', '460997@no-email.local', '7fbda97714d61594b851a130c33505b5', 3, 985, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (90, 'm.sousdirecteur', 'marie.sousdirecteur@ministere.gov', '$2b$10$C8jn47CHhmUFbwQak3r4gOsiS8i3PqrDKGRrnGd5SKFvwnBODDUiW', 11, 139, true, '2025-10-22 00:31:27.278274', NULL, NULL, '2025-10-12 21:25:55.585334', '2025-10-22 00:31:27.278274');
INSERT INTO public.utilisateurs VALUES (84, 'chef.service.tourisme', 'jeanbaptiste.kouame@tourisme.gouv.ci', '$2b$10$ifOgoTFyW1.btHi27nMUsOnrbftmK37/GgknwaQl9BO.E3jvcLU76', 9, NULL, true, NULL, NULL, NULL, '2025-10-06 05:57:48.622051', '2025-10-06 11:35:21.589225');
INSERT INTO public.utilisateurs VALUES (91, 'p.dircabinet', 'paul.dircabinet@ministere.gov', '$2a$10$xLINfHz.bKxVNfRk4ElHeu5mCkeT0myWqG5hXgZq1NKyOBwaTk6YW', 12, 140, true, NULL, NULL, NULL, '2025-10-12 21:25:55.585334', '2025-10-12 21:25:55.585334');
INSERT INTO public.utilisateurs VALUES (95, 'hamed.kim', 'hamed@gmail.com', '$2b$10$q2EOLue.XSyGq.0snEF3v.UgbTGaHNshWIOPSwklLPMnffaPx4iPK', 3, 148, true, NULL, NULL, NULL, '2025-10-16 00:51:04.761578', '2025-10-16 00:51:04.761578');
INSERT INTO public.utilisateurs VALUES (97, 'janne.fouto', 'yaop@gmail.com', '$2b$10$I7sxX2nNGdQ2e3KhVL2uv.VSM15OBys83JOAXyFQAx3/DoIB6MqqS', 3, 150, true, NULL, NULL, NULL, '2025-10-16 00:56:34.221247', '2025-10-16 00:56:34.221247');
INSERT INTO public.utilisateurs VALUES (89, 'j.directeur', 'jean.directeur@ministere.gov', '$2a$10$DUWC9wDiaOX.3pzSSWI6HewpoIkCNCUsnyh6RYvSVIlyS29cnclHy', 10, 138, true, '2025-10-20 01:20:59.07711', NULL, NULL, '2025-10-12 21:25:55.585334', '2025-10-20 01:20:59.07711');
INSERT INTO public.utilisateurs VALUES (105, '337229G', '16priscaakua@gmail.com', '0977e65c6d09f1014d31574ef87961d2', 3, 1198, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (106, '206234B', '206234@no-email.local', '13ecf6d3796932dd59945d1a325c25b4', 3, 1790, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (107, '231138T', '231138@no-email.local', '63e1522b859562b6868504a5a0da3e87', 3, 1353, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (108, '237252B', '237252@no-email.local', 'ccff96b69fb77efb8fc14bc5bc3281cc', 3, 1794, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (109, '280155A', '280155@no-email.local', '4959f051878308b37e0714d796c14cc4', 3, 1183, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (110, '282337W', '282337@no-email.local', 'e5036c9dd4929a8c8820447fbeb1d1f3', 3, 1791, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (111, '297584N', '297584@no-email.local', 'c620f5f7997909733e6e6d78aec8770a', 3, 1097, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (112, '297588S', '297588@no-email.local', '7d68363b0274b7911792429ab1571b19', 3, 1592, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (113, '304890C', '304890@no-email.local', 'd639384996dee4c707788dac4958d08d', 3, 1661, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (114, '304895V', '304895@no-email.local', '74a2930903a2bdeef313ba3e08a92d68', 3, 1098, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (87, 'chef.service.tourisme3', 'jeanbaptiste.kouame3@tourisme.gouv.ci', '$2b$10$qorBC.1N5SDOBeX99P8yjOZcD3Rm4NnW5RmprX2UUIf11QXLlcLtm', 9, 128, true, '2025-11-03 21:44:50.005425', NULL, NULL, '2025-10-06 06:00:25.02203', '2025-11-03 21:44:50.005425');
INSERT INTO public.utilisateurs VALUES (115, '305831V', '305831@no-email.local', '84d4dfed1d4bbdf431d4f08baff03ec9', 3, 1662, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (116, '306629K', '306629@no-email.local', '341fc61993671001e0db0cfeef9f7963', 3, 1793, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (117, '307272N', '307272@no-email.local', 'f617e9a1a553f9f633c1b1a91e685a85', 3, 1762, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (118, '313043Z', '313043@no-email.local', 'dfe2fbddb1e939028853f78c58a72d73', 3, 1356, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (119, '314003T', '314003@no-email.local', 'b7ecb2f8f717bf85728e805c31a7fc74', 3, 1743, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (120, '314826Q', '314826@no-email.local', '8143e42d3301b768e36e966590fc4c92', 3, 1100, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (121, '319370X', '319370@no-email.local', '46caa369b901f98fbfa22b0f4fef78d9', 3, 1189, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (122, '323944X', '323944@no-email.local', '27f5b910b64e0f54559057be4b1c051d', 3, 1058, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (123, '327124M', '327124@no-email.local', 'c06e73ec2ace08ac9728c72b706432c9', 3, 1182, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (124, '337223S', '337223@no-email.local', 'ed1523be8ff38770687d5db12ce157de', 3, 1170, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (125, '337231S', '337231@no-email.local', '871d1b3799262c36a5e0e5b8ea0ea2a8', 3, 1177, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (126, '338288M', '338288@no-email.local', '8040fdd199dc1579134bf85e52181a51', 3, 1274, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (99, 'matricule.test', 'user86@gmail.com', '$2b$10$1oXwZ94CsDoD/TtfM3flOe.e8IdRQ9xH7/rz/HU/ALLy2yhP64oTa', 3, 1809, true, NULL, NULL, NULL, '2025-11-06 11:20:58.41841', '2025-11-06 11:20:58.41841');
INSERT INTO public.utilisateurs VALUES (100, 'matricule.elisee', 'zaplazia@gmail.com', '$2b$10$/Bw75w5uIiwaC8TmSERRE.6uKR0Gcni/jxn1qQHEvbA9h9W/t54FG', 3, 1810, true, NULL, NULL, NULL, '2025-11-06 11:22:59.380426', '2025-11-06 11:22:59.380426');
INSERT INTO public.utilisateurs VALUES (127, '343470L', '343470@no-email.local', 'ccaab8d736a4bf13407320501a968519', 3, 1804, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (128, '345381H', '345381@no-email.local', '871d1b3799262c36a5e0e5b8ea0ea2a8', 3, 1038, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (129, '345662J', '345662@no-email.local', '8450887ce075a31231214a6a91dbcc95', 3, 1093, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (130, '350428R', '350428@no-email.local', '48793de34a5406cef30293d503125dbf', 3, 1739, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (83, 'jaques.kouadio', 'gnantihourejosue@gmail.com', '$2b$10$9upkQql2awoF8vXLHKkZ3.r.OcvPF0GLRN31l3ea8Pb8lYBbCvIs2', 3, 118, true, '2025-11-12 10:39:18.032942', NULL, NULL, '2025-10-06 02:08:53.259266', '2025-11-12 10:39:18.032942');
INSERT INTO public.utilisateurs VALUES (131, '359184A', '359184@no-email.local', '16c548f6fa95b80f6f87f0c96b56322c', 3, 1088, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (132, '359729T', '359729@no-email.local', 'dcb0d8ef6ec3df984a3784d50ad02d34', 3, 1747, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (133, '360923B', '360923@no-email.local', 'a6d46fc93d490863949ebcfc75fa2bbb', 3, 994, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (3, 'admin.rh', 'admin.rh@gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 2, 59, true, '2025-11-12 17:41:45.613783', NULL, NULL, '2025-09-10 22:39:53.753006', '2025-11-12 17:41:45.613783');
INSERT INTO public.utilisateurs VALUES (134, '368217K', '368217@no-email.local', 'f28e14f00ea39ed9793f28d13f379070', 3, 1200, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (135, '372229K', '372229@no-email.local', 'e64fc8e139ab05c664ee3623d7cf5914', 3, 1095, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (136, '379660E', '379660@no-email.local', '3cb46a498c2f03224e50b93b2e5ef0af', 3, 1298, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (137, '390278T', '390278@no-email.local', '4ebd40985e30b22d7afc7ff0600a8159', 3, 1279, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (138, '396544Y', '396544@no-email.local', '867dc71cfdf5d0451cdbf74479b76bf2', 3, 1729, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (139, '402854W', '402854@no-email.local', '22c9883e787709edfaef0c675ae5e6bb', 3, 1099, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (140, '433367T', '433367@no-email.local', '8b99c67d2ac5f217ea0dd49d6e39c279', 3, 1568, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (141, '433865P', '433865@no-email.local', '7010adb6dfb360492868378f89e32a6f', 3, 1209, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (142, '434033H', '434033@no-email.local', '5c2037c7292198d546091e21d3f81cdf', 3, 1569, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (143, '434689Y', '434689@no-email.local', '3e311a52aaf25484d50dfb12efcf038e', 3, 982, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (144, '437484E', '437484@no-email.local', '65b7e2416a3a34bc489658ff14231712', 3, 1024, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (145, '447559A', '447559@no-email.local', 'e3ffa8cc158d85835903aa9ec174d959', 3, 1612, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (146, '447572X', '447572@no-email.local', '6331c968ab18caab7b8883ea51ce583a', 3, 1632, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (147, '447588Y', '447588@no-email.local', '2620557833d338e68c45fc579dd8d96a', 3, 1669, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (150, '464161U', '464161@no-email.local', '449f0572225cebabf3378a65a0c604d7', 3, 1618, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (151, '464166Z', '464166@no-email.local', '7c724741c4c3b5857d0cafc0592703af', 3, 1543, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (152, '464170H', '464170@no-email.local', 'db4cbd3cc5f236f2364d5412887275b3', 3, 1605, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (153, '464173Y', '464173@no-email.local', '25b193c0aa0d38f55474dacd0124779a', 3, 1606, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (154, '464178D', '464178@no-email.local', '89bd44681052e16a53f6643600603199', 3, 1633, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (155, '464357G', '464357@no-email.local', '65d0ae3af969d2217898c942cd48b0e0', 3, 1037, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (156, '466992Q', '466992@no-email.local', '4de8d156866455d21358b88dbb537245', 3, 1665, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (157, '467560B', '467560@no-email.local', '75902ab4216052ed43230769618f39a5', 3, 1184, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (158, '468402B', '468402@no-email.local', '321b17d628b9be931e5804afe39a7a3c', 3, 1560, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (159, '468852D', '468852@no-email.local', 'be4fa8a37703409327a35cc5eb88e967', 3, 1089, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (160, '470054E', '470054@no-email.local', '0580616d63738f9f3107f56d9551cd0d', 3, 1626, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (161, '470991X', '470991@no-email.local', 'd8942f2418eac51319ee1f5cfd52ee01', 3, 1625, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (162, '471757G', '471757@no-email.local', 'd6aaac2aa99afcae0e0a3a5302ab7399', 3, 1629, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (163, '474937Q', '474937@no-email.local', '24688afee6e8790ad5e827ba1233e02a', 3, 1348, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (164, '480288H', '480288@no-email.local', '8f9ba64ff3e40a11bdf19da2d51dc098', 3, 1721, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (165, '480523L', '480523@no-email.local', '5a85bcb916d06ec6fa98eca7baac9fdd', 3, 1670, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (166, '481049Z', '481049@no-email.local', 'af64b3094fbb2f46885cc5523a6efe83', 3, 1570, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (167, '481064Q', '481064@no-email.local', 'd9167dc405500de948b6b96e0a1c71c0', 3, 1613, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (168, '481445K', '481445@no-email.local', '0cc1fc12fa12220152f936b4a1958e54', 3, 1352, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (169, '481466Q', '481466@no-email.local', '7a618e8b68db4cc5ac6f82f7415d19b3', 3, 1084, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (170, '481500X', '481500@no-email.local', '27ebba46826b2ef6fb8a804e003b53ca', 3, 1715, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (171, '481534C', '481534@no-email.local', '9d26200efa7c68499fb5c1d4139a519a', 3, 1070, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (172, '481623M', '481623@no-email.local', 'aaa7d4059b208c5226128c2a6152ad56', 3, 1460, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (173, '481626Q', '481626@no-email.local', '804cd93ce3641f42cacb016c4a7c300e', 3, 1258, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (174, '481901M', '481901@no-email.local', 'caa92f64f81a503b0bd047e71f4cd860', 3, 1442, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (175, '481904Q', '481904@no-email.local', 'e999b64f312f482d26d04fde48d6d1cb', 3, 1273, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (176, '481962R', '481962@no-email.local', '2f1ba734f23d7f2808992066a187a641', 3, 1530, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (177, '482009T', '482009@no-email.local', 'd50b709d50e5486e3afd901d26a9564f', 3, 1107, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (178, '482010P', '482010@no-email.local', 'f91d8db8f6810c050f8871a9bf890f1a', 3, 1714, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (179, '482017A', '482017@no-email.local', 'fb5bbbc264aefcb49c99978c9676a70a', 3, 1621, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (180, '482018K', '482018@no-email.local', 'c40d55db3541c948c7a4973e3d8a1c6a', 3, 1211, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (181, '482246U', '482246@no-email.local', 'b4644a8794ea76fb3dd924c99b81515c', 3, 1667, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (182, '483237L', '483237@no-email.local', '6c0a92c63b98808c195d87d8c13a96f5', 3, 1627, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (183, '483528Q', '483528@no-email.local', '235603b4886d246d843813602b33c596', 3, 1085, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (184, '483689S', '483689@no-email.local', '827db257c679ae127577f5d0940396af', 3, 1796, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (185, '484367X', '484367@no-email.local', '8ab34a6610958addcf608b6058dc914a', 3, 1115, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (186, '485206Y', '485206@no-email.local', '55a4b518770e04beec14bc09418925f3', 3, 1718, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (187, '490894K', '490894@no-email.local', 'f956ada5788db6254acee1aba7efaa5d', 3, 1637, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (188, '500374J', '500374@no-email.local', '3876735ab20c4172811db8640bd16501', 3, 1748, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (189, '503281V', '503281@no-email.local', 'e4f608bd71cad9fe9c4094dfcc3955b6', 3, 979, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (190, '503323W', '503323@no-email.local', '0d4e0645d20ed2cced37c5fb998c0b47', 3, 1728, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (191, '504952W', '504952@no-email.local', '2333fd9c0619b180612a33230c8ca1bc', 3, 995, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (192, '504954Y', '504954@no-email.local', '83f591301f59395b3d0d951d886bab30', 3, 996, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (193, '504956S', '504956@no-email.local', 'dff1f31bb17db66da3b4e16c4e1c53a2', 3, 997, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (194, '506215V', '506215@no-email.local', '6b0f590fbcc3792239a67ba48d12a2a1', 3, 1722, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (195, '506234Y', '506234@no-email.local', 'a2309915fbd99f8fa32649fd05714c19', 3, 1732, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (196, '506254C', '506254@no-email.local', 'e81a5f9ede74a22a35e0cbaaac6ce7de', 3, 1735, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (197, '506415N', '506415@no-email.local', '2db034cb5781fae37e1162aed9b43077', 3, 1727, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (198, '506855X', '506855@no-email.local', '47912f866c0cb73043a03de6ca737eb9', 3, 1281, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (199, '506858A', '506858@no-email.local', 'c1e1e72021dfb5599edfbd9d439a6667', 3, 1152, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (200, '506861V', '506861@no-email.local', 'c2f6badb9602faa4ca2ca42e90a01553', 3, 1275, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (201, '506863X', '506863@no-email.local', '783ce999e5f1241a31568a48e4236b9c', 3, 1215, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (202, '506864Y', '506864@no-email.local', 'a8c9361cacfc735e0d48a00f8339cb56', 3, 1733, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (203, '506865Z', '506865@no-email.local', '5bdbe9534e234b0065bc5d05644f7bfa', 3, 1220, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (204, '506866S', '506866@no-email.local', 'de99a3bbf3a2f612ac00561cb4f975b8', 3, 1159, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (205, '507095J', '507095@no-email.local', '7ca7fbf01b0068066550e4b53f94e9ac', 3, 1724, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (206, '805019Y', '805019@no-email.local', 'cac76e417729de372dfe9f8be7c488ed', 3, 1555, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (207, '806868H', '806868@no-email.local', '87239b9dd94c6990e95601a5cbf1a474', 3, 1288, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (208, '807569E', '807569@no-email.local', 'e2b745979d6207547cf874332a30c4a4', 3, 1087, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (209, '291611S', '8123309', '9e125e3828b2c4178a256f6abba7f258', 3, 1208, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (210, '813575R', '813575@no-email.local', '158a866363ae926f79d9fc7229a6c374', 3, 1751, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (211, '817164R', '817164@no-email.local', '94dcd5b8d354e43253c8a276a251ac61', 3, 1808, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (212, '820764H', '820764@no-email.local', 'cb5816e9f1f44321e9fd1ce4566f3d9a', 3, 1028, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (213, '821007L', '821007@no-email.local', '6244dd8704ee36212ddd6ae93162b70a', 3, 992, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (214, '821115C', '821115@no-email.local', '6737ea937af61c0d86e3c02387280481', 3, 1742, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (215, '821439R', '821439@no-email.local', '7f2be09b108c9748389469a00cc9eb35', 3, 1750, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (216, '826301U', '826301@no-email.local', '15391d0ccd5833be7bd74441bec6c127', 3, 1121, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (217, '827809T', '827809@no-email.local', '982b998158220d84171f76d9e17b0f78', 3, 1432, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (218, '832839M', '832839@no-email.local', '0f293bef88d049bb2d682c546703f54d', 3, 1094, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (219, '852135P', '852135@no-email.local', 'e684f67473bfb97862b40daaf258d097', 3, 1282, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (220, '855372F', '855372@no-email.local', 'fa568883df6b749bc33da27043adb115', 3, 1385, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (221, '855450A', '855450@no-email.local', '23789650ff7472ecbf8d867c9d12b4be', 3, 1645, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (222, '855826P', '855826@no-email.local', '804bb904131d52efc36a2bb24e6a1ed1', 3, 1257, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (223, '855828Z', '855828@no-email.local', '3163c93bdde1ca722726803777ee0fd9', 3, 1201, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (224, '855839U', '855839@no-email.local', 'f551f4a50650b7ffbe78260242d7c223', 3, 1331, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (225, '855843Y', '855843@no-email.local', 'c0bf170310c1ecc7a39d53d8b070c3d5', 3, 1368, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (226, '855848D', '855848@no-email.local', 'aca64b4b1830cfd4cf158cfe6751c49e', 3, 1386, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (227, '855861S', '855861@no-email.local', 'cafefe8a51a22a66804fde9e610cd1d9', 3, 1545, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (228, '855862T', '855862@no-email.local', 'cafefe8a51a22a66804fde9e610cd1d9', 3, 1546, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (229, '855863U', '855863@no-email.local', '01382269a9aa45be5f644eec48b15d53', 3, 1411, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (230, '855871U', '855871@no-email.local', 'f47ab9f3943b2a553882cbc287199693', 3, 1520, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (231, '855872V', '855872@no-email.local', '6eba93aeb18c289f5411346c9e385ced', 3, 1476, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (232, '855873W', '855873@no-email.local', '502547fdfe27dccb3ed4975858d941c6', 3, 1547, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (233, '855874X', '855874@no-email.local', '70423f8c9f2e96cbd9acd0941c838600', 3, 1192, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (234, '855875Y', '855875@no-email.local', '1f7ab2b25cd015e693bbda11773791d9', 3, 1122, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (235, '855885K', '855885@no-email.local', 'e5bafd274a8b3517fd01e5fb5fe6b1ab', 3, 1713, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (236, '855886L', '855886@no-email.local', '0f45b54d632e52fa3454ab4b30370ea5', 3, 1388, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (237, '855888W', '855888@no-email.local', 'e03df0e2694820a3794f91e92db5a215', 3, 1272, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (238, '855889X', '855889@no-email.local', 'b3e25572eb69c02d70181cb62f2c313b', 3, 1389, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (239, '855890U', '855890@no-email.local', '1a84fa1dbf96881620139ec32e9121a7', 3, 1104, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (240, '857718C', '857718@no-email.local', '7c9d33a947a76deaf8f18bbe0b8d8969', 3, 1390, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (241, '865486M', '865486@no-email.local', 'd2a57edd7288f25c2d1c3ffb40ba7bf1', 3, 1723, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (242, '865713X', '865713@no-email.local', '1f2198940bb06768fc017052947d9883', 3, 1771, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (243, '865752E', '865752@no-email.local', 'cb9eee03e0bcf248de669c6aff94d352', 3, 1283, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (244, '865780F', '865780@no-email.local', 'd8942f2418eac51319ee1f5cfd52ee01', 3, 1284, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (245, '865786Z', '865786@no-email.local', '637f33e39be00ae4ed1a80e294fd80c8', 3, 1268, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (246, '865813L', '865813@no-email.local', 'e0f7090e0a6a93af750871af7e3e45eb', 3, 1285, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (247, '866514R', '866514@no-email.local', 'f4dbf0e4de3ff2c4d5d83622c34db20d', 3, 1737, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (248, '867562S', '867562@no-email.local', '23a5993cdf60dc3bb1570c04ac3b96a5', 3, 1251, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (249, '867627T', '867627@no-email.local', '21949c9d3f534bb7e30080a0d1971175', 3, 1071, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (250, '870454D', '870454@no-email.local', '5292a92246655a13e8b6a0ec80c14cb2', 3, 1399, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (251, '871901T', '871901@no-email.local', 'f9690e79fc58479abc486b52f3c64b16', 3, 1397, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (252, '874642H', '874642@no-email.local', '086e05fbb59c30edfa114b522f321559', 3, 1429, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (253, '876799H', '876799@no-email.local', '4e385f5953d72ce9b81f66ff9e87f5a5', 3, 1255, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (254, '877509G', '877509@no-email.local', '6a7739f5ba505cb3cbe7e9157d7e78ea', 3, 1130, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (255, '877587N', '877587@no-email.local', 'e1618104976ca59354d8ceb59d69ff0c', 3, 1731, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (256, '885392K', '885392@no-email.local', '8e1434a573ad259b33a38c45823d56f7', 3, 1689, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (257, '885394M', '885394@no-email.local', '9fa0e56995fdcccf55ee57d55fca3d53', 3, 1797, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (258, '885397Q', '885397@no-email.local', '2fefbe1d41fc484e28a6434784231c84', 3, 1057, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (259, '885469Y', '885469@no-email.local', '698b6f4efcb830ba5a9ae455a37f2806', 3, 1051, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (260, '885584C', '885584@no-email.local', 'a4050f21695c5d6c23d284feb0257805', 3, 1412, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (261, '887249D', '887249@no-email.local', '421da2752ffdc1def7d99e11f4b11766', 3, 1602, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (262, '904690D', '904690@no-email.local', 'f0b97d29db1b1381ddd1d69a0e37b712', 3, 1414, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (263, '905377F', '905377@no-email.local', '672d18a406ecb9a0d12229b77b57a32e', 3, 1042, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (264, '908662Q', '908662@no-email.local', '67c0dfa441c37522c8d8527d3acdef69', 3, 1554, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (265, '925925G', '925925@no-email.local', 'a06f435f0c012d9c5bcf7e2daf990715', 3, 1120, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (266, '982675X', '982675@no-email.local', '47d42f9ae0276f936be94f6ffe7e9d1b', 3, 998, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (267, '982817E', '982817@no-email.local', '0c1ff9d83299315142fa2cca3eecbf49', 3, 1203, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (268, '982823C', '982823@no-email.local', '988bdebfbf39ef8cf10c9df4aeadd3d4', 3, 1229, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (269, '982825E', '982825@no-email.local', '572322302a0c50d4c0acefb7e45a32b0', 3, 1044, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (270, '982827G', '982827@no-email.local', '23c9d0d8127e281cfe9392188f69381a', 3, 1006, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (271, '982829J', '982829@no-email.local', '49bb957eff4e09f5f4c94453523ff5dc', 3, 1035, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (272, '982830P', '982830@no-email.local', 'baa64a5ae8183cdb23e4e78705186320', 3, 1046, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (273, '982833E', '982833@no-email.local', 'a39048303e9458741745c2ae0a6673f4', 3, 1048, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (274, '982862K', '982862@no-email.local', 'a16c9591489cad455327fb2eca10a1d4', 3, 1204, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (275, '982864M', '982864@no-email.local', '335b8a52507a286edd75c4b31abe75e1', 3, 1007, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (276, '982867Q', '982867@no-email.local', '54e4c9c65b53d9dee677cbe3185440e4', 3, 1090, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (277, '982905P', '982905@no-email.local', '47d42f9ae0276f936be94f6ffe7e9d1b', 3, 1205, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (278, '982907R', '982907@no-email.local', '49cf680eb882503488cd06eef94f926d', 3, 999, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (279, '982908S', '982908@no-email.local', '7da932aac5b4649426aca229c0a7c982', 3, 1109, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (280, '982911C', '982911@no-email.local', '1ed48932bb4239df4cee8b3555658867', 3, 1008, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (281, '982918K', '982918@no-email.local', '0329c6a1ebf9f691ea233bb64d99f167', 3, 1009, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (282, '982922F', '982922@no-email.local', '531c8c9080e374a6fb342947cd0e6bc1', 3, 1000, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (283, '982928M', '982928@no-email.local', '9bd897807dc2332c3691eee7c1f42f49', 3, 1110, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (284, '982930K', '982930@no-email.local', '942b8f3a810dde6bc7a5fda484ea673d', 3, 1056, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (285, '982941J', '982941@no-email.local', 'cc34d393d46170c609e2c155bc5d62a9', 3, 1806, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (286, '982942K', '982942@no-email.local', '55bf576b31772608afca3dfc172b1f4d', 3, 1133, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (287, '982949S', '982949@no-email.local', '60c30c3449d2afd3e7fba65a3e2f71d7', 3, 1117, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (288, '982950X', '982950@no-email.local', 'a4050f21695c5d6c23d284feb0257805', 3, 1043, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (289, '982951L', '982951@no-email.local', 'f227d202a7bd601613ceb274b851d8b8', 3, 1264, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (290, '982953N', '982953@no-email.local', '0d05d9775f3bef93a2770363b711ebf8', 3, 1001, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (291, '982955Q', '982955@no-email.local', 'f47ab9f3943b2a553882cbc287199693', 3, 1685, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (292, '982960Z', '982960@no-email.local', '1bda2e287e3e00211d62156a3d739add', 3, 1091, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (293, '982961N', '982961@no-email.local', 'd60650a48aba42c4d7519c51afe4c7c6', 3, 1002, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (294, '982965J', '982965@no-email.local', '334cb7eb1d44b866fe7e6f54898d925f', 3, 1010, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (295, '982969W', '982969@no-email.local', '4c8aef0da0e794abf23ee047022d3d6c', 3, 1111, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (296, '982970T', '982970@no-email.local', 'c7ce64a36314f1b873593075ebb093fb', 3, 1118, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (297, '982973J', '982973@no-email.local', '135d3d958381d275a41c2835d50cea65', 3, 1801, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (298, '982980N', '982980@no-email.local', 'adf5182011e078eb234e960f3691bc30', 3, 1507, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (299, '982982C', '982982@no-email.local', '65edc0888571692a6f406d7342a64a36', 3, 1003, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (300, '982983D', '982983@no-email.local', '6f463fd97e479aa237df7c1e71ade05c', 3, 1004, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (301, '982984E', '982984@no-email.local', 'ae1d7a5a52c3cfe6ddbbe7f57b6c3f10', 3, 1005, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (302, '982985F', '982985@no-email.local', '982b998158220d84171f76d9e17b0f78', 3, 1019, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (303, '982986G', '982986@no-email.local', 'cafefe8a51a22a66804fde9e610cd1d9', 3, 1160, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (304, '982996A', '982996@no-email.local', 'e53c8e87cbac4a58f44db3b37f00264e', 3, 1013, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (305, '982997B', '982997@no-email.local', 'e5c7a894685db3edce8627812ffb034f', 3, 1113, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (306, '982999M', '982999@no-email.local', '6ac6a08215bf260a5880b60150129a87', 3, 1050, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (307, '827826B', 'abdkoulibaly07@gmail.com', '10ea4af2ed484cb4fc3a0e1b7f75ef29', 3, 1571, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (308, '307354Q', 'abdoulaye7270@yahoo.fr', '9bd897807dc2332c3691eee7c1f42f49', 3, 1092, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (309, '886296L', 'abdoulayedi@yahoo.fr', 'f875afa0df62f0fc5b05b85d17acac52', 3, 1154, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (310, '982976M', 'abeudes@gmail.com', 'be3d63293993fc0608cb04e66f1e1a38', 3, 1293, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (311, '855817N', 'abgshommefort@gmail.com', 'fac22333afa187c2f21687de5600fd19', 3, 1572, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (312, '490020V', 'abilo_s2006@yahoo.fr', '135d3d958381d275a41c2835d50cea65', 3, 1634, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (313, '323848F', 'achieaime@yahoo.fr', '1b1cb335009c8ed6b604645b1d523b34', 3, 1302, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (314, '481961Q', 'achille2040@gmail.com', 'c062f1d2317913a451ae669b57a14372', 3, 1512, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (315, '368214Q', 'ackanicole@yahoo.fr', 'b9e840e1481cb9c048ec5b91d376f67d', 3, 1253, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (316, '272141F', 'adamscoul70@yahoo.fr', 'fd49c62cb1a16bbfdd8c9a8797ce3ce9', 3, 1610, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (317, '297586Q', 'adaoroman@gmail.com', 'a170aee990b2e3f867c46dd6905a61c3', 3, 1217, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (318, '467389C', 'ad.diarrassouba@tourisme', '045f387c2c3dc35cd83e420e8939a913', 3, 1146, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (319, '481893D', 'adianeablan@gmail.com', '7be8001114f73dbd7f6ff170b799a9a9', 3, 1519, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (320, '464179E', 'adiaratoutraore1984@gmail.com', 'ea420edc7b250f2822f230462792b78b', 3, 1700, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (321, '886723P', 'adjadianecarelle@gmail.com', '6ea80a1f46b5d54f80854f3cd5aabe27', 3, 1068, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (322, '323829U', 'adjalotte@gmail.com', '70aa7fa2af290e66d4d9d04bcd30f7b9', 3, 1321, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (323, '852269M', 'adjaraouattara@gmail.com', '502547fdfe27dccb3ed4975858d941c6', 3, 1660, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (324, '803532M', 'adjigojocelyne@gmail.com', '162dbe607a909bd67586b0c37ace90fc', 3, 1355, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (325, '855846T', 'adjouajkapie@gmail.com', 'c131dcd4fd888bc1ea931413efd3a573', 3, 1347, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (326, '820547Y', 'adledanho@yahoo.fr', 'e62271c4651959572872e592c4ff5cd5', 3, 1693, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (327, '982831C', 'adomnicolasj@gmilcom', '6c7becb45c5734586cead0c392d93508', 3, 1047, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (328, '855816M', 'adoukoguy@yakoo.fr', '1d1219c93eaa93618ad3b50426dd73fa', 3, 1126, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (329, '834867K', 'adourosine02@gmail.com', '92e36a64a2b8f68051ae10ec0a028280', 3, 1174, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (330, '447557Y', 'Adrienneaboua126@gmail.com', 'a2956a0df36186c8b78c29329b03fdba', 3, 1556, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (331, '385534K', 'afanija@yahoo.fr', '30b6141fc2feb8775bb2e25ac45e1d48', 3, 1668, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (332, '482019L', 'AFFOUEZAMBLE@GMAIL.COM', '0532f04682882a09480174f9779a5ffd', 3, 1304, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (333, '858378Y', 'aflorestelle@gmail.com', '23cf735bba09a8470f18493bf614de18', 3, 1242, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (334, '827828M', 'afoussataloyaga@gmail.com', '266caf358ee65cb4dff3c65c7988cf7b', 3, 1233, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (335, '889312W', 'agbojosy@gmail.com', '268196169a8493f06d4dffc57a5255e9', 3, 1332, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (336, '359181F', 'agnimoyolande@yahoo.fr', '882b44174a7d11bc404347fa4dcf8c9e', 3, 1176, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (337, '855824M', 'ahouahuguesdavy@gmail.com', '32ce7278207cb50d693c92c418cc184a', 3, 1584, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (338, '481207V', 'ahouchristineko3@gmail.com', '5671c1c3ccd8da4d6699b4a4aa020207', 3, 1695, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (339, '815455K', 'ahourosinekonan3@gmail.com', 'bead549a76b7e9ccd42f43df14bf9526', 3, 1422, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (340, '855850B', 'aichakonate@gmail.com', '0c3232e6de11ce834f44eb508d7c355e', 3, 1456, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (341, 'FIN003', 'aicha.kouame@finances.gouv.ci', '7fd68d06e32169b5e2da176b83c5dbe4', 3, 13, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (342, '834958W', 'aieruth225@gmail.com', '5cb3e3de1c37a1a9d6a70233ce2d02e6', 3, 1384, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (343, '982826F', 'aimeouattara566@gmail.com', 'df42379ab201b51645fd5e61169c8439', 3, 1072, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (344, '251279U', 'AKAGAUZEJ@YAHOO.FR', '61e9632da5396b812cf9d62e8f3e2a84', 3, 1725, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (345, '435328W', 'akaleyannick@gmail.com', 'bb46d39206f6ece73ab4f7b4b3d0f8c1', 3, 1324, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (346, '830050F', 'akazaelcoche@gmail.com', '7847bb82868f14dddf4c468619106062', 3, 1483, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (347, '481383M', 'akfrejus@gmail.com', '4809af7d05fe7e62649e605cf6d0030c', 3, 1600, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (348, '815422A', 'akouaanzan@gmail.com', '3a9fc6084f66597356099c7d049f7ef4', 3, 1711, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (349, '481384N', 'akredjama@gmail.com', '576270ffb06736097a3d5d0e9df6378f', 3, 1431, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (350, '297590Y', 'alice8ya@yahoo.fr', 'd0f2cb72720cae0a885d727b9a250644', 3, 1245, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (351, '468225G', 'alidadianeyapi@gmail.com', '1a84fa1dbf96881620139ec32e9121a7', 3, 1314, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (352, '492302X', 'alladjelucherve@gmail.com', 'cb6ca3e2874ea04c88071b885494b999', 3, 1240, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (353, '418949C', 'allasy120kouakou@gmail.com', '3a2849c03055ae39f168b7209135b886', 3, 1406, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (354, '809995U', 'allialiaime7@yao:fr', 'a33f523172b601e4694fb3d25b52a3f2', 3, 1759, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (355, '481413B', 'alphasirani@gmail.com', '1bb78f13da7c20e1e9aeef377aa2de91', 3, 1562, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (356, '434616N', 'amalagenuier@gmail,com', '02fa2f3af1485dec144bae16792fa705', 3, 1342, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (357, '866768P', 'amanjosiane09@icloud.com', '389e345b4ffdc85f3dc7b1654d27425b', 3, 1450, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (358, '855818X', 'amarie:ilerte@gmail.com', '1a963bbcef5f02f1c717485cc54367b7', 3, 1127, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (359, '982995H', 'ameidhouaobile@gmail.com', '99ae5451ff1a59bb43e6c44ddb77d5cd', 3, 1012, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (360, '982929N', 'amenanbrakissayao@gmail.com', '2b303102605fdd51df37b284a2ce5591', 3, 1206, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (361, '826154Q', 'amenangenevievedibi@gmail.com', '061017b0a6be42c41ec1cea5fdefcb19', 3, 1548, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (362, '480631Y', 'amenanlary@gmail.com', '2f1ba734f23d7f2808992066a187a641', 3, 1223, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (363, '815451P', 'aminakeho@gmail.com', '8526fe476221b3c0813681729637ac09', 3, 1674, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (364, 'EDU003', 'aminata.ouattara@education.gouv.ci', 'ab1100c23f33f5d29374d306c10924cf', 3, 7, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (365, '825989M', 'aminysoze@yahoo.fr', '4ccefa5cb40557e51dd0bd7898cd0d58', 3, 1032, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (366, '826175M', 'amonchijoseeprisca@gmail.com', 'aa83d395d3f35cb7bff6fa45e9720a14', 3, 1054, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (367, '386459H', 'amondlouise@yahoo.fr', '51696140d5cea7268b2ce0638a9aea38', 3, 1323, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (368, '483687Q', 'amonkouajermie@gmail.com', 'aa50f4f891a6a3d25457665efd46160d', 3, 1522, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (369, '480684W', 'amydembele13@gmail.com', '5e23a539fc8c037de2c8d8dba402e038', 3, 1326, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (370, '815488M', 'amyflorasana@gmail.com', 'c2323af976b9f1e1397cec2702b910ba', 3, 1031, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (371, '856161V', 'andrea.fagla@gmail.com', 'a50b6d95001b8b2df61eb1d738e23467', 3, 1066, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (372, '323834R', 'andrekodiane@yahoo.fr', 'eb14727e89b7d841cff891bce9f978bf', 3, 1234, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (373, '345915Y', 'angeeric94@hotmail.fr', 'e189cc6e9dc2b9de95dc129bc9c5db17', 3, 1761, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (374, '856634X', 'angemoreldodo59@gmail.com', '58737f0760d5868823c971806af86aa1', 3, 993, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (375, '480564V', 'anneliesonia@gmail.com', 'f944bac7275aab57bb001738c5a67eba', 3, 1421, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (376, '304885T', 'annemariallui00@gmail.com', '09d9b632a150b999fcf30cf4cea8de07', 3, 1252, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (377, '482328W', 'annickdesireenguessan@yahoo.fr', 'd549badb3c1165c562f904541bda073b', 3, 1359, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (378, '855878B', 'anogigi0311@gmail.com', 'c6e302f22e46135cb372a45b188c8cfa', 3, 987, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (379, '802422N', 'anzanekeshi34@gmail.com', 'c6d9ed0f2ea9d7ae9d536d9fbd21c582', 3, 1316, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (380, '436116B', 'anzataolgaouattara@yahoo.fr', '113a9ff0c0ac85de14deedbc43b105cf', 3, 1036, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (381, '359182G', 'aramata_b@yahoo.fr', 'c6e7ad20ee9fddcb4d18381f7478d879', 3, 1362, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (382, '889085P', 'arnaudbodie@gmail.com', 'e2d90783959884c1bfa7f3b8ed4f7ed8', 3, 1704, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (383, '480545S', 'asnathjack@yahoo.fr', '108d7e1382662038ecad481b59095777', 3, 1365, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (384, '855823L', 'assalea57@gmail.com', 'd93d9bc0a80feaad75604e9b8fcba060', 3, 1635, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (385, '313039V', 'assamari2007@yahoo.fr', '9b873d6ca0933dd0cd97d8c5685c9250', 3, 1199, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (386, '480601B', 'assamoabertrand@gmail.com', '0f69c82b912e9da0cea6306aa50e778b', 3, 1462, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (387, '323840B', 'assandeenegie@gmail.com', '42edfe44c9505de98b06b146f7e51297', 3, 1235, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (388, '810032M', 'assefantis@mail.com', '2939f60c3f3eb9d5bd39e51f7909f2e4', 3, 1503, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (389, '285815R', 'assemanaurelio@gmail.com', 'f27aedef901b226fee3064b2ba280718', 3, 1734, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (390, '481390Y', 'assiedouard85@gmail.com', 'bc96bbab6c0a4e202996d22d508ae96d', 3, 1579, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (391, '304884S', 'assokostephanie@gmail.fr', 'f2a7fb8708f75ee09f5f21ed3a86d0d9', 3, 1779, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (392, '265962F', 'assuebla@gmail.com', 'ae0f0c6e5475091bbd6a903e79e231d9', 3, 1354, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (393, '815482F', 'athnielebenezer@gmail.com', 'f07a9a6d5baac4a0cc928d6b9ea9d0b6', 3, 1710, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (394, '291183N', 'attabf2@gmail.com  attabf2@yah', 'ba282da0a2c2df4185a931c9e592b19b', 3, 1641, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (395, '481393P', 'attaoliviers454@gmail.com', '6915f817bab97c501a60cb32aa88fd7d', 3, 1393, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (396, '855855U', 'attestephaneramy@gmail0com', '3c7ed7494e751df376a1264b6719e2de', 3, 1395, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (397, '435599P', 'audrey.donatien@gmail.com', '77b872e981dae6ab92649a5ac3301e64', 3, 1106, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (398, '481521F', 'awadem723@gm:c', '955e8a6d0cb76a81ad9aa6e8f6a7b20b', 3, 1033, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (399, '304892S', 'ayesimplicey@gmail.com', 'da72ced0431a71fa6f3a66df0fd303e8', 3, 1360, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (400, '897703X', 'bagouedaniellelemanois@gmail.c', '553c5468dfec453f17f09d58bb846d22', 3, 1538, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (401, '855868H', 'bahevelynesuzie@gmail.com', 'b98104b0af4cb8b5b2ba7ebe89b7227b', 3, 1369, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (402, '483698T', 'Bahlarissa14@gmail.com', '1b7cd3944d3e517bc4832d75b2302ee9', 3, 1137, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (403, '464176T', 'bakanvalentin@gmail.com', 'dc61c6eb75ba3ecc1af1620c0d066a25', 3, 1418, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (404, '304889F', 'bakayokomassiamy063@gmail.com', '99517d3e3d12dd20e3be5e194185290f', 3, 1320, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (405, '826153P', 'bambaibrahim540@gmail.com', 'd590a086eddce79be89b89699c6fa620', 3, 1534, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (406, '825998N', 'bambasidy0@gmail.com', 'ff337b4030d8850cd7ad0cb16b122c1d', 3, 1086, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (407, '464162V', 'bambeu.85@gmail.com', 'be430edc598bf1476eae2d1f730ebe3a', 3, 1237, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (408, '982989K', 'barakisdiab@gmail.com', 'eb2e988e65c8143bbfd6b2f704c954b9', 3, 1112, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (409, '266393E', 'bellicital@yahoo.fr', '7ca127b0938132614a6f4933ca4450de', 3, 1082, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (410, '832904P', 'benedictano82@gmail.com', '1215a9a786836a34d4a4c8f750b5630b', 3, 1345, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (411, '272134Y', 'benritchi@gmail,com', '93b496ae0373c17022cecc630581f937', 3, 1653, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (412, '886245Y', 'beugrenina@gmail.com', '728dfe560738d77634dcf512fee9e4a6', 3, 1639, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (413, '875722S', 'biiriejulien4@gmail.com', '111df57c545a65f12d550f386a4ef9aa', 3, 1373, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (414, '865406V', 'bilejoyce@hotmail.fr', 'c07878f48cb99d5c810d12947be23fdf', 3, 1617, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (415, '442433P', 'binirol@yahoo.fr', 'e749aecf34c903ca4d531faf301d7a90', 3, 1291, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (416, '826186H', 'bintoukjumelle@gmail.com', '0e19a0338a5ec40749f77c56b97c3995', 3, 1055, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (417, '811666S', 'blaise07yapi@gmail.com', '63a14408e3e9a26bae5eb564b473874f', 3, 1746, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (418, '874803U', 'blokolepit@gmail.com', '78c09cb9050c9a27d4f6d39a1fb0b511', 3, 1505, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (419, '827822F', 'bnaleysandrine@gmail.com', '3c7ed7494e751df376a1264b6719e2de', 3, 1608, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (420, '908887T', 'boaraymondo@gmai.com', 'd108c290c08036804f0ff9ae8cb97ba8', 3, 1262, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (421, '470972B', 'boizoferdinand@gmail,com', '2add9ad7be6913763288f65889755018', 3, 1349, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (422, '255533X', 'bokabiyaogeorge@yahoo.fr', '83eabb820471fc52c0487f9cd031aebf', 3, 1021, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (423, '481925C', 'borisglazai@gmail.com', 'c2e8b691fe22b95e134e8c8bbdd223db', 3, 1529, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (424, '313048E', 'boualain@gmail.fr', '3651051d587a26b5b0380e2929a46ff8', 3, 1188, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (425, '834133B', 'bralea@hotemail.com', 'e64fc8e139ab05c664ee3623d7cf5914', 3, 1486, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (426, '357504H', 'brigittekouakou07@gmail.com', 'c1df381f9faf95f190d02bda2252a306', 3, 1657, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (427, '815480R', 'broumarlene560@gmail.com', 'f07a9a6d5baac4a0cc928d6b9ea9d0b6', 3, 1644, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (428, '855849E', 'bruno84konan@gmail.com', '3b845d83cca8c9f73f6219b764c2261b', 3, 1647, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (429, '284526N', 'bsylvie316@gmail.com', 'b3c23702335eb3106c7cc793d0800492', 3, 1270, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (430, '293402U', 'b.traore@tourisme.gouv.ci', '3d61a1031039ab84c46869ac57b12df4', 3, 1171, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (431, '319399R', 'byehiri@gmail.com', '34d1cf4cde62a39f3833e33a46f0f731', 3, 1553, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (432, '815433D', 'cange830@gmail.com', '14b36fbd58c579767bdc55522322f44f', 3, 1136, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (433, '855820V', 'carineamia5@gmail.com', '57f2565f174f916ff1bceeff5551f466', 3, 1703, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (434, '506857Z', 'cbohouman@gmail.com', 'ee46c80b4b7bd312cc9ba0de2ee40b0c', 3, 1145, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (435, '861964X', 'chatigre.karene@gmail.com', '4109915b0025d0b1c631581c49e6c70b', 3, 986, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (436, '803543Y', 'chayenchoeve@gmail.com', 'd8cc4f33faea4e240ec817b5042778a1', 3, 1590, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (437, '815448U', 'cheickabdoul.kader@gmail.com', '55dd8b44c521882662e3c6f4503b3a51', 3, 1687, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (438, '233494K', 'cheickbamby@hotmail.com', '127bdd194ea6cb7641e9f08d8d961934', 3, 1059, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (439, '888935N', 'chemoba1985@gmail.com', 'be430edc598bf1476eae2d1f730ebe3a', 3, 1510, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (440, '480817K', 'chiadontatiana@gmail.com', '4467b2a33585396b0d458dfcbe9c79f0', 3, 1169, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (441, '871253G', 'chrisalexsahiry@gmail:com', '531c8c9080e374a6fb342947cd0e6bc1', 3, 1186, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (442, '815419P', 'christakom79@gmail.com', 'f2951c2cfc45e15d55e4a496ed985a02', 3, 1030, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (443, '464159A', 'christineamani25@g:c', '2c30de06612adbd1382e92400836a825', 3, 1407, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (444, '337222Z', 'christineamani25@gmail.com', '483aff88b10cba5d19974538d42ad673', 3, 1079, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (445, '272135Z', 'cit.coulsoul@yahoo.fr', '9bd897807dc2332c3691eee7c1f42f49', 3, 1524, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (446, '810020V', 'cit.sarah@yahoo.fr', '7881ad087e5c3e0cd0b0e660dddd0936', 3, 1764, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (447, '506867T', 'ckassoum2000@yahoo.fr', '8fca007a94b5ffbde48c9f8ac45c1767', 3, 1166, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (448, '467420X', 'c.kouadio@tourisme.gouv.ci', '94ea499ce2fdfa5550e190d30d5c408f', 3, 1499, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (449, '323854V', 'claudefoua@yahoo.fr', '7e4c5db100255fb27e28f5040e20f8bb', 3, 1102, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (450, '826011C', 'clementtougbate@gmail.com', '380028c26458f612fa5ae86423551cb5', 3, 1261, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (451, '304882Y', 'cloviseba1513@gmail.com', 'cc0252ec3b80419a25da383e2c6dce11', 3, 1374, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (452, '815431B', 'cmariam897@gmail.com', '0abeec170869326334ac25b08360fac7', 3, 1541, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (453, '852132L', 'condekhady05@gmail.com', '95dfcea7a162ef0677110baf0948323a', 3, 1473, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (454, '350234N', 'coulgniminsie@gmail.com', 'bbe6e4bbf042624c8a868b8ca869b7d7', 3, 1465, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (455, '464165Y', 'coulibafatima@gmail.com', '09d9b632a150b999fcf30cf4cea8de07', 3, 1364, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (456, '433356Y', 'coulibalyisabelle73@gmail.com', '26ea939be8cc3ef5cdd88482e0cf03dc', 3, 1403, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (457, '481519M', 'coulibalykadidja14@gmail.com', '9f297cd88d50bd727a54e8a69fb26095', 3, 1768, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (458, '820545W', 'coulibalykoro11@yahoo.fr', '75902ab4216052ed43230769618f39a5', 3, 1226, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (459, '815436G', 'coulibalylamissa51@gmail.com', '2d6cc293b1eecccc8c7eeed34d461752', 3, 1265, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (460, '830036M', 'cyrillekarnon@gmail.com', '9aaf6a92b03ea1889841df1f167aa77a', 3, 1624, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (461, '815437H', 'dahoue19gmail.com', 'e7fd6cd87406c3f05d9117f36a858658', 3, 1616, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (462, '815476Q', 'damedbattan@yao:fr', 'f48bd41057fedc4508e9e5e13a0a134e', 3, 1214, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (463, '480518X', 'daoudbamba222@gmail.com', '804bb904131d52efc36a2bb24e6a1ed1', 3, 1501, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (464, '481412A', 'datinhanmohokelydie@gmail.com', 'fa2994fdc1dada42af514dd0d1a78796', 3, 1536, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (465, '277839G', 'daveq1010@yahoo.fr', 'c198187b3e44c07fda6e943dfb350d25', 3, 1197, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (466, '855834P', 'davrieveline@yahoo.fr', '6ecee6992d14acf5f4697a3115e26a3e', 3, 1588, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (467, '359186C', 'dcoolet@gmail,com', 'be082a7f68f1e9764db92f4530be7fa5', 3, 1593, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (468, '481566L', 'deafatou13@gmail.com', '5bab05b4d20c69efd0aecd27d6a400ce', 3, 1601, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (469, '481526C', 'Deborahtape48@gmail.com', '3a0f315201d2c9fe70c75682a1820070', 3, 1563, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (470, '297585P', 'dedyjanvier@yahoo.fr', 'ee69028df03fe85d19890d84e9054e70', 3, 1517, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (471, '856191L', 'delaflores21@gmail.com', '4eb7ecebcf16e32ab64fea17a01fd1f5', 3, 1628, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (472, '815664U', 'delvila3gmail.com', 'b88871cdb4ea1f7a63abdff71a4e6b5d', 3, 1423, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (473, '855877S', 'desiresiaaubin@gmail.com', 'ed68c384077348fc71705c0834832ea7', 3, 1311, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (474, '420373G', 'diabatedoh@yahoo.fr', 'a603e18e87fe2951b0f1f8358fb42635', 3, 1158, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (475, '498943X', 'diabatesoman@yahou.fr', 'f12e8c9243b5dc2d6ca5ee16a33b6e24', 3, 1430, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (476, '876947V', 'diarrassoubamassogbe0@gmailcom', 'f0264265f0b9a822f9952eb256c5c0b4', 3, 1640, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (477, '820825P', 'diarrassoubasalieestelle@gmail', '1ad898f5c52542d6f9fe0d3a4e27d658', 3, 1449, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (478, '832853K', 'dibieella500@gmail.com', '279c08ef751296b07633d7ce67f952d9', 3, 1677, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (479, '291178G', 'dijukome@gmail.com', '94c50eb8ece6ef24114702105cbcbdc4', 3, 1317, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (480, '815497E', 'diopjehane@gmail.com', 'aca353b81346fcd87315edaa1a7b279e', 3, 1221, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (481, '418988U', 'djagojustin@gmail.com', '7cc6010ecf63420f9d718e2a3c033a72', 3, 1437, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (482, '832911D', 'djeeneboutraore13@hotmail.com', 'e8d61c31f0c70d1265efad428b55b82e', 3, 1248, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (483, '889097K', 'dmorifere60@gmail.com', '9176d49a7b1d530cab94a084ea6e5896', 3, 1428, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (484, '433357Z', 'dohobalazane@yahoo.fr', '20ef4e01dcbc64a45a6e0609b6c2729d', 3, 1498, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (485, '481976P', 'domikra@gmail.com', '862d988677ceb690b59be0a8c1d437bb', 3, 1531, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (486, '819354H', 'dominiquekonin91@gmail.com', '98bf986abd4adf257d1fef9e1e039e42', 3, 1675, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (487, '272131V', 'dongo-citourisme@yahoo.fr', '9aea1f13b6c005e5d40b4ff33e3d56ef', 3, 1778, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (488, '856181J', 'donybenediction@gmail.com', '074d07c3f60aa654dca1a8cf9330ec93', 3, 1574, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (489, '857121N', 'dorianekouao@gmail.com', '530eca74d2f01afe24c3e38102329614', 3, 1180, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (490, '272129B', 'dossangokone72@gmail.com', '49924090c97aa25c5e36627b2035ff03', 3, 981, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (491, '832859Z', 'dossoaffouchantal@gmail.com', 'c823c1adb95de44b5d46362879293016', 3, 1383, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (492, '246394B', 'doumci@yahoo.fr', 'aa4fc5de9c9cf4109201293129edf9bd', 3, 1566, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (493, '475706A', 'durandagnimel@gmail.com', 'de2c238ec8b94e7d89c293c0dd25a8d3', 3, 1438, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (494, '852216Y', 'echimanevanessa@gmail.com', 'e91e1b8b35437d9f17dc9dc32a099338', 3, 1697, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (495, '345907H', 'eddys_kiki@yahoo.fr', '74648c3107413b57d2540f7658be9878', 3, 1026, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (496, '852217Z', 'edeoujacquesjoel@gmail.com', '1123a752d3c416a75fd882298cf08b37', 3, 1497, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (497, '312887L', 'edithakrassi@yahoo.fr', '29d3bae195fd8af3b820c37d40073d4a', 3, 1207, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (498, '323827J', 'edithoyorou1@gmail.com', 'b80db966a25ef0220c4c086995e30e30', 3, 1357, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (499, '819118V', 'edwigekone48@gmail.com', '9aaf6a92b03ea1889841df1f167aa77a', 3, 1576, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (500, '827817A', 'ehoumanstephanie2012@gmail.com', 'a647d644087b3e70ddb8d255c594a9d0', 3, 1247, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (501, '481942M', 'elaveriekomoe@gmail.com', '17587dcf8d191772aac38db9619f3382', 3, 1219, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (502, '468562A', 'elianemodestine1@mail.com', '349dd0347c2eb774a8d39d92e2277492', 3, 1315, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (503, '855837J', 'elidjerosemonde@gmail.com', 'dbc0f0593962b38bfb53db8cb04f6029', 3, 1490, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (504, '481505Q', 'elisanannan@gmail.com', '0770c39c823b1b1c804cc074e14be46c', 3, 1691, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (505, '815420L', 'elisealloko10@gmail.com', '2e7af5cd8ce11e0e83bdd85f5a35c26a', 3, 1702, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (506, '273520G', 'ellognemarielagaud@yahoo.com', '5b14661a499916c877ef2542f6ea594c', 3, 1489, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (507, '491347S', 'elogeodilon4@gmail.com', 'ee785ceaf277d4a727a3fa05a1e2b968', 3, 1140, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (508, '855865W', 'elvikenza@gmail.com', '1b4030fbea3c933ec016ca77c98165f8', 3, 1065, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (509, '323837L', 'emmazeze78@gmail.com', '141a0bfa4b5990473ef86c2e6cdf172d', 3, 1475, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (510, '832864N', 'eninarosine@gmail.com', 'cf9fdcd589a8ea9423be5de4ca330328', 3, 1424, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (511, '291179H', 'enokou2002@yahoo.fr', 'a4c19156c738d4501372f46f14e998b2', 3, 1603, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (512, '485169S', 'ericattikora@gmail.com', '42c4042fe20cb3dfa3fd04cf64b8b618', 3, 1542, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (513, '480731U', 'erickmensah99@gmail.com', 'a4705ade98c62be28e8ad858dcff7363', 3, 1544, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (514, '304897X', 'essohseke@gm:c', '8fb02ff3f29b747a8a65cad93a62f599', 3, 1783, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (515, '827511F', 'estelleyodam@yahoo.fr', '0e5b2b39cd81a247465b4de0173d1205', 3, 1766, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (516, '345910F', 'eugenekonan551@yahoo.fr', '664fb9a6f6cbccc9dcd2bb48f341b8e5', 3, 1436, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (517, '447587P', 'evaphilomene79@gmail.com', 'ee7571cc3d579a12572683a15c59e645', 3, 1405, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (518, '827419K', 'evekouadio1982@gmail.com', '8d12a5d8cafaf4ecd240cba249adbb61', 3, 1683, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (519, '815418N', 'evrardakesse@gmail.com', 'd3d0a77faec02baac36b378e6f883622', 3, 1525, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (520, '495974K', 'evyciboul@yahoo.fr', '2100aff639c0e4def5370f76816b264a', 3, 1444, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (521, '365484V', 'fagama-k@yahoo.fr', 'c48f9bc4e67f604e1fc82144ad0d0cc6', 3, 1187, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (522, '359189P', 'fahehilarion@gmail.com', '05d70118c2fd7b97b0336ffd52646a86', 3, 1688, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (523, '810021J', 'fanatoure1@gmail.com', 'b2437c3c680251e49b95228df1dfdc3e', 3, 1786, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (524, '467987L', 'fantadelphine@gmail.com', 'c666fd83d2ff02a6685daa84461fe309', 3, 1371, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (525, '855829S', 'fatcoolmaka@gmail.com', '913fb42d8968a5b19e2427a21222b8a8', 3, 1164, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (526, '888832P', 'fatimasegnon@gmail.com', '5008dc3685deea0ec52c30ce30722649', 3, 1745, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (527, '464167S', 'fatimefofana2@gmail.com', 'b77418bcb7246331da4a7fa3363e1e82', 3, 1379, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (528, '481638U', 'fatimsylla220@gmail.com', '8b2acaf664fea343ed02ec11bf305f68', 3, 1157, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (529, '855847U', 'faustinek50@gmail.com', 'b2aaabb472b2079f5610c2e1e97662d1', 3, 1129, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (530, '855833N', 'felimoya41@gmail.com', '424970d2d6fe9e409f60f2b54a44d727', 3, 1427, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (531, '433341Z', 'felyboamin02@gmail.com', 'f9dfeec7c0f28681ffbaf5cde0391235', 3, 1062, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (532, '345909K', 'fernardb@yahoo.fr', '682237b50648238ed46e56730bfe73c9', 3, 1784, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (533, '433879V', 'fleur', '1a4c03ca5f3cff727fb8e5ebc96be435', 3, 1210, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (534, '323835J', 'florenciabeblai360@gmail.com', '32b8bd40c0dd9d69f75f24d17159db07', 3, 1699, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (535, '815449V', 'fofananina95@gmail.com', '9d0445629e41c02aba456bddd0d5b58b', 3, 1567, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (536, '372134U', 'fossoumarthe2@gmail.com', '982b998158220d84171f76d9e17b0f78', 3, 1034, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (537, '810016M', 'francinedehi09@yahoo.fr', 'a2156b352468f8060ad3d721e912f77f', 3, 1179, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (538, '855832M', 'franck-michee@live.fr', 'e1a0dac36ea3306c30801ce11346e7cd', 3, 1185, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (539, '809988D', 'frederiqueada@gmail.com', 'd47d8e83c0cc9c09720ecd1ea85d135c', 3, 1730, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (540, '982994G', 'fsallneuroscience@gmail.com', '2543ed7506688ab8fae850dc5dc64b3d', 3, 1011, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (541, '902716Y', 'gamayokore@gmail.com', '02b522fb537e436d3c9070af59ffd548', 3, 1041, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (542, '468090H', 'gbedjegisele@gmail.com', '065567a0ec8fe53e9ab4ccd6259107af', 3, 1535, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (543, '433382K', 'georgykonan@gmail.com', 'cc13dcb0b2e93ec049e9b30bc3300119', 3, 1664, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (544, '826007R', 'geraldemambo@gmail.com', '9b440ba72c96f56c1ba5506ad6d334cf', 3, 1243, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (545, '507038Y', 'geraldine.vovor@gmail.com', '2640259ca200035d79770d5386012851', 3, 1108, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (546, '855891R', 'gerardzehia@gmail.com', '965eb79335e35375d5c2ec99ca6fefc4', 3, 1370, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (547, '290488B', 'germain_ak@yahoo.fr', 'c349ff821d838ee20b8339d2b7c66192', 3, 1803, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (548, '802321Y', 'Gguessanfrabricee@gmail.com', '79b0807224710a0261784668c34048f6', 3, 1340, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (549, '447591K', 'ghislmainezadik@gmail,com', '3071dc7a9d54a956d06a31197a5654fc', 3, 1344, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (550, '467423N', 'gh.kouakou@tourisme.gouv.ci', 'f1dacd27e88d20c0c784c03fd4fb3d8e', 3, 1147, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (551, '464168B', 'gloumarina17@gmail.com', '2fcee239d8ecdc06b31eecb02c9f7c1b', 3, 1690, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (552, '855841W', 'gnabrorita@gmail.com', '80d50340027ad2d0e9a62d07386ea39d', 3, 1241, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (553, '355154F', 'gnahoua@gmail.com', '9676a596202d0dd881bccbbb3c8cd64d', 3, 1278, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (554, '852197N', 'gninfiguecoul@gmail.com', '18d746f8ceb170b34b9b0685e2cbd375', 3, 1518, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (555, '468200U', 'gogouatanguy@yahoo.fr', '79a378b936a0ee3ac6be89d87a35bd85', 3, 1061, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (556, '864879D', 'gonezielydie16@gmail.com', 'ba7ef62716c171e0acf3a205fc9ad017', 3, 1655, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (557, '886369C', 'gonkanou80@gmail.com', '07d0a2803a485d826ccfd6075443fd46', 3, 1155, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (558, '504955Z', 'goore_sarah@yahoo.fr', '138cd4a69e913baa51ef2a9cf31d47d9', 3, 1239, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (559, '337228F', 'goredji78@gmail.com', '06110df237469ba56e73fb48dc1b6bac', 3, 1025, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (560, '323836K', 'goukouamar@yahoo.fr', '1465c438f788d9d24ef90b5d2b457fff', 3, 1222, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (561, '233613Z', 'grahtacka@yao.fr', '6704d7880e3f26dac2d99029f7ad7405', 3, 1277, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (562, '305872E', 'gregoireayoh@yakoo.fr', '4f37ffc4110ce45e23b8caf5c17136ea', 3, 1772, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (563, '304896W', 'gueiaubin01@gmail.com', 'e4bab99e976a54e934e99aa89297a0b5', 3, 1461, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (564, '304886U', 'guiraudchantal07@gm:c', '11f14e2c4a3bb09e522d3b7661702795', 3, 1191, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (565, '201957B', 'guykodjo2001@yahoo.fr', 'a09a66920d1bb6676007c106f263567b', 3, 980, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (566, '291182M', 'guymariusbro@yahoo.fr', '58b7c7efee0a5c12b2e2bd3227093397', 3, 1339, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (567, '480638F', 'habakukkouadio07@gmail.com', '2f1fa661b09735b84a16ec9d027c440b', 3, 1619, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (568, '810493R', 'hadjabinate@gmail.com', '0d723f4704d8766d31d9aaa2ebc09d0f', 3, 1757, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (569, '482306Z', 'h.allade@tourisme.gouv.ci', '07dd80602e0369aaef9c48d257d43f25', 3, 1148, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (570, '820542T', 'henriaka85@gmail.com', '1ecf7dabcf1ce4f8f141b99fa2851bdc', 3, 1458, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (571, '467173T', 'hermanbezi@yahoo.fr', '348dea83501518872f8835f2dbff72ba', 3, 1134, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (572, '447589Z', 'herveetia@yahoo.fr', 'aca353b81346fcd87315edaa1a7b279e', 3, 1440, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (573, '815450S', 'hienanais03@icloud.com', 'f2545afa68e2aa49a8124d2a2597c937', 3, 1740, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (574, '832885C', 'htour8012@gmail.com', '3101c78315816f4c289cb82b92cb3740', 3, 1597, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (575, '291170C', 'hyppolite-citourisme@yahoo.fr', '2f439198c0dbe2693848057ce1f02832', 3, 1777, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (576, '277838F', 'ibndiako1@gmail.com', '7365a8b88c64117bd3c25f3e64d62335', 3, 1076, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (577, '898664G', 'ibrahimdiarrassouba2016@gmail.', '2025032530d6199659d57aab18d12770', 3, 1445, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (578, '313047V', 'Idasabangni01@gmail.com', 'a29bbbbee1c40c29c3929219d2844da2', 3, 1583, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (579, '481418Q', 'imeldaeba95@gmail.com', '494efc6abbe7feacb5eb02c19460b384', 3, 1132, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (580, '291171Z', 'insatag@gmail.com', '9bd897807dc2332c3691eee7c1f42f49', 3, 1139, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (581, '815475P', 'isaacmouroufie@gmail.com', 'd10e332060e556d4d1dc7aa433663154', 3, 1513, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (582, '504953X', 'isabellean@gmail.com', 'b42efe1c04ba137c182ba2bb373abe86', 3, 1263, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (583, '889628B', 'jared@gmail.com', '09b701ee58cf42e051d5fc22b37062c8', 3, 1334, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (584, '365485W', 'jeamarie_kouac@yahoo.fr', 'b19fa7c8291525c54d2724abbb2e7f87', 3, 1788, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (585, '371987T', 'jeanarthursohh@gmail.com', '007e87d00bf41cb4c1dbf9e3c239be92', 3, 1561, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (586, '313054U', 'jeandanielledidi@gmail.com', '69ee0324ceac49bbf81e15f1d792f929', 3, 1161, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (587, '481590R', 'jeanfrancisbami81@gmail.com', '1aedcde772114cb72db0c282dedb3ce7', 3, 1549, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (588, '338383C', 'jerometinde@gmail.com', '3e06a8de8ad653e9ce0d4dc11a31ed07', 3, 1077, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (589, '827781N', 'j.logbo@tourisme.gouve.ci', 'c41ec9577c2bf3288a32ce892413ca8f', 3, 1150, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (590, '480632Z', 'jlover806@gmail.com', '90c5f7bc22f6238bf1e9e3d692c3a772', 3, 1595, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (591, '855856V', 'joachino82@gmail.com', '8d12a5d8cafaf4ecd240cba249adbb61', 3, 1594, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (592, '820543U', 'jobosll02@gmail.com', '559efc78a26798ca18eb9ae40d028a0b', 3, 1585, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (593, '291184P', 'jocelynecitourisme@gmail.com', '53ac1347f2e958f3dc64d823f088cdde', 3, 1781, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (594, '471018X', 'joeltahe01@gmail.com', 'ad5feb6e4f5f34635cd5c11a7f89dcf2', 3, 1694, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (595, '827945J', 'jojochampion40@gmail.com', 'ee19b6cb1549dfe5e6c5c6b39dd8f607', 3, 1482, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (596, '313044S', 'josephbogui@yahoo.fr', '092717b34e7dc37405a680d7dba7463b', 3, 983, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (597, '361854B', 'josianezoeyapi@gmail.com', '08ffdab9e4277f3446a82002ceb1a702', 3, 1453, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (598, '337230D', 'judithosse1218@gmail.com', 'c3c9ee011715fe9994524d53d90758db', 3, 1322, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (599, '291176W', 'julesdamassaraka@yahoo.fr', 'cf83bf0114e8b65d282967c9cac524e1', 3, 1508, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (600, '390102C', 'juleskonankoffi@gmail.com', '1aedcde772114cb72db0c282dedb3ce7', 3, 1297, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (601, '272133X', 'julienkonouadezanka@gmail.com', '9bb4e922e2a33c04ea86a49a7a06a7ea', 3, 1578, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (602, '418951W', 'justinelea.kouame@gmail.com', 'f04ed141eaee0e8616589aa5f9d74db0', 3, 1446, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (603, '482868U', 'kab01distribution@gmail.com', '5a5cf590c610ec8a5c7f9da8fd7ee9d4', 3, 1338, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (604, '297630F', 'kabis05@yahoo.fr', 'd09603599b0c8763f7445fcdf4ea9e74', 3, 1495, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (605, '357870K', 'kacoujeanmischael@gmail.com', '878f9536880bae47648c33b3fa02cbce', 3, 1604, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (606, '810584L', 'kadhyanicette@mail.com', 'aa17ad928f547b6cfdd248c95a4a04a8', 3, 1455, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (607, '870807G', 'kadiobrice84@gmail.com', '1617f565c0c7f3043400dd0dcc0a543f', 3, 1795, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (608, '855827Q', 'kady793@gmai.com', '75256c2c65fa0ca4211b99e4efee0806', 3, 1741, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (609, '815435F', 'kadycoulibaly308@gmail.com', 'c1bc4ec786039ea21ca50e66c6ae9ba0', 3, 1328, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (610, '291172S', 'kadymichelle_cit@yahoo.fr', 'ad9c9f1b0d5e9ed761cf7b3deb3c7953', 3, 1773, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (611, '304888E', 'kakoun234@gmail.com', 'a33adfb71eee6e0335c423c2a844ac84', 3, 1319, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (612, '483707U', 'kamagatenalima@gmail.com', 'b08f788e53e104202ee3dc0efa3dfe6b', 3, 1372, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (613, '852231X', 'kamatéaicha83@gmail.com', 'a45f7859f46e105fe432ea958e9bc488', 3, 1552, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (614, '827761Z', 'kambirearnaud@gmail.com', 'aaa0035587d283f834429ae9b5fa7795', 3, 1698, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (615, '291175V', 'kamenandesire@yahoo.fr', '0c347f2ba2972dd5522a0349c9f2065b', 3, 1648, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (616, '815456L', 'kangeandrea@gmail.com', 'e4f95ee411860ebdba663062947fd012', 3, 1582, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (617, '811076N', 'kangoutefantaa@gmail.com', 'e1154d844d3f85d48949ad3beb6df6e1', 3, 1017, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (618, '481934D', 'kanintaofatoumata@yahoo.fr', '290c09fe477e05ec498f27811f10bb55', 3, 1271, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (619, '816080L', 'kanouanemilie77@gmail.com', 'edf7185d159516b2fd2243898829f933', 3, 1502, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (620, '480679Q', 'karmandenbelle@gmail.com', '64e9d35cb718123b20cfc49536461f90', 3, 1557, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (621, '421314J', 'karnaudjoel2110@gmail.com', 'a891ba4cbd856d4d1e1fd7d14f1d40ed', 3, 1313, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (622, '815458W', 'kassata57@gmail.com', '31db21ee68dd7ed8874874afc4042c8a', 3, 1658, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (623, '203254L', 'kassikouatrin@yahoo.fr', 'ade0420ddcbaeb0671f4b811260ca1f9', 3, 1792, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (624, '815447K', 'kassiperpetueferdinand@gmail.c', '21c0100815e492e10ea7eb4afdcac91b', 3, 1581, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (625, '251283H', 'kbonyassoua@yahoo.com', 'a0cc8fbb0a862634ca6204e1bd378f17', 3, 1249, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (626, '815507Q', 'kbrouliliane@gmail.com', '678b209618107aa8c25db91b49527e41', 3, 1124, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (627, '832874Q', 'kebemamy25@gmail.com', '63fd8add6a885bbae99953e940e88a75', 3, 1425, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (628, '827824H', 'KEDMOND01@YAHOU.COM', '7847bb82868f14dddf4c468619106062', 3, 1609, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (629, '874645C', 'keitadily1@gmail.com', '479c0a1d4b6c244c51edd270eab4ec67', 3, 1309, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (630, '815461R', 'kflorentine17@gmail.com', '3101c78315816f4c289cb82b92cb3740', 3, 1681, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (631, '815462J', 'k-florentine@yahoo.fr', '3101c78315816f4c289cb82b92cb3740', 3, 1622, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (810, '885708G', 'niamienoi@gmail.com', 'dddcc4975474180c4bd7d97dd023bb3a', 3, 1533, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (632, '456919U', 'kibediomariam@gmail.com', 'df42379ab201b51645fd5e61169c8439', 3, 1280, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (633, '826009T', 'kissamaxout22@gmail.com', '6f01efd5510074fd183c3b81fc0f9fab', 3, 1069, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (634, '159015T', 'kiyalamini@yahoo.fr', '02bd624c17f89be5ee7d3df1705f04a8', 3, 1749, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (635, '464171W', 'kliliane.lk@gmail.com', '625b03a252e0701df3f94ac8205d24fe', 3, 1478, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (636, '481935E', 'kmariam507@gmail.com', 'a1579b27b47a214874ce0a5414279f4b', 3, 1575, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (637, '304899H', 'kmarleinesandra@gmail.coom', 'a6ccd80925a5de02cf158fd9a1d828f6', 3, 1769, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (638, '855857W', 'kneric07@gmail.com', 'f49bf50f529cda6cd4e04d944c9319a3', 3, 1392, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (639, '372652K', 'kngussanpatricia@gmail.com', 'bd60bd07de8056346cf742277d29e63b', 3, 1290, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (640, '158733E', 'kobenansriki@gmail.com', '454bb0be21f562359ca4a2ccb7ab196e', 3, 1470, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (641, '480694Y', 'koffianickflora19@gmail.com', 'd9167dc405500de948b6b96e0a1c71c0', 3, 1671, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (642, '480624Z', 'koffi-draillit@live.fr', 'bab65caa81d9a97708d86778f950fcf7', 3, 1511, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (643, '313055V', 'koffigisele@yahoo.fr', '48687833af5f7878eb7de7988de49818', 3, 1301, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (644, '480695Z', 'koffikonanfirmin38@gmail.com', '71513cb163b1bd173fc5d95b9a8c8c03', 3, 1620, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (645, '815454J', 'koffikonannihoka@gmail.com', 'b2aaabb472b2079f5610c2e1e97662d1', 3, 1212, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (646, '885447J', 'koffikouabran@gmail.com', '00d0c17bf8dcecb10b8b1de4c9a8a46f', 3, 1798, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (647, '400817T', 'koffisuzanne1974@gmail.com', 'd74ef74835120e93739e5b5c0b61508f', 3, 1589, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (648, '897985A', 'koguiri@gmail.com', '5eedf360110b73d1503acf179c9dee1c', 3, 1287, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (649, '387981N', 'koidelaur73@gmail.com', '25b560278c4aaabafa35283ec23148ba', 3, 1528, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (650, '469479Q', 'kokoraantoine@gmail.com', '4eeed8974e28429d57facaa982a8c21c', 3, 1466, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (651, '874067U', 'kolosoro1995@gmail.com', '378e930fb549798da6e66912f244ebfa', 3, 1103, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (652, '506862W', 'komah.fatoumata@gmail.com', '57895ae2b42a74f6782630eeb9142a1b', 3, 1244, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (653, '418948B', 'komenank.souimbou@yahoo.fr', '2ee049d8b2df23272b57dddcf32dc77f', 3, 1532, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (654, '481905R', 'konanahoure@gmail.com', 'b49c21c5f2e6cc19caa0112199fbd63a', 3, 1643, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (655, '834755S', 'konanguyjeannot@gmail.com', '9c0fc0a8e2e62410a3feeac728159905', 3, 1539, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (656, '982975L', 'konanyaoalban3@gmail.com', '75d5c333e059f5fb96cf5236dd9ce7cf', 3, 1196, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (657, '855851Y', 'konatechonkouho29@gmail.com', '0c3232e6de11ce834f44eb508d7c355e', 3, 1636, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (658, '359178T', 'konatemous1977@gmail.com', '25b193c0aa0d38f55474dacd0124779a', 3, 1527, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (659, '307251R', 'koneilaria@yahoo.fr', '851d151212a15aa2731b375b3a13bbf3', 3, 1114, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (660, '855852Z', 'konekadi1997@gmail.com', '4568e027b128474457ca5eaf507e9351', 3, 1128, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (661, '887494C', 'konelosseny84@gmail.com', '78c09cb9050c9a27d4f6d39a1fb0b511', 3, 1194, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (662, '815459X', 'konemadad@gmail.com', 'da0bd32e9386fa2793c5e4e86b54a09f', 3, 1163, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (663, '887502L', 'kossonoucharlene3@gmail.com', 'b47beb516346429b530b72e942a8e4af', 3, 1259, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (664, '855854T', 'kouadio_akoly@yahoo.fr', 'd0633514a752dcb2c45b0ed89e83b315', 3, 1101, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (665, '323856X', 'kouadioaya19@gm:c', 'dc5aeccbe68fd9c311495fcfc33bc999', 3, 1296, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (666, '487322M', 'kouadiodemica@gmail.com', 'cb6ca3e2874ea04c88071b885494b999', 3, 1250, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (667, '359190L', 'kouadiohortense638@gmail.com', 'fd96b1662b0c357742fa827cb5a6a544', 3, 1123, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (668, '481392N', 'kouadionguettiaa@gmail.com', '43700a6ede292ed944c899ad82a9c9d3', 3, 1467, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (669, '890060E', 'kouadjanésikayah@gmail.com', 'b07a6ea0e8867075f8268fa5658b08d5', 3, 1720, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (670, '481073R', 'kouadjannia@gmail.com', '9dca73cd64fc3543a06b4548a3b826c5', 3, 1153, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (671, '827768G', 'kouagildasmathilde@gmail.com', '4d72bab993dddbac8927e10e644b452e', 3, 1195, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (672, '313040A', 'kouahomichel@gmail.com', 'b72691f219d12b2d3c44f57c0e0a4b81', 3, 1417, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (673, '480580S', 'koua_juliette@gmail.com', '6a84a7741245cb13988f6fac9665649b', 3, 1701, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (674, '889388B', 'kouakou14marie@gmail.com', '661d9dbd35e3aac6a49c2462a43eaaa0', 3, 1193, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (675, '315928X', 'kouakou-amoinsolange@yahoo.fr', '3f6a0373b3a099d8e6c49b3137157788', 3, 1738, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (676, '470988C', 'kouakouaristide1978@gmail.com', '71513cb163b1bd173fc5d95b9a8c8c03', 3, 1459, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (677, '349302W', 'kouakouavit@yahoo.com', 'a89eff1c1ef28c87774360edd79efaca', 3, 1493, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (678, '874654D', 'kouakoumodeste67@gmail.com', '92b24fb6fdf449d9d77e0068482fb682', 3, 1666, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (679, '435225P', 'kouakousamson84@gmail.com', '3fbe6a456778a41ef6201ba9b53c3503', 3, 1434, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (680, '855866X', 'kouakousylvain30@gmail.com', '01f8968ee328a6bcd2b51dbce5bd6948', 3, 1642, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (681, '482932C', 'koua.kromuald@gmail.com', 'b6acd62a862be500c176b02e01cb562e', 3, 1506, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (682, '323853U', 'kouamedaniel180@gmail.com', '47b59491bf93f4fad46f4412062bc114', 3, 1376, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (683, '358754T', 'kouamefelicieno@gmail.com', 'ade9ddd8b6eeba5ecffada4847fb7f43', 3, 1652, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (684, '855860D', 'kouamefranck014gmail.com', 'a891ba4cbd856d4d1e1fd7d14f1d40ed', 3, 1225, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (685, '889420X', 'kouamelanadje jean10@gmail', 'd9ef1cf7a56058ab2693ea3ebba2eaa9', 3, 1708, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (686, '418984Q', 'kouamenar6@gmail.com', 'f04ed141eaee0e8616589aa5f9d74db0', 3, 1559, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (687, '277841A', 'koua-nanan@yahoo.fr', '85e049798e326ac504dc2b7e04ef0c31', 3, 1540, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (688, '334707D', 'kouapol@gmail.com', '26343626d61660b6398156a5e578274c', 3, 1447, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (689, '345916Z', 'kouassicatherine29@gmail.com', '89c5e60f253dc322310d72bd11f9e3f7', 3, 1452, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (690, '815468Y', 'kouassiemma5@gmail.com', 'a0b7284ae87b6a3f5f09a66fae31eafe', 3, 1623, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (691, '826005P', 'kouassindriromain07@gmail.com', '89c5e60f253dc322310d72bd11f9e3f7', 3, 1684, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (692, '885472K', 'koukou.geraldine19@gmail.com', '7a798a49ba406e32bb6df1d8a6706d42', 3, 1521, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (693, '855853S', 'koura85@gmail.com', 'bb82f1c8d60dd03d7c0710836060d3d1', 3, 1487, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (694, '384378M', 'kourasoma@gmail.com', '6b1a7468b4a7c31c4ce018541681f08e', 3, 1375, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (695, '366249Z', 'koyatriomphe03@gm:c', '03856546a36124d981b5f4251dd7f558', 3, 984, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (696, '323849G', 'kpangbacelestin@yahoo.fr', '3ae8e6598766b9c6c0cba2d2ec677ba2', 3, 1477, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (697, '855859G', 'kpatrickeddy@gmail.com', 'e4b1979df22fa0be9a6a991eda9c3730', 3, 1141, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (698, '480594L', 'krahestelle70@gmail.com', 'f566f7d05584ef2e5b3b8571d334de9d', 3, 1168, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (699, '389796E', 'krajoseph@gmail.com', 'b946ed3450f2e504cdcbe1e362747a2b', 3, 1789, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (700, '852240L', 'kramatou5@gmail.com', '0c3232e6de11ce834f44eb508d7c355e', 3, 1267, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (701, '874813M', 'kyaya2356@gmail.com', 'd5dada89f3c48724a907413bef53a42d', 3, 1335, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (702, '815472L', 'kybarakissa@gmail.com', '2345f99657141440a6f975f92c3bc536', 3, 1063, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (703, '506294V', 'lacine6gmail.com', 'f96df7c2ec2a78c2665cd686fe8be4eb', 3, 1736, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (704, '852286X', 'laetitiasoumahoro6@gmail,com', '3791f956b5c466265e3df696e5c9e919', 3, 1341, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (705, '272140J', 'lamineako@yahoo.fr', '005f1d688b20bc2ef3549b578cad97d4', 3, 1299, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (706, '481572J', 'lamine.desohn@gmail.com', '3f2b20371b7f6129da7b0000518d30b2', 3, 1337, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (707, '886661Z', 'landrytouvoli@gmail.com', 'fb9092500aa152fa1e5ecc401a584afc', 3, 1039, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (708, '386604B', 'laovaht@yahoo.fr', '6bdf5b14344bb20421a93aa52cb462ea', 3, 1663, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (709, '815427F', 'lascoc.2000@gmail.com', '02ec0e4d52426d59ed1e14a459466a58', 3, 1599, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (710, '827422E', 'latikouak@gmail.com', '92b24fb6fdf449d9d77e0068482fb682', 3, 1754, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (711, '323830Z', 'lauraclaude11@gmail.com', '1ebb7d283d23ffcedc6fc47743bdab76', 3, 1172, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (712, '815446J', 'laurennedasse@mail.com', '40e7b214a2fe02c71e950b87a4540dcd', 3, 1398, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (713, '337227W', 'leabahou@yahoo.fr', '9f4a8867143ee1f7581c0422086e17f0', 3, 1763, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (714, '323857Y', 'leonceeba@yahoo.fr', '1f86d054c377bb82ad5fa4b00a8fa1e1', 3, 1401, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (715, '359179U', 'leonierolandeassemienkodjo@yah', '73e825e77ddc1972c521775da4604bbb', 3, 1785, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (716, '323842Z', 'lesdohi@yahoo.fr', '261a6f416c869fa9ab587643b137af89', 3, 1767, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (717, '365770W', 'lezouthierry@yahou.fr', 'ca9ec5ef997dec0861eeda49e90a0c6a', 3, 1175, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (718, '291090Y', 'lidjisylvestre@yahoo.fr', '5979016329d63bf7643ea6779921f6e4', 3, 1073, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (719, '272128A', 'lilianenzue@gmail.com', '7a88df73b2da8c257bf890babab973d6', 3, 1396, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (720, '832886D', 'lindakouakou47@gmail.com', '2f1ba734f23d7f2808992066a187a641', 3, 1678, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (721, '359136H', 'line.yass80@gmail.com', '626ce6c6ba2d119fab793cf358508aae', 3, 1162, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (722, '297577W', 'lisaguessan@yahoo.fr', '7e7d5579a910425f3f4d96ea41f9a8d6', 3, 1138, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (723, '982971Q', 'logossinatoure5@gmail.com', '17b3c66d66fa2af6a4620cd932e7fca2', 3, 1018, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (724, '815473M', 'lokomondezire@gmail.com', 'f4c5f3afff014802eeb838fdce09f583', 3, 1611, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (725, '855830X', 'loradagan@gmail.com', '6d6ed34187060170c55c0f9331e0c33f', 3, 1346, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (726, '855881P', 'loryagabasoro@gmail.com', '352ce61018d09e59b23b93ec3349dfd0', 3, 1680, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (727, '855869A', 'louisentaye@yahoo.com', '56224effd1c59249ef8aca43bb69acbc', 3, 1692, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (728, '318251K', 'loukouerickonan@gmail.com', '871d1b3799262c36a5e0e5b8ea0ea2a8', 3, 1654, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (729, '803457S', 'loumichelle96@gmail.com', 'cb9eee03e0bcf248de669c6aff94d352', 3, 1580, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (730, '815669H', 'lsilueem@gmail.com', '30b99be623d618398a5747ae4286d7b0', 3, 1448, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (731, '357771K', 'lucienndrikoffi@gmail.com', 'f70840a118594a0e2553928a66a59a5e', 3, 1551, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (732, '480710B', 'luciennekouadio9@gmail.com', '3101c78315816f4c289cb82b92cb3740', 3, 1303, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (733, '447958A', 'lymata2@hotmail.fr', 'da0bd32e9386fa2793c5e4e86b54a09f', 3, 1363, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (734, '889093P', 'lyndadagrou3@gmail.com', '96a07206f890542048eb05c803bf7b85', 3, 1254, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (735, '803534P', 'lysemariaamp@gmail.com', '8222e5c67b9b9b649af55e443572b9dd', 3, 1472, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (736, '875678N', 'mabioangele82@gmail.com', '8260850e41f7fa188a22a6683a655c3f', 3, 1391, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (737, '507163S', 'macaire.dagry@yahoo.fr', '229c3ccb1e0e21435fea6aa91351ada4', 3, 1726, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (738, '855887M', 'madanetraore69@gmail.com', '2a7b98494ae6bbbce4b5feb4c0af6d4f', 3, 1614, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (739, '480692W', 'madoussoukaramoko40@gmail.com', '44d262a0e9e8e675d66e956dc6c2d21c', 3, 1480, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (740, '807762F', 'mafantad@ymail.com', '1221e6a0de292530a7077f1a2ce64f2d', 3, 1787, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (741, '815491G', 'maimounata48@gmail.com', '76092452bce87e20d82810d33b25f846', 3, 1329, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (742, '323846V', 'maitredjahi@gmail.com', 'ef8fae7dc381ef95a186b33a0659ed7d', 3, 1361, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (743, '481978Z', 'malickndri08@gmail,com', '9672b838674a18175ff5a2a1efc05caf', 3, 1381, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (744, '313045T', 'mamaedwige2@gmail.com', '0c5ba5af75b48b790e391af7f76d7e6c', 3, 1474, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (745, '268184F', 'mambreguera2020@gmail.com', '8f900cfcbebc4d34e1e634fa6ae5f29f', 3, 1131, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (746, '361146D', 'mamradatou@hotmail.fr', '6d81f7359c53054e906fca651edeeffa', 3, 1782, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (747, '265045B', 'mangouaken@yahoo.fr', '5ead69b2e50824af90dd1aa615db9fb0', 3, 1753, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (748, '890209M', 'manouci88@gmail.com', '10f3f078ead8306a8ff8de8f7ffc6b19', 3, 1289, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (749, '834086G', 'marcellebalo@gmail.com', '0755eecc47b42cda6cca12e23cbded59', 3, 1485, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (750, '858955B', 'mariamcoulibaly629@gmail.com', '913fb42d8968a5b19e2427a21222b8a8', 3, 1457, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (751, '875950B', 'mariamouattara107@gmail.com', 'f01552723e8f6898c217d0dd98ed68f0', 3, 1591, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (752, '481494D', 'mariamsylla585@gmail.com', '749a42fed2aad21013ab9a118f5c432e', 3, 1516, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (753, '345913W', 'mariane710@yahoo.fr', '6eee2e06c1cc088c8350f3b4fbf62daf', 3, 1300, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (754, '815426E', 'mariebetyb@gmail.com', 'e9772f80100ac9383fd586f2f9d30366', 3, 1673, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (755, '815445R', 'marie.chantal476@gmail.com', '655c20a39961d91973906c0ad6e70921', 3, 1408, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (756, '832854L', 'mariedaniellediomande48@gmail.', '7edc76979cd147e62fd16de8dd21f881', 3, 1484, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (757, '245090H', 'marie-franceit@yahoo.fr', '3f9c8cbfe150eec5f3436e25170b6bfa', 3, 1752, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (758, '826001K', 'marielaure0965@gmail.com', 'ba44644159727f51753a4e2ef967c271', 3, 1682, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (759, '265431T', 'mariemere09@gmail.com', 'bbc60eef1fc0b439c45c2fc294eda6ff', 3, 1067, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (760, '855842X', 'marie-noelle73@gmail.com', 'ce0a7d6ffc1ae63380170ce913a9159e', 3, 1413, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (761, '855845S', 'mariepaulekan@mail.com', 'b560eaccdd6119036c3cb2cc495523de', 3, 1598, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (762, '834105Q', 'marleinekoffi@gmail.com', '00f3f176077e72116f40667e3170d92b', 3, 1306, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (763, '810000A', 'matessob@gmail.com', '14705889e9a824e6a3f29c77721e8c0e', 3, 1780, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (764, '982998L', 'matheaka@gmail.com', '6ef61f6bac958e12fbaeb464ad13af85', 3, 1014, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (765, '345912V', 'mattazara@gmail.com', 'b8f3c28b3f3ea54e2286b33f41ab5a34', 3, 1074, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (766, '855880S', 'mayollesombo230@gmail.com', '31304034b1b5c6879357bdc40bb603fb', 3, 1586, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (767, '291177X', 'mcdanho06@yahoo.fr', '40a68fef333cc4cbeb947cb1305402ea', 3, 1416, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (768, 'CC-EDU-001', 'CC-EDU-001@auto.local', 'd5dada89f3c48724a907413bef53a42d', 3, 142, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (769, '337226V', 'melakoffi1@gmail.com', '0f7e46718cf3448680822449a7891d95', 3, 1218, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (770, '855858F', 'melaniekouakou@gmail.com', '81e32ca9542de3af437ae6b45f13a27f', 3, 1464, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (771, '433903N', 'melanietano@yahoo.fr', '9caf24570b378dfcb348192b6b0f2c73', 3, 1190, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (772, '323845U', 'melyzandepatykoffi@gmail.com', '268196169a8493f06d4dffc57a5255e9', 3, 1167, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (773, '315994J', 'merlaincotedivoire@gmail.com', 'a28423f743f6b6423dc5481a8fa8c289', 3, 1494, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (774, '855867Y', 'michellebety55@gmail.com', '342a8a49d9cd35cd0866538ad20aa5ac', 3, 1679, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (775, '313051Z', 'michelnouoman@yahoo.fr', '165ec6292a637facfa023db399c56927', 3, 1696, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (776, '855884J', 'micheltehouakouakou@gmail.com', '80503727d7682d161de71d87537a7dc5', 3, 1439, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (777, '815460U', 'minatakone1985@gmail.com', 'bb82f1c8d60dd03d7c0710836060d3d1', 3, 1307, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (778, '886292Q', 'minzdiabagate@gmail.com', '87c8ce1c14b370d1bd872ac38a022149', 3, 1744, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (779, '815434E', 'mireillecoulibaly02@gmail.com', 'c1bc4ec786039ea21ca50e66c6ae9ba0', 3, 1649, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (780, '323833Q', 'mireillesessegnon@gmail.com', '9ef0204dc0f79c142f98975f0a916ee1', 3, 1231, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (781, '319371L', 'mireilleyeboua@yahoo.fr', '17430f798b97367084e3cef4854ee6be', 3, 1269, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (782, '902371E', 'missbamba2206@gmaill.com', 'a68cb10a4f7edaf4bb864363f82b6798', 3, 1040, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (783, '889425Q', 'missjuliekouassi@gmail.com', '2deb044c2aea92e73e1d3c7c2298f555', 3, 991, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (784, '481434G', 'm.kamagate@gmail', '0cb1b586d897d3f38418b27c6a70e33b', 3, 1202, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (785, '313050C', 'mmedodo71@gmailcom', '68e056fb6025c6eaa108f0f93aeb7ccc', 3, 1760, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (786, '291174U', 'mounadika@gmail.com', 'bf5d470e853b51b27276b98a6ae3b905', 3, 1433, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (787, 'SANTE003', 'moussa.kone@sante.gouv.ci', '9fca8913eb42cd34740263f50a2d5d3e', 3, 10, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (788, '825999P', 'mt.kakou@tourisme.gouv.ci', 'a0c0eada2e758f713a7eb7afe8885cb1', 3, 1142, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (789, '855864V', 'mymielaure@gmail.com', '45b1d6d026d7b96f4d27ea2c8b0c74aa', 3, 1064, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (790, '855467X', 'nadegeyaopro@gmail.com', '6f463fd97e479aa237df7c1e71ade05c', 3, 1125, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (791, '815423B', 'nadiaassi2013@gmail.com', 'fc7b7a3d624086ec71b490991313cbf1', 3, 1382, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (792, '323831N', 'nadiamony@yahoo.f', '9337b7ebb7c9b9fdb8497d2b0f569eb2', 3, 1358, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (793, '491244T', 'nakasery@gmail.com', '202dc53d2c8996c2bc12ecc0a5925c44', 3, 1587, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (794, '890118Z', 'naomyhlohoues@gmail.com', 'fe70f8a72baf971d2b65d4d6afecc361', 3, 1156, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (795, '982828R', 'natachatraore7@gmail.com', '991e73312fcd9c45067e634dc6931cf7', 3, 1045, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (796, '483686P', 'nathaliemiga@gmail.com', 'dbfefade0f0799ea0f4072f62334da68', 3, 1471, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (797, '433404J', 'nattaud@yahoo.fr', '8b0cca5e15a294563c4fa791052e84bf', 3, 1343, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (798, '826255V', 'ndasidoine99@gmail.com', '49eb2bd0f0b0fabf452f4f9e898628b1', 3, 988, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (799, '481983F', 'ndriamenanannick0902@gmail.com', 'fc19e02e42f2312e9ab66530647e65f8', 3, 1443, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (800, '808046E', 'ndrikouadio@yahoo.fr', '3a043c39271e2fd87d28815d8335d324', 3, 1227, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (801, '874661C', 'ndrikouassicharles@gmail', 'b8ee1f2e6be30a4c32e022cc86efaa59', 3, 1504, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (802, '297582L', 'Ndrymariepascale73@gmail.com', '80a004b3685fe34c6187c727a2d04977', 3, 1135, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (803, '447582J', 'nezzipulcherie@gmail.com', 'cac2743a8669a9e90a7628ce972fb60e', 3, 1378, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (804, '298230P', 'ngoranesope@yahoo.fr', '261958e79d8d64fa957e302971aab175', 3, 1755, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (805, '815477R', 'ngoranjacob07@gmail.com', 'f957d2be171d51febdb588eca401d543', 3, 1577, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (806, '815478S', 'nguessanbenedicte853@gmail.com', 'c1e033597daa692a824eb04a23321c1a', 3, 1509, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (807, '815481E', 'nguessannezekiel@gmail.com', '98bcd1cdb8acbc5fbc43e7faa649454e', 3, 1607, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (808, '506074T', 'nguetnaf@yahoo.fr', '1cb4369c1a0546c213a55dcc1a9d52df', 3, 1800, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (809, '286956X', 'niamienap75@gmail.com', 'c6b78a07ec741ceb8421e86c81f43cd8', 3, 1230, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (811, '815504M', 'ninayao875@gmail.com', '0fddbba587f126d63de9984cc3277e54', 3, 1238, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (812, '265648U', 'nkoddi@yahoo.fr', 'fa87f68596401d660a8fe9ebf9fc7d87', 3, 1022, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (813, '885532F', 'nouanoubi@gmail.com', 'd4c3248280e76599884d2db81ffaee85', 3, 1144, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (814, '275045D', 'nsibiriphilippe@yahoo.fr', 'aa6d076587f2aeccaed1900fdc55df50', 3, 1276, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (815, '480586L', 'odahbeat@gmail.com', '2e9a113938df241d2931faa373c143ca', 3, 1479, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (816, '323311U', 'ogouedithsylvie@gmaim.com', '9dd64e4fea9cfc9f28071c84c1bdeddf', 3, 1015, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (817, '481541K', 'okobemariejosiane@yahoo.fr', 'd17a6e191761c3f08f13a3eb50266ffe', 3, 1596, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (818, '323197K', 'olgagnonsian2018@gmail.com', 'a66518bd95a3d6b3c922b15fe0c3e578', 3, 1707, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (819, '355870R', 'olivier.kada@gmail.com', '7755e156acf2a902d46572f393b85e86', 3, 1802, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (820, '982968V', 'orotokraud@gmail.com', '2478bdac6d2d542cb833d7a0809cbaa1', 3, 1181, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (821, '480709P', 'ouattarakorandi@gmail.com', 'af4323bd1b504db10a36d8990d0a1e7c', 3, 1672, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (822, '493835E', 'oumar.abaas@gmail.com', '2a7479a8095eb1656c5ebb5a37fe3e71', 3, 1178, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (823, '481542L', 'ousmaneouatt45@gmail.com', 'f750ae8ed8eb1042e2b62c6716273cc3', 3, 1646, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (824, '901902T', 'outtaramireillessy77@gmail.com', 'a460b1dd982282f85613ec7a3a137f40', 3, 1492, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (825, '420435P', 'oyamariechristelle@yahoo.fr', '705019e1a8e6f57a5020a7038da35fa2', 3, 1550, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (826, '889566V', 'padousylvain9@gmail.com', 'fca92ab5708cbde9d1eeac699a591345', 3, 989, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (827, '982863L', 'pankaoloche@gmail.com', 'cfdb3691ddcad7815d0a92d0a0d3aa74', 3, 1049, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (828, '815474N', 'parfaitmelinmessou@gmail.com', '73052c2a0a5e50cba4d3efed64068b4b', 3, 1496, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (829, '272142G', 'pariablyo@gmail.com', '19cb623d4f6d07075d8f8a13a04621ec', 3, 1060, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (830, '272139D', 'pelaouoteri@yahoo.fr', '21d669fdf9a3326958585bf1fa73c400', 3, 1615, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (831, '830080W', 'philnangah@gmail.com', '8abb44160f3d7238ce55f16e173ba502', 3, 1409, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (832, '255532W', 'phniango@yahoo.fr', '956518b94c46a6586111f1d93a219d89', 3, 1020, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (833, '162855V', 'pikykouadio@yahoo.fr', '98eb2f9e9fbd110cee1a7936ded42e5e', 3, 1805, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (834, '304891Z', 'pouoenock@yahoo.fr', 'ad40783841f45250a75435b742d74e0b', 3, 1630, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (835, '304898G', 'poussin205@yahoo.fr', '9060d0c3ab5e9b40b354d00b3817db3a', 3, 1716, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (836, '480566X', 'priscahoussou16@gmail.com', 'fee55ea8379a888a0844c11a5b70bc3e', 3, 1325, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (837, '323314X', 'priscalobakre@yahoo.fr', '2d4de2736c7399563782d9fdf32fc755', 3, 1052, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (838, '815486B', 'priscaouattara5@gmail.com', '3d066dacb5c11d7abee8354a4d68556d', 3, 1305, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (839, '468207P', 'puce', '237e40d3426882fb490e168190f93b4f', 3, 990, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (840, '806844Z', 'rachelkof@live.fr', 'b94b28d3ffa66acf47aa1fb581dc6cd6', 3, 1228, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (841, '344925Z', 'rachelkouadio2019@yahoo.com', 'f962eb982f403de729cc750c96a81790', 3, 1294, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (842, '855825N', 'radiatesabine@gmail.com', '9e8b71a3e29f8751f9a78c0df09cfecd', 3, 1165, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (843, '852207G', 'raissadiawara@gmail.com', '0d2083a67c5b3ac55cb0979af72df494', 3, 1266, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (844, '887689X', 'raissa.soumahoro@gmail.com', 'eb6da5d49b58d7de577c432a2b289965', 3, 1260, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (845, '323855W', 'raymondgnekpe@yahoo.fr', '6c4b7e035b0b0446fda4614cfc4f25ec', 3, 1105, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (846, '834142L', 'regiinakinangoroouattara@gmail', '4eb7ecebcf16e32ab64fea17a01fd1f5', 3, 1330, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (847, '201560R', 'rohoueu@yahoo.com', '62a679c81ab503a1c0bbac5cbe73796f', 3, 1224, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (848, '480503Z', 'rolandrjadou91gmail.com', '3b5d8c762b3f69eddd1acd90714be49c', 3, 1441, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (849, '419036M', 'romainkouakou80@gmail.com', 'dfb52b52b03e832252146f0ceaee7ffe', 3, 1705, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (850, '323843S', 'roseayemou22gmail.com', 'dfb51cdd872132e6d0f7bf3d935af387', 3, 1377, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (851, '337225U', 'roselineamaniamani@gmail.com', '329a5dfa9d21459e51112b7c654ca2c0', 3, 1080, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (852, '368215R', 'rosiebledja@gm:c', '768b9dc3c62341794e080050591a5a9a', 3, 1027, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (853, '810075Y', 'rosimone88@gmail.com', '4372a5b5ed9e2a38acbe4358cee7de67', 3, 1765, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (854, '827810P', 'sa.digbeu@tourisme.gouv.ci', '0fddbba587f126d63de9984cc3277e54', 3, 1151, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (855, '827509W', 'sahlynejla@gmail.com', 'a9b2a88864470fc52f13a9d8af897037', 3, 1799, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (856, '855835Q', 'salamatad35@gmail.com', 'ef78292420d55a8602e2b50fec6d6468', 3, 1515, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (857, '827978T', 'samuelake.sa@gmail.com', 'be627296eefc7c1873a038112fd2ded2', 3, 1758, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (858, '827829N', 'sandrinemarietaylor@gmail.com', '9c171c0404467a5b3b19aa7c6876d441', 3, 1676, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (859, '863462S', 'sangarefakoua57@gmail.com', '51bc6220c7435bd1cd4d4b9df426c3f0', 3, 1717, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (860, '815489N', 'sekeyaporaphael@gmail.com', '9aee5fd721e9de9d2cae7db6927edd1a', 3, 1659, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (861, '855882Q', 'sekounasylla47@gmail.com', '929128e526d06d9a123a2356f50bee40', 3, 1387, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (862, '272132W', 'sephoragbokhou@gmail.com', '3684a24407c25ae58edfbbe7a45efb3d', 3, 1078, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (863, '815490K', 'serilaikagnon@gmail.com', '7d695b5f858f2b35da61a33bab67b377', 3, 1573, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (864, '855831L', 'serjedahora@gmail.com', 'a74672d0e58cf06ee8e6a5587aa3d483', 3, 1500, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (865, '473683Z', 'setdezy@gmail.com', '40b3527166bc75e56d962539e80fcc2a', 3, 1295, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (866, '815492H', 'seudro1991@gmail.com', 'd3ef152156252edf216351305d7e38be', 3, 1651, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (867, '345906G', 'sidoniendri09@gmail.com', '6d141930c5f16025005fa2d9b89f8ca6', 3, 1075, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (868, '312892R', 'sie505@yahoo.fr', '9977fab4e8916736c8865ed32e7267c5', 3, 1119, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (869, '265759T', 'sikobeh@yahoo.fr', 'cd174f6c461be58c9ab6e5a9f21b5254', 3, 1216, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (870, '855844Z', 'simignoestelle@gmail.com', 'bc8cb29cbc3c9a7be71b24d521007ea5', 3, 1706, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (871, '815421H', 'simoneamakan@gmail.com', '148561e60c4dad8f2ad194a9f63bf9b9', 3, 1327, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (872, '480587M', 'simonekouame15@gmail.com', '3fbe6a456778a41ef6201ba9b53c3503', 3, 1454, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (873, '468537Z', 'singoalbert01@gmail.com', '4a51003202dba71612120c8958b15b4a', 3, 1351, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (874, '275295D', 'sobef@yahoo.fr', '47e5025b350b4488016c3645602fc05f', 3, 1023, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (875, '855879C', 'sohouanyejoel@gmail.com', 'a2fb52d5e010fa776bfcf55a8ce303f8', 3, 1558, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (876, '313773H', 'solosarkoht@gmail.com', '21d38982d47723342203b33d2819effa', 3, 1523, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (877, '297591M', 'soroma05@gmail.com', 'd0f2cb72720cae0a885d727b9a250644', 3, 1686, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (878, '852280D', 'soromigborokia@gmail.com', '378e930fb549798da6e66912f244ebfa', 3, 1631, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (879, '291061W', 'soumahoro.felicite@yahoo.fr', '442f6da20b36374045036366c7034f8d', 3, 1656, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (880, '482004N', 'soumahororamatousr.1996@gmail,', 'c7859d409e0148c7323a3101d3b0b83f', 3, 1537, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (881, '323828T', 'soumepargaite@yahoo.fr', '5825823d92270b3b8023f952432d076a', 3, 1775, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (882, '982947Q', 'soyatatiana@gmail.com', 'bd4870e085a7892dc68ed1b83a28b8fb', 3, 1469, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (883, '480743G', 'stephanekouadio43@gmail.com', '0f69c82b912e9da0cea6306aa50e778b', 3, 1481, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (884, '832919M', 'stephanieyoboua2@gmail.com', 'c87de9d02a54bca975a578a44688d0f7', 3, 1426, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (885, '832891A', 'SUZANNEOUATTARA46@gmail.com', 'c6e7ad20ee9fddcb4d18381f7478d879', 3, 1410, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (886, '470032Y', 'syllanawa@yahoo.fr', '23789650ff7472ecbf8d867c9d12b4be', 3, 1420, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (887, '304893T', 'sylviecit@yahoo.fr', 'ade9ddd8b6eeba5ecffada4847fb7f43', 3, 1774, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (888, '272130G', 'tahabenan1@yahoo.fr', '03b7a48dc04c0683c3f6462f1567bfd2', 3, 1451, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (889, '855883R', 'takikouassidavid@gmail.com', 'f04951f3eb39db12803fd9e1e7b3564f', 3, 1286, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (890, '480792S', 'tapedianeulsure@gmail.com', '5221eeb8c757de721db2230b672aaf28', 3, 1029, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (891, '826002L', 'TATIKOUADIO912@GMAIL.COM', 'f49bf50f529cda6cd4e04d944c9319a3', 3, 1312, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (892, '821059X', 'tchelopetanki@gmail.com', '12293f5931a9ae951ae0e40d824d50d6', 3, 1213, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (893, '231462Y', 'tehuatanohkoffi@yahoo.fr', 'bca5c0d0cd5ad86f46f8ddc1ba5a66dc', 3, 1709, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (894, '481640A', 'tfleurchristiane@yahoo.cmm', 'b0e269912fd9013514de87b559a62642', 3, 1650, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (895, '359188N', 'thioqristine@gmail.com', 'd2bf8cb14df248114800737f7bc08eae', 3, 1246, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (896, '469466B', 'tiemokobaikoro403@gmail.com', '93d2e320b4908835b0ff370b04d0aa64', 3, 1310, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (897, '852291U', 'tlazeni747@gmail.com', '812387c5715f934658af98f5ae98d4ff', 3, 1318, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (898, '371880C', 'tmeareine @ yahoo. fr', '9ad489bcd1bca44c4ed170b9ffb2da64', 3, 1053, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (899, '887753W', 'tokpalouazrou@gmail.com', 'f936cee3906ad67ed1039b11527fcca0', 3, 1719, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (900, '815499Q', 'tourerokia42@gmail.com', '17f1f1e59c9cc838d479a9f7948c6336', 3, 1435, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (901, '313290A', 'tourismejc@yahoo.fr', 'e1a663ce59b52ed02b6913232a8e0e3e', 3, 1756, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (902, '359187D', 'traorengolo72@gmail.com', 'cac26992e92f1c3a14204b22a608e972', 3, 1081, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (903, '297579G', 'traore.soumaila@tourisme.gouv.ci', '8bc8710c1205844281f5f60ff2937a9c', 3, 1807, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (904, '826156J', 'traoretata4579@gmail.com', 'a9dea03d0f42d1e2beeec10967cdcd13', 3, 1638, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (905, '284351E', 'tresorcit@yahoo.fr', '6bae40ae3930dfdfc78c3b2c5ef87530', 3, 1770, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (906, '368216J', 'twilmabenedicte11@gmail.com', 'd50b709d50e5486e3afd901d26a9564f', 3, 1232, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (907, '885624K', 'valeriegoumenou@gmail.com', '2007af9dbfe0e334463ed431f8076147', 3, 1350, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (908, '323838V', 'VALERIEGUELOUA@GMAIL.COM', '78a39cce85771e7cb0c4e832432f2b5f', 3, 1400, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (909, '826157K', 'valeriewadja@yahou.fr', '919e1efad10cf55a408d036bb65dcd2a', 3, 1256, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (910, '855822K', 'vanessaangbonon2807@icloud.com', 'dcb48d1b80930455adcbeb173d8fec05', 3, 1367, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (911, '886194E', 'vanessakouadio@gmail.com', '46d63bf881793ffefe234a55406f8cb2', 3, 1143, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (912, '433391L', 'vickiykouame@yahoo.fr', '9d26200efa7c68499fb5c1d4139a519a', 3, 1404, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (913, '827779B', 'vic.kouassi@tourisme.gouv.ci', '2deb044c2aea92e73e1d3c7c2298f555', 3, 1149, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (914, '320381C', 'wgclemence20@gmail.com', 'e81a5f9ede74a22a35e0cbaaac6ce7de', 3, 1292, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (915, '481455M', 'wongogeniale@gmail.com', '94e545467babdd83ce715a252e1a6b23', 3, 1491, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (916, '323850D', 'woropaco@gmail.com', 'a388728e0881919e7fc9f75d2ba0e37e', 3, 1712, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (917, '359185B', 'www.gabelow@hotmail.frr', '8e1618abbaf7259903b9261565add01b', 3, 1236, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (918, '815501J', 'yadom01@outlook.fr', '67518caf11cfba75acced1b1056b7976', 3, 1514, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (919, '856590Y', 'yahflorence2019@gmail.com', 'e5b852c635797a4a638a6cbf99c02ef1', 3, 1333, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (920, '902807V', 'yahmichelderwinango@gmail.com', '9260df6a7816551d6a8f97fade5c3b46', 3, 1565, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (921, '982868Z', 'yaokalexis03@gmail.com', 'd3a1d1f84b880185acf0f60818bc4b22', 3, 1116, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (922, '469887S', 'yapiapielucie@gmail.com', '6586ad7f35f1048e9e25269d5b25044f', 3, 1336, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (923, '826158U', 'yaponogues26@gmail,com', 'dfe0086f672df5370e31ca20c6a1bc30', 3, 1564, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (924, '345914X', 'yassouakoffi@gmail.com', '8d12a5d8cafaf4ecd240cba249adbb61', 3, 1402, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (925, 'INT003', 'yaya.traore@interieur.gouv.ci', '2d04c52edfee67a29a5a1ceba660e636', 3, 16, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (926, '855469H', 'yebwassia@gmail.com', '90d7289de524ebbd4f5c7b51db609f28', 3, 1463, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (927, '419669L', 'yeiteaolive@yahoo.fr', '298c0f8845a9c31926a3f879f6544ff8', 3, 1016, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (928, '827831G', 'yeosali6@gmail.com', 'a9dea03d0f42d1e2beeec10967cdcd13', 3, 1173, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (929, '834359D', 'yepisabine@gmail.com', 'cb6ca3e2874ea04c88071b885494b999', 3, 1366, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (930, '358599R', 'yolandebrou@yahoo.fr', '21a4c12ccd3bc39b2a928fe7df18c2a5', 3, 1096, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (931, '251272M', '.yoman_bi@yahoo.fr', '479069fd974ea2b7e3dad5495b50580e', 3, 1776, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (932, '827449Z', 'ysmaelwattara@gmail.com', '9e5fc53082dc2431a799635ca8c6362c', 3, 1488, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (933, '830131R', 'zahajuste26@gmail.com', '9fb82af86cce41fda0db46d157bfc3fe', 3, 1468, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (934, '982940V', 'zanjessicakaloucassandra2022@g', '1c7f3604ebc0ee094f5d48870fa6ce2c', 3, 1394, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (935, '464180U', 'zanloumichel@gmail.com', '68f80c33ef7c61995570f10d0f74da5e', 3, 1419, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (936, '855838T', 'zeinabfofana76@gmail.com', 'f0d2d2ccefc69977f9c4c3dda9e1f686', 3, 1308, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (937, '852136Q', 'zeouamarieflorence40@gmail.com', '15d7e1aeff7ca1101fb0af18e4b6a8bd', 3, 1415, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');
INSERT INTO public.utilisateurs VALUES (938, '480581P', 'zitakouadio23@gmail.com', 'c356ef7c5215e190770b55481fa44320', 3, 1380, true, NULL, NULL, NULL, '2025-11-12 22:53:00.278504', '2025-11-12 22:53:00.278504');


--
-- Name: utilisateurs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: isegroup
--

SELECT pg_catalog.setval('public.utilisateurs_id_seq', 938, true);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_username_key; Type: CONSTRAINT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_username_key UNIQUE (username);


--
-- Name: idx_utilisateurs_email; Type: INDEX; Schema: public; Owner: isegroup
--

CREATE INDEX idx_utilisateurs_email ON public.utilisateurs USING btree (email);


--
-- Name: idx_utilisateurs_id_role; Type: INDEX; Schema: public; Owner: isegroup
--

CREATE INDEX idx_utilisateurs_id_role ON public.utilisateurs USING btree (id_role);


--
-- Name: idx_utilisateurs_username; Type: INDEX; Schema: public; Owner: isegroup
--

CREATE INDEX idx_utilisateurs_username ON public.utilisateurs USING btree (username);


--
-- Name: utilisateurs update_updated_at_utilisateurs; Type: TRIGGER; Schema: public; Owner: isegroup
--

CREATE TRIGGER update_updated_at_utilisateurs BEFORE UPDATE ON public.utilisateurs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: utilisateurs utilisateurs_id_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_id_agent_fkey FOREIGN KEY (id_agent) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: utilisateurs utilisateurs_id_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: isegroup
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_id_role_fkey FOREIGN KEY (id_role) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: TABLE utilisateurs; Type: ACL; Schema: public; Owner: isegroup
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.utilisateurs TO PUBLIC;


--
-- Name: SEQUENCE utilisateurs_id_seq; Type: ACL; Schema: public; Owner: isegroup
--

GRANT SELECT,USAGE ON SEQUENCE public.utilisateurs_id_seq TO PUBLIC;


--
-- PostgreSQL database dump complete
--
