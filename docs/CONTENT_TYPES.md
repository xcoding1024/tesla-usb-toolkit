# Content types and preview

**中文摘要：** 侧栏按内容分页（总览 / 格式化 / 行车记录 / 灯光秀 / 贴纸 / 锁车音效）。插入或切换 U 盘后自动扫描；空态会说明该放什么文件。

Sidebar pages: **Overview / Format / Dashcam / Light Show / Wraps / Lock Chime**, Settings at the bottom. Insert or switch a drive to scan. Empty states say which files belong on that page.

| Type | Root marker | This page | Preview |
| --- | --- | --- | --- |
| Dashcam / Sentry | `TeslaCam/` | Recent / Saved / Sentry presence, counts, size, ready state | Events and clips (name, time, camera, size); in-app playback |
| Track Mode | `TeslaTrackMode/` | Note on the dashcam page | File list with dashcam |
| Light Show | `LightShow/` + `.fseq` + audio | Paired shows, orphans, root TeslaCam / update conflicts | Paired audio with live spectrum; fseq header (size / frames / duration / channels / compression) |
| Wraps | `Wraps/` PNGs | Count, bytes, pixels, official-rule notes | Thumbnails + full image (validation notes stay visible) |
| Lock chime | Root `LockChime.wav` | Present or missing | Audio preview |
| Boombox | `Boombox/` | Sound list | Audio preview |
| Music | Common audio | Overview summary | Audio playback |
| Map / firmware | Update-package names | Identify + conflict only | — |

Wrap checks follow [teslamotors/custom-wraps](https://github.com/teslamotors/custom-wraps): PNG, about 512–1024 px on a side (including Cybertruck 1024×768), ≤1 MB, names with letters/numbers/spaces/`_`/`-` only and ≤30 characters, about 10 images per USB.

fseq headers follow the [teslamotors/light-show](https://github.com/teslamotors/light-show) validator: `PSEQ`, uncompressed v2, 48 or 200 channels, step ≥15 ms. This app does not simulate car lights.

Conflict examples: `LightShow` + root `TeslaCam`; Light Show or wrap drives that also hold update files.
