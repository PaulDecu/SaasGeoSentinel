// src/system-settings/system-settings.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSettingDto, UpdateDashboardMessageDto } from './dto/system-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  // ✅ IMPORTANT: Routes spécifiques AVANT les routes avec :id

  // Route publique : message du dashboard (tous utilisateurs)
  @Get('public/dashboard-message')
  @UseGuards(JwtAuthGuard)
  async getDashboardMessage() {
    return this.systemSettingsService.getDashboardMessage();
  }

  // Route publique : tous les paramètres
  @Get('public/all')
  @UseGuards(JwtAuthGuard)
  async getAllPublic() {
    return this.systemSettingsService.getAllSettingsPublic();
  }

  // Route admin : mettre à jour le message du dashboard (SUPERADMIN only)
  @Patch('dashboard-message')
  @UseGuards(JwtAuthGuard)
  async updateDashboardMessage(
    @GetUser() user: User,
    @Body() updateDto: UpdateDashboardMessageDto,
  ) {
    return this.systemSettingsService.updateDashboardMessage(updateDto, user);
  }

  // Route admin : liste tous les paramètres (SUPERADMIN only)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@GetUser() user: User) {
    return this.systemSettingsService.findAll(user);
  }

  // ✅ Routes avec :id en DERNIER

  // Route admin : récupérer un paramètre (SUPERADMIN only)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.systemSettingsService.findOne(id, user);
  }

  // Route admin : mettre à jour un paramètre (SUPERADMIN only)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateSystemSettingDto,
  ) {
    return this.systemSettingsService.update(id, updateDto, user);
  }
}
