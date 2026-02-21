import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type NotificationType = 'J-5' | 'J-1' | 'J0' | 'J+10' | 'J+30';

@Entity('subscription_notification_logs')
@Unique('uq_notification_per_cycle', ['tenantId', 'notificationType', 'subscriptionEndDate'])
export class SubscriptionNotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    name: 'notification_type',
    type: 'varchar',
    length: 20,
  })
  notificationType: NotificationType;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'subscription_end_date', type: 'date' })
  subscriptionEndDate: string; // format 'YYYY-MM-DD' pour la contrainte unique par cycle

  @Column({ name: 'email_sent_to', length: 255 })
  emailSentTo: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
