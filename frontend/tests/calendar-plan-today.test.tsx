import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/types/api";

const { createCalendarEvent, getCalendarWeek, patchCalendarEvent } = vi.hoisted(() => ({
  createCalendarEvent: vi.fn(),
  getCalendarWeek: vi.fn<() => Promise<CalendarEvent[]>>(async () => []),
  patchCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    getCalendarWeek,
    createCalendarEvent,
    patchCalendarEvent,
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
    getCalendarWeek.mockReset();
    getCalendarWeek.mockResolvedValue([]);
    patchCalendarEvent.mockReset();
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

  it("lets the user adjust a scheduled block", async () => {
    const startsAt = new Date();
    startsAt.setMinutes(0, 0, 0);
    const event: CalendarEvent = {
      id: "event-edit",
      calendarImportId: "manual",
      sourceUid: "manual-edit",
      recurrenceId: null,
      title: "Review lab notes",
      description: null,
      location: null,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
      allDay: false,
      classification: "busy",
      area: "school",
      originalTimezone: "America/Chicago",
    };
    getCalendarWeek.mockResolvedValue([event]);
    patchCalendarEvent.mockImplementation(async (body) => ({ ...event, ...body }));
    const user = userEvent.setup();
    render(<CalendarView />);
    const editButtons = await screen.findAllByRole("button", {
      name: /edit review lab notes/i,
    });
    await user.click(editButtons[0]);
    expect(screen.getByRole("dialog", { name: /adjust time block/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(patchCalendarEvent).toHaveBeenCalledOnce());
  });
});
