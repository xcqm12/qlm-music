/**
 * @name 七零喵聚合音源 · 超级完整版
 * @description 整合非常刀、全豆要、溯音、fish、统一、lx-玉宁熙等所有音源
 * @version 9.0.0-super-full-fixed
 * @author 七零喵团队
 * @homepage https://github.com/xcqm12/qlm-music
 * @features 预加载 | 网易云cookie管理 | eapi/weapi/raw加密接口
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

    // URLSearchParams polyfill
    if (typeof URLSearchParams !== 'function') {
        globalThis.URLSearchParams = function(obj) {
            this._params = obj && typeof obj === 'object' ? Object.assign({}, obj) : {};
            
            this.append = function(key, value) {
                if (this._params[key]) {
                    if (!Array.isArray(this._params[key])) {
                        this._params[key] = [this._params[key]];
                    }
                    this._params[key].push(value);
                } else {
                    this._params[key] = value;
                }
            };
            
            this.toString = function() {
                const pairs = [];
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        const value = this._params[key];
                        if (Array.isArray(value)) {
                            value.forEach(v => pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(v)));
                        } else {
                            pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                        }
                    }
                }
                return pairs.join('&');
            };
            
            this.get = function(key) {
                const value = this._params[key];
                if (Array.isArray(value)) {
                    return value[0];
                }
                return value;
            };
            
            this.set = function(key, value) {
                this._params[key] = value;
            };
            
            this.delete = function(key) {
                delete this._params[key];
            };
            
            this.has = function(key) {
                return key in this._params;
            };
            
            this.getAll = function(key) {
                const value = this._params[key];
                if (Array.isArray(value)) {
                    return value.slice();
                } else if (value !== undefined) {
                    return [value];
                }
                return [];
            };
            
            this.keys = function() {
                const self = this;
                const keys = [];
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }
                let index = 0;
                return {
                    next: function() {
                        if (index < keys.length) {
                            return { value: keys[index++], done: false };
                        }
                        return { value: undefined, done: true };
                    },
                    [Symbol.iterator]: function() { return this; }
                };
            };
            
            this.values = function() {
                const self = this;
                const values = [];
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        values.push(this._params[key]);
                    }
                }
                let index = 0;
                return {
                    next: function() {
                        if (index < values.length) {
                            return { value: values[index++], done: false };
                        }
                        return { value: undefined, done: true };
                    },
                    [Symbol.iterator]: function() { return this; }
                };
            };
            
            this.entries = function() {
                const self = this;
                const entries = [];
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        entries.push([key, this._params[key]]);
                    }
                }
                let index = 0;
                return {
                    next: function() {
                        if (index < entries.length) {
                            return { value: entries[index++], done: false };
                        }
                        return { value: undefined, done: true };
                    },
                    [Symbol.iterator]: function() { return this; }
                };
            };
            
            this.forEach = function(callback, thisArg) {
                for (const key in this._params) {
                    if (this._params.hasOwnProperty(key)) {
                        callback.call(thisArg, this._params[key], key, this);
                    }
                }
            };
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
        title: "七零喵聚合音源 · 超级完整版 v9.0",
        content: "🔗 GitHub: https://github.com/xcqm12/qlm-music\n" +
                 "⚡ 整合音源: 非常刀 / 全豆要 / 溯音 / fish / 统一 / 玉宁熙\n" +
                 "🎯 qorg/wyqlm 三重API: /song/url/v1 /song/url /song/url/v1/302\n" +
                 "✅ URL验证 + 解灰支持 + 音质降级\n" +
                 "🔐 eapi/weapi/raw 加密接口支持\n" +
                 "🍪 网易云Cookie管理 + 预加载功能\n" +
                 "© 2026 七零喵团队",
        version: "9.0.0-super-full"
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
        } else { console.error('[聚合音源] request API 不可用'); return; }
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
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
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
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
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
            a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }

    // ==================== 常量配置 ====================
    const CONFIG = Object.freeze({
        // qorg/wyqlm API
        QORG_API_URL: "https://api.qlm.org.cn",
        
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
        NETEASE_COOKIE_KEY: '_ntes_nnid=e0b8265473f1c7213e9a1452935723e7,1777688651463; _ntes_nuid=e0b8265473f1c7213e9a1452935723e7;',
        NETEASE_FIXED_COOKIE_KEY: '__remember_me=true; NMTID=00OOuabqph1TDgQmkqbrhQzuO44Iu4AAAGd5oAj2A; _ntes_nnid=e0b8265473f1c7213e9a1452935723e7,1777688651463; _ntes_nuid=e0b8265473f1c7213e9a1452935723e7; WEVNSM=1.0.0; WNMCID=lrlevv.1777688874921.01.0; WM_TID=Ap6oyS0WW%2FxAVVEVEQKS9%2BgskVvXcFT9; ntes_kaola_ad=1; ntes_utid=tid._.Az3mUDMnk2hBQlUFUEfG4r0phUuWxFTz._.0; sDeviceId=YD-ePU5TUzM9YtBEhFABFKT4qh8kR%2FXgVG3; NTES_P_UTID=nfA2V1NCcxjzJRGQAFLoSkxUMQhSEsNV|1777689810; P_INFO=m18505137906@163.com|1777689810|0|x19_developer|00&99|jis&1777504050&ntesgod_app#jis&320600#10#0#0|185906&1|ntesgod_app|18505137906@163.com; _iuqxldmzr_=32; timing_user_id=time_lw02HQTDKe; __snaker__id=Usa1OMMymDpUWSq2; gdxidpyhxdE=I9MswpgG6JbtomY7YBCyfIkGKPvfn%5Cu7RQwqkcmy46n6qu8JC8spDcD1TUqAQjgXWNOCpxoK6t1hixhPcrrDG2CHPrA0bI6sWqd1iz6T%5CU6N5QKnwm9GA%2FmYcPtiG4g4eJI7BQ%5Cw7wBmOZrGCcr%2FYzlfKeeSLgy%2Fd8ogTGZtYQPr97vv%3A1778297418262; __csrf=7947a5a7232f6a0a5b4242493247227e; MUSIC_U=00E5439FF4AAD0487F2016EF33FA989BD5F7E7F8DA17CA21A7A7F1416D175050C455428EECAF208399919AAB981C0CA1156CD4CA2AD679250F37A227A73FCCDF016075A893ECC308ABEBE1732D4F6BE032E38123E6517541C734CD6F175FE1F46106DBDDDAEEB1B59DAB71C7029A149C7C3D797489D2301604FA41D467509649D1AF74F6FFB0301DB3595421C70C33461339DE648571CEC77241550A63EBD1A449262C54AF898458589B452ADCC0494C7EB8FEF4ED2C39B6EEAD5E29CFBD9AC33F17282C7D712636AFA2D562A273D20332312545C7F862DBEDD1A52246AC92A8CFE5D02C3CDC9BE1CD966FE594330BE472E5D860406F4E47344470DB8A23250A93620D16DF8503978E106B01F2111EA3512A22E6545D1785993981B66682C4F20FBBE2209719669D2DA8AAB3DC083EDF0C6978043F4185B88CDF6878C5F85CC1ECA58F72594D97E0CD528D06400824D3ADAC39DE798D4FFBBA67EE74C6ACBD584A80EAC426A510179E4044E9047D906ED9AE4CB07C2829C1A0371708A85BDA8452191115DD1265350EDABF0ABE96BE781279DE602153ABAB8713F2216323009053; WM_NI=S%2BeIa7U2sImHORzcK%2BiT9nDXyLLdc%2F4v0MENUx58z6CXWUtWiyp0ozSpzlyV1NXJqKY8mj00ic0ak%2BbkCgDRVUF7aFtWD1I0cqv8td6P7z0Hez%2BBDiM8L5Hd0dsA2QZUcU8%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeaff36a9487b885ee3d8cb88fa2c55e839b8aaddb2192b5888cc43b83efa3d4d02af0fea7c3b92a91f5abaae43d97eebdaaf0448d8eb684ca21ab8cf78fc754bb948485e225f8aa00aec84697a8fbd9f93e818899b6f75daba7c0d1ee7291b0b68dfc5ef39298abf4419be8a38bb33cabbd0082ea21a2b58d88c75a968b8ad8e44eb8898cd2cc3ca1afbad9f770f690f99bb344a7a6e5a3c7638fe884d6cb70f4bcbda2b15b9a8badb6bb37e2a3; JSESSIONID-WYYY=bV2fsgW3MoQMB%5CiOuntI9K%2F%2F63aqH7nStm9EU3c9ukHuW%2F%5COQuP7EtUcxU3Au2FfkH%2Bgc4%2F3AoD3%2BZDg2m%5CWcYlrI88nzSm5TikbrorQzH5conjgPdJKrXcnsMOC4bbJbm8bhAPnttoB8nEMlgXVUDh4Y3KBpMPEqzcwD74rxKbIE8x9%3A1778687261156'
    });

    const QUALITY_TO_BR = Object.freeze({ "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999" });
    const QUALITY_TO_LEVEL = Object.freeze({ "128k": "standard", "192k": "higher", "320k": "exhigh", "flac": "lossless", "flac24bit": "jymaster", "24bit": "jymaster" });
    const QUALITY_TO_SUYIN_QQ_BR = Object.freeze({ "128k": 7, "320k": 5, "flac": 4, "hires": 3, "atmos": 2, "master": 1, "24bit": 1 });
    const QUALITY_TO_KUWO_BR = Object.freeze({ flac: 1, "320k": 5, "128k": 7, "24bit": 1 });
    const HTTP_REGEX = /^https?:\/\//i;

    // 平台映射
    const PLATFORM_TO_XINGHAI = { wy: "netease", tx: "tencent", kw: "kuwo", kg: "kugou", mg: "migu" };
    const PLATFORM_TO_XINGHAI_BACKUP = { wy: "netease", tx: "qq", kw: "kuwo" };

    // ==================== 网易云加密工具 ====================
    const NeteaseCrypto = {
        // WeAPI 加密
        weapiEncrypt: function(data) {
            const text = JSON.stringify(data);
            const secKey = this.generateSecretKey(16);
            const encText = this.aesEncrypt(this.aesEncrypt(text, '0CoJUm6Qyw8W8jud'), secKey);
            const encSecKey = this.rsaEncrypt(secKey);
            return {
                params: encText,
                encSecKey: encSecKey
            };
        },

        // EAPI 加密
        eapiEncrypt: function(url, data) {
            const text = JSON.stringify(data);
            const message = `nobody${url}use${text}md5forencrypt`;
            const digest = this.md5(message);
            const combined = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
            return {
                params: this.aesEncrypt(combined, 'e82ckenh8dichen8')
            };
        },

        // 原始接口（不加密）
        rawEncrypt: function(data) {
            return data;
        },

        // AES 加密
        aesEncrypt: function(text, key, iv, mode) {
            const actualIv = iv || '0102030405060708';
            const actualMode = mode || 'AES-CBC';
            const cipher = this.createCipher(actualMode, key, actualIv);
            return cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
        },

        // RSA 加密
        rsaEncrypt: function(text) {
            const key = '010001';
            const modulus = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
            let result = BigInt(0);
            for (let i = text.length - 1; i >= 0; i--) {
                result = (result * BigInt(256) + BigInt(text.charCodeAt(i))) % BigInt('0x' + modulus);
            }
            let encrypted = '';
            const base = BigInt('0x' + key);
            result = this.modPow(result, base, BigInt('0x' + modulus));
            const hex = result.toString(16);
            return hex.padStart(256, '0');
        },

        // 模幂运算
        modPow: function(base, exponent, modulus) {
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

        // 生成随机密钥
        generateSecretKey: function(length) {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        // MD5 哈希
        md5: function(str) {
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
        },

        // 创建AES加密器（简化版）
        createCipher: function(algorithm, key, iv) {
            const keyBytes = this.stringToBytes(key);
            const ivBytes = iv ? this.stringToBytes(iv) : null;
            const isECB = !iv || algorithm.toLowerCase().includes('ecb');
            
            return {
                update: (data, inputEncoding, outputEncoding) => {
                    const dataBytes = inputEncoding === 'utf8' ? this.stringToBytes(data) : this.base64ToBytes(data);
                    const padded = this.padPKCS7(dataBytes, 16);
                    const encrypted = isECB 
                        ? this.aesEcbEncrypt(padded, keyBytes) 
                        : this.aesCbcEncrypt(padded, keyBytes, ivBytes);
                    return outputEncoding === 'base64' ? this.bytesToBase64(encrypted) : encrypted;
                },
                final: (outputEncoding) => {
                    return '';
                }
            };
        },

        stringToBytes: function(str) {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
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
            for (let i = 0; i < pad; i++) {
                data.push(pad);
            }
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
                0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
                0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
                0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
                0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
                0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
                0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
                0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
                0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
                0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
                0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
                0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
                0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
                0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
                0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
                0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
                0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
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
                    for (let j = 0; j < 4; j++) {
                        temp[j] = this.subWord(rotated[j]);
                    }
                    temp[0] ^= rcon[i / 16];
                }
                for (let j = 0; j < 4; j++) {
                    expanded.push(expanded[i - 16 + j] ^ temp[j]);
                }
            }
            return expanded;
        },

        subWord: function(byte) {
            const sbox = [
                0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
                0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
                0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
                0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
                0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
                0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
                0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
                0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
                0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
                0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
                0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
                0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
                0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
                0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
                0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
                0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
            ];
            return sbox[byte];
        },

        subBytes: function(state, sbox) {
            return state.map(b => sbox[b]);
        },

        shiftRows: function(state) {
            const result = state.slice();
            result[1] = state[5]; result[5] = state[9]; result[9] = state[13]; result[13] = state[1];
            result[2] = state[10]; result[6] = state[14]; result[10] = state[2]; result[14] = state[6];
            result[3] = state[15]; result[7] = state[11]; result[11] = state[15]; result[15] = state[7];
            return result;
        },

        mixColumns: function(state) {
            const result = new Array(16);
            const mul = [
                [2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]
            ];
            for (let col = 0; col < 4; col++) {
                for (let row = 0; row < 4; row++) {
                    let val = 0;
                    for (let i = 0; i < 4; i++) {
                        val ^= this.gfMult(mul[row][i], state[col * 4 + i]);
                    }
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

        addRoundKey: function(state, key) {
            return state.map((b, i) => b ^ key[i]);
        }
    };

    // ==================== 网易云Cookie管理器 ====================
    const CookieManager = {
        // 获取固定Cookie（用于第三方API）
        getFixedCookie: function() {
            const defaultCookie = 'NMTID=00OOuabqph1TDgQmkqbrhQzuO44Iu4AAAGd5oAj2A;';
            if (storage) {
                try {
                    const stored = storage.getItem(CONFIG.NETEASE_FIXED_COOKIE_KEY);
                    return stored || defaultCookie;
                } catch (e) {
                    console.warn('[CookieManager] 获取固定Cookie失败:', e.message);
                    return defaultCookie;
                }
            }
            return defaultCookie;
        },

        // 设置固定Cookie
        setFixedCookie: function(cookie) {
            if (storage) {
                try {
                    storage.setItem(CONFIG.NETEASE_FIXED_COOKIE_KEY, cookie);
                    return true;
                } catch (e) {
                    console.warn('[CookieManager] 设置固定Cookie失败:', e.message);
                    return false;
                }
            }
            return false;
        },

        // 获取变量Cookie（用于官方API）
        getCookie: function() {
            if (storage) {
                try {
                    const stored = storage.getItem(CONFIG.NETEASE_COOKIE_KEY);
                    return stored || '';
                } catch (e) {
                    console.warn('[CookieManager] 获取Cookie失败:', e.message);
                    return '';
                }
            }
            return '';
        },

        // 设置变量Cookie
        setCookie: function(cookie) {
            if (storage) {
                try {
                    storage.setItem(CONFIG.NETEASE_COOKIE_KEY, cookie);
                    return true;
                } catch (e) {
                    console.warn('[CookieManager] 设置Cookie失败:', e.message);
                    return false;
                }
            }
            return false;
        },

        // 清除Cookie
        clearCookie: function() {
            if (storage) {
                try {
                    storage.removeItem(CONFIG.NETEASE_COOKIE_KEY);
                    storage.removeItem(CONFIG.NETEASE_FIXED_COOKIE_KEY);
                    return true;
                } catch (e) {
                    console.warn('[CookieManager] 清除Cookie失败:', e.message);
                    return false;
                }
            }
            return false;
        }
    };

    // ==================== 预加载管理器 ====================
    const PreloadManager = {
        preloadQueue: [],
        maxCacheSize: CONFIG.PRELOAD_CACHE_SIZE,
        enabled: CONFIG.PRELOAD_ENABLED,
        
        // 添加到预加载队列
        addToQueue: function(songInfo, quality = CONFIG.PRELOAD_QUALITY) {
            if (!this.enabled) return;
            
            const cacheKey = SafeUtils.buildCacheKey('preload', songInfo, quality);
            
            if (this.preloadQueue.find(item => item.cacheKey === cacheKey)) {
                return;
            }
            
            this.preloadQueue.push({
                songInfo: songInfo,
                quality: quality,
                cacheKey: cacheKey,
                status: 'pending',
                promise: null
            });
            
            if (this.preloadQueue.length > this.maxCacheSize) {
                this.preloadQueue.shift();
            }
            
            this.processQueue();
        },
        
        // 处理预加载队列
        async processQueue() {
            const pendingItems = this.preloadQueue.filter(item => item.status === 'pending');
            if (pendingItems.length === 0) return;
            
            const item = pendingItems[0];
            item.status = 'loading';
            
            try {
                const url = await getUrlWithFallback('wy', item.songInfo, item.quality);
                if (url && state.urlCache) {
                    state.urlCache.set(item.cacheKey, url);
                }
                item.status = 'completed';
                item.result = url;
                
                // 发送预加载完成事件
                try {
                    send && send(EVENT_NAMES.preload, {
                        status: 'success',
                        songInfo: item.songInfo,
                        url: url
                    });
                } catch (e) {}
                
            } catch (error) {
                item.status = 'failed';
                item.error = error.message;
                
                try {
                    send && send(EVENT_NAMES.preload, {
                        status: 'failed',
                        songInfo: item.songInfo,
                        error: error.message
                    });
                } catch (e) {}
            }
            
            // 继续处理下一个
            this.processQueue();
        },
        
        // 获取预加载状态
        getStatus: function(songInfo, quality = CONFIG.PRELOAD_QUALITY) {
            const cacheKey = SafeUtils.buildCacheKey('preload', songInfo, quality);
            const item = this.preloadQueue.find(item => item.cacheKey === cacheKey);
            return item?.status || 'not_found';
        },
        
        // 清除预加载缓存
        clearCache: function() {
            this.preloadQueue = [];
        },
        
        // 启用/禁用预加载
        toggle: function(enabled) {
            this.enabled = enabled;
        }
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

    // ==================== 工具函数 ====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        switch (platform) {
            case 'kg': return info.hash || info.songmid || info.id || (meta && (meta.hash || meta.songmid || meta.id));
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
            case 'kw': return info.songmid || info.id || info.rid || (meta && (meta.songmid || meta.id || meta.rid));
            case 'mg': return info.songmid || info.id || info.cid || (meta && (meta.songmid || meta.id || meta.cid));
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

    async function httpPost(url, body, timeout, extraHeaders={}) {
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/json', 'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders},
            body: SafeUtils.isString(body) ? body : JSON.stringify(body||{}),
            timeout
        })).body;
    }

    async function httpPostForm(url, formData, timeout, extraHeaders={}) {
        const form = new URLSearchParams();
        Object.entries(formData || {}).forEach(([k, v]) => form.append(k, v));
        return (await httpRequestWithRetry(url, {
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded', 'User-Agent': `lx-music-${env}/${version}`, ...extraHeaders},
            body: form.toString(),
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
            if (ct && !/audio|mpeg|octet-stream|mp3|m4a|flac|wav|ogg/i.test(ct)) return false;
            return true;
        } catch (e) {
            return false;
        }
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
        initialized: false,
        announcementSent: false,
        neteaseCookie: '',
        stats: {
            hits: 0,
            misses: 0,
            success: 0,
            fail: 0
        }
    };

    // ==================== qorg/wyqlm 搜索函数 ====================
    async function searchQorgMusic(songInfo) {
        const keyword = (songInfo && (songInfo.name || songInfo.title || songInfo.songName || songInfo.filename || songInfo.label)) || '';
        if (!keyword) throw new Error('无搜索关键词（歌曲名）');
        
        const resp = await httpGet(
            `${CONFIG.QORG_API_URL}/search`,
            { keywords: keyword },
            CONFIG.REQUEST_TIMEOUT
        );

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
        const encSecKey = '257348aecb5e556c066de214e531faadd1c55d814f9be95fd06d6bff9f4c7a41f831f6394d5a3fd2e3881736d94a02ca919d952872e7ce0a50eb844be3c20a9f5aa5e1d4da57616f4a3f1c3ff1ef93f77c2b27e6a2a6b02c7b96f2b2e6e6f788d8f103ab93aa2e3006db3b0c1b93bc371af9f2f47b1e82f8d5597b3c4fe6b57';
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

    // ==================== qorg 获取播放地址（参考qlm-v7.1.2-ultimate-fix-v3.7.js） ====================
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        if (platform !== 'wy' && platform !== 'wycloudmusic') {
            throw new Error(`qorg: 不支持平台 ${platform}，仅支持 wy/wycloudmusic`);
        }

        const info = songInfo || {}, meta = info.meta || {};
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid && platform === 'wy') sid = meta.songmid || meta.id || info.songmid;
        if (!sid && platform === 'wycloudmusic') sid = info.songmid || info.id || meta.id;

        if (!sid) {
            const keyword = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
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

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000 };
        const br = brMap[quality] || 128000;

        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                return validateUrl(res.data[0].url, 'qorg');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] 不加密接口失败:', e.message, '→ 尝试 weapi');
        }

        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                return validateUrl(url, 'qorg (weapi)');
            }
        } catch (e) {
            console.warn('[qorg] weapi 失败:', e.message, '→ 尝试 eapi');
        }

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

    // ==================== qorg 搜索 ====================
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        const cacheKey = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) return cached;
        const res = await httpPost(CONFIG.QORG_API_URL + '/music/search', { keyword, page, pageSize }, 15000);
        if (res?.code === 200 && res.data) {
            const list = (res.data.list || []).map(item => ({
                id: String(item.id || ''), songmid: item.id, name: item.name, singer: item.singer || item.artist,
                albumName: item.album, duration: item.duration, pic: item.pic || item.cover, _source: 'qorg'
            }));
            const result = { isEnd: list.length < pageSize, list, total: res.data.total || list.length, page, limit: pageSize };
            state.searchCache.set(cacheKey, result);
            return result;
        }
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }

    // ==================== wyqlm 获取播放地址（参考qlm-v7.1.2-ultimate-fix-v3.7.js） ====================
    async function wyqlmGetMusicUrl(songInfo, quality) {
        const info = songInfo || {}, meta = info.meta || {};
        let sid = info.hash || info.songmid || info.id || info.songId;
        if (!sid) sid = meta.hash || meta.songmid || meta.id;
        if (!sid) sid = meta.songmid || meta.id || info.songmid;

        if (!sid) {
            const keyword = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
            if (keyword) {
                console.warn(`[wyqlm] ID缺失，尝试通过 api.qlm.org.cn 搜索补全: ${keyword} ${singer}`);
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
                        if (sid) console.log(`[wyqlm] 搜索补全 ID: ${sid} (${match.name} - ${match.singer})`);
                    }
                } catch (e) { console.warn('[wyqlm] 搜索补全失败:', e.message); }
            }
        }

        if (!sid) throw new Error('wyqlm: 缺少歌曲ID，且搜索补全未成功');

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000 };
        const br = brMap[quality] || 128000;

        try {
            const url = `${CONFIG.QORG_API_URL}/song/url?id=${sid}&br=${br}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res?.code === 200 && Array.isArray(res.data) && res.data[0]?.url) {
                return validateUrl(res.data[0].url, 'wyqlm');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[wyqlm] 不加密接口失败:', e.message, '→ 尝试 weapi');
        }

        try {
            const d = { ids: `[${sid}]`, br: br };
            const url = await freelistenWyWeapiRequest(d);
            if (url) {
                return validateUrl(url, 'wyqlm (weapi)');
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
                method: 'POST',
                form: eapiData,
                headers: { cookie }
            });
            const resData = resp.body;
            const { url, freeTrialInfo } = resData.data[0];
            if (url && !freeTrialInfo) {
                return validateUrl(url, 'wyqlm (eapi)');
            }
            throw new Error(resData?.message || freeTrialInfo ? '试听歌曲' : '无URL');
        } catch (e) {
            console.warn('[wyqlm] eapi 失败:', e.message);
        }

        throw new Error('wyqlm: 所有获取方式均失败 (不加密 / weapi / eapi)');
    }

    // ==================== 音乐可用性检查 ====================
    async function checkMusicPlayable(songId, br) {
        const params = br ? { id: songId, br } : { id: songId };
        const resp = await httpGet(`${CONFIG.QORG_API_URL}/check/music`, params, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.code === 200) {
            return resp.data?.success === true || resp.data?.playable === true;
        }
        return false;
    }

    // ==================== 非常刀(CHKSZ) ====================
    const CHKSZ_LEVEL = { '128k': 'standard', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'jymaster' };
    const CHKSZ_FALLBACK = {
        jymaster: ['jymaster', 'lossless', 'exhigh', 'standard'],
        lossless: ['lossless', 'exhigh', 'standard'],
        exhigh: ['exhigh', 'standard'],
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
                const resp = await httpGet(`${CONFIG.CHKSZ_API}/netease/song/url`, { id, level: lv }, CONFIG.REQUEST_TIMEOUT);
                if (resp?.code === 200 && resp.data?.url) return resp.data.url;
            } catch(e) {}
        }
        throw new Error('CHKSZ: 获取失败');
    }

    async function chkszSearch(keyword, limit) {
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

    // ==================== fish ====================
    async function fishGetMusicUrl(platform, songInfo, quality) {
        let sid = getSongId(platform, songInfo);
        if (!sid) {
            try {
                sid = await searchQorgMusic(songInfo);
            } catch (e) {
                throw new Error('fish: 缺少歌曲ID且搜索补全失败: '+e.message);
            }
        }
        const url = `${CONFIG.FISH_API_URL}/url/${platform}/${sid}/${quality}`;
        const resp = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        if (resp && resp.code === 0 && typeof resp.data === 'string' && HTTP_REGEX.test(resp.data)) {
            return resp.data;
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
        
        const params = Object.assign({}, CONFIG.XINGHAI_MAIN_PARAMS, {
            source, id: String(id), br
        });
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5, CONFIG.REQUEST_TIMEOUT * 2.5, CONFIG.REQUEST_TIMEOUT * 4];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(CONFIG.XINGHAI_MAIN_URL, params, timeout);
                if (!resp || typeof resp !== 'object') {
                    throw new Error('无效响应');
                }
                if (resp.url) return resp.url;
                
                const url = extractUrl(resp) || deepExtractUrl(resp);
                if (url && HTTP_REGEX.test(url)) return url;
                
                if (resp && typeof resp === 'object') {
                    const moreUrls = deepExtractUrl(resp, 10);
                    if (moreUrls && HTTP_REGEX.test(moreUrls)) return moreUrls;
                }
            } catch (e) {
                lastError = e;
                console.debug(`[星海主] 超时${timeout}ms:`, e.message);
            }
        }
        
        throw new Error(lastError?.message || '星海主: 未返回音频地址');
    }

    // ==================== 星海备API ====================
    async function xinghaiBackupGetUrl(platform, songInfo, quality) {
        const source = PLATFORM_TO_XINGHAI_BACKUP[platform];
        if (!source) throw new Error('星海备: 不支持此平台');
        const id = getSongId(platform, songInfo);
        if (!id) throw new Error('星海备: 缺少歌曲ID');
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5, CONFIG.REQUEST_TIMEOUT * 2.5];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const reqUrl = `${CONFIG.XINGHAI_BACKUP_URL}?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&type=url&br=${encodeURIComponent(quality)}`;
                const res = await httpGet(reqUrl, {}, timeout);
                if (res?.url && HTTP_REGEX.test(res.url)) return res.url;
                
                if (res && typeof res === 'object') {
                    const extractedUrl = extractUrl(res) || deepExtractUrl(res);
                    if (extractedUrl && HTTP_REGEX.test(extractedUrl)) return extractedUrl;
                }
            } catch (e) {
                lastError = e;
                console.debug(`[星海备] API失败:`, e.message);
            }
        }
        
        throw new Error(lastError?.message || '星海备API未返回url字段');
    }

    // ==================== 溯音 ====================
    function qualityToSuyinQQ(quality) {
        const q = String(quality || "128k").toLowerCase();
        if (q === "flac24bit") return "hires";
        if (q === "192k") return "320k";
        if (QUALITY_TO_SUYIN_QQ_BR[q]) return q;
        return "128k";
    }

    async function suyinQQGetUrl(songInfo, quality) {
        const id = getSongId('tx', songInfo);
        if (!id) throw new Error("溯音QQ缺少songmid/id");
        const normalizedQuality = qualityToSuyinQQ(quality);
        const startBr = QUALITY_TO_SUYIN_QQ_BR[normalizedQuality] || QUALITY_TO_SUYIN_QQ_BR["128k"];
        const brList = [startBr, 4, 5, 7].filter((v, i, a) => a.indexOf(v) === i && v >= startBr).sort((a, b) => a - b);
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError = null;
        
        for (const br of brList) {
            for (const timeout of timeouts) {
                try {
                    const reqParams = { key: CONFIG.SUYIN_QQ_KEY, type: "json", br: br, n: 1, id: id };
                    const res = await httpGet(CONFIG.SUYIN_QQ_API, reqParams, timeout);
                    if (res?.music && HTTP_REGEX.test(res.music)) return res.music;
                    if (res?.url && HTTP_REGEX.test(res.url)) return res.url;
                    // 尝试提取URL
                    const extracted = extractUrl(res) || deepExtractUrl(res);
                    if (extracted && HTTP_REGEX.test(extracted)) return extracted;
                } catch (e) {
                    lastError = e;
                    console.debug(`[溯音QQ] br=${br} 超时${timeout}ms 失败:`, e.message);
                }
            }
        }
        throw new Error("溯音QQ全部音质尝试失败: " + (lastError?.message || "unknown"));
    }

    async function suyin163GetUrl(songInfo) {
        const id = songInfo?.songmid || songInfo?.id;
        if (!id) throw new Error("溯音163缺少songmid/id");
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const res = await httpGet(CONFIG.SUYIN_163_API, { id: id }, timeout);
                if (res?.code === 0 && res?.data) {
                    const item = Array.isArray(res.data) ? res.data[0] : res.data;
                    if (item?.url && HTTP_REGEX.test(item.url)) return item.url;
                    const extracted = extractUrl(res) || deepExtractUrl(res);
                    if (extracted && HTTP_REGEX.test(extracted)) return extracted;
                }
            } catch (e) {
                lastError = e;
                console.debug(`[溯音163] 请求失败:`, e.message);
            }
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
                if (res?.data?.url && HTTP_REGEX.test(res.data.url)) return res.data.url;
                const extracted = extractUrl(res) || deepExtractUrl(res);
                if (extracted && HTTP_REGEX.test(extracted)) return extracted;
            } catch (e) {
                lastError = e;
                console.debug(`[溯音酷我] 请求失败:`, e.message);
            }
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
                if (res?.code === 200 && res?.musicInfo && HTTP_REGEX.test(res.musicInfo)) {
                    return res.musicInfo;
                }
                const extracted = extractUrl(res) || deepExtractUrl(res);
                if (extracted && HTTP_REGEX.test(extracted)) return extracted;
            } catch (e) {
                lastError = e;
                console.debug(`[溯音咪咕] 请求失败:`, e.message);
            }
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
        } catch (e) {
            // 如果是Aborted错误，尝试使用备用方法
            if (e.message && e.message.includes('Aborted')) {
                console.debug(`[溯音] 请求中止，尝试备用方案`);
            }
            throw e;
        }
    }

    // ==================== 长青SVIP ====================
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
        const url = template.replace("{id}", encodeURIComponent(String(songId))).replace("{level}", encodeURIComponent(level));
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(url, {}, timeout);
                
                // 尝试多种URL提取方式
                let extracted = null;
                
                // 方式1: 直接字符串响应
                if (typeof resp === 'string' && HTTP_REGEX.test(resp)) {
                    extracted = resp;
                }
                // 方式2: extractUrl函数
                else if (!extracted) {
                    extracted = extractUrl(resp);
                }
                // 方式3: deepExtractUrl深度提取
                else if (!extracted) {
                    extracted = deepExtractUrl(resp, 10);
                }
                // 方式4: 常见字段提取
                if (!extracted && resp && typeof resp === 'object') {
                    const fields = ['url', 'music_url', 'play_url', 'source_url', 'download_url', 'data', 'result'];
                    for (const field of fields) {
                        if (resp[field] && typeof resp[field] === 'string' && HTTP_REGEX.test(resp[field])) {
                            extracted = resp[field];
                            break;
                        }
                    }
                }
                
                if (extracted && HTTP_REGEX.test(extracted)) {
                    return extracted;
                }
            } catch (e) {
                lastError = e;
                console.debug(`[长青SVIP] 请求失败:`, e.message);
            }
        }
        
        throw new Error('长青SVIP: 无效URL');
    }

    // ==================== 念心SVIP ====================
    async function nianxinGetUrl(platform, songInfo, quality) {
        const template = CONFIG.NIANXIN_URL_TEMPLATES[platform];
        if (!template) throw new Error("念心SVIP不支持该平台");
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error("念心SVIP缺少songId");
        const level = qualityToNetease(quality);
        const url = template.replace("{id}", encodeURIComponent(String(songId))).replace("{level}", encodeURIComponent(level));
        
        const timeouts = [CONFIG.REQUEST_TIMEOUT, CONFIG.REQUEST_TIMEOUT * 1.5];
        let lastError;
        
        for (const timeout of timeouts) {
            try {
                const resp = await httpGet(url, {}, timeout);
                
                let extracted = null;
                
                if (typeof resp === 'string' && HTTP_REGEX.test(resp)) {
                    extracted = resp;
                }
                else if (!extracted) {
                    extracted = extractUrl(resp);
                }
                else if (!extracted) {
                    extracted = deepExtractUrl(resp, 10);
                }
                if (!extracted && resp && typeof resp === 'object') {
                    const fields = ['url', 'music_url', 'play_url', 'source_url', 'download_url', 'data', 'result'];
                    for (const field of fields) {
                        if (resp[field] && typeof resp[field] === 'string' && HTTP_REGEX.test(resp[field])) {
                            extracted = resp[field];
                            break;
                        }
                    }
                }
                
                if (extracted && HTTP_REGEX.test(extracted)) {
                    return extracted;
                }
            } catch (e) {
                lastError = e;
                console.debug(`[念心SVIP] 请求失败:`, e.message);
            }
        }
        
        throw new Error('念心SVIP: 无效URL');
    }

    // ==================== 汽水VIP ====================
    async function qishuiGetUrl(songInfo, quality) {
        const songId = getSongId('mg', songInfo);
        if (!songId) throw new Error("汽水VIP缺少歌曲ID");
        const res = await httpGetWithFallback([CONFIG.QISHUI_API_HTTPS, CONFIG.QISHUI_API_HTTP], {
            act: "song", id: songId, quality: quality
        }, 20000);
        const data = res?.data;
        if (data?.url) {
            if (data.ekey) {
                const proxyRes = await httpPost(CONFIG.QISHUI_PROXY_API, {
                    url: data.url, key: data.ekey, filename: data.filename || "KMusic", ext: data.fileExtension || "aac"
                }, 60000);
                if (Number(proxyRes?.code) === 200 && proxyRes?.url) return String(proxyRes.url);
                throw new Error("汽水VIP代理解密失败");
            }
            return String(data.url);
        }
        throw new Error('汽水VIP未返回URL');
    }

    async function qishuiSearch(keyword, page = 1, pageSize = 30) {
        if (!keyword) return { isEnd: true, list: [] };
        const res = await httpGetWithFallback([CONFIG.QISHUI_API_HTTPS, CONFIG.QISHUI_API_HTTP], {
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
        const res = await httpGetWithFallback([CONFIG.QISHUI_API_HTTPS, CONFIG.QISHUI_API_HTTP], { act: "song", id: id }, 15000);
        return { lyric: res?.data?.lyric ? String(res.data.lyric) : "" };
    }

    // ==================== 网易云官方API调用 ====================
    async function neteaseApiRequest(endpoint, data, encryptType = 'weapi', method = 'POST') {
        const url = `${CONFIG.NETEASE_API_URL}${endpoint}`;
        const cookie = CookieManager.getCookie() || CookieManager.getFixedCookie();
        
        let requestData, headers;
        
        switch (encryptType) {
            case 'eapi':
                requestData = NeteaseCrypto.eapiEncrypt(endpoint, data);
                headers = {
                    'Cookie': cookie,
                    'Referer': CONFIG.NETEASE_API_URL,
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`
                };
                break;
            case 'weapi':
                requestData = NeteaseCrypto.weapiEncrypt(data);
                headers = {
                    'Cookie': cookie,
                    'Referer': CONFIG.NETEASE_API_URL,
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`
                };
                break;
            case 'raw':
            default:
                requestData = data;
                headers = {
                    'Cookie': cookie,
                    'Referer': CONFIG.NETEASE_API_URL,
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`
                };
                break;
        }
        
        if (method === 'POST') {
            return await httpPostForm(url, requestData, CONFIG.REQUEST_TIMEOUT, headers);
        } else {
            return await httpGet(url, requestData, CONFIG.REQUEST_TIMEOUT, headers);
        }
    }

    async function neteaseGetMusicUrl(songId, quality = '320k') {
        if (!songId) throw new Error('网易云官方API: 缺少歌曲ID');
        
        const brMap = { "128k": 128000, "192k": 192000, "320k": 320000, "flac": 740000, "flac24bit": 999000, "24bit": 999000 };
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
                return validateUrl(playUrl, '网易云官方API');
            }
            
            if (res && res.data && res.data[0] && res.data[0].freeTrialInfo) {
                throw new Error('网易云官方API: 仅支持免费试听');
            }
        } catch (e) {
            console.debug(`[网易云官方] eapi 失败:`, e.message);
        }
        
        throw new Error('网易云官方API获取失败');
    }

    // ==================== 音源处理器类 ====================
    class SourceHandler {
        constructor(name, fn, priority, opts={}) {
            this.name = name; this.fn = fn; this.priority = priority;
            this.timeout = opts.timeout || CONFIG.REQUEST_TIMEOUT;
            this.supportedPlatforms = opts.supportedPlatforms || [];
            this.needUrlValidation = opts.needUrlValidation !== false;
        }
        supportsPlatform(p) { return this.supportedPlatforms.length===0 || this.supportedPlatforms.includes(p); }
    }

    // ==================== 降级链构建 ====================
    const SOURCE_HANDLERS = [
        // qorg/wyqlm 优先
        new SourceHandler('qorg', async (platform, musicInfo, quality) => {
            return qorgGetMusicUrl(platform, musicInfo, quality);
        }, 0, { supportedPlatforms: ['wy', 'wycloudmusic'] }),
        
        new SourceHandler('wyqlm', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return wyqlmGetMusicUrl(musicInfo, quality);
        }, 1, { supportedPlatforms: ['wy'] }),
        
        // fish
        new SourceHandler('fish', async (platform, musicInfo, quality) => {
            return fishGetMusicUrl(platform, musicInfo, quality);
        }, 2, { supportedPlatforms: ['kg', 'kw', 'tx'] }),
        
        // 非常刀
        new SourceHandler('CHKSZ', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return chkszGetUrl(musicInfo, quality);
        }, 3, { supportedPlatforms: ['wy'] }),
        
        // 网易云官方API
        new SourceHandler('网易云官方', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return neteaseGetMusicUrl(getSongId('wy', musicInfo), quality);
        }, 4, { supportedPlatforms: ['wy'], needUrlValidation: true }),
        
        // 星海主
        new SourceHandler('星海主', async (platform, musicInfo, quality) => {
            return xinghaiMainGetUrl(platform, musicInfo, quality);
        }, 5, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 溯音
        new SourceHandler('溯音', async (platform, musicInfo, quality) => {
            return suyinGetUrl(platform, musicInfo, quality);
        }, 6, { supportedPlatforms: ['tx', 'wy', 'kw', 'mg'] }),
        
        // 长青SVIP
        new SourceHandler('长青SVIP', async (platform, musicInfo, quality) => {
            return changqingGetUrl(platform, musicInfo, quality);
        }, 7, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 念心SVIP
        new SourceHandler('念心SVIP', async (platform, musicInfo, quality) => {
            return nianxinGetUrl(platform, musicInfo, quality);
        }, 8, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 汽水VIP
        new SourceHandler('汽水VIP', async (platform, musicInfo, quality) => {
            if (platform !== 'qsvip') throw new Error('仅限汽水VIP');
            return qishuiGetUrl(musicInfo, quality);
        }, 9, { supportedPlatforms: ['qsvip'], timeout: 25000 }),
        
        // 星海备
        new SourceHandler('星海备', async (platform, musicInfo, quality) => {
            return xinghaiBackupGetUrl(platform, musicInfo, quality);
        }, 10, { supportedPlatforms: ['wy', 'tx', 'kw'] })
    ];

    function getHandlersForPlatform(platform) {
        return SOURCE_HANDLERS.filter(h => h.supportsPlatform(platform)).sort((a,b) => a.priority - b.priority);
    }

    // ==================== 终极兜底（跨平台切换）====================
    async function ultimateFallback(platform, songInfo, quality, cacheKey) {
        const q = quality || '320k';
        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000 };
        const br = brMap[q] || 128000;
        let songId = getSongId(platform, songInfo) || songInfo.hash || songInfo.songmid || songInfo.id;

        // 搜索补全：当歌曲ID缺失时，尝试通过搜索获取
        if (!songId) {
            const keyword = songInfo.name || songInfo.title || '';
            const singer = songInfo.singer || songInfo.artist || '';
            if (keyword) {
                console.warn(`[终极兜底] ID缺失，尝试通过 api.qlm.org.cn 搜索补全: ${keyword} ${singer}`);
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
                        songId = match.id || match.songmid;
                        if (songId) console.log(`[终极兜底] 搜索补全 ID: ${songId} (${match.name} - ${match.singer})`);
                    }
                } catch (e) { 
                    console.warn('[终极兜底] 搜索补全失败:', e.message); 
                }
            }
        }

        if (!songId) {
            console.warn('[终极兜底] 缺少歌曲ID，且搜索补全未成功');
            return null;
        }

        const sourcePriority = [];
        if (platform === 'kg') sourcePriority.push('kw', 'tx', 'wy');
        else if (platform === 'kw') sourcePriority.push('tx', 'wy', 'kg');
        else if (platform === 'tx') sourcePriority.push('wy', 'kw', 'kg');
        else if (platform === 'wy') sourcePriority.push('tx', 'kw', 'kg');
        else sourcePriority.push('wy', 'tx', 'kw', 'kg');
        const allSources = [platform, ...sourcePriority.filter(s => s !== platform)];

        for (const source of allSources) {
            try {
                console.log(`[终极兜底] 尝试 api.qlm.org.cn/music/url, source=${source}`);
                const res = await httpGet(`${CONFIG.QORG_API_URL}/music/url`, {
                    type: source,
                    id: songId,
                    br: br
                }, 10000);
                const finalUrl = extractUrl(res?.data?.url || res?.url || res, '终极兜底');
                if (finalUrl) {
                    const validated = validateUrl(finalUrl, '终极兜底');
                    const reachable = await validateAudioUrl(validated, 5000);
                    if (reachable) {
                        state.urlCache.set(cacheKey, validated);
                        state.stats.success++;
                        console.log(`[终极兜底] ${source} 成功`);
                        return validated;
                    } else {
                        console.warn(`[终极兜底] URL 不可达: ${validated}`);
                    }
                }
            } catch (e) {
                console.warn(`[终极兜底] ${source} 请求失败: ${e.message}`);
            }
        }
        return null;
    }

    // ==================== 带fallback获取URL ====================
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
            return fallbackUrl || null;
        }

        const errors = [];
        for (const handler of handlers) {
            try {
                console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                let url;
                const timeout = handler.timeout || CONFIG.REQUEST_TIMEOUT;

                if (['汽水VIP', '网易云盘', '自建网易云'].includes(handler.name)) {
                    url = await withTimeout(handler.fn(musicInfo, q), timeout, handler.name + '超时');
                } else if (handler.name === 'qorg' || handler.name === 'wyqlm') {
                    url = await withTimeout(handler.fn(platform, musicInfo, q), timeout, handler.name + '超时');
                } else if (handler.requireSource) {
                    const src = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
                    url = await withTimeout(handler.fn(src, musicInfo, q), timeout, handler.name + '超时');
                } else if (handler.name === '聚合API') {
                    url = await withTimeout(handler.fn(platform, { musicInfo: musicInfo, type: q }), timeout, handler.name + '超时');
                } else {
                    const sid = getSongId(platform, musicInfo);
                    if (!sid) throw new Error(handler.name + ': 缺少歌曲ID');
                    url = await withTimeout(handler.fn(platform, sid, q, musicInfo), timeout, handler.name + '超时');
                }

                const validated = validateUrl(url, handler.name);

                if (handler.needUrlValidation) {
                    const isReachable = await validateAudioUrl(validated, 5000);
                    if (!isReachable) throw new Error(`${handler.name}: URL不可达`);
                }

                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                console.log(`[聚合音源] ${handler.name} 成功`);
                return validated;
            } catch (e) {
                errors.push(`${handler.name}: ${e.message}`);
                console.warn(`[聚合音源] ${handler.name} 失败: ${e.message}`);
            }
        }

        console.warn(`[聚合音源] 所有常规音源失败，开始终极兜底 (平台:${platform})`);
        const fallbackUrl = await ultimateFallback(platform, musicInfo, q, cacheKey);
        if (fallbackUrl) return fallbackUrl;

        state.stats.fail++;
        console.error(`[聚合音源] 请求失败: ${errors.join('; ')}`);
        state.urlCache.set(cacheKey, '');
        return null;
    }

    // ==================== 平台配置 ====================
    const sourceConfig = {
        tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        qorg: { name: 'qorg', type: 'music', actions: ['musicUrl', 'search'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        wyqlm: { name: 'wyqlm', type: 'music', actions: ['musicUrl'], qualitys: ['128k','192k','320k','flac','flac24bit'] },
        qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl', 'search', 'lyric'], qualitys: ['128k','320k','flac','flac24bit'] }
    };

    // ==================== 事件监听 ====================
    function setupEventListener() {
        const handler = async ({ action, source, info }) => {
            try {
                if (action === 'musicUrl') {
                    if (!info?.musicInfo) throw new Error('缺少歌曲信息');
                    const url = await getUrlWithFallback(source, info.musicInfo, info.type || '320k');
                    
                    // 预加载下一首歌
                    if (CONFIG.PRELOAD_ENABLED && info.nextMusicInfo) {
                        PreloadManager.addToQueue(info.nextMusicInfo, info.type || CONFIG.PRELOAD_QUALITY);
                    }
                    
                    if (url === '') {
                        return { url: '' };
                    }
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
                        case 'qsvip':
                            result = await qishuiSearch(keyword, page, limit);
                            break;
                        case 'wy':
                            result = await chkszSearch(keyword, limit);
                            break;
                        case 'qorg':
                        default:
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
                            break;
                    }

                    state.searchCache.set(cacheKey, result);
                    return result;
                }

                if (action === 'lyric') {
                    if (source === 'qsvip') {
                        return qishuiGetLyric(info?.musicInfo || {});
                    }
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
                        if (info?.fixed) {
                            return CookieManager.setFixedCookie(info.value);
                        } else {
                            return CookieManager.setCookie(info.value);
                        }
                    } else if (info?.type === 'get') {
                        if (info?.fixed) {
                            return { cookie: CookieManager.getFixedCookie() };
                        } else {
                            return { cookie: CookieManager.getCookie() };
                        }
                    } else if (info?.type === 'clear') {
                        return CookieManager.clearCookie();
                    }
                    throw new Error('不支持的Cookie操作');
                }

                throw new Error('不支持的操作: ' + action);
            } catch(e) {
                console.error('[聚合音源] 请求失败:', e.message);
                throw e;
            }
        };
        try { on(EVENT_NAMES.request, handler); } catch(e) { try { on('request', handler); } catch(e2) {} }
    }

    // ==================== 初始化 ====================
    function sendAnnouncement() {
        if (state.announcementSent) return;
        state.announcementSent = true;
        try { send && send(EVENT_NAMES.updateAlert, { log: ANNOUNCEMENT.content }); } catch(e) {}
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        console.log('[聚合音源] ' + ANNOUNCEMENT.title + ' 初始化');
        console.log(ANNOUNCEMENT.content);
        setupEventListener();
        sendAnnouncement();
        try { send && send(EVENT_NAMES.inited, { openDevTools: false, sources: sourceConfig, status: { version: ANNOUNCEMENT.version } }); } catch(e) {}
    }

    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));

})();