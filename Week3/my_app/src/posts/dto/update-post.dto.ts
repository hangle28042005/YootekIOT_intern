import { Transform } from 'class-transformer';
import { IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdatePostDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  title?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  content?: string;
}
