import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Boundary tests have no database or provider dependency, including no global DB setup.
export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src"), "server-only": resolve(__dirname, "tests/helpers/server-only.stub.ts") } },
  test: { environment: "node", include: ["tests/preview/**/*.test.ts", "tests/paymongo/preview-environment.test.ts", "tests/background/worker.test.ts"] },
});
