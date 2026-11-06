import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });

    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();

      const result = await this.$queryRaw<
        { database_name: string }[]
      >`SELECT current_database() AS database_name`;

      console.log('✅ Kết nối PostgreSQL thành công!');
      console.log('✅ Database:', result[0].database_name);
    } catch (error) {
      console.error('❌ Kết nối PostgreSQL thất bại:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
