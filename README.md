# 七零喵 x 星海 聚合音源 · 整合版

[![版本](https://img.shields.io/badge/version-v1.1.0--integrated-blue.svg)](./qlm-v1.1.0-integrated.js)
[![Release](https://img.shields.io/github/v/release/xcqm12/qlm-music.svg)](https://github.com/xcqm12/qlm-music/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)

> 整合七零喵(qorg/wyqlm/CHKSZ/肥猫/小熊猫等)和星海(本地直连/后端聚合/签名认证/智能匹配)的 LX Music 音源脚本

## 简介

本项目是七零喵团队与星海合作的聚合音源整合版，基于 xinghai-music-source v3.2.15 和 qlm-v9.0.9 整合而成。提供多个音源聚合、智能匹配、试听检测、缓存管理等功能。

除聚合整合版外，另提供独立的**网易云官方音源** `netease-official-source.js`（混淆发行版），直接调用 NeteaseCloudMusicApiEnhanced 接口获取网易云播放地址。

## 功能特性

- **酷我本地直连** - 全新酷我本地直连模块，无需第三方后端（无解密代理时音质封顶 flac）
- **星海后端聚合** - 星海后端聚合接口，支持网易/QQ/酷我/酷狗/咪咕/**汽水音乐**
- **X-Token/X-Client 认证** - 支持星海签名认证机制
- **多音源聚合** - 20+ 音源智能聚合，18 个按优先级排序的降级链处理器
- **智能匹配** - 歌曲信息智能匹配算法
- **试听检测** - 自动检测并过滤试听版歌曲
- **缓存管理** - LRU 缓存机制，提升响应速度
- **预加载** - 智能预加载机制
- **eapi/weapi 加密** - 网易云音乐加密支持
- **顺序执行** - 避免竞态条件，提升稳定性
- **自动更新** - 内置版本检查和更新提示
- **网易云官方独立音源** - `netease-official-source.js`，基于 api.qlm.org.cn 三级降级获取网易云播放地址（详见下方章节）

## 支持音源

按降级链优先级顺序执行，任一音源成功即停止：

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

上表为整合版 `qlm-v1.1.0-integrated.js` 的内部降级链；独立版 `netease-official-source.js` 只注册网易云（wy）一个源。

## 网易云官方独立音源

`netease-official-source.js` 是独立的网易云官方音源（混淆发行版），基于
[NeteaseCloudMusicApiEnhanced](https://api.qlm.org.cn/docs/#/?id=neteasecloudmusicapienhanced)
（`https://api.qlm.org.cn`）获取播放地址：

- **三级降级** - `/song/url/v1`（音质等级 level）→ `/song/url`（码率 br）→ `/song/url/match`（灰色歌曲解锁）
- **歌名兜底** - songId 缺失或失效时通过 `/cloudsearch` 重新解析歌曲 ID
- **试听检测** - 识别 `freeTrialInfo` / `freeTrialAudition` 试听片段
- **免 Cookie 可用** - 未配置 Cookie 时仍可获取免费音质；**文件不内置任何 Cookie**（公开仓库不存放个人登录态）
- **Cookie 配置** - 登录音质需自行提供网易云 Cookie（值含 `MUSIC_U=`），通过 storage 键
  `netease_official_cookie` 写入音源运行环境（详见文件头注释）；该配置依赖应用运行环境，
  未配置或未生效时自动按免费音质处理
- **音质映射** - 应用内音质选项为 LX Music 网易云源固定支持的 `128k / 320k / flac / flac24bit`，
  脚本内部已映射至接口 level/br 参数（标准 → 臻品母带全等级）
- **稳定请求** - 15s 超时，失败自动重试并追加时间戳参数绕过服务端缓存

> 注意：启用该独立源时仅网易云（wy）平台可用；需要全平台聚合请使用 `qlm-v1.1.0-integrated.js`。
> 两个文件可在"自定义源"列表中分别导入并切换，同一时间仅一个音源生效。

## 使用方法

### 安装

1. 下载 `qlm-v1.1.0-integrated.js` 文件，或从
   [Releases](https://github.com/xcqm12/qlm-music/releases) 下载整包
   `qlm-music-all-v1.1.0.zip`（全部音源文件）
2. 打开 LX Music 应用
3. 进入设置 -> 音源设置 -> 自定义源
4. 导入下载的 JS 文件并启用
5. 可导入多个自定义源（如整合版与网易云官方独立版）并切换，同一时间仅一个生效

### 配置说明

脚本内置了智能配置，无需手动修改。如需自定义，可修改以下配置项：

```javascript
// 缓存配置
CACHE_MAX_SIZE: 200,        // URL 缓存最大条目
CACHE_TTL_URL: 3600000,     // URL 缓存有效期 (1小时)
CACHE_TTL_SEARCH: 1800000,  // 搜索缓存有效期 (30分钟)

// 超时配置
TIMEOUT: 15000,             // 请求超时时间 (15秒)

// CHKSZ 配置（api.chksz.com 新接口需要 apikey，为空时该源自动跳过）
CHKSZ_CONFIG: { apikey: '' },

// 酷我本地直连
KW_LOCAL_CONFIG: { enabled: true },
KW_DECRYPT_PROXY: { allowEncryptedLossless: false }, // 无解密代理时音质封顶 flac
```

## 技术特点

### 兼容性处理

- **严格模式兼容** - 使用 `globalThis` 兼容严格模式
- **Polyfill 支持** - 内置 `Object.fromEntries`、`Array.prototype.includes`、`Promise.any`、`URLSearchParams` Polyfill
- **多环境适配** - 支持 LX Music 移动端和桌面端

### 加密支持

- **AES 加密** - 支持 128/192/256 位 AES 加解密
- **RSA 加密** - 支持 RSA 加解密
- **NeteaseCrypto** - 网易云音乐专用加密模块 (weapi/eapi)

### 稳定性优化

- **错误处理** - 完善的 try-catch 错误处理
- **超时控制** - 所有网络请求都有超时控制
- **顺序降级链** - 18 个处理器按优先级顺序执行，避免竞态
- **防重复弹窗** - updateAlert 只调用一次的防重复机制

## 文件说明

```
.
├── qlm-v1.1.0-integrated.js      # 主音源脚本（整合版，推荐）
├── netease-official-source.js    # 网易云官方独立音源（混淆版，不内置 Cookie）
├── qlm-v1.0.0-integrated.js      # 上一整合版本
├── qlm-v7.x / v9.0.0 系列        # 七零喵历史版本存档
├── qlm-fix-*.js / *ultimate*     # 历史修复版存档
├── README.md                     # 本文件
├── LICENSE                       # 许可证
└── .github/FUNDING.yml           # 赞助配置
```

## 更新日志

### netease-official-source.js v1.0.0（2026-10-15）

- 新增网易云官方独立音源（混淆发行版），基于 NeteaseCloudMusicApiEnhanced（api.qlm.org.cn）
- 三级降级获取播放地址，支持灰色歌曲解锁、歌名解析兜底与试听检测
- 不内置 Cookie（公开仓库不存放登录态），免费音质开箱即用，登录音质可通过 storage 键配置
- 发布正式版整包 [Release v1.1.0](https://github.com/xcqm12/qlm-music/releases/tag/v1.1.0)

### v1.1.0-integrated

- 同步星海 v3.2.15：新增**酷我本地直连**模块
- 新增星海后端聚合（`getUrlFromXinghaiBackend`，含汽水音乐支持）
- 新增 X-Token/X-Client 签名认证
- CHKSZ 迁移至新接口 `api.chksz.com`（网易 + QQ），旧 `api.chksz.top` 已下线；需配置 `apikey`，为空时自动跳过
- 星海切换双域名：`yy.zddyr.top`（主）/ `zrcdy.dpdns.org`（备）
- 新增 versionh2 状态接口、新版音质映射（空间音频/Spatial）

### v1.0.0-integrated

- 整合星海 v3.2.6 与七零喵 v9.0.9
- 修复严格模式下的全局对象获取问题
- 修复 URLSearchParams Polyfill
- 修复请求超时问题 (5000ms → 15000ms)
- 修复非 JSON 响应解析问题
- 修复 updateAlert 重复调用问题
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
