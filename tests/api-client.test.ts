import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/client", () => ({
  getAccessToken: vi.fn(async () => "access-token"),
}));
import { api, apiRequest } from "@/lib/api-client";
const success = <T>(data: T, status = 200) =>
  new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
describe("backend contract client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("unwraps the response envelope and attaches bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(success({ value: 42 }));
    await expect(
      apiRequest<{ value: number }>("/api/example"),
    ).resolves.toEqual({ value: 42 });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
  it("uses the public backend origin for native builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.school-hq.example/");
    vi.mocked(fetch).mockResolvedValue(success({ value: 42 }));
    await apiRequest<{ value: number }>("/api/example");
    const [path, init] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("https://api.school-hq.example/api/example");
    expect(init?.credentials).toBe("omit");
  });
  it("uploads the actual calendar file as multipart without forcing Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValue(
      success({ import: { eventCount: 0 }, events: [] }, 201),
    );
    const file = new File(["BEGIN:VCALENDAR\nEND:VCALENDAR"], "school.ics", {
      type: "text/calendar",
    });
    await api.importCalendar(file, "study_available", "extracurricular");
    const [path, init] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("/api/calendar/import");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("classification")).toBe("study_available");
    expect(form.get("area")).toBe("extracurricular");
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
  });
  it("sends the required plan generation range and timezone", async () => {
    vi.mocked(fetch).mockResolvedValue(success({}));
    const input = {
      rangeStart: "2026-08-28T18:00:00-05:00",
      rangeEnd: "2026-08-29T00:00:00-05:00",
      timezone: "America/Chicago",
    };
    await api.generatePlan({ ...input, area: "extracurricular" });
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual(
      { ...input, area: "extracurricular" },
    );
  });
  it("patches assignments through the collection route with id in the body", async () => {
    vi.mocked(fetch).mockResolvedValue(success({}));
    await api.patchAssignment({ id: "assignment-id", status: "completed" });
    const [path, init] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("/api/assignments");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      id: "assignment-id",
      status: "completed",
    });
  });
  it("uses the collection focus transition contract", async () => {
    vi.mocked(fetch).mockResolvedValue(success({}));
    await api.transitionFocusSession({
      id: "session-id",
      action: "pause",
      occurredAt: "2026-08-28T19:00:00-05:00",
    });
    const [path, init] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("/api/focus-sessions");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      id: "session-id",
      action: "pause",
      occurredAt: "2026-08-28T19:00:00-05:00",
    });
  });
  it("preserves backend error codes and metadata", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "PARSER_TIMEOUT",
            message: "Parser timed out",
            fields: [{ path: "text", message: "Try less text" }],
            requestId: "req-1",
          },
        }),
        { status: 503 },
      ),
    );
    await expect(apiRequest("/api/brain-dumps/parse")).rejects.toMatchObject({
      status: 503,
      code: "PARSER_TIMEOUT",
      category: "parser",
      fields: [{ path: "text", message: "Try less text" }],
      requestId: "req-1",
    });
  });
});
