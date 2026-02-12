# 🏗️ ARCHITECTURE BACKEND - Documentation Technique

## Vue d'ensemble

Backend NestJS avec :
- ✅ Authentification JWT + Refresh Tokens (cookies httpOnly)
- ✅ RBAC avec 4 rôles (superadmin, admin, gestionnaire, utilisateur)
- ✅ Multi-tenant avec isolation des données
- ✅ PostGIS pour géolocalisation optimisée
- ✅ Audit logs JSONB
- ✅ Rate limiting (100 req/min)
- ✅ Validation globale des DTOs
- ✅ Tests Jest complets

---

## 🎯 Modules

### 1. Module AUTH (`/src/auth`)

**Responsabilités** :
- Login/Logout
- Forgot password / Reset password
- Génération et validation JWT
- Gestion refresh tokens
- Envoi emails (via MailService)

**Fichiers clés** :
- `auth.service.ts` - Logique métier auth
- `auth.controller.ts` - Endpoints API
- `jwt.strategy.ts` - Stratégie Passport JWT
- `jwt-auth.guard.ts` - Guard d'authentification
- Entities : `RefreshToken`, `PasswordResetToken`

**Endpoints** :
```
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
```

**Sécurité** :
- Mot de passe hashé avec bcrypt (10 rounds)
- JWT courts (15 min)
- Refresh tokens longs (30 jours) dans cookies httpOnly
- Reset tokens TTL 1h, usage unique
- Réponses génériques sur erreurs auth

---

### 2. Module USERS (`/src/users`)

**Responsabilités** :
- CRUD utilisateurs (tenant-scoped)
- Bulk delete
- Validation des rôles selon créateur
- Vérification limites tenant

**Fichiers clés** :
- `users.service.ts` - Logique CRUD + validation
- `users.controller.ts` - Endpoints
- Entity : `User`
- DTOs : `CreateUserDto`, `UpdateUserDto`, `BulkDeleteUsersDto`

**Règles métier** :
- Admin peut créer uniquement gestionnaires/utilisateurs
- Admin ne peut gérer que les users de son tenant
- Email unique global
- Impossible de se supprimer soi-même
- Validation force MDP (8+ chars, maj, min, chiffre)

**Permissions** :
- CRUD : Admin, Superadmin
- Lecture : Tous (scoped)

---

### 3. Module TENANTS (`/src/tenants`)

**Responsabilités** :
- CRUD tenants (superadmin only)
- Génération GL-XXXXX automatique
- Création admin client
- Vérification limites utilisateurs
- Vérification abonnement actif

**Fichiers clés** :
- `tenants.service.ts`
- `tenants.controller.ts`
- Entity : `Tenant`

**Règles métier** :
- GL-XXXXX généré par trigger PostgreSQL
- Vérification offre active lors création
- Impossible de supprimer si users actifs
- Check limite users avant création user

**Permissions** :
- CRUD : Superadmin uniquement

---

### 4. Module OFFERS (`/src/offers`)

**Responsabilités** :
- CRUD offres commerciales

**Fichiers clés** :
- `offers.service.ts`
- `offers.controller.ts`
- Entity : `Offer`

**Champs** :
- name (unique)
- maxUsers (limite)
- price (decimal)
- endOfSale (nullable)

**Permissions** :
- CRUD : Superadmin uniquement

---

### 5. Module RISKS (`/src/risks`)

**Responsabilités** :
- CRUD risques géolocalisés
- Recherche à proximité (ST_DWithin)
- Tenant-scoped avec RLS
- ETag pour cache

**Fichiers clés** :
- `risks.service.ts` - Avec requêtes PostGIS
- `risks.controller.ts` - Endpoints + ETag
- Entity : `Risk`
- Enums : `RiskCategory`, `RiskSeverity`

**PostGIS** :
```typescript
// Insertion
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY

// Recherche proximité
ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY,
  radiusMeters
)

// Distance
ST_Distance(location, point)
```

**Règles métier** :
- Admin/Gestionnaire : tous les risques du tenant
- Utilisateur : uniquement ses risques
- Superadmin : tous les risques
- Nearby : max 200 résultats, rayon max 100km

**ETag** :
- Généré via MD5 du JSON
- Cache 1 minute
- 304 Not Modified si unchanged

**Permissions** :
- Create : Admin, Gestionnaire, Utilisateur
- Read : Tous (scoped)
- Update : Admin, Gestionnaire, Utilisateur (own)
- Delete : Admin, Gestionnaire

---

### 6. Module PROFILE (`/src/profile`)

**Responsabilités** :
- Consultation profil
- Changement mot de passe

**Endpoints** :
```
GET  /me
POST /me/change-password
```

**Règles** :
- Vérification ancien mot de passe
- Validation nouveau mot de passe

---

### 7. Module AUDIT (`/src/audit`)

**Responsabilités** :
- Logging actions sensibles en JSONB
- Consultation logs par tenant/user

**Actions loggées** :
- USER_CREATED, USER_DELETED, USER_UPDATED
- TENANT_CREATED, TENANT_UPDATED, TENANT_DELETED
- RISK_CREATED, RISK_UPDATED, RISK_DELETED
- USERS_BULK_DELETE

**Champs** :
- action
- userId
- tenantId
- details (JSONB)
- ipAddress
- userAgent
- createdAt

---

## 🔒 Sécurité

### Guards

**JwtAuthGuard** :
- Extrait JWT du header Authorization
- Valide signature
- Charge User depuis DB
- Injecte user dans request

**RolesGuard** :
- Lit metadata `@Roles(...)` du decorator
- Vérifie role user
- 403 si insuffisant

### Validation

**Global ValidationPipe** :
- whitelist: true (supprime props non définies)
- forbidNonWhitelisted: true (rejette props inconnues)
- transform: true (auto-transform payloads)

### Rate Limiting

**ThrottlerGuard** :
- 100 requêtes/minute par IP
- Global sur toute l'app
- Configurable par endpoint si besoin

---

## 🗄️ Base de données

### TypeORM

**Configuration** :
- synchronize: false (toujours)
- logging: true en dev
- Migrations pour prod

### Entities principales

```
User
├─ id (uuid)
├─ email (unique)
├─ passwordHash
├─ role (enum)
├─ tenantId (nullable)
├─ lastLogin
└─ Relations: tenant, risks, refreshTokens

Tenant
├─ id (uuid)
├─ publicId (GL-XXXXX, unique)
├─ companyName
├─ contactEmail
├─ offerId
├─ subscriptionStart/End
├─ metadata (jsonb)
└─ Relations: offer, users, risks

Risk
├─ id (uuid)
├─ tenantId
├─ createdByUserId
├─ title, description
├─ category (enum)
├─ severity (enum)
├─ location (geography Point SRID 4326)
├─ metadata (jsonb)
└─ Relations: tenant, createdBy
```

### Index critiques

```sql
-- Users
idx_users_email
idx_users_tenant_role

-- Risks (GIST pour PostGIS)
idx_risks_location_gist
idx_risks_tenant_category

-- Refresh Tokens
idx_refresh_tokens_valid (partial index)
```

---

## 🧪 Tests

### Structure tests

```
test/
├── auth.service.spec.ts    # Tests unitaires auth
├── services.spec.ts        # Tests tenants, risks
└── jest-e2e.json          # Config tests e2e
```

### Coverage attendu

- Services : >80%
- Controllers : >70%
- Guards : 100%

### Exemples

```typescript
// Test login success
it('should login with valid credentials', async () => {
  const result = await authService.login({
    email: 'test@example.com',
    password: 'Test123!',
  });
  expect(result).toHaveProperty('accessToken');
});

// Test permissions
it('should throw ForbiddenException for insufficient role', async () => {
  await expect(
    usersService.create(createUserDto, adminUser)
  ).rejects.toThrow(ForbiddenException);
});
```

---

## 📊 Monitoring

### Logs recommandés

```typescript
// Production
logger.log(`User ${userId} logged in`);
logger.warn(`Failed login attempt: ${email}`);
logger.error(`Database error: ${error.message}`);
```

### Métriques importantes

- Taux d'erreur auth
- Latence endpoints /risks/nearby
- Taux hit cache ETag
- Nombre requêtes par tenant
- Utilisation limites offres

---

## 🔄 Workflow type

### Création tenant + admin

1. Superadmin crée tenant via POST /tenants
2. Trigger PostgreSQL génère GL-XXXXX
3. Superadmin crée admin via POST /tenants/:id/admins
4. Email envoyé à l'admin (optionnel)
5. Admin se connecte et crée gestionnaires/utilisateurs

### Création risque

1. User authentifié (JWT)
2. RolesGuard valide permissions
3. Service vérifie tenant actif
4. Insertion PostGIS avec ST_MakePoint
5. Audit log créé
6. Retour risque avec lat/lng

### Recherche proximité

1. User authentifié
2. Validation query params (lat/lng/radius)
3. Check ETag header
4. Query ST_DWithin avec index GIST
5. Génération ETag
6. Return 304 si unchanged, sinon 200 + ETag

---

## 🚀 Optimisations

### PostGIS

- Index GIST sur location
- ST_DWithin > ST_Distance pour filtrage
- Limit queries à 200 max
- Radius max 100km

### Queries

- Utiliser raw queries pour PostGIS
- Éviter N+1 (eager loading)
- Index sur colonnes filtrées

### Cache

- ETag sur /nearby
- Redis possible pour sessions (future)

---

## 📦 Dépendances principales

```json
{
  "@nestjs/core": "^10.3.0",
  "@nestjs/typeorm": "^10.0.1",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "@nestjs/throttler": "^5.1.1",
  "typeorm": "^0.3.19",
  "pg": "^8.11.3",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "passport-jwt": "^4.0.1",
  "nodemailer": "^6.9.7"
}
```

---

## 🎓 Bonnes pratiques appliquées

✅ Séparation des responsabilités (services/controllers)  
✅ DTOs avec validation stricte  
✅ Guards composables  
✅ Decorators personnalisés  
✅ Error handling centralisé  
✅ Logging structuré  
✅ Tests unitaires + e2e  
✅ Documentation inline  
✅ TypeScript strict  
✅ Async/await partout  

---

**Auteur** : Architecture générée  
**Date** : 2025-02-09  
**Version** : 1.0.0
