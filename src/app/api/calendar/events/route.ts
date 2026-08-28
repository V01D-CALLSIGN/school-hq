import { calendarEventSchema, success, updateCalendarEventInputSchema } from "@/lib/contracts";
import { requireAuth } from "@/lib/server/auth";
import { assertDb, camelize } from "@/lib/server/db";
import { readJson, toErrorResponse } from "@/lib/server/errors";

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { supabase } = await requireAuth(request);
    const input = updateCalendarEventInputSchema.parse(await readJson(request));
    const row = assertDb(await supabase.from("calendar_events").update({ classification: input.classification })
      .eq("id", input.id).select("*").single());
    const event = camelize<Record<string, unknown>>(row);
    return success(calendarEventSchema.parse({ ...event, recurrenceId: event.recurrenceId || null }));
  } catch (error) { return toErrorResponse(error); }
}
