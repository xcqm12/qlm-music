/**
 * @name 七零喵聚合音源 · 旗舰整合版（v5.2 修复增强版）
 * @description 在 v5.1 基础上整合汽水VIP完整搜索/歌词、优化回退链、强化容错与性能。
 *              qorg 三重回退 + 终极兜底 api.qlm.org.cn，失败自动跳歌。
 * @version 7.1.2-ultimate-merged-v5.2-fix-enhanced
 * @author 七零喵团队 · 整合优化
 * @homepage https://github.com/xcqm12/qlm-music
 * @qqgroup 1006981142
 * @copyright 2026 七零喵团队 版权所有
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
                        rejectedCount++;
                        errors[index] = error;
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
        title: "七零喵聚合音源 · 旗舰整合版 v5.2 (修复增强版·最终)",
        content: "🔗 GitHub: https://github.com/xcqm12/qlm-music\n💬 交流群: 1006981142\n\n" +
                 "⚡ 架构: 3.7 多源引擎 + 4.1 智能降级 + 汽水VIP全功能\n" +
                 "🎯 网易云优先: 官方Cookie → wyqlm → qorg → fish → 星海主 → 星海备 → 非常刀 → 兜底\n" +
                 "🔒 加密: weapi/eapi 双保险，Cookie 增强，请求频率保护\n" +
                 "🔍 搜索: qorg / CHKSZ / 酷我 / 咪咕 / 星海备 / 汽水VIP 搜索\n" +
                 "📦 独立源 wyqlm / qsvip 可作为次要音源手动选用\n" +
                 "🛠️ 本版修复: freelisten/fish ID缺失、念心长青URL不可达、星海null字段、野花野草无URL、qorg/wyqlm多平台增强、失败自动跳歌\n" +
                 "© 2026 七零喵团队 版权所有",
        version: "7.1.2-ultimate-merged-v5.2-fix-enhanced",
        repo: "https://github.com/xcqm12/qlm-music",
        qqGroup: "1006981142",
        copyright: "© 2026 七零喵团队"
    });

    // ==================== 用户 Cookie 配置 ====================
    var NETEASE_CLOUD_COOKIE_KEY = "_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=25eb184d006e40a09ee3afb1b0b69c7e;_ntes_nnid=ca52af08faf87b9f2eda20485867f88c,1541325137215; _ntes_nuid=91b7619b9a61db5ed1a7382e35e0311f;_ntes_nnid=e0b8265473f1c7213e9a1452935723e7,1777688651463; _ntes_nuid=e0b8265473f1c7213e9a1452935723e7;";
    var NETEASE_OFFICIAL_COOKIE_KEY = "__remember_me=true; NMTID=00OOuabqph1TDgQmkqbrhQzuO44Iu4AAAGd5oAj2A; _ntes_nnid=e0b8265473f1c7213e9a1452935723e7,1777688651463; _ntes_nuid=e0b8265473f1c7213e9a1452935723e7; WEVNSM=1.0.0; WNMCID=lrlevv.1777688874921.01.0; WM_TID=Ap6oyS0WW%2FxAVVEVEQKS9%2BgskVvXcFT9; ntes_kaola_ad=1; ntes_utid=tid._.Az3mUDMnk2hBQlUFUEfG4r0phUuWxFTz._.0; sDeviceId=YD-ePU5TUzM9YtBEhFABFKT4qh8kR%2FXgVG3; NTES_P_UTID=nfA2V1NCcxjzJRGQAFLoSkxUMQhSEsNV|1777689810; P_INFO=m18505137906@163.com|1777689810|0|x19_developer|00&99|jis&1777504050&ntesgod_app#jis&320600#10#0#0|185906&1|ntesgod_app|18505137906@163.com; _iuqxldmzr_=32; timing_user_id=time_lw02HQTDKe; JSESSIONID-WYYY=XmCVJ6OoEHbwFyW96khuC5pOYEc8zrBJiUSO89KCFyBcRM26ZZFv1NI%5Cz9hMnFWKb%5CmIqU3oDhPaQpqXPYTmo6GXrQxC2sEWNHdzam7k6AeP4prkROcmN0uY%5CVGKPq1CkviJVXZ%2FNqNUzZb1lRKZ%2BAVibWU%5CaYjHDXU8KfVqKfPuXICb%3A1778298311092; __snaker__id=Usa1OMMymDpUWSq2; WM_NI=ZNwi7xA%2B4Pm0wPkMxHU%2FHqJH3SBPoieIHDBhzeLBKNPj7LeFY7Pz1vGx3QdiwNZPoE%2BPjVVclvdTmwHslK6p0SuldSzza%2BU0RoPPQLICAgubIYzEYdcZ3HIKlxh0xiOYU3o%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6ee92f94ba3a881b1f2609ba88ea3d44e978b9a83cb7b879dad8af22fedbb86adfc2af0fea7c3b92a9a92b98ab67483f5fcb1f03cb590a5aefb4497f18892c944f18d8eb1ee63a79788a5c164babb84a3ca4694b6f9ade84e9be9a09bb47e85a8fdb2e763b59296b1ee4fe990a6b7d569b0aaacb5f07d8cada4acb57cf48dbb8de759baa6afccd83c92b1a0b1d4488b9d8f88f86a8b87b6a6dc70a186fda9cc41b0a8a8d1fb638d879bd4ee37e2a3; gdxidpyhxdE=I9MswpgG6JbtomY7YBCyfIkGKPvfn%5Cu7RQwqkcmy46n6qu8JC8spDcD1TUqAQjgXWNOCpxoK6t1hixhPcrrDG2CHPrA0bI6sWqd1iz6T%5CU6N5QKnwm9GA%2FmYcPtiG4g4eJI7BQ%5Cw7wBmOZrGCcr%2FYzlfKeeSLgy%2Fd8ogTGZtYQPr97vv%3A1778297418262; __csrf=7947a5a7232f6a0a5b4242493247227e; MUSIC_U=00E5439FF4AAD0487F2016EF33FA989BD5F7E7F8DA17CA21A7A7F1416D175050C455428EECAF208399919AAB981C0CA1156CD4CA2AD679250F37A227A73FCCDF016075A893ECC308ABEBE1732D4F6BE032E38123E6517541C734CD6F175FE1F46106DBDDDAEEB1B59DAB71C7029A149C7C3D797489D2301602FA41D467509649D1AF74F6FFB0301DB3595421C70C3";

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
        },
        normalizeKeyword: function(keyword) {
            if (!keyword) return "";
            return String(keyword).replace(/\(\s*Live\s*\)/gi, "").replace(/[\(\（][^)\）]*[\)\）]/g, "")
                .replace(/【[^】]*】/g, "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, "")
                .replace(/[^\w\u4e00-\u9fa5]/g, "").trim().toLowerCase();
        },
        stringMatchScore: (str1, str2) => {
            if (!str1 || !str2) return 0;
            const s1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
            const s2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();
            if (s1 === s2) return 1.0;
            if (s1.includes(s2) || s2.includes(s1)) return 0.9;
            const maxLen = Math.max(s1.length, s2.length);
            let matches = 0;
            for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
                if (s1[i] === s2[i]) matches++;
            }
            return matches / maxLen;
        }
    };

    // ==================== 移植自星海 v2.3.0 的辅助函数 ====================
    function trimSpacesOnly(rawName) {
        if (!rawName) return '';
        return rawName.replace(/\s+/g, ' ').trim();
    }
    function removeBracketsContent(rawName) {
        if (!rawName) return '';
        let cleaned = rawName.replace(/[（(][^）)]*[）)]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
    function removeSpecialChars(rawName) {
        if (!rawName) return '';
        let cleaned = removeBracketsContent(rawName);
        cleaned = cleaned.replace(/[^\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u11ff\u3130-\u318fa-zA-Z0-9\s]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
    function cleanStrict(rawName) {
        if (!rawName) return '';
        let cleaned = removeSpecialChars(rawName);
        cleaned = cleaned.replace(/\s+/g, '');
        return cleaned.trim();
    }

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
        FISH_API_URL: "https://m-api.ceseet.me",
        XINGHAI_MAIN_URL: "https://music-api.gdstudio.xyz/api.php",
        XINGHAI_BACKUP_URL: "https://music-dl.sayqz.com/api/",
        BACKUP_API_BASE: "https://zrcdy.dpdns.org/lx/api/api.php",
        CHKSZ_API: "https://api.chksz.top/api",
        SUYIN_QQ_API: "https://oiapi.net/api/QQ_Music",
        SUYIN_QQ_KEY: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575",
        SUYIN_163_API: "https://oiapi.net/api/Music_163",
        SUYIN_KW_API: "https://oiapi.net/api/Kuwo",
        SUYIN_MG_API: "https://api.xcvts.cn/api/music/migu",
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
        REQUEST_INTERVAL: 200,
        TOTAL_FALLBACK_TIMEOUT: 15000,
        URL_CHECK_TIMEOUT: 4000,

        // 汽水VIP 专用配置
        QISHUI_HTTPS: "https://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_HTTP: "http://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_PROXY: "https://proxy.qishui.vsaa.cn/qishui/proxy",
        QISHUI_BACKUP_PROXY: "https://api.vsaa.cn/api/qishui/decrypt"
    });

    const QUALITY_TO_BR = Object.freeze({ "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999" });
    const WY_BR_MAP = Object.freeze({ "128k": 128000, "192k": 192000, "320k": 320000, "flac": 999000, "24bit": 3500000 });
    const SUYIN_QQ_BR = Object.freeze({ "128k": 7, "320k": 5, "flac": 4, "hires": 3, "master": 1, "24bit": 1 });
    const SUYIN_KW_BR = Object.freeze({ "flac": 1, "320k": 5, "128k": 7 });
    const HTTP_REGEX = /^https?:\/\//i;

    const CHKSZ_LEVEL = { '128k': 'standard', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'jymaster' };
    const CHKSZ_FALLBACK = {
        jymaster: ['jymaster', 'lossless', 'exhigh', 'standard'],
        lossless: ['lossless', 'exhigh', 'standard'],
        exhigh: ['exhigh', 'standard'],
        standard: ['standard'],
    };

    const API_ENDPOINTS = Object.freeze({
        ikun: { url: "https://api.ikunshare.com/url", hkUrl: "https://songapi.ikunshare.link/url" },
        juhe: { base: "https://api.music.lerd.dpdns.org" },
        qorg: { base: "https://api.qlm.org.cn", endpoints: { music: "/song/url", search: "/search", lyric: "/music/lyric" } },
        xinghaiMain: { base: "https://music-api.gdstudio.xyz/api.php", params: { use_xbridge3: "true", loader_name: "forest", need_sec_link: "1", types: "url" } },
        xinghaiBackup: { base: "https://music-dl.sayqz.com/api/" },
        grass: { base: "http://grass.tempmusic.ss.tk/v1" },
        suyin: {
            qq: { url: CONFIG.SUYIN_QQ_API, key: CONFIG.SUYIN_QQ_KEY },
            wy: { url: CONFIG.SUYIN_163_API },
            kw: { url: CONFIG.SUYIN_KW_API },
            mg: { url: CONFIG.SUYIN_MG_API }
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
        qishui: { https: CONFIG.QISHUI_HTTPS, http: CONFIG.QISHUI_HTTP, proxy: CONFIG.QISHUI_PROXY, backupProxy: CONFIG.QISHUI_BACKUP_PROXY },
        sixyin: "http://music.sixyin.com/api",
        flower: "http://97.64.37.235/flower/v1",
        backup: { wy: "https://api.injahow.cn/meting/?server=netease&type=url&id={id}&br={br}", tx: "https://api.injahow.cn/meting/?server=tencent&type=url&id={id}&br={br}" },
        dusiyinyuan: { base: "https://api.lxmusic.top/v1", fallback: "https://api.lxmusic.net/v1" }
    });

    const PLATFORM_TO_SOURCE = Object.freeze({
        tx: { main: "tencent", ikun: "tx", dusiyinyuan: "qq", meting: "tencent", fish: "tx", xinghai: "tencent" },
        wy: { main: "netease", ikun: "wy", dusiyinyuan: "wy", meting: "netease", fish: "wy", xinghai: "netease" },
        kw: { main: "kuwo", ikun: "kw", dusiyinyuan: "kw", meting: "kuwo", fish: "kw", xinghai: "kuwo" },
        kg: { main: "kugou", ikun: "kg", dusiyinyuan: "kg", meting: "kugou", fish: "kg", xinghai: "kugou" },
        mg: { main: "migu", ikun: "mg", dusiyinyuan: "mg", meting: "migu", fish: "mg", xinghai: "migu" }
    });

    // ==================== 网易云加密辅助 ====================
    const WY_NONCE = "0CoJUm6Qyw8W8jud";
    const WY_IV = "0102030405060708";
    const WY_RSA_PUBKEY = "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZF6L3Pq+xF4Fq4Bk2HnTFeymY\nm9n0d8PlwUfQz68Fkex3G5F+0TP+nhqRCdM27IyHvQxLOPQ4e3A1qvVj0bVJdWcx\nAOCn8kE8mv+f5IvFXePt9PCVPGjRAh/s4FqRVW0kqx5h49cL1CLjRCq9UqZz/JXz\nCqSmC4gq5wzTPGLz/wIDAQAB\n-----END PUBLIC KEY-----";

    function createSecretKey(size) {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let key = "";
        for (let i = 0; i < size; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
        return key;
    }
    function aesEncrypt(text, key, iv) {
        if (utils && utils.crypto && utils.crypto.aesEncrypt) return utils.crypto.aesEncrypt(text, key, iv);
        throw new Error("缺少AES加密支持");
    }
    function rsaEncrypt(text, pubKey) {
        if (utils && utils.crypto && utils.crypto.rsaEncrypt) return utils.crypto.rsaEncrypt(text, pubKey);
        throw new Error("缺少RSA加密支持");
    }

    // ==================== 安全转换函数（修复二进制编码问题） ====================
    function bytesToBase64(bytes) {
        if (typeof bytes === 'string') return bytes;
        if (!bytes) return '';
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        let binary = '';
        for (let i = 0; i < u8.length; i++) {
            binary += String.fromCharCode(u8[i]);
        }
        return btoa(binary);
    }

    function bytesToHex(bytes) {
        if (typeof bytes === 'string') return bytes;
        if (!bytes) return '';
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        let hex = '';
        for (let i = 0; i < u8.length; i++) {
            hex += ('00' + u8[i].toString(16)).slice(-2);
        }
        return hex;
    }

    function weapiEncrypt(object) {
        const text = JSON.stringify(object);
        const secKey = createSecretKey(16);
        const firstEncrypt = aesEncrypt(text, WY_NONCE, WY_IV);
        let firstBase64;
        if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
            firstBase64 = utils.buffer.bufToString(firstEncrypt, 'base64');
        } else if (typeof Buffer !== 'undefined') {
            firstBase64 = Buffer.from(firstEncrypt).toString('base64');
        } else {
            firstBase64 = bytesToBase64(firstEncrypt);
        }
        const secondEncrypt = aesEncrypt(firstBase64, secKey, WY_IV);
        let encText;
        if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
            encText = utils.buffer.bufToString(secondEncrypt, 'base64');
        } else if (typeof Buffer !== 'undefined') {
            encText = Buffer.from(secondEncrypt).toString('base64');
        } else {
            encText = bytesToBase64(secondEncrypt);
        }
        const encSecKeyResult = rsaEncrypt(secKey, WY_RSA_PUBKEY);
        let encSecKey;
        if (SafeUtils.isString(encSecKeyResult)) {
            encSecKey = encSecKeyResult;
        } else if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
            encSecKey = utils.buffer.bufToString(encSecKeyResult, 'hex');
        } else if (typeof Buffer !== 'undefined') {
            encSecKey = Buffer.from(encSecKeyResult).toString('hex');
        } else {
            encSecKey = bytesToHex(encSecKeyResult);
        }
        return { params: encText, encSecKey: encSecKey };
    }

    function getCsrfFromCookie(cookie) {
        const match = cookie.match(/__csrf=([^;]+)/);
        return match ? match[1] : '';
    }

    function freelistenWyEapi(url, object) {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const message = `nobody${url}use${text}md5forencrypt`;
        const digest = md5(message);
        const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
        if (!utils || !utils.crypto || !SafeUtils.isFunction(utils.crypto.aesEncrypt)) {
            var result = '';
            for (var i = 0; i < data.length; i++) {
                result += ('0' + data.charCodeAt(i).toString(16)).slice(-2);
            }
            return { params: result.toUpperCase() };
        }
        const encrypted = utils.crypto.aesEncrypt(data, 'aes-128-ecb', eapiKey, '');
        if (utils.buffer && SafeUtils.isFunction(utils.buffer.bufToString)) {
            return { params: utils.buffer.bufToString(encrypted, 'hex').toUpperCase() };
        } else if (typeof Buffer !== 'undefined') {
            return { params: Buffer.from(encrypted).toString('hex').toUpperCase() };
        } else {
            return { params: bytesToHex(encrypted).toUpperCase() };
        }
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
            } catch(e) {
                console.warn('[weapi] 加密失败，回退至 eapi');
                return null;
            }
        }
        return null;
    }

    // ==================== 工具函数（增强ID获取） ====================
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
                return info.hash || info.songmid || info.id;
            }
            case 'wy': case 'wycloud': case 'wycloudmusic':
                return info.songmid || info.id || info.songId || (meta && (meta.songmid || meta.id));
            case 'kw':
                return info.songmid || info.id || info.rid || (meta && (meta.songmid || meta.id || meta.rid));
            case 'mg':
                return info.songmid || info.id || info.cid || (meta && (meta.songmid || meta.id || meta.cid));
            default:
                return info.songmid || info.id || info.songId || info.hash;
        }
    }
    function validateUrl(url, name) {
        if (!url || !SafeUtils.isString(url)) throw new Error((name||'源')+'返回空URL');
        const t = url.trim();
        if (!HTTP_REGEX.test(t)) throw new Error((name||'源')+'返回非法URL: '+t.substring(0,50));
        return t;
    }
    function extractUrl(data, sourceName) {
        if (!data) return null;
        if (SafeUtils.isString(data) && HTTP_REGEX.test(data)) return data;
        if (SafeUtils.isObject(data)) {
            const url = data.url || data.download_url || data.source_url || data.play_url || data.music_url || data.musicurl;
            if (SafeUtils.isString(url) && HTTP_REGEX.test(url)) return url;
        }
        return null;
    }
    function deepExtractUrl(obj, depth) {
        if (obj == null) return null;
        depth = depth || 5;
        if (depth <= 0) return null;
        if (typeof obj === 'string' && HTTP_REGEX.test(obj)) return obj;
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const found = deepExtractUrl(obj[i], depth - 1);
                if (found) return found;
            }
        } else if (typeof obj === 'object') {
            const commonKeys = ['url', 'link', 'src', 'source', 'play_url', 'mp3', 'audio', 'download_url'];
            for (const key of commonKeys) {
                if (obj[key] && typeof obj[key] === 'string' && HTTP_REGEX.test(obj[key])) return obj[key];
            }
            for (const key in obj) {
                if (!obj.hasOwnProperty(key)) continue;
                const val = obj[key];
                if (typeof val === 'string' && HTTP_REGEX.test(val)) return val;
                if (typeof val === 'object') {
                    const found = deepExtractUrl(val, depth - 1);
                    if (found) return found;
                }
            }
        }
        return null;
    }
    function delay(ms) { return new Promise(r => setTimeout(r, ms || 100)); }
    function withTimeout(promise, ms, msg) {
        let id;
        const timeout = new Promise((_,rej) => id = setTimeout(() => rej(new Error(msg||'超时')), ms || 10000));
        return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
    }

    // ==================== HTTP 请求封装 ====================
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
    async function httpGet(url, params, timeout, extraHeaders={}) {
        const qs = Object.entries(params||{}).filter(([,v]) => v!=null&&v!=='').map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        return (await httpRequestWithRetry(full, {method:'GET', timeout, headers: {'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders}})).body;
    }
    async function httpPost(url, body, timeout, extraHeaders={}) {
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/json', 'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders},
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

    // ==================== URL 可达性验证 ====================
    async function validateAudioUrl(url, timeout) {
        if (!url || !HTTP_REGEX.test(url)) return false;
        try {
            const resp = await withTimeout(
                httpFetch(url, {
                    method: 'HEAD',
                    timeout: timeout || 5000,
                    headers: { 'User-Agent': `lx-music-${env}/${version}` },
                    follow_max: 2
                }),
                timeout || 6000,
                '音频链接预检超时'
            );
            const status = resp.statusCode || 0;
            if (status < 200 || status >= 400) return false;
            const ct = (resp.headers && resp.headers['content-type']) || '';
            // 宽松验证：有内容类型且为音频或者无内容类型/通用流也算可播放
            if (ct && !/audio|mpeg|octet-stream|mp3|m4a|flac|wav|ogg/i.test(ct)) return false;
            return true;
        } catch (e) {
            return false;
        }
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
        kwToken: '', kwCookie: '',
        lastRequestTime: 0,
        starSourcesList: ['netease', 'kuwo'],
        mainApiSourceMap: {}
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
            state.cleanupTimer = setTimeout(cleanup, 300000);
        };
        state.cleanupTimer = setTimeout(cleanup, 300000);
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

    // ==================== 通用搜索补全ID函数 ====================
    async function searchIdByPlatform(platform, songInfo) {
        const keyword = (songInfo && (songInfo.name || songInfo.title || songInfo.songName || songInfo.filename)) || '';
        if (!keyword) throw new Error('无歌曲名，无法搜索');
        const limit = 5;
        switch (platform) {
            case 'wy':
                try {
                    const data = await verydaoSearchChksz(keyword, limit);
                    if (data && data.list && data.list.length) return String(data.list[0].id || data.list[0].songmid);
                } catch (e) { /* 继续下一个搜索源 */ }
                // 备用 qorg 搜索
                return await searchQorgMusic(songInfo);
            case 'kw':
                try {
                    const data = await verydaoSearchKuwo(keyword, limit);
                    if (data && data.list && data.list.length) return String(data.list[0].id || data.list[0].songmid);
                } catch (e) {}
                throw new Error('酷我搜索ID失败');
            case 'kg':
                try {
                    const data = await xinghaiSearch('kg', keyword, limit);
                    if (data && data.list && data.list.length) return String(data.list[0].songmid || data.list[0].hash || data.list[0].id);
                } catch (e) {}
                throw new Error('酷狗搜索ID失败');
            case 'tx':
                try {
                    const data = await xinghaiSearch('tx', keyword, limit);
                    if (data && data.list && data.list.length) return String(data.list[0].songmid || data.list[0].hash || data.list[0].id);
                } catch (e) {}
                throw new Error('QQ音乐搜索ID失败');
            case 'mg':
                try {
                    const data = await xinghaiSearch('mg', keyword, limit);
                    if (data && data.list && data.list.length) return String(data.list[0].songmid || data.list[0].hash || data.list[0].id);
                } catch (e) {}
                throw new Error('咪咕搜索ID失败');
            default:
                // 尝试 qorg 通用搜索返回id（可能仅网易云有效）
                return await searchQorgMusic(songInfo);
        }
    }

    // ==================== 各独立音源处理函数 ====================

    // --- qorg 独立搜索（用于补全歌曲ID）---
    async function searchQorgMusic(songInfo) {
        const keyword = (songInfo && (songInfo.name || songInfo.title || songInfo.songName || songInfo.filename || songInfo.label)) || '';
        if (!keyword) throw new Error('无搜索关键词（歌曲名）');
        const resp = await httpGet(
            `${CONFIG.QORG_API_URL}/search`,
            { keywords: keyword },
            CONFIG.REQUEST_TIMEOUT
        );
        let list = [];
        if (Array.isArray(resp)) {
            list = resp;
        } else if (resp && resp.data) {
            list = Array.isArray(resp.data) ? resp.data : (resp.data.list || resp.data.songs || []);
        }
        if (!list.length) throw new Error('搜索无结果');

        const name = (songInfo && removeBracketsContent(songInfo.name || songInfo.title || '')).toLowerCase();
        const singer = (songInfo && (songInfo.singer || songInfo.artist || '')).toLowerCase();
        let bestId = null;
        let bestScore = -1;
        for (const item of list) {
            const itemName = (item.name || item.title || '').toLowerCase();
            const itemSinger = (item.singer || item.artist || item.author || '').toLowerCase();
            const nameScore = SafeUtils.stringMatchScore(name, itemName);
            const singerScore = SafeUtils.stringMatchScore(singer, itemSinger);
            const score = nameScore * 0.6 + singerScore * 0.4;
            if (score > bestScore) {
                bestScore = score;
                bestId = item.id || item.songid || item.mid || item.rid;
            }
        }
        if (!bestId) throw new Error('无法匹配到歌曲ID');
        return String(bestId);
    }

    // --- fish (修复缺少ID问题) ---
    async function fishGetMusicUrl(source, songInfo, quality) {
        let sid = getSongId(source, songInfo);
        if (!sid) {
            try {
                sid = await searchIdByPlatform(source, songInfo);
            } catch (e) {
                throw new Error('fish: 缺少歌曲ID且搜索补全失败: '+e.message);
            }
        }
        const url = `${CONFIG.FISH_API_URL}/url/${source}/${sid}/${quality}`;
        const resp = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.code === 0 && typeof resp.data === 'string' && HTTP_REGEX.test(resp.data)) {
            return resp.data;
        }
        throw new Error(resp?.msg || 'fish: 获取失败');
    }

    // --- 星海动态源更新 ---
    const fetchStableSources = async () => {
        try {
            const resp = await httpGet('https://zrcdy.dpdns.org/lx/stable_sources.php', {}, 5000, { 'User-Agent': 'LX-Music' });
            if (Array.isArray(resp) && resp.length > 0) {
                state.starSourcesList = resp;
                console.log('[星海] 动态稳定源列表:', state.starSourcesList);
            }
        } catch (e) { console.warn('[星海] 获取动态源失败，使用默认:', e.message); }
        const sourceToCode = { netease: 'wy', tencent: 'tx', kuwo: 'kw', kugou: 'kg', migu: 'mg' };
        state.mainApiSourceMap = {};
        state.starSourcesList.forEach(src => { const code = sourceToCode[src]; if (code) state.mainApiSourceMap[code] = src; });
    };

    // 星海主 API
    async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
        const apiSource = state.mainApiSourceMap[platform];
        if (!apiSource) throw new Error('星海主: 不支持此平台');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('星海主: 缺少歌曲ID');
        const brMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': '740', 'flac24bit': '999' };
        const br = brMap[quality] || '320';
        const params = {
            use_xbridge3: "true", loader_name: "forest", need_sec_link: "1",
            types: "url", source: apiSource, id: String(id), br: br,
            theme: "light"
        };
        const resp = await httpGet(CONFIG.XINGHAI_MAIN_URL, params, CONFIG.REQUEST_TIMEOUT);
        const url = extractUrl(resp) || deepExtractUrl(resp);
        if (url && HTTP_REGEX.test(url)) return url;
        throw new Error('星海主: 未返回音频地址');
    }

    // 星海备 API 搜索获取 (修复 null musicInfo 问题)
    async function xinghaiBackupSearchGetUrl(platform, musicInfo, quality) {
        // 防御 musicInfo 为 null/undefined
        if (!musicInfo || typeof musicInfo !== 'object') {
            throw new Error('星海备: 歌曲信息缺失或无效');
        }
        const backupSource = { kg: 'kg', tx: 'qq', mg: 'migu' }[platform];
        if (!backupSource) throw new Error('星海备: 不支持此平台');
        const songName = musicInfo.name || musicInfo.title || '';
        const songSinger = musicInfo.singer || musicInfo.artist || '';
        if (!songName) throw new Error('歌曲名信息缺失');

        const kw1 = trimSpacesOnly(songName);
        const kw2 = removeBracketsContent(songName);
        const kw3 = removeSpecialChars(songName);
        const kw4 = cleanStrict(songName);
        const keywords = [kw1, kw2, kw3, kw4, songName].filter((v, i, a) => v && a.indexOf(v) === i);

        let searchData = null;
        for (const kw of keywords) {
            const params = { source: backupSource, msg: kw, n: '0', g: '10' };
            if (backupSource === 'migu') { params.num = '10'; delete params.g; }
            try {
                const resp = await httpGet(CONFIG.BACKUP_API_BASE, params, CONFIG.REQUEST_TIMEOUT);
                if (resp && resp.code === 200 && resp.data?.songs?.length) { searchData = resp; break; }
            } catch (e) {}
        }
        if (!searchData) throw new Error('所有关键词均未搜索到歌曲');

        const songs = searchData.data.songs;
        const findBest = (originalName, originalSinger, songs) => {
            let bestIdx = 1, bestScore = -1;
            songs.forEach((song, idx) => {
                const songName = song.title || song.name || '';
                const songSinger = song.singer || song.author || '';
                const nameScore = SafeUtils.stringMatchScore(originalName, songName);
                const singerScore = SafeUtils.stringMatchScore(originalSinger, songSinger);
                const totalScore = nameScore * 0.6 + singerScore * 0.4;
                if (totalScore > bestScore) { bestScore = totalScore; bestIdx = idx + 1; }
            });
            return bestScore >= 0.3 ? bestIdx : null;
        };
        const bestN = findBest(songName, songSinger, songs);
        if (bestN === null) throw new Error('未找到匹配的歌曲');

        const detailParams = { source: backupSource, msg: keywords[0], n: String(bestN) };
        if (backupSource === 'kg') {
            const qMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': 'flac', 'flac24bit': 'flac' };
            detailParams.quality = qMap[quality] || '320';
        } else if (backupSource === 'qq') {
            detailParams.size = 'hq';
        }
        const detail = await httpGet(CONFIG.BACKUP_API_BASE, detailParams, CONFIG.REQUEST_TIMEOUT);
        if (detail?.code !== 200) throw new Error(detail?.msg || '备用详情失败');
        const url = extractUrl(detail.data) || deepExtractUrl(detail.data);
        if (url) return url;
        throw new Error('备用API未返回音频地址');
    }

    // 星海搜索
    async function xinghaiSearch(source, keyword, limit, page = 1) {
        const backupSource = { kg: 'kg', tx: 'qq', mg: 'migu' }[source];
        if (!backupSource) throw new Error('星海搜索: 不支持此平台');
        const n = String(page - 1); // 星海 API 的页码从 0 开始
        const params = { source: backupSource, msg: keyword, n: n, g: String(limit || 20) };
        if (backupSource === 'migu') { params.num = String(limit); delete params.g; }
        const resp = await httpGet(CONFIG.BACKUP_API_BASE, params, CONFIG.REQUEST_TIMEOUT);
        if (resp?.code !== 200) throw new Error(resp?.msg || '搜索失败');
        const songs = resp.data?.songs || [];
        const total = resp.data?.total || songs.length;
        return {
            list: songs.map((item, index) => ({
                singer: item.singer || item.author || '',
                name: item.title || item.name || '未知歌曲',
                album: item.album || item.albumname || '',
                source,
                songmid: item.hash || item.mid || item.id || String(index),
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
            isEnd: songs.length < limit ? true : (total && (page * limit >= total))
        };
    }

    // --- qorg（增强多平台支持，修复无ID时搜索补全）---
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        let id = getSongId(platform, songInfo);
        if (!id) {
            try {
                // 若 songInfo 有效则进行搜索补全，否则抛出友好提示
                id = await searchIdByPlatform(platform, songInfo);
            } catch (e) {
                throw new Error('qorg: 无歌曲ID且无法提取/搜索ID: '+e.message);
            }
        }
        const br = QUALITY_TO_BR[quality] || '320';
        const resp = await httpGet(
            `${CONFIG.QORG_API_URL}/song/url`,
            { id, br },
            CONFIG.REQUEST_TIMEOUT
        );
        if (resp && resp.code === 200 && resp.data && resp.data.url) {
            return validateUrl(resp.data.url, 'qorg');
        }
        throw new Error(resp?.msg || 'qorg: 获取失败');
    }

    // --- wyqlm（独立源，原仅 wy 平台，现增强支持多平台，修复ID缺失）---
    async function wyqlmGetMusicUrl(songInfo, quality) {
        // wyqlm 作为独立源，调用时 platform 固定为 wy（事件处理中指定），但保留通用性
        const platform = 'wy';
        let id = getSongId(platform, songInfo);
        if (!id) {
            try {
                id = await searchIdByPlatform(platform, songInfo);
            } catch (e) {
                throw new Error('wyqlm: 无歌曲ID且无法搜索: '+e.message);
            }
        }
        const resp = await httpGet(
            `${CONFIG.QORG_API_URL}/song/url`,
            { id, br: QUALITY_TO_BR[quality] || '320' },
            CONFIG.REQUEST_TIMEOUT
        );
        if (resp && resp.code === 200 && resp.data && resp.data.url) {
            return validateUrl(resp.data.url, 'wyqlm');
        }
        throw new Error(resp?.msg || 'wyqlm: 获取失败');
    }

    // --- ikun ---
    async function ikunGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('ikun: 缺少歌曲ID');
        const source = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const urls = [CONFIG.IKUN_API_URL + '/url', CONFIG.IKUN_HK_API_URL + '/url'];
        const resp = await httpGetWithFallback(urls, { source, id, br }, CONFIG.REQUEST_TIMEOUT);
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('ikun: 无效URL');
    }

    // --- 聚合API ---
    async function juheGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('juhe: 缺少歌曲ID');
        const source = PLATFORM_TO_SOURCE[platform]?.main || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const resp = await httpGet(`${CONFIG.JUHE_API_URL}/`, { source, id, br, types: 'url' }, CONFIG.REQUEST_TIMEOUT);
        const url = extractUrl(resp) || deepExtractUrl(resp);
        if (url) return validateUrl(url, 'juhe');
        throw new Error('juhe: 未返回有效URL');
    }

    // --- 网易云盘 ---
    async function wycloudGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wycloud') throw new Error('仅限wycloud');
        if (!NETEASE_CLOUD_COOKIE_KEY) throw new Error('未配置云盘Cookie');
        const id = getSongId('wy', songInfo);
        if (!id) throw new Error('缺少ID');
        const br = WY_BR_MAP[quality] || 320000;
        const body = { ids: `[${id}]`, br };
        const encrypted = weapiEncrypt(body);
        const params = `params=${encodeURIComponent(encrypted.params)}&encSecKey=${encodeURIComponent(encrypted.encSecKey)}`;
        const resp = await httpFetch('https://music.163.com/weapi/cloud/url/v1', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': NETEASE_CLOUD_COOKIE_KEY },
            timeout: CONFIG.REQUEST_TIMEOUT
        });
        const data = resp.body;
        if (data?.code === 200 && Array.isArray(data.data) && data.data[0]?.url) {
            return data.data[0].url;
        }
        throw new Error('云盘未返回URL');
    }

    async function wycloudmusicGetMusicUrl(platform, songInfo, quality) {
    if (platform !== 'wycloudmusic') throw new Error('仅限wycloudmusic');
    const id = getSongId('wy', songInfo);
    if (!id) throw new Error('缺少ID');
    const resp = await httpGet(
        `${CONFIG.WYCLOUDMUSIC_API_URL}/song/url`,          // ← 修正路径
        { id, br: QUALITY_TO_BR[quality] || '320' },        // 使用 br 参数
        CONFIG.REQUEST_TIMEOUT
    );
    if (resp?.code === 200 && resp.data?.url) return resp.data.url;
    throw new Error(resp?.msg || '获取失败');
}

    // --- 野草(酷我) ---
    async function grassGetMusicUrl(platform, songId, quality, songInfo) {
        if (platform !== 'kw') throw new Error('仅限kw');
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('grass: 缺少ID');
        const resp = await httpGet(`${API_ENDPOINTS.grass.base}/kw/${id}/${quality}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('grass: 未找到');
    }

    // --- 溯音 ---
    async function suyinGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('suyin: 缺少ID');
        let url, params;
        switch(platform) {
            case 'tx':
                url = CONFIG.SUYIN_QQ_API;
                params = { id, key: CONFIG.SUYIN_QQ_KEY, level: SUYIN_QQ_BR[quality] || 5 };
                break;
            case 'wy':
                url = CONFIG.SUYIN_163_API;
                params = { id, level: quality };
                break;
            case 'kw':
                url = CONFIG.SUYIN_KW_API;
                params = { id, level: SUYIN_KW_BR[quality] || 5 };
                break;
            case 'mg':
                url = CONFIG.SUYIN_MG_API;
                params = { id, level: quality };
                break;
            default: throw new Error('不支持的平台');
        }
        const resp = await httpGet(url, params, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('suyin: 无URL');
    }

    // --- 六音 ---
    async function sixyinGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('sixyin: 缺少ID');
        const resp = await httpGet(`${CONFIG.SIXYIN_API}?server=${platform}&type=url&id=${id}&br=${QUALITY_TO_BR[quality]||'320'}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('sixyin: 失败');
    }

    // --- 独家音源 ---
    async function dusiyinyuanGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('dusiyinyuan: 缺少ID');
        const source = PLATFORM_TO_SOURCE[platform]?.dusiyinyuan || platform;
        const resp = await httpGetWithFallback(
            [`${API_ENDPOINTS.dusiyinyuan.base}/${source}/${id}/${quality}`, `${API_ENDPOINTS.dusiyinyuan.fallback}/${source}/${id}/${quality}`],
            {}, CONFIG.REQUEST_TIMEOUT
        );
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('dusiyinyuan: 无URL');
    }

    // --- 长青SVIP（修复URL提取，确保返回正确URL）---
    async function changqingGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('changqing: 缺少ID');
        const level = { '128k': 1, '192k': 2, '320k': 3, 'flac': 4, 'flac24bit': 5 }[quality] || 3;
        const url = API_ENDPOINTS.changqing[platform].replace('{id}', id).replace('{level}', level);
        const resp = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        // 尝试提取URL，可能是字符串或对象
        const extracted = extractUrl(resp) || deepExtractUrl(resp);
        if (typeof extracted === 'string' && HTTP_REGEX.test(extracted)) return extracted;
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('changqing: 无效URL');
    }

    // --- 念心SVIP（同上）---
    async function nianxinGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('nianxin: 缺少ID');
        const level = { '128k': 1, '192k': 2, '320k': 3, 'flac': 4, 'flac24bit': 5 }[quality] || 3;
        const url = API_ENDPOINTS.nianxin[platform].replace('{id}', id).replace('{level}', level);
        const resp = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        const extracted = extractUrl(resp) || deepExtractUrl(resp);
        if (typeof extracted === 'string' && HTTP_REGEX.test(extracted)) return extracted;
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('nianxin: 无效URL');
    }

    // --- 汽水VIP (完整搜索+歌词) ---
    async function qishuiGetMusicUrl(songInfo, quality) {
        const id = getSongId('mg', songInfo);
        if (!id) throw new Error('qishui: 缺少歌曲ID');
        const res = await httpGetWithFallback([CONFIG.QISHUI_HTTPS, CONFIG.QISHUI_HTTP], { act: "song", id: id, quality: quality }, 20000);
        const data = res?.data;
        if (data?.url) {
            if (data.ekey) {
                const proxyRes = await httpPost(CONFIG.QISHUI_PROXY, {
                    url: data.url, key: data.ekey, filename: data.filename || "KMusic", ext: data.fileExtension || "aac"
                }, 60000);
                if (Number(proxyRes?.code) === 200 && proxyRes?.url) return String(proxyRes.url);
                throw new Error('汽水VIP代理解密失败');
            }
            return String(data.url);
        }
        throw new Error('汽水VIP未返回URL');
    }

    async function qishuiSearch(keyword, page = 1, pageSize = 30) {
        if (!keyword) return { isEnd: true, list: [] };
        const res = await httpGetWithFallback([CONFIG.QISHUI_HTTPS, CONFIG.QISHUI_HTTP], {
            act: "search", keywords: keyword, page: page, pagesize: pageSize, type: "music"
        }, 15000);
        const list = Array.isArray(res?.data?.lists) ? res.data.lists : [];
        return {
            isEnd: list.length < pageSize,
            list: list.map(item => ({
                singer: item.artists || '',
                name: item.name || '未知歌曲',
                album: item.album || '',
                source: 'qsvip',
                songmid: String(item.id || item.vid || ''),
                interval: item.duration ? Math.floor(Number(item.duration) / 1000) : null,
                img: item.cover || item.pic || '',
                lrc: null,
                hash: String(item.id || ''),
                albumId: '',
                lyricUrl: null
            })),
            total: res?.data?.total ? Number(res.data.total) : list.length,
            page: page,
            limit: pageSize
        };
    }

    async function qishuiGetLyric(songInfo) {
        const id = getSongId('mg', songInfo);
        if (!id) return { lyric: "" };
        const res = await httpGetWithFallback([CONFIG.QISHUI_HTTPS, CONFIG.QISHUI_HTTP], { act: "song", id: id }, 15000);
        return { lyric: res?.data?.lyric ? String(res.data.lyric) : "" };
    }

    // --- qishui 统一处理器 ---
    async function qishuiHandler(action, params = {}) {
        if (action === 'musicUrl') {
            if (!params?.musicInfo) throw new Error('请求参数不完整');
            const url = await qishuiGetMusicUrl(params.musicInfo, params.type || '320k');
            return validateUrl(url, '汽水VIP');
        }
        if (action === 'search') {
            const keyword = params?.keyword || '';
            const page = params?.page || 1;
            const pageSize = params?.limit || 30;
            return qishuiSearch(keyword, page, pageSize);
        }
        if (action === 'lyric') {
            return qishuiGetLyric(params?.musicInfo || {});
        }
        throw new Error('action not support');
    }

    // --- Free listen 系列（修复缺少ID问题，增加搜索补全）---
    async function freelistenKwGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'kw') throw new Error('仅限kw');
        let id = getSongId(platform, songInfo);
        if (!id) {
            try { id = await searchIdByPlatform('kw', songInfo); }
            catch { throw new Error('freelisten kw: 无ID且搜索失败'); }
        }
        const resp = await httpGet(`http://free-listen.tick.moe/api/kw/${id}/${quality}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('freelisten kw: 失败');
    }

    async function freelistenKgGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'kg') throw new Error('仅限kg');
        let id = getSongId(platform, songInfo);
        if (!id) {
            try { id = await searchIdByPlatform('kg', songInfo); }
            catch { throw new Error('freelisten kg: 无ID且搜索失败'); }
        }
        const resp = await httpGet(`http://free-listen.tick.moe/api/kg/${id}/${quality}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('freelisten kg: 失败');
    }

    async function freelistenWyGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy') throw new Error('仅限wy');
        let id = getSongId(platform, songInfo);
        if (!id) {
            try { id = await searchIdByPlatform('wy', songInfo); }
            catch { throw new Error('freelisten wy: 无ID且搜索失败'); }
        }
        const eapiUrl = '/api/song/enhance/player/url';
        const body = { ids: `[${id}]`, br: WY_BR_MAP[quality] || 320000 };
        const enc = freelistenWyEapi(eapiUrl, body);
        const url = `https://interface.music.163.com/eapi/song/enhance/player/url`;
        const resp = await httpFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `params=${encodeURIComponent(enc.params)}`,
            timeout: CONFIG.REQUEST_TIMEOUT
        });
        const data = resp.body;
        if (data?.code === 200 && data.data?.[0]?.url) return data.data[0].url;
        throw new Error('freelisten wy: 失败');
    }

    // --- Meting ---
    async function metingGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('meting: 缺少ID');
        const server = PLATFORM_TO_SOURCE[platform]?.meting || platform;
        const br = QUALITY_TO_BR[quality] || '320';
        const resp = await httpGet(`https://api.injahow.cn/meting/?server=${server}&type=url&id=${id}&br=${br}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('meting: 失败');
    }

    // --- 野花野草（修复无URL问题）---
    async function flowerGrassGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('flower: 缺少ID');
        const resp = await httpGet(`${API_ENDPOINTS.flower}/${platform}/${id}/${quality}`, {}, CONFIG.REQUEST_TIMEOUT);
        // 深度提取URL，支持多种返回格式
        const url = extractUrl(resp) || deepExtractUrl(resp);
        if (url) return url;
        if (typeof resp === 'string' && HTTP_REGEX.test(resp)) return resp;
        throw new Error('flower: 无URL');
    }

    // --- 肥猫 & 梓澄系列 ---
    async function feimaoGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('feimao: 缺少ID');
        const resp = await httpGet(`${CONFIG.FEIMAO_API_URL}/get/v1/${platform}/${id}/${quality}?key=${CONFIG.FEIMAO_API_KEY}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('feimao: 失败');
    }
    async function feimaobufeiGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('feimaobufei: 缺少ID');
        const resp = await httpGet(`${CONFIG.FEIMAOBUFEI_API_URL}/get/v1/${platform}/${id}/${quality}?key=${CONFIG.FEIMAOBUFEI_API_KEY}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('feimaobufei: 失败');
    }
    async function zichengGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('zicheng: 缺少ID');
        const resp = await httpGet(`${CONFIG.ZICHENG_API_URL}/?server=${platform}&id=${id}&br=${QUALITY_TO_BR[quality]||'320'}&key=${CONFIG.ZICHENG_API_KEY}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('zicheng: 失败');
    }
    async function zichengqwqGetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('zichengqwq: 缺少ID');
        const resp = await httpGet(`${CONFIG.ZICHENGQWQ_API_URL}/?server=${platform}&id=${id}&br=${QUALITY_TO_BR[quality]||'320'}&key=${CONFIG.ZICHENGQWQ_API_KEY}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('zichengqwq: 失败');
    }
    async function zicheng2GetMusicUrl(platform, songId, quality, songInfo) {
        const id = songId || getSongId(platform, songInfo);
        if (!id) throw new Error('zicheng2: 缺少ID');
        const resp = await httpGet(`${CONFIG.ZICHENG2_API_URL}/?server=${platform}&id=${id}&br=${QUALITY_TO_BR[quality]||'320'}&key=${CONFIG.ZICHENG2_API_KEY}`, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.url) return resp.url;
        throw new Error('zicheng2: 失败');
    }

    // --- CHKSZ (非常刀) 添加 musicInfo 空值保护 ---
    async function verydaoChkszGetUrl(songInfo, quality) {
        if (!songInfo) throw new Error('CHKSZ: 歌曲信息缺失');
        const id = getSongId('wy', songInfo);
        if (!id) throw new Error('CHKSZ: 缺少ID');
        const level = CHKSZ_LEVEL[quality] || 'exhigh';
        const fallbackLevels = CHKSZ_FALLBACK[level] || [level];
        for (const lv of fallbackLevels) {
            try {
                const resp = await httpGet(`${CONFIG.CHKSZ_API}/netease/song/url`, { id, level: lv }, CONFIG.REQUEST_TIMEOUT);
                if (resp?.code === 200 && resp.data?.url) return resp.data.url;
            } catch(e) {}
        }
        throw new Error('CHKSZ: 获取失败');
    }

    async function verydaoSearchChksz(keyword, limit) {
        const resp = await httpGet(`${CONFIG.CHKSZ_API}/netease/search`, { keywords: keyword, limit }, CONFIG.REQUEST_TIMEOUT);
        if (resp?.code === 200 && resp.data?.songs) {
            const songs = resp.data.songs;
            return {
                list: songs,
                total: resp.data.total || songs.length,
                limit: limit,
                isEnd: songs.length < limit
            };
        }
        throw new Error('CHKSZ搜索失败');
    }
    async function verydaoSearchKuwo(keyword, limit) {
        const resp = await httpGet(`${CONFIG.CHKSZ_API}/kuwo/search`, { key: keyword, limit }, CONFIG.REQUEST_TIMEOUT);
        if (resp?.code === 200 && resp.data?.list) {
            const list = resp.data.list;
            return {
                list: list,
                total: resp.data.total || list.length,
                limit: limit,
                isEnd: list.length < limit
            };
        }
        throw new Error('酷我搜索失败');
    }
    async function verydaoSearchMigu(keyword, limit) {
        const resp = await httpGet(`${CONFIG.CHKSZ_API}/search/migu`, { keyword, limit }, CONFIG.REQUEST_TIMEOUT);
        if (resp?.code === 200 && resp.data?.songs) {
            const songs = resp.data.songs;
            return {
                list: songs,
                total: resp.data.total || songs.length,
                limit: limit,
                isEnd: songs.length < limit
            };
        }
        throw new Error('咪咕搜索失败');
    }

    // ==================== 音源处理器类 & 降级链 ====================
    class SourceHandler {
        constructor(name, fn, priority, opts={}) {
            this.name = name; this.fn = fn; this.priority = priority;
            this.timeout = opts.timeout || CONFIG.REQUEST_TIMEOUT;
            this.requireSource = !!opts.requireSource;
            this.supportedPlatforms = opts.supportedPlatforms || [];
            this.needUrlValidation = opts.needUrlValidation !== false;
        }
        supportsPlatform(p) { return this.supportedPlatforms.length===0 || this.supportedPlatforms.includes(p); }
    }

    const SOURCE_HANDLERS = [
        new SourceHandler('fish', async (platform, musicInfo, quality) => {
            return fishGetMusicUrl(platform, musicInfo, quality);
        }, 0.5, { requireSource: true, supportedPlatforms: ['kg','kw','tx'] }),
        new SourceHandler('网易云官方Cookie', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            const id = getSongId('wy', musicInfo);
            return fetchWyOfficialUrl(id, quality);
        }, 0, { supportedPlatforms: ['wy'] }),
        new SourceHandler('wyqlm', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return wyqlmGetMusicUrl(musicInfo, quality);
        }, 1, { supportedPlatforms: ['wy'] }),
        new SourceHandler('qorg', async (platform, musicInfo, quality) => {
            return qorgGetMusicUrl(platform, musicInfo, quality);
        }, 2, { supportedPlatforms: ['wy','wycloudmusic'] }),
        new SourceHandler('ikun', async (platform, musicInfo, quality) => {
            return ikunGetMusicUrl(platform, null, quality, musicInfo);
        }, 3, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('聚合API', async (platform, musicInfo, quality) => {
            return juheGetMusicUrl(platform, null, quality, musicInfo);
        }, 4),
        new SourceHandler('网易云盘', async (platform, musicInfo, quality) => {
            if (platform !== 'wycloud') throw new Error('仅限wycloud');
            return wycloudGetMusicUrl(platform, musicInfo, quality);
        }, 5, { supportedPlatforms: ['wycloud'] }),
        new SourceHandler('自建网易云', async (platform, musicInfo, quality) => {
            if (platform !== 'wycloudmusic') throw new Error('仅限wycloudmusic');
            return wycloudmusicGetMusicUrl(platform, musicInfo, quality);
        }, 6, { supportedPlatforms: ['wycloudmusic'] }),
        new SourceHandler('星海主(GD音乐台)', async (platform, musicInfo, quality) => {
            return xinghaiMainGetUrl(platform, null, quality, musicInfo);
        }, 7, { supportedPlatforms: ['tx','wy','kw'] }),
        new SourceHandler('星海备', async (platform, musicInfo, quality) => {
            return xinghaiBackupSearchGetUrl(platform, musicInfo, quality);
        }, 8),
        new SourceHandler('野草(酷我)', async (platform, musicInfo, quality) => {
            return grassGetMusicUrl(platform, null, quality, musicInfo);
        }, 9, { supportedPlatforms: ['kw'] }),
        new SourceHandler('溯音', async (platform, musicInfo, quality) => {
            return suyinGetUrl(platform, null, quality, musicInfo);
        }, 10, { supportedPlatforms: ['tx','wy','kw','mg'] }),
        new SourceHandler('六音', async (platform, musicInfo, quality) => {
            return sixyinGetUrl(platform, null, quality, musicInfo);
        }, 11, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('独家音源', async (platform, musicInfo, quality) => {
            return dusiyinyuanGetUrl(platform, null, quality, musicInfo);
        }, 12, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('长青SVIP', async (platform, musicInfo, quality) => {
            return changqingGetUrl(platform, null, quality, musicInfo);
        }, 13, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('念心SVIP', async (platform, musicInfo, quality) => {
            return nianxinGetUrl(platform, null, quality, musicInfo);
        }, 14, { supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('野花野草', async (platform, musicInfo, quality) => {
            return flowerGrassGetUrl(platform, null, quality, musicInfo);
        }, 15),
        new SourceHandler('Meting', async (platform, musicInfo, quality) => {
            return metingGetUrl(platform, null, quality, musicInfo);
        }, 16, { supportedPlatforms: ['tx','wy'] }),
        new SourceHandler('汽水VIP', async (platform, musicInfo, quality) => {
            if (platform !== 'qsvip') throw new Error('仅限汽水VIP');
            return qishuiGetMusicUrl(musicInfo, quality);
        }, 17, { supportedPlatforms: ['qsvip'], timeout: 25000 }),
        new SourceHandler('Free listen 酷我', async (platform, musicInfo, quality) => {
            return freelistenKwGetMusicUrl(platform, musicInfo, quality);
        }, 18, { supportedPlatforms: ['kw'] }),
        new SourceHandler('Free listen 酷狗', async (platform, musicInfo, quality) => {
            return freelistenKgGetMusicUrl(platform, musicInfo, quality);
        }, 19, { supportedPlatforms: ['kg'] }),
        new SourceHandler('Free listen 网易云', async (platform, musicInfo, quality) => {
            return freelistenWyGetMusicUrl(platform, musicInfo, quality);
        }, 20, { supportedPlatforms: ['wy'] }),
        new SourceHandler('肥猫', async (platform, musicInfo, quality) => {
            return feimaoGetMusicUrl(platform, null, quality, musicInfo);
        }, 21, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('肥猫不肥', async (platform, musicInfo, quality) => {
            return feimaobufeiGetMusicUrl(platform, null, quality, musicInfo);
        }, 22, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄公益', async (platform, musicInfo, quality) => {
            return zichengGetMusicUrl(platform, null, quality, musicInfo);
        }, 23, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄qwq', async (platform, musicInfo, quality) => {
            return zichengqwqGetMusicUrl(platform, null, quality, musicInfo);
        }, 24, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('梓澄公益2代', async (platform, musicInfo, quality) => {
            return zicheng2GetMusicUrl(platform, null, quality, musicInfo);
        }, 25, { requireSource: true, supportedPlatforms: ['tx','wy','kw','kg','mg'] }),
        new SourceHandler('CHKSZ', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return verydaoChkszGetUrl(musicInfo, quality);
        }, 26, { supportedPlatforms: ['wy'] })
    ];

    async function fetchWyOfficialUrl(songId, quality) {
        if (!NETEASE_OFFICIAL_COOKIE_KEY) throw new Error('未配置官方网易云Cookie');
        if (!utils || !utils.crypto || !utils.crypto.aesEncrypt || !utils.crypto.rsaEncrypt) throw new Error('缺少加密支持');
        const br = WY_BR_MAP[quality] || 320000;
        const requestBody = { ids: `[${songId}]`, br: br, csrf_token: getCsrfFromCookie(NETEASE_OFFICIAL_COOKIE_KEY) };
        const encrypted = weapiEncrypt(requestBody);
        const params = `params=${encodeURIComponent(encrypted.params)}&encSecKey=${encodeURIComponent(encrypted.encSecKey)}`;
        const url = `https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=${encodeURIComponent(getCsrfFromCookie(NETEASE_OFFICIAL_COOKIE_KEY))}`;
        const resp = await httpFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': NETEASE_OFFICIAL_COOKIE_KEY },
            body: params,
            timeout: CONFIG.REQUEST_TIMEOUT
        });
        const body = resp.body;
        if (body?.code === 200 && Array.isArray(body.data) && body.data[0]?.url) {
            return body.data[0].url;
        }
        throw new Error('官方API未返回有效URL');
    }

    // 降级链构建
    function getHandlersForPlatform(platform) {
        return SOURCE_HANDLERS.filter(h => h.supportsPlatform(platform)).sort((a,b) => a.priority - b.priority);
    }

    async function ultimateFallback(platform, musicInfo, quality) {
        const id = getSongId(platform, musicInfo) || musicInfo && musicInfo.hash;
        if (!id) throw new Error('兜底缺少ID');
        const resp = await httpGet(`${CONFIG.QORG_API_URL}/song/url`, { id, br: QUALITY_TO_BR[quality] || '320' }, CONFIG.REQUEST_TIMEOUT);
        if (resp?.code === 200 && resp.data?.url) return resp.data.url;
        throw new Error('终极兜底失败');
    }

    async function getUrlWithFallback(platform, musicInfo, quality) {
        const cacheKey = SafeUtils.buildCacheKey(platform, musicInfo, quality);
        let cached = state.urlCache.get(cacheKey);
        if (cached === '') {
            // 之前已确定无法获取，直接返回空，避免重复尝试
            state.stats.hits++;
            return '';
        }
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;

        const handlers = getHandlersForPlatform(platform);
        let lastErr;

        // 先尝试并发前3个高优先级源，任一成功即停止
        if (handlers.length > 3) {
            const concurrentHandlers = handlers.slice(0, 3);
            try {
                const url = await Promise.any(concurrentHandlers.map(h =>
                    state.requestPool.execute(async () => {
                        const res = await withTimeout(h.fn(platform, musicInfo, quality), h.timeout, `${h.name} 超时`);
                        if (h.needUrlValidation && !(await validateAudioUrl(res, CONFIG.URL_CHECK_TIMEOUT))) {
                            throw new Error('URL 不可达');
                        }
                        return res;
                    })
                ));
                state.urlCache.set(cacheKey, url);
                state.stats.success++;
                return url;
            } catch (e) {
                if (e.errors) e.errors.forEach(err => console.warn(`[降级并发] 失败:`, err.message));
                else console.warn(`[降级并发] 失败:`, e.message);
                // 并发全部失败，继续顺序尝试剩余处理器
            }
        }

        // 顺序尝试剩余处理器（若并发已覆盖前3，则从第4个开始，否则全部顺序）
        const startIdx = handlers.length > 3 ? 3 : 0;
        for (let i = startIdx; i < handlers.length; i++) {
            const handler = handlers[i];
            try {
                const result = await state.requestPool.execute(async () => {
                    const res = await withTimeout(handler.fn(platform, musicInfo, quality), handler.timeout, `${handler.name} 超时`);
                    if (handler.needUrlValidation && !(await validateAudioUrl(res, CONFIG.URL_CHECK_TIMEOUT))) {
                        throw new Error('URL 不可达');
                    }
                    return res;
                });
                state.urlCache.set(cacheKey, result);
                state.stats.success++;
                return result;
            } catch(err) {
                lastErr = err;
                console.warn(`[降级] ${handler.name} 失败:`, err.message);
            }
        }

        // 终极兜底
        try {
            const url = await ultimateFallback(platform, musicInfo, quality);
            state.urlCache.set(cacheKey, url);
            state.stats.success++;
            return url;
        } catch(e) {
            lastErr = e;
            console.warn(`[聚合音源] 所有源包括兜底均失败，跳过歌曲。最后错误: ${lastErr.message}`);
            // 缓存空字符串，防止重复尝试，播放器将跳过此歌曲
            state.urlCache.set(cacheKey, '');
            return '';
        }
    }

    // ==================== 预加载 ====================
    async function preloadNext(source, nextInfo, quality) {
        if (!CONFIG.PRELOAD_NEXT_ENABLED || !nextInfo) return;
        const key = `${source}_${nextInfo.songmid || nextInfo.hash}_${quality}`;
        if (state.preloadCache.has(key)) return;
        try {
            const url = await getUrlWithFallback(source, nextInfo, quality);
            if (url) {
                state.preloadCache.set(key, url);
                setTimeout(() => state.preloadCache.delete(key), 60000);
            }
        } catch(e) {}
    }

    // ==================== 平台配置 ====================
    const sourceConfig = {
        tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        wycloud: { name: '网易云盘', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        wycloudmusic: { name: '自建网易云', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        qorg: { name: 'qorg独立搜索', type: 'search', actions: ['search'] },
        wyqlm: { name: 'wyqlm独立', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl', 'search', 'lyric'], qualitys: ['128k','320k','flac','flac24bit'] }
    };

    // ==================== 事件监听 ====================
    function setupEventListener() {
        const handler = async ({ action, source, info }) => {
            state.stats.requests++;
            try {
                if (action === 'preloadNext') {
                    return await preloadNext(source, info?.musicInfo, info?.quality);
                }
                if (source === 'qsvip') {
                    if (!info || !info.musicInfo) throw new Error('缺少歌曲信息');
                    return qishuiHandler(action, info);
                }
                if (source === 'qorg' && action === 'search') {
                    if (!info?.keyword) throw new Error('缺少关键词');
                    const resp = await httpGet(`${CONFIG.QORG_API_URL}/search`, { w: info.keyword, p: info.page || 1, n: info.limit || 20 }, CONFIG.REQUEST_TIMEOUT);
                    // 标准化返回格式
                    let list = [];
                    if (Array.isArray(resp)) list = resp;
                    else if (resp && resp.data) list = Array.isArray(resp.data) ? resp.data : (resp.data.list || resp.data.songs || []);
                    const total = resp?.data?.total || list.length;
                    const limit = info.limit || 20;
                    return {
                        isEnd: list.length < limit,
                        list: list.map(item => ({
                            singer: item.singer || item.artist || '',
                            name: item.name || item.title || '',
                            songmid: item.id || item.songid || item.mid || '',
                            interval: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                            img: item.cover || item.img || '',
                            lrc: null,
                            hash: item.id || item.hash || '',
                            albumId: item.albumid || '',
                            album: item.album || ''
                        })),
                        total: total,
                        limit: limit
                    };
                }
                if (source === 'wyqlm' && action === 'musicUrl') {
                    if (!info || !info.musicInfo) throw new Error('缺少歌曲信息');
                    return await wyqlmGetMusicUrl(info.musicInfo, info.type || '320k');
                }

                if (action === 'search') {
                    const keyword = info?.keyword || '';
                    const limit = Math.min(info?.limit || 20, 30);
                    const page = info?.page || 1;
                    if (!keyword) throw new Error('需要搜索关键词');
                    switch (source) {
                        case 'wy': return await verydaoSearchChksz(keyword, limit);
                        case 'kw': return await verydaoSearchKuwo(keyword, limit);
                        case 'mg': try { return await verydaoSearchMigu(keyword, limit); } catch(e) { return await xinghaiSearch('mg', keyword, limit, page); }
                        case 'tx': return await xinghaiSearch('tx', keyword, limit, page);
                        case 'kg': return await xinghaiSearch('kg', keyword, limit, page);
                        default: throw new Error('该平台不支持搜索');
                    }
                }

                if (action === 'musicUrl') {
                    if (!info?.musicInfo) throw new Error('缺少歌曲信息');
                    const url = await getUrlWithFallback(source, info.musicInfo, info.type || '320k');
                    // 如果为空字符串，返回对应格式，LX Music 会将其视为无播放地址并跳过
                    if (url === '') {
                        return { url: '' };
                    }
                    return url;
                }
                throw new Error('不支持的操作: ' + action);
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
        console.log('[聚合音源] ' + ANNOUNCEMENT.title + ' 初始化');
        console.log(ANNOUNCEMENT.content);
        await fetchStableSources();
        startStatsCleanup();
        setupEventListener();
        autoGetWycloudCookie().catch(() => {});
        sendAnnouncement();
        try { send && send(EVENT_NAMES.inited, { openDevTools: false, sources: sourceConfig, status: { version: ANNOUNCEMENT.version } }); } catch(e) {}
    }
    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));
})();