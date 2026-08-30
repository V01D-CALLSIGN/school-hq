"use client";
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileUp,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AreaBadge,
  AreaFilterControl,
  resolveArea,
  useAreaFilter,
} from "@/components/area-filter";
import { PageHeader } from "@/components/page-header";
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
import { api } from "@/lib/api-client";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/date-time";
import type {
  Assignment,
  CalendarClassification,
  CalendarEvent,
  WorkArea,
} from "@/types/api";

type TodayScheduleDraft = {
  assignment: Assignment;
  startsAt: string;
};

const pendingTodayKey = "school-hq-plan-today-v1";

function readPendingTodaySchedule(): TodayScheduleDraft[] {
  if (typeof window === "undefined") return [];
  const saved = sessionStorage.getItem(pendingTodayKey);
  if (!saved) return [];
  try {
    const assignments = JSON.parse(saved) as Assignment[];
    const cursor = new Date();
    cursor.setSeconds(0, 0);
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30);
    return assignments.map((assignment) => {
      const startsAt = toDateTimeLocalValue(cursor);
      cursor.setMinutes(cursor.getMinutes() + assignment.estimatedMinutes);
      return { assignment, startsAt };
    });
  } catch {
    sessionStorage.removeItem(pendingTodayKey);
    return [];
  }
}

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};
const visual = (event: CalendarEvent) =>
  event.classification === "study_available"
    ? "border-dashed border-cyan-300/45 bg-cyan-300/5 text-cyan-100"
    : event.classification === "ignored"
      ? "border-border bg-card-strong text-muted opacity-60"
      : resolveArea(event) === "extracurricular"
        ? "border-amber-300/45 bg-amber-300/10 text-amber-100"
        : "border-cyan-400/45 bg-cyan-400/10 text-cyan-100";
export function CalendarView() {
  const todayDate = toDateTimeLocalValue(new Date()).slice(0, 10);
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(
      0,
      Math.min(
        6,
        Math.round((today.getTime() - startOfWeek(today).getTime()) / 86400000),
      ),
    );
  });
  const [todaySchedule, setTodaySchedule] = useState(
    readPendingTodaySchedule,
  );
  const [area, setArea] = useAreaFilter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [editTimes, setEditTimes] = useState({ startsAt: "", endsAt: "" });
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [classification, setClassification] =
    useState<CalendarClassification>("busy");
  const [importArea, setImportArea] = useState<WorkArea>("school");
  const [manual, setManual] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    area: "school" as WorkArea,
    classification: "busy" as CalendarClassification,
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week);
    date.setDate(date.getDate() + index);
    return date;
  });
  useEffect(() => {
    void api
      .getCalendarWeek(week.toISOString(), timezone)
      .then(setEvents)
      .catch((reason: Error) => toast.error(reason.message))
      .finally(() => setLoading(false));
  }, [week, timezone]);
  useEffect(() => {
    selectedDayRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selected, week]);
  const visible = useMemo(
    () =>
      events.filter((event) => area === "all" || resolveArea(event) === area),
    [events, area],
  );
  const selectedEvents = visible
    .filter(
      (event) =>
        new Date(event.startsAt).toDateString() ===
        days[selected].toDateString(),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  async function upload() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await api.importCalendar(file, classification, importArea);
      setEvents(await api.getCalendarWeek(week.toISOString(), timezone));
      setUploadOpen(false);
      setFile(null);
      toast.success(`${result.import.eventCount} events imported`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }
  async function addManualEvent() {
    if (!manual.title.trim() || !manual.startsAt || !manual.endsAt) return;
    setLoading(true);
    try {
      const created = await api.createCalendarEvent({
        title: manual.title.trim(),
        description: null,
        location: null,
        startsAt: new Date(manual.startsAt).toISOString(),
        endsAt: new Date(manual.endsAt).toISOString(),
        allDay: false,
        classification: manual.classification,
        area: manual.area,
        originalTimezone: timezone,
      });
      setEvents((current) => [...current, created]);
      setManual({
        title: "",
        startsAt: "",
        endsAt: "",
        area: "school",
        classification: "busy",
      });
      setManualOpen(false);
      toast.success("Event saved");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not save event");
    } finally {
      setLoading(false);
    }
  }
  async function scheduleToday() {
    if (!todaySchedule.length) return;
    setLoading(true);
    const results = await Promise.allSettled(
      todaySchedule.map(({ assignment, startsAt }) => {
        const start = new Date(fromDateTimeLocalValue(startsAt));
        const end = new Date(
          start.getTime() + assignment.estimatedMinutes * 60_000,
        );
        return api.createCalendarEvent({
          title: assignment.title,
          description: `Scheduled School HQ task ${assignment.id}`,
          location: null,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          allDay: false,
          classification: "busy",
          area: resolveArea(assignment),
          originalTimezone: timezone,
        });
      }),
    );
    const created = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failed = todaySchedule.filter(
      (_, index) => results[index].status === "rejected",
    );
    setEvents((current) => [...current, ...created]);
    setTodaySchedule(failed);
    if (failed.length) {
      sessionStorage.setItem(
        pendingTodayKey,
        JSON.stringify(failed.map(({ assignment }) => assignment)),
      );
      toast.error(
        `${failed.length} task${failed.length === 1 ? "" : "s"} could not be scheduled`,
      );
    } else {
      sessionStorage.removeItem(pendingTodayKey);
      window.history.replaceState({}, "", "/calendar");
      const first = created.reduce(
        (earliest, event) =>
          Date.parse(event.startsAt) < Date.parse(earliest.startsAt)
            ? event
            : earliest,
        created[0],
      );
      const last = created.reduce(
        (latest, event) =>
          Date.parse(event.endsAt) > Date.parse(latest.endsAt) ? event : latest,
        created[0],
      );
      const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
      toast.success(
        `${created.length} task${created.length === 1 ? "" : "s"} added · ${formatTime(first.startsAt)}–${formatTime(last.endsAt)}`,
        {
          action: {
            label: "Undo",
            onClick: () => void undoScheduledEvents(created),
          },
        },
      );
    }
    setLoading(false);
  }
  async function undoScheduledEvents(created: CalendarEvent[]) {
    const ids = new Set(created.map((event) => event.id));
    setEvents((current) => current.filter((event) => !ids.has(event.id)));
    const results = await Promise.allSettled(
      created.map((event) => api.deleteCalendarEvent(event.id)),
    );
    const failed = created.filter(
      (_, index) => results[index].status === "rejected",
    );
    if (failed.length) {
      setEvents((current) => [...current, ...failed]);
      toast.error("Some scheduled blocks could not be restored");
    } else {
      toast.success("Today’s new blocks were removed");
    }
  }
  function beginEdit(event: CalendarEvent) {
    setEditing(event);
    setEditTimes({
      startsAt: toDateTimeLocalValue(event.startsAt),
      endsAt: toDateTimeLocalValue(event.endsAt),
    });
  }
  async function saveEdit() {
    if (!editing || !editTimes.startsAt || !editTimes.endsAt) return;
    setLoading(true);
    try {
      const times = {
        startsAt: fromDateTimeLocalValue(editTimes.startsAt),
        endsAt: fromDateTimeLocalValue(editTimes.endsAt),
      };
      const updated = editing.planBlockId
        ? { ...editing, ...(await api.patchPlanBlock({ id: editing.planBlockId, ...times })) }
        : await api.patchCalendarEvent({ id: editing.id, ...times });
      setEvents((current) =>
        current.map((event) => (event.id === updated.id ? updated : event)),
      );
      setEditing(null);
      toast.success("Time block updated");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not update time block",
      );
    } finally {
      setLoading(false);
    }
  }
  async function removeEvent(event: CalendarEvent) {
    const previous = events;
    setEvents((current) => current.filter((item) => item.id !== event.id));
    try {
      if (event.planBlockId) await api.deletePlanBlock(event.planBlockId);
      else await api.deleteCalendarEvent(event.id);
      toast.success("Event removed");
    } catch (reason) {
      setEvents(previous);
      toast.error(reason instanceof Error ? reason.message : "Could not remove event");
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Calendar // weekly grid"
        title="Commitments on one radar."
        description="School, ECs, and usable study space—separate signals on the same timeline."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setManualOpen(true)}>
              <CalendarPlus size={16} />
              Manual
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <FileUp size={16} />
              Import .ics
            </Button>
          </div>
        }
      />
      {todaySchedule.length > 0 && (
        <Card className="corner-cut border-accent/40">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-accent">
                  Plan today
                </p>
                <h2 className="mt-1 text-xl font-bold">Place each task.</h2>
                <p className="mt-1 text-sm text-muted">
                  Choose when you will start. The block length uses each task’s
                  estimate.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {todaySchedule.map((draft, index) => {
                const startTime = Date.parse(draft.startsAt);
                const endTime = Number.isNaN(startTime)
                  ? null
                  : new Date(
                      startTime +
                        draft.assignment.estimatedMinutes * 60_000,
                    );
                return (
                  <div
                    key={draft.assignment.id}
                    className="grid gap-3 rounded-md border border-border bg-card-strong p-3 sm:grid-cols-[1fr_220px] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{draft.assignment.title}</p>
                        <AreaBadge area={resolveArea(draft.assignment)} />
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        {draft.assignment.estimatedMinutes}m block · ends {" "}
                        {endTime
                          ? endTime.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <label className="text-xs font-semibold text-muted">
                      Starts
                      <Input
                        type="datetime-local"
                        className="mt-1.5"
                        min={`${todayDate}T00:00`}
                        max={`${todayDate}T23:59`}
                        value={draft.startsAt}
                        onChange={(event) =>
                          setTodaySchedule((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, startsAt: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <Button
              className="mt-5 w-full sm:w-auto"
              disabled={
                loading ||
                todaySchedule.some(
                  ({ startsAt }) =>
                    !startsAt ||
                    Number.isNaN(Date.parse(startsAt)) ||
                    !startsAt.startsWith(`${todayDate}T`),
                )
              }
              onClick={() => void scheduleToday()}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              Add to today’s calendar
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous week"
            onClick={() =>
              setWeek((current) => new Date(current.getTime() - 7 * 86400000))
            }
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next week"
            onClick={() =>
              setWeek((current) => new Date(current.getTime() + 7 * 86400000))
            }
          >
            <ChevronRight size={17} />
          </Button>
          <span className="ml-1 font-mono text-xs text-muted">
            {days[0].toLocaleDateString([], { month: "short", day: "numeric" })}
            —
            {days[6].toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <AreaFilterControl value={area} onChange={setArea} />
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 md:hidden scrollbar-none"
        aria-label="Choose day"
      >
        {days.map((date, index) => (
          <button
            ref={selected === index ? selectedDayRef : undefined}
            key={date.toISOString()}
            onClick={() => setSelected(index)}
            className={`min-h-11 shrink-0 rounded-lg border-l-2 px-4 font-mono text-xs ${selected === index ? "border-l-accent bg-accent/10 text-accent" : "border-border bg-card text-muted"}`}
          >
            {date.toLocaleDateString([], { weekday: "short", day: "numeric" })}
          </button>
        ))}
      </div>
      <Card className="md:hidden">
        <CardContent className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[.15em] text-muted">
            Timeline //{" "}
            {days[selected].toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          {selectedEvents.map((event, index) => (
            <div
              key={event.id}
              className="grid grid-cols-[54px_12px_minmax(0,1fr)] gap-2"
            >
              <span className="pt-3 text-right font-mono text-[10px] text-muted">
                {new Date(event.startsAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="relative flex justify-center">
                <i className="z-10 mt-4 size-2.5 rounded-full bg-accent" />
                {index < selectedEvents.length - 1 && (
                  <i className="absolute bottom-[-.75rem] top-5 w-px bg-border" />
                )}
              </span>
              <EventCard
                event={event}
                onEdit={() => beginEdit(event)}
                onDelete={() => void removeEvent(event)}
              />
            </div>
          ))}
          {!loading && !selectedEvents.length && (
              <div className="py-14 text-center">
                <CalendarPlus className="mx-auto mb-3 text-accent" />
                <p className="font-semibold">This lane is clear.</p>
                <p className="mt-1 text-sm text-muted">
                  A suspiciously rare scheduling win.
                </p>
              </div>
            )}
          {loading && (
            <LoaderCircle className="mx-auto my-16 animate-spin text-accent" />
          )}
        </CardContent>
      </Card>
      <Card className="hidden overflow-hidden rounded-md md:block">
        <div className="grid grid-cols-[56px_repeat(7,minmax(90px,1fr))] border-b border-border bg-card-strong">
          <div className="grid place-items-center font-mono text-[9px] text-muted">
            LOCAL
          </div>
          {days.map((date) => (
            <div
              key={date.toISOString()}
              className="border-l border-border p-3 text-center font-mono text-[11px] font-semibold"
            >
              {date.toLocaleDateString([], {
                weekday: "short",
                day: "numeric",
              })}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[56px_repeat(7,minmax(90px,1fr))]">
          <div>
            {[8, 10, 12, 14, 16, 18, 20].map((hour) => (
              <div
                key={hour}
                className="h-24 border-b border-border pr-2 pt-1 text-right font-mono text-[9px] text-muted"
              >
                {hour > 12 ? hour - 12 : hour}
                {hour >= 12 ? "P" : "A"}
              </div>
            ))}
          </div>
          {days.map((date) => (
            <div
              key={date.toISOString()}
              className="relative h-[672px] border-l border-border bg-[linear-gradient(var(--border)_1px,transparent_1px)] bg-[length:100%_96px]"
            >
              {visible
                .filter(
                  (event) =>
                    new Date(event.startsAt).toDateString() ===
                    date.toDateString(),
                )
                .map((event) => {
                  const start = new Date(event.startsAt),
                    end = new Date(event.endsAt);
                  const top =
                    (start.getHours() + start.getMinutes() / 60 - 8) * 48;
                  const height = Math.max(
                    30,
                    ((end.getTime() - start.getTime()) / 3600000) * 48,
                  );
                  return (
                    <div
                      key={event.id}
                      className={`absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] border-y border-r p-1.5 text-[10px] ${visual(event)}`}
                      style={{ top, height }}
                    >
                      <strong className="block truncate">{event.title}</strong>
                      <button
                        type="button"
                        aria-label={`Edit ${event.title}`}
                        className="absolute bottom-1 right-1 rounded p-0.5 opacity-60 hover:opacity-100"
                        onClick={() => beginEdit(event)}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${event.title}`}
                        className="absolute right-1 top-1 rounded p-0.5 opacity-60 hover:opacity-100"
                        onClick={() => void removeEvent(event)}
                      >
                        <Trash2 size={11} />
                      </button>
                      <span className="font-mono opacity-75">
                        {start.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-wide text-muted">
        <span className="flex items-center gap-2">
          <i className="h-3 w-1 bg-accent" />
          School
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-1 bg-amber-300" />
          EC
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-1 border-l border-dashed border-cyan-300" />
          Study Blocks
        </span>
      </div>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import calendar feed</DialogTitle>
            <DialogDescription>
              Import your own .ics schedule. Choose Study Blocks so planning fits assignments inside those times.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-card-strong file:px-3 file:py-2 file:text-foreground"
            />
            <Choice
              label="Area"
              value={importArea}
              setValue={(value) => setImportArea(value as WorkArea)}
              options={[
                ["school", "School"],
                ["extracurricular", "EC"],
              ]}
            />
            <Choice
              label="Classification"
              value={classification}
              setValue={(value) =>
                setClassification(value as CalendarClassification)
              }
              options={[
                ["busy", "Busy"],
                ["study_available", "Study Blocks / available"],
                ["ignored", "Ignore"],
              ]}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!file || loading} onClick={() => void upload()}>
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <FileUp size={16} />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual calendar event</DialogTitle>
            <DialogDescription>
              Add a commitment or available study window to your calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-3">
            <Input
              placeholder="Event title"
              value={manual.title}
              onChange={(event) =>
                setManual({ ...manual, title: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted">
                Starts
                <Input
                  type="datetime-local"
                  className="mt-1.5"
                  value={manual.startsAt}
                  onChange={(event) =>
                    setManual({ ...manual, startsAt: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Ends
                <Input
                  type="datetime-local"
                  className="mt-1.5"
                  value={manual.endsAt}
                  onChange={(event) =>
                    setManual({ ...manual, endsAt: event.target.value })
                  }
                />
              </label>
            </div>
            <Choice
              label="Area"
              value={manual.area}
              setValue={(value) =>
                setManual({ ...manual, area: value as WorkArea })
              }
              options={[
                ["school", "School"],
                ["extracurricular", "EC"],
              ]}
            />
            <Choice
              label="Classification"
              value={manual.classification}
              setValue={(value) =>
                setManual({
                  ...manual,
                  classification: value as CalendarClassification,
                })
              }
              options={[
                ["busy", "Busy"],
                ["study_available", "Available to study"],
                ["ignored", "Ignored"],
              ]}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                !manual.title.trim() ||
                !manual.startsAt ||
                !manual.endsAt ||
                Date.parse(manual.endsAt) <= Date.parse(manual.startsAt)
              }
              onClick={() => void addManualEvent()}
            >
              {loading && <LoaderCircle className="animate-spin" size={16} />}
              Save event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust time block</DialogTitle>
            <DialogDescription>
              Change when you will work or extend the block’s duration.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-3">
            <p className="text-sm font-semibold">{editing?.title}</p>
            <label className="text-xs font-semibold text-muted">
              Starts
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={editTimes.startsAt}
                onChange={(event) =>
                  setEditTimes((current) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Ends
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={editTimes.endsAt}
                onChange={(event) =>
                  setEditTimes((current) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                !editTimes.startsAt ||
                !editTimes.endsAt ||
                Date.parse(editTimes.endsAt) <= Date.parse(editTimes.startsAt)
              }
              onClick={() => void saveEdit()}
            >
              {loading && <LoaderCircle className="animate-spin" size={16} />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const start = new Date(event.startsAt),
    end = new Date(event.endsAt);
  return (
    <div
      className={`rounded-md border-l-[3px] border-y border-r p-3 ${visual(event)}`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{event.title}</p>
        <AreaBadge area={resolveArea(event)} />
        <button
          type="button"
          aria-label={`Edit ${event.title}`}
          onClick={(mouseEvent) => {
            mouseEvent.stopPropagation();
            onEdit();
          }}
          className="text-muted hover:text-accent"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          aria-label={`Delete ${event.title}`}
          onClick={(mouseEvent) => {
            mouseEvent.stopPropagation();
            onDelete();
          }}
          className="text-muted hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <p className="mt-2 font-mono text-xs opacity-75">
        {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}—
        {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}
function Choice({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[][];
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([key, text]) => (
          <button
            type="button"
            key={key}
            onClick={() => setValue(key)}
            className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${value === key ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
