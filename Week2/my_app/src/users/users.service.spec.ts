import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createPrismaMock,
  prismaError,
  userFixture,
} from '../../test/helpers/prisma.mock';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const input = { name: 'Alice', email: 'alice@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('returns the created database record and ignores client-supplied fields', async () => {
    const user = userFixture(input);
    prisma.user.create.mockResolvedValueOnce(user);
    const payload = { ...input, id: 999, age: 20 };

    await expect(service.create(payload)).resolves.toEqual(user);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: input });
  });

  it('lists database records ordered by ID', async () => {
    const users = [
      userFixture(),
      userFixture({ id: 43, email: 'bob@example.com' }),
    ];
    prisma.user.findMany.mockResolvedValueOnce(users);

    await expect(service.findAll()).resolves.toEqual(users);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
  });

  it('returns an empty list when the database has no users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('finds a database record by ID', async () => {
    const user = userFixture();
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(service.findOne(user.id)).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
    });
  });

  it('returns 404 when a user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only allowed fields and returns the database record', async () => {
    const updated = userFixture({
      name: 'Updated',
      email: 'updated@example.com',
    });
    const data = { name: updated.name, email: updated.email, id: 999, age: 20 };
    prisma.user.update.mockResolvedValueOnce(updated);

    await expect(service.update(updated.id, data)).resolves.toEqual(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: updated.id },
      data: { name: updated.name, email: updated.email },
    });
  });

  it('deletes the requested user and returns the success message', async () => {
    const user = userFixture();
    prisma.user.delete.mockResolvedValueOnce(user);

    await expect(service.remove(user.id)).resolves.toEqual({
      message: 'Da xoa user',
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: user.id } });
  });

  describe.each(['findOne', 'update', 'remove'] as const)(
    '%s ID validation',
    (method) => {
      it.each([
        0,
        -1,
        1.5,
        NaN,
        Infinity,
        -Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ])('rejects %s before accessing the database', async (id) => {
        await expect(service[method](id, input)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        for (const query of Object.values(prisma.user)) {
          expect(query).not.toHaveBeenCalled();
        }
      });
    },
  );

  it.each(['create', 'update'] as const)(
    '%s translates a duplicate email into 409',
    async (method) => {
      prisma.user[method].mockRejectedValueOnce(prismaError('P2002'));
      const result =
        method === 'create' ? service.create(input) : service.update(42, input);

      await expect(result).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.each(['update', 'remove'] as const)(
    '%s translates a missing record into 404',
    async (method) => {
      prisma.user[
        method === 'remove' ? 'delete' : 'update'
      ].mockRejectedValueOnce(prismaError('P2025'));

      await expect(service[method](999, input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it.each(['create', 'update', 'remove', 'findAll', 'findOne'] as const)(
    '%s preserves unexpected database errors',
    async (method) => {
      const error = new Error('Database unavailable');
      const query = {
        create: 'create',
        update: 'update',
        remove: 'delete',
        findAll: 'findMany',
        findOne: 'findUnique',
      } as const;
      prisma.user[query[method]].mockRejectedValueOnce(error);
      const result =
        method === 'create'
          ? service.create(input)
          : method === 'findAll'
            ? service.findAll()
            : service[method](42, input);

      await expect(result).rejects.toBe(error);
    },
  );

  it('preserves Prisma errors that have no application-specific mapping', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Connection timed out',
      {
        code: 'P2024',
        clientVersion: Prisma.prismaVersion.client,
      },
    );
    prisma.user.create.mockRejectedValueOnce(error);

    await expect(service.create(input)).rejects.toBe(error);
  });
});
