"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AreaBadge,
  AreaFilterControl,
  resolveArea,
  useAreaFilter,
} from "@/components/area-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api-client";
import type {
  Assignment,
  CalendarEvent,
  StatsSummary,
  WorkArea,
} from "@/types/api";
export function Dashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const [area, setArea] = useAreaFilter();
  const [renderedAt] = useState(() => new Date());
  const [items, setItems] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [dump, setDump] = useState("");
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    const now = new Date();
    void Promise.all([
      api.listAssignments(),
      api.getCalendarWeek(now.toISOString(), timezone),
      api.getStats(timezone),
    ])
      .then(([nextItems, nextEvents, nextStats]) => {
        setItems(nextItems);
        setEvents(nextEvents);
        setStats(nextStats);
      })
      .catch((reason: Error) => toast.error(reason.message))
      .finally(() => setLoading(false));
  }, [timezone]);
  const scoped = useMemo(
    () => items.filter((item) => area === "all" || resolveArea(item) === area),
    [items, area],
  );
  const open = scoped
    .filter((item) => !["completed", "archived"].includes(item.status))
    .sort(
      (a, b) => Date.parse(a.dueAt ?? "9999") - Date.parse(b.dueAt ?? "9999"),
    );
  const upcomingEvents = events
    .filter((event) => Date.parse(event.endsAt) > renderedAt.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const nextEvent = upcomingEvents.find(
    (event) => area === "all" || resolveArea(event) === area,
  );
  const statsSlice = stats?.[area === "all" ? "combined" : area];
  const hour = renderedAt.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const identity = session?.user.email?.split("@")[0];
  async function parse() {
    setParsing(true);
    try {
      const result = await api.parseBrainDump({ text: dump, timezone });
      sessionStorage.setItem(
        "school-hq-pending-review-v1",
        JSON.stringify({ text: dump, drafts: result.parsedAssignments }),
      );
      toast.success(
        `${result.parsedAssignments.length} item${result.parsedAssignments.length === 1 ? "" : "s"} ready to review in Planner`,
      );
      setDump("");
      router.push("/planner");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not parse that dump",
      );
    } finally {
      setParsing(false);
    }
  }
  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden border-b border-border pb-5">
        <div className="absolute right-0 top-0 hidden font-mono text-[9rem] leading-none text-foreground/[.018] sm:block">
          HQ
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-accent">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(renderedAt)}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting}
              {identity ? `, ${identity}` : "."}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-2">
                <i className="status-pulse size-1.5 rounded-full bg-success" />
                HQ online
              </span>
              <span>·</span>
              <span>
                {open.length} open item{open.length === 1 ? "" : "s"}
              </span>
              {nextEvent && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CalendarClock size={14} />
                    {nextEvent.title} next
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <AreaFilterControl value={area} onChange={setArea} />
            <Button asChild className="corner-cut min-w-44">
              <Link href="/planner?today=1">
                <Sparkles size={17} />
                Plan today <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
        <div className="space-y-5">
          <Card className="corner-cut border-accent/25 bg-[linear-gradient(rgba(87,215,241,.035)_1px,transparent_1px),var(--card)] bg-[length:100%_27px]">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[.14em] text-accent">
                  <Brain size={17} />
                  Brain-dump console
                </span>
                <span className="font-mono text-[9px] text-muted">
                  NATURAL INPUT
                </span>
              </div>
              <label htmlFor="quick-dump" className="sr-only">
                Quickly add what is on your mind
              </label>
              <Textarea
                id="quick-dump"
                value={dump}
                onChange={(event) => setDump(event.target.value)}
                rows={3}
                placeholder="What needs your attention?"
                className="bg-background/60"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="hidden text-xs text-muted sm:block">
                  You will review every detected field before saving.
                </p>
                <Button
                  onClick={() => void parse()}
                  disabled={!dump.trim() || parsing}
                  className="ml-auto"
                >
                  {parsing ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Radio size={16} />
                  )}
                  Parse input
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-md">
            <CardHeader className="border-b border-border pb-4 sm:pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                  Mission rail
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Next meaningful work
                </h2>
              </div>
              <Link
                href="/planner"
                className="text-xs font-semibold text-accent"
              >
                Open planner
              </Link>
            </CardHeader>
            <CardContent className="py-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((key) => (
                    <Skeleton className="h-14" key={key} />
                  ))}
                </div>
              ) : open.length ? (
                <div>
                  {open.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[48px_12px_1fr_auto] gap-3"
                    >
                      <span className="pt-3 font-mono text-[10px] text-muted">
                        {item.dueAt
                          ? new Date(item.dueAt).toLocaleDateString([], {
                              month: "numeric",
                              day: "numeric",
                            })
                          : "OPEN"}
                      </span>
                      <div className="relative flex justify-center">
                        <i
                          className={`z-10 mt-3 size-2.5 rounded-full ${resolveArea(item) === "school" ? "bg-accent" : "bg-amber-300"}`}
                        />
                        {index < Math.min(open.length, 5) - 1 && (
                          <i className="absolute inset-y-5 top-5 w-px bg-border" />
                        )}
                      </div>
                      <div
                        className={`mb-2 border-l-2 bg-card-strong px-3 py-2 ${resolveArea(item) === "school" ? "border-l-accent" : "border-l-amber-300"}`}
                      >
                        <p className="truncate text-sm font-semibold">
                          {item.title}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          {item.estimatedMinutes}m · {item.priority}
                        </p>
                      </div>
                      <AreaBadge area={resolveArea(item)} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyLine />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-5 md:grid-cols-2">
            <UpcomingLane title="School queue" area="school" items={items} />
            <UpcomingLane
              title="EC queue"
              area="extracurricular"
              items={items}
            />
          </div>
        </div>
        <aside className="space-y-5">
          <Card className="border-t-2 border-t-violet-400">
            <CardContent>
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                Workload status
              </p>
              <p className="mt-3 text-4xl font-bold">
                {loading
                  ? "—"
                  : open.reduce(
                      (total, item) => total + item.estimatedMinutes,
                      0,
                    )}
                <span className="ml-1 text-base text-muted">min</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                Estimated open workload in this view.
              </p>
              <Button asChild variant="secondary" className="mt-5 w-full">
                <Link href="/focus">Enter focus mode</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                  This week
                </p>
                <h2 className="mt-1 text-lg font-semibold">Actual telemetry</h2>
              </div>
              <Clock3 className="text-accent" size={18} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card-strong p-3">
                  <p className="text-xl font-semibold">
                    {statsSlice?.focus.focusedMinutesThisWeek ?? "—"}m
                  </p>
                  <p className="text-xs text-muted">focused</p>
                </div>
                <div className="bg-card-strong p-3">
                  <p className="text-xl font-semibold">
                    {statsSlice?.assignments.completed ?? "—"}
                  </p>
                  <p className="text-xs text-muted">completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {nextEvent && (
            <Card
              className={`border-l-2 ${resolveArea(nextEvent) === "school" ? "border-l-accent" : "border-l-amber-300"}`}
            >
              <CardContent>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                  Next event
                </p>
                <h3 className="mt-3 font-semibold">{nextEvent.title}</h3>
                <p className="mt-2 font-mono text-xs text-muted">
                  {new Date(nextEvent.startsAt).toLocaleString([], {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
function UpcomingLane({
  title,
  area,
  items,
}: {
  title: string;
  area: WorkArea;
  items: Assignment[];
}) {
  const next = items
    .filter(
      (item) =>
        resolveArea(item) === area &&
        !["completed", "archived"].includes(item.status),
    )
    .slice(0, 3);
  return (
    <Card
      className={`border-l-2 ${area === "school" ? "border-l-accent" : "border-l-amber-300"}`}
    >
      <CardHeader>
        <div>
          <p
            className={`font-mono text-[10px] uppercase tracking-[.14em] ${area === "school" ? "text-accent" : "text-amber-200"}`}
          >
            {title}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{next.length} upcoming</h2>
        </div>
        {area === "school" ? (
          <CheckCircle2 size={18} className="text-accent" />
        ) : (
          <Radio size={18} className="text-amber-300" />
        )}
      </CardHeader>
      <CardContent>
        {next.length ? (
          <div className="space-y-2">
            {next.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-t border-border pt-2 first:border-0 first:pt-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.title}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {item.estimatedMinutes}m
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyLine />
        )}
      </CardContent>
    </Card>
  );
}
function EmptyLine() {
  return (
    <div className="py-5 text-center">
      <CheckCircle2 className="mx-auto mb-2 text-success" size={20} />
      <p className="text-sm font-medium">Nothing queued here.</p>
    </div>
  );
}
