export type FieldIssue = { path: string; message: string };

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fields?: FieldIssue[]; requestId?: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const privateJsonInit = (init: ResponseInit = {}): ResponseInit => {
  const headers = new Headers(init.headers);
  // Every API response can contain account-specific information. Never allow a
  // browser, CDN, or shared proxy to persist it.
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return { ...init, headers };
};

export const success = <T>(data: T, init?: ResponseInit): Response =>
  Response.json({ ok: true, data } satisfies ApiSuccess<T>, privateJsonInit(init));

export const failure = (
  status: number,
  code: string,
  message: string,
  fields?: FieldIssue[],
): Response => Response.json(
  { ok: false, error: { code, message, fields } } satisfies ApiFailure,
  privateJsonInit({ status }),
);
