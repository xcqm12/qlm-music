/**
 * @name 七零喵聚合音源 · 超级整合版（完整版）+ 自建网易云
 * @description 此版本(v7.0.8)因存在关键Bug已被废弃，请使用 v7.0.9-AI Optimized 或更高版本。
 * @version 7.0.8 (DEPRECATED)
 * @author 整合优化版 + 六音 + 洛雪科技(独家音源) + 肥猫 + 小熊猫 + 梓澄 + qorg + 自建网易云
 * @homepage https://github.com/xcqm12/qlm-music
 * @qqgroup 1006981142
 * 
 * ⚠️ 废弃公告：
 * 该版本因修复 updateAlert 事件重复调用时引入了新的稳定性问题，
 * 且在某些环境下请求池逻辑导致内存泄漏，现已被 v7.0.9-AI Optimized 取代。
 * 
 * 请勿继续使用此版本。
 * 请前往 https://github.com/xcqm12/qlm-music 下载最新版。
 */
(function() {
    "use strict";
    // 此版本已完全废弃，不包含任何功能逻辑，仅作为存档和升级提醒。
    console.error('[七零喵音源 v7.0.8] 此版本已废弃！请升级到 v7.0.9-AI Optimized 或更高版本。');
    console.log('下载地址: https://github.com/xcqm12/qlm-music');
    
    // 提供基本的初始对象以防止崩溃（但不提供音乐服务）
    const globalObj = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : global);
    let lx = globalObj.lx || globalObj.LX || globalObj.lxMusic || globalObj.$lx || {};
    
    if (lx.on) {
        lx.on('inited', () => {
            lx.send('updateAlert', {
                log: '您正在使用已废弃的 v7.0.8 版本！\n该版本存在严重Bug，请立即升级到最新版。\n下载地址: https://github.com/xcqm12/qlm-music\n交流群: 1006981142',
                updateUrl: 'https://github.com/xcqm12/qlm-music'
            });
        });
    }
})();
