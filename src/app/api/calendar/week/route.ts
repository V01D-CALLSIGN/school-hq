import { DateTime } from "luxon";
import { areaSchema, calendarEventSchema, success, timezoneSchema, type CalendarEvent } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { HttpError, toErrorResponse } from "@/lib/server/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const timezone = timezoneSchema.parse(url.searchParams.get("timezone") ?? "UTC");
    const requested = url.searchParams.get("start");
    const anchor = requested ? DateTime.fromISO(requested, { zone: timezone }) : DateTime.now().setZone(timezone);
    if (!anchor.isValid) throw new HttpError(422, "VALIDATION_ERROR", "start must be an ISO date or timestamp");
    const start = anchor.startOf("week");
    const end = start.plus({ weeks: 1 });
    let query = supabase.from("calendar_events").select("*")
      .lt("starts_at", end.toUTC().toISO()).gt("ends_at", start.toUTC().toISO()).neq("classification", "ignored").order("starts_at");
    const area = url.searchParams.get("area");
    if (area) query = query.eq("area", areaSchema.parse(area));
    const rows = assertDb(await query);
    const events = camelize<CalendarEvent[]>(rows).map((event) => calendarEventSchema.parse({
      ...event, recurrenceId: event.recurrenceId || null,
    }));
    return success(events, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) { return toErrorResponse(error); }
}
