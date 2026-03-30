import { createPublishEventHandler } from "@/src/server/api/events/publish-event.handler";
import { createPublishEventRouteAdapter } from "@/src/server/api/events/events.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createPublishEventUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/src/server/repositories/drizzle";

type PostPublishRouteHandler = (request: Request) => Promise<Response>;

let cachedPostPublishRouteHandler: PostPublishRouteHandler | null = null;

const buildPostPublishRouteHandler = (): PostPublishRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);

  const handlePublishEvent = createPublishEventHandler({
    eventRepository,
    createPublishEventForOrganizer: (organizerId: string) =>
      createPublishEventUseCase({
        organizerId,
        eventRepository,
        lotRepository,
      }),
  });

  return createPublishEventRouteAdapter({
    getSession,
    handlePublishEvent,
  });
};

const getPostPublishRouteHandler = (): PostPublishRouteHandler => {
  if (!cachedPostPublishRouteHandler) {
    cachedPostPublishRouteHandler = buildPostPublishRouteHandler();
  }

  return cachedPostPublishRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostPublishRouteHandler()(request);
