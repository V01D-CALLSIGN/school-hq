import { DateTime, Interval } from "luxon";
import type { Area, Assignment, CalendarEvent, PlanBlock, SchedulingPreferences, StudyWindow, UnscheduledTask } from "@/lib/contracts";

type EngineAssignment = Pick<Assignment, "id" | "area" | "dueAt" | "estimatedMinutes" | "priority" | "dependencyIds" | "status">;
type EngineWindow = Pick<StudyWindow, "startsAt" | "endsAt">;
type EngineBusy = Pick<CalendarEvent, "startsAt" | "endsAt" | "classification">;
type EngineLocked = Pick<PlanBlock, "id" | "studyPlanId" | "assignmentId" | "startsAt" | "endsAt" | "locked" | "kind" | "sequence">;

export type SchedulingInput = {
  assignments: EngineAssignment[];
  studyWindows: EngineWindow[];
  calendarEvents: EngineBusy[];
  lockedBlocks: EngineLocked[];
  preferences: SchedulingPreferences;
  rangeStart: string;
  rangeEnd: string;
  planId: string;
  area?: Area;
};

export type SchedulingResult = { blocks: PlanBlock[]; unscheduledTasks: UnscheduledTask[] };
type Slot = { start: number; end: number };

const priorityValue = { low: 1, medium: 2, high: 3, urgent: 4 } as const;

function stableUuid(seed: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < seed.length; index += 1) {
    a = Math.imul(a ^ seed.charCodeAt(index), 0x01000193) >>> 0;
    b = Math.imul(b ^ seed.charCodeAt(index), 0x85ebca6b) >>> 0;
  }
  const hex = `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}0000000000000000`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function subtract(slots: Slot[], blocks: Slot[]): Slot[] {
  return blocks.sort((a, b) => a.start - b.start).reduce((available, blocked) => available.flatMap((slot) => {
    if (blocked.end <= slot.start || blocked.start >= slot.end) return [slot];
    const parts: Slot[] = [];
    if (blocked.start > slot.start) parts.push({ start: slot.start, end: Math.min(blocked.start, slot.end) });
    if (blocked.end < slot.end) parts.push({ start: Math.max(blocked.end, slot.start), end: slot.end });
    return parts;
  }), slots);
}

function mergeSlots(slots: Slot[]): Slot[] {
  return slots.sort((a, b) => a.start - b.start).reduce<Slot[]>((merged, slot) => {
    const previous = merged.at(-1);
    if (!previous || slot.start > previous.end) merged.push({ ...slot });
    else previous.end = Math.max(previous.end, slot.end);
    return merged;
  }, []);
}

function topologicalRank(assignments: EngineAssignment[]): Map<string, number> {
  const ids = new Set(assignments.map(({ id }) => id));
  const ranks = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (assignment: EngineAssignment): number => {
    if (ranks.has(assignment.id)) return ranks.get(assignment.id)!;
    if (visiting.has(assignment.id)) return 0;
    visiting.add(assignment.id);
    const rank = 1 + Math.max(-1, ...assignment.dependencyIds.filter((id) => ids.has(id)).map((id) => visit(assignments.find((item) => item.id === id)!)));
    visiting.delete(assignment.id);
    ranks.set(assignment.id, rank);
    return rank;
  };
  assignments.forEach(visit);
  return ranks;
}

function clipToBedtime(slots: Slot[], timezone: string, bedtime: string): Slot[] {
  return slots.flatMap((slot) => {
    const pieces: Slot[] = [];
    let day = DateTime.fromMillis(slot.start, { zone: timezone }).startOf("day");
    const finalDay = DateTime.fromMillis(slot.end, { zone: timezone }).startOf("day");
    while (day <= finalDay) {
      const boundary = DateTime.fromISO(`${day.toISODate()}T${bedtime}`, { zone: timezone });
      const start = Math.max(slot.start, day.toMillis());
      const end = Math.min(slot.end, boundary.toMillis());
      if (end > start) pieces.push({ start, end });
      day = day.plus({ days: 1 });
    }
    return pieces;
  });
}

export function generateSchedule(input: SchedulingInput): SchedulingResult {
  const rangeStart = DateTime.fromISO(input.rangeStart, { setZone: true });
  const rangeEnd = DateTime.fromISO(input.rangeEnd, { setZone: true });
  if (!rangeStart.isValid || !rangeEnd.isValid || rangeEnd <= rangeStart) throw new Error("Invalid scheduling range");
  const startMs = rangeStart.toMillis();
  const endMs = rangeEnd.toMillis();
  const windows = mergeSlots(clipToBedtime(input.studyWindows.map((window) => ({
    start: Math.max(Date.parse(window.startsAt), startMs), end: Math.min(Date.parse(window.endsAt), endMs),
  })).filter((slot) => slot.end > slot.start).sort((a, b) => a.start - b.start), input.preferences.timezone, input.preferences.bedtime));
  const blocked = [
    ...input.calendarEvents.filter((event) => event.classification === "busy"),
    ...input.lockedBlocks,
  ].map((item) => ({ start: Date.parse(item.startsAt), end: Date.parse(item.endsAt) }));
  const slots = subtract(windows, blocked).filter((slot) => slot.end - slot.start >= input.preferences.minimumSessionMinutes * 60_000);
  const selectedAssignments = input.area ? input.assignments.filter((item) => item.area === input.area) : input.assignments;
  const ranks = topologicalRank(selectedAssignments);
  const assignments = selectedAssignments.filter((item) => !["completed", "archived", "pending_review"].includes(item.status)).sort((a, b) => {
    const rankDifference = (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0);
    if (rankDifference) return rankDifference;
    const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER;
    const aScore = input.preferences.urgencyWeight * (1 / Math.max(1, (aDue - startMs) / 86_400_000)) + input.preferences.priorityWeight * priorityValue[a.priority] - input.preferences.durationWeight * a.estimatedMinutes / 1440;
    const bScore = input.preferences.urgencyWeight * (1 / Math.max(1, (bDue - startMs) / 86_400_000)) + input.preferences.priorityWeight * priorityValue[b.priority] - input.preferences.durationWeight * b.estimatedMinutes / 1440;
    return bScore - aScore || aDue - bDue || a.id.localeCompare(b.id);
  });
  const blocks: PlanBlock[] = input.lockedBlocks.map((block) => ({ ...block, studyPlanId: input.planId }));
  const unscheduledTasks: UnscheduledTask[] = [];
  const activeIds = new Set(assignments.map(({ id }) => id));
  const scheduledAssignments = new Set<string>();
  const scheduledMinutesByDay = new Map<string, number>();
  let sequence = blocks.length;

  for (const assignment of assignments) {
    if (assignment.dependencyIds.some((dependencyId) => activeIds.has(dependencyId) && !scheduledAssignments.has(dependencyId))) {
      unscheduledTasks.push({ assignmentId: assignment.id, remainingMinutes: Math.max(1, assignment.estimatedMinutes), reason: "DEPENDENCY_UNAVAILABLE" });
      continue;
    }
    if (assignment.estimatedMinutes <= 0) {
      unscheduledTasks.push({ assignmentId: assignment.id, remainingMinutes: 1, reason: "INVALID_DURATION" });
      continue;
    }
    const rawDeadline = assignment.dueAt ? Math.min(Date.parse(assignment.dueAt), endMs) : endMs;
    const localStart = rangeStart.setZone(input.preferences.timezone).startOf("day");
    const localDue = DateTime.fromMillis(rawDeadline, { zone: input.preferences.timezone });
    const daysUntilDue = Math.round(localDue.startOf("day").diff(localStart, "days").days);
    // A date-only deadline means the work should be finished before that day begins.
    // This is especially important for “due tomorrow”: schedule it today.
    const deadline = assignment.dueAt && daysUntilDue > 0
      ? Math.min(localDue.startOf("day").toMillis(), endMs)
      : rawDeadline;
    if (deadline <= startMs) {
      unscheduledTasks.push({ assignmentId: assignment.id, remainingMinutes: assignment.estimatedMinutes, reason: "DEADLINE_PASSED" });
      continue;
    }
    const lockedMinutes = input.lockedBlocks.filter((block) => block.kind === "work" && block.assignmentId === assignment.id)
      .reduce((total, block) => total + Math.max(0, Date.parse(block.endsAt) - Date.parse(block.startsAt)) / 60_000, 0);
    let remaining = Math.max(0, assignment.estimatedMinutes - Math.floor(lockedMinutes));
    const usedDays = new Set<string>();
    while (remaining > 0) {
      const desired = Math.min(input.preferences.defaultBlockMinutes, remaining);
      const eligible = slots
        .map((slot, index) => ({ slot, index, day: DateTime.fromMillis(slot.start, { zone: input.preferences.timezone }).toISODate()! }))
        .filter(({ slot }) => slot.start < deadline && Math.min(slot.end, deadline) - slot.start >= Math.min(desired, input.preferences.minimumSessionMinutes) * 60_000);
      const pool = daysUntilDue > 1 && eligible.some(({ day }) => !usedDays.has(day))
        ? eligible.filter(({ day }) => !usedDays.has(day))
        : eligible;
      pool.sort((a, b) => {
        if (daysUntilDue <= 1) return a.slot.start - b.slot.start;
        return (scheduledMinutesByDay.get(a.day) ?? 0) - (scheduledMinutesByDay.get(b.day) ?? 0) || a.slot.start - b.slot.start;
      });
      const slotIndex = pool[0]?.index ?? -1;
      if (slotIndex < 0) break;
      const slot = slots[slotIndex];
      const usableMinutes = Math.floor((Math.min(slot.end, deadline) - slot.start) / 60_000);
      const workMinutes = Math.min(desired, usableMinutes);
      if (workMinutes < input.preferences.minimumSessionMinutes && workMinutes < remaining) break;
      const workEnd = slot.start + workMinutes * 60_000;
      const startIso = new Date(slot.start).toISOString();
      const endIso = new Date(workEnd).toISOString();
      blocks.push({ id: stableUuid(`${assignment.id}:work:${startIso}`), studyPlanId: input.planId, assignmentId: assignment.id, startsAt: startIso, endsAt: endIso, locked: false, kind: "work", sequence: sequence++ });
      const workDay = DateTime.fromMillis(slot.start, { zone: input.preferences.timezone }).toISODate()!;
      usedDays.add(workDay);
      scheduledMinutesByDay.set(workDay, (scheduledMinutesByDay.get(workDay) ?? 0) + workMinutes);
      remaining -= workMinutes;
      let nextStart = workEnd;
      if (remaining > 0 && input.preferences.breakMinutes > 0 && slot.end - workEnd >= (input.preferences.breakMinutes + input.preferences.minimumSessionMinutes) * 60_000) {
        const breakEnd = workEnd + input.preferences.breakMinutes * 60_000;
        blocks.push({ id: stableUuid(`${assignment.id}:break:${endIso}`), studyPlanId: input.planId, assignmentId: null, startsAt: endIso, endsAt: new Date(breakEnd).toISOString(), locked: false, kind: "break", sequence: sequence++ });
        nextStart = breakEnd;
      }
      if (nextStart >= slot.end) slots.splice(slotIndex, 1);
      else slots[slotIndex] = { start: nextStart, end: slot.end };
    }
    if (remaining > 0) {
      unscheduledTasks.push({ assignmentId: assignment.id, remainingMinutes: remaining, reason: slots.length ? "INSUFFICIENT_CAPACITY" : "NO_AVAILABILITY" });
    } else scheduledAssignments.add(assignment.id);
  }
  blocks.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  return { blocks, unscheduledTasks };
}

export function schedulesOverlap(blocks: Array<Pick<PlanBlock, "startsAt" | "endsAt">>): boolean {
  const sorted = blocks.map((block) => Interval.fromDateTimes(DateTime.fromISO(block.startsAt), DateTime.fromISO(block.endsAt))).sort((a, b) => a.start!.toMillis() - b.start!.toMillis());
  return sorted.some((interval, index) => index > 0 && sorted[index - 1].overlaps(interval));
}
