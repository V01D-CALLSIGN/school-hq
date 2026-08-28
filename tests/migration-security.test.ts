import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sql = readFileSync(fileURLToPath(new URL("../supabase/migrations/202608280001_initial_schema.sql", import.meta.url)), "utf8");
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
});
