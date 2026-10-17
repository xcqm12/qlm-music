# 七零喵 x 星海 聚合音源 · 整合版

[![版本](https://img.shields.io/badge/version-v2.0.0-blue.svg)](./netease-official-source.js)
[![Release](https://img.shields.io/github/v/release/xcqm12/qlm-music.svg)](https://github.com/xcqm12/qlm-music/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)

> 基于 NeteaseCloudMusicApiEnhanced 官方接口、结合星海音乐源的聚合音源整合版

## 简介

本项目是**结合星海的聚合音源整合版**。主文件 `netease-official-source.js`（v2.0.0，混淆发行版）以网易云官方接口（api.qlm.org.cn）为第一优先，官方链路未命中时自动切换星海渠道（酷我本地直连 / 星海后端聚合 / GD音乐台），一个脚本覆盖 `wy / tx / kw / kg / mg / qs` 六个平台，开箱即用。

另保留全聚合降级链版 `qlm-v1.1.0-integrated.js`（七零喵全系音源 + 星海，18+1 处理器），供需要多后端聚合的用户选用。

## 功能特性

- **官方五级降级** - `/song/url/v1` → 服务端解灰 → 客户端下载链路 → 旧版码率接口 → 灰色歌曲解锁，逐级自动切换
- **星海全平台兜底** - 官方链路失败后自动切换星海渠道，后端主备域名自动切换
- **酷我本地直连** - 无需第三方后端（无解密代理时音质封顶 flac）
- **星海后端聚合** - 支持网易/QQ/酷我/酷狗/咪咕/**汽水音乐**
- **X-Token/X-Client 认证** - 支持星海签名认证机制
- **智能匹配** - 歌名/歌手智能匹配，songId 缺失时自动搜索补全
- **试听检测** - 自动识别试听片段并降级重试
- **缓存管理** - URL 缓存 + LRU 机制，提升响应速度
- **音质全等级映射** - standard → jymaster 全等级映射至接口 level/br 参数
- **稳定请求** - 15s 超时，失败自动重试并绕过服务端 2 分钟缓存
- **自动更新** - 内置版本检查和更新提示（全聚合版）

## 支持平台与音质

| 平台 | 应用内音质 | 说明 |
|------|-----------|------|
| 网易云 (wy) | 128k / 320k / flac / flac24bit | 官方接口优先，星海兜底 |
| QQ音乐 (tx) | 128k / 192k / 320k / flac / hires / atmos / master | 星海渠道 |
| 酷我 (kw) | 128k / 320k / flac | 本地直连优先 |
| 酷狗 (kg) | 128k / 320k / flac / hires / atmos / master | 星海渠道 |
| 咪咕 (mg) | 128k / 320k / flac | 星海渠道 |
| 汽水 (qs) | 128k / 320k / flac / spatial / hires | 星海渠道 |

> 应用实际可选音质由 LX Music 按平台过滤（网易云源固定为 `128k / 320k / flac / flac24bit`）。

## 降级链

### 独立整合版 `netease-official-source.js`（v2.0.0）

```
网易云 (wy):
  /song/url/v1 (level) → /song/url/v1?unblock=true (服务端解灰)
  → /song/download/url/v1 (免费歌曲最高 Hi-Res) → /song/url (码率自动降级)
  → /song/url/match (灰色歌曲解锁)
  → 星海备用: CHKSZ(可选) → 星海后端聚合 → GD音乐台

酷我 (kw):  本地直连（多渠道码率链） → 星海后端聚合
QQ (tx):    CHKSZ(可选) → 星海后端聚合
酷狗/咪咕:  星海后端聚合
汽水 (qs):  星海后端聚合（抖音流）
```

### 全聚合版 `qlm-v1.1.0-integrated.js`

按优先级顺序执行，任一音源成功即停止：

| 优先级 | 音源 | 支持平台 |
|--------|------|----------|
| 0 | **酷我本地**（直连） | 酷我 |
| 0 | GD音乐台 | QQ/网易/酷我/酷狗/咪咕 |
| 1 | CHKSZ（api.chksz.com 网易+QQ） | 网易云、QQ音乐 |
| 2-6 | 肥猫、小熊猫、梓澄公益、無名、六音 | QQ/网易/酷我/酷狗/咪咕 |
| 7 | 星海主（yy.zddyr.top / zrcdy.dpdns.org） | QQ/网易/酷我/酷狗/咪咕 |
| 7.5 | **星海后端**（含汽水音乐） | 网易/QQ/酷我/酷狗/咪咕/汽水 |
| 8-10 | 长青SVIP、念心SVIP、溯音 | QQ/网易/酷我/酷狗/咪咕 |
| 11-12 | ikun、野草、fish | 多平台 |
| 13-15 | qorg、wyqlm、网易云官方 | 网易云 |
| 16 | 汽水VIP | 咪咕 |
| 兜底 | 星海备用 → GD备用 → 试听片段 | — |

## 使用方法

### 安装

1. 下载 `netease-official-source.js`（推荐）或 `qlm-v1.1.0-integrated.js`，或从
   [Releases](https://github.com/xcqm12/qlm-music/releases) 下载整包
   `qlm-music-all-v1.1.0.zip`（全部音源文件）
2. 打开 LX Music 应用
3. 进入设置 -> 音源设置 -> 自定义源
4. 导入下载的 JS 文件并启用
5. 可导入多个自定义源并切换，同一时间仅一个生效

### 配置说明

脚本内置了智能配置，无需手动修改。如需自定义，可修改以下配置项：

```javascript
// CHKSZ 配置（api.chksz.com 接口需要 apikey，为空时该渠道自动跳过）
CHKSZ_CONFIG: { apikey: '' },

// 酷我本地直连
KW_LOCAL_CONFIG: { enabled: true },
KW_DECRYPT_PROXY: { allowEncryptedLossless: false }, // 无解密代理时音质封顶 flac

// 超时配置
TIMEOUT: 15000,  // 请求超时时间 (15秒)
```

## 技术特点

### 兼容性处理

- **严格模式兼容** - 使用 `globalThis` 兼容严格模式
- **Polyfill 支持** - 内置 `URLSearchParams` 等 Polyfill
- **多环境适配** - 支持 LX Music 移动端和桌面端

### 稳定性优化

- **错误处理** - 完善的 try-catch 错误处理，全链路错误信息合并上报
- **超时控制** - 所有网络请求都有超时控制
- **顺序降级** - 逐级降级避免竞态，主备域名自动切换
- **缓存防抖** - 时间戳参数绕过服务端缓存

## 文件说明

```
.
├── netease-official-source.js    # 结合星海的聚合整合版（v2.0.0，混淆发行版，推荐）
├── qlm-v1.1.0-integrated.js      # 全聚合降级链版（七零喵全系 + 星海）
├── qlm-v1.0.0-integrated.js      # 上一整合版本
├── qlm-v7.x / v9.0.0 系列        # 七零喵历史版本存档
├── qlm-fix-*.js / *ultimate*     # 历史修复版存档
├── README.md                     # 本文件
├── LICENSE                       # 许可证
└── .github/FUNDING.yml           # 赞助配置
```

## 更新日志

### netease-official-source.js v2.0.0（2026-10-17）

- **结合星海**：官方链路失败后自动切换星海渠道（酷我本地直连 / 星海后端聚合主备域名自动切换 / GD音乐台）
- 官方降级链升级为**五级**：新增 `unblock` 服务端解灰与 `/song/download/url/v1` 客户端下载链路（免费歌曲最高 Hi-Res）
- 平台声明扩展至 `wy / tx / kw / kg / mg / qs` 六平台
- 接口对齐 NeteaseCloudMusicApiEnhanced 最新文档（试听判定、时间戳缓存绕过等）

### netease-official-source.js v1.0.0（2026-10-15）

- 新增网易云官方独立音源（混淆发行版），基于 NeteaseCloudMusicApiEnhanced（api.qlm.org.cn）
- 三级降级获取播放地址，支持灰色歌曲解锁、歌名解析兜底与试听检测
- 发布正式版整包 [Release v1.1.0](https://github.com/xcqm12/qlm-music/releases/tag/v1.1.0)

### v1.1.0-integrated

- 同步星海 v3.2.15：新增**酷我本地直连**模块
- 新增星海后端聚合（含汽水音乐支持）
- 新增 X-Token/X-Client 签名认证
- CHKSZ 迁移至新接口 `api.chksz.com`（网易 + QQ），旧 `api.chksz.top` 已下线
- 星海切换双域名：`yy.zddyr.top`（主）/ `zrcdy.dpdns.org`（备）

### v1.0.0-integrated

- 整合星海 v3.2.6 与七零喵 v9.0.9
- 修复严格模式、URLSearchParams Polyfill、请求超时与非 JSON 响应解析问题
- 所有音源可用，顺序执行避免竞态

## 链接

- GitHub: https://github.com/xcqm12/qlm-music
- Releases: https://github.com/xcqm12/qlm-music/releases
- 网易云接口文档: https://api.qlm.org.cn/docs
- 星海: https://yy.zddyr.top/ (主) / https://zrcdy.dpdns.org/ (备)

## 免责声明

本软件仅供学习交流使用，严禁用于商业用途。使用本软件所产生的一切后果由使用者自行承担，开发者不承担任何法律责任。

## 许可证

本项目采用 GPL-3.0 许可证，详见 [LICENSE](./LICENSE) 文件。

---

© 2026 七零喵团队 & 星海
