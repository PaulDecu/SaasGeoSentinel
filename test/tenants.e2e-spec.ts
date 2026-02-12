import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('Tenants E2E', () => {
  let app: INestApplication;
  let superadminToken: string;
  let createdTenantId: string;
  let createdOfferId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Login as superadmin
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@platform.local', password: 'Admin123!' });
    
    superadminToken = loginResponse.body.accessToken;

    // Create an offer first
    const offerResponse = await request(app.getHttpServer())
      .post('/api/offers')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Test Offer E2E', maxUsers: 10, price: 49.99 });
    
    createdOfferId = offerResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup
    if (createdTenantId) {
      await request(app.getHttpServer())
        .delete(`/api/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
    }
    if (createdOfferId) {
      await request(app.getHttpServer())
        .delete(`/api/offers/${createdOfferId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
    }

    await getConnection().close();
    await app.close();
  });

  describe('/tenants (POST)', () => {
    it('should create tenant as superadmin', () => {
      return request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          companyName: 'Test Company E2E',
          contactEmail: 'contact@teste2e.com',
          contactPhone: '+33123456789',
          offerId: createdOfferId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('publicId');
          expect(res.body.publicId).toMatch(/^GL-\d{5}$/);
          createdTenantId = res.body.id;
        });
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/tenants')
        .send({
          companyName: 'Test Company',
          contactEmail: 'contact@test.com',
          offerId: createdOfferId,
        })
        .expect(401);
    });

    it('should reject invalid offer', () => {
      return request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          companyName: 'Test Company',
          contactEmail: 'contact@test.com',
          offerId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
    });
  });

  describe('/tenants (GET)', () => {
    it('should list all tenants', () => {
      return request(app.getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/tenants/:id/admins (POST)', () => {
    it('should create admin for tenant', () => {
      return request(app.getHttpServer())
        .post(`/api/tenants/${createdTenantId}/admins`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          email: `admin-${Date.now()}@teste2e.com`,
          password: 'AdminTest123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('email');
          expect(res.body.role).toBe('admin');
          expect(res.body.tenantId).toBe(createdTenantId);
        });
    });
  });
});