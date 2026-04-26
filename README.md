七零喵聚合音源 · 超级整合版

https://img.shields.io/badge/version-7.0.9-blue.svg
https://img.shields.io/badge/LX%20Music-支持-green.svg

📖 简介

七零喵聚合音源是一个为洛雪音乐（LX Music）设计的超级整合版音源脚本，集成了 20 余种音源 API，提供多源回退、智能缓存、相似歌曲搜索等功能，确保音乐播放的稳定性和可用性。

✨ 主要特性

· 多音源聚合：整合 ikun、聚合 API、qorg、星海、溯音、六音、独家音源、长青 SVIP、念心 SVIP、野花野草、Meting、汽水 VIP、肥猫系列、梓澄系列、無名、小熊猫、Free listen 等音源
· 网易云盘支持：支持网易云音乐云盘歌曲的搜索、播放和歌词获取
· 自建网易云音源：集成独立的自建网易云音乐 API 支持，提供搜索、播放、歌单、登录等功能
· 智能回退：当一个音源失败时自动切换到下一个可用音源
· 智能缓存：LRU 缓存机制，减少重复请求，提升响应速度
· 相似歌曲搜索：当主链失败时自动搜索相似歌曲
· 多平台支持：支持 QQ 音乐、网易云音乐、酷我音乐、酷狗音乐、咪咕音乐、汽水 VIP、自建网易云等主流平台

---

📥 下载与安装

前置要求

· 洛雪音乐助手（桌面版）或 洛雪音乐移动版
· 洛雪音乐版本建议 v1.7.5 及以上

方式一：在线导入（推荐，自动更新）

1. 打开洛雪音乐助手
2. 进入「设置」→「基本设置」→「音乐来源」
3. 选择「自定义源」或「导入源」
4. 填入以下任一链接：

```bash
# GitHub 原始链接（国内可能需要代理）
https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.9-AI%20Optimized.js

# 备用链接（CDN）
https://cdn.jsdelivr.net/gh/xcqm12/qlm-music/qlm-v7.0.9-AI%20Optimized.js
```

方式二：本地文件导入

1. 下载本仓库的以下任一版本文件：
   · qlm-v7.0.9-AI Optimized.js（最新AI优化版，强烈推荐）
   · qlm-v7.0.8.js（⚠️ 已废弃，请勿使用）
   · qlm-v7.0.7.js（上一代稳定版）
2. 在洛雪音乐中选择「本地文件」方式导入
3. 浏览选择下载的 .js 文件即可

方式三：直接复制脚本内容

1. 打开对应版本的 .js 文件
2. 复制全部代码
3. 在洛雪音乐中选择「粘贴导入」或直接粘贴到自定义源输入框

版本选择

版本 说明 推荐场景
v7.0.9-AI Optimized **最新AI优化版**，安全增强，修复内存泄漏与多源回退逻辑 强烈推荐
v7.0.8 ⚠️ 已废弃！存在关键Bug，请勿使用。仅作为存档 仅供测试/存档
v7.0.7 上一代完整版，修复 updateAlert 重复调用问题 稳定备选

💡 建议始终使用最新版本，以获得最佳体验和最新的功能修复。

---

🔧 配置说明

网易云盘配置

如需使用网易云盘功能（wycloud 源），脚本会自动尝试获取 Cookie，若失败需手动配置：

获取 Cookie 步骤

1. 登录网页版网易云音乐（https://music.163.com）
2. 按 F12 打开浏览器开发者工具
3. 切换到「Network」（网络）标签
4. 刷新页面，找到任意请求
5. 在请求头中找到 Cookie 字段，复制完整内容

设置 Cookie

通过音源提供的 setCookie 操作接口传入 Cookie 字符串即可。

⚠️ 注意：Cookie 包含个人账号信息，请勿分享给他人。有效期通常为 24 小时，过期后需重新获取。

自建网易云音源配置

自建网易云音源（wycloudmusic 源）默认使用 https://api.qlm.org.cn 服务，开箱即用：

· 无需配置：直接使用搜索和播放功能。
· 登录功能：通过音源提供的 login 接口输入手机号和密码登录，可解锁个人歌单及推荐内容。

---

🎵 支持的平台

平台 标识 支持音质
QQ音乐 tx 128k ~ 24bit
网易云音乐 wy 128k ~ 24bit
酷我音乐 kw 128k ~ 24bit
酷狗音乐 kg 128k ~ 24bit
咪咕音乐 mg 128k ~ 24bit
汽水VIP qishui 128k ~ 24bit
qorg音源 qorg 128k ~ 24bit
网易云盘 wycloud 128k ~ 24bit
自建网易云 wycloudmusic 128k ~ flac

---

❓ 常见问题

<details>
<summary><b>Q1：部分歌曲无法播放？</b></summary>

本音源采用多源回退机制，会自动尝试所有可用音源。如果仍然失败，可能是所有音源均不支持该歌曲，建议尝试切换其他平台搜索。

</details>

<details>
<summary><b>Q2：网易云盘无法使用？</b></summary>

请检查：

· 是否正确配置了网易云音乐 Cookie
· Cookie 是否已过期（有效期约 24 小时）
· 网络是否正常

</details>

<details>
<summary><b>Q3：自建网易云音源有什么优势？</b></summary>

自建网易云音源提供独立的搜索、播放、歌词、歌单和登录功能，相比官方接口更稳定，且支持更高音质获取。默认无需配置即可使用搜索和播放。

</details>

<details>
<summary><b>Q4：播放卡顿或加载慢？</b></summary>

可尝试：

· 在设置中降低默认音质（如从 flac 降至 320k）
· 检查网络环境
· 切换其他音源平台

</details>

<details>
<summary><b>Q5：提示「所有音源均失败」？</b></summary>

可能原因：

· 网络问题或音源服务临时不可用（建议稍后重试）
· 歌曲版权限制（尝试其他平台）
· 洛雪音乐版本过旧（建议升级到 v1.7.5+）

</details>

<details>
<summary><b>Q6：导入后没有反应？</b></summary>

请检查：

· 洛雪音乐版本是否支持自定义音源
· 导入的链接或文件路径是否正确
· 尝试重启洛雪音乐

</details>

<details>
<summary><b>Q7：如何更新到最新版本？</b></summary>

· 在线导入方式：重启洛雪音乐时会自动检查更新。
· 本地文件方式：重新下载最新文件并重新导入。
· 推荐使用在线导入方式以获取自动更新。

</details>

---

📊 版本历史

版本 更新内容
v7.0.9-AI Optimized **最新版**，安全增强，修复内存泄漏，优化多源回退逻辑
v7.0.8 ⚠️ 已废弃！存在关键Bug
v7.0.7 修复 updateAlert 重复调用问题，优化稳定性
v7.0.6 完整整合版，新增自建网易云音源，优化缓存策略
v7.0.5 新增自建网易云音源，支持登录、歌单等功能
v7.0.4 优化网易云盘 Cookie 管理，提升稳定性
v7.0.3 新增网易云盘支持，修复部分音源问题
v7.0.2 修复优化版，优化音源请求逻辑，提升成功率，修复部分平台URL获取失败问题，新增公告系统，优化缓存策略
v7.0.1 完整整合版，修复 musicUrl 支持，集成 ikun、聚合API、星海、溯音、六音、独家音源、长青SVIP、念心SVIP、野花野草、Meting、汽水VIP、肥猫、梓澄、無名、小熊猫、Free listen 等音源

---

⚠️ 免责声明

1. 本脚本仅供学习交流使用，不得用于任何商业用途。
2. 本脚本聚合的第三方音源 API 均来自公开网络，脚本作者不对音源的合法性、稳定性及内容负责。
3. 使用本脚本获取的音乐资源版权归原权利人所有，请在下载后 24 小时内删除，或通过正规渠道购买正版。
4. 本脚本不存储、不缓存任何音乐文件，仅提供搜索和播放链接的代理功能。
5. 使用本脚本产生的任何法律风险由使用者自行承担，脚本作者及贡献者不承担任何责任。
6. 如涉及侵权，请联系脚本仓库维护者或通过 Issue 反馈，将及时处理。
7. 请支持正版音乐！

---

📞 交流反馈

渠道 信息
开源地址 GitHub - xcqm12/qlm-music
QQ 交流群 1006981142
问题反馈 GitHub Issues

提交 Issue 时请附上详细的错误描述、洛雪音乐版本和复现步骤。

---

🙏 致谢

本音源整合了以下优秀项目/服务的 API，特此致谢：

· ikun 音源
· 聚合 API (juhe)
· qorg API
· 星海 API
· 溯音 API
· 六音音源
· 独家音源（洛雪科技）
· 长青 SVIP / 念心 SVIP
· 汽水 VIP
· 肥猫 / 肥猫不肥
· 梓澄公益系列
· 無名音源
· 小熊猫音源
· Free listen
· 自建网易云音乐 API

---

📄 许可证

本项目仅供学习交流使用，请遵守相关法律法规。

请支持正版音乐！

---

📦 文件下载

文件名 版本 说明 下载
qlm-v7.0.9-AI Optimized.js v7.0.9 **最新AI优化版** [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.9-AI%20Optimized.js)
qlm-v7.0.8.js v7.0.8 ⚠️ 已废弃 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.8.js)
qlm-v7.0.7.js v7.0.7 上一代稳定版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.7.js)
qlm-v7.0.6.js v7.0.6 完整整合版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.6.js)
qlm-v7.0.5.js v7.0.5 尝鲜版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.5.js)
qlm-v7.0.4.js v7.0.4 云盘优化版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.4.js)
qlm-fix-v7.0.2.js v7.0.2 修复优化版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-fix-v7.0.2.js)
qlm-v7.0.1.js v7.0.1 稳定备选版 [下载](https://raw.githubusercontent.com/xcqm12/qlm-music/main/qlm-v7.0.1.js)
