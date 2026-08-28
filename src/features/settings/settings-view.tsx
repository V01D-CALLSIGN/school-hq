"use client";
import Link from "next/link";
import {
  Bell,
  CalendarSync,
  Check,
  LogOut,
  Moon,
  Palette,
  Shield,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-provider";
export function SettingsView() {
  const { session, signOut } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    queueMicrotask(() =>
      setTheme(
        localStorage.getItem("school-hq-theme") === "light" ? "light" : "dark",
      ),
    );
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const choose = (value: "dark" | "light") => {
    setTheme(value);
    localStorage.setItem("school-hq-theme", value);
  };
  const email = session?.user.email;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings // system"
        title="Make School HQ yours."
        description="Appearance, reminders, calendar behavior, and session controls."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="border-l-2 border-l-accent">
            <CardHeader>
              <Title
                icon={<Palette className="text-accent" size={19} />}
                title="Appearance"
                detail="Theme and visual preferences"
              />
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
                    <span className="mt-3 block text-sm font-semibold">
                      {value}
                    </span>
                    {theme === value && (
                      <Check
                        size={16}
                        className="absolute right-3 top-3 text-accent"
                      />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Title
                icon={<Bell className="text-violet-300" size={19} />}
                title="Notifications"
                detail="Choose what deserves your attention"
              />
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingToggle
                title="Plan ready"
                description="When your generated plan is ready"
                defaultChecked
              />
              <SettingToggle
                title="Task reminders"
                description="15 minutes before a work block"
                defaultChecked
              />
              <SettingToggle
                title="Daily summary"
                description="An evening overview of what is ahead"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Title
                icon={<CalendarSync className="text-success" size={19} />}
                title="Calendar"
                detail="Imports and classification defaults"
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                Calendar sources are shown only after the backend returns them.
                Manage new imports from the calendar surface.
              </p>
              <Button variant="secondary" className="mt-3" asChild>
                <Link href="/calendar">Open calendar controls</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card>
            <CardContent>
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                Authenticated session
              </p>
              <p className="mt-3 truncate font-semibold">
                {email ?? "Mock preview session"}
              </p>
              <p className="mt-1 text-xs text-success">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 text-muted" size={18} />
                <div>
                  <p className="text-sm font-semibold">Privacy first</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    API calls use the active Supabase bearer token. Logout also
                    clears user-scoped caches.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button
            variant="ghost"
            className="w-full justify-start text-danger"
            onClick={() => void signOut()}
          >
            <LogOut size={17} />
            Sign out
          </Button>
        </aside>
      </div>
    </div>
  );
}
function Title({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}
function SettingToggle({
  title,
  description,
  defaultChecked = false,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-md p-3 hover:bg-card-strong">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} aria-label={title} />
    </div>
  );
}
