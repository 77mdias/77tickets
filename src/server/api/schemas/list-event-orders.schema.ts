import { z } from "zod";

export const listEventOrdersSchema = z
  .object({
    eventId: z.uuid(),
  })
  .strict();
