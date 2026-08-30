import { describe, expect, it } from "vitest";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/date-time";

describe("local datetime inputs", () => {
  it("round trips an API timestamp without shifting the selected local time", () => {
    const timestamp = "2026-08-31T13:00:00.000Z";
    expect(fromDateTimeLocalValue(toDateTimeLocalValue(timestamp))).toBe(
      timestamp,
    );
  });
});
