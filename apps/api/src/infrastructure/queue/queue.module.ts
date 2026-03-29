import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QUEUE_EMAIL = 'email';
export const QUEUE_COMMISSION = 'commission';
export const QUEUE_DESIGN = 'design';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 86400 }, // 24h
          removeOnFail: { age: 604800 }, // 7d (dead letter retention)
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_COMMISSION },
      { name: QUEUE_DESIGN },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
