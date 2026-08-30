import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

import { AppShell } from "@/components/layout/app-shell";

describe("mobile navigation", () => {
  it("keeps planning and calendar directly accessible", () => {
    render(
      <AppShell>
        <p>Dashboard</p>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: /mobile primary/i,
    });
    expect(within(navigation).getByRole("link", { name: /plan today/i })).toHaveAttribute(
      "href",
      "/planner?today=1",
    );
    expect(within(navigation).getByRole("link", { name: /calendar/i })).toHaveAttribute(
      "href",
      "/calendar",
    );
    expect(within(navigation).queryByText("More")).not.toBeInTheDocument();
  });
});
