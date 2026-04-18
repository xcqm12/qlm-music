七零喵聚合音源 · 超级整合版
https://img.shields.io/badge/version-7.0.3-blue.svg
https://img.shields.io/badge/license-MIT-green.svg
https://img.shields.io/badge/QQ%E7%BE%A4-1006981142-orange.svg

🎵 洛雪音乐助手最强聚合音源脚本，集成20+音源，智能缓存，多源回退，相似歌曲搜索

📖 简介
七零喵聚合音源是一个为洛雪音乐助手设计的超级整合音源脚本。它整合了多个优质音源API，提供稳定、快速、高质量的音乐搜索和播放服务。

✨ 特性
🔥 20+音源聚合 - 集成ikun、聚合API、qorg、网易云盘、星海、溯音、六音等

🚀 智能多源回退 - 主音源失败自动切换备用音源

💾 LRU智能缓存 - 减少重复请求，提升响应速度

🔍 相似歌曲搜索 - 找不到歌曲时自动搜索相似替代

🎯 高音质支持 - 支持128k~24bit/FLAC多种音质

🛡️ 稳定可靠 - 请求重试、超时控制、并发限制

📊 统计监控 - 实时统计请求成功率、缓存命中率

🔒 安全加密 - 支持MD5、SHA256、AES加密验证

📦 集成的音源
音源名称	优先级	说明
ikun	1	ikunshare音源
聚合API	2	juhe聚合音源
qorg	3	qorg官方音源
网易云盘	4	网易云音乐云盘
星海主	5	星海主API
星海备	6	星海备用API
溯音	7	溯音多平台音源
六音	8	六音音源
独家音源	9	洛雪科技独家音源
长青SVIP	10	长青SVIP音源
念心SVIP	11	念心SVIP音源
野花野草	12	野花野草音源
Meting	13	Meting备用API
汽水VIP	14	汽水VIP音源
肥猫	15	肥猫音源
肥猫不肥	16	肥猫不肥音源
梓澄公益	17	梓澄公益音源
梓澄qwq	18	梓澄qwq音源
梓澄公益2代	19	梓澄公益2代
無名	20	無名音源
小熊猫	21	小熊猫音源
Free listen	22	Free listen音源
🎵 支持的平台
平台代码	平台名称	支持音质
tx	QQ音乐	128k, 192k, 320k, flac, 24bit
wy	网易云音乐	128k, 192k, 320k, flac, 24bit
kw	酷我音乐	128k, 192k, 320k, flac, 24bit
kg	酷狗音乐	128k, 192k, 320k, flac, 24bit
mg	咪咕音乐	128k, 192k, 320k, flac, 24bit
qishui	汽水VIP	128k, 320k, flac, flac24bit
qorg	qorg音源	128k, 320k, flac, flac24bit
wycloud	网易云盘	128k, 192k, 320k, flac, flac24bit
🚀 快速开始
安装方法
下载脚本

从 Releases 下载最新版本

或直接下载 qlm-v7.0.3.js

导入洛雪音乐助手

打开洛雪音乐助手

进入「设置」→「音源设置」

点击「导入音源脚本」

选择下载的 qlm-v7.0.3.js 文件

启用音源

在音源列表中选择「七零喵聚合音源」

开始享受音乐！

网易云盘配置（可选）
如需使用网易云音乐云盘功能：

javascript
// 在脚本中设置Cookie（需要有效的网易云音乐登录Cookie）
lx.send('request', {
    source: 'wycloud',
    action: 'setCookie',
    info: { cookie: '你的网易云Cookie' }
});
📁 项目结构
text
qlm-music/
├── qlm-v7.0.3.js          # 主脚本文件
├── README.md              # 项目说明
├── LICENSE                # 开源协议
└── docs/                  # 文档目录
    ├── api.md             # API文档
    ├── changelog.md       # 更新日志
    └── examples.md        # 使用示例
🔧 配置说明
主要配置项
javascript
const CONFIG = {
    // 缓存配置
    CACHE_TTL_URL: 1800000,        // URL缓存时间(ms)
    CACHE_TTL_SEARCH: 300000,      // 搜索缓存时间(ms)
    CACHE_MAX_SIZE: 300,           // 最大缓存数量
    
    // 请求配置
    REQUEST_TIMEOUT: 12000,        // 请求超时时间(ms)
    DECRYPT_TIMEOUT: 18000,        // 解密超时时间(ms)
    CONCURRENT_LIMIT: 5,           // 并发请求限制
    MAX_RETRIES: 3,                // 最大重试次数
    RETRY_DELAY: 800,             // 重试延迟(ms)
    
    // 功能开关
    QORG_ENABLED: true,            // qorg API开关
    NETEASE_CLOUD_ENABLED: true,   // 网易云盘开关
    IKUN_UPDATE_ENABLE: true       // 自动更新开关
};
📊 性能优化
缓存策略
URL缓存: 30分钟有效期，避免重复请求

搜索缓存: 5分钟有效期，提升搜索体验

LRU淘汰: 自动清理最少使用的缓存项

请求优化
智能重试: 失败自动重试3次

并发控制: 最大5个并发请求

超时保护: 12秒请求超时保护

多源回退
按优先级依次尝试音源，确保高可用性：

优先使用高速音源（qorg、ikun等）

失败自动切换到备用音源

最终尝试相似歌曲搜索

🤝 贡献指南
欢迎提交 Issue 和 Pull Request！

贡献方式
Fork 本仓库

创建特性分支 (git checkout -b feature/AmazingFeature)

提交更改 (git commit -m 'Add some AmazingFeature')

推送到分支 (git push origin feature/AmazingFeature)

提交 Pull Request

开发规范
遵循 ES5/ES6 标准

添加必要的注释

更新相关文档

测试通过后提交

📝 更新日志
v7.0.3 (2026-04-19)
✨ 新增网易云音乐云盘搜索和播放功能

🔧 优化音源优先级排序

🐛 修复函数引用错误

📈 提升并发限制至5

v7.0.2 (2026-04-18)
✅ 启用qorg API

🔒 增强安全性（请求签名）

📢 添加开源公告和群号

🛡️ 添加防重复加载机制

v7.0.1 (2026-04-17)
🎉 初始版本发布

📦 集成20+音源

💾 实现智能缓存系统

查看完整更新日志

❓ 常见问题
Q: 音源无法使用怎么办？
A:

检查网络连接

尝试切换其他音源

查看控制台错误日志

更新到最新版本

Q: 如何提高播放成功率？
A:

脚本已内置多源回退机制

自动选择最优音质

智能搜索相似歌曲

Q: 网易云盘如何使用？
A:

获取网易云音乐网页版Cookie

通过脚本设置Cookie

选择wycloud音源搜索播放

Q: 如何报告问题？
A:

提交 Issue

加入QQ群: 1006981142

提供详细的错误信息和复现步骤

📞 联系我们
开源地址: https://github.com/xcqm12/qlm-music

QQ交流群: 1006981142

问题反馈: Issues

更新通知: Releases

📄 许可证
本项目基于 MIT 协议开源，详见 LICENSE 文件。

🙏 致谢
感谢以下项目和贡献者：

洛雪音乐助手 - 优秀的音乐播放器

ikunshare - ikun音源API

六音音源 - 六音音源

肥猫音源 - 肥猫音源

小熊猫音源 - 小熊猫音源

梓澄公益 - 梓澄公益音源

以及所有为开源音乐做出贡献的开发者们！

⭐ 如果这个项目对你有帮助，请给一个 Star！ ⭐
