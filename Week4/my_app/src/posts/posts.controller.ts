import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { Role } from '../generated/prisma/enums.js';

import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: Role;
  };
}

@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // USER và ADMIN được tạo bài viết
  @Post()
  @Roles(Role.USER, Role.ADMIN)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    return this.posts.create(request.user.id, dto);
  }

  // USER và ADMIN được xem tất cả bài viết
  @Get()
  @Roles(Role.USER, Role.ADMIN)
  findAll() {
    return this.posts.findAll();
  }

  // USER và ADMIN được xem bài viết theo userId
  @Get('user/:userId')
  @Roles(Role.USER, Role.ADMIN)
  findByUser(@Param('userId', ParseIntPipe) id: number) {
    return this.posts.findByUser(id);
  }

  // USER và ADMIN được xem chi tiết bài viết
  @Get(':id')
  @Roles(Role.USER, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);
  }

  // Chỉ ADMIN được cập nhật bài viết
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, dto);
  }

  // Chỉ ADMIN được xóa bài viết
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.posts.remove(id);
  }
}
