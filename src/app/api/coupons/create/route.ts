import { createCreateCouponHandler } from "@/server/api/coupons/create-coupon.handler";
import { createCreateCouponRouteAdapter } from "@/server/api/coupons/coupons.route-adapter";
import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateCouponUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "@/server/repositories/drizzle";

type PostCreateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCreateCouponRouteHandler: PostCreateCouponRouteHandler | null = null;

const buildPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const couponRepository = new DrizzleCouponRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleCreateCoupon = createCreateCouponHandler({
    eventRepository,
    createCoupon: createCreateCouponUseCase({
      couponRepository,
    }),
  });

  return createCreateCouponRouteAdapter({
    getSession,
    handleCreateCoupon,
  });
};

const getPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  if (!cachedPostCreateCouponRouteHandler) {
    cachedPostCreateCouponRouteHandler = buildPostCreateCouponRouteHandler();
  }

  return cachedPostCreateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostCreateCouponRouteHandler()(request);
