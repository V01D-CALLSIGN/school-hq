import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
const assignment = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  area: "school" as const,
  courseId: null,
  activityLabel: null,
  title: "Physics homework",
  dueAt: null,
  estimatedMinutes: 25,
  priority: "medium" as const,
  taskType: "assignment" as const,
  dependencyIds: [],
  notes: null,
  status: "confirmed" as const,
  completedAt: null,
  createdAt: "2026-08-29T12:00:00.000Z",
  updatedAt: "2026-08-29T12:00:00.000Z",
};
const session = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  assignmentId: assignment.id,
  planBlockId: null,
  status: "running" as const,
  startedAt: "2026-08-29T12:00:00.000Z",
  pausedAt: null,
  completedAt: null,
  accumulatedPauseSeconds: 0,
  plannedDurationMinutes: 25,
  createdAt: "2026-08-29T12:00:00.000Z",
  updatedAt: "2026-08-29T12:00:00.000Z",
};
vi.mock("@/lib/api-client", () => ({
  api: {
    listAssignments: vi.fn(async () => [assignment]),
    getActiveFocusSession: vi.fn(async () => null),
    createFocusSession: vi.fn(async () => ({ ...session, startedAt: new Date().toISOString() })),
    transitionFocusSession: vi.fn(async ({ action }: { action: string }) => ({
      ...session,
      startedAt: new Date().toISOString(),
      status: action === "pause" ? "paused" : action === "resume" ? "running" : action,
      pausedAt: action === "pause" ? new Date().toISOString() : null,
    })),
  },
}));
import { FocusTimer } from "@/features/focus/focus-timer";
describe("FocusTimer", () => {
  it("starts, pauses, and resumes through persisted focus transitions", async () => {
    const user = userEvent.setup();
    render(<FocusTimer />);
    const start = await screen.findByRole("button", { name: "Start" });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    expect(
      await screen.findByRole("button", { name: "Pause" }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("school-hq-focus-session-v2") ?? "{}").id,
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(
      await screen.findByRole("button", { name: "Resume" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(
      await screen.findByRole("button", { name: "Pause" }),
    ).toBeInTheDocument();
  });
});
