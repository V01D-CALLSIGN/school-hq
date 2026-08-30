import { cn } from "@/lib/utils";
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 42 42"
      role="img"
      aria-label="School HQ"
      className={cn("size-10", className)}
    >
      <path
        d="M3 9 10 2h25l4 4v27l-7 7H7l-4-4Z"
        fill="var(--card-strong)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <path
        d="M11 12h9v6h11v-6M11 30v-7h9v7m2-7h9v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="34" cy="9" r="2" fill="var(--success)" />
    </svg>
  );
}
