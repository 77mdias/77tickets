import { z } from "zod";

import type { CreateOrderInput } from "../../application/orders";

export const createOrderSchema: z.ZodType<CreateOrderInput> = z.object({
  eventId: z.uuid(),
  customerId: z.uuid(),
  items: z
    .array(
      z.object({
        lotId: z.uuid(),
        quantity: z.number().int().positive(),
      }).strict(),
    )
    .min(1),
  couponCode: z.string().trim().min(1).max(64).optional(),
}).strict();
