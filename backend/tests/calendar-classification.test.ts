import { describe, expect, it } from "vitest";
import { classifyImportedCalendarEvent } from "@/lib/calendar/classification";
import type { NormalizedCalendarEvent } from "@/lib/calendar/parser";

const event = (title: string): NormalizedCalendarEvent => ({
  sourceUid: title,
  recurrenceId: null,
  title,
  description: null,
  location: null,
  startsAt: "2026-08-31T20:00:00.000Z",
  endsAt: "2026-08-31T21:00:00.000Z",
  allDay: false,
  classification: "busy",
  area: "school",
  originalTimezone: "America/Chicago",
});

describe("imported calendar title classification", () => {
  it.each([
    ["EC STUDY TIME", "extracurricular"],
    ["SCHOOL STUDY BLOCK", "school"],
    ["SCHOOL STGUDY BLOCK", "school"],
  ] as const)("uses %s as an available %s window", (title, area) => {
    expect(classifyImportedCalendarEvent(event(title))).toMatchObject({
      classification: "study_available",
      area,
    });
  });

  it.each([
    ["Lunch break", "school"],
    ["EC BREAK", "extracurricular"],
    ["Calculus", "school"],
  ] as const)("keeps %s as a busy %s event", (title, area) => {
    expect(classifyImportedCalendarEvent(event(title))).toMatchObject({
      classification: "busy",
      area,
    });
  });
});
