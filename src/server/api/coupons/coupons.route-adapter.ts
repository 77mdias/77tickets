import { z } from "zod";

import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  CreateCouponHandlerResponse,
  CreateCouponRequest,
} from "./create-coupon.handler";
import type {
  UpdateCouponHandlerResponse,
  UpdateCouponRequest,
} from "./update-coupon.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import { parseInput } from "../validation";

const actorSchema: z.ZodType<SecurityActor> = z
  .object({
    userId: z.uuid(),
    role: z.enum(["organizer", "admin"]),
  })
  .strict();

const toJsonResponse = (status: number, payload: { error: AppErrorPayload } | { data: unknown }) =>
  Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

const readActorFromHeaders = (headers: Headers): SecurityActor => {
  return parseInput(actorSchema, {
    userId: headers.get("x-actor-id"),
    role: headers.get("x-actor-role"),
  });
};

export interface CreateCouponRouteAdapterDependencies {
  handleCreateCoupon: (
    request: CreateCouponRequest,
  ) => Promise<CreateCouponHandlerResponse>;
}

export interface UpdateCouponRouteAdapterDependencies {
  handleUpdateCoupon: (
    request: UpdateCouponRequest,
  ) => Promise<UpdateCouponHandlerResponse>;
}

export const createCreateCouponRouteAdapter =
  (dependencies: CreateCouponRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const actor = readActorFromHeaders(request.headers);
      const body = await readRequestBody(request);
      const response = await dependencies.handleCreateCoupon({ actor, body });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createUpdateCouponRouteAdapter =
  (dependencies: UpdateCouponRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const actor = readActorFromHeaders(request.headers);
      const body = await readRequestBody(request);
      const response = await dependencies.handleUpdateCoupon({ actor, body });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
