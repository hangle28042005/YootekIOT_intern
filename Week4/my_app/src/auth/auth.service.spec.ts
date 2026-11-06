import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
    };
  };
  let jwtService: { signAsync: ReturnType<typeof jest.fn> };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
    };
    jwtService = { signAsync: jest.fn() };
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('hashes password and excludes it from the register response', async () => {
    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };
    const user = { id: 1, name: dto.name, email: dto.email };
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(user);

    await expect(service.register(dto)).resolves.toEqual({
      message: 'Register successful',
      user,
    });
    const createArgs = prisma.user.create.mock.calls[0][0] as {
      data: { password: string };
      select: Record<string, boolean>;
    };
    expect(await bcrypt.compare(dto.password, createArgs.data.password)).toBe(
      true,
    );
    expect(createArgs.select).not.toHaveProperty('password');
  });

  it('rejects registration when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(
      service.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns a signed JWT for valid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash('secret123', 10),
    });
    jwtService.signAsync.mockResolvedValueOnce('signed-token');
    await expect(
      service.login({
        email: 'alice@example.com',
        password: 'secret123',
      }),
    ).resolves.toEqual({
      message: 'Login successful',
      access_token: 'signed-token',
      token_type: 'Bearer',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'alice@example.com',
    });
  });

  it('rejects login when the password is incorrect', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash('correct-password', 10),
    });
    await expect(
      service.login({
        email: 'alice@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
