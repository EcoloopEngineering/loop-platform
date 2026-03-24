import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const url = req.url;
    const userId = req.user?.id ?? 'anonymous';
    const userEmail = req.user?.email ?? 'unknown';
    const ip = req.ip || req.connection?.remoteAddress;
    const startTime = Date.now();

    // Sanitize body (remove sensitive fields)
    const body = this.sanitizeBody({ ...req.body });

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        this.logger.log({
          message: `${method} ${url}`,
          type: 'audit',
          action: this.getAction(method),
          method,
          url,
          userId,
          userEmail,
          ip,
          duration: `${duration}ms`,
          statusCode: 200,
          requestBody: body,
          responseId: response?.id ?? response?.data?.[0]?.id ?? undefined,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error({
          message: `${method} ${url} FAILED`,
          type: 'audit_error',
          action: this.getAction(method),
          method,
          url,
          userId,
          userEmail,
          ip,
          duration: `${duration}ms`,
          statusCode: error.status ?? 500,
          error: error.message,
          requestBody: body,
        });
        return throwError(() => error);
      }),
    );
  }

  private getAction(method: string): string {
    switch (method) {
      case 'POST': return 'CREATE';
      case 'PUT': return 'UPDATE';
      case 'PATCH': return 'PARTIAL_UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method;
    }
  }

  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'ssn'];
    for (const key of Object.keys(body)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        body[key] = '[REDACTED]';
      }
    }
    return body;
  }
}
