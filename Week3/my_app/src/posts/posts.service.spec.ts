import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  prismaError,
  postFixture,
  userFixture,
} from '../../test/helpers/prisma.mock';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const input = {
    userId: 42,
    title: 'Week 3',
    content: 'Learning Prisma relations',
  };
  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [PostsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PostsService);
  });

  it('allows multiple posts to connect to the same user', async () => {
    prisma.post.create
      .mockResolvedValueOnce(postFixture())
      .mockResolvedValueOnce(postFixture({ id: 12 }));
    const first = await service.create(input);
    const second = await service.create(input);
    expect(first.userId).toBe(second.userId);
    expect(first.id).not.toBe(second.id);
    expect(prisma.post.create.mock.calls[0][0].data.user).toEqual({
      connect: { id: 42 },
    });
  });

  it.each(['P2025', 'P2003'] as const)(
    'maps %s when connecting to a missing user to 404',
    async (code) => {
      prisma.post.create.mockRejectedValueOnce(prismaError(code));
      await expect(service.create(input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('returns 404 for a missing post', async () => {
    prisma.post.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reads posts with public user information', async () => {
    const post = { ...postFixture(), user: userFixture() };
    prisma.post.findUnique.mockResolvedValueOnce(post);
    prisma.post.findMany.mockResolvedValueOnce([post]);
    await expect(service.findOne(11)).resolves.toEqual(post);
    await expect(service.findAll()).resolves.toEqual([post]);
    expect(prisma.post.findMany.mock.calls[0][0].include?.user).toEqual({
      select: { id: true, name: true, email: true },
    });
  });

  it('returns an empty list for an existing user with no posts', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(userFixture());
    prisma.post.findMany.mockResolvedValueOnce([]);
    await expect(service.findByUser(42)).resolves.toEqual([]);
    expect(prisma.post.findMany.mock.calls[0][0].where).toEqual({ userId: 42 });
  });

  it('returns 404 when listing posts for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findByUser(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('updates content without changing ownership or ID', async () => {
    prisma.post.update.mockResolvedValueOnce(
      postFixture({ content: 'Updated' }),
    );
    await service.update(11, { content: 'Updated', userId: 99, id: 99 } as {
      content: string;
    });
    expect(prisma.post.update.mock.calls[0][0].data).toEqual({
      content: 'Updated',
      title: undefined,
    });
  });

  it('rejects empty patches', async () => {
    await expect(service.update(11, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it.each(['update', 'remove'] as const)(
    '%s returns 404 for missing records',
    async (method) => {
      prisma.post[
        method === 'update' ? 'update' : 'delete'
      ].mockRejectedValueOnce(prismaError('P2025'));
      await expect(
        service[method](11, { title: 'Updated' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('preserves unexpected errors', async () => {
    const error = new Error('Database unavailable');
    prisma.post.create.mockRejectedValueOnce(error);
    await expect(service.create(input)).rejects.toBe(error);
  });
});
