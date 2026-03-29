import { createValidateCheckinHandler } from "@/src/server/api/checkin/validate-checkin.handler";
import {
  createValidateCheckinRouteAdapter,
  getDatabaseUrlOrThrow,
  resolveDemoCheckerId,
} from "@/src/server/api/checkin/validate-checkin.route-adapter";
import { createValidateCheckinUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleEventRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "@/src/server/repositories/drizzle";

type PostCheckinRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCheckinRouteHandler: PostCheckinRouteHandler | null = null;

const buildPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const checkerId = resolveDemoCheckerId(process.env.DEMO_CHECKER_ID);

  const validateCheckin = createValidateCheckinUseCase({
    now: () => new Date(),
    checkerId,
    ticketRepository: new DrizzleTicketRepository(db),
    orderRepository: new DrizzleOrderRepository(db),
  });

  const eventRepository = new DrizzleEventRepository(db);

  return createValidateCheckinRouteAdapter({
    checkerId,
    handleValidateCheckin: createValidateCheckinHandler({
      validateCheckin,
      eventRepository,
    }),
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
