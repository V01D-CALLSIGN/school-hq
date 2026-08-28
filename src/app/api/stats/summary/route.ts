import { DateTime } from "luxon";
import { success, timezoneSchema } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb } from "@/lib/server/db";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const timezone = timezoneSchema.parse(url.searchParams.get("timezone") ?? "UTC");
    const now = DateTime.now().setZone(timezone);
    const weekStart = now.startOf("week").toUTC().toISO();
    const weekEnd = now.endOf("week").toUTC().toISO();
    const [assignments, sessions, blocks] = await Promise.all([
      supabase.from("assignments").select("status,due_at,priority"),
      supabase.from("focus_sessions").select("started_at,completed_at,accumulated_pause_seconds").eq("status", "completed").gte("started_at", weekStart).lte("started_at", weekEnd),
      supabase.from("plan_blocks").select("starts_at,ends_at").eq("kind", "work").gte("starts_at", weekStart).lte("starts_at", weekEnd),
    ]);
    const assignmentRows = assertDb(assignments) as Array<{ status: string; due_at: string | null; priority: string }>;
    const sessionRows = assertDb(sessions) as Array<{ started_at: string; completed_at: string | null; accumulated_pause_seconds: number }>;
    const blockRows = assertDb(blocks) as Array<{ starts_at: string; ends_at: string }>;
    const focusedSeconds = sessionRows.reduce((total, session) => total + Math.max(0,
      ((session.completed_at ? Date.parse(session.completed_at) : Date.now()) - Date.parse(session.started_at)) / 1000 - session.accumulated_pause_seconds,
    ), 0);
    return success({
      assignments: {
        incomplete: assignmentRows.filter((item) => !["completed", "archived"].includes(item.status)).length,
        completed: assignmentRows.filter((item) => item.status === "completed").length,
        overdue: assignmentRows.filter((item) => item.due_at && Date.parse(item.due_at) < Date.now() && !["completed", "archived"].includes(item.status)).length,
      },
      focus: { completedSessionsThisWeek: sessionRows.length, focusedMinutesThisWeek: Math.floor(focusedSeconds / 60) },
      plan: { scheduledMinutesThisWeek: Math.round(blockRows.reduce((total, block) => total + Date.parse(block.ends_at) - Date.parse(block.starts_at), 0) / 60_000) },
      generatedAt: new Date().toISOString(), timezone,
    });
  } catch (error) { return toErrorResponse(error); }
}
