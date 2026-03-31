import { createUpdateLotHandler } from "@/server/api/lots/update-lot.handler";
import { createUpdateLotRouteAdapter } from "@/server/api/lots/lots.route-adapter";
import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createUpdateLotUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/server/repositories/drizzle";

type PutLotRouteHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let cachedPutLotRouteHandler: PutLotRouteHandler | null = null;

const buildPutLotRouteHandler = (): PutLotRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const lotRepository = new DrizzleLotRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateLot = createUpdateLotHandler({
    updateLot: createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    }),
  });

  return createUpdateLotRouteAdapter({
    getSession,
    handleUpdateLot,
  });
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
