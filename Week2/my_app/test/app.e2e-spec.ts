import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createPrismaMock,
  prismaError,
  userFixture,
} from './helpers/prisma.mock';

describe('Week 2 API (HTTP with mocked Prisma)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;
  const validUser = { name: 'Alice', email: 'alice@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  function expectNoDatabaseCalls() {
    for (const query of Object.values(prisma.user)) {
      expect(query).not.toHaveBeenCalled();
    }
  }

  it('GET /hello returns the required JSON without querying users', async () => {
    await request(app.getHttpServer())
      .get('/hello')
      .expect(200)
      .expect({ message: 'Hello NestJS!' });
    expectNoDatabaseCalls();
  });

  it('serves the full CRUD workflow, including database-generated fields', async () => {
    const api = request(app.getHttpServer());
    const user = userFixture();
    const updated = userFixture({
      name: 'Updated',
      email: 'updated@example.com',
    });
    const jsonUser = { ...user, createdAt: user.createdAt.toISOString() };
    const jsonUpdated = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
    prisma.user.create.mockResolvedValueOnce(user);
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValueOnce(updated);
    prisma.user.delete.mockResolvedValueOnce(updated);

    await api.get('/users').expect(200).expect([]);
    const created = await api
      .post('/users')
      .send(validUser)
      .expect(201)
      .expect(jsonUser);
    const url = `/users/${created.body.id}`;
    await api.get('/users').expect(200).expect([jsonUser]);
    await api.get(url).expect(200).expect(jsonUser);
    await api
      .put(url)
      .send({ name: updated.name, email: updated.email })
      .expect(200)
      .expect(jsonUpdated);
    await api.get(url).expect(200).expect(jsonUpdated);
    await api.delete(url).expect(200).expect({ message: 'Da xoa user' });
    await api.get(url).expect(404);
    await api.get('/users').expect(200).expect([]);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: user.id } });
  });

  it.each(['post', 'put'] as const)(
    '%s trims names and emails before passing them to Prisma',
    async (method) => {
      const user = userFixture();
      prisma.user[
        method === 'post' ? 'create' : 'update'
      ].mockResolvedValueOnce(user);
      const url = method === 'post' ? '/users' : `/users/${user.id}`;
      await request(app.getHttpServer())
        [method](url)
        .send({ name: '  Alice  ', email: '  alice@example.com  ' })
        .expect(method === 'post' ? 201 : 200)
        .expect({ ...user, createdAt: user.createdAt.toISOString() });

      expect(
        prisma.user[method === 'post' ? 'create' : 'update'],
      ).toHaveBeenCalledWith(
        method === 'post'
          ? { data: validUser }
          : { where: { id: user.id }, data: validUser },
      );
    },
  );

  it.each(['get', 'put', 'delete'] as const)(
    '%s returns 404 for a missing user',
    async (method) => {
      if (method === 'get') prisma.user.findUnique.mockResolvedValueOnce(null);
      else
        prisma.user[
          method === 'put' ? 'update' : 'delete'
        ].mockRejectedValueOnce(prismaError('P2025'));

      await request(app.getHttpServer())
        [method]('/users/999')
        .send(validUser)
        .expect(404);
    },
  );

  it.each(['post', 'put'] as const)(
    '%s returns 409 for a duplicate email',
    async (method) => {
      prisma.user[
        method === 'post' ? 'create' : 'update'
      ].mockRejectedValueOnce(prismaError('P2002'));
      const url = method === 'post' ? '/users' : '/users/42';
      const response = await request(app.getHttpServer())
        [method](url)
        .send(validUser)
        .expect(409);

      expect(response.body.message).toBe('Email da ton tai');
    },
  );

  it('returns 500 for unexpected database errors', async () => {
    prisma.user.findMany.mockRejectedValueOnce(
      new Error('Private database details'),
    );
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(500);

    expect(response.body.message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toContain(
      'Private database details',
    );
  });

  describe.each(['get', 'put', 'delete'] as const)(
    '%s URL ID validation',
    (method) => {
      it.each(['abc', '1.5', '0', '-1', '9007199254740992'])(
        'rejects %s before querying Prisma',
        async (id) => {
          await request(app.getHttpServer())
            [method](`/users/${id}`)
            .send(validUser)
            .expect(400);
          expectNoDatabaseCalls();
        },
      );
    },
  );

  describe.each(['post', 'put'] as const)('%s body validation', (method) => {
    const invalidBodies = [
      ['empty object', {}],
      ['missing name', { email: validUser.email }],
      ['missing email', { name: validUser.name }],
      ['blank name', { ...validUser, name: '   ' }],
      ['numeric name', { ...validUser, name: 123 }],
      ['null name', { ...validUser, name: null }],
      ['invalid email', { ...validUser, email: 'invalid-email' }],
      ['numeric email', { ...validUser, email: 123 }],
      ['blank email', { ...validUser, email: '' }],
      ['null email', { ...validUser, email: null }],
      ['client-supplied ID', { ...validUser, id: 999 }],
      ['unknown field', { ...validUser, role: 'admin' }],
      ['array instead of object', []],
    ] as const;

    it.each(invalidBodies)(
      'rejects %s before querying Prisma',
      async (_, body) => {
        await request(app.getHttpServer())
          [method](method === 'post' ? '/users' : '/users/42')
          .send(body)
          .expect(400);
        expectNoDatabaseCalls();
      },
    );
  });
});
