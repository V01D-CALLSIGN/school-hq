// Copy-safe HTTP contract snapshot. This file intentionally has no imports or runtime code.
export type ISODateTime = string;
export type UUID = string;
export type Area = "school" | "extracurricular";
export type PlanAreaFilter = Area | "combined";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskType = "assignment" | "reading" | "exam" | "project" | "quiz" | "other";
export type AssignmentStatus = "pending_review" | "confirmed" | "in_progress" | "completed" | "archived";
export type CalendarClassification = "busy" | "study_available" | "ignored";

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = { ok: false; error: { code: string; message: string; fields?: Array<{ path: string; message: string }>; requestId?: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Course = {
  id: UUID; name: string; code: string | null; color: string;
  createdAt: ISODateTime; updatedAt: ISODateTime;
};

export type Assignment = {
  id: UUID; area: Area; courseId: UUID | null; activityLabel: string | null; title: string;
  dueAt: ISODateTime | null; estimatedMinutes: number; priority: Priority; taskType: TaskType;
  dependencyIds: UUID[]; notes: string | null; status: AssignmentStatus; completedAt: ISODateTime | null;
  createdAt: ISODateTime; updatedAt: ISODateTime;
};

export type ParsedAssignment = {
  title: string; area: Area; areaConfidence: number; course: string | null; activityLabel: string | null;
  dueAt: ISODateTime | null; ambiguousDateText: string | null; estimatedMinutes: number | null;
  priority: Priority; taskType: TaskType; dependencies: string[]; notes: string | null; confidence: number;
  missingFields: Array<"title" | "area" | "course" | "activityLabel" | "dueAt" | "estimatedMinutes" | "priority" | "taskType">;
  warnings: string[];
};

export type BrainDump = {
  id: UUID; rawText: string; timezone: string; parsedAssignments: ParsedAssignment[];
  parser: "mock" | "ollama" | "openai"; createdAt: ISODateTime;
};

export type CalendarEvent = {
  id: UUID; calendarImportId: UUID; sourceUid: string; recurrenceId: string | null; title: string;
  description: string | null; location: string | null; startsAt: ISODateTime; endsAt: ISODateTime;
  allDay: boolean; classification: CalendarClassification; area: Area; originalTimezone: string | null;
};

export type SchedulingPreferences = {
  timezone: string; defaultBlockMinutes: number; breakMinutes: number; minimumSessionMinutes: number;
  bedtime: string; urgencyWeight: number; priorityWeight: number; durationWeight: number;
};

export type PlanBlock = {
  id: UUID; studyPlanId: UUID; assignmentId: UUID | null; startsAt: ISODateTime; endsAt: ISODateTime;
  locked: boolean; kind: "work" | "break"; sequence: number;
};

export type StudyPlan = {
  id: UUID; rangeStart: ISODateTime; rangeEnd: ISODateTime; timezone: string;
  status: "draft" | "active" | "archived"; areaFilter: PlanAreaFilter; blocks: PlanBlock[];
  unscheduledTasks: Array<{ assignmentId: UUID; remainingMinutes: number; reason: "NO_AVAILABILITY" | "DEADLINE_PASSED" | "INSUFFICIENT_CAPACITY" | "INVALID_DURATION" | "DEPENDENCY_UNAVAILABLE" }>;
  createdAt: ISODateTime; updatedAt: ISODateTime;
};

export type FocusSession = {
  id: UUID; assignmentId: UUID | null; planBlockId: UUID | null; status: "running" | "paused" | "completed" | "cancelled";
  startedAt: ISODateTime; pausedAt: ISODateTime | null; completedAt: ISODateTime | null;
  accumulatedPauseSeconds: number; plannedDurationMinutes: number; createdAt: ISODateTime; updatedAt: ISODateTime;
};

export type StatsSlice = {
  assignments: { incomplete: number; completed: number; overdue: number };
  focus: { completedSessionsThisWeek: number; focusedMinutesThisWeek: number };
  plan: { scheduledMinutesThisWeek: number };
};
export type StatsSummary = { school: StatsSlice; extracurricular: StatsSlice; combined: StatsSlice; generatedAt: ISODateTime; timezone: string };

export type CreateAssignmentBody = Omit<Assignment, "id" | "completedAt" | "createdAt" | "updatedAt">;
export type PatchAssignmentBody = { id: UUID } & Partial<CreateAssignmentBody>;
export type CreateCourseBody = Pick<Course, "name" | "code" | "color">;
export type PatchCourseBody = { id: UUID } & Partial<CreateCourseBody>;
export type DeleteByIdBody = { id: UUID };
export type CreateCalendarEventBody = Pick<CalendarEvent, "title" | "description" | "location" | "startsAt" | "endsAt" | "allDay" | "classification" | "area" | "originalTimezone">;
export type PatchCalendarEventBody = { id: UUID } & Partial<CreateCalendarEventBody>;
export type PatchSchedulingPreferencesBody = Partial<SchedulingPreferences>;
export type GeneratePlanBody = { rangeStart: ISODateTime; rangeEnd: ISODateTime; timezone: string; area?: Area };
export type PatchPlanBody = {
  status?: StudyPlan["status"];
  blocks?: Array<{ id: UUID; startsAt?: ISODateTime; endsAt?: ISODateTime; locked?: boolean }>;
};
