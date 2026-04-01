import { z } from "zod";

export const listEventOrdersSchema = z
  .object({
    eventId: z.string().trim().min(1).max(160),
  })
  .strict();
