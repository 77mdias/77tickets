import { createUpdateLotHandler } from "@/server/api/lots/update-lot.handler";
import { createUpdateLotRouteAdapter } from "@/server/api/lots/lots.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createUpdateLotUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/server/repositories/drizzle";
import { createMutationRateLimiter, withRateLimit } from "@/server/api/middleware";

type PutLotRouteHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let cachedPutLotRouteHandler: PutLotRouteHandler | null = null;

const checkMutationRateLimit = createMutationRateLimiter();

const buildPutLotRouteHandler = (): PutLotRouteHandler => {
  const db = getDb();
  const lotRepository = new DrizzleLotRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateLot = createUpdateLotHandler({
    updateLot: createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    }),
  });

  return withRateLimit("put-lots", 30, checkMutationRateLimit)(
    createUpdateLotRouteAdapter({
      getSession,
      handleUpdateLot,
    }),
  );
};

const getPutLotRouteHandler = (): PutLotRouteHandler => {
  if (!cachedPutLotRouteHandler) {
    cachedPutLotRouteHandler = buildPutLotRouteHandler();
  }

  return cachedPutLotRouteHandler;
};

export const PUT = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => getPutLotRouteHandler()(request, context);
