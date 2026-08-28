import { DateTime } from "luxon";
import { success, timezoneSchema, type CalendarEvent } from "@/lib/contracts";
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
    const rows = assertDb(await supabase.from("calendar_events").select("*")
      .lt("starts_at", end.toUTC().toISO()).gt("ends_at", start.toUTC().toISO()).neq("classification", "ignored").order("starts_at"));
    return success(camelize<CalendarEvent[]>(rows), { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) { return toErrorResponse(error); }
}
