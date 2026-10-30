import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Lấy token từ Authorization header
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Token is missing');
    }

    const [type, token, extra] = authorization.split(' ');

    if (type !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    try {
      // Kiểm tra chữ ký và thời hạn token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (
        !Number.isSafeInteger(payload.sub) ||
        payload.sub < 1 ||
        typeof payload.email !== 'string'
      ) {
        throw new Error('Invalid payload');
      }

      (req as Request & { user?: JwtPayload }).user = payload;

      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
