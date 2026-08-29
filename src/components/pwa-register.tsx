"use client";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/supabase/client";
export function PwaRegister() {
  useEffect(() => {
    if (
      !isNativeApp() &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    )
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
