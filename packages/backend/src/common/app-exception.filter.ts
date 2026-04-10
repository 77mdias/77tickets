import { ExceptionFilter, Catch, ArgumentsHost, HttpException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ZodError } from 'zod';
import { mapUnknownErrorToAppError, serializeAppError, createAuthorizationError, createUnauthenticatedError, createValidationError } from '../application/errors';
import type { AppErrorCode } from '../application/errors';

const HTTP_STATUS_BY_ERROR_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  authorization: 403,
  'not-found': 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof ForbiddenException) {
      const appError = createAuthorizationError('Permissão insuficiente');
      response.status(403).json({ error: serializeAppError(appError) });
      return;
    }

    if (exception instanceof UnauthorizedException) {
      const appError = createUnauthenticatedError('Não autenticado');
      response.status(401).json({ error: serializeAppError(appError) });
      return;
    }

    if (exception instanceof ZodError) {
      const issues = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const appError = createValidationError('Invalid request payload', { details: { issues } });
      response.status(400).json({ error: serializeAppError(appError) });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message = typeof raw === 'string' ? raw : (raw as any)?.message ?? exception.message;
      const code: AppErrorCode =
        status === 401 ? 'unauthenticated' :
        status === 403 ? 'authorization' :
        status === 404 ? 'not-found' :
        status === 409 ? 'conflict' :
        status === 429 ? 'rate_limited' :
        status < 500 ? 'validation' : 'internal';
      response.status(status).json({ error: { code, message } });
      return;
    }

    const appError = mapUnknownErrorToAppError(exception);
    const status = HTTP_STATUS_BY_ERROR_CODE[appError.code] ?? 500;

    response.status(status).json({ error: serializeAppError(appError) });
  }
}
