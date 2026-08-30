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
  },
}));
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

  it("sends reviewed dashboard tasks to today's calendar", async () => {
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
        name: /continue to today’s calendar/i,
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/calendar?plan=today");
    expect(
      JSON.parse(sessionStorage.getItem("school-hq-plan-today-v1") ?? "[]"),
    ).toHaveLength(1);
  });
});
