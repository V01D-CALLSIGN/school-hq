import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/api-client", () => ({
  api: {
    listAssignments: vi.fn(async () => []),
    listCourses: vi.fn(async () => []),
    parseBrainDump: vi.fn(async () => ({
      parsedAssignments: [{
        title: "Momentum problems 1–12",
        area: "school",
        areaConfidence: 0.9,
        course: "Physics",
        activityLabel: null,
        dueAt: null,
        ambiguousDateText: null,
        estimatedMinutes: 45,
        priority: "high",
        taskType: "assignment",
        dependencies: [],
        notes: null,
        confidence: 0.9,
        missingFields: [],
        warnings: [],
      }],
    })),
    createCourse: vi.fn(async () => ({
      id: "course-1",
      name: "Physics",
      code: null,
      color: "#6366F1",
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    })),
    createAssignment: vi.fn(async (body) => ({
      ...body,
      id: "assignment-1",
      completedAt: null,
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    })),
    generatePlan: vi.fn(async () => ({
      id: "plan-1",
      rangeStart: "2026-08-30T17:00:00.000Z",
      rangeEnd: "2026-09-07T17:00:00.000Z",
      timezone: "America/Chicago",
      status: "draft",
      areaFilter: "combined",
      blocks: [{
        id: "block-1", studyPlanId: "plan-1", assignmentId: "assignment-1",
        startsAt: "2026-08-30T18:00:00.000Z", endsAt: "2026-08-30T18:45:00.000Z",
        locked: false, kind: "work", sequence: 0,
      }],
      unscheduledTasks: [], createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z",
    })),
    patchPlan: vi.fn(async () => ({
      id: "plan-1",
      rangeStart: "2026-08-30T17:00:00.000Z",
      rangeEnd: "2026-09-07T17:00:00.000Z",
      timezone: "America/Chicago", status: "active", areaFilter: "combined",
      blocks: [], unscheduledTasks: [], createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z",
    })),
  },
}));
import { api } from "@/lib/api-client";
import { Planner } from "@/features/planner/planner";
describe("Planner", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/planner");
    sessionStorage.clear();
    pushMock.mockClear();
  });

  it("parses a brain dump into an editable review before planning", async () => {
    const user = userEvent.setup();
    render(<Planner />);
    const input = screen.getByRole("textbox", { name: /input console/i });
    expect(input).toBeInTheDocument();
    await user.type(input, "Physics homework due tomorrow");
    await user.click(screen.getByRole("button", { name: /parse brain dump/i }));
    expect(
      await screen.findByDisplayValue(
        "Momentum problems 1–12",
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /area for momentum/i }),
    ).toHaveValue("school");
    expect(
      screen.getByRole("button", { name: /confirm and generate plan/i }),
    ).toBeEnabled();
  });

  it("generates, reviews, and activates today's work plan before opening the calendar", async () => {
    window.history.replaceState({}, "", "/planner?today=1");
    const user = userEvent.setup();
    render(<Planner />);
    await user.type(
      screen.getByRole("textbox", { name: /input console/i }),
      "Physics homework",
    );
    await user.click(screen.getByRole("button", { name: /parse brain dump/i }));
    await user.click(
      await screen.findByRole("button", {
        name: /create today’s work plan/i,
      }),
    );
    await user.click(await screen.findByRole("button", { name: /use this plan/i }));
    expect(pushMock).toHaveBeenCalledWith("/calendar");
    expect(sessionStorage.getItem("school-hq-plan-today-v1")).toBeNull();
  });

  it("does not activate an empty plan and directs the user to import Study Blocks", async () => {
    window.history.replaceState({}, "", "/planner?today=1");
    vi.mocked(api.generatePlan).mockResolvedValueOnce({
      id: "plan-empty", rangeStart: "2026-08-30T17:00:00.000Z",
      rangeEnd: "2026-09-07T17:00:00.000Z", timezone: "America/Chicago",
      status: "draft", areaFilter: "combined", blocks: [],
      unscheduledTasks: [{ assignmentId: "assignment-1", remainingMinutes: 45, reason: "NO_AVAILABILITY" }],
      createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z",
    });
    const user = userEvent.setup();
    render(<Planner />);
    await user.type(screen.getByRole("textbox", { name: /input console/i }), "Physics homework");
    await user.click(screen.getByRole("button", { name: /parse brain dump/i }));
    await user.click(await screen.findByRole("button", { name: /create today’s work plan/i }));
    await user.click(await screen.findByRole("button", { name: /import study blocks first/i }));
    expect(pushMock).toHaveBeenCalledWith("/calendar");
  });
});
