import { LotsController } from './lots.controller';

const mockCreateLot = vi.fn();
const mockUpdateLot = vi.fn();

const makeController = () =>
  new LotsController(mockCreateLot as any, mockUpdateLot as any);

describe('LotsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/lots — returns use-case result', async () => {
    const result = {
      lotId: 'lot-1',
      eventId: 'event-1',
      status: 'active',
      availableQuantity: 100,
    };
    mockCreateLot.mockResolvedValue(result);

    const controller = makeController();
    const body = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'General',
      priceInCents: 5000,
      totalQuantity: 100,
      maxPerOrder: 4,
      saleStartsAt: new Date('2025-01-01'),
      saleEndsAt: null,
    };
    const user = { id: 'organizer-1', role: 'organizer' };

    const response = await controller.create(body, user);

    expect(mockCreateLot).toHaveBeenCalledOnce();
    expect(response).toEqual(result);
  });
});
