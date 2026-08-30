import { describe, expect, it } from "vitest";
import { applyFocusTransition } from "@/lib/focus/transitions";
import type { FocusSession } from "@/lib/contracts";

const session: FocusSession = {
  id: "00000000-0000-4000-a000-000000000001", assignmentId: null, planBlockId: null,
  status: "running", startedAt: "2026-08-28T10:00:00Z", pausedAt: null, completedAt: null,
  accumulatedPauseSeconds: 0, plannedDurationMinutes: 25,
  createdAt: "2026-08-28T10:00:00Z", updatedAt: "2026-08-28T10:00:00Z",
};

describe("focus transitions", () => {
  it("tracks accumulated pause time using timestamps", () => {
    const paused = { ...session, ...applyFocusTransition(session, "pause", "2026-08-28T10:05:00Z") };
    expect(applyFocusTransition(paused, "resume", "2026-08-28T10:07:30Z").accumulatedPauseSeconds).toBe(150);
  });
  it("rejects impossible transitions", () => {
    expect(() => applyFocusTransition(session, "resume")).toThrowError(/paused session/);
    expect(() => applyFocusTransition({ ...session, status: "completed" }, "pause")).toThrowError(/Finished/);
    expect(() => applyFocusTransition({ ...session, status: "paused", pausedAt: "2026-08-28T10:10:00Z" }, "resume", "2026-08-28T10:09:00Z")).toThrowError(/precede pause/);
  });
});
