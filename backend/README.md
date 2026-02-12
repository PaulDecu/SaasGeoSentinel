# 🚀 SaaS Multi-tenant - Gestion Risques Géolocalisés - Backend NestJS

Backend NestJS complet avec authentification JWT, RLS PostgreSQL, et géolocalisation PostGIS.

## 📋 Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [API Documentation](#api-documentation)
- [Authentification](#authentification)
- [Permissions (RBAC)](#permissions-rbac)
- [Tests](#tests)
- [Déploiement](#déploiement)

---

## 🔧 Installation

### Prérequis

- Node.js 18+ 
- PostgreSQL 14+ avec PostGIS
- MailHog (pour dev, emails)

### Installation des dépendances

```bash
npm install
```

### Configuration de la base de données

1. Créer la base de données PostgreSQL :
```sql
CREATE DATABASE risks_geo_saas;
\c risks_geo_saas
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. Exécuter les scripts SQL d'initialisation (depuis le projet de base de données) :
```bash
psql -U postgres -d risks_geo_saas -f ../database/init_database.sql
psql -U postgres -d risks_geo_saas -f ../database/rls_policies.sql
```

### Configuration environnement

Copier `.env.example` vers `.env` et configurer :

```bash
cp .env.example .env
```

Éditer `.env` avec vos valeurs.

---

## ⚙️ Configuration

### Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_HOST` | Hôte PostgreSQL | `localhost` |
| `DATABASE_PORT` | Port PostgreSQL | `5432` |
| `DATABASE_NAME` | Nom de la base | `risks_geo_saas` |
| `DATABASE_USER` | Utilisateur DB | `postgres` |
| `DATABASE_PASSWORD` | Mot de passe DB | `postgres` |
| `JWT_SECRET` | Secret JWT | `your-secret-key` |
| `JWT_ACCESS_EXPIRES_IN` | Durée access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée refresh token | `30d` |
| `SMTP_HOST` | Hôte SMTP | `localhost` |
| `SMTP_PORT` | Port SMTP | `1025` |
| `FRONTEND_URL` | URL du frontend | `http://localhost:3001` |

---

## 📁 Structure du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── dto/                # DTOs (Login, Reset, etc.)
│   ├── entities/           # Entities (RefreshToken, PasswordResetToken)
│   ├── guards/             # Guards JWT
│   ├── strategies/         # Stratégies Passport
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
│
├── users/                   # Module utilisateurs
│   ├── dto/
│   ├── entities/           # User entity
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── tenants/                # Module tenants (clients)
│   ├── dto/
│   ├── entities/           # Tenant entity
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   └── tenants.module.ts
│
├── offers/                 # Module offres commerciales
│   ├── dto/
│   ├── entities/           # Offer entity
│   ├── offers.controller.ts
│   ├── offers.service.ts
│   └── offers.module.ts
│
├── risks/                  # Module risques géolocalisés
│   ├── dto/
│   ├── entities/           # Risk entity + enums
│   ├── risks.controller.ts
│   ├── risks.service.ts    # Avec requêtes PostGIS
│   └── risks.module.ts
│
├── profile/                # Module profil utilisateur
│   ├── profile.controller.ts
│   ├── profile.service.ts
│   └── profile.module.ts
│
├── audit/                  # Module logs d'audit
│   ├── entities/           # AuditLog entity
│   ├── audit.service.ts
│   └── audit.module.ts
│
├── common/                 # Ressources communes
│   ├── decorators/         # @CurrentUser, @Roles
│   ├── guards/             # RolesGuard
│   ├── services/           # MailService
│   └── interceptors/
│
├── database/               # Configuration DB
│   ├── data-source.ts     # Configuration TypeORM
│   └── migrations/        # Migrations (si nécessaire)
│
├── app.module.ts          # Module racine
└── main.ts                # Point d'entrée
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 🔐 Authentification

```http
POST   /api/auth/login              # Connexion
POST   /api/auth/logout             # Déconnexion
POST   /api/auth/refresh            # Renouveler token
POST   /api/auth/forgot-password    # Demande reset MDP
POST   /api/auth/reset-password     # Réinitialiser MDP
```

#### 👤 Profil

```http
GET    /api/me                      # Obtenir profil
POST   /api/me/change-password      # Changer MDP
```

#### 👥 Utilisateurs (Admin/Superadmin)

```http
GET    /api/users                   # Liste utilisateurs
POST   /api/users                   # Créer utilisateur
GET    /api/users/:id               # Détails utilisateur
PUT    /api/users/:id               # Modifier utilisateur
DELETE /api/users/:id               # Supprimer utilisateur
POST   /api/users/bulk-delete       # Suppression en lot
```

#### 🏢 Tenants (Superadmin uniquement)

```http
GET    /api/tenants                 # Liste tenants
POST   /api/tenants                 # Créer tenant
GET    /api/tenants/:id             # Détails tenant
PUT    /api/tenants/:id             # Modifier tenant
DELETE /api/tenants/:id             # Supprimer tenant
POST   /api/tenants/:id/admins      # Créer admin tenant
```

#### 💼 Offres (Superadmin uniquement)

```http
GET    /api/offers                  # Liste offres
POST   /api/offers                  # Créer offre
GET    /api/offers/:id              # Détails offre
PUT    /api/offers/:id              # Modifier offre
DELETE /api/offers/:id              # Supprimer offre
```

#### 🗺️ Risques

```http
GET    /api/risks                   # Liste risques (tenant scoped)
POST   /api/risks                   # Créer risque
GET    /api/risks/:id               # Détails risque
PUT    /api/risks/:id               # Modifier risque
DELETE /api/risks/:id               # Supprimer risque
GET    /api/risks/nearby            # Recherche à proximité
       ?lat=48.8566&lng=2.3522&radius_km=10&limit=200
```

---

## 🔐 Authentification

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@platform.local",
    "password": "Admin123!"
  }'
```

Réponse :
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@platform.local",
    "role": "superadmin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

Le `refreshToken` est stocké dans un cookie httpOnly.

### Utilisation du token

Ajouter le header `Authorization` avec le token :

```bash
curl -X GET http://localhost:3000/api/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Refresh token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  --cookie "refreshToken=xxx"
```

---

## 🛡️ Permissions (RBAC)

### Rôles

| Rôle | Permissions |
|------|-------------|
| **superadmin** | Gestion plateforme : offres, tenants, tous les users |
| **admin** | Gestion tenant : users (gestionnaires/utilisateurs), risques |
| **gestionnaire** | Gestion risques du tenant |
| **utilisateur** | Consultation + création risques personnels |

### Guards

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class UsersController {
  // Seulement accessible par admin et superadmin
}
```

---

## 🧪 Tests

### Lancer les tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:cov

# Tests en mode watch
npm run test:watch

# Tests e2e
npm run test:e2e
```

### Exemple de test

```typescript
describe('AuthService', () => {
  it('should successfully login with valid credentials', async () => {
    const result = await authService.login({
      email: 'test@example.com',
      password: 'Test123!',
    });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('user');
  });
});
```

---

## 🚀 Déploiement

### Mode développement

```bash
npm run start:dev
```

### Mode production

```bash
# Build
npm run build

# Lancer
npm run start:prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/main"]
```

### Variables d'environnement production

⚠️ **IMPORTANT** :
- Changer `JWT_SECRET` par une valeur aléatoire forte
- Changer le mot de passe superadmin par défaut
- Activer SSL sur PostgreSQL
- Configurer CORS strictement
- Activer `secure: true` sur les cookies

---

## 📝 Notes importantes

### PostGIS

Les requêtes géospatiales utilisent `ST_DWithin` pour optimiser les recherches :

```typescript
// Recherche dans un rayon de 10km
const risks = await riskRepository.query(
  `SELECT * FROM risks
   WHERE ST_DWithin(
     location,
     ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
     $3
   )`,
  [longitude, latitude, 10000] // 10km = 10000m
);
```

### ETag Support

L'endpoint `/risks/nearby` supporte ETag pour le cache :

```bash
curl -X GET "http://localhost:3000/api/risks/nearby?lat=48.8566&lng=2.3522" \
  -H "Authorization: Bearer xxx" \
  -H "If-None-Match: \"abc123\""

# Si pas de changement → 304 Not Modified
```

### Rate Limiting

Rate limiting global activé : 100 requêtes/minute par utilisateur.

---

## 📞 Support

Pour toute question, consulter :
- Les tests dans `/test`
- Les commentaires dans les services
- La documentation de la base de données

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025-02-09  
**License** : MIT
