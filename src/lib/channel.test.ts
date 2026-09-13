import { describe, expect, it } from "vitest";
import { bundledDistributionChannel, githubUpdatesEnabled, parseDistributionChannel } from "./channel";

describe("distribution channel", () => {
  it("treats anything other than store as the GitHub channel", () => {
    expect(parseDistributionChannel(undefined)).toBe("github");
    expect(parseDistributionChannel("github")).toBe("github");
    expect(parseDistributionChannel("other")).toBe("github");
    expect(parseDistributionChannel("store")).toBe("store");
  });

  it("defaults unit tests and Vite builds to the GitHub updater channel", () => {
    expect(bundledDistributionChannel()).toBe("github");
    expect(githubUpdatesEnabled()).toBe(true);
  });
});
