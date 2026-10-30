import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProfileDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  userId: number;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string | null;
}
