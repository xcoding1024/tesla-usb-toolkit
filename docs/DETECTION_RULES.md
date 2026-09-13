# Detection rules

**中文摘要：** 按车主手册、官方 Light Show 仓库和常见实车习惯识别 U 盘用途。细则随车机版本变化；实现里用硬失败 / 软提示区分。对照代码：`src/lib/rules.ts`、`src/lib/wraps.ts`、`src-tauri/src/volumes.rs`。

Rules follow the Tesla owner’s manual, the official Light Show repo, and common in-car practice. Details can change with vehicle software. The implementation splits **hard fails** from **soft tips**.

MVP coverage lives in `src/lib/rules.ts` (verdicts), `src/lib/wraps.ts` (wrap / update heuristics), and `src-tauri/src/volumes.rs` (volume list and root scan). It already covers filesystem verdicts, TeslaCam subdirectory counts, LightShow `.fseq` pairing, wrap PNG size/name checks, LockChime/Boombox, and LightShow + root TeslaCam / update-package conflicts. The UI scans after insert or switch. Audio sample-rate reads, write-speed tests, and update-package signatures are still follow-ups.

## 1. Purpose detection (root markers)

Scan the **root** of a removable volume. Several purposes can coexist; some combinations conflict.

| Purpose | Root marker | Notes |
| --- | --- | --- |
| Dashcam / Sentry | `TeslaCam/` (case-sensitive) | Created by in-car Format USB |
| Track Mode | `TeslaTrackMode/` | Some vehicles only |
| Light Show | `LightShow/` | Conflicts with a **root** `TeslaCam` (official Light Show drives must not have TeslaCam at the root) |
| Boombox | `Boombox/` | May also have root `LockChime.wav` |
| Music | Audio under root or subfolders (mp3/aac/flac/wav, …) | Loose rule; can share a dashcam drive; Tesla often suggests separate partitions or folders |
| Paint Shop | `LicensePlate/`, `Wraps/` | Custom plates / wraps; not on every vehicle |
| Map / firmware update | Official update-package file names | Officially incompatible with a Light Show drive |

**Suggested report:**

- Primary uses: highest-confidence matches (multi-select allowed)
- Conflicts: e.g. root `TeslaCam` + `LightShow` → “may not be recognized as a Custom Light Show”
- Empty / format-only, no Tesla folders → “ready for in-car format or for creating TeslaCam”

## 2. Filesystem and partitions

### 2.1 Supported filesystems

| Filesystem | Dashcam / Sentry | Light Show | Advice |
| --- | --- | --- | --- |
| **exFAT** | Yes (in-car Format default) | Yes | **Preferred** |
| FAT32 / MS-DOS FAT | Yes (large files hit the 4 GB limit) | Yes | OK; not ideal for dashcam |
| ext3 / ext4 | Yes (listed in the manual) | Yes | Mostly Linux |
| **NTFS** | No | No | **Hard fail**: the car cannot use it |

**Checks:**

- `FS_OK`: exFAT / FAT32 / MS-DOS FAT / ext3 / ext4
- `FS_FAIL_NTFS`: NTFS → fail, recommend reformat as exFAT
- `FS_UNKNOWN`: anything else → warn, suggest exFAT

### 2.2 Capacity and performance

| Item | Manual / practice | Severity |
| --- | --- | --- |
| Capacity | Dashcam often wants **≥ 64 GB** | `<64GB` → warning (structure is still scanned) |
| Sustained write | About **4 MB/s** | Hard to measure quietly → soft tip, optional speed test |
| USB | USB 2.0 compatible | Informational |
| Partition table | Community often uses **MBR** (not GPT) for dashcam | Soft tip |
| Cluster size | Default, or 32 KB / 128 KB on dashcam drives | Informational |

## 3. Dashcam / Sentry (`TeslaCam`)

### 3.1 Root folder

- Exact name: `TeslaCam` (`T` and `C` uppercase, no spaces)
- `teslacam`, `Tesla Cam`, `TESLACAM` → naming issue

### 3.2 Subfolders (created by the car)

| Subfolder | Meaning | Detection |
| --- | --- | --- |
| `RecentClips/` | Rolling cache of recent driving | Presence → dashcam data exists |
| `SavedClips/` | User-saved events | Count / size; warn if full so recording can stop |
| `SentryClips/` | Sentry events | Usually timestamp folders; may include `event.json` |

### 3.3 Content

- Videos are usually per-camera `.mp4` files
- `SentryClips/<timestamp>/` may include `event.json` (reason, time, camera)
- Report: size, clip counts, last modified, near-full capacity

### 3.4 Ready state

- **Ready**: supported filesystem + root `TeslaCam`
- **In use**: ready and at least one of Recent/Saved/Sentry has content
- **Empty shell**: `TeslaCam` exists but subfolders are empty or missing

## 4. Track Mode (`TeslaTrackMode`)

- Root folder: `TeslaTrackMode`
- Can share a drive with TeslaCam
- Detect presence, size, and a file summary

## 5. Light Show

Based on [teslamotors/light-show](https://github.com/teslamotors/light-show):

### 5.1 Drive rules

- Filesystem: exFAT / FAT32 / MS-DOS FAT / ext3 / ext4 (**not NTFS**)
- Root folder name must be exactly `LightShow`
- **No** root `TeslaCam`
- **No** map / firmware update files

### 5.2 Show files

Each show needs a same-stem pair:

- `*.fseq` (sequence)
- Matching `*.wav` (preferred) or `*.mp3`
- Example: `show1.fseq` + `show1.wav`
- Multiple shows per drive are allowed on newer software

### 5.3 Output

- Valid paired shows
- Orphans (fseq or audio only)
- Conflicts: root TeslaCam / update files
- If sample rate is readable: mention the official **44.1 kHz** recommendation

## 6. Boombox / unlock chime

Community practice (may change with software):

- Root `Boombox/`: custom sounds (about 5 max, wav/mp3)
- Root `LockChime.wav`: unlock chime (exact file name)
- Detect count, format, and naming

## 7. Music drives

- Common audio formats are enough
- If shared with dashcam: leave free space so Sentry can still write
- No required folder name unless a later spec adds one

## 8. Conflict matrix

| Combination | Verdict |
| --- | --- |
| `TeslaCam` only | Dashcam / Sentry drive |
| `TeslaCam` + music | Mixed dashcam + music (usable; watch free space) |
| `TeslaCam` + `TeslaTrackMode` | Dashcam + Track Mode |
| `LightShow` only, pairs complete | Light Show drive |
| `LightShow` + root `TeslaCam` | **Conflict**: Light Show may fail |
| `LightShow` + update package | **Conflict** |
| `Boombox` ± `LockChime.wav` | Boombox drive |
| NTFS with any content | **Format fail**; purposes are identification only |

## 9. Suggested pipeline

1. List removable volumes (exclude system disks)
2. Read capacity, filesystem, partition table when available
3. Compare root names case-sensitively
4. Run deeper rules for each hit
5. Summarize: format verdict / purposes / content / conflicts and fixes

## 10. Example fix copy

- NTFS → Back up, format as exFAT, then create the folders you need
- No TeslaCam → Create `TeslaCam` at the root, or use Format USB in the car
- Wrong TeslaCam casing → Rename to exactly `TeslaCam`
- Unpaired Light Show → Give every `.fseq` a matching `.wav`/`.mp3`
- LightShow + TeslaCam → Use a separate USB for Light Shows, or remove root TeslaCam
- SavedClips full → Delete old SavedClips / SentryClips so recording can continue
