import { describe, expect, it } from "vitest";
import { generateSchedule, schedulesOverlap, type SchedulingInput } from "@/lib/scheduling/engine";
import { schedulingPreferencesSchema } from "@/lib/contracts";

const id = (suffix: number) => `00000000-0000-4000-a000-${String(suffix).padStart(12, "0")}`;
const base = (): SchedulingInput => ({
  rangeStart: "2026-08-28T00:00:00Z", rangeEnd: "2026-08-30T00:00:00Z", planId: id(99),
  preferences: schedulingPreferencesSchema.parse({ timezone: "America/Chicago", defaultBlockMinutes: 45, breakMinutes: 10, minimumSessionMinutes: 15 }),
  assignments: [{ id: id(1), area: "school", dueAt: "2026-08-29T23:00:00Z", estimatedMinutes: 90, priority: "high", dependencyIds: [], status: "confirmed" }],
  studyWindows: [{ startsAt: "2026-08-28T22:00:00Z", endsAt: "2026-08-29T01:00:00Z" }],
  calendarEvents: [], lockedBlocks: [],
});

describe("scheduling engine", () => {
  it("is stable, splits work, inserts bounded breaks, and never overlaps", () => {
    const input = base();
    const first = generateSchedule(input);
    expect(first).toEqual(generateSchedule(input));
    expect(first.blocks.filter((block) => block.kind === "work")).toHaveLength(2);
    expect(first.blocks.some((block) => block.kind === "break")).toBe(true);
    expect(schedulesOverlap(first.blocks)).toBe(false);
  });

  it("subtracts overlapping busy events", () => {
    const input = base();
    input.calendarEvents = [{ startsAt: "2026-08-28T22:30:00Z", endsAt: "2026-08-28T23:30:00Z", classification: "busy" }];
    const result = generateSchedule(input);
    expect(result.blocks.every((block) => block.endsAt <= "2026-08-28T22:30:00.000Z" || block.startsAt >= "2026-08-28T23:30:00.000Z")).toBe(true);
  });

  it("merges overlapping availability before placing work", () => {
    const input = base();
    input.studyWindows.push({ startsAt: "2026-08-28T22:30:00Z", endsAt: "2026-08-29T00:30:00Z" });
    const result = generateSchedule(input);
    expect(schedulesOverlap(result.blocks)).toBe(false);
    expect(result.blocks.filter((block) => block.kind === "work")).toHaveLength(2);
  });

  it("returns machine-readable insufficient-capacity and no-availability reasons", () => {
    const insufficient = base();
    insufficient.studyWindows = [{ startsAt: "2026-08-28T22:00:00Z", endsAt: "2026-08-28T22:30:00Z" }];
    expect(generateSchedule(insufficient).unscheduledTasks[0].remainingMinutes).toBe(60);
    const none = base(); none.studyWindows = [];
    expect(generateSchedule(none).unscheduledTasks[0].reason).toBe("NO_AVAILABILITY");
  });

  it("handles overdue and zero-duration work", () => {
    const input = base();
    input.assignments = [
      { ...input.assignments[0], id: id(2), dueAt: "2026-08-27T00:00:00Z" },
      { ...input.assignments[0], id: id(3), estimatedMinutes: 0 },
    ];
    expect(generateSchedule(input).unscheduledTasks.map((task) => task.reason)).toEqual(["DEADLINE_PASSED", "INVALID_DURATION"]);
  });

  it("preserves locked blocks and schedules around midnight boundaries", () => {
    const input = base();
    input.lockedBlocks = [{ id: id(8), assignmentId: id(1), studyPlanId: id(7), startsAt: "2026-08-28T23:30:00Z", endsAt: "2026-08-29T00:15:00Z", locked: true, kind: "work", sequence: 0 }];
    const result = generateSchedule(input);
    expect(result.blocks).toContainEqual({ ...input.lockedBlocks[0], studyPlanId: id(99) });
    expect(schedulesOverlap(result.blocks)).toBe(false);
  });

  it("credits locked work toward the estimate", () => {
    const input = base();
    input.lockedBlocks = [{ id: id(8), assignmentId: id(1), studyPlanId: id(7), startsAt: "2026-08-28T22:00:00Z", endsAt: "2026-08-28T23:30:00Z", locked: true, kind: "work", sequence: 0 }];
    expect(generateSchedule(input).blocks).toHaveLength(1);
  });

  it("does not schedule a dependent task when its prerequisite cannot fit", () => {
    const input = base();
    input.assignments = [
      { ...input.assignments[0], id: id(1), estimatedMinutes: 300 },
      { ...input.assignments[0], id: id(2), estimatedMinutes: 30, dependencyIds: [id(1)] },
    ];
    input.studyWindows = [{ startsAt: "2026-08-28T22:00:00Z", endsAt: "2026-08-28T23:00:00Z" }];
    expect(generateSchedule(input).unscheduledTasks.find((task) => task.assignmentId === id(2))?.reason).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("respects bedtime as a hard availability boundary", () => {
    const input = base();
    input.preferences = { ...input.preferences, timezone: "UTC", bedtime: "22:30" };
    input.studyWindows = [{ startsAt: "2026-08-28T22:00:00Z", endsAt: "2026-08-28T23:30:00Z" }];
    expect(generateSchedule(input).blocks.every((block) => block.endsAt <= "2026-08-28T22:30:00.000Z")).toBe(true);
  });

  it("uses absolute instants safely across a daylight-saving transition", () => {
    const input = base();
    input.rangeStart = "2026-11-01T05:00:00Z"; input.rangeEnd = "2026-11-02T07:00:00Z";
    input.assignments[0].dueAt = input.rangeEnd;
    input.studyWindows = [{ startsAt: "2026-11-01T06:30:00Z", endsAt: "2026-11-01T08:30:00Z" }];
    expect(generateSchedule(input).blocks.filter((block) => block.kind === "work")).toHaveLength(2);
  });

  it("schedules school and extracurricular work together through one collision engine", () => {
    const input = base();
    input.assignments.push({ ...input.assignments[0], id: id(2), area: "extracurricular", estimatedMinutes: 30 });
    const combined = generateSchedule(input);
    expect(new Set(combined.blocks.flatMap((block) => block.assignmentId ? [block.assignmentId] : []))).toEqual(new Set([id(1), id(2)]));
    expect(schedulesOverlap(combined.blocks)).toBe(false);
    expect(generateSchedule({ ...input, area: "extracurricular" }).blocks.filter((block) => block.kind === "work").every((block) => block.assignmentId === id(2))).toBe(true);
  });

  it("schedules every due-tomorrow task today", () => {
    const input = base();
    input.rangeStart = "2026-08-30T16:00:00Z";
    input.rangeEnd = "2026-09-02T00:00:00Z";
    input.preferences = { ...input.preferences, timezone: "UTC" };
    input.assignments = [
      { ...input.assignments[0], id: id(1), dueAt: "2026-08-31T23:59:00Z", estimatedMinutes: 45 },
      { ...input.assignments[0], id: id(2), dueAt: "2026-08-31T23:59:00Z", estimatedMinutes: 45 },
    ];
    input.studyWindows = [
      { startsAt: "2026-08-30T16:00:00Z", endsAt: "2026-08-30T20:00:00Z" },
      { startsAt: "2026-08-31T16:00:00Z", endsAt: "2026-08-31T20:00:00Z" },
    ];
    const work = generateSchedule(input).blocks.filter((block) => block.kind === "work");
    expect(new Set(work.map((block) => block.assignmentId))).toEqual(new Set([id(1), id(2)]));
    expect(work.every((block) => block.startsAt.startsWith("2026-08-30"))).toBe(true);
  });

  it("spreads a larger project over separate days before its deadline", () => {
    const input = base();
    input.rangeStart = "2026-08-30T08:00:00Z";
    input.rangeEnd = "2026-09-06T00:00:00Z";
    input.preferences = { ...input.preferences, timezone: "UTC", breakMinutes: 0 };
    input.assignments = [{ ...input.assignments[0], dueAt: "2026-09-05T23:59:00Z", estimatedMinutes: 180 }];
    input.studyWindows = Array.from({ length: 6 }, (_, day) => ({
      startsAt: `2026-0${day < 2 ? "8" : "9"}-${String(30 + day > 31 ? day - 1 : 30 + day).padStart(2, "0")}T16:00:00Z`,
      endsAt: `2026-0${day < 2 ? "8" : "9"}-${String(30 + day > 31 ? day - 1 : 30 + day).padStart(2, "0")}T18:00:00Z`,
    }));
    const dates = generateSchedule(input).blocks.filter((block) => block.kind === "work").map((block) => block.startsAt.slice(0, 10));
    expect(new Set(dates).size).toBe(4);
    expect(dates.every((date) => date < "2026-09-05")).toBe(true);
  });

  it("prioritizes urgent work while balancing later work", () => {
    const input = base();
    input.rangeStart = "2026-08-30T16:00:00Z";
    input.rangeEnd = "2026-09-04T00:00:00Z";
    input.preferences = { ...input.preferences, timezone: "UTC", breakMinutes: 0 };
    input.assignments = [
      { ...input.assignments[0], id: id(1), dueAt: "2026-08-31T23:59:00Z", estimatedMinutes: 45, priority: "urgent" },
      { ...input.assignments[0], id: id(2), dueAt: "2026-09-03T23:59:00Z", estimatedMinutes: 90, priority: "medium" },
    ];
    input.studyWindows = [0, 1, 2, 3].map((day) => ({
      startsAt: new Date(Date.parse("2026-08-30T16:00:00Z") + day * 86_400_000).toISOString(),
      endsAt: new Date(Date.parse("2026-08-30T18:00:00Z") + day * 86_400_000).toISOString(),
    }));
    const work = generateSchedule(input).blocks.filter((block) => block.kind === "work");
    expect(work[0].assignmentId).toBe(id(1));
    expect(new Set(work.filter((block) => block.assignmentId === id(2)).map((block) => block.startsAt.slice(0, 10))).size).toBe(2);
    expect(schedulesOverlap(work)).toBe(false);
  });

});
