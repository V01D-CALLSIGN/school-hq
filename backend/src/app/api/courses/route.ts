import { courseSchema, createCourseInputSchema, deleteByIdInputSchema, success, updateCourseInputSchema, type Course } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    return success(courseSchema.array().parse(camelize<Course[]>(assertDb(
      await supabase.from("courses").select("*").order("name"),
    ))));
  } catch (error) { return toErrorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createCourseInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("courses").insert({ user_id: user.id, ...snakeize(input) }).select("*").single());
    return success(courseSchema.parse(camelize(row)), { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id, ...updates } = updateCourseInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("courses").update(snakeize(updates)).eq("id", id).select("*").single());
    return success(courseSchema.parse(camelize(row)));
  } catch (error) { return toErrorResponse(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id } = deleteByIdInputSchema.parse(await readJson(request));
    assertDb(await supabase.from("courses").delete().eq("id", id).select("id").single());
    return success({ id });
  } catch (error) { return toErrorResponse(error); }
}
