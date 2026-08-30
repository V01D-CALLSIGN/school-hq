import type { NormalizedCalendarEvent } from "@/lib/calendar/parser";

const normalizeTitle = (title: string) =>
  title.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/**
 * Imported calendars use event titles as a small, deterministic convention:
 * study time/block events are scheduling windows; everything else is busy.
 * STGUDY intentionally supports the spelling used by the user's calendar.
 */
export function classifyImportedCalendarEvent(
  event: NormalizedCalendarEvent,
): NormalizedCalendarEvent {
  const title = normalizeTitle(event.title);
  const isStudyWindow =
    /\b(?:STUDY|STGUDY)\b/.test(title) &&
    /\b(?:TIME|BLOCK|BLOCKS)\b/.test(title);
  const isExtracurricular = /\b(?:EC|EXTRACURRICULAR)\b/.test(title);

  return {
    ...event,
    classification: isStudyWindow ? "study_available" : "busy",
    area: isExtracurricular ? "extracurricular" : "school",
  };
}
