import { z } from "zod";

import type { UpdateEventStatusInput } from "../../application/events";

export const updateEventSchema: z.ZodType<UpdateEventStatusInput> = z
  .object({
    eventId: z.uuid(),
    targetStatus: z.enum(["draft", "published", "cancelled"]),
  })
  .strict();
