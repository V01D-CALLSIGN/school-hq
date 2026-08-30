"use client";
import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
type AuthValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login" || pathname === "/login/";
  const router = useRouter();
  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);
  useEffect(() => {
    if (loading) return;
    if (!session && !isLoginRoute)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (session && isLoginRoute) router.replace("/");
  }, [isLoginRoute, loading, pathname, router, session]);
  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut({ scope: "local" });
    localStorage.removeItem("school-hq-focus-session-v2");
    navigator.serviceWorker?.controller?.postMessage({
      type: "CLEAR_USER_CACHES",
    });
    setSession(null);
    router.replace("/login");
    router.refresh();
  }
  const value = { session, loading, signOut };
  if (!isSupabaseConfigured() && !isLoginRoute)
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">
            Authentication is not configured.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Set the public Supabase URL and anon key to use real integration
            mode.
          </p>
        </div>
      </main>
    );
  if (loading && !isLoginRoute)
    return (
      <main
        className="grid min-h-dvh place-items-center"
        aria-label="Checking session"
      >
        <LoaderCircle className="animate-spin text-accent" />
      </main>
    );
  if (!session && !isLoginRoute) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
