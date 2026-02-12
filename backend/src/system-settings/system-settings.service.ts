// src/system-settings/system-settings.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, TourneeType } from './entities/system-settings.entity';
import { UpdateSystemSettingDto } from './dto/system-settings.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    // Initialiser les paramètres par défaut au démarrage
    await this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    const defaultSettings = [
      {
        tourneeType: TourneeType.PIEDS,
        label: 'À pieds',
        apiCallDelayMinutes: 10,
        positionTestDelaySeconds: 30,
        riskLoadZoneKm: 5,
        alertRadiusMeters: 60,
      },
      {
        tourneeType: TourneeType.VELO,
        label: 'À vélo',
        apiCallDelayMinutes: 7,
        positionTestDelaySeconds: 20,
        riskLoadZoneKm: 10,
        alertRadiusMeters: 100,
      },
      {
        tourneeType: TourneeType.VOITURE,
        label: 'En voiture',
        apiCallDelayMinutes: 5,
        positionTestDelaySeconds: 10,
        riskLoadZoneKm: 10,
        alertRadiusMeters: 250,
      },
    ];

    for (const setting of defaultSettings) {
      const exists = await this.systemSettingRepository.findOne({
        where: { tourneeType: setting.tourneeType },
      });

      if (!exists) {
        await this.systemSettingRepository.save(setting);
      }
    }
  }

  async findAll(user: User): Promise<SystemSetting[]> {
    // Seul le superadmin peut voir les paramètres système
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Accès réservé au superadmin');
    }

    return this.systemSettingRepository.find({
      order: { tourneeType: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<SystemSetting> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Accès réservé au superadmin');
    }

    const setting = await this.systemSettingRepository.findOne({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Paramètre non trouvé');
    }

    return setting;
  }

  async update(
    id: string,
    updateDto: UpdateSystemSettingDto,
    user: User,
  ): Promise<SystemSetting> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Accès réservé au superadmin');
    }

    const setting = await this.findOne(id, user);

    Object.assign(setting, updateDto);

    return this.systemSettingRepository.save(setting);
  }

  // Méthode publique pour que les apps mobiles puissent récupérer les paramètres
  async getSettingsByType(tourneeType: TourneeType): Promise<SystemSetting | null> {
    return this.systemSettingRepository.findOne({
      where: { tourneeType },
    });
  }

  // Méthode publique pour tous les utilisateurs
  async getAllSettingsPublic(): Promise<SystemSetting[]> {
    return this.systemSettingRepository.find({
      order: { tourneeType: 'ASC' },
    });
  }
}
