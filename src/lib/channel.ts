export type DistributionChannel = "github" | "store";

export function parseDistributionChannel(value: string | undefined): DistributionChannel {
  return value === "store" ? "store" : "github";
}

/** Compile-time channel from Vite (`TOOLKIT_CHANNEL`). Defaults to GitHub Releases. */
export function bundledDistributionChannel(): DistributionChannel {
  return parseDistributionChannel(typeof __DISTRIBUTION_CHANNEL__ === "string" ? __DISTRIBUTION_CHANNEL__ : "github");
}

export function githubUpdatesEnabled(): boolean {
  return bundledDistributionChannel() === "github";
}
