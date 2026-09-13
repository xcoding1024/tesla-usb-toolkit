export const GITHUB_REPO = "xcoding1024/tesla-usb-toolkit";
export const GITHUB_RELEASES_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_ATOM = `https://github.com/${GITHUB_REPO}/releases.atom`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;
export const GITHUB_DOWNLOAD_PREFIX = `https://github.com/${GITHUB_REPO}/releases/download/`;

export type HostPlatform = "windows" | "macos" | "linux" | "web" | "unknown";
export type HostArch = "aarch64" | "x86_64" | "unknown";

export interface AppInfo {
  version: string;
  platform: HostPlatform;
  arch: HostArch;
}

export interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GithubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
  assets: GithubAsset[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  developmentBuild: boolean;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  asset: GithubAsset | null;
}

export function bundledAppVersion(): string {
  return typeof __APP_VERSION__ === "string" && __APP_VERSION__ ? __APP_VERSION__ : "0.2.0";
}

export function normalizeVersion(input: string): string {
  return input.trim().replace(/^v/i, "");
}

export function parseVersion(input: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(normalizeVersion(input));
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

export function isAllowedDownloadUrl(url: string): boolean {
  return url.startsWith(GITHUB_DOWNLOAD_PREFIX);
}

export function sanitizeInstallerFilename(name: string): string | null {
  const base = name.trim();
  if (!base || base.includes("/") || base.includes("\\") || base.includes("..")) return null;
  const lower = base.toLowerCase();
  if (!(lower.endsWith(".dmg") || lower.endsWith(".msi") || lower.endsWith(".exe"))) {
    return null;
  }
  return base;
}

export function isInstallerAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith(".sig") || lower.endsWith(".json")) return false;
  if (lower.endsWith(".app.tar.gz") || lower.endsWith(".tar.gz")) return false;
  return lower.endsWith(".dmg") || lower.endsWith(".msi") || lower.endsWith(".exe");
}

export function pickUpdateAsset(
  assets: GithubAsset[],
  platform: HostPlatform,
  arch: HostArch,
): GithubAsset | null {
  const candidates = assets.filter((asset) => isInstallerAsset(asset.name));
  if (platform === "windows") {
    return (
      candidates.find((asset) => asset.name.toLowerCase().endsWith(".msi")) ??
      candidates.find((asset) => /setup\.exe$/i.test(asset.name)) ??
      candidates.find((asset) => asset.name.toLowerCase().endsWith(".exe")) ??
      null
    );
  }
  if (platform === "macos") {
    const dmgs = candidates.filter((asset) => asset.name.toLowerCase().endsWith(".dmg"));
    if (arch === "aarch64") {
      return dmgs.find((asset) => /aarch64|arm64/i.test(asset.name)) ?? dmgs[0] ?? null;
    }
    return (
      dmgs.find((asset) => /x64|x86_64|intel/i.test(asset.name) && !/aarch64|arm64/i.test(asset.name)) ??
      dmgs[0] ??
      null
    );
  }
  return null;
}

export function parseGithubRelease(value: unknown): GithubRelease {
  if (!value || typeof value !== "object") {
    throw new Error("invalid_release");
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.tag_name !== "string" || !Array.isArray(raw.assets)) {
    throw new Error("invalid_release");
  }
  const assets: GithubAsset[] = [];
  for (const item of raw.assets) {
    if (!item || typeof item !== "object") continue;
    const asset = item as Record<string, unknown>;
    if (typeof asset.name !== "string" || typeof asset.browser_download_url !== "string") continue;
    assets.push({
      name: asset.name,
      browser_download_url: asset.browser_download_url,
      size: typeof asset.size === "number" ? asset.size : 0,
    });
  }
  return {
    tag_name: raw.tag_name,
    name: typeof raw.name === "string" ? raw.name : null,
    body: typeof raw.body === "string" ? raw.body : null,
    html_url: typeof raw.html_url === "string" ? raw.html_url : GITHUB_RELEASES_PAGE,
    prerelease: Boolean(raw.prerelease),
    draft: Boolean(raw.draft),
    assets,
  };
}

export function evaluateRelease(input: {
  currentVersion: string;
  platform: HostPlatform;
  arch: HostArch;
  release: GithubRelease;
}): UpdateInfo {
  const latestVersion = normalizeVersion(input.release.tag_name);
  const currentVersion = normalizeVersion(input.currentVersion);
  const cmp = compareVersions(latestVersion, currentVersion);
  const updateAvailable = cmp > 0 && !input.release.draft && !input.release.prerelease;
  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    developmentBuild: cmp < 0,
    releaseName: input.release.name?.trim() || `v${latestVersion}`,
    releaseNotes: (input.release.body ?? "").trim(),
    releaseUrl: input.release.html_url || GITHUB_RELEASES_PAGE,
    asset: pickUpdateAsset(input.release.assets, input.platform, input.arch),
  };
}

export function inferBrowserArch(): HostArch {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
  if (ua.includes("arm64") || ua.includes("aarch64")) return "aarch64";
  if (ua.includes("x86_64") || ua.includes("win64") || ua.includes("wow64")) return "x86_64";
  return "unknown";
}

export function browserAppInfo(): AppInfo {
  return {
    version: bundledAppVersion(),
    platform: "web",
    arch: inferBrowserArch(),
  };
}

export function parseHostPlatform(value: string | undefined): HostPlatform {
  if (value === "windows" || value === "macos" || value === "linux" || value === "web") return value;
  return "unknown";
}

export function parseHostArch(value: string | undefined): HostArch {
  if (value === "aarch64" || value === "x86_64") return value;
  return "unknown";
}

export function conventionalAssets(version: string): GithubAsset[] {
  const normalized = normalizeVersion(version);
  const names = [
    `USB.Toolkit.for.Tesla_${normalized}_aarch64.dmg`,
    `USB.Toolkit.for.Tesla_${normalized}_x64.dmg`,
    `USB.Toolkit.for.Tesla_${normalized}_x64-setup.exe`,
    `USB.Toolkit.for.Tesla_${normalized}_x64_en-US.msi`,
  ];
  return names.map((name) => ({
    name,
    browser_download_url: `${GITHUB_DOWNLOAD_PREFIX}v${normalized}/${name}`,
    size: 0,
  }));
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripHtml(input: string): string {
  return decodeXmlEntities(input)
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseReleasesAtom(xml: string): GithubRelease {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) {
    throw new Error("invalid_release");
  }
  const id = entry.match(/<id>([^<]+)<\/id>/)?.[1] ?? "";
  const title = entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? GITHUB_RELEASES_PAGE;
  const content = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "";
  const tag =
    id.match(/\/(v?\d+\.\d+\.\d+)\s*$/)?.[1] ?? title.match(/v?\d+\.\d+\.\d+/)?.[0] ?? "";
  if (!tag) {
    throw new Error("invalid_release");
  }
  return {
    tag_name: tag.startsWith("v") ? tag : `v${tag}`,
    name: title || null,
    body: stripHtml(content),
    html_url: link,
    prerelease: false,
    draft: false,
    assets: conventionalAssets(tag),
  };
}
