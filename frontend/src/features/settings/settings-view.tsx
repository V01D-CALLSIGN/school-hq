"use client";
import Link from "next/link";
import {
  BookOpen,
  CalendarSync,
  Check,
  Clock3,
  LoaderCircle,
  LogOut,
  Moon,
  Palette,
  Plus,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api-client";
import type { Course, SchedulingPreferences } from "@/types/api";

export function SettingsView() {
  const { session, signOut } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseColor, setCourseColor] = useState("#6366F1");
  const [preferences, setPreferences] = useState<SchedulingPreferences | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    queueMicrotask(() =>
      setTheme(
        localStorage.getItem("school-hq-theme") === "light" ? "light" : "dark",
      ),
    );
    void Promise.all([api.listCourses(), api.getSchedulingPreferences()])
      .then(([nextCourses, nextPreferences]) => {
        setCourses(nextCourses);
        setPreferences(nextPreferences);
      })
      .catch((reason: Error) => toast.error(reason.message));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const choose = (value: "dark" | "light") => {
    setTheme(value);
    localStorage.setItem("school-hq-theme", value);
  };
  async function addCourse() {
    if (!courseName.trim()) return;
    setBusy(true);
    try {
      const course = await api.createCourse({
        name: courseName.trim(),
        code: courseCode.trim() || null,
        color: courseColor,
      });
      setCourses((current) => [...current, course].sort((a, b) => a.name.localeCompare(b.name)));
      setCourseName("");
      setCourseCode("");
      toast.success("Course saved");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not save course");
    } finally {
      setBusy(false);
    }
  }
  async function removeCourse(course: Course) {
    const previous = courses;
    setCourses((current) => current.filter((item) => item.id !== course.id));
    try {
      await api.deleteCourse(course.id);
      toast.success("Course removed");
    } catch (reason) {
      setCourses(previous);
      toast.error(reason instanceof Error ? reason.message : "Could not remove course");
    }
  }
  async function savePreferences() {
    if (!preferences) return;
    setBusy(true);
    try {
      setPreferences(await api.patchSchedulingPreferences(preferences));
      toast.success("Planning preferences saved");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings // system"
        title="Make School HQ yours."
        description="Courses, planning rules, appearance, and session controls."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="border-l-2 border-l-accent">
            <CardHeader>
              <Title icon={<Palette className="text-accent" size={19} />} title="Appearance" detail="Stored on this device" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(["dark", "light"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => choose(value)}
                    className={`relative min-h-24 rounded-md border p-3 text-left capitalize ${theme === value ? "border-accent bg-accent/5" : "border-border bg-card-strong"}`}
                  >
                    {value === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                    <span className="mt-3 block text-sm font-semibold">{value}</span>
                    {theme === value && <Check size={16} className="absolute right-3 top-3 text-accent" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Title icon={<BookOpen className="text-violet-300" size={19} />} title="Courses" detail="Saved to your account" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_110px_54px_auto]">
                <Input aria-label="Course name" placeholder="Course name" value={courseName} onChange={(event) => setCourseName(event.target.value)} />
                <Input aria-label="Course code" placeholder="Code" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} />
                <Input aria-label="Course color" type="color" value={courseColor} onChange={(event) => setCourseColor(event.target.value)} className="p-1" />
                <Button onClick={() => void addCourse()} disabled={busy || !courseName.trim()}>
                  <Plus size={16} /> Add
                </Button>
              </div>
              {courses.length ? (
                <div className="divide-y divide-border rounded-md border border-border">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center gap-3 p-3">
                      <i className="size-3 rounded-full" style={{ backgroundColor: course.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{course.name}</span>
                      {course.code && <span className="font-mono text-xs text-muted">{course.code}</span>}
                      <Button variant="ghost" size="icon" aria-label={`Delete ${course.name}`} onClick={() => void removeCourse(course)}>
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No courses yet. Add your first course above.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Title icon={<Clock3 className="text-success" size={19} />} title="Planning" detail="Persistent scheduling preferences" />
            </CardHeader>
            <CardContent>
              {preferences ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumberField label="Work block" value={preferences.defaultBlockMinutes} onChange={(value) => setPreferences({ ...preferences, defaultBlockMinutes: value })} />
                    <NumberField label="Break" value={preferences.breakMinutes} onChange={(value) => setPreferences({ ...preferences, breakMinutes: value })} />
                    <NumberField label="Minimum block" value={preferences.minimumSessionMinutes} onChange={(value) => setPreferences({ ...preferences, minimumSessionMinutes: value })} />
                    <label className="text-xs font-semibold text-muted">Bedtime<Input type="time" className="mt-1.5" value={preferences.bedtime} onChange={(event) => setPreferences({ ...preferences, bedtime: event.target.value })} /></label>
                  </div>
                  <Button onClick={() => void savePreferences()} disabled={busy}>
                    {busy && <LoaderCircle className="animate-spin" size={16} />} Save planning preferences
                  </Button>
                </div>
              ) : (
                <LoaderCircle className="animate-spin text-accent" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Title icon={<CalendarSync className="text-success" size={19} />} title="Calendar" detail="Imports and manual entries" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">Add your own events, study availability, or .ics sources from the calendar.</p>
              <Button variant="secondary" className="mt-3" asChild><Link href="/calendar">Open calendar controls</Link></Button>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card><CardContent><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">Authenticated session</p><p className="mt-3 truncate font-semibold">{session?.user.email}</p><p className="mt-1 text-xs text-success">Active</p></CardContent></Card>
          <Card><CardContent><div className="flex items-start gap-3"><Shield className="mt-0.5 text-muted" size={18} /><div><p className="text-sm font-semibold">Private by account</p><p className="mt-1 text-xs leading-5 text-muted">API calls use your Supabase session. Row-level security keeps each account’s records separate.</p></div></div></CardContent></Card>
          <Button variant="ghost" className="w-full justify-start text-danger" onClick={() => void signOut()}><LogOut size={17} />Sign out</Button>
        </aside>
      </div>
    </div>
  );
}

function Title({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex items-center gap-3">{icon}<div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted">{detail}</p></div></div>;
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-xs font-semibold text-muted">{label}<span className="font-normal"> (min)</span><Input type="number" min={0} className="mt-1.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
