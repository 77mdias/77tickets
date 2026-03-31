import { createValidateCheckinHandler } from "@/server/api/checkin/validate-checkin.handler";
import {
  createValidateCheckinRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/server/api/checkin/validate-checkin.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createValidateCheckinUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import {
  DrizzleEventRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "@/server/repositories/drizzle";

type PostCheckinRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCheckinRouteHandler: PostCheckinRouteHandler | null = null;

const buildPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());

  const validateCheckin = createValidateCheckinUseCase({
    now: () => new Date(),
    ticketRepository: new DrizzleTicketRepository(db),
    orderRepository: new DrizzleOrderRepository(db),
  });

  const eventRepository = new DrizzleEventRepository(db);

  return createValidateCheckinRouteAdapter({
    getSession,
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
