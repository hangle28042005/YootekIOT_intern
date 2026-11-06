import { jest } from '@jest/globals';
import {
  Prisma,
  type User,
  type Profile,
  type Post,
} from '../../src/generated/prisma/client.js';

type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
type UserRead = PublicUser & { profile?: Profile | null; posts?: Post[] };
type ProfileRead = Profile & { user?: PublicUser };
type PostRead = Post & { user?: PublicUser };

// Mock database operations only; application controllers/services remain real.
export function createPrismaMock() {
  return {
    user: {
      create: jest.fn<(args: Prisma.UserCreateArgs) => Promise<PublicUser>>(),
      findMany:
        jest.fn<(args: Prisma.UserFindManyArgs) => Promise<UserRead[]>>(),
      findUnique:
        jest.fn<
          (args: Prisma.UserFindUniqueArgs) => Promise<UserRead | null>
        >(),
      update: jest.fn<(args: Prisma.UserUpdateArgs) => Promise<PublicUser>>(),
      delete: jest.fn<(args: Prisma.UserDeleteArgs) => Promise<PublicUser>>(),
    },
    profile: {
      create: jest.fn<(args: Prisma.ProfileCreateArgs) => Promise<Profile>>(),
      findMany:
        jest.fn<(args: Prisma.ProfileFindManyArgs) => Promise<ProfileRead[]>>(),
      findUnique:
        jest.fn<
          (args: Prisma.ProfileFindUniqueArgs) => Promise<ProfileRead | null>
        >(),
      update: jest.fn<(args: Prisma.ProfileUpdateArgs) => Promise<Profile>>(),
      delete: jest.fn<(args: Prisma.ProfileDeleteArgs) => Promise<Profile>>(),
    },
    post: {
      create: jest.fn<(args: Prisma.PostCreateArgs) => Promise<Post>>(),
      findMany:
        jest.fn<(args: Prisma.PostFindManyArgs) => Promise<PostRead[]>>(),
      findUnique:
        jest.fn<
          (args: Prisma.PostFindUniqueArgs) => Promise<PostRead | null>
        >(),
      update: jest.fn<(args: Prisma.PostUpdateArgs) => Promise<Post>>(),
      delete: jest.fn<(args: Prisma.PostDeleteArgs) => Promise<Post>>(),
    },
  };
}

export function userFixture(overrides: Partial<PublicUser> = {}): PublicUser {
  return { id: 42, name: 'Alice', email: 'alice@example.com', ...overrides };
}
export function profileFixture(overrides: Partial<Profile> = {}): Profile {
  return { id: 7, userId: 42, bio: 'IoT intern', avatar: null, ...overrides };
}
export function postFixture(overrides: Partial<Post> = {}): Post {
  return {
    id: 11,
    userId: 42,
    title: 'Week 3',
    content: 'Learning Prisma relations',
    ...overrides,
  };
}
export function prismaError(code: 'P2002' | 'P2003' | 'P2025' | 'P2024') {
  return new Prisma.PrismaClientKnownRequestError('Database request failed', {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}
