import { studyPlanSchema, success, updatePlanInputSchema, uuidSchema, type PlanBlock, type StudyPlan } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
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
    if (input.status) assertDb(await supabase.from("study_plans").update({ status: input.status }).eq("id", id).select("id").single());
    for (const block of input.blocks ?? []) {
      assertDb(await supabase.from("plan_blocks").update({ locked: block.locked }).eq("study_plan_id", id).eq("id", block.id).select("id").single());
    }
    return GET(request, { params: Promise.resolve({ id }) });
  } catch (error) { return toErrorResponse(error); }
}
