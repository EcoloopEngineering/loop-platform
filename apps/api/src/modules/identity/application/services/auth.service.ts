import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
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

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return { message: 'If an account exists with that email, a reset link has been sent.' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store token in user metadata
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...(user.metadata as any ?? {}),
          resetToken: await bcrypt.hash(resetToken, 10),
          resetExpiry: resetExpiry.toISOString(),
        },
      },
    });

    // Send email
    const resetUrl = `${this.config.get('APP_URL', 'http://localhost:9000')}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await this.emailService.send({
      to: email,
      subject: 'Reset your ecoLoop password',
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset for your ecoLoop account.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #00897B; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <br>
        <p style="color: #6B7280; font-size: 12px;">— ecoLoop Solar Energy</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${email}`);
    return { message: 'If an account exists with that email, a reset link has been sent.' };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    // Find users with reset tokens (check all users — token is hashed)
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });

    let matchedUser: any = null;
    for (const user of users) {
      const meta = user.metadata as any;
      if (!meta?.resetToken || !meta?.resetExpiry) continue;

      // Check expiry
      if (new Date(meta.resetExpiry) < new Date()) continue;

      // Check token
      const valid = await bcrypt.compare(token, meta.resetToken);
      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Update password and clear reset token
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const meta = (matchedUser.metadata as any) ?? {};
    delete meta.resetToken;
    delete meta.resetExpiry;

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: { passwordHash, metadata: meta },
    });

    this.logger.log(`Password reset completed for ${matchedUser.email}`);
    return { message: 'Password reset successfully. You can now log in.' };
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
