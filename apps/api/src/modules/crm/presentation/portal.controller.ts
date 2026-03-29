import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Req,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

class PortalRegisterDto {
  @IsNotEmpty() @IsString() firstName: string;
  @IsNotEmpty() @IsString() lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @MinLength(8) password: string;
}

class PortalLoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() password: string;
}

class PortalForgotPasswordDto {
  @IsEmail() email: string;
}

class PortalResetPasswordDto {
  @IsNotEmpty() @IsString() token: string;
  @MinLength(8) password: string;
}

interface CustomerMetadata {
  passwordHash?: string;
  resetTokenHash?: string;
  resetTokenExpiry?: string;
  [key: string]: unknown;
}

@ApiTags('Customer Portal')
@Controller('portal')
export class PortalController {
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.jwtSecret = this.config.get<string>('JWT_SECRET', 'loop-platform-jwt-secret-change-in-prod');
  }

  @Post('auth/register')
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: PortalRegisterDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      const meta = this.getMeta(existing.metadata);
      if (meta.passwordHash) {
        throw new ConflictException('An account with this email already exists. Please sign in.');
      }
      // Customer exists without password — attach one to the existing record
      const passwordHash = await bcrypt.hash(dto.password, 12);
      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? existing.phone,
          metadata: { ...meta, passwordHash },
        },
      });
      return {
        token: this.generateToken(existing.id, existing.email ?? ''),
        customer: this.sanitize({ ...existing, firstName: dto.firstName, lastName: dto.lastName }),
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = await this.prisma.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        metadata: { passwordHash },
      },
    });

    return {
      token: this.generateToken(customer.id, customer.email ?? ''),
      customer: this.sanitize(customer),
    };
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer login' })
  async login(@Body() dto: PortalLoginDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { email: dto.email.toLowerCase() },
    });
    const meta = customer ? this.getMeta(customer.metadata) : null;

    if (!customer || !meta?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, meta.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    const lead = await this.prisma.lead.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    });

    return {
      token: this.generateToken(customer.id, customer.email ?? ''),
      customer: {
        ...this.sanitize(customer),
        leadId: lead?.id,
        currentStage: lead?.currentStage ?? 'NEW_LEAD',
        address: lead?.property
          ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state}`
          : undefined,
      },
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile (requires portal token)' })
  async getMe(@Req() req: { headers: { authorization?: string } }) {
    const rawToken = req.headers.authorization?.replace('Bearer ', '');
    if (!rawToken) throw new UnauthorizedException('Not authenticated');

    let payload: { sub: string; type: string };
    try {
      payload = jwt.verify(rawToken, this.jwtSecret) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'portal') throw new UnauthorizedException('Invalid token');

    const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!customer) throw new UnauthorizedException('Customer not found');

    const lead = await this.prisma.lead.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        property: true,
        assignments: { where: { isPrimary: true }, include: { user: true } },
        projectManager: true,
      },
    });

    return {
      ...this.sanitize(customer),
      leadId: lead?.id,
      currentStage: lead?.currentStage ?? 'NEW_LEAD',
      address: lead?.property
        ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state}`
        : undefined,
      salesRep: lead?.assignments?.[0]?.user
        ? `${lead.assignments[0].user.firstName} ${lead.assignments[0].user.lastName}`
        : undefined,
      projectManager: lead?.projectManager
        ? `${lead.projectManager.firstName} ${lead.projectManager.lastName}`
        : undefined,
      systemSize: lead?.systemSize,
    };
  }

  @Post('auth/forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: PortalForgotPasswordDto) {
    const ok = { message: 'If an account exists with that email, a reset link has been sent.' };

    const customer = await this.prisma.customer.findFirst({
      where: { email: dto.email.toLowerCase() },
    });
    const meta = customer ? this.getMeta(customer.metadata) : null;
    if (!customer || !meta?.passwordHash) return ok;

    // Store only SHA-256 hash — plaintext token only travels in the email link, never persisted
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3_600_000).toISOString(); // 1 hour

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: { ...meta, resetTokenHash, resetTokenExpiry } },
    });

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:9000');
    const resetLink = `${webUrl}/portal/reset-password?token=${resetToken}`;

    await this.emailService.send({
      to: customer.email ?? '',
      subject: 'Reset your ecoLoop portal password',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#ffffff;">
          <div style="margin-bottom:24px;"><span style="font-size:20px;font-weight:800;color:#00897B;">ecoLoop</span></div>
          <h2 style="color:#111827;margin:0 0 8px;">Reset your password</h2>
          <p style="color:#6B7280;margin:0 0 24px;">Hi ${customer.firstName}, click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#00897B;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Reset Password</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:32px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
          <p style="color:#9CA3AF;font-size:12px;margin:0;">ecoLoop Solar Energy · Customer Portal</p>
        </div>
      `,
    });

    return ok;
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset customer password using token' })
  async resetPassword(@Body() dto: PortalResetPasswordDto) {
    // Hash incoming token — only hash is stored, preventing plaintext token exposure if DB is breached
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const customer = await this.prisma.customer.findFirst({
      where: { metadata: { path: ['resetTokenHash'], equals: tokenHash } } as Parameters<
        typeof this.prisma.customer.findFirst
      >[0]['where'],
    });

    if (!customer) throw new BadRequestException('Invalid or expired reset link.');

    const meta = this.getMeta(customer.metadata);
    if (!meta.resetTokenExpiry || new Date(meta.resetTokenExpiry) < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { resetTokenHash: _h, resetTokenExpiry: _e, ...cleanMeta } = meta;

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: { ...cleanMeta, passwordHash } },
    });

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private getMeta(raw: unknown): CustomerMetadata {
    return (raw as CustomerMetadata) ?? {};
  }

  private generateToken(customerId: string, email: string): string {
    return jwt.sign(
      { sub: customerId, email, type: 'portal' },
      this.jwtSecret,
      { expiresIn: '30d' },
    );
  }

  private sanitize(customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  }) {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
    };
  }
}
