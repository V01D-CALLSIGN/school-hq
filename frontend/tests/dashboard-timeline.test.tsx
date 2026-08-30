import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const now = new Date();
const startsAt = new Date(now.getTime() - 5 * 60_000).toISOString();
const endsAt = new Date(now.getTime() + 25 * 60_000).toISOString();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ session: { user: { email: "void@example.com" } } }),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    listAssignments: vi.fn(async () => []),
    getCalendarWeek: vi.fn(async () => [
      {
        id: "event-1",
        calendarImportId: "manual",
        sourceUid: "manual-1",
        recurrenceId: null,
        title: "Finish chemistry notes",
        description: null,
        location: null,
        startsAt,
        endsAt,
        allDay: false,
        classification: "busy",
        area: "school",
        originalTimezone: "America/Chicago",
      },
    ]),
    getStats: vi.fn(async () => null),
    parseBrainDump: vi.fn(),
  },
}));

import { Dashboard } from "@/features/dashboard/dashboard";

describe("dashboard timeline", () => {
  it("shows the current persisted calendar block", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Today’s timeline")).toBeInTheDocument();
    expect(await screen.findAllByText("Finish chemistry notes")).not.toHaveLength(0);
    expect(screen.getByRole("link", { name: /view calendar/i })).toHaveAttribute(
      "href",
      "/calendar",
    );
  });
});
