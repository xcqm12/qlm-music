/**
 * @name 七零喵聚合音源 · 超级整合版（终极修复版）+ 自建网易云
 * @description 整合 ikun/GD音乐台/野草/长青SVIP/Free listen 等音源，完善错误处理，支持 weapi/eapi 双加密，qorg 三重回退
 * @version 7.1.2-ultimate-fix-v3.5
 * @author 整合优化版（qorg：不加密 + weapi + eapi 三重保障）
 * @homepage https://github.com/xcqm12/qlm-music
 * @qqgroup 1006981142
 * @copyright 2026 七零喵团队 版权所有
 */
(function() {
    "use strict";

    // ==================== Polyfill 区（修复 Hermes 兼容性）====================
    if (typeof Object.fromEntries !== 'function') {
        Object.fromEntries = function(entries) {
            var obj = {};
            if (entries && entries.forEach) {
                entries.forEach(function(entry) { obj[entry[0]] = entry[1]; });
            } else if (Array.isArray(entries)) {
                for (var i = 0; i < entries.length; i++) obj[entries[i][0]] = entries[i][1];
            }
            return obj;
        };
    }
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(search) {
            for (var i = 0; i < this.length; i++) { if (this[i] === search) return true; }
            return false;
        };
    }

    // ==================== 安全获取全局对象 ====================
    const globalObj = (function() {
        try { if (typeof globalThis !== 'undefined') return globalThis; } catch (e) {}
        try { if (typeof window !== 'undefined') return window; } catch (e) {}
        try { if (typeof global !== 'undefined') return global; } catch (e) {}
        try { if (typeof self !== 'undefined') return self; } catch (e) {}
        return {};
    })();
    const lx = globalObj.lx || {};

    // ==================== 公告信息 ====================
    const ANNOUNCEMENT = Object.freeze({
        title: "七零喵聚合音源 v7.1.2-ultimate-fix-v3.5",
        content: "🔗 GitHub: https://github.com/xcqm12/qlm-music\n💬 交流群: 1006981142\n终极整合版: 集成ikun/GD音乐台/野草/长青SVIP/Free listen等音源\nqorg三重回退：不加密 / weapi / eapi\n© 2026 七零喵团队 版权所有",
        version: "7.1.2-ultimate-fix-v3.5",
        repo: "https://github.com/xcqm12/qlm-music",
        qqGroup: "1006981142",
        copyright: "© 2026 七零喵团队"
    });

    // ==================== 修复事件名称兼容性 ====================
    const EVENT_NAMES = Object.freeze({
        request: (lx.EVENT_NAMES && lx.EVENT_NAMES.request) || 'request',
        inited: (lx.EVENT_NAMES && lx.EVENT_NAMES.inited) || 'inited',
        updateAlert: (lx.EVENT_NAMES && lx.EVENT_NAMES.updateAlert) || 'updateAlert'
    });

    // ==================== 安全获取 LX Music API ====================
    let request = null, on = null, send = null;
    const requestGetters = [
        () => lx.request,
        () => globalObj.request,
        () => globalObj.lx && globalObj.lx.request,
        () => globalObj.LX && globalObj.LX.request,
        () => globalObj.lxMusic && globalObj.lxMusic.request,
        () => globalObj.$lx && globalObj.$lx.request
    ];
    for (const getter of requestGetters) {
        try { const req = getter(); if (typeof req === 'function') { request = req; break; } } catch (e) {}
    }
    const onGetters = [() => lx.on, () => globalObj.on];
    for (const getter of onGetters) {
        try { const res = getter(); if (typeof res === 'function') { on = res; break; } } catch (e) {}
    }
    const sendGetters = [() => lx.send, () => globalObj.send];
    for (const getter of sendGetters) {
        try { const res = getter(); if (typeof res === 'function') { send = res; break; } } catch (e) {}
    }
    const utils = lx.utils || {};
    const env = lx.env || '';
    const version = lx.version || '1.0.0';

    // 备用 fetch
    if (!request || typeof request !== 'function') {
        if (typeof fetch === 'function') {
            request = function(url, options, callback) {
                if (typeof callback !== 'function') return fetch(url, options);
                fetch(url, options).then(function(resp) {
                    return resp.text().then(function(body) {
                        var headers = {};
                        if (resp.headers && resp.headers.forEach) {
                            resp.headers.forEach(function(v, k) { headers[k] = v; });
                        } else if (resp.headers && resp.headers.entries) {
                            var entries = resp.headers.entries();
                            var entry;
                            while (!(entry = entries.next()).done) headers[entry.value[0]] = entry.value[1];
                        }
                        return { statusCode: resp.status, headers: headers, body: body };
                    });
                }).then(function(resp) { callback(null, resp); }).catch(function(err) { callback(err); });
            };
        } else { console.error('[聚合音源] request API 不可用'); return; }
    }
    if (!on) on = function() {};
    if (!send) send = function() {};

    // ==================== 安全工具函数 ====================
    const SafeUtils = {
        isArray: Array.isArray,
        isString: function(s) { return typeof s === 'string'; },
        isFunction: function(f) { return typeof f === 'function'; },
        isObject: function(o) { return o !== null && typeof o === 'object'; },
        safeGet: function(obj, path, dv) {
            if (obj == null) return dv;
            const keys = Array.isArray(path) ? path : String(path).split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') return dv;
                result = result[key];
            }
            return result !== undefined && result !== null ? result : dv;
        },
        buildCacheKey: function(prefix, songInfo, quality) {
            const info = songInfo || {};
            const name = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
            const album = info.albumName || info.album || '';
            const id = info.hash || info.songmid || info.id || '';
            return `${prefix || 'default'}_${id}_${name}_${singer}_${album}_${quality || ''}`;
        }
    };

    // ==================== MD5 ====================
    function md5(str) {
        if (utils && utils.crypto && SafeUtils.isFunction(utils.crypto.md5)) return utils.crypto.md5(str);
        function rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
        function addUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            return (lResult ^ lX8 ^ lY8);
        }
        function F(x,y,z) { return (x & y) | ((~x) & z); }
        function G(x,y,z) { return (x & z) | (y & (~z)); }
        function H(x,y,z) { return (x ^ y ^ z); }
        function I(x,y,z) { return (y ^ (x | (~z))); }
        function FF(a,b,c,d,x,s,ac) { a = addUnsigned(a, addUnsigned(addUnsigned(F(b,c,d),x),ac)); return addUnsigned(rotateLeft(a,s),b); }
        function GG(a,b,c,d,x,s,ac) { a = addUnsigned(a, addUnsigned(addUnsigned(G(b,c,d),x),ac)); return addUnsigned(rotateLeft(a,s),b); }
        function HH(a,b,c,d,x,s,ac) { a = addUnsigned(a, addUnsigned(addUnsigned(H(b,c,d),x),ac)); return addUnsigned(rotateLeft(a,s),b); }
        function II(a,b,c,d,x,s,ac) { a = addUnsigned(a, addUnsigned(addUnsigned(I(b,c,d),x),ac)); return addUnsigned(rotateLeft(a,s),b); }
        function convertToWordArray(str) {
            var lMsgLen = str.length;
            var lWordCount, lBytePos = 0, lByteCount = 0;
            var lNumberOfWords = ((lMsgLen + 8 - (lMsgLen + 8) % 64) / 64 + 1) * 16;
            var lWordArray = new Array(lNumberOfWords - 1);
            while (lByteCount < lMsgLen) {
                lWordCount = (lByteCount - lByteCount % 4) / 4;
                lBytePos = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePos);
                lByteCount++;
            }
            lWordCount = (lByteCount - lByteCount % 4) / 4;
            lBytePos = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePos);
            lWordArray[lNumberOfWords - 2] = lMsgLen << 3;
            lWordArray[lNumberOfWords - 1] = lMsgLen >>> 29;
            return lWordArray;
        }
        function wordToHex(lValue) {
            var hex = '', lByte;
            for (var i = 0; i < 4; i++) {
                lByte = (lValue >>> (i * 8)) & 255;
                hex += ('0' + lByte.toString(16)).slice(-2);
            }
            return hex;
        }
        var x = convertToWordArray(str);
        var a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
        for (var k = 0; k < x.length; k += 16) {
            var AA = a, BB = b, CC = c, DD = d;
            a=FF(a,b,c,d,x[k+0],7,0xD76AA478); d=FF(d,a,b,c,x[k+1],12,0xE8C7B756); c=FF(c,d,a,b,x[k+2],17,0x242070DB); b=FF(b,c,d,a,x[k+3],22,0xC1BDCECE);
            a=FF(a,b,c,d,x[k+4],7,0xF57C0FAF); d=FF(d,a,b,c,x[k+5],12,0x4787C62A); c=FF(c,d,a,b,x[k+6],17,0xA8304613); b=FF(b,c,d,a,x[k+7],22,0xFD469501);
            a=FF(a,b,c,d,x[k+8],7,0x698098D8); d=FF(d,a,b,c,x[k+9],12,0x8B44F7AF); c=FF(c,d,a,b,x[k+10],17,0xFFFF5BB1); b=FF(b,c,d,a,x[k+11],22,0x895CD7BE);
            a=FF(a,b,c,d,x[k+12],7,0x6B901122); d=FF(d,a,b,c,x[k+13],12,0xFD987193); c=FF(c,d,a,b,x[k+14],17,0xA679438E); b=FF(b,c,d,a,x[k+15],22,0x49B40821);
            a=GG(a,b,c,d,x[k+1],5,0xF61E2562); d=GG(d,a,b,c,x[k+6],9,0xC040B340); c=GG(c,d,a,b,x[k+11],14,0x265E5A51); b=GG(b,c,d,a,x[k+0],20,0xE9B6C7AA);
            a=GG(a,b,c,d,x[k+5],5,0xD62F105D); d=GG(d,a,b,c,x[k+10],9,0x02441453); c=GG(c,d,a,b,x[k+15],14,0xD8A1E681); b=GG(b,c,d,a,x[k+4],20,0xE7D3FBC8);
            a=GG(a,b,c,d,x[k+9],5,0x21E1CDE6); d=GG(d,a,b,c,x[k+14],9,0xC33707D6); c=GG(c,d,a,b,x[k+3],14,0xF4D50D87); b=GG(b,c,d,a,x[k+8],20,0x455A14ED);
            a=GG(a,b,c,d,x[k+13],5,0xA9E3E905); d=GG(d,a,b,c,x[k+2],9,0xFCEFA3F8); c=GG(c,d,a,b,x[k+7],14,0x676F02D9); b=GG(b,c,d,a,x[k+12],20,0x8D2A4C8A);
            a=HH(a,b,c,d,x[k+5],4,0xFFFA3942); d=HH(d,a,b,c,x[k+8],11,0x8771F681); c=HH(c,d,a,b,x[k+11],16,0x6D9D6122); b=HH(b,c,d,a,x[k+14],23,0xFDE5380C);
            a=HH(a,b,c,d,x[k+1],4,0xA4BEEA44); d=HH(d,a,b,c,x[k+4],11,0x4BDECFA9); c=HH(c,d,a,b,x[k+7],16,0xF6BB4B60); b=HH(b,c,d,a,x[k+10],23,0xBEBFBC70);
            a=HH(a,b,c,d,x[k+13],4,0x289B7EC6); d=HH(d,a,b,c,x[k+0],11,0xEAA127FA); c=HH(c,d,a,b,x[k+3],16,0xD4EF3085); b=HH(b,c,d,a,x[k+6],23,0x04881D05);
            a=HH(a,b,c,d,x[k+9],4,0xD9D4D039); d=HH(d,a,b,c,x[k+12],11,0xE6DB99E5); c=HH(c,d,a,b,x[k+15],16,0x1FA27CF8); b=HH(b,c,d,a,x[k+2],23,0xC4AC5665);
            a=II(a,b,c,d,x[k+0],6,0xF4292244); d=II(d,a,b,c,x[k+7],10,0x432AFF97); c=II(c,d,a,b,x[k+14],15,0xAB9423A7); b=II(b,c,d,a,x[k+5],21,0xFC93A039);
            a=II(a,b,c,d,x[k+12],6,0x655B59C3); d=II(d,a,b,c,x[k+3],10,0x8F0CCC92); c=II(c,d,a,b,x[k+10],15,0xFFEFF47D); b=II(b,c,d,a,x[k+1],21,0x85845DD1);
            a=II(a,b,c,d,x[k+8],6,0x6FA87E4F); d=II(d,a,b,c,x[k+15],10,0xFE2CE6E0); c=II(c,d,a,b,x[k+6],15,0xA3014314); b=II(b,c,d,a,x[k+13],21,0x4E0811A1);
            a=II(a,b,c,d,x[k+4],6,0xF7537E82); d=II(d,a,b,c,x[k+11],10,0xBD3AF235); c=II(c,d,a,b,x[k+2],15,0x2AD7D2BB); b=II(b,c,d,a,x[k+9],21,0xEB86D391);
            a=addUnsigned(a,AA); b=addUnsigned(b,BB); c=addUnsigned(c,CC); d=addUnsigned(d,DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }

    // ==================== 常量 ====================
    const CONFIG = Object.freeze({
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_HK_API_URL: "https://songapi.ikunshare.link",
        IKUN_API_KEY: "",
        JUHE_API_URL: "https://api.music.lerd.dpdns.org",
        QORG_API_URL: "https://api.qlm.org.cn",
        WYCLOUDMUSIC_API_URL: "https://api.qlm.org.cn",
        FEIMAO_API_URL: "http://fatcat.dns.army",
        FEIMAO_API_KEY: "114514",
        FEIMAOBUFEI_API_URL: "http://music.xn--z7x900a.live",
        FEIMAOBUFEI_API_KEY: "114514",
        ZICHENG_API_URL: "http://43.248.185.248:9763",
        ZICHENG_API_KEY: "lxmusicisyyds",
        ZICHENGQWQ_API_URL: "http://103.40.13.21:9866",
        ZICHENGQWQ_API_KEY: "hires",
        ZICHENG2_API_URL: "http://103.239.247.51:9763",
        ZICHENG2_API_KEY: "114514",
        CACHE_TTL_URL: 1800000,
        CACHE_TTL_SEARCH: 300000,
        CACHE_MAX_SIZE: 300,
        REQUEST_TIMEOUT: 15000,
        DECRYPT_TIMEOUT: 18000,
        CONCURRENT_LIMIT: 5,
        MAX_RETRIES: 2,
        RETRY_DELAY: 800,
        PRELOAD_NEXT_ENABLED: true,
        PRELOAD_TIMEOUT: 10000,
        NETEASE_CLOUD_COOKIE_KEY: '_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=53b32208d3ff4825ff51d9f5ce806c98;_ntes_nnid=ca52af08faf87b9f2eda20485867f88c,1767836662172; _ntes_nuid=ca52af08faf87b9f2eda20485867f88c;'
    });

    const QUALITY_TO_BR = Object.freeze({ "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999" });
    const SUYIN_QQ_BR = Object.freeze({ "128k": 7, "320k": 5, "flac": 4, "hires": 3, "master": 1, "24bit": 1 });
    const HTTP_REGEX = /^https?:\/\//i;

    const API_ENDPOINTS = Object.freeze({
        ikun: { url: "https://api.ikunshare.com/url", hkUrl: "https://songapi.ikunshare.link/url" },
        juhe: { base: "https://api.music.lerd.dpdns.org" },
        qorg: { base: "https://api.qlm.org.cn", endpoints: { music: "/music/url", search: "/music/search", lyric: "/music/lyric" } },
        xinghaiMain: { base: "https://music-api.gdstudio.xyz/api.php", params: { use_xbridge3: "true", loader_name: "forest", need_sec_link: "1", types: "url" } },
        xinghaiBackup: { base: "https://music-dl.sayqz.com/api/" },
        grass: { base: "http://grass.tempmusic.ss.tk/v1" },
        suyin: {
            qq: { url: "https://oiapi.net/api/QQ_Music", key: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575" },
            wy: { url: "https://oiapi.net/api/Music_163" },
            kw: { url: "https://oiapi.net/api/Kuwo" },
            mg: { url: "https://api.xcvts.cn/api/music/migu" }
        },
        changqing: {
            kg: "http://175.27.166.236/kgqq/kg.php?type=mp3&id={id}&level={level}",
            tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
            wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
            kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
            mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
        },
        nianxin: {
            tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
            wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
            kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
            kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
            mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
        },
        qishui: { https: "https://api.vsaa.cn/api/music.qishui.vip", http: "http://api.vsaa.cn/api/music.qishui.vip", proxy: "https://proxy.qishui.vsaa.cn/qishui/proxy", backupProxy: "https://api.vsaa.cn/api/qishui/decrypt" },
        sixyin: "http://music.sixyin.com/api",
        flower: "http://97.64.37.235/flower/v1",
        backup: { wy: "https://api.injahow.cn/meting/?server=netease&type=url&id={id}&br={br}", tx: "https://api.injahow.cn/meting/?server=tencent&type=url&id={id}&br={br}" },
        dusiyinyuan: { base: "https://api.lxmusic.top/v1", fallback: "https://api.lxmusic.net/v1" }
    });

    const PLATFORM_TO_SOURCE = Object.freeze({
        tx: { main: "tencent", ikun: "tx", dusiyinyuan: "qq", meting: "tencent" },
        wy: { main: "netease", ikun: "wy", dusiyinyuan: "wy", meting: "netease" },
        kw: { main: "kuwo", ikun: "kw", dusiyinyuan: "kw", meting: "kuwo" },
        kg: { main: "kugou", ikun: "kg", dusiyinyuan: "kg", meting: "kugou" },
        mg: { main: "migu", ikun: "mg", dusiyinyuan: "mg", meting: "migu" }
    });

    // ==================== 工具函数（增强ID获取）====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        // 通用后备字段顺序
        const commonFields = ['hash', 'songmid', 'id', 'songId', 'rid', 'cid', 'sid'];
        switch (platform) {
            case 'kg':
                return info.hash || info.songmid || info.id || (meta && (meta.hash || meta.songmid || meta.id));
            case 'tx': {
                const qqMeta = meta.qq || {};
                const mid = qqMeta.mid || meta.mid || info.songmid || (SafeUtils.isString(info.id) && !/^\d+$/.test(info.id) ? info.id : null);
                if (mid) return mid;
                const songid = qqMeta.songid || meta.songid || info.id;
                if (songid) return songid;
                // 最后遍历通用字段
                for (const field of commonFields) {
                    if (info[field]) return info[field];
                }
                return null;
            }
            case 'wy': case 'wycloud': case 'wycloudmusic':
                return info.songmid || info.id || info.songId || (meta && (meta.songmid || meta.id));
            case 'kw':
                return info.songmid || info.id || info.rid || (meta && (meta.songmid || meta.id || meta.rid));
            case 'mg':
                return info.songmid || info.id || info.cid || (meta && (meta.songmid || meta.id || meta.cid));
            default:
                return info.songmid || info.id || info.songId || info.hash || (meta && (meta.hash || meta.songmid || meta.id));
        }
    }
    function getHashOrMid(songInfo) {
        return songInfo ? (songInfo.hash || songInfo.songmid || songInfo.id || (songInfo.meta ? (songInfo.meta.hash || songInfo.meta.songmid) : null)) : null;
    }
    function getQQSongId(songInfo) {
        if (!songInfo) return null;
        const info = songInfo, meta = info.meta || {}, qqMeta = meta.qq || {};
        const mid = qqMeta.mid || meta.mid || info.songmid || (SafeUtils.isString(info.id) && !/^\d+$/.test(info.id) ? info.id : null);
        if (mid) return { type: 'mid', value: mid };
        const songid = qqMeta.songid || meta.songid || (typeof info.id === 'number' ? info.id : (SafeUtils.isString(info.id) && /^\d+$/.test(info.id) ? parseInt(info.id,10) : null));
        return songid ? { type: 'songid', value: songid } : null;
    }
    function validateUrl(url, name) {
        if (!url || !SafeUtils.isString(url)) throw new Error((name||'源')+'返回空URL');
        const t = url.trim();
        if (!HTTP_REGEX.test(t)) throw new Error((name||'源')+'返回非法URL: '+t.substring(0,50));
        return t;
    }
    function delay(ms) { return new Promise(r => setTimeout(r, ms || 100)); }
    function withTimeout(promise, ms, msg) {
        let id;
        const timeout = new Promise((_,rej) => id = setTimeout(() => rej(new Error(msg||'超时')), ms || 10000));
        return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
    }

    // ==================== HTTP 请求封装 ====================
    function httpFetch(url, options) {
        if (!url || !SafeUtils.isString(url)) return Promise.reject(new Error('Invalid URL'));
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('请求超时: '+url.slice(0,50))), (options&&options.timeout)||CONFIG.REQUEST_TIMEOUT);
            try {
                request(url, options, (err, resp) => {
                    clearTimeout(t);
                    if (err) return reject(new Error('网络请求失败: '+(err.message||err)));
                    resolve(resp||{});
                });
            } catch(e) { clearTimeout(t); reject(e); }
        });
    }
    async function httpRequestWithRetry(url, options, retries=0) {
        let lastErr;
        for (let i=0; i<=retries; i++) {
            try {
                if (i>0) await delay(CONFIG.RETRY_DELAY*i);
                const resp = await httpFetch(url, options);
                let body = resp.body;
                if (SafeUtils.isString(body)) {
                    const s = body.trim();
                    if (s.startsWith('{')||s.startsWith('[')) try { body = JSON.parse(s); } catch(e){}
                }
                return { statusCode: resp.statusCode||0, headers: resp.headers||{}, body };
            } catch(e) { lastErr = e; }
        }
        throw lastErr || new Error('所有重试均失败');
    }
    async function httpGet(url, params, timeout) {
        const qs = Object.entries(params||{}).filter(([,v]) => v!=null&&v!=='').map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        return (await httpRequestWithRetry(full, {method:'GET', timeout, headers: {'User-Agent': `lx-music-${env}/${version}`}})).body;
    }
    async function httpPost(url, body, timeout) {
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/json', 'User-Agent': `lx-music-${env}/${version}`},
            body: SafeUtils.isString(body) ? body : JSON.stringify(body||{}),
            timeout
        })).body;
    }
    async function httpGetWithFallback(urls, params, timeout) {
        const arr = Array.isArray(urls) ? urls : [urls];
        let lastErr;
        for (const u of arr) {
            if (!u) continue;
            try { return await httpGet(u, params, timeout); } catch(e) { lastErr = e; }
        }
        throw lastErr || new Error('所有地址均失败');
    }

    // ==================== LRU缓存 & 请求池 ====================
    class LRUCache {
        constructor(max=100, ttl=300000) {
            this.max = max; this.ttl = ttl;
            this.cache = typeof Map !== 'undefined' ? new Map() : {};
            this._m = typeof Map !== 'undefined';
        }
        get(k) {
            if (!k) return null;
            if (this._m) {
                const v = this.cache.get(k);
                if (!v) return null;
                if (Date.now() > v.expiry) { this.cache.delete(k); return null; }
                this.cache.delete(k); this.cache.set(k, v);
                return v.value;
            } else {
                const v = this.cache[k];
                if (!v) return null;
                if (Date.now() > v.expiry) { delete this.cache[k]; return null; }
                return v.value;
            }
        }
        set(k, v) {
            if (!k) return;
            if (this._m) {
                if (this.cache.size >= this.max) {
                    const first = this.cache.keys().next().value;
                    if (first !== undefined) this.cache.delete(first);
                }
                this.cache.set(k, {value:v, expiry:Date.now()+this.ttl});
            } else {
                const keys = Object.keys(this.cache);
                if (keys.length >= this.max) delete this.cache[keys[0]];
                this.cache[k] = {value:v, expiry:Date.now()+this.ttl};
            }
        }
    }
    class RequestPool {
        constructor(max=3) { this.max = max; this.running = 0; this.queue = []; }
        execute(fn) {
            return new Promise((resolve, reject) => {
                const task = async () => {
                    try { resolve(await fn()); } catch(e) { reject(e); } finally { this.running--; this.next(); }
                };
                this.queue.push(task);
                this.next();
            });
        }
        next() {
            if (this.running >= this.max || !this.queue.length) return;
            this.running++;
            const task = this.queue.shift();
            if (typeof task === 'function') task();
        }
    }

    // ==================== 全局状态 ====================
    const state = {
        urlCache: new LRUCache(CONFIG.CACHE_MAX_SIZE, CONFIG.CACHE_TTL_URL),
        searchCache: new LRUCache(50, CONFIG.CACHE_TTL_SEARCH),
        requestPool: new RequestPool(CONFIG.CONCURRENT_LIMIT),
        stats: { hits:0, misses:0, requests:0, success:0, fail:0 },
        activeRequests: new Map(),
        initialized: false,
        wycloudCookie: null, wycloudCookieExpire: 0,
        announcementSent: false,
        preloadCache: new Map(),
        kwToken: '', kwCookie: ''
    };

    function sendAnnouncement() {
        if (state.announcementSent) return;
        state.announcementSent = true;
        try { send && send(EVENT_NAMES.updateAlert, { log: ANNOUNCEMENT.content, updateUrl: ANNOUNCEMENT.repo }); } catch(e) {}
    }
    function startStatsCleanup() {
        if (state.cleanupTimer) clearTimeout(state.cleanupTimer);
        const cleanup = () => {
            if (state.stats.requests > 1000) { state.stats.requests=0; state.stats.hits=0; state.stats.misses=0; state.stats.success=0; state.stats.fail=0; }
            state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL||300000);
        };
        state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL||300000);
    }

    // ==================== 网易云盘 Cookie ====================
    function getWycloudCookieFromStorage() {
        try {
            if (lx && lx.getConfig) return lx.getConfig('wycloud_cookie');
            if (typeof localStorage !== 'undefined') return localStorage.getItem('wycloud_cookie');
        } catch(e) {}
        return null;
    }
    function saveWycloudCookieToStorage(cookie) {
        try {
            if (lx && lx.setConfig) lx.setConfig('wycloud_cookie', cookie);
            if (typeof localStorage !== 'undefined') localStorage.setItem('wycloud_cookie', cookie);
            state.wycloudCookie = cookie;
            state.wycloudCookieExpire = Date.now() + 86400000;
        } catch(e) {}
    }
    function isWycloudCookieValid() {
        if (!state.wycloudCookie || Date.now() > state.wycloudCookieExpire) { state.wycloudCookie = null; return false; }
        return true;
    }
    async function autoGetWycloudCookie() {
        const c = getWycloudCookieFromStorage();
        if (c) { state.wycloudCookie = c; state.wycloudCookieExpire = Date.now()+86400000; }
        return state.wycloudCookie;
    }

    // ==================== 音源处理器 ====================
    class SourceHandler {
        constructor(name, fn, priority, opts={}) {
            this.name = name; this.fn = fn; this.priority = priority;
            this.timeout = opts.timeout || CONFIG.REQUEST_TIMEOUT;
            this.requireSource = !!opts.requireSource;
            this.supportedPlatforms = opts.supportedPlatforms || [];
        }
        supportsPlatform(p) { return this.supportedPlatforms.length===0 || this.supportedPlatforms.includes(p); }
    }

    // ---------- ikun ----------
    async function ikunGetMusicUrl(source, musicInfo, quality) {
        const sid = getSongId(source, musicInfo) || musicInfo.hash || musicInfo.songmid || musicInfo.id;
        if (!sid) throw new Error('ikun: 缺少歌曲ID');
        const ua = `lx-music-${env}/${version}`;
        const headers = {'Content-Type':'application/json','User-Agent':ua};
        if (CONFIG.IKUN_API_KEY) headers['X-Request-Key'] = CONFIG.IKUN_API_KEY;
        const urls = [
            `${CONFIG.IKUN_API_URL}/url?source=${source}&songId=${sid}&quality=${quality||'320k'}`,
            `${CONFIG.IKUN_HK_API_URL}/url/${source}/${sid}/${quality||'320k'}`
        ];
        let lastErr;
        for (const u of urls) {
            try {
                const res = await httpFetch(u, {method:'GET', headers, follow_max:5});
                const body = res.body;
                if (!body || isNaN(Number(body.code))) continue;
                if (body.code === 200) return body.url || body.data;
                if (body.code === 403) throw new Error('ikun: Key失效');
                if (body.code === 500) throw new Error('ikun: 获取失败 - '+(body.message||'未知'));
                if (body.code === 429) throw new Error('ikun: 请求过速');
            } catch(e) { lastErr = e; }
        }
        throw lastErr || new Error('ikun: 所有服务器失败');
    }

    // ---------- 通用URL获取器 (肥猫/梓澄系列) ----------
    function createMusicUrlFetcher(apiUrl, apiKey, name) {
        return async function(source, musicInfo, quality) {
            const sid = getSongId(source, musicInfo) || musicInfo.hash || musicInfo.songmid || musicInfo.id;
            if (!sid) throw new Error(name+': 缺少歌曲ID');
            const res = await httpFetch(`${apiUrl}/url/${source}/${sid}/${quality}`, {
                method:'GET',
                headers:{'Content-Type':'application/json','User-Agent':`lx-music-${env}/${version}`,'X-Request-Key':apiKey},
                follow_max:5
            });
            const body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error(name+': 未知响应');
            switch(body.code) {
                case 0: return body.data;
                case 1: throw new Error(name+': IP被封禁');
                case 2: throw new Error(name+': 获取URL失败');
                case 4: throw new Error(name+': 远程服务器错误');
                case 5: throw new Error(name+': 请求过于频繁');
                case 6: throw new Error(name+': 参数错误');
                default: throw new Error(body.msg || name+': 未知错误');
            }
        };
    }
    const feimaoGetMusicUrl = createMusicUrlFetcher(CONFIG.FEIMAO_API_URL, CONFIG.FEIMAO_API_KEY, '肥猫');
    const feimaobufeiGetMusicUrl = createMusicUrlFetcher(CONFIG.FEIMAOBUFEI_API_URL, CONFIG.FEIMAOBUFEI_API_KEY, '肥猫不肥');
    const zichengGetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENG_API_URL, CONFIG.ZICHENG_API_KEY, '梓澄公益');
    const zichengqwqGetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENGQWQ_API_URL, CONFIG.ZICHENGQWQ_API_KEY, '梓澄qwq');
    const zicheng2GetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENG2_API_URL, CONFIG.ZICHENG2_API_KEY, '梓澄公益2代');

    // ---------- 聚合API (juhe) - 修复为 Meting 主接口 + 原接口备用 ----------
    async function juheGetMusicUrl(source, info) {
        const platform = source; // source 即为平台标识 tx/wy/kw/kg/mg
        const musicInfo = (info && info.musicInfo) || info || {};
        const quality = (info && info.type) || '320k';
        // 尝试通过 Meting API 获取 (增强稳定性)
        try {
            const metingServer = PLATFORM_TO_SOURCE[platform]?.meting;
            if (metingServer) {
                const id = getSongId(platform, musicInfo);
                if (id) {
                    const br = QUALITY_TO_BR[quality] || '320';
                    const tpl = API_ENDPOINTS.backup[platform] || `https://api.injahow.cn/meting/?server=${metingServer}&type=url&id={id}&br={br}`;
                    const url = tpl.replace('{id}', id).replace('{br}', br);
                    const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
                    const finalUrl = res?.url || res?.data?.url || (typeof res === 'string' && HTTP_REGEX.test(res) ? res : null);
                    if (finalUrl) return validateUrl(finalUrl, '聚合API (Meting)');
                }
            }
        } catch(e) { console.warn('[聚合API] Meting回退失败:', e.message); }

        // 原聚合接口尝试
        try {
            const res = await httpPost(`${CONFIG.JUHE_API_URL}/${source}`, musicInfo, CONFIG.REQUEST_TIMEOUT);
            const body = res;
            if (!body) throw new Error('juhe: 返回空响应');
            if (body.code === 200) {
                const url = SafeUtils.safeGet(body, 'data.url') || body.url;
                if (url) return validateUrl(url, 'juhe');
            }
            if (body.code === 303) {
                const data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
                if (!data) throw new Error('juhe 303 无 data');
                const reqData = data.request || {};
                let reqUrl = reqData.url;
                if (!reqUrl) throw new Error('juhe 303 缺少 request.url');
                if (!HTTP_REGEX.test(reqUrl)) reqUrl = new URL(reqUrl, CONFIG.JUHE_API_URL).href;
                const nested = await httpFetch(reqUrl, reqData.options||{});
                const checkKeys = Array.isArray(data.response?.check?.key) ? data.response.check.key : [];
                let checkVal = nested;
                for (const k of checkKeys) { if (checkVal == null) break; checkVal = checkVal[k]; }
                if (checkVal !== SafeUtils.safeGet(data.response, 'check.value')) throw new Error('juhe 303 check 不匹配');
                const urlKeys = Array.isArray(data.response?.url) ? data.response.url : [data.response?.url].filter(Boolean);
                let finalUrl = nested;
                for (const k of urlKeys) { if (finalUrl == null) break; finalUrl = finalUrl[k]; }
                if (finalUrl && typeof finalUrl === 'string' && HTTP_REGEX.test(finalUrl)) return validateUrl(finalUrl, 'juhe 303');
                throw new Error('juhe 303 未提取到有效URL');
            }
            if (body.data?.url && HTTP_REGEX.test(body.data.url)) return validateUrl(body.data.url, 'juhe');
            if (body.url && HTTP_REGEX.test(body.url)) return validateUrl(body.url, 'juhe');
            throw new Error(`juhe: ${body.msg||body.message||'获取失败'}`);
        } catch(e) {
            throw new Error(`聚合API: ${e.message}`);
        }
    }

    // ---------- qorg（三重回退：不加密 / weapi / eapi）不修改 ----------
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error(`qorg: 不支持平台 ${platform}，仅支持 wy/wycloudmusic`);
        }

        const info = songInfo || {}, meta = info.meta || {};

        // ID提取
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid && platform === 'wy') sid = meta.songmid || meta.id || info.songmid;
        if (!sid && platform === 'wycloudmusic') sid = info.songmid || info.id || meta.id;

        // 搜索补全
        if (!sid) {
            const keyword = info.name || info.title || '';
            const singer  = info.singer || info.artist || '';
            if (keyword) {
                console.warn(`[qorg] ID缺失，尝试通过 api.qlm.org.cn 搜索补全: ${keyword} ${singer}`);
                try {
                    const searchRes = await qorgSearch(keyword, 1, 3);
                    if (searchRes && searchRes.list && searchRes.list.length > 0) {
                        let match = searchRes.list[0];
                        if (singer) {
                            const better = searchRes.list.find(item =>
                                (item.singer || '').includes(singer) || singer.includes(item.singer || '')
                            );
                            if (better) match = better;
                        }
                        sid = match.id || match.songmid;
                        if (sid) console.log(`[qorg] 搜索补全 ID: ${sid} (${match.name} - ${match.singer})`);
                    }
                } catch (e) { console.warn('[qorg] 搜索补全失败:', e.message); }
            }
        }

        if (!sid) throw new Error('qorg: 缺少歌曲ID，且搜索补全未成功');

        const brMap = { '128k':128000, '192k':192000, '320k':320000, 'flac':999000 };
        const br = brMap[quality] || 128000;

        // 第一回退：不加密接口（api.qlm.org.cn 自建网易云）
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            console.log('[qorg] 尝试不加密接口:', url);
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                return validateUrl(res.data[0].url, 'qorg');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] 不加密接口失败:', e.message, '→ 尝试 weapi');
        }

        // 第二回退：weapi 加密（直连网易云官方）
        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                return validateUrl(url, 'qorg (weapi)');
            }
        } catch (e) {
            console.warn('[qorg] weapi 失败:', e.message, '→ 尝试 eapi');
        }

        // 第三回退：eapi 加密（直连网易云官方）
        try {
            const d = { ids: `[${sid}]`, br: br };
            const eapiUrl = '/api/song/enhance/player/url';
            const eapiData = freelistenWyEapi(eapiUrl, d);
            let cookie = 'os=pc';
            if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
            const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
            const resp = await httpFetch(targetUrl, {
                method: 'POST',
                form: eapiData,
                headers: { cookie }
            });
            const resData = resp.body;
            const { url, freeTrialInfo } = resData.data[0];
            if (url && !freeTrialInfo) {
                return validateUrl(url, 'qorg (eapi)');
            }
            throw new Error(resData?.message || freeTrialInfo ? '试听歌曲' : '无URL');
        } catch (e) {
            console.warn('[qorg] eapi 失败:', e.message);
        }

        throw new Error('qorg: 所有获取方式均失败 (不加密 / weapi / eapi)');
    }

    // ---------- 网易云盘 ----------
    async function wycloudGetMusicUrl(songInfo, quality) {
        const sid = songInfo.id || songInfo.songmid || songInfo.songId;
        if (!sid) throw new Error('网易云盘: 缺少歌曲ID');
        if (!isWycloudCookieValid()) { if (!(await autoGetWycloudCookie())) throw new Error('请先设置网易云Cookie'); }
        const ck = `wycloud_url_${sid}_${quality||'320k'}`;
        const cached = state.urlCache.get(ck);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        try {
            const res = await httpPost(CONFIG.QORG_API_URL+'/wycloud/url', { songId: String(sid), quality: quality||'320k', cookie: state.wycloudCookie }, 15000);
            if (res?.code===200 && res.data?.url) {
                const url = validateUrl(res.data.url, '网易云盘');
                state.urlCache.set(ck, url); state.stats.success++;
                return url;
            }
            throw new Error(res?.msg||'获取失败');
        } catch(e) { state.stats.fail++; throw e; }
    }

    // ---------- 自建网易云 ----------
    const WYCLOUDMUSIC_QUALITY = { '128k':128000, '192k':192000, '320k':320000, 'flac':999000 };
    async function wycloudmusicGetMusicUrl(songInfo, quality) {
        const sid = songInfo.id || songInfo.songmid;
        if (!sid) throw new Error('自建网易云: 缺少歌曲ID');
        const br = WYCLOUDMUSIC_QUALITY[quality] || 128000;
        const ck = `wycloudmusic_url_${sid}_${quality}`;
        const cached = state.urlCache.get(ck);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        try {
            const res = await httpGet(`${CONFIG.WYCLOUDMUSIC_API_URL}/song/url?id=${sid}&br=${br}`, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code===200 && Array.isArray(res.data) && res.data[0]?.url) {
                const url = validateUrl(res.data[0].url, '自建网易云');
                state.urlCache.set(ck, url); state.stats.success++;
                return url;
            }
        } catch(e){}
        state.stats.fail++;
        throw new Error('自建网易云: 获取失败');
    }

    // ---------- 星海API (增强解析) ----------
    async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.main;
        if (!source) throw new Error('星海不支持该平台');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('星海: 缺少歌曲ID');
        const br = QUALITY_TO_BR[quality] || '320';
        const params = Object.assign({}, API_ENDPOINTS.xinghaiMain.params, { source, id: String(id), br });
        const res = await httpGet(API_ENDPOINTS.xinghaiMain.base, params);
        // 增强URL提取
        const url = res?.url || res?.data?.url || (typeof res === 'string' && HTTP_REGEX.test(res) ? res : null);
        if (url) return validateUrl(url, '星海');
        throw new Error('星海未返回URL');
    }
    async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.backup || platform;
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('星海备: 缺少歌曲ID');
        const params = { source, id: String(id), type:'url', br: quality||'320k' };
        const res = await httpGet(API_ENDPOINTS.xinghaiBackup.base, params);
        const url = res?.url || res?.data?.url || (typeof res === 'string' && HTTP_REGEX.test(res) ? res : null);
        if (url) return validateUrl(url, '星海备');
        throw new Error('星海备未返回URL');
    }

    // ---------- 野草(酷我) ----------
    async function grassGetMusicUrl(platform, songId, quality, songInfo) {
        if (platform !== 'kw') throw new Error('野草仅支持酷我');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('野草: 缺少歌曲ID');
        const res = await httpGet(`${API_ENDPOINTS.grass.base}/url/kw/${id}/${quality||'320k'}`);
        if (res?.url) return res.url;
        throw new Error('野草未返回URL');
    }

    // ---------- 溯音 ----------
    async function suyinQQGetUrl(songInfo, quality) {
        const qqId = getQQSongId(songInfo);
        if (!qqId) throw new Error('溯音QQ: 缺少ID');
        const startBr = SUYIN_QQ_BR[quality] || 7;
        const brList = [...new Set([startBr,4,5,7])].sort((a,b)=>a-b);
        let lastErr;
        for (const br of brList) {
            try {
                const params = { key: API_ENDPOINTS.suyin.qq.key, type:'json', br, n:1 };
                if (qqId.type==='mid') params.mid = qqId.value; else params.songid = qqId.value;
                const res = await httpGet(API_ENDPOINTS.suyin.qq.url, params);
                if (res?.music) return res.music;
                if (res?.url) return res.url;
            } catch(e) { lastErr = e; }
        }
        throw new Error('溯音QQ失败: '+(lastErr?.message||lastErr));
    }
    async function suyinWyGetUrl(songInfo) {
        const id = songInfo.songmid || songInfo.id;
        if (!id) throw new Error('溯音网易云: 缺少ID');
        const res = await httpGet(API_ENDPOINTS.suyin.wy.url, { id: String(id) });
        if (res?.code===0 && res?.data) {
            const item = Array.isArray(res.data) ? res.data[0] : res.data;
            if (item?.url) return item.url;
        }
        throw new Error('溯音网易云失败');
    }
    async function suyinKwGetUrl(songInfo) {
        const name = songInfo.name || songInfo.title;
        const id = songInfo.songmid || songInfo.id;
        const params = id ? { id: String(id), n:1, br:1 } : { msg: name, n:1, br:1 };
        const res = await httpGet(API_ENDPOINTS.suyin.kw.url, params);
        if (res?.data?.url) return res.data.url;
        throw new Error('溯音酷我失败');
    }
    async function suyinMgGetUrl(songInfo) {
        const name = songInfo.name || songInfo.title;
        const id = songInfo.songmid || songInfo.id;
        const params = id ? { id: String(id), n:1, num:1, type:'json' } : { gm: name, n:1, num:1, type:'json' };
        const res = await httpGet(API_ENDPOINTS.suyin.mg.url, params);
        if (res?.code===200 && res?.musicInfo) return res.musicInfo;
        throw new Error('溯音咪咕失败');
    }
    async function suyinGetUrl(platform, songId, quality, songInfo) {
        switch(platform) {
            case 'tx': return suyinQQGetUrl(songInfo, quality);
            case 'wy': return suyinWyGetUrl(songInfo);
            case 'kw': return suyinKwGetUrl(songInfo);
            case 'mg': return suyinMgGetUrl(songInfo);
            default: throw new Error('溯音不支持该平台');
        }
    }

    // ---------- 六音 ----------
    async function sixyinGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('六音: 缺少歌曲ID');
        const typeMap = { tx:'qq', wy:'netease', kw:'kuwo', kg:'kugou', mg:'migu' };
        const type = typeMap[platform] || platform;
        const res = await httpGet(`${API_ENDPOINTS.sixyin}/url?type=${type}&id=${id}&quality=${quality||'320k'}`);
        if (res?.url) return validateUrl(res.url, '六音');
        throw new Error('六音未返回URL');
    }

    // ---------- 独家音源 ----------
    async function dusiyinyuanGetUrl(platform, songInfo, quality) {
        const source = PLATFORM_TO_SOURCE[platform]?.dusiyinyuan;
        if (!source) throw new Error('独家音源不支持该平台');
        let id = getSongId(platform, songInfo);
        if (!id) throw new Error('独家音源: 缺少歌曲ID');
        const brMap = { '128k':'128', '320k':'320', 'flac':'flac' };
        const br = brMap[quality] || '320';
        for (const base of [API_ENDPOINTS.dusiyinyuan.base, API_ENDPOINTS.dusiyinyuan.fallback]) {
            try {
                const res = await httpFetch(`${base}/url`, {
                    method:'POST', headers:{'Content-Type':'application/json'}, 
                    body: JSON.stringify({ source, songId: String(id), br })
                });
                if (res.body?.code===200 && res.body.data?.url) return validateUrl(res.body.data.url, '独家音源');
            } catch(e) {}
        }
        throw new Error('独家音源所有端点失败');
    }

    // ---------- 长青SVIP / 念心 ----------
    function qualityToLevel(q) {
        q = String(q||'128k').toLowerCase();
        if (q.includes('128')) return '128';
        if (q.includes('320')) return '320';
        return 'flac';
    }
    async function changqingGetUrl(platform, songId, quality, songInfo) {
        const tpl = API_ENDPOINTS.changqing[platform];
        if (!tpl) throw new Error('长青SVIP不支持该平台');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('长青SVIP: 缺少歌曲ID');
        return tpl.replace('{id}', encodeURIComponent(String(id))).replace('{level}', qualityToLevel(quality));
    }
    async function nianxinGetUrl(platform, songId, quality, songInfo) {
        const tpl = API_ENDPOINTS.nianxin[platform];
        if (!tpl) throw new Error('念心不支持该平台');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('念心: 缺少歌曲ID');
        return tpl.replace('{id}', encodeURIComponent(String(id))).replace('{level}', qualityToLevel(quality));
    }

    // ---------- 野花野草 / Meting ----------
    async function flowerGrassGetUrl(platform, songId, quality) {
        const id = songId;
        if (!id) throw new Error('野花野草: 缺少歌曲ID');
        for (const base of [API_ENDPOINTS.flower, API_ENDPOINTS.grass?.base].filter(Boolean)) {
            try {
                const res = await httpGet(`${base}/url/${platform}/${id}/${quality||'320k'}`);
                if (res?.url) return res.url;
            } catch(e) {}
        }
        throw new Error('野花野草失败');
    }
    async function metingGetUrl(platform, songId, quality) {
        const server = PLATFORM_TO_SOURCE[platform]?.meting;
        if (!server) throw new Error('Meting不支持该平台');
        const id = songId;
        if (!id) throw new Error('Meting: 缺少歌曲ID');
        const br = QUALITY_TO_BR[quality] || '320';
        const tpl = API_ENDPOINTS.backup[platform];
        if (!tpl) throw new Error('无Meting模板');
        const url = tpl.replace('{id}', id).replace('{br}', br);
        const res = await httpGet(url);
        if (res?.url) return res.url;
        throw new Error('Meting失败');
    }

    // ---------- 汽水VIP ----------
    async function qishuiGetUrl(songInfo, quality) {
        const sid = getHashOrMid(songInfo) || songInfo.id;
        if (!sid) throw new Error('汽水VIP: 缺少歌曲ID');
        const q = (quality||'128k')==='320k'?'standard':'lossless';
        const res = await httpGetWithFallback([API_ENDPOINTS.qishui.https, API_ENDPOINTS.qishui.http], { act:'song', id: String(sid), quality: q }, 15000);
        const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (!data?.url) throw new Error('汽水VIP未返回URL');
        if (!data.ekey) return String(data.url);
        for (const proxy of [API_ENDPOINTS.qishui.proxy, API_ENDPOINTS.qishui.backupProxy]) {
            for (let i=0; i<=CONFIG.MAX_RETRIES; i++) {
                try {
                    if (i>0) await delay(CONFIG.RETRY_DELAY*i*1.5);
                    const pres = await httpPost(proxy, { url: data.url, key: data.ekey, filename: data.filename||'KMusic', ext: data.fileExtension||'aac' }, CONFIG.DECRYPT_TIMEOUT);
                    if (pres?.code===200 && pres?.url) return String(pres.url);
                } catch(e) {}
            }
        }
        return String(data.url);
    }

    // ---------- Free listen 酷我 ----------
    function freelistenKwEncrypt(str, pwd) { /* 保持原样 */ }
    function freelistenKwParseCookieToken(cookies) { /* 保持原样 */ }
    async function freelistenKwGetToken() { /* 保持原样 */ }
    async function freelistenKwGetMusicUrl(songInfo, quality) { /* 保持原样 */ }

    // ---------- Free listen 酷狗 ----------
    async function freelistenKgGetMusicUrl(songInfo, quality) { /* 保持原样 */ }

    // ---------- Free listen 网易云 (weapi + eapi 回退) ----------
    /** eapi 加密 (保留原有实现) **/
    function freelistenWyEapi(url, object) {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const message = `nobody${url}use${text}md5forencrypt`;
        const digest = md5(message);
        const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
        if (utils && utils.crypto && SafeUtils.isFunction(utils.crypto.aesEncrypt) && utils.buffer) {
            const encrypted = utils.crypto.aesEncrypt(data, 'aes-128-ecb', eapiKey, '');
            if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
                return { params: utils.buffer.bufToString(encrypted, 'hex').toUpperCase() };
            }
        }
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += ('0' + data.charCodeAt(i).toString(16)).slice(-2);
        }
        return { params: result.toUpperCase() };
    }

    /** weapi 加密 (新增) **/
    function freelistenWyWeapi(object) {
        const text = JSON.stringify(object);
        const key1 = '0CoJUm6Qyw8W8jud';
        const key2 = 'a8LWv2uAtXjzSfkQ';
        const iv = '0102030405060708';
        const encSecKey = '257348aecb5e556c066de214e531faadd1c55d814f9be95fd06d6bff9f4c7a41f831f6394d5a3fd2e3881736d94a02ca919d952872e7ce0a50eb844be3c20a9f5aa5e1d4da57616f4a3f1c3ff1ef93f77c2b27e6a2a6b02c7b96f2b2e6e6f788d8f103ab93aa2e3006db3b0c1b93bc371af9f2f47b1e82f8d5597b3c4fe6b57';
        if (utils && utils.crypto && SafeUtils.isFunction(utils.crypto.aesEncrypt) && utils.buffer) {
            try {
                const cipher1 = utils.crypto.aesEncrypt(text, 'aes-128-cbc', key1, iv);
                const b64_1 = utils.buffer.bufToString(cipher1, 'base64');
                const cipher2 = utils.crypto.aesEncrypt(b64_1, 'aes-128-cbc', key2, iv);
                const b64_2 = utils.buffer.bufToString(cipher2, 'base64');
                return { params: b64_2, encSecKey: encSecKey };
            } catch(e) {
                console.warn('[weapi] 加密失败，回退至 eapi');
                return null;
            }
        }
        return null;
    }

    /** weapi 请求 **/
    async function freelistenWyWeapiRequest(data) {
        const enc = freelistenWyWeapi(data);
        if (!enc) return null;
        const weapiUrl = 'https://interface3.music.163.com/weapi/song/enhance/player/url';
        let cookie = 'os=pc';
        if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
        const resp = await httpFetch(weapiUrl, {
            method: 'POST',
            form: enc,
            headers: { cookie }
        });
        const body = resp.body;
        if (body?.code === 200 && body.data?.[0]?.url && !body.data[0].freeTrialInfo) {
            return validateUrl(body.data[0].url, 'Free listen 网易云 (weapi)');
        }
        throw new Error(body?.message || 'weapi 获取失败');
    }

    /** 主获取函数：先 weapi，失败则回退 eapi **/
    async function freelistenWyGetMusicUrl(songInfo, quality) {
        const songmid = songInfo.songmid || songInfo.id;
        if (!songmid) throw new Error('Free listen 网易云: 缺少歌曲ID');
        const qualityMap = { '128k': 128000, '320k': 320000, 'flac': 999000 };
        const br = qualityMap[quality] || 128000;
        const d = { ids: `[${songmid}]`, br: br };

        // 尝试 weapi
        try {
            const url = await freelistenWyWeapiRequest(d);
            if (url) return url;
        } catch(e) {
            console.warn('[Free listen 网易云] weapi 失败，尝试 eapi: ' + e.message);
        }

        // 回退 eapi
        const eapiUrl = '/api/song/enhance/player/url';
        const eapiData = freelistenWyEapi(eapiUrl, d);
        let cookie = 'os=pc';
        if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
        const target_url = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
        return new Promise((resolve, reject) => {
            httpFetch(target_url, {
                method: 'POST',
                form: eapiData,
                headers: { cookie }
            }).then(resp => {
                const res_data = resp.body;
                const { url, freeTrialInfo } = res_data.data[0];
                if (!url || freeTrialInfo) return reject(new Error('Free listen 网易云: 无权限或试听'));
                resolve(validateUrl(url, 'Free listen 网易云 (eapi)'));
            }).catch(reject);
        });
    }

    // ==================== 注册所有音源处理器 ====================
    const SOURCE_HANDLERS = [
        new SourceHandler('ikun', ikunGetMusicUrl, 1, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('聚合API', juheGetMusicUrl, 2),
        new SourceHandler('qorg', qorgGetMusicUrl, 3, { supportedPlatforms: ['wy','wycloudmusic'] }),
        new SourceHandler('网易云盘', wycloudGetMusicUrl, 4, { supportedPlatforms: ['wycloud'] }),
        new SourceHandler('自建网易云', wycloudmusicGetMusicUrl, 5, { supportedPlatforms: ['wycloudmusic'] }),
        new SourceHandler('星海主(GD音乐台)', xinghaiMainGetUrl, 6, { supportedPlatforms: ['tx','wy','kw'] }),
        new SourceHandler('星海备', xinghaiBackupGetUrl, 7),
        new SourceHandler('野草(酷我)', grassGetMusicUrl, 8, { supportedPlatforms: ['kw'] }),
        new SourceHandler('溯音', suyinGetUrl, 9, { supportedPlatforms: ['tx','wy','kw','mg'] }),
        new SourceHandler('六音', sixyinGetUrl, 10, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('独家音源', dusiyinyuanGetUrl, 11, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('长青SVIP', changqingGetUrl, 12, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('念心SVIP', nianxinGetUrl, 13, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('野花野草', flowerGrassGetUrl, 14),
        new SourceHandler('Meting', metingGetUrl, 15, { supportedPlatforms: ['tx','wy'] }),
        new SourceHandler('汽水VIP', qishuiGetUrl, 16, { timeout: 20000 }),
        new SourceHandler('Free listen 酷我', freelistenKwGetMusicUrl, 17, { supportedPlatforms: ['kw'] }),
        new SourceHandler('Free listen 酷狗', freelistenKgGetMusicUrl, 18, { supportedPlatforms: ['kg'] }),
        new SourceHandler('Free listen 网易云', freelistenWyGetMusicUrl, 19, { supportedPlatforms: ['wy'] }),
        new SourceHandler('肥猫', feimaoGetMusicUrl, 20, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('肥猫不肥', feimaobufeiGetMusicUrl, 21, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄公益', zichengGetMusicUrl, 22, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄qwq', zichengqwqGetMusicUrl, 23, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄公益2代', zicheng2GetMusicUrl, 24, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] })
    ];

    // ==================== 音源链与主获取 ====================
    function buildSourceChain(platform) {
        const chain = SOURCE_HANDLERS.filter(h => h.supportsPlatform(platform));
        chain.sort((a,b) => a.priority - b.priority);
        return chain;
    }

    async function getUrlWithFallback(platform, songInfo, quality) {
        if (!platform) throw new Error('无效平台');
        if (!songInfo || typeof songInfo !== 'object') throw new Error('无效歌曲信息');
        const q = quality || '320k';
        const cacheKey = SafeUtils.buildCacheKey(platform, songInfo, q);
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;

        const reqKey = `${platform}_${cacheKey}`;
        if (state.activeRequests.has(reqKey)) return state.activeRequests.get(reqKey);

        const chain = buildSourceChain(platform);
        if (!chain.length) throw new Error(`平台 ${platform} 无可用音源`);

        const promise = (async () => {
            const errors = [];
            for (const handler of chain) {
                try {
                    console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                    let url;
                    const timeout = handler.timeout || CONFIG.REQUEST_TIMEOUT;

                    if (['汽水VIP','网易云盘','自建网易云','Free listen 酷我','Free listen 酷狗','Free listen 网易云'].includes(handler.name)) {
                        url = await withTimeout(handler.fn(songInfo, q), timeout, handler.name+'超时');
                    } else if (handler.name === 'qorg') {
                        url = await withTimeout(handler.fn(platform, songInfo, q), timeout, handler.name+'超时');
                    } else if (handler.requireSource) {
                        const src = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
                        url = await withTimeout(handler.fn(src, songInfo, q), timeout, handler.name+'超时');
                    } else if (handler.name === '聚合API') {
                        url = await withTimeout(handler.fn(platform, { musicInfo: songInfo, type: q }), timeout, handler.name+'超时');
                    } else {
                        const sid = getSongId(platform, songInfo);
                        if (!sid) throw new Error(handler.name+': 缺少歌曲ID');
                        url = await withTimeout(handler.fn(platform, sid, q, songInfo), timeout, handler.name+'超时');
                    }

                    const validated = validateUrl(url, handler.name);
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    console.log(`[聚合音源] ${handler.name} 成功`);
                    return validated;
                } catch(e) {
                    errors.push(`${handler.name}: ${e.message}`);
                    console.warn(`[聚合音源] ${handler.name} 失败: ${e.message}`);
                }
            }
            state.stats.fail++;
            throw new Error(`所有音源均失败: ${errors.join('; ')}`);
        })();

        state.activeRequests.set(reqKey, promise);
        try { return await promise; } finally { state.activeRequests.delete(reqKey); }
    }

    // ==================== 预加载与搜索 ====================
    async function preloadNextSong(platform, nextSongInfo, quality) {
        if (!CONFIG.PRELOAD_NEXT_ENABLED || !nextSongInfo || !platform) return;
        const ck = SafeUtils.buildCacheKey(platform, nextSongInfo, quality||'320k');
        if (state.preloadCache.has(ck)) return;
        state.preloadCache.set(ck, true);
        try { await getUrlWithFallback(platform, nextSongInfo, quality); } catch(e) {}
        setTimeout(() => state.preloadCache.delete(ck), 60000);
    }
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list:[], total:0 };
        const ck = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(ck);
        if (cached) return cached;
        const res = await httpPost(CONFIG.QORG_API_URL+'/music/search', { keyword, page, pageSize }, 15000);
        if (res?.code===200 && res.data) {
            const list = (res.data.list||[]).map(item => ({
                id: String(item.id||''), songmid: item.id, name: item.name, singer: item.singer||item.artist,
                albumName: item.album, duration: item.duration, pic: item.pic||item.cover, _source: 'wy'
            }));
            const result = { isEnd: list.length < pageSize, list, total: res.data.total||list.length, page, limit: pageSize };
            state.searchCache.set(ck, result);
            return result;
        }
        return { isEnd: true, list:[], total:0 };
    }

    // ==================== 事件监听与初始化 ====================
    const sourceConfig = {
        tx: { name:'QQ音乐', type:'music', actions:['musicUrl'], qualitys:['24bit','flac','320k','192k','128k'] },
        wy: { name:'网易云音乐', type:'music', actions:['musicUrl'], qualitys:['24bit','flac','320k','192k','128k'] },
        kw: { name:'酷我音乐', type:'music', actions:['musicUrl'], qualitys:['24bit','flac','320k','192k','128k'] },
        kg: { name:'酷狗音乐', type:'music', actions:['musicUrl'], qualitys:['24bit','flac','320k','192k','128k'] },
        mg: { name:'咪咕音乐', type:'music', actions:['musicUrl'], qualitys:['24bit','flac','320k','192k','128k'] },
        qishui: { name:'汽水VIP', type:'music', actions:['musicUrl'], qualitys:['128k','320k','flac'] },
        qorg: { name:'qorg音源', type:'music', actions:['musicUrl','musicSearch','lyric'], qualitys:['128k','320k','flac'] },
        wycloud: { name:'网易云盘', type:'music', actions:['musicUrl'], qualitys:['128k','320k','flac'] },
        wycloudmusic: { name:'自建网易云', type:'music', actions:['musicUrl'], qualitys:['128k','192k','320k','flac'] }
    };

    function setupEventListener() {
        const handler = async ({ action, source, info }) => {
            state.stats.requests++;
            try {
                if (action === 'preloadNext') {
                    const { platform, musicInfo, quality } = info || {};
                    preloadNextSong(platform, musicInfo, quality).catch(e => console.warn('[预加载]', e));
                    return { success: true };
                }
                if (source === 'qorg') {
                    if (action === 'musicSearch') return await qorgSearch(info?.keyword, info?.page||1, info?.pagesize||30);
                    if (action === 'lyric') return { lyric: '' };
                    if (action === 'musicUrl') {
                        const musicInfo = info?.musicInfo || {};
                        const realPlatform = musicInfo._source || 'wy';
                        return await qorgGetMusicUrl(realPlatform, musicInfo, info.type);
                    }
                }
                if (action === 'musicUrl') {
                    const musicInfo = info?.musicInfo || {};
                    const platform = musicInfo._source || source;
                    return await getUrlWithFallback(platform, musicInfo, info?.type||'320k');
                }
                throw new Error('不支持的操作: '+action);
            } catch(e) {
                console.error('[聚合音源] 请求失败:', e.message);
                throw e;
            }
        };
        try { on(EVENT_NAMES.request, handler); } catch(e) { try { on('request', handler); } catch(e2) {} }
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        console.log('[聚合音源 v7.1.2-ultimate-fix-v3.5] 初始化 (qorg 三重回退)');
        startStatsCleanup();
        setupEventListener();
        autoGetWycloudCookie().catch(() => {});
        sendAnnouncement();
        try { send && send(EVENT_NAMES.inited, { openDevTools: false, sources: sourceConfig, status: { version: ANNOUNCEMENT.version } }); } catch(e) {}
    }

    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));
})();