import {
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepositoryPort,
} from '../ports/customer.repository.port';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { PortalAuthService } from './portal-auth.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class PortalPasswordService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly portalAuth: PortalAuthService,
  ) {}

  async forgotPassword(email: string) {
    const ok = { message: 'If an account exists with that email, a reset link has been sent.' };

    const customer = await this.customerRepo.findByEmailRaw(email.toLowerCase());
    const meta = customer ? this.portalAuth.getMeta(customer.metadata) : null;
    if (!customer || !meta?.passwordHash) {
      return ok;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3_600_000).toISOString();

    await this.customerRepo.updateRaw(customer.id, {
      metadata: { ...meta, resetTokenHash, resetTokenExpiry },
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

  async resetPassword(token: string, password: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const customer = await this.customerRepo.findByMetadataPath(['resetTokenHash'], tokenHash);

    if (!customer) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const meta = this.portalAuth.getMeta(customer.metadata);
    if (!meta.resetTokenExpiry || new Date(meta.resetTokenExpiry) < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { resetTokenHash: _h, resetTokenExpiry: _e, ...cleanMeta } = meta;

    await this.customerRepo.updateRaw(customer.id, {
      metadata: { ...cleanMeta, passwordHash },
    });

    return { message: 'Password reset successfully. You can now sign in.' };
  }
}
