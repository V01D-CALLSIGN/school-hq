import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen3.5:4b"),
  BRAIN_DUMP_PARSER: z.enum(["mock", "ollama", "openai"]),
  BRAIN_DUMP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
  BRAIN_DUMP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100).default(10),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function getServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return envSchema.parse({
    ...source,
    BRAIN_DUMP_PARSER: source.BRAIN_DUMP_PARSER ?? (source.NODE_ENV === "test" ? "mock" : "ollama"),
  });
}
