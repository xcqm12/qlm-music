# 七零喵聚合音源 · 超级整合版

> 洛雪音乐助手(LX Music) 多功能聚合音源脚本

[![Version](https://img.shields.io/badge/version-7.0.3-blue.svg)](https://github.com/xcqm12/qlm-music)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![QQ Group](https://img.shields.io/badge/QQ群-1006981142-orange.svg)](https://jq.qq.com/?_wv=1027&k=xxxxx)

## 📖 简介

七零喵聚合音源是一款为洛雪音乐助手(LX Music)设计的超级整合版音源脚本，集成了20+个音源接口，支持多源回退、智能缓存、相似歌曲搜索等功能，为用户提供稳定、快速、高质量的音乐播放体验。

## ✨ 特性

- 🎵 **多音源整合** - 集成ikun、聚合API、qorg、网易云盘、星海、溯音、六音等20+音源
- 🔄 **智能回退** - 主音源失败时自动切换到备用音源
- 💾 **智能缓存** - LRU缓存机制，减少重复请求
- 🔍 **相似歌曲搜索** - 歌曲失效时自动搜索替代版本
- 🚀 **高性能** - 并发请求池、请求重试、超时控制
- 🛡️ **安全稳定** - 请求签名、URL验证、防重复加载
- ☁️ **网易云盘支持** - 支持搜索和播放网易云音乐云盘歌曲

## 📦 集成的音源

| 音源名称 | 说明 | 状态 |
|---------|------|------|
| ikun | ikun分享音源 | ✅ |
| 聚合API | juhe聚合音源 | ✅ |
| qorg | qorg音源 | ✅ |
| 网易云盘 | 网易云音乐云盘 | ✅ |
| 星海主/备 | 星海音源 | ✅ |
| 溯音 | 溯音API | ✅ |
| 六音 | 六音音源 | ✅ |
| 独家音源 | 洛雪科技独家 | ✅ |
| 长青SVIP | 长青SVIP音源 | ✅ |
| 念心SVIP | 念心SVIP音源 | ✅ |
| 野花野草 | 野花野草音源 | ✅ |
| Meting | Meting备用API | ✅ |
| 汽水VIP | 汽水VIP音源 | ✅ |
| 肥猫/肥猫不肥 | 肥猫音源 | ✅ |
| 梓澄公益系列 | 梓澄公益音源 | ✅ |
| 無名 | 無名音源 | ✅ |
| 小熊猫 | 小熊猫音源 | ✅ |
| Free listen | Free listen音源 | ✅ |

## 🎯 支持的平台

- QQ音乐 (tx)
- 网易云音乐 (wy)
- 酷我音乐 (kw)
- 酷狗音乐 (kg)
- 咪咕音乐 (mg)
- 汽水VIP (qishui)
- qorg音源 (qorg)
- 网易云盘 (wycloud)

## 📥 安装使用

### 方法一：直接导入

1. 下载 `qlm-v7.0.3.js` 文件
2. 打开洛雪音乐助手
3. 进入「设置」→「音源设置」
4. 点击「导入音源」，选择下载的JS文件
5. 在音源列表中选择「七零喵聚合音源」

### 方法二：URL导入

```
https://cdn.jsdelivr.net/gh/xcqm12/qlm-music@main/qlm-v7.0.3.js
```

## 🔧 网易云盘配置

使用网易云盘功能需要设置有效的网易云音乐Cookie：

1. 在浏览器中登录 [网易云音乐网页版](https://music.163.com/)
2. 打开开发者工具(F12) → 网络(Network)标签
3. 刷新页面，找到任意请求
4. 复制请求头中的 `Cookie` 值
5. 在音源中使用 `setCookie` 操作设置Cookie

## 📊 音质支持

| 平台 | 128k | 192k | 320k | FLAC | 24bit |
|-----|------|------|------|------|-------|
| QQ音乐 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 网易云音乐 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 酷我音乐 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 酷狗音乐 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 咪咕音乐 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 网易云盘 | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🔄 版本历史

### v7.0.3 (2026-04-19)
- 新增网易云音乐云盘搜索和播放功能
- 支持云盘歌词获取
- 优化音源优先级排序

### v7.0.2 (2026-04-18)
- 修复函数引用错误
- 增强防冲突机制
- 提高并发限制到5

### v7.0.1 (2026-04-17)
- 启用qorg API
- 添加开源地址和群号公告
- 增强稳定性和安全性

### v7.0.0 (2026-04-16)
- 初始版本
- 整合20+音源
- 实现智能缓存和回退机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

- **开源地址**: [https://github.com/xcqm12/qlm-music](https://github.com/xcqm12/qlm-music)
- **QQ交流群**: 1006981142

## ⚠️ 免责声明

1. 本项目仅供学习交流使用，请勿用于商业用途
2. 使用本脚本产生的任何版权问题由使用者自行承担
3. 请支持正版音乐，本脚本仅提供技术研究
4. 如有侵权请联系删除

## 📄 许可证

MIT License

Copyright (c) 2026 七零喵

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
