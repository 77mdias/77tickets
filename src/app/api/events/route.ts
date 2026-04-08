import { createCreateEventHandler } from "@/server/api/events/create-event.handler";
import {
  createCreateEventRouteAdapter,
} from "@/server/api/events/events.route-adapter";
import { createListEventsHandler } from "@/server/api/events/list-events.handler";
import { createListEventsRouteAdapter } from "@/server/api/events/public-events.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateEventUseCase, createListPublishedEventsUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import { DrizzleEventRepository } from "@/server/repositories/drizzle";

type GetEventsRouteHandler = (request: Request) => Promise<Response>;
type PostEventsRouteHandler = (request: Request) => Promise<Response>;

let cachedGetEventsRouteHandler: GetEventsRouteHandler | null = null;
let cachedPostEventsRouteHandler: PostEventsRouteHandler | null = null;

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is unavailable");
};

const buildGetEventsRouteHandler = (): GetEventsRouteHandler => {
  const db = getDb();
  const eventRepository = new DrizzleEventRepository(db);

  const handleListEvents = createListEventsHandler({
    listPublishedEvents: createListPublishedEventsUseCase({
      eventRepository,
    }),
  });

  return createListEventsRouteAdapter({
    handleListEvents,
  });
};

const buildPostEventsRouteHandler = (): PostEventsRouteHandler => {
  const db = getDb();
  const eventRepository = new DrizzleEventRepository(db);

  const handleCreateEvent = createCreateEventHandler({
    createEvent: createCreateEventUseCase({
      generateEventId: generateUuid,
      eventRepository,
    }),
  });

  return createCreateEventRouteAdapter({
    getSession,
    handleCreateEvent,
  });
};

const getGetEventsRouteHandler = (): GetEventsRouteHandler => {
  if (!cachedGetEventsRouteHandler) {
    cachedGetEventsRouteHandler = buildGetEventsRouteHandler();
  }

  return cachedGetEventsRouteHandler;
};

const getPostEventsRouteHandler = (): PostEventsRouteHandler => {
  if (!cachedPostEventsRouteHandler) {
    cachedPostEventsRouteHandler = buildPostEventsRouteHandler();
  }

  return cachedPostEventsRouteHandler;
};

export const GET = async (request: Request): Promise<Response> =>
  getGetEventsRouteHandler()(request);

export const POST = async (request: Request): Promise<Response> =>
  getPostEventsRouteHandler()(request);
