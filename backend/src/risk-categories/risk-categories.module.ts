import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskCategoriesController } from './risk-categories.controller';
import { RiskCategoriesService } from './risk-categories.service';
import { TenantRiskCategory } from '../tenants/entities/tenant-risk-category.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantRiskCategory]),
    AuditModule,
  ],
  controllers: [RiskCategoriesController],
  providers: [RiskCategoriesService],
  exports: [RiskCategoriesService], // exporté pour tenants.service.ts (createDefaultCategories)
})
export class RiskCategoriesModule {}
