import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  // Lien de réinitialisation classique — valable 1 heure
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    console.log(`📧 Envoi reset password à ${email}. URL: ${resetUrl}`);

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <h1>Réinitialisation de mot de passe</h1>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top:16px;color:#6b7280;font-size:14px;">Ce lien expirera dans <strong>1 heure</strong>.</p>
          <p style="color:#6b7280;font-size:14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        `,
      });
      console.log('✅ Mail reset password envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur SMTP :', error);
    }
  }

  // ✅ NOUVELLE MÉTHODE : lien d'initialisation de compte — valable 12 heures
  async sendAccountInitializationEmail(email: string, token: string): Promise<void> {
    const initUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    console.log(`📧 Envoi initialisation compte à ${email}. URL: ${initUrl}`);

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to: email,
        subject: 'Bienvenue — Initialisez votre mot de passe',
        html: `
          <h1>Bienvenue sur GeoSentinel !</h1>
          <p>Un compte a été créé pour vous. Pour accéder à votre espace, vous devez d'abord définir votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour initialiser votre mot de passe :</p>
          <a href="${initUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
            Initialiser mon mot de passe
          </a>
          <p style="margin-top:16px;color:#6b7280;font-size:14px;">Ce lien expirera dans <strong>12 heures</strong>.</p>
          <p style="color:#6b7280;font-size:14px;">Si vous n'êtes pas concerné par cette création de compte, ignorez cet email.</p>
        `,
      });
      console.log('✅ Mail initialisation compte envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur SMTP :', error);
    }
  }
}
