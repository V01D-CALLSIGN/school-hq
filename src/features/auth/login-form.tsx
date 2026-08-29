"use client";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  getSupabaseBrowserClient,
  getAuthRedirectUrl,
  isMockMode,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (isMockMode()) {
      setLoading(false);
      setSent(true);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the public URL and anon key.");
      setLoading(false);
      return;
    }
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    setLoading(false);
    if (authError) setError(authError.message);
    else setSent(true);
  }
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden border-r border-border bg-[radial-gradient(circle_at_30%_20%,rgba(98,214,238,.12),transparent_35%),radial-gradient(circle_at_70%_75%,rgba(167,139,250,.1),transparent_35%),#0b0e14] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-accent">
          <BrandMark />
          <span className="font-bold tracking-[.18em] text-foreground">
            SCHOOL HQ
          </span>
        </div>
        <div className="max-w-xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[.2em] text-accent">
            Personal command center
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight">
            Less juggling.
            <br />
            More finishing.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-muted">
            Turn schoolwork and everything beyond the bell into one calm,
            collision-free plan.
          </p>
        </div>
        <p className="font-mono text-xs text-muted">
          SYSTEM // READY WHEN YOU ARE
        </p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-accent lg:hidden">
            <BrandMark />
            <span className="font-bold tracking-[.18em] text-foreground">
              SCHOOL HQ
            </span>
          </div>
          {sent ? (
            <div className="surface corner-cut p-7 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
                <Check />
              </div>
              <h1 className="mt-5 text-2xl font-bold">Check your inbox.</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                We sent a secure sign-in link to{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => setSent(false)}
              >
                Use another email
              </Button>
            </div>
          ) : (
            <>
              <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-accent">
                Welcome back
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Sign in to your HQ.
              </h1>
              <p className="mt-2 text-sm text-muted">
                No password. Supabase will email you a secure magic link.
              </p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input mt-2"
                    placeholder="you@example.com"
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={
                    loading || (!isMockMode() && !isSupabaseConfigured())
                  }
                >
                  {loading ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <>
                      Continue <ArrowRight size={17} />
                    </>
                  )}
                </Button>
              </form>
              {isMockMode() && (
                <>
                  <div className="my-7 flex items-center gap-3 text-xs text-muted">
                    <span className="h-px flex-1 bg-border" />
                    mock mode
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button variant="secondary" className="w-full" asChild>
                    <Link href="/">Preview the dashboard</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
