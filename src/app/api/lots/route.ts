import { createCreateLotHandler } from "@/server/api/lots/create-lot.handler";
import { createCreateLotRouteAdapter } from "@/server/api/lots/lots.route-adapter";
import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateLotUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/server/repositories/drizzle";

type PostLotsRouteHandler = (request: Request) => Promise<Response>;

let cachedPostLotsRouteHandler: PostLotsRouteHandler | null = null;

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is unavailable");
};

const buildPostLotsRouteHandler = (): PostLotsRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);

  const handleCreateLot = createCreateLotHandler({
    createLot: createCreateLotUseCase({
      generateLotId: generateUuid,
      eventRepository,
      lotRepository,
    }),
  });

  return createCreateLotRouteAdapter({
    getSession,
    handleCreateLot,
  });
};

const getPostLotsRouteHandler = (): PostLotsRouteHandler => {
  if (!cachedPostLotsRouteHandler) {
    cachedPostLotsRouteHandler = buildPostLotsRouteHandler();
  }

  return cachedPostLotsRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostLotsRouteHandler()(request);
