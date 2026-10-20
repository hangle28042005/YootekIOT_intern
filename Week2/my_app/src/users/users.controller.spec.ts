import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserDto } from './dto/user.dto';
import type { User } from '../generated/prisma/client.js';
import { userFixture } from '../../test/helpers/prisma.mock';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let module: TestingModule;
  let controller: UsersController;
  let service: {
    create: ReturnType<typeof jest.fn<(data: UserDto) => Promise<User>>>;
    findAll: ReturnType<typeof jest.fn<() => Promise<User[]>>>;
    findOne: ReturnType<typeof jest.fn<(id: number) => Promise<User>>>;
    update: ReturnType<
      typeof jest.fn<(id: number, data: UserDto) => Promise<User>>
    >;
    remove: ReturnType<
      typeof jest.fn<(id: number) => Promise<{ message: string }>>
    >;
  };
  const input = { name: 'Alice', email: 'alice@example.com' };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();
    controller = module.get(UsersController);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('returns the user created by the service', async () => {
    const user = userFixture(input);
    service.create.mockResolvedValueOnce(user);
    await expect(controller.create(input)).resolves.toEqual(user);
    expect(service.create).toHaveBeenCalledWith(input);
  });

  it('returns the users listed by the service', async () => {
    const users = [userFixture()];
    service.findAll.mockResolvedValueOnce(users);
    await expect(controller.findAll()).resolves.toEqual(users);
  });

  it('passes the requested ID to the service', async () => {
    const user = userFixture();
    service.findOne.mockResolvedValueOnce(user);
    await expect(controller.findOne(user.id)).resolves.toEqual(user);
    expect(service.findOne).toHaveBeenCalledWith(user.id);
  });

  it('passes the requested ID and update body to the service', async () => {
    const user = userFixture(input);
    service.update.mockResolvedValueOnce(user);
    await expect(controller.update(user.id, input)).resolves.toEqual(user);
    expect(service.update).toHaveBeenCalledWith(user.id, input);
  });

  it('returns the deletion result from the service', async () => {
    const result = { message: 'Da xoa user' };
    service.remove.mockResolvedValueOnce(result);
    await expect(controller.remove(42)).resolves.toEqual(result);
    expect(service.remove).toHaveBeenCalledWith(42);
  });

  it('preserves service exceptions so Nest can return the correct HTTP status', async () => {
    const error = new NotFoundException('Khong tim thay user');
    service.findOne.mockRejectedValueOnce(error);
    await expect(controller.findOne(999)).rejects.toBe(error);
  });
});
