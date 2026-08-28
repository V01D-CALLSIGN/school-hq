import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  BRAIN_DUMP_PARSER: z.enum(["mock", "openai"]).default("mock"),
  BRAIN_DUMP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
  BRAIN_DUMP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100).default(10),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function getServerEnv(): ServerEnv {
  return envSchema.parse(process.env);
}
