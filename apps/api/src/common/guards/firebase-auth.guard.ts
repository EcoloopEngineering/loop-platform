import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Never expose passwordHash, metadata with reset tokens, etc.
const SAFE_USER_SELECT = {
  id: true, firebaseUid: true, email: true, firstName: true, lastName: true,
  phone: true, role: true, isActive: true, profileImage: true, nickname: true,
  invitationCode: true, language: true, termsAcceptedAt: true, lastLoginAt: true,
  createdAt: true, updatedAt: true,
};
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'loop-platform-jwt-secret-change-in-prod');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // Dev bypass: ONLY when NODE_ENV=development AND no token AND Firebase is not configured
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (
      nodeEnv === 'development' &&
      !token &&
      !this.firebaseService.isConfigured()
    ) {
      const devUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        select: SAFE_USER_SELECT,
      });
      if (devUser) {
        request.user = devUser;
        return true;
      }
      // No users in DB — allow with mock user (SALES_REP, never ADMIN)
      request.user = { id: 0, name: 'Dev User', email: 'dev@localhost', role: 'SALES_REP' };
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // 1. Try JWT verification first (our own tokens)
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      if (payload?.sub) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: SAFE_USER_SELECT,
        });
        if (user && user.isActive) {
          request.user = user;
          return true;
        }
      }
    } catch {
      // JWT verification failed — fall through to Firebase
    }

    // 2. Try Firebase verification
    try {
      const decoded = await this.firebaseService.verifyIdToken(token);
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: SAFE_USER_SELECT,
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
    }

    // 3. Dev bypass with token that fails both JWT and Firebase
    if (nodeEnv === 'development') {
      const devUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        select: SAFE_USER_SELECT,
      });
      if (devUser) {
        request.user = devUser;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid token');
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
