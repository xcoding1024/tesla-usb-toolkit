import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const appVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
