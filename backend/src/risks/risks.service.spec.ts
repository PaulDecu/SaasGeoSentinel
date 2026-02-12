import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { RisksService } from './risks.service';
import { Risk } from './entities/risk.entity';
import { RiskCategory, RiskSeverity } from './entities/risk.enums';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditService } from '../audit/audit.service';

describe('RisksService', () => {
  let service: RisksService;

  const mockUser = {
    id: 'user-123',
    role: UserRole.GESTIONNAIRE,
    tenantId: 'tenant-123',
  };

  const mockRisk = {
    id: 'risk-123',
    tenantId: 'tenant-123',
    createdByUserId: 'user-123',
    title: 'Test Risk',
    latitude: 48.8566,
    longitude: 2.3522,
    category: RiskCategory.NATUREL,
    severity: RiskSeverity.MODERE,
  };

  const mockRiskRepository = {
    query: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        { provide: getRepositoryToken(Risk), useValue: mockRiskRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<RisksService>(RisksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create risk with PostGIS', async () => {
      mockRiskRepository.query.mockResolvedValueOnce([{ id: 'risk-123' }]);
      mockRiskRepository.query.mockResolvedValueOnce([mockRisk]);

      const result = await service.create(
        {
          title: 'New Risk',
          description: 'Test',
          category: RiskCategory.NATUREL,
          severity: RiskSeverity.MODERE,
          latitude: 48.8566,
          longitude: 2.3522,
        },
        mockUser as any,
      );

      expect(result).toHaveProperty('id');
      expect(mockRiskRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_SetSRID'),
        expect.any(Array),
      );
    });
  });

  describe('findNearby', () => {
    it('should find risks within radius (mocked geospatial)', async () => {
      const nearbyRisks = [
        { ...mockRisk, distance: 500, latitude: 48.8570, longitude: 2.3525 },
        { ...mockRisk, id: 'risk-456', distance: 1200, latitude: 48.8580, longitude: 2.3530 },
      ];

      mockRiskRepository.query.mockResolvedValue(nearbyRisks);

      const result = await service.findNearby(
        { lat: 48.8566, lng: 2.3522, radius_km: 2 },
        mockUser as any,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('distance');
      expect(mockRiskRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        expect.any(Array),
      );
    });

    it('should respect tenant isolation', async () => {
      mockRiskRepository.query.mockResolvedValue([mockRisk]);

      await service.findNearby({ lat: 48.8566, lng: 2.3522 }, mockUser as any);

      expect(mockRiskRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id'),
        expect.arrayContaining(['tenant-123']),
      );
    });
  });

  describe('RLS - Tenant Isolation', () => {
    it('should prevent user A from seeing tenant B risks', async () => {
      const userA = { id: 'userA', role: UserRole.GESTIONNAIRE, tenantId: 'tenant-A' };
      const riskTenantB = { ...mockRisk, tenantId: 'tenant-B' };

      mockRiskRepository.query.mockResolvedValue([riskTenantB]);

      await expect(service.findOne('risk-123', userA as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow superadmin to see all risks', async () => {
      const superadmin = { id: 'super', role: UserRole.SUPERADMIN, tenantId: null };

      mockRiskRepository.query.mockResolvedValue([mockRisk]);

      const result = await service.findAll(superadmin as any);

      expect(result).toBeDefined();
      expect(mockRiskRepository.query).toHaveBeenCalledWith(
        expect.not.stringContaining('tenant_id'),
        expect.any(Array),
      );
    });
  });
});