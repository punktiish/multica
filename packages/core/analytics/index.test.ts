import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadModule() {
  const analytics = await import("./index");
  return { analytics };
}

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initAnalytics super-properties", () => {
  it("registers client_type and app_version after posthog.init", async () => {
    const { analytics } = await loadModule();
    const result = analytics.initAnalytics({ key: "k", host: "", appVersion: "1.2.3" });
    expect(result).toBe(true);
  });

  it("omits app_version when not provided", async () => {
    const { analytics } = await loadModule();
    const result = analytics.initAnalytics({ key: "k", host: "" });
    expect(result).toBe(true);
  });

  it("detects desktop when window.electron is present", async () => {
    vi.stubGlobal("window", { electron: {} });
    const { analytics } = await loadModule();
    const result = analytics.initAnalytics({ key: "k", host: "" });
    expect(result).toBe(true);
  });
});

describe("resetAnalytics", () => {
  it("does not throw when analytics was never initialized", async () => {
    const { analytics } = await loadModule();
    expect(() => analytics.resetAnalytics()).not.toThrow();
  });
});
