import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-accent/25 bg-accent/10 text-accent",
        secondary: "border-violet-400/25 bg-violet-400/10 text-violet-300",
        outline: "border-border text-muted",
        destructive: "border-danger/25 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
export { Badge, badgeVariants };
