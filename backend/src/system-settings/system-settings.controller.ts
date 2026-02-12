// src/system-settings/system-settings.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSettingDto } from './dto/system-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  // Route admin : liste tous les paramètres (SUPERADMIN only)
  @Get()
  async findAll(@GetUser() user: User) {
    return this.systemSettingsService.findAll(user);
  }

  // Route admin : récupérer un paramètre (SUPERADMIN only)
  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.systemSettingsService.findOne(id, user);
  }

  // Route admin : mettre à jour un paramètre (SUPERADMIN only)
  @Put(':id')
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateSystemSettingDto,
  ) {
    return this.systemSettingsService.update(id, updateDto, user);
  }

  // Route publique : tous les utilisateurs peuvent voir les paramètres
  @Get('public/all')
  async getAllPublic() {
    return this.systemSettingsService.getAllSettingsPublic();
  }
}
