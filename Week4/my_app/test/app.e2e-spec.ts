import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createPrismaMock, postFixture } from './helpers/prisma.mock.js';

describe('Week 4 authentication and role authorization', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication();
    app.useLogger(false);
    jwt = module.get(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function token(id: number, email: string, expiresIn = 3600) {
    return jwt.signAsync({ sub: id, email }, { expiresIn });
  }

  function authenticate(role: Role, id = 42) {
    prisma.user.findUnique.mockResolvedValueOnce({
      id,
      name: role === Role.ADMIN ? 'Admin' : 'User',
      email: `${role.toLowerCase()}@example.com`,
      role,
    } as never);
  }

  it('returns 401 when the JWT is missing', async () => {
    await request(app.getHttpServer()).get('/posts').expect(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when the JWT is expired', async () => {
    const expired = await token(42, 'user@example.com', -1);
    await request(app.getHttpServer())
      .get('/posts')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('creates a post for the authenticated user', async () => {
    authenticate(Role.USER, 42);
    prisma.post.create.mockResolvedValueOnce(postFixture());
    const userToken = await token(42, 'user@example.com');

    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'JWT owner', content: 'Secure ownership' })
      .expect(201);

    expect(prisma.post.create.mock.calls[0][0].data.user).toEqual({
      connect: { id: 42 },
    });
  });

  it('rejects a client-supplied userId when creating a post', async () => {
    authenticate(Role.USER, 42);
    const userToken = await token(42, 'user@example.com');

    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Spoofed', content: 'Invalid owner', userId: 99 })
      .expect(400);

    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it.each(['patch', 'delete'] as const)(
    'returns 403 when USER calls %s on a post',
    async (method) => {
      authenticate(Role.USER);
      const userToken = await token(42, 'user@example.com');
      const operation = request(app.getHttpServer())
        [method]('/posts/11')
        .set('Authorization', `Bearer ${userToken}`);

      if (method === 'patch') operation.send({ title: 'Forbidden update' });
      await operation.expect(403);
      expect(prisma.post.update).not.toHaveBeenCalled();
      expect(prisma.post.delete).not.toHaveBeenCalled();
    },
  );

  it('allows ADMIN to update a post', async () => {
    authenticate(Role.ADMIN, 1);
    prisma.post.update.mockResolvedValueOnce(
      postFixture({ title: 'Admin update' }),
    );
    const adminToken = await token(1, 'admin@example.com');

    await request(app.getHttpServer())
      .patch('/posts/11')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin update' })
      .expect(200);
  });

  it('allows ADMIN to delete a post', async () => {
    authenticate(Role.ADMIN, 1);
    prisma.post.delete.mockResolvedValueOnce(postFixture());
    const adminToken = await token(1, 'admin@example.com');

    await request(app.getHttpServer())
      .delete('/posts/11')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
