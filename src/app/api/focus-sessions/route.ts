import { createFocusSessionInputSchema, focusSessionSchema, success, updateFocusSessionInputSchema, type FocusSession } from "@/lib/contracts";
import { applyFocusTransition } from "@/lib/focus/transitions";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { HttpError, readJson, toErrorResponse } from "@/lib/server/errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createFocusSessionInputSchema.parse(await readJson(request));
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
