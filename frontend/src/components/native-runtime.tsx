"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function completeNativeSignIn(url: string) {
  const callback = new URL(url);
  if (
    callback.protocol !== "schoolhq:" ||
    callback.hostname !== "auth" ||
    callback.pathname !== "/callback"
  ) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const code = callback.searchParams.get("code");
  if (!code)
    throw new Error("The sign-in link did not include a valid session.");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export function NativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
    void StatusBar.setStyle({ style: Style.Dark });
    void StatusBar.setOverlaysWebView({ overlay: true });

    const handleUrl = async (url: string) => {
      try {
        await completeNativeSignIn(url);
      } catch (error) {
        console.error("Native sign-in failed", error);
        toast.error("That sign-in link could not be completed. Please retry.");
      }
    };

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void App.addListener("appUrlOpen", ({ url }) => void handleUrl(url)).then(
      (listener) => {
        if (disposed) void listener.remove();
        else removeListener = () => listener.remove();
      },
    );
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleUrl(launch.url);
    });

    requestAnimationFrame(() => void SplashScreen.hide());
    return () => {
      disposed = true;
      void removeListener?.();
      delete document.documentElement.dataset.nativePlatform;
    };
  }, []);

  return null;
}
