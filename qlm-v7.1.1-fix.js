/**
 * @name 七零喵聚合音源 · 超级整合版（修复版）+ 自建网易云
 * @description 修复 ikun/聚合API/qorg 错误，完善错误处理
 * @version 7.1.1-fix
 * @author 整合优化版
 * @homepage https://github.com/xcqm12/qlm-music
 * @qqgroup 1006981142
 */
(function() {
    "use strict";
    
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
        title: "七零喵聚合音源 v7.1.1-fix",
        content: "开源地址: https://github.com/xcqm12/qlm-music\n交流群: 1006981142\n修复版: 修复ikun/聚合API/qorg错误",
        version: "7.1.1-fix",
        repo: "https://github.com/xcqm12/qlm-music",
        qqGroup: "1006981142"
    });
    
    // ==================== 修复事件名称兼容性 ====================
    const EVENT_NAMES = Object.freeze({
        request: (lx.EVENT_NAMES && lx.EVENT_NAMES.request) || 'request',
        inited: (lx.EVENT_NAMES && lx.EVENT_NAMES.inited) || 'inited',
        updateAlert: (lx.EVENT_NAMES && lx.EVENT_NAMES.updateAlert) || 'updateAlert'
    });
    
    // ==================== 安全获取 LX Music API ====================
    let request = null;
    let on = null;
    let send = null;
    
    const requestGetters = [
        () => lx.request,
        () => globalObj.request,
        () => globalObj.lx && globalObj.lx.request,
        () => globalObj.LX && globalObj.LX.request,
        () => globalObj.lxMusic && globalObj.lxMusic.request,
        () => globalObj.$lx && globalObj.$lx.request
    ];
    
    for (const getter of requestGetters) {
        try {
            const req = getter();
            if (typeof req === 'function') { request = req; break; }
        } catch (e) {}
    }
    
    const onGetters = [() => lx.on, () => globalObj.on];
    for (const getter of onGetters) {
        try {
            const result = getter();
            if (typeof result === 'function') { on = result; break; }
        } catch (e) {}
    }
    
    const sendGetters = [() => lx.send, () => globalObj.send];
    for (const getter of sendGetters) {
        try {
            const result = getter();
            if (typeof result === 'function') { send = result; break; }
        } catch (e) {}
    }
    
    const utils = lx.utils || {};
    const env = lx.env || '';
    const version = lx.version || '1.0.0';
    
    // 备用 fetch
    if (!request || typeof request !== 'function') {
        if (typeof fetch === 'function') {
            request = function(url, options, callback) {
                if (typeof callback !== 'function') return fetch(url, options);
                fetch(url, options)
                    .then(resp => resp.text().then(body => ({
                        statusCode: resp.status,
                        headers: Object.fromEntries(resp.headers.entries()),
                        body: body
                    })))
                    .then(resp => callback(null, resp))
                    .catch(err => callback(err));
            };
        } else {
            console.error('[聚合音源] request API 不可用');
            return;
        }
    }
    
    if (!on) on = function(event, handler) { console.warn('[聚合音源] on 方法不可用'); };
    if (!send) send = function(event, data) { console.log('[聚合音源] send:', event, data); };
    
    // ==================== 安全工具函数 ====================
    const SafeUtils = {
        isArray(arr) { return Array.isArray(arr); },
        isString(str) { return typeof str === 'string'; },
        isFunction(fn) { return typeof fn === 'function'; },
        isObject(obj) { return obj !== null && typeof obj === 'object'; },
        
        safeGet(obj, path, defaultValue) {
            if (obj == null) return defaultValue;
            const keys = Array.isArray(path) ? path : String(path).split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') return defaultValue;
                result = result[key];
            }
            return result !== undefined && result !== null ? result : defaultValue;
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
    };
    
    // ==================== MD5函数 ====================
    function md5(str) {
        if (utils && utils.crypto && SafeUtils.isFunction(utils.crypto.md5)) {
            return utils.crypto.md5(str);
        }
        
        function rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
        function addUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
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
        
        function FF(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function GG(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function HH(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function II(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        
        function convertToWordArray(str) {
            var lWordCount, lMessageLength = str.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            var lWordArray = new Array(lNumberOfWords - 1);
            var lBytePosition = 0, lByteCount = 0;
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
            var wordToHexValue = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                wordToHexValue = wordToHexValue + ("0" + lByte.toString(16)).substr(-2, 2);
            }
            return wordToHexValue;
        }
        
        var x = convertToWordArray(str);
        var a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
        
        for (var k = 0; k < x.length; k += 16) {
            var AA = a, BB = b, CC = c, DD = d;
            a = FF(a, b, c, d, x[k+0], 7, 0xD76AA478); d = FF(d, a, b, c, x[k+1], 12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k+2], 17, 0x242070DB); b = FF(b, c, d, a, x[k+3], 22, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k+4], 7, 0xF57C0FAF); d = FF(d, a, b, c, x[k+5], 12, 0x4787C62A);
            c = FF(c, d, a, b, x[k+6], 17, 0xA8304613); b = FF(b, c, d, a, x[k+7], 22, 0xFD469501);
            a = FF(a, b, c, d, x[k+8], 7, 0x698098D8); d = FF(d, a, b, c, x[k+9], 12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k+10], 17, 0xFFFF5BB1); b = FF(b, c, d, a, x[k+11], 22, 0x895CD7BE);
            a = FF(a, b, c, d, x[k+12], 7, 0x6B901122); d = FF(d, a, b, c, x[k+13], 12, 0xFD987193);
            c = FF(c, d, a, b, x[k+14], 17, 0xA679438E); b = FF(b, c, d, a, x[k+15], 22, 0x49B40821);
            
            a = GG(a, b, c, d, x[k+1], 5, 0xF61E2562); d = GG(d, a, b, c, x[k+6], 9, 0xC040B340);
            c = GG(c, d, a, b, x[k+11], 14, 0x265E5A51); b = GG(b, c, d, a, x[k+0], 20, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k+5], 5, 0xD62F105D); d = GG(d, a, b, c, x[k+10], 9, 0x02441453);
            c = GG(c, d, a, b, x[k+15], 14, 0xD8A1E681); b = GG(b, c, d, a, x[k+4], 20, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k+9], 5, 0x21E1CDE6); d = GG(d, a, b, c, x[k+14], 9, 0xC33707D6);
            c = GG(c, d, a, b, x[k+3], 14, 0xF4D50D87); b = GG(b, c, d, a, x[k+8], 20, 0x455A14ED);
            a = GG(a, b, c, d, x[k+13], 5, 0xA9E3E905); d = GG(d, a, b, c, x[k+2], 9, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k+7], 14, 0x676F02D9); b = GG(b, c, d, a, x[k+12], 20, 0x8D2A4C8A);
            
            a = HH(a, b, c, d, x[k+5], 4, 0xFFFA3942); d = HH(d, a, b, c, x[k+8], 11, 0x8771F681);
            c = HH(c, d, a, b, x[k+11], 16, 0x6D9D6122); b = HH(b, c, d, a, x[k+14], 23, 0xFDE5380C);
            a = HH(a, b, c, d, x[k+1], 4, 0xA4BEEA44); d = HH(d, a, b, c, x[k+4], 11, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k+7], 16, 0xF6BB4B60); b = HH(b, c, d, a, x[k+10], 23, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k+13], 4, 0x289B7EC6); d = HH(d, a, b, c, x[k+0], 11, 0xEAA127FA);
            c = HH(c, d, a, b, x[k+3], 16, 0xD4EF3085); b = HH(b, c, d, a, x[k+6], 23, 0x04881D05);
            a = HH(a, b, c, d, x[k+9], 4, 0xD9D4D039); d = HH(d, a, b, c, x[k+12], 11, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k+15], 16, 0x1FA27CF8); b = HH(b, c, d, a, x[k+2], 23, 0xC4AC5665);
            
            a = II(a, b, c, d, x[k+0], 6, 0xF4292244); d = II(d, a, b, c, x[k+7], 10, 0x432AFF97);
            c = II(c, d, a, b, x[k+14], 15, 0xAB9423A7); b = II(b, c, d, a, x[k+5], 21, 0xFC93A039);
            a = II(a, b, c, d, x[k+12], 6, 0x655B59C3); d = II(d, a, b, c, x[k+3], 10, 0x8F0CCC92);
            c = II(c, d, a, b, x[k+10], 15, 0xFFEFF47D); b = II(b, c, d, a, x[k+1], 21, 0x85845DD1);
            a = II(a, b, c, d, x[k+8], 6, 0x6FA87E4F); d = II(d, a, b, c, x[k+15], 10, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k+6], 15, 0xA3014314); b = II(b, c, d, a, x[k+13], 21, 0x4E0811A1);
            a = II(a, b, c, d, x[k+4], 6, 0xF7537E82); d = II(d, a, b, c, x[k+11], 10, 0xBD3AF235);
            c = II(c, d, a, b, x[k+2], 15, 0x2AD7D2BB); b = II(b, c, d, a, x[k+9], 21, 0xEB86D391);
            
            a = addUnsigned(a, AA); b = addUnsigned(b, BB);
            c = addUnsigned(c, CC); d = addUnsigned(d, DD);
        }
        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }
    
    // ==================== 常量定义 ====================
    const CONFIG = Object.freeze({
        // 【修复点1】移除 IKUN_API_KEY 硬编码依赖，改为可选
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_API_KEY: "",  // 留空，ikun 服务端可能不需要 key
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
        REQUEST_TIMEOUT: 15000,
        DECRYPT_TIMEOUT: 18000,
        CONCURRENT_LIMIT: 5,
        MAX_RETRIES: 2,
        RETRY_DELAY: 800,
        URL_VALIDATION_TIMEOUT: 5000,
        STATS_CLEANUP_INTERVAL: 300000,
        PRELOAD_NEXT_ENABLED: true,
        PRELOAD_TIMEOUT: 10000,
        
        NETEASE_CLOUD_COOKIE_KEY: '_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=53b32208d3ff4825ff51d9f5ce806c98; NMTID=00OOaxZpza_Cxj1Y0CWrpkk8PxmwgQAAAGb61xCIA; __snaker__id=XONHI2Gv80iNHZ7Z; WM_TID=oMlXAq8tKP9BAAUAUQaH2qjeM7QpK88Y; _iuqxldmzr_=32; ntes_kaola_ad=1; NTES_P_UTID=SL9imFoa8rYLTnjVYulzxKhb8y7KdyaJ|1771482585; P_INFO=m18651415610@163.com|1771482585|1|phoenix_client|00&99|jis&1771231192&ntesgod_app#jis&320600#10#0#0|186610&1|godlike_app&ntesgod_app|18651415610@163.com; timing_user_id=time_DH7EWvPb5c; __csrf=ace47455bd906e2ad7fe4cc7d8037df7; ntes_utid=tid._.jwb%252F%252BPn0SKZFVwFAVFfG27jbMrEr96km._.0.%2C.edd._.._.0; WM_NI=wmTqWxKPadpv2R1Sl%2FL71iPeMqaPPSgsHfRDh5gFoFhw%2BdtTQNwudVJTuUy3dzKramThieOCi2AEAVSXSFGJfZMZoEgm1BM6IGeBVCDCyguAITGs%2BucZMoLOfHCVGQLHRzc%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eed3ea59a5bb8f9ad03fbbb88fa7d45a839a8f86cb40adb99cb8c94089e9a891d02af0fea7c3b92ab5b39c92d6748990af85f37ef28effb4ef2590e9ff8ad36f8fafafb1d359a5ad8887d150aceba9a7ee4eaca9e585f7609392b996e75e8a8cbbb6fc39a8a68593e46798b8a786ce49abee8fa6c45e91889da7c642a68683bbee4fa5b3ffa3d03e8b99aba3d549889db788f84b8b8c8994aa7fa1868390cf45a6988db7c65b90989e9be237e2a3; sDeviceId=YD-3OtYltVMdiJBBlRQUALW00QfWedU6OPa; gdxidpyhxdE=S6ckMD1I59fzIq2mcYwO%2B4VZ%2B8U8PfUma2GxE8SxygCCDvmuyloO98TxhOuSUb2pZaBvafz1Av2C2iRBANnAyd%2F8YarYixKetVlVcQYXPRZK6eRnQTeIH%2FbPE%2Ff6CL8In%5Cjcs0AuQ0SZBYKBqX3Q8SRbYJWfZi5VSQmeB1rf%2BYxCRSOf%3A1776554702285; __csrf=ac6803ad8d0db7317192d383647bcaaa; MUSIC_U=00B796682748D09558E2ABEB6FBD4AA522F7DCF616DEE627874471536C93E70252168B237C84F13A5319DBCF0CCB01A10B8DA408D0CFDAD390DD530BAD2FDBC1E601B69C9A54B37FD1D9920201ECA320EBE4B5AD3586E4F97376D20309CC70653C182CA345A63256963297B872FE906EBFD1E5D374703CB7609C68E0882336534F86F8B52AB9311F0551B610A45B1138B3E284CB2B78A98E86AD070D5274BD3532EC94A671542B90E998DF3CF9B697A8AC9D4F225091CC6F6B591A1C3B5C96E41BE342216FC1F772AFBEA054FA75BFFB7D35681097CEAADB42606BED6476E4FC6374A9393DBC2F4BFA58B108851F6131BE1A18161CB41879B698063E1980326FEF55695077247856B0FEAA11C89A24E91D66E4BB40EF1924BE95EB2B3437951819236090CECEE6C07653775FBFFAD948ED1D3B452AF78AC5B759F84C214ACA9303268733F678B3262D20ECA60DA7B197C157FB837595C4A29BB6A048CCA90AE7A5DC431FEF70186C422B1385632BE8A1BB12A753771AE8F068F48745E7B24539C633646D511F06EA6D6F21E16CE76618930AB33E531C52FC599DF627F5FDD2ACCE; JSESSIONID-WYYY=hKJT%5CNZV%2BBqCQ3nfwDj0H7d0xTvhBI84rEp%2BF76gEaoVM%5CjzGGQEtBjk%2FyiwpwEVXlavVp9DBYfB49iUN77UZthvo9noD%5CAGwzx8HZDkIryRQZpzCPsgzCm4wZbZKExXxBNJxzTssaUTFtDBCHZT7juCauylsAhNBaJgrnzY5agj%2FOlU%3A1776556842084'
    });
    
    const QUALITY_LEVELS = Object.freeze(['24bit', 'flac', '320k', '192k', '128k']);
    const PLATFORMS = Object.freeze(['tx', 'wy', 'kw', 'kg', 'mg', 'sixyin', 'local', 'qorg', 'wycloud', 'wycloudmusic']);
    const HTTP_REGEX = /^https?:\/\//i;
    
    // ==================== API 端点配置 ====================
    const API_ENDPOINTS = Object.freeze({
        ikun: { url: "https://api.ikunshare.com/url", script: "https://api.ikunshare.com/script/lxmusic" },
        juhe: { init: "https://api.music.lerd.dpdns.org/init.conf", base: "https://api.music.lerd.dpdns.org" },
        qorg: { base: "https://api.qlm.org.cn", enabled: true, endpoints: { music: "/music/url", search: "/music/search", lyric: "/music/lyric", wycloud: "/wycloud", wycloudCookie: "/wycloud/cookie" } },
        wycloudmusic: { base: "https://api.qlm.org.cn", enabled: true, endpoints: { search: "/search", url: "/song/url", lyric: "/lyric" } },
        xinghaiMain: { base: "https://music-api.gdstudio.xyz/api.php", params: { use_xbridge3: "true", loader_name: "forest", need_sec_link: "1", sec_link_scene: "im", theme: "light", types: "url" } },
        xinghaiBackup: { base: "https://music-dl.sayqz.com/api/" },
        suyin: {
            qq: { url: "https://oiapi.net/api/QQ_Music", key: "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575" },
            wy: { url: "https://oiapi.net/api/Music_163" },
            kw: { url: "https://oiapi.net/api/Kuwo" },
            mg: { url: "https://api.xcvts.cn/api/music/migu" }
        },
        changqing: { tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}", wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}", kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}", kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}", mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}" },
        nianxin: { tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3", wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3", kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3", kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3", mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3" },
        qishui: { https: "https://api.vsaa.cn/api/music.qishui.vip", http: "http://api.vsaa.cn/api/music.qishui.vip", proxy: "https://proxy.qishui.vsaa.cn/qishui/proxy", backupProxy: "https://api.vsaa.cn/api/qishui/decrypt" },
        sixyin: "http://music.sixyin.com/api",
        flower: "http://97.64.37.235/flower/v1",
        grass: "http://97.64.37.235/grass/v1",
        backup: { wy: "https://api.injahow.cn/meting/?server=netease&type=url&id={id}&br={br}", tx: "https://api.injahow.cn/meting/?server=tencent&type=url&id={id}&br={br}" },
        dusiyinyuan: { base: "https://api.lxmusic.top/v1", fallback: "https://api.lxmusic.net/v1" }
    });
    
    const PLATFORM_TO_SOURCE = Object.freeze({
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
    });
    
    const QUALITY_TO_BR = Object.freeze({ "128k": "128", "192k": "192", "320k": "320", "flac": "740", "flac24bit": "999", "24bit": "999" });
    const SUYIN_QQ_BR = Object.freeze({ "128k": 7, "320k": 5, "flac": 4, "hires": 3, "master": 1, "24bit": 1 });
    
    // ==================== 工具函数 ====================
    function getSongId(platform, songInfo) {
        if (!songInfo || !platform) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        
        switch (platform) {
            case 'kg': return info.hash || info.songmid || info.id || info.rid;
            case 'tx': {
                const qqMeta = meta.qq || {};
                const mid = qqMeta.mid || meta.mid || info.songmid;
                if (mid) return mid;
                return qqMeta.songid || meta.songid || info.id;
            }
            case 'wy':
            case 'wycloud':
            case 'wycloudmusic':
                return info.songmid || info.id || info.songId;
            case 'kw': return info.songmid || info.id || info.rid;
            case 'mg': return info.songmid || info.id || info.cid;
            case 'sixyin': return info.songmid || info.id || info.hash;
            default: return info.songmid || info.id || info.songId;
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
        
        const mid = qqMeta.mid || meta.mid || info.songmid || (SafeUtils.isString(info.id) && !/^\d+$/.test(info.id) ? info.id : null);
        if (mid) return { type: 'mid', value: mid };
        
        const songid = qqMeta.songid || meta.songid || (typeof info.id === 'number' ? info.id : (SafeUtils.isString(info.id) && /^\d+$/.test(info.id) ? parseInt(info.id, 10) : null));
        if (songid) return { type: 'songid', value: songid };
        return null;
    }
    
    function validateUrl(url, sourceName) {
        if (!url || !SafeUtils.isString(url)) throw new Error(`${sourceName || '源'}返回空URL`);
        const trimmed = url.trim();
        if (!HTTP_REGEX.test(trimmed)) throw new Error(`${sourceName || '源'}返回非法URL格式: ${trimmed.substring(0, 50)}`);
        return trimmed;
    }
    
    function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms || 100)); }
    
    function withTimeout(promise, ms, errorMsg) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(errorMsg || '操作超时')), ms || 10000);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => { if (timeoutId !== undefined) clearTimeout(timeoutId); });
    }
    
    // ==================== HTTP 请求封装 ====================
    function httpFetch(url, options) {
        if (!url || !SafeUtils.isString(url)) return Promise.reject(new Error('Invalid URL'));
        
        return new Promise((resolve, reject) => {
            const timeout = (options && options.timeout) || CONFIG.REQUEST_TIMEOUT;
            const timer = setTimeout(() => reject(new Error(`请求超时: ${url.substring(0, 50)}...`)), timeout);
            
            try {
                request(url, options, (err, resp) => {
                    clearTimeout(timer);
                    if (err) {
                        // 【修复点2】更详细的错误信息
                        reject(new Error(`网络请求失败: ${err.message || err}`));
                        return;
                    }
                    resolve(resp || {});
                });
            } catch (e) {
                clearTimeout(timer);
                reject(e);
            }
        });
    }
    
    async function httpRequestWithRetry(url, options, retries) {
        let lastError = null;
        const maxRetries = retries || 0;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                if (i > 0) await delay(CONFIG.RETRY_DELAY * i);
                const resp = await httpFetch(url, options);
                let body = resp.body;
                if (SafeUtils.isString(body)) {
                    const trimmed = body.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try { body = JSON.parse(trimmed); } catch (e) {}
                    }
                }
                return { statusCode: resp.statusCode || 0, headers: resp.headers || {}, body: body, contentType: SafeUtils.safeGet(resp, 'headers.content-type', '') };
            } catch (e) {
                lastError = e;
                if (i < maxRetries) console.warn(`[聚合音源] 请求失败，重试 ${i + 1}/${maxRetries}: ${e.message}`);
            }
        }
        throw lastError || new Error('所有重试均失败');
    }
    
    async function httpGet(url, params, timeout) {
        const queryStr = Object.entries(params || {})
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const fullUrl = url + (queryStr ? ((url || '').includes('?') ? '&' : '?') + queryStr : '');
        const res = await httpRequestWithRetry(fullUrl, { method: 'GET', timeout });
        return res.body;
    }
    
    async function httpPost(url, body, timeout) {
        const res = await httpRequestWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: SafeUtils.isString(body) ? body : JSON.stringify(body || {}),
            timeout
        });
        return res.body;
    }
    
    async function httpGetWithFallback(urls, params, timeout) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        let lastError = null;
        for (const baseUrl of urlArray) {
            if (!baseUrl) continue;
            try { return await httpGet(baseUrl, params, timeout); } catch (e) { lastError = e; }
        }
        throw lastError || new Error('所有请求地址均失败');
    }
    
    // ==================== LRU缓存 ====================
    class LRUCache {
        constructor(maxSize, ttl) {
            this.maxSize = maxSize || 100;
            this.ttl = ttl || 300000;
            this.cache = typeof Map !== 'undefined' ? new Map() : {};
            this._useMap = typeof Map !== 'undefined';
        }
        get(key) {
            if (!key) return null;
            if (this._useMap) {
                const item = this.cache.get(key);
                if (!item) return null;
                if (Date.now() > item.expiry) { this.cache.delete(key); return null; }
                this.cache.delete(key); this.cache.set(key, item);
                return item.value;
            } else {
                const item = this.cache[key];
                if (!item) return null;
                if (Date.now() > item.expiry) { delete this.cache[key]; return null; }
                return item.value;
            }
        }
        set(key, value) {
            if (!key) return;
            if (this._useMap) {
                if (this.cache.size >= this.maxSize) {
                    try { const firstKey = this.cache.keys().next().value; if (firstKey !== undefined) this.cache.delete(firstKey); } catch (e) {}
                }
                this.cache.set(key, { value, expiry: Date.now() + this.ttl });
            } else {
                const keys = Object.keys(this.cache);
                if (keys.length >= this.maxSize) delete this.cache[keys[0]];
                this.cache[key] = { value, expiry: Date.now() + this.ttl };
            }
        }
        clear() {
            if (this._useMap) this.cache.clear();
            else this.cache = {};
        }
    }
    
    // ==================== 请求池 ====================
    class RequestPool {
        constructor(maxConcurrent) {
            this.maxConcurrent = maxConcurrent || 3;
            this.running = 0;
            this.queue = [];
        }
        async execute(fn) {
            if (!SafeUtils.isFunction(fn)) return Promise.reject(new Error('Invalid function'));
            return new Promise((resolve, reject) => {
                const task = async () => {
                    try { const result = await fn(); resolve(result); } catch (e) { reject(e); } finally { this.running--; this.next(); }
                };
                this.queue.push(task);
                this.next();
            });
        }
        next() {
            if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
            this.running++;
            const task = this.queue.shift();
            if (SafeUtils.isFunction(task)) {
                try { task(); } catch (e) { console.error('[RequestPool] 任务执行失败:', e); this.running--; this.next(); }
            }
        }
    }
    
    // ==================== 全局状态 ====================
    const state = {
        urlCache: new LRUCache(CONFIG.CACHE_MAX_SIZE, CONFIG.CACHE_TTL_URL),
        searchCache: new LRUCache(50, CONFIG.CACHE_TTL_SEARCH),
        requestPool: new RequestPool(CONFIG.CONCURRENT_LIMIT),
        stats: { hits: 0, misses: 0, requests: 0, success: 0, fail: 0 },
        activeRequests: new Map(),
        initialized: false,
        cleanupTimer: null,
        wycloudCookie: null,
        wycloudCookieExpire: 0,
        announcementSent: false,
        preloadCache: new Map()
    };
    
    function sendAnnouncement() {
        if (state.announcementSent) return;
        state.announcementSent = true;
        try {
            if (SafeUtils.isFunction(send)) {
                send(EVENT_NAMES.updateAlert, { log: ANNOUNCEMENT.content, updateUrl: ANNOUNCEMENT.repo });
            }
        } catch (e) {}
    }
    
    function startStatsCleanup() {
        const cleanup = () => {
            if (state.stats.requests > 1000) { state.stats.requests = 0; state.stats.hits = 0; state.stats.misses = 0; state.stats.success = 0; state.stats.fail = 0; }
            state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
        };
        state.cleanupTimer = setTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
    }
    
    function getWycloudCookieFromStorage() {
        try {
            if (lx && SafeUtils.isFunction(lx.getConfig)) { const cookie = lx.getConfig('wycloud_cookie'); if (cookie) return cookie; }
            if (typeof localStorage !== 'undefined') { const cookie = localStorage.getItem('wycloud_cookie'); if (cookie) return cookie; }
        } catch (e) {}
        return null;
    }
    
    function saveWycloudCookieToStorage(cookie) {
        try {
            if (lx && SafeUtils.isFunction(lx.setConfig)) lx.setConfig('wycloud_cookie', cookie);
            if (typeof localStorage !== 'undefined') localStorage.setItem('wycloud_cookie', cookie);
            state.wycloudCookie = cookie;
            state.wycloudCookieExpire = Date.now() + 86400000;
        } catch (e) {}
    }
    
    function isWycloudCookieValid() {
        if (!state.wycloudCookie) return false;
        if (Date.now() > state.wycloudCookieExpire) { state.wycloudCookie = null; return false; }
        return true;
    }
    
    async function autoGetWycloudCookie() {
        const storedCookie = getWycloudCookieFromStorage();
        if (storedCookie) { state.wycloudCookie = storedCookie; state.wycloudCookieExpire = Date.now() + 86400000; return storedCookie; }
        return null;
    }
    
    // ==================== 音源处理器类 ====================
    class SourceHandler {
        constructor(name, fn, priority, options = {}) {
            this.name = name;
            this.fn = fn;
            this.priority = priority;
            this.timeout = options.timeout || CONFIG.REQUEST_TIMEOUT;
            this.requireSource = options.requireSource || false;
            this.supportedPlatforms = options.supportedPlatforms || [];
        }
        supportsPlatform(platform) {
            if (this.supportedPlatforms.length === 0) return true;
            return this.supportedPlatforms.includes(platform);
        }
    }
    
    // ==================== ikun 音源（修复版）====================
    async function ikunGetMusicUrl(source, musicInfo, quality) {
        // 【修复点3】更健壮的ID提取
        const songId = (musicInfo || {}).hash || (musicInfo || {}).songmid || (musicInfo || {}).id;
        if (!songId) throw new Error('ikun: 缺少歌曲ID');
        
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": userAgent
        };
        // 只有 key 非空时才添加，避免服务端拒绝
        if (CONFIG.IKUN_API_KEY) {
            headers["X-Request-Key"] = CONFIG.IKUN_API_KEY;
        }
        
        const res = await httpFetch(
            `${CONFIG.IKUN_API_URL}/url?source=${source}&songId=${songId}&quality=${quality || '320k'}`,
            { method: "GET", headers, follow_max: 5 }
        );
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error("ikun: 未知响应格式");
        
        switch (body.code) {
            case 200: return body.url;
            case 403: throw new Error("ikun: Key失效/鉴权失败");
            case 500: throw new Error(`ikun: 获取URL失败 - ${body.message || "未知错误"}`);
            case 429: throw new Error("ikun: 请求过速");
            default: throw new Error(body.message || "ikun: 未知错误");
        }
    }
    
    // ==================== 通用音乐URL获取器 ====================
    function createMusicUrlFetcher(apiUrl, apiKey, name) {
        return async function(source, musicInfo, quality) {
            const songId = (musicInfo || {}).hash || (musicInfo || {}).songmid || (musicInfo || {}).id;
            if (!songId) throw new Error(`${name}: 缺少歌曲ID`);
            
            const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
            const res = await httpFetch(`${apiUrl}/url/${source}/${songId}/${quality}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'X-Request-Key': apiKey },
                follow_max: 5,
            });
            
            const body = res.body;
            if (!body || isNaN(Number(body.code))) throw new Error(`${name}: 未知响应`);
            
            switch (body.code) {
                case 0: return body.data;
                case 1: throw new Error(`${name}: IP被封禁`);
                case 2: throw new Error(`${name}: 获取URL失败`);
                case 4: throw new Error(`${name}: 远程服务器错误`);
                case 5: throw new Error(`${name}: 请求过于频繁`);
                case 6: throw new Error(`${name}: 请求参数错误`);
                default: throw new Error(body.msg || `${name}: 未知错误`);
            }
        };
    }
    
    const feimaoGetMusicUrl = createMusicUrlFetcher(CONFIG.FEIMAO_API_URL, CONFIG.FEIMAO_API_KEY, '肥猫');
    const feimaobufeiGetMusicUrl = createMusicUrlFetcher(CONFIG.FEIMAOBUFEI_API_URL, CONFIG.FEIMAOBUFEI_API_KEY, '肥猫不肥');
    const zichengGetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENG_API_URL, CONFIG.ZICHENG_API_KEY, '梓澄公益');
    const zichengqwqGetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENGQWQ_API_URL, CONFIG.ZICHENGQWQ_API_KEY, '梓澄qwq');
    const zicheng2GetMusicUrl = createMusicUrlFetcher(CONFIG.ZICHENG2_API_URL, CONFIG.ZICHENG2_API_KEY, '梓澄公益2代');
    
    // ==================== 聚合API (juhe) - 修复版 ====================
    async function juheGetMusicUrl(source, info) {
        try {
            const res = await httpPost(`${CONFIG.JUHE_API_URL}/${source}`, info || {}, CONFIG.REQUEST_TIMEOUT);
            const body = res;
            
            if (!body) throw new Error('juhe: 返回空响应');
            
            // 【修复点4】更灵活的响应解析
            if (body.code === 200) {
                const url = SafeUtils.safeGet(body, 'data.url') || body.url;
                if (url) return url;
            }
            
            if (body.code === 303) {
                try {
                    const data = SafeUtils.isString(body.data) ? JSON.parse(body.data) : body.data;
                    const reqData = data.request || {};
                    const respData = data.response || {};
                    
                    const nestedRes = await httpFetch(encodeURI(reqData.url || ''), reqData.options || {});
                    
                    let value = nestedRes;
                    const checkKeys = Array.isArray(respData.check?.key) ? respData.check.key : [];
                    for (const key of checkKeys) {
                        if (value == null) break;
                        value = value[key];
                    }
                    
                    if (value === SafeUtils.safeGet(respData, 'check.value')) {
                        let url = nestedRes;
                        const urlKeys = Array.isArray(respData.url) ? respData.url : [];
                        for (const key of urlKeys) {
                            if (url == null) break;
                            url = url[key];
                        }
                        if (url && SafeUtils.isString(url) && url.startsWith('http')) return url;
                    }
                } catch (e) {
                    throw new Error(`juhe 303处理失败: ${e.message}`);
                }
            }
            
            // 尝试直接从 body 提取 URL
            if (body.url && HTTP_REGEX.test(body.url)) return body.url;
            if (body.data && body.data.url && HTTP_REGEX.test(body.data.url)) return body.data.url;
            
            throw new Error(`juhe: ${body.msg || body.message || '获取URL失败'}`);
        } catch (e) {
            throw new Error(`juhe请求失败: ${e.message}`);
        }
    }
    
    // ==================== qorg 音源（修复版）====================
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        // 【修复点5】更全面的ID提取
        const info = songInfo || {};
        const meta = info.meta || {};
        
        let songId = info.hash || info.songmid || info.id || info.songId;
        if (!songId) songId = meta.hash || meta.songmid || meta.id;
        if (!songId && platform === 'tx') {
            const qqMeta = meta.qq || {};
            songId = qqMeta.mid || qqMeta.songid || meta.mid;
        }
        if (!songId && platform === 'wy') {
            songId = meta.songmid || meta.id || info.songmid;
        }
        
        if (!songId) throw new Error('qorg: 缺少歌曲ID - 请检查歌曲信息');
        
        let source;
        switch (platform) {
            case 'tx': source = 'qq'; break;
            case 'wy': source = 'netease'; break;
            case 'kw': source = 'kuwo'; break;
            case 'kg': source = 'kugou'; break;
            case 'mg': source = 'migu'; break;
            default: source = platform;
        }
        
        const url = `${CONFIG.QORG_API_URL}/music/url`;
        const timestamp = Date.now();
        const signData = `${source}${songId}${quality}${timestamp}`;
        const sign = md5(signData);
        
        const res = await httpPost(url, {
            source: source,
            songId: String(songId),
            quality: quality || '320k',
            timestamp: timestamp,
            sign: sign
        }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data && res.data.url) {
            const resultUrl = res.data.url;
            if (!HTTP_REGEX.test(resultUrl)) throw new Error('qorg: 返回非法URL格式');
            return resultUrl;
        }
        
        throw new Error(`qorg: ${res?.msg || res?.message || '获取失败'}`);
    }
    
    // ==================== 网易云盘 ====================
    async function wycloudGetMusicUrl(songInfo, quality) {
        const songId = songInfo.id || songInfo.songmid || songInfo.songId;
        if (!songId) throw new Error('网易云盘: 缺少歌曲ID');
        
        if (!isWycloudCookieValid()) {
            const cookie = await autoGetWycloudCookie();
            if (!cookie) throw new Error('请先设置网易云音乐Cookie');
        }
        
        const cacheKey = `wycloud_url_${songId}_${quality || '320k'}`;
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        try {
            const res = await httpPost(`${CONFIG.QORG_API_URL}/wycloud/url`, {
                songId: String(songId), quality: quality || '320k', cookie: state.wycloudCookie
            }, 15000);
            
            if (res && res.code === 200 && res.data && res.data.url) {
                const playUrl = res.data.url;
                const validated = validateUrl(playUrl, '网易云盘');
                state.urlCache.set(cacheKey, validated);
                state.stats.success++;
                return validated;
            }
            throw new Error(res?.msg || '获取播放地址失败');
        } catch (e) {
            state.stats.fail++;
            throw e;
        }
    }
    
    // ==================== 自建网易云 ====================
    const WYCLOUDMUSIC_QUALITY_MAP = Object.freeze({
        '128k': { level: 'standard', br: 128000 },
        '192k': { level: 'higher', br: 192000 },
        '320k': { level: 'higher', br: 320000 },
        'flac': { level: 'lossless', br: 999000 }
    });
    
    async function wycloudmusicGetMusicUrl(songInfo, quality) {
        const songId = songInfo.id || songInfo.songmid;
        if (!songId) throw new Error('自建网易云: 缺少歌曲ID');
        
        const q = (quality || '128k').toLowerCase();
        const config = WYCLOUDMUSIC_QUALITY_MAP[q] || WYCLOUDMUSIC_QUALITY_MAP['128k'];
        
        const cacheKey = `wycloudmusic_url_${songId}_${q}`;
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        try {
            const res = await httpGet(`${CONFIG.WYCLOUDMUSIC_API_URL}/song/url?id=${songId}&br=${config.br}`, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data && Array.isArray(res.data) && res.data.length > 0) {
                const playUrl = res.data[0].url || null;
                if (playUrl && HTTP_REGEX.test(playUrl)) {
                    state.urlCache.set(cacheKey, playUrl);
                    state.stats.success++;
                    return playUrl;
                }
            }
        } catch (e) {
            console.warn('[自建网易云] 获取URL失败:', e.message);
        }
        state.stats.fail++;
        throw new Error('自建网易云: 获取播放地址失败');
    }
    
    // ==================== 星海API ====================
    async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.main;
        if (!source) throw new Error('星海主API不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('星海主API: 缺少歌曲ID');
        
        const selectedQuality = quality || '320k';
        const br = QUALITY_TO_BR[selectedQuality] || '320';
        
        const params = Object.assign({}, API_ENDPOINTS.xinghaiMain.params, { source, id: String(id), br });
        const res = await httpGet(API_ENDPOINTS.xinghaiMain.base, params);
        if (!res || typeof res !== 'object' || !res.url) throw new Error(res?.message || '星海主API未返回URL');
        return res.url;
    }
    
    async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.backup;
        if (!source) throw new Error('星海备API不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('星海备API: 缺少歌曲ID');
        
        const res = await httpGet(API_ENDPOINTS.xinghaiBackup.base, { source, id: String(id), type: 'url', br: quality || '320k' });
        if (SafeUtils.isString(res) && HTTP_REGEX.test(res)) return res;
        if (res?.url) return res.url;
        throw new Error('星海备API未返回URL');
    }
    
    // ==================== 溯音API ====================
    async function suyinQQGetUrl(songInfo, quality) {
        const qqId = getQQSongId(songInfo);
        if (!qqId) throw new Error('溯音QQ: 缺少歌曲ID');
        
        const normalizedQuality = String(quality || '128k').toLowerCase();
        const startBr = SUYIN_QQ_BR[normalizedQuality] || 7;
        const brList = [...new Set([startBr, 4, 5, 7])].sort((a, b) => a - b);
        
        let lastError = null;
        for (const br of brList) {
            try {
                const params = { key: API_ENDPOINTS.suyin.qq.key, type: 'json', br, n: 1 };
                if (qqId.type === 'mid') params.mid = qqId.value;
                else params.songid = qqId.value;
                
                const res = await httpGet(API_ENDPOINTS.suyin.qq.url, params);
                if (res?.music) return res.music;
                if (res?.url) return res.url;
                throw new Error('未找到音频链接');
            } catch (e) { lastError = e; }
        }
        throw new Error(`溯音QQ失败: ${lastError?.message || lastError}`);
    }
    
    async function suyinWyGetUrl(songInfo) {
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        if (!id) throw new Error('溯音网易云: 缺少歌曲ID');
        const res = await httpGet(API_ENDPOINTS.suyin.wy.url, { id: String(id) });
        if (res?.code === 0 && res?.data) {
            const item = Array.isArray(res.data) ? res.data[0] : res.data;
            if (item?.url) return item.url;
        }
        if (res?.url) return res.url;
        throw new Error('溯音网易云获取失败');
    }
    
    async function suyinKwGetUrl(songInfo) {
        const name = (songInfo || {}).name || (songInfo || {}).title;
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        if (!name && !id) throw new Error('溯音酷我: 需要歌曲名或ID');
        const params = id ? { id: String(id), n: 1, br: 1 } : { msg: name, n: 1, br: 1 };
        const res = await httpGet(API_ENDPOINTS.suyin.kw.url, params);
        if (res?.data?.url) return res.data.url;
        if (res?.url) return res.url;
        throw new Error('溯音酷我未找到链接');
    }
    
    async function suyinMgGetUrl(songInfo) {
        const name = (songInfo || {}).name || (songInfo || {}).title;
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        if (!name && !id) throw new Error('溯音咪咕: 需要歌曲名或ID');
        const params = id ? { id: String(id), n: 1, num: 1, type: 'json' } : { gm: name, n: 1, num: 1, type: 'json' };
        const res = await httpGet(API_ENDPOINTS.suyin.mg.url, params);
        if (res?.code === 200 && res?.musicInfo) return res.musicInfo;
        if (res?.url) return res.url;
        throw new Error('溯音咪咕未找到链接');
    }
    
    async function suyinGetUrl(platform, songId, quality, songInfo) {
        switch (platform) {
            case 'tx': return suyinQQGetUrl(songInfo, quality);
            case 'wy': return suyinWyGetUrl(songInfo);
            case 'kw': return suyinKwGetUrl(songInfo, quality);
            case 'mg': return suyinMgGetUrl(songInfo);
            default: throw new Error('溯音不支持该平台');
        }
    }
    
    // ==================== 六音音源 ====================
    async function sixyinGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('六音音源: 缺少歌曲ID');
        
        let type;
        switch (platform) {
            case 'tx': type = 'qq'; break;
            case 'wy': type = 'netease'; break;
            case 'kw': type = 'kuwo'; break;
            case 'kg': type = 'kugou'; break;
            case 'mg': type = 'migu'; break;
            default: throw new Error('六音音源: 不支持该平台');
        }
        
        const apiUrl = `${API_ENDPOINTS.sixyin}/url?type=${type}&id=${id}&quality=${quality || '320k'}`;
        const res = await httpGet(apiUrl);
        if (!res || !res.url) throw new Error('六音音源: 未返回有效播放地址');
        return validateUrl(res.url, '六音音源');
    }
    
    // ==================== 独家音源 ====================
    async function dusiyinyuanGetUrl(platform, songInfo, quality) {
        const source = PLATFORM_TO_SOURCE[platform]?.dusiyinyuan;
        if (!source) throw new Error(`独家音源不支持平台: ${platform}`);
        
        const songId = getSongId(platform, songInfo);
        if (!songId) throw new Error('独家音源: 缺少歌曲ID');
        
        const qualityMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': 'flac', '24bit': '24bit', 'flac24bit': '24bit' };
        const br = qualityMap[quality] || '320';
        
        const endpoints = [API_ENDPOINTS.dusiyinyuan.base, API_ENDPOINTS.dusiyinyuan.fallback];
        let lastError = null;
        
        for (const baseUrl of endpoints) {
            try {
                const response = await httpFetch(`${baseUrl}/url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': `lx-music/${version}` },
                    body: JSON.stringify({ source, songId: String(songId), br })
                });
                const body = response.body;
                if (body && body.code === 200 && body.data && body.data.url && HTTP_REGEX.test(body.data.url)) {
                    return body.data.url;
                }
            } catch (e) { lastError = e; }
        }
        throw lastError || new Error('独家音源所有端点均失败');
    }
    
    // ==================== 长青SVIP / 念心SVIP ====================
    function qualityToLevel(quality) {
        const q = String(quality || '128k').toLowerCase();
        if (q.includes('128')) return '128';
        if (q.includes('320')) return '320';
        if (q.includes('flac') || q.includes('24bit')) return 'flac';
        return '128';
    }
    
    async function changqingGetUrl(platform, songId, quality, songInfo) {
        const template = API_ENDPOINTS.changqing[platform];
        if (!template) throw new Error('长青SVIP不支持该平台');
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('长青SVIP: 缺少歌曲ID');
        const level = qualityToLevel(quality);
        return template.replace('{id}', encodeURIComponent(String(id))).replace('{level}', encodeURIComponent(level));
    }
    
    async function nianxinGetUrl(platform, songId, quality, songInfo) {
        const template = API_ENDPOINTS.nianxin[platform];
        if (!template) throw new Error('念心SVIP不支持该平台');
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('念心SVIP: 缺少歌曲ID');
        const level = qualityToLevel(quality);
        return template.replace('{id}', encodeURIComponent(String(id))).replace('{level}', encodeURIComponent(level));
    }
    
    // ==================== 野花野草 ====================
    async function flowerGrassGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('野花野草: 缺少歌曲ID');
        
        const sources = [API_ENDPOINTS.flower, API_ENDPOINTS.grass].filter(Boolean);
        let lastError = null;
        for (const baseUrl of sources) {
            try {
                const url = `${baseUrl}/url/${platform}/${id}/${quality || '320k'}`;
                const res = await httpGet(url);
                if (res?.url) return res.url;
            } catch (e) { lastError = e; }
        }
        throw new Error(`野花野草失败: ${lastError?.message || lastError}`);
    }
    
    // ==================== Meting备用API ====================
    function qualityToBr(quality) {
        const brMap = { '128k': '128', '192k': '192', '320k': '320', 'flac': '999', '24bit': '999' };
        return brMap[quality] || '320';
    }
    
    async function metingGetUrl(platform, songId, quality, songInfo) {
        const metingServer = PLATFORM_TO_SOURCE[platform]?.meting;
        if (!metingServer) throw new Error('Meting不支持该平台');
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('Meting: 缺少歌曲ID');
        const br = qualityToBr(quality);
        const template = API_ENDPOINTS.backup[platform];
        if (!template) throw new Error('无Meting模板');
        
        const url = template.replace('{id}', id).replace('{br}', br);
        const res = await httpGet(url);
        if (res?.url) return res.url;
        if (SafeUtils.isString(res) && HTTP_REGEX.test(res)) return res;
        throw new Error('Meting获取失败');
    }
    
    // ==================== 汽水VIP ====================
    async function qishuiGetUrl(songInfo, quality) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) throw new Error('汽水VIP: 缺少歌曲ID');
        
        const normalizedQuality = (() => {
            const q = String(quality || '128k').toLowerCase();
            if (q === '128k') return 'low';
            if (q === '320k') return 'standard';
            return 'lossless';
        })();
        
        const res = await httpGetWithFallback(
            [API_ENDPOINTS.qishui.https, API_ENDPOINTS.qishui.http].filter(Boolean),
            { act: 'song', id: String(songId), quality: normalizedQuality },
            CONFIG.REQUEST_TIMEOUT
        );
        
        const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (!data?.url) throw new Error('汽水VIP未返回URL');
        
        if (!data.ekey) return String(data.url);
        
        const proxyUrls = [API_ENDPOINTS.qishui.proxy, API_ENDPOINTS.qishui.backupProxy].filter(Boolean);
        for (const proxyUrl of proxyUrls) {
            for (let i = 0; i <= CONFIG.MAX_RETRIES; i++) {
                try {
                    if (i > 0) await delay(CONFIG.RETRY_DELAY * i * 1.5);
                    const proxyRes = await httpPost(proxyUrl, { url: data.url, key: data.ekey, filename: data.filename || 'KMusic', ext: data.fileExtension || 'aac' }, CONFIG.DECRYPT_TIMEOUT);
                    if (Number(proxyRes?.code) === 200 && proxyRes?.url) return String(proxyRes.url);
                    if (Number(proxyRes?.code) === 202) { await delay(2000); continue; }
                } catch (e) {}
            }
        }
        return String(data.url);
    }
    
    // ==================== 注册所有音源处理器 ====================
    const SOURCE_HANDLERS = [
        new SourceHandler('ikun', ikunGetMusicUrl, 1, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('聚合API', juheGetMusicUrl, 2, { timeout: 15000 }),
        new SourceHandler('qorg', qorgGetMusicUrl, 3, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg', 'qorg'] }),
        new SourceHandler('网易云盘', wycloudGetMusicUrl, 4, { timeout: 15000, supportedPlatforms: ['wycloud'] }),
        new SourceHandler('自建网易云', wycloudmusicGetMusicUrl, 5, { timeout: 15000, supportedPlatforms: ['wycloudmusic'] }),
        new SourceHandler('星海主', xinghaiMainGetUrl, 6, { timeout: 15000 }),
        new SourceHandler('星海备', xinghaiBackupGetUrl, 7, { timeout: 15000 }),
        new SourceHandler('溯音', suyinGetUrl, 8, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'mg'] }),
        new SourceHandler('六音', sixyinGetUrl, 9, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('独家音源', dusiyinyuanGetUrl, 10, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('长青SVIP', changqingGetUrl, 11, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('念心SVIP', nianxinGetUrl, 12, { timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('野花野草', flowerGrassGetUrl, 13, { timeout: 15000 }),
        new SourceHandler('Meting', metingGetUrl, 14, { timeout: 15000, supportedPlatforms: ['tx', 'wy'] }),
        new SourceHandler('汽水VIP', qishuiGetUrl, 15, { timeout: 20000 }),
        new SourceHandler('肥猫', feimaoGetMusicUrl, 16, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('肥猫不肥', feimaobufeiGetMusicUrl, 17, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('梓澄公益', zichengGetMusicUrl, 18, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('梓澄qwq', zichengqwqGetMusicUrl, 19, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] }),
        new SourceHandler('梓澄公益2代', zicheng2GetMusicUrl, 20, { requireSource: true, timeout: 15000, supportedPlatforms: ['tx', 'wy', 'kw', 'kg', 'mg'] })
    ];
    
    // ==================== 构建音源链 ====================
    function buildSourceChain(platform) {
        const chain = SOURCE_HANDLERS.filter(handler => handler.supportsPlatform(platform));
        chain.sort((a, b) => a.priority - b.priority);
        return chain;
    }
    
    // ==================== 主获取函数（带自动切换音源）====================
    async function getUrlWithFallback(platform, songInfo, quality) {
        if (!platform || !PLATFORMS.includes(platform) && !['qishui', 'qorg', 'wycloud', 'wycloudmusic'].includes(platform)) {
            throw new Error(`不支持的平台: ${platform}`);
        }
        if (!songInfo || typeof songInfo !== 'object') throw new Error('无效的歌曲信息');
        
        const resolvedQuality = quality || '320k';
        const songId = getSongId(platform, songInfo);
        
        const cacheKey = SafeUtils.buildCacheKey(platform, songInfo, resolvedQuality);
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const requestKey = `${platform}_${cacheKey}`;
        if (state.activeRequests.has(requestKey)) return state.activeRequests.get(requestKey);
        
        const chain = buildSourceChain(platform);
        if (chain.length === 0) throw new Error(`平台 ${platform} 没有可用的音源`);
        
        const promise = (async () => {
            const errors = [];
            for (const handler of chain) {
                try {
                    console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                    let url;
                    const timeout = handler.timeout || CONFIG.REQUEST_TIMEOUT;
                    
                    if (handler.requireSource) {
                        const source = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
                        url = await withTimeout(handler.fn(source, songInfo, resolvedQuality), timeout, `${handler.name} 超时`);
                    } else if (handler.name === '聚合API') {
                        const juheInfo = { musicInfo: songInfo, type: resolvedQuality };
                        url = await withTimeout(handler.fn(platform, juheInfo), timeout, `${handler.name} 超时`);
                    } else if (['汽水VIP', '网易云盘', '自建网易云'].includes(handler.name)) {
                        url = await withTimeout(handler.fn(songInfo, resolvedQuality), timeout, `${handler.name} 超时`);
                    } else {
                        url = await withTimeout(handler.fn(platform, songId, resolvedQuality, songInfo), timeout, `${handler.name} 超时`);
                    }
                    
                    const validated = validateUrl(url, handler.name);
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    console.log(`[聚合音源] ${handler.name} 成功`);
                    return validated;
                } catch (e) {
                    errors.push(`${handler.name}: ${e.message}`);
                    console.warn(`[聚合音源] ${handler.name} 失败: ${e.message}`);
                }
            }
            state.stats.fail++;
            throw new Error(`所有音源均失败: ${errors.join('; ')}`);
        })();
        
        state.activeRequests.set(requestKey, promise);
        try { return await promise; } finally { state.activeRequests.delete(requestKey); }
    }
    
    // ==================== 预加载下一首 ====================
    async function preloadNextSong(platform, nextSongInfo, quality) {
        if (!CONFIG.PRELOAD_NEXT_ENABLED) return;
        if (!nextSongInfo || !platform) return;
        
        const cacheKey = SafeUtils.buildCacheKey(platform, nextSongInfo, quality || '320k');
        if (state.preloadCache.has(cacheKey)) return;
        state.preloadCache.set(cacheKey, true);
        
        console.log(`[聚合音源] 预加载下一首: ${nextSongInfo.name || '未知'}`);
        try {
            const url = await withTimeout(getUrlWithFallback(platform, nextSongInfo, quality), CONFIG.PRELOAD_TIMEOUT, '预加载超时');
            console.log(`[聚合音源] 预加载成功: ${(url || '').substring(0, 60)}`);
        } catch (e) {
            console.warn(`[聚合音源] 预加载失败: ${e.message}`);
        } finally {
            setTimeout(() => state.preloadCache.delete(cacheKey), 60000);
        }
    }
    
    // ==================== 搜索功能 ====================
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        
        const cacheKey = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const url = `${CONFIG.QORG_API_URL}/music/search`;
        const res = await httpPost(url, { keyword, page, pageSize }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data) {
            const list = (res.data.list || []).map(item => ({
                id: String(item.id || ''),
                songmid: String(item.id || ''),
                name: item.name || '未知歌曲',
                singer: item.singer || item.artist || '未知歌手',
                albumName: item.album || '',
                duration: item.duration || 0,
                pic: item.pic || item.cover || '',
                _source: 'qorg'
            }));
            const result = { isEnd: list.length < pageSize, list, total: res.data.total || list.length, page, limit: pageSize };
            state.searchCache.set(cacheKey, result);
            return result;
        }
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }
    
    async function qorgGetLyric(songInfo) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) return { lyric: '' };
        
        const url = `${CONFIG.QORG_API_URL}/music/lyric`;
        try {
            const res = await httpPost(url, { songId: String(songId) }, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data) return { lyric: res.data.lyric || '' };
        } catch (e) {}
        return { lyric: '' };
    }
    
    // ==================== 平台配置 ====================
    const platformQualityMap = Object.freeze({
        tx: ['24bit', 'flac', '320k', '192k', '128k'],
        wy: ['24bit', 'flac', '320k', '192k', '128k'],
        kw: ['24bit', 'flac', '320k', '192k', '128k'],
        kg: ['24bit', 'flac', '320k', '192k', '128k'],
        mg: ['24bit', 'flac', '320k', '192k', '128k'],
        qishui: ['128k', '320k', 'flac', 'flac24bit'],
        qorg: ['128k', '320k', 'flac', 'flac24bit'],
        wycloud: ['128k', '320k', 'flac', 'flac24bit'],
        wycloudmusic: ['128k', '192k', '320k', 'flac']
    });
    
    const platformNames = Object.freeze({
        tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐',
        kg: '酷狗音乐', mg: '咪咕音乐', qishui: '汽水VIP',
        qorg: 'qorg音源', wycloud: '网易云盘', wycloudmusic: '自建网易云'
    });
    
    const sourceConfig = {};
    Object.keys(platformQualityMap).forEach(platform => {
        const actions = ['musicUrl'];
        if (platform === 'qishui') actions.push('musicSearch', 'lyric');
        if (platform === 'qorg') actions.push('musicSearch', 'lyric');
        if (platform === 'wycloud') actions.push('musicSearch', 'lyric', 'getList', 'setCookie', 'testCookie', 'getCookieStatus');
        if (platform === 'wycloudmusic') actions.push('musicSearch', 'lyric');
        sourceConfig[platform] = {
            name: platformNames[platform] || platform,
            type: 'music',
            actions: actions,
            qualitys: platformQualityMap[platform] || ['128k', '320k']
        };
    });
    
    // ==================== 事件监听 ====================
    function setupEventListener() {
        const handleRequest = async ({ action, source, info }) => {
            state.stats.requests++;
            
            try {
                if (action === 'preloadNext') {
                    const { platform, musicInfo, quality } = info || {};
                    preloadNextSong(platform, musicInfo, quality).catch(e => console.warn('[预加载] 失败:', e.message));
                    return { success: true };
                }
                
                if (source === 'qorg') {
                    if (action === 'musicSearch' || action === 'search') {
                        const keyword = info?.keyword ? String(info.keyword) : '';
                        const page = info?.page ? Number(info.page) : 1;
                        const pageSize = info?.pagesize ? Number(info.pagesize) : 30;
                        return await qorgSearch(keyword, page, pageSize);
                    }
                    if (action === 'musicUrl') {
                        if (!info?.musicInfo) throw new Error('请求参数不完整');
                        const url = await qorgGetMusicUrl(source, info.musicInfo, info.type);
                        return validateUrl(url, 'qorg');
                    }
                    if (action === 'lyric') return await qorgGetLyric(info?.musicInfo || {});
                }
                
                if (source === 'wycloud') {
                    if (action === 'musicUrl') {
                        if (!info?.musicInfo) throw new Error('请求参数不完整');
                        const url = await wycloudGetMusicUrl(info.musicInfo, info.type);
                        return validateUrl(url, '网易云盘');
                    }
                }
                
                if (source === 'wycloudmusic') {
                    if (action === 'musicUrl') {
                        if (!info?.musicInfo) throw new Error('请求参数不完整');
                        const url = await wycloudmusicGetMusicUrl(info.musicInfo, info.type);
                        if (!url) throw new Error('获取播放地址失败');
                        return validateUrl(url, '自建网易云');
                    }
                }
                
                if (action === 'musicUrl') {
                    if (!info?.musicInfo) throw new Error('请求参数不完整');
                    const musicInfo = info.musicInfo || {};
                    const platform = musicInfo._source || source;
                    const quality = info.type || '320k';
                    
                    console.log(`[聚合音源] 请求: ${platform} - ${musicInfo.name || '未知'} - ${quality}`);
                    const url = await getUrlWithFallback(platform, musicInfo, quality);
                    console.log(`[聚合音源] 成功: ${(url || '').substring(0, 60)}...`);
                    return url;
                }
                
                throw new Error(`不支持的操作: ${action}`);
            } catch (e) {
                console.error(`[聚合音源] 请求失败: ${e.message}`);
                throw e;
            }
        };
        
        try {
            on(EVENT_NAMES.request, handleRequest);
            console.log('[聚合音源] 事件监听已注册');
        } catch (e) {
            console.warn('[聚合音源] 事件监听注册失败，尝试备用方案');
            try { on('request', handleRequest); } catch (e2) {
                console.error('[聚合音源] 所有事件注册方式均失败');
            }
        }
    }
    
    // ==================== 初始化 ====================
    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('[聚合音源·超级整合版（修复版）+ 自建网易云] v7.1.1-fix 初始化中...');
        console.log(`[聚合音源] 开源地址: ${ANNOUNCEMENT.repo}`);
        console.log(`[聚合音源] 交流群: ${ANNOUNCEMENT.qqGroup}`);
        console.log('[聚合音源] 已修复: ikun API Key问题 / 聚合API响应解析 / qorg歌曲ID提取');
        console.log('[聚合音源] 已集成: ikun, 聚合API, qorg, 星海, 溯音, 六音, 独家音源, 长青SVIP, 念心SVIP, 野花野草, Meting, 汽水VIP, 肥猫系列, 梓澄系列, 网易云盘, 自建网易云');
        
        startStatsCleanup();
        setupEventListener();
        
        autoGetWycloudCookie().catch(e => console.warn('[网易云盘] Cookie加载失败:', e.message));
        sendAnnouncement();
        
        try {
            if (SafeUtils.isFunction(send)) {
                send(EVENT_NAMES.inited, {
                    openDevTools: false,
                    sources: sourceConfig,
                    status: {
                        version: '7.1.1-fix',
                        stats: state.stats,
                        config: {
                            timeout: CONFIG.REQUEST_TIMEOUT,
                            retries: CONFIG.MAX_RETRIES,
                            concurrentLimit: CONFIG.CONCURRENT_LIMIT,
                            preloadNextEnabled: CONFIG.PRELOAD_NEXT_ENABLED,
                            repo: ANNOUNCEMENT.repo,
                            qqGroup: ANNOUNCEMENT.qqGroup
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[聚合音源] send inited 事件失败:', e.message);
        }
        
        console.log('[聚合音源·超级整合版（修复版）+ 自建网易云] v7.1.1-fix 已加载');
        console.log('[聚合音源] 支持平台:', Object.keys(sourceConfig).join(', '));
    }
    
    // ==================== 启动 ====================
    initialize().catch(e => console.error('[聚合音源] 初始化失败:', e));
    
})();