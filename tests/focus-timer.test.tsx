import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
