import { calendarEventSchema, type CalendarEvent } from "@/lib/contracts";

type PlanRow = { id: string; timezone: string };
type BlockRow = { id: string; study_plan_id: string; assignment_id: string; starts_at: string; ends_at: string };
type AssignmentRow = { id: string; title: string; area: "school" | "extracurricular"; status: string };

export function planBlocksToCalendarEvents(
  plans: PlanRow[],
  blocks: BlockRow[],
  assignments: AssignmentRow[],
  fallbackTimezone: string,
  area?: "school" | "extracurricular",
): CalendarEvent[] {
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const timezoneByPlan = new Map(plans.map((plan) => [plan.id, plan.timezone]));
  return blocks.flatMap((block) => {
    const assignment = assignmentById.get(block.assignment_id);
    if (!assignment || ["completed", "archived"].includes(assignment.status)) return [];
    if (area && assignment.area !== area) return [];
    return [calendarEventSchema.parse({
      id: block.id,
      calendarImportId: block.study_plan_id,
      sourceUid: `plan-block:${block.id}`,
      recurrenceId: null,
      title: assignment.title,
      description: "Scheduled work session",
      location: null,
      startsAt: block.starts_at,
      endsAt: block.ends_at,
      allDay: false,
      classification: "busy",
      area: assignment.area,
      originalTimezone: timezoneByPlan.get(block.study_plan_id) ?? fallbackTimezone,
      planBlockId: block.id,
      assignmentId: assignment.id,
    })];
  });
}
