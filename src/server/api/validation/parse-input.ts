import type { ZodIssue, ZodTypeAny } from "zod";

import { createValidationError } from "../../application/errors";

interface ValidationIssueDetail {
  path: string;
  message: string;
  code: string;
}

const mapIssue = (issue: ZodIssue): ValidationIssueDetail => ({
  path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
  message: issue.message,
  code: issue.code,
});

export const parseInput = <TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  errorMessage = "Invalid request payload",
): TSchema["_output"] => {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw createValidationError(errorMessage, {
      details: {
        issues: parsed.error.issues.map(mapIssue),
      },
    });
  }

  return parsed.data;
};
