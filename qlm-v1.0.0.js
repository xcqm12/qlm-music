/**
 * @name 七零喵聚合音源 · 重构完整版
 * @description 基于v7.0.7架构重构，整合v9.0.9全部音源，保留所有音源架构
 * @version 1.0.0 - 重构版
 * @author 七零喵团队
 * @homepage https://github.com/xcqm12/qlm-music
 * @features 预加载 | 网易云cookie管理 | eapi/weapi/raw加密接口 | 试听检测 | 完整歌曲降级 | 试听音源兜底
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
        title: "七零喵聚合音源 · 重构完整版 v1.0.0",
        content: "🔗 GitHub: https://github.com/xcqm12/qlm-music\n" +
                 "⚡ 整合音源: GD音乐台 / 非常刀 / 肥猫 / 小熊猫 / 梓澄公益 / 無名 / 六音 / 星海主 / 长青SVIP / 念心SVIP / 溯音 / ikun / 野草 / fish / qorg / wyqlm / 网易云官方 / 星海备 / 汽水VIP\n" +
                 "🎯 基于v7.0.7架构重构，保留v9.0.9全部音源\n" +
                 "✅ URL验证 + 解灰支持 + 音质降级\n" +
                 "🔐 eapi/weapi/raw 加密接口支持\n" +
                 "🍪 网易云Cookie管理（推荐设置VIP Cookie获取完整时长）\n" +
                 "🔄 优先级调整：不易试听音源优先\n" +
                 "🏃 终极兜底 api.qlm.org.cn\n" +
                 "⚠️ 注意：如果所有音源都失败，可能会使用试听音源进行播放\n" +
                 "© 2026 七零喵团队",
        version: "1.0.0",
        repo: "https://github.com/xcqm12/qlm-music",
        qqGroup: "1006981142"
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
                const headers = {
                    'User-Agent': `lx-music-${version}`
                };
                if (options) {
                    fetchOptions.method = (options.method || 'GET').toUpperCase();
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
                    if (options.headers) {
                        Object.assign(headers, options.headers);
                    }
                }
                fetchOptions.headers = headers;
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
                    .catch(err => { clearTimeout(timer); callback(new Error('Network request failed')); });
            };
        } else { 
            console.error('[聚合音源] request API 不可用'); 
            return void console.error('[聚合音源] 无法初始化，缺少必要的网络请求API');
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
        
        // 长青 API
        CHANGQING_API_URL: "http://175.27.166.236",
        
        // 念心 API
        NIANXIN_API_URL: "https://music.nxinxz.com",
        
        // 溯音 API
        SUYIN_API_URL: "https://oiapi.net",
        
        // 梓澄公益 API
        ZICHENG_API_URL: "http://43.248.185.248:9763",
        ZICHENG_API_KEY: "lxmusicisyyds",
        
        // 梓澄qwq API
        ZICHENGQWQ_API_URL: "http://103.40.13.21:9866",
        ZICHENGQWQ_API_KEY: "hires",
        
        // 梓澄公益2代 API
        ZICHENG2_API_URL: "http://103.239.247.51:9763",
        ZICHENG2_API_KEY: "114514",
        
        // 肥猫不肥 API
        FEIMAOBUFEI_API_URL: "http://music.xn--z7x900a.live",
        FEIMAOBUFEI_API_KEY: "114514",
        
        // 聚合API
        JUHE_API_URL: "https://api.music.lerd.dpdns.org",
        
        // 無名 API
        WUMING_API_URL: "https://api.lxmusic.top/v1",
        
        // 六音 API
        LIUYIN_API_URL: "http://music.sixyin.com/api",
        
        // 肥猫 API
        FEIMAO_API_URL: "http://fatcat.dns.army",
        FEIMAO_API_KEY: "114514",
        
        // 小熊猫 API
        XIAOXIONGMAO_API_URL: "http://music.xn--z7x900a.live",
        XIAOXIONGMAO_API_KEY: "114514",
        
        // 网易云官方API
        NETEASE_API_URL: "https://interface.music.163.com",
        NETEASE_EAPI_URL: "https://interface3.music.163.com/eapi",
        
        // 汽水 VIP API
        QISHUI_API_URL: "https://api.vsaa.cn/api/music.qishui.vip",
        
        // GD音乐台 API
        GD_API_URL: "https://api.gzyyds.xyz",
        
        // 缓存配置
        CACHE_TTL_URL: 1800000,
        CACHE_TTL_SEARCH: 300000,
        CACHE_MAX_SIZE: 300,
        
        // 请求配置
        REQUEST_TIMEOUT: 12000,
        DECRYPT_TIMEOUT: 18000,
        CONCURRENT_LIMIT: 5,
        MAX_RETRIES: 3,
        RETRY_DELAY: 800,
        URL_VALIDATION_TIMEOUT: 5000,
        STATS_CLEANUP_INTERVAL: 300000,
        
        // 试听检测配置
        TRIAL_CHECK_ENABLED: true,
        TRIAL_SIZE_THRESHOLD: 500000,
        
        // 预加载配置
        PRELOAD_ENABLED: true,
        PRELOAD_QUEUE_SIZE: 10,
        PRELOAD_QUALITY: '320k',
        
        // 网易云Cookie
        NETEASE_CLOUD_COOKIE_KEY: '_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=53b32208d3ff4825ff51d9f5ce806c98; NMTID=00OOaxZpza_Cxj1Y0CWrpkk8PxmwgQAAAGb61xCIA; __snaker__id=XONHI2Gv80iNHZ7Z; WM_TID=oMlXAq8tKP9BAAUAUQaH2qjeM7QpK88Y; _iuqxldmzr_=32; ntes_kaola_ad=1; NTES_P_UTID=SL9imFoa8rYLTnjVYulzxKhb8y7KdyaJ|1771482585; P_INFO=m18651415610@163.com|1771482585|1|phoenix_client|00&99|jis&1771231192&ntesgod_app#jis&320600#10#0#0|186610&1|godlike_app&ntesgod_app|18651415610@163.com; timing_user_id=time_DH7EWvPb5c; __csrf=ace47455bd906e2ad7fe4cc7d8037df7; ntes_utid=tid._.jwb%252F%252BPn0SKZFVwFAVFfG27jbMrEr96km._.0.%2C.edd._.._.0; WM_NI=wmTqWxKPadpv2R1Sl%2FL71iPeMqaPPSgsHfRDh5gFoFhw%2BdtTQNwudVJTuUy3dzKramThieOCi2AEAVSXSFGJfZMZoEgm1BM6IGeBVCDCyguAITGs%2BucZMoLOfHCVGQLHRzc%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eed3ea59a5bb8f9ad03fbbb88fa7d45a839a8f86cb40adb99cb8c94089e9a891d02af0fea7c3b92ab5b39c92d6748990af85f37ef28effb4ef2590e9ff8ad36f8fafafb1d359a5ad8887d150aceba9a7ee4eaca9e585f7609392b996e75e8a8cbbb6fc39a8a68593e46798b8a786ce49abee8fa6c45e91889da7c642a68683bbee4fa5b3ffa3d03e8b99aba3d549889db788f84b8b8c8994aa7fa1868390cf45a6988db7c65b90989e9be237e2a3; sDeviceId=YD-3OtYltVMdiJBBlRQUALW00QfWedU6OPa; gdxidpyhxdE=S6ckMD1I59fzIq2mcYwO%2B4VZ%2B8U8PfUma2GxE8SxygCCDvmuyloO98TxhOuSUb2pZaBvafz1Av2C2iRBANnAyd%2F8YarYixKetVlVcQYXPRZK6eRnQTeIH%2FbPE%2Ff6CL8In%5Cjcs0AuQ0SZBYKBqX3Q8SRbYJWfZi5VSQmeB1rf%2BYxCRSOf%3A1776554702285; __csrf=ac6803ad8d0db7317192d383647bcaaa; MUSIC_U=00B796682748D09558E2ABEB6FBD4AA522F7DCF616DEE627874471536C93E70252168B237C84F13A5319DBCF0CCB01A10B8DA408D0CFDAD390DD530BAD2FDBC1E601B69C9A54B37FD1D9920201ECA320EBE4B5AD3586E4F97376D20309CC70653C182CA345A63256963297B872FE906EBFD1E5D374703CB7609C68E0882336534F86F8B52AB9311F0551B610A45B1138B3E284CB2B78A98E86AD070D5274BD3532EC94A671542B90E998DF3CF9B697A8AC9D4F225091CC6F6B591A1C3B5C96E41BE342216FC1F772AFBEA054FA75BFFB7D35681097CEAADB42606BED6476E4FC6374A9393DBC2F4BFA58B108851F6131BE1A18161CB41879B698063E1980326FEF55695077247856B0FEAA11C89A24E91D66E4BB40EF1924BE95EB2B3437951819236090CECEE6C07653775FBFFAD948ED1D3B452AF78AC5B759F84C214ACA9303268733F678B3262D20ECA60DA7B197C157FB837595C4A29BB6A048CCA90AE7A5DC431FEF70186C422B1385632BE8A1BB12A753771AE8F068F48745E7B24539C633646D511F06EA6D6F21E16CE76618930AB33E531C52FC599DF627F5FDD2ACCE; JSESSIONID-WYYY=hKJT%5CNZV%2BBqCQ3nfwDj0H7d0xTvhBI84rEp%2BF76gEaoVM%5CjzGGQEtBjk%2FyiwpwEVXlavVp9DBYfB49iUN77UZthvo9noD%5CAGwzx8HZDkIryRQZpzCPsgzCm4wZbZKExXxBNJxzTssaUTFtDBCHZT7juCauylsAhNBaJgrnzY5agj%2FOlU%3A1776556842084',
        NETEASE_CLOUD_TOKEN_EXPIRE: 86400000
    });

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
    
    const QUALITY_LEVELS = ['24bit', 'flac', '320k', '192k', '128k'];
    const PLATFORMS = ['tx', 'wy', 'kw', 'kg', 'mg', 'sixyin', 'local', 'qorg', 'wycloud', 'wycloudmusic'];
    
    const HTTP_REGEX = /^https?:\/\//i;
    const AUDIO_CONTENT_TYPES = ['audio/', 'application/octet-stream', 'binary/octet-stream'];
    
    const QUALITY_TO_BR = Object.freeze({ 
        "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999",
        "hires": "999", "Hi-Res": "999", "jyeffect": "999", "sky": "999", "dolby": "999", "jymaster": "999"
    });
    const QUALITY_TO_LEVEL = Object.freeze({ 
        "128k": "standard", "192k": "higher", "320k": "exhigh", "flac": "lossless", "flac24bit": "jymaster", "24bit": "jymaster",
        "hires": "jymaster", "Hi-Res": "jymaster", "jyeffect": "jymaster", "sky": "jymaster", "dolby": "jymaster", "jymaster": "jymaster"
    });

    // ==================== 安全工具函数 ====================
    const SafeUtils = Object.freeze({
        isFunction(fn) {
            return typeof fn === 'function';
        },
        
        safeGet(obj, path, defaultValue) {
            if (obj == null) return defaultValue;
            const keys = Array.isArray(path) ? path : path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') return defaultValue;
                result = result[key];
            }
            return result !== undefined && result !== null ? result : defaultValue;
        },
        
        safeIncludes(arr, value) {
            if (!Array.isArray(arr)) return false;
            return arr.includes(value);
        },
        
        safeArray(value) {
            return Array.isArray(value) ? value : [];
        },
        
        safeStringIncludes(str, search) {
            if (typeof str !== 'string') return false;
            if (typeof search !== 'string') return false;
            return str.includes(search);
        },
        
        safeStartsWith(str, search) {
            if (typeof str !== 'string') return false;
            if (typeof search !== 'string') return false;
            return str.startsWith(search);
        },
        
        normalizeKeyword(keyword) {
            if (!keyword) return "";
            return String(keyword).replace(/\(\s*Live\s*\)/gi, "").replace(/[\(\（][^)\）]*[\)\）]/g, "")
                .replace(/【[^】]*】/g, "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, "")
                .replace(/[^\w\u4e00-\u9fa5]/g, "").trim().toLowerCase();
        },
        
        buildCacheKey(prefix, songInfo, quality) {
            const info = songInfo || {};
            const name = info.name || info.title || '';
            const singer = info.singer || info.artist || '';
            const album = info.albumName || info.album || '';
            const id = info.hash || info.songmid || info.id || '';
            return `${prefix || 'default'}_${id}_${name}_${singer}_${album}_${quality || ''}`;
        }
    });

    // ==================== 状态管理 ====================
    const state = {
        urlCache: new Map(),
        searchCache: new Map(),
        activeRequests: new Map(),
        initialized: false,
        announcementSent: false,
        neteaseCookie: '',
        cleanupTimer: null,
        stats: {
            hits: 0,
            misses: 0,
            success: 0,
            fail: 0,
            requests: 0
        }
    };

    // ==================== 平台配置 ====================
    const platformQualityMap = {
        tx: ['24bit', 'flac', '320k', '192k', '128k'],
        wy: ['24bit', 'flac', '320k', '192k', '128k'],
        kw: ['24bit', 'flac', '320k', '192k', '128k'],
        kg: ['24bit', 'flac', '320k', '192k', '128k'],
        mg: ['24bit', 'flac', '320k', '192k', '128k'],
        qishui: ['128k', '320k', 'flac', 'flac24bit'],
        qorg: ['128k', '320k', 'flac', 'flac24bit'],
        wycloud: ['128k', '320k', 'flac', 'flac24bit'],
        wycloudmusic: ['128k', '192k', '320k', 'flac']
    };

    const platformNames = {
        tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐',
        kg: '酷狗音乐', mg: '咪咕音乐', qishui: '汽水VIP',
        qorg: 'qorg音源', wycloud: '网易云盘', wycloudmusic: '自建网易云'
    };

    const sourceConfig = {};
    Object.keys(platformQualityMap).forEach(platform => {
        const actions = ['musicUrl'];
        if (platform === 'qishui') {
            actions.push('musicSearch', 'lyric');
        }
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
    });

    // ==================== HTTP 工具函数 ====================
    function httpFetch(url, options) {
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('Invalid URL'));
        }
        return new Promise((resolve, reject) => {
            if (typeof request !== 'function') {
                return reject(new Error('request API 不可用'));
            }
            const timeout = options.timeout || CONFIG.REQUEST_TIMEOUT;
            const timer = safeSetTimeout(() => {
                reject(new Error(`请求超时: ${url.substring(0, 50)}...`));
            }, timeout);
            
            request(url, options, (err, resp) => {
                safeClearTimeout(timer);
                if (err) {
                    reject(new Error(`请求错误: ${err.message || err}`));
                    return;
                }
                resolve(resp || {});
            });
        });
    }
    
    function httpGet(url, params, timeout = CONFIG.REQUEST_TIMEOUT) {
        return new Promise((resolve, reject) => {
            if (typeof request !== 'function') {
                return reject(new Error('request API 不可用'));
            }
            const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
            request(url + queryString, { timeout }, (err, resp) => {
                if (err) return reject(err);
                if (!resp || resp.statusCode !== 200) return reject(new Error(`HTTP ${resp?.statusCode || 'No Response'}`));
                try {
                    const data = JSON.parse(resp.body);
                    resolve(data);
                } catch (e) {
                    resolve(resp.body);
                }
            });
        });
    }
    
    function httpPost(url, data, timeout = CONFIG.REQUEST_TIMEOUT) {
        return new Promise((resolve, reject) => {
            if (typeof request !== 'function') {
                return reject(new Error('request API 不可用'));
            }
            request(url, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, timeout }, (err, resp) => {
                if (err) return reject(err);
                if (!resp || resp.statusCode !== 200) return reject(new Error(`HTTP ${resp?.statusCode || 'No Response'}`));
                try {
                    const data = JSON.parse(resp.body);
                    resolve(data);
                } catch (e) {
                    resolve(resp.body);
                }
            });
        });
    }
    
    function httpGetWithFallback(urls, params, timeout) {
        return new Promise(async (resolve, reject) => {
            for (const url of urls) {
                try {
                    const result = await httpGet(url, params, timeout);
                    return resolve(result);
                } catch (e) {
                    continue;
                }
            }
            reject(new Error('所有URL都失败'));
        });
    }

    // ==================== 辅助函数 ====================
    function getSongId(platform, info) {
        if (!info) return null;
        
        // 尝试从多个可能的字段中获取ID
        const possibleIds = [
            info.id,
            info.songid,
            info.songmid,
            info.strMediaMid,
            info.hash,
            info.audio_id,
            info.cid,
            info.vid,
            info.musicId,
            info.trackId,
            info.songId,
            info.track_id,
            info.music_id,
            info.song_id,
            info.mediaId,
            info.media_id,
            info.songIdStr,
            info.idStr,
            (info.meta && info.meta.id),
            (info.meta && info.meta.songid),
            (info.meta && info.meta.songmid),
            (info.meta && info.meta.cid),
            (info.data && info.data.id),
            (info.data && info.data.songid),
            (info.data && info.data.songmid)
        ];
        
        // 根据平台优先返回特定格式的ID
        switch (platform) {
            case 'tx': 
                return info.songmid || info.strMediaMid || info.id || 
                       info.vid || findValidId(possibleIds);
            case 'wy': 
                return info.id || info.songid || info.songmid || 
                       findValidId(possibleIds);
            case 'kw': 
                return info.hash || info.audio_id || info.id || 
                       findValidId(possibleIds);
            case 'kg': 
                return info.hash || info.audio_id || info.id || 
                       info.songid || findValidId(possibleIds);
            case 'mg': 
                return info.songmid || info.id || info.cid || 
                       (info.meta && (info.meta.songmid || info.meta.id || info.meta.cid)) ||
                       findValidId(possibleIds);
            default: 
                return findValidId(possibleIds);
        }
    }
    
    function findValidId(ids) {
        for (const id of ids) {
            if (id !== null && id !== undefined && id !== '') {
                return String(id);
            }
        }
        return null;
    }
    
    function validateUrl(url, sourceName) {
        if (!url || typeof url !== 'string') throw new Error(`${sourceName || '源'}返回空URL`);
        const trimmed = url.trim();
        if (!HTTP_REGEX.test(trimmed)) throw new Error(`${sourceName || '源'}返回非法URL格式`);
        return trimmed;
    }
    
    function withTimeout(promise, ms, name = 'Operation') {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${name}超时`)), ms);
            promise.then(resolve, reject).finally(() => clearTimeout(timer));
        });
    }
    
    async function validateUrlWithHead(url) {
        if (!url || !HTTP_REGEX.test(url)) return false;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), CONFIG.URL_VALIDATION_TIMEOUT);
            const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timer);
            if (!resp.ok) return false;
            const contentType = resp.headers.get('Content-Type') || '';
            return AUDIO_CONTENT_TYPES.some(ct => contentType.includes(ct.split('/')[0]));
        } catch (e) {
            return false;
        }
    }
    
    function isTrialUrl(url) {
        if (!url) return false;
        const trialPatterns = [
            /\/trial\//i, /\/audition\//i, /\/preview\//i,
            /\/listen\//i, /\/sample\//i, /\/demo\//i,
            /m4a\?|\.m4a$/i, /mp3\?|\.mp3\?/i
        ];
        return trialPatterns.some(pattern => pattern.test(url));
    }

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
                    method: 'HEAD',
                    timeout: timeout,
                    headers: { 'User-Agent': `lx-music-${env}/${version}` },
                    follow_max: 2
                }),
                timeout,
                '试听检测超时'
            );
            const contentLength = resp.headers && (resp.headers['content-length'] || resp.headers['Content-Length']);
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                if (!isNaN(size) && size < 1024 * 1024) {
                    console.warn(`[试听检测] 文件过小 (${size} bytes)，判定为试听片段: ${url}`);
                    return true;
                }
            }
            const contentType = resp.headers && (resp.headers['content-type'] || resp.headers['Content-Type']);
            if (contentType && !/audio|mpeg|octet-stream|mp3|m4a|flac|wav|ogg/i.test(contentType)) {
                console.warn(`[试听检测] Content-Type 异常 (${contentType})，判定为无效: ${url}`);
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

    // ==================== 音源获取函数 ====================
    
    // GD音乐台
    async function gdGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('GD音乐台: 缺少歌曲ID');
        
        const br = QUALITY_TO_BR[quality] || '320';
        const url = `${CONFIG.GD_API_URL}/song/url?platform=${platform}&id=${songId}&br=${br}`;
        const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('GD音乐台获取失败');
    }
    
    // 非常刀
    async function chkszGetUrl(songInfo, quality) {
        const songId = getSongId('wy', songInfo);
        if (!songId) throw new Error('非常刀: 缺少歌曲ID');
        
        const res = await httpGet(`${CONFIG.CHKSZ_API}/music/url`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('非常刀获取失败');
    }
    
    // 肥猫
    async function feimaoGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('肥猫: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        
        const res = await httpGet(`${CONFIG.FEIMAO_API_URL}/music/${source}`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('肥猫获取失败');
    }
    
    // 小熊猫
    async function xiaoxiongmaoGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('小熊猫: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        
        const res = await httpGet(`${CONFIG.XIAOXIONGMAO_API_URL}/music/${source}`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('小熊猫获取失败');
    }
    
    // 梓澄公益
    async function zichanGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('梓澄公益: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        
        const res = await httpPost(`${CONFIG.ZICHENG_API_URL}/api/music/url`, {
            source: source,
            id: songId,
            quality: quality || '320k',
            key: CONFIG.ZICHENG_API_KEY
        }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('梓澄公益获取失败');
    }
    
    // 無名
    async function wumingGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('無名: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        
        const res = await httpGet(`${CONFIG.WUMING_API_URL}/${source}/url`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('無名获取失败');
    }
    
    // 六音
    async function liuyinGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('六音: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: '163', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || '163';
        
        const res = await httpGet(`${CONFIG.LIUYIN_API_URL}/${source}`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('六音获取失败');
    }
    
    // 星海主
    async function xinghaiMainGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('星海主: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        const br = QUALITY_TO_BR[quality] || '320';
        
        const params = { ...CONFIG.XINGHAI_MAIN_PARAMS, types: 'url', id: songId, source: source, br: br };
        const res = await httpGet(CONFIG.XINGHAI_MAIN_URL, params, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('星海主获取失败');
    }
    
    // 星海备
    async function xinghaiBackupGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('星海备: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' };
        const source = sourceMap[platform] || 'netease';
        
        const res = await httpGet(`${CONFIG.XINGHAI_BACKUP_URL}${source}/url`, { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('星海备获取失败');
    }
    
    // 长青SVIP
    async function changqingGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('长青SVIP: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tx', wy: 'wy', kw: 'kw', kg: 'kg', mg: 'mg' };
        const source = sourceMap[platform] || 'wy';
        const br = QUALITY_TO_BR[quality] || '320';
        
        const res = await httpGet(`${CONFIG.CHANGQING_API_URL}/${source}/${source}.php`, { type: 'mp3', id: songId, level: br }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.url) {
            return res.url;
        }
        throw new Error('长青SVIP获取失败');
    }
    
    // 念心SVIP
    async function nianxinGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('念心SVIP: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tx', wy: 'wy', kw: 'kw', kg: 'kg', mg: 'mg' };
        const source = sourceMap[platform] || 'wy';
        const br = QUALITY_TO_BR[quality] || '320';
        
        const res = await httpGet(`${CONFIG.NIANXIN_API_URL}/${source}.php`, { id: songId, level: br, type: 'mp3' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.url) {
            return res.url;
        }
        throw new Error('念心SVIP获取失败');
    }
    
    // 溯音
    async function suyinGetUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('溯音: 缺少歌曲ID');
        
        const sourceMap = { tx: 'qq', wy: 'wy', kw: 'kw', mg: 'mg' };
        const source = sourceMap[platform];
        if (!source) throw new Error('溯音不支持该平台');
        
        const apiMap = { qq: 'QQ_Music', wy: 'Music_163', kw: 'Kuwo', mg: 'migu' };
        const res = await httpGet(`${CONFIG.SUYIN_API_URL}/Music/${apiMap[source]}`, 
            { id: songId, quality: quality || '320k' }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('溯音获取失败');
    }
    
    // ikun
    async function ikunGetMusicUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('ikun: 缺少歌曲ID');
        
        const sourceMap = { tx: 'tx', wy: 'wy', kw: 'kw', kg: 'kg', mg: 'mg' };
        const source = sourceMap[platform] || 'wy';
        const br = QUALITY_TO_BR[quality] || '320';
        
        try {
            const res = await httpGet(`${CONFIG.IKUN_API_URL}/url`, { source: source, id: songId, br: br }, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data && res.data.url) {
                return res.data.url;
            }
        } catch (e) {}
        
        // 备用
        const hkRes = await httpGet(`${CONFIG.IKUN_HK_API_URL}/url`, { source: source, id: songId, br: br }, CONFIG.REQUEST_TIMEOUT);
        if (hkRes && hkRes.code === 200 && hkRes.data && hkRes.data.url) {
            return hkRes.data.url;
        }
        throw new Error('ikun获取失败');
    }
    
    // 野草
    async function yecaoGetMusicUrl(songInfo, quality) {
        const songId = songInfo.hash || songInfo.audio_id;
        if (!songId) throw new Error('野草: 缺少歌曲ID');
        
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet('http://97.64.37.235/grass/v1', { id: songId, quality: br }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('野草获取失败');
    }
    
    // fish
    async function fishGetMusicUrl(platform, songInfo, quality) {
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('fish: 缺少歌曲ID');
        
        const sourceMap = { kg: 'kugou', kw: 'kuwo', tx: 'qq' };
        const source = sourceMap[platform];
        if (!source) throw new Error('fish不支持该平台');
        
        const br = QUALITY_TO_BR[quality] || '320';
        const res = await httpGet(`${CONFIG.FISH_API_URL}/${source}/url`, { id: songId, br: br }, CONFIG.REQUEST_TIMEOUT);
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('fish获取失败');
    }
    
    // ==================== qorg 获取播放地址（修复试听检测） ====================
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
                console.warn(`[qorg] ID缺失，尝试通过 api.qlm.org.cn 搜索补全: ${keyword} ${singer}`);
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
        if (!sid || sid === 'undefined' || sid === 'null') {
            throw new Error('qorg: 无效的歌曲ID');
        }

        const brMap = { '128k': 128000, '192k': 192000, '320k': 320000, 'flac': 999000, 'flac24bit': 999000, 'hires': 999000, 'Hi-Res': 999000, 'jymaster': 999000, 'jyeffect': 999000, 'sky': 999000, 'dolby': 999000 };
        const br = brMap[quality] || 320000;
        const levelMap = { '128k': 'standard', '192k': 'higher', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'lossless', 'hires': 'hires', 'Hi-Res': 'Hi-Res', 'jyeffect': 'jyeffect', 'sky': 'sky', 'dolby': 'dolby', 'jymaster': 'jymaster' };
        const level = levelMap[quality] || 'exhigh';

        // 尝试不加密接口 /song/url
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

        // 尝试 weapi
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

        // 尝试 eapi
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
            if (!resData?.data || !resData.data[0]) {
                throw new Error('eapi返回数据格式异常');
            }
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

        // 尝试 v1 接口
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${sid}&level=${level}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let v1Url = null;
            if (res?.code === 200) {
                if (res.data?.url) {
                    v1Url = res.data.url;
                } else if (Array.isArray(res.data) && res.data[0]?.url) {
                    v1Url = res.data[0].url;
                }
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

        // 尝试 302 跳转接口
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
            console.warn('[qorg] /song/url/v1/302 失败:', e.message, '→ 尝试 /song/url/v1 (lossless多ID)');
        }

        // 尝试 lossless 接口
        try {
            const url = `${CONFIG.QORG_API_URL}/song/url/v1?id=${sid}&level=lossless`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            let losslessUrl = null;
            if (res?.code === 200) {
                if (res.data?.url) {
                    losslessUrl = res.data.url;
                } else if (Array.isArray(res.data) && res.data[0]?.url) {
                    losslessUrl = res.data[0].url;
                }
            }
            if (losslessUrl) {
                const trial = await isTrialSong(res.data, losslessUrl);
                if (!trial) return validateUrl(losslessUrl, 'qorg (lossless)');
                else throw new Error('试听歌曲（lossless）');
            }
            throw new Error(res?.msg || res?.message || '无数据');
        } catch (e) {
            console.warn('[qorg] lossless 失败:', e.message, '→ 尝试 /music/url');
        }

        // 尝试旧接口 /music/url
        try {
            const res = await httpPost(`${CONFIG.QORG_API_URL}/music/url`, {
                platform: 'netease',
                id: sid,
                quality: quality || '320k'
            }, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data && res.data.url) {
                const trial = await isTrialSong(res.data, res.data.url);
                if (!trial) return validateUrl(res.data.url, 'qorg (music/url)');
                else throw new Error('试听歌曲（music/url）');
            }
            throw new Error('music/url 无数据');
        } catch (e) {
            console.warn('[qorg] /music/url 失败:', e.message);
        }

        throw new Error('qorg: 所有接口均失败');
    }
    
    // ==================== qorg 搜索函数 ====================
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        const res = await httpGet(CONFIG.QORG_API_URL + '/search', { keywords: keyword, limit: pageSize }, 15000);
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (res && res.data) list = Array.isArray(res.data) ? res.data : (res.data.list || res.data.songs || []);
        const total = res?.data?.total || list.length;
        if (list.length > 0) {
            return {
                isEnd: list.length < pageSize,
                list: list.map((item, index) => ({
                    id: String(item.id || ''), songmid: item.id, name: item.name || item.title || '未知歌曲',
                    singer: item.singer || item.artist || '', albumName: item.album || item.albumname || '',
                    duration: item.duration ? Math.floor(parseInt(item.duration) * 1000) : null,
                    pic: item.pic || item.cover || '', _source: 'qorg'
                })),
                total, page, limit: pageSize
            };
        }
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }
    
    // wyqlm
    async function wyqlmGetMusicUrl(songInfo, quality) {
        const songId = getSongId('wy', songInfo);
        if (!songId) throw new Error('wyqlm: 缺少歌曲ID');
        
        const res = await httpPost(`${CONFIG.QORG_API_URL}/wyqlm/url`, {
            id: songId,
            quality: quality || '320k'
        }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('wyqlm获取失败');
    }
    
    // 网易云官方API
    async function neteaseGetMusicUrl(songId, quality = '320k') {
        if (!songId) throw new Error('网易云官方: 缺少歌曲ID');
        
        const cookie = state.neteaseCookie || CONFIG.NETEASE_CLOUD_COOKIE_KEY;
        const br = QUALITY_TO_BR[quality] || '320';
        
        const res = await httpPost(`${CONFIG.QORG_API_URL}/netease/url`, {
            id: songId,
            quality: br,
            cookie: cookie
        }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('网易云官方获取失败');
    }
    
    // 汽水VIP
    async function qishuiGetUrl(songInfo, quality) {
        const songId = songInfo.id || songInfo.songmid || songInfo.hash;
        if (!songId) throw new Error('汽水VIP: 缺少歌曲ID');
        
        const res = await httpGet(CONFIG.QISHUI_API_URL, { act: 'song', id: String(songId) }, 20000);
        if (res && res.data && res.data.url) {
            return res.data.url;
        }
        throw new Error('汽水VIP获取失败');
    }
    
    // 汽水VIP搜索
    async function qishuiSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0 };
        
        const cacheKey = `qishui_search_${keyword}_${page}`;
        if (state.searchCache.has(cacheKey)) {
            state.stats.hits++;
            return state.searchCache.get(cacheKey);
        }
        state.stats.misses++;
        
        const res = await httpGet(CONFIG.QISHUI_API_URL, 
            { act: 'search', keywords: keyword, page, pagesize: pageSize, type: 'music' }, 
            15000
        );
        
        const lists = Array.isArray(res?.data?.lists) ? res.data.lists : [];
        const list = lists.map(item => ({
            id: String(item.id || item.vid || ''),
            songmid: String(item.id || item.vid || ''),
            name: item.name || '未知歌曲',
            singer: item.artists || '未知歌手',
            albumName: item.album || '',
            duration: item.duration ? Math.floor(Number(item.duration) / 1000) : 0,
            pic: item.cover || item.pic || '',
            _source: 'qishui'
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
    }
    
    // ==================== 肥猫不肥音源处理器 ====================
    async function feimaobufeiGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const res = await httpGet(`${CONFIG.FEIMAOBUFEI_API_URL}/url/${source}/${songId}/${quality}`);
        if (!res || isNaN(Number(res.code))) throw new Error('未知错误');
        switch (res.code) {
            case 0: return res.data;
            case 1: throw new Error('IP被封禁');
            case 2: throw new Error('获取音乐URL失败');
            case 4: throw new Error('远程服务器错误');
            case 5: throw new Error('请求过于频繁');
            case 6: throw new Error('请求参数错误');
            default: throw new Error(res.msg ?? '未知错误');
        }
    }
    
    // ==================== 梓澄qwq音源处理器 ====================
    async function zichengqwqGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const res = await httpGet(`${CONFIG.ZICHENGQWQ_API_URL}/url/${source}/${songId}/${quality}`);
        if (!res || isNaN(Number(res.code))) throw new Error('未知错误');
        switch (res.code) {
            case 0: return res.data;
            case 1: throw new Error('IP被封禁');
            case 2: throw new Error('获取音乐URL失败');
            case 4: throw new Error('远程服务器错误');
            case 5: throw new Error('请求过于频繁');
            case 6: throw new Error('请求参数错误');
            default: throw new Error(res.msg ?? '未知错误');
        }
    }
    
    // ==================== 梓澄公益2代音源处理器 ====================
    async function zicheng2GetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const res = await httpGet(`${CONFIG.ZICHENG2_API_URL}/url/${source}/${songId}/${quality}`);
        if (!res || isNaN(Number(res.code))) throw new Error('未知错误');
        switch (res.code) {
            case 0: return res.data;
            case 1: throw new Error('IP被封禁');
            case 2: throw new Error('获取音乐URL失败');
            case 4: throw new Error('远程服务器错误');
            case 5: throw new Error('请求过于频繁');
            case 6: throw new Error('请求参数错误');
            default: throw new Error(res.msg ?? '未知错误');
        }
    }
    
    // ==================== 聚合API (juhe) 处理器 ====================
    async function juheGetMusicUrl(source, musicInfo) {
        const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        if (!songId) throw new Error('juhe缺少歌曲ID');
        const res = await httpGet(CONFIG.JUHE_API_URL + '/api/url', { id: songId, source });
        if (!res) throw new Error('juhe返回空响应');
        if (res.code !== 200) throw new Error(res.msg || "juhe请求失败");
        if (!res.data || !res.data.url) throw new Error('juhe未返回有效URL');
        if (res.data.url.includes('api.injahow.cn')) {
            throw new Error(`juhe 303处理失败: 不支持的重定向`);
        }
        return res.data.url;
    }
    
    // ==================== 野花野草音源处理器 ====================
    async function yehuayeGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        if (!songId) throw new Error('野花野草缺少歌曲ID');
        const res = await httpGet('https://api.injahow.cn/flower/api.php', {
            types: source,
            id: songId,
            quality: quality
        });
        if (!res || !res.data || !res.data.url) throw new Error('野花野草失败: ' + (res?.msg || 'null'));
        return res.data.url;
    }
    
    // ==================== Meting备用API ====================
    async function metingGetMusicUrl(source, musicInfo, quality) {
        const songId = getSongId(source, musicInfo);
        const metingServer = { tx: 'tencent', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' }[source];
        if (!metingServer) throw new Error('Meting不支持该平台');
        if (!songId) throw new Error('Meting缺少歌曲ID');
        const res = await httpGet('https://api.injahow.cn/meting/', {
            server: metingServer,
            type: 'url',
            id: songId,
            r: Math.random()
        });
        if (!res || !res.data || !res.data.url) throw new Error('Meting失败');
        return res.data.url;
    }
    
    // ==================== Free listen 音源处理器 ====================
    let freelisten_token = '';
    let freelisten_cookie = '';
    
    function freelistenEncrypt(str, pwd) {
        if (pwd == null || pwd.length <= 0) return null;
        let prand = '';
        for (let i = 0; i < pwd.length; i++) prand += pwd.charCodeAt(i).toString();
        let sPos = Math.floor(prand.length / 5);
        let mult = parseInt(prand.charAt(sPos) + prand.charAt(sPos * 2) + prand.charAt(sPos * 3) + prand.charAt(sPos * 4) + prand.charAt(sPos * 5));
        let incr = Math.ceil(pwd.length / 2);
        let modu = Math.pow(2, 31) - 1;
        if (mult < 2) return null;
        let salt = Math.round(Math.random() * 1000000000) % 100000000;
        prand += salt;
        while (prand.length > 10) prand = (parseInt(prand.substring(0, 10)) + parseInt(prand.substring(10, prand.length))).toString();
        prand = (mult * prand + incr) % modu;
        let enc_str = '';
        for (let i = 0; i < str.length; i++) {
            let enc_chr = parseInt(str.charCodeAt(i) ^ Math.floor((prand / modu) * 255));
            if (enc_chr < 16) enc_str += '0' + enc_chr.toString(16);
            else enc_str += enc_chr.toString(16);
            prand = (mult * prand + incr) % modu;
        }
        salt = salt.toString(16);
        while (salt.length < 8) salt = '0' + salt;
        enc_str += salt;
        return enc_str;
    }
    
    async function freelistenGetToken() {
        return new Promise((resolve, reject) => {
            if (typeof request !== 'function') {
                return reject(new Error('request API 不可用'));
            }
            let defaultKey = 'Hm_Iuvt_cdb524f42f0ce19b169a8071123a4700';
            request('http://www.kuwo.cn/', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0', Referer: 'http://www.kuwo.cn/' }
            }, function(error, response) {
                if (error) return reject(new Error('failed'));
                let cookieToken = '';
                if (response.headers['set-cookie']) {
                    let cookies = response.headers['set-cookie'];
                    let cookieStr = Array.isArray(cookies) ? cookies.find(str => str.startsWith('Hm_Iuvt_')) : cookies.match(/Hm_Iuvt_\w+=\w+;/);
                    if (cookieStr) {
                        cookieToken = cookieStr.split(';')[0];
                        freelisten_cookie = cookieToken;
                        cookieToken = cookieToken.split('=')[1];
                    }
                }
                if (!cookieToken) return reject(new Error('Invalid cookie'));
                const result = response.body.match(/app\.\w+\.js/);
                if (result) {
                    request(`https://h5.static.kuwo.cn/www/kw-www/${result[0]}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0', Referer: 'http://www.kuwo.cn/' }
                    }, function(error, response) {
                        if (error) return resolve(freelistenEncrypt(cookieToken, defaultKey));
                        const result = response.body.match(/Hm_Iuvt_(\w+)/);
                        if (result) resolve(freelistenEncrypt(cookieToken, result[0]));
                        else resolve(freelistenEncrypt(cookieToken, defaultKey));
                    });
                } else {
                    resolve(freelistenEncrypt(cookieToken, defaultKey));
                }
            });
        });
    }
    
    async function freelistenGetMusicUrl(source, musicInfo, quality) {
        if (source === 'kw') {
            const qualitys = { '128k': '128kmp3', '320k': '320kmp3' };
            const br = qualitys[quality] || '128kmp3';
            const target_url = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${musicInfo.songmid}&type=music&br=${br}`;
            if (!freelisten_token) freelisten_token = await freelistenGetToken();
            const res = await httpGet(target_url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data && res.data.url) return res.data.url;
            throw new Error('Free listen酷我获取失败');
        }
        if (source === 'kg') {
            const target_url = `https://www.api.kugou.com/yy/index.php?r=play/getdata&hash=${musicInfo.hash}&platid=4&album_id=${musicInfo.albumId}&mid=00000000000000000000000000000000`;
            const res = await httpGet(target_url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.status === 1 && res.data && res.data.play_backup_url && res.data.privilege <= 9) return res.data.play_backup_url;
            throw new Error('Free listen酷狗获取失败');
        }
        if (source === 'tx') {
            const fileConfig = { '128k': { s: 'M500', e: '.mp3' }, '320k': { s: 'M800', e: '.mp3' }, 'flac': { s: 'F000', e: '.flac' } };
            const fileInfo = fileConfig[quality] || fileConfig['128k'];
            const file = `${fileInfo.s}${musicInfo.strMediaMid}${fileInfo.e}`;
            const reqData = {
                req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param: { filename: [file], guid: '10000', songmid: [musicInfo.songmid], songtype: [0], uin: '0', loginflag: 1, platform: '20' } },
                loginUin: '0', comm: { uin: '0', format: 'json', ct: 24, cv: 0 }
            };
            const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(reqData))}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.req_0 && res.req_0.data && res.req_0.data.midurlinfo && res.req_0.data.midurlinfo[0]) {
                const purl = res.req_0.data.midurlinfo[0].purl;
                if (purl && purl !== '') {
                    const sip = (res.req_0.data.sip && res.req_0.data.sip[0]) ? res.req_0.data.sip[0] : 'https://ws6.stream.qqmusic.qq.com/';
                    return sip + purl;
                }
            }
            throw new Error('Free listen企鹅获取失败');
        }
        if (source === 'wy') {
            const wy_qualitys = { '128k': 128000, '320k': 320000, 'flac': 999000 };
            const br = wy_qualitys[quality] || 128000;
            const eapiKey = 'e82ckenh8dichen8';
            const text = JSON.stringify({ ids: `[${musicInfo.songmid}]`, br: br });
            const message = `nobody/api/song/enhance/player/urluse${text}md5forencrypt`;
            const digest = md5(message);
            const data = `/api/song/enhance/player/url-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
            let encrypted = aesEncrypt(data, eapiKey, '', 'aes-128-ecb');
            if (encrypted && typeof encrypted === 'object' && encrypted.buffer) {
                encrypted = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            const postData = { params: (typeof encrypted === 'string' ? encrypted : '').toUpperCase() };
            const res = await httpPost('https://interface3.music.163.com/eapi/song/enhance/player/url', postData, CONFIG.REQUEST_TIMEOUT);
            if (res && res.data && res.data[0] && res.data[0].url && !res.data[0].freeTrialInfo) return res.data[0].url;
            throw new Error('Free listen网易获取失败');
        }
        if (source === 'mg') {
            const mg_qualitys = { '128k': 'PQ', '320k': 'HQ', 'flac': 'SQ', 'flac24bit': 'ZQ' };
            const toneFlag = mg_qualitys[quality] || 'PQ';
            const url = `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?netType=01&resourceType=E&songId=${musicInfo.songmid}&toneFlag=${toneFlag}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.data && res.data.url) {
                let playUrl = res.data.url;
                if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
                return playUrl.replace(/\+/g, '%2B').split('?')[0];
            }
            throw new Error('Free listen咪咕获取失败');
        }
        throw new Error(`Free listen音源不支持平台: ${source}`);
    }
    
    // ==================== 独家音源处理器 ====================
    const DusiyinyuanSha256 = (function() {
        function sha256(message) {
            function rightRotate(value, amount) {
                return (value >>> amount) | (value << (32 - amount));
            }
            const K = [
                0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
            ];
            let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
            let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
            const msgBytes = typeof message === 'string' ? 
                (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(message) : (function(s) {
                    var buf = new Uint8Array(s.length);
                    for (var i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i) & 0xff;
                    return buf;
                })(message)) : new Uint8Array(message);
            const ml = msgBytes.length * 8;
            const padded = new Uint8Array(((msgBytes.length + 8 + 63) & ~63) + 8);
            padded.set(msgBytes);
            padded[msgBytes.length] = 0x80;
            const view = new DataView(padded.buffer);
            view.setUint32(padded.length - 4, ml >>> 32, false);
            view.setUint32(padded.length - 8, ml & 0xffffffff, false);
            for (let i = 0; i < padded.length; i += 64) {
                const w = new Array(64);
                for (let t = 0; t < 16; t++) {
                    w[t] = view.getUint32(i + t * 4, false);
                }
                for (let t = 16; t < 64; t++) {
                    const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
                    const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
                    w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
                }
                let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
                for (let t = 0; t < 64; t++) {
                    const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
                    const ch = (e & f) ^ ((~e) & g);
                    const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
                    const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
                    const maj = (a & b) ^ (a & c) ^ (b & c);
                    const temp2 = (S0 + maj) >>> 0;
                    h = g; g = f; f = e; e = (d + temp1) >>> 0;
                    d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
                }
                h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
                h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
            }
            function toHex(num) { return num.toString(16).padStart(8, '0'); }
            return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
        }
        return { sha256 };
    })();
    
    async function dusiyinyuanGetUrl(platform, songInfo, quality) {
        const source = PLATFORM_TO_SOURCE[platform]?.dusiyinyuan;
        if (!source) throw new Error(`独家音源不支持平台: ${platform}`);
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('独家音源缺少歌曲ID');
        const qualityMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': 'flac', '24bit': '24bit', 'flac24bit': '24bit' };
        const br = qualityMap[quality] || '320';
        const timestamp = Date.now();
        const signData = `${source}${songId}${br}${timestamp}${CONFIG.IKUN_SCRIPT_MD5 || 'lxmusic'}`;
        const sign = DusiyinyuanSha256.sha256(signData);
        const endpoints = ['https://api.lxmusic.net', 'https://api.lxmusic.top'];
        let lastError = null;
        for (const baseUrl of endpoints) {
            try {
                const url = `${baseUrl}/url`;
                const response = await httpFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': `lx-music/${version}` },
                    body: JSON.stringify({ source, songId: String(songId), br, timestamp, sign })
                });
                const body = response.body;
                if (body && body.code === 200 && body.data && body.data.url && HTTP_REGEX.test(body.data.url)) {
                    return body.data.url;
                }
                if (body && body.code === 403) throw new Error('签名验证失败');
            } catch (e) {
                lastError = e;
                console.warn(`[独家音源] ${baseUrl} 请求失败:`, e.message);
            }
        }
        throw lastError || new Error('独家音源所有端点均失败');
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

    // ==================== 注册所有音源处理器 ====================
    const SOURCE_HANDLERS = [
        // GD音乐台
        new SourceHandler('GD音乐台', async (platform, musicInfo, quality) => {
            return gdGetUrl(platform, musicInfo, quality);
        }, 0, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 非常刀
        new SourceHandler('CHKSZ', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return chkszGetUrl(musicInfo, quality);
        }, 1, { supportedPlatforms: ['wy'] }),
        
        // 肥猫
        new SourceHandler('肥猫', async (platform, musicInfo, quality) => {
            return feimaoGetUrl(platform, musicInfo, quality);
        }, 2, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 小熊猫
        new SourceHandler('小熊猫', async (platform, musicInfo, quality) => {
            return xiaoxiongmaoGetUrl(platform, musicInfo, quality);
        }, 3, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 梓澄公益
        new SourceHandler('梓澄公益', async (platform, musicInfo, quality) => {
            return zichanGetUrl(platform, musicInfo, quality);
        }, 4, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 無名
        new SourceHandler('無名', async (platform, musicInfo, quality) => {
            return wumingGetUrl(platform, musicInfo, quality);
        }, 5, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 六音
        new SourceHandler('六音', async (platform, musicInfo, quality) => {
            return liuyinGetUrl(platform, musicInfo, quality);
        }, 6, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 星海主
        new SourceHandler('星海主', async (platform, musicInfo, quality) => {
            return xinghaiMainGetUrl(platform, musicInfo, quality);
        }, 7, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 长青SVIP
        new SourceHandler('长青SVIP', async (platform, musicInfo, quality) => {
            return changqingGetUrl(platform, musicInfo, quality);
        }, 8, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 念心SVIP
        new SourceHandler('念心SVIP', async (platform, musicInfo, quality) => {
            return nianxinGetUrl(platform, musicInfo, quality);
        }, 9, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 溯音
        new SourceHandler('溯音', async (platform, musicInfo, quality) => {
            return suyinGetUrl(platform, musicInfo, quality);
        }, 10, { supportedPlatforms: ['tx', 'wy', 'kw', 'mg'] }),
        
        // ikun
        new SourceHandler('ikun', async (platform, musicInfo, quality) => {
            return ikunGetMusicUrl(platform, musicInfo, quality);
        }, 11, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 野草
        new SourceHandler('野草', async (platform, musicInfo, quality) => {
            if (platform !== 'kw') throw new Error('仅限酷我');
            return yecaoGetMusicUrl(musicInfo, quality);
        }, 11, { supportedPlatforms: ['kw'] }),
        
        // fish
        new SourceHandler('fish', async (platform, musicInfo, quality) => {
            return fishGetMusicUrl(platform, musicInfo, quality);
        }, 12, { supportedPlatforms: ['kg', 'kw', 'tx'] }),
        
        // qorg
        new SourceHandler('qorg', async (platform, musicInfo, quality) => {
            return qorgGetMusicUrl(platform, musicInfo, quality);
        }, 13, { supportedPlatforms: ['wy', 'wycloudmusic'] }),
        
        // wyqlm
        new SourceHandler('wyqlm', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return wyqlmGetMusicUrl(musicInfo, quality);
        }, 13, { supportedPlatforms: ['wy'] }),
        
        // 网易云官方
        new SourceHandler('网易云官方', async (platform, musicInfo, quality) => {
            if (platform !== 'wy') throw new Error('仅限网易云');
            return neteaseGetMusicUrl(getSongId('wy', musicInfo), quality);
        }, 14, { supportedPlatforms: ['wy'], needUrlValidation: true }),
        
        // 星海备
        new SourceHandler('星海备', async (platform, musicInfo, quality) => {
            return xinghaiBackupGetUrl(platform, musicInfo, quality);
        }, 15, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        
        // 汽水VIP
        new SourceHandler('汽水VIP', async (platform, musicInfo, quality) => {
            return qishuiGetUrl(musicInfo, quality);
        }, 16, { supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] })
    ];

    // ==================== 获取平台对应的处理器 ====================
    function getHandlersForPlatform(platform) {
        return SOURCE_HANDLERS
            .filter(h => h.supportsPlatform(platform))
            .sort((a, b) => a.priority - b.priority);
    }

    // ==================== 主获取函数 ====================
    async function getUrlWithFallback(platform, musicInfo, quality) {
        if (!platform) throw new Error('无效平台');
        if (!musicInfo || typeof musicInfo !== 'object') throw new Error('无效歌曲信息');
        const q = quality || '320k';
        const cacheKey = SafeUtils.buildCacheKey(platform, musicInfo, q);
        
        // 检查缓存
        if (state.urlCache.has(cacheKey)) {
            const cached = state.urlCache.get(cacheKey);
            if (cached && HTTP_REGEX.test(cached)) {
                state.stats.hits++;
                return cached;
            }
        }
        state.stats.misses++;

        const handlers = getHandlersForPlatform(platform);
        
        if (handlers.length === 0) {
            console.warn(`[聚合音源] 没有常规音源处理器`);
            return await qishuiGetUrl(musicInfo, q);
        }

        // 尝试每个音源处理器
        let lastError = null;
        for (const handler of handlers) {
            try {
                console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                const timeout = handler.timeout || CONFIG.REQUEST_TIMEOUT;
                let url = await withTimeout(handler.fn(platform, musicInfo, q), timeout, handler.name + '超时');
                const validated = validateUrl(url, handler.name);
                
                // URL验证
                if (handler.needUrlValidation !== false) {
                    const isValid = await validateUrlWithHead(validated);
                    if (!isValid) {
                        console.warn(`[聚合音源] ${handler.name} 返回URL无效`);
                        continue;
                    }
                }
                
                // 试听检测
                if (CONFIG.TRIAL_CHECK_ENABLED && isTrialUrl(validated)) {
                    console.warn(`[聚合音源] ${handler.name} 返回试听URL，尝试其他源`);
                    continue;
                }
                
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                return validated;
                
            } catch (error) {
                console.warn(`[聚合音源] ${handler.name} 失败: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        
        // 终极兜底：汽水VIP
        try {
            console.log(`[聚合音源] 终极兜底: 汽水VIP`);
            const url = await qishuiGetUrl(musicInfo, q);
            state.urlCache.set(cacheKey, url);
            return url;
        } catch (e) {}
        
        state.stats.fail++;
        throw lastError || new Error('所有音源获取失败');
    }

    // ==================== 公告发送 ====================
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
        const cleanup = () => {
            if (state.stats.requests > 1000) {
                state.stats.requests = 0;
                state.stats.hits = 0;
                state.stats.misses = 0;
                state.stats.success = 0;
                state.stats.fail = 0;
            }
            
            const total = state.stats.success + state.stats.fail;
            if (total > 0) {
                const successRate = (state.stats.success / total * 100).toFixed(1);
                console.log(`[聚合音源] 统计: 请求${state.stats.requests}次, 成功率${successRate}%, 缓存命中${state.stats.hits}次`);
            }
            
            state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
        };
        
        state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
    }

    // ==================== 事件监听 ====================
    function setupEventListener() {
        const handleRequest = async ({ action, source, info }) => {
            state.stats.requests++;
            
            return new Promise(async (resolve, reject) => {
                try {
                    // 处理 qishui
                    if (source === 'qishui') {
                        if (action === 'musicSearch' || action === 'search') {
                            const keyword = info?.keyword ? String(info.keyword) : '';
                            const page = info?.page ? Number(info.page) : 1;
                            const pageSize = info?.pagesize ? Number(info.pagesize) : 30;
                            const result = await qishuiSearch(keyword, page, pageSize);
                            return resolve(result);
                        }
                        if (action === 'musicUrl') {
                            if (!info?.musicInfo) {
                                return reject(new Error('请求参数不完整'));
                            }
                            const url = await qishuiGetUrl(info.musicInfo, info.type);
                            return resolve(validateUrl(url, '汽水VIP'));
                        }
                        if (action === 'lyric') {
                            return resolve({ lyric: '' });
                        }
                    }
                    
                    // 处理 qorg
                    if (source === 'qorg') {
                        if (action === 'musicSearch' || action === 'search') {
                            const keyword = info?.keyword ? String(info.keyword) : '';
                            const page = info?.page ? Number(info.page) : 1;
                            const pageSize = info?.pagesize ? Number(info.pagesize) : 30;
                            const result = await qorgSearch(keyword, page, pageSize);
                            return resolve(result);
                        }
                        if (action === 'musicUrl') {
                            if (!info?.musicInfo) {
                                return reject(new Error('请求参数不完整'));
                            }
                            const url = await qorgGetMusicUrl(source, info.musicInfo, info.type);
                            return resolve(validateUrl(url, 'qorg'));
                        }
                        if (action === 'lyric') {
                            return resolve({ lyric: '' });
                        }
                    }
                    
                    if (action === 'musicUrl') {
                        if (!info?.musicInfo) {
                            return reject(new Error('请求参数不完整'));
                        }
                        
                        const musicInfo = info.musicInfo || {};
                        const platform = musicInfo._source || source;
                        const quality = info.type || '320k';
                        
                        console.log(`[聚合音源] 请求: ${platform} - ${musicInfo.name || '未知'} - ${quality}`);
                        
                        try {
                            const url = await getUrlWithFallback(platform, musicInfo, quality);
                            console.log(`[聚合音源] 成功获取URL: ${(url || '').substring(0, 60)}...`);
                            resolve(url);
                        } catch (fallbackError) {
                            console.warn(`[聚合音源] 获取失败: ${fallbackError.message || fallbackError}`);
                            reject(fallbackError);
                        }
                    } else {
                        reject(new Error(`不支持的操作: ${action}`));
                    }
                } catch (e) {
                    console.error(`[聚合音源] 请求失败: ${e.message || e}`);
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

    // ==================== 初始化 ====================
    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('[聚合音源·重构完整版] v1.0.0 初始化中...');
        console.log(`[聚合音源] 开源地址: ${ANNOUNCEMENT.repo}`);
        console.log(`[聚合音源] 交流群: ${ANNOUNCEMENT.qqGroup}`);
        console.log('[聚合音源] 已集成音源: GD音乐台, 非常刀, 肥猫, 小熊猫, 梓澄公益, 無名, 六音, 星海, 长青SVIP, 念心SVIP, 溯音, ikun, 野草, fish, qorg, wyqlm, 网易云官方, 星海备, 汽水VIP, Free listen, 野花野草, Meting, 独家音源, 肥猫不肥, 梓澄qwq, 梓澄公益2代, 聚合API');
        
        startStatsCleanup();
        setupEventListener();
        sendAnnouncement();
        
        // 发送初始化完成事件
        try {
            if (typeof send === 'function') {
                send(EVENT_NAMES.inited, {
                    openDevTools: false,
                    sources: sourceConfig,
                    status: {
                        version: '1.0.0',
                        stats: state.stats,
                        config: {
                            timeout: CONFIG.REQUEST_TIMEOUT,
                            retries: CONFIG.MAX_RETRIES,
                            concurrentLimit: CONFIG.CONCURRENT_LIMIT,
                            repo: ANNOUNCEMENT.repo,
                            qqGroup: ANNOUNCEMENT.qqGroup
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[聚合音源] send inited 事件失败:', e.message);
        }
        
        console.log('[聚合音源·重构完整版] v1.0.0 已加载');
        console.log('[聚合音源] 支持平台:', Object.keys(sourceConfig).join(', '));
        console.log(`[聚合音源] 开源地址: ${ANNOUNCEMENT.repo} | 群号: ${ANNOUNCEMENT.qqGroup}`);
    }

    // 启动
    initialize();
})();
