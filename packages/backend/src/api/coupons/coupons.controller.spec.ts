import { CouponsController } from './coupons.controller';

const mockCreateCoupon = vi.fn();
const mockUpdateCoupon = vi.fn();

const makeController = () =>
  new CouponsController(mockCreateCoupon as any, mockUpdateCoupon as any);

describe('CouponsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/coupons — calls createCoupon and returns result', async () => {
    const result = {
      couponId: 'coupon-1',
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      code: 'SAVE10',
      discountType: 'percentage',
      discountInCents: null,
      discountPercentage: 10,
      maxRedemptions: 50,
      redemptionCount: 0,
      validFrom: new Date('2025-01-01'),
      validUntil: new Date('2025-12-31'),
    };
    mockCreateCoupon.mockResolvedValue(result);

    const controller = makeController();
    const body = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      code: 'SAVE10',
      discountType: 'percentage',
      discountInCents: null,
      discountPercentage: 10,
      maxRedemptions: 50,
      validFrom: new Date('2025-01-01'),
      validUntil: new Date('2025-12-31'),
    };

    const response = await controller.create(body);

    expect(mockCreateCoupon).toHaveBeenCalledOnce();
    expect(response).toEqual(result);
  });
});
