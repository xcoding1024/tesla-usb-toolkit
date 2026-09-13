import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const appVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __DISTRIBUTION_CHANNEL__: JSON.stringify(process.env.TOOLKIT_CHANNEL === "store" ? "store" : "github"),
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
