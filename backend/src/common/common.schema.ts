// src/common/common.schema.ts
import { z } from "zod";

export const errorResponseSchema = z.object({
  error: z.string().describe("Error message"),
  details: z.any().optional().describe("Validation failure details if applicable"),
});

export const messageResponseSchema = z.object({
  message: z.string().describe("Informational response message"),
  userId: z.string().optional().describe("User ID if returned by registration"),
});

export const userSchema = z.object({
  sub: z.string().describe("User ID"),
  email: z.string().email().describe("User email address"),
  role: z.enum(["USER", "ADMIN"]).optional().describe("User role"),
});

/** Spread into a route's `response` to document the standard error shapes. */
export const standardErrors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
};
