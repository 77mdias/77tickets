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
import type { SessionContext } from "../auth";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

export interface CreateCouponRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateCoupon: (
    request: CreateCouponRequest,
  ) => Promise<CreateCouponHandlerResponse>;
}

export interface UpdateCouponRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleUpdateCoupon: (
    request: UpdateCouponRequest,
  ) => Promise<UpdateCouponHandlerResponse>;
}

export const createCreateCouponRouteAdapter =
  (dependencies: CreateCouponRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
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
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleUpdateCoupon({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
