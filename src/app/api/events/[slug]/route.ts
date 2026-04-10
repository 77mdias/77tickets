import { createGetEventHandler } from "@/server/api/events/get-event.handler";
import { createGetEventRouteAdapter } from "@/server/api/events/public-events.route-adapter";
import { createGetEventDetailUseCase } from "@/server/application/use-cases";
import { getEventRepository, getLotRepository } from "@/server/composition-root";

type GetEventBySlugRouteHandler = (
  request: Request,
  context: { params: Promise<{ slug: string }> },
) => Promise<Response>;

let cachedGetEventBySlugRouteHandler: GetEventBySlugRouteHandler | null = null;

const buildGetEventBySlugRouteHandler = (): GetEventBySlugRouteHandler => {
  const eventRepository = getEventRepository();
  const lotRepository = getLotRepository();

  const handleGetEvent = createGetEventHandler({
    getEventDetail: createGetEventDetailUseCase({
      now: () => new Date(),
      eventRepository,
      lotRepository,
    }),
  });

  return createGetEventRouteAdapter({
    handleGetEvent,
  });
};

const getGetEventBySlugRouteHandler = (): GetEventBySlugRouteHandler => {
  if (!cachedGetEventBySlugRouteHandler) {
    cachedGetEventBySlugRouteHandler = buildGetEventBySlugRouteHandler();
  }

  return cachedGetEventBySlugRouteHandler;
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> => getGetEventBySlugRouteHandler()(request, context);
