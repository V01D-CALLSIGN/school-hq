"use client";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LoaderCircle,
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
import { isMockMode } from "@/lib/supabase/client";
import type {
  CalendarClassification,
  CalendarEvent,
  WorkArea,
} from "@/types/api";

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
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState(4);
  const [area, setArea] = useAreaFilter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [classification, setClassification] =
    useState<CalendarClassification>("busy");
  const [importArea, setImportArea] = useState<WorkArea>("school");
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
  const visible = useMemo(
    () =>
      events.filter((event) => area === "all" || resolveArea(event) === area),
    [events, area],
  );
  async function upload() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await api.importCalendar(file, classification, importArea);
      setEvents(
        result.events.map((event) => ({
          ...event,
          area: event.area ?? importArea,
        })),
      );
      setUploadOpen(false);
      setFile(null);
      toast.success(`${result.import.eventCount} events imported`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setLoading(false);
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
            Agenda //{" "}
            {days[selected].toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          {visible
            .filter(
              (event) =>
                new Date(event.startsAt).toDateString() ===
                days[selected].toDateString(),
            )
            .map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          {!loading &&
            !visible.some(
              (event) =>
                new Date(event.startsAt).toDateString() ===
                days[selected].toDateString(),
            ) && (
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
          Available
        </span>
      </div>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import calendar feed</DialogTitle>
            <DialogDescription>
              Classification and area apply to every event in this file.
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
                ["study_available", "Available"],
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
              {isMockMode()
                ? "Choose an area for this local test event."
                : "The backend does not expose a manual calendar-event endpoint yet."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-3">
            <Input placeholder="Event title" disabled={!isMockMode()} />
            <Choice
              label="Area"
              value={importArea}
              setValue={(value) => setImportArea(value as WorkArea)}
              options={[
                ["school", "School"],
                ["extracurricular", "EC"],
              ]}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setManualOpen(false)}>
              Close
            </Button>
            <Button
              disabled={!isMockMode()}
              onClick={() => {
                toast.success("Mock event added");
                setManualOpen(false);
              }}
            >
              Add event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EventCard({ event }: { event: CalendarEvent }) {
  const start = new Date(event.startsAt),
    end = new Date(event.endsAt);
  return (
    <div
      className={`rounded-md border-l-[3px] border-y border-r p-3 ${visual(event)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{event.title}</p>
        <AreaBadge area={resolveArea(event)} />
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
