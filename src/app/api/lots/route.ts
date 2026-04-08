import { createCreateLotHandler } from "@/server/api/lots/create-lot.handler";
import { createCreateLotRouteAdapter } from "@/server/api/lots/lots.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateLotUseCase } from "@/server/application/use-cases";
import { getEventRepository, getLotRepository } from "@/server/composition-root";
import { createMutationRateLimiter, withRateLimit } from "@/server/api/middleware";

type PostLotsRouteHandler = (request: Request) => Promise<Response>;

let cachedPostLotsRouteHandler: PostLotsRouteHandler | null = null;

const checkMutationRateLimit = createMutationRateLimiter();

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is unavailable");
};

const buildPostLotsRouteHandler = (): PostLotsRouteHandler => {
  const eventRepository = getEventRepository();
  const lotRepository = getLotRepository();

  const handleCreateLot = createCreateLotHandler({
    createLot: createCreateLotUseCase({
      generateLotId: generateUuid,
      eventRepository,
      lotRepository,
    }),
  });

  return withRateLimit("post-lots", 30, checkMutationRateLimit)(
    createCreateLotRouteAdapter({
      getSession,
      handleCreateLot,
    }),
  );
};

const getPostLotsRouteHandler = (): PostLotsRouteHandler => {
  if (!cachedPostLotsRouteHandler) {
    cachedPostLotsRouteHandler = buildPostLotsRouteHandler();
  }

  return cachedPostLotsRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostLotsRouteHandler()(request);
