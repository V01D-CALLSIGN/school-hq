import { DateTime } from "luxon";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { parsedAssignmentSchema, type ParsedAssignment } from "@/lib/contracts";
import { HttpError } from "@/lib/server/errors";

const parserOutputSchema = z.object({ assignments: z.array(parsedAssignmentSchema).max(100) });
const parserOutputJsonSchema = zodToJsonSchema(parserOutputSchema, { $refStrategy: "none" });

const extractionInstructions = [
  "Extract assignments only; never invent a deadline or duration.",
  "Return null for unknown values. Preserve ambiguous date language in ambiguousDateText and add a warning.",
  "Resolve explicit dates using the supplied IANA timezone, returning UTC ISO timestamps.",
  "This output is reviewed by the user and must not directly create assignments.",
].join(" ");

export interface BrainDumpParser {
  parse(input: { text: string; timezone: string; courseContext?: Array<{ name: string }> }): Promise<ParsedAssignment[]>;
}

const duePattern = /(?:due\s+)?(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/i;
const durationPattern = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i;
const ambiguousPattern = /\b(today|tomorrow|tonight|next\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day|this\s+week(?:end)?|next\s+week)\b/i;

export class MockBrainDumpParser implements BrainDumpParser {
  async parse(input: { text: string; timezone: string; courseContext?: Array<{ name: string }> }): Promise<ParsedAssignment[]> {
    const lines = input.text.split(/\n|;/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line) => {
      const dueMatch = line.match(duePattern);
      const durationMatch = line.match(durationPattern);
      const ambiguous = line.match(ambiguousPattern)?.[0] ?? null;
      let dueAt: string | null = null;
      const warnings: string[] = [];
      if (dueMatch) {
        const candidate = DateTime.fromISO(`${dueMatch[1]}T${dueMatch[2] ?? "23:59"}`, { zone: input.timezone });
        if (candidate.isValid) dueAt = candidate.toUTC().toISO();
      } else if (ambiguous) {
        warnings.push(`Ambiguous date phrase preserved: "${ambiguous}"`);
      }
      const course = input.courseContext?.find(({ name }) => line.toLowerCase().includes(name.toLowerCase()))?.name ?? null;
      const estimatedMinutes = durationMatch
        ? Math.round(Number(durationMatch[1]) * (/^h/i.test(durationMatch[2]) ? 60 : 1))
        : null;
      const cleanedTitle = line
        .replace(duePattern, "").replace(durationPattern, "").replace(/\s{2,}/g, " ").replace(/^[\s,:-]+|[\s,:-]+$/g, "")
        .slice(0, 240) || "Untitled assignment";
      const missingFields: ParsedAssignment["missingFields"] = [];
      if (!course) missingFields.push("course");
      if (!dueAt) missingFields.push("dueAt");
      if (estimatedMinutes === null) missingFields.push("estimatedMinutes");
      return {
        title: cleanedTitle, course, dueAt, ambiguousDateText: ambiguous, estimatedMinutes,
        priority: /\b(urgent|asap)\b/i.test(line) ? "urgent" : /\bimportant\b/i.test(line) ? "high" : "medium",
        taskType: /\bexam|test\b/i.test(line) ? "exam" : /\bread/i.test(line) ? "reading" : /\bproject\b/i.test(line) ? "project" : "assignment",
        dependencies: [], notes: null, confidence: dueAt && estimatedMinutes ? 0.9 : 0.6, missingFields, warnings,
      };
    });
  }
}

type OllamaOptions = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

type OllamaTagsResponse = { models?: Array<{ name?: string; model?: string }> };
type OllamaChatResponse = { message?: { content?: string } };

export class OllamaBrainDumpParser implements BrainDumpParser {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OllamaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async parse(input: { text: string; timezone: string; courseContext?: Array<{ name: string }> }): Promise<ParsedAssignment[]> {
    let lastError: HttpError | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.healthCheck();
        return await this.generate(input);
      } catch (error) {
        const normalized = this.normalizeError(error);
        lastError = normalized;
        if (attempt === 1 || normalized.code === "OLLAMA_MODEL_UNAVAILABLE") throw normalized;
      }
    }
    throw lastError ?? new HttpError(502, "PARSER_UNAVAILABLE", "Assignment parsing is temporarily unavailable");
  }

  private async healthCheck(): Promise<void> {
    const { response, payload } = await this.requestJson(`${this.baseUrl}/api/tags`, { method: "GET" }, Math.min(this.options.timeoutMs, 2_000));
    if (!response.ok) throw new HttpError(503, "OLLAMA_UNAVAILABLE", "The local Ollama server is unavailable");
    const models = (payload as OllamaTagsResponse).models;
    if (!Array.isArray(models)) throw new HttpError(503, "OLLAMA_UNAVAILABLE", "The local Ollama server returned an invalid health response");
    const available = models.some((model) => model.name === this.options.model || model.model === this.options.model);
    if (!available) {
      throw new HttpError(503, "OLLAMA_MODEL_UNAVAILABLE", `Ollama model "${this.options.model}" is not installed`);
    }
  }

  private async generate(input: { text: string; timezone: string; courseContext?: Array<{ name: string }> }): Promise<ParsedAssignment[]> {
    const { response, payload } = await this.requestJson(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        stream: false,
        format: parserOutputJsonSchema,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: extractionInstructions },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    }, this.options.timeoutMs);
    if (response.status === 404) throw new HttpError(503, "OLLAMA_MODEL_UNAVAILABLE", `Ollama model "${this.options.model}" is unavailable`);
    if (!response.ok) throw new HttpError(502, "PARSER_UNAVAILABLE", "Ollama could not parse the assignment text");
    const content = (payload as OllamaChatResponse).message?.content;
    if (!content) throw new HttpError(502, "PARSER_INVALID_RESPONSE", "Ollama returned no usable structured output");
    try {
      return parserOutputSchema.parse(JSON.parse(content)).assignments;
    } catch {
      throw new HttpError(502, "PARSER_INVALID_RESPONSE", "Ollama returned malformed structured output");
    }
  }

  private async requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ response: Response; payload: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetchImpl(url, { ...init, signal: controller.signal });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new HttpError(502, "PARSER_INVALID_RESPONSE", "Ollama returned an unreadable response");
      }
      return { response, payload };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if ((error instanceof DOMException && error.name === "AbortError") || (error instanceof Error && error.name === "AbortError")) {
        throw new HttpError(504, "PARSER_TIMEOUT", "Ollama assignment parsing timed out");
      }
      throw new HttpError(503, "OLLAMA_UNAVAILABLE", "The local Ollama server is unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeError(error: unknown): HttpError {
    if (error instanceof HttpError) return error;
    console.error("Unexpected Ollama parser error", error);
    return new HttpError(502, "PARSER_UNAVAILABLE", "Assignment parsing is temporarily unavailable");
  }
}

export class OpenAIBrainDumpParser implements BrainDumpParser {
  constructor(private readonly options: { apiKey: string; model: string; timeoutMs: number }) {}

  async parse(input: { text: string; timezone: string; courseContext?: Array<{ name: string }> }): Promise<ParsedAssignment[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model,
          instructions: extractionInstructions,
          input: JSON.stringify(input),
          text: { format: { type: "json_schema", name: "brain_dump_assignments", strict: true, schema: parserOutputJsonSchema } },
        }),
      });
      if (!response.ok) {
        console.error("OpenAI parser failure", response.status);
        throw new HttpError(502, "PARSER_UNAVAILABLE", "Assignment parsing is temporarily unavailable");
      }
      const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
      const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!outputText) throw new HttpError(502, "PARSER_INVALID_RESPONSE", "The parser returned no usable result");
      return parserOutputSchema.parse(JSON.parse(outputText)).assignments;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") throw new HttpError(504, "PARSER_TIMEOUT", "Assignment parsing timed out");
      console.error("OpenAI parser error", error);
      throw new HttpError(502, "PARSER_UNAVAILABLE", "Assignment parsing is temporarily unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}
