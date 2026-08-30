import { randomUUID } from "node:crypto";
import {
  assignmentSchema, calendarEventSchema, generatePlanInputSchema, schedulingPreferencesSchema,
  studyWindowSchema, success, type StudyPlan,
} from "@/lib/contracts";
import { generateSchedule } from "@/lib/scheduling/engine";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, normalizePreferences } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = generatePlanInputSchema.parse(await readJson(request));
    let assignmentsQuery = supabase.from("assignments").select("*").in("status", ["confirmed", "in_progress"]);
    if (input.area) assignmentsQuery = assignmentsQuery.eq("area", input.area);
    if (input.assignmentIds) assignmentsQuery = assignmentsQuery.in("id", input.assignmentIds);
    const [assignmentsResult, windowsResult, eventsResult, preferencesResult, activePlansResult] = await Promise.all([
      assignmentsQuery,
      supabase.from("study_windows").select("*").lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart),
      supabase.from("calendar_events").select("*").neq("classification", "ignored").lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart),
      supabase.from("scheduling_preferences").select("*").single(),
      supabase.from("study_plans").select("id").eq("status", "active").lt("range_start", input.rangeEnd).gt("range_end", input.rangeStart),
    ]);
    const assignments = assignmentSchema.array().parse(camelize(assertDb(assignmentsResult)));
    const studyWindows = studyWindowSchema.array().parse(camelize(assertDb(windowsResult)));
    const calendarEvents = calendarEventSchema.array().parse(camelize(assertDb(eventsResult)));
    const preferences = schedulingPreferencesSchema.parse({ ...normalizePreferences<Record<string, unknown>>(assertDb(preferencesResult)), timezone: input.timezone });
    const effectiveWindows = [
      ...studyWindows,
      ...calendarEvents.filter((event) => event.classification === "study_available").map((event) => ({ startsAt: event.startsAt, endsAt: event.endsAt })),
    ];
    const activePlanIds = assertDb<Array<{ id: string }>>(activePlansResult).map(({ id }) => id);
    const activeBlocks = activePlanIds.length
      ? assertDb<Array<{ starts_at: string; ends_at: string }>>(await supabase.from("plan_blocks").select("starts_at,ends_at").in("study_plan_id", activePlanIds).lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart))
      : [];
    const blockers = activeBlocks.map((block) => ({
      startsAt: block.starts_at,
      endsAt: block.ends_at,
      classification: "busy" as const,
    }));
    const planId = randomUUID();
    const generated = generateSchedule({ assignments, studyWindows: effectiveWindows, calendarEvents: [...calendarEvents, ...blockers], lockedBlocks: [], preferences, ...input, planId });
    const planRow = assertDb(await supabase.from("study_plans").insert({
      id: planId, user_id: user.id, range_start: input.rangeStart, range_end: input.rangeEnd,
      timezone: input.timezone, area_filter: input.area ?? "combined", status: "draft", unscheduled_tasks: generated.unscheduledTasks,
    }).select().single());
    try {
      const newBlocks = generated.blocks.map((block) => ({
        id: block.id, user_id: user.id, study_plan_id: planId, assignment_id: block.assignmentId,
        starts_at: block.startsAt, ends_at: block.endsAt, locked: false, kind: block.kind, sequence: block.sequence,
      }));
      if (newBlocks.length) assertDb(await supabase.from("plan_blocks").insert(newBlocks).select("id"));
    } catch (error) {
      await supabase.from("study_plans").delete().eq("id", planId);
      throw error;
    }
    const plan = camelize<StudyPlan>(planRow);
    return success({ ...plan, blocks: generated.blocks, unscheduledTasks: generated.unscheduledTasks }, { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}
