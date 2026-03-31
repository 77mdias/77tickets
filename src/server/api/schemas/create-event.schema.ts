import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z
    .union([z.string().trim().min(1).max(maxLength), z.null()])
    .transform((value) => (typeof value === "string" ? value : null));

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: nullableTrimmedString(2000),
    location: nullableTrimmedString(255),
    startsAt: z.coerce.date(),
    endsAt: z.union([z.coerce.date(), z.null()]),
    imageUrl: z
      .union([z.string().trim().url().max(2048), z.null()])
      .transform((value) => (typeof value === "string" ? value : null)),
  })
  .strict();
