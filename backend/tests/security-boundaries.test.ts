import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { success } from "@/lib/contracts";
import { readJson } from "@/lib/server/errors";
import { proxy } from "@/proxy";

describe("API security boundaries", () => {
  it("marks account responses as non-cacheable", () => {
    const response = success({ private: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("rejects oversized JSON even without a content-length header", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(readJson(request, 20)).rejects.toMatchObject({
      status: 413,
      code: "INPUT_TOO_LARGE",
    });
  });

  it("adds baseline hardening headers to API responses", () => {
    const response = proxy(new NextRequest("https://api.example.com/api/test", {
      headers: { origin: "capacitor://localhost" },
    }));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });
});
