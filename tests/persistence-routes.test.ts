import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({ requireAuth: vi.fn() }));

import { requireAuth } from "@/lib/server/auth";
import * as assignmentsRoute from "@/app/api/assignments/route";
import * as eventsRoute from "@/app/api/calendar/events/route";
import * as preferencesRoute from "@/app/api/scheduling-preferences/route";
import * as planRoute from "@/app/api/plans/[id]/route";

const mockedAuth = vi.mocked(requireAuth);
const user = { id: "00000000-0000-4000-a000-000000000001" };

describe("authenticated persistence routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters assignments by a validated area", async () => {
    const rows = [
      { id: "00000000-0000-4000-a000-000000000011", user_id: user.id, area: "school", activity_label: null, course_id: null, title: "Essay", due_at: null, estimated_minutes: 30, priority: "medium", task_type: "assignment", dependency_ids: [], notes: null, status: "confirmed", completed_at: null, created_at: "2026-08-28T00:00:00Z", updated_at: "2026-08-28T00:00:00Z" },
      { id: "00000000-0000-4000-a000-000000000012", user_id: user.id, area: "extracurricular", activity_label: "Team", course_id: null, title: "Prepare", due_at: null, estimated_minutes: 30, priority: "medium", task_type: "other", dependency_ids: [], notes: null, status: "confirmed", completed_at: null, created_at: "2026-08-28T00:00:00Z", updated_at: "2026-08-28T00:00:00Z" },
    ];
    const filters: Record<string, string> = {};
    const query = {
      order: vi.fn(() => query),
      eq: vi.fn((key: string, value: string) => { filters[key] = value; return query; }),
      then: (resolve: (value: unknown) => void) => resolve({ data: rows.filter((row) => !filters.area || row.area === filters.area), error: null }),
    };
    mockedAuth.mockResolvedValue({ user, supabase: { from: () => ({ select: () => query }) } } as never);
    const response = await assignmentsRoute.GET(new Request("http://localhost/api/assignments?area=extracurricular"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: [{ area: "extracurricular", activityLabel: "Team" }] });
    expect(filters.area).toBe("extracurricular");
  });

  it("fetches and updates scheduling preferences through the shared schema", async () => {
    const stored = { user_id: user.id, timezone: "UTC", default_block_minutes: 45, break_minutes: 10, minimum_session_minutes: 15, bedtime: "23:00:00", urgency_weight: 4, priority_weight: 3, duration_weight: 1, updated_at: "2026-08-28T00:00:00Z" };
    const from = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: stored, error: null }) }),
      update: (updates: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { ...stored, ...updates }, error: null }) }) }),
    }));
    mockedAuth.mockResolvedValue({ user, supabase: { from } } as never);
    await expect((await preferencesRoute.GET(new Request("http://localhost/api/scheduling-preferences"))).json()).resolves.toMatchObject({ ok: true, data: { bedtime: "23:00" } });
    const response = await preferencesRoute.PATCH(new Request("http://localhost/api/scheduling-preferences", { method: "PATCH", body: JSON.stringify({ defaultBlockMinutes: 60 }) }));
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { defaultBlockMinutes: 60 } });
  });

  it("validates preference updates before persistence", async () => {
    mockedAuth.mockResolvedValue({ user, supabase: {} } as never);
    const response = await preferencesRoute.PATCH(new Request("http://localhost/api/scheduling-preferences", { method: "PATCH", body: JSON.stringify({ defaultBlockMinutes: 2 }) }));
    expect(response.status).toBe(422);
  });

  it("does not update another user's calendar event when RLS hides it", async () => {
    const single = vi.fn(async () => ({ data: null, error: { code: "PGRST116", message: "no rows" } }));
    const from = () => ({ update: () => ({ eq: () => ({ select: () => ({ single }) }) }) });
    mockedAuth.mockResolvedValue({ user, supabase: { from } } as never);
    const response = await eventsRoute.PATCH(new Request("http://localhost/api/calendar/events", { method: "PATCH", body: JSON.stringify({ id: "00000000-0000-4000-a000-000000000099", classification: "ignored" }) }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("updates an owned calendar event classification", async () => {
    const row = {
      id: "00000000-0000-4000-a000-000000000099", calendar_import_id: "00000000-0000-4000-a000-000000000098",
      source_uid: "event-1", recurrence_id: "", title: "Event", description: null, location: null,
      starts_at: "2026-08-28T18:00:00Z", ends_at: "2026-08-28T19:00:00Z", all_day: false,
      classification: "ignored", area: "school", original_timezone: "UTC",
    };
    const update = vi.fn(() => ({ eq: () => ({ select: () => ({ single: async () => ({ data: row, error: null }) }) }) }));
    mockedAuth.mockResolvedValue({ user, supabase: { from: () => ({ update }) } } as never);
    const response = await eventsRoute.PATCH(new Request("http://localhost/api/calendar/events", { method: "PATCH", body: JSON.stringify({ id: row.id, classification: "ignored" }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { id: row.id, classification: "ignored" } });
    expect(update).toHaveBeenCalledWith({ classification: "ignored" });
  });

  it("rejects a plan edit when the authenticated user cannot read the plan", async () => {
    const missing = { data: null, error: { code: "PGRST116", message: "no rows" } };
    const empty = { data: [], error: null };
    const from = vi.fn((table: string) => table === "study_plans"
      ? { select: () => ({ eq: () => ({ single: async () => missing }) }) }
      : { select: () => ({ eq: () => Promise.resolve(empty) }) });
    const rpc = vi.fn();
    mockedAuth.mockResolvedValue({ user, supabase: { from, rpc } } as never);
    const planId = "00000000-0000-4000-a000-000000000077";
    const response = await planRoute.PATCH(
      new Request(`http://localhost/api/plans/${planId}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }),
      { params: Promise.resolve({ id: planId }) },
    );
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
});
