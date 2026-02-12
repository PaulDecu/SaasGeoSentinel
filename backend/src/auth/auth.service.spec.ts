import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailService } from '../common/services/mail.service';
import { UserRole } from '../users/entities/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hash',
    role: UserRole.ADMIN,
    tenantId: 'tenant-123',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockPasswordResetTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => key === 'JWT_ACCESS_EXPIRES_IN' ? '15m' : 'test'),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockPasswordResetTokenRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true) as any);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'Test123!' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'wrong@example.com', password: 'Test123!' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false) as any);

      await expect(service.login({ email: 'test@example.com', password: 'Wrong!' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordResetTokenRepository.save.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toHaveProperty('message');
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result).toHaveProperty('message');
      expect(mockPasswordResetTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockResetToken = {
        tokenHash: 'hash',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      };

      mockPasswordResetTokenRepository.findOne.mockResolvedValue(mockResetToken);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('new-hash') as any);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockPasswordResetTokenRepository.save.mockResolvedValue({});
      mockRefreshTokenRepository.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', password: 'NewPassword123!' });

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException with invalid token', async () => {
      mockPasswordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'invalid', password: 'NewPassword123!' }))
        .rejects.toThrow(BadRequestException);
    });
  });
});