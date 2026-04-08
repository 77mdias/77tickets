import { createValidateCheckinHandler } from "@/server/api/checkin/validate-checkin.handler";
import { createValidateCheckinRouteAdapter } from "@/server/api/checkin/validate-checkin.route-adapter";
import { checkinRateLimiter } from "@/server/api/middleware";
import { getSession } from "@/server/infrastructure/auth";
import { createValidateCheckinUseCase } from "@/server/application/use-cases";
import { getEventRepository, getOrderRepository, getTicketRepository } from "@/server/composition-root";

type PostCheckinRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCheckinRouteHandler: PostCheckinRouteHandler | null = null;
const checkRateLimit = checkinRateLimiter();

const buildPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  const validateCheckin = createValidateCheckinUseCase({
    now: () => new Date(),
    ticketRepository: getTicketRepository(),
    orderRepository: getOrderRepository(),
  });

  const eventRepository = getEventRepository();

  return createValidateCheckinRouteAdapter({
    getSession,
    handleValidateCheckin: createValidateCheckinHandler({
      validateCheckin,
      eventRepository,
    }),
    checkRateLimit,
    rateLimitMaxRequests: 60,
  });
};

const getPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  if (!cachedPostCheckinRouteHandler) {
    cachedPostCheckinRouteHandler = buildPostCheckinRouteHandler();
  }

  return cachedPostCheckinRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostCheckinRouteHandler()(request);
