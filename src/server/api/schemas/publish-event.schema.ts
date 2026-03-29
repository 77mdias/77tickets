import { z } from "zod";

import type { PublishEventInput } from "../../application/events";

export const publishEventSchema: z.ZodType<PublishEventInput> = z
  .object({ eventId: z.uuid() })
  .strict();
