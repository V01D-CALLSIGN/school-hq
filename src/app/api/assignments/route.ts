import { assignmentSchema, createAssignmentInputSchema, deleteByIdInputSchema, success, updateAssignmentInputSchema, type Assignment } from "@/lib/contracts";
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

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    let query = supabase.from("assignments").select("*").order("due_at", { ascending: true, nullsFirst: false });
    const status = url.searchParams.get("status");
    if (status) query = query.eq("status", status);
    const result = await query;
    const rows = assertDb(result);
    return success(camelize<Assignment[]>(rows));
  } catch (error) { return toErrorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createAssignmentInputSchema.parse(await readJson(request));
    await validateDependencies(supabase, input.dependencyIds);
    const row = assertDb(await supabase.from("assignments").insert({ user_id: user.id, ...snakeize(input) }).select().single());
    return success(assignmentSchema.parse(camelize(row)), { status: 201 });
  } catch (error) { return toErrorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id, ...updates } = updateAssignmentInputSchema.parse(await readJson(request));
    await validateDependencies(supabase, updates.dependencyIds);
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
