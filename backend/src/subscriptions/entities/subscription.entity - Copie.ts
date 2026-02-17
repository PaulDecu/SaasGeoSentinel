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
import { Offer } from '../../offers/entities/offer.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'payment_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDate: Date;

  @Column({ name: 'subscription_start_date', type: 'date' })
  subscriptionStartDate: Date;

  @Column({ name: 'subscription_end_date', type: 'date' })
  subscriptionEndDate: Date;

  @Column({ name: 'payment_method', length: 50, default: 'non_specifie' })
  paymentMethod: string;

  @Column({ name: 'payment_amount', type: 'decimal', precision: 10, scale: 2 })
  paymentAmount: number;

  @Column({ name: 'offer_name', length: 100 })
  offerName: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @ManyToOne(() => Offer)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;

  @Column({ name: 'days_subscribed', type: 'int' })
  daysSubscribed: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
