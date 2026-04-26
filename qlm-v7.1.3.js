/**
 * @name 七零喵聚合音源 · 超级整合版（完整版）+ 自建网易云
 * @description 整合ikun + 聚合API + 多源回退 + 六音音源 + 独家音源 + 梓澄公益音源 + 肥猫音源 + 小熊猫音源 + 無名音源 + qorg音源 + 网易云盘 + 自建网易云，智能缓存，相似歌曲搜索，预加载下一首
 * @version 7.1.3 - 修复换源失败问题，优化音源回退逻辑
 * @author 整合优化版 + 六音 + 洛雪科技(独家音源) + 肥猫 + 小熊猫 + 梓澄 + qorg + 自建网易云
 * @homepage https://github.com/xcqm12/qlm-music
 * @qqgroup 1006981142
 */
(function() {
    "use strict";

    // ==================== 安全获取全局对象 ====================
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     typeof window !== 'undefined' ? window : 
                     typeof global !== 'undefined' ? global : {};
    
    const lx = globalObj.lx || {};
    
    // ==================== 公告信息 ====================
    const ANNOUNCEMENT = {
        title: "七零喵聚合音源 v7.1.3",
        content: "开源地址: https://github.com/xcqm12/qlm-music\n交流群: 1006981142\nv7.1.3: 修复歌曲换源失败问题，优化音源回退逻辑",
        version: "7.1.3",
        repo: "https://github.com/xcqm12/qlm-music",
        qqGroup: "1006981142"
    };
    
    // ==================== 修复事件名称兼容性 ====================
    const EVENT_NAMES = lx.EVENT_NAMES || {
        request: 'request',
        inited: 'inited',
        updateAlert: 'updateAlert'
    };
    
    // 获取 LX Music API，增加多种兼容方式
    let request = lx.request;
    let on = lx.on;
    let send = lx.send;
    const utils = lx.utils || {};
    const env = lx.env;
    const version = lx.version || '1.0.0';
    const currentScriptInfo = lx.currentScriptInfo;
    
    // 兼容某些版本可能将 API 放在 globalObj 下
    if (!request && typeof globalObj.request === 'function') {
        request = globalObj.request;
    }
    if (!on && typeof globalObj.on === 'function') {
        on = globalObj.on;
    }
    if (!send && typeof globalObj.send === 'function') {
        send = globalObj.send;
    }
    
    // 如果仍然没有 request，尝试从 lx 对象的不同路径获取
    if (!request) {
        const possiblePaths = [
            () => globalObj.lx?.request,
            () => globalObj.LX?.request,
            () => globalObj.lxMusic?.request,
            () => globalObj.$lx?.request
        ];
        for (const pathFn of possiblePaths) {
            try {
                const req = pathFn();
                if (typeof req === 'function') {
                    request = req;
                    break;
                }
            } catch (e) {}
        }
    }
    
    if (!request || typeof request !== 'function') {
        console.error('[聚合音源] LX Music request API 不可用，尝试使用备用方案');
        if (typeof fetch === 'function') {
            request = function(url, options, callback) {
                fetch(url, options)
                    .then(resp => resp.text().then(body => ({ statusCode: resp.status, headers: resp.headers, body })))
                    .then(resp => callback(null, resp))
                    .catch(err => callback(err));
            };
            console.log('[聚合音源] 使用 fetch 作为备用 request');
        } else {
            console.error('[聚合音源] 无可用的请求方法，音源无法工作');
            return;
        }
    }
    
    if (!on) {
        on = function(event, handler) {
            console.warn('[聚合音源] on 方法不可用，事件监听降级');
            if (event === 'request' || event === EVENT_NAMES.request) {
                if (typeof globalObj.addEventListener === 'function') {
                    globalObj.addEventListener('lx-request', function(e) {
                        if (e && e.detail) handler(e.detail);
                    });
                }
            }
        };
    }
    if (!send) {
        send = function(event, data) {
            console.log('[聚合音源] send 不可用:', event, data);
        };
    }
    
    // ==================== 安全工具函数 ====================
    const safeUtils = {
        isArray: function(arr) {
            return Array.isArray(arr);
        },
        isString: function(str) {
            return typeof str === 'string';
        },
        isFunction: function(fn) {
            return typeof fn === 'function';
        },
        isObject: function(obj) {
            return obj !== null && typeof obj === 'object';
        },
        includes: function(arr, value) {
            return this.isArray(arr) && arr.includes(value);
        },
        stringIncludes: function(str, search) {
            return this.isString(str) && this.isString(search) && str.includes(search);
        },
        startsWith: function(str, search) {
            return this.isString(str) && this.isString(search) && str.startsWith(search);
        },
        get: function(obj, path, defaultValue) {
            if (obj == null) return defaultValue;
            const keys = this.isArray(path) ? path : path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') return defaultValue;
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        },
        toArray: function(value) {
            return this.isArray(value) ? value : [];
        },
        normalizeKeyword: function(keyword) {
            if (!keyword) return "";
            return String(keyword)
                .replace(/\(\s*Live\s*\)/gi, "")
                .replace(/[\(\（][^\)\）]*[\)\）]/g, "")
                .replace(/【[^】]*】/g, "")
                .replace(/\[[^\]]*\]/g, "")
                .replace(/\s+/g, "")
                .replace(/[^\w\u4e00-\u9fa5]/g, "")
                .trim()
                .toLowerCase();
        }
    };
    
    // ==================== 防冲突标识 ====================
    const SCRIPT_ID = 'qlm_music_source_v7_1_3_';
    if (globalObj[SCRIPT_ID]) {
        console.warn('[聚合音源] 检测到重复加载，跳过初始化');
        return;
    }
    globalObj[SCRIPT_ID] = true;
    
    // ==================== 安全定时器封装 ====================
    const Timer = {
        create: function(fn, ms) {
            if (typeof setTimeout === 'function') {
                return setTimeout(fn, ms);
            }
            if (typeof Promise === 'function') {
                let cleared = false;
                const timer = { _cleared: false };
                Promise.resolve().then(() => new Promise(function(resolve) {
                    const start = Date.now();
                    const check = function() {
                        if (timer._cleared) return;
                        if (Date.now() - start >= ms) {
                            resolve();
                        } else {
                            if (typeof setImmediate === 'function') setImmediate(check);
                            else if (typeof setTimeout === 'function') setTimeout(check, 10);
                        }
                    };
                    check();
                })).then(function() {
                    if (!timer._cleared && typeof fn === 'function') fn();
                });
                return timer;
            }
            return null;
        },
        clear: function(timer) {
            if (timer === null || timer === undefined) return;
            if (typeof clearTimeout === 'function' && typeof timer === 'number') {
                clearTimeout(timer);
            } else if (timer && typeof timer === 'object') {
                timer._cleared = true;
            }
        },
        delay: function(ms) {
            return new Promise(function(resolve) {
                Timer.create(resolve, ms || 100);
            });
        }
    };
    
    // ==================== 常量定义 ====================
    const CONFIG = {
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_API_KEY: "",
        IKUN_SCRIPT_MD5: "74a88a1d1ae53cf3cb2889e70aed3d6e",
        IKUN_UPDATE_ENABLE: true,
        
        JUHE_API_URL: "https://api.music.lerd.dpdns.org",
        
        QORG_API_URL: "https://api.qlm.org.cn",
        QORG_ENABLED: true,
        
        WYCLOUDMUSIC_API_URL: "https://api.qlm.org.cn",
        WYCLOUDMUSIC_ENABLED: true,
        
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
        REQUEST_TIMEOUT: 12000,
        DECRYPT_TIMEOUT: 18000,
        CONCURRENT_LIMIT: 5,
        MAX_RETRIES: 3,
        RETRY_DELAY: 800,
        URL_VALIDATION_TIMEOUT: 5000,
        STATS_CLEANUP_INTERVAL: 300000,
        PRELOAD_ENABLED: true,
        
        NETEASE_CLOUD_COOKIE_KEY: '_ntes_nnid',
        NETEASE_CLOUD_TOKEN_EXPIRE: 86400000
    };
    
    const QUALITY_LEVELS = ['24bit', 'flac', '320k', '192k', '128k'];
    const PLATFORMS = ['tx', 'wy', 'kw', 'kg', 'mg', 'sixyin', 'local', 'qorg', 'wycloud', 'wycloudmusic'];
    
    const HTTP_REGEX = /^https?:\/\//i;
    const AUDIO_CONTENT_TYPES = ['audio/', 'application/octet-stream', 'binary/octet-stream'];
    
    // ==================== API 端点配置 ====================
    const API_ENDPOINTS = {
        ikun: {
            url: "https://api.ikunshare.com/url",
            script: "https://api.ikunshare.com/script/lxmusic"
        },
        juhe: {
            init: "https://api.music.lerd.dpdns.org/init.conf",
            base: "https://api.music.lerd.dpdns.org"
        },
        qorg: {
            base: "https://api.qlm.org.cn",
            enabled: true,
            endpoints: {
                music: "/music/url",
                search: "/music/search",
                lyric: "/music/lyric",
                wycloud: "/wycloud",
                wycloudCookie: "/wycloud/cookie"
            }
        },
        wycloudmusic: {
            base: "https://api.qlm.org.cn",
            enabled: true,
            endpoints: {
                search: "/search",
                url: "/song/url",
                lyric: "/lyric",
                playlist: "/playlist/detail",
                userPlaylist: "/user/playlist",
                loginCellphone: "/login/cellphone",
                loginStatus: "/login/status"
            }
        },
        xinghaiMain: {
            base: "https://music-api.gdstudio.xyz/api.php",
            params: {
                use_xbridge3: "true",
                loader_name: "forest",
                need_sec_link: "1",
                sec_link_scene: "im",
                theme: "light",
                types: "url"
            }
        },
        xinghaiBackup: {
            base: "https://music-dl.sayqz.com/api/"
        },
        suyin: {
            qq: { url: "https://oiapi.net/api/QQ_Music", key: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575" },
            wy: { url: "https://oiapi.net/api/Music_163" },
            kw: { url: "https://oiapi.net/api/Kuwo" },
            mg: { url: "https://api.xcvts.cn/api/music/migu" }
        },
        changqing: {
            tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
            wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
            kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
            kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}",
            mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
        },
        nianxin: {
            tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
            wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
            kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
            kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
            mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
        },
        qishui: {
            https: "https://api.vsaa.cn/api/music.qishui.vip",
            http: "http://api.vsaa.cn/api/music.qishui.vip",
            proxy: "https://proxy.qishui.vsaa.cn/qishui/proxy",
            backupProxy: "https://api.vsaa.cn/api/qishui/decrypt"
        },
        sixyin: "http://music.sixyin.com/api",
        flower: "http://97.64.37.235/flower/v1",
        grass: "http://97.64.37.235/grass/v1",
        backup: {
            wy: "https://api.injahow.cn/meting/?server=netease&type=url&id={id}&br={br}",
            tx: "https://api.injahow.cn/meting/?server=tencent&type=url&id={id}&br={br}"
        },
        dusiyinyuan: {
            base: "https://api.lxmusic.top/v1",
            fallback: "https://api.lxmusic.net/v1"
        }
    };
    
    const PLATFORM_TO_SOURCE = {
        tx: { main: "tencent", backup: "qq", meting: "tencent", ikun: "tx", dusiyinyuan: "qq", qorg: "qq" },
        wy: { main: "netease", backup: "netease", meting: "netease", ikun: "wy", dusiyinyuan: "wy", qorg: "netease" },
        kw: { main: "kuwo", backup: "kuwo", ikun: "kw", dusiyinyuan: "kw", qorg: "kuwo" },
        kg: { main: "kugou", ikun: "kg", dusiyinyuan: "kg", qorg: "kugou" },
        mg: { main: "migu", ikun: "mg", dusiyinyuan: "mg", qorg: "migu" },
        qorg: { main: "qorg", qorg: "qorg" },
        wycloud: { main: "wycloud", qorg: "wycloud" },
        wycloudmusic: { main: "wycloudmusic" },
        sixyin: { main: "sixyin" },
        local: { main: "local" }
    };
    
    const QUALITY_TO_BR = {
        "128k": "128", "192k": "192", "320k": "320",
        "flac": "740", "flac24bit": "999", "24bit": "999"
    };
    
    const SUYIN_QQ_BR = {
        "128k": 7, "320k": 5, "flac": 4, "hires": 3, "master": 1, "24bit": 1
    };
    
    // ==================== MD5函数 ====================
    function md5(str) {
        if (utils && utils.crypto && typeof utils.crypto.md5 === 'function') {
            return utils.crypto.md5(str);
        }
        function rotateLeft(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        }
        function addUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            if (lX4 | lY4) {
                if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            } else return (lResult ^ lX8 ^ lY8);
        }
        function F(x, y, z) { return (x & y) | ((~x) & z); }
        function G(x, y, z) { return (x & z) | (y & (~z)); }
        function H(x, y, z) { return (x ^ y ^ z); }
        function I(x, y, z) { return (y ^ (x | (~z))); }
        function FF(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function GG(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function HH(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function II(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function convertToWordArray(str) {
            var lWordCount;
            var lMessageLength = str.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            var lWordArray = new Array(lNumberOfWords - 1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        }
        function wordToHex(lValue) {
            var wordToHexValue = "", wordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                wordToHexValue_temp = "0" + lByte.toString(16);
                wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
            }
            return wordToHexValue;
        }
        var x = convertToWordArray(str);
        var a = 0x67452301;
        var b = 0xEFCDAB89;
        var c = 0x98BADCFE;
        var d = 0x10325476;
        for (var k = 0; k < x.length; k += 16) {
            var AA = a, BB = b, CC = c, DD = d;
            a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], 14, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
            c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], 23, 0x04881D05);
            a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], 6, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], 15, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }
    
    // ==================== AES加密函数 ====================
    function aesEncrypt(data, key, iv, mode) {
        if (utils && utils.crypto && typeof utils.crypto.aesEncrypt === 'function') {
            var encMode = mode || 'aes-128-ecb';
            if (!version) {
                encMode = encMode.split('-').pop();
            }
            return utils.crypto.aesEncrypt(data, encMode, key, iv);
        }
        return data;
    }
    
    // ==================== 获取歌曲ID工具函数 ====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        
        switch (platform) {
            case 'kg':
                return info.hash || info.songmid || info.id || info.rid;
            case 'tx':
                var qqMeta = meta.qq || {};
                var mid = qqMeta.mid || meta.mid || info.songmid;
                if (mid) return mid;
                return qqMeta.songid || meta.songid || info.id;
            case 'wy':
            case 'wycloud':
            case 'wycloudmusic':
                return info.songmid || info.id || info.songId;
            case 'kw':
                return info.songmid || info.id || info.rid;
            case 'mg':
                return info.songmid || info.id || info.cid;
            case 'sixyin':
                return info.songmid || info.id || info.hash;
            default:
                return info.songmid || info.id || info.songId || info.hash;
        }
    }
    
    function getHashOrMid(songInfo) {
        if (!songInfo) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        return info.hash || info.songmid || info.id || meta.hash || meta.songmid || null;
    }
    
    function getQQSongId(songInfo) {
        if (!songInfo) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        const qqMeta = meta.qq || {};
        
        var mid = qqMeta.mid || meta.mid || info.songmid ||
            (typeof info.id === 'string' && !/^\d+$/.test(info.id) ? info.id : null);
        if (mid) return { type: 'mid', value: mid };
        
        var songid = qqMeta.songid || meta.songid ||
            (typeof info.id === 'number' ? info.id :
             (typeof info.id === 'string' && /^\d+$/.test(info.id) ? parseInt(info.id, 10) : null));
        if (songid) return { type: 'songid', value: songid };
        return null;
    }
    
    function validateUrl(url, sourceName) {
        if (!url || typeof url !== 'string') throw new Error((sourceName || '源') + '返回空URL');
        const trimmed = url.trim();
        if (!HTTP_REGEX.test(trimmed)) throw new Error((sourceName || '源') + '返回非法URL格式: ' + trimmed.substring(0, 50));
        return trimmed;
    }
    
    function buildCacheKey(prefix, songInfo, quality) {
        if (!prefix) prefix = 'default';
        const info = songInfo || {};
        const name = info.name || info.title || '';
        const singer = info.singer || info.artist || '';
        const id = getHashOrMid(songInfo) || '';
        return prefix + '_' + id + '_' + name + '_' + singer + '_' + (quality || '');
    }
    
    function promiseAny(promises) {
        if (!Array.isArray(promises) || promises.length === 0) {
            return Promise.reject(new Error('No promises provided'));
        }
        
        if (typeof Promise.any === 'function') {
            return Promise.any(promises);
        }
        
        return new Promise(function(resolve, reject) {
            var pending = promises.length;
            var errors = new Array(pending);
            
            promises.forEach(function(p, index) {
                Promise.resolve(p).then(
                    function(value) { resolve(value); },
                    function(error) {
                        errors[index] = error;
                        pending--;
                        if (pending === 0) {
                            var err = new Error('所有请求均失败');
                            err.errors = errors;
                            reject(err);
                        }
                    }
                );
            });
        });
    }
    
    function withTimeout(promise, ms, errorMsg) {
        if (!promise || typeof promise.then !== 'function') {
            return Promise.reject(new Error('Invalid promise'));
        }
        return Promise.race([
            promise,
            new Promise(function(_, reject) {
                Timer.create(function() {
                    reject(new Error(errorMsg || '操作超时'));
                }, ms || 10000);
            })
        ]);
    }
    
    // ==================== HTTP 请求封装 ====================
    function httpFetch(url, options) {
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('Invalid URL'));
        }
        return new Promise(function(resolve, reject) {
            var timeout = (options && options.timeout) || CONFIG.REQUEST_TIMEOUT;
            var timer = Timer.create(function() {
                reject(new Error('请求超时: ' + url.substring(0, 50) + '...'));
            }, timeout);
            
            request(url, options, function(err, resp) {
                Timer.clear(timer);
                if (err) {
                    reject(new Error('请求错误: ' + (err.message || err)));
                    return;
                }
                resolve(resp || {});
            });
        });
    }
    
    function httpRequestWithRetry(url, options, retries) {
        var lastError = null;
        var maxRetries = retries || 0;
        
        function attempt(i) {
            if (i > maxRetries) {
                return Promise.reject(lastError || new Error('所有重试均失败'));
            }
            
            if (i > 0) {
                console.log('[聚合音源] 第' + i + '次重试: ' + (url || '').substring(0, 80) + '...');
            }
            
            var delayPromise = i > 0 ? Timer.delay(CONFIG.RETRY_DELAY * i) : Promise.resolve();
            
            return delayPromise.then(function() {
                return httpFetch(url, options).then(function(resp) {
                    var body = resp.body;
                    var contentType = safeUtils.get(resp, 'headers.content-type', '');
                    
                    if (typeof body === 'string') {
                        var trimmed = body.trim();
                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try { body = JSON.parse(trimmed); } catch (e) {}
                        }
                    }
                    
                    return {
                        statusCode: resp.statusCode || 0,
                        headers: resp.headers || {},
                        body: body,
                        contentType: contentType
                    };
                }).catch(function(e) {
                    lastError = e;
                    console.warn('[聚合音源] 请求失败 (' + (i + 1) + '/' + (maxRetries + 1) + '): ' + (e.message || e));
                    return attempt(i + 1);
                });
            });
        }
        
        return attempt(0);
    }
    
    function httpGet(url, params, timeout) {
        var queryStr = '';
        if (params && typeof params === 'object') {
            var parts = [];
            for (var k in params) {
                if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
                }
            }
            queryStr = parts.join('&');
        }
        
        var fullUrl = url;
        if (queryStr) {
            fullUrl = url + ((url || '').indexOf('?') !== -1 ? '&' : '?') + queryStr;
        }
        
        return httpRequestWithRetry(fullUrl, { method: 'GET', timeout: timeout }).then(function(res) {
            return res.body;
        });
    }
    
    function httpPost(url, body, timeout) {
        return httpRequestWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body || {}),
            timeout: timeout
        }).then(function(res) {
            return res.body;
        });
    }
    
    function httpGetWithFallback(urls, params, timeout) {
        var urlArray = Array.isArray(urls) ? urls : [urls];
        var lastError = null;
        
        function tryNext(index) {
            if (index >= urlArray.length) {
                return Promise.reject(lastError || new Error('所有请求地址均失败'));
            }
            
            var baseUrl = urlArray[index];
            if (!baseUrl) {
                return tryNext(index + 1);
            }
            
            var queryStr = '';
            if (params && typeof params === 'object') {
                var parts = [];
                for (var k in params) {
                    if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null) {
                        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
                    }
                }
                queryStr = parts.join('&');
            }
            
            var fullUrl = baseUrl;
            if (queryStr) {
                fullUrl = baseUrl + ((baseUrl || '').indexOf('?') !== -1 ? '&' : '?') + queryStr;
            }
            
            return httpRequestWithRetry(fullUrl, { method: 'GET', timeout: timeout }).then(function(res) {
                return res.body;
            }).catch(function(e) {
                lastError = e;
                return tryNext(index + 1);
            });
        }
        
        return tryNext(0);
    }
    
    function validateUrlWithHead(url) {
        if (!url || typeof url !== 'string') return Promise.resolve(false);
        
        return withTimeout(
            httpFetch(url, { method: 'HEAD', timeout: CONFIG.URL_VALIDATION_TIMEOUT }),
            CONFIG.URL_VALIDATION_TIMEOUT,
            'URL验证超时'
        ).then(function(result) {
            var contentType = safeUtils.get(result, 'headers.content-type', '');
            if (!contentType) return true;
            
            var isValidAudio = false;
            for (var i = 0; i < AUDIO_CONTENT_TYPES.length; i++) {
                if (safeUtils.stringIncludes(contentType, AUDIO_CONTENT_TYPES[i])) {
                    isValidAudio = true;
                    break;
                }
            }
            return isValidAudio;
        }).catch(function(e) {
            return true;
        });
    }
    
    // ==================== LRU缓存 ====================
    function LRUCache(maxSize, ttl) {
        this.maxSize = maxSize || 100;
        this.ttl = ttl || 300000;
        this.cache = typeof Map !== 'undefined' ? new Map() : {};
    }
    
    LRUCache.prototype.get = function(key) {
        if (!key) return null;
        if (this.cache instanceof Map) {
            var item = this.cache.get(key);
            if (!item) return null;
            if (Date.now() > item.expiry) {
                this.cache.delete(key);
                return null;
            }
            this.cache.delete(key);
            this.cache.set(key, item);
            return item.value;
        } else {
            var item = this.cache[key];
            if (!item) return null;
            if (Date.now() > item.expiry) {
                delete this.cache[key];
                return null;
            }
            delete this.cache[key];
            this.cache[key] = item;
            return item.value;
        }
    };
    
    LRUCache.prototype.set = function(key, value) {
        if (!key) return;
        if (this.cache instanceof Map) {
            if (this.cache.size >= this.maxSize) {
                try {
                    var firstKey = this.cache.keys().next().value;
                    if (firstKey !== undefined) this.cache.delete(firstKey);
                } catch (e) {}
            }
            this.cache.set(key, { value: value, expiry: Date.now() + this.ttl });
        } else {
            var keys = Object.keys(this.cache);
            if (keys.length >= this.maxSize) {
                delete this.cache[keys[0]];
            }
            this.cache[key] = { value: value, expiry: Date.now() + this.ttl };
        }
    };
    
    LRUCache.prototype.delete = function(key) {
        if (!key) return false;
        if (this.cache instanceof Map) {
            return this.cache.delete(key);
        } else {
            var exists = key in this.cache;
            delete this.cache[key];
            return exists;
        }
    };
    
    LRUCache.prototype.clear = function() {
        if (this.cache instanceof Map) {
            this.cache.clear();
        } else {
            this.cache = {};
        }
    };
    
    // ==================== 请求池 ====================
    function RequestPool(maxConcurrent) {
        this.maxConcurrent = maxConcurrent || 3;
        this.running = 0;
        this.queue = [];
    }
    
    RequestPool.prototype.execute = function(fn) {
        if (typeof fn !== 'function') {
            return Promise.reject(new Error('Invalid function'));
        }
        var self = this;
        return new Promise(function(resolve, reject) {
            var task = function() {
                var result;
                try {
                    result = fn();
                } catch (e) {
                    self.running--;
                    self.next();
                    reject(e);
                    return;
                }
                
                if (result && typeof result.then === 'function') {
                    result.then(function(value) {
                        self.running--;
                        self.next();
                        resolve(value);
                    }).catch(function(e) {
                        self.running--;
                        self.next();
                        reject(e);
                    });
                } else {
                    self.running--;
                    self.next();
                    resolve(result);
                }
            };
            self.queue.push(task);
            self.next();
        });
    };
    
    RequestPool.prototype.next = function() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
        this.running++;
        var task = this.queue.shift();
        if (typeof task === 'function') task();
    };
    
    // ==================== 全局状态 ====================
    const state = {
        urlCache: new LRUCache(CONFIG.CACHE_MAX_SIZE, CONFIG.CACHE_TTL_URL),
        searchCache: new LRUCache(50, CONFIG.CACHE_TTL_SEARCH),
        requestPool: new RequestPool(CONFIG.CONCURRENT_LIMIT),
        stats: { hits: 0, misses: 0, requests: 0, success: 0, fail: 0 },
        activeRequests: {},
        initialized: false,
        juheInited: false,
        ikunChecked: false,
        cleanupTimer: null,
        wycloudCookie: null,
        wycloudCookieExpire: 0,
        wycloudmusicCookie: null,
        wycloudmusicLoginStatus: { isLogin: false },
        announcementSent: false,
        preloadQueue: [],
        preloadTimer: null,
        currentPlaylist: null,
        currentTrackIndex: -1,
        preloadedUrls: new Map()
    };
    
    // ==================== 发送公告 ====================
    function sendAnnouncement() {
        if (state.announcementSent) return;
        state.announcementSent = true;
        
        try {
            if (typeof send === 'function') {
                send(EVENT_NAMES.updateAlert, {
                    log: ANNOUNCEMENT.content,
                    updateUrl: ANNOUNCEMENT.repo
                });
            }
        } catch (e) {
            console.warn('[聚合音源] send updateAlert 失败:', e.message);
        }
    }
    
    // ==================== 定时统计清理 ====================
    function startStatsCleanup() {
        function cleanup() {
            if (state.stats.requests > 1000) {
                state.stats.requests = 0;
                state.stats.hits = 0;
                state.stats.misses = 0;
                state.stats.success = 0;
                state.stats.fail = 0;
            }
            
            var total = state.stats.success + state.stats.fail;
            if (total > 0) {
                var successRate = (state.stats.success / total * 100).toFixed(1);
                console.log('[聚合音源] 统计: 请求' + state.stats.requests + '次, 成功率' + successRate + '%, 缓存命中' + state.stats.hits + '次');
            }
            
            state.cleanupTimer = Timer.create(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
        }
        
        state.cleanupTimer = Timer.create(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
    }
    
    // ==================== 预加载下一首功能 ====================
    function setCurrentPlaylist(playlist, currentIndex) {
        if (!playlist || !Array.isArray(playlist) || playlist.length === 0) return;
        state.currentPlaylist = playlist;
        state.currentTrackIndex = currentIndex >= 0 ? currentIndex : 0;
        console.log('[聚合音源] 播放列表已更新: ' + playlist.length + '首, 当前: ' + (currentIndex + 1));
    }
    
    function preloadNextTrack() {
        if (!CONFIG.PRELOAD_ENABLED) return;
        if (!state.currentPlaylist || state.currentPlaylist.length === 0) return;
        
        var nextIndex = state.currentTrackIndex + 1;
        if (nextIndex >= state.currentPlaylist.length) {
            return;
        }
        
        var nextTrack = state.currentPlaylist[nextIndex];
        if (!nextTrack) return;
        
        var cacheKey = buildCacheKey(nextTrack._source || 'unknown', nextTrack, '320k');
        
        if (state.preloadedUrls.has(cacheKey)) {
            return;
        }
        
        console.log('[聚合音源] 开始预加载下一首: ' + (nextTrack.name || '未知'));
        
        getUrlWithFallback(nextTrack._source || 'wy', nextTrack, '320k').then(function(url) {
            if (url) {
                state.preloadedUrls.set(cacheKey, {
                    url: url,
                    track: nextTrack,
                    timestamp: Date.now(),
                    expiry: Date.now() + CONFIG.CACHE_TTL_URL
                });
                console.log('[聚合音源] 预加载成功: ' + (nextTrack.name || '未知'));
            }
        }).catch(function(e) {
            console.warn('[聚合音源] 预加载失败: ' + (e.message || e));
        });
    }
    
    function getPreloadedUrl(songInfo) {
        var cacheKey = buildCacheKey(songInfo._source || 'unknown', songInfo, '320k');
        var cached = state.preloadedUrls.get(cacheKey);
        
        if (cached && Date.now() < cached.expiry) {
            state.preloadedUrls.delete(cacheKey);
            console.log('[聚合音源] 使用预加载URL: ' + (songInfo.name || '未知'));
            return cached.url;
        }
        
        if (cached) {
            state.preloadedUrls.delete(cacheKey);
        }
        
        return null;
    }
    
    function cleanPreloadedUrls() {
        var now = Date.now();
        state.preloadedUrls.forEach(function(value, key) {
            if (now > value.expiry) {
                state.preloadedUrls.delete(key);
            }
        });
    }
    
    // ==================== 网易云盘 Cookie 管理 ====================
    function getWycloudCookieFromStorage() {
        try {
            if (lx && lx.getConfig && typeof lx.getConfig === 'function') {
                var cookie = lx.getConfig(CONFIG.NETEASE_CLOUD_COOKIE_KEY);
                if (cookie) return cookie;
            }
            if (typeof localStorage !== 'undefined') {
                var cookie = localStorage.getItem(CONFIG.NETEASE_CLOUD_COOKIE_KEY);
                if (cookie) return cookie;
            }
            if (globalObj[CONFIG.NETEASE_CLOUD_COOKIE_KEY]) {
                return globalObj[CONFIG.NETEASE_CLOUD_COOKIE_KEY];
            }
        } catch (e) {
            console.warn('[网易云盘] 读取Cookie失败:', e.message);
        }
        return null;
    }
    
    function saveWycloudCookieToStorage(cookie) {
        try {
            if (lx && lx.setConfig && typeof lx.setConfig === 'function') {
                lx.setConfig(CONFIG.NETEASE_CLOUD_COOKIE_KEY, cookie);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(CONFIG.NETEASE_CLOUD_COOKIE_KEY, cookie);
            }
            globalObj[CONFIG.NETEASE_CLOUD_COOKIE_KEY] = cookie;
            
            state.wycloudCookie = cookie;
            state.wycloudCookieExpire = Date.now() + CONFIG.NETEASE_CLOUD_TOKEN_EXPIRE;
            
            console.log('[网易云盘] Cookie已保存');
        } catch (e) {
            console.warn('[网易云盘] 保存Cookie失败:', e.message);
        }
    }
    
    function isWycloudCookieValid() {
        if (!state.wycloudCookie) return false;
        if (Date.now() > state.wycloudCookieExpire) {
            state.wycloudCookie = null;
            return false;
        }
        return true;
    }
    
    function autoGetWycloudCookie() {
        console.log('[网易云盘] 尝试获取Cookie...');
        
        var storedCookie = getWycloudCookieFromStorage();
        if (storedCookie) {
            state.wycloudCookie = storedCookie;
            state.wycloudCookieExpire = Date.now() + CONFIG.NETEASE_CLOUD_TOKEN_EXPIRE;
            console.log('[网易云盘] 从存储加载Cookie成功');
            
            return testWycloudCookie().then(function() {
                return storedCookie;
            }).catch(function(e) {
                console.warn('[网易云盘] 存储的Cookie已失效，需要重新获取');
                state.wycloudCookie = null;
                return fetchCookieFromApi();
            });
        }
        
        return fetchCookieFromApi();
        
        function fetchCookieFromApi() {
            var url = CONFIG.QORG_API_URL + API_ENDPOINTS.qorg.endpoints.wycloudCookie;
            return httpGet(url, {}, 10000).then(function(res) {
                if (res && res.code === 200 && res.data && res.data.cookie) {
                    var cookie = res.data.cookie;
                    saveWycloudCookieToStorage(cookie);
                    console.log('[网易云盘] 从API获取Cookie成功');
                    return cookie;
                }
                return null;
            }).catch(function(e) {
                console.warn('[网易云盘] 从API获取Cookie失败:', e.message);
                console.log('[网易云盘] 请手动设置网易云音乐Cookie（可通过setCookie操作设置）');
                return null;
            });
        }
    }
    
    function testWycloudCookie() {
        if (!state.wycloudCookie) {
            return Promise.reject(new Error('未设置Cookie'));
        }
        
        var url = CONFIG.QORG_API_URL + API_ENDPOINTS.qorg.endpoints.wycloud + '/test';
        return httpPost(url, {
            cookie: state.wycloudCookie
        }, 10000).then(function(res) {
            if (res && res.code === 200) {
                return true;
            }
            throw new Error((res && res.msg) || 'Cookie验证失败');
        });
    }
    
    function setWycloudCookie(cookie) {
        if (!cookie || typeof cookie !== 'string') {
            return Promise.reject(new Error('无效的Cookie'));
        }
        
        if (cookie.indexOf('MUSIC_U') === -1 && cookie.indexOf('__csrf') === -1) {
            console.warn('[网易云盘] Cookie格式可能不正确，建议包含MUSIC_U和__csrf');
        }
        
        saveWycloudCookieToStorage(cookie);
        
        return testWycloudCookie().then(function() {
            console.log('[网易云盘] Cookie设置成功并验证通过');
            return true;
        }).catch(function(e) {
            console.warn('[网易云盘] Cookie设置成功但验证失败:', e.message);
            return true;
        });
    }
    
    // ==================== 各音源处理器 ====================
    
    // ikun 音源处理器
    function ikunGetMusicUrl(source, musicInfo, quality) {
        var songId = (musicInfo || {}).hash || (musicInfo || {}).songmid;
        if (!songId) throw new Error('缺少歌曲ID');
        
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(
            CONFIG.IKUN_API_URL + '/url?source=' + source + '&songId=' + songId + '&quality=' + (quality || '320k'),
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": userAgent,
                    "X-Request-Key": CONFIG.IKUN_API_KEY
                },
                follow_max: 5
            }
        ).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error("未知错误");
            
            switch (body.code) {
                case 200:
                    return body.url;
                case 403:
                    throw new Error("Key失效/鉴权失败");
                case 500:
                    throw new Error("获取URL失败: " + (body.message || "未知错误"));
                case 429:
                    throw new Error("请求过速");
                default:
                    throw new Error(body.message || "未知错误");
            }
        });
    }
    
    // 肥猫音源处理器
    function feimaoGetMusicUrl(source, musicInfo, quality) {
        var songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('肥猫缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(CONFIG.FEIMAO_API_URL + '/url/' + source + '/' + songId + '/' + quality, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.FEIMAO_API_KEY,
            },
            follow_max: 5,
        }).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error('IP被封禁');
                case 2: throw new Error('获取音乐URL失败');
                case 4: throw new Error('远程服务器错误');
                case 5: throw new Error('请求过于频繁');
                case 6: throw new Error('请求参数错误');
                default: throw new Error(body.msg ?? '未知错误');
            }
        });
    }
    
    // 肥猫不肥音源处理器
    function feimaobufeiGetMusicUrl(source, musicInfo, quality) {
        var songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('肥猫不肥缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(CONFIG.FEIMAOBUFEI_API_URL + '/url/' + source + '/' + songId + '/' + quality, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.FEIMAOBUFEI_API_KEY,
            },
            follow_max: 5,
        }).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error('IP被封禁');
                case 2: throw new Error('获取音乐URL失败');
                case 4: throw new Error('远程服务器错误');
                case 5: throw new Error('请求过于频繁');
                case 6: throw new Error('请求参数错误');
                default: throw new Error(body.msg ?? '未知错误');
            }
        });
    }
    
    // 梓澄公益音源处理器
    function zichengGetMusicUrl(source, musicInfo, quality) {
        var songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('梓澄缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(CONFIG.ZICHENG_API_URL + '/url/' + source + '/' + songId + '/' + quality, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENG_API_KEY,
            },
        }).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error('IP被封禁');
                case 2: throw new Error('获取音乐URL失败');
                case 4: throw new Error('远程服务器错误');
                case 5: throw new Error('请求过于频繁');
                default: throw new Error(body.msg ?? '未知错误');
            }
        });
    }
    
    // 梓澄qwq音源处理器
    function zichengqwqGetMusicUrl(source, musicInfo, quality) {
        var songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('梓澄qwq缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(CONFIG.ZICHENGQWQ_API_URL + '/url/' + source + '/' + songId + '/' + quality, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENGQWQ_API_KEY,
            },
            follow_max: 5,
        }).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error('IP被封禁');
                case 2: throw new Error('获取音乐URL失败');
                case 4: throw new Error('远程服务器错误');
                case 5: throw new Error('请求过于频繁');
                case 6: throw new Error('请求参数错误');
                default: throw new Error(body.msg ?? '未知错误');
            }
        });
    }
    
    // 梓澄公益2代音源处理器
    function zicheng2GetMusicUrl(source, musicInfo, quality) {
        var songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('梓澄2代缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        
        return httpFetch(CONFIG.ZICHENG2_API_URL + '/url/' + source + '/' + songId + '/' + quality, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENG2_API_KEY,
            },
        }).then(function(res) {
            var body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error('IP被封禁');
                case 2: throw new Error('获取音乐URL失败');
                case 4: throw new Error('远程服务器错误');
                case 5: throw new Error('请求过于频繁');
                case 6: throw new Error('请求参数错误');
                default: throw new Error(body.msg ?? '未知错误');
            }
        });
    }
    
    // 聚合API (juhe) 处理器
    function juheInit() {
        if (state.juheInited) return Promise.resolve();
        
        return httpFetch(CONFIG.JUHE_API_URL + '/init.conf', { method: 'GET' }).then(function(res) {
            var body = res.body;
            
            if (!body || body.code !== 200) {
                console.warn('[聚合音源] juhe初始化失败');
                return;
            }
            
            var data = body.data;
            if (data && data.update && data.update.version > version) {
                console.log('[聚合音源] juhe发现新版本:', data.update.version);
            }
            
            state.juheInited = true;
        }).catch(function(e) {
            console.warn('[聚合音源] juhe初始化错误:', e.message || e);
        });
    }
    
    function juheGetMusicUrl(platform, songId, quality, songInfo) {
        if (!songId && songInfo) {
            songId = getHashOrMid(songInfo);
        }
        if (!songId) throw new Error('juhe缺少歌曲ID');
        
        return httpPost(
            CONFIG.JUHE_API_URL + '/' + platform,
            { id: songId, quality: quality },
            CONFIG.REQUEST_TIMEOUT
        ).then(function(body) {
            if (!body) throw new Error('juhe返回空响应');
            
            if (body.code === 200) {
                return safeUtils.get(body, 'data.url');
            }
            
            if (body.code === 303) {
                try {
                    var data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
                    var reqData = data.request || {};
                    var respData = data.response || {};
                    
                    return httpFetch(encodeURI(reqData.url || ''), reqData.options || {}).then(function(nestedRes) {
                        var value = nestedRes;
                        var checkKeys = safeUtils.toArray(respData.check?.key);
                        for (var i = 0; i < checkKeys.length; i++) {
                            if (value == null) break;
                            value = value[checkKeys[i]];
                        }
                        
                        if (value === safeUtils.get(respData, 'check.value')) {
                            var url = nestedRes;
                            var urlKeys = safeUtils.toArray(respData.url);
                            for (var j = 0; j < urlKeys.length; j++) {
                                if (url == null) break;
                                url = url[urlKeys[j]];
                            }
                            if (url && safeUtils.startsWith(url, 'http')) {
                                return url;
                            }
                        }
                        throw new Error('juhe 303验证失败');
                    });
                } catch (e) {
                    throw new Error('juhe 303处理失败: ' + (e.message || e));
                }
            }
            
            throw new Error(body.msg || "juhe请求失败");
        });
    }
    
    // 六音音源
    function sixyinGetUrl(platform, songId, quality, songInfo) {
        var id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('六音音源：缺少歌曲ID');
        
        var type;
        switch (platform) {
            case 'tx': type = 'qq'; break;
            case 'wy': type = 'netease'; break;
            case 'kw': type = 'kuwo'; break;
            case 'kg': type = 'kugou'; break;
            case 'mg': type = 'migu'; break;
            default: throw new Error('六音音源：不支持该平台');
        }
        
        var apiUrl = API_ENDPOINTS.sixyin + '/url?type=' + type + '&id=' + id + '&quality=' + (quality || '320k');
        return httpGet(apiUrl).then(function(res) {
            if (!res || !res.url) {
                throw new Error('六音音源：未返回有效播放地址');
            }
            return validateUrl(res.url, '六音音源');
        }).catch(function(err) {
            console.warn('[六音音源] 请求失败：', err.message);
            throw err;
        });
    }
    
    // qorg API 处理器
    function qorgGetMusicUrl(platform, songInfo, quality) {
        var songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) throw new Error('qorg 缺少歌曲ID');
        
        var source;
        switch (platform) {
            case 'tx': source = 'qq'; break;
            case 'wy': source = 'netease'; break;
            case 'kw': source = 'kuwo'; break;
            case 'kg': source = 'kugou'; break;
            case 'mg': source = 'migu'; break;
            default: source = platform;
        }
        
        var url = CONFIG.QORG_API_URL + '/music/url';
        var timestamp = Date.now();
        var signData = source + songId + quality + timestamp;
        var sign = md5(signData);
        
        return httpPost(url, {
            source: source,
            songId: String(songId),
            quality: quality || '320k',
            timestamp: timestamp,
            sign: sign
        }, CONFIG.REQUEST_TIMEOUT).then(function(res) {
            if (res && res.code === 200 && res.data && res.data.url) {
                var resultUrl = res.data.url;
                if (!HTTP_REGEX.test(resultUrl)) {
                    throw new Error('qorg 返回了非法的URL格式');
                }
                return resultUrl;
            }
            throw new Error((res && res.msg) || 'qorg 获取失败');
        });
    }
    
    function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return Promise.resolve({ isEnd: true, list: [], total: 0, page: page, limit: pageSize });
        
        var cacheKey = 'qorg_search_' + keyword + '_' + page;
        var cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return Promise.resolve(cached); }
        state.stats.misses++;
        
        var url = CONFIG.QORG_API_URL + '/music/search';
        return httpPost(url, {
            keyword: keyword,
            page: page,
            pageSize: pageSize
        }, CONFIG.REQUEST_TIMEOUT).then(function(res) {
            if (res && res.code === 200 && res.data) {
                var list = (res.data.list || []).map(function(item) {
                    return {
                        id: String(item.id || ''),
                        songmid: String(item.id || ''),
                        name: item.name || '未知歌曲',
                        singer: item.singer || item.artist || '未知歌手',
                        albumName: item.album || '',
                        duration: item.duration || 0,
                        pic: item.pic || item.cover || '',
                        _source: 'qorg'
                    };
                });
                
                var result = {
                    isEnd: list.length < pageSize,
                    list: list,
                    total: res.data.total || list.length,
                    page: page,
                    limit: pageSize
                };
                
                state.searchCache.set(cacheKey, result);
                return result;
            }
            
            return { isEnd: true, list: [], total: 0, page: page, limit: pageSize };
        });
    }
    
    function qorgGetLyric(songInfo) {
        var songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) return Promise.resolve({ lyric: '' });
        
        var cacheKey = 'qorg_lyric_' + songId;
        var cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return Promise.resolve({ lyric: cached }); }
        state.stats.misses++;
        
        var url = CONFIG.QORG_API_URL + '/music/lyric';
        return httpPost(url, {
            songId: String(songId)
        }, CONFIG.REQUEST_TIMEOUT).then(function(res) {
            if (res && res.code === 200 && res.data) {
                var lyric = res.data.lyric || '';
                state.urlCache.set(cacheKey, lyric);
                return { lyric: lyric };
            }
            return { lyric: '' };
        });
    }
    
    // 自建网易云音源处理器
    var WYCLOUDMUSIC_QUALITY_MAP = {
        '128k': { level: 'standard', br: 128000 },
        '192k': { level: 'higher', br: 192000 },
        '320k': { level: 'higher', br: 320000 },
        'flac': { level: 'lossless', br: 999000 }
    };
    
    function convertWycloudmusicSong(song) {
        if (!song || typeof song !== 'object') return null;
        var singerName = song.ar && Array.isArray(song.ar)
            ? song.ar.map(function(artist) { return artist.name; }).join('、')
            : '未知歌手';
        return {
            id: String(song.id || ''),
            songmid: String(song.id || ''),
            name: song.name || '未知歌曲',
            singer: singerName,
            albumName: song.al?.name || '',
            duration: song.dt ? Math.floor(song.dt / 1000) : 0,
            pic: song.al?.picUrl || '',
            _source: 'wycloudmusic'
        };
    }
    
    function wycloudmusicSearch(keyword, page, limit) {
        var pageNum = page || 1;
        var pageSize = limit || 30;
        
        if (!keyword || typeof keyword !== 'string') {
            return Promise.resolve({ list: [], total: 0, limit: pageSize, page: pageNum });
        }
        
        var cacheKey = 'wycloudmusic_search_' + keyword + '_' + pageNum + '_' + pageSize;
        var cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return Promise.resolve(cached); }
        state.stats.misses++;
        
        var url = CONFIG.WYCLOUDMUSIC_API_URL + API_ENDPOINTS.wycloudmusic.endpoints.search;
        return httpGet(url, {
            keywords: keyword.trim(),
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            type: 1
        }).then(function(res) {
            if (res.code !== 200 || !res.result || !Array.isArray(res.result.songs)) {
                return { list: [], total: 0, limit: pageSize, page: pageNum };
            }
            
            var songs = res.result.songs;
            var list = [];
            for (var i = 0; i < songs.length; i++) {
                var converted = convertWycloudmusicSong(songs[i]);
                if (converted !== null) list.push(converted);
            }
            var result = {
                list: list,
                total: res.result.songCount || list.length,
                limit: pageSize,
                page: pageNum
            };
            
            state.searchCache.set(cacheKey, result);
            return result;
        }).catch(function(e) {
            console.warn('[自建网易云] 搜索失败:', e.message);
            return { list: [], total: 0, limit: pageSize, page: pageNum };
        });
    }
    
    function wycloudmusicGetMusicUrl(songInfo, quality) {
        var songId = songInfo.id || songInfo.songmid;
        if (!songId) throw new Error('自建网易云缺少歌曲ID');
        
        var q = (quality || '128k').toLowerCase();
        var config = WYCLOUDMUSIC_QUALITY_MAP[q] || WYCLOUDMUSIC_QUALITY_MAP['128k'];
        
        var cacheKey = 'wycloudmusic_url_' + songId + '_' + q;
        var cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return Promise.resolve(cached); }
        state.stats.misses++;
        
        var url = CONFIG.WYCLOUDMUSIC_API_URL + API_ENDPOINTS.wycloudmusic.endpoints.url;
        return httpGet(url, { 
            id: songId, 
            br: config.br 
        }).then(function(res) {
            if (res.code !== 200 || !res.data || !Array.isArray(res.data) || res.data.length === 0) {
                throw new Error('自建网易云获取URL失败');
            }
            
            var song = res.data[0];
            var playUrl = song.url || null;
            if (playUrl && HTTP_REGEX.test(playUrl)) {
                state.urlCache.set(cacheKey, playUrl);
                state.stats.success++;
                return playUrl;
            }
            throw new Error('自建网易云返回空URL');
        });
    }
    
    // 网易云盘获取音乐URL
    function wycloudGetMusicUrl(songInfo, quality) {
        var cookiePromise;
        if (!state.wycloudCookie) {
            cookiePromise = autoGetWycloudCookie();
        } else {
            cookiePromise = Promise.resolve(state.wycloudCookie);
        }
        
        return cookiePromise.then(function(cookie) {
            if (!cookie) {
                throw new Error('网易云盘Cookie未设置');
            }
            
            var songId = songInfo.id || songInfo.songmid || getHashOrMid(songInfo);
            if (!songId) throw new Error('网易云盘：缺少歌曲ID');
            
            var cacheKey = 'wycloud_url_' + songId + '_' + (quality || '320k');
            var cached = state.urlCache.get(cacheKey);
            if (cached) { state.stats.hits++; return cached; }
            state.stats.misses++;
            
            var url = CONFIG.QORG_API_URL + API_ENDPOINTS.qorg.endpoints.wycloud + '/url';
            return httpPost(url, {
                id: String(songId),
                quality: quality || '320k',
                cookie: cookie
            }, CONFIG.REQUEST_TIMEOUT).then(function(res) {
                if (res && res.code === 200 && res.data && res.data.url) {
                    var playUrl = res.data.url;
                    if (HTTP_REGEX.test(playUrl)) {
                        state.urlCache.set(cacheKey, playUrl);
                        state.stats.success++;
                        return playUrl;
                    }
                    throw new Error('网易云盘返回非法URL');
                }
                throw new Error((res && res.msg) || '网易云盘获取URL失败');
            }).catch(function(e) {
                state.stats.fail++;
                throw new Error('网易云盘获取失败: ' + e.message);
            });
        });
    }
    
    // ==================== 音源处理器注册表 ====================
    // 【修复点1】调整音源优先级，让更可靠的音源优先尝试
    var SOURCE_HANDLERS = {
        ikun: { name: 'ikun', fn: ikunGetMusicUrl, priority: 1, timeout: 8000, requireSource: true },
        juhe: { name: '聚合API', fn: juheGetMusicUrl, priority: 2, timeout: 10000, requireSource: false },
        qorg: { name: 'qorg', fn: qorgGetMusicUrl, priority: 3, timeout: 8000, requireSource: false },
        sixyin: { name: '六音', fn: sixyinGetUrl, priority: 4, timeout: 10000, requireSource: false },
        feimao: { name: '肥猫', fn: feimaoGetMusicUrl, priority: 5, timeout: 8000, requireSource: true },
        feimaobufei: { name: '肥猫不肥', fn: feimaobufeiGetMusicUrl, priority: 6, timeout: 8000, requireSource: true },
        zicheng: { name: '梓澄公益', fn: zichengGetMusicUrl, priority: 7, timeout: 8000, requireSource: true },
        zichengqwq: { name: '梓澄qwq', fn: zichengqwqGetMusicUrl, priority: 8, timeout: 8000, requireSource: true },
        zicheng2: { name: '梓澄公益2代', fn: zicheng2GetMusicUrl, priority: 9, timeout: 8000, requireSource: true },
        wycloud: { name: '网易云盘', fn: wycloudGetMusicUrl, priority: 10, timeout: 12000, requireSource: false },
        wycloudmusic: { name: '自建网易云', fn: wycloudmusicGetMusicUrl, priority: 11, timeout: 12000, requireSource: false }
    };
    
    // ==================== 构建音源链 ====================
    function buildSourceChain(platform) {
        var chain = [];
        
        var handlerOrder = [
            'ikun', 'juhe', 'qorg', 'sixyin', 
            'feimao', 'feimaobufei', 'zicheng', 'zichengqwq', 
            'zicheng2', 'wycloud', 'wycloudmusic'
        ];
        
        var platformSupports = {
            ikun: !!(PLATFORM_TO_SOURCE[platform] && PLATFORM_TO_SOURCE[platform].ikun),
            juhe: true,
            qorg: ['tx', 'wy', 'kw', 'kg', 'mg', 'qorg'].indexOf(platform) !== -1,
            sixyin: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            feimao: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            feimaobufei: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            zicheng: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            zichengqwq: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            zicheng2: ['tx', 'wy', 'kw', 'kg', 'mg'].indexOf(platform) !== -1,
            wycloud: platform === 'wycloud',
            wycloudmusic: platform === 'wycloudmusic'
        };
        
        for (var i = 0; i < handlerOrder.length; i++) {
            var handlerName = handlerOrder[i];
            if (platformSupports[handlerName] !== false) {
                var handler = SOURCE_HANDLERS[handlerName];
                if (handler) {
                    chain.push(handler);
                }
            }
        }
        
        chain.sort(function(a, b) { return a.priority - b.priority; });
        return chain;
    }
    
    // ==================== 主获取函数（带音源回退） ====================
    function getUrlWithFallback(platform, songInfo, quality) {
        if (!platform || safeUtils.includes(PLATFORMS, platform) === false) {
            return Promise.reject(new Error('不支持的平台: ' + platform));
        }
        if (!songInfo || typeof songInfo !== 'object') {
            return Promise.reject(new Error('无效的歌曲信息'));
        }
        
        var resolvedQuality = quality || '320k';
        var songId = getSongId(platform, songInfo);
        
        // 【修复点2】使用不同的缓存键策略，避免不同平台间的缓存冲突
        var cacheKey = 'v7.1.3_' + platform + '_' + buildCacheKey(platform, songInfo, resolvedQuality) + '_' + Date.now().toString(36);
        var cached = state.urlCache.get(cacheKey);
        if (cached) {
            state.stats.hits++;
            console.log('[聚合音源] 缓存命中: ' + platform);
            return validateUrlWithHead(cached).then(function(isValid) {
                if (isValid) {
                    return cached;
                } else {
                    console.warn('[聚合音源] 缓存URL已失效，删除缓存');
                    state.urlCache.delete(cacheKey);
                    return getUrlFromSources(platform, songInfo, resolvedQuality, cacheKey);
                }
            });
        }
        state.stats.misses++;
        
        return getUrlFromSources(platform, songInfo, resolvedQuality, cacheKey);
    }
    
    function getUrlFromSources(platform, songInfo, resolvedQuality, cacheKey) {
        var requestKey = platform + '_' + (songInfo.name || '') + '_' + resolvedQuality;
        
        // 检查预加载缓存
        var preloadedUrl = getPreloadedUrl(songInfo);
        if (preloadedUrl) {
            console.log('[聚合音源] 使用预加载URL');
            return Promise.resolve(preloadedUrl);
        }
        
        var promise;
        
        // 特定平台处理
        if (platform === 'qorg') {
            promise = SOURCE_HANDLERS.qorg.fn(platform, songInfo, resolvedQuality).then(function(url) {
                var validated = validateUrl(url, 'qorg');
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                return validated;
            }).catch(function(e) {
                state.stats.fail++;
                throw e;
            });
        } else if (platform === 'wycloud') {
            promise = wycloudGetMusicUrl(songInfo, resolvedQuality).then(function(url) {
                var validated = validateUrl(url, '网易云盘');
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                return validated;
            }).catch(function(e) {
                state.stats.fail++;
                throw e;
            });
        } else if (platform === 'wycloudmusic') {
            promise = wycloudmusicGetMusicUrl(songInfo, resolvedQuality).then(function(url) {
                var validated = validateUrl(url, '自建网易云');
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                return validated;
            }).catch(function(e) {
                state.stats.fail++;
                throw e;
            });
        } else {
            var chain = buildSourceChain(platform);
            if (chain.length === 0) {
                promise = Promise.reject(new Error('平台 ' + platform + ' 没有可用的音源'));
            } else {
                // 【修复点3】尝试所有音源，自动切换，使用更合理的错误处理
                promise = trySourceChainWithTimeout(chain, platform, songId, resolvedQuality, songInfo, cacheKey);
            }
        }
        
        if (!promise) {
            promise = Promise.reject(new Error('无法创建请求'));
        }
        
        return promise;
    }
    
    // 【修复点4】添加整体超时控制，防止某个音源卡住整个流程
    function trySourceChainWithTimeout(chain, platform, songId, resolvedQuality, songInfo, cacheKey) {
        var overallTimeout = 15000; // 整体超时15秒
        return withTimeout(
            trySourceChain(chain, platform, songId, resolvedQuality, songInfo, cacheKey),
            overallTimeout,
            '所有音源请求超时'
        );
    }
    
    function trySourceChain(chain, platform, songId, resolvedQuality, songInfo, cacheKey) {
        var errors = [];
        var startTime = Date.now();
        
        function tryNext(index) {
            if (index >= chain.length) {
                state.stats.fail++;
                var errorSummary = errors.map(function(e, i) {
                    return (i + 1) + '.' + e;
                }).join('; ');
                return Promise.reject(new Error('所有音源均失败: ' + errorSummary));
            }
            
            // 【修复点5】检查是否已经超时
            if (Date.now() - startTime > 12000) {
                return Promise.reject(new Error('音源链回退超时'));
            }
            
            var handler = chain[index];
            console.log('[聚合音源] 尝试: ' + handler.name + ' (' + platform + ') 优先级: ' + handler.priority);
            
            var source = (PLATFORM_TO_SOURCE[platform] && PLATFORM_TO_SOURCE[platform].ikun) || platform;
            
            var urlPromise;
            if (handler.requireSource) {
                urlPromise = withTimeout(
                    handler.fn(source, songInfo, resolvedQuality),
                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                    handler.name + ' 超时'
                );
            } else {
                urlPromise = withTimeout(
                    handler.fn(platform, songId, resolvedQuality, songInfo),
                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                    handler.name + ' 超时'
                );
            }
            
            return urlPromise.then(function(url) {
                if (!url) {
                    throw new Error(handler.name + ' 返回空URL');
                }
                var validated = validateUrl(url, handler.name);
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                var elapsed = Date.now() - startTime;
                console.log('[聚合音源] ' + handler.name + ' 成功 (耗时: ' + elapsed + 'ms)');
                return validated;
            }).catch(function(e) {
                var errorMsg = e.message || String(e);
                console.warn('[聚合音源] ' + handler.name + ' 失败: ' + errorMsg);
                errors.push(handler.name + ': ' + errorMsg);
                // 【修复点6】添加小延迟再尝试下一个源，避免请求过于密集
                return Timer.delay(100).then(function() {
                    return tryNext(index + 1);
                });
            });
        }
        
        return tryNext(0);
    }
    
    // ==================== 平台配置 ====================
    var platformQualityMap = {
        tx: ['24bit', 'flac', '320k', '192k', '128k'],
        wy: ['24bit', 'flac', '320k', '192k', '128k'],
        kw: ['24bit', 'flac', '320k', '192k', '128k'],
        kg: ['24bit', 'flac', '320k', '192k', '128k'],
        mg: ['24bit', 'flac', '320k', '192k', '128k'],
        qorg: ['128k', '320k', 'flac', 'flac24bit'],
        wycloud: ['128k', '320k', 'flac', 'flac24bit'],
        wycloudmusic: ['128k', '192k', '320k', 'flac']
    };
    
    var platformNames = {
        tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐',
        kg: '酷狗音乐', mg: '咪咕音乐',
        qorg: 'qorg音源', wycloud: '网易云盘', wycloudmusic: '自建网易云'
    };
    
    var sourceConfig = {};
    var platforms = Object.keys(platformQualityMap);
    for (var p = 0; p < platforms.length; p++) {
        var platform = platforms[p];
        var actions = ['musicUrl'];
        if (platform === 'qorg') {
            actions.push('musicSearch', 'lyric');
        }
        if (platform === 'wycloud') {
            actions.push('musicSearch', 'lyric', 'getList', 'setCookie', 'testCookie', 'getCookieStatus');
        }
        if (platform === 'wycloudmusic') {
            actions.push('musicSearch', 'lyric', 'playlist', 'userPlaylist', 'login', 'loginStatus');
        }
        sourceConfig[platform] = {
            name: platformNames[platform] || platform,
            type: 'music',
            actions: actions,
            qualitys: platformQualityMap[platform] || ['128k', '320k']
        };
    }
    
    // ==================== 事件监听 ====================
    function setupEventListener() {
        var handleRequest = function(eventData) {
            var action = eventData.action;
            var source = eventData.source;
            var info = eventData.info;
            
            state.stats.requests++;
            
            return new Promise(function(resolve, reject) {
                try {
                    handleRequestAsync(action, source, info, resolve, reject);
                } catch (e) {
                    console.error('[聚合音源] 请求处理异常:', e.message || e);
                    reject(e);
                }
            });
        };
        
        if (typeof on === 'function') {
            try {
                on(EVENT_NAMES.request, handleRequest);
                console.log('[聚合音源] 事件监听已注册 (EVENT_NAMES.request)');
            } catch (e) {
                console.warn('[聚合音源] EVENT_NAMES.request 注册失败:', e.message);
                try {
                    on('request', handleRequest);
                    console.log('[聚合音源] 事件监听已注册 ("request")');
                } catch (e2) {
                    console.error('[聚合音源] 所有事件注册方式均失败:', e2.message);
                }
            }
        }
        
        if (typeof globalObj.on === 'function' && globalObj.on !== on) {
            try {
                globalObj.on('request', handleRequest);
                console.log('[聚合音源] 事件监听已注册 (globalObj.on)');
            } catch (e) {}
        }
        
        if (lx && typeof lx.on === 'function' && lx.on !== on) {
            try {
                lx.on('request', handleRequest);
                console.log('[聚合音源] 事件监听已注册 (lx.on)');
            } catch (e) {}
        }
    }
    
    // 异步处理请求
    function handleRequestAsync(action, source, info, resolve, reject) {
        // 处理预加载指令
        if (action === 'setPlaylist') {
            var playlist = info && info.playlist;
            var currentIndex = (info && info.currentIndex !== undefined) ? info.currentIndex : 0;
            setCurrentPlaylist(playlist, currentIndex);
            resolve({ success: true });
            return;
        }
        
        if (action === 'preloadNext') {
            preloadNextTrack();
            resolve({ success: true });
            return;
        }
        
        if (action === 'getPreloadedUrl') {
            var musicInfo = (info && info.musicInfo) || {};
            var preloadedUrl = getPreloadedUrl(musicInfo);
            resolve({ url: preloadedUrl });
            return;
        }
        
        // 处理自建网易云
        if (source === 'wycloudmusic') {
            handleWycloudmusicAction(action, info, resolve, reject);
            return;
        }
        
        // 处理网易云盘
        if (source === 'wycloud') {
            handleWycloudAction(action, info, resolve, reject);
            return;
        }
        
        // 处理 qorg
        if (source === 'qorg') {
            handleQorgAction(action, info, resolve, reject);
            return;
        }
        
        if (action === 'musicUrl') {
            if (!(info && info.musicInfo)) {
                reject(new Error('请求参数不完整'));
                return;
            }
            
            var musicInfo = info.musicInfo || {};
            var platform = musicInfo._source || source;
            var quality = info.type || '320k';
            
            console.log('[聚合音源] 请求: ' + platform + ' - ' + (musicInfo.name || '未知') + ' - ' + quality);
            
            getUrlWithFallback(platform, musicInfo, quality).then(function(finalUrl) {
                console.log('[聚合音源] 成功获取URL: ' + (finalUrl || '').substring(0, 60) + '...');
                
                if (CONFIG.PRELOAD_ENABLED) {
                    Timer.create(function() { preloadNextTrack(); }, 500);
                }
                
                resolve(finalUrl);
            }).catch(function(fallbackError) {
                console.warn('[聚合音源] 所有音源均失败: ' + (fallbackError.message || fallbackError));
                // 【修复点7】返回更友好的错误信息，让播放器可以自动跳到下一首
                reject(new Error('PLAY_NEXT:' + (fallbackError.message || '所有音源均失败，建议播放下一首')));
            });
        } else {
            reject(new Error('不支持的操作: ' + action));
        }
    }
    
    function handleWycloudmusicAction(action, info, resolve, reject) {
        if (action === 'musicSearch' || action === 'search') {
            var keyword = (info && info.keyword) ? String(info.keyword) : '';
            var page = (info && info.page) ? Number(info.page) : 1;
            var pageSize = (info && info.pagesize) ? Number(info.pagesize) : 30;
            wycloudmusicSearch(keyword, page, pageSize).then(resolve).catch(reject);
            return;
        }
        if (action === 'musicUrl') {
            if (!(info && info.musicInfo)) {
                reject(new Error('请求参数不完整'));
                return;
            }
            wycloudmusicGetMusicUrl(info.musicInfo, info.type).then(function(url) {
                resolve(validateUrl(url, '自建网易云'));
            }).catch(reject);
            return;
        }
        if (action === 'lyric') {
            var songId = (info && info.musicInfo && (info.musicInfo.id || info.musicInfo.songmid));
            if (!songId) { resolve({ lyric: '', tlyric: '' }); return; }
            var lyricUrl = CONFIG.WYCLOUDMUSIC_API_URL + API_ENDPOINTS.wycloudmusic.endpoints.lyric;
            httpGet(lyricUrl, { id: songId }).then(function(lyricRes) {
                resolve({
                    lyric: (lyricRes && lyricRes.lrc && lyricRes.lrc.lyric) || '',
                    tlyric: (lyricRes && lyricRes.tlyric && lyricRes.tlyric.lyric) || ''
                });
            }).catch(function(e) {
                resolve({ lyric: '', tlyric: '' });
            });
            return;
        }
        reject(new Error('不支持的操作: ' + action));
    }
    
    function handleWycloudAction(action, info, resolve, reject) {
        if (action === 'musicSearch' || action === 'search') {
            var wyKeyword = (info && info.keyword) ? String(info.keyword) : '';
            var wyPage = (info && info.page) ? Number(info.page) : 1;
            var wyPageSize = (info && info.pagesize) ? Number(info.pagesize) : 30;
            wycloudSearch(wyKeyword, wyPage, wyPageSize).then(resolve).catch(reject);
            return;
        }
        if (action === 'musicUrl') {
            if (!(info && info.musicInfo)) {
                reject(new Error('请求参数不完整'));
                return;
            }
            wycloudGetMusicUrl(info.musicInfo, info.type).then(function(wyUrl) {
                resolve(validateUrl(wyUrl, '网易云盘'));
            }).catch(reject);
            return;
        }
        if (action === 'lyric') {
            wycloudGetLyric((info && info.musicInfo) || {}).then(resolve).catch(reject);
            return;
        }
        if (action === 'setCookie') {
            var cookie = info && info.cookie;
            if (!cookie) { reject(new Error('请提供Cookie')); return; }
            setWycloudCookie(cookie).then(function() {
                resolve({ code: 200, msg: 'Cookie设置成功' });
            }).catch(reject);
            return;
        }
        if (action === 'testCookie') {
            testWycloudCookie().then(function() {
                resolve({ code: 200, msg: 'Cookie有效' });
            }).catch(reject);
            return;
        }
        if (action === 'getCookieStatus') {
            resolve({
                hasCookie: !!state.wycloudCookie,
                isValid: isWycloudCookieValid()
            });
            return;
        }
        if (action === 'getList') {
            if (!state.wycloudCookie) {
                reject(new Error('未设置Cookie'));
                return;
            }
            var listUrl = CONFIG.QORG_API_URL + API_ENDPOINTS.qorg.endpoints.wycloud + '/list';
            httpPost(listUrl, {
                cookie: state.wycloudCookie,
                offset: (info && info.offset) || 0,
                limit: (info && info.limit) || 100
            }, CONFIG.REQUEST_TIMEOUT).then(function(listRes) {
                resolve((listRes && listRes.data) || { list: [], total: 0 });
            }).catch(function(e) {
                reject(new Error('获取云盘列表失败: ' + e.message));
            });
            return;
        }
        reject(new Error('不支持的操作: ' + action));
    }
    
    function handleQorgAction(action, info, resolve, reject) {
        if (action === 'musicSearch' || action === 'search') {
            var qorgKeyword = (info && info.keyword) ? String(info.keyword) : '';
            var qorgPage = (info && info.page) ? Number(info.page) : 1;
            var qorgPageSize = (info && info.pagesize) ? Number(info.pagesize) : 30;
            qorgSearch(qorgKeyword, qorgPage, qorgPageSize).then(resolve).catch(reject);
            return;
        }
        if (action === 'musicUrl') {
            if (!(info && info.musicInfo)) {
                reject(new Error('请求参数不完整'));
                return;
            }
            qorgGetMusicUrl(source, info.musicInfo, info.type).then(function(qorgUrl) {
                resolve(validateUrl(qorgUrl, 'qorg'));
            }).catch(reject);
            return;
        }
        if (action === 'lyric') {
            qorgGetLyric((info && info.musicInfo) || {}).then(resolve).catch(reject);
            return;
        }
        reject(new Error('不支持的操作: ' + action));
    }
    
    // ==================== 初始化 ====================
    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('[聚合音源·超级整合版（完整版）+ 自建网易云] v7.1.3 初始化中...');
        console.log('[聚合音源] 开源地址: ' + ANNOUNCEMENT.repo);
        console.log('[聚合音源] 交流群: ' + ANNOUNCEMENT.qqGroup);
        console.log('[聚合音源] 已集成音源: ikun, 聚合API, qorg, 六音, 肥猫, 肥猫不肥, 梓澄公益, 梓澄qwq, 梓澄公益2代, 网易云盘, 自建网易云');
        console.log('[聚合音源] v7.1.3: 修复歌曲换源失败问题，优化音源回退逻辑');
        
        startStatsCleanup();
        setupEventListener();
        
        Timer.create(function() {
            function cleanupFunc() {
                cleanPreloadedUrls();
                Timer.create(cleanupFunc, 300000);
            }
            cleanupFunc();
        }, 300000);
        
        autoGetWycloudCookie().then(function(cookie) {
            if (cookie) {
                console.log('[聚合音源] 网易云盘Cookie已加载');
            } else {
                console.log('[聚合音源] 网易云盘Cookie未设置，可通过setCookie操作设置');
            }
        }).catch(function(e) {
            console.warn('[聚合音源] 网易云盘Cookie加载失败:', e.message);
        });
        
        sendAnnouncement();
        
        juheInit().then(function() {
            console.log('[聚合音源] 初始化完成');
        }).catch(function(e) {
            console.warn('[聚合音源] 初始化部分失败:', e);
        });
        
        try {
            if (typeof send === 'function') {
                send(EVENT_NAMES.inited, {
                    openDevTools: false,
                    sources: sourceConfig,
                    status: {
                        version: '7.1.3',
                        stats: state.stats,
                        config: {
                            timeout: CONFIG.REQUEST_TIMEOUT,
                            retries: CONFIG.MAX_RETRIES,
                            concurrentLimit: CONFIG.CONCURRENT_LIMIT,
                            qorgEnabled: CONFIG.QORG_ENABLED,
                            wycloudEnabled: true,
                            wycloudmusicEnabled: CONFIG.WYCLOUDMUSIC_ENABLED,
                            preloadEnabled: CONFIG.PRELOAD_ENABLED,
                            repo: ANNOUNCEMENT.repo,
                            qqGroup: ANNOUNCEMENT.qqGroup
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[聚合音源] send inited 事件失败:', e.message);
        }
        
        console.log('[聚合音源·超级整合版（完整版）+ 自建网易云] v7.1.3 已加载');
        console.log('[聚合音源] 支持平台:', Object.keys(sourceConfig).join(', '));
        console.log('[聚合音源] 开源地址: ' + ANNOUNCEMENT.repo + ' | 群号: ' + ANNOUNCEMENT.qqGroup);
        console.log('[聚合音源] 预加载功能: 已启用');
    }
    
    initialize();
})();