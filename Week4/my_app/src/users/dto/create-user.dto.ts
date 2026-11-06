import { IsString, MinLength } from 'class-validator';
import { UserDto } from './user.dto';

export class CreateUserDto extends UserDto {
  @IsString()
  @MinLength(8)
  password: string;
}
