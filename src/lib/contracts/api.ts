export type FieldIssue = { path: string; message: string };

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fields?: FieldIssue[]; requestId?: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const success = <T>(data: T, init?: ResponseInit): Response =>
  Response.json({ ok: true, data } satisfies ApiSuccess<T>, init);

export const failure = (
  status: number,
  code: string,
  message: string,
  fields?: FieldIssue[],
): Response => Response.json({ ok: false, error: { code, message, fields } } satisfies ApiFailure, { status });
