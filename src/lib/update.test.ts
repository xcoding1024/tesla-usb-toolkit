import { describe, expect, it } from "vitest";
import {
  compareVersions,
  conventionalAssets,
  evaluateRelease,
  GITHUB_DOWNLOAD_PREFIX,
  isAllowedDownloadUrl,
  isInstallerAsset,
  normalizeVersion,
  parseGithubRelease,
  parseReleasesAtom,
  parseVersion,
  pickUpdateAsset,
  sanitizeInstallerFilename,
  type GithubAsset,
  type GithubRelease,
} from "./update";

const assets: GithubAsset[] = [
  {
    name: "USB.Toolkit.for.Tesla_0.2.0_aarch64.app.tar.gz",
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/USB.Toolkit.for.Tesla_0.2.0_aarch64.app.tar.gz`,
    size: 10,
  },
  {
    name: "USB.Toolkit.for.Tesla_0.2.0_aarch64.dmg",
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/USB.Toolkit.for.Tesla_0.2.0_aarch64.dmg`,
    size: 20,
  },
  {
    name: "USB.Toolkit.for.Tesla_0.2.0_x64.dmg",
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/USB.Toolkit.for.Tesla_0.2.0_x64.dmg`,
    size: 21,
  },
  {
    name: "USB.Toolkit.for.Tesla_0.2.0_x64-setup.exe",
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/USB.Toolkit.for.Tesla_0.2.0_x64-setup.exe`,
    size: 30,
  },
  {
    name: "USB.Toolkit.for.Tesla_0.2.0_x64_en-US.msi",
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/USB.Toolkit.for.Tesla_0.2.0_x64_en-US.msi`,
    size: 31,
  },
];

function release(overrides: Partial<GithubRelease> = {}): GithubRelease {
  return {
    tag_name: "v0.2.0",
    name: "USB Toolkit for Tesla v0.2.0",
    body: "Bug fixes",
    html_url: "https://github.com/xcoding1024/tesla-usb-toolkit/releases/tag/v0.2.0",
    prerelease: false,
    draft: false,
    assets,
    ...overrides,
  };
}

describe("version helpers", () => {
  it("strips a leading v and compares semver triples", () => {
    expect(normalizeVersion("v0.1.0")).toBe("0.1.0");
    expect(parseVersion("v1.2.3-beta")).toEqual([1, 2, 3]);
    expect(compareVersions("0.2.0", "0.1.0")).toBe(1);
    expect(compareVersions("v0.1.0", "0.1.0")).toBe(0);
    expect(compareVersions("0.1.0", "0.1.1")).toBe(-1);
  });
});

describe("installer assets", () => {
  it("accepts dmg/msi/exe and rejects updater archives", () => {
    expect(isInstallerAsset("app.dmg")).toBe(true);
    expect(isInstallerAsset("app.msi")).toBe(true);
    expect(isInstallerAsset("app-setup.exe")).toBe(true);
    expect(isInstallerAsset("app.app.tar.gz")).toBe(false);
    expect(isInstallerAsset("latest.json")).toBe(false);
  });

  it("picks the Windows MSI before the NSIS exe", () => {
    expect(pickUpdateAsset(assets, "windows", "x86_64")?.name).toBe(
      "USB.Toolkit.for.Tesla_0.2.0_x64_en-US.msi",
    );
  });

  it("picks the macOS DMG that matches the CPU", () => {
    expect(pickUpdateAsset(assets, "macos", "aarch64")?.name).toBe("USB.Toolkit.for.Tesla_0.2.0_aarch64.dmg");
    expect(pickUpdateAsset(assets, "macos", "x86_64")?.name).toBe("USB.Toolkit.for.Tesla_0.2.0_x64.dmg");
  });

  it("does not invent a Linux installer", () => {
    expect(pickUpdateAsset(assets, "linux", "x86_64")).toBeNull();
  });
});

describe("download guards", () => {
  it("only allows this repo's GitHub release URLs and installer names", () => {
    expect(isAllowedDownloadUrl(`${GITHUB_DOWNLOAD_PREFIX}v0.2.0/app.dmg`)).toBe(true);
    expect(isAllowedDownloadUrl("https://evil.example/app.dmg")).toBe(false);
    expect(sanitizeInstallerFilename("USB.Toolkit.for.Tesla_0.2.0_aarch64.dmg")).toBe(
      "USB.Toolkit.for.Tesla_0.2.0_aarch64.dmg",
    );
    expect(sanitizeInstallerFilename("../app.dmg")).toBeNull();
    expect(sanitizeInstallerFilename("notes.txt")).toBeNull();
  });
});

describe("evaluateRelease", () => {
  it("marks a newer published release as available", () => {
    const info = evaluateRelease({
      currentVersion: "0.1.0",
      platform: "macos",
      arch: "aarch64",
      release: release(),
    });
    expect(info.updateAvailable).toBe(true);
    expect(info.latestVersion).toBe("0.2.0");
    expect(info.asset?.name).toContain("aarch64.dmg");
  });

  it("treats the same version as up to date", () => {
    const info = evaluateRelease({
      currentVersion: "0.2.0",
      platform: "windows",
      arch: "x86_64",
      release: release(),
    });
    expect(info.updateAvailable).toBe(false);
    expect(info.developmentBuild).toBe(false);
  });

  it("flags a local version newer than GitHub as a development build", () => {
    const info = evaluateRelease({
      currentVersion: "0.3.0",
      platform: "windows",
      arch: "x86_64",
      release: release(),
    });
    expect(info.updateAvailable).toBe(false);
    expect(info.developmentBuild).toBe(true);
  });

  it("builds installer URLs from a release tag when the API is unavailable", () => {
    const fallback = conventionalAssets("v0.2.0");
    expect(fallback.map((asset) => asset.name)).toContain("USB.Toolkit.for.Tesla_0.2.0_x64_en-US.msi");
    expect(fallback[0].browser_download_url).toContain("/releases/download/v0.2.0/");
  });

  it("reads the latest tag from a GitHub releases atom feed", () => {
    const release = parseReleasesAtom(`<?xml version="1.0"?>
      <feed>
        <entry>
          <id>tag:github.com,2008:Repository/1/v0.2.0</id>
          <link rel="alternate" href="https://github.com/xcoding1024/tesla-usb-toolkit/releases/tag/v0.2.0"/>
          <title>USB Toolkit for Tesla v0.2.0</title>
          <content type="html">&lt;p&gt;Bug fixes&lt;/p&gt;</content>
        </entry>
      </feed>`);
    expect(release.tag_name).toBe("v0.2.0");
    expect(release.body).toBe("Bug fixes");
    expect(release.assets.some((asset) => asset.name.endsWith(".dmg"))).toBe(true);
  });

  it("parses GitHub release JSON and ignores unknown assets", () => {
    const parsed = parseGithubRelease({
      tag_name: "v0.2.0",
      name: "Release",
      body: "Notes",
      html_url: "https://example.com",
      assets: [
        { name: "ok.dmg", browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v0.2.0/ok.dmg`, size: 8 },
        { name: 1 },
      ],
    });
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0].name).toBe("ok.dmg");
  });
});
