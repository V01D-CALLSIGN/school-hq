import { areaSchema, assignmentSchema, createAssignmentInputSchema, deleteByIdInputSchema, success, updateAssignmentInputSchema, type Assignment } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { HttpError, readJson, toErrorResponse } from "@/lib/server/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

async function validateDependencies(supabase: SupabaseClient, dependencyIds: string[] | undefined): Promise<void> {
  if (!dependencyIds?.length) return;
  const rows = assertDb(await supabase.from("assignments").select("id").in("id", dependencyIds)) as Array<{ id: string }>;
  if (new Set(rows.map(({ id }) => id)).size !== new Set(dependencyIds).size) {
    throw new HttpError(422, "INVALID_DEPENDENCY", "Every dependency must reference one of your assignments", [{ path: "dependencyIds", message: "Contains an inaccessible assignment" }]);
  }
}

async function validateCourse(supabase: SupabaseClient, courseId: string | null | undefined): Promise<void> {
  if (!courseId) return;
  const { data, error } = await supabase.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (error || !data) throw new HttpError(422, "INVALID_COURSE", "Course must reference one of your courses", [{ path: "courseId", message: "References an inaccessible course" }]);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    let query = supabase.from("assignments").select("*").order("due_at", { ascending: true, nullsFirst: false });
    const status = url.searchParams.get("status");
    if (status) query = query.eq("status", status);
    const area = url.searchParams.get("area");
    if (area) query = query.eq("area", areaSchema.parse(area));
    const result = await query;
    const rows = assertDb(result);
    return success(assignmentSchema.array().parse(camelize<Assignment[]>(rows)));
  } catch (error) { return toErrorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createAssignmentInputSchema.parse(await readJson(request));
    await validateDependencies(supabase, input.dependencyIds);
    await validateCourse(supabase, input.courseId);
    const row = assertDb(await supabase.from("assignments").insert({ user_id: user.id, ...snakeize(input) }).select().single());
    return success(assignmentSchema.parse(camelize(row)), { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id, ...updates } = updateAssignmentInputSchema.parse(await readJson(request));
    await validateDependencies(supabase, updates.dependencyIds);
    await validateCourse(supabase, updates.courseId);
    const existing = assignmentSchema.parse(camelize<Assignment>(assertDb(
      await supabase.from("assignments").select("*").eq("id", id).single(),
    )));
    createAssignmentInputSchema.parse({ ...existing, ...updates });
    const update = snakeize(updates);
    if (updates.status === "completed") update.completed_at = new Date().toISOString();
    if (updates.status && updates.status !== "completed") update.completed_at = null;
    const row = assertDb(await supabase.from("assignments").update(update).eq("id", id).select().single());
    return success(assignmentSchema.parse(camelize(row)));
  } catch (error) { return toErrorResponse(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id } = deleteByIdInputSchema.parse(await readJson(request));
    assertDb(await supabase.from("assignments").delete().eq("id", id).select("id").single());
    return success({ id });
  } catch (error) { return toErrorResponse(error); }
}
