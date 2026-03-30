import { createUpdateCouponHandler } from "@/src/server/api/coupons/update-coupon.handler";
import { createUpdateCouponRouteAdapter } from "@/src/server/api/coupons/coupons.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/infrastructure/auth";
import { createUpdateCouponUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "@/src/server/repositories/drizzle";

type PostUpdateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateCouponRouteHandler: PostUpdateCouponRouteHandler | null = null;

const buildPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const couponRepository = new DrizzleCouponRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateCoupon = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon: createUpdateCouponUseCase({
      couponRepository,
    }),
  });

  return createUpdateCouponRouteAdapter({
    getSession,
    handleUpdateCoupon,
  });
};

const getPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  if (!cachedPostUpdateCouponRouteHandler) {
    cachedPostUpdateCouponRouteHandler = buildPostUpdateCouponRouteHandler();
  }

  return cachedPostUpdateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateCouponRouteHandler()(request);
