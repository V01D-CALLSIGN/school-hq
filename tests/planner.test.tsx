import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
  },
}));
import { Planner } from "@/features/planner/planner";
describe("Planner", () => {
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
});
