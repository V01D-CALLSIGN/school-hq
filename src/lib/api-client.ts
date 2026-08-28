import {
  assignments,
  brainDump,
  calendarEvents,
  plan,
  statsSummary,
} from "@/mocks/data";
import { getAccessToken } from "@/lib/supabase/client";
import {
  ApiError,
  type ApiFailure,
  type ApiResponse,
  type Assignment,
  type BrainDump,
  type BrainDumpParseInput,
  type CalendarClassification,
  type CalendarEvent,
  type CalendarImportResponse,
  type CreateAssignmentInput,
  type CreateFocusSessionInput,
  type CreateStudyWindowInput,
  type FocusSession,
  type FocusTransitionInput,
  type GeneratePlanInput,
  type StatsSummary,
  type StudyPlan,
  type StudyWindow,
  type UpdateAssignmentInput,
  type UpdatePlanInput,
  type UpdateStudyWindowInput,
} from "@/types/api";

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const mockEnabled = () => process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
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
  if (mockEnabled()) return mockRequest<T>(path, init);
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
    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
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

async function mockRequest<T>(path: string, init: RequestInit): Promise<T> {
  await wait();
  const method = init.method ?? "GET";
  const json = () => JSON.parse(String(init.body ?? "{}"));
  if (path === "/api/brain-dumps/parse") return brainDump as T;
  if (path.startsWith("/api/assignments")) {
    if (method === "GET") return assignments as T;
    if (method === "DELETE") return { id: json().id } as T;
    if (method === "PATCH")
      return {
        ...assignments.find((item) => item.id === json().id),
        ...json(),
      } as T;
    return {
      ...assignments[0],
      ...json(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
  }
  if (path === "/api/calendar/import")
    return {
      import: {
        id: "import-1",
        sourceName: "calendar.ics",
        sourceHash: "mock",
        importedAt: new Date().toISOString(),
        eventCount: calendarEvents.length,
      },
      events: calendarEvents,
    } as T;
  if (path.startsWith("/api/calendar/week")) return calendarEvents as T;
  if (path.startsWith("/api/study-windows"))
    return (method === "GET" ? [] : json()) as T;
  if (path === "/api/plans/generate" || path.startsWith("/api/plans/"))
    return plan as T;
  if (path === "/api/focus-sessions") {
    const body = json();
    const transitions = {
      pause: "paused",
      resume: "running",
      complete: "completed",
      cancel: "cancelled",
    } as const;
    return {
      id: body.id ?? "focus-1",
      assignmentId: null,
      planBlockId: null,
      status:
        method === "PATCH"
          ? transitions[body.action as FocusTransitionInput["action"]]
          : "running",
      startedAt: new Date().toISOString(),
      pausedAt: null,
      completedAt: null,
      accumulatedPauseSeconds: 0,
      plannedDurationMinutes: body.plannedDurationMinutes ?? 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
  }
  if (path.startsWith("/api/stats/summary")) return statsSummary as T;
  throw new ApiError(
    404,
    "MOCK_NOT_FOUND",
    `No mock handler for ${method} ${path}`,
  );
}

const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};
export const api = {
  parseBrainDump: (body: BrainDumpParseInput) =>
    apiRequest<BrainDump>("/api/brain-dumps/parse", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listAssignments: () => apiRequest<Assignment[]>("/api/assignments"),
  createAssignment: (body: CreateAssignmentInput) =>
    apiRequest<Assignment>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchAssignment: (body: UpdateAssignmentInput) =>
    apiRequest<Assignment>("/api/assignments", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAssignment: (id: string) =>
    apiRequest<{ id: string }>("/api/assignments", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  importCalendar: (
    file: File,
    classification: CalendarClassification,
    area: "school" | "extracurricular",
  ) => {
    const body = new FormData();
    body.set("file", file);
    body.set("classification", classification);
    body.set("area", area);
    return apiRequest<CalendarImportResponse>("/api/calendar/import", {
      method: "POST",
      body,
    });
  },
  getCalendarWeek: (start: string, timezone: string) =>
    apiRequest<CalendarEvent[]>(
      `/api/calendar/week?${query({ start, timezone })}`,
    ),
  listStudyWindows: (from?: string, to?: string) =>
    apiRequest<StudyWindow[]>(`/api/study-windows?${query({ from, to })}`),
  createStudyWindow: (body: CreateStudyWindowInput) =>
    apiRequest<StudyWindow>("/api/study-windows", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchStudyWindow: (body: UpdateStudyWindowInput) =>
    apiRequest<StudyWindow>("/api/study-windows", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteStudyWindow: (id: string) =>
    apiRequest<{ id: string }>("/api/study-windows", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  generatePlan: (
    body: GeneratePlanInput,
    area?: "all" | "school" | "extracurricular",
  ) =>
    apiRequest<StudyPlan>("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify(area ? { ...body, area } : body),
    }),
  getPlan: (id: string) => apiRequest<StudyPlan>(`/api/plans/${id}`),
  patchPlan: (id: string, body: UpdatePlanInput) =>
    apiRequest<StudyPlan>(`/api/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createFocusSession: (body: CreateFocusSessionInput) =>
    apiRequest<FocusSession>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transitionFocusSession: (body: FocusTransitionInput) =>
    apiRequest<FocusSession>("/api/focus-sessions", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getStats: (timezone: string) =>
    apiRequest<StatsSummary>(`/api/stats/summary?${query({ timezone })}`),
};
