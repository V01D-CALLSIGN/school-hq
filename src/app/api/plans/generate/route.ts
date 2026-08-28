import { randomUUID } from "node:crypto";
import {
  assignmentSchema, calendarEventSchema, generatePlanInputSchema, schedulingPreferencesSchema,
  studyWindowSchema, success, type PlanBlock, type StudyPlan,
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
    const [assignmentsResult, windowsResult, eventsResult, lockedResult, preferencesResult] = await Promise.all([
      assignmentsQuery,
      supabase.from("study_windows").select("*").lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart),
      supabase.from("calendar_events").select("*").neq("classification", "ignored").lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart),
      supabase.from("plan_blocks").select("*").eq("locked", true).lt("starts_at", input.rangeEnd).gt("ends_at", input.rangeStart),
      supabase.from("scheduling_preferences").select("*").single(),
    ]);
    const assignments = assignmentSchema.array().parse(camelize(assertDb(assignmentsResult)));
    const studyWindows = studyWindowSchema.array().parse(camelize(assertDb(windowsResult)));
    const calendarEvents = calendarEventSchema.array().parse(camelize(assertDb(eventsResult)));
    const effectiveWindows = [
      ...studyWindows,
      ...calendarEvents.filter((event) => event.classification === "study_available").map((event) => ({ startsAt: event.startsAt, endsAt: event.endsAt })),
    ];
    const lockedBlocks = camelize<PlanBlock[]>(assertDb(lockedResult));
    const preferences = schedulingPreferencesSchema.parse({ ...normalizePreferences<Record<string, unknown>>(assertDb(preferencesResult)), timezone: input.timezone });
    const planId = randomUUID();
    const generated = generateSchedule({ assignments, studyWindows: effectiveWindows, calendarEvents, lockedBlocks, preferences, ...input, planId });
    const planRow = assertDb(await supabase.from("study_plans").insert({
      id: planId, user_id: user.id, range_start: input.rangeStart, range_end: input.rangeEnd,
      timezone: input.timezone, area_filter: input.area ?? "combined", status: "draft", unscheduled_tasks: generated.unscheduledTasks,
    }).select().single());
    try {
      const newBlocks = generated.blocks.filter((block) => !block.locked).map((block) => ({
        id: block.id, user_id: user.id, study_plan_id: planId, assignment_id: block.assignmentId,
        starts_at: block.startsAt, ends_at: block.endsAt, locked: false, kind: block.kind, sequence: block.sequence,
      }));
      if (newBlocks.length) assertDb(await supabase.from("plan_blocks").insert(newBlocks).select("id"));
      for (const locked of lockedBlocks) {
        assertDb(await supabase.from("plan_blocks").update({ study_plan_id: planId }).eq("id", locked.id).select("id").single());
      }
    } catch (error) {
      await supabase.from("study_plans").delete().eq("id", planId);
      throw error;
    }
    const plan = camelize<StudyPlan>(planRow);
    return success({ ...plan, blocks: generated.blocks, unscheduledTasks: generated.unscheduledTasks }, { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}
