import { describe, expect, it } from "vitest";
import storeEntitlements from "../../src-tauri/macos/Entitlements.store.plist?raw";

describe("Mac App Store entitlements", () => {
  it("keeps sandbox identity and outgoing network so WKWebView can launch", () => {
    expect(storeEntitlements).toContain("<key>com.apple.security.app-sandbox</key>");
    expect(storeEntitlements).toContain("<key>com.apple.security.network.client</key>");
    expect(storeEntitlements).toContain("<string>GFJDX458W5.com.coding1024.tesla-toolkit</string>");
    expect(storeEntitlements).toContain("<string>GFJDX458W5</string>");
  });
});
