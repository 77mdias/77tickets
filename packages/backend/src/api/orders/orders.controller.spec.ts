import { OrdersController } from './orders.controller';

const mockCreateOrder = vi.fn();
const mockGetCustomerOrders = vi.fn();
const mockSimulatePayment = vi.fn();
const mockCreateStripeCheckoutSession = vi.fn();

const makeController = () =>
  new OrdersController(
    mockCreateOrder as any,
    mockGetCustomerOrders as any,
    mockSimulatePayment as any,
    mockCreateStripeCheckoutSession as any,
  );

describe('OrdersController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/orders/mine — returns orders list from use-case', async () => {
    mockGetCustomerOrders.mockResolvedValue({ orders: [] });

    const controller = makeController();
    const user = { id: 'customer-1' };

    const response = await controller.mine(user);

    expect(mockGetCustomerOrders).toHaveBeenCalledWith({ customerId: 'customer-1' });
    expect(response).toEqual({ orders: [] });
  });
});
