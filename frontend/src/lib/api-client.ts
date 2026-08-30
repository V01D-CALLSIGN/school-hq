import { getAccessToken } from "@/lib/supabase/client";
import {
  ApiError,
  type ApiFailure,
  type ApiResponse,
  type Assignment,
  type BrainDump,
  type BrainDumpParseInput,
  type CalendarEvent,
  type CalendarImportResponse,
  type Course,
  type CreateAssignmentInput,
  type CreateCalendarEventInput,
  type CreateCourseInput,
  type CreateFocusSessionInput,
  type CreateStudyWindowInput,
  type FocusSession,
  type FocusTransitionInput,
  type GeneratePlanInput,
  type SchedulingPreferences,
  type StatsSummary,
  type StudyPlan,
  type StudyWindow,
  type UpdateAssignmentInput,
  type UpdateCalendarEventInput,
  type UpdateCourseInput,
  type UpdatePlanInput,
  type UpdateSchedulingPreferencesInput,
  type UpdateStudyWindowInput,
} from "@/types/api";

const apiBaseUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  if (!configured) return "";
  const url = new URL(configured);
  const localDevelopment = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((!localDevelopment && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_API_URL must be an HTTPS origin without credentials");
  }
  return url.origin;
};

export function resolveApiUrl(path: string) {
  const baseUrl = apiBaseUrl();
  return baseUrl && path.startsWith("/api/") ? `${baseUrl}${path}` : path;
}

function categoryFor(code: string, status: number): ApiError["category"] {
  if (code === "UNAUTHORIZED" || status === 401) return "auth";
  if (
    [
      "VALIDATION_ERROR",
      "INVALID_JSON",
      "INVALID_FILE",
      "INPUT_TOO_LARGE",
      "CALENDAR_TOO_LARGE",
      "UNSUPPORTED_MEDIA_TYPE",
      "INVALID_START_TIME",
      "INVALID_TRANSITION",
    ].includes(code) ||
    [400, 413, 415, 422].includes(status)
  )
    return "validation";
  if (code === "RATE_LIMITED" || status === 429) return "rate_limit";
  if (
    [
      "OLLAMA_UNAVAILABLE",
      "OLLAMA_MODEL_UNAVAILABLE",
      "PARSER_TIMEOUT",
      "PARSER_INVALID_RESPONSE",
      "PARSER_NOT_CONFIGURED",
    ].includes(code)
  )
    return "parser";
  if (code === "OFFLINE" || status === 0) return "offline";
  return "server";
}

function fallbackFailure(status: number): ApiFailure {
  const code =
    status === 401
      ? "UNAUTHORIZED"
      : status === 429
        ? "RATE_LIMITED"
        : status === 422
          ? "VALIDATION_ERROR"
          : "INTERNAL_ERROR";
  return {
    ok: false,
    error: {
      code,
      message:
        status === 401
          ? "Your session expired. Sign in again."
          : "School HQ could not complete that request.",
    },
  };
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    if (
      !(init.body instanceof FormData) &&
      init.body !== undefined &&
      !headers.has("Content-Type")
    )
      headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(resolveApiUrl(path), {
      ...init,
      headers,
      credentials: apiBaseUrl() ? "omit" : "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const envelope = (await response
      .json()
      .catch(() => fallbackFailure(response.status))) as ApiResponse<T>;
    if (!response.ok || !envelope.ok) {
      const failure = envelope.ok ? fallbackFailure(response.status) : envelope;
      throw new ApiError(
        response.status,
        failure.error.code,
        failure.error.message,
        failure.error.fields,
        failure.error.requestId,
        categoryFor(failure.error.code, response.status),
      );
    }
    return envelope.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof TypeError)
      throw new ApiError(
        0,
        "OFFLINE",
        "You appear to be offline. Check your connection and retry.",
        [],
        undefined,
        "offline",
      );
    throw error;
  }
}

const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};

const jsonRequest = <T>(path: string, method: string, body: unknown) =>
  apiRequest<T>(path, { method, body: JSON.stringify(body) });

export const api = {
  listCourses: () => apiRequest<Course[]>("/api/courses"),
  createCourse: (body: CreateCourseInput) =>
    jsonRequest<Course>("/api/courses", "POST", body),
  patchCourse: (body: UpdateCourseInput) =>
    jsonRequest<Course>("/api/courses", "PATCH", body),
  deleteCourse: (id: string) =>
    jsonRequest<{ id: string }>("/api/courses", "DELETE", { id }),

  parseBrainDump: (body: BrainDumpParseInput) =>
    jsonRequest<BrainDump>("/api/brain-dumps/parse", "POST", body),
  listAssignments: () => apiRequest<Assignment[]>("/api/assignments"),
  createAssignment: (body: CreateAssignmentInput) =>
    jsonRequest<Assignment>("/api/assignments", "POST", body),
  patchAssignment: (body: UpdateAssignmentInput) =>
    jsonRequest<Assignment>("/api/assignments", "PATCH", body),
  deleteAssignment: (id: string) =>
    jsonRequest<{ id: string }>("/api/assignments", "DELETE", { id }),

  importCalendar: (file: File) => {
    const body = new FormData();
    body.set("file", file);
    return apiRequest<CalendarImportResponse>("/api/calendar/import", {
      method: "POST",
      body,
    });
  },
  getCalendarWeek: (start: string, timezone: string) =>
    apiRequest<CalendarEvent[]>(
      `/api/calendar/week?${query({ start, timezone })}`,
    ),
  createCalendarEvent: (body: CreateCalendarEventInput) =>
    jsonRequest<CalendarEvent>("/api/calendar/events", "POST", body),
  patchCalendarEvent: (body: UpdateCalendarEventInput) =>
    jsonRequest<CalendarEvent>("/api/calendar/events", "PATCH", body),
  deleteCalendarEvent: (id: string) =>
    jsonRequest<{ id: string }>("/api/calendar/events", "DELETE", { id }),
  patchPlanBlock: (body: { id: string; startsAt: string; endsAt: string }) =>
    jsonRequest<{ id: string; startsAt: string; endsAt: string }>("/api/calendar/plan-blocks", "PATCH", body),
  deletePlanBlock: (id: string) =>
    jsonRequest<{ id: string }>("/api/calendar/plan-blocks", "DELETE", { id }),

  listStudyWindows: (from?: string, to?: string) =>
    apiRequest<StudyWindow[]>(`/api/study-windows?${query({ from, to })}`),
  createStudyWindow: (body: CreateStudyWindowInput) =>
    jsonRequest<StudyWindow>("/api/study-windows", "POST", body),
  patchStudyWindow: (body: UpdateStudyWindowInput) =>
    jsonRequest<StudyWindow>("/api/study-windows", "PATCH", body),
  deleteStudyWindow: (id: string) =>
    jsonRequest<{ id: string }>("/api/study-windows", "DELETE", { id }),

  generatePlan: (body: GeneratePlanInput) =>
    jsonRequest<StudyPlan>("/api/plans/generate", "POST", body),
  getPlan: (id: string) => apiRequest<StudyPlan>(`/api/plans/${id}`),
  patchPlan: (id: string, body: UpdatePlanInput) =>
    jsonRequest<StudyPlan>(`/api/plans/${id}`, "PATCH", body),

  getActiveFocusSession: () =>
    apiRequest<FocusSession | null>("/api/focus-sessions"),
  createFocusSession: (body: CreateFocusSessionInput) =>
    jsonRequest<FocusSession>("/api/focus-sessions", "POST", body),
  transitionFocusSession: (body: FocusTransitionInput) =>
    jsonRequest<FocusSession>("/api/focus-sessions", "PATCH", body),

  getStats: (timezone: string) =>
    apiRequest<StatsSummary>(`/api/stats/summary?${query({ timezone })}`),
  getSchedulingPreferences: () =>
    apiRequest<SchedulingPreferences>("/api/scheduling-preferences"),
  patchSchedulingPreferences: (body: UpdateSchedulingPreferencesInput) =>
    jsonRequest<SchedulingPreferences>(
      "/api/scheduling-preferences",
      "PATCH",
      body,
    ),
};
