import { BadRequestException } from '@nestjs/common';

// Prisma Int maps to PostgreSQL INTEGER (signed 32-bit).
export function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) {
    throw new BadRequestException('ID must be a positive 32-bit integer');
  }
}
