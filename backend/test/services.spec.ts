// ===== TENANTS SERVICE TEST =====
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { AuditService } from '../audit/audit.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepository: any;
  let offerRepository: any;

  const mockOffer = {
    id: 'offer-1',
    name: 'Starter',
    maxUsers: 5,
    price: 29.99,
    endOfSale: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Offer),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
    offerRepository = module.get(getRepositoryToken(Offer));
  });

  describe('create', () => {
    it('should create a tenant successfully', async () => {
      offerRepository.findOne.mockResolvedValue(mockOffer);
      tenantRepository.create.mockReturnValue({
        companyName: 'Test Corp',
        contactEmail: 'test@corp.com',
      });
      tenantRepository.save.mockResolvedValue({
        id: 'tenant-1',
        publicId: 'GL-00001',
        companyName: 'Test Corp',
        contactEmail: 'test@corp.com',
      });

      const result = await service.create(
        {
          companyName: 'Test Corp',
          contactEmail: 'test@corp.com',
          offerId: 'offer-1',
        },
        'creator-id',
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('publicId');
      expect(tenantRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkUserLimit', () => {
    it('should throw error when user limit reached', async () => {
      tenantRepository.findOne.mockResolvedValue({
        id: 'tenant-1',
        offer: { maxUsers: 5 },
      });

      const userRepository = module.get(getRepositoryToken(User));
      userRepository.count.mockResolvedValue(5);

      await expect(service.checkUserLimit('tenant-1')).rejects.toThrow();
    });
  });
});

// ===== RISKS SERVICE TEST =====
import { RisksService } from './risks.service';
import { Risk } from './entities/risk.entity';
import { UserRole } from '../users/entities/user-role.enum';

describe('RisksService', () => {
  let service: RisksService;
  let riskRepository: any;

  const mockUser = {
    id: 'user-1',
    role: UserRole.ADMIN,
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        {
          provide: getRepositoryToken(Risk),
          useValue: {
            query: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RisksService>(RisksService);
    riskRepository = module.get(getRepositoryToken(Risk));
  });

  describe('create', () => {
    it('should create a risk with PostGIS location', async () => {
      riskRepository.query.mockResolvedValue([{ id: 'risk-1' }]);
      riskRepository.query.mockResolvedValueOnce([{ id: 'risk-1' }]);
      riskRepository.query.mockResolvedValueOnce([
        {
          id: 'risk-1',
          title: 'Test Risk',
          latitude: 48.8566,
          longitude: 2.3522,
        },
      ]);

      const result = await service.create(
        {
          title: 'Test Risk',
          description: 'Test description',
          category: 'naturel' as any,
          severity: 'élevé' as any,
          latitude: 48.8566,
          longitude: 2.3522,
        },
        mockUser as any,
      );

      expect(result).toHaveProperty('id');
      expect(riskRepository.query).toHaveBeenCalled();
    });
  });

  describe('findNearby', () => {
    it('should find risks within radius', async () => {
      const mockRisks = [
        {
          id: 'risk-1',
          title: 'Risk 1',
          latitude: 48.8566,
          longitude: 2.3522,
          distance: 1000,
        },
      ];

      riskRepository.query.mockResolvedValue(mockRisks);

      const result = await service.findNearby(
        {
          lat: 48.8566,
          lng: 2.3522,
          radius_km: 10,
          limit: 200,
        },
        mockUser as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('distance');
    });
  });
});
