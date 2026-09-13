# Format guide

**中文摘要：** exFAT 是行车记录首选；FAT32 / MS-DOS FAT 更适合灯光秀等；NTFS 车机不支持。格式化会清空数据，必须二次确认。Windows / macOS 调用系统工具；Linux 不执行 mkfs。

| Format | Typical use | Notes |
| --- | --- | --- |
| **exFAT** | Preferred for dashcam / Sentry; general use | In-car Format USB default; large-file friendly |
| **FAT32 / MS-DOS FAT** | Light Show, Boombox, some media | Broad compatibility; ~4 GB per file; poor for long Sentry recordings |
| **ext3 / ext4** | Listed as an alternative | Mostly Linux; awkward on Windows |
| **NTFS** | Unsupported | The car cannot use it (hard fail) |

With several drives attached, pick the target in the menu. Formatting erases the volume and requires a second confirm.

## How this app formats

| Platform | Options | Implementation | Guards |
| --- | --- | --- | --- |
| **Windows** | exFAT, FAT32 | `Format-Volume`, then `format /FS /Q /Y` | Removable `DriveType=2` only; reject `C:` and system paths |
| **macOS** | ExFAT, FAT32, MS-DOS | `diskutil eraseVolume` | External / removable / USB only; reject Macintosh HD and similar |
| **Linux** | UI may list exFAT / FAT32 | **Does not** run mkfs; tells you to use Windows/macOS or do it yourself | Same system-mount rejects |

MS-DOS FAT is Disk Utility’s name for FAT on macOS (usually FAT32). On Windows, choose FAT32.
