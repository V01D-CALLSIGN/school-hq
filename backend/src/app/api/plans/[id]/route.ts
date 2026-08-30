import { studyPlanSchema, success, updatePlanInputSchema, uuidSchema, type PlanBlock, type StudyPlan } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { validatePlanBlockEdits } from "@/lib/plans/validation";
import { readJson, toErrorResponse } from "@/lib/server/errors";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const id = uuidSchema.parse((await context.params).id);
    const [planResult, blocksResult] = await Promise.all([
      supabase.from("study_plans").select("*").eq("id", id).single(),
      supabase.from("plan_blocks").select("*").eq("study_plan_id", id).order("starts_at"),
    ]);
    const plan = camelize<StudyPlan>(assertDb(planResult));
    return success(studyPlanSchema.parse({ ...plan, blocks: camelize<PlanBlock[]>(assertDb(blocksResult)) }));
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const id = uuidSchema.parse((await context.params).id);
    const input = updatePlanInputSchema.parse(await readJson(request));
    const [planResult, blocksResult] = await Promise.all([
      supabase.from("study_plans").select("*").eq("id", id).single(),
      supabase.from("plan_blocks").select("*").eq("study_plan_id", id),
    ]);
    const plan = camelize<StudyPlan>(assertDb(planResult));
    const blocks = camelize<PlanBlock[]>(assertDb(blocksResult));
    validatePlanBlockEdits(plan, blocks, input.blocks ?? []);
    const result = await supabase.rpc("apply_plan_edits", {
      p_plan_id: id,
      p_status: input.status ?? null,
      p_blocks: (input.blocks ?? []).map((block) => snakeize(block)),
    });
    assertDb({ data: true, error: result.error });
    return GET(request, { params: Promise.resolve({ id }) });
  } catch (error) { return toErrorResponse(error); }
}
