import { expect, test } from "vitest";

import { createEventSchema } from "../../../../../src/server/api/schemas";

test("createEventSchema rejects payload with missing required fields", () => {
  const result = createEventSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createEventSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["title"] }),
      expect.objectContaining({ path: ["startsAt"] }),
      expect.objectContaining({ path: ["endsAt"] }),
    ]),
  );
});

test("createEventSchema rejects unknown fields at the boundary", () => {
  const result = createEventSchema.safeParse({
    title: "Festival de Verao 2027",
    description: "Musica ao vivo",
    location: "Sao Paulo",
    startsAt: "2027-01-10T18:00:00.000Z",
    endsAt: "2027-01-10T23:00:00.000Z",
    imageUrl: "https://cdn.example.com/event.png",
    organizerId: "00000000-0000-0000-0000-000000000001",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createEventSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["organizerId"],
      }),
    ]),
  );
});

test("createEventSchema accepts valid payload and parses dates", () => {
  const result = createEventSchema.safeParse({
    title: "  Festival de Verao 2027  ",
    description: "  Musica ao vivo  ",
    location: "  Sao Paulo  ",
    startsAt: "2027-01-10T18:00:00.000Z",
    endsAt: "2027-01-10T23:00:00.000Z",
    imageUrl: "https://cdn.example.com/event.png",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected createEventSchema to accept valid payload");
  }

  expect(result.data).toMatchObject({
    title: "Festival de Verao 2027",
    description: "Musica ao vivo",
    location: "Sao Paulo",
    imageUrl: "https://cdn.example.com/event.png",
  });
  expect(result.data.startsAt).toBeInstanceOf(Date);
  expect(result.data.endsAt).toBeInstanceOf(Date);
});
