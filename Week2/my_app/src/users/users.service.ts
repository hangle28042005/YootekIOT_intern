import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UserDto } from './dto/user.dto';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra ID
  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('ID phai la so nguyen duong hop le');
    }
  }

  // 1. Tạo user
  async create(user: UserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // 2. Xem danh sách user
  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });
  }

  // 3. Tìm user theo ID
  async findOne(id: number) {
    this.validateId(id);

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Khong tim thay user');
    }

    return user;
  }

  // 4. Cập nhật user
  async update(id: number, data: UserDto) {
    this.validateId(id);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // 5. Xóa user
  async remove(id: number) {
    this.validateId(id);

    try {
      await this.prisma.user.delete({
        where: { id },
      });

      return { message: 'Da xoa user' };
    } catch (error) {
      this.handleError(error);
    }
  }

  // Xử lý lỗi Prisma
  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email da ton tai');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Khong tim thay user');
      }
    }

    throw error;
  }
}
