import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, CreateTenantAdminDto } from './dto/tenants.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // 🆕 NOUVELLE ROUTE : Vérifier la validité de l'abonnement
  @Get('subscription-status')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  async checkSubscriptionStatus(@CurrentUser() user: User) {
    const tenantId = user.tenantId;
    
    if (!tenantId) {
      return {
        isValid: false,
        subscriptionEnd: null,
        daysRemaining: 0,
      };
    }

    const tenant = await this.tenantsService.findOne(tenantId);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const subscriptionEnd = tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd) : null;
    
    if (!subscriptionEnd) {
      return {
        isValid: false,
        subscriptionEnd: null,
        daysRemaining: 0,
      };
    }
    
    subscriptionEnd.setHours(0, 0, 0, 0);
    
    const isValid = subscriptionEnd >= now;
    const daysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isValid,
      subscriptionEnd: tenant.subscriptionEnd,
      daysRemaining: isValid ? daysRemaining : 0,
    };
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() createTenantDto: CreateTenantDto, @CurrentUser() user: User) {
    return this.tenantsService.create(createTenantDto, user.id);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN) // ✅ Admin peut accéder
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    // ✅ Si admin, vérifier qu'il accède à son propre tenant
    if (user.role === UserRole.ADMIN) {
      if (user.tenantId !== id) {
        throw new ForbiddenException(
          'Vous ne pouvez accéder qu\'à votre propre tenant',
        );
        console.log(user.tenant);
        console.log(id);
      }
    }
    
    return this.tenantsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.update(id, updateTenantDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tenantsService.remove(id, user.id);
  }

  @Post(':id/admins')
  @Roles(UserRole.SUPERADMIN)
  createAdmin(
    @Param('id') id: string,
    @Body() createAdminDto: CreateTenantAdminDto,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.createAdmin(id, createAdminDto, user.id);
  }
}
