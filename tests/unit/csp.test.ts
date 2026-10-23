import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyticsCsp } from "../../src/build/csp";

const html = readFileSync(join(import.meta.dirname, "..", "..", "index.html"), "utf8");
const base = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)![1];

const directives = (csp: string) => new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
  const [name, ...values] = d.split(/\s+/);
  return [name, values.join(" ")] as const;
}));

describe("CSP de produção (005, research A3)", () => {
  const prod = directives(analyticsCsp(base));

  it("script-src libera só o gtag.js", () => {
    expect(prod.get("script-src")).toBe("'self' https://*.googletagmanager.com");
  });

  it("connect-src troca 'none' pelos domínios do GA4", () => {
    expect(prod.get("connect-src")).toBe("https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com");
    expect(prod.get("connect-src")).not.toContain("'none'");
  });

  it("img-src acrescenta os domínios do GA4", () => {
    expect(prod.get("img-src")).toBe("'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com");
  });

  it("demais diretivas ficam idênticas", () => {
    expect(prod.get("default-src")).toBe("'self'");
    expect(prod.get("style-src")).toBe("'self' 'unsafe-inline'");
    expect(prod.get("worker-src")).toBe("'self' blob:");
  });

  it("preserva a ordem e não cria diretivas", () => {
    expect([...prod.keys()]).toEqual([...directives(base).keys()]);
  });
});
