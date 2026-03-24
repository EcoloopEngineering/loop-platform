import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.get<string>('JWT_SECRET', 'loop-platform-jwt-secret-change-in-prod');
    this.jwtExpiry = this.config.get<string>('JWT_EXPIRY', '7d');
  }

  async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
    inviteCode?: string;
  }) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email: params.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    // Hash password
    const passwordHash = await bcrypt.hash(params.password, 12);

    // Determine role
    const isEmployee = params.email.toLowerCase().endsWith('@ecoloop.us');
    const role = isEmployee ? (params.role || 'SALES_REP') : 'SALES_REP';

    // Create user (firebaseUid is optional, set a placeholder for JWT-only users)
    const user = await this.prisma.user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        role: role as any,
        isActive: true,
        firebaseUid: `jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      },
    });

    // Handle referral invite
    if (params.inviteCode && !isEmployee) {
      try {
        // Find the inviter by invitation code
        const inviter = await this.prisma.user.findUnique({
          where: { invitationCode: params.inviteCode },
        });

        if (inviter) {
          await this.prisma.referral.create({
            data: {
              inviterId: inviter.id,
              inviteeId: user.id,
              hierarchyPath: `${inviter.id}/${user.id}`,
              hierarchyLevel: 1,
              status: 'ACCEPTED',
            },
          });
          this.logger.log(`Referral linked: ${inviter.id} -> ${user.id}`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to create referral: ${e.message}`);
      }
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) return null;
      return user;
    } catch {
      return null;
    }
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');
    return { token: this.generateToken(user) };
  }

  private generateToken(user: any): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry as any },
    );
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
