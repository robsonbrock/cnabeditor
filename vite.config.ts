import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { analyticsCsp } from "./src/build/csp";

export default defineConfig(({ command, mode }) => ({
  plugins: [
    preact(),
    // Só o build publicado libera os domínios do GA4 na CSP (005, research A3).
    {
      name: "analytics-csp",
      transformIndexHtml: (html: string) =>
        command === "build" && mode === "production"
          ? html.replace(/(http-equiv="Content-Security-Policy" content=")([^"]+)/, (_, a: string, csp: string) => a + analyticsCsp(csp))
          : html,
    },
  ],
  worker: {
    format: "es",
  },
  build: {
    // Tudo empacotado localmente: nenhum asset externo no bundle (Princípio V); só o build production carrega o gtag.js (005).
    assetsInlineLimit: 0,
    sourcemap: false,
    // O bundle carrega as 89 definições do layout com as descrições do manual (~600 kB, ~90 kB gzip).
    chunkSizeWarningLimit: 1000,
  },
}));
