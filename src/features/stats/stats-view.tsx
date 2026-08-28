"use client";
import { Award, Clock3, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AreaFilterControl,
  resolveArea,
  useAreaFilter,
} from "@/components/area-filter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Assignment, StatsSummary } from "@/types/api";
export function StatsView() {
  const [area, setArea] = useAreaFilter();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [renderedAt] = useState(() => Date.now());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void Promise.all([api.getStats(timezone), api.listAssignments()])
      .then(([stats, items]) => {
        setSummary(stats);
        setAssignments(items);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);
  const totals = useMemo(() => {
    const scoped = assignments.filter(
      (item) => area === "all" || resolveArea(item) === area,
    );
    return {
      total: scoped.length,
      completed: scoped.filter((item) => item.status === "completed").length,
      overdue: scoped.filter(
        (item) =>
          item.dueAt &&
          Date.parse(item.dueAt) < renderedAt &&
          !["completed", "archived"].includes(item.status),
      ).length,
    };
  }, [assignments, area, renderedAt]);
  const school = assignments.filter((item) => resolveArea(item) === "school"),
    ec = assignments.filter((item) => resolveArea(item) === "extracurricular");
  const completion = totals.total
    ? Math.round((totals.completed / totals.total) * 100)
    : 0;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stats // telemetry"
        title="Momentum, not surveillance."
        description="Use the signal to adjust the plan—not to guilt-trip yourself over Tuesday."
        action={<AreaFilterControl value={area} onChange={setArea} />}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!summary ? (
          [1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-32" />)
        ) : (
          <>
            <Metric
              label="Focused this week"
              value={`${summary.focus.focusedMinutesThisWeek}m`}
              detail={`${summary.focus.completedSessionsThisWeek} sessions`}
              icon={Clock3}
              accent="text-violet-300"
            />
            <Metric
              label={`${area === "all" ? "Combined" : area === "school" ? "School" : "EC"} completed`}
              value={`${totals.completed}`}
              detail={`${totals.total} total`}
              icon={Target}
              accent={
                area === "extracurricular" ? "text-amber-300" : "text-accent"
              }
            />
            <Metric
              label="Overdue"
              value={`${totals.overdue}`}
              detail="Needs attention"
              icon={Award}
              accent={totals.overdue ? "text-danger" : "text-success"}
            />
            <Metric
              label="Scheduled"
              value={`${summary.plan.scheduledMinutesThisWeek}m`}
              detail="This week"
              icon={Clock3}
              accent="text-slate-300"
            />
          </>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="corner-cut border-t-2 border-t-accent">
          <CardHeader>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted">
                Completion channel
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {area === "all"
                  ? "Combined work"
                  : area === "school"
                    ? "Schoolwork"
                    : "Extracurriculars"}
              </h2>
            </div>
            <span className="font-mono text-2xl font-semibold">
              {completion}%
            </span>
          </CardHeader>
          <CardContent>
            <Progress value={completion} />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <AreaTotal label="School" items={school} />
              <AreaTotal label="ECs" items={ec} ec />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-violet-400">
          <CardContent>
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted">
              Backend totals
            </p>
            <p className="mt-4 text-4xl font-bold">
              {summary?.assignments.completed ?? 0}
            </p>
            <p className="mt-1 text-sm text-muted">all-time completed</p>
            <div className="mt-5 border-t border-border pt-4 text-xs text-muted">
              <span className="font-mono text-foreground">
                {summary?.assignments.incomplete ?? 0}
              </span>{" "}
              still open ·{" "}
              <span className="font-mono text-danger">
                {summary?.assignments.overdue ?? 0}
              </span>{" "}
              overdue
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Clock3;
  accent: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
          <div
            className={`grid size-10 place-items-center rounded-md bg-card-strong ${accent}`}
          >
            <Icon size={19} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function AreaTotal({
  label,
  items,
  ec = false,
}: {
  label: string;
  items: Assignment[];
  ec?: boolean;
}) {
  const done = items.filter((item) => item.status === "completed").length;
  return (
    <div
      className={`border-l-2 bg-card-strong p-3 ${ec ? "border-l-amber-300" : "border-l-accent"}`}
    >
      <p
        className={`font-mono text-[10px] uppercase ${ec ? "text-amber-200" : "text-accent"}`}
      >
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">
        {done}
        <span className="text-sm text-muted">/{items.length}</span>
      </p>
    </div>
  );
}
