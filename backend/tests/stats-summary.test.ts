import { describe, expect, it } from "vitest";
import { summarizeByArea } from "@/lib/stats/summary";

describe("area statistics", () => {
  it("returns school, extracurricular, and mathematically combined summaries", () => {
    const now = Date.parse("2026-08-28T20:00:00Z");
    const result = summarizeByArea([
      { area: "school", status: "confirmed", dueAt: "2026-08-27T20:00:00Z" },
      { area: "extracurricular", status: "completed", dueAt: null },
    ], [
      { area: "school", startedAt: "2026-08-28T18:00:00Z", completedAt: "2026-08-28T18:30:00Z", accumulatedPauseSeconds: 0 },
      { area: "extracurricular", startedAt: "2026-08-28T19:00:00Z", completedAt: "2026-08-28T19:20:00Z", accumulatedPauseSeconds: 0 },
    ], [
      { area: "school", startsAt: "2026-08-28T18:00:00Z", endsAt: "2026-08-28T18:30:00Z" },
      { area: "extracurricular", startsAt: "2026-08-28T19:00:00Z", endsAt: "2026-08-28T19:20:00Z" },
    ], now);
    expect(result.school).toMatchObject({ assignments: { incomplete: 1, completed: 0, overdue: 1 }, focus: { focusedMinutesThisWeek: 30 }, plan: { scheduledMinutesThisWeek: 30 } });
    expect(result.extracurricular).toMatchObject({ assignments: { incomplete: 0, completed: 1, overdue: 0 }, focus: { focusedMinutesThisWeek: 20 }, plan: { scheduledMinutesThisWeek: 20 } });
    expect(result.combined).toMatchObject({ assignments: { incomplete: 1, completed: 1, overdue: 1 }, focus: { completedSessionsThisWeek: 2, focusedMinutesThisWeek: 50 }, plan: { scheduledMinutesThisWeek: 50 } });
  });
});
