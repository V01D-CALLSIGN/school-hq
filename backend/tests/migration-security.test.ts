import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sql = readFileSync(fileURLToPath(new URL("../supabase/migrations/202608280001_initial_schema.sql", import.meta.url)), "utf8");
const areaMigration = readFileSync(fileURLToPath(new URL("../supabase/migrations/202608280002_work_areas_and_plan_edits.sql", import.meta.url)), "utf8");
const supabaseConfig = readFileSync(fileURLToPath(new URL("../supabase/config.toml", import.meta.url)), "utf8");
const defaultSeed = readFileSync(fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)), "utf8");
const userTables = ["profiles", "courses", "assignments", "brain_dumps", "calendar_imports", "calendar_events", "study_windows", "study_plans", "plan_blocks", "focus_sessions", "scheduling_preferences"];

describe("migration security declarations", () => {
  it.each(userTables)("enables RLS on %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security;`);
  });
  it("derives policies from auth.uid and revokes anonymous table access", () => {
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("revoke all on all tables in schema public from anon;");
  });
  it("enforces composite ownership for cross-table references", () => {
    expect(sql).toContain("assignments_course_owner_fk");
    expect(sql).toContain("blocks_assignment_owner_fk");
    expect(sql).toContain("sessions_block_owner_fk");
  });
  it("replaces a source's calendar occurrences in one database transaction", () => {
    expect(sql).toContain("function public.replace_calendar_events");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("grant execute on function public.replace_calendar_events(uuid, jsonb) to authenticated");
  });

  it("adds work areas in a new migration with safe defaults", () => {
    expect(sql).not.toContain("work_area");
    expect(areaMigration).toContain("create type public.work_area as enum ('school', 'extracurricular')");
    expect(areaMigration.match(/area public\.work_area not null default 'school'/g)).toHaveLength(2);
    expect(areaMigration).toContain("area_filter text not null default 'combined'");
  });

  it("enforces assignment metadata and plan-block collision behavior in the database", () => {
    expect(areaMigration).toContain("assignments_area_metadata_check");
    expect(areaMigration).toContain("plan_blocks_no_overlap");
    expect(areaMigration).toContain("deferrable initially deferred");
    expect(areaMigration).toContain("function public.apply_plan_edits");
    expect(areaMigration).toContain("security invoker");
  });

  it("keeps normal database resets empty and excludes opt-in demo files", () => {
    expect(supabaseConfig).toContain('sql_paths = ["./seed.sql"]');
    expect(supabaseConfig).not.toContain("seeds/demo.sql");
    expect(defaultSeed).not.toMatch(/insert\s+into|update\s+public\.|delete\s+from/i);
  });
});
