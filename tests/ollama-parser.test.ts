import { describe, expect, it, vi } from "vitest";
import { OllamaBrainDumpParser } from "@/lib/brain-dump/parser";

const input = { text: "Finish calculus worksheet by Friday", timezone: "America/Chicago" };
const structuredOutput = {
  assignments: [{
    title: "Finish calculus worksheet", area: "school", areaConfidence: 0.95,
    course: "Calculus", activityLabel: null, dueAt: null,
    ambiguousDateText: "Friday", estimatedMinutes: null, priority: "medium",
    taskType: "assignment", dependencies: [], notes: null, confidence: 0.7,
    missingFields: ["dueAt", "estimatedMinutes"], warnings: ["Friday has no unambiguous date"],
  }],
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const tagsResponse = () => jsonResponse({ models: [{ name: "qwen3.5:4b" }] });
const chatResponse = () => jsonResponse({ message: { content: JSON.stringify(structuredOutput) } });
const parserWith = (fetchMock: ReturnType<typeof vi.fn>, timeoutMs = 100) => new OllamaBrainDumpParser({
  baseUrl: "http://127.0.0.1:11434/", model: "qwen3.5:4b", timeoutMs,
  fetchImpl: fetchMock as unknown as typeof fetch,
});

const cloudParserWith = (fetchMock: ReturnType<typeof vi.fn>) => new OllamaBrainDumpParser({
  baseUrl: "https://ollama.com", model: "gpt-oss:20b", timeoutMs: 100,
  apiKey: "cloud-secret", fetchImpl: fetchMock as unknown as typeof fetch,
});

describe("Ollama brain dump parser", () => {
  it("uses native structured output and returns validated assignments", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tagsResponse())
      .mockResolvedValueOnce(chatResponse());
    const result = await parserWith(fetchMock).parse(input);
    expect(result).toEqual(structuredOutput.assignments);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://127.0.0.1:11434/api/tags", expect.objectContaining({ method: "GET" }));
    const [, chatInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(chatInit.body));
    expect(body).toMatchObject({ model: "qwen3.5:4b", stream: false, think: false, options: { temperature: 0 } });
    expect(body.format).toMatchObject({ type: "object", properties: { assignments: expect.any(Object) } });
  });

  it("authenticates both Ollama Cloud health and chat requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ models: [{ name: "gpt-oss:20b" }] }))
      .mockResolvedValueOnce(chatResponse());
    await expect(cloudParserWith(fetchMock).parse(input)).resolves.toEqual(structuredOutput.assignments);
    for (const [, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer cloud-secret");
    }
    const body = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ format: "json", think: "low" });
    expect(body.messages[0].content).toContain("Return only JSON matching this schema:");
  });

  it("returns a clear server error after one connection retry", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("connection refused"));
    await expect(parserWith(fetchMock).parse(input)).rejects.toMatchObject({
      status: 503, code: "OLLAMA_UNAVAILABLE", message: "The Ollama service is unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a clear missing-model error without a pointless retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: "another-model:latest" }] }));
    await expect(parserWith(fetchMock).parse(input)).rejects.toMatchObject({
      status: 503, code: "OLLAMA_MODEL_UNAVAILABLE", message: "Ollama model \"qwen3.5:4b\" is not available",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts timed-out generation without repeating a slow request", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/api/tags")) return Promise.resolve(tagsResponse());
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });
    await expect(parserWith(fetchMock, 5).parse(input)).rejects.toMatchObject({ status: 504, code: "PARSER_TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed structured output after one retry", async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(
      url.endsWith("/api/tags") ? tagsResponse() : jsonResponse({ message: { content: "not-json" } }),
    ));
    await expect(parserWith(fetchMock).parse(input)).rejects.toMatchObject({ status: 502, code: "PARSER_INVALID_RESPONSE" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retries one transient generation failure and then succeeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tagsResponse())
      .mockResolvedValueOnce(jsonResponse({ error: "temporary failure" }, 500))
      .mockResolvedValueOnce(tagsResponse())
      .mockResolvedValueOnce(chatResponse());
    await expect(parserWith(fetchMock).parse(input)).resolves.toEqual(structuredOutput.assignments);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
