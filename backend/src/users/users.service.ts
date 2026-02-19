import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, BulkDeleteUsersDto } from './dto/users.dto';
import { UserRole } from './entities/user-role.enum';
import { TenantsService } from '../tenants/tenants.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantsService: TenantsService,
    private auditService: AuditService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto, creator: User): Promise<User> {
    // Vérifier que l'email n'existe pas
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Valider le rôle selon le créateur
    if (creator.role === UserRole.ADMIN) {
      if (![UserRole.GESTIONNAIRE, UserRole.UTILISATEUR].includes(createUserDto.role)) {
        throw new ForbiddenException(
          'Un admin peut uniquement créer des gestionnaires et utilisateurs',
        );
      }

      if (createUserDto.tenantId && createUserDto.tenantId !== creator.tenantId) {
        throw new ForbiddenException('Vous ne pouvez créer des utilisateurs que pour votre tenant');
      }

      createUserDto.tenantId = creator.tenantId || undefined;
    }

    // Vérifier que le tenant existe et n'a pas atteint sa limite
    if (createUserDto.tenantId) {
      await this.tenantsService.checkUserLimit(createUserDto.tenantId);
    }

    // Valider et hasher le mot de passe
    this.validatePassword(createUserDto.password);
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      role: createUserDto.role,
      tenantId: createUserDto.tenantId || null,
    });

    const savedUser = await this.userRepository.save(user);

    // ✅ Envoyer le lien d'initialisation (valable 12h) après la création
    await this.authService.sendInitializationEmail(savedUser.id);

    // Audit log
    await this.auditService.log({
      action: 'USER_CREATED',
      userId: creator.id,
      tenantId: creator.tenantId,
      details: {
        createdUserId: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
      },
    });

    return savedUser;
  }

  async findAll(currentUser: User): Promise<User[]> {
    if (currentUser.role === UserRole.SUPERADMIN) {
      return this.userRepository.find({
        relations: ['tenant'],
        order: { createdAt: 'DESC' },
      });
    }

    if (!currentUser.tenantId) {
      return [];
    }

    return this.userRepository.find({
      where: { tenantId: currentUser.tenantId },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (
      currentUser.role !== UserRole.SUPERADMIN &&
      user.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Accès interdit');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findOne(id, currentUser);

    if (
      currentUser.role === UserRole.ADMIN &&
      updateUserDto.role &&
      ![UserRole.GESTIONNAIRE, UserRole.UTILISATEUR].includes(updateUserDto.role)
    ) {
      throw new ForbiddenException('Rôle non autorisé');
    }

    Object.assign(user, {
      ...updateUserDto,
      email: updateUserDto.email?.toLowerCase(),
    });

    const updatedUser = await this.userRepository.save(user);

    await this.auditService.log({
      action: 'USER_UPDATED',
      userId: currentUser.id,
      tenantId: currentUser.tenantId,
      details: { updatedUserId: id, updates: updateUserDto },
    });

    return updatedUser;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.findOne(id, currentUser);

    if (id === currentUser.id) {
      throw new BadRequestException('Impossible de supprimer votre propre compte');
    }

    if (
      currentUser.role === UserRole.ADMIN &&
      ![UserRole.GESTIONNAIRE, UserRole.UTILISATEUR].includes(user.role)
    ) {
      throw new ForbiddenException('Vous ne pouvez supprimer que des gestionnaires et utilisateurs');
    }

    try {
      await this.userRepository.remove(user);
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
        throw new ConflictException(
          "Impossible de supprimer cet utilisateur car il existe des risques rattachés à son compte."
        );
      }
      throw error;
    }

    await this.auditService.log({
      action: 'USER_DELETED',
      userId: currentUser.id,
      tenantId: currentUser.tenantId,
      details: { deletedUserId: id, email: user.email, role: user.role },
    });
  }

  async bulkDelete(bulkDeleteDto: BulkDeleteUsersDto, currentUser: User) {
    const results: {
      success: string[];
      errors: Array<{ userId: string; error: string }>;
    } = { success: [], errors: [] };

    for (const userId of bulkDeleteDto.userIds) {
      try {
        await this.remove(userId, currentUser);
        results.success.push(userId);
      } catch (error: any) {
        results.errors.push({ userId, error: error.message });
      }
    }

    await this.auditService.log({
      action: 'USERS_BULK_DELETE',
      userId: currentUser.id,
      tenantId: currentUser.tenantId,
      details: {
        attempted: bulkDeleteDto.userIds.length,
        success: results.success.length,
        failed: results.errors.length,
      },
    });

    return results;
  }

  private validatePassword(password: string): void {
    if (password.length < 8 || password.length > 128) {
      throw new BadRequestException(
        'Le mot de passe doit contenir entre 8 et 128 caractères',
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins une majuscule',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins une minuscule',
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins un chiffre',
      );
    }
  }
}
