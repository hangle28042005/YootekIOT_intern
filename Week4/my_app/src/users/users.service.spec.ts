import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  prismaError,
  userFixture,
  profileFixture,
  postFixture,
} from '../../test/helpers/prisma.mock';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const input = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'secret123',
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('hashes the password and only selects public fields when creating a user', async () => {
    prisma.user.create.mockResolvedValueOnce(userFixture());
    const result = await service.create({ ...input, id: 999 } as typeof input);
    const args = prisma.user.create.mock.calls[0][0];
    expect(await bcrypt.compare(input.password, args.data.password)).toBe(true);
    expect(args.data.password).not.toBe(input.password);
    expect(args.data).not.toHaveProperty('id');
    expect(args.select).toEqual({ id: true, name: true, email: true });
    expect(result).not.toHaveProperty('password');
  });

  it('returns the user with profile and posts without selecting password', async () => {
    const user = {
      ...userFixture(),
      profile: profileFixture(),
      posts: [postFixture()],
    };
    prisma.user.findUnique.mockResolvedValueOnce(user);
    await expect(service.findOne(42)).resolves.toEqual(user);
    expect(prisma.user.findUnique.mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
      email: true,
      profile: true,
      posts: true,
    });
  });

  it('returns 404 for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists users with their relations', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(prisma.user.findMany.mock.calls[0][0].select).toMatchObject({
      profile: true,
      posts: true,
    });
  });

  it('hashes a replacement password and updates the email', async () => {
    prisma.user.update.mockResolvedValueOnce(
      userFixture({ email: 'new@example.com' }),
    );
    await service.update(42, {
      email: 'new@example.com',
      password: 'new-secret123',
    });
    const args = prisma.user.update.mock.calls[0][0];
    expect(args.data.email).toBe('new@example.com');
    expect(typeof args.data.password).toBe('string');
    expect(
      await bcrypt.compare('new-secret123', args.data.password as string),
    ).toBe(true);
    expect(args.select).not.toHaveProperty('password');
  });

  it('leaves password untouched when updating only the name and ignores extra fields', async () => {
    prisma.user.update.mockResolvedValueOnce(userFixture({ name: 'Bob' }));
    await service.update(42, { name: 'Bob', id: 999 } as { name: string });
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('id');
    expect(data.name).toBe('Bob');
  });

  it.each(['create', 'update'] as const)(
    '%s translates unique violations into 409',
    async (method) => {
      prisma.user[method].mockRejectedValueOnce(prismaError('P2002'));
      const result =
        method === 'create'
          ? service.create(input)
          : service.update(42, { email: input.email });
      await expect(result).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.each(['update', 'remove'] as const)(
    '%s maps missing records to 404 without a prior read',
    async (method) => {
      prisma.user[
        method === 'update' ? 'update' : 'delete'
      ].mockRejectedValueOnce(prismaError('P2025'));
      await expect(service[method](42, { name: 'Bob' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );

  it('returns 409 when deletion is blocked by related records', async () => {
    prisma.user.delete.mockRejectedValueOnce(prismaError('P2003'));
    await expect(service.remove(42)).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes a user without returning password', async () => {
    prisma.user.delete.mockResolvedValueOnce(userFixture());
    await expect(service.remove(42)).resolves.toEqual(userFixture());
    expect(prisma.user.delete.mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
      email: true,
    });
  });

  it('rejects an empty patch before accessing the database', async () => {
    await expect(service.update(42, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
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
        2_147_483_648,
        Number.MAX_SAFE_INTEGER + 1,
      ])('rejects %s before querying', async (id) => {
        await expect(
          service[method](id, { name: 'Bob' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        for (const query of Object.values(prisma.user))
          expect(query).not.toHaveBeenCalled();
      });
    },
  );

  it('preserves unrelated database errors', async () => {
    const error = prismaError('P2024');
    prisma.user.update.mockRejectedValueOnce(error);
    await expect(service.update(42, { name: 'Bob' })).rejects.toBe(error);
  });
});
