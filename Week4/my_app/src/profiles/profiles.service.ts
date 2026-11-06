import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { assertValidId } from '../common/validation/assert-valid-id';
import { publicUserSelect } from '../users/users.select';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, bio?: string | null, avatar?: string | null) {
    assertValidId(userId);
    try {
      return await this.prisma.profile.create({
        data: { user: { connect: { id: userId } }, bio, avatar },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('User already has a profile');
        if (error.code === 'P2025' || error.code === 'P2003') {
          throw new NotFoundException('User not found');
        }
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.profile.findMany({
      orderBy: { id: 'asc' },
      include: { user: { select: publicUserSelect } },
    });
  }

  async findOne(id: number) {
    assertValidId(id);
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { user: { select: publicUserSelect } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async update(id: number, bio?: string | null, avatar?: string | null) {
    assertValidId(id);
    if (bio === undefined && avatar === undefined) {
      throw new BadRequestException('Provide at least one field to update');
    }
    try {
      return await this.prisma.profile.update({
        where: { id },
        data: { bio, avatar },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    assertValidId(id);
    try {
      return await this.prisma.profile.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }
}
