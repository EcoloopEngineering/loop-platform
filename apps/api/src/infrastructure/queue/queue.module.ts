import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueFallbackService } from './queue-fallback.service';
import {
  QUEUE_EMAIL,
  QUEUE_COMMISSION,
  QUEUE_DESIGN,
  QUEUE_AVAILABLE,
} from './queue.constants';

// Re-export constants for backward compatibility
export { QUEUE_EMAIL, QUEUE_COMMISSION, QUEUE_DESIGN, QUEUE_AVAILABLE };

@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static forRoot(): DynamicModule {
    const redisHost = process.env.REDIS_HOST;

    if (!redisHost) {
      QueueModule.logger.warn(
        'REDIS_HOST not set — BullMQ disabled. Jobs will be processed synchronously.',
      );

      return {
        module: QueueModule,
        imports: [ConfigModule],
        providers: [
          { provide: QUEUE_AVAILABLE, useValue: false },
          QueueFallbackService,
          // Provide null queues so @Inject tokens resolve without error
          { provide: `BullQueue_${QUEUE_EMAIL}`, useValue: null },
          { provide: `BullQueue_${QUEUE_COMMISSION}`, useValue: null },
          { provide: `BullQueue_${QUEUE_DESIGN}`, useValue: null },
        ],
        exports: [
          QUEUE_AVAILABLE,
          QueueFallbackService,
          `BullQueue_${QUEUE_EMAIL}`,
          `BullQueue_${QUEUE_COMMISSION}`,
          `BullQueue_${QUEUE_DESIGN}`,
        ],
        global: true,
      };
    }

    QueueModule.logger.log(`BullMQ enabled — connecting to Redis at ${redisHost}`);

    return {
      module: QueueModule,
      imports: [
        ConfigModule,
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
      providers: [
        { provide: QUEUE_AVAILABLE, useValue: true },
        QueueFallbackService,
      ],
      exports: [QUEUE_AVAILABLE, QueueFallbackService, BullModule],
      global: true,
    };
  }
}
