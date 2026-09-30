/**
 * One error type for "expected" failures (bad input, no permission, not found...).
 * Services THROW these; the global error handler turns them into HTTP responses.
 * That's why controllers don't need try/catch.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") => new AppError(400, code, message);
export const unauthorized = (message = "Authentication required.", code = "UNAUTHORIZED") =>
  new AppError(401, code, message);
export const forbidden = (message = "You do not have permission to do this.", code = "FORBIDDEN") =>
  new AppError(403, code, message);
export const notFound = (message = "Not found.", code = "NOT_FOUND") => new AppError(404, code, message);
export const conflict = (message: string, code = "CONFLICT") => new AppError(409, code, message);

/** Prisma errors carry a `code` like "P2002" (unique violation) or "P2025" (record not found). */
export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === code;
}
