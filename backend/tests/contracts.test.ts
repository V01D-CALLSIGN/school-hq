import { describe, expect, it } from "vitest";
import { brainDumpSchema, createAssignmentInputSchema, generatePlanInputSchema, parseBrainDumpInputSchema, schedulingPreferencesSchema, studyWindowSchema, updateAssignmentInputSchema } from "@/lib/contracts";

describe("shared schemas", () => {
  it("rejects invalid IANA timezones", () => {
    expect(() => parseBrainDumpInputSchema.parse({ text: "Essay", timezone: "Moon/Base" })).toThrow();
  });

  it("reports an invalid window boundary", () => {
    const result = studyWindowSchema.safeParse({
      id: "00000000-0000-4000-a000-000000000001", startsAt: "2026-08-28T10:00:00Z",
      endsAt: "2026-08-28T09:00:00Z", label: null, createdAt: "2026-08-28T00:00:00Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["endsAt"]);
  });

  it("applies scheduling defaults", () => {
    expect(schedulingPreferencesSchema.parse({ timezone: "America/Chicago" }).defaultBlockMinutes).toBe(45);
  });

  it("accepts Ollama as a persisted parser provider", () => {
    expect(brainDumpSchema.shape.parser.parse("ollama")).toBe("ollama");
  });

  it("defaults existing assignment creation contracts to school without requiring a fake course", () => {
    const base = {
      courseId: null, title: "Plan work", dueAt: null, estimatedMinutes: 30, priority: "medium" as const,
      taskType: "other" as const, dependencyIds: [], notes: null, status: "confirmed" as const,
    };
    expect(createAssignmentInputSchema.parse(base)).toMatchObject({ area: "school", activityLabel: null });
    expect(createAssignmentInputSchema.parse({ ...base, area: "extracurricular", activityLabel: "Team" })).toMatchObject({ courseId: null });
    expect(() => createAssignmentInputSchema.parse({ ...base, area: "extracurricular", courseId: "00000000-0000-4000-a000-000000000001" })).toThrow();
    expect(updateAssignmentInputSchema.parse({ id: "00000000-0000-4000-a000-000000000002", area: "extracurricular" })).toMatchObject({ area: "extracurricular" });
  });

  it("preserves combined planning when the optional area filter is absent", () => {
    const base = { rangeStart: "2026-08-28T00:00:00Z", rangeEnd: "2026-08-29T00:00:00Z", timezone: "UTC" };
    expect(generatePlanInputSchema.parse(base).area).toBeUndefined();
    expect(generatePlanInputSchema.parse({ ...base, area: "extracurricular" }).area).toBe("extracurricular");
  });
});
