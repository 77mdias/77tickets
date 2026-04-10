import { EventsController } from './events.controller';

describe('EventsController', () => {
  const mockListPublishedEvents = vi.fn().mockResolvedValue({ events: [], nextCursor: null });
  const mockGetEventDetail = vi.fn();
  const mockCreateEvent = vi.fn();
  const mockPublishEventFactory = vi.fn(() => vi.fn());
  const mockUpdateEventStatus = vi.fn();
  const mockListEventOrders = vi.fn();
  const mockGetEventAnalytics = vi.fn();

  let controller: EventsController;

  beforeEach(() => {
    mockListPublishedEvents.mockClear();
    controller = new EventsController(
      mockListPublishedEvents,
      mockGetEventDetail,
      mockCreateEvent,
      mockPublishEventFactory,
      mockUpdateEventStatus,
      mockListEventOrders,
      mockGetEventAnalytics,
    );
  });

  it('GET /api/events returns 200 with event list', async () => {
    const result = await controller.list({});
    expect(result).toEqual({ events: [], nextCursor: null });
    expect(mockListPublishedEvents).toHaveBeenCalledOnce();
  });
});
