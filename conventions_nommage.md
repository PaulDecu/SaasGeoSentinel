# CONVENTIONS DE NOMMAGE & STANDARDS
## SaaS Multi-tenant Gestion Risques Géolocalisés

---

## 📋 TABLES

### Règles générales
- **Format**: `snake_case` (minuscules avec underscores)
- **Pluriel**: Toujours au pluriel (ex: `users`, `risks`, `tenants`)
- **Préfixes**: Pas de préfixes (éviter `tbl_`, `tb_`, etc.)

### Tables existantes
```
offers                    # Offres commerciales
tenants                   # Clients entreprises
users                     # Utilisateurs (tous rôles)
risks                     # Risques géolocalisés
password_reset_tokens     # Tokens réinitialisation mot de passe
refresh_tokens            # Tokens de session
trial_requests            # Demandes d'essai gratuit
```

---

## 🔑 COLONNES

### Règles générales
- **Format**: `snake_case`
- **ID primaire**: Toujours `id` (UUID v4)
- **Foreign keys**: `{table_singulier}_id` (ex: `tenant_id`, `user_id`)
- **Timestamps**: 
  - `created_at` (NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - `updated_at` (NOT NULL, DEFAULT CURRENT_TIMESTAMP, trigger auto-update)
  - `deleted_at` (NULL si soft-delete activé)

### Suffixes standards
```
_id        → Clé étrangère UUID (ex: tenant_id)
_at        → Timestamp (ex: created_at, expires_at, last_login)
_hash      → Hash cryptographique (ex: password_hash, token_hash)
_count     → Compteur (ex: login_count)
_status    → Énumération de statut (ex: subscription_status)
_date      → Date sans heure (ex: birth_date)
```

### Types de données
```sql
UUID        → id, foreign keys
VARCHAR     → Textes courts avec limite (email, nom, etc.)
TEXT        → Textes longs sans limite (description, message)
TIMESTAMP   → Dates avec heure (created_at, expires_at)
DATE        → Dates sans heure (rarement utilisé)
BOOLEAN     → is_*, has_*, can_* (ex: is_used, is_active)
DECIMAL     → Montants financiers (ex: price DECIMAL(10,2))
INT         → Compteurs, quantités (ex: max_users)
JSONB       → Données flexibles (ex: metadata)
ENUM        → Valeurs fixes (ex: user_role, risk_severity)
GEOGRAPHY   → Données géospatiales (ex: location)
```

---

## 🏷️ TYPES ENUM

### Règles
- **Format**: `snake_case`
- **Valeurs**: Minuscules, sans accents (ex: `eleve` pas `élevé`)
- **Nommage**: `{contexte}_{attribut}` (ex: `user_role`, `risk_severity`)

### Types existants
```sql
user_role       → 'superadmin', 'admin', 'gestionnaire', 'utilisateur'
risk_category   → 'naturel', 'industriel', 'sanitaire', 'technologique', 'social', 'autre'
risk_severity   → 'faible', 'modere', 'eleve', 'critique'
trial_status    → 'pending', 'contacted', 'converted', 'rejected'
```

### Ajout de nouvelles valeurs
```sql
-- Toujours utiliser ALTER TYPE pour ajouter des valeurs
ALTER TYPE risk_category ADD VALUE 'environnemental';
ALTER TYPE risk_category ADD VALUE 'financier';

-- ATTENTION: Impossible de supprimer une valeur enum sans recréer le type
-- Prévoir dès le départ toutes les valeurs possibles
```

---

## 🔍 INDEX

### Règles de nommage
```
idx_{table}_{colonnes}           → Index standard
idx_{table}_{colonnes}_{type}    → Index avec type spécifique

Exemples:
idx_users_email                  → Index sur email
idx_users_tenant_role            → Index composite
idx_risks_location_gist          → Index GIST pour géospatial
idx_risks_tenant_category        → Index composite pour filtres
```

### Types d'index
```sql
B-Tree (défaut)    → SELECT, ORDER BY, WHERE =, <, >
GIST               → Géospatial (GEOGRAPHY, GEOMETRY)
GIN                → JSONB, tableaux, full-text search
HASH               → WHERE = uniquement (rarement utilisé)
```

### Index partiels (pour performances)
```sql
-- Index uniquement sur les tokens valides
CREATE INDEX idx_password_reset_valid 
ON password_reset_tokens(expires_at, is_used) 
WHERE is_used = FALSE AND expires_at > CURRENT_TIMESTAMP;

-- Index uniquement sur les offres actives
CREATE INDEX idx_offers_active 
ON offers(end_of_sale) 
WHERE end_of_sale IS NULL OR end_of_sale > CURRENT_TIMESTAMP;
```

---

## 🔐 CONTRAINTES

### Règles de nommage
```
{table}_{colonnes}_{type}

Types:
_pk     → PRIMARY KEY
_fk     → FOREIGN KEY
_uk     → UNIQUE
_ck     → CHECK

Exemples:
users_email_uk                → UNIQUE sur email
users_tenant_id_fk            → FOREIGN KEY vers tenants
superadmin_no_tenant_ck       → CHECK personnalisée
```

### Contraintes CHECK
```sql
-- Nommage explicite pour faciliter le debug
CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
CONSTRAINT valid_price CHECK (price >= 0)
CONSTRAINT valid_subscription_dates CHECK (subscription_end IS NULL OR subscription_end > subscription_start)
CONSTRAINT superadmin_no_tenant CHECK (
    (role = 'superadmin' AND tenant_id IS NULL) OR 
    (role != 'superadmin' AND tenant_id IS NOT NULL)
)
```

---

## ⚡ FONCTIONS & TRIGGERS

### Règles de nommage
```
Fonctions:
{action}_{objet}()                    → update_updated_at_column()
generate_{objet}()                    → generate_tenant_public_id()
cleanup_{objet}()                     → cleanup_expired_tokens()

Triggers:
trigger_{table}_{fonction}            → trigger_users_updated_at
```

### Triggers existants
```sql
trigger_offers_updated_at             → Auto-update updated_at
trigger_tenants_updated_at            → Auto-update updated_at
trigger_users_updated_at              → Auto-update updated_at
trigger_risks_updated_at              → Auto-update updated_at
trigger_generate_tenant_public_id     → Auto-génération GL-XXXXX
```

---

## 🛡️ ROW LEVEL SECURITY

### Politiques RLS
```
{table}_{action}_{scope}

Actions: select, insert, update, delete, all
Scope: superadmin, own, same_tenant, public

Exemples:
users_select_superadmin               → Superadmin voit tous les users
users_select_same_tenant              → Admin voit users de son tenant
users_select_self                     → User voit son profil
risks_manage_tenant                   → Admin/Gestionnaire gère risks du tenant
risks_manage_own                      → User gère ses propres risks
```

### Fonctions helper RLS
```sql
current_user_id()          → UUID de l'utilisateur courant
current_user_tenant_id()   → UUID du tenant de l'utilisateur
current_user_role()        → Rôle de l'utilisateur (enum)
is_superadmin()            → TRUE si superadmin
```

---

## 📝 MIGRATIONS

### Règles de nommage
```
{timestamp}_{action}_{objet}.sql

Exemples:
20250209120000_create_users_table.sql
20250209120100_add_metadata_to_risks.sql
20250209120200_create_index_risks_location.sql
20250209120300_add_severity_enum_value.sql
```

### Structure type
```sql
-- ============================================
-- Migration: {Description}
-- Date: YYYY-MM-DD
-- ============================================

-- UP
BEGIN;

-- Vos modifications ici
ALTER TABLE risks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_risks_archived ON risks(is_archived);

COMMIT;

-- DOWN (rollback)
-- ALTER TABLE risks DROP COLUMN is_archived;
-- DROP INDEX IF EXISTS idx_risks_archived;
```

---

## 🌍 GÉOSPATIAL (PostGIS)

### Format de stockage
```sql
-- Toujours utiliser GEOGRAPHY avec SRID 4326 (WGS84 - GPS standard)
GEOGRAPHY(POINT, 4326)

-- Insertion (LONGITUDE en premier, puis LATITUDE)
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY

-- Exemple
INSERT INTO risks (location, ...) VALUES 
(ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::GEOGRAPHY, ...);
                        -- ^lng    ^lat
```

### Requêtes spatiales
```sql
-- Distance en mètres
ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY)

-- Recherche dans un rayon (OPTIMISÉE avec index GIST)
SELECT * FROM risks
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::GEOGRAPHY,
    10000  -- rayon en mètres (10km)
)
AND tenant_id = 'xxx';

-- Extraire lat/lng
ST_Y(location::geometry) AS latitude
ST_X(location::geometry) AS longitude
```

---

## 🔒 SÉCURITÉ

### Hashage mot de passe
```typescript
// Utiliser bcrypt avec rounds=10 minimum
import * as bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);
```

### Tokens
```typescript
// Password reset token: random + hash
import { randomBytes, createHash } from 'crypto';

const token = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(token).digest('hex');

// Stocker hash en DB, envoyer token par email
// TTL: 1 heure
```

### Validation email
```sql
-- Regex PostgreSQL
email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
```

---

## 📊 BONNES PRATIQUES

### Transactions
```typescript
// Toujours utiliser des transactions pour les opérations multiples
await this.connection.transaction(async (manager) => {
  const tenant = await manager.save(Tenant, {...});
  const admin = await manager.save(User, {..., tenantId: tenant.id});
  return { tenant, admin };
});
```

### Soft Delete (optionnel)
```sql
-- Ajouter si nécessaire
ALTER TABLE risks ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_risks_not_deleted ON risks(deleted_at) WHERE deleted_at IS NULL;

-- Query
SELECT * FROM risks WHERE deleted_at IS NULL;
```

### JSONB metadata
```sql
-- Indexer des clés spécifiques si recherches fréquentes
CREATE INDEX idx_risks_metadata_status ON risks USING GIN ((metadata -> 'status'));

-- Query
SELECT * FROM risks WHERE metadata->>'status' = 'validated';
```

### Optimisation requêtes
```sql
-- EXPLAIN ANALYZE pour identifier les slow queries
EXPLAIN ANALYZE SELECT * FROM risks WHERE tenant_id = 'xxx';

-- Toujours filtrer par tenant_id en premier (partitioning naturel)
WHERE tenant_id = 'xxx' AND category = 'naturel'
```

---

## 🚀 DÉPLOIEMENT

### Checklist avant migration
- [ ] Backup complet de la base
- [ ] Tests sur environnement de staging
- [ ] Vérification des index (pg_stat_user_indexes)
- [ ] Validation des contraintes
- [ ] Test des politiques RLS
- [ ] Vérification des performances (EXPLAIN)

### Commandes utiles
```sql
-- Taille des tables
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index inutilisés
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Vacuum et analyze réguliers
VACUUM ANALYZE risks;
```
