# Roadmap

**中文摘要：** 暗色玻璃侧栏，按内容导航；插入/切换 U 盘后自动扫描。Phase 0–3 与界面多语言已完成；v0.2.0 已提供 Windows / macOS 安装包，并可从 GitHub 检查与下载更新。商店渠道打包配置已就绪。更新包深层识别仍待做。

Dark glass sidebar. Navigation is by content (Overview, Format, Dashcam, Light Show, Wraps, Lock Chime; Settings at the bottom). Insert or switch a drive to scan.

## Phase 0 · Scope and shell

- [x] Confirm features and cadence
- [x] First UI shell (sidebar, overview, current-drive switcher)
- [x] Format copy, content-type list, preview matrix, i18n catalogs (`src/i18n/en.ts`, `src/i18n/zh.ts`)

## Phase 1 · Multi-drive + format (priority)

- [x] List removable drives; switch the current target
- [x] Format options: exFAT / FAT32 / MS-DOS FAT (plus what the OS allows)
- [x] Per-option help (dashcam vs Light Show, etc.)
- [x] Second confirm before format; readable errors
- [x] Windows / macOS system format; Linux API + “no mkfs” message

## Phase 2 · Content detection

- [x] Detect and list (with conflicts): TeslaCam, LightShow, Wraps, LockChime/Boombox, TeslaTrackMode, music, map/firmware heuristics
- [x] Content pages + empty states; scan on insert
- [ ] Deeper update-package signature / directory detection

Reuse:

- https://github.com/teslamotors/light-show (fseq checks)
- https://github.com/teslamotors/custom-wraps (wrap size/format)
- Reference: https://github.com/FrancoisCoding/tesla-usb-manager

## Phase 3 · Preview

- [x] TeslaCam clip list, grouped by event/time, in-app video
- [x] Wrap PNG thumbnails and full preview (keep size/name checks)
- [x] Light Show paired-audio preview with live spectrum; fseq header metadata; no light simulation
- [x] Lock chime / Boombox audio preview
- [x] Tauri asset protocol; browser preview uses `public/demo`

## Phase 4 · i18n

- [x] English / Chinese catalogs and a Settings switcher (English default)

## Phase 5 · Polish

- [ ] Visual / empty / result polish
- [ ] Windows + macOS device acceptance
- [x] In-app GitHub update check and installer download
- [x] Store-channel packaging profiles (Microsoft Store EXE/MSI, Mac App Store entitlements; GitHub updater compiled out)
- [ ] Privilege and installer notes
