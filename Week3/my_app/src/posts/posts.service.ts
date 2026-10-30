import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { assertValidId } from '../common/validation/assert-valid-id';
import { publicUserSelect } from '../users/users.select';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePostDto) {
    assertValidId(dto.userId);
    try {
      return await this.prisma.post.create({
        data: {
          title: dto.title,
          content: dto.content,
          user: { connect: { id: dto.userId } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.post.findMany({
      orderBy: { id: 'asc' },
      include: { user: { select: publicUserSelect } },
    });
  }

  async findOne(id: number) {
    assertValidId(id);
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { user: { select: publicUserSelect } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findByUser(userId: number) {
    assertValidId(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.post.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async update(id: number, dto: UpdatePostDto) {
    assertValidId(id);
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('Provide at least one field to update');
    }
    try {
      return await this.prisma.post.update({
        where: { id },
        data: { title: dto.title, content: dto.content },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Post not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    assertValidId(id);
    try {
      return await this.prisma.post.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Post not found');
      }
      throw error;
    }
  }
}
