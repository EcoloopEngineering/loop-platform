import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditInterceptor } from './infrastructure/logging/audit.interceptor';
import { createWinstonLogger } from './infrastructure/logging/winston.config';
import { initSentry } from './infrastructure/logging/sentry.config';

async function bootstrap() {
  // Initialize Sentry first (captures errors during startup too)
  initSentry();

  const winstonLogger = createWinstonLogger();

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: winstonLogger }),
  });

  app.setGlobalPrefix('api/v1');
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
    defaultVersion: '1',
  });

  // Security
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = [
    'https://loop.ecoloop.app',
    'https://app.ecoloop.us',
    ...(!isProduction ? ['http://localhost:9000', 'http://localhost:9001'] : []),
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version'],
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new AuditInterceptor());

  // Swagger (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Loop Platform API')
      .setDescription('Solar Energy Lead Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Process-level error handlers
  process.on('unhandledRejection', (reason: unknown) => {
    const logger = new Logger('UnhandledRejection');
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error(`Unhandled Rejection: ${message}`, stack);
  });
  process.on('uncaughtException', (error: Error) => {
    const logger = new Logger('UncaughtException');
    logger.error(`Uncaught Exception: ${error.message}`, error.stack);
    process.exit(1);
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Loop API running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
  logger.log(`Logs directory: ${process.cwd()}/logs`);
}
bootstrap();
