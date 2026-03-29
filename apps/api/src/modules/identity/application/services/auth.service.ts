import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  passwordHash: string | null;
  metadata: unknown;
}

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

    if (this.jwtSecret === 'loop-platform-jwt-secret-change-in-prod') {
      this.logger.warn('JWT_SECRET is using the default insecure value — set it in .env for production');
    }

    const env = this.config.get<string>('NODE_ENV', 'development');
    if (this.jwtSecret === 'loop-platform-jwt-secret-change-in-prod' && env === 'production') {
      throw new Error('JWT_SECRET must be configured in production — refusing to start with insecure default');
    }
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
    const existing = await this.prisma.user.findUnique({ where: { email: params.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(params.password, 12);
    const isEmployee = params.email.toLowerCase().endsWith('@ecoloop.us');
    const role: UserRole = isEmployee ? ((params.role as UserRole) || UserRole.SALES_REP) : UserRole.SALES_REP;

    const user = await this.prisma.user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        role,
        isActive: true,
        firebaseUid: `jwt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      },
    });

    if (params.inviteCode && !isEmployee) {
      try {
        const inviter = await this.prisma.user.findUnique({ where: { invitationCode: params.inviteCode } });
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
      } catch (e: unknown) {
        this.logger.warn(`Failed to create referral: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      user: this.sanitizeUser(user as unknown as UserRecord),
      token: this.generateToken(user as unknown as UserRecord),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      user: this.sanitizeUser(user as unknown as UserRecord),
      token: this.generateToken(user as unknown as UserRecord),
    };
  }

  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { sub: string };
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, role: true, isActive: true, profileImage: true,
          lastLoginAt: true, createdAt: true,
        },
      });
      if (!user?.isActive) return null;
      return user as unknown as AuthenticatedUser;
    } catch {
      return null;
    }
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException('User not found');
    return { token: this.generateToken(user as unknown as UserRecord) };
  }

  async forgotPassword(email: string) {
    const ok = { message: 'If an account exists with that email, a reset link has been sent.' };

    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.isActive) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return ok;
    }

    // Token stored as SHA-256 hash — plaintext only travels in the email link, never persisted
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiry = new Date(Date.now() + 3_600_000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...((user.metadata as Record<string, unknown>) ?? {}),
          resetTokenHash,
          resetExpiry: resetExpiry.toISOString(),
        },
      },
    });

    const resetUrl = `${this.config.get('APP_URL', 'http://localhost:9000')}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await this.emailService.send({
      to: email,
      subject: 'Reset your ecoLoop password',
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset for your ecoLoop account.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#00897B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <br>
        <p style="color:#6B7280;font-size:12px;">— ecoLoop Solar Energy</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${email}`);
    return ok;
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    // Hash the incoming token before lookup — DB only stores the SHA-256 hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        metadata: { path: ['resetTokenHash'], equals: tokenHash },
      } as Parameters<typeof this.prisma.user.findFirst>[0]['where'],
    });

    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const meta = (user.metadata as Record<string, unknown>) ?? {};
    const expiry = meta['resetExpiry'];
    if (!expiry || new Date(expiry as string) < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const { resetTokenHash: _h, resetExpiry: _e, ...cleanMeta } = meta;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, metadata: cleanMeta },
    });

    this.logger.log(`Password reset completed for ${user.email}`);
    return { message: 'Password reset successfully. You can now log in.' };
  }

  private generateToken(user: UserRecord): string {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry },
    );
  }

  private sanitizeUser(user: UserRecord) {
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
