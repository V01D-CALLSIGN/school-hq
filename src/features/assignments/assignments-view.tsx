"use client";
import { Check, Filter, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AreaBadge,
  AreaFilterControl,
  resolveArea,
  useAreaFilter,
} from "@/components/area-filter";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Assignment, Course, WorkArea } from "@/types/api";

export function AssignmentsView() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "completed">("all");
  const [area, setArea] = useAreaFilter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    area: "school" as WorkArea,
    courseId: "",
    activityLabel: "",
    dueAt: "",
    estimatedMinutes: 30,
  });
  useEffect(() => {
    void Promise.all([api.listAssignments(), api.listCourses()])
      .then(([nextItems, nextCourses]) => {
        setItems(nextItems);
        setCourses(nextCourses);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (area === "all" || resolveArea(item) === area) &&
          (status === "all" ||
            (status === "completed"
              ? item.status === "completed"
              : !["completed", "archived"].includes(item.status))) &&
          item.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, area, query, status],
  );
  const contextFor = (item: Assignment) =>
    resolveArea(item) === "extracurricular"
      ? (item.activityLabel ?? "Extracurricular")
      : (courses.find((course) => course.id === item.courseId)?.name ??
        "No course");
  async function add() {
    if (!draft.title.trim()) return;
    setLoading(true);
    try {
      const created = await api.createAssignment({
        title: draft.title.trim(),
        area: draft.area,
        activityLabel:
          draft.area === "extracurricular"
            ? draft.activityLabel.trim() || null
            : null,
        courseId: draft.area === "school" ? draft.courseId || null : null,
        dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
        estimatedMinutes: draft.estimatedMinutes,
        priority: "medium",
        taskType: "assignment",
        dependencyIds: [],
        notes: null,
        status: "confirmed",
      });
      setItems((current) => [created, ...current]);
      setAdding(false);
      setDraft({
        title: "",
        area: "school",
        courseId: "",
        activityLabel: "",
        dueAt: "",
        estimatedMinutes: 30,
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not add that item.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function toggle(item: Assignment) {
    const next = item.status === "completed" ? "confirmed" : "completed";
    setItems((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, status: next } : value,
      ),
    );
    try {
      await api.patchAssignment({ id: item.id, status: next });
    } catch (reason) {
      setItems((current) =>
        current.map((value) => (value.id === item.id ? item : value)),
      );
      setError(reason instanceof Error ? reason.message : "Update failed.");
    }
  }
  async function remove(item: Assignment) {
    const previous = items;
    setItems((current) => current.filter((value) => value.id !== item.id));
    try {
      await api.deleteAssignment(item.id);
    } catch (reason) {
      setItems(previous);
      setError(reason instanceof Error ? reason.message : "Delete failed.");
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Assignments // queue"
        title="Everything due, nothing buried."
        description="School and EC work share one queue without becoming the same thing."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} />
            New item
          </Button>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search assignments</span>
          <Search size={17} className="absolute left-3 top-3.5 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the queue…"
            className="pl-10"
          />
        </label>
        <AreaFilterControl value={area} onChange={setArea} />
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "open", "completed"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold capitalize ${status === value ? "bg-card-strong text-foreground" : "text-muted"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <Card className="overflow-hidden border-l-2 border-l-accent/70">
        <CardContent className="p-0">
          {loading && !items.length ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-14" />
              ))}
            </div>
          ) : visible.length ? (
            visible.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[36px_1fr_auto_auto] items-center gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[40px_1fr_130px_auto_auto]"
              >
                <button
                  aria-label={
                    item.status === "completed"
                      ? `Mark ${item.title} incomplete`
                      : `Complete ${item.title}`
                  }
                  onClick={() => void toggle(item)}
                  className={`grid size-6 place-items-center rounded-full border ${item.status === "completed" ? "border-success bg-success text-[#142005]" : "border-border hover:border-success"}`}
                >
                  {item.status === "completed" && <Check size={14} />}
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p
                      className={`truncate text-sm font-semibold ${item.status === "completed" ? "text-muted line-through" : ""}`}
                    >
                      {item.title}
                    </p>
                    <AreaBadge area={resolveArea(item)} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {contextFor(item)} ·{" "}
                    {item.dueAt
                      ? new Date(item.dueAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                      : "No due date"}
                  </p>
                </div>
                <span className="hidden font-mono text-xs text-muted sm:block">
                  {item.estimatedMinutes}m
                </span>
                <Badge
                  variant={
                    item.priority === "urgent" || item.priority === "high"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {item.priority}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${item.title}`}
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))
          ) : (
            <div className="grid min-h-56 place-items-center p-6 text-center">
              <div>
                <Filter className="mx-auto mb-3 text-accent" />
                <p className="font-semibold">Nothing on this channel.</p>
                <p className="mt-1 text-sm text-muted">
                  Change the filter or add the next thing.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New work item</DialogTitle>
            <DialogDescription>
              Choose the lane now so planning and stats stay honest.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-muted">
              Title
              <Input
                autoFocus
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                className="mt-1.5"
              />
            </label>
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-muted">
                Area
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(["school", "extracurricular"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft({ ...draft, area: value })}
                    className={`min-h-11 rounded-lg border text-sm font-semibold ${draft.area === value ? (value === "school" ? "border-accent bg-accent/10 text-accent" : "border-amber-300/40 bg-amber-300/10 text-amber-200") : "border-border text-muted"}`}
                  >
                    {value === "school" ? "School" : "Extracurricular"}
                  </button>
                ))}
              </div>
            </fieldset>
            {draft.area === "school" ? (
              <label className="block text-xs font-semibold text-muted">
                Course (optional)
                <select
                  className="input mt-1.5"
                  value={draft.courseId}
                  onChange={(event) =>
                    setDraft({ ...draft, courseId: event.target.value })
                  }
                >
                  <option value="">No course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                {!courses.length && (
                  <span className="mt-1 block font-normal text-muted">
                    Add courses from Settings when you need them.
                  </span>
                )}
              </label>
            ) : (
              <label className="block text-xs font-semibold text-muted">
                Activity, club, team, or project
                <Input
                  value={draft.activityLabel}
                  onChange={(event) =>
                    setDraft({ ...draft, activityLabel: event.target.value })
                  }
                  className="mt-1.5"
                  placeholder="Activity name"
                />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted">
                Due
                <Input
                  type="datetime-local"
                  value={draft.dueAt}
                  onChange={(event) =>
                    setDraft({ ...draft, dueAt: event.target.value })
                  }
                  className="mt-1.5"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Minutes
                <Input
                  type="number"
                  min={0}
                  value={draft.estimatedMinutes}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      estimatedMinutes: Number(event.target.value),
                    })
                  }
                  className="mt-1.5"
                />
              </label>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void add()}
              disabled={!draft.title.trim() || loading}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Add item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
