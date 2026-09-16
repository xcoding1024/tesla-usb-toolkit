/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __DISTRIBUTION_CHANNEL__: "github" | "store";

declare module "*?raw" {
  const content: string;
  export default content;
}
