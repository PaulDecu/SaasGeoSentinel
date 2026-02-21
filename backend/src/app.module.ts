import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { OffersModule } from './offers/offers.module';
import { RisksModule } from './risks/risks.module';
import { ProfileModule } from './profile/profile.module';
import { AuditModule } from './audit/audit.module';
import { SystemSettingsModule } from './system-settings/system-settings.module'; // ✅ AJOUTÉ
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentModule } from './payment/payment.module';


// Entities
import { User } from './users/entities/user.entity';
import { Tenant } from './tenants/entities/tenant.entity';
import { Offer } from './offers/entities/offer.entity';
import { Risk } from './risks/entities/risk.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { SystemSetting } from './system-settings/entities/system-settings.entity'; // ✅ AJOUTÉ
import { Subscription } from './subscriptions/entities/subscription.entity'; // ✅ AJOUTER CET IMPORT
import { TenantRiskCategory } from './tenants/entities/tenant-risk-category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Force la lecture du fichier à la racine
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get('DATABASE_PORT'),
        username: config.get('DATABASE_USER'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        entities: [
          User,
          Tenant,
          Offer,
          Risk,
          RefreshToken,
          PasswordResetToken,
          AuditLog,
          SystemSetting, // ✅ AJOUTÉ
          Subscription,
          TenantRiskCategory,
        ],
        synchronize: false, // IMPORTANT: Toujours false en production
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 secondes
      limit: 100, // 100 requêtes
    }]),
    AuthModule,
    UsersModule,
    TenantsModule,
    OffersModule,
    RisksModule,
    ProfileModule,
    AuditModule,
    SystemSettingsModule, // ✅ AJOUTÉ
    SubscriptionsModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}