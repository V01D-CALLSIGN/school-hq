import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_CALLBACK = "schoolhq://auth/callback";

export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function isNativeDevAuthEnabled() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_NATIVE_DEV_AUTH === "true" && isNativeApp()
  );
}

export function getAuthRedirectUrl() {
  return isNativeApp() ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/`;
}

let client: SupabaseClient | null = null;
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !isNativeApp(),
        flowType: isNativeApp() ? "pkce" : "implicit",
      },
    },
  );
  return client;
}
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
