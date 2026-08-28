import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const timezoneSchema = z.string().min(1).max(100).refine((zone) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}, "Invalid IANA timezone");

export const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskTypeSchema = z.enum(["assignment", "reading", "exam", "project", "quiz", "other"]);
export const areaSchema = z.enum(["school", "extracurricular"]);
export const planAreaFilterSchema = z.enum(["school", "extracurricular", "combined"]);

export const courseSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  code: z.string().max(30).nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const assignmentStatusSchema = z.enum(["pending_review", "confirmed", "in_progress", "completed", "archived"]);
export const assignmentSchema = z.object({
  id: uuidSchema,
  area: areaSchema,
  courseId: uuidSchema.nullable(),
  activityLabel: z.string().min(1).max(120).nullable(),
  title: z.string().min(1).max(240),
  dueAt: isoDateTimeSchema.nullable(),
  estimatedMinutes: z.number().int().min(0).max(10080),
  priority: prioritySchema,
  taskType: taskTypeSchema,
  dependencyIds: z.array(uuidSchema),
  notes: z.string().max(5000).nullable(),
  status: assignmentStatusSchema,
  completedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const parsedAssignmentSchema = z.object({
  title: z.string().min(1).max(240),
  area: areaSchema,
  areaConfidence: z.number().min(0).max(1),
  course: z.string().min(1).max(120).nullable(),
  activityLabel: z.string().min(1).max(120).nullable(),
  dueAt: isoDateTimeSchema.nullable(),
  ambiguousDateText: z.string().max(240).nullable(),
  estimatedMinutes: z.number().int().min(0).max(10080).nullable(),
  priority: prioritySchema,
  taskType: taskTypeSchema,
  dependencies: z.array(z.string().min(1).max(240)).max(20),
  notes: z.string().max(2000).nullable(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.enum(["title", "area", "course", "activityLabel", "dueAt", "estimatedMinutes", "priority", "taskType"])),
  warnings: z.array(z.string().max(300)).max(20),
});

export const brainDumpSchema = z.object({
  id: uuidSchema,
  rawText: z.string().min(1).max(12000),
  timezone: timezoneSchema,
  parsedAssignments: z.array(parsedAssignmentSchema),
  parser: z.enum(["mock", "ollama", "openai"]),
  createdAt: isoDateTimeSchema,
});

export const calendarClassificationSchema = z.enum(["busy", "study_available", "ignored"]);
export const calendarImportSchema = z.object({
  id: uuidSchema,
  sourceName: z.string().min(1).max(200),
  sourceHash: z.string().min(1).max(128),
  importedAt: isoDateTimeSchema,
  eventCount: z.number().int().nonnegative(),
});

export const calendarEventSchema = z.object({
  id: uuidSchema,
  calendarImportId: uuidSchema,
  sourceUid: z.string().min(1).max(500),
  recurrenceId: z.string().max(200).nullable(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable(),
  location: z.string().max(500).nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  allDay: z.boolean(),
  classification: calendarClassificationSchema,
  area: areaSchema,
  originalTimezone: z.string().max(100).nullable(),
});

const studyWindowBaseSchema = z.object({
  id: uuidSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  label: z.string().max(120).nullable(),
  createdAt: isoDateTimeSchema,
});
export const studyWindowSchema = studyWindowBaseSchema.refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
  message: "endsAt must be after startsAt",
  path: ["endsAt"],
});

export const planBlockSchema = z.object({
  id: uuidSchema,
  studyPlanId: uuidSchema,
  assignmentId: uuidSchema.nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  locked: z.boolean(),
  kind: z.enum(["work", "break"]),
  sequence: z.number().int().nonnegative(),
});

export const unscheduledTaskSchema = z.object({
  assignmentId: uuidSchema,
  remainingMinutes: z.number().int().positive(),
  reason: z.enum(["NO_AVAILABILITY", "DEADLINE_PASSED", "INSUFFICIENT_CAPACITY", "INVALID_DURATION", "DEPENDENCY_UNAVAILABLE"]),
});

export const studyPlanSchema = z.object({
  id: uuidSchema,
  rangeStart: isoDateTimeSchema,
  rangeEnd: isoDateTimeSchema,
  timezone: timezoneSchema,
  status: z.enum(["draft", "active", "archived"]),
  areaFilter: planAreaFilterSchema,
  blocks: z.array(planBlockSchema),
  unscheduledTasks: z.array(unscheduledTaskSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const focusSessionStatusSchema = z.enum(["running", "paused", "completed", "cancelled"]);
export const focusSessionSchema = z.object({
  id: uuidSchema,
  assignmentId: uuidSchema.nullable(),
  planBlockId: uuidSchema.nullable(),
  status: focusSessionStatusSchema,
  startedAt: isoDateTimeSchema,
  pausedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  accumulatedPauseSeconds: z.number().int().nonnegative(),
  plannedDurationMinutes: z.number().int().positive().max(1440),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const schedulingPreferencesSchema = z.object({
  timezone: timezoneSchema,
  defaultBlockMinutes: z.number().int().min(10).max(240).default(45),
  breakMinutes: z.number().int().min(0).max(60).default(10),
  minimumSessionMinutes: z.number().int().min(5).max(120).default(15),
  bedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("23:00"),
  urgencyWeight: z.number().min(0).max(10).default(4),
  priorityWeight: z.number().min(0).max(10).default(3),
  durationWeight: z.number().min(0).max(10).default(1),
});

export const parseBrainDumpInputSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  timezone: timezoneSchema,
  courseContext: z.array(z.object({ id: uuidSchema.optional(), name: z.string().min(1).max(120) })).max(100).optional(),
});

const assignmentInputSchema = assignmentSchema.pick({
  area: true, courseId: true, activityLabel: true, title: true, dueAt: true, estimatedMinutes: true, priority: true,
  taskType: true, dependencyIds: true, notes: true, status: true,
});
const validateAssignmentArea = (value: { area?: "school" | "extracurricular"; courseId?: string | null; activityLabel?: string | null }, context: z.RefinementCtx) => {
  if (value.area === "extracurricular" && value.courseId != null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["courseId"], message: "Extracurricular work cannot reference a course" });
  }
  if (value.area === "school" && value.activityLabel != null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["activityLabel"], message: "Schoolwork cannot use an activity label" });
  }
};
export const createAssignmentInputSchema = assignmentInputSchema.extend({
  area: areaSchema.default("school"),
  activityLabel: z.string().min(1).max(120).nullable().default(null),
}).superRefine(validateAssignmentArea);
export const updateAssignmentInputSchema = assignmentInputSchema.partial().extend({ id: uuidSchema })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), "At least one update is required")
  .superRefine(validateAssignmentArea);
export const deleteByIdInputSchema = z.object({ id: uuidSchema });

const studyWindowInputBaseSchema = studyWindowBaseSchema.pick({ startsAt: true, endsAt: true, label: true });
export const createStudyWindowInputSchema = studyWindowInputBaseSchema.refine(
  (value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), { message: "endsAt must be after startsAt", path: ["endsAt"] },
);
export const updateStudyWindowInputSchema = studyWindowInputBaseSchema.partial().extend({ id: uuidSchema }).refine(
  (value) => !value.startsAt || !value.endsAt || Date.parse(value.endsAt) > Date.parse(value.startsAt),
  { message: "endsAt must be after startsAt", path: ["endsAt"] },
);

export const generatePlanInputSchema = z.object({
  rangeStart: isoDateTimeSchema,
  rangeEnd: isoDateTimeSchema,
  timezone: timezoneSchema,
  area: areaSchema.optional(),
}).refine((value) => Date.parse(value.rangeEnd) > Date.parse(value.rangeStart), {
  path: ["rangeEnd"], message: "rangeEnd must be after rangeStart",
});

export const updatePlanInputSchema = z.object({
  status: z.enum(["draft", "active", "archived"]).optional(),
  blocks: z.array(z.object({
    id: uuidSchema,
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
    locked: z.boolean().optional(),
  }).refine((value) => value.startsAt !== undefined || value.endsAt !== undefined || value.locked !== undefined, "At least one block update is required")).max(500).optional(),
}).refine((value) => value.status !== undefined || value.blocks !== undefined, "At least one update is required");

export const updateCalendarEventInputSchema = z.object({
  id: uuidSchema,
  classification: calendarClassificationSchema,
});

export const createCourseInputSchema = courseSchema.pick({ name: true, code: true, color: true });
export const updateCourseInputSchema = createCourseInputSchema.partial().extend({ id: uuidSchema }).refine(
  (value) => Object.keys(value).some((key) => key !== "id"), "At least one update is required",
);

export const updateSchedulingPreferencesInputSchema = schedulingPreferencesSchema.partial().refine(
  (value) => Object.keys(value).length > 0, "At least one update is required",
);

const statsSliceSchema = z.object({
  assignments: z.object({ incomplete: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), overdue: z.number().int().nonnegative() }),
  focus: z.object({ completedSessionsThisWeek: z.number().int().nonnegative(), focusedMinutesThisWeek: z.number().int().nonnegative() }),
  plan: z.object({ scheduledMinutesThisWeek: z.number().int().nonnegative() }),
});
export const statsSummarySchema = z.object({
  school: statsSliceSchema,
  extracurricular: statsSliceSchema,
  combined: statsSliceSchema,
  generatedAt: isoDateTimeSchema,
  timezone: timezoneSchema,
});

export const createFocusSessionInputSchema = z.object({
  assignmentId: uuidSchema.nullable().optional(),
  planBlockId: uuidSchema.nullable().optional(),
  plannedDurationMinutes: z.number().int().positive().max(1440),
  startedAt: isoDateTimeSchema.optional(),
});
export const updateFocusSessionInputSchema = z.object({
  id: uuidSchema,
  action: z.enum(["pause", "resume", "complete", "cancel"]),
  occurredAt: isoDateTimeSchema.optional(),
});

export type Course = z.infer<typeof courseSchema>;
export type Area = z.infer<typeof areaSchema>;
export type PlanAreaFilter = z.infer<typeof planAreaFilterSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type BrainDump = z.infer<typeof brainDumpSchema>;
export type ParsedAssignment = z.infer<typeof parsedAssignmentSchema>;
export type CalendarImport = z.infer<typeof calendarImportSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type StudyWindow = z.infer<typeof studyWindowSchema>;
export type StudyPlan = z.infer<typeof studyPlanSchema>;
export type PlanBlock = z.infer<typeof planBlockSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type SchedulingPreferences = z.infer<typeof schedulingPreferencesSchema>;
export type UnscheduledTask = z.infer<typeof unscheduledTaskSchema>;
export type StatsSummary = z.infer<typeof statsSummarySchema>;
