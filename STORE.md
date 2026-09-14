# Store distribution

**中文摘要：** GitHub 版继续用设置里的 Releases 更新。Microsoft Store / Mac App Store 构建会编译掉 GitHub 自更新。Tauri 2 仍产出 NSIS/MSI，不产出 `.msix`。Partner Center 预留的产品类型是 **MSIX or PWA app**（不是 EXE/MSI）；若无法改成 EXE/MSI，需用 `Package.appxmanifest` 自行打 MSIX。Mac App Store 需要沙盒；`diskutil` 格式化 U 盘很可能被拒或无法工作。商店身份与 Publisher `CN=` 已从 Partner Center 填入，不要伪造证书。

This repo ships **three desktop channels**. Do not upload binaries to the stores from CI; this is packaging prep only.

| Channel | Updater | Installer | Who updates the app |
| --- | --- | --- | --- |
| **GitHub / direct** (default) | Settings → Updates downloads GitHub Releases | `.msi` / NSIS `.exe` / `.dmg` | The app + GitHub Releases |
| **Microsoft Store** | GitHub updater **compiled out** | Tauri: offline WebView2 NSIS / MSI. Partner Center type: MSIX/PWA — self-pack MSIX if the listing cannot switch | Microsoft Store |
| **Mac App Store** | GitHub updater **compiled out** | Signed `.app` → installer `.pkg` | Mac App Store |

Bundle id stays `com.coding1024.tesla-toolkit`. English display name is **TTbox USB Toolkit**. Desktop only (no iOS / Android). Store consoles may still show the reserved listing name until you rename it there.

## Reserved identities

Reserved in Partner Center / App Store Connect. Publisher `CN=` is copied from Partner Center. Do not invent a certificate Subject.

| Field | Value |
| --- | --- |
| Microsoft Store ID | `9NJXSRQ51R1W` |
| Package identity Name | `30625JiaXiangHuang.USBToolkitforTesla` |
| Package Family Name (PFN) | `30625JiaXiangHuang.USBToolkitforTesla_0qzz0z9ekxn9j` |
| Publisher `CN=` | `CN=7EEF2A3C-D8BC-4B91-9F2D-728958623431` |
| Store product type | **MSIX or PWA app** (as reserved in Partner Center; not EXE/MSI) |
| Mac App Store Connect App ID | `6811606662` |
| Apple Team ID | `GFJDX458W5` |

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

[Tauri 2 does not have an `msix` bundle target](https://v2.tauri.app/distribute/microsoft-store/). The store-channel build still emits NSIS/MSI (the EXE/MSI path, with offline WebView2). Partner Center reserved this product as **MSIX or PWA app**, not EXE/MSI. If the listing stays locked to MSIX/PWA, self-pack an MSIX with [`store/msix/Package.appxmanifest`](store/msix/Package.appxmanifest) instead of uploading the NSIS/MSI installer. Do not invent certificates; only the Partner Center `CN=` is recorded.

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

1. English display name is **TTbox USB Toolkit**. Partner Center / App Store Connect may still show the reserved listing name until you rename it in the console. Product type in the console is **MSIX or PWA app**.
2. Identities are recorded above (Store ID, package name, PFN, Publisher `CN=`). Do not invent further certificate values.
3. If you can switch the listing to **EXE or MSI app**, upload the NSIS `-setup.exe` or the `.msi`. Silent install: NSIS `/S` (uppercase S) or MSI `msiexec /quiet`.
4. If the listing stays **MSIX or PWA app**, do not upload the Tauri NSIS/MSI installer; self-pack MSIX as below.
5. Code signing: leave `certificateThumbprint` / `signCommand` unset until you have a real Authenticode cert. **Do not commit `.pfx` / `.p12` files.** The Store re-signs the packaged app after submission.

**Self-made MSIX** (needed if Partner Center stays on **MSIX or PWA app**): copy the unpacked exe into a staging folder, use the reserved identity in [`store/msix/Package.appxmanifest`](store/msix/Package.appxmanifest) (Publisher `CN=` is already filled), add Store assets, then pack with [MakeAppx](https://learn.microsoft.com/windows/msix/package/create-app-package-with-makeappx-tool) or [winapp pack](https://learn.microsoft.com/windows/apps/dev-tools/winapp-cli/guides/tauri). Version must be four-part (`0.2.0.0`). Store submission still does not need you to sign with a fake cert.

Optional CI: [`.github/workflows/store.yml`](.github/workflows/store.yml) (`workflow_dispatch`) builds the Windows store-channel installer as an Actions artifact. It does **not** attach files to the GitHub Release.

### 3. Mac App Store

Requires a Mac, Apple Developer Program, and a **Mac App Store Connect** provisioning profile. Official steps: [Tauri App Store](https://v2.tauri.app/distribute/app-store/).

```bash
# Entitlements already use Team ID GFJDX458W5.
# Copy the downloaded profile to src-tauri/macos/embedded.provisionprofile
# (gitignored), then add bundle.macOS.files.embedded.provisionprofile in the
# App Store config or pass it locally.

export APPLE_SIGNING_IDENTITY="Apple Distribution: Your Name (GFJDX458W5)"
npm ci
npm run tauri:mac-app-store
```

Then sign a `.pkg` with a **Mac Installer Distribution** certificate and upload with `xcrun altool` / Transporter. See the Tauri guide for `productbuild` and API keys.

[`src-tauri/tauri.appstore.conf.json`](src-tauri/tauri.appstore.conf.json) enables `store-channel`, hardened runtime, Utility category (from the main config), 10.15 minimum, and [`macos/Entitlements.store.plist`](src-tauri/macos/Entitlements.store.plist).

Entitlements use Team ID `GFJDX458W5` (`GFJDX458W5.com.coding1024.tesla-toolkit`). **Do not invent signing certificates.** `signingIdentity` stays unset in git; set `APPLE_SIGNING_IDENTITY` when you build.

[`src-tauri/Info.plist`](src-tauri/Info.plist) sets `ITSAppUsesNonExemptEncryption` to false (HTTPS-only) and a removable-volume usage string.

## Submission checklist

### Both stores

- [ ] Store listing uses **TTbox USB Toolkit**; Chinese UI uses TTbox U 盘工具箱. Rename the reserved listing in Partner Center / App Store Connect if it still shows the old name.
- [ ] Trademark: “Tesla” is Tesla, Inc. This project is not affiliated. Reviewers may require a name/subtitle change or a clearer disclaimer
- [ ] Screenshots: Overview, Format, Dashcam, Light Show, Settings (store-update copy, no GitHub download)
- [ ] Privacy / nutrition labels: local USB scan + optional format; no account; store builds do not call GitHub
- [ ] Confirm a store build (`TOOLKIT_CHANNEL=store` / `store-channel`) has **no** Settings → GitHub download
- [ ] Age rating, support URL, and license (MIT) filled in the console

### Microsoft Store

- [ ] Product type is **MSIX or PWA app** (as reserved in Partner Center). Tauri 2 still emits NSIS/MSI; if the listing cannot switch to EXE/MSI, self-pack MSIX from `Package.appxmanifest`
- [ ] Offline WebView2 installer (still used by the Tauri store-channel NSIS/MSI build)
- [ ] Silent-install flags registered if you submit EXE/MSI; skip if you only submit a self-packed MSIX
- [ ] Partner Center Publisher `CN=7EEF2A3C-D8BC-4B91-9F2D-728958623431` matches the listing and `Package.appxmanifest`
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

Reserved Store ID, package identity, PFN, Publisher `CN=`, ASC App ID, and Team ID are listed above. Still missing:

| Placeholder | Where | Real value |
| --- | --- | --- |
| `APPLE_SIGNING_IDENTITY` | env at build time | Apple Distribution cert **name** from Keychain |
| `embedded.provisionprofile` | `src-tauri/macos/` (gitignored) | Mac App Store Connect profile |
| `certificateThumbprint` | only when you Authenticode-sign locally | SHA1 of a real cert — never a made-up hash |

## References

- https://v2.tauri.app/distribute/microsoft-store/
- https://v2.tauri.app/distribute/app-store/
- https://v2.tauri.app/reference/config/
