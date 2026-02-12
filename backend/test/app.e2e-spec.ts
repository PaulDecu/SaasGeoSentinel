import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Security', () => {
    it('should reject unauthenticated request to /api/me', () => {
      return request(app.getHttpServer())
        .get('/api/me')
        .expect(401);
    });

    it('should return 404 for unknown route', () => {
      return request(app.getHttpServer())
        .get('/api/unknown-route')
        .expect(404);
    });
  });

  describe('Auth endpoints exist', () => {
    it('POST /api/auth/login should exist (validation error expected)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400); // Validation error, not 404
    });

    it('POST /api/auth/forgot-password should exist', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400); // Validation error, not 404
    });
  });
});