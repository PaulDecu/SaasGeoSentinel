import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

// En développement cross-origin (front :3001 / back :3000), 'strict' bloque
// les cookies car le navigateur considère les ports différents comme cross-site.
// 'lax' les autorise. En production (même domaine), on repasse à 'strict'.
const COOKIE_SAME_SITE = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);

    // ✅ Cookie httpOnly pour les clients web
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      // ✅ Retourné aussi dans le body pour les clients mobiles
      // (les cookies httpOnly ne sont pas accessibles depuis React Native)
      refreshToken: result.refreshToken,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // ✅ Accepte le refreshToken depuis le body (mobile) OU le cookie (web)
    const refreshToken = body?.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token manquant');
    }

    const result = await this.authService.refresh(refreshToken);

    // ✅ Mettre à jour le cookie pour les clients web
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      // ✅ Retourné dans le body pour les clients mobiles
      refreshToken: result.refreshToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK) // ✅ Retiré JwtAuthGuard : le logout doit toujours réussir
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    // Révoquer le refresh token si présent
    // logout(userId, refreshToken?) : si refreshToken fourni, userId n'est pas utilisé
    if (refreshToken) {
      try {
        await this.authService.logout('', refreshToken);
      } catch {
        // Ignorer : token déjà révoqué ou invalide
      }
    }

    // Toujours supprimer le cookie, quelle que soit la situation
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
    });

    return { message: 'Déconnexion réussie' };
  }
}
