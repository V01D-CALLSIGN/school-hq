import { describe, expect, it } from "vitest";
import { planBlocksToCalendarEvents } from "@/lib/calendar/plan-events";

const id = (suffix: number) => `00000000-0000-4000-a000-${String(suffix).padStart(12, "0")}`;

describe("planned calendar events", () => {
  it("rebuilds linked events from persisted plans, blocks, and current task data", () => {
    const events = planBlocksToCalendarEvents(
      [{ id: id(1), timezone: "America/Chicago" }],
      [{ id: id(2), study_plan_id: id(1), assignment_id: id(3), starts_at: "2026-08-30T20:00:00Z", ends_at: "2026-08-30T20:45:00Z" }],
      [{ id: id(3), title: "Edited report title", area: "school", status: "confirmed" }],
      "UTC",
    );
    expect(events[0]).toMatchObject({
      id: id(2), planBlockId: id(2), assignmentId: id(3), title: "Edited report title",
      startsAt: "2026-08-30T20:00:00Z", originalTimezone: "America/Chicago",
    });
  });

  it("hides completed tasks from the active work calendar", () => {
    expect(planBlocksToCalendarEvents(
      [{ id: id(1), timezone: "UTC" }],
      [{ id: id(2), study_plan_id: id(1), assignment_id: id(3), starts_at: "2026-08-30T20:00:00Z", ends_at: "2026-08-30T20:45:00Z" }],
      [{ id: id(3), title: "Done", area: "school", status: "completed" }],
      "UTC",
    )).toEqual([]);
  });
});
