import type { Context } from "hono";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(400, message, "BAD_REQUEST");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

/**
 * Global error handler
 */
export function errorHandler(err: Error, c: Context) {
  console.error("[Error]", err);

  if (err instanceof AppError) {
    return c.json(
      {
        ok: false,
        error: err.message,
        code: err.code,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 500
    );
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      {
        ok: false,
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: (err as any).errors,
      },
      400
    );
  }

  // Default to 500 internal server error
  return c.json(
    {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    500
  );
}
