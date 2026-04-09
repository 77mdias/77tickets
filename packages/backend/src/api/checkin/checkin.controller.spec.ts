import { CheckinController } from './checkin.controller';

const mockValidateCheckin = vi.fn();

const makeController = () => new CheckinController(mockValidateCheckin as any);

describe('CheckinController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/checkin — calls validateCheckin with correct input', async () => {
    const result = {
      outcome: 'approved',
      ticketId: 'ticket-1',
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      checkerId: 'checker-1',
      validatedAt: new Date().toISOString(),
    };
    mockValidateCheckin.mockResolvedValue(result);

    const controller = makeController();
    const body = {
      ticketId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440000',
    };
    const user = { id: 'checker-1' };

    const response = await controller.checkin(body, user);

    expect(mockValidateCheckin).toHaveBeenCalledWith({
      ticketId: body.ticketId,
      eventId: body.eventId,
      checkerId: 'checker-1',
    });
    expect(response).toEqual(result);
  });
});
