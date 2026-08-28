import { createStudyWindowInputSchema, deleteByIdInputSchema, studyWindowSchema, success, updateStudyWindowInputSchema, type StudyWindow } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    let query = supabase.from("study_windows").select("*").order("starts_at");
    if (url.searchParams.get("from")) query = query.gte("ends_at", url.searchParams.get("from")!);
    if (url.searchParams.get("to")) query = query.lte("starts_at", url.searchParams.get("to")!);
    return success(camelize<StudyWindow[]>(assertDb(await query)));
  } catch (error) { return toErrorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createStudyWindowInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("study_windows").insert({ user_id: user.id, ...snakeize(input) }).select().single());
    return success(studyWindowSchema.parse(camelize(row)), { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id, ...updates } = updateStudyWindowInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("study_windows").update(snakeize(updates)).eq("id", id).select().single());
    return success(studyWindowSchema.parse(camelize(row)));
  } catch (error) { return toErrorResponse(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id } = deleteByIdInputSchema.parse(await readJson(request));
    assertDb(await supabase.from("study_windows").delete().eq("id", id).select("id").single());
    return success({ id });
  } catch (error) { return toErrorResponse(error); }
}
