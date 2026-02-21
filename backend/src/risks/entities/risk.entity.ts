import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { TenantRiskCategory } from '../../tenants/entities/tenant-risk-category.entity';
import { RiskSeverity } from './risk.enums';

@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdByUserId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: RiskSeverity })
  severity: RiskSeverity;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: false,
  })
  location: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.risks)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.risks)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => TenantRiskCategory, (cat) => cat.risks)
  @JoinColumn({ name: 'category_id' })
  riskCategory: TenantRiskCategory;

  // Virtual properties
  latitude?: number;
  longitude?: number;
  distance?: number;
  creatorEmail?: string;
  // ✅ Dénormalisé pour éviter les jointures dans les réponses API
  category?: string;  // name de la catégorie (ex: 'naturel')
  categoryLabel?: string; // label de la catégorie (ex: 'Naturel')
  categoryColor?: string;
  categoryIcon?: string;
}