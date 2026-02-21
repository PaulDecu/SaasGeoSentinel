-- ============================================
-- SCRIPT D'INITIALISATION BASE DE DONNÉES
-- SaaS Multi-tenant Gestion Risques Géolocalisés
-- ============================================

-- Extension PostGIS pour la géolocalisation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TYPES ENUM
-- ============================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'gestionnaire', 'utilisateur');
CREATE TYPE risk_category AS ENUM ('naturel', 'industriel', 'sanitaire', 'technologique', 'social', 'autre');
CREATE TYPE risk_severity AS ENUM ('faible', 'modéré', 'élevé', 'critique');
CREATE TYPE trial_status AS ENUM ('pending', 'contacted', 'converted', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Table: offers (offres commerciales)
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    max_users INT NOT NULL CHECK (max_users > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    end_of_sale TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) > 0)
);

COMMENT ON TABLE offers IS 'Offres commerciales de la plateforme SaaS';
COMMENT ON COLUMN offers.end_of_sale IS 'Date de fin de commercialisation (NULL = toujours disponible)';

-- Table: tenants (clients entreprises)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_id VARCHAR(20) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    subscription_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subscription_end TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_company_name CHECK (LENGTH(TRIM(company_name)) > 0),
    CONSTRAINT valid_contact_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_subscription_dates CHECK (subscription_end IS NULL OR subscription_end > subscription_start),
    CONSTRAINT valid_public_id CHECK (public_id ~ '^GL-[0-9]{5}$')
);

COMMENT ON TABLE tenants IS 'Entreprises clientes (tenants multi-tenant)';
COMMENT ON COLUMN tenants.public_id IS 'Identifiant public au format GL-XXXXX';
COMMENT ON COLUMN tenants.metadata IS 'Coordonnées complètes et informations additionnelles';

-- Séquence pour génération GL-XXXXX
CREATE SEQUENCE tenant_public_id_seq START WITH 1 INCREMENT BY 1;
-- accepte le DEFAULT envoyé par TypeORM
ALTER TABLE "tenants" 
ALTER COLUMN "public_id" 
SET DEFAULT concat('GL-', LPAD(nextval('tenant_public_id_seq')::text, 5, '0'));

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT superadmin_no_tenant CHECK (
        (role = 'superadmin' AND tenant_id IS NULL) OR 
        (role != 'superadmin' AND tenant_id IS NOT NULL)
    )
);

COMMENT ON TABLE users IS 'Utilisateurs de la plateforme (tous rôles confondus)';
COMMENT ON CONSTRAINT superadmin_no_tenant ON users IS 'Les superadmin n''ont pas de tenant, les autres oui';

-- Table: password_reset_tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE password_reset_tokens IS 'Tokens de réinitialisation de mot de passe (TTL 1h)';

-- Table: refresh_tokens (session management)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens pour sessions utilisateurs';

-- Table: risks (risques géolocalisés)
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category risk_category NOT NULL,
    severity risk_severity NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_title CHECK (LENGTH(TRIM(title)) > 0)
);

COMMENT ON TABLE risks IS 'Risques géolocalisés par tenant';
COMMENT ON COLUMN risks.location IS 'Position GPS au format POINT(longitude, latitude) SRID 4326';
COMMENT ON COLUMN risks.metadata IS 'Données complémentaires au format JSON';

-- Table: trial_requests (demandes d'essai gratuit)
CREATE TABLE trial_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    status trial_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_company_name CHECK (LENGTH(TRIM(company_name)) > 0),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE trial_requests IS 'Demandes d''essai gratuit depuis le site public';

-- ============================================
-- INDEXES
-- ============================================

-- Offers
CREATE INDEX idx_offers_name ON offers(name);
CREATE INDEX idx_offers_active ON offers(end_of_sale) WHERE end_of_sale IS NULL OR end_of_sale > CURRENT_TIMESTAMP;

-- Tenants
CREATE INDEX idx_tenants_public_id ON tenants(public_id);
CREATE INDEX idx_tenants_offer_id ON tenants(offer_id);
CREATE INDEX idx_tenants_active ON tenants(subscription_end) WHERE subscription_end IS NULL OR subscription_end > CURRENT_TIMESTAMP;

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- Password reset tokens
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_valid ON password_reset_tokens(expires_at, is_used) 
    WHERE is_used = FALSE AND expires_at > CURRENT_TIMESTAMP;

-- Refresh tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_valid ON refresh_tokens(expires_at, is_revoked) 
    WHERE is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP;

-- Risks (CRITIQUES pour performances)
CREATE INDEX idx_risks_tenant_id ON risks(tenant_id);
CREATE INDEX idx_risks_created_by ON risks(created_by);
CREATE INDEX idx_risks_category ON risks(category);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_created_at ON risks(created_at DESC);

-- Index GIST pour recherches géospatiales (CRITIQUE)
CREATE INDEX idx_risks_location_gist ON risks USING GIST(location);

-- Index composite pour filtres fréquents
CREATE INDEX idx_risks_tenant_category ON risks(tenant_id, category);
CREATE INDEX idx_risks_tenant_severity ON risks(tenant_id, severity);

-- Trial requests
CREATE INDEX idx_trial_requests_status ON trial_requests(status);
CREATE INDEX idx_trial_requests_created_at ON trial_requests(created_at DESC);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Génération GL-XXXXX
CREATE OR REPLACE FUNCTION generate_tenant_public_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INT;
BEGIN
    IF NEW.public_id IS NULL THEN
        next_id := nextval('tenant_public_id_seq');
        NEW.public_id := 'GL-' || LPAD(next_id::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Nettoyage automatique des tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Supprimer les password reset tokens expirés de plus de 7 jours
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Supprimer les refresh tokens expirés de plus de 30 jours
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: updated_at sur offers
CREATE TRIGGER trigger_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at sur tenants
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at sur users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: updated_at sur risks
CREATE TRIGGER trigger_risks_updated_at
    BEFORE UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: génération automatique GL-XXXXX
CREATE TRIGGER trigger_generate_tenant_public_id
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION generate_tenant_public_id();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_requests ENABLE ROW LEVEL SECURITY;

-- Note: Les politiques RLS détaillées sont dans le fichier dédié rls_policies.sql
-- Car elles nécessitent les rôles PostgreSQL configurés

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Offre par défaut
INSERT INTO offers (name, max_users, price, end_of_sale) VALUES
    ('Starter', 5, 29.99, NULL),
    ('Business', 25, 99.99, NULL),
    ('Enterprise', 100, 299.99, NULL);

-- Superadmin par défaut (mot de passe: Admin123!)
-- Hash généré avec bcrypt rounds=10
INSERT INTO users (email, password_hash, role, tenant_id) VALUES
    ('admin@platform.local', '$2a$10$rH8qGJKVXLKZC7vJ7gKZhexBKdXvXnXQJJXvqfLJQhHnVLGqNP7.m', 'superadmin', NULL);

DO $$
DECLARE
    comment_text TEXT;
BEGIN
    -- 1. Construire la chaîne du commentaire avec la date actuelle
    comment_text := 'Dernière mise à jour: ' || CURRENT_TIMESTAMP::TEXT;
    
    -- 2. Exécuter dynamiquement la commande COMMENT ON
    EXECUTE 'COMMENT ON TABLE offers IS ' || quote_literal(comment_text);
    EXECUTE 'COMMENT ON TABLE tenants IS ' || quote_literal(comment_text);
    EXECUTE 'COMMENT ON TABLE users IS ' || quote_literal(comment_text);
    EXECUTE 'COMMENT ON TABLE risks IS ' || quote_literal(comment_text);
END
$$;

--COMMENT ON TABLE offers IS 'Dernière mise à jour: ' || CURRENT_TIMESTAMP::TEXT;
--COMMENT ON TABLE tenants IS 'Dernière mise à jour: ' || CURRENT_TIMESTAMP::TEXT;
--COMMENT ON TABLE users IS 'Dernière mise à jour: ' || CURRENT_TIMESTAMP::TEXT;
--COMMENT ON TABLE risks IS 'Dernière mise à jour: ' || CURRENT_TIMESTAMP::TEXT;


-- Migration: Create system_settings table
-- Date: 2026-02-12

CREATE TYPE tournee_type AS ENUM ('pieds', 'velo', 'voiture');

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournee_type tournee_type UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    api_call_delay_minutes INTEGER NOT NULL CHECK (api_call_delay_minutes >= 1 AND api_call_delay_minutes <= 60),
    position_test_delay_seconds INTEGER NOT NULL CHECK (position_test_delay_seconds >= 5 AND position_test_delay_seconds <= 300),
    risk_load_zone_km INTEGER NOT NULL CHECK (risk_load_zone_km >= 1 AND risk_load_zone_km <= 50),
    alert_radius_meters INTEGER NOT NULL CHECK (alert_radius_meters >= 10 AND alert_radius_meters <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_system_settings_tournee_type ON system_settings(tournee_type);

-- Données par défaut
INSERT INTO system_settings (tournee_type, label, api_call_delay_minutes, position_test_delay_seconds, risk_load_zone_km, alert_radius_meters)
VALUES
    ('pieds', 'À pieds', 10, 30, 5, 60),
    ('velo', 'À vélo', 7, 20, 10, 100),
    ('voiture', 'En voiture', 5, 10, 10, 250);

-- Commentaires
COMMENT ON TABLE system_settings IS 'Paramètres système pour la géolocalisation';
COMMENT ON COLUMN system_settings.api_call_delay_minutes IS 'Délai d''appel à l''API nearby en minutes';
COMMENT ON COLUMN system_settings.position_test_delay_seconds IS 'Délai de test de position en secondes';
COMMENT ON COLUMN system_settings.risk_load_zone_km IS 'Zone de chargement des risques en kilomètres';
COMMENT ON COLUMN system_settings.alert_radius_meters IS 'Rayon d''alerte en mètres';

-- Migration: Ajouter la colonne dashboard_message
-- Fichier: backend/migrations/add-dashboard-message.sql

-- Ajouter la colonne dashboard_message
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS dashboard_message TEXT NULL;

-- Ajouter un commentaire
COMMENT ON COLUMN system_settings.dashboard_message IS 'Message global affiché sur le dashboard de tous les utilisateurs';

-- Vérifier
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'system_settings'
  AND column_name = 'dashboard_message';


  -- Ajout de la colonne nb_jours_essai
ALTER TABLE offers 
ADD COLUMN trial_period_days INTEGER NOT NULL DEFAULT 30;

-- Contrainte pour s'assurer que le nombre de jours est positif
ALTER TABLE offers 
ADD CONSTRAINT check_trial_days_positive CHECK (trial_period_days >= 0);

-- Commentaire pour la documentation de la base
COMMENT ON COLUMN offers.trial_period_days IS 'Nombre de jours d''essai inclus dans l''offre (0 = pas d''essai)';

-- Mise à jour du trigger de timestamp (déjà existant dans votre script)
-- Le trigger 'trigger_offers_updated_at' s'occupera de mettre à jour 'updated_at' 
-- automatiquement lors de la modification des offres.

-- =====================================================
-- FONCTION UTILITAIRE pour updated_at
-- =====================================================
-- Cette fonction doit être créée UNE SEULE FOIS dans la base de données
-- Elle sera utilisée par toutes les tables qui ont une colonne updated_at

-- Vérifier si la fonction existe déjà, sinon la créer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION update_updated_at_column() IS 'Fonction trigger pour mettre à jour automatiquement la colonne updated_at';



-- =====================================================
-- TABLE: subscriptions (Abonnements et Paiements)
-- =====================================================

-- Création de la table subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Référence au tenant (entreprise cliente)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Dates de l'abonnement
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subscription_start_date DATE NOT NULL,
    subscription_end_date DATE NOT NULL,
    
    -- Informations de paiement
    payment_method VARCHAR(50) NOT NULL DEFAULT 'non_specifie',
    payment_amount DECIMAL(10, 2) NOT NULL,
    
    -- Détails de l'abonnement
    offer_name VARCHAR(100) NOT NULL,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    days_subscribed INTEGER NOT NULL,
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_dates ON subscriptions(subscription_start_date, subscription_end_date);
CREATE INDEX idx_subscriptions_offer_id ON subscriptions(offer_id);
CREATE INDEX idx_subscriptions_payment_date ON subscriptions(payment_date DESC);

-- Contrainte : la date de fin doit être après la date de début
ALTER TABLE subscriptions 
ADD CONSTRAINT check_subscription_dates 
CHECK (subscription_end_date > subscription_start_date);

-- Contrainte : le montant doit être positif
ALTER TABLE subscriptions 
ADD CONSTRAINT check_payment_amount_positive 
CHECK (payment_amount >= 0);

-- Contrainte : le nombre de jours doit être positif
ALTER TABLE subscriptions 
ADD CONSTRAINT check_days_subscribed_positive 
CHECK (days_subscribed > 0);

-- Fonction pour vérifier qu'il n'y a pas de chevauchement d'abonnements
CREATE OR REPLACE FUNCTION check_subscription_overlap()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier le chevauchement lors de l'insertion ou de la mise à jour
CREATE TRIGGER trigger_check_subscription_overlap
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION check_subscription_overlap();

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER trigger_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour la documentation
COMMENT ON TABLE subscriptions IS 'Historique des abonnements et paiements des tenants';
COMMENT ON COLUMN subscriptions.tenant_id IS 'Référence au tenant (entreprise cliente)';
COMMENT ON COLUMN subscriptions.payment_date IS 'Date et heure du paiement';
COMMENT ON COLUMN subscriptions.subscription_start_date IS 'Date de début de l''abonnement';
COMMENT ON COLUMN subscriptions.subscription_end_date IS 'Date de fin de l''abonnement';
COMMENT ON COLUMN subscriptions.payment_method IS 'Mode de paiement (carte, virement, etc.)';
COMMENT ON COLUMN subscriptions.payment_amount IS 'Montant payé en euros';
COMMENT ON COLUMN subscriptions.offer_name IS 'Nom de l''offre au moment de la souscription';
COMMENT ON COLUMN subscriptions.offer_id IS 'Référence à l''offre souscrite';
COMMENT ON COLUMN subscriptions.days_subscribed IS 'Nombre de jours souscrits';
COMMENT ON COLUMN subscriptions.metadata IS 'Données additionnelles (numéro de transaction, etc.)';

-- Vue pour faciliter les requêtes avec les détails du tenant et de l'offre
CREATE OR REPLACE VIEW subscriptions_with_details AS
SELECT 
    s.*,
    t.company_name,
    t.contact_email,
    o.price as current_offer_price,
    o.max_users as offer_max_users
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN offers o ON s.offer_id = o.id
ORDER BY s.payment_date DESC;

COMMENT ON VIEW subscriptions_with_details IS 'Vue enrichie des abonnements avec les détails du tenant et de l''offre';



-- Migration : Ajout des champs adresse et SIREN à la table tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS postal_code   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS city          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS siren         VARCHAR(14);

-- Contrainte optionnelle : format SIREN (9 chiffres) ou SIRET (14 chiffres)
ALTER TABLE tenants
  ADD CONSTRAINT valid_siren
    CHECK (siren IS NULL OR siren ~ '^[0-9]{9}([0-9]{5})?$');

-- Mise à jour du timestamp updated_at automatiquement (si trigger existant)
-- Si vous n'avez pas de trigger, les UPDATE le feront via TypeORM.






-- Migration pour ajouter l'identifiant fonctionnel aux souscriptions
-- Format: GS-00000000x (ex: GS-000000001, GS-000000002, etc.)

-- 1. Créer une séquence pour l'auto-incrémentation
CREATE SEQUENCE subscription_functional_id_seq 
START WITH 1 
INCREMENT BY 1;

-- 2. Ajouter la colonne functional_id à la table subscriptions SANS contrainte unique pour l'instant
ALTER TABLE subscriptions 
ADD COLUMN functional_id VARCHAR(12);

-- 3. Créer une fonction pour générer l'identifiant fonctionnel
 CREATE OR REPLACE FUNCTION generate_subscription_functional_id()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
BEGIN
    -- Récupérer le prochain ID de la séquence
    SELECT nextval('subscription_functional_id_seq') INTO next_id;
    
    -- Formater l'ID au format GS-00000000x
    RETURN 'GS-' || LPAD(next_id::TEXT, 9, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE; 


-- 4. Mettre à jour TOUS les enregistrements existants avec des IDs fonctionnels AVANT de créer les contraintes

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Parcourir tous les enregistrements existants et leur attribuer un ID fonctionnel
    FOR rec IN 
        SELECT id FROM subscriptions 
        WHERE functional_id IS NULL OR functional_id = ''
        ORDER BY created_at ASC
    LOOP
        UPDATE subscriptions 
        SET functional_id = generate_subscription_functional_id()
        WHERE id = rec.id;
    END LOOP;
END;
$$;

-- 5. MAINTENANT ajouter les contraintes une fois que tous les enregistrements ont des valeurs uniques
ALTER TABLE subscriptions 
ALTER COLUMN functional_id SET NOT NULL;

-- 6. Créer un index unique pour optimiser les recherches par functional_id
CREATE UNIQUE INDEX idx_subscriptions_functional_id ON subscriptions(functional_id);

-- 7. Créer un trigger pour générer automatiquement l'ID lors de l'insertion
CREATE OR REPLACE FUNCTION set_subscription_functional_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Générer l'ID fonctionnel seulement si il n'est pas déjà défini
    IF NEW.functional_id IS NULL OR NEW.functional_id = '' THEN
        NEW.functional_id := generate_subscription_functional_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Créer le trigger sur INSERT
CREATE TRIGGER trigger_set_subscription_functional_id
    BEFORE INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_subscription_functional_id();

-- 9. Ajouter un commentaire pour la documentation
COMMENT ON COLUMN subscriptions.functional_id IS 'Identifiant fonctionnel unique au format GS-00000000x, généré automatiquement et non modifiable';

-- 10. Créer une contrainte pour s'assurer du format correct
ALTER TABLE subscriptions 
ADD CONSTRAINT check_functional_id_format 
CHECK (functional_id ~ '^GS-[0-9]{9}$');

-- 11. Mettre à jour la vue existante pour inclure le functional_id
DROP VIEW IF EXISTS subscriptions_with_details;




CREATE OR REPLACE VIEW subscriptions_with_details AS
SELECT 
    s.*,
    t.company_name,
    t.contact_email,
    o.price as current_offer_price,
    o.max_users as offer_max_users
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN offers o ON s.offer_id = o.id
ORDER BY s.payment_date DESC;

COMMENT ON VIEW subscriptions_with_details IS 'Vue enrichie des abonnements avec les détails du tenant et de l''offre, incluant le functional_id';