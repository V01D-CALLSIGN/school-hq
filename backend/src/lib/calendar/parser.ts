import ICAL from "ical.js";
import { createHash } from "node:crypto";
import type { CalendarEvent } from "@/lib/contracts";
import { HttpError } from "@/lib/server/errors";

export const MAX_ICS_BYTES = 1_000_000;
export const MAX_CALENDAR_EVENTS = 5_000;
const MAX_RECURRENCE_ITERATIONS = 20_000;

export type NormalizedCalendarEvent = Omit<CalendarEvent, "id" | "calendarImportId" | "planBlockId" | "assignmentId">;

const limited = (value: string | null | undefined, max: number): string | null => value ? value.slice(0, max) : null;

function jsDate(time: ICAL.Time): Date {
  return time.toJSDate();
}

export function hashCalendarSource(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function parseCalendar(
  content: string,
  range = { start: new Date(Date.now() - 366 * 86_400_000), end: new Date(Date.now() + 2 * 366 * 86_400_000) },
): NormalizedCalendarEvent[] {
  if (Buffer.byteLength(content, "utf8") > MAX_ICS_BYTES) throw new HttpError(413, "CALENDAR_TOO_LARGE", "Calendar file exceeds 1 MB");
  if (!/^BEGIN:VCALENDAR\r?$/m.test(content) || !/^END:VCALENDAR\r?$/m.test(content)) {
    throw new HttpError(422, "INVALID_CALENDAR", "File is not a valid iCalendar document");
  }
  try {
    const calendar = new ICAL.Component(ICAL.parse(content));
    for (const zoneComponent of calendar.getAllSubcomponents("vtimezone")) {
      const timezone = new ICAL.Timezone(zoneComponent);
      ICAL.TimezoneService.register(timezone);
    }
    const components = calendar.getAllSubcomponents("vevent");
    if (components.length > MAX_CALENDAR_EVENTS) {
      throw new HttpError(413, "TOO_MANY_EVENTS", "Calendar contains more than 5,000 events");
    }
    const overrides = new Map<string, ICAL.Component>();
    for (const component of components) {
      const recurrenceId = component.getFirstPropertyValue("recurrence-id") as ICAL.Time | null;
      const uid = component.getFirstPropertyValue("uid") as string | null;
      if (recurrenceId && uid) overrides.set(`${uid}|${recurrenceId.toString()}`, component);
    }
    const normalized: NormalizedCalendarEvent[] = [];
    for (const component of components) {
      if (component.getFirstPropertyValue("recurrence-id")) continue;
      if (component.getFirstPropertyValue("status") === "CANCELLED") continue;
      const event = new ICAL.Event(component);
      if (!event.uid || !event.startDate || !event.endDate) continue;
      const durationSeconds = event.endDate.subtractDate(event.startDate).toSeconds();
      const exdates = new Set(component.getAllProperties("exdate").flatMap((property) => {
        const values = property.getValues() as ICAL.Time[];
        return values.map((value) => value.toString());
      }));
      const occurrences: ICAL.Time[] = [];
      if (event.isRecurring()) {
        const iterator = event.iterator();
        let occurrence: ICAL.Time | null;
        let iterations = 0;
        while ((occurrence = iterator.next())) {
          iterations += 1;
          if (iterations > MAX_RECURRENCE_ITERATIONS) {
            throw new HttpError(413, "TOO_MANY_EVENTS", "Calendar recurrence is too large to import safely");
          }
          const date = jsDate(occurrence);
          if (date >= range.end) break;
          if (date >= range.start && !exdates.has(occurrence.toString())) occurrences.push(occurrence.clone());
          if (occurrences.length > MAX_CALENDAR_EVENTS) throw new HttpError(413, "TOO_MANY_EVENTS", "Calendar expands beyond 5,000 events");
        }
      } else if (jsDate(event.endDate) > range.start && jsDate(event.startDate) < range.end) {
        occurrences.push(event.startDate);
      }
      for (const occurrence of occurrences) {
        const recurrenceId = event.isRecurring() ? occurrence.toString() : null;
        const overrideComponent = recurrenceId ? overrides.get(`${event.uid}|${recurrenceId}`) : undefined;
        if (overrideComponent?.getFirstPropertyValue("status") === "CANCELLED") continue;
        const occurrenceEvent = overrideComponent ? new ICAL.Event(overrideComponent) : event;
        const start = overrideComponent ? jsDate(occurrenceEvent.startDate) : jsDate(occurrence);
        const end = overrideComponent ? jsDate(occurrenceEvent.endDate) : new Date(start.getTime() + durationSeconds * 1000);
        normalized.push({
          sourceUid: event.uid.slice(0, 500),
          recurrenceId,
          title: (occurrenceEvent.summary || "Untitled event").slice(0, 500),
          description: limited(occurrenceEvent.description, 5000),
          location: limited(occurrenceEvent.location, 500),
          startsAt: start.toISOString(), endsAt: end.toISOString(), allDay: occurrence.isDate,
          classification: "busy", area: "school", originalTimezone: limited(occurrence.zone?.tzid, 100),
        });
        if (normalized.length > MAX_CALENDAR_EVENTS) {
          throw new HttpError(413, "TOO_MANY_EVENTS", "Calendar expands beyond 5,000 events");
        }
      }
    }
    return normalized.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.sourceUid.localeCompare(b.sourceUid));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("Calendar parse error", error);
    throw new HttpError(422, "INVALID_CALENDAR", "Calendar file is malformed or unsupported");
  }
}
