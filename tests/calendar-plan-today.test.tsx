import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCalendarEvent } = vi.hoisted(() => ({
  createCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    getCalendarWeek: vi.fn(async () => []),
    createCalendarEvent,
  },
}));

import { CalendarView } from "@/features/calendar/calendar-view";

const assignment = {
  id: "assignment-1",
  area: "school",
  courseId: null,
  activityLabel: null,
  title: "Finish calculus worksheet",
  dueAt: null,
  estimatedMinutes: 45,
  priority: "medium",
  taskType: "assignment",
  dependencyIds: [],
  notes: null,
  status: "confirmed",
  completedAt: null,
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
};

describe("Plan today calendar handoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    createCalendarEvent.mockReset();
    createCalendarEvent.mockImplementation(async (body) => ({
      ...body,
      id: "event-1",
      calendarImportId: "manual",
      sourceUid: "manual-event-1",
      recurrenceId: null,
    }));
  });

  it("lets a reviewed task become a visible calendar block", async () => {
    sessionStorage.setItem(
      "school-hq-plan-today-v1",
      JSON.stringify([assignment]),
    );
    const user = userEvent.setup();
    render(<CalendarView />);
    expect(
      screen.getByRole("heading", { name: /place each task/i }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /add to today’s calendar/i }),
    );
    await waitFor(() => expect(createCalendarEvent).toHaveBeenCalledOnce());
    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: assignment.title,
        classification: "busy",
        area: "school",
      }),
    );
    expect(sessionStorage.getItem("school-hq-plan-today-v1")).toBeNull();
    expect(screen.getAllByText(assignment.title).length).toBeGreaterThan(0);
  });
});
