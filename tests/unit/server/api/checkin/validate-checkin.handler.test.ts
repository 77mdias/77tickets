import { expect, test, vi } from "vitest";

import { createValidateCheckinHandler } from "../../../../../src/server/api/checkin/validate-checkin.handler";
import type { ValidateCheckinUseCase } from "../../../../../src/server/application/use-cases";

const CHECKER_ACTOR = {
  role: "checker" as const,
  userId: "a1083f53-f9c2-4d54-93a4-44eb4146db62",
};

const VALID_BODY = {
  ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
  eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
};

test("createValidateCheckinHandler returns 400 validation error for invalid payload", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async () => ({
      outcome: "approved",
      ticketId: VALID_BODY.ticketId,
      eventId: VALID_BODY.eventId,
      checkerId: CHECKER_ACTOR.userId,
      validatedAt: "2026-03-29T12:00:00.000Z",
    }),
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: {
      ticketId: "invalid-uuid",
      eventId: VALID_BODY.eventId,
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(validateCheckin).not.toHaveBeenCalled();
});

test("createValidateCheckinHandler returns 200 with check-in data when use-case approves", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async (input) => ({
      outcome: "approved",
      ticketId: input.ticketId,
      eventId: input.eventId,
      checkerId: CHECKER_ACTOR.userId,
      validatedAt: "2026-03-29T12:00:00.000Z",
    }),
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: VALID_BODY,
  });

  expect(validateCheckin).toHaveBeenCalledWith(VALID_BODY);
  expect(response.status).toBe(200);

  if (response.status !== 200) {
    return;
  }

  expect(response.body.data).toEqual({
    outcome: "approved",
    ticketId: VALID_BODY.ticketId,
    eventId: VALID_BODY.eventId,
    checkerId: CHECKER_ACTOR.userId,
    validatedAt: "2026-03-29T12:00:00.000Z",
  });
});

test("createValidateCheckinHandler maps ticket_not_found to 404 not-found", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async (input) => ({
      outcome: "rejected",
      reason: "ticket_not_found",
      ticketId: input.ticketId,
      eventId: input.eventId,
      checkerId: CHECKER_ACTOR.userId,
      validatedAt: "2026-03-29T12:00:00.000Z",
    }),
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: VALID_BODY,
  });

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("not-found");
  expect(response.body.error.details).toEqual({ reason: "ticket_not_found" });
});

test("createValidateCheckinHandler maps unauthorized_checker to 403 authorization", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async (input) => ({
      outcome: "rejected",
      reason: "unauthorized_checker",
      ticketId: input.ticketId,
      eventId: input.eventId,
      checkerId: CHECKER_ACTOR.userId,
      validatedAt: "2026-03-29T12:00:00.000Z",
    }),
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: VALID_BODY,
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
  expect(response.body.error.details).toEqual({ reason: "unauthorized_checker" });
});

test("createValidateCheckinHandler maps operational rejections to 409 conflict", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async (input) => ({
      outcome: "rejected",
      reason: "ticket_used",
      ticketId: input.ticketId,
      eventId: input.eventId,
      checkerId: CHECKER_ACTOR.userId,
      validatedAt: "2026-03-29T12:00:00.000Z",
    }),
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: VALID_BODY,
  });

  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("conflict");
  expect(response.body.error.details).toEqual({ reason: "ticket_used" });
});

test("createValidateCheckinHandler maps unexpected failures to 500 internal", async () => {
  const validateCheckin = vi.fn<Parameters<ValidateCheckinUseCase>, ReturnType<ValidateCheckinUseCase>>(
    async () => {
      throw new Error("unexpected failure");
    },
  );

  const handler = createValidateCheckinHandler({ validateCheckin });

  const response = await handler({
    actor: CHECKER_ACTOR,
    body: VALID_BODY,
  });

  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe("internal");
  expect(response.body.error.message).toBe("Internal server error");
});
