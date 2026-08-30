import { DateTime } from "luxon";
import { areaSchema, calendarEventSchema, success, timezoneSchema, type CalendarEvent } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { HttpError, toErrorResponse } from "@/lib/server/errors";
import { planBlocksToCalendarEvents } from "@/lib/calendar/plan-events";

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
    const requestedArea = url.searchParams.get("area");
    const area = requestedArea ? areaSchema.parse(requestedArea) : undefined;
    if (area) query = query.eq("area", area);
    const rows = assertDb(await query);
    const events = camelize<CalendarEvent[]>(rows).map((event) => calendarEventSchema.parse({
      ...event, recurrenceId: event.recurrenceId || null,
    }));
    const plans = assertDb<Array<{ id: string; timezone: string }>>(
      await supabase.from("study_plans").select("id,timezone").eq("status", "active")
        .lt("range_start", end.toUTC().toISO()).gt("range_end", start.toUTC().toISO()),
    );
    let plannedEvents: CalendarEvent[] = [];
    if (plans.length) {
      const planIds = plans.map(({ id }) => id);
      const blocks = assertDb<Array<{ id: string; study_plan_id: string; assignment_id: string; starts_at: string; ends_at: string }>>(
        await supabase.from("plan_blocks").select("id,study_plan_id,assignment_id,starts_at,ends_at")
          .in("study_plan_id", planIds).eq("kind", "work").not("assignment_id", "is", null)
          .lt("starts_at", end.toUTC().toISO()).gt("ends_at", start.toUTC().toISO()),
      );
      const assignmentIds = [...new Set(blocks.map((block) => block.assignment_id))];
      const assignments = assignmentIds.length
        ? assertDb<Array<{ id: string; title: string; area: "school" | "extracurricular"; status: string }>>(
            await supabase.from("assignments").select("id,title,area,status").in("id", assignmentIds),
          )
        : [];
      plannedEvents = planBlocksToCalendarEvents(plans, blocks, assignments, timezone, area);
    }
    return success([...events, ...plannedEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  } catch (error) { return toErrorResponse(error); }
}
