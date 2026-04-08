import { createUnauthenticatedError } from "@/server/application/errors";
import { createSendEventReminderEmailUseCase } from "@/server/application/use-cases";
import { mapAppErrorToResponse } from "@/server/api/error-mapper";
import { toApiJsonResponse, withApiSecurityHeaders } from "@/server/api/security-response";
import { createResendEmailProvider } from "@/server/email";
import { getDb } from "@/server/infrastructure/db";
import {
  DrizzleEventRepository,
  DrizzleOrderRepository,
  DrizzleUserRepository,
} from "@/server/repositories/drizzle";

type EventRemindersRouteHandler = (request: Request) => Promise<Response>;

let cachedEventRemindersRouteHandler: EventRemindersRouteHandler | null = null;

const validateCronAuthorization = (request: Request): void => {
  const authorization = request.headers.get("Authorization")?.trim() ?? "";
  const expectedToken = process.env.CRON_SECRET?.trim() ?? "";
  const expectedHeader = expectedToken ? `Bearer ${expectedToken}` : "";

  if (!authorization || !expectedHeader || authorization !== expectedHeader) {
    throw createUnauthenticatedError("Unauthorized", {
      details: {
        reason: "invalid_cron_secret",
      },
    });
  }
};

const buildEventRemindersRouteHandler = (): EventRemindersRouteHandler => {
  const db = getDb();
  const eventRepository = new DrizzleEventRepository(db);

  const sendEventReminderEmail = createSendEventReminderEmailUseCase({
    orderRepository: new DrizzleOrderRepository(db),
    eventRepository,
    userRepository: new DrizzleUserRepository(db),
    emailProvider: createResendEmailProvider(),
  });

  return async (request) => {
    try {
      validateCronAuthorization(request);

      const now = Date.now();
      const windowStart = new Date(now + 23 * 60 * 60 * 1000);
      const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

      const events = await eventRepository.listStartingBetween(windowStart, windowEnd);

      let processed = 0;

      for (const event of events) {
        await sendEventReminderEmail({ eventId: event.id });
        processed += 1;
      }

      return withApiSecurityHeaders(Response.json({ processed }, { status: 200 }));
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toApiJsonResponse(mapped.status, mapped.body);
    }
  };
};

const getEventRemindersRouteHandler = (): EventRemindersRouteHandler => {
  if (cachedEventRemindersRouteHandler === null) {
    cachedEventRemindersRouteHandler = buildEventRemindersRouteHandler();
  }

  return cachedEventRemindersRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getEventRemindersRouteHandler()(request);
