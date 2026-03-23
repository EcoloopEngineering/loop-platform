import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('NODEMAILER_USER');
    const pass = this.config.get<string>('NODEMAILER_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log('Email service configured');
    } else {
      this.logger.warn('Email service not configured — NODEMAILER_USER/PASS missing');
    }
  }

  async send(params: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email not sent — transporter not configured');
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: params.from ?? `"ecoLoop" <${this.config.get('NODEMAILER_USER')}>`,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}
