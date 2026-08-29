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

export const MAX_JSON_BODY_BYTES = 64 * 1024;

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

export async function readJson(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, "INPUT_TOO_LARGE", "Request body exceeds the size limit");
  }

  try {
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let receivedBytes = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > maxBytes) {
          await reader.cancel();
          throw new HttpError(413, "INPUT_TOO_LARGE", "Request body exceeds the size limit");
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    }
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}
