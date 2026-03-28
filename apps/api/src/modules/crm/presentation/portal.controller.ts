import { Controller, Post, Get, Body, HttpCode, Req } from '@nestjs/common';
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
    // Check if customer with this email already has an account
    const existing = await this.prisma.customer.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      const meta = (existing.metadata as any) ?? {};
      if (meta.passwordHash) {
        return { statusCode: 409, message: 'An account with this email already exists. Please sign in.' };
      }
      // Customer exists but no password — set password on existing customer
      const passwordHash = await bcrypt.hash(dto.password, 12);
      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone || existing.phone,
          metadata: { ...(existing.metadata as any ?? {}), passwordHash },
        },
      });

      const token = this.generateToken(existing.id, existing.email ?? '');
      return {
        token,
        customer: this.sanitize(existing, dto.firstName, dto.lastName),
      };
    }

    // Create new customer
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

    const token = this.generateToken(customer.id, customer.email ?? '');
    return {
      token,
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

    if (!customer) {
      return { statusCode: 401, message: 'Invalid email or password.' };
    }

    const meta = (customer.metadata as any) ?? {};
    if (!meta.passwordHash) {
      return { statusCode: 401, message: 'No account found. Please create an account first.' };
    }

    const valid = await bcrypt.compare(dto.password, meta.passwordHash);
    if (!valid) {
      return { statusCode: 401, message: 'Invalid email or password.' };
    }

    const token = this.generateToken(customer.id, customer.email ?? '');

    // Get lead info for the customer
    const lead = await this.prisma.lead.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    });

    return {
      token,
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
  async getMe(@Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return { statusCode: 401, message: 'Not authenticated' };

    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      if (payload.type !== 'portal') return { statusCode: 401, message: 'Invalid token' };

      const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
      if (!customer) return { statusCode: 404, message: 'Customer not found' };

      const lead = await this.prisma.lead.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        include: { property: true, assignments: { where: { isPrimary: true }, include: { user: true } }, projectManager: true },
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
    } catch {
      return { statusCode: 401, message: 'Invalid or expired token' };
    }
  }

  @Post('auth/forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: PortalForgotPasswordDto) {
    const ok = { message: 'If an account exists with that email, a reset link has been sent.' };

    const customer = await this.prisma.customer.findFirst({
      where: { email: dto.email.toLowerCase() },
    });
    if (!customer) return ok;

    const meta = (customer.metadata as any) ?? {};
    if (!meta.passwordHash) return ok;

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        metadata: { ...meta, resetToken: token, resetTokenExpiry: expiry.toISOString() },
      },
    });

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:9000');
    const resetLink = `${webUrl}/portal/reset-password?token=${token}`;

    await this.emailService.send({
      to: customer.email ?? '',
      subject: 'Reset your ecoLoop portal password',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 800; background: linear-gradient(90deg, #00D4AA, #34D399); -webkit-background-clip: text; color: #00897B;">ecoLoop</span>
          </div>
          <h2 style="color: #111827; margin: 0 0 8px;">Reset your password</h2>
          <p style="color: #6B7280; margin: 0 0 24px;">Hi ${customer.firstName}, click the button below to set a new password for your Customer Portal account. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #00897B; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">Reset Password</a>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">ecoLoop Solar Energy · Customer Portal</p>
        </div>
      `,
    });

    return ok;
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset customer password using token' })
  async resetPassword(@Body() dto: PortalResetPasswordDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { metadata: { path: ['resetToken'], equals: dto.token } } as any,
    });

    if (!customer) return { statusCode: 400, message: 'Invalid or expired reset link.' };

    const meta = (customer.metadata as any) ?? {};
    if (!meta.resetToken || meta.resetToken !== dto.token) {
      return { statusCode: 400, message: 'Invalid or expired reset link.' };
    }
    if (new Date(meta.resetTokenExpiry) < new Date()) {
      return { statusCode: 400, message: 'Reset link has expired. Please request a new one.' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { resetToken: _t, resetTokenExpiry: _e, ...restMeta } = meta;

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: { ...restMeta, passwordHash } },
    });

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private generateToken(customerId: string, email: string): string {
    return jwt.sign(
      { sub: customerId, email, type: 'portal' },
      this.jwtSecret,
      { expiresIn: '30d' },
    );
  }

  private sanitize(customer: any, firstName?: string, lastName?: string) {
    return {
      id: customer.id,
      firstName: firstName ?? customer.firstName,
      lastName: lastName ?? customer.lastName,
      name: `${firstName ?? customer.firstName} ${lastName ?? customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
    };
  }
}
