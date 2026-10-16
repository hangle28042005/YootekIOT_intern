import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Week 1 API (e2e)', () => {
  let app: INestApplication<App>;
  const validUser = { name: 'Alice', email: 'alice@example.com' };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /hello returns the required JSON', () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200)
      .expect({ message: 'Hello NestJS!' });
  });

  it('creates, lists, reads, updates and deletes a user', async () => {
    const api = request(app.getHttpServer());
    const created = await api.post('/users').send(validUser).expect(201);
    const user = { id: 3, ...validUser };
    expect(created.body).toEqual(user);

    const list = await api.get('/users').expect(200);
    expect(list.body).toContainEqual(user);
    await api.get('/users/3').expect(200).expect(user);

    const updated = { name: 'Updated', email: 'updated@example.com' };
    await api
      .put('/users/3')
      .send(updated)
      .expect(200)
      .expect({ id: 3, ...updated });
    await api
      .get('/users/3')
      .expect(200)
      .expect({ id: 3, ...updated });

    await api.delete('/users/3').expect(200).expect({ message: 'Da xoa user' });
    await api.get('/users/3').expect(404);
    const remaining = await api.get('/users').expect(200);
    expect(remaining.body).toHaveLength(2);
  });

  it('keeps IDs unique when deleting and creating users', async () => {
    const api = request(app.getHttpServer());
    await api.delete('/users/1').expect(200);
    const created = await api.post('/users').send(validUser).expect(201);
    expect(created.body.id).toBe(3);
    const list = await api.get('/users').expect(200);
    expect(list.body.map((user: { id: number }) => user.id)).toEqual([2, 3]);
  });

  it('trims whitespace in names and emails', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: '  Alice  ', email: '  alice@example.com  ' })
      .expect(201)
      .expect({ id: 3, ...validUser });
  });

  it.each(['get', 'put', 'delete'] as const)(
    '%s /users/:id returns 404 for a missing user',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/users/999')
        .send(validUser)
        .expect(404);
    },
  );

  it.each(['abc', '1.5', '0', '-1', '9007199254740992'])(
    'rejects the invalid URL ID %s for reads, updates and deletes',
    async (id) => {
      for (const method of ['get', 'put', 'delete'] as const) {
        await request(app.getHttpServer())
          [method](`/users/${id}`)
          .send(validUser)
          .expect(400);
      }
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
      'rejects %s without changing users',
      async (_, body) => {
        const api = request(app.getHttpServer());
        const before = await api.get('/users').expect(200);

        await api[method](method === 'post' ? '/users' : '/users/1')
          .send(body)
          .expect(400);

        const after = await api.get('/users').expect(200);
        expect(after.body).toEqual(before.body);
      },
    );
  });
});
