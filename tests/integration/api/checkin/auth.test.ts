import { describe, expect, test, vi } from "vitest";

import { createValidateCheckinHandler } from "../../../../src/server/api/checkin/validate-checkin.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import type { EventRepository } from "../../../../src/server/repositories";
import type { ValidateCheckinUseCase } from "../../../../src/server/application/use-cases";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const TICKET_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

const createEventRepository = (
  organizerId: string | null = ORGANIZER_A,
): Pick<EventRepository, "findById"> => ({
  findById: vi.fn(async () => {
    if (organizerId === null) {
      return null;
    }

    return {
      id: EVENT_ID,
      organizerId,
      slug: "api-checkin-auth",
      title: "API Check-in Auth",
      status: "published",
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: null,
    };
  }),
});

const createValidateCheckinMock = (): ValidateCheckinUseCase =>
  vi.fn(async () => ({
    outcome: "approved",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: "a1083f53-f9c2-4d54-93a4-44eb4146db62",
    validatedAt: "2026-03-29T12:00:00.000Z",
  }));

describe("check-in auth integration", () => {
  test("blocks customer role", async () => {
    const validateCheckin = createValidateCheckinMock();
    const handler = createValidateCheckinHandler({
      validateCheckin,
      eventRepository: createEventRepository(),
    });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: { ticketId: TICKET_ID, eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(validateCheckin).not.toHaveBeenCalled();
  });

  test("blocks organizer outside ownership scope", async () => {
    const validateCheckin = createValidateCheckinMock();
    const handler = createValidateCheckinHandler({
      validateCheckin,
      eventRepository: createEventRepository(ORGANIZER_A),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: { ticketId: TICKET_ID, eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(validateCheckin).not.toHaveBeenCalled();
  });

  test("allows organizer within ownership scope", async () => {
    const validateCheckin = createValidateCheckinMock();
    const handler = createValidateCheckinHandler({
      validateCheckin,
      eventRepository: createEventRepository(ORGANIZER_A),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      body: { ticketId: TICKET_ID, eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(validateCheckin).toHaveBeenCalledWith({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
    });
  });

  test("allows checker globally", async () => {
    const validateCheckin = createValidateCheckinMock();
    const handler = createValidateCheckinHandler({
      validateCheckin,
      eventRepository: createEventRepository(),
    });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: { ticketId: TICKET_ID, eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(validateCheckin).toHaveBeenCalled();
  });

  test("allows admin globally", async () => {
    const validateCheckin = createValidateCheckinMock();
    const handler = createValidateCheckinHandler({
      validateCheckin,
      eventRepository: createEventRepository(),
    });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: { ticketId: TICKET_ID, eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(validateCheckin).toHaveBeenCalled();
  });
});
