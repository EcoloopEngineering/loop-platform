import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../email/email.service';
import { QUEUE_EMAIL } from '../queue.module';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
}

@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, html } = job.data;
    this.logger.log(`Processing email job ${job.id} → ${to}`);

    const sent = await this.emailService.send({ to, subject, html });
    if (!sent) {
      throw new Error(`Email delivery failed for job ${job.id} → ${to}`);
    }

    this.logger.log(`Email job ${job.id} completed`);
  }
}
