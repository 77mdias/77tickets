import { createUpdateCouponHandler } from "@/server/api/coupons/update-coupon.handler";
import { createUpdateCouponRouteAdapter } from "@/server/api/coupons/coupons.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createUpdateCouponUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "@/server/repositories/drizzle";

type PostUpdateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateCouponRouteHandler: PostUpdateCouponRouteHandler | null = null;

const buildPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  const db = getDb();
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
