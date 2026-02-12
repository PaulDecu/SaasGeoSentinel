import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('Users E2E', () => {
  let app: INestApplication;
  let superadminToken: string;
  let createdUserId: string;

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

  describe('/users (POST)', () => {
    it('should create user', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          email: `user-${Date.now()}@teste2e.com`,
          password: 'UserTest123!',
          role: 'gestionnaire',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          createdUserId = res.body.id;
        });
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@teste2e.com`;
      
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ email, password: 'Test123!', role: 'utilisateur' });

      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ email, password: 'Test123!', role: 'utilisateur' })
        .expect(409);
    });
  });

  describe('/users (GET)', () => {
    it('should list users', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user', () => {
      return request(app.getHttpServer())
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
    });
  });

  describe('/users/bulk-delete (POST)', () => {
    it('should bulk delete users', async () => {
      const user1 = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ email: `bulk1-${Date.now()}@teste2e.com`, password: 'Test123!', role: 'utilisateur' });

      const user2 = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ email: `bulk2-${Date.now()}@teste2e.com`, password: 'Test123!', role: 'utilisateur' });

      return request(app.getHttpServer())
        .post('/api/users/bulk-delete')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ userIds: [user1.body.id, user2.body.id] })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toHaveLength(2);
          expect(res.body.errors).toHaveLength(0);
        });
    });
  });
});