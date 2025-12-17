--
-- PostgreSQL database dump
--

\restrict 4OCDPbRcH0lDcZY04W7Z5pM3geQ3Lgx6ezsgkEY6fDj1ftVZ2nGu3swyGbsMI0Y

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approved_document_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approved_document_tbl (
    approved_doc_id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    department character varying(100),
    admin character varying(150)
);


ALTER TABLE public.approved_document_tbl OWNER TO postgres;

--
-- Name: approved_document_tbl_approved_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approved_document_tbl_approved_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approved_document_tbl_approved_doc_id_seq OWNER TO postgres;

--
-- Name: approved_document_tbl_approved_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approved_document_tbl_approved_doc_id_seq OWNED BY public.approved_document_tbl.approved_doc_id;


--
-- Name: department_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_tbl (
    department_id integer NOT NULL,
    department character varying(100) NOT NULL
);


ALTER TABLE public.department_tbl OWNER TO postgres;

--
-- Name: department_tbl_department_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_tbl_department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_tbl_department_id_seq OWNER TO postgres;

--
-- Name: department_tbl_department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_tbl_department_id_seq OWNED BY public.department_tbl.department_id;


--
-- Name: division_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.division_tbl (
    division_id integer NOT NULL,
    division character varying(100) NOT NULL,
    department_id integer NOT NULL
);


ALTER TABLE public.division_tbl OWNER TO postgres;

--
-- Name: division_tbl_division_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.division_tbl_division_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.division_tbl_division_id_seq OWNER TO postgres;

--
-- Name: division_tbl_division_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.division_tbl_division_id_seq OWNED BY public.division_tbl.division_id;


--
-- Name: received_document_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.received_document_tbl (
    receive_doc_id integer NOT NULL,
    approved_doc_id integer NOT NULL,
    status character varying(50)
);


ALTER TABLE public.received_document_tbl OWNER TO postgres;

--
-- Name: received_document_tbl_receive_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.received_document_tbl_receive_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.received_document_tbl_receive_doc_id_seq OWNER TO postgres;

--
-- Name: received_document_tbl_receive_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.received_document_tbl_receive_doc_id_seq OWNED BY public.received_document_tbl.receive_doc_id;


--
-- Name: respond_document_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.respond_document_tbl (
    respond_doc_id integer NOT NULL,
    receive_doc_id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(50),
    comment text
);


ALTER TABLE public.respond_document_tbl OWNER TO postgres;

--
-- Name: respond_document_tbl_respond_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.respond_document_tbl_respond_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.respond_document_tbl_respond_doc_id_seq OWNER TO postgres;

--
-- Name: respond_document_tbl_respond_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.respond_document_tbl_respond_doc_id_seq OWNED BY public.respond_document_tbl.respond_doc_id;


--
-- Name: revision_document_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revision_document_tbl (
    revision_doc_id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    comment text,
    admin character varying(150)
);


ALTER TABLE public.revision_document_tbl OWNER TO postgres;

--
-- Name: revision_document_tbl_revision_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revision_document_tbl_revision_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revision_document_tbl_revision_doc_id_seq OWNER TO postgres;

--
-- Name: revision_document_tbl_revision_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revision_document_tbl_revision_doc_id_seq OWNED BY public.revision_document_tbl.revision_doc_id;


--
-- Name: sender_document_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sender_document_tbl (
    document_id integer NOT NULL,
    type character varying(50),
    user_id integer NOT NULL,
    status character varying(50),
    priority character varying(20),
    document bytea
);


ALTER TABLE public.sender_document_tbl OWNER TO postgres;

--
-- Name: sender_document_tbl_document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sender_document_tbl_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sender_document_tbl_document_id_seq OWNER TO postgres;

--
-- Name: sender_document_tbl_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sender_document_tbl_document_id_seq OWNED BY public.sender_document_tbl.document_id;


--
-- Name: user_tbl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tbl (
    user_id integer NOT NULL,
    id_number character varying(50),
    full_name character varying(150) NOT NULL,
    gender character varying(10),
    email character varying(150),
    department_id integer,
    division_id integer,
    user_role character varying(50) NOT NULL,
    user_name character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    status character varying(10) DEFAULT 'active'::character varying,
    CONSTRAINT user_tbl_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.user_tbl OWNER TO postgres;

--
-- Name: user_tbl_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tbl_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_tbl_user_id_seq OWNER TO postgres;

--
-- Name: user_tbl_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_tbl_user_id_seq OWNED BY public.user_tbl.user_id;


--
-- Name: approved_document_tbl approved_doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approved_document_tbl ALTER COLUMN approved_doc_id SET DEFAULT nextval('public.approved_document_tbl_approved_doc_id_seq'::regclass);


--
-- Name: department_tbl department_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_tbl ALTER COLUMN department_id SET DEFAULT nextval('public.department_tbl_department_id_seq'::regclass);


--
-- Name: division_tbl division_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_tbl ALTER COLUMN division_id SET DEFAULT nextval('public.division_tbl_division_id_seq'::regclass);


--
-- Name: received_document_tbl receive_doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_document_tbl ALTER COLUMN receive_doc_id SET DEFAULT nextval('public.received_document_tbl_receive_doc_id_seq'::regclass);


--
-- Name: respond_document_tbl respond_doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.respond_document_tbl ALTER COLUMN respond_doc_id SET DEFAULT nextval('public.respond_document_tbl_respond_doc_id_seq'::regclass);


--
-- Name: revision_document_tbl revision_doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_document_tbl ALTER COLUMN revision_doc_id SET DEFAULT nextval('public.revision_document_tbl_revision_doc_id_seq'::regclass);


--
-- Name: sender_document_tbl document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sender_document_tbl ALTER COLUMN document_id SET DEFAULT nextval('public.sender_document_tbl_document_id_seq'::regclass);


--
-- Name: user_tbl user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl ALTER COLUMN user_id SET DEFAULT nextval('public.user_tbl_user_id_seq'::regclass);


--
-- Data for Name: approved_document_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approved_document_tbl (approved_doc_id, document_id, user_id, department, admin) FROM stdin;
\.


--
-- Data for Name: department_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department_tbl (department_id, department) FROM stdin;
1	Administration
2	NewDept
3	TestDept_51ffa9
\.


--
-- Data for Name: division_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.division_tbl (division_id, division, department_id) FROM stdin;
1	System Management	1
3	QA	1
4	NewDiv	2
6	TestDivision1	3
\.


--
-- Data for Name: received_document_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.received_document_tbl (receive_doc_id, approved_doc_id, status) FROM stdin;
\.


--
-- Data for Name: respond_document_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.respond_document_tbl (respond_doc_id, receive_doc_id, user_id, status, comment) FROM stdin;
\.


--
-- Data for Name: revision_document_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revision_document_tbl (revision_doc_id, document_id, user_id, comment, admin) FROM stdin;
\.


--
-- Data for Name: sender_document_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sender_document_tbl (document_id, type, user_id, status, priority, document) FROM stdin;
\.


--
-- Data for Name: user_tbl; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tbl (user_id, id_number, full_name, gender, email, department_id, division_id, user_role, user_name, password, status) FROM stdin;
1	SA-001	System Super Administrator	Male	superadmin@system.local	1	1	SuperAdmin	superadmin	$2a$10$skB797SiDxgxXnG/TPZ4C.UjiV.X24NK3EyQqvuthlYisvIsGOlNO	active
\.


--
-- Name: approved_document_tbl_approved_doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approved_document_tbl_approved_doc_id_seq', 1, false);


--
-- Name: department_tbl_department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.department_tbl_department_id_seq', 3, true);


--
-- Name: division_tbl_division_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.division_tbl_division_id_seq', 6, true);


--
-- Name: received_document_tbl_receive_doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.received_document_tbl_receive_doc_id_seq', 1, false);


--
-- Name: respond_document_tbl_respond_doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.respond_document_tbl_respond_doc_id_seq', 1, false);


--
-- Name: revision_document_tbl_revision_doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.revision_document_tbl_revision_doc_id_seq', 1, false);


--
-- Name: sender_document_tbl_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sender_document_tbl_document_id_seq', 1, false);


--
-- Name: user_tbl_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tbl_user_id_seq', 1, true);


--
-- Name: approved_document_tbl approved_document_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approved_document_tbl
    ADD CONSTRAINT approved_document_tbl_pkey PRIMARY KEY (approved_doc_id);


--
-- Name: department_tbl department_tbl_department_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_tbl
    ADD CONSTRAINT department_tbl_department_key UNIQUE (department);


--
-- Name: department_tbl department_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_tbl
    ADD CONSTRAINT department_tbl_pkey PRIMARY KEY (department_id);


--
-- Name: division_tbl division_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_tbl
    ADD CONSTRAINT division_tbl_pkey PRIMARY KEY (division_id);


--
-- Name: received_document_tbl received_document_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_document_tbl
    ADD CONSTRAINT received_document_tbl_pkey PRIMARY KEY (receive_doc_id);


--
-- Name: respond_document_tbl respond_document_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.respond_document_tbl
    ADD CONSTRAINT respond_document_tbl_pkey PRIMARY KEY (respond_doc_id);


--
-- Name: revision_document_tbl revision_document_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_document_tbl
    ADD CONSTRAINT revision_document_tbl_pkey PRIMARY KEY (revision_doc_id);


--
-- Name: sender_document_tbl sender_document_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sender_document_tbl
    ADD CONSTRAINT sender_document_tbl_pkey PRIMARY KEY (document_id);


--
-- Name: user_tbl user_tbl_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT user_tbl_email_key UNIQUE (email);


--
-- Name: user_tbl user_tbl_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT user_tbl_id_number_key UNIQUE (id_number);


--
-- Name: user_tbl user_tbl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT user_tbl_pkey PRIMARY KEY (user_id);


--
-- Name: user_tbl user_tbl_user_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT user_tbl_user_name_key UNIQUE (user_name);


--
-- Name: approved_document_tbl fk_approved_document; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approved_document_tbl
    ADD CONSTRAINT fk_approved_document FOREIGN KEY (document_id) REFERENCES public.sender_document_tbl(document_id) ON DELETE CASCADE;


--
-- Name: approved_document_tbl fk_approved_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approved_document_tbl
    ADD CONSTRAINT fk_approved_user FOREIGN KEY (user_id) REFERENCES public.user_tbl(user_id);


--
-- Name: division_tbl fk_division_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_tbl
    ADD CONSTRAINT fk_division_department FOREIGN KEY (department_id) REFERENCES public.department_tbl(department_id) ON DELETE CASCADE;


--
-- Name: received_document_tbl fk_received_approved; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_document_tbl
    ADD CONSTRAINT fk_received_approved FOREIGN KEY (approved_doc_id) REFERENCES public.approved_document_tbl(approved_doc_id) ON DELETE CASCADE;


--
-- Name: respond_document_tbl fk_respond_receive; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.respond_document_tbl
    ADD CONSTRAINT fk_respond_receive FOREIGN KEY (receive_doc_id) REFERENCES public.received_document_tbl(receive_doc_id) ON DELETE CASCADE;


--
-- Name: respond_document_tbl fk_respond_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.respond_document_tbl
    ADD CONSTRAINT fk_respond_user FOREIGN KEY (user_id) REFERENCES public.user_tbl(user_id);


--
-- Name: revision_document_tbl fk_revision_document; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_document_tbl
    ADD CONSTRAINT fk_revision_document FOREIGN KEY (document_id) REFERENCES public.sender_document_tbl(document_id) ON DELETE CASCADE;


--
-- Name: revision_document_tbl fk_revision_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_document_tbl
    ADD CONSTRAINT fk_revision_user FOREIGN KEY (user_id) REFERENCES public.user_tbl(user_id);


--
-- Name: sender_document_tbl fk_sender_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sender_document_tbl
    ADD CONSTRAINT fk_sender_user FOREIGN KEY (user_id) REFERENCES public.user_tbl(user_id) ON DELETE CASCADE;


--
-- Name: user_tbl fk_user_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES public.department_tbl(department_id);


--
-- Name: user_tbl fk_user_division; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tbl
    ADD CONSTRAINT fk_user_division FOREIGN KEY (division_id) REFERENCES public.division_tbl(division_id);


--
-- PostgreSQL database dump complete
--

\unrestrict 4OCDPbRcH0lDcZY04W7Z5pM3geQ3Lgx6ezsgkEY6fDj1ftVZ2nGu3swyGbsMI0Y

