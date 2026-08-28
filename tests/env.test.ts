import { describe, expect, it } from "vitest";
import { getServerEnv } from "@/lib/server/env";

const required = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parser provider environment", () => {
  it("defaults automated tests to the deterministic mock", () => {
    expect(getServerEnv({ ...required, NODE_ENV: "test" }).BRAIN_DUMP_PARSER).toBe("mock");
  });

  it("defaults real server usage to local Ollama", () => {
    expect(getServerEnv({ ...required, NODE_ENV: "development" })).toMatchObject({
      BRAIN_DUMP_PARSER: "ollama",
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:4b",
    });
  });

  it("keeps OpenAI selectable without requiring it for Ollama", () => {
    expect(getServerEnv({ ...required, BRAIN_DUMP_PARSER: "ollama" }).OPENAI_API_KEY).toBeUndefined();
    expect(getServerEnv({ ...required, BRAIN_DUMP_PARSER: "openai", OPENAI_API_KEY: "optional-key" }).BRAIN_DUMP_PARSER).toBe("openai");
  });
});
