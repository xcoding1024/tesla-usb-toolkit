# USB Toolkit for Tesla

[English](README.md) | [中文](README.zh.md)

![USB Toolkit for Tesla tour](docs/promo/tour.gif)

Cross-platform desktop app for **Windows / macOS**. Plug in a USB drive to scan TeslaCam clips, Light Shows, wraps, and lock chimes, then format the drive safely for the car.

The UI is a dark glass sidebar (Overview, Format, Dashcam, Light Show, Wraps, Lock Chime; Settings at the bottom). Switching drives rescans automatically. Formatting on Windows and macOS is guarded so system disks cannot be erased. Linux exposes the API and explains that mkfs is not run.

> This project is not affiliated with Tesla, Inc. Tesla is a trademark of Tesla, Inc.

## Download

Installers for **v0.2.0** are on [GitHub Releases](https://github.com/xcoding1024/tesla-usb-toolkit/releases/latest):

- **Windows**: `.msi` or NSIS `.exe` (x64)
- **macOS**: `.dmg` for Apple Silicon and Intel

macOS builds are ad-hoc signed. If Gatekeeper blocks the app, allow it in **Privacy & Security**. Windows SmartScreen may warn because the installer is unsigned.

The desktop app can check GitHub Releases from **Settings → Updates** and download the matching installer.

## Status

MVP is usable. Maintainer: **JiaXiang Huang**.

- Detection rules: [`docs/DETECTION_RULES.md`](docs/DETECTION_RULES.md)
- Format guide: [`docs/FORMAT_GUIDE.md`](docs/FORMAT_GUIDE.md)
- Content types: [`docs/CONTENT_TYPES.md`](docs/CONTENT_TYPES.md)
- Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Tech stack

| Layer | Choice |
| --- | --- |
| Shell | **Tauri 2** |
| UI | **React 19 + TypeScript** (Vite 7) |
| Rules | **TypeScript** (`src/lib/rules.ts`) |
| Volume scan | **Rust** Tauri commands (`src-tauri/src/volumes.rs`) |
| Bundles | `.msi` / `.exe` + `.dmg` |

- Removable disks: Linux `lsblk` / `/proc/mounts`; Windows WMI / `Win32_LogicalDisk`; macOS `/Volumes` + `diskutil info`
- The current target is chosen in the top bar. Insert, switch, or refresh triggers an automatic scan (Rescan is still available). Browser preview uses built-in demo volumes
- Format options: exFAT / FAT32 / (macOS) MS-DOS FAT, after an explicit confirm. System disks are rejected. Linux does not run mkfs
- `npm run dev` in a browser uses `public/demo` sample files so you can preview video, images, and audio

## Requirements

- Node.js 18+ (20/22 recommended) and **npm**
- [Rust](https://www.rust-lang.org/tools/install) stable (suggest **1.88+**; some `Cargo.lock` transitive crates need a recent MSRV)
- Tauri system deps: [Prerequisites](https://v2.tauri.app/start/prerequisites/)
  - **Windows**: WebView2, MSVC build tools
  - **macOS**: Xcode Command Line Tools
  - **Linux** (optional, for dev/CI): `webkit2gtk`, `librsvg`, and related packages

## Getting started

```bash
git clone https://github.com/xcoding1024/tesla-usb-toolkit.git
cd tesla-usb-toolkit
npm install
```

Frontend only (demo data, no system WebView):

```bash
npm run dev
```

Desktop app (real volumes and folder picker):

```bash
npm run tauri dev
```

Typecheck and unit tests:

```bash
npm run typecheck
npm test
```

Regenerate the README promo GIF (`docs/promo/tour.gif`). Needs `ffmpeg`:

```bash
npm run promo
```

Release build (Tauri deps must be installed):

```bash
npm run tauri build
```

`npx tauri dev` / `npx tauri build` also work. **npm** is the supported package manager.

## Detection rules (short)

### Filesystem

- **Preferred**: exFAT
- **OK**: FAT32 / MS-DOS FAT, ext3/ext4
- **Unsupported**: NTFS (hard fail)
- Unknown filesystem: warning
- Dashcam drives: **≥ 64 GB** is recommended

### Root markers

| Use | Marker |
| --- | --- |
| Dashcam / Sentry | `TeslaCam/` (exact case) → `RecentClips` / `SavedClips` / `SentryClips` |
| Track Mode | `TeslaTrackMode/` |
| Light Show | `LightShow/` + paired `.fseq` and matching `.wav`/`.mp3`; **no** root `TeslaCam` or update packages |
| Wraps | `Wraps/` PNGs (512–1024, ≤1 MB, name rules) |
| Lock chime / Boombox | Root `LockChime.wav`; `Boombox/` |
| Music | Common audio files |
| Conflicts | `LightShow` + root `TeslaCam`; Light Show / wrap drives that also hold update files |

Full rules and the conflict matrix are in the docs.

## Project layout

```
src/                 React + TypeScript UI, rules engine, i18n catalogs
src-tauri/           Tauri 2 Rust backend (volumes, scan, format)
docs/                Detection rules, format guide, content types, roadmap
```

## License

Released under the [MIT License](LICENSE).

You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software, provided the copyright notice and permission notice are included.

Copyright © 2026 JiaXiang Huang.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commit messages must be in **English**. Documentation is **English first**; a full Chinese README is in [README.zh.md](README.zh.md), and other docs keep a short Chinese summary where it helps.

## Maintainers

- JiaXiang Huang
- Repository: https://github.com/xcoding1024/tesla-usb-toolkit
