import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Offer } from '../../offers/entities/offer.entity';
import { User } from '../../users/entities/user.entity';
import { Risk } from '../../risks/entities/risk.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    name: 'public_id', 
    unique: true, 
    length: 20,
    // Utilise la séquence existante et formate sur 5 chiffres pour respecter la regex ^GL-[0-9]{5}$
    default: () => "concat('GL-', LPAD(nextval('tenant_public_id_seq')::text, 5, '0'))"
  })
  publicId: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ name: 'contact_email', length: 255 })
  contactEmail: string;

  @Column({ type: 'varchar', name: 'contact_phone', length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @Column({ name: 'subscription_start', type: 'timestamp' })
  subscriptionStart: Date;

  @Column({ name: 'subscription_end', type: 'timestamp', nullable: true })
  subscriptionEnd: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Offer, (offer) => offer.tenants, { eager: true })
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Risk, (risk) => risk.tenant)
  risks: Risk[];
}