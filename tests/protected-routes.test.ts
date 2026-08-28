import { describe, expect, it } from "vitest";
import * as assignments from "@/app/api/assignments/route";
import * as brainDumps from "@/app/api/brain-dumps/parse/route";
import * as calendarImport from "@/app/api/calendar/import/route";
import * as calendarWeek from "@/app/api/calendar/week/route";
import * as studyWindows from "@/app/api/study-windows/route";
import * as planGenerate from "@/app/api/plans/generate/route";
import * as focusSessions from "@/app/api/focus-sessions/route";
import * as stats from "@/app/api/stats/summary/route";
import * as preferences from "@/app/api/scheduling-preferences/route";
import * as calendarEvents from "@/app/api/calendar/events/route";
import * as courses from "@/app/api/courses/route";

describe("protected endpoint integration", () => {
  const cases: Array<[string, (request: Request) => Promise<Response>, string]> = [
    ["GET assignments", assignments.GET, "GET"], ["POST brain dump", brainDumps.POST, "POST"],
    ["POST calendar import", calendarImport.POST, "POST"], ["GET calendar week", calendarWeek.GET, "GET"],
    ["GET windows", studyWindows.GET, "GET"], ["POST generate plan", planGenerate.POST, "POST"],
    ["POST focus", focusSessions.POST, "POST"], ["GET stats", stats.GET, "GET"],
    ["GET preferences", preferences.GET, "GET"], ["PATCH preferences", preferences.PATCH, "PATCH"],
    ["PATCH calendar event", calendarEvents.PATCH, "PATCH"], ["GET courses", courses.GET, "GET"],
  ];
  it.each(cases)("rejects unauthenticated %s", async (_, handler, method) => {
    const response = await handler(new Request("http://localhost/api/test", { method }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});
