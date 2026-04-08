import { createPublishEventHandler } from "@/server/api/events/publish-event.handler";
import { createPublishEventRouteAdapter } from "@/server/api/events/events.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createPublishEventUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/server/repositories/drizzle";

type PostPublishRouteHandler = (request: Request) => Promise<Response>;

let cachedPostPublishRouteHandler: PostPublishRouteHandler | null = null;

const buildPostPublishRouteHandler = (): PostPublishRouteHandler => {
  const db = getDb();
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
