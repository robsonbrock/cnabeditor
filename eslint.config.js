import tseslint from "typescript-eslint";
import globals from "globals";

const noTrim = ["trim", "trimStart", "trimEnd", "trimLeft", "trimRight"].map((property) => ({
  property,
  message: "Proibido no fluxo de conteúdo CNAB (FR-006b, FR-027a): espaços devem ser preservados.",
}));

const noNetwork = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
  name,
  message: "Nenhuma requisição de rede é permitida (FR-033, SC-008).",
}));

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "tests/e2e/fixtures/**", "test-results/**", "playwright-report/**"] },
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/core/**", "src/ui/state/**", "src/workers/**"],
    rules: { "no-restricted-properties": ["error", ...noTrim] },
  },
  {
    files: ["src/**"],
    rules: { "no-restricted-globals": ["error", ...noNetwork] },
  },
);
