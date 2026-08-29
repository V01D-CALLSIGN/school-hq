"use client";
import {
  Check,
  FastForward,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AreaBadge, resolveArea } from "@/components/area-filter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Assignment, FocusSession } from "@/types/api";
const STORAGE_KEY = "school-hq-focus-session-v2",
  DEFAULT_MINUTES = 25;
type LocalSession = FocusSession & { localPausedRemainingSeconds?: number };
export function FocusTimer() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [task, setTask] = useState<Assignment | null>(null);
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.all([api.listAssignments(), api.getActiveFocusSession()])
      .then(([items, active]) => {
        const open = items.filter(
          (item) => !["completed", "archived"].includes(item.status),
        );
        setTasks(open);
        setSession(active);
        setTask(
          open.find((item) => item.id === active?.assignmentId) ?? open[0] ?? null,
        );
      })
      .catch((reason: Error) => toast.error(reason.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, [session, ready]);
  useEffect(() => {
    if (session?.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [session?.status]);
  const totalSeconds =
    (session?.plannedDurationMinutes ?? DEFAULT_MINUTES) * 60;
  const remainingSeconds = Math.max(
    0,
    useMemo(() => {
      if (!session) return totalSeconds;
      if (session.status === "completed" || session.status === "cancelled")
        return 0;
      if (
        session.status === "paused" &&
        session.localPausedRemainingSeconds !== undefined
      )
        return session.localPausedRemainingSeconds;
      const endpoint = session.pausedAt ? Date.parse(session.pausedAt) : now;
      return (
        totalSeconds -
        Math.floor((endpoint - Date.parse(session.startedAt)) / 1000) +
        session.accumulatedPauseSeconds
      );
    }, [now, session, totalSeconds]),
  );
  const progress = 1 - remainingSeconds / totalSeconds;
  const display = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  // The transition reads the latest persisted session snapshot.
  useEffect(() => {
    if (session?.status === "running" && remainingSeconds === 0)
      void transition("complete");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, session?.status]);
  async function start() {
    setBusy(true);
    try {
      if (session?.status === "paused") {
        await transition("resume");
        return;
      }
      const created = await api.createFocusSession({
        assignmentId: task?.id ?? null,
        plannedDurationMinutes: DEFAULT_MINUTES,
        startedAt: new Date().toISOString(),
      });
      setSession(created);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not start focus",
      );
    } finally {
      setBusy(false);
    }
  }
  async function transition(
    action: "pause" | "resume" | "complete" | "cancel",
  ) {
    if (!session) return;
    setBusy(true);
    const occurredAt = new Date().toISOString();
    try {
      const updated = await api.transitionFocusSession({
        id: session.id,
        action,
        occurredAt,
      });
      setSession({
        ...session,
        ...updated,
        status:
          action === "pause"
            ? "paused"
            : action === "resume"
              ? "running"
              : action === "complete"
                ? "completed"
                : "cancelled",
        pausedAt:
          action === "pause"
            ? occurredAt
            : action === "resume"
              ? null
              : updated.pausedAt,
        completedAt: action === "complete" ? occurredAt : updated.completedAt,
        localPausedRemainingSeconds:
          action === "pause"
            ? remainingSeconds
            : action === "resume"
              ? undefined
              : remainingSeconds,
      });
      if (action === "complete")
        toast.success("Focus block complete. Nice work.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Focus update failed",
      );
    } finally {
      setBusy(false);
    }
  }
  const status = session?.status ?? "idle";
  const ambient =
    status === "running"
      ? "border-violet-400/40 shadow-[0_0_70px_rgba(167,139,250,.09)]"
      : status === "paused"
        ? "border-amber-300/35"
        : status === "completed"
          ? "border-success/40 shadow-[0_0_60px_rgba(163,230,53,.08)]"
          : "border-accent/20";
  const stroke =
    status === "completed"
      ? "var(--success)"
      : status === "paused"
        ? "var(--ec)"
        : "var(--accent-2)";
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Focus // active channel"
        title="One thing. Right now."
        description="The timer follows persisted server timestamps; refreshes and route changes do not steal time."
      />
      <label className="block max-w-xl text-xs font-semibold text-muted">
        Focus task
        <select
          className="input mt-1.5"
          value={task?.id ?? ""}
          disabled={Boolean(session && ["running", "paused"].includes(session.status))}
          onChange={(event) =>
            setTask(tasks.find((item) => item.id === event.target.value) ?? null)
          }
        >
          <option value="">Choose an assignment</option>
          {tasks.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card
          className={`relative overflow-hidden transition-colors duration-200 ${ambient}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,139,250,.08),transparent_48%)]" />
          <CardContent className="relative flex min-h-[560px] flex-col items-center justify-center p-6 text-center">
            {task && <AreaBadge area={resolveArea(task)} />}
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
              Active objective
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-bold sm:text-4xl">
              {task?.title ?? "Choose your next task"}
            </h2>
            {task && (
              <p className="mt-2 text-sm text-muted">
                {task.estimatedMinutes} minute estimate · {task.priority}{" "}
                priority
              </p>
            )}
            <div className="relative my-9 grid size-64 place-items-center sm:size-80">
              <svg
                viewBox="0 0 120 120"
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="53"
                  fill="none"
                  stroke="var(--card-strong)"
                  strokeWidth="5"
                  strokeDasharray="7 3"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="53"
                  fill="none"
                  stroke={stroke}
                  strokeWidth="5"
                  strokeLinecap="butt"
                  strokeDasharray="333"
                  strokeDashoffset={333 * (1 - progress)}
                  className="transition-[stroke-dashoffset] duration-200"
                />
              </svg>
              <div>
                <p
                  aria-live="off"
                  aria-label={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}
                  className="font-mono text-6xl font-semibold tracking-[-.08em] tabular-nums sm:text-7xl"
                >
                  {display}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[.24em] text-muted">
                  {status}
                </p>
              </div>
              {status === "running" && (
                <span className="status-pulse absolute right-8 top-12 size-2 rounded-full bg-violet-400" />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {status === "running" ? (
                <Button
                  onClick={() => void transition("pause")}
                  disabled={busy}
                  className="min-w-32 bg-violet-400 text-[#100a20] hover:bg-violet-300"
                >
                  <Pause size={18} />
                  Pause
                </Button>
              ) : status === "completed" || status === "cancelled" ? (
                <Button onClick={() => setSession(null)}>
                  <RotateCcw size={18} />
                  Start another
                </Button>
              ) : (
                <Button
                  onClick={() => void start()}
                  disabled={busy || !task}
                  className="min-w-32"
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} />
                  )}{" "}
                  {status === "paused" ? "Resume" : "Start"}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => void transition("cancel")}
                disabled={
                  !session || status === "completed" || status === "cancelled"
                }
              >
                <FastForward size={17} />
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => void transition("complete")}
                disabled={!session || status === "completed"}
              >
                <Check size={17} />
                Complete
              </Button>
            </div>
          </CardContent>
        </Card>
        <aside className="space-y-5">
          <Card className="border-t-2 border-t-violet-400">
            <CardContent>
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                Session telemetry
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Target</dt>
                  <dd className="font-mono">{DEFAULT_MINUTES}m</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Started</dt>
                  <dd className="font-mono">
                    {session
                      ? new Date(session.startedAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Paused</dt>
                  <dd className="font-mono">
                    {session?.accumulatedPauseSeconds ?? 0}s
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <p className="px-2 text-xs leading-5 text-muted">
            Server timestamps are the source of truth. This device stores only
            enough state to restore the display.
          </p>
        </aside>
      </div>
    </div>
  );
}
