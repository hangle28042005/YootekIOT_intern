import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Thêm user
  @Post()
  create(@Body() user: UserDto) {
    return this.usersService.create(user);
  }

  // 2. Lấy danh sách
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // 3. Tìm theo id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // 4. Cập nhật
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() user: UserDto) {
    return this.usersService.update(id, user);
  }

  // 5. Xóa
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
