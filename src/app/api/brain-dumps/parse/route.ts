import { brainDumpSchema, parseBrainDumpInputSchema, success, type BrainDump } from "@/lib/contracts";
import { MockBrainDumpParser, OllamaBrainDumpParser, OpenAIBrainDumpParser } from "@/lib/brain-dump/parser";
import { requireAuth } from "@/lib/server/auth";
import { camelize, assertDb } from "@/lib/server/db";
import { getServerEnv } from "@/lib/server/env";
import { HttpError, readJson, toErrorResponse } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { user, supabase } = await requireAuth(request);
    const input = parseBrainDumpInputSchema.parse(await readJson(request, 20_000));
    const env = getServerEnv();
    enforceRateLimit(`brain-dump:${user.id}`, env.BRAIN_DUMP_RATE_LIMIT_PER_MINUTE);
    if (env.BRAIN_DUMP_PARSER === "openai" && !env.OPENAI_API_KEY) {
      throw new HttpError(503, "PARSER_NOT_CONFIGURED", "Assignment parsing is not configured");
    }
    const parser = env.BRAIN_DUMP_PARSER === "openai"
      ? new OpenAIBrainDumpParser({ apiKey: env.OPENAI_API_KEY!, model: env.OPENAI_MODEL, timeoutMs: env.BRAIN_DUMP_TIMEOUT_MS })
      : env.BRAIN_DUMP_PARSER === "ollama"
        ? new OllamaBrainDumpParser({ baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL, timeoutMs: env.BRAIN_DUMP_TIMEOUT_MS })
        : new MockBrainDumpParser();
    const parsedAssignments = await parser.parse(input);
    const row = assertDb(await supabase.from("brain_dumps").insert({
      user_id: user.id, raw_text: input.text, timezone: input.timezone,
      parsed_assignments: parsedAssignments, parser: env.BRAIN_DUMP_PARSER,
    }).select().single());
    return success(brainDumpSchema.parse(camelize<BrainDump>(row)), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
