import { describe, expect, it } from "vitest";
import { MockBrainDumpParser } from "@/lib/brain-dump/parser";

describe("mock brain dump parser", () => {
  const parser = new MockBrainDumpParser();

  it("extracts explicit dates and durations deterministically", async () => {
    const first = await parser.parse({ text: "Calculus problem set due 2026-09-02 17:00 2 hours", timezone: "America/Chicago", courseContext: [{ name: "Calculus" }] });
    const second = await parser.parse({ text: "Calculus problem set due 2026-09-02 17:00 2 hours", timezone: "America/Chicago", courseContext: [{ name: "Calculus" }] });
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ course: "Calculus", dueAt: "2026-09-02T22:00:00.000Z", estimatedMinutes: 120 });
  });

  it("preserves ambiguity and never fabricates a deadline", async () => {
    const [result] = await parser.parse({ text: "Finish history essay next week", timezone: "UTC" });
    expect(result.dueAt).toBeNull();
    expect(result.ambiguousDateText).toBe("next week");
    expect(result.missingFields).toContain("dueAt");
    expect(result.warnings[0]).toContain("next week");
  });
});
