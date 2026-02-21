import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RiskCategoriesService } from './risk-categories.service';
import { CreateRiskCategoryDto, UpdateRiskCategoryDto } from './dto/risk-categories.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('tenants/risk-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiskCategoriesController {
  constructor(private readonly riskCategoriesService: RiskCategoriesService) {}

  // ✅ Accessible à tous les rôles du tenant (pour charger les catégories dans les formulaires)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  findAll(@CurrentUser() user: User) {
    if (!user.tenantId) throw new ForbiddenException('Tenant requis');
    return this.riskCategoriesService.findAll(user.tenantId);
  }

  // ✅ ADMIN uniquement
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateRiskCategoryDto, @CurrentUser() user: User) {
    return this.riskCategoriesService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRiskCategoryDto,
    @CurrentUser() user: User,
  ) {
    return this.riskCategoriesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.riskCategoriesService.remove(id, user);
  }
}