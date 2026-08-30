import { DateTime } from "luxon";
import { statsSummarySchema, success, timezoneSchema, type Area } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { toErrorResponse } from "@/lib/server/errors";
import { summarizeByArea, type AssignmentStatRow, type FocusStatRow, type PlanStatRow } from "@/lib/stats/summary";

type AreaRelation = { area?: Area } | Array<{ area?: Area }> | null;
const relationArea = (relation: AreaRelation): Area | null => {
  const value = Array.isArray(relation) ? relation[0]?.area : relation?.area;
  return value === "school" || value === "extracurricular" ? value : null;
};

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const timezone = timezoneSchema.parse(url.searchParams.get("timezone") ?? "UTC");
    const now = DateTime.now().setZone(timezone);
    const weekStart = now.startOf("week").toUTC().toISO();
    const weekEnd = now.endOf("week").toUTC().toISO();
    const [assignments, sessions, blocks] = await Promise.all([
      supabase.from("assignments").select("area,status,due_at"),
      supabase.from("focus_sessions").select("started_at,completed_at,accumulated_pause_seconds,assignment:assignments!sessions_assignment_owner_fk(area),plan_block:plan_blocks!sessions_block_owner_fk(assignment:assignments!blocks_assignment_owner_fk(area))").eq("status", "completed").gte("started_at", weekStart).lte("started_at", weekEnd),
      supabase.from("plan_blocks").select("starts_at,ends_at,assignment:assignments!blocks_assignment_owner_fk(area)").eq("kind", "work").gte("starts_at", weekStart).lte("starts_at", weekEnd),
    ]);
    const assignmentRows = camelize<AssignmentStatRow[]>(assertDb(assignments));
    const sessionRows = (assertDb(sessions) as Array<Record<string, unknown>>).map((row) => ({
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | null,
      accumulatedPauseSeconds: row.accumulated_pause_seconds as number,
      area: relationArea(row.assignment as AreaRelation)
        ?? relationArea((row.plan_block as { assignment?: AreaRelation } | null)?.assignment ?? null),
    } satisfies FocusStatRow));
    const blockRows = (assertDb(blocks) as Array<Record<string, unknown>>).map((row) => ({
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      area: relationArea(row.assignment as AreaRelation),
    } satisfies PlanStatRow));
    const generatedAt = new Date();
    return success(statsSummarySchema.parse({
      ...summarizeByArea(assignmentRows, sessionRows, blockRows, generatedAt.getTime()),
      generatedAt: generatedAt.toISOString(), timezone,
    }));
  } catch (error) { return toErrorResponse(error); }
}
