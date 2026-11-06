import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { Role } from '../../generated/prisma/enums.js';

interface AuthenticatedRequest {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API không yêu cầu role thì cho phép đi tiếp
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    // Chưa được xác thực
    if (!user) {
      return false;
    }

    // Kiểm tra vai trò của người dùng
    return requiredRoles.includes(user.role);
  }
}
