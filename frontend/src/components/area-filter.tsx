"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AreaFilter, WorkArea } from "@/types/api";
const KEY = "school-hq-area-filter-v1";
export function useAreaFilter() {
  const [area, setAreaState] = useState<AreaFilter>(() => {
    if (typeof window === "undefined") return "all";
    const saved = localStorage.getItem(KEY);
    return saved === "school" || saved === "extracurricular" ? saved : "all";
  });
  const setArea = (next: AreaFilter) => {
    setAreaState(next);
    localStorage.setItem(KEY, next);
  };
  return [area, setArea] as const;
}
export const resolveArea = (item: { area?: WorkArea }): WorkArea =>
  item.area ?? "school";
export function AreaFilterControl({
  value,
  onChange,
  label = "Filter by work area",
}: {
  value: AreaFilter;
  onChange: (value: AreaFilter) => void;
  label?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(value) => onChange(value as AreaFilter)}
    >
      <TabsList aria-label={label}>
        {[
          ["all", "All"],
          ["school", "School"],
          ["extracurricular", "ECs"],
        ].map(([v, text]) => (
          <TabsTrigger key={v} value={v}>
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
export function AreaBadge({ area }: { area: WorkArea }) {
  return (
    <Badge
      variant={area === "school" ? "default" : "secondary"}
      className={
        area === "extracurricular"
          ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
          : undefined
      }
    >
      {area === "school" ? "School" : "EC"}
    </Badge>
  );
}
