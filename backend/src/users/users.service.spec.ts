import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.enum';
import { TenantsService } from '../tenants/tenants.service';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    tenantId: 'tenant-123',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTenantsService = {
    checkUserLimit: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantsService.checkUserLimit.mockResolvedValue(undefined);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(
        { email: 'new@example.com', password: 'Test123!', role: UserRole.UTILISATEUR, tenantId: 'tenant-123' },
        mockUser as any,
      );

      expect(result).toHaveProperty('email');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(
        { email: 'existing@example.com', password: 'Test123!', role: UserRole.UTILISATEUR },
        mockUser as any,
      )).rejects.toThrow(ConflictException);
    });

    it('should enforce role restrictions for admin', async () => {
      await expect(service.create(
        { email: 'new@example.com', password: 'Test123!', role: UserRole.SUPERADMIN },
        mockUser as any,
      )).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple users', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'user-456', tenantId: 'tenant-123' });
      mockUserRepository.remove.mockResolvedValue({});

      const result = await service.bulkDelete({ userIds: ['user-456'] }, mockUser as any);

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for failed deletions', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('Not found'));

      const result = await service.bulkDelete({ userIds: ['invalid'] }, mockUser as any);

      expect(result.success).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});