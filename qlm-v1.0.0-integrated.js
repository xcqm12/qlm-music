/**
 * @name 七零喵 x 星海 聚合音源 · 整合版
 * @description 整合七零喵(qorg/wyqlm/CHKSZ/肥猫/小熊猫等)和星海(GDAPI/签名认证/智能匹配)
 * @version v1.0.0-integrated
 * @author 七零喵团队 & 星海
 * @homepage https://github.com/xcqm12/qlm-music | https://zrcdy.dpdns.org/
 * @features 签名认证 | 多音源聚合 | 智能匹配 | 试听检测 | 缓存管理 | 预加载 | eapi/weapi加密
 * 
 * @version v1.0.0-integrated: 整合星海v3.2.6与七零喵v9.0.9，所有音源可用，顺序执行避免竞态
 */
(function() {
    "use strict";

    // ==================== Polyfill 区 ====================
    // 获取全局对象（兼容严格模式）
    var getGlobal = function() {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof self !== 'undefined') return self;
        if (typeof window !== 'undefined') return window;
        if (typeof global !== 'undefined') return global;
        try { return Function('return this')(); } catch (e) {}
        return {};
    };
    var GLOBAL = getGlobal();

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

    // URLSearchParams Polyfill
    if (typeof URLSearchParams === 'undefined') {
        GLOBAL.URLSearchParams = function(init) {
            this._params = {};
            if (typeof init === 'string') {
                init = init.replace(/^\?/, '');
                var pairs = init.split('&');
                for (var i = 0; i < pairs.length; i++) {
                    var pair = pairs[i].split('=');
                    if (pair[0]) {
                        this._params[decodeURIComponent(pair[0])] = 
                            pair[1] ? decodeURIComponent(pair[1]) : '';
                    }
                }
            } else if (Array.isArray(init)) {
                init.forEach(([k, v]) => { this._params[k] = v; });
            } else if (init && typeof init === 'object') {
                for (var k in init) {
                    if (init.hasOwnProperty(k)) this._params[k] = init[k];
                }
            }
            
            this.append = function(key, value) { this._params[key] = value; };
            this.delete = function(key) { delete this._params[key]; };
            this.get = function(key) { return this._params[key] !== undefined ? this._params[key] : null; };
            this.getAll = function(key) {
                const value = this._params[key];
                if (Array.isArray(value)) return value.slice();
                else if (value !== undefined) return [value];
                return [];
            };
            this.keys = function() {
                const keys = [];
                for (const key in this._params) { if (this._params.hasOwnProperty(key)) keys.push(key); }
                let index = 0;
                return { next: function() {
                    if (index < keys.length) return { value: keys[index++], done: false };
                    return { value: undefined, done: true };
                }, [Symbol.iterator]: function() { return this; } };
            };
            this.values = function() {
                const values = [];
                for (const key in this._params) { if (this._params.hasOwnProperty(key)) values.push(this._params[key]); }
                let index = 0;
                return { next: function() {
                    if (index < values.length) return { value: values[index++], done: false };
                    return { value: undefined, done: true };
                }, [Symbol.iterator]: function() { return this; } };
            };
            this.entries = function() {
                const entries = [];
                for (const key in this._params) { if (this._params.hasOwnProperty(key)) entries.push([key, this._params[key]]); }
                let index = 0;
                return { next: function() {
                    if (index < entries.length) return { value: entries[index++], done: false };
                    return { value: undefined, done: true };
                }, [Symbol.iterator]: function() { return this; } };
            };
            this.forEach = function(callback, thisArg) {
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) callback.call(thisArg, this._params[key], key, this);
                }
            };
            this.toString = function() {
                const parts = [];
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(this._params[key]));
                    }
                }
                return parts.join('&');
            };
        };
    }

    // ==================== 安全获取全局对象 ====================
    const globalObj = GLOBAL;
    const lx = globalObj.lx || {};

    // ==================== 公告信息 ====================
    const ANNOUNCEMENT = Object.freeze({
        title: "七零喵 x 星海 聚合音源 · 整合版 v1.0.0-integrated",
        content: 
            "GitHub: https://github.com/xcqm12/qlm-music\n" +
            "星海: https://zrcdy.dpdns.org/\n" +
            "整合音源: GD音乐台 / 非常刀 / 肥猫 / 小熊猫 / 梓澄公益 / 無名 / 六音 / \n" +
            "星海主 / 长青SVIP / 念心SVIP / 溯音 / ikun / 野草 / fish / qorg / \n" +
            "wyqlm / 网易云官方 / 汽水VIP / 网易云VIP\n" +
            "特性: 签名认证 | 智能匹配 | 试听检测 | 缓存管理 | 预加载\n" +
            "eapi/weapi加密 | 顺序执行避免竞态 | 所有音源可用\n" +
            "© 2026 七零喵团队 & 星海",
        version: "1.0.0-integrated"
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
        } else { 
            console.error('[聚合音源] request API 不可用'); 
            return; 
        }
    }
    if (!on) on = function() {};
    if (!send) send = function() {};

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
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }

    // ==================== 常量配置 ====================
    const CONFIG = Object.freeze({
        // ===== qorg/wyqlm API =====
        QORG_API_URL: "https://api.qlm.org.cn",
        
        // ===== ikun API =====
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_HK_API_URL: "https://songapi.ikunshare.link",
        IKUN_API_KEY: "",
        
        // ===== 非常刀 API =====
        CHKSZ_API: "https://api.chksz.top/api",
        
        // ===== fish API =====
        FISH_API_URL: "https://m-api.ceseet.me",
        
        // ===== 星海 API (来自xinghai) =====
        XINGHAI_MAIN_URL: "https://music-api.gdstudio.xyz/api.php",
        XINGHAI_MAIN_PARAMS: {
            use_xbridge3: "true", loader_name: "forest",
            need_sec_link: "1", sec_link_scene: "im", theme: "light", types: "url"
        },
        XINGHAI_BACKUP_URL: "https://music-dl.sayqz.com/api/",
        SIGN_PROVIDER_URL: "https://zrcdy.dpdns.org/lx/api/api.php?get_sign_only=1",
        DIRECT_API_BASE: "https://api.yaohud.cn/api/music/",
        FALLBACK_PROXY_URL: "https://zrcdy.dpdns.org/lx/api/api.php",
        NETEASE_VIP_API: "https://api.chksz.top/api/163_music",
        STABLE_SOURCES_API_URL: "https://zrcdy.dpdns.org/lx/stable_sources.php",
        UPDATE_CONFIG: {
            versionApiUrl: 'https://zrcdy.dpdns.org/lx/version.php',
            latestScriptUrl: 'https://zrcdy.dpdns.org/lx/vers.php',
            currentVersion: 'v1.0.0-integrated'
        },
        
        // ===== 溯音 API =====
        SUYIN_QQ_API: "https://oiapi.net/api/QQ_Music",
        SUYIN_QQ_KEY: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575",
        SUYIN_163_API: "https://oiapi.net/api/Music_163",
        SUYIN_KUWO_API: "https://oiapi.net/api/Kuwo",
        SUYIN_MIGU_API: "https://api.xcvts.cn/api/music/migu",
        
        // ===== 长青SVIP URL模板 =====
        CHANGQING_URL_TEMPLATES: {
            tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
            wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
            kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
            kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}",
            mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
        },
        
        // ===== 念心SVIP URL模板 =====
        NIANXIN_URL_TEMPLATES: {
            tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
            wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
            kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
            kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
            mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
        },
        
        // ===== 汽水VIP =====
        QISHUI_API_HTTPS: "https://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_API_HTTP: "http://api.vsaa.cn/api/music.qishui.vip",
        QISHUI_PROXY_API: "https://proxy.qishui.vsaa.cn/qishui/proxy",
        
        // ===== 野草 API =====
        YECAO_API: "https://kuwoapi.gdwztv.cn/api/kuwo",
        
        // ===== GD音乐台API =====
        GD_API_URL: "https://api.gdyyt.com/api.php",
        
        // ===== 肥猫音源 =====
        FEIMAO_API_URL: "https://api.feimao.wang",
        
        // ===== 小熊猫音源 =====
        XIAOXIONGMAO_API_URL: "https://api.xiaoxiongmao.xyz",
        
        // ===== 梓澄公益API =====
        ZICHENG_API_URL: "https://api.zicheng.love",
        
        // ===== 無名API =====
        WUMING_API_URL: "https://api.wuming.ink",
        
        // ===== 六音API =====
        LIUYIN_API_URL: "https://api.liuyin.site",
        
        // ===== 网易云官方API =====
        NETEASE_API_URL: "https://music.163.com",
        
        // ===== 请求配置 =====
        REQUEST_TIMEOUT: 15000,
        URL_CHECK_TIMEOUT: 4000,
        CACHE_TTL_URL: 1800000,
        CACHE_TTL_SEARCH: 300000,
        CACHE_MAX_SIZE: 500,
        CONCURRENT_LIMIT: 5,
        RETRY_DELAY: 800,
        MAX_RETRIES: 2,
        
        // ===== 预加载配置 =====
        PRELOAD_ENABLED: true,
        PRELOAD_QUALITY: '320k',
        PRELOAD_CACHE_SIZE: 5,
        
        // ===== 网易云Cookie配置键名 =====
        NETEASE_COOKIE_KEY: 'netease_variable_cookie',
        NETEASE_FIXED_COOKIE_KEY: 'netease_fixed_cookie',
    });

    const QUALITY_TO_BR = Object.freeze({ 
        "128k": "128", "192k": "192", "320k": "320", "flac": "740", 
        "flac24bit": "999", "24bit": "999", "hires": "999", "Hi-Res": "999", 
        "jyeffect": "999", "sky": "999", "dolby": "999", "jymaster": "999"
    });
    const QUALITY_TO_LEVEL = Object.freeze({ 
        "128k": "standard", "192k": "higher", "320k": "exhigh", "flac": "lossless", 
        "flac24bit": "jymaster", "24bit": "jymaster", "hires": "hires", 
        "Hi-Res": "Hi-Res", "jyeffect": "jyeffect", "sky": "sky", 
        "dolby": "dolby", "jymaster": "jymaster"
    });
    const QUALITY_TO_SUYIN_QQ_BR = Object.freeze({ 
        "128k": 7, "320k": 5, "flac": 4, "hires": 3, "atmos": 2, "master": 1, "24bit": 1 
    });
    const QUALITY_TO_KUWO_BR = Object.freeze({ flac: 1, "320k": 5, "128k": 7, "24bit": 1 });
    const HTTP_REGEX = /^https?:\/\//i;

    // 平台映射
    const PLATFORM_TO_XINGHAI = { wy: "netease", tx: "tencent", kw: "kuwo", kg: "kugou", mg: "migu" };
    const PLATFORM_TO_XINGHAI_BACKUP = { wy: "netease", tx: "qq", kw: "kuwo" };
    const DIRECT_SOURCE_PATH = { kg: 'kg', tx: 'qq', mg: 'migu', kw: 'kuwo' };
    const PROXY_SUPPORTED_SOURCES = new Set(['kg', 'migu', 'qq']);
    const ALL_PLATFORMS = ['wy', 'tx', 'kw', 'kg', 'mg'];
    const PLATFORM_NAME_MAP = { 
        wy: '网易云音乐', tx: 'QQ音乐', kw: '酷我音乐', 
        kg: '酷狗音乐', mg: '咪咕音乐' 
    };
    const MUSIC_QUALITY_FULL = {
        wy: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'jyeffect', 'sky', 'jymaster'],
        tx: ['128k', '192k', '320k', 'flac'],
        kw: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        kg: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        mg: ['128k', '192k', '320k', 'flac', 'flac24bit']
    };
    const NETEASE_VIP_LEVEL_MAP = { 
        hires: 'hires', jyeffect: 'jyeffect', sky: 'sky', 
        jymaster: 'jymaster', flac24bit: 'hires' 
    };
    const NETEASE_VIP_QUALITY_SET = new Set(['hires', 'jyeffect', 'sky', 'jymaster', 'flac24bit']);

    // ==================== 星海状态变量 ====================
    const gdApiBlockedUntil = {};
    let musicSourceEnabled = true;
    let serverCheckCompleted = false;
    let backupApiAvailable = false;
    let stableSourcesList = null;
    let mainApiSourceMap = {};
    let availablePlatforms = [];
    let yaohuPlatformStatus = { kg: 'unknown', qq: 'unknown', migu: 'unknown', kw: 'unknown' };
    let gdApiStatus = 'unknown';
    let neteaseVipApiStatus = 'unknown';
    let availableKeyVersions = [1];
    let currentKeyVersion = 1;
    const cachedCredentials = {};
    const credentialExpireTimes = {};

    // ==================== 试听检测函数 ====================
    function hasFreeTrialFlag(resp) {
        if (!resp || typeof resp !== 'object') return false;
        if (resp.freeTrialInfo !== undefined) return true;
        if (resp.data && Array.isArray(resp.data)) {
            for (const item of resp.data) {
                if (item && item.freeTrialInfo) return true;
            }
        }
        if (resp.data && typeof resp.data === 'object' && resp.data.freeTrialInfo) return true;
        return false;
    }

    async function isTrialUrlBySize(url, timeout = 5000) {
        if (!url || !HTTP_REGEX.test(url)) return true;
        try {
            const resp = await withTimeout(
                httpFetch(url, {
                    method: 'HEAD', timeout: timeout,
                    headers: { 'User-Agent': `lx-music-${env}/${version}` },
                    follow_max: 2
                }), timeout, '试听检测超时'
            );
            const contentLength = resp.headers && 
                (resp.headers['content-length'] || resp.headers['Content-Length']);
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                if (!isNaN(size) && size < 1024 * 1024) {
                    console.warn(`[试听检测] 文件过小 (${size} bytes)，判定为试听片段`);
                    return true;
                }
            }
            const contentType = resp.headers && 
                (resp.headers['content-type'] || resp.headers['Content-Type']);
            if (contentType && !/audio|mpeg|octet-stream|mp3|m4a|flac|wav|ogg/i.test(contentType)) {
                console.warn(`[试听检测] Content-Type 异常 (${contentType})，判定为无效`);
                return true;
            }
            return false;
        } catch (e) {
            console.warn(`[试听检测] HEAD 请求失败: ${e.message}`);
            return false;
        }
    }

    async function isTrialSong(resp, url) {
        if (hasFreeTrialFlag(resp)) return true;
        if (url && url.includes('/ymusic/')) {
            console.warn('[试听检测] URL 包含 /ymusic/ 特征，判定为试听');
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
            const digest = this.md5(message);
            const combined = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
            return { params: this.aesEncrypt(combined, 'e82ckenh8dichen8') };
        },

        rawEncrypt: function(data) { return data; },

        aesEncrypt: function(text, key, iv, mode) {
            const actualIv = iv || '0102030405060708';
            const actualMode = mode || 'AES-CBC';
            const cipher = this.createCipher(actualMode, key, actualIv);
            return cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
        },

        rsaEncrypt: function(text) {
            const key = '010001';
            const modulus = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7' +
                'b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312' +
                'ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813' +
                'cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
            let result = BigInt(0);
            for (let i = text.length - 1; i >= 0; i--) {
                result = (result * BigInt(256) + BigInt(text.charCodeAt(i))) % 
                    BigInt('0x' + modulus);
            }
            let encrypted = '';
            const base = BigInt('0x' + key);
            result = this.modPow(result, base, BigInt('0x' + modulus));
            const hex = result.toString(16);
            return hex.padStart(256, '0');
        },

        modPow: function(base, exponent, modulus) {
            let result = BigInt(1);
            base = base % modulus;
            while (exponent > 0) {
                if (exponent % BigInt(2) === BigInt(1)) { result = (result * base) % modulus; }
                exponent = exponent >> BigInt(1);
                base = (base * base) % modulus;
            }
            return result;
        },

        generateSecretKey: function(length) {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        md5: function(str) { return md5(str); },

        createCipher: function(algorithm, key, iv) {
            const keyBytes = this.stringToBytes(key);
            const ivBytes = iv ? this.stringToBytes(iv) : null;
            const isECB = !iv || algorithm.toLowerCase().includes('ecb');
            return {
                update: (data, inputEncoding, outputEncoding) => {
                    const dataBytes = inputEncoding === 'utf8' ? 
                        this.stringToBytes(data) : this.base64ToBytes(data);
                    const padded = this.padPKCS7(dataBytes, 16);
                    const encrypted = isECB ? 
                        this.aesEcbEncrypt(padded, keyBytes) : 
                        this.aesCbcEncrypt(padded, keyBytes, ivBytes);
                    return outputEncoding === 'base64' ? 
                        this.bytesToBase64(encrypted) : encrypted;
                },
                final: () => ''
            };
        },

        stringToBytes: function(str) {
            const bytes = [];
            for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
            return bytes;
        },

        base64ToBytes: function(base64) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let len = base64.length;
            while (len > 0 && base64[len - 1] === '=') len--;
            const bytes = [];
            for (let i = 0; i < len; i += 4) {
                const c0 = chars.indexOf(base64[i]);
                const c1 = chars.indexOf(base64[i + 1]);
                const c2 = chars.indexOf(base64[i + 2]);
                const c3 = chars.indexOf(base64[i + 3]);
                bytes.push((c0 << 2) | (c1 >> 4));
                if (i + 2 < len) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
                if (i + 3 < len) bytes.push(((c2 & 3) << 6) | c3);
            }
            return bytes;
        },

        bytesToBase64: function(bytes) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let result = '';
            for (let i = 0; i < bytes.length; i += 3) {
                const a = bytes[i];
                const b = bytes[i + 1] || 0;
                const c = bytes[i + 2] || 0;
                result += chars[a >> 2];
                result += chars[((a & 3) << 4) | (b >> 4)];
                result += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
                result += i + 2 < bytes.length ? chars[c & 63] : '=';
            }
            return result;
        },

        padPKCS7: function(data, blockSize) {
            const pad = blockSize - (data.length % blockSize);
            for (let i = 0; i < pad; i++) data.push(pad);
            return data;
        },

        aesEcbEncrypt: function(data, key) {
            const result = [];
            for (let i = 0; i < data.length; i += 16) {
                const block = data.slice(i, i + 16);
                const encrypted = this.aesBlockEncrypt(block, key);
                result.push(...encrypted);
            }
            return result;
        },

        aesCbcEncrypt: function(data, key, iv) {
            const result = [];
            let prev = iv.slice();
            for (let i = 0; i < data.length; i += 16) {
                const block = data.slice(i, i + 16);
                const xored = block.map((b, j) => b ^ prev[j]);
                const encrypted = this.aesBlockEncrypt(xored, key);
                prev = encrypted;
                result.push(...encrypted);
            }
            return result;
        },

        aesBlockEncrypt: function(block, key) {
            const sbox = [
                0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 
                0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 
                0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 
                0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 
                0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 
                0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 
                0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 
                0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 
                0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 
                0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 
                0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 
                0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 
                0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 
                0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 
                0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 
                0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 
                0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 
                0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 
                0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 
                0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 
                0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 
                0xb0, 0x54, 0xbb, 0x16
            ];
            const rcon = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
            let state = block.slice();
            const keyExpanded = this.keyExpansion(key, rcon);
            state = this.addRoundKey(state, keyExpanded.slice(0, 16));
            for (let round = 1; round <= 10; round++) {
                state = this.subBytes(state, sbox);
                state = this.shiftRows(state);
                if (round < 10) state = this.mixColumns(state);
                state = this.addRoundKey(state, keyExpanded.slice(round * 16, (round + 1) * 16));
            }
            return state;
        },

        keyExpansion: function(key, rcon) {
            const expanded = [];
            for (let i = 0; i < key.length; i++) expanded.push(key[i]);
            for (let i = 16; i < 176; i += 4) {
                const temp = expanded.slice(i - 4, i);
                if (i % 16 === 0) {
                    const rotated = temp.slice(1).concat(temp[0]);
                    for (let j = 0; j < 4; j++) temp[j] = this.subWord(rotated[j]);
                    temp[0] ^= rcon[i / 16];
                }
                for (let j = 0; j < 4; j++) expanded.push(expanded[i - 16 + j] ^ temp[j]);
            }
            return expanded;
        },

        subWord: function(byte) {
            const sbox = [
                0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 
                0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 
                0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 
                0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 
                0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 
                0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 
                0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 
                0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 
                0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 
                0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 
                0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 
                0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 
                0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 
                0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 
                0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 
                0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 
                0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 
                0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 
                0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 
                0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 
                0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 
                0xb0, 0x54, 0xbb, 0x16
            ];
            return sbox[byte];
        },

        subBytes: function(state, sbox) { return state.map(b => sbox[b]); },

        shiftRows: function(state) {
            const result = state.slice();
            result[1] = state[5]; result[5] = state[9]; result[9] = state[13]; result[13] = state[1];
            result[2] = state[10]; result[6] = state[14]; result[10] = state[2]; result[14] = state[6];
            result[3] = state[15]; result[7] = state[11]; result[11] = state[15]; result[15] = state[7];
            return result;
        },

        mixColumns: function(state) {
            const result = new Array(16);
            const mul = [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]];
            for (let col = 0; col < 4; col++) {
                for (let row = 0; row < 4; row++) {
                    let val = 0;
                    for (let i = 0; i < 4; i++) { val ^= this.gfMult(mul[row][i], state[col * 4 + i]); }
                    result[row * 4 + col] = val;
                }
            }
            return result;
        },

        gfMult: function(a, b) {
            let p = 0;
            for (let i = 0; i < 8; i++) {
                if (b & 1) p ^= a;
                const hiBit = a & 0x80;
                a <<= 1;
                if (hiBit) a ^= 0x1b;
                b >>= 1;
            }
            return p;
        },

        addRoundKey: function(state, key) { return state.map((b, i) => b ^ key[i]); }
    };

    // ==================== Cookie管理器 ====================
    const CookieManager = {
        getFixedCookie: function() {
            const defaultCookie = '__remember_me=true; MUSIC_U=00E5439FF4AAD0487F2016EF33FA989BD5F7E7F8DA17CA21A7A7F1416D175050C455428EECAF208399919AAB981C0CA1156CD4CA2AD679250F37A227A73FCCDF016075A893ECC308ABEBE1732D4F6BE032E38123E6517541C734CD6F175FE1F46106DBDDDAEEB1B59DAB71C7029A149C7C3D797489D2301604FA41D467509649D1AF74F6FFB0301DB3595421C70C33461339DE648571CEC77241550A63EBD1A449262C54AF898458589B452ADCC0494C7EB8FEF4ED2C39B6EEAD5E29CFBD9AC33F17282C7D712636AFA2D562A273D20332312545C7F862DBEDD1A52246AC92A8CFE5D02C3CDC9BE1CD966FE594330BE472E5D860406F4E47344470DB8A23250A93620D16DF8503978E106B01F2111EA3512A22E6545D1785993981B66682C4F20FBBE2209719669D2DA8AAB3DC083EDF0C6978043F4185B88CDF6878C5F85CC1ECA58F72594D97E0CD528D06400824D3ADAC39DE798D4FFBBA67EE74C6ACBD584A80EAC426A510179E4044E9047D906ED9AE4CB07C2829C1A0371708A85BDA8452191115DD1265350EDABF0ABE96BE781279DE602153ABAB8713F2216323009053';
            if (storage) {
                try {
                    const stored = storage.getItem(CONFIG.NETEASE_FIXED_COOKIE_KEY);
                    return stored || defaultCookie;
                } catch (e) { return defaultCookie; }
            }
            return defaultCookie;
        },

        setFixedCookie: function(cookie) {
            if (storage) {
                try { storage.setItem(CONFIG.NETEASE_FIXED_COOKIE_KEY, cookie); return true; } 
                catch (e) { return false; }
            }
            return false;
        },

        getCookie: function() {
            if (storage) {
                try { return storage.getItem(CONFIG.NETEASE_COOKIE_KEY) || ''; } 
                catch (e) { return ''; }
            }
            return '';
        },

        setCookie: function(cookie) {
            if (storage) {
                try { storage.setItem(CONFIG.NETEASE_COOKIE_KEY, cookie); return true; } 
                catch (e) { return false; }
            }
            return false;
        },

        clearCookie: function() {
            if (storage) {
                try {
                    storage.removeItem(CONFIG.NETEASE_COOKIE_KEY);
                    storage.removeItem(CONFIG.NETEASE_FIXED_COOKIE_KEY);
                    return true;
                } catch (e) { return false; }
            }
            return false;
        }
    };

    // ==================== 预加载管理器 ====================
    const PreloadManager = {
        preloadQueue: [],
        maxCacheSize: CONFIG.PRELOAD_CACHE_SIZE,
        enabled: CONFIG.PRELOAD_ENABLED,
        
        addToQueue: function(songInfo, quality = CONFIG.PRELOAD_QUALITY) {
            if (!this.enabled) return;
            const cacheKey = SafeUtils.buildCacheKey('preload', songInfo, quality);
            if (this.preloadQueue.find(item => item.cacheKey === cacheKey)) return;
            this.preloadQueue.push({
                songInfo: songInfo, quality: quality,
                cacheKey: cacheKey, status: 'pending', promise: null
            });
            if (this.preloadQueue.length > this.maxCacheSize) this.preloadQueue.shift();
            this.processQueue();
        },
        
        async processQueue() {
            const pendingItems = this.preloadQueue.filter(item => item.status === 'pending');
            if (pendingItems.length === 0) return;
            const item = pendingItems[0];
            item.status = 'loading';
            try {
                const url = await getUrlWithFallback('wy', item.songInfo, item.quality);
                if (url && state.urlCache) state.urlCache.set(item.cacheKey, url);
                item.status = 'completed';
                item.result = url;
                try {
                    send && send(EVENT_NAMES.preload, {
                        status: 'success', songInfo: item.songInfo, url: url
                    });
                } catch (e) {}
            } catch (error) {
                item.status = 'failed';
                item.error = error.message;
                try {
                    send && send(EVENT_NAMES.preload, {
                        status: 'failed', songInfo: item.songInfo, error: error.message
                    });
                } catch (e) {}
            }
            this.processQueue();
        },
        
        getStatus: function(songInfo, quality = CONFIG.PRELOAD_QUALITY) {
            const cacheKey = SafeUtils.buildCacheKey('preload', songInfo, quality);
            const item = this.preloadQueue.find(item => item.cacheKey === cacheKey);
            return item?.status || 'not_found';
        },
        
        clearCache: function() { this.preloadQueue = []; },
        toggle: function(enabled) { this.enabled = enabled; }
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
        },
        normalizeKeyword: function(keyword) {
            if (!keyword) return "";
            return String(keyword).replace(/\(\s*Live\s*\)/gi, "")
                .replace(/[\(\（][^)\）]*[\)\）]/g, "")
                .replace(/【[^】]*】/g, "").replace(/\[[^\]]*\]/g, "")
                .replace(/\s+/g, "").replace(/[^\w\u4e00-\u9fa5]/g, "").trim().toLowerCase();
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

    // ==================== 工具函数 ====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        switch (platform) {
            case 'kg': 
                return info.hash || info.songmid || info.id || 
                    (meta && (meta.hash || meta.songmid || meta.id));
            case 'tx': {
                const qqMeta = meta.qq || {};
                const mid = qqMeta.mid || meta.mid || info.songmid || 
                    (SafeUtils.isString(info.id) && !/^\d+$/.test(info.id) ? info.id : null);
                if (mid) return mid;
                const songid = qqMeta.songid || meta.songid || info.id;
                if (songid) return songid;
                return info.hash || info.songmid || info.id;
            }
            case 'wy': case 'wycloud': case 'wycloudmusic':
                return info.songmid || info.id || info.songId || 
                    (meta && (meta.songmid || meta.id));
            case 'kw': 
                return info.songmid || info.id || info.rid || 
                    (meta && (meta.songmid || meta.id || meta.rid));
            case 'mg': 
                return info.songmid || info.id || info.cid || 
                    (meta && (meta.songmid || meta.id || meta.cid));
            default: return info.songmid || info.id || info.songId || info.hash;
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
            const url = data.url || data.download_url || data.source_url || 
                data.play_url || data.music_url || data.musicurl;
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
                if (obj[key] && typeof obj[key] === 'string' && HTTP_REGEX.test(obj[key])) {
                    return obj[key];
                }
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
        const timeout = new Promise((_,rej) => id = setTimeout(() => 
            rej(new Error(msg||'超时')), ms || 10000));
        return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
    }

    // ==================== 星海工具函数 ====================
    function log(...args) { console.log('[集成音源]', ...args); }
    function logError(context, err, extra = '') { 
        console.error(`[集成音源错误] ${context}: ${err.message || err} ${extra}`); 
    }
    function logSuccess(source, method) { 
        console.log(`[集成音源] ${source.toUpperCase()} ${method}`); 
    }

    function safeParseBody(body) {
        if (typeof body === 'string') {
            const trimmed = body.trim();
            if (/^[{["]/.test(trimmed)) {
                try { return JSON.parse(trimmed); } catch (e) {}
            }
            return body;
        }
        if (typeof body === 'object' && body !== null) {
            try {
                if (typeof body.toString === 'function' && body.toString() !== '[object Object]') {
                    body = body.toString('utf-8');
                }
            } catch (e) {}
            if (typeof body === 'object' && !isBuffer(body)) return body;
        }
        try {
            if (isBuffer(body)) {
                if (GLOBAL.lx?.utils?.buffer?.bufToString) {
                    body = GLOBAL.lx.utils.buffer.bufToString(body, 'utf-8');
                } else if (typeof Buffer !== 'undefined') {
                    body = Buffer.from(body).toString('utf-8');
                } else { body = String(body); }
            }
        } catch (e) {}
        if (typeof body === 'string') {
            const trimmed = body.trim();
            if (/^[{["]/.test(trimmed)) {
                try { return JSON.parse(trimmed); } catch (e) {}
            }
        }
        return body;
    }

    function isBuffer(obj) {
        return obj && typeof obj === 'object' && 
            ((typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) || 
             (typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer'));
    }

    function buildQueryString(params) {
        const parts = [];
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                let value = params[key];
                if (value !== undefined && value !== null && value !== '') {
                    value = String(value).trim();
                    value = encodeURIComponent(value).replace(/%20/g, '');
                    parts.push(encodeURIComponent(key) + '=' + value);
                }
            }
        }
        return parts.join('&');
    }

    function mapQuality(target, avail) {
        const pm = {
            '臻品母带': 'jymaster', '臻品音质2.0': 'sky', '臻品音质AI': 'jyeffect',
            '臻品音质': 'jyeffect', 'Hires 无损24-Bit': 'hires', 'Hi-Res': 'hires',
            'FLAC': 'flac', '320k': '320k', '192k': '192k', '128k': '128k'
        };
        if (avail.includes(target)) return target;
        const m = pm[target];
        if (m && avail.includes(m)) return m;
        const order = ['jymaster', 'sky', 'jyeffect', 'hires', 'flac24bit', 'flac', '320k', '192k', '128k'];
        for (const q of order) if (avail.includes(q)) return q;
        return avail[0] || '128k';
    }

    // ==================== HTTP 请求封装 ====================
    const httpFetch = function(url, options) {
        if (!url || !SafeUtils.isString(url)) return Promise.reject(new Error('Invalid URL'));
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('请求超时: '+url.slice(0,50))), 
                (options&&options.timeout)||CONFIG.REQUEST_TIMEOUT);
            try {
                request(url, options, (err, resp) => {
                    clearTimeout(t);
                    if (err) return reject(new Error('网络请求失败: '+(err.message||err)));
                    const body = safeParseBody(resp && resp.body);
                    resolve({ body, statusCode: resp.statusCode||0, headers: resp.headers||{} });
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
        const qs = Object.entries(params||{}).filter(([,v])=>v!=null&&v!=='')
            .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        return (await httpRequestWithRetry(full, {
            method:'GET', timeout, 
            headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders}
        })).body;
    }

    async function httpGetRedirect(url, params, timeout, extraHeaders={}) {
        const qs = Object.entries(params||{}).filter(([,v])=>v!=null&&v!=='')
            .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const full = url + (qs ? (url.includes('?')?'&':'?') + qs : '');
        try {
            const resp = await httpFetch(full, {
                method:'GET', timeout, 
                headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders},
                follow_max: 0
            });
            if (resp.statusCode === 302 || resp.statusCode === 301) {
                const location = resp.headers && (resp.headers.location || resp.headers.Location);
                if (location) return location;
            }
            return (await httpRequestWithRetry(full, {
                method:'GET', timeout, 
                headers:{'User-Agent':`lx-music-${env}/${version}`,...extraHeaders}
            })).body;
        } catch (e) { throw new Error(`httpGetRedirect失败: ${e.message}`); }
    }

    async function httpPost(url, body, timeout, extraHeaders={}) {
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/json', 
                'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders},
            body: SafeUtils.isString(body) ? body : JSON.stringify(body||{}),
            timeout
        })).body;
    }

    async function httpPostForm(url, formData, timeout, extraHeaders={}) {
        const form = new URLSearchParams();
        Object.entries(formData || {}).forEach(([k, v]) => form.append(k, v));
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded', 
                'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders},
            body: form.toString(), timeout
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
                    method: 'HEAD', timeout: timeout || 5000,
                    headers: { 'User-Agent': `lx-music-${env}/${version}` },
                    follow_max: 2
                }), timeout || 6000, '音频链接预检超时'
            );
            const status = resp.statusCode || 0;
            if (status < 200 || status >= 400) return false;
            const ct = (resp.headers && resp.headers['content-type']) || '';
            if (ct && !/audio|mpeg|octet-stream|mp3|m4a|flac|wav|ogg/i.test(ct)) return false;
            return true;
        } catch (e) { return false; }
    }

    // ==================== LRU缓存 ====================
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

    // ==================== 全局状态 ====================
    const state = {
        urlCache: new LRUCache(CONFIG.CACHE_MAX_SIZE, CONFIG.CACHE_TTL_URL),
        searchCache: new LRUCache(50, CONFIG.CACHE_TTL_SEARCH),
        updateAlertCalled: false,
        initialized: false,
        announcementSent: false,
        neteaseCookie: CookieManager.getFixedCookie(),
        stats: { hits: 0, misses: 0, success: 0, fail: 0 }
    };

    // ==================== 星海签名认证 ====================
    function selectAndSetKeyVersion() {
        if (!availableKeyVersions || availableKeyVersions.length === 0) return false;
        if (availableKeyVersions.length === 1) {
            currentKeyVersion = availableKeyVersions[0];
        } else {
            currentKeyVersion = availableKeyVersions[Math.floor(Math.random() * availableKeyVersions.length)];
        }
        return true;
    }

    async function fetchCredentials() {
        const now = Date.now();
        if (cachedCredentials[currentKeyVersion] && now < credentialExpireTimes[currentKeyVersion]) {
            return cachedCredentials[currentKeyVersion];
        }
        let url = CONFIG.SIGN_PROVIDER_URL + 
            (currentKeyVersion !== 1 ? '&ver=' + currentKeyVersion : '');
        try {
            const resp = await httpFetch(url, { timeout: 15000 });
            if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
            let data = resp.body;
            if (typeof data === 'string') data = JSON.parse(data);
            cachedCredentials[currentKeyVersion] = data;
            credentialExpireTimes[currentKeyVersion] = now + 
                (data.expire_in ? data.expire_in - 5 : 55) * 1000;
            return data;
        } catch (err) {
            logError('签名获取失败', err);
            if (cachedCredentials[currentKeyVersion] && now < credentialExpireTimes[currentKeyVersion]) {
                return cachedCredentials[currentKeyVersion];
            }
            throw err;
        }
    }

    async function signedFetch(url, options = {}) {
        const cred = await fetchCredentials();
        const headers = {
            'X-Api-Key': cred.api_key,
            'X-Api-Timestamp': String(cred.timestamp),
            'X-Api-Sign': cred.sign,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        return httpFetch(url, { ...options, headers });
    }

    // ==================== 星海稳定源管理 ====================
    const fetchStableSources = async () => {
        if (env === 'desktop') return;
        try {
            const resp = await httpFetch(CONFIG.STABLE_SOURCES_API_URL, {
                timeout: 15000,
                headers: { 'User-Agent': 'LX-Music-Mobile' }
            });
            if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
            let data = resp.body;
            if (typeof data === 'string') {
                try {
                    // 尝试解析 JSON
                    data = JSON.parse(data);
                } catch (e) {
                    // 如果不是 JSON，尝试按行分割或作为单个元素
                    const trimmed = data.trim();
                    if (/^[a-z]+$/.test(trimmed)) {
                        data = [trimmed];
                    } else if (trimmed.includes(',')) {
                        data = trimmed.split(',').map(s => s.trim()).filter(s => /^[a-z]+$/.test(s));
                    } else if (trimmed.includes('\n')) {
                        data = trimmed.split('\n').map(s => s.trim()).filter(s => /^[a-z]+$/.test(s));
                    } else {
                        throw new Error('返回数据格式无法解析');
                    }
                }
            }
            if (!Array.isArray(data) || data.length === 0) throw new Error('数据为空');
            stableSourcesList = data.filter(s => typeof s === 'string' && /^[a-z]+$/.test(s));
        } catch (err) {
            logError('稳定源获取', err);
            stableSourcesList = ['netease', 'kuwo'];
        }
    };

    const buildPlatformsFromStableSources = () => {
        const map = { netease: 'wy', tencent: 'tx', kuwo: 'kw', kugou: 'kg', migu: 'mg' };
        mainApiSourceMap = {};
        stableSourcesList.forEach(s => {
            const c = map[s];
            if (c) mainApiSourceMap[c] = s;
        });
        availablePlatforms = [...ALL_PLATFORMS];
        if (env === 'desktop') availablePlatforms = availablePlatforms.filter(p => p !== 'mg');
    };

    // ==================== 星海平台状态检查 ====================
    const fetchServerStatus = async () => {
        for (let a = 0; a < 3; a++) {
            if (a > 0) await delay(1000);
            try {
                const resp = await httpFetch(CONFIG.UPDATE_CONFIG.versionApiUrl, {
                    timeout: 15000,
                    headers: { 'User-Agent': 'LX-Music-Mobile' }
                });
                if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
                const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
                if (!data) throw new Error('数据无效');
                
                if (data.yaohu_api?.platforms) {
                    for (let p in data.yaohu_api.platforms) {
                        yaohuPlatformStatus[p] = data.yaohu_api.platforms[p].status || 'unknown';
                    }
                } else {
                    const ov = data.yaohu_api?.status || 'unknown';
                    for (let p in yaohuPlatformStatus) yaohuPlatformStatus[p] = ov;
                }
                gdApiStatus = data.gd_api?.status || 'unknown';
                neteaseVipApiStatus = data.netease_vip_api?.status || 'unknown';
                backupApiAvailable = data.server_status?.online !== false;
                if (data.available_keys && Array.isArray(data.available_keys)) {
                    availableKeyVersions = data.available_keys.filter(v => v === 1 || v === 2);
                } else {
                    availableKeyVersions = [1];
                }
                return { enabled: backupApiAvailable };
            } catch (e) {}
        }
        for (let p in yaohuPlatformStatus) yaohuPlatformStatus[p] = 'unknown';
        gdApiStatus = 'unknown';
        neteaseVipApiStatus = 'unknown';
        backupApiAvailable = false;
        availableKeyVersions = [1];
        return { enabled: false };
    };

    // ==================== 星海智能匹配算法 ====================
    function cleanStr(str) {
        return str.replace(/[\s'.,，&"、\(\)（）`~\-<>|/[\]!！]/g, '').toLowerCase();
    }

    function parseDurationToSeconds(dur) {
        if (!dur) return null;
        const parts = String(dur).split(':');
        if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return parseInt(dur);
    }

    function singerMutualInclude(targetSinger, candidateSinger) {
        return targetSinger.includes(candidateSinger) || candidateSinger.includes(targetSinger);
    }

    function nameMutualInclude(targetName, candidateName) {
        return targetName.includes(candidateName) || candidateName.includes(targetName);
    }

    function findBestMatchLxStyle(targetInfo, candidates) {
        const targetNameClean = cleanStr(targetInfo.name);
        const targetSingerClean = cleanStr(targetInfo.singer);
        const targetAlbumClean = cleanStr(targetInfo.album || '');
        const targetDuration = targetInfo.duration ? parseDurationToSeconds(targetInfo.duration) : null;
        let bestForScore = null;
        let bestScore = -1;

        for (const cand of candidates) {
            const candName = cand.name || cand.title || '';
            const candSinger = cand.singer || cand.author || '';
            const candAlbum = cand.album || '';
            const candDuration = cand.duration ? parseDurationToSeconds(cand.duration) : null;
            const fCandName = cleanStr(candName);
            const fCandSinger = cleanStr(candSinger);
            const fCandAlbum = cleanStr(candAlbum);

            if (targetDuration && candDuration && Math.abs(targetDuration - candDuration) <= 5) {
                if (fCandName === targetNameClean && singerMutualInclude(targetSingerClean, fCandSinger)) {
                    return cand;
                }
            }

            if (fCandSinger === targetSingerClean && nameMutualInclude(targetNameClean, fCandName)) {
                return cand;
            }

            if (targetAlbumClean && fCandAlbum === targetAlbumClean && 
                singerMutualInclude(targetSingerClean, fCandSinger) && 
                nameMutualInclude(targetNameClean, fCandName)) {
                return cand;
            }

            const nameScore = stringMatchScore(targetNameClean, fCandName);
            const singerScore = stringMatchScore(targetSingerClean, fCandSinger);
            const score = nameScore * 0.6 + singerScore * 0.4;
            if (score > bestScore) { bestScore = score; bestForScore = cand; }
        }
        return bestForScore && bestScore >= 0.3 ? bestForScore : null;
    }

    function stringMatchScore(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        let m = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] === b[i]) m++;
        }
        return m / Math.max(a.length, b.length);
    }

    // ==================== 星海搜索功能 ====================
    async function directSearch(upstreamSource, keyword, limit = 10) {
        const st = yaohuPlatformStatus[upstreamSource] || 'unknown';
        if (st !== 'available' && st !== 'unknown' && upstreamSource !== 'kuwo') {
            throw new Error(`上游不可用（${st}）`);
        }
        if (upstreamSource === 'qq') {
            try { return await directSearchQqPlus(keyword, limit); } 
            catch (e) { logError('qq_plus 搜索失败，回退 qq', e); }
        }
        const params = { key: '8Sbg8jJCnrssIDGDaz9', msg: keyword, g: String(limit) };
        if (upstreamSource === 'migu') { params.num = String(limit); delete params.g; }
        const url = `${CONFIG.DIRECT_API_BASE}${upstreamSource}?${buildQueryString(params)}`;
        const resp = await signedFetch(url);
        if (resp.statusCode !== 200) throw new Error(`搜索HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200) {
            if (data.code === 404 && Array.isArray(data.data) && data.data.length === 0) {
                throw new Error('NO_RESULT');
            }
            throw new Error(`搜索业务错误: ${data.msg || data.code}`);
        }
        const songs = extractSongsFromData(data, upstreamSource);
        if (songs.length === 0 && data.code === 404) throw new Error('NO_RESULT');
        return songs;
    }

    async function directSearchQqPlus(keyword, limit = 10) {
        const params = { key: '8Sbg8jJCnrssIDGDaz9', msg: keyword, g: String(limit) };
        const url = `${CONFIG.DIRECT_API_BASE}qq_plus?${buildQueryString(params)}`;
        const resp = await signedFetch(url);
        if (resp.statusCode !== 200) throw new Error(`qq_plus 搜索HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200) throw new Error(`qq_plus 搜索业务错误: ${data.msg || data.code}`);
        const songs = data.data?.songs || [];
        if (!songs.length) throw new Error('qq_plus 搜索无结果');
        return songs.map(s => ({ n: s.n, name: s.name, singer: s.singer, album: s.album, mid: s.mid }));
    }

    async function proxySearch(proxySource, keyword, limit = 10) {
        if (!PROXY_SUPPORTED_SOURCES.has(proxySource)) {
            throw new Error(`代理不支持此平台: ${proxySource}`);
        }
        const params = { source: proxySource, msg: keyword, g: String(limit) };
        if (proxySource === 'migu') { params.num = String(limit); delete params.g; }
        const url = `${CONFIG.FALLBACK_PROXY_URL}?${buildQueryString(params)}`;
        const resp = await httpFetch(url);
        if (resp.statusCode !== 200) throw new Error(`代理搜索HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200) {
            if (data.code === 404 && Array.isArray(data.data) && data.data.length === 0) {
                throw new Error('NO_RESULT');
            }
            throw new Error(`代理搜索业务错误: ${data.msg || data.code}`);
        }
        return extractSongsFromData(data, proxySource);
    }

    function extractSongsFromData(data, upstreamSource) {
        if (!data || data.code !== 200) return [];
        if (upstreamSource === 'kuwo') {
            return Array.isArray(data.data) ? data.data : (data.data?.songs || []);
        }
        if (upstreamSource === 'qq' || upstreamSource === 'tx') {
            return data.data?.songs || [];
        }
        return Array.isArray(data.data) ? data.data : (data.data?.songs || []);
    }

    async function searchAndMatch(source, songName, singer, useProxy = false) {
        const upstream = DIRECT_SOURCE_PATH[source];
        const searchFunc = useProxy ? proxySearch : directSearch;
        const songs = await searchFunc(upstream, songName, 25);
        if (!songs || songs.length === 0) throw new Error('搜索无结果');
        const best = findBestMatchLxStyle({ name: songName, singer, album: '', duration: null }, songs);
        if (!best) throw new Error('未找到匹配歌曲');
        return best;
    }

    // ==================== 星海URL获取函数 ====================
    async function getMusicUrlFromMainAPI(source, songId, apiQuality) {
        if (gdApiBlockedUntil[source] && Date.now() < gdApiBlockedUntil[source]) {
            throw new Error('GD API 暂时屏蔽');
        }
        if (gdApiStatus === 'unavailable') throw new Error('GD API 不可用');
        const apiSource = mainApiSourceMap[source];
        if (!apiSource) throw new Error('GD不支持此平台');
        const url = `${CONFIG.XINGHAI_MAIN_URL}?use_xbridge3=true&loader_name=forest` +
            `&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=${apiSource}` +
            `&id=${songId}&br=${apiQuality}`;
        try {
            const resp = await httpFetch(url, { headers: { 'User-Agent': 'LX-Music-Mobile' } });
            const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
            if (!data.url) {
                gdApiBlockedUntil[source] = Date.now() + 3600000;
                throw new Error(`GD未返回音频地址`);
            }
            return data.url;
        } catch (e) { throw e; }
    }

    async function getMusicUrlFromNeteaseVIP(songId, quality) {
        if (neteaseVipApiStatus === 'unavailable') throw new Error('VIP API 不可用');
        const level = NETEASE_VIP_LEVEL_MAP[quality] || 'jymaster';
        const url = `${CONFIG.NETEASE_VIP_API}?id=${songId}&level=${level}`;
        const resp = await httpFetch(url, { headers: { 'User-Agent': 'LX-Music-Mobile' } });
        if (resp.statusCode !== 200) throw new Error(`VIP HTTP ${resp.statusCode}`);
        const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
        if (data.code !== 200 || !data.data?.url) throw new Error(`VIP未返回音频`);
        return data.data.url;
    }

    async function getMusicUrlViaDirectKw(musicInfo, quality) {
        const rid = musicInfo.songmid || musicInfo.hash || musicInfo.id;
        if (!rid) throw new Error('缺少歌曲 rid');
        const sizeLevels = (quality === 'flac' || quality === 'flac24bit') ? 
            ['lossless', 'hires', 'SQ', 'exhigh', 'Standard'] : ['SQ', 'exhigh', 'Standard'];
        let lastErr = '';
        for (const size of sizeLevels) {
            const params = { key: '8Sbg8jJCnrssIDGDaz9', action: 'song', id: rid, size };
            const url = `${CONFIG.DIRECT_API_BASE}kuwo?${buildQueryString(params)}`;
            try {
                const resp = await signedFetch(url);
                if (resp.statusCode !== 200) {
                    lastErr = `HTTP ${resp.statusCode}`;
                    logError('Kw直连尝试', new Error(`size=${size} ${lastErr}`));
                    continue;
                }
                const data = resp.body;
                if (data.code === 200 && data.data?.vipmusic?.url) return data.data.vipmusic.url;
                else lastErr = `code=${data.code} msg=${data.msg||''}`;
                logError('Kw直连尝试', new Error(`size=${size} 失败: ${lastErr}`));
            } catch (e) { logError('Kw直连尝试', e, `size=${size}`); }
        }
        throw new Error('Kw直连所有音质尝试失败');
    }

    async function getMusicUrlViaDirect(source, musicInfo, quality) {
        if (source === 'kw') return getMusicUrlViaDirectKw(musicInfo, quality);
        if (!isDirectAllowedForSource(source)) throw new Error('直连不可用');
        const songName = musicInfo.name || '', singer = musicInfo.singer || '';
        const upstream = DIRECT_SOURCE_PATH[source];
        if (source === 'tx') {
            try {
                const url = await getMusicUrlViaQqPlus(musicInfo, quality);
                if (url) return url;
            } catch (e) { logError('qq_plus 直连失败，回退 qq', e); }
        }
        const best = await searchAndMatch(source, songName, singer, false);
        if (!best) throw new Error('未找到匹配歌曲');
        const rid = best.rid;
        if (source !== 'tx' && rid) {
            const params = { key: '8Sbg8jJCnrssIDGDaz9', action: 'song', id: rid };
            if (source === 'kg') params.quality = 'flac';
            const url = `${CONFIG.DIRECT_API_BASE}${upstream}?${buildQueryString(params)}`;
            try {
                const resp = await signedFetch(url);
                if (resp.statusCode === 200 && resp.body.code === 200) {
                    const d = resp.body.data;
                    const purl = d?.vipmusic?.url || d?.play_url || d?.music_url || d?.url || d?.musicurl;
                    if (purl) return purl;
                }
            } catch (e) { logError('直连 rid 方式请求失败', e); }
        }
        const n = best.n || best.index || 1;
        const params = { key: '8Sbg8jJCnrssIDGDaz9', msg: songName, n: String(n) };
        if (source === 'kg') params.quality = 'flac';
        else if (source === 'tx') params.size = 'hq';
        const url = `${CONFIG.DIRECT_API_BASE}${upstream}?${buildQueryString(params)}`;
        const resp = await signedFetch(url);
        if (resp.statusCode !== 200) throw new Error(`详情请求HTTP ${resp.statusCode}`);
        const detail = resp.body;
        if (detail.code !== 200) throw new Error(`详情业务错误: ${detail.msg || detail.code}`);
        const purl = detail.data?.vipmusic?.url || detail.data?.play_url || 
            detail.data?.music_url || detail.data?.url || detail.data?.musicurl;
        if (!purl) throw new Error(`未找到音频地址`);
        return purl;
    }

    async function getMusicUrlViaQqPlus(musicInfo, quality) {
        const songName = musicInfo.name || '', singer = musicInfo.singer || '';
        if (!songName) throw new Error('缺少歌曲名称');
        const songs = await directSearchQqPlus(songName, 25);
        if (!songs || !songs.length) throw new Error('qq_plus 搜索无结果');
        const best = findBestMatchLxStyle({ name: songName, singer, album: '', duration: null }, songs);
        if (!best) throw new Error('qq_plus 未匹配到歌曲');
        const n = best.n;
        const sizeMap = { '128k': 'mp3', '320k': 'hq', 'flac': 'flac' };
        const size = sizeMap[quality] || 'hq';
        const params = { key: '8Sbg8jJCnrssIDGDaz9', msg: songName, n: String(n), size };
        const url = `${CONFIG.DIRECT_API_BASE}qq_plus?${buildQueryString(params)}`;
        const resp = await signedFetch(url);
        if (resp.statusCode !== 200) throw new Error(`qq_plus 详情HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200 || !data.data) throw new Error(`qq_plus 详情失败`);
        const d = data.data;
        const urlOut = d.musicurl || d.music_url?.url || d.vipmusicurl || d.play_url || d.url;
        if (!urlOut) throw new Error(`qq_plus 未返回音频地址`);
        return urlOut;
    }

    async function getMusicUrlViaProxy(source, musicInfo, quality) {
        const proxySource = DIRECT_SOURCE_PATH[source];
        if (!proxySource || !PROXY_SUPPORTED_SOURCES.has(proxySource)) {
            throw new Error(`代理不支持此平台`);
        }
        if (!backupApiAvailable) throw new Error('代理服务器离线');
        const best = await searchAndMatch(source, musicInfo.name || '', musicInfo.singer || '', true);
        if (!best) throw new Error('代理搜索无匹配');
        const n = best.n || best.index || 1;
        const params = { source: proxySource, msg: musicInfo.name || '', n: String(n) };
        if (proxySource === 'kg') params.quality = 'flac';
        else if (proxySource === 'qq') params.size = 'hq';
        const resp = await httpFetch(`${CONFIG.FALLBACK_PROXY_URL}?${buildQueryString(params)}`);
        if (resp.statusCode !== 200) throw new Error(`代理详情HTTP ${resp.statusCode}`);
        const detail = resp.body;
        if (detail.code !== 200) throw new Error(`代理详情业务错误: ${detail.msg || detail.code}`);
        const purl = detail.data?.play_url || detail.data?.music_url || 
            detail.data?.url || detail.data?.musicurl;
        if (!purl) throw new Error(`代理未返回音频`);
        return purl;
    }

    function isDirectAllowedForSource(source) {
        const up = DIRECT_SOURCE_PATH[source];
        if (!up) return false;
        if (source === 'kw') return true;
        return yaohuPlatformStatus[up] === 'available' && backupApiAvailable;
    }

    function isPlatformAvailable(platform) {
        if (platform === 'wy') {
            return (mainApiSourceMap['wy'] && gdApiStatus !== 'unavailable') || 
                neteaseVipApiStatus !== 'unavailable';
        }
        if (platform === 'kw') return (mainApiSourceMap['kw'] && gdApiStatus !== 'unavailable') || true;
        const dp = DIRECT_SOURCE_PATH[platform];
        if (!dp) return false;
        const yaohuSt = yaohuPlatformStatus[dp] || 'unknown';
        const directOk = yaohuSt === 'available' && backupApiAvailable;
        const proxyOk = yaohuSt !== 'unavailable' && yaohuSt !== 'maintenance' && 
            backupApiAvailable && PROXY_SUPPORTED_SOURCES.has(dp);
        return directOk || proxyOk;
    }

    function filterAvailablePlatforms() {
        const before = availablePlatforms.length;
        availablePlatforms = availablePlatforms.filter(p => isPlatformAvailable(p));
        if (availablePlatforms.length === 0) {
            availablePlatforms = env === 'desktop' ? 
                ALL_PLATFORMS.filter(p => p !== 'mg') : [...ALL_PLATFORMS];
            log('[集成音源] 无可用平台，已恢复全平台');
        } else if (before !== availablePlatforms.length) {
            log(`[集成音源] 可用平台过滤: ${availablePlatforms.join(',')}`);
        }
    }

    // ==================== qorg/wyqlm 搜索函数 ====================
    async function searchQorgMusic(songInfo) {
        const keyword = (songInfo && (songInfo.name || songInfo.title || 
            songInfo.songName || songInfo.filename || songInfo.label)) || '';
        if (!keyword) throw new Error('无搜索关键词（歌曲名）');
        const resp = await httpGet(`${CONFIG.QORG_API_URL}/search`, 
            { keywords: keyword }, CONFIG.REQUEST_TIMEOUT);

        function deepFindArray(obj, depth = 3) {
            if (!obj || typeof obj !== 'object' || depth <= 0) return [];
            if (Array.isArray(obj)) return obj;
            const keys = ['data', 'result', 'songs', 'list', 'items', 'records'];
            for (const k of keys) {
                if (Array.isArray(obj[k])) return obj[k];
                if (obj[k] && typeof obj[k] === 'object') {
                    const found = deepFindArray(obj[k], depth - 1);
                    if (found.length) return found;
                }
            }
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
                    const found = deepFindArray(obj[key], depth - 1);
                    if (found.length) return found;
                }
            }
            return [];
        }
        
        let list = deepFindArray(resp);
        if (!list.length) throw new Error(`搜索无结果`);

        const name = (songInfo && String(songInfo.name || songInfo.title || '').toLowerCase());
        const singer = (songInfo && String(songInfo.singer || songInfo.artist || '').toLowerCase());
        let bestId = null;
        let bestScore = -1;
        
        for (const item of list) {
            const itemName = String(item.name || item.title || '').toLowerCase();
            const itemSinger = String(item.singer || item.artist || item.author || '').toLowerCase();
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

    // ==================== Free listen 网易云加密函数 ====================
    function freelistenWyEapi(url, object) {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const message = `nobody${url}use${text}md5forencrypt`;
        const digest = md5(message);
        const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
        if (utils && utils.crypto && typeof utils.crypto.aesEncrypt === 'function' && utils.buffer) {
            try {
                const encrypted = utils.crypto.aesEncrypt(data, 'aes-128-ecb', eapiKey, '');
                if (utils.buffer && typeof utils.buffer.bufToString === 'function') {
                    return { params: utils.buffer.bufToString(encrypted, 'hex').toUpperCase() };
                }
            } catch(e) { console.warn('[freelistenWyEapi] 加密失败:', e.message); }
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
        const encSecKey = '257348aecb5e556c066de214e531faadd1c55d814f9be95fd06d6bff9f4c7a41' +
            'f831f6394d5a3fd2e3881736d94a02ca919d952872e7ce0a50eb844be3c20a9f5aa5e1d4da5' +
            '7616f4a3f1c3ff1ef93f77c2b27e6a2a6b02c7b96f2b2e6e6f788d8f103ab93aa2e3006db3' +
            'b0c1b93bc371af9f2f47b1e82f8d5597b3c4fe6b57';
        if (utils && utils.crypto && typeof utils.crypto.aesEncrypt === 'function' && utils.buffer) {
            try {
                const cipher1 = utils.crypto.aesEncrypt(text, 'aes-128-cbc', key1, iv);
                const b64_1 = utils.buffer.bufToString(cipher1, 'base64');
                const cipher2 = utils.crypto.aesEncrypt(b64_1, 'aes-128-cbc', key2, iv);
                const b64_2 = utils.buffer.bufToString(cipher2, 'base64');
                return { params: b64_2, encSecKey: encSecKey };
            } catch(e) { console.warn('[weapi] 加密失败:', e.message); }
        }
        return null;
    }

    async function freelistenWyWeapiRequest(data) {
        const enc = freelistenWyWeapi(data);
        if (!enc) return null;
        const weapiUrl = 'https://interface3.music.163.com/weapi/song/enhance/player/url';
        let cookie = 'os=pc';
        if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
        const resp = await httpFetch(weapiUrl, { method: 'POST', form: enc, headers: { cookie } });
        const body = resp.body;
        if (body?.code === 200 && body.data?.[0]?.url && !body.data[0].freeTrialInfo) {
            return validateUrl(body.data[0].url, 'Free listen 网易云 (weapi)');
        }
        throw new Error(body?.message || 'weapi 获取失败');
    }

    // ==================== qorg 获取播放地址 ====================
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error('qorg仅支持网易云');
        }
        const info = songInfo || {}, meta = info.meta || {};
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid) sid = meta.songmid || meta.id || info.songmid;
        if (!sid) sid = info.trackId || info.song_id || info.track_id;
        if (!sid) sid = meta.trackId || meta.song_id || meta.track_id;
        if (!sid) {
            const keyword = info.name || info.title || '';
            if (keyword) {
                try { sid = await searchQorgMusic(songInfo); } 
                catch (e) { console.warn('[qorg] ID缺失且搜索失败:', e.message); }
            }
        }
        if (!sid) throw new Error('qorg: 缺少歌曲ID');

        sid = String(sid).trim();
        if (!sid || sid === 'undefined' || sid === 'null') {
            throw new Error('qorg: 无效的歌曲ID');
        }

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 
            'flac': 999000, 'flac24bit': 999000, 'hires': 999000, 
            'Hi-Res': 999000, 'jymaster': 999000, 'jyeffect': 999000, 
            'sky': 999000, 'dolby': 999000 };
        const br = brMap[quality] || 320000;
        const levelMap = { '128k': 'standard', '192k': 'higher', '320k': 'exhigh', 
            'flac': 'lossless', 'flac24bit': 'lossless', 'hires': 'hires', 
            'Hi-Res': 'Hi-Res', 'jyeffect': 'jyeffect', 'sky': 'sky', 
            'dolby': 'dolby', 'jymaster': 'jymaster' };
        const level = levelMap[quality] || 'exhigh';

        // 尝试不加密接口
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                const trial = await isTrialSong(res.data[0], res.data[0].url);
                if (!trial) return validateUrl(res.data[0].url, 'qorg');
                else throw new Error('试听歌曲（不加密）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) { console.warn('[qorg] 不加密接口失败:', e.message); }

        // 尝试 weapi
        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                const trial = await isTrialSong({}, url);
                if (!trial) return validateUrl(url, 'qorg (weapi)');
                else throw new Error('试听歌曲（weapi）');
            }
        } catch (e) { console.warn('[qorg] weapi 失败:', e.message); }

        // 尝试 eapi
        try {
            const d = { ids: `[${sid}]`, br: br };
            const eapiUrl = '/api/song/enhance/player/url';
            const eapiData = freelistenWyEapi(eapiUrl, d);
            let cookie = 'os=pc';
            if (CONFIG.NETEASE_CLOUD_COOKIE_KEY) cookie = CONFIG.NETEASE_CLOUD_COOKIE_KEY + '; ' + cookie;
            const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
            const resp = await httpFetch(targetUrl, { method: 'POST', form: eapiData, headers: { cookie } });
            const resData = resp.body;
            if (!resData?.data || !resData.data[0]) throw new Error('eapi返回数据格式异常');
            const { url, freeTrialInfo } = resData.data[0];
            if (url && !freeTrialInfo) {
                const trial = await isTrialSong(resData.data[0], url);
                if (!trial) return validateUrl(url, 'qorg (eapi)');
                else throw new Error('试听歌曲（eapi）');
            }
            throw new Error(resData?.message || freeTrialInfo ? '试听歌曲' : '无URL');
        } catch (e) { console.warn('[qorg] eapi 失败:', e.message); }

        // 尝试 v1
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
        } catch (e) { console.warn('[qorg] /song/url/v1 失败:', e.message); }

        throw new Error('qorg: 所有获取方式均失败或均为试听片段');
    }

    // ==================== qorg 搜索 ====================
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        const cacheKey = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) return cached;
        const res = await httpGet(CONFIG.QORG_API_URL + '/search', 
            { keywords: keyword, limit: pageSize }, 15000);
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (res && res.data) {
            list = Array.isArray(res.data) ? res.data : (res.data.list || res.data.songs || []);
        }
        const total = res?.data?.total || list.length;
        if (list.length > 0) {
            const result = {
                isEnd: list.length < pageSize,
                list: list.map((item, index) => ({
                    id: String(item.id || ''), songmid: item.id, 
                    name: item.name || item.title || '未知歌曲',
                    singer: item.singer || item.artist || '', 
                    albumName: item.album || item.albumname || '',
                    duration: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                    pic: item.pic || item.cover || '', _source: 'qorg'
                })),
                total, page, limit: pageSize
            };
            state.searchCache.set(cacheKey, result);
            return result;
        }
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }

    // ==================== wyqlm 获取播放地址 ====================
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
                console.warn(`[wyqlm] ID缺失，尝试通过 api.qlm.org.cn 搜索补全: ${keyword} ${singer}`);
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
                        if (typeof foundId === 'string' && foundId && 
                            foundId !== 'undefined' && foundId !== 'null') {
                            sid = foundId;
                            log(`[wyqlm] 搜索补全 ID: ${sid}`);
                        }
                    }
                } catch (e) { console.warn('[wyqlm] 搜索补全失败:', e.message); }
            }
        }

        if (!sid) throw new Error('wyqlm: 缺少歌曲ID');
        sid = String(sid).trim();
        if (!sid || sid === 'undefined' || sid === 'null') {
            throw new Error('wyqlm: 无效的歌曲ID');
        }

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 
            'flac': 999000, 'flac24bit': 999000, 'hires': 999000, 
            'Hi-Res': 999000, 'jymaster': 999000, 'jyeffect': 999000, 
            'sky': 999000, 'dolby': 999000 };
        const br = brMap[quality] || 320000;
        const levelMap = { '128k': 'standard', '192k': 'higher', '320k': 'exhigh', 
            'flac': 'lossless', 'flac24bit': 'lossless', 'hires': 'hires', 
            'Hi-Res': 'Hi-Res', 'jyeffect': 'jyeffect', 'sky': 'sky', 
            'dolby': 'dolby', 'jymaster': 'jymaster' };
        const level = levelMap[quality] || 'exhigh';

        // 尝试不加密接口
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                const trial = await isTrialSong(res.data[0], res.data[0].url);
                if (!trial) return validateUrl(res.data[0].url, 'wyqlm');
                else throw new Error('试听歌曲（不加密）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) { console.warn('[wyqlm] 不加密接口失败:', e.message); }

        // 尝试 weapi
        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                const trial = await isTrialSong({}, url);
                if (!trial) return validateUrl(url, 'wyqlm (weapi)');
                else throw new Error('试听歌曲（weapi）');
            }
        } catch (e) { console.warn('[wyqlm] weapi 失败:', e.message); }

        // 尝试 v1
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
                if (!trial) return validateUrl(v1Url, 'wyqlm (v1)');
                else throw new Error('试听歌曲（v1）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) { console.warn('[wyqlm] /song/url/v1 失败:', e.message); }

        throw new Error('wyqlm: 所有获取方式均失败或均为试听片段');
    }

    // ==================== 非常刀(CHKSZ) ====================
    const CHKSZ_LEVEL = { '128k': 'standard', '192k': 'higher', '320k': 'exhigh', 
        'flac': 'lossless', 'flac24bit': 'jymaster', 'hires': 'hires', 
        'Hi-Res': 'Hi-Res', 'jyeffect': 'jyeffect', 'sky': 'sky', 
        'dolby': 'dolby', 'jymaster': 'jymaster' };
    const CHKSZ_FALLBACK = {
        jymaster: ['jymaster', 'Hi-Res', 'sky', 'dolby', 'jyeffect', 'hires', 
            'lossless', 'exhigh', 'higher', 'standard'],
        dolby: ['dolby', 'Hi-Res', 'sky', 'jyeffect', 'hires', 'lossless', 'exhigh', 'higher', 'standard'],
        sky: ['sky', 'Hi-Res', 'dolby', 'jyeffect', 'hires', 'lossless', 'exhigh', 'higher', 'standard'],
        jyeffect: ['jyeffect', 'Hi-Res', 'sky', 'dolby', 'hires', 'lossless', 'exhigh', 'higher', 'standard'],
        'Hi-Res': ['Hi-Res', 'hires', 'lossless', 'exhigh', 'higher', 'standard'],
        hires: ['hires', 'lossless', 'exhigh', 'higher', 'standard'],
        lossless: ['lossless', 'exhigh', 'higher', 'standard'],
        exhigh: ['exhigh', 'higher', 'standard'],
        higher: ['higher', 'standard'],
        standard: ['standard'],
    };

    async function chkszGetUrl(songInfo, quality) {
        if (!songInfo) throw new Error('CHKSZ: 歌曲信息缺失');
        const id = getSongId('wy', songInfo);
        if (!id) throw new Error('CHKSZ: 缺少ID');
        const level = CHKSZ_LEVEL[quality] || 'exhigh';
        const fallbackLevels = CHKSZ_FALLBACK[level] || [level];
        for (const lv of fallbackLevels) {
            try {
                const resp = await httpGet(`${CONFIG.CHKSZ_API}/netease/song/url`, 
                    { id, level: lv }, CONFIG.REQUEST_TIMEOUT);
                if (resp?.code === 200 && resp.data?.url) {
                    const trial = await isTrialSong(resp.data, resp.data.url);
                    if (!trial) return resp.data.url;
                    else console.warn(`[CHKSZ] 音质 ${lv} 返回试听片段`);
                }
            } catch(e) {}
        }
        throw new Error('CHKSZ: 获取失败或均为试听');
    }

    // ==================== ikun ====================
    async function ikunGetMusicUrl(platform, songInfo, quality) {
        const sourceMap = { tx: 'tx', wy: 'wy', kw: 'kw', kg: 'kg', mg: 'mg' };
        const source = sourceMap[platform];
        if (!source) throw new Error('ikun: 不支持平台 ' + platform);
        const sid = getSongId(platform, songInfo) || songInfo.hash || songInfo.songmid || songInfo.id;
        if (!sid) throw new Error('ikun: 缺少歌曲ID');
        
        const ua = `lx-music-${env}/${version}`;
        const headers = { 'Content-Type': 'application/json', 'User-Agent': ua };
        if (CONFIG.IKUN_API_KEY) headers['X-Request-Key'] = CONFIG.IKUN_API_KEY;
        
        const urls = [
            `${CONFIG.IKUN_API_URL}/url?source=${source}&songId=${sid}&quality=${quality || '320k'}`,
            `${CONFIG.IKUN_HK_API_URL}/url/${source}/${sid}/${quality || '320k'}`
        ];
        
        let lastErr;
        for (const u of urls) {
            try {
                const res = await httpFetch(u, { method: 'GET', headers, follow_max: 5 });
                const body = res.body;
                if (!body || isNaN(Number(body.code))) continue;
                if (body.code === 200) {
                    const url = extractUrl(body.url || body.data, 'ikun');
                    if (url) {
                        const trial = await isTrialSong(body, url);
                        if (!trial) return validateUrl(url, 'ikun');
                        else throw new Error('试听歌曲');
                    }
                }
                if (body.code === 403) throw new Error('ikun: Key失效');
                if (body.code === 500) throw new Error('ikun: 获取失败 - ' + (body.message || '未知'));
                if (body.code === 429) throw new Error('ikun: 请求过速');
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('ikun: 所有服务器失败');
    }

    // ==================== 野草(酷我) ====================
    async function yecaoGetMusicUrl(songInfo, quality) {
        const sid = songInfo.hash || songInfo.id || songInfo.songmid;
        if (!sid) throw new Error('野草: 缺少歌曲ID');
        const url = `${CONFIG.YECAO_API}?id=${sid}&quality=${quality || '320k'}`;
        const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '野草');
        if (finalUrl) {
            const trial = await isTrialSong({}, finalUrl);
            if (!trial) return validateUrl(finalUrl, '野草');
            else throw new Error('试听歌曲');
        }
        throw new Error('野草未返回URL');
    }

    // ==================== fish ====================
    async function fishGetMusicUrl(platform, songInfo, quality) {
        if (!['kg', 'kw', 'tx'].includes(platform)) {
            throw new Error('fish: 不支持平台 ' + platform + '，仅支持 kg/kw/tx');
        }
        let sid = getSongId(platform, songInfo);
        if (!sid) {
            try { sid = await searchQorgMusic(songInfo); } 
            catch (e) { throw new Error('fish: 缺少歌曲ID且搜索补全失败: '+e.message); }
        }
        const url = `${CONFIG.FISH_API_URL}/url/${platform}/${sid}/${quality}`;
        const resp = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.code === 0 && typeof resp.data === 'string' && HTTP_REGEX.test(resp.data)) {
            const trial = await isTrialSong(resp, resp.data);
            if (!trial) return resp.data;
            else throw new Error('fish: 返回试听片段');
        }
        throw new Error(resp?.msg || 'fish: 获取失败');
    }

    // ==================== 星海主API ====================
    async function xinghaiMainGetUrl(platform, songInfo, quality) {
        const source = PLATFORM_TO_XINGHAI[platform];
        if (!source) throw new Error('星海主: 不支持此平台');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('星海主: 缺少歌曲ID');
        
        const selectedQuality = quality || '320k';
        const br = QUALITY_TO_BR[selectedQuality] || '320';
        const params = Object.assign({}, CONFIG.XINGHAI_MAIN_PARAMS, { source, id: String(id), br });
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(CONFIG.XINGHAI_MAIN_URL, params, timeout);
                if (resp && resp.url && HTTP_REGEX.test(resp.url)) {
                    const trial = await isTrialSong(resp, resp.url);
                    if (!trial) return resp.url;
                    else console.warn('[星海主] 返回试听片段');
                }
                if (resp && resp.data && HTTP_REGEX.test(resp.data)) {
                    const trial = await isTrialSong(resp, resp.data);
                    if (!trial) return resp.data;
                    else console.warn('[星海主] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        
        // 尝试备用URL
        try {
            const backupParams = { types: 'url', source, id: String(id), br };
            const resp = await httpGet(CONFIG.XINGHAI_BACKUP_URL, backupParams, CONFIG.REQUEST_TIMEOUT);
            const url = extractUrl(resp, '星海备');
            if (url) {
                const trial = await isTrialSong(resp, url);
                if (!trial) return url;
            }
        } catch (e) { console.warn('[星海主] 备用URL失败:', e.message); }
        
        throw new Error('星海主获取失败: ' + (lastError?.message || 'unknown'));
    }

    // ==================== 溯音 ====================
    async function suyinQQGetUrl(songInfo, quality) {
        const id = getSongId('tx', songInfo);
        if (!id) throw new Error("溯音QQ需要歌曲ID");
        const br = QUALITY_TO_SUYIN_QQ_BR[quality] || 5;
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const res = await httpGet(CONFIG.SUYIN_QQ_API, { id, key: CONFIG.SUYIN_QQ_KEY, br }, timeout);
                if (res?.code === 0 && res?.data?.url) {
                    const trial = await isTrialSong(res, res.data.url);
                    if (!trial) return res.data.url;
                    else console.warn('[溯音QQ] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        throw new Error("溯音QQ获取失败: " + (lastError?.message || "unknown"));
    }

    async function suyin163GetUrl(songInfo) {
        const id = getSongId('wy', songInfo);
        if (!id) throw new Error("溯音163需要歌曲ID");
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const res = await httpGet(CONFIG.SUYIN_163_API, { id }, timeout);
                if (res?.code === 0 && res?.data) {
                    const item = Array.isArray(res.data) ? res.data[0] : res.data;
                    let url = item?.url && HTTP_REGEX.test(item.url) ? item.url : 
                        extractUrl(res) || deepExtractUrl(res);
                    if (url && HTTP_REGEX.test(url)) {
                        const trial = await isTrialSong(res, url);
                        if (!trial) return url;
                        else console.warn('[溯音163] 返回试听片段');
                    }
                }
            } catch (e) { lastError = e; }
        }
        throw new Error("溯音163获取失败: " + (lastError?.message || "unknown"));
    }

    async function suyinKuwoGetUrl(songInfo, quality) {
        if (!songInfo?.name) throw new Error("溯音酷我需要歌曲名");
        const br = QUALITY_TO_KUWO_BR[quality] || 1;
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const res = await httpGet(CONFIG.SUYIN_KUWO_API, { msg: songInfo.name, n: 1, br: br }, timeout);
                let url = res?.data?.url && HTTP_REGEX.test(res.data.url) ? res.data.url : 
                    extractUrl(res) || deepExtractUrl(res);
                if (url && HTTP_REGEX.test(url)) {
                    const trial = await isTrialSong(res, url);
                    if (!trial) return url;
                    else console.warn('[溯音酷我] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        throw new Error("溯音酷我未找到链接: " + (lastError?.message || "unknown"));
    }

    async function suyinMiguGetUrl(songInfo) {
        if (!songInfo?.name) throw new Error("溯音咪咕需要歌曲名");
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const res = await httpGet(CONFIG.SUYIN_MIGU_API, { gm: songInfo.name, n: 1, num: 1, type: "json" }, timeout);
                let url = res?.code === 200 && res?.musicInfo && HTTP_REGEX.test(res.musicInfo) ? 
                    res.musicInfo : extractUrl(res) || deepExtractUrl(res);
                if (url && HTTP_REGEX.test(url)) {
                    const trial = await isTrialSong(res, url);
                    if (!trial) return url;
                    else console.warn('[溯音咪咕] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        throw new Error("溯音咪咕失败: " + (lastError?.message || "unknown"));
    }

    async function suyinGetUrl(platform, songInfo, quality) {
        try {
            switch (platform) {
                case "tx": return await suyinQQGetUrl(songInfo, quality);
                case "wy": return await suyin163GetUrl(songInfo);
                case "kw": return await suyinKuwoGetUrl(songInfo, quality);
                case "mg": return await suyinMiguGetUrl(songInfo);
                default: throw new Error("溯音不支持该平台");
            }
        } catch (e) { throw e; }
    }

    // ==================== 长青/念心SVIP ====================
    function qualityToNetease(quality) {
        const q = String(quality || "128k").toLowerCase();
        if (q === "flac" || q === "flac24bit" || q === "hires" || q === "master" || q === "atmos") return "lossless";
        if (q === "320k" || q === "192k") return "exhigh";
        return "standard";
    }

    async function changqingGetUrl(platform, songInfo, quality) {
        const template = CONFIG.CHANGQING_URL_TEMPLATES[platform];
        if (!template) throw new Error("长青SVIP不支持该平台");
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error("长青SVIP缺少songId");
        const level = qualityToNetease(quality);
        const url = template.replace("{id}", encodeURIComponent(String(songId)))
            .replace("{level}", encodeURIComponent(level));
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(url, {}, timeout);
                let extracted = typeof resp === 'string' && HTTP_REGEX.test(resp) ? resp : 
                    extractUrl(resp) || deepExtractUrl(resp, 10);
                if (!extracted && resp && typeof resp === 'object') {
                    for (const field of ['url', 'music_url', 'play_url', 'source_url', 'download_url', 'data', 'result']) {
                        if (resp[field] && typeof resp[field] === 'string' && HTTP_REGEX.test(resp[field])) {
                            extracted = resp[field]; break;
                        }
                    }
                }
                if (extracted && HTTP_REGEX.test(extracted)) {
                    const trial = await isTrialSong(resp, extracted);
                    if (!trial) return extracted;
                    else console.warn('[长青SVIP] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        throw new Error('长青SVIP: 无效URL或均为试听');
    }

    async function nianxinGetUrl(platform, songInfo, quality) {
        const template = CONFIG.NIANXIN_URL_TEMPLATES[platform];
        if (!template) throw new Error("念心SVIP不支持该平台");
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error("念心SVIP缺少songId");
        const level = qualityToNetease(quality);
        const url = template.replace("{id}", encodeURIComponent(String(songId)))
            .replace("{level}", encodeURIComponent(level));
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(url, {}, timeout);
                let extracted = typeof resp === 'string' && HTTP_REGEX.test(resp) ? resp : 
                    extractUrl(resp) || deepExtractUrl(resp, 10);
                if (!extracted && resp && typeof resp === 'object') {
                    for (const field of ['url', 'music_url', 'play_url', 'source_url', 'download_url', 'data', 'result']) {
                        if (resp[field] && typeof resp[field] === 'string' && HTTP_REGEX.test(resp[field])) {
                            extracted = resp[field]; break;
                        }
                    }
                }
                if (extracted && HTTP_REGEX.test(extracted)) {
                    const trial = await isTrialSong(resp, extracted);
                    if (!trial) return extracted;
                    else console.warn('[念心SVIP] 返回试听片段');
                }
            } catch (e) { lastError = e; }
        }
        throw new Error('念心SVIP: 无效URL或均为试听');
    }

    // ==================== 汽水VIP ====================
    async function qishuiGetUrl(songInfo, quality) {
        const songId = getSongId('mg', songInfo);
        if (!songId) throw new Error("汽水VIP缺少歌曲ID");
        const res = await httpGetWithFallback(
            [CONFIG.QISHUI_API_HTTPS, CONFIG.QISHUI_API_HTTP],
            { act: "song", id: songId, quality: quality }, 20000
        );
        const data = res?.data;
        if (data?.url) {
            let finalUrl = data.url;
            if (data.ekey) {
                const proxyRes = await httpPost(CONFIG.QISHUI_PROXY_API, {
                    url: data.url, key: data.ekey, 
                    filename: data.filename || "KMusic", ext: data.fileExtension || "aac"
                }, 60000);
                if (Number(proxyRes?.code) === 200 && proxyRes?.url) {
                    finalUrl = String(proxyRes.url);
                } else throw new Error("汽水VIP代理解密失败");
            }
            const trial = await isTrialSong(data, finalUrl);
            if (!trial) return finalUrl;
            else throw new Error('汽水VIP返回试听片段');
        }
        throw new Error('汽水VIP未返回URL');
    }

    async function qishuiSearch(keyword, page, limit) {
        const url = CONFIG.QISHUI_API_HTTPS;
        const res = await httpPost(url, { act: "search", msg: keyword, num: limit }, CONFIG.REQUEST_TIMEOUT);
        let list = res?.data || [];
        if (!Array.isArray(list)) list = [];
        return {
            isEnd: list.length < limit,
            list: list.map((item, index) => ({
                singer: item.author || '', name: item.name || item.title || '未知歌曲',
                album: item.album || '', source: 'qsvip',
                songmid: item.songmid || item.id || String(index),
                interval: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                img: item.cover || item.pic || '', lrc: null,
                hash: item.hash || item.songmid || item.id || String(index)
            })),
            total: list.length, limit, page, isEnd: list.length < limit
        };
    }

    async function qishuiGetLyric(songInfo) {
        const songId = getSongId('mg', songInfo) || songInfo.hash || songInfo.songmid;
        if (!songId) throw new Error("汽水VIP歌词缺少歌曲ID");
        const res = await httpGetWithFallback(
            [CONFIG.QISHUI_API_HTTPS, CONFIG.QISHUI_API_HTTP],
            { act: "lyric", id: songId }, CONFIG.REQUEST_TIMEOUT
        );
        if (res?.code === 200 && res.data) { return { lyric: res.data }; }
        throw new Error('汽水VIP歌词获取失败');
    }

    // ==================== GD/肥猫/小熊猫/梓澄/無名/六音 ====================
    async function gdGetUrl(platform, songInfo, quality) {
        const sourceMap = { tx: "qq", wy: "netease", kw: "kuwo", kg: "kugou", mg: "migu" };
        const source = sourceMap[platform];
        if (!source) throw new Error('GD音乐台不支持此平台');
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('GD音乐台缺少歌曲ID');
        const brMap = { "128k": 128000, "192k": 192000, "320k": 320000, "flac": 999000, "flac24bit": 999000 };
        const br = brMap[quality] || 320000;
        const res = await httpGet(CONFIG.GD_API_URL, { source, id: songId, br }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, 'GD音乐台');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, 'GD音乐台');
            else throw new Error('GD音乐台返回试听片段');
        }
        throw new Error('GD音乐台未返回URL');
    }

    async function feimaoGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('肥猫缺少歌曲ID');
        const res = await httpGet(`${CONFIG.FEIMAO_API_URL}/api.php`, { type: platform, id: songId, quality }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '肥猫');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, '肥猫');
            else throw new Error('肥猫返回试听片段');
        }
        throw new Error('肥猫未返回URL');
    }

    async function xiaoxiongmaoGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('小熊猫缺少歌曲ID');
        const res = await httpGet(`${CONFIG.XIAOXIONGMAO_API_URL}/api.php`, { type: platform, id: songId, quality }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '小熊猫');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, '小熊猫');
            else throw new Error('小熊猫返回试听片段');
        }
        throw new Error('小熊猫未返回URL');
    }

    async function zichanGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('梓澄公益缺少歌曲ID');
        const res = await httpGet(`${CONFIG.ZICHENG_API_URL}/api.php`, { type: platform, id: songId, quality }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '梓澄公益');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, '梓澄公益');
            else throw new Error('梓澄公益返回试听片段');
        }
        throw new Error('梓澄公益未返回URL');
    }

    async function wumingGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('無名缺少歌曲ID');
        const res = await httpGet(`${CONFIG.WUMING_API_URL}/api.php`, { type: platform, id: songId, quality }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '無名');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, '無名');
            else throw new Error('無名返回试听片段');
        }
        throw new Error('無名未返回URL');
    }

    async function liuyinGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('六音缺少歌曲ID');
        const res = await httpGet(`${CONFIG.LIUYIN_API_URL}/api.php`, { type: platform, id: songId, quality }, CONFIG.REQUEST_TIMEOUT);
        const finalUrl = extractUrl(res?.url || res?.data?.url || res, '六音');
        if (finalUrl) {
            const trial = await isTrialSong(res, finalUrl);
            if (!trial) return validateUrl(finalUrl, '六音');
            else throw new Error('六音返回试听片段');
        }
        throw new Error('六音未返回URL');
    }

    // ==================== 网易云官方API ====================
    async function neteaseGetMusicUrl(songId, quality = '320k') {
        if (!songId) throw new Error('网易云官方API: 缺少歌曲ID');
        const brMap = { "128k": 128000, "192k": 192000, "320k": 320000, 
            "flac": 740000, "flac24bit": 999000, "24bit": 999000 };
        const br = brMap[quality] || 320000;
        const eapiKey = 'e82ckenh8dichen8';
        const endpoint = '/api/song/enhance/player/url/v1';
        const text = JSON.stringify({ ids: `[${songId}]`, br: br });
        const message = `nobody${endpoint}use${text}md5forencrypt`;
        const digest = NeteaseCrypto.md5(message);
        const data = `${endpoint}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
        let encrypted = NeteaseCrypto.aesEncrypt(data, eapiKey, '', 'aes-128-ecb');
        if (encrypted && typeof encrypted === 'object' && encrypted.buffer) {
            encrypted = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        const postData = { params: (typeof encrypted === 'string' ? encrypted : '').toUpperCase() };
        try {
            const url = `https://interface.music.163.com${endpoint}`;
            const res = await httpPost(url, postData, CONFIG.REQUEST_TIMEOUT);
            if (res && res.data && res.data[0] && res.data[0].url) {
                const playUrl = res.data[0].url;
                const trial = await isTrialSong(res.data[0], playUrl);
                if (!trial) return validateUrl(playUrl, '网易云官方API');
                else throw new Error('网易云官方API: 返回试听片段');
            }
            if (res && res.data && res.data[0] && res.data[0].freeTrialInfo) {
                throw new Error('网易云官方API: 仅支持免费试听');
            }
        } catch (e) { console.debug(`[网易云官方] eapi 失败:`, e.message); }
        throw new Error('网易云官方API获取失败或返回试听');
    }

    // ==================== 音源处理器类 ====================
    class SourceHandler {
        constructor(name, fn, priority, opts={}) {
            this.name = name; this.fn = fn; this.priority = priority;
            this.timeout = opts.timeout || CONFIG.REQUEST_TIMEOUT;
            this.supportedPlatforms = opts.supportedPlatforms || [];
            this.needUrlValidation = opts.needUrlValidation !== false;
        }
        supportsPlatform(p) { 
            return this.supportedPlatforms.length===0 || this.supportedPlatforms.includes(p); 
        }
    }

    // ==================== 降级链构建 ====================
    const SOURCE_HANDLERS = [
        new SourceHandler('GD音乐台', async (p, m, q) => gdGetUrl(p, m, q), 0, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('CHKSZ', async (p, m, q) => { if(p!=='wy') throw new Error('仅限网易云'); return chkszGetUrl(m, q); }, 1, 
            { supportedPlatforms: ['wy'] }),
        new SourceHandler('肥猫', async (p, m, q) => feimaoGetUrl(p, m, q), 2, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('小熊猫', async (p, m, q) => xiaoxiongmaoGetUrl(p, m, q), 3, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('梓澄公益', async (p, m, q) => zichanGetUrl(p, m, q), 4, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('無名', async (p, m, q) => wumingGetUrl(p, m, q), 5, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('六音', async (p, m, q) => liuyinGetUrl(p, m, q), 6, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('星海主', async (p, m, q) => xinghaiMainGetUrl(p, m, q), 7, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('长青SVIP', async (p, m, q) => changqingGetUrl(p, m, q), 8, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('念心SVIP', async (p, m, q) => nianxinGetUrl(p, m, q), 9, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('溯音', async (p, m, q) => suyinGetUrl(p, m, q), 10, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'mg'] }),
        new SourceHandler('ikun', async (p, m, q) => ikunGetMusicUrl(p, m, q), 11, 
            { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('野草', async (p, m, q) => { if(p!=='kw') throw new Error('仅限酷我'); return yecaoGetMusicUrl(m, q); }, 11, 
            { supportedPlatforms: ['kw'] }),
        new SourceHandler('fish', async (p, m, q) => fishGetMusicUrl(p, m, q), 12, 
            { supportedPlatforms: ['kg', 'kw', 'tx'] }),
        new SourceHandler('qorg', async (p, m, q) => qorgGetMusicUrl(p, m, q), 13, 
            { supportedPlatforms: ['wy'] }),
        new SourceHandler('wyqlm', async (p, m, q) => wyqlmGetMusicUrl(m, q), 14, 
            { supportedPlatforms: ['wy'] }),
        new SourceHandler('网易云官方', async (p, m, q) => { const id=getSongId('wy', m); if(!id) throw new Error('缺少ID'); return neteaseGetMusicUrl(id, q); }, 15, 
            { supportedPlatforms: ['wy'] }),
        new SourceHandler('汽水VIP', async (p, m, q) => qishuiGetUrl(m, q), 16, 
            { supportedPlatforms: ['mg'] }),
    ];

    function getHandlersForPlatform(platform) {
        return SOURCE_HANDLERS.filter(h => h.supportsPlatform(platform)).sort((a, b) => a.priority - b.priority);
    }

    // ==================== 终极兜底 ====================
    async function ultimateFallback(platform, songInfo, quality, cacheKey) {
        const fallbackSources = [
            { name: '星海备用', fn: async () => xinghaiMainGetUrl(platform, songInfo, quality) },
            { name: 'GD备用', fn: async () => gdGetUrl(platform, songInfo, quality) },
        ];
        for (const source of fallbackSources) {
            try {
                console.log(`[终极兜底] 尝试: ${source.name} (${platform})`);
                const url = await source.fn();
                const validated = validateUrl(url, source.name);
                const trial = await isTrialSong({}, validated);
                if (!trial) {
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    log(`[终极兜底] ${source.name} 成功`);
                    return validated;
                }
            } catch (e) { console.warn(`[终极兜底] ${source.name} 请求失败: ${e.message}`); }
        }
        return null;
    }

    // ==================== 试听音源 ====================
    async function tryTrialSource(platform, songInfo, quality, cacheKey) {
        if (platform !== 'wy') {
            console.warn(`[试听音源] 仅支持网易云平台，当前平台: ${platform}`);
            state.stats.fail++;
            return null;
        }
        const q = quality || '320k';
        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000 };
        const br = brMap[q] || 128000;
        let songId = getSongId(platform, songInfo) || songInfo.hash || songInfo.songmid || songInfo.id;
        if (!songId) {
            const keyword = songInfo.name || songInfo.title || '';
            if (keyword) {
                try {
                    const searchRes = await qorgSearch(keyword, 1, 3);
                    if (searchRes && searchRes.list && searchRes.list.length > 0) {
                        songId = searchRes.list[0].id || searchRes.list[0].songmid;
                    }
                } catch (e) { console.warn('[试听音源] 搜索补全失败:', e.message); }
            }
        }
        if (!songId) { console.warn('[试听音源] 缺少歌曲ID'); state.stats.fail++; return null; }
        try {
            console.log(`[试听音源] 尝试获取网易云试听片段: ${songId}`);
            const eapiKey = 'e82ckenh8dichen8';
            const endpoint = '/api/song/enhance/player/url/v1';
            const text = JSON.stringify({ ids: `[${songId}]`, br: br });
            const message = `nobody${endpoint}use${text}md5forencrypt`;
            const digest = NeteaseCrypto.md5(message);
            const data = `${endpoint}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
            let encrypted = NeteaseCrypto.aesEncrypt(data, eapiKey, '', 'aes-128-ecb');
            if (encrypted && typeof encrypted === 'object' && encrypted.buffer) {
                encrypted = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            const postData = { params: (typeof encrypted === 'string' ? encrypted : '').toUpperCase() };
            const url = `https://interface.music.163.com${endpoint}`;
            const res = await httpPost(url, postData, CONFIG.REQUEST_TIMEOUT);
            if (res && res.data && res.data[0] && res.data[0].url) {
                const playUrl = res.data[0].url;
                const validated = validateUrl(playUrl, '试听音源');
                const reachable = await validateAudioUrl(validated, 5000);
                if (reachable) {
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    console.log('[试听音源] 成功获取试听片段（30秒），请理解');
                    return validated;
                }
            }
        } catch (e) { console.warn('[试听音源] 获取失败:', e.message); }
        state.stats.fail++;
        return null;
    }

    // ==================== 带fallback获取URL（顺序执行避免竞态） ====================
    async function getUrlWithFallback(platform, musicInfo, quality) {
        if (!platform) throw new Error('无效平台');
        if (!musicInfo || typeof musicInfo !== 'object') throw new Error('无效歌曲信息');
        const q = quality || '320k';
        const cacheKey = SafeUtils.buildCacheKey(platform, musicInfo, q);
        let cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;

        const handlers = getHandlersForPlatform(platform);
        
        if (handlers.length === 0) {
            console.warn(`[聚合音源] 没有常规音源处理器，走终极兜底`);
            const fallbackUrl = await ultimateFallback(platform, musicInfo, q, cacheKey);
            if (fallbackUrl) return fallbackUrl;
            return await tryTrialSource(platform, musicInfo, q, cacheKey);
        }

        // ===== 顺序执行所有音源处理器 =====
        const errors = [];
        let resultUrl = null;

        for (const handler of handlers) {
            try {
                console.log(`[聚合音源] 顺序尝试: ${handler.name} (${platform})`);
                const timeout = handler.timeout || CONFIG.REQUEST_TIMEOUT;
                let url;
                if (['汽水VIP', 'wyqlm'].includes(handler.name)) {
                    url = await withTimeout(handler.fn(musicInfo, q), timeout, handler.name + '超时');
                } else {
                    url = await withTimeout(handler.fn(platform, musicInfo, q), timeout, handler.name + '超时');
                }
                const validated = validateUrl(url, handler.name);
                if (handler.needUrlValidation) {
                    const isReachable = await validateAudioUrl(validated, 5000);
                    if (!isReachable) throw new Error(`${handler.name}: URL不可达`);
                }
                const trial = await isTrialSong({}, validated);
                if (trial) {
                    console.warn(`[聚合音源] ${handler.name} 返回试听片段，跳过`);
                    errors.push(`${handler.name}: 试听片段`);
                    continue;
                }
                resultUrl = validated;
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                console.log(`[聚合音源] ${handler.name} 成功，停止搜索`);
                return resultUrl;
            } catch (e) {
                errors.push(`${handler.name}: ${e.message}`);
                console.warn(`[聚合音源] ${handler.name} 失败: ${e.message}`);
            }
        }

        if (resultUrl) return resultUrl;

        console.warn(`[聚合音源] 所有常规音源失败，开始终极兜底 (平台:${platform})`);
        const fallbackUrl = await ultimateFallback(platform, musicInfo, q, cacheKey);
        if (fallbackUrl) return fallbackUrl;

        return await tryTrialSource(platform, musicInfo, q, cacheKey);
    }

    // ==================== 平台配置 ====================
    const sourceConfig = {
        tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        qorg: { name: 'qorg', type: 'music', actions: ['musicUrl', 'search'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        wyqlm: { name: 'wyqlm', type: 'music', actions: ['musicUrl'], 
            qualitys: ['128k','192k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] },
        qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl', 'search', 'lyric'], 
            qualitys: ['128k','320k','flac','flac24bit','hires','Hi-Res','jyeffect','sky','dolby','jymaster'] }
    };

    // ==================== 事件监听 ====================
    function setupEventListener() {
        const handler = async ({ action, source, info }) => {
            try {
                if (action === 'musicUrl') {
                    if (!info?.musicInfo) throw new Error('缺少歌曲信息');
                    const url = await getUrlWithFallback(source, info.musicInfo, info.type || '320k');
                    if (CONFIG.PRELOAD_ENABLED && info.nextMusicInfo) {
                        PreloadManager.addToQueue(info.nextMusicInfo, info.type || CONFIG.PRELOAD_QUALITY);
                    }
                    if (url === '') return { url: '' };
                    return url;
                }

                if (action === 'search') {
                    const keyword = info?.keyword || '';
                    const limit = Math.min(info?.limit || 20, 50);
                    const page = info?.page || 1;
                    if (!keyword) throw new Error('需要搜索关键词');
                    const cacheKey = `search_${source}_${keyword}_${page}_${limit}`;
                    const cached = state.searchCache.get(cacheKey);
                    if (cached) return cached;
                    let result;
                    switch (source) {
                        case 'qsvip': result = await qishuiSearch(keyword, page, limit); break;
                        case 'qorg':
                        default:
                            const resp = await httpGet(`${CONFIG.QORG_API_URL}/search`, 
                                { keywords: keyword, limit }, CONFIG.REQUEST_TIMEOUT);
                            let list = [];
                            if (Array.isArray(resp)) list = resp;
                            else if (resp && resp.data) {
                                list = Array.isArray(resp.data) ? resp.data : (resp.data.list || resp.data.songs || []);
                            }
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
                                })),
                                total: total, limit: limit, page: page, isEnd: list.length < limit
                            };
                            break;
                    }
                    state.searchCache.set(cacheKey, result);
                    return result;
                }

                if (action === 'lyric') {
                    if (source === 'qsvip') { return qishuiGetLyric(info?.musicInfo || {}); }
                    throw new Error('不支持的操作: ' + action);
                }

                if (action === 'preload') {
                    if (info?.musicInfo) {
                        PreloadManager.addToQueue(info.musicInfo, info.quality || CONFIG.PRELOAD_QUALITY);
                        return { status: 'queued' };
                    }
                    throw new Error('缺少预加载歌曲信息');
                }

                if (action === 'cookie') {
                    if (info?.type === 'set') {
                        if (info?.fixed) return CookieManager.setFixedCookie(info.value);
                        else return CookieManager.setCookie(info.value);
                    } else if (info?.type === 'get') {
                        if (info?.fixed) return { cookie: CookieManager.getFixedCookie() };
                        else return { cookie: CookieManager.getCookie() };
                    } else if (info?.type === 'clear') { return CookieManager.clearCookie(); }
                    throw new Error('不支持的Cookie操作');
                }

                throw new Error('不支持的操作: ' + action);
            } catch(e) {
                console.error('[聚合音源] 请求失败:', e.message);
                throw e;
            }
        };
        try { on(EVENT_NAMES.request, handler); } 
        catch(e) { try { on('request', handler); } catch(e2) {} }
    }

    // ==================== 版本更新检查 ====================
    async function checkAutoUpdate() {
        if (state.updateAlertCalled) return;
        try {
            const resp = await httpFetch(CONFIG.UPDATE_CONFIG.versionApiUrl, {
                timeout: 10000,
                headers: { 'User-Agent': 'LX-Music-Mobile' }
            });
            if (resp.statusCode !== 200) return;
            let data = resp.body;
            if (typeof data === 'string') data = JSON.parse(data.trim().replace(/^\uFEFF/, ''));
            if (!data?.version) return;
            const { version: remoteVer, changelog, update_url } = data;
            if (compareVersions(remoteVer, CONFIG.UPDATE_CONFIG.currentVersion)) {
                if (state.updateAlertCalled) return;
                state.updateAlertCalled = true;
                send(EVENT_NAMES.updateAlert, {
                    log: `发现新版本 ${remoteVer}\n${changelog || ''}`,
                    updateUrl: update_url || CONFIG.UPDATE_CONFIG.latestScriptUrl
                });
            }
        } catch (e) {}
    }

    function compareVersions(a, b) {
        const p = v => v.replace(/^v/, '').split('.').map(x => {
            const n = parseInt(x);
            return isNaN(n) ? x : n;
        });
        const x = p(a), y = p(b);
        for (let i = 0; i < Math.max(x.length, y.length); i++) {
            const av = x[i] ?? (typeof y[i] === 'number' ? 0 : '');
            const bv = y[i] ?? (typeof x[i] === 'number' ? 0 : '');
            if (typeof av === 'number' && typeof bv === 'number') {
                if (av > bv) return true;
                if (av < bv) return false;
            } else {
                if (typeof av === 'number' && typeof bv === 'string') return true;
                if (typeof av === 'string' && typeof bv === 'number') return false;
            }
        }
        return false;
    }

    // ==================== 初始化 ====================
    function sendAnnouncement() {
        if (state.announcementSent || state.updateAlertCalled) return;
        state.announcementSent = true;
        state.updateAlertCalled = true;
        try { send && send(EVENT_NAMES.updateAlert, { log: ANNOUNCEMENT.content }); } 
        catch(e) {}
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        console.log('[聚合音源] ' + ANNOUNCEMENT.title + ' 初始化');
        console.log(ANNOUNCEMENT.content);
        
        // 初始化星海模块
        try {
            const server = await fetchServerStatus();
            musicSourceEnabled = true;
            backupApiAvailable = server.enabled;
            if (env === 'desktop') {
                stableSourcesList = ['netease', 'tencent', 'kuwo', 'kugou'];
            } else {
                await fetchStableSources();
                if (!stableSourcesList) stableSourcesList = ['netease', 'kuwo'];
            }
            buildPlatformsFromStableSources();
            filterAvailablePlatforms();
            fetchCredentials().catch(() => {});
            serverCheckCompleted = true;
        } catch (e) {
            logError('星海模块初始化异常', e);
            stableSourcesList = ['netease', 'kuwo'];
            buildPlatformsFromStableSources();
            if (availablePlatforms.length === 0) {
                availablePlatforms = env === 'desktop' ? ALL_PLATFORMS.filter(p => p !== 'mg') : [...ALL_PLATFORMS];
            }
            musicSourceEnabled = true;
            backupApiAvailable = false;
            serverCheckCompleted = true;
        }
        
        setupEventListener();
        sendAnnouncement();
        try {
            send && send(EVENT_NAMES.inited, { 
                openDevTools: false, 
                sources: sourceConfig, 
                status: { version: ANNOUNCEMENT.version } 
            });
        } catch(e) {}
        
        setTimeout(checkAutoUpdate, 3000);
    }

    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));

})();
