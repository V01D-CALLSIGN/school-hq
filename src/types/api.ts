export type ISODateTime = string;
export type WorkArea = "school" | "extracurricular";
export type AreaFilter = "all" | WorkArea;

export type Course = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
export type AssignmentStatus =
  "pending_review" | "confirmed" | "in_progress" | "completed" | "archived";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskType =
  "assignment" | "reading" | "exam" | "project" | "quiz" | "other";
export type BackendAssignment = {
  id: string;
  courseId: string | null;
  title: string;
  dueAt: ISODateTime | null;
  estimatedMinutes: number;
  priority: Priority;
  taskType: TaskType;
  dependencyIds: string[];
  notes: string | null;
  status: AssignmentStatus;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
export type Assignment = BackendAssignment & {
  area?: WorkArea;
  activityName?: string | null;
};
export type BackendCreateAssignmentInput = Pick<
  BackendAssignment,
  | "courseId"
  | "title"
  | "dueAt"
  | "estimatedMinutes"
  | "priority"
  | "taskType"
  | "dependencyIds"
  | "notes"
  | "status"
>;
export type CreateAssignmentInput = BackendCreateAssignmentInput & {
  area: WorkArea;
  activityName?: string | null;
};
export type UpdateAssignmentInput = Partial<CreateAssignmentInput> & {
  id: string;
};

export type BackendParsedAssignment = {
  title: string;
  course: string | null;
  dueAt: ISODateTime | null;
  ambiguousDateText: string | null;
  estimatedMinutes: number | null;
  priority: Priority;
  taskType: TaskType;
  dependencies: string[];
  notes: string | null;
  confidence: number;
  missingFields: Array<
    "title" | "course" | "dueAt" | "estimatedMinutes" | "priority" | "taskType"
  >;
  warnings: string[];
};
export type ParsedAssignment = BackendParsedAssignment & {
  area?: WorkArea;
  activityName?: string | null;
};
export type BackendBrainDump = {
  id: string;
  rawText: string;
  timezone: string;
  parsedAssignments: BackendParsedAssignment[];
  parser: "mock" | "ollama" | "openai";
  createdAt: ISODateTime;
};
export type BrainDump = Omit<BackendBrainDump, "parsedAssignments"> & {
  parsedAssignments: ParsedAssignment[];
};
export type BrainDumpParseInput = {
  text: string;
  timezone: string;
  courseContext?: Array<{ id?: string; name: string }>;
};

export type CalendarClassification = "busy" | "study_available" | "ignored";
export type CalendarImport = {
  id: string;
  sourceName: string;
  sourceHash: string;
  importedAt: ISODateTime;
  eventCount: number;
};
export type BackendCalendarEvent = {
  id: string;
  calendarImportId: string;
  sourceUid: string;
  recurrenceId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  allDay: boolean;
  classification: CalendarClassification;
  originalTimezone: string | null;
};
export type CalendarEvent = BackendCalendarEvent & {
  area?: WorkArea;
  activityName?: string | null;
};
export type CalendarImportResponse = {
  import: CalendarImport;
  events: CalendarEvent[];
};
export type StudyWindow = {
  id: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  label: string | null;
  createdAt: ISODateTime;
};
export type CreateStudyWindowInput = Pick<
  StudyWindow,
  "startsAt" | "endsAt" | "label"
>;
export type UpdateStudyWindowInput = Partial<CreateStudyWindowInput> & {
  id: string;
};

export type BackendPlanBlock = {
  id: string;
  studyPlanId: string;
  assignmentId: string | null;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  locked: boolean;
  kind: "work" | "break";
  sequence: number;
};
export type PlanBlock = BackendPlanBlock & { area?: WorkArea };
export type UnscheduledReason =
  | "NO_AVAILABILITY"
  | "DEADLINE_PASSED"
  | "INSUFFICIENT_CAPACITY"
  | "INVALID_DURATION"
  | "DEPENDENCY_UNAVAILABLE";
export type UnscheduledTask = {
  assignmentId: string;
  remainingMinutes: number;
  reason: UnscheduledReason;
};
export type StudyPlan = {
  id: string;
  rangeStart: ISODateTime;
  rangeEnd: ISODateTime;
  timezone: string;
  status: "draft" | "active" | "archived";
  blocks: PlanBlock[];
  unscheduledTasks: UnscheduledTask[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
export type GeneratePlanInput = {
  rangeStart: ISODateTime;
  rangeEnd: ISODateTime;
  timezone: string;
};
export type UpdatePlanInput = {
  status?: StudyPlan["status"];
  blocks?: Array<{ id: string; locked: boolean }>;
};

export type FocusSessionStatus =
  "running" | "paused" | "completed" | "cancelled";
export type FocusSession = {
  id: string;
  assignmentId: string | null;
  planBlockId: string | null;
  status: FocusSessionStatus;
  startedAt: ISODateTime;
  pausedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  accumulatedPauseSeconds: number;
  plannedDurationMinutes: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
export type CreateFocusSessionInput = {
  assignmentId?: string | null;
  planBlockId?: string | null;
  plannedDurationMinutes: number;
  startedAt?: ISODateTime;
};
export type FocusTransitionInput = {
  id: string;
  action: "pause" | "resume" | "complete" | "cancel";
  occurredAt?: ISODateTime;
};
export type StatsSummary = {
  assignments: { incomplete: number; completed: number; overdue: number };
  focus: { completedSessionsThisWeek: number; focusedMinutesThisWeek: number };
  plan: { scheduledMinutesThisWeek: number };
  generatedAt: ISODateTime;
  timezone: string;
};

export type FieldIssue = { path: string; message: string };
export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};
export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: FieldIssue[];
    requestId?: string;
  };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type ApiErrorCategory =
  "auth" | "validation" | "rate_limit" | "parser" | "offline" | "server";
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: FieldIssue[] = [],
    public readonly requestId?: string,
    public readonly category: ApiErrorCategory = "server",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
