import { z } from "zod";

export const createLotSchema = z
  .object({
    eventId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    priceInCents: z.number().int().positive(),
    totalQuantity: z.number().int().positive(),
    maxPerOrder: z.number().int().positive(),
    saleStartsAt: z.coerce.date(),
    saleEndsAt: z.union([z.coerce.date(), z.null()]),
  })
  .strict();
