import { z } from "zod";

export const updateLotSchema = z
  .object({
    lotId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    priceInCents: z.number().int().positive(),
    totalQuantity: z.number().int().positive(),
    maxPerOrder: z.number().int().positive(),
    saleStartsAt: z.coerce.date(),
    saleEndsAt: z.union([z.coerce.date(), z.null()]),
    status: z.enum(["active", "paused", "sold_out", "closed"]),
  })
  .strict();
