"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!border-border !bg-card !text-foreground",
          description: "!text-muted",
        },
      }}
      {...props}
    />
  );
}
export { Toaster };
