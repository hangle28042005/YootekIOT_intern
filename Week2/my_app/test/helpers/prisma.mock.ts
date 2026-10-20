import { jest } from '@jest/globals';
import { Prisma, type User } from '../../src/generated/prisma/client.js';

type UserData = Pick<User, 'name' | 'email'>;
type WhereUser = { where: { id: number } };

// Only the Prisma operations used by UsersService are mocked. No DB connection
// or Prisma lifecycle hooks are supplied to Nest's dependency injection.
export function createPrismaMock() {
  return {
    user: {
      create: jest.fn<(args: { data: UserData }) => Promise<User>>(),
      findMany:
        jest.fn<(args: { orderBy: { id: 'asc' } }) => Promise<User[]>>(),
      findUnique: jest.fn<(args: WhereUser) => Promise<User | null>>(),
      update:
        jest.fn<(args: WhereUser & { data: UserData }) => Promise<User>>(),
      delete: jest.fn<(args: WhereUser) => Promise<User>>(),
    },
  };
}

export function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: 42,
    name: 'Alice',
    email: 'alice@example.com',
    age: null,
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
    ...overrides,
  };
}

export function prismaError(code: 'P2002' | 'P2025') {
  return new Prisma.PrismaClientKnownRequestError('Database request failed', {
    code,
    clientVersion: Prisma.prismaVersion.client,
    meta: code === 'P2002' ? { target: ['email'] } : undefined,
  });
}
