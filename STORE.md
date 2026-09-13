# Store distribution

**中文摘要：** GitHub 版继续用设置里的 Releases 更新。Microsoft Store / Mac App Store 构建会编译掉 GitHub 自更新。Tauri 2 不产出 `.msix`，商店提交用离线 WebView2 的 NSIS/MSI，或自行用 `Package.appxmanifest` 打包。Mac App Store 需要沙盒；`diskutil` 格式化 U 盘很可能被拒或无法工作。提交前替换 Partner Center / Apple Team ID，不要伪造证书。

This repo ships **three desktop channels**. Do not upload binaries to the stores from CI; this is packaging prep only.

| Channel | Updater | Installer | Who updates the app |
| --- | --- | --- | --- |
| **GitHub / direct** (default) | Settings → Updates downloads GitHub Releases | `.msi` / NSIS `.exe` / `.dmg` | The app + GitHub Releases |
| **Microsoft Store** | GitHub updater **compiled out** | Offline WebView2 NSIS / MSI (Store may wrap as MSIX) | Microsoft Store |
| **Mac App Store** | GitHub updater **compiled out** | Signed `.app` → installer `.pkg` | Mac App Store |

Bundle id stays `com.coding1024.tesla-toolkit`. English display name stays **USB Toolkit for Tesla**. Desktop only (no iOS / Android).

## Feature flag

Store configs enable the Cargo feature `store-channel` and set `TOOLKIT_CHANNEL=store` (via `scripts/tauri.mjs` when `--config` points at a store file).

- **Rust:** GitHub release fetch / download / open commands are not registered.
- **UI:** Settings shows a store-update note. No update banner, no GitHub download buttons.

`app_info` reports `distributionChannel` (`github` | `store`) and `githubUpdates`.

## Build instructions

Need Node 18+, Rust 1.88+, and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). From the repo root:

### 1. GitHub Release (current CI)

```bash
npm ci
npm run tauri:github
# same as: npm run tauri build
```

Produces the usual Windows `.msi` / NSIS `.exe` and macOS `.dmg`. Tag `v*` still runs [`.github/workflows/release.yml`](.github/workflows/release.yml). Do not pass a store `--config` here.

Ad-hoc macOS signing (`signingIdentity: "-"`) and unsigned Windows installers are unchanged.

### 2. Microsoft Store

[Tauri 2 does not have an `msix` bundle target](https://v2.tauri.app/distribute/microsoft-store/). Use Partner Center **EXE or MSI app** (Desktop Bridge). The Store can wrap that installer as MSIX and re-sign it.

```bash
npm ci
npm run tauri:microsoft-store
# npm run tauri build -- --config src-tauri/tauri.microsoftstore.conf.json
```

This merges [`src-tauri/tauri.microsoftstore.conf.json`](src-tauri/tauri.microsoftstore.conf.json):

- `store-channel` (no GitHub updater)
- WebView2 **offline installer** (required for Store)
- Targets: `nsis` + `msi` only
- Publisher placeholder `coding1024` (from `com.coding1024.tesla-toolkit`)

**Partner Center**

1. Reserve the name (English: USB Toolkit for Tesla).
2. Upload the NSIS `-setup.exe` or the `.msi`.
3. Silent install: NSIS `/S` (uppercase S) or MSI `msiexec /quiet`.
4. Fill identity from Partner Center — do not invent values:
   - Package / identity name
   - Publisher `CN=…` (Publisher ID)
   - Publisher display name
5. Code signing: leave `certificateThumbprint` / `signCommand` unset until you have a real Authenticode cert. **Do not commit `.pfx` / `.p12` files.** The Store re-signs the packaged app after submission.

**Optional self-made MSIX** (sideload / advanced): copy the unpacked exe into a staging folder, replace TODOs in [`store/msix/Package.appxmanifest`](store/msix/Package.appxmanifest), add Store assets, then pack with [MakeAppx](https://learn.microsoft.com/windows/msix/package/create-app-package-with-makeappx-tool) or [winapp pack](https://learn.microsoft.com/windows/apps/dev-tools/winapp-cli/guides/tauri). Version must be four-part (`0.2.0.0`). Store submission still does not need you to sign with a fake cert.

Optional CI: [`.github/workflows/store.yml`](.github/workflows/store.yml) (`workflow_dispatch`) builds the Windows store-channel installer as an Actions artifact. It does **not** attach files to the GitHub Release.

### 3. Mac App Store

Requires a Mac, Apple Developer Program, and a **Mac App Store Connect** provisioning profile. Official steps: [Tauri App Store](https://v2.tauri.app/distribute/app-store/).

```bash
# Replace TEAMID in src-tauri/macos/Entitlements.store.plist first.
# Copy the downloaded profile to src-tauri/macos/embedded.provisionprofile
# (gitignored), then add bundle.macOS.files.embedded.provisionprofile in the
# App Store config or pass it locally.

export APPLE_SIGNING_IDENTITY="Apple Distribution: Your Name (TEAMID)"
npm ci
npm run tauri:mac-app-store
```

Then sign a `.pkg` with a **Mac Installer Distribution** certificate and upload with `xcrun altool` / Transporter. See the Tauri guide for `productbuild` and API keys.

[`src-tauri/tauri.appstore.conf.json`](src-tauri/tauri.appstore.conf.json) enables `store-channel`, hardened runtime, Utility category (from the main config), 10.15 minimum, and [`macos/Entitlements.store.plist`](src-tauri/macos/Entitlements.store.plist).

Replace `TEAMID` in the entitlements with the real Apple Team ID (`TEAMID.com.coding1024.tesla-toolkit`). **Do not invent signing certificates.** `signingIdentity` stays unset in git; set `APPLE_SIGNING_IDENTITY` when you build.

[`src-tauri/Info.plist`](src-tauri/Info.plist) sets `ITSAppUsesNonExemptEncryption` to false (HTTPS-only) and a removable-volume usage string.

## Submission checklist

### Both stores

- [ ] Store listing uses **USB Toolkit for Tesla**; Chinese UI may still say 特斯拉 U 盘工具箱
- [ ] Trademark: “Tesla” is Tesla, Inc. This project is not affiliated. Reviewers may require a name/subtitle change or a clearer disclaimer
- [ ] Screenshots: Overview, Format, Dashcam, Light Show, Settings (store-update copy, no GitHub download)
- [ ] Privacy / nutrition labels: local USB scan + optional format; no account; store builds do not call GitHub
- [ ] Confirm a store build (`TOOLKIT_CHANNEL=store` / `store-channel`) has **no** Settings → GitHub download
- [ ] Age rating, support URL, and license (MIT) filled in the console

### Microsoft Store

- [ ] Product type is **EXE or MSI app**
- [ ] Offline WebView2 installer
- [ ] Silent-install flags registered
- [ ] Partner Center Publisher ID / `CN=` pasted into listing and, if you self-pack MSIX, into `Package.appxmanifest`
- [ ] No GitHub updater in the uploaded binary
- [ ] Format-USB still needs Administrator on Windows; disclose that in the listing

### Mac App Store

- [ ] Bundle ID `com.coding1024.tesla-toolkit` matches App Store Connect
- [ ] Sandbox + Team ID entitlements; embedded Mac App Store Connect profile
- [ ] Hardened runtime on
- [ ] Privacy text for removable volumes
- [ ] **Known blocker — disk format:** the app runs `diskutil eraseVolume`. App Sandbox does not grant unrestricted disk management. Temporary `/Volumes` exceptions are often rejected. Format (and maybe auto-listing `/Volumes`) may fail or be grounds for rejection unless you drop format, use a user-selected folder only, or ship a privileged helper Apple accepts
- [ ] USB listing via `/Volumes` may also need user-selected files or a reviewed exception
- [ ] No competing GitHub updater

## What you must fill later

| Placeholder | Where | Real value |
| --- | --- | --- |
| `TEAMID` | `src-tauri/macos/Entitlements.store.plist` | Apple Team ID |
| `APPLE_SIGNING_IDENTITY` | env at build time | Apple Distribution cert **name** from Keychain |
| `embedded.provisionprofile` | `src-tauri/macos/` (gitignored) | Mac App Store Connect profile |
| `CN=TODO-PARTNER-CENTER-PUBLISHER-ID` | `store/msix/Package.appxmanifest` | Partner Center publisher CN |
| Identity `Name` | same manifest | Partner Center package identity |
| `certificateThumbprint` | only when you Authenticode-sign locally | SHA1 of a real cert — never a made-up hash |

## References

- https://v2.tauri.app/distribute/microsoft-store/
- https://v2.tauri.app/distribute/app-store/
- https://v2.tauri.app/reference/config/
