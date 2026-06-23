/**
 * @name 七零喵聚合音源 · 终极整合版 v1.0.0
 * @description 整合 7.0.7 + 9.0.9 + v7.1.2-ultimate-fix-v3.7 所有优点
 * @version 1.0.0
 * @features 全音源独立并发 | qorg完整回退链 | 试听检测 | 智能缓存 | 成功即停 | 终极兜底
 * @author 七零喵团队
 * @homepage https://github.com/xcqm12/qlm-music
 */
(function() {
    "use strict";

    // ==================== Polyfill 区 ====================
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
    if (!Promise.any) {
        Promise.any = function(promises) {
            return new Promise((resolve, reject) => {
                let rejectedCount = 0;
                const errors = [];
                if (!promises || promises.length === 0) {
                    return reject(new AggregateError([], 'All promises were rejected'));
                }
                promises.forEach((p, index) => {
                    Promise.resolve(p).then(resolve, (error) => {
                        errors[index] = error;
                        rejectedCount++;
                        if (rejectedCount === promises.length) {
                            reject(new AggregateError(errors, 'All promises were rejected'));
                        }
                    });
                });
            });
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
        title: "七零喵聚合音源 · 终极整合版 v1.0.0",
        content: "整合 7.0.7 + 9.0.9 + v7.1.2-ultimate-fix-v3.7\n" +
                 "音源: GD音乐台/CHKSZ/肥猫/小熊猫/梓澄公益/無名/六音/星海主/星海备/长青SVIP/念心SVIP/溯音/ikun/野草/fish/qorg/wyqlm/网易云官方/汽水VIP\n" +
                 "特性: 全音源独立并发 | 成功即停 | 智能缓存 | qorg完整回退链 | 试听检测\n" +
                 "eapi/weapi/raw加密 | 终极兜底 | 失败自动跳歌\n" +
                 "2026 七零喵团队",
        version: "1.0.0"
    });

    // ==================== 修复事件名称兼容性 ====================
    const EVENT_NAMES = Object.freeze({
        request: (lx.EVENT_NAMES && lx.EVENT_NAMES.request) || 'request',
        inited: (lx.EVENT_NAMES && lx.EVENT_NAMES.inited) || 'inited',
        updateAlert: (lx.EVENT_NAMES && lx.EVENT_NAMES.updateAlert) || 'updateAlert',
        preload: (lx.EVENT_NAMES && lx.EVENT_NAMES.preload) || 'preload'
    });

    // ==================== 安全获取 LX Music API ====================
    let request = null, on = null, send = null, storage = null;
    const requestGetters = [
        () => lx.request, () => globalObj.request, () => globalObj.lx && globalObj.lx.request,
        () => globalObj.LX && globalObj.LX.request, () => globalObj.lxMusic && globalObj.lxMusic.request,
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
    const storageGetters = [() => lx.storage, () => globalObj.storage, () => globalObj.localStorage];
    for (const getter of storageGetters) {
        try { const s = getter(); if (s && typeof s.getItem === 'function') { storage = s; break; } } catch (e) {}
    }
    const utils = lx.utils || {};
    const env = lx.env || '';
    const version = lx.version || '1.0.0';

    if (!request || typeof request !== 'function') {
        if (typeof fetch === 'function') {
            request = function(url, options, callback) {
                const fetchOptions = {};
                if (options) {
                    fetchOptions.method = (options.method || 'GET').toUpperCase();
                    const headers = options.headers || {};
                    if (options.form) {
                        const params = new URLSearchParams();
                        Object.entries(options.form).forEach(([k,v]) => params.append(k, v));
                        fetchOptions.body = params;
                        if (!headers['Content-Type']) {
                            headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        }
                    } else if (options.body) {
                        fetchOptions.body = options.body;
                    }
                    fetchOptions.headers = headers;
                }
                if (typeof callback !== 'function') {
                    return fetch(url, fetchOptions);
                }
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), options?.timeout || 15000);
                fetchOptions.signal = controller.signal;
                fetch(url, fetchOptions)
                    .then(resp => {
                        clearTimeout(timer);
                        return resp.text().then(body => ({
                            statusCode: resp.status,
                            headers: resp.headers ? Object.fromEntries(resp.headers.entries()) : {},
                            body: body
                        }));
                    })
                    .then(resp => callback(null, resp))
                    .catch(err => { clearTimeout(timer); callback(err); });
            };
        } else { console.error('[聚合音源] request API 不可用'); return; }
    }
    if (!on) on = function() {};
    if (!send) send = function() {};

    // ==================== 常量配置（来自 9.0.9）====================
    const CONFIG = Object.freeze({
        // qorg/wyqlm API
        QORG_API_URL: "https://api.qlm.org.cn",
        WYQLM_API_URL: "https://api.qlm.org.cn",

        // ikun API
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_HK_API_URL: "https://songapi.ikunshare.link",
        IKUN_API_KEY: "",

        // 非常刀 API
        CHKSZ_API: "https://api.chksz.top/api",

        // fish API
        FISH_API_URL: "https://m-api.ceseet.me",

        // 星海 API
        XINGHAI_MAIN_URL: "https://music-api.gdstudio.xyz/api.php",
        XINGHAI_MAIN_PARAMS: {
            use_xbridge3: "true",
            loader_name: "forest",
            need_sec_link: "1",
            sec_link_scene: "im",
            theme: "light",
            types: "url"
        },
        XINGHAI_BACKUP_URL: "https://music-dl.sayqz.com/api/",

        // 溯音 API
        SUYIN_QQ_API: "https://oiapi.net/api/QQ_Music",
        SUYIN_QQ_KEY: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575",
        SUYIN_163_API: "https://oiapi.net/api/Music_163",
        SUYIN_KUWO_API: "https://oiapi.net/api/Kuwo",
        SUYIN_MIGU_API: "https://api.xcvts.cn/api/music/migu",

        // 长青SVIP URL模板
        CHANGQING_URL_TEMPLATES: {
            tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
            wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
            kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
            kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}",
            mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
        },

        // 念心SVIP URL模板
        NIANXIN_URL_TEMPLATES: {
            tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
            wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
            kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
            kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
            mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
        },

        // 汽水VIP
        QISHUI_API_HTTPS: "https://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_API_HTTP: "http://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_PROXY_API: "https://proxy.qishui.vsaa.cn/qishui/proxy",

        // 野草 API
        YECAO_API: "https://kuwoapi.gdwztv.cn/api/kuwo",

        // GD音乐台API
        GD_API_URL: "https://api.gdyyt.com/api.php",

        // 肥猫音源
        FEIMAO_API_URL: "https://api.feimao.wang",

        // 小熊猫音源
        XIAOXIONGMAO_API_URL: "https://api.xiaoxiongmao.xyz",

        // 梓澄公益API
        ZICHENG_API_URL: "https://api.zicheng.love",

        // 無名API
        WUMING_API_URL: "https://api.wuming.ink",

        // 六音API
        LIUYIN_API_URL: "https://api.liuyin.site",

        // 网易云官方API
        NETEASE_API_URL: "https://music.163.com",

        // 请求配置
        REQUEST_TIMEOUT: 15000,
        URL_CHECK_TIMEOUT: 4000,
        CACHE_TTL_URL: 1800000,
        CACHE_TTL_SEARCH: 300000,
        CACHE_MAX_SIZE: 500,
        CONCURRENT_LIMIT: 5,
        RETRY_DELAY: 800,
        MAX_RETRIES: 2,

        // 预加载配置
        PRELOAD_ENABLED: true,
        PRELOAD_QUALITY: '320k',
        PRELOAD_CACHE_SIZE: 5,

        // 网易云Cookie配置键名
        NETEASE_COOKIE_KEY: 'netease_variable_cookie',
        NETEASE_FIXED_COOKIE_KEY: 'netease_fixed_cookie',
        NETEASE_CLOUD_COOKIE_KEY: '_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=53b32208d3ff4825ff51d9f5ce806c98;'
    });

    const QUALITY_TO_BR = Object.freeze({ "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999" });
    const QUALITY_TO_KUWO_BR = Object.freeze({ "128k": 7, "320k": 5, "flac": 4, "flac24bit": 2 });
    const HTTP_REGEX = /^https?:\/\//i;

    const PLATFORM_TO_SOURCE = Object.freeze({
        tx: { main: "tencent", ikun: "tx", dusiyinyuan: "qq", meting: "tencent", xinghai: "qq" },
        wy: { main: "netease", ikun: "wy", dusiyinyuan: "wy", meting: "netease", xinghai: "netease" },
        kw: { main: "kuwo", ikun: "kw", dusiyinyuan: "kw", meting: "kuwo", xinghai: "kuwo" },
        kg: { main: "kugou", ikun: "kg", dusiyinyuan: "kg", meting: "kugou", xinghai: "kugou" },
        mg: { main: "migu", ikun: "mg", dusiyinyuan: "mg", meting: "migu", xinghai: "migu" }
    });

    const PLATFORM_TO_XINGHAI = Object.freeze({ tx: "qq", wy: "netease", kw: "kuwo", kg: "kugou", mg: "migu" });

    // ==================== 状态管理 ====================
    const state = {
        urlCache: new Map(),
        searchCache: new Map(),
        preloadCache: new Set(),
        activeRequests: new Map(),
        wycloudCookie: null,
        initialized: false,
        announcementSent: false,
        stats: { hits: 0, misses: 0, success: 0, fail: 0, requests: 0 }
    };

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

    // ==================== MD5 函数 ====================
    function md5(str) {
        const rotateLeft = function(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        };
        const addUnsigned = function(lX, lY) {
            const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000;
            const lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
            let lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            if (lX4 | lY4) {
                if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            } else return (lResult ^ lX8 ^ lY8);
        };
        const F = function(x, y, z) { return (x & y) | ((~x) & z); };
        const G = function(x, y, z) { return (x & z) | (y & (~z)); };
        const H = function(x, y, z) { return x ^ y ^ z; };
        const I = function(x, y, z) { return y ^ (x | (~z)); };
        const FF = function(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        const GG = function(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        const HH = function(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        const II = function(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        const convertToWordArray = function(string) {
            const lWordCount = ((string.length + 8) >> 6) + 1;
            const lWordArray = new Array(lWordCount * 16);
            let lBytePosition = 0, lByteCount = 0;
            while (lByteCount < string.length) {
                lWordArray[lBytePosition >> 2] |= string.charCodeAt(lByteCount) << ((lBytePosition % 4) * 8);
                lBytePosition++;
                lByteCount++;
            }
            lWordArray[lBytePosition >> 2] |= 0x80 << ((lBytePosition % 4) * 8);
            lWordArray[((lWordCount * 16) - 2)] = string.length << 3;
            lWordArray[((lWordCount * 16) - 1)] = string.length >>> 29;
            return lWordArray;
        };
        const wordToHex = function(lValue) {
            let lByte, lCount;
            let sHexTemp = '';
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                sHexTemp += String.fromCharCode(48 + (lByte >> 4)) + String.fromCharCode(48 + (lByte & 0x0F));
            }
            return sHexTemp;
        };
        const x = convertToWordArray(str);
        let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
        const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        for (let k = 0; k < x.length; k += 16) {
            const AA = a, BB = b, CC = c, DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD);
        }
        return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
    }

    // ==================== HTTP 工具函数 ====================
    async function httpGet(url, params, timeout, extraHeaders={}) {
        const qs = Object.entries(params||{}).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        return (await httpRequestWithRetry(full, {method:'GET', timeout, headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders}})).body;
    }

    async function httpGetRedirect(url, params, timeout, extraHeaders={}) {
        const qs = Object.entries(params||{}).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        try {
            const resp = await httpFetch(full, {method:'GET', timeout, headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders}, follow_max: 0});
            if (resp.statusCode === 302 || resp.statusCode === 301) {
                const location = resp.headers && (resp.headers.location || resp.headers.Location);
                if (location) return location;
            }
            return (await httpRequestWithRetry(full, {method:'GET', timeout, headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders}})).body;
        } catch (e) {
            throw new Error(`httpGetRedirect失败: ${e.message}`);
        }
    }

    function httpPost(url, data, timeout, headers) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                body: typeof data === 'string' ? data : JSON.stringify(data),
                timeout: timeout || CONFIG.REQUEST_TIMEOUT,
                headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
            };
            request(url, options, (err, res) => {
                if (err) return reject(err);
                try {
                    const body = res.body;
                    if (typeof body === 'string') {
                        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
                    } else { resolve(body); }
                } catch (e) { reject(e); }
            });
        });
    }

    const httpFetch = function(url, options) {
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
    };

    function delay(ms) { return new Promise(r => setTimeout(r, ms || 100)); }

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

    function withTimeout(promise, ms, errorMsg) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(errorMsg || '请求超时')), ms);
            promise.then(resolve, reject).finally(() => clearTimeout(timer));
        });
    }

    // ==================== URL 提取与验证工具 ====================
    function extractUrl(data, source) {
        if (!data) return null;
        if (typeof data === 'string' && HTTP_REGEX.test(data)) return data;
        if (typeof data === 'object') {
            const fields = ['url', 'music_url', 'play_url', 'source_url', 'download_url', 'data', 'result', 'music', 'src'];
            for (const field of fields) {
                if (data[field] && typeof data[field] === 'string' && HTTP_REGEX.test(data[field])) {
                    return data[field];
                }
            }
        }
        return null;
    }

    function validateUrl(url, source) {
        if (!url || typeof url !== 'string') throw new Error(`${source}: 无效URL`);
        if (!HTTP_REGEX.test(url)) throw new Error(`${source}: URL格式错误`);
        return url;
    }

    async function validateAudioUrl(url, timeout) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout || 5000);
            const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timer);
            return resp.ok;
        } catch (e) { return false; }
    }

    // ==================== 试听检测 ====================
    function hasFreeTrialFlag(resp) {
        if (!resp) return false;
        if (resp.freeTrialInfo) return true;
        if (resp.freeTrialInfo === undefined) {
            const fields = ['freeTrialInfo', 'freeTrial', 'isTrial', 'is_free_trial', 'trial'];
            for (const field of fields) {
                if (resp[field] !== undefined && resp[field] !== null && resp[field] !== false) return true;
            }
        }
        if (resp.code === 403) return true;
        return false;
    }

    async function isTrialUrlBySize(url) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timer);
            if (resp.ok) {
                const cl = resp.headers.get('content-length');
                if (cl) {
                    const size = parseInt(cl);
                    if (size < 500000) {
                        console.warn(`[试听检测] 文件大小 ${size} bytes 过小，判定为试听`);
                        return true;
                    }
                }
            }
        } catch (e) {}
        return false;
    }

    async function isTrialSong(resp, url) {
        if (hasFreeTrialFlag(resp)) return true;
        if (url && url.includes('/ymusic/')) {
            console.warn(`[试听检测] URL 包含 /ymusic/ 特征，判定为试听: ${url}`);
            return true;
        }
        if (url) {
            const sizeCheck = await isTrialUrlBySize(url);
            if (sizeCheck) return true;
        }
        return false;
    }

    // ==================== 网易云加密工具 ====================
    const NeteaseCrypto = {
        weapiEncrypt: function(data) {
            const text = JSON.stringify(data);
            const secKey = this.generateSecretKey(16);
            const encText = this.aesEncrypt(this.aesEncrypt(text, '0CoJUm6Qyw8W8jud'), secKey);
            const encSecKey = this.rsaEncrypt(secKey);
            return { params: encText, encSecKey: encSecKey };
        },
        eapiEncrypt: function(url, data) {
            const text = JSON.stringify(data);
            const message = `nobody${url}use${text}md5forencrypt`;
            const digest = md5(message);
            const combined = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
            return { params: this.aesEncrypt(combined, 'e82ckenh8dichen8') };
        },
        aesEncrypt: function(text, key, iv, mode) {
            const actualIv = iv || '0102030405060708';
            const actualMode = mode || 'AES-CBC';
            const cipher = this.createCipher(actualMode, key, actualIv);
            return cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
        },
        rsaEncrypt: function(text) {
            if (typeof BigInt === 'undefined') {
                console.warn('[NeteaseCrypto] BigInt 不可用，RSA加密返回空');
                return '';
            }
            try {
                const key = '010001';
                const modulus = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
                let result = BigInt(0);
                for (let i = text.length - 1; i >= 0; i--) {
                    result = (result * BigInt(256) + BigInt(text.charCodeAt(i))) % BigInt('0x' + modulus);
                }
                const base = BigInt('0x' + key);
                result = this.modPow(result, base, BigInt('0x' + modulus));
                const hex = result.toString(16);
                return hex.padStart(256, '0');
            } catch (e) {
                console.error('[NeteaseCrypto] RSA加密失败:', e.message);
                return '';
            }
        },
        modPow: function(base, exponent, modulus) {
            if (typeof BigInt === 'undefined') return BigInt(0);
            let result = BigInt(1);
            base = base % modulus;
            while (exponent > 0) {
                if (exponent % BigInt(2) === BigInt(1)) {
                    result = (result * base) % modulus;
                }
                exponent = exponent >> BigInt(1);
                base = (base * base) % modulus;
            }
            return result;
        },
        md5: md5,
        generateSecretKey: function(length) {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },
        createCipher: function(algorithm, key, iv) {
            return {
                update: (data, inputEncoding, outputEncoding) => data,
                final: (outputEncoding) => ''
            };
        }
    };

    // ==================== 工具函数：获取歌曲ID ====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        switch (platform) {
            case 'kg':
                return info.hash || info.songmid || info.id || (meta && (meta.hash || meta.songmid || meta.id));
            case 'tx': {
                const qqMeta = meta.qq || {};
                const mid = qqMeta.mid || meta.mid || info.songmid || (SafeUtils.isString(info.id) && !/^\d+$/.test(info.id) ? info.id : null);
                if (mid) return mid;
                const songid = qqMeta.songid || meta.songid || info.id;
                if (songid) return songid;
                for (const field of ['hash', 'songmid', 'id', 'songId', 'rid', 'cid', 'sid']) {
                    if (info[field]) return info[field];
                }
                return null;
            }
            case 'wy':
                return info.songmid || info.id || meta.songmid || meta.id || meta.song_id || info.trackId;
            case 'kw':
                return info.id || info.songmid || info.hash || info.rid || meta.id || meta.rid;
            case 'mg':
                return info.id || info.songmid || info.cid || meta.id || meta.cid;
            default:
                return info.id || info.songmid || info.hash;
        }
    }

    function getQQSongId(songInfo) {
        const info = songInfo || {};
        const id = info.id || info.songmid;
        if (!id) return null;
        if (typeof id === 'string' && id.length === 14) return { type: 'mid', value: id };
        return { type: 'songid', value: id };
    }

    // ==================== qorg 完整回退链（来自 9.0.9）====================
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error(`qorg: 不支持平台 ${platform}，仅支持 wy/wycloudmusic`);
        }

        const info = songInfo || {}, meta = info.meta || {};
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid && platform === 'wy') sid = meta.songmid || meta.id || info.songmid;
        if (!sid && platform === 'wycloudmusic') sid = info.songmid || info.id || meta.id;
        if (!sid) sid = info.trackId || info.song_id || info.track_id;
        if (!sid) sid = meta.trackId || meta.song_id || meta.track_id;

        if (!sid) {
            const keyword = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
            if (keyword) {
                console.warn(`[qorg] ID缺失，尝试搜索补全: ${keyword} ${singer}`);
                try {
                    const searchRes = await qorgSearch(keyword, 1, 5);
                    if (searchRes && searchRes.list && searchRes.list.length > 0) {
                        let match = searchRes.list[0];
                        if (singer) {
                            const better = searchRes.list.find(item =>
                                (item.singer || '').includes(singer) || singer.includes(item.singer || '')
                            );
                            if (better) match = better;
                        }
                        let foundId = match.id || match.songmid;
                        if (typeof foundId === 'object' && foundId !== null) {
                            foundId = foundId.id || foundId.songmid || foundId;
                        }
                        if (typeof foundId === 'number') foundId = String(foundId);
                        if (typeof foundId === 'string' && foundId && foundId !== 'undefined' && foundId !== 'null') {
                            sid = foundId;
                            console.log(`[qorg] 搜索补全 ID: ${sid} (${match.name} - ${match.singer})`);
                        }
                    }
                } catch (e) { console.warn('[qorg] 搜索补全失败:', e.message); }
            }
        }

        if (!sid) throw new Error('qorg: 缺少歌曲ID，且搜索补全未成功');
        sid = String(sid).trim();
        if (!sid || sid === 'undefined' || sid === 'null') throw new Error('qorg: 无效的歌曲ID');

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000, 'hires': 999000, 'Hi-Res': 999000, 'jymaster': 999000, 'jyeffect': 999000, 'sky': 999000, 'dolby': 999000 };
        const br = brMap[quality] || 320000;
        const levelMap = { '128k': 'standard', '192k': 'higher', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'lossless', 'hires': 'hires', 'Hi-Res': 'Hi-Res', 'jyeffect': 'jyeffect', 'sky': 'sky', 'dolby': 'dolby', 'jymaster': 'jymaster' };
        const level = levelMap[quality] || 'exhigh';

        // 第一重：不加密接口
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                const trial = await isTrialSong(res.data[0], res.data[0].url);
                if (!trial) return validateUrl(res.data[0].url, 'qorg');
                else throw new Error('试听歌曲（不加密）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] 不加密接口失败:', e.message, '→ 尝试 weapi');
        }

        // 第二重：weapi
        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                const trial = await isTrialSong({}, url);
                if (!trial) return validateUrl(url, 'qorg (weapi)');
                else throw new Error('试听歌曲（weapi）');
            }
        } catch (e) {
            console.warn('[qorg] weapi 失败:', e.message, '→ 尝试 eapi');
        }

        // 第三重：eapi
        try {
            const d = { ids: `[${sid}]`, br: br };
            const eapiUrl = '/api/song/enhance/player/url';
            const eapiData = freelistenWyEapi(eapiUrl, d);
            let cookie = 'os=pc';
            if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
            const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
            const resp = await httpFetch(targetUrl, {
                method: 'POST', form: eapiData, headers: { cookie }
            });
            const resData = resp.body;
            if (!resData?.data || !resData.data[0]) throw new Error('eapi返回数据格式异常');
            const { url, freeTrialInfo } = resData.data[0];
            if (url && !freeTrialInfo) {
                const trial = await isTrialSong(resData.data[0], url);
                if (!trial) return validateUrl(url, 'qorg (eapi)');
                else throw new Error('试听歌曲（eapi）');
            }
            throw new Error(resData?.message || freeTrialInfo ? '试听歌曲' : '无URL');
        } catch (e) {
            console.warn('[qorg] eapi 失败:', e.message, '→ 尝试 /song/url/v1');
        }

        // 第四重：/song/url/v1
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${sid}&level=${level}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let v1Url = null;
            if (res?.code === 200) {
                if (res.data?.url) v1Url = res.data.url;
                else if (Array.isArray(res.data) && res.data[0]?.url) v1Url = res.data[0].url;
            }
            if (v1Url) {
                const trial = await isTrialSong(res.data, v1Url);
                if (!trial) return validateUrl(v1Url, 'qorg (v1)');
                else throw new Error('试听歌曲（v1）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] /song/url/v1 失败:', e.message, '→ 尝试 /song/url/v1/302');
        }

        // 第五重：302 跳转
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1/302?id=${sid}`;
            const redirectUrl = await httpGetRedirect(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (redirectUrl && redirectUrl.startsWith('http')) {
                const trial = await isTrialSong({}, redirectUrl);
                if (!trial) return validateUrl(redirectUrl, 'qorg (v1/302)');
                else throw new Error('试听歌曲（302）');
            }
            throw new Error('302跳转无有效URL');
        } catch (e) {
            console.warn('[qorg] /song/url/v1/302 失败:', e.message, '→ 尝试 lossless');
        }

        // 第六重：lossless
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${sid}&level=lossless`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let v1Url = null;
            if (res?.code === 200) {
                if (res.data?.url) v1Url = res.data.url;
                else if (Array.isArray(res.data) && res.data[0]?.url) v1Url = res.data[0].url;
            }
            if (v1Url) {
                const trial = await isTrialSong(res.data, v1Url);
                if (!trial) return validateUrl(v1Url, 'qorg (v1 lossless)');
                else throw new Error('试听歌曲（lossless）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] /song/url/v1 (lossless) 失败:', e.message, '→ 尝试 多ID');
        }

        // 第七重：多ID
        try {
            const idsParam = `${sid},${sid}`;
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${idsParam}&level=${level}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let v1Url = null;
            if (res?.code === 200) {
                if (res.data?.url) v1Url = res.data.url;
                else if (Array.isArray(res.data) && res.data[0]?.url) v1Url = res.data[0].url;
            }
            if (v1Url) {
                const trial = await isTrialSong(res.data, v1Url);
                if (!trial) return validateUrl(v1Url, 'qorg (v1 multi-id)');
                else throw new Error('试听歌曲（多ID）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] /song/url/v1 (多ID) 失败:', e.message, '→ 尝试 standard');
        }

        // 第八重：低音质降级
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${sid}&level=standard`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let v1Url = null;
            if (res?.code === 200) {
                if (res.data?.url) v1Url = res.data.url;
                else if (Array.isArray(res.data) && res.data[0]?.url) v1Url = res.data[0].url;
            }
            if (v1Url) {
                const trial = await isTrialSong(res.data, v1Url);
                if (!trial) return validateUrl(v1Url, 'qorg (v1 standard)');
                else throw new Error('试听歌曲（standard）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] /song/url/v1 (standard) 失败:', e.message, '→ 尝试 /music/url');
        }

        // 第九重：/music/url
        try {
            const url = `${CONFIG.QORG_API_URL}/music/url`;
            const res = await httpGet(url, { id: sid, type: 'wy', br: br }, CONFIG.REQUEST_TIMEOUT);
            const finalUrl = extractUrl(res?.data?.url || res?.url || res, 'qorg alternative');
            if (finalUrl) {
                const validated = validateUrl(finalUrl, 'qorg (music/url)');
                const trial = await isTrialSong({}, finalUrl);
                if (!trial) return validated;
                else throw new Error('试听歌曲（music/url）');
            }
            throw new Error('无有效URL');
        } catch (e) {
            console.warn('[qorg] /music/url 失败:', e.message);
        }

        // 第十重：跨平台终极兜底
        try {
            console.log('[qorg] 所有方式失败，尝试跨平台终极兜底');
            const sourcePriority = ['tx', 'kw', 'kg'];
            for (const source of sourcePriority) {
                try {
                    const res = await httpGet(`${CONFIG.QORG_API_URL}/music/url`, {
                        type: source, id: sid, br: br
                    }, 10000);
                    const finalUrl = extractUrl(res?.data?.url || res?.url || res, 'qorg cross-platform');
                    if (finalUrl) {
                        const validated = validateUrl(finalUrl, 'qorg (cross-platform)');
                        const trial = await isTrialSong({}, finalUrl);
                        if (!trial) return validated;
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.warn('[qorg] 跨平台终极兜底失败:', e.message);
        }

        throw new Error('qorg: 所有获取方式均失败或均为试听片段');
    }

    // ==================== qorg 搜索 ====================
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        const cacheKey = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) return cached;
        const res = await httpGet(CONFIG.QORG_API_URL + '/search', { keywords: keyword, limit: pageSize }, 15000);
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (res && res.data) list = Array.isArray(res.data) ? res.data : (res.data.list || res.data.songs || []);
        const total = res?.data?.total || list.length;
        if (list.length > 0) {
            const result = {
                isEnd: list.length < pageSize,
                list: list.map((item, index) => ({
                    id: String(item.id || ''), songmid: item.id || item.songmid,
                    name: item.name || item.title || '未知歌曲',
                    singer: item.singer || item.artist || '',
                    albumName: item.album || item.albumname || '',
                    duration: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                    pic: item.pic || item.cover || '',
                    _source: 'qorg'
                })),
                total, page, limit: pageSize
            };
            state.searchCache.set(cacheKey, result);
            return result;
        }
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }

    // ==================== Free listen 网易云 (weapi + eapi) ====================
    function freelistenWyEapi(url, object) {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const message = `nobody${url}use${text}md5forencrypt`;
        const digest = md5(message);
        const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
        if (utils && utils.crypto && SafeUtils.isFunction(utils.crypto.aesEncrypt) && utils.buffer) {
            try {
                const encrypted = utils.crypto.aesEncrypt(data, 'aes-128-ecb', eapiKey, '');
                if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
                    return { params: utils.buffer.bufToString(encrypted, 'hex').toUpperCase() };
                }
            } catch(e) {}
        }
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += ('0' + data.charCodeAt(i).toString(16)).slice(-2);
        }
        return { params: result.toUpperCase() };
    }

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
            } catch(e) { return null; }
        }
        return null;
    }

    async function freelistenWyWeapiRequest(data) {
        const enc = freelistenWyWeapi(data);
        if (!enc) return null;
        const weapiUrl = 'https://interface3.music.163.com/weapi/song/enhance/player/url';
        let cookie = 'os=pc';
        if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
        const resp = await httpFetch(weapiUrl, {
            method: 'POST', form: enc, headers: { cookie }
        });
        const body = resp.body;
        if (body?.code === 200 && body.data?.[0]?.url && !body.data[0].freeTrialInfo) {
            return validateUrl(body.data[0].url, 'Free listen 网易云 (weapi)');
        }
        throw new Error(body?.message || 'weapi 获取失败');
    }

    // ==================== wyqlm 获取播放地址（来自 9.0.9）====================
    async function wyqlmGetMusicUrl(songInfo, quality) {
        const info = songInfo || {}, meta = info.meta || {};
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid) sid = meta.songmid || meta.id || info.songmid;
        if (!sid) sid = info.trackId || info.song_id || info.track_id;
        if (!sid) sid = meta.trackId || meta.song_id || meta.track_id;

        if (!sid) {
            const keyword = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
            if (keyword) {
                console.warn(`[wyqlm] ID缺失，尝试搜索补全: ${keyword} ${singer}`);
                try {
                    const searchRes = await qorgSearch(keyword, 1, 5);
                    if (searchRes && searchRes.list && searchRes.list.length > 0) {
                        let match = searchRes.list[0];
                        if (singer) {
                            const better = searchRes.list.find(item =>
                                (item.singer || '').includes(singer) || singer.includes(item.singer || '')
                            );
                            if (better) match = better;
                        }
                        let foundId = match.id || match.songmid;
                        if (typeof foundId === 'object' && foundId !== null) {
                            foundId = foundId.id || foundId.songmid || foundId;
                        }
                        if (typeof foundId === 'number') foundId = String(foundId);
                        if (typeof foundId === 'string' && foundId && foundId !== 'undefined' && foundId !== 'null') {
                            sid = foundId;
                            console.log(`[wyqlm] 搜索补全 ID: ${sid} (${match.name} - ${match.singer})`);
                        }
                    }
                } catch (e) { console.warn('[wyqlm] 搜索补全失败:', e.message); }
            }
        }

        if (!sid) throw new Error('wyqlm: 缺少歌曲ID，且搜索补全未成功');
        sid = String(sid).trim();
        if (!sid || sid === 'undefined' || sid === 'null') throw new Error('wyqlm: 无效的歌曲ID');

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000, 'hires': 999000, 'Hi-Res': 999000, 'jymaster': 999000, 'jyeffect': 999000, 'sky': 999000, 'dolby': 999000 };
        const br = brMap[quality] || 320000;

        try {
            const url = `${CONFIG.WYQLM_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                const trial = await isTrialSong(res.data[0], res.data[0].url);
                if (!trial) return validateUrl(res.data[0].url, 'wyqlm');
                else throw new Error('试听歌曲');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[wyqlm] 不加密接口失败:', e.message, '→ 尝试 weapi');
        }

        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                const trial = await isTrialSong({}, url);
                if (!trial) return validateUrl(url, 'wyqlm (weapi)');
                else throw new Error('试听歌曲（weapi）');
            }
        } catch (e) {
            console.warn('[wyqlm] weapi 失败:', e.message, '→ 尝试 eapi');
        }

        try {
            const d = { ids: `[${sid}]`, br: br };
            const eapiUrl = '/api/song/enhance/player/url';
            const eapiData = freelistenWyEapi(eapiUrl, d);
            let cookie = 'os=pc';
            if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
            const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
            const resp = await httpFetch(targetUrl, {
                method: 'POST', form: eapiData, headers: { cookie }
            });
            const resData = resp.body;
            if (!resData?.data || !resData.data[0]) throw new Error('eapi返回数据格式异常');
            const { url, freeTrialInfo } = resData.data[0];
            if (url && !freeTrialInfo) {
                const trial = await isTrialSong(resData.data[0], url);
                if (!trial) return validateUrl(url, 'wyqlm (eapi)');
                else throw new Error('试听歌曲（eapi）');
            }
            throw new Error(resData?.message || freeTrialInfo ? '试听歌曲' : '无URL');
        } catch (e) {
            console.warn('[wyqlm] eapi 失败:', e.message);
        }

        throw new Error('wyqlm: 所有获取方式均失败或均为试听片段');
    }

    // ==================== 音源处理函数（独立运行，互不干扰）====================

    // --- GD音乐台 ---
    async function gdGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('GD音乐台: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.GD_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, 'GD音乐台');
        if (url) return validateUrl(url, 'GD音乐台');
        throw new Error('GD音乐台: 无数据');
    }

    // --- CHKSZ (非常刀) ---
    async function chkszGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('非常刀: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.CHKSZ_API, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '非常刀');
        if (url) return validateUrl(url, '非常刀');
        throw new Error('非常刀: 无数据');
    }

    // --- 肥猫 ---
    async function feimaoGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('肥猫: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.FEIMAO_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '肥猫');
        if (url) return validateUrl(url, '肥猫');
        throw new Error('肥猫: 无数据');
    }

    // --- 小熊猫 ---
    async function xiaoxiongmaoGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('小熊猫: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.XIAOXIONGMAO_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '小熊猫');
        if (url) return validateUrl(url, '小熊猫');
        throw new Error('小熊猫: 无数据');
    }

    // --- 梓澄公益 ---
    async function zichengGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('梓澄公益: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.ZICHENG_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '梓澄公益');
        if (url) return validateUrl(url, '梓澄公益');
        throw new Error('梓澄公益: 无数据');
    }

    // --- 無名 ---
    async function wumingGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('無名: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.WUMING_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '無名');
        if (url) return validateUrl(url, '無名');
        throw new Error('無名: 无数据');
    }

    // --- 六音 ---
    async function liuyinGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('六音: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.LIUYIN_API_URL, { types: 'url', id: id, type: xinghaiPlatform, br: br }, 10000);
        const url = extractUrl(res, '六音');
        if (url) return validateUrl(url, '六音');
        throw new Error('六音: 无数据');
    }

    // --- 星海主站 ---
    async function xinghaiMainGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('星海主: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const params = Object.assign({}, CONFIG.XINGHAI_MAIN_PARAMS, { id: id, type: xinghaiPlatform, br: br });
        const res = await httpGet(CONFIG.XINGHAI_MAIN_URL, params, 10000);
        const url = extractUrl(res, '星海主');
        if (url) return validateUrl(url, '星海主');
        throw new Error('星海主: 无数据');
    }

    // --- 星海备站 ---
    async function xinghaiBackupGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('星海备: 缺少歌曲ID');
        const xinghaiPlatform = PLATFORM_TO_XINGHAI[platform] || platform;
        const res = await httpGet(CONFIG.XINGHAI_BACKUP_URL, { types: 'url', id: id, type: xinghaiPlatform, br: QUALITY_TO_BR[quality] || '320' }, 10000);
        const url = extractUrl(res, '星海备');
        if (url) return validateUrl(url, '星海备');
        throw new Error('星海备: 无数据');
    }

    // --- 长青SVIP ---
    async function changqingGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('长青SVIP: 缺少歌曲ID');
        const template = CONFIG.CHANGQING_URL_TEMPLATES[platform];
        if (!template) throw new Error('长青SVIP: 不支持的平台');
        const levelMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': 'flac', 'flac24bit': 'flac24bit' };
        const level = levelMap[quality] || '320';
        const url = template.replace(/\{id\}/g, id).replace(/\{level\}/g, level);
        const res = await httpGet(url, {}, 10000);
        const musicUrl = extractUrl(res, '长青SVIP');
        if (musicUrl) return validateUrl(musicUrl, '长青SVIP');
        throw new Error('长青SVIP: 无数据');
    }

    // --- 念心SVIP ---
    async function nianxinGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('念心SVIP: 缺少歌曲ID');
        const template = CONFIG.NIANXIN_URL_TEMPLATES[platform];
        if (!template) throw new Error('念心SVIP: 不支持的平台');
        const levelMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': 'flac', 'flac24bit': 'flac24bit' };
        const level = levelMap[quality] || '320';
        const url = template.replace(/\{id\}/g, id).replace(/\{level\}/g, level);
        const res = await httpGet(url, {}, 10000);
        const musicUrl = extractUrl(res, '念心SVIP');
        if (musicUrl) return validateUrl(musicUrl, '念心SVIP');
        throw new Error('念心SVIP: 无数据');
    }

    // --- 溯音 QQ ---
    async function suyinQQGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'tx') throw new Error('溯音QQ: 仅支持QQ音乐');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('溯音QQ: 缺少歌曲ID');
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.SUYIN_QQ_API, { key: CONFIG.SUYIN_QQ_KEY, id: id, br: br }, 10000);
        const url = extractUrl(res, '溯音QQ');
        if (url) return validateUrl(url, '溯音QQ');
        throw new Error('溯音QQ: 无数据');
    }

    // --- 溯音 163 ---
    async function suyin163GetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy') throw new Error('溯音163: 仅支持网易云');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('溯音163: 缺少歌曲ID');
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.SUYIN_163_API, { key: CONFIG.SUYIN_QQ_KEY, id: id, br: br }, 10000);
        const url = extractUrl(res, '溯音163');
        if (url) return validateUrl(url, '溯音163');
        throw new Error('溯音163: 无数据');
    }

    // --- 溯音 酷我 ---
    async function suyinKuwoGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'kw') throw new Error('溯音酷我: 仅支持酷我');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('溯音酷我: 缺少歌曲ID');
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.SUYIN_KUWO_API, { key: CONFIG.SUYIN_QQ_KEY, id: id, br: br }, 10000);
        const url = extractUrl(res, '溯音酷我');
        if (url) return validateUrl(url, '溯音酷我');
        throw new Error('溯音酷我: 无数据');
    }

    // --- 溯音 咪咕 ---
    async function suyinMiguGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'mg') throw new Error('溯音咪咕: 仅支持咪咕');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('溯音咪咕: 缺少歌曲ID');
        const res = await httpGet(CONFIG.SUYIN_MIGU_API, { id: id, br: QUALITY_TO_BR[quality] || '320' }, 10000);
        const url = extractUrl(res, '溯音咪咕');
        if (url) return validateUrl(url, '溯音咪咕');
        throw new Error('溯音咪咕: 无数据');
    }

    // --- ikun (通用) ---
    async function ikunGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('ikun: 缺少歌曲ID');
        const ikunPlatform = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.IKUN_API_URL, { server: 'netease', type: 'url', id: id, platform: ikunPlatform, br: br }, 10000);
        const url = extractUrl(res, 'ikun');
        if (url) return validateUrl(url, 'ikun');
        throw new Error('ikun: 无数据');
    }

    // --- ikun香港 ---
    async function ikunHKGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('ikunHK: 缺少歌曲ID');
        const ikunPlatform = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.IKUN_HK_API_URL, { server: 'netease', type: 'url', id: id, platform: ikunPlatform, br: br }, 10000);
        const url = extractUrl(res, 'ikunHK');
        if (url) return validateUrl(url, 'ikunHK');
        throw new Error('ikunHK: 无数据');
    }

    // --- 野草 (仅酷我) ---
    async function yecaoGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'kw') throw new Error('野草: 仅支持酷我');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('野草: 缺少歌曲ID');
        const res = await httpGet(CONFIG.YECAO_API, { id: id }, 10000);
        const url = extractUrl(res, '野草');
        if (url) return validateUrl(url, '野草');
        throw new Error('野草: 无数据');
    }

    // --- fish (通用) ---
    async function fishGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('fish: 缺少歌曲ID');
        const platformMap = { tx: 'qq', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const fishPlatform = platformMap[platform] || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(CONFIG.FISH_API_URL, { server: 'netease', type: 'url', id: id, platform: fishPlatform, br: br }, 10000);
        const url = extractUrl(res, 'fish');
        if (url) return validateUrl(url, 'fish');
        throw new Error('fish: 无数据');
    }

    // --- qorg (网易云完整回退链) ---
    async function qorgHandlerGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error('qorg: 仅支持网易云音乐');
        }
        return await qorgGetMusicUrl(platform, songInfo, quality);
    }

    // --- wyqlm (网易云) ---
    async function wyqlmHandlerGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error('wyqlm: 仅支持网易云音乐');
        }
        return await wyqlmGetMusicUrl(songInfo, quality);
    }

    // --- 网易云官方API ---
    async function neteaseOfficialGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') throw new Error('网易云官方: 仅支持网易云');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('网易云官方: 缺少歌曲ID');
        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000 };
        const br = brMap[quality] || 320000;
        try {
            const enc = NeteaseCrypto.weapiEncrypt({ ids: `[${id}]`, br: br });
            const resp = await httpFetch(CONFIG.NETEASE_API_URL + '/weapi/song/enhance/player/url', {
                method: 'POST', form: enc, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const resData = resp.body;
            if (resData?.code === 200 && resData.data?.[0]?.url && !resData.data[0].freeTrialInfo) {
                const trial = await isTrialSong(resData.data[0], resData.data[0].url);
                if (!trial) return validateUrl(resData.data[0].url, '网易云官方');
                throw new Error('试听歌曲');
            }
            throw new Error(resData?.message || '无数据');
        } catch (e) {
            try {
                const eapiEnc = NeteaseCrypto.eapiEncrypt('/api/song/enhance/player/url', { ids: `[${id}]`, br: br });
                const resp = await httpFetch(CONFIG.NETEASE_API_URL + '/eapi/song/enhance/player/url', {
                    method: 'POST', form: eapiEnc, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                const resData = resp.body;
                if (resData?.code === 200 && resData.data?.[0]?.url && !resData.data[0].freeTrialInfo) {
                    const trial = await isTrialSong(resData.data[0], resData.data[0].url);
                    if (!trial) return validateUrl(resData.data[0].url, '网易云官方(eapi)');
                    throw new Error('试听歌曲');
                }
                throw new Error(resData?.message || '无数据');
            } catch (e2) {
                throw new Error('网易云官方: 所有加密方式均失败');
            }
        }
    }

    // --- 汽水VIP ---
    async function qishuiGetMusicUrl(platform, songInfo, quality) {
        const id = getSongId(platform, songInfo);
        const name = (songInfo || {}).name || (songInfo || {}).title || '';
        const singer = (songInfo || {}).singer || (songInfo || {}).artist || '';
        if (!id && !name) throw new Error('汽水VIP: 缺少歌曲信息');
        const params = { id: id || '', name: name, singer: singer, br: QUALITY_TO_BR[quality] || '320' };
        try {
            const res = await httpGet(CONFIG.QISHUI_API_HTTPS, params, 10000);
            const url = extractUrl(res, '汽水VIP');
            if (url) return validateUrl(url, '汽水VIP');
            throw new Error('无数据');
        } catch (e) {
            try {
                const res = await httpGet(CONFIG.QISHUI_API_HTTP, params, 10000);
                const url = extractUrl(res, '汽水VIP');
                if (url) return validateUrl(url, '汽水VIP');
                throw new Error('无数据');
            } catch (e2) {
                throw new Error('汽水VIP: 所有接口均失败');
            }
        }
    }

    // --- 汽水VIP 搜索 ---
    async function qishuiSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };

        const cacheKey = `qishui_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;

        try {
            const res = await httpGet(CONFIG.QISHUI_API_HTTPS, { act: 'search', keywords: keyword, page, pagesize: pageSize, type: 'music' }, 15000);
            const lists = Array.isArray(res?.data?.lists) ? res.data.lists : (Array.isArray(res?.data) ? res.data : []);
            const list = lists.map((item, index) => ({
                singer: item.artists || item.singer || item.artist || '未知歌手',
                name: item.name || item.title || '未知歌曲',
                album: item.album || item.albumName || '',
                source: 'qsvip',
                songmid: String(item.id || item.vid || item.songmid || index),
                interval: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                img: item.cover || item.pic || '',
                lrc: null,
                hash: item.id || item.vid || item.songmid || String(index),
                albumId: item.albumId || '',
                lyricUrl: null
            }));

            const result = {
                isEnd: list.length < pageSize,
                list,
                total: res?.data?.total ? Number(res.data.total) : list.length,
                page,
                limit: pageSize
            };

            state.searchCache.set(cacheKey, result);
            return result;
        } catch (e) {
            console.warn('[汽水VIP] 搜索失败:', e.message);
            return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        }
    }

    // --- 汽水VIP 歌词 ---
    async function qishuiGetLyric(songInfo) {
        const songId = (songInfo || {}).songmid || (songInfo || {}).hash || (songInfo || {}).id;
        if (!songId) return { lyric: '' };

        try {
            const res = await httpGet(CONFIG.QISHUI_API_HTTPS, { act: 'song', id: String(songId) }, 15000);
            const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
            return { lyric: data?.lyric ? String(data.lyric) : '' };
        } catch (e) {
            console.warn('[汽水VIP] 歌词获取失败:', e.message);
            return { lyric: '' };
        }
    }

    // ==================== SourceHandler 类（来自 9.0.9）====================
    class SourceHandler {
        constructor(name, fn, priority, opts = {}) {
            this.name = name;
            this.fn = fn;
            this.priority = priority;
            this.timeout = opts.timeout || CONFIG.REQUEST_TIMEOUT;
            this.supportedPlatforms = opts.supportedPlatforms || [];
            this.needUrlValidation = opts.needUrlValidation !== false;
            this.cacheResults = opts.cacheResults !== false;
        }

        supportsPlatform(platform) {
            return this.supportedPlatforms.length === 0 || this.supportedPlatforms.includes(platform);
        }
    }

    // ==================== 音源处理器注册表 ====================
    const SOURCE_HANDLERS = [
        new SourceHandler('GD音乐台', gdGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('CHKSZ', chkszGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('肥猫', feimaoGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('小熊猫', xiaoxiongmaoGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('梓澄公益', zichengGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('無名', wumingGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('六音', liuyinGetMusicUrl, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('星海主', xinghaiMainGetMusicUrl, 9, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('星海备', xinghaiBackupGetMusicUrl, 9, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('长青SVIP', changqingGetMusicUrl, 8, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('念心SVIP', nianxinGetMusicUrl, 8, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('溯音QQ', suyinQQGetMusicUrl, 8, { supportedPlatforms: ['tx'] }),
        new SourceHandler('溯音163', suyin163GetMusicUrl, 8, { supportedPlatforms: ['wy'] }),
        new SourceHandler('溯音酷我', suyinKuwoGetMusicUrl, 8, { supportedPlatforms: ['kw'] }),
        new SourceHandler('溯音咪咕', suyinMiguGetMusicUrl, 8, { supportedPlatforms: ['mg'] }),
        new SourceHandler('ikun', ikunGetMusicUrl, 7, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('ikunHK', ikunHKGetMusicUrl, 7, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('野草', yecaoGetMusicUrl, 7, { supportedPlatforms: ['kw'] }),
        new SourceHandler('fish', fishGetMusicUrl, 7, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('qorg', qorgHandlerGetMusicUrl, 6, { supportedPlatforms: ['wy', 'wycloudmusic'] }),
        new SourceHandler('wyqlm', wyqlmHandlerGetMusicUrl, 6, { supportedPlatforms: ['wy', 'wycloudmusic'] }),
        new SourceHandler('网易云官方', neteaseOfficialGetMusicUrl, 5, { supportedPlatforms: ['wy', 'wycloudmusic'] }),
        new SourceHandler('汽水VIP', qishuiGetMusicUrl, 4, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] })
    ];

    // ==================== 获取指定平台的音源处理器 ====================
    function getHandlersForPlatform(platform) {
        return SOURCE_HANDLERS
            .filter(h => h.supportsPlatform(platform))
            .sort((a, b) => b.priority - a.priority);
    }

    // ==================== 终极兜底 ====================
    async function ultimateFallback(platform, songInfo, quality) {
        console.log('[终极兜底] 所有音源均失败，尝试终极兜底方案');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('终极兜底: 无法获取歌曲ID');
        const fallbackPlatforms = ['tx', 'wy', 'kw', 'kg', 'mg'].filter(p => p !== platform);
        for (const fp of fallbackPlatforms) {
            try {
                const handlers = getHandlersForPlatform(fp);
                for (const handler of handlers) {
                    try {
                        const url = await withTimeout(handler.fn(fp, songInfo, quality), 8000, `${handler.name}: 超时`);
                        if (url) {
                            console.log(`[终极兜底] ${handler.name} 成功获取 (跨平台: ${fp})`);
                            return url;
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }
        throw new Error('终极兜底: 失败');
    }

    // ==================== 核心：并发获取URL（成功即停 + 缓存）====================
    async function getUrlWithFallback(platform, musicInfo, quality) {
        state.stats.requests++;
        const cacheKey = SafeUtils.buildCacheKey('url', musicInfo, quality);

        // 检查缓存
        const cached = state.urlCache.get(cacheKey);
        if (cached && cached.url && (Date.now() - cached.time < CONFIG.CACHE_TTL_URL)) {
            state.stats.hits++;
            console.log(`[缓存命中] ${cached.source} → ${cached.url.substring(0, 80)}...`);
            return cached.url;
        }
        state.stats.misses++;

        const handlers = getHandlersForPlatform(platform);
        let lastError = null;
        let aborted = false;

        // 并发请求所有音源，成功即停
        const promises = handlers.map(async (handler) => {
            let retries = 0;
            while (retries <= CONFIG.MAX_RETRIES && !aborted) {
                try {
                    if (aborted) throw new Error('已中止');
                    const url = await withTimeout(
                        handler.fn(platform, musicInfo, quality),
                        handler.timeout,
                        `${handler.name}: 超时`
                    );
                    if (url && !aborted) {
                        aborted = true;
                        // 缓存结果
                        state.urlCache.set(cacheKey, { url, source: handler.name, time: Date.now() });
                        // 清理过期缓存
                        if (state.urlCache.size > CONFIG.CACHE_MAX_SIZE) {
                            const oldestKey = [...state.urlCache.entries()]
                                .sort((a, b) => a[1].time - b[1].time)[0][0];
                            state.urlCache.delete(oldestKey);
                        }
                        state.stats.success++;
                        console.log(`[${handler.name}] 成功获取 → ${url.substring(0, 80)}...`);
                        return url;
                    }
                    throw new Error('无有效URL');
                } catch (e) {
                    if (aborted) throw new Error('已中止');
                    lastError = e;
                    if (retries < CONFIG.MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY));
                    }
                    retries++;
                }
            }
            if (!aborted) {
                console.warn(`[${handler.name}] 失败: ${lastError ? lastError.message : '未知错误'}`);
            }
            throw lastError || new Error(`${handler.name}: 失败`);
        });

        // 竞争：只要有一个成功就返回
        try {
            const result = await Promise.any(promises);
            return result;
        } catch (e) {
            console.warn('[聚合音源] 所有音源均失败，启动终极兜底...');
            try {
                const url = await ultimateFallback(platform, musicInfo, quality);
                if (url) {
                    state.urlCache.set(cacheKey, { url, source: '终极兜底', time: Date.now() });
                    state.stats.success++;
                    return url;
                }
            } catch (ue) {
                console.error('[终极兜底] 失败:', ue.message);
            }
            state.stats.fail++;
            throw new Error('所有音源和兜底方案均失败');
        }
    }

    // ==================== 预加载管理器（来自 7.0.7）====================
    const PreloadManager = {
        enabled: CONFIG.PRELOAD_ENABLED,
        queue: [],
        maxSize: CONFIG.PRELOAD_CACHE_SIZE,

        async preloadNext(musicInfo, platform) {
            if (!this.enabled || !musicInfo) return;
            const key = SafeUtils.buildCacheKey('preload', musicInfo, CONFIG.PRELOAD_QUALITY);
            if (state.preloadCache.has(key)) return;
            const cached = state.urlCache.get(key);
            if (cached && (Date.now() - cached.time < CONFIG.CACHE_TTL_URL)) return;
            this.queue.push({ musicInfo, platform, key, time: Date.now() });
            if (this.queue.length > this.maxSize * 2) {
                this.queue.sort((a, b) => b.time - a.time);
                this.queue.length = this.maxSize * 2;
            }
            this.processQueue();
        },

        async processQueue() {
            while (this.queue.length > 0) {
                const item = this.queue.shift();
                if (state.preloadCache.has(item.key)) continue;
                state.preloadCache.add(item.key);
                try {
                    await getUrlWithFallback(item.platform, item.musicInfo, CONFIG.PRELOAD_QUALITY);
                } catch (e) {
                    console.warn(`[预加载] 失败: ${e.message}`);
                }
                if (state.preloadCache.size > this.maxSize) {
                    const oldest = state.preloadCache.values().next().value;
                    state.preloadCache.delete(oldest);
                }
            }
        },

        clear() {
            this.queue = [];
            state.preloadCache.clear();
        }
    };

    // addToQueue 别名（对齐 9.0.9 命名）
    PreloadManager.addToQueue = PreloadManager.preloadNext;

    // ==================== 音源配置（来自 9.0.9）====================
    const sourceConfig = {
        tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        qorg: { name: 'qorg', type: 'music', actions: ['musicUrl', 'search'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        wyqlm: { name: 'wyqlm', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl', 'search', 'lyric'], qualitys: ['128k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] }
    };

    // ==================== 事件监听器 ====================
    function setupEventListener() {
        if (!on || typeof on !== 'function') {
            console.error('[聚合音源] on API 不可用，无法注册事件监听器');
            return;
        }

        on(EVENT_NAMES.request, async ({ action, source, info }) => {
            try {
                console.log(`[聚合音源] 收到请求: action=${action}, source=${source}`);

                // 处理 musicUrl 请求
                if (action === 'musicUrl') {
                    if (!info?.musicInfo) throw new Error('缺少歌曲信息');
                    const platform = (source || '').toLowerCase();
                    const quality = info.type || '320k';

                    if (!platform || !sourceConfig[platform]) {
                        return null;
                    }

                    const url = await getUrlWithFallback(platform, info.musicInfo, quality);

                    // 预加载下一首
                    if (CONFIG.PRELOAD_ENABLED && info.nextMusicInfo) {
                        PreloadManager.addToQueue(info.nextMusicInfo, info.type || CONFIG.PRELOAD_QUALITY);
                    }

                    if (url === '') {
                        return { url: '' };
                    }
                    return url;
                }

                // 处理 search 请求
                if (action === 'search') {
                    const keyword = info?.keyword || '';
                    const limit = Math.min(info?.limit || 20, 50);
                    const page = info?.page || 1;
                    const platform = (source || '').toLowerCase();

                    if (!keyword) throw new Error('需要搜索关键词');

                    const cacheKey = `search_${platform}_${keyword}_${page}_${limit}`;
                    const cached = state.searchCache.get(cacheKey);
                    if (cached) return cached;

                    let result;

                    if (platform === 'qsvip') {
                        result = await qishuiSearch(keyword, page, limit);
                    } else if (platform === 'qorg') {
                        result = await qorgSearch(keyword, page, limit);
                    } else {
                        const resp = await httpGet(`${CONFIG.QORG_API_URL}/search`, { keywords: keyword, limit }, CONFIG.REQUEST_TIMEOUT);
                        let list = [];
                        if (Array.isArray(resp)) list = resp;
                        else if (resp && resp.data) list = Array.isArray(resp.data) ? resp.data : (resp.data.list || resp.data.songs || []);
                        const total = resp?.data?.total || list.length;
                        result = {
                            isEnd: list.length < limit,
                            list: list.map((item, index) => ({
                                singer: item.singer || item.artist || '',
                                name: item.name || item.title || '未知歌曲',
                                album: item.album || item.albumname || '',
                                source: source,
                                songmid: item.id || item.songid || item.mid || String(index),
                                interval: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                                img: item.cover || item.picture || '',
                                lrc: null,
                                hash: item.hash || item.mid || item.id || String(index),
                                albumId: item.albumid || '',
                                lyricUrl: null
                            })),
                            total: total,
                            limit: limit,
                            page: page,
                            isEnd: list.length < limit
                        };
                    }

                    state.searchCache.set(cacheKey, result);
                    return result;
                }

                // 处理 lyric 请求
                if (action === 'lyric') {
                    const platform = (source || '').toLowerCase();
                    if (platform === 'qsvip') {
                        return qishuiGetLyric(info?.musicInfo || info?.lyricInfo || {});
                    }
                    throw new Error('不支持的操作: ' + action);
                }

                // 处理 preload 请求
                if (action === 'preload') {
                    if (info?.musicInfo) {
                        const quality = info.type || CONFIG.PRELOAD_QUALITY;
                        PreloadManager.addToQueue(info.musicInfo, quality);
                    }
                    return { success: true };
                }

                console.warn(`[聚合音源] 未知操作: ${action}`);
                return null;
            } catch (e) {
                console.error(`[聚合音源] 处理请求失败 [${action}]:`, e.message);
                return null;
            }
        });
    }

    // ==================== 发送公告 ====================
    function sendAnnouncement() {
        if (state.announcementSent) return;
        if (!send || typeof send !== 'function') {
            console.warn('[聚合音源] send API 不可用');
            return;
        }
        try {
            send(EVENT_NAMES.updateAlert, {
                title: ANNOUNCEMENT.title,
                content: ANNOUNCEMENT.content,
                version: ANNOUNCEMENT.version
            });
            state.announcementSent = true;
            console.log('[聚合音源] 公告已发送');
        } catch (e) {
            console.warn('[聚合音源] 发送公告失败:', e.message);
        }
    }

    // ==================== 初始化 ====================
    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;

        console.log('[聚合音源] 七零喵聚合音源 · 终极整合版 v1.0.0 初始化中...');
        console.log(`[聚合音源] 音源: ${Object.keys(sourceConfig).join(', ')}`);
        console.log(`[聚合音源] 处理器总数: ${SOURCE_HANDLERS.length}`);

        // 注册事件监听器
        setupEventListener();

        // 加载网易云Cookie
        if (storage && typeof storage.getItem === 'function') {
            try {
                const cookie = storage.getItem(CONFIG.NETEASE_COOKIE_KEY);
                if (cookie) state.wycloudCookie = cookie;
            } catch (e) {}
        }

        // 发送初始化完成事件（对齐 9.0.9 格式）
        try {
            send && send(EVENT_NAMES.inited, {
                openDevTools: false,
                sources: sourceConfig,
                status: { version: ANNOUNCEMENT.version }
            });
        } catch (e) {
            console.warn('[聚合音源] 发送 inited 事件失败:', e.message);
        }

        // 延迟发送公告
        setTimeout(sendAnnouncement, 2000);

        console.log('[聚合音源] v1.0.0 初始化完成');
        console.log(`[聚合音源] 支持平台: ${Object.keys(sourceConfig).join(', ')}`);
    }

    // ==================== 启动 ====================
    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));

    // 暴露全局API
    globalObj.qlm = globalObj.qlm || {};
    const qlm = globalObj.qlm;
    qlm.version = ANNOUNCEMENT.version;
    qlm.getUrl = getUrlWithFallback;
    qlm.search = qorgSearch;
    qlm.sourceConfig = sourceConfig;
    qlm.preload = PreloadManager;
    qlm.state = state;
    qlm.SOURCE_HANDLERS = SOURCE_HANDLERS;
    qlm.initialize = initialize;

    console.log('[聚合音源] v1.0.0 已加载');
})();