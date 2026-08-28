import { describe, expect, it } from "vitest";
import { brainDumpSchema, parseBrainDumpInputSchema, schedulingPreferencesSchema, studyWindowSchema } from "@/lib/contracts";

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
});
