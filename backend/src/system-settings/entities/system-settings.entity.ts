// src/system-settings/entities/system-setting.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TourneeType {
  PIEDS = 'pieds',
  VELO = 'velo',
  VOITURE = 'voiture',
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TourneeType,
    unique: true,
    name: 'tournee_type', // ✅ Mapping vers tournee_type en base
  })
  tourneeType: TourneeType;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'label', // ✅ Déjà en minuscule
  })
  label: string;

  @Column({
    type: 'integer',
    comment: 'Délai d\'appel à l\'API nearby en minutes',
    name: 'api_call_delay_minutes', // ✅ Mapping vers api_call_delay_minutes
  })
  apiCallDelayMinutes: number;

  @Column({
    type: 'integer',
    comment: 'Délai de test de position en secondes',
    name: 'position_test_delay_seconds', // ✅ Mapping vers position_test_delay_seconds
  })
  positionTestDelaySeconds: number;

  @Column({
    type: 'integer',
    comment: 'Zone de chargement des risques en kilomètres',
    name: 'risk_load_zone_km', // ✅ Mapping vers risk_load_zone_km
  })
  riskLoadZoneKm: number;

  @Column({
    type: 'integer',
    comment: 'Rayon d\'alerte en mètres',
    name: 'alert_radius_meters', // ✅ Mapping vers alert_radius_meters
  })
  alertRadiusMeters: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
