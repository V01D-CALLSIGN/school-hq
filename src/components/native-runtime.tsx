"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  getSupabaseBrowserClient,
  NATIVE_AUTH_CALLBACK,
} from "@/lib/supabase/client";

async function completeNativeSignIn(url: string) {
  if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const callback = new URL(url);
  const code = callback.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  // Retain compatibility with existing implicit-flow magic links.
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (!accessToken || !refreshToken)
    throw new Error("The sign-in link did not include a valid session.");
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
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
