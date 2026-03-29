import { z } from "zod";

import type { CreateCouponInput } from "../../application/coupons";

const createCouponBaseSchema = z
  .object({
    eventId: z.uuid(),
    code: z.string().trim().min(1).max(64),
    discountType: z.enum(["fixed", "percentage"]),
    discountInCents: z.number().int().positive().nullable(),
    discountPercentage: z.number().int().min(1).max(100).nullable(),
    maxRedemptions: z.number().int().positive(),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
  })
  .strict();

export const createCouponSchema: z.ZodType<CreateCouponInput> =
  createCouponBaseSchema.superRefine((value, ctx) => {
    if (
      value.discountType === "fixed" &&
      (value.discountInCents === null || value.discountPercentage !== null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountInCents"],
        message: "Fixed discount requires discountInCents and forbids discountPercentage",
      });
    }

    if (
      value.discountType === "percentage" &&
      (value.discountPercentage === null || value.discountInCents !== null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountPercentage"],
        message:
          "Percentage discount requires discountPercentage and forbids discountInCents",
      });
    }
  });
