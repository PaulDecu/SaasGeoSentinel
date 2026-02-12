import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('Risks E2E', () => {
  let app: INestApplication;
  let superadminToken: string;
  let createdRiskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@platform.local', password: 'Admin123!' });
    
    superadminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await getConnection().close();
    await app.close();
  });

  describe('/risks (POST)', () => {
    it('should create risk with geolocation', () => {
      return request(app.getHttpServer())
        .post('/api/risks')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: 'Test Risk E2E',
          description: 'Test description',
          category: 'naturel',
          severity: 'modéré',
          latitude: 48.8566,
          longitude: 2.3522,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('latitude');
          expect(res.body).toHaveProperty('longitude');
          expect(res.body.latitude).toBe(48.8566);
          expect(res.body.longitude).toBe(2.3522);
          createdRiskId = res.body.id;
        });
    });

    it('should reject invalid coordinates', () => {
      return request(app.getHttpServer())
        .post('/api/risks')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: 'Invalid Risk',
          category: 'naturel',
          severity: 'faible',
          latitude: 200, // Invalid
          longitude: 300, // Invalid
        })
        .expect(400);
    });
  });

  describe('/risks (GET)', () => {
    it('should list risks', () => {
      return request(app.getHttpServer())
        .get('/api/risks')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/risks/:id (PUT)', () => {
    it('should update risk', () => {
      return request(app.getHttpServer())
        .put(`/api/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: 'Updated Risk E2E',
          severity: 'élevé',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Risk E2E');
          expect(res.body.severity).toBe('élevé');
        });
    });
  });

  describe('/risks/nearby (GET)', () => {
    it('should find nearby risks', () => {
      return request(app.getHttpServer())
        .get('/api/risks/nearby')
        .query({ lat: 48.8566, lng: 2.3522, radius_km: 10 })
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('distance');
          }
        });
    });

    it('should respect radius limit', () => {
      return request(app.getHttpServer())
        .get('/api/risks/nearby')
        .query({ lat: 48.8566, lng: 2.3522, radius_km: 150 })
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(400);
    });
  });

  describe('/risks/:id (DELETE)', () => {
    it('should delete risk', () => {
      return request(app.getHttpServer())
        .delete(`/api/risks/${createdRiskId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
    });
  });
});