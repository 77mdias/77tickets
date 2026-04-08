import { createUpdateEventRouteAdapter } from "@/server/api/events/events.route-adapter";
import { createUpdateEventHandler } from "@/server/api/events/update-event.handler";
import { getSession } from "@/server/infrastructure/auth";
import { createUpdateEventStatusUseCase } from "@/server/application/use-cases";
import { getEventRepository } from "@/server/composition-root";

type PostUpdateStatusRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateStatusRouteHandler: PostUpdateStatusRouteHandler | null = null;

const buildPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  const eventRepository = getEventRepository();

  const handleUpdateEvent = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer: () =>
      createUpdateEventStatusUseCase({
        eventRepository,
      }),
  });

  return createUpdateEventRouteAdapter({
    getSession,
    handleUpdateEvent,
  });
};

const getPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  if (!cachedPostUpdateStatusRouteHandler) {
    cachedPostUpdateStatusRouteHandler = buildPostUpdateStatusRouteHandler();
  }

  return cachedPostUpdateStatusRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateStatusRouteHandler()(request);
