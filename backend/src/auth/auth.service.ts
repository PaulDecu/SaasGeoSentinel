import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../common/services/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email.toLowerCase() },
    });

    // Ne pas révéler si l'email existe ou non
    if (!user) {
      return {
        message: 'Si votre email existe, vous recevrez un lien de réinitialisation',
      };
    }

    // Générer token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Sauvegarder le token — valable 1 heure
    await this.passwordResetTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 heure
      isUsed: false,
    });

    // Envoyer email
    await this.mailService.sendPasswordResetEmail(user.email, token);

    return {
      message: 'Si votre email existe, vous recevrez un lien de réinitialisation',
    };
  }

  // ✅ NOUVELLE MÉTHODE : envoi du lien d'initialisation lors de la création d'un compte
  // Token valable 12 heures (contrairement au forgotPassword qui est 1 heure)
  async sendInitializationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Token valable 12 heures
    await this.passwordResetTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 heures
      isUsed: false,
    });

    await this.mailService.sendAccountInitializationEmail(user.email, token);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Valider le mot de passe
    this.validatePassword(resetPasswordDto.password);

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(resetPasswordDto.password, 10);

    // Mettre à jour le mot de passe
    resetToken.user.passwordHash = passwordHash;
    await this.userRepository.save(resetToken.user);

    // Invalider le token
    resetToken.isUsed = true;
    await this.passwordResetTokenRepository.save(resetToken);

    // Révoquer tous les refresh tokens de l'utilisateur
    await this.refreshTokenRepository.update(
      { userId: resetToken.user.id },
      { isRevoked: true },
    );

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.tenant'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Générer de nouveaux tokens
    const tokens = await this.generateTokens(storedToken.user);

    // Révoquer l'ancien refresh token
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await this.refreshTokenRepository.update(
        { tokenHash },
        { isRevoked: true },
      );
    } else {
      await this.refreshTokenRepository.update(
        { userId },
        { isRevoked: true },
      );
    }

    return { message: 'Déconnexion réussie' };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      isRevoked: false,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
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

  private sanitizeUser(user: User) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
