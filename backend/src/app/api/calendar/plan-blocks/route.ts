import { z } from "zod";
import { isoDateTimeSchema, success, uuidSchema } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { HttpError, readJson, toErrorResponse } from "@/lib/server/errors";

const editSchema = z.object({
  id: uuidSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
}).refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
  path: ["endsAt"], message: "endsAt must be after startsAt",
});
const deleteSchema = z.object({ id: uuidSchema });

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const input = editSchema.parse(await readJson(request));
    const current = assertDb<{ study_plan_id: string }>(
      await supabase.from("plan_blocks").select("study_plan_id").eq("id", input.id).single(),
    );
    const plan = assertDb<{ range_start: string; range_end: string }>(
      await supabase.from("study_plans").select("range_start,range_end").eq("id", current.study_plan_id).single(),
    );
    if (Date.parse(input.startsAt) < Date.parse(plan.range_start) || Date.parse(input.endsAt) > Date.parse(plan.range_end)) {
      throw new HttpError(422, "INVALID_PLAN_BLOCK", "The work block must stay inside its plan range");
    }
    const block = assertDb(await supabase.from("plan_blocks").update({
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      locked: true,
    }).eq("id", input.id).select("*").single());
    return success(camelize(block));
  } catch (error) { return toErrorResponse(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id } = deleteSchema.parse(await readJson(request));
    assertDb(await supabase.from("plan_blocks").delete().eq("id", id).select("id").single());
    return success({ id });
  } catch (error) { return toErrorResponse(error); }
}
