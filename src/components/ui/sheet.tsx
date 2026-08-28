"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const Sheet = DialogPrimitive.Root,
  SheetTrigger = DialogPrimitive.Trigger,
  SheetClose = DialogPrimitive.Close;
const variants = cva("fixed z-50 border-border bg-card p-5 shadow-2xl", {
  variants: {
    side: {
      left: "inset-y-0 left-0 h-full w-[min(86vw,340px)] border-r",
      right: "inset-y-0 right-0 h-full w-[min(86vw,340px)] border-l",
      bottom: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-3xl border-t",
    },
  },
  defaultVariants: { side: "right" },
});
function SheetContent({
  side,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof variants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(variants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted"
          aria-label="Close"
        >
          <X size={17} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);
const SheetTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
);
const SheetDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cn("text-sm text-muted", className)}
    {...props}
  />
);
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
