import { z } from "zod";

import type { ValidateCheckinInput } from "../../application/checkin";

export const validateCheckinSchema: z.ZodType<ValidateCheckinInput> = z
  .object({
    ticketId: z.uuid(),
    eventId: z.uuid(),
  })
  .strict();
