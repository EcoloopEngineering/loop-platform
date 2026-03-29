import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const extra = Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta, null, 0)}`
      : '';
    return `${timestamp} ${level} ${ctx} ${message}${extra}`;
  }),
);

export function createWinstonLogger() {
  const transports: winston.transport[] = [
    // Console (always active)
    new winston.transports.Console({ format: consoleFormat }),

    // Local file rotation (kept as backup, small retention)
    new (winston.transports.DailyRotateFile as any)({
      dirname: LOG_DIR,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
      format: jsonFormat,
    }),

    new (winston.transports.DailyRotateFile as any)({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      level: 'error',
      format: jsonFormat,
    }),
  ];

  // CloudWatch transport (production)
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION ?? 'us-east-2';

  if (awsAccessKey && awsSecretKey) {
    try {
       
      const WinstonCloudWatch = require('winston-cloudwatch');

      // Combined logs → CloudWatch
      transports.push(
        new WinstonCloudWatch({
          logGroupName: '/loop-platform/api',
          logStreamName: `combined-${new Date().toISOString().split('T')[0]}`,
          awsAccessKeyId: awsAccessKey,
          awsSecretKey: awsSecretKey,
          awsRegion: awsRegion,
          messageFormatter: (log: Record<string, unknown>) => JSON.stringify(log),
          retentionInDays: 30,
          jsonMessage: true,
          level: 'info',
        }),
      );

      // Error logs → separate CloudWatch stream
      transports.push(
        new WinstonCloudWatch({
          logGroupName: '/loop-platform/api',
          logStreamName: `errors-${new Date().toISOString().split('T')[0]}`,
          awsAccessKeyId: awsAccessKey,
          awsSecretKey: awsSecretKey,
          awsRegion: awsRegion,
          messageFormatter: (log: Record<string, unknown>) => JSON.stringify(log),
          retentionInDays: 90,
          jsonMessage: true,
          level: 'error',
        }),
      );

      // Audit logs → separate CloudWatch stream
      transports.push(
        new WinstonCloudWatch({
          logGroupName: '/loop-platform/audit',
          logStreamName: `audit-${new Date().toISOString().split('T')[0]}`,
          awsAccessKeyId: awsAccessKey,
          awsSecretKey: awsSecretKey,
          awsRegion: awsRegion,
          messageFormatter: (log: Record<string, unknown>) => {
            if (log.type === 'audit' || log.type === 'audit_error') {
              return JSON.stringify(log);
            }
            return null; // Skip non-audit logs
          },
          retentionInDays: 365,
          jsonMessage: true,
          level: 'info',
        }),
      );

      console.log('CloudWatch logging enabled');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`CloudWatch logging not available: ${message}`);
    }
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    defaultMeta: { service: 'loop-api', env: process.env.NODE_ENV ?? 'development' },
    transports,
  });
}
