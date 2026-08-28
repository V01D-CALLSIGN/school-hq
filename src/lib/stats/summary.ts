import type { Area, StatsSummary } from "@/lib/contracts";

export type AssignmentStatRow = { area: Area; status: string; dueAt: string | null };
export type FocusStatRow = { area: Area | null; startedAt: string; completedAt: string | null; accumulatedPauseSeconds: number };
export type PlanStatRow = { area: Area | null; startsAt: string; endsAt: string };

type SummarySlice = StatsSummary["school"];

function slice(assignments: AssignmentStatRow[], sessions: FocusStatRow[], blocks: PlanStatRow[], nowMs: number): SummarySlice {
  const focusedSeconds = sessions.reduce((total, session) => total + Math.max(0,
    ((session.completedAt ? Date.parse(session.completedAt) : nowMs) - Date.parse(session.startedAt)) / 1000 - session.accumulatedPauseSeconds,
  ), 0);
  return {
    assignments: {
      incomplete: assignments.filter((item) => !["completed", "archived"].includes(item.status)).length,
      completed: assignments.filter((item) => item.status === "completed").length,
      overdue: assignments.filter((item) => item.dueAt && Date.parse(item.dueAt) < nowMs && !["completed", "archived"].includes(item.status)).length,
    },
    focus: { completedSessionsThisWeek: sessions.length, focusedMinutesThisWeek: Math.floor(focusedSeconds / 60) },
    plan: { scheduledMinutesThisWeek: Math.round(blocks.reduce((total, block) => total + Date.parse(block.endsAt) - Date.parse(block.startsAt), 0) / 60_000) },
  };
}

export function summarizeByArea(
  assignments: AssignmentStatRow[], sessions: FocusStatRow[], blocks: PlanStatRow[], nowMs = Date.now(),
): Pick<StatsSummary, "school" | "extracurricular" | "combined"> {
  const forArea = (area: Area) => slice(
    assignments.filter((item) => item.area === area),
    sessions.filter((item) => item.area === area),
    blocks.filter((item) => item.area === area),
    nowMs,
  );
  return {
    school: forArea("school"),
    extracurricular: forArea("extracurricular"),
    combined: slice(assignments, sessions, blocks, nowMs),
  };
}
