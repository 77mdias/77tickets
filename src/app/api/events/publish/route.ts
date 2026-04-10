import { createPublishEventHandler } from "@/server/api/events/publish-event.handler";
import { createPublishEventRouteAdapter } from "@/server/api/events/events.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createPublishEventUseCase } from "@/server/application/use-cases";
import { getEventRepository, getLotRepository } from "@/server/composition-root";

type PostPublishRouteHandler = (request: Request) => Promise<Response>;

let cachedPostPublishRouteHandler: PostPublishRouteHandler | null = null;

const buildPostPublishRouteHandler = (): PostPublishRouteHandler => {
  const eventRepository = getEventRepository();
  const lotRepository = getLotRepository();

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
