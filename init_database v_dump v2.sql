



--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- TOC entry 2 (class 3079 OID 16385)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- TOC entry 3 (class 3079 OID 17423)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1604 (class 1247 OID 17445)
-- Name: risks_category_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.risks_category_enum AS ENUM (
    'naturel',
    'industriel',
    'sanitaire',
    'technologique',
    'social',
    'autre'
);


ALTER TYPE public.risks_category_enum OWNER TO admin;

--
-- TOC entry 1607 (class 1247 OID 17458)
-- Name: risks_severity_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.risks_severity_enum AS ENUM (
    'faible',
    'modéré',
    'élevé',
    'critique'
);


ALTER TYPE public.risks_severity_enum OWNER TO admin;

--
-- TOC entry 1631 (class 1247 OID 40962)
-- Name: tournee_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.tournee_type AS ENUM (
    'pieds',
    'velo',
    'voiture'
);


ALTER TYPE public.tournee_type OWNER TO admin;

--
-- TOC entry 1622 (class 1247 OID 17512)
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.users_role_enum AS ENUM (
    'superadmin',
    'admin',
    'gestionnaire',
    'utilisateur'
);


ALTER TYPE public.users_role_enum OWNER TO admin;

--
-- TOC entry 960 (class 1255 OID 49217)
-- Name: check_subscription_overlap(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.check_subscription_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Vérifier s'il existe un abonnement qui chevauche pour ce tenant
    IF EXISTS (
        SELECT 1 
        FROM subscriptions 
        WHERE tenant_id = NEW.tenant_id 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            -- Le nouvel abonnement commence pendant un abonnement existant
            (NEW.subscription_start_date >= subscription_start_date 
             AND NEW.subscription_start_date < subscription_end_date)
            OR
            -- Le nouvel abonnement se termine pendant un abonnement existant
            (NEW.subscription_end_date > subscription_start_date 
             AND NEW.subscription_end_date <= subscription_end_date)
            OR
            -- Le nouvel abonnement englobe complètement un abonnement existant
            (NEW.subscription_start_date <= subscription_start_date 
             AND NEW.subscription_end_date >= subscription_end_date)
        )
    ) THEN
        RAISE EXCEPTION 'Un abonnement existe déjà pour cette période. Les abonnements ne peuvent pas se chevaucher.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_subscription_overlap() OWNER TO admin;

--
-- TOC entry 962 (class 1255 OID 65551)
-- Name: generate_subscription_functional_id(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.generate_subscription_functional_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_id INTEGER;
BEGIN
    -- Récupérer le prochain ID de la séquence
    SELECT nextval('subscription_functional_id_seq') INTO next_id;
    
    -- Formater l'ID au format GS-00000000x
    RETURN 'GS-' || LPAD(next_id::TEXT, 9, '0');
END;
$$;


ALTER FUNCTION public.generate_subscription_functional_id() OWNER TO admin;

--
-- TOC entry 963 (class 1255 OID 65553)
-- Name: set_subscription_functional_id(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.set_subscription_functional_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Générer l'ID fonctionnel seulement si il n'est pas déjà défini
    IF NEW.functional_id IS NULL OR NEW.functional_id = '' THEN
        NEW.functional_id := generate_subscription_functional_id();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_subscription_functional_id() OWNER TO admin;

--
-- TOC entry 961 (class 1255 OID 49219)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO admin;

--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 961
-- Name: FUNCTION update_updated_at_column(); Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Fonction trigger pour mettre à jour automatiquement la colonne updated_at';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 17533)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    action character varying(100) NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid,
    details jsonb NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO admin;

--
-- TOC entry 216 (class 1259 OID 17434)
-- Name: offers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.offers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    max_users integer NOT NULL,
    price numeric(10,2) NOT NULL,
    end_of_sale timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    trial_period_days integer DEFAULT 30 NOT NULL,
    CONSTRAINT check_trial_days_positive CHECK ((trial_period_days >= 0))
);


ALTER TABLE public.offers OWNER TO admin;

--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN offers.trial_period_days; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.offers.trial_period_days IS 'Nombre de jours d''essai inclus dans l''offre (0 = pas d''essai)';


--
-- TOC entry 220 (class 1259 OID 17501)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO admin;

--
-- TOC entry 219 (class 1259 OID 17491)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO admin;

--
-- TOC entry 217 (class 1259 OID 17467)
-- Name: risks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.risks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category public.risks_category_enum NOT NULL,
    severity public.risks_severity_enum NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risks OWNER TO admin;

--
-- TOC entry 226 (class 1259 OID 65550)
-- Name: subscription_functional_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.subscription_functional_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_functional_id_seq OWNER TO admin;

--
-- TOC entry 225 (class 1259 OID 49187)
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subscription_start_date date NOT NULL,
    subscription_end_date date NOT NULL,
    payment_method character varying(50) DEFAULT 'non_specifie'::character varying NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    offer_name character varying(100) NOT NULL,
    offer_id uuid NOT NULL,
    days_subscribed integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    functional_id character varying(12) NOT NULL,
    CONSTRAINT check_days_subscribed_positive CHECK ((days_subscribed > 0)),
    CONSTRAINT check_functional_id_format CHECK (((functional_id)::text ~ '^GS-[0-9]{9}$'::text)),
    CONSTRAINT check_payment_amount_positive CHECK ((payment_amount >= (0)::numeric)),
    CONSTRAINT check_subscription_dates CHECK ((subscription_end_date > subscription_start_date))
);


ALTER TABLE public.subscriptions OWNER TO admin;

--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.subscriptions IS 'Historique des abonnements et paiements des tenants';


--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.tenant_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.tenant_id IS 'Référence au tenant (entreprise cliente)';


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.payment_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.payment_date IS 'Date et heure du paiement';


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.subscription_start_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.subscription_start_date IS 'Date de début de l''abonnement';


--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.subscription_end_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.subscription_end_date IS 'Date de fin de l''abonnement';


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.payment_method; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.payment_method IS 'Mode de paiement (carte, virement, etc.)';


--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.payment_amount; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.payment_amount IS 'Montant payé en euros';


--
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.offer_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.offer_name IS 'Nom de l''offre au moment de la souscription';


--
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.offer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.offer_id IS 'Référence à l''offre souscrite';


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.days_subscribed; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.days_subscribed IS 'Nombre de jours souscrits';


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.metadata; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.metadata IS 'Données additionnelles (numéro de transaction, etc.)';


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN subscriptions.functional_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.subscriptions.functional_id IS 'Identifiant fonctionnel unique au format GS-00000000x, généré automatiquement et non modifiable';


--
-- TOC entry 223 (class 1259 OID 24577)
-- Name: tenant_public_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tenant_public_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_public_id_seq OWNER TO admin;

--
-- TOC entry 218 (class 1259 OID 17478)
-- Name: tenants; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tenants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    public_id character varying(20) DEFAULT concat('GL-', lpad((nextval('public.tenant_public_id_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(50),
    offer_id uuid NOT NULL,
    subscription_start timestamp without time zone NOT NULL,
    subscription_end timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    address_line1 character varying(255),
    address_line2 character varying(255),
    postal_code character varying(20),
    country character varying(100),
    siren character varying(14),
    city character varying(100),
    CONSTRAINT valid_siren CHECK (((siren IS NULL) OR ((siren)::text ~ '^[0-9]{9}([0-9]{5})?$'::text)))
);


ALTER TABLE public.tenants OWNER TO admin;

--
-- TOC entry 227 (class 1259 OID 65556)
-- Name: subscriptions_with_details; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.subscriptions_with_details AS
 SELECT s.id,
    s.tenant_id,
    s.payment_date,
    s.subscription_start_date,
    s.subscription_end_date,
    s.payment_method,
    s.payment_amount,
    s.offer_name,
    s.offer_id,
    s.days_subscribed,
    s.metadata,
    s.created_at,
    s.updated_at,
    s.functional_id,
    t.company_name,
    t.contact_email,
    o.price AS current_offer_price,
    o.max_users AS offer_max_users
   FROM ((public.subscriptions s
     JOIN public.tenants t ON ((s.tenant_id = t.id)))
     JOIN public.offers o ON ((s.offer_id = o.id)))
  ORDER BY s.payment_date DESC;


ALTER VIEW public.subscriptions_with_details OWNER TO admin;

--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 227
-- Name: VIEW subscriptions_with_details; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON VIEW public.subscriptions_with_details IS 'Vue enrichie des abonnements avec les détails du tenant et de l''offre, incluant le functional_id';


--
-- TOC entry 224 (class 1259 OID 40969)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournee_type public.tournee_type NOT NULL,
    label character varying(100) NOT NULL,
    api_call_delay_minutes integer NOT NULL,
    position_test_delay_seconds integer NOT NULL,
    risk_load_zone_km integer NOT NULL,
    alert_radius_meters integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    dashboard_message text,
    CONSTRAINT system_settings_alert_radius_meters_check CHECK (((alert_radius_meters >= 10) AND (alert_radius_meters <= 1000))),
    CONSTRAINT system_settings_api_call_delay_minutes_check CHECK (((api_call_delay_minutes >= 1) AND (api_call_delay_minutes <= 60))),
    CONSTRAINT system_settings_position_test_delay_seconds_check CHECK (((position_test_delay_seconds >= 5) AND (position_test_delay_seconds <= 300))),
    CONSTRAINT system_settings_risk_load_zone_km_check CHECK (((risk_load_zone_km >= 1) AND (risk_load_zone_km <= 50)))
);


ALTER TABLE public.system_settings OWNER TO admin;

--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.system_settings IS 'Paramètres système pour la géolocalisation';


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN system_settings.api_call_delay_minutes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_settings.api_call_delay_minutes IS 'Délai d''appel à l''API nearby en minutes';


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN system_settings.position_test_delay_seconds; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_settings.position_test_delay_seconds IS 'Délai de test de position en secondes';


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN system_settings.risk_load_zone_km; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_settings.risk_load_zone_km IS 'Zone de chargement des risques en kilomètres';


--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN system_settings.alert_radius_meters; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_settings.alert_radius_meters IS 'Rayon d''alerte en mètres';


--
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN system_settings.dashboard_message; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_settings.dashboard_message IS 'Message global affiché sur le dashboard de tous les utilisateurs';


--
-- TOC entry 221 (class 1259 OID 17521)
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.users_role_enum NOT NULL,
    tenant_id uuid,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- TOC entry 4180 (class 2606 OID 17541)
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 17441)
-- Name: offers PK_4c88e956195bba85977da21b8f4; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT "PK_4c88e956195bba85977da21b8f4" PRIMARY KEY (id);


--
-- TOC entry 4164 (class 2606 OID 17488)
-- Name: tenants PK_53be67a04681c66b87ee27c9321; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY (id);


--
-- TOC entry 4168 (class 2606 OID 17498)
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- TOC entry 4176 (class 2606 OID 17530)
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- TOC entry 4172 (class 2606 OID 17508)
-- Name: password_reset_tokens PK_d16bebd73e844c48bca50ff8d3d; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY (id);


--
-- TOC entry 4162 (class 2606 OID 17477)
-- Name: risks PK_df437126f5dd05e856b8bf7157f; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT "PK_df437126f5dd05e856b8bf7157f" PRIMARY KEY (id);


--
-- TOC entry 4174 (class 2606 OID 17510)
-- Name: password_reset_tokens UQ_91185d86d5d7557b19abbb2868b; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "UQ_91185d86d5d7557b19abbb2868b" UNIQUE (token_hash);


--
-- TOC entry 4178 (class 2606 OID 17532)
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- TOC entry 4170 (class 2606 OID 17500)
-- Name: refresh_tokens UQ_a7838d2ba25be1342091b6695f1; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE (token_hash);


--
-- TOC entry 4166 (class 2606 OID 17490)
-- Name: tenants UQ_d15f86ccbaf13eedaf6489a8a6d; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "UQ_d15f86ccbaf13eedaf6489a8a6d" UNIQUE (public_id);


--
-- TOC entry 4160 (class 2606 OID 17443)
-- Name: offers UQ_f34d2ed1cd905ff6c3e30f62a1d; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT "UQ_f34d2ed1cd905ff6c3e30f62a1d" UNIQUE (name);


--
-- TOC entry 4192 (class 2606 OID 49199)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4183 (class 2606 OID 40980)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4185 (class 2606 OID 40982)
-- Name: system_settings system_settings_tournee_type_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_tournee_type_key UNIQUE (tournee_type);


--
-- TOC entry 4186 (class 1259 OID 49211)
-- Name: idx_subscriptions_dates; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_subscriptions_dates ON public.subscriptions USING btree (subscription_start_date, subscription_end_date);


--
-- TOC entry 4187 (class 1259 OID 65552)
-- Name: idx_subscriptions_functional_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX idx_subscriptions_functional_id ON public.subscriptions USING btree (functional_id);


--
-- TOC entry 4188 (class 1259 OID 49212)
-- Name: idx_subscriptions_offer_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_subscriptions_offer_id ON public.subscriptions USING btree (offer_id);


--
-- TOC entry 4189 (class 1259 OID 49213)
-- Name: idx_subscriptions_payment_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_subscriptions_payment_date ON public.subscriptions USING btree (payment_date DESC);


--
-- TOC entry 4190 (class 1259 OID 49210)
-- Name: idx_subscriptions_tenant_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions USING btree (tenant_id);


--
-- TOC entry 4181 (class 1259 OID 40983)
-- Name: idx_system_settings_tournee_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_system_settings_tournee_type ON public.system_settings USING btree (tournee_type);


--
-- TOC entry 4201 (class 2620 OID 49218)
-- Name: subscriptions trigger_check_subscription_overlap; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trigger_check_subscription_overlap BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.check_subscription_overlap();


--
-- TOC entry 4202 (class 2620 OID 65554)
-- Name: subscriptions trigger_set_subscription_functional_id; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trigger_set_subscription_functional_id BEFORE INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_subscription_functional_id();


--
-- TOC entry 4203 (class 2620 OID 49220)
-- Name: subscriptions trigger_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trigger_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4198 (class 2606 OID 17567)
-- Name: users FK_109638590074998bb72a2f2cf08; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4193 (class 2606 OID 17547)
-- Name: risks FK_39a7959d91ac446ae5dd6b23654; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT "FK_39a7959d91ac446ae5dd6b23654" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4196 (class 2606 OID 17557)
-- Name: refresh_tokens FK_3ddc983c5f7bcf132fd8732c3f4; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 17562)
-- Name: password_reset_tokens FK_52ac39dd8a28730c63aeb428c9c; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4195 (class 2606 OID 17552)
-- Name: tenants FK_8c29b2cd2b23346477722e66874; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "FK_8c29b2cd2b23346477722e66874" FOREIGN KEY (offer_id) REFERENCES public.offers(id);


--
-- TOC entry 4194 (class 2606 OID 17542)
-- Name: risks FK_e215d357dec7030442369c1c9ef; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT "FK_e215d357dec7030442369c1c9ef" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4199 (class 2606 OID 49205)
-- Name: subscriptions subscriptions_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE RESTRICT;


--
-- TOC entry 4200 (class 2606 OID 49200)
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


INSERT INTO users (email, password_hash, role, tenant_id) VALUES
    ('admin@platform.local', '$2a$10$rH8qGJKVXLKZC7vJ7gKZhexBKdXvXnXQJJXvqfLJQhHnVLGqNP7.m', 'superadmin', NULL);


-- MIGRATION POUR AJOUTER LES CATEGORIES DE RISQUES LIEES A UN TENANT
-- ============================================================
-- Migration : Catégories de risques par tenant
-- ============================================================

-- 1. Créer la table tenant_risk_categories
CREATE TABLE IF NOT EXISTS public.tenant_risk_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,   -- clé technique ex: 'naturel'
    label character varying(150) NOT NULL,  -- libellé affiché ex: 'Naturel'
    color character varying(7) NOT NULL DEFAULT '#6b7280',  -- couleur hex
    icon character varying(50),             -- emoji ou nom d'icône
    position integer NOT NULL DEFAULT 0,    -- ordre d'affichage
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT "PK_tenant_risk_categories" PRIMARY KEY (id),
    CONSTRAINT "FK_tenant_risk_categories_tenant" FOREIGN KEY (tenant_id)
        REFERENCES public.tenants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "UQ_tenant_risk_category_name" UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS "IDX_tenant_risk_categories_tenant_id"
    ON public.tenant_risk_categories (tenant_id);

-- 2. Ajouter colonne category_id sur risks (FK vers tenant_risk_categories)
--    On l'ajoute nullable d'abord pour la migration des données existantes
ALTER TABLE public.risks
    ADD COLUMN IF NOT EXISTS category_id uuid;

-- 3. Pour chaque tenant existant : créer les catégories par défaut
--    puis mettre à jour les risques existants avec la FK correspondante

-- Insérer les 6 catégories par défaut pour chaque tenant existant
INSERT INTO public.tenant_risk_categories (tenant_id, name, label, color, icon, position)
SELECT
    t.id,
    c.name,
    c.label,
    c.color,
    c.icon,
    c.position
FROM public.tenants t
CROSS JOIN (VALUES
    ('naturel',       'Naturel',       '#10B981', '🌪️', 0),
    ('industriel',    'Industriel',    '#F59E0B', '🏭', 1),
    ('sanitaire',     'Sanitaire',     '#EF4444', '🏥', 2),
    ('technologique', 'Technologique', '#3B82F6', '⚙️', 3),
    ('social',        'Social',        '#8B5CF6', '👥', 4),
    ('autre',         'Autre',         '#6B7280', '❓', 5)
) AS c(name, label, color, icon, position)
ON CONFLICT ON CONSTRAINT "UQ_tenant_risk_category_name" DO NOTHING;

-- 4. Mettre à jour la FK sur les risques existants
UPDATE public.risks r
SET category_id = trc.id
FROM public.tenant_risk_categories trc
WHERE trc.tenant_id = r.tenant_id
  AND trc.name = r.category::text;

-- 5. Rendre category_id NOT NULL maintenant que les données sont migrées
ALTER TABLE public.risks
    ALTER COLUMN category_id SET NOT NULL;

-- 6. Ajouter la contrainte FK
ALTER TABLE public.risks
    ADD CONSTRAINT "FK_risks_category" FOREIGN KEY (category_id)
        REFERENCES public.tenant_risk_categories (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE RESTRICT; -- Interdit suppression si risques existent

-- 7. Supprimer l'ancienne colonne category (enum)
--    ⚠️ À exécuter seulement après validation que category_id est bien renseigné
ALTER TABLE public.risks DROP COLUMN IF EXISTS category;

-- 8. Supprimer l'enum (optionnel, peut être gardé pour compatibilité)
-- DROP TYPE IF EXISTS risks_category_enum;


-- ajout pour les envois de mail par cron
-- Migration: Historique des notifications d'abonnement
-- Évite les doublons d'envoi (idempotence)

CREATE TABLE IF NOT EXISTS subscription_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL CHECK (
    notification_type IN ('J-5', 'J-1', 'J0', 'J+10', 'J+30')
  ),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  subscription_end_date DATE NOT NULL,
  email_sent_to VARCHAR(255) NOT NULL,
  CONSTRAINT uq_notification_per_cycle
    UNIQUE (tenant_id, notification_type, subscription_end_date)
);

CREATE INDEX idx_notif_logs_tenant ON subscription_notification_logs(tenant_id);
CREATE INDEX idx_notif_logs_type ON subscription_notification_logs(notification_type, sent_at);

COMMENT ON TABLE subscription_notification_logs IS
  'Historique des emails de cycle de vie envoyés aux tenants. La contrainte UNIQUE (tenant_id, notification_type, subscription_end_date) garantit qu''un même type de mail ne peut être envoyé qu''une seule fois par cycle d''abonnement.';