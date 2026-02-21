import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Risk } from '../../risks/entities/risk.entity';

@Entity('tenant_risk_categories')
export class TenantRiskCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 100 })
  name: string; // clé technique ex: 'naturel'

  @Column({ length: 150 })
  label: string; // libellé affiché ex: 'Naturel'

  @Column({ length: 7, default: '#6b7280' })
  color: string; // couleur hex

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null; // emoji ou nom d'icône

  @Column({ default: 0 })
  position: number; // ordre d'affichage

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.riskCategories)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Risk, (risk) => risk.riskCategory)
  risks: Risk[];
}