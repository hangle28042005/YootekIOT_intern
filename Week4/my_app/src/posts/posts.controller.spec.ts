import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { Role } from '../generated/prisma/enums.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

describe('PostsController', () => {
  it('uses the authenticated user ID when creating a post', async () => {
    const posts = { create: jest.fn().mockResolvedValue({ id: 11 }) };
    const module = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: posts }],
    }).compile();
    const controller = module.get(PostsController);
    const dto = { title: 'JWT ownership', content: 'Created by token owner' };
    const request = {
      user: { id: 42, email: 'user@example.com', role: Role.USER },
    };

    await controller.create(request as never, dto);

    expect(posts.create).toHaveBeenCalledWith(42, dto);
  });
});
