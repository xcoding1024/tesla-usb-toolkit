# Tesla USB Toolkit

**特斯拉 U 盘工具箱**

[English](README.md) | [中文](README.zh.md)

![Tesla USB Toolkit tour](docs/promo/tour.gif)

跨平台桌面应用，支持 **Windows / macOS**。插入 U 盘后可扫描 TeslaCam 行车记录、灯光秀、贴纸与锁车音效，并在电脑上安全格式化，供车机使用。

界面为暗色玻璃侧栏（总览、格式化、行车记录、灯光秀、贴纸、锁车音效；设置在底部）。切换磁盘会自动重新扫描。Windows 与 macOS 的格式化有保护，不会擦除系统盘。Linux 仅暴露接口，并说明不会执行 mkfs。

> 本项目与 Tesla, Inc. 无关。Tesla 是 Tesla, Inc. 的商标。

## 下载

**v0.2.0** 安装包见 [GitHub Releases](https://github.com/xcoding1024/tesla-usb-toolkit/releases/latest)：

- **Windows**：`.msi` 或 NSIS `.exe`（x64）
- **macOS**：Apple Silicon 与 Intel 的 `.dmg`

macOS 为临时签名。若系统提示无法打开，请在「隐私与安全性」中允许。Windows SmartScreen 可能因未签名安装包发出警告。

桌面应用可在 **设置 → 版本更新** 中检查 GitHub Releases，并下载对应安装包。

## 状态

MVP 已可用。维护者：**JiaXiang Huang**。

- 判定规则：[`docs/DETECTION_RULES.md`](docs/DETECTION_RULES.md)
- 格式化指南：[`docs/FORMAT_GUIDE.md`](docs/FORMAT_GUIDE.md)
- 内容类型：[`docs/CONTENT_TYPES.md`](docs/CONTENT_TYPES.md)
- 路线图：[`docs/ROADMAP.md`](docs/ROADMAP.md)

## 技术栈

| 层级 | 选型 |
| --- | --- |
| 外壳 | **Tauri 2** |
| 界面 | **React 19 + TypeScript**（Vite 7） |
| 规则 | **TypeScript**（`src/lib/rules.ts`） |
| 卷扫描 | **Rust** Tauri 命令（`src-tauri/src/volumes.rs`） |
| 安装包 | `.msi` / `.exe` + `.dmg` |

- 可移动磁盘：Linux 使用 `lsblk` / `/proc/mounts`；Windows 使用 WMI / `Win32_LogicalDisk`；macOS 使用 `/Volumes` + `diskutil info`
- 当前目标磁盘在顶栏选择。插入、切换或刷新会自动扫描（仍可手动「重新扫描」）。浏览器预览使用内置演示卷
- 格式化选项：exFAT / FAT32 /（macOS）MS-DOS FAT，需明确确认。系统盘会被拒绝。Linux 不执行 mkfs
- 浏览器中运行 `npm run dev` 时使用 `public/demo` 示例文件，可预览视频、图片和音频

## 环境要求

- Node.js 18+（建议 20/22）和 **npm**
- [Rust](https://www.rust-lang.org/tools/install) stable（建议 **1.88+**；部分 `Cargo.lock` 传递依赖需要较新的 MSRV）
- Tauri 系统依赖：[Prerequisites](https://v2.tauri.app/start/prerequisites/)
  - **Windows**：WebView2、MSVC 构建工具
  - **macOS**：Xcode Command Line Tools
  - **Linux**（可选，用于开发/CI）：`webkit2gtk`、`librsvg` 及相关软件包

## 快速开始

```bash
git clone https://github.com/xcoding1024/tesla-usb-toolkit.git
cd tesla-usb-toolkit
npm install
```

仅前端（演示数据，无系统 WebView）：

```bash
npm run dev
```

桌面应用（真实卷与文件夹选择）：

```bash
npm run tauri dev
```

类型检查与单元测试：

```bash
npm run typecheck
npm test
```

重新生成 README 宣传 GIF（`docs/promo/tour.gif`）。需要本机 `ffmpeg`：

```bash
npm run promo
```

发布构建（需已安装 Tauri 依赖）：

```bash
npm run tauri build
```

`npx tauri dev` / `npx tauri build` 同样可用。支持的包管理器是 **npm**。

## 判定规则（简要）

### 文件系统

- **首选**：exFAT
- **可用**：FAT32 / MS-DOS FAT、ext3/ext4
- **不支持**：NTFS（硬失败）
- 未知文件系统：警告
- 行车记录盘：建议 **≥ 64 GB**

### 根目录标记

| 用途 | 标记 |
| --- | --- |
| 行车记录 / 哨兵 | `TeslaCam/`（大小写必须完全一致）→ `RecentClips` / `SavedClips` / `SentryClips` |
| 赛道模式 | `TeslaTrackMode/` |
| 灯光秀 | `LightShow/` + 成对的 `.fseq` 与对应 `.wav`/`.mp3`；根目录**不能**有 `TeslaCam` 或更新包 |
| 贴纸 | `Wraps/` 下的 PNG（512–1024，≤1 MB，需符合命名规则） |
| 锁车音效 / Boombox | 根目录 `LockChime.wav`；`Boombox/` |
| 音乐 | 常见音频文件 |
| 冲突 | `LightShow` + 根目录 `TeslaCam`；灯光秀 / 贴纸盘上同时存在更新文件 |

完整规则与冲突矩阵见文档。

## 项目结构

```
src/                 React + TypeScript 界面、规则引擎、i18n 文案
src-tauri/           Tauri 2 Rust 后端（卷、扫描、格式化）
docs/                判定规则、格式化指南、内容类型、路线图
```

## 许可证

以 [GNU General Public License v3.0 or later](LICENSE) 发布。

你可以复制、修改和分发本软件（包括收费）。若分发修改版或基于本项目的产品，必须以相同的 GPL 发布，并提供对应的完整源码。不得将本代码库做成闭源产品再发布。

Copyright © 2026 JiaXiang Huang.

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。提交说明必须使用 **英文**。文档以 **英文为源**；完整中文说明见本文件，其他文档在需要时保留简短中文摘要。

## 维护者

- JiaXiang Huang
- 仓库：https://github.com/xcoding1024/tesla-usb-toolkit
