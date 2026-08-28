import { HttpError } from "./errors";

export function assertDb<T>(result: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (result.error.code === "23505") throw new HttpError(409, "CONFLICT", "The resource already exists");
    if (result.error.code === "PGRST116") throw new HttpError(404, "NOT_FOUND", "Resource not found");
    console.error("Database error", result.error);
    throw new HttpError(500, "DATABASE_ERROR", "The database operation failed");
  }
  if (result.data === null) throw new HttpError(404, "NOT_FOUND", "Resource not found");
  return result.data;
}

export function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => camelize(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), camelize(item),
    ])) as T;
  }
  return value as T;
}

export function snakeize(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), item,
  ]));
}
