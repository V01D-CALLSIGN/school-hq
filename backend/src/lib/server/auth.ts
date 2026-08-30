import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getServerEnv } from "./env";
import { HttpError } from "./errors";

export type AuthContext = { user: User; supabase: SupabaseClient };

export async function requireAuth(request: Request): Promise<AuthContext> {
  const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
  const hasAuthCookie = request.headers.get("cookie")?.includes("sb-");
  if (!hasBearer && !hasAuthCookie) throw new HttpError(401, "UNAUTHORIZED", "Authentication required");

  const env = getServerEnv();
  const store = await cookies();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: hasBearer ? { headers: { Authorization: request.headers.get("authorization")! } } : undefined,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items: Array<{ name: string; value: string; options: CookieOptions }>) => {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server components cannot always set cookies. Route handlers can.
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  return { user: data.user, supabase };
}
