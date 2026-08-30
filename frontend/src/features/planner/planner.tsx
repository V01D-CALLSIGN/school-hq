"use client";
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  ChevronLeft,
  Clock3,
  GripVertical,
  LoaderCircle,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AreaBadge,
  AreaFilterControl,
  resolveArea,
  useAreaFilter,
} from "@/components/area-filter";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/date-time";
import type {
  Assignment,
  Course,
  ParsedAssignment,
  StudyPlan,
  WorkArea,
} from "@/types/api";
type Stage = "dump" | "review" | "timeline";
const subscribeToLocation = () => () => {};
const isPlanTodayRoute = () =>
  new URLSearchParams(window.location.search).get("today") === "1";
const dateWarningPattern = /date|deadline|timestamp/i;
const missingFieldLabel = (field: ParsedAssignment["missingFields"][number]) =>
  ({
    title: "task name",
    area: "area",
    course: "course",
    activityLabel: "activity or club",
    dueAt: "due date",
    estimatedMinutes: "duration",
    priority: "priority",
    taskType: "task type",
  })[field];
const relevantMissingFields = (draft: ParsedAssignment) =>
  draft.missingFields.filter((field) =>
    resolveArea(draft) === "school"
      ? field !== "activityLabel"
      : field !== "course",
  );
function readPendingReview(): {
  text: string;
  drafts: ParsedAssignment[];
} | null {
  if (typeof window === "undefined") return null;
  const saved = sessionStorage.getItem("school-hq-pending-review-v1");
  if (!saved) return null;
  sessionStorage.removeItem("school-hq-pending-review-v1");
  try {
    return JSON.parse(saved) as { text: string; drafts: ParsedAssignment[] };
  } catch {
    return null;
  }
}
const reasonLabel = {
  NO_AVAILABILITY: "No imported Study Block in this range",
  DEADLINE_PASSED: "Deadline already passed",
  INSUFFICIENT_CAPACITY: "Not enough open time",
  INVALID_DURATION: "Duration needs review",
  DEPENDENCY_UNAVAILABLE: "Blocked by a dependency",
} as const;
export function Planner() {
  const router = useRouter();
  const planToday = useSyncExternalStore(
    subscribeToLocation,
    isPlanTodayRoute,
    () => false,
  );
  const [pending] = useState(readPendingReview);
  const [stage, setStage] = useState<Stage>(pending ? "review" : "dump");
  const [text, setText] = useState(() => pending?.text ?? "");
  const [drafts, setDrafts] = useState<ParsedAssignment[]>(
    () =>
      pending?.drafts.map((item) => ({
        ...item,
        area: item.area,
      })) ?? [],
  );
  const [known, setKnown] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [plannedAssignmentIds, setPlannedAssignmentIds] = useState<string[]>([]);
  const [mode, setMode] = useAreaFilter();
  useEffect(() => {
    void Promise.all([api.listAssignments(), api.listCourses()])
      .then(([items, nextCourses]) => {
        setKnown(items);
        setCourses(nextCourses);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);
  async function parse() {
    setLoading(true);
    setError("");
    try {
      const result = await api.parseBrainDump({
        text,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        courseContext: courses.map((course) => ({
          id: course.id,
          name: course.name,
        })),
      });
      setDrafts(result.parsedAssignments);
      setStage("review");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not parse that brain dump.",
      );
    } finally {
      setLoading(false);
    }
  }
  const range = (assignments: Assignment[]) => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
    const minimumEnd = start.getTime() + 8 * 24 * 60 * 60 * 1000;
    const latestDue = Math.max(
      0,
      ...assignments.flatMap((assignment) => assignment.dueAt ? [Date.parse(assignment.dueAt)] : []),
    );
    const maximumEnd = start.getTime() + 30 * 24 * 60 * 60 * 1000;
    const end = new Date(Math.min(maximumEnd, Math.max(minimumEnd, latestDue + 60_000)));
    return {
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };
  async function generate() {
    setLoading(true);
    setError("");
    try {
      const confirmed: Assignment[] = [];
      for (const draft of (stage === "review" ? drafts : []).filter(
        (item) => mode === "all" || resolveArea(item) === mode,
      )) {
        let courseId: string | null = null;
        if (draft.area === "school" && draft.course?.trim()) {
          let course = courses.find(
            (item) =>
              item.name.toLowerCase() === draft.course?.trim().toLowerCase(),
          );
          if (!course) {
            course = await api.createCourse({
              name: draft.course.trim(),
              code: null,
              color: "#6366F1",
            });
            setCourses((current) => [...current, course!]);
          }
          courseId = course.id;
        }
        const created = await api.createAssignment({
          title: draft.title,
          courseId,
          dueAt: draft.dueAt,
          estimatedMinutes: draft.estimatedMinutes ?? 30,
          priority: draft.priority,
          taskType: draft.taskType,
          dependencyIds: [],
          notes: draft.notes,
          status: "confirmed",
          area: resolveArea(draft),
          activityLabel:
            draft.area === "extracurricular" ? draft.activityLabel : null,
        });
        confirmed.push(created);
      }
      setKnown((current) => [...confirmed, ...current]);
      const assignmentIds = confirmed.length ? confirmed.map(({ id }) => id) : plannedAssignmentIds;
      if (!assignmentIds.length) throw new Error("Add at least one task before generating a plan.");
      if (confirmed.length) setPlannedAssignmentIds(assignmentIds);
      const planningAssignments = confirmed.length
        ? confirmed
        : known.filter((assignment) => assignmentIds.includes(assignment.id));
      setPlan(
        await api.generatePlan({
          ...range(planningAssignments),
          area: mode === "all" ? undefined : mode,
          assignmentIds,
        }),
      );
      setStage("timeline");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Plan generation failed.",
      );
    } finally {
      setLoading(false);
    }
  }
  const shownBlocks = useMemo(
    () =>
      (plan?.blocks ?? []).filter((block) => {
        if (mode === "all" || block.kind === "break") return true;
        const assignment = known.find((item) => item.id === block.assignmentId);
        return assignment ? resolveArea(assignment) === mode : false;
      }),
    [plan, known, mode],
  );
  const hasWorkBlocks = shownBlocks.some((block) => block.kind === "work");
  const update = (index: number, patch: Partial<ParsedAssignment>) =>
    setDrafts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const updateBlockTime = (id: string, field: "startsAt" | "endsAt", value: string) => {
    if (!value) return;
    setPlan((current) => current ? {
      ...current,
      blocks: current.blocks.map((block) => block.id === id
        ? { ...block, [field]: fromDateTimeLocalValue(value), locked: true }
        : block),
    } : current);
  };
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planner // sequence engine"
        title={
          stage === "dump"
            ? "Clear your head."
            : stage === "review"
              ? "Review the details."
              : "Your time, mapped."
        }
        description={
          stage === "dump"
            ? "Drop the whole mess here. You keep final say over every detected field."
            : stage === "review"
              ? "Correct the lane, context, timing, and estimate before anything is saved."
              : "One collision-free mission rail across school and life beyond it."
        }
      />
      <div className="flex items-center gap-2" aria-label="Planner progress">
        {["Brain dump", "Review", planToday ? "Calendar" : "Timeline"].map(
          (label, index) => {
          const current = ["dump", "review", "timeline"].indexOf(stage);
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-sm font-mono text-xs font-bold ${index <= current ? "bg-accent text-[#061217]" : "bg-card-strong text-muted"}`}
              >
                {index < current ? <Check size={13} /> : index + 1}
              </span>
              <span
                className={`hidden font-mono text-[10px] uppercase tracking-wide sm:inline ${index <= current ? "text-foreground" : "text-muted"}`}
              >
                {label}
              </span>
              {index < 2 && (
                <span
                  className={`h-px flex-1 ${index < current ? "bg-accent" : "bg-border"}`}
                />
              )}
            </div>
          );
          },
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted">
            Generation scope
          </p>
          <p className="mt-1 text-xs text-muted">
            {mode === "all"
              ? "Combined plan"
              : mode === "school"
                ? "School only"
                : "ECs only"}
          </p>
        </div>
        <AreaFilterControl
          value={mode}
          onChange={setMode}
          label="Choose plan scope"
        />
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <AlertTriangle size={17} />
          {error}
        </div>
      )}
      {stage === "dump" && (
        <Card className="corner-cut border-accent/25 bg-[linear-gradient(rgba(87,215,241,.03)_1px,transparent_1px),var(--card)] bg-[length:100%_28px]">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="brain-dump"
                className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-accent"
              >
                Input console
              </label>
              <span className="flex items-center gap-2 font-mono text-[10px] text-success">
                <i className="status-pulse size-1.5 rounded-full bg-success" />
                READY
              </span>
            </div>
            <Textarea
              id="brain-dump"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-64 resize-y bg-background/70 p-4 text-base leading-7"
            />
            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Nothing persists until review is confirmed.
              </p>
              <Button
                onClick={() => void parse()}
                disabled={loading || !text.trim()}
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                Parse brain dump
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {stage === "review" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <Card
                key={`${draft.title}-${index}`}
                className={`border-l-2 ${resolveArea(draft) === "school" ? "border-l-accent" : "border-l-amber-300"}`}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-3">
                    <Field label="Task" warning={draft.missingFields.includes("title")}>
                      <Input
                        value={draft.title}
                        onChange={(event) =>
                          update(index, {
                            title: event.target.value,
                            missingFields: event.target.value.trim()
                              ? draft.missingFields.filter((field) => field !== "title")
                              : Array.from(new Set([...draft.missingFields, "title"])),
                          })
                        }
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${draft.title}`}
                      onClick={() =>
                        setDrafts((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field
                      label={
                        resolveArea(draft) === "school"
                          ? "Course"
                          : "Activity / club"
                      }
                      warning={draft.missingFields.includes(
                        resolveArea(draft) === "school" ? "course" : "activityLabel",
                      )}
                    >
                      <Input
                        value={
                          resolveArea(draft) === "school"
                            ? (draft.course ?? "")
                            : (draft.activityLabel ?? "")
                        }
                        onChange={(event) => {
                          const field =
                            resolveArea(draft) === "school"
                              ? "course"
                              : "activityLabel";
                          update(index, {
                            ...(field === "course"
                              ? { course: event.target.value || null }
                              : { activityLabel: event.target.value || null }),
                            missingFields: event.target.value.trim()
                              ? draft.missingFields.filter((item) => item !== field)
                              : Array.from(new Set([...draft.missingFields, field])),
                          });
                        }}
                      />
                    </Field>
                  <Field
                    label="Due"
                    warning={draft.missingFields.includes("dueAt")}
                  >
                    <Input
                      type="datetime-local"
                      value={
                        draft.dueAt
                          ? toDateTimeLocalValue(draft.dueAt)
                          : ""
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        update(index, {
                          dueAt: value
                            ? fromDateTimeLocalValue(value)
                            : null,
                          ambiguousDateText: value
                            ? null
                            : draft.ambiguousDateText,
                          missingFields: value
                            ? draft.missingFields.filter(
                                (field) => field !== "dueAt",
                              )
                            : Array.from(
                                new Set([...draft.missingFields, "dueAt"]),
                              ),
                          warnings: value
                            ? draft.warnings.filter(
                                (warning) =>
                                  !dateWarningPattern.test(warning),
                              )
                            : draft.warnings,
                        });
                      }}
                    />
                  </Field>
                    <Field
                      label="Duration (minutes)"
                      warning={draft.missingFields.includes("estimatedMinutes")}
                    >
                      <Input
                        type="number"
                        min="5"
                        step="5"
                        value={draft.estimatedMinutes ?? ""}
                        onChange={(event) => {
                          const minutes = Number(event.target.value) || null;
                          update(index, {
                            estimatedMinutes: minutes,
                            missingFields: minutes
                              ? draft.missingFields.filter(
                                  (field) => field !== "estimatedMinutes",
                                )
                              : Array.from(
                                  new Set([
                                    ...draft.missingFields,
                                    "estimatedMinutes",
                                  ]),
                                ),
                          });
                        }}
                      />
                    </Field>
                    <Field label="Area">
                      <select
                        aria-label={`Area for ${draft.title}`}
                        value={resolveArea(draft)}
                        onChange={(event) =>
                          update(index, {
                            area: event.target.value as WorkArea,
                          })
                        }
                        className="input"
                      >
                        <option value="school">School</option>
                        <option value="extracurricular">EC</option>
                      </select>
                    </Field>
                  </div>
                  {relevantMissingFields(draft).length > 0 && (
                    <p
                      role="status"
                      className="flex items-center gap-2 text-xs text-amber-200"
                    >
                      <AlertTriangle size={14} />
                      Add:{" "}
                      {relevantMissingFields(draft)
                        .map(missingFieldLabel)
                        .join(", ")}
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setDrafts((current) => [
                ...current,
                {
                  title: "New item",
                  area: mode === "all" ? "school" : mode,
                  areaConfidence: 1,
                  course: null,
                  activityLabel: null,
                  dueAt: null,
                  ambiguousDateText: null,
                  estimatedMinutes: 30,
                  priority: "medium",
                  taskType: "other",
                  dependencies: [],
                  notes: null,
                  confidence: 1,
                  missingFields: [],
                  warnings: [],
                },
              ])
            }
          >
            <Plus size={16} />
            Add task
          </Button>
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStage("dump")}>
              <ChevronLeft size={16} />
              Back
            </Button>
            <Button
              onClick={() => void generate()}
              disabled={loading || !drafts.length}
              className="scroll-mb-28"
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              {planToday ? "Create today’s work plan" : "Confirm and generate plan"}
            </Button>
          </div>
        </div>
      )}
      {stage === "timeline" && plan && (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border pb-4 sm:pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                  Mission rail // {mode === "all" ? "combined" : mode}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {new Date(plan.rangeStart).toLocaleDateString([], {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void generate()}
              >
                <RefreshCw size={14} />
                Regenerate
              </Button>
            </CardHeader>
            <CardContent className="space-y-0 py-5">
              {shownBlocks.map((block, index) => {
                const assignment = known.find(
                  (item) => item.id === block.assignmentId,
                );
                const blockArea = assignment
                  ? resolveArea(assignment)
                  : undefined;
                return (
                  <div
                    key={block.id}
                    className="group grid animate-[fade-in_.2s_ease-out] grid-cols-[24px_52px_12px_1fr_auto] items-stretch gap-3"
                    style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
                  >
                    <GripVertical size={16} className="mt-4 text-muted" />
                    <span className="mt-4 font-mono text-[10px] text-muted">
                      {new Date(block.startsAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="relative flex justify-center">
                      <span
                        className={`z-10 mt-4 size-2.5 rounded-full ${block.kind === "break" ? "bg-slate-500" : blockArea === "extracurricular" ? "bg-amber-300" : "bg-accent"}`}
                      />
                      {index < shownBlocks.length - 1 && (
                        <span className="absolute inset-y-5 top-6 w-px bg-border" />
                      )}
                    </div>
                    <div
                      className={`mb-3 rounded-md border-l-[3px] border-y border-r p-3 ${block.kind === "break" ? "border-slate-500/30 bg-slate-500/5" : "border-border bg-card-strong"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {block.kind === "break"
                            ? "Reset / break"
                            : (assignment?.title ?? "Scheduled work")}
                        </p>
                        {blockArea && <AreaBadge area={blockArea} />}
                        <Badge variant="outline">#{block.sequence + 1}</Badge>
                        {block.locked && (
                          <Lock size={13} className="text-muted" />
                        )}
                      </div>
                      <p className="mt-2 flex items-center gap-1 font-mono text-[10px] text-muted">
                        <Clock3 size={11} />
                        {Math.round(
                          (Date.parse(block.endsAt) -
                            Date.parse(block.startsAt)) /
                            60000,
                        )}
                        m {assignment && `· ${assignment.priority}`}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="font-mono text-[9px] uppercase text-muted">
                          Starts
                          <Input className="mt-1" type="datetime-local" value={toDateTimeLocalValue(block.startsAt)} onChange={(event) => updateBlockTime(block.id, "startsAt", event.target.value)} />
                        </label>
                        <label className="font-mono text-[9px] uppercase text-muted">
                          Ends
                          <Input className="mt-1" type="datetime-local" value={toDateTimeLocalValue(block.endsAt)} onChange={(event) => updateBlockTime(block.id, "endsAt", event.target.value)} />
                        </label>
                      </div>
                    </div>
                    <span />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <aside className="space-y-4">
            <Card className="border-t-2 border-t-success">
              <CardContent>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                  Plan health
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {shownBlocks.filter((block) => block.kind === "work").length}{" "}
                  blocks
                </p>
                <p className="mt-1 text-sm text-muted">
                  School and EC blocks remain collision-free.
                </p>
              </CardContent>
            </Card>
            {plan.unscheduledTasks.length > 0 && (
              <Card>
                <CardContent>
                  <p className="font-semibold">Needs another pass</p>
                  <ul className="mt-3 space-y-2 text-xs text-muted">
                    {plan.unscheduledTasks.map((task) => (
                      <li key={task.assignmentId}>
                        {reasonLabel[task.reason]} · {task.remainingMinutes}m
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            <Button
              className="w-full"
              onClick={() => {
                if (!hasWorkBlocks) {
                  router.push("/calendar");
                  return;
                }
                setLoading(true);
                void api.patchPlan(plan.id, {
                  status: "active",
                  blocks: plan.blocks.map((block) => ({
                    id: block.id,
                    startsAt: block.startsAt,
                    endsAt: block.endsAt,
                    locked: block.locked,
                  })),
                })
                  .then((activePlan) => {
                    setPlan(activePlan);
                    if (planToday) router.push("/calendar");
                  })
                  .catch((reason: Error) => setError(reason.message))
                  .finally(() => setLoading(false));
              }}
              disabled={plan.status === "active" || loading}
            >
              {hasWorkBlocks ? <Check size={17} /> : <CalendarPlus size={17} />}
              {plan.status === "active"
                ? "Plan active"
                : hasWorkBlocks
                  ? "Use this plan"
                  : "Import Study Blocks first"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => { setStage("dump"); setPlan(null); }}
            >
              <ChevronLeft size={16} />
              Start over
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  warning,
  children,
}: {
  label: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1.5 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${warning ? "text-amber-300" : "text-muted"}`}
      >
        {warning && <AlertTriangle size={12} />} {label}
      </span>
      {children}
    </label>
  );
}
