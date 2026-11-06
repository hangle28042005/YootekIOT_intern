import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { Role } from '../../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get(RolesGuard);
  });

  function context(user?: { id: number; email: string; role: Role }) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows routes without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });

  it('rejects an unauthenticated request on a protected route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.USER]);
    expect(guard.canActivate(context())).toBe(false);
  });

  it('allows USER to access a USER route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.USER, Role.ADMIN]);
    expect(
      guard.canActivate(
        context({ id: 1, email: 'user@example.com', role: Role.USER }),
      ),
    ).toBe(true);
  });

  it('rejects USER from an ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(
      guard.canActivate(
        context({ id: 1, email: 'user@example.com', role: Role.USER }),
      ),
    ).toBe(false);
  });

  it('allows ADMIN to access an ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(
      guard.canActivate(
        context({ id: 2, email: 'admin@example.com', role: Role.ADMIN }),
      ),
    ).toBe(true);
  });
});
