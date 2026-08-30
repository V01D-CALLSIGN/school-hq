import { schedulingPreferencesSchema, success, updateSchedulingPreferencesInputSchema, type SchedulingPreferences } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, normalizePreferences, snakeize } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const row = assertDb(await supabase.from("scheduling_preferences").select("*").single());
    return success(schedulingPreferencesSchema.parse(normalizePreferences<SchedulingPreferences>(row)));
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const input = updateSchedulingPreferencesInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("scheduling_preferences").update(snakeize(input)).select("*").single());
    return success(schedulingPreferencesSchema.parse(normalizePreferences<SchedulingPreferences>(row)));
  } catch (error) { return toErrorResponse(error); }
}
