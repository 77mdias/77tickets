import { z } from "zod";

const isValidDateFilter = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());

const isValidCursorToken = (value: string): boolean => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return false;
  }

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { startsAt?: string; id?: string };

    return (
      typeof decoded.id === "string" &&
      typeof decoded.startsAt === "string" &&
      !Number.isNaN(new Date(decoded.startsAt).getTime())
    );
  } catch {
    return false;
  }
};

export const listEventsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  date: z.string().refine(isValidDateFilter, "Invalid date").optional(),
  location: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  cursor: z.string().refine(isValidCursorToken, "Invalid cursor").optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
}).strict();
