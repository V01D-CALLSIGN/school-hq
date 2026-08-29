import { randomUUID } from "node:crypto";
import {
  calendarEventSchema,
  createCalendarEventInputSchema,
  deleteByIdInputSchema,
  success,
  updateCalendarEventInputSchema,
} from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize, snakeize } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

const normalizeEvent = (row: unknown) => {
  const event = camelize<Record<string, unknown>>(row);
  return calendarEventSchema.parse({
    ...event,
    recurrenceId: event.recurrenceId || null,
  });
};

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = createCalendarEventInputSchema.parse(await readJson(request));
    const calendarImport = assertDb<{ id: string }>(
      await supabase
        .from("calendar_imports")
        .upsert(
          {
            user_id: user.id,
            source_name: "Manual entries",
            source_hash: "manual",
            imported_at: new Date().toISOString(),
            event_count: 0,
          },
          { onConflict: "user_id,source_name" },
        )
        .select("id")
        .single(),
    );
    const row = assertDb(
      await supabase
        .from("calendar_events")
        .insert({
          user_id: user.id,
          calendar_import_id: calendarImport.id,
          source_uid: randomUUID(),
          recurrence_id: "",
          ...snakeize(input),
        })
        .select("*")
        .single(),
    );
    return success(normalizeEvent(row), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id, ...updates } = updateCalendarEventInputSchema.parse(
      await readJson(request),
    );
    const row = assertDb(
      await supabase
        .from("calendar_events")
        .update(snakeize(updates))
        .eq("id", id)
        .select("*")
        .single(),
    );
    return success(normalizeEvent(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const { id } = deleteByIdInputSchema.parse(await readJson(request));
    assertDb(
      await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id)
        .select("id")
        .single(),
    );
    return success({ id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
