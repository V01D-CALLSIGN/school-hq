import { calendarClassificationSchema, success, type CalendarEvent, type CalendarImport } from "@/lib/contracts";
import { hashCalendarSource, MAX_ICS_BYTES, parseCalendar } from "@/lib/calendar/parser";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { HttpError, toErrorResponse } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Use multipart/form-data with an .ics file");
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_ICS_BYTES + 100_000) throw new HttpError(413, "CALENDAR_TOO_LARGE", "Calendar upload exceeds the size limit");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".ics")) throw new HttpError(422, "INVALID_FILE", "An .ics file is required");
    if (file.name.length > 200) throw new HttpError(422, "INVALID_FILE", "Calendar filename is too long");
    if (file.size > MAX_ICS_BYTES) throw new HttpError(413, "CALENDAR_TOO_LARGE", "Calendar file exceeds 1 MB");
    const classification = calendarClassificationSchema.parse(form.get("classification") ?? "busy");
    const content = await file.text();
    const sourceHash = hashCalendarSource(content);
    const parsed = parseCalendar(content).map((event) => ({ ...event, classification }));
    const importRow = assertDb<Record<string, unknown> & { id: string }>(await supabase.from("calendar_imports").upsert({
      user_id: user.id, source_name: file.name, source_hash: sourceHash, event_count: parsed.length, imported_at: new Date().toISOString(),
    }, { onConflict: "user_id,source_name" }).select().single());
    const importId = importRow.id;
    const rows = parsed.map((event) => ({
      source_uid: event.sourceUid,
      recurrence_id: event.recurrenceId ?? "", title: event.title, description: event.description,
      location: event.location, starts_at: event.startsAt, ends_at: event.endsAt,
      all_day: event.allDay, classification: event.classification, original_timezone: event.originalTimezone,
    }));
    const events = assertDb(await supabase.rpc("replace_calendar_events", { p_import_id: importId, p_events: rows }));
    return success({ import: camelize<CalendarImport>(importRow), events: camelize<CalendarEvent[]>(events) }, { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}
