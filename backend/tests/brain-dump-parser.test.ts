import { describe, expect, it } from "vitest";
import {
  applyBrainDumpContext,
  MockBrainDumpParser,
  resolveRelativeAssignments,
} from "@/lib/brain-dump/parser";

describe("mock brain dump parser", () => {
  const parser = new MockBrainDumpParser();

  it("extracts explicit dates and durations deterministically", async () => {
    const first = await parser.parse({ text: "Calculus problem set due 2026-09-02 17:00 2 hours", timezone: "America/Chicago", courseContext: [{ name: "Calculus" }] });
    const second = await parser.parse({ text: "Calculus problem set due 2026-09-02 17:00 2 hours", timezone: "America/Chicago", courseContext: [{ name: "Calculus" }] });
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ area: "school", areaConfidence: 0.95, course: "Calculus", dueAt: "2026-09-02T22:00:00.000Z", estimatedMinutes: 120 });
  });

  it("defaults an uncertain area to school and requires review", async () => {
    const [result] = await parser.parse({ text: "Finish the presentation", timezone: "UTC" });
    expect(result).toMatchObject({ area: "school", areaConfidence: 0.5 });
    expect(result.missingFields).toContain("area");
    expect(result.warnings).toContain("Area is uncertain; review school vs extracurricular classification");
  });

  it("recognizes extracurricular work without inventing a course", async () => {
    const [result] = await parser.parse({ text: "Prepare for robotics club 45 minutes", timezone: "UTC" });
    expect(result).toMatchObject({ area: "extracurricular", course: null, activityLabel: "robotics", areaConfidence: 0.95 });
  });

  it("preserves ambiguity and never fabricates a deadline", async () => {
    const [result] = await parser.parse({ text: "Finish history essay next week", timezone: "UTC" });
    expect(result.dueAt).toBeNull();
    expect(result.ambiguousDateText).toBe("next week");
    expect(result.missingFields).toContain("dueAt");
    expect(result.warnings[0]).toContain("next week");
  });

  it("resolves a relative deadline against the supplied time and timezone", () => {
    const [result] = resolveRelativeAssignments(
      [
        {
          title: "Calculus worksheet",
          area: "school",
          areaConfidence: 0.9,
          course: "Calculus",
          activityLabel: null,
          dueAt: null,
          ambiguousDateText: "due tomorrow at 8:00 AM",
          estimatedMinutes: 45,
          priority: "medium",
          taskType: "assignment",
          dependencies: [],
          notes: null,
          confidence: 0.7,
          missingFields: ["dueAt"],
          warnings: ["Ambiguous due date"],
        },
      ],
      {
        text: "Calculus worksheet due tomorrow at 8:00 AM",
        timezone: "America/Chicago",
        referenceTime: "2026-08-30T21:00:00.000Z",
      },
    );
    expect(result.dueAt).toBe("2026-08-31T13:00:00.000Z");
    expect(result.ambiguousDateText).toBeNull();
    expect(result.missingFields).not.toContain("dueAt");
    expect(result.warnings).toEqual([]);
  });

  it("applies 'everything is due tomorrow' to every relevant task", async () => {
    const input = {
      text: "Math worksheet 30 minutes\nHistory outline 45 minutes\nEverything is due tomorrow",
      timezone: "America/Chicago",
      referenceTime: "2026-08-30T21:00:00.000Z",
    };
    const results = applyBrainDumpContext(await parser.parse(input), input);
    expect(results).toHaveLength(2);
    expect(results.every((item) => item.dueAt === "2026-09-01T04:59:00.000Z")).toBe(true);
  });

  it("resolves task and project context without requiring an explicit time", async () => {
    const input = {
      text: "Research sources 60 minutes\nDraft report 2 hours\nThis project is due next week",
      timezone: "America/Chicago",
      referenceTime: "2026-08-30T21:00:00.000Z",
    };
    const results = applyBrainDumpContext(await parser.parse(input), input);
    expect(results).toHaveLength(2);
    expect(results.every((item) => item.dueAt === "2026-09-05T04:59:00.000Z")).toBe(true);
  });
});
