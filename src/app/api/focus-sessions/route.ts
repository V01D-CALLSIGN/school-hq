import { createFocusSessionInputSchema, focusSessionSchema, success, updateFocusSessionInputSchema, type FocusSession } from "@/lib/contracts";
import { applyFocusTransition } from "@/lib/focus/transitions";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { HttpError, readJson, toErrorResponse } from "@/lib/server/errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createFocusSessionInputSchema.parse(await readJson(request));
    let blockAssignmentId: string | null = null;
    if (input.planBlockId) {
      const { data, error } = await supabase.from("plan_blocks").select("assignment_id").eq("id", input.planBlockId).maybeSingle();
      if (error || !data) throw new HttpError(422, "INVALID_PLAN_BLOCK", "Plan block must reference one of your blocks", [{ path: "planBlockId", message: "References an inaccessible block" }]);
      blockAssignmentId = data.assignment_id as string | null;
    }
    if (input.assignmentId) {
      const { data, error } = await supabase.from("assignments").select("id").eq("id", input.assignmentId).maybeSingle();
      if (error || !data) throw new HttpError(422, "INVALID_ASSIGNMENT", "Assignment must reference one of your assignments", [{ path: "assignmentId", message: "References an inaccessible assignment" }]);
    }
    if (input.assignmentId && blockAssignmentId && input.assignmentId !== blockAssignmentId) {
      throw new HttpError(422, "FOCUS_TARGET_MISMATCH", "Assignment and plan block must refer to the same work");
    }
    if (input.startedAt && Date.parse(input.startedAt) > Date.now() + 5 * 60_000) {
      throw new HttpError(422, "INVALID_START_TIME", "Focus session cannot start in the future", [{ path: "startedAt", message: "Must not be in the future" }]);
    }
    const row = assertDb(await supabase.from("focus_sessions").insert({
      user_id: user.id, assignment_id: input.assignmentId ?? null, plan_block_id: input.planBlockId ?? null,
      planned_duration_minutes: input.plannedDurationMinutes, started_at: input.startedAt ?? new Date().toISOString(), status: "running",
    }).select().single());
    return success(focusSessionSchema.parse(camelize(row)), { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const input = updateFocusSessionInputSchema.parse(await readJson(request));
    const existing = focusSessionSchema.parse(camelize<FocusSession>(assertDb(
      await supabase.from("focus_sessions").select("*").eq("id", input.id).single(),
    )));
    const updates = applyFocusTransition(existing, input.action, input.occurredAt);
    const row = assertDb(await supabase.from("focus_sessions").update(snakeize(updates)).eq("id", input.id).select().single());
    return success(focusSessionSchema.parse(camelize(row)));
  } catch (error) { return toErrorResponse(error); }
}
