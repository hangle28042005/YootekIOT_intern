import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: 'Hang', email: 'hanglethithu28@gmail.com' },
    { id: 2, name: 'Binh', email: 'binh2005@gmail.com' },
  ];
  private nextId = Math.max(0, ...this.users.map((user) => user.id)) + 1;

  // 1 Tạo user
  create(user: UserDto) {
    const newUser = {
      id: this.nextId++,
      name: user.name,
      email: user.email,
    };

    this.users.push(newUser);
    return newUser;
  }

  // 2.  Xem danh sách user
  findAll() {
    return this.users;
  }

  // 3. Tìm user theo id
  findOne(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('ID phai la so nguyen duong hop le');
    }

    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException('Khong tim thay user');
    }

    return user;
  }

  // 4. Cập nhật user
  update(id: number, data: UserDto) {
    const user = this.findOne(id);

    user.name = data.name;
    user.email = data.email;

    return user;
  }

  // 5. Xóa user
  remove(id: number) {
    this.findOne(id);

    this.users = this.users.filter((user) => user.id !== id);

    return { message: 'Da xoa user' };
  }
}
