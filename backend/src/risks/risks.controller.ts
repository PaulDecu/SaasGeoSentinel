import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { RisksService } from './risks.service';
import { CreateRiskDto, UpdateRiskDto, FindNearbyRisksDto } from './dto/risks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('risks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  create(@Body() createRiskDto: CreateRiskDto, @CurrentUser() user: User) {
    return this.risksService.create(createRiskDto, user);
  }

  @Post('bulk-delete')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: User) {
    return this.risksService.bulkDelete(ids, user);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  findAll(@CurrentUser() user: User) {
    return this.risksService.findAll(user);
  }

  // ✅ NOUVELLE ROUTE : tous les risques de l'entreprise (lecture seule pour UTILISATEUR)
  @Get('company')
  @Roles(UserRole.UTILISATEUR, UserRole.GESTIONNAIRE, UserRole.ADMIN, UserRole.SUPERADMIN)
  findAllByCompany(@CurrentUser() user: User) {
    return this.risksService.findAllByCompany(user);
  }

  @Get('nearby')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  async findNearby(
    @Query() query: FindNearbyRisksDto,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const risks = await this.risksService.findNearby(query, user);
    const etag = await this.risksService.generateETag(risks);

    if (req.headers['if-none-match'] === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json(risks);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.risksService.findOne(id, user);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  update(@Param('id') id: string, @Body() updateRiskDto: UpdateRiskDto, @CurrentUser() user: User) {
    return this.risksService.update(id, updateRiskDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.UTILISATEUR)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.risksService.remove(id, user);
  }
}
