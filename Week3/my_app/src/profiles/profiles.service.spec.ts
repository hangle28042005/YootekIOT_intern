import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaMock,
  prismaError,
  profileFixture,
  userFixture,
} from '../../test/helpers/prisma.mock';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: ReturnType<typeof createPrismaMock>;
  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProfilesService);
  });

  it('connects a profile to its user', async () => {
    prisma.profile.create.mockResolvedValueOnce(profileFixture());
    await expect(service.create(42, 'IoT intern')).resolves.toEqual(
      profileFixture(),
    );
    expect(prisma.profile.create.mock.calls[0][0].data.user).toEqual({
      connect: { id: 42 },
    });
  });

  it('maps the unique constraint to 409 even for concurrent creation', async () => {
    prisma.profile.create.mockRejectedValueOnce(prismaError('P2002'));
    await expect(service.create(42)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['P2025', 'P2003'] as const)(
    'maps %s during creation to missing user',
    async (code) => {
      prisma.profile.create.mockRejectedValueOnce(prismaError(code));
      await expect(service.create(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('returns 404 when the profile does not exist', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reads related users with a public projection', async () => {
    const profile = { ...profileFixture(), user: userFixture() };
    prisma.profile.findUnique.mockResolvedValueOnce(profile);
    prisma.profile.findMany.mockResolvedValueOnce([profile]);
    await expect(service.findOne(7)).resolves.toEqual(profile);
    await expect(service.findAll()).resolves.toEqual([profile]);
    for (const args of [
      prisma.profile.findUnique.mock.calls[0][0],
      prisma.profile.findMany.mock.calls[0][0],
    ]) {
      expect(args.include?.user).toEqual({
        select: { id: true, name: true, email: true },
      });
    }
  });

  it('allows null to clear nullable profile fields', async () => {
    prisma.profile.update.mockResolvedValueOnce(profileFixture({ bio: null }));
    await expect(service.update(7, null)).resolves.toHaveProperty('bio', null);
    expect(prisma.profile.update.mock.calls[0][0].data).toEqual({
      bio: null,
      avatar: undefined,
    });
  });

  it('rejects empty updates', async () => {
    await expect(service.update(7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it.each(['update', 'remove'] as const)(
    '%s maps missing records to 404',
    async (method) => {
      prisma.profile[
        method === 'update' ? 'update' : 'delete'
      ].mockRejectedValueOnce(prismaError('P2025'));
      await expect(service[method](7, 'Updated')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it('preserves unexpected failures', async () => {
    const error = new Error('Database unavailable');
    prisma.profile.create.mockRejectedValueOnce(error);
    await expect(service.create(42)).rejects.toBe(error);
  });
});
