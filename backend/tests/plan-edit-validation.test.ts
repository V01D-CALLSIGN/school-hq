import { describe, expect, it } from "vitest";
import { validatePlanBlockEdits } from "@/lib/plans/validation";
import type { PlanBlock } from "@/lib/contracts";

const id = (suffix: number) => `00000000-0000-4000-a000-${String(suffix).padStart(12, "0")}`;
const plan = { rangeStart: "2026-08-28T18:00:00Z", rangeEnd: "2026-08-28T22:00:00Z" };
const blocks: PlanBlock[] = [
  { id: id(1), studyPlanId: id(9), assignmentId: id(11), startsAt: "2026-08-28T18:00:00Z", endsAt: "2026-08-28T19:00:00Z", locked: false, kind: "work", sequence: 0 },
  { id: id(2), studyPlanId: id(9), assignmentId: id(12), startsAt: "2026-08-28T19:15:00Z", endsAt: "2026-08-28T20:00:00Z", locked: false, kind: "work", sequence: 1 },
];

describe("plan block editing", () => {
  it("accepts time and locked changes when the final plan is valid", () => {
    const result = validatePlanBlockEdits(plan, blocks, [{ id: id(1), endsAt: "2026-08-28T19:10:00Z", locked: true }]);
    expect(result[0]).toMatchObject({ endsAt: "2026-08-28T19:10:00Z", locked: true });
  });

  it("rejects invalid duration, range escapes, inaccessible block IDs, and collisions", () => {
    expect(() => validatePlanBlockEdits(plan, blocks, [{ id: id(1), endsAt: "2026-08-28T17:00:00Z" }])).toThrowError(expect.objectContaining({ code: "INVALID_BLOCK_DURATION" }));
    expect(() => validatePlanBlockEdits(plan, blocks, [{ id: id(2), endsAt: "2026-08-28T23:00:00Z" }])).toThrowError(expect.objectContaining({ code: "BLOCK_OUTSIDE_PLAN" }));
    expect(() => validatePlanBlockEdits(plan, blocks, [{ id: id(8), locked: true }])).toThrowError(expect.objectContaining({ code: "NOT_FOUND" }));
    expect(() => validatePlanBlockEdits(plan, blocks, [{ id: id(2), startsAt: "2026-08-28T18:30:00Z" }])).toThrowError(expect.objectContaining({ code: "BLOCK_OVERLAP" }));
  });
});
