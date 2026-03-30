import { z } from "zod";

export const getEventParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160),
}).strict();
