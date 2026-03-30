import { Injectable, Inject, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
  UserRawRecord,
} from '../ports/user.repository.port';
import { validatePasswordPolicy } from '../../../../common/validators/password-policy.validator';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  readonly jwtSecret: string;
  readonly jwtExpiry: string;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
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
      throw new InternalServerErrorException('JWT_SECRET must be configured in production — refusing to start with insecure default');
    }
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findRawByEmail(email.toLowerCase());
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    // Check account lockout
    const meta = (user.metadata as Record<string, unknown>) ?? {};
    const lockedUntil = meta['lockedUntil'] as string | null;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Please try again later.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Increment failed attempts
      const failedAttempts = ((meta['failedAttempts'] as number) || 0) + 1;
      const updatedMeta: Record<string, unknown> = {
        ...meta,
        failedAttempts,
        lockedUntil: failedAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
          : null,
      };
      await this.userRepo.updateRaw(user.id, { metadata: updatedMeta });

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        this.logger.warn(`Account locked after ${failedAttempts} failed attempts: ${email}`);
        throw new UnauthorizedException('Account temporarily locked. Please try again later.');
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful login — reset failed attempts
    if (meta['failedAttempts'] || meta['lockedUntil']) {
      const { failedAttempts: _fa, lockedUntil: _lu, ...cleanMeta } = meta;
      await this.userRepo.updateRaw(user.id, {
        lastLoginAt: new Date(),
        metadata: cleanMeta,
      });
    } else {
      await this.userRepo.updateRaw(user.id, { lastLoginAt: new Date() });
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { sub: string };
      const user = await this.userRepo.findSelectById(payload.sub, {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, isActive: true, profileImage: true,
        lastLoginAt: true, createdAt: true,
      });
      if (!(user as any)?.isActive) return null;
      return user as unknown as AuthenticatedUser;
    } catch {
      return null;
    }
  }

  async refreshToken(userId: string) {
    const user = await this.userRepo.findRawById(userId);
    if (!user?.isActive) throw new UnauthorizedException('User not found');
    return { token: this.generateToken(user) };
  }

  async forgotPassword(email: string) {
    const ok = { message: 'If an account exists with that email, a reset link has been sent.' };

    const user = await this.userRepo.findRawByEmail(email.toLowerCase());
    if (!user?.isActive) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return ok;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiry = new Date(Date.now() + 3_600_000); // 1 hour

    await this.userRepo.updateRaw(user.id, {
      metadata: {
        ...((user.metadata as Record<string, unknown>) ?? {}),
        resetTokenHash,
        resetExpiry: resetExpiry.toISOString(),
      } as Prisma.InputJsonValue,
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
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepo.findFirstByMetadataPath(['resetTokenHash'], tokenHash);

    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const meta = (user.metadata as Record<string, unknown>) ?? {};
    const expiry = meta['resetExpiry'];
    if (!expiry || new Date(expiry as string) < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    validatePasswordPolicy(newPassword);

    const { resetTokenHash: _h, resetExpiry: _e, ...cleanMeta } = meta;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.userRepo.updateRaw(user.id, {
      passwordHash,
      metadata: cleanMeta as Prisma.InputJsonValue,
    });

    this.logger.log(`Password reset completed for ${user.email}`);
    return { message: 'Password reset successfully. You can now log in.' };
  }

  generateToken(user: Pick<UserRawRecord, 'id' | 'email' | 'role'>): string {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry as string & jwt.SignOptions['expiresIn'] },
    );
  }

  sanitizeUser(user: Pick<UserRawRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'role' | 'isActive'>) {
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
