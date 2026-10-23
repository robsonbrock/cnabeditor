/** Domínios do GA4 liberados só na CSP do build production (005, research A3). */
export const ANALYTICS_HOSTS = {
  script: ["https://*.googletagmanager.com"],
  connect: ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
  img: ["https://*.google-analytics.com", "https://*.googletagmanager.com"],
};

/** CSP de produção a partir da CSP do index.html: muda só script-src, connect-src e img-src. */
export function analyticsCsp(base: string): string {
  return base
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [name] = d.split(/\s+/, 1);
      if (name === "script-src") return [d, ...ANALYTICS_HOSTS.script].join(" ");
      if (name === "img-src") return [d, ...ANALYTICS_HOSTS.img].join(" ");
      if (name === "connect-src") return [name, ...ANALYTICS_HOSTS.connect].join(" ");
      return d;
    })
    .join("; ");
}
