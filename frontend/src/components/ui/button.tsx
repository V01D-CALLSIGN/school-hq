import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-[#061217] shadow-[0_0_18px_rgba(98,214,238,.12)] hover:bg-[#85e3f5] hover:shadow-[0_0_22px_rgba(98,214,238,.22)]",
        secondary:
          "border border-border bg-card-strong text-foreground hover:border-[#3b4252]",
        ghost: "text-muted hover:bg-card-strong hover:text-foreground",
        danger: "bg-danger text-[#22060c]",
      },
      size: {
        default: "h-11",
        sm: "min-h-9 rounded-md px-3 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(variants({ variant, size }), className)}
      {...props}
    />
  );
}
