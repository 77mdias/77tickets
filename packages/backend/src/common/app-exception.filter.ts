import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { mapUnknownErrorToAppError, serializeAppError } from '../application/errors';
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

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(body);
      return;
    }

    const appError = mapUnknownErrorToAppError(exception);
    const status = HTTP_STATUS_BY_ERROR_CODE[appError.code] ?? 500;

    response.status(status).json({ error: serializeAppError(appError) });
  }
}
