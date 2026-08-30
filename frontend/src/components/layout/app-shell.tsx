"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookCheck,
  CalendarDays,
  ChevronLeft,
  Focus,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/assignments", label: "Tasks", icon: BookCheck },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/planner", label: "Planner", icon: ListTodo },
  { href: "/focus", label: "Focus", icon: Focus },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (pathname === "/login" || pathname === "/login/") return <>{children}</>;
  const links = (mobile = false) =>
    nav.map(({ href, label, icon: Icon }) => {
      const active =
        href === "/" ? pathname === "/" : pathname.startsWith(href);
      return (
        <Link
          key={href}
          href={href}
          onClick={() => mobile && setMobileOpen(false)}
          aria-current={active ? "page" : undefined}
          title={!mobile && collapsed ? label : undefined}
          className={cn(
            "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition-all duration-200 hover:bg-card-strong hover:text-foreground",
            active &&
              "bg-accent/10 text-accent shadow-[inset_3px_0_var(--accent)]",
            !mobile && collapsed && "justify-center px-0",
          )}
        >
          <Icon
            size={18}
            className={cn(
              active && "drop-shadow-[0_0_6px_rgba(87,215,241,.55)]",
            )}
          />
          {(mobile || !collapsed) && label}
        </Link>
      );
    });
  return (
    <div className="min-h-dvh bg-background subtle-grid">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-24 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-[#061217] focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-[#090c12] transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-border px-5 text-accent">
          <BrandMark className="size-10 shrink-0" />
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-[.18em] text-foreground">
                SCHOOL HQ
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wide text-muted">
                Academic cockpit
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <p className="px-5 pb-1 pt-5 font-mono text-[9px] uppercase tracking-[.18em] text-muted">
            Command deck
          </p>
        )}
        <nav aria-label="Primary" className="flex-1 space-y-1 p-3">
          {links()}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <Link
            href="/settings"
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted hover:bg-card-strong hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Settings size={18} />
            {!collapsed && "Settings"}
          </Link>
          <button
            onClick={() => void signOut()}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-muted hover:bg-card-strong hover:text-danger",
              collapsed && "justify-center px-0",
            )}
            aria-label="Sign out"
          >
            <LogOut size={18} />
            {!collapsed && "Sign out"}
          </button>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex min-h-11 w-full items-center justify-center rounded-md text-muted hover:bg-card-strong hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={18}
              className={cn("transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-[#090c12]">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="flex items-center gap-3 text-accent">
              <BrandMark className="size-9" />
              <span className="tracking-[.16em] text-foreground">
                SCHOOL HQ
              </span>
            </SheetTitle>
            <SheetDescription className="font-mono text-[9px] uppercase tracking-wide">
              Academic cockpit
            </SheetDescription>
          </SheetHeader>
          <nav className="mt-5 space-y-1">{links(true)}</nav>
          <div className="mt-5 border-t border-border pt-4">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-md px-3 text-muted"
            >
              <Settings size={19} />
              Settings
            </Link>
            <button
              onClick={() => void signOut()}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-muted"
            >
              <LogOut size={19} />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid size-11 place-items-center rounded-md text-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-muted sm:flex">
            <span className="status-pulse size-1.5 rounded-full bg-success" />
            System ready
          </div>
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wide text-muted sm:block">
            School HQ
          </span>
        </header>
        <main
          id="main-content"
          className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-8"
        >
          {children}
        </main>
      </div>
      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-[#090c12]/96 px-1 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden"
      >
        {[
          nav[0],
          nav[1],
          { href: "/planner?today=1", label: "Plan today", icon: Sparkles },
          nav[2],
          nav[4],
        ].map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href.split("?")[0]);
          const primary = href.includes("today=1");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 font-mono text-[9px] text-muted",
                active && "text-accent",
                active && !primary &&
                  "after:absolute after:top-0 after:h-0.5 after:w-7 after:bg-accent",
                primary && "text-accent",
              )}
            >
              <span
                className={cn(
                  primary &&
                    "-mt-5 grid size-12 place-items-center rounded-full border-4 border-[#090c12] bg-accent text-[#061217] shadow-[0_0_20px_rgba(87,215,241,.28)]",
                )}
              >
                <Icon size={primary ? 21 : 19} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
