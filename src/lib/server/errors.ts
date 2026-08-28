import { ZodError } from "zod";
import { failure } from "@/lib/contracts";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) return failure(error.status, error.code, error.message, error.fields);
  if (error instanceof ZodError) {
    return failure(422, "VALIDATION_ERROR", "Request validation failed", error.issues.map((issue) => ({
      path: issue.path.join("."), message: issue.message,
    })));
  }
  console.error("Unhandled API error", error);
  return failure(500, "INTERNAL_ERROR", "The request could not be completed");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}
