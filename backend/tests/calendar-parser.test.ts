import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashCalendarSource, parseCalendar } from "@/lib/calendar/parser";

const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");
const range = { start: new Date("2026-08-01T00:00:00Z"), end: new Date("2026-12-01T00:00:00Z") };

describe("calendar normalization", () => {
  it("expands recurrence and applies exclusions", () => {
    const events = parseCalendar(fixture("recurring-classes.ics"), range);
    expect(events).toHaveLength(2);
    expect(events.some((event) => event.startsAt.startsWith("2026-08-31"))).toBe(false);
    expect(events.some((event) => event.startsAt.startsWith("2026-09-07"))).toBe(false);
  });

  it("preserves local wall time across daylight saving", () => {
    const events = parseCalendar(fixture("daylight-saving.ics"), range);
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.startsAt)).toEqual([
      "2026-10-26T14:00:00.000Z", "2026-11-02T15:00:00.000Z", "2026-11-09T15:00:00.000Z",
    ]);
  });

  it("normalizes all-day events and skips cancelled events", () => {
    expect(parseCalendar(fixture("all-day.ics"), range)[0].allDay).toBe(true);
    expect(parseCalendar(fixture("cancelled.ics"), range)).toEqual([]);
  });

  it("produces stable source hashes and occurrence keys for duplicate imports", () => {
    const content = fixture("recurring-classes.ics");
    expect(hashCalendarSource(content)).toBe(hashCalendarSource(content));
    expect(parseCalendar(content, range)).toEqual(parseCalendar(content, range));
  });

  it("rejects malformed calendars safely", () => {
    expect(() => parseCalendar("not an ics file", range)).toThrowError(/valid iCalendar/);
  });
});
