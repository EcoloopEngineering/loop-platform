import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';

const logger = new Logger('Sentry');

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: `loop-api@${process.env.APP_VERSION ?? '1.0.0'}`,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Only send errors in production/staging
    beforeSend(event) {
      // Don't send in test
      if (process.env.NODE_ENV === 'test') return null;
      return event;
    },

    // Scrub sensitive data
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        const sensitive = ['password', 'token', 'secret', 'authorization'];
        for (const key of Object.keys(breadcrumb.data)) {
          if (sensitive.some((s) => key.toLowerCase().includes(s))) {
            breadcrumb.data[key] = '[REDACTED]';
          }
        }
      }
      return breadcrumb;
    },

    integrations: [
      Sentry.httpIntegration(),
    ],

    // Ignore common non-errors
    ignoreErrors: [
      'ECONNRESET',
      'EPIPE',
      'ECONNREFUSED',
      'ThrottlerException',
    ],
  });

  logger.log('Sentry error tracking initialized');
}

/**
 * Capture an exception in Sentry with extra context
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email: string; role: string }) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser({ id: user.id, email: user.email, role: user.role } as any);
}
