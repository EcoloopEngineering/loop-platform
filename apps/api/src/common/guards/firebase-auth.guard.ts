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

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // Dev bypass: ONLY when NODE_ENV=development AND Firebase is not configured
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (
      nodeEnv === 'development' &&
      !token &&
      !this.firebaseService.isConfigured()
    ) {
      const devUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
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

    try {
      const decoded = await this.firebaseService.verifyIdToken(token);
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
