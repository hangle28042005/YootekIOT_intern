import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { assertValidId } from '../common/validation/assert-valid-id';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { publicUserSelect } from './users.select';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, password },
        select: publicUserSelect,
      });
    } catch (error) {
      // The unique constraint also protects against concurrent requests.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: { ...publicUserSelect, profile: true, posts: true },
    });
  }

  async findOne(id: number) {
    assertValidId(id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...publicUserSelect, profile: true, posts: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    assertValidId(id);
    if (
      dto.name === undefined &&
      dto.email === undefined &&
      dto.password === undefined
    ) {
      throw new BadRequestException('Provide at least one field to update');
    }
    const data: Prisma.UserUpdateInput = { name: dto.name, email: dto.email };
    if (dto.password !== undefined)
      data.password = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Email already exists');
        if (error.code === 'P2025')
          throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async remove(id: number) {
    assertValidId(id);
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
          throw new NotFoundException('User not found');
        // Existing foreign keys use ON DELETE RESTRICT.
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Delete the user profile and posts before deleting the user',
          );
        }
      }
      throw error;
    }
  }
}
