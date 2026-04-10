import { createUpdateCouponHandler } from "@/server/api/coupons/update-coupon.handler";
import { createUpdateCouponRouteAdapter } from "@/server/api/coupons/coupons.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createUpdateCouponUseCase } from "@/server/application/use-cases";
import { getCouponRepository, getEventRepository } from "@/server/composition-root";
import { createMutationRateLimiter, withRateLimit } from "@/server/api/middleware";

type PostUpdateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateCouponRouteHandler: PostUpdateCouponRouteHandler | null = null;

const checkMutationRateLimit = createMutationRateLimiter();

const buildPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  const couponRepository = getCouponRepository();
  const eventRepository = getEventRepository();

  const handleUpdateCoupon = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon: createUpdateCouponUseCase({
      couponRepository,
    }),
  });

  return withRateLimit("post-coupons-update", 30, checkMutationRateLimit)(
    createUpdateCouponRouteAdapter({
      getSession,
      handleUpdateCoupon,
    }),
  );
};

const getPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  if (!cachedPostUpdateCouponRouteHandler) {
    cachedPostUpdateCouponRouteHandler = buildPostUpdateCouponRouteHandler();
  }

  return cachedPostUpdateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateCouponRouteHandler()(request);
