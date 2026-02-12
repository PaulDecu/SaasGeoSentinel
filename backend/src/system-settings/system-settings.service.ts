// src/system-settings/system-settings.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, TourneeType } from './entities/system-settings.entity';
import { UpdateSystemSettingDto, UpdateDashboardMessageDto } from './dto/system-settings.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
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
        dashboardMessage: null,
      },
      {
        tourneeType: TourneeType.VELO,
        label: 'À vélo',
        apiCallDelayMinutes: 7,
        positionTestDelaySeconds: 20,
        riskLoadZoneKm: 10,
        alertRadiusMeters: 100,
        dashboardMessage: null,
      },
      {
        tourneeType: TourneeType.VOITURE,
        label: 'En voiture',
        apiCallDelayMinutes: 5,
        positionTestDelaySeconds: 10,
        riskLoadZoneKm: 10,
        alertRadiusMeters: 250,
        dashboardMessage: null,
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

  // ✅ CORRECTION: Mettre à jour le message du dashboard sur TOUS les settings
  async updateDashboardMessage(
    updateDto: UpdateDashboardMessageDto,
    user: User,
  ): Promise<{ message: string; dashboardMessage: string | null }> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Accès réservé au superadmin');
    }

    // ✅ Récupérer tous les settings et les mettre à jour un par un
    const allSettings = await this.systemSettingRepository.find();
    
    for (const setting of allSettings) {
      setting.dashboardMessage = updateDto.dashboardMessage || null;
      await this.systemSettingRepository.save(setting);
    }

    return {
      message: 'Message du dashboard mis à jour',
      dashboardMessage: updateDto.dashboardMessage || null,
    };
  }

  // Récupérer le message du dashboard (route publique)
  async getDashboardMessage(): Promise<{ dashboardMessage: string | null }> {
    // Récupérer le message depuis n'importe quel setting (ils ont tous le même)
    const setting = await this.systemSettingRepository.findOne({
      where: {},
      order: { tourneeType: 'ASC' },
    });

    return {
      dashboardMessage: setting?.dashboardMessage || null,
    };
  }

  async getSettingsByType(tourneeType: TourneeType): Promise<SystemSetting | null> {
    return this.systemSettingRepository.findOne({
      where: { tourneeType },
    });
  }

  async getAllSettingsPublic(): Promise<SystemSetting[]> {
    return this.systemSettingRepository.find({
      order: { tourneeType: 'ASC' },
    });
  }
}
