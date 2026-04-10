import { createCreateCouponHandler } from "@/server/api/coupons/create-coupon.handler";
import { createCreateCouponRouteAdapter } from "@/server/api/coupons/coupons.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateCouponUseCase } from "@/server/application/use-cases";
import { getCouponRepository, getEventRepository } from "@/server/composition-root";
import { createMutationRateLimiter, withRateLimit } from "@/server/api/middleware";

type PostCreateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCreateCouponRouteHandler: PostCreateCouponRouteHandler | null = null;

const checkMutationRateLimit = createMutationRateLimiter();

const buildPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  const couponRepository = getCouponRepository();
  const eventRepository = getEventRepository();

  const handleCreateCoupon = createCreateCouponHandler({
    eventRepository,
    createCoupon: createCreateCouponUseCase({
      couponRepository,
    }),
  });

  return withRateLimit("post-coupons", 30, checkMutationRateLimit)(
    createCreateCouponRouteAdapter({
      getSession,
      handleCreateCoupon,
    }),
  );
};

const getPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  if (!cachedPostCreateCouponRouteHandler) {
    cachedPostCreateCouponRouteHandler = buildPostCreateCouponRouteHandler();
  }

  return cachedPostCreateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostCreateCouponRouteHandler()(request);
