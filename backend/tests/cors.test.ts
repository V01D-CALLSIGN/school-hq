import { afterEach, describe, expect, it, vi } from "vitest";
import { corsAllowedOrigins, isCorsOriginAllowed } from "@/proxy";

describe("native API CORS", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows the Capacitor iOS origin by default", () => {
    expect(corsAllowedOrigins()).toContain("capacitor://localhost");
    expect(isCorsOriginAllowed("capacitor://localhost")).toBe(true);
  });

  it("normalizes a configured origin allow list", () => {
    vi.stubEnv(
      "CORS_ALLOWED_ORIGINS",
      "https://school.example, https://api-client.example/",
    );
    expect(corsAllowedOrigins()).toEqual([
      "https://school.example",
      "https://api-client.example",
    ]);
    expect(isCorsOriginAllowed("https://api-client.example/")).toBe(true);
    expect(isCorsOriginAllowed("capacitor://localhost")).toBe(false);
  });
});
