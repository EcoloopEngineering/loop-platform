import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface WebhookEventRecord {
  id: string;
  provider: string;
  externalId: string;
  eventType: string;
  payload: unknown;
  status: string;
  errorMessage: string | null;
  attempts: number;
  processedAt: Date | null;
  createdAt: Date;
}

/**
 * Persists webhook events for idempotency, auditability, and retry.
 *
 * Flow:
 * 1. `recordEvent()` — save the raw event before processing
 * 2. `markProcessed()` — mark as PROCESSED after successful handling
 * 3. `markFailed()` — mark as FAILED with error message if handling fails
 * 4. `findFailedEvents()` — retrieve failed events for retry
 * 5. `isAlreadyProcessed()` — check if event was already processed (idempotency)
 */
@Injectable()
export class WebhookEventService {
  private readonly logger = new Logger(WebhookEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a new webhook event. Returns the existing record if already persisted.
   */
  async recordEvent(data: {
    provider: string;
    externalId: string;
    eventType: string;
    payload: unknown;
  }): Promise<WebhookEventRecord> {
    return this.prisma.webhookEvent.upsert({
      where: {
        provider_externalId: {
          provider: data.provider,
          externalId: data.externalId,
        },
      },
      update: {},  // no-op if already exists
      create: {
        provider: data.provider,
        externalId: data.externalId,
        eventType: data.eventType,
        payload: data.payload as any,
        status: 'PENDING',
        attempts: 0,
      },
    }) as unknown as WebhookEventRecord;
  }

  /**
   * Check if an event has already been successfully processed.
   */
  async isAlreadyProcessed(provider: string, externalId: string): Promise<boolean> {
    const event = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_externalId: { provider, externalId },
      },
      select: { status: true },
    });
    return event?.status === 'PROCESSED';
  }

  /**
   * Mark an event as successfully processed.
   */
  async markProcessed(id: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Mark an event as failed with an error message.
   */
  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage,
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Retrieve failed events for retry, ordered oldest first.
   * @param provider - Optional filter by provider (e.g. "stripe")
   * @param maxAttempts - Only return events with fewer than this many attempts (default 5)
   * @param limit - Maximum number of events to return (default 50)
   */
  async findFailedEvents(
    provider?: string,
    maxAttempts = 5,
    limit = 50,
  ): Promise<WebhookEventRecord[]> {
    const where: Record<string, unknown> = {
      status: 'FAILED',
      attempts: { lt: maxAttempts },
    };
    if (provider) where.provider = provider;

    return this.prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    }) as unknown as WebhookEventRecord[];
  }
}
