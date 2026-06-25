# 七零喵 x 星海 聚合音源 · 整合版

[![版本](https://img.shields.io/badge/version-v1.0.0--integrated-blue.svg)](./qlm-v1.0.0-integrated.js)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)

> 整合七零喵(qorg/wyqlm/CHKSZ/肥猫/小熊猫等)和星海(GDAPI/签名认证/智能匹配)的 LX Music 音源脚本

## 简介

本项目是七零喵团队与星海合作的聚合音源整合版，基于 xinghai-music-source v3.2.6 和 qlm-v9.0.9 整合而成。提供多个音源聚合、智能匹配、试听检测、缓存管理等功能。

## 功能特性

- **签名认证** - 支持 GDAPI 签名认证机制
- **多音源聚合** - 20+ 音源智能聚合
- **智能匹配** - 歌曲信息智能匹配算法
- **试听检测** - 自动检测并过滤试听版歌曲
- **缓存管理** - LRU 缓存机制，提升响应速度
- **预加载** - 智能预加载机制
- **eapi/weapi 加密** - 网易云音乐加密支持
- **顺序执行** - 避免竞态条件，提升稳定性
- **自动更新** - 内置版本检查和更新提示

## 支持音源

| 分类 | 音源名称 |
|------|---------|
| **GD音乐台** | GD音乐台 |
| **非常刀** | 非常刀 |
| **肥猫系列** | 肥猫 |
| **小熊猫系列** | 小熊猫 |
| **梓澄系列** | 梓澄公益 |
| **無名系列** | 無名 |
| **六音系列** | 六音 |
| **星海系列** | 星海主 |
| **VIP音源** | 长青SVIP、念心SVIP、溯音、汽水VIP、网易云VIP |
| **其他** | ikun、野草、fish、qorg、wyqlm、网易云官方 |

## 使用方法

### 安装

1. 下载 `qlm-v1.0.0-integrated.js` 文件
2. 打开 LX Music 应用
3. 进入设置 -> 音源设置
4. 选择"自定义源"，导入下载的 JS 文件
5. 启用需要的音源

### 配置说明

脚本内置了智能配置，无需手动修改。如需自定义，可修改以下配置项：

```javascript
// 缓存配置
CACHE_MAX_SIZE: 200,        // URL 缓存最大条目
CACHE_TTL_URL: 3600000,     // URL 缓存有效期 (1小时)
CACHE_TTL_SEARCH: 1800000,  // 搜索缓存有效期 (30分钟)

// 超时配置
TIMEOUT: 15000,             // 请求超时时间 (15秒)
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
- **降级策略** - qorg 音源支持三级降级 (unencrypted → weapi → eapi)
- **防重复弹窗** - updateAlert 只调用一次的防重复机制

## 文件说明

```
.
├── qlm-v1.0.0-integrated.js    # 主音源脚本 (整合版)
├── README.md                    # 本文件
└── LICENSE                      # 许可证
```

## 更新日志

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
- 星海: https://zrcdy.dpdns.org/

## 免责声明

本软件仅供学习交流使用，严禁用于商业用途。使用本软件所产生的一切后果由使用者自行承担，开发者不承担任何法律责任。

## 许可证

本项目采用 GPL-3.0 许可证，详见 [LICENSE](./LICENSE) 文件。

---

© 2026 七零喵团队 & 星海
