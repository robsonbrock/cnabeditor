import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  worker: {
    format: "es",
  },
  build: {
    // Tudo empacotado localmente: nenhum asset externo (Princípio V, SC-008).
    assetsInlineLimit: 0,
    sourcemap: false,
    // O bundle carrega as 89 definições do layout com as descrições do manual (~600 kB, ~90 kB gzip).
    chunkSizeWarningLimit: 1000,
  },
});
