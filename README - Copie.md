# 🗺️ SaaS Multi-tenant - Gestion Risques Géolocalisés
## Architecture Base de Données PostgreSQL + PostGIS

---

## 📦 Contenu de la livraison

```
.
├── ERD.mermaid                    # Diagramme entité-relation
├── init_database.sql              # Script d'initialisation complet
├── rls_policies.sql               # Politiques Row Level Security
├── conventions_nommage.md         # Standards et conventions
├── validations_metier.md          # Règles de validation métier
└── README.md                      # Ce fichier
```

---

## 🚀 Installation rapide

### 1. Prérequis

```bash
# PostgreSQL 14+ avec PostGIS
sudo apt install postgresql-14 postgresql-14-postgis-3

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE risques_geo_saas;
\c risques_geo_saas
```

### 2. Initialisation

```bash
# Activer les extensions et créer les tables
psql -U postgres -d risques_geo_saas -f init_database.sql

# Appliquer les politiques RLS
psql -U postgres -d risques_geo_saas -f rls_policies.sql
```

### 3. Vérification

```sql
-- Vérifier les extensions
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp', 'pgcrypto');

-- Vérifier les tables
\dt

-- Vérifier les politiques RLS
\d+ users
```

---

## 📊 Architecture de la base

### Tables principales

| Table | Description | RLS |
|-------|-------------|-----|
| `offers` | Offres commerciales (Starter, Business, Enterprise) | ✅ |
| `tenants` | Entreprises clientes (multi-tenant) | ✅ |
| `users` | Utilisateurs (tous rôles) | ✅ |
| `risks` | Risques géolocalisés | ✅ |
| `password_reset_tokens` | Tokens de réinitialisation MDP | ✅ |
| `refresh_tokens` | Tokens de session | ✅ |
| `trial_requests` | Demandes d'essai gratuit | ✅ |

### Rôles utilisateurs

```
superadmin      → Gestion plateforme (offres, clients, admins)
admin           → Gestion équipe tenant (users, risques)
gestionnaire    → Gestion risques du tenant
utilisateur     → Consultation + création risques perso
```

### Identifiants publics tenants

Format: `GL-XXXXX` (ex: GL-00001, GL-00042)
- Généré automatiquement via séquence PostgreSQL
- Unique et séquentiel
- Non réutilisé après suppression

---

## 🔐 Row Level Security (RLS)

### Configuration dans NestJS

```typescript
// src/database/rls.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(@InjectConnection() private connection: Connection) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Depuis JWT

    if (user) {
      // Définir le contexte RLS pour cette requête
      await this.connection.query(
        `SET LOCAL app.current_user_id = $1`,
        [user.id]
      );
      
      await this.connection.query(
        `SET LOCAL app.current_user_tenant_id = $1`,
        [user.tenantId || '']
      );
      
      await this.connection.query(
        `SET LOCAL app.current_user_role = $1`,
        [user.role]
      );
    }

    return next.handle();
  }
}
```

### Utilisation globale

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RlsInterceptor } from './database/rls.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Appliquer RLS globalement
  app.useGlobalInterceptors(new RlsInterceptor(app.get(Connection)));
  
  await app.listen(3000);
}
bootstrap();
```

---

## 🗺️ Géolocalisation PostGIS

### Insertion d'un risque

```typescript
// DTO
export class CreateRiskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RiskCategory)
  category: RiskCategory;

  @IsEnum(RiskSeverity)
  severity: RiskSeverity;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Service
async createRisk(dto: CreateRiskDto, userId: string, tenantId: string) {
  const risk = this.riskRepository.create({
    tenantId,
    createdBy: userId,
    title: dto.title,
    description: dto.description,
    category: dto.category,
    severity: dto.severity,
    metadata: dto.metadata || {},
  });

  // PostGIS: POINT(longitude, latitude)
  await this.riskRepository.query(
    `INSERT INTO risks (id, tenant_id, created_by, title, description, category, severity, location, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326)::GEOGRAPHY, $10)`,
    [
      risk.id,
      risk.tenantId,
      risk.createdBy,
      risk.title,
      risk.description,
      risk.category,
      risk.severity,
      dto.longitude,  // ATTENTION: longitude en premier !
      dto.latitude,
      JSON.stringify(risk.metadata)
    ]
  );

  return risk;
}
```

### Recherche à proximité (nearby)

```typescript
async findNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  limit: number = 200,
  tenantId: string
) {
  const radiusMeters = radiusKm * 1000;

  // Query optimisée avec ST_DWithin + index GIST
  const risks = await this.riskRepository.query(
    `SELECT 
       r.*,
       ST_Y(r.location::geometry) AS latitude,
       ST_X(r.location::geometry) AS longitude,
       ST_Distance(
         r.location,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
       ) AS distance
     FROM risks r
     WHERE r.tenant_id = $3
       AND ST_DWithin(
         r.location,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
         $4
       )
     ORDER BY distance ASC
     LIMIT $5`,
    [longitude, latitude, tenantId, radiusMeters, limit]
  );

  return risks;
}
```

---

## 🔑 Authentification JWT

### Configuration recommandée

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token court
        },
      }),
    }),
  ],
})
export class AuthModule {}
```

### Payload JWT

```typescript
interface JwtPayload {
  sub: string;           // user.id
  email: string;         // user.email
  role: UserRole;        // user.role
  tenantId: string | null; // user.tenantId
  iat: number;
  exp: number;
}
```

### Refresh tokens

```typescript
async generateTokens(user: User) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };

  const accessToken = this.jwtService.sign(payload);
  
  // Refresh token (30 jours)
  const refreshToken = randomBytes(32).toString('hex');
  const refreshTokenHash = createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await this.refreshTokenRepository.save({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes
  };
}
```

---

## 📧 Email (Mot de passe oublié)

### Configuration MailHog (développement)

```yaml
# docker-compose.yml
version: '3.8'
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

### Configuration NestJS

```typescript
// src/email/email.module.ts
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'localhost',
        port: 1025,
        secure: false,
      },
      defaults: {
        from: '"SaaS Risques" <noreply@risques-geo.local>',
      },
      template: {
        dir: __dirname + '/templates',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
})
export class EmailModule {}
```

### Envoi email reset password

```typescript
async sendPasswordResetEmail(user: User, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await this.mailerService.sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    template: 'password-reset',
    context: {
      name: user.email,
      resetUrl,
      expiresIn: '1 heure',
    },
  });
}
```

---

## 🧪 Tests

### Script de test RLS

```sql
-- Créer des données de test
INSERT INTO tenants (company_name, contact_email, offer_id) VALUES
  ('Test Corp', 'test@corp.com', (SELECT id FROM offers LIMIT 1));

INSERT INTO users (email, password_hash, role, tenant_id) VALUES
  ('admin@test.com', '$2a$10$...', 'admin', (SELECT id FROM tenants LIMIT 1)),
  ('user@test.com', '$2a$10$...', 'utilisateur', (SELECT id FROM tenants LIMIT 1));

-- Simuler un utilisateur
SET app.current_user_id = (SELECT id FROM users WHERE email = 'user@test.com');
SET app.current_user_tenant_id = (SELECT tenant_id FROM users WHERE email = 'user@test.com');
SET app.current_user_role = 'utilisateur';

-- Test: l'utilisateur voit uniquement son tenant
SELECT COUNT(*) FROM tenants; -- Doit retourner 1

-- Test: l'utilisateur ne peut pas créer un admin
INSERT INTO users (email, password_hash, role, tenant_id) VALUES
  ('test@test.com', '$2a$10$...', 'admin', (SELECT tenant_id FROM users WHERE email = 'user@test.com'));
-- Doit échouer avec erreur RLS

-- Nettoyer
RESET app.current_user_id;
RESET app.current_user_tenant_id;
RESET app.current_user_role;
```

---

## 🔧 Maintenance

### Nettoyage tokens expirés

```sql
-- Exécuter quotidiennement (cron)
SELECT cleanup_expired_tokens();
```

### Cron job PostgreSQL (pg_cron)

```sql
-- Installer pg_cron
CREATE EXTENSION pg_cron;

-- Nettoyer tous les jours à 2h du matin
SELECT cron.schedule('cleanup-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens()');
```

### Monitoring performances

```sql
-- Tables volumineuses
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bytes DESC;

-- Index non utilisés
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';

-- Slow queries
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 📝 Migrations

### TypeORM migrations

```typescript
// src/database/migrations/1709123456789-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class InitialSchema1709123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const sql = fs.readFileSync(
      path.join(__dirname, '../../../init_database.sql'),
      'utf8'
    );
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback si nécessaire
    await queryRunner.query('DROP SCHEMA public CASCADE');
    await queryRunner.query('CREATE SCHEMA public');
  }
}
```

### Commandes

```bash
# Générer une migration
npm run migration:generate -- src/database/migrations/AddColumnToRisks

# Exécuter les migrations
npm run migration:run

# Rollback dernière migration
npm run migration:revert
```

---

## 🚨 Sécurité

### Checklist production

- [ ] Changer le mot de passe superadmin par défaut
- [ ] Utiliser des secrets forts (JWT_SECRET, DATABASE_PASSWORD)
- [ ] Activer SSL sur PostgreSQL
- [ ] Configurer un WAF (Web Application Firewall)
- [ ] Implémenter rate limiting (ex: @nestjs/throttler)
- [ ] Activer les logs d'audit
- [ ] Configurer des backups automatiques
- [ ] Mettre en place une rotation des secrets
- [ ] Vérifier les politiques RLS en production
- [ ] Tester les permissions avec différents rôles

### Variables d'environnement

```bash
# .env.production
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=risques_geo_saas
DATABASE_USER=app_user
DATABASE_PASSWORD=<strong_password>

JWT_SECRET=<random_256_bit_key>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

FRONTEND_URL=https://app.risques-geo.fr

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@risques-geo.fr
SMTP_PASSWORD=<smtp_password>
```

---

## 📚 Documentation API

### Exemples d'endpoints

```typescript
// POST /auth/login
{
  "email": "user@example.com",
  "password": "Password123!"
}

// POST /risks
{
  "title": "Inondation zone industrielle",
  "description": "Risque d'inondation identifié",
  "category": "naturel",
  "severity": "eleve",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "metadata": {
    "source": "Prefecture",
    "date_identification": "2025-02-09"
  }
}

// GET /risks/nearby?lat=48.8566&lng=2.3522&radius_km=10&limit=50
```

---

## 🆘 Support

Pour toute question sur l'implémentation:
1. Consulter les fichiers de conventions et validations
2. Vérifier les commentaires dans les scripts SQL
3. Tester avec le script de test RLS

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2025-02-09  
**PostgreSQL**: 14+  
**PostGIS**: 3.x
