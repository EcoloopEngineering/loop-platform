import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { captureError } from '../../infrastructure/logging/sentry.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message ?? 'Internal server error';

    const errorName =
      exception instanceof Error ? exception.constructor.name : 'UnknownError';

    const stack =
      exception instanceof Error ? exception.stack : undefined;

    // Structured error log
    const errorLog = {
      type: 'error',
      statusCode: status,
      errorName,
      message: Array.isArray(message) ? message.join('; ') : message,
      method: request?.method,
      url: request?.url,
      ip: request?.ip,
      userId: (request as any)?.user?.id ?? 'anonymous',
      userAgent: request?.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      // Server errors — log full stack trace + send to Sentry
      this.logger.error({
        ...errorLog,
        stack,
        body: this.sanitize(request?.body),
        query: request?.query,
      });

      // Send to Sentry
      if (exception instanceof Error) {
        captureError(exception, {
          url: request?.url,
          method: request?.method,
          userId: (request as any)?.user?.id,
          body: this.sanitize(request?.body),
        });
      }
    } else if (status >= 400) {
      // Client errors — log without stack (don't send to Sentry)
      this.logger.warn(errorLog);
    }

    // Response to client
    const responseBody: Record<string, any> = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: errorName === 'HttpException' ? this.getHttpErrorName(status) : errorName,
      timestamp: new Date().toISOString(),
      path: request?.url,
    };

    // Don't expose stack traces in production
    if (process.env.NODE_ENV === 'development' && stack) {
      responseBody.stack = stack.split('\n').slice(0, 5);
    }

    response.status(status).json(responseBody);
  }

  private getHttpErrorName(status: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return names[status] ?? 'Error';
  }

  private sanitize(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    const sensitive = ['password', 'token', 'secret', 'creditCard', 'ssn', 'passwordHash'];
    for (const key of Object.keys(sanitized)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
