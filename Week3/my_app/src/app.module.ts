import {
  Module,
  ValidationPipe,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';

import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { UsersModule } from './users/users.module.js';
import { UsersController } from './users/users.controller.js';

import { PrismaModule } from './prisma/prisma.module.js';

import { ProfilesModule } from './profiles/profiles.module.js';
import { ProfilesController } from './profiles/profiles.controller.js';

import { PostsModule } from './posts/posts.module.js';
import { PostsController } from './posts/posts.controller.js';

import { AuthModule } from './auth/auth.module.js';
import { AuthMiddleware } from './auth/middleware/auth.middleware.js';

import { LoggerMiddleware } from './common/middleware/logger.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    ProfilesModule,
    PostsModule,
    AuthModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    AuthMiddleware,

    // Validation dữ liệu toàn ứng dụng
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');

    consumer
      .apply(AuthMiddleware)
      .forRoutes(UsersController, ProfilesController, PostsController);
  }
}
