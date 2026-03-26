import { z } from "zod";

import type { CreateOrderInput } from "../../application/use-cases";

export const createOrderSchema: z.ZodType<CreateOrderInput> = z.object({
  eventId: z.uuid(),
  quantity: z.number().int().positive(),
}).strict();
