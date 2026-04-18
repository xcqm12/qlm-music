/**
 * @name 七零喵聚合音源 · 超级整合版（完整版）
 * @description 整合ikun + 聚合API + 多源回退 + 六音音源 + 独家音源 + 梓澄公益音源 + 肥猫音源 + 小熊猫音源 + 無名音源 + qorg音源 + 网易云盘，智能缓存，相似歌曲搜索
 * @version 7.0.3 - 完整整合版（新增网易云音乐云盘搜索播放）
 * @author 整合优化版 + 六音 + 洛雪科技(独家音源) + 肥猫 + 小熊猫 + 梓澄 + qorg
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
        title: "七零喵聚合音源 v7.0.3",
        content: "开源地址: https://github.com/xcqm12/qlm-music\n交流群: 1006981142\n已启用qorg API + 网易云音乐云盘搜索播放，增强稳定性与安全性",
        version: "7.0.3",
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
            return;
        }
    }
    
    if (!on) {
        on = function(event, handler) {
            console.warn('[聚合音源] on 方法不可用，事件监听将不会生效');
        };
    }
    if (!send) {
        send = function(event, data) {
            console.log('[聚合音源] send 方法不可用:', event, data);
        };
    }
    
    // ==================== 安全工具函数 ====================
    const safeIncludes = (arr, value) => {
        if (!Array.isArray(arr)) return false;
        return arr.includes(value);
    };
    
    const safeArray = (value) => {
        return Array.isArray(value) ? value : [];
    };
    
    const safeStringIncludes = (str, search) => {
        if (typeof str !== 'string') return false;
        if (typeof search !== 'string') return false;
        return str.includes(search);
    };
    
    const safeStartsWith = (str, search) => {
        if (typeof str !== 'string') return false;
        if (typeof search !== 'string') return false;
        return str.startsWith(search);
    };
    
    const safeGet = (obj, path, defaultValue) => {
        if (obj == null) return defaultValue;
        const keys = Array.isArray(path) ? path : path.split('.');
        let result = obj;
        for (const key of keys) {
            if (result == null) return defaultValue;
            result = result[key];
        }
        return result !== undefined ? result : defaultValue;
    };
    
    // ==================== 防冲突标识 ====================
    const SCRIPT_ID = 'qlm_music_source_v7_0_3_' + Date.now();
    if (globalObj[SCRIPT_ID]) {
        console.warn('[聚合音源] 检测到重复加载，跳过初始化');
        return;
    }
    globalObj[SCRIPT_ID] = true;
    
    // ==================== 安全定时器封装 ====================
    const safeSetTimeout = (fn, ms) => {
        if (typeof setTimeout === 'function') {
            return setTimeout(fn, ms);
        }
        if (typeof Promise === 'function') {
            let timerId = { _cleared: false };
            Promise.resolve().then(() => {
                return new Promise(resolve => {
                    const start = Date.now();
                    const check = () => {
                        if (timerId._cleared) return;
                        if (Date.now() - start >= ms) {
                            resolve();
                        } else {
                            if (typeof setImmediate === 'function') setImmediate(check);
                            else if (typeof setTimeout === 'function') setTimeout(check, 10);
                        }
                    };
                    check();
                });
            }).then(() => {
                if (!timerId._cleared && typeof fn === 'function') fn();
            });
            return timerId;
        }
        return null;
    };
    
    const safeClearTimeout = (timer) => {
        if (timer === null || timer === undefined) return;
        if (typeof clearTimeout === 'function' && typeof timer === 'number') {
            clearTimeout(timer);
        } else if (timer && typeof timer === 'object') {
            timer._cleared = true;
        }
    };
    
    // ==================== 延迟函数 ====================
    const delay = (ms) => {
        return new Promise(resolve => safeSetTimeout(resolve, ms || 100));
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
        
        // 网易云音乐云盘配置
        NETEASE_CLOUD_ENABLED: true,
        NETEASE_CLOUD_COOKIE: "_ntes_nnid=53b32208d3ff4825ff51d9f5ce806c98,1769180254932; _ntes_nuid=53b32208d3ff4825ff51d9f5ce806c98; NMTID=00OOaxZpza_Cxj1Y0CWrpkk8PxmwgQAAAGb61xCIA; WEVNSM=1.0.0; WNMCID=yridtn.1769180256068.01.0; __snaker__id=XONHI2Gv80iNHZ7Z; WM_TID=oMlXAq8tKP9BAAUAUQaH2qjeM7QpK88Y; _iuqxldmzr_=32; ntes_kaola_ad=1; NTES_P_UTID=SL9imFoa8rYLTnjVYulzxKhb8y7KdyaJ|1771482585; P_INFO=m18651415610@163.com|1771482585|1|phoenix_client|00&99|jis&1771231192&ntesgod_app#jis&320600#10#0#0|186610&1|godlike_app&ntesgod_app|18651415610@163.com; timing_user_id=time_DH7EWvPb5c; __csrf=ace47455bd906e2ad7fe4cc7d8037df7; ntes_utid=tid._.jwb%252F%252BPn0SKZFVwFAVFfG27jbMrEr96km._.0.%2C.edd._.._.0; WM_NI=wmTqWxKPadpv2R1Sl%2FL71iPeMqaPPSgsHfRDh5gFoFhw%2BdtTQNwudVJTuUy3dzKramThieOCi2AEAVSXSFGJfZMZoEgm1BM6IGeBVCDCyguAITGs%2BucZMoLOfHCVGQLHRzc%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eed3ea59a5bb8f9ad03fbbb88fa7d45a839a8f86cb40adb99cb8c94089e9a891d02af0fea7c3b92ab5b39c92d6748990af85f37ef28effb4ef2590e9ff8ad36f8fafafb1d359a5ad8887d150aceba9a7ee4eaca9e585f7609392b996e75e8a8cbbb6fc39a8a68593e46798b8a786ce49abee8fa6c45e91889da7c642a68683bbee4fa5b3ffa3d03e8b99aba3d549889db788f84b8b8c8994aa7fa1868390cf45a6988db7c65b90989e9be237e2a3; sDeviceId=YD-3OtYltVMdiJBBlRQUALW00QfWedU6OPa; JSESSIONID-WYYY=8tMWv360o7EIv6ni6viplheh4Qqtph8TD7FMFfOXRATW5GCiJwm8hldwhhkk1l7cDiiypgDnTrCyeGrD6kqMvNbYJhnIgzN%2B8dZrPpqmQ8Fs%2B8SsshuVc9%2BwXMjliaB%2BB4SYTVFRPxT%2BjM6xscrumbSNhghHnGqV83Je7ZxuiSJVSMhY%3A1776555101080; gdxidpyhxdE=S6ckMD1I59fzIq2mcYwO%2B4VZ%2B8U8PfUma2GxE8SxygCCDvmuyloO98TxhOuSUb2pZaBvafz1Av2C2iRBANnAyd%2F8YarYixKetVlVcQYXPRZK6eRnQTeIH%2FbPE%2Ff6CL8In%5Cjcs0AuQ0SZBYKBqX3Q8SRbYJWfZi5VSQmeB1rf%2BYxCRSOf%3A1776554702285; __csrf=ac6803ad8d0db7317192d383647bcaaa; MUSIC_U=00B796682748D09558E2ABEB6FBD4AA522F7DCF616DEE627874471536C93E70252168B237C84F13A5319DBCF0CCB01A10B8DA408D0CFDAD390DD530BAD2FDBC1E601B69C9A54B37FD1D9920201ECA320EBE4B5AD3586E4F97376D20309CC70653C182CA345A63256963297B872FE906EBFD1E5D374703CB7609C68E0882336534F86F8B52AB9311F0551B610A45B1138B3E284CB2B78A98E86AD070D5274BD3532EC94A671542B90E998DF3CF9B697A8AC9D4F225091CC6F6B591A1C3B5C96E41BE342216FC1F772AFBEA054FA75BFFB7D35681097CEAADB42606BED6476E4FC6374A9393DBC2F4BFA58B108851F6131BE1A18161CB41879B698063E1980326FEF55695077247856B0FEAA11C89A24E91D66E4BB40EF1924BE95EB2B3437951819236090CECEE6C07653775FBFFAD948ED1D3B452AF78AC5B759F84C214ACA9303268733F678B3262D20ECA60DA7B197C157FB837595C4A29BB6A048CCA90AE7A5DC431FEF70186C422B1385632BE8A1BB12A753771AE8F068F48745E7B24539C633646D511F06EA6D6F21E16CE76618930AB33E531C52FC599DF627F5FDD2ACCE", // 用户可配置的Cookie
        
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
        STATS_CLEANUP_INTERVAL: 300000
    };
    
    const QUALITY_LEVELS = ['24bit', 'flac', '320k', '192k', '128k'];
    const PLATFORMS = ['tx', 'wy', 'kw', 'kg', 'mg', 'sixyin', 'local', 'qorg', 'wycloud'];
    
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
                wycloud_search: "/wycloud/search",  // 网易云盘搜索
                wycloud_url: "/wycloud/url",        // 网易云盘获取URL
                wycloud_lyric: "/wycloud/lyric"     // 网易云盘歌词
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
            c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E);
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
                const qqMeta = meta.qq || {};
                const mid = qqMeta.mid || meta.mid || info.songmid;
                if (mid) return mid;
                return qqMeta.songid || meta.songid || info.id;
            case 'wy':
                return info.songmid || info.id || info.songId;
            case 'kw':
                return info.songmid || info.id || info.rid;
            case 'mg':
                return info.songmid || info.id || info.cid;
            case 'wycloud':
                return info.songmid || info.id || info.fileId || info.cloudId;
            case 'sixyin':
                return info.songmid || info.id || info.hash;
            default:
                return info.songmid || info.id || info.songId;
        }
    }
    
    function getHashOrMid(songInfo) {
        if (!songInfo) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        return info.hash || info.songmid || info.id || info.fileId || meta.hash || meta.songmid || null;
    }
    
    function getQQSongId(songInfo) {
        if (!songInfo) return null;
        const info = songInfo || {};
        const meta = info.meta || {};
        const qqMeta = meta.qq || {};
        
        const mid = qqMeta.mid || meta.mid || info.songmid ||
            (typeof info.id === 'string' && !/^\d+$/.test(info.id) ? info.id : null);
        if (mid) return { type: 'mid', value: mid };
        
        const songid = qqMeta.songid || meta.songid ||
            (typeof info.id === 'number' ? info.id :
             (typeof info.id === 'string' && /^\d+$/.test(info.id) ? parseInt(info.id, 10) : null));
        if (songid) return { type: 'songid', value: songid };
        return null;
    }
    
    // ==================== 音质选择 ====================
    function selectQuality(requested, available) {
        const availableList = safeArray(available);
        if (availableList.length === 0) return '128k';
        
        const req = String(requested || '128k').toLowerCase();
        if (safeIncludes(availableList, req)) return req;
        
        const priority = QUALITY_LEVELS;
        const idx = priority.indexOf(req);
        const start = idx >= 0 ? idx : priority.length - 1;
        
        for (let i = start; i < priority.length; i++) {
            if (safeIncludes(availableList, priority[i])) return priority[i];
        }
        for (let i = priority.length - 1; i >= 0; i--) {
            if (safeIncludes(availableList, priority[i])) return priority[i];
        }
        return availableList[0] || '128k';
    }
    
    function qualityToLevel(quality) {
        const q = String(quality || '128k').toLowerCase();
        if (q === 'flac' || q === 'flac24bit' || q === 'hires' || q === 'master' || q === '24bit') return 'lossless';
        if (q === '320k' || q === '192k') return 'exhigh';
        return 'standard';
    }
    
    function qualityToBr(quality) {
        const q = String(quality || '128k').toLowerCase();
        if (q === '24bit' || q === 'flac24bit') return '999000';
        if (q === 'flac') return '999000';
        if (q === '320k') return '320000';
        if (q === '192k') return '192000';
        return '128000';
    }
    
    function validateUrl(url, sourceName) {
        if (!url || typeof url !== 'string') throw new Error(`${sourceName || '源'}返回空URL`);
        const trimmed = url.trim();
        if (!HTTP_REGEX.test(trimmed)) throw new Error(`${sourceName || '源'}返回非法URL格式`);
        return trimmed;
    }
    
    function buildCacheKey(prefix, songInfo, quality) {
        if (!prefix) prefix = 'default';
        const info = songInfo || {};
        const name = info.name || info.title || '';
        const singer = info.singer || info.artist || '';
        const album = info.albumName || info.album || '';
        const id = getHashOrMid(songInfo) || '';
        return `${prefix}_${id}_${name}_${singer}_${album}_${quality || ''}`;
    }
    
    function normalizeKeyword(keyword) {
        if (!keyword) return "";
        return String(keyword)
            .replace(/\(\s*Live\s*\)/gi, "")
            .replace(/\([^)]*\)/g, "")
            .replace(/（[^）]*）/g, "")
            .replace(/【[^】]*】/g, "")
            .replace(/\[[^\]]*\]/g, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\u4e00-\u9fa5]/g, "")
            .trim()
            .toLowerCase();
    }
    
    function promiseAny(promises) {
        if (!Array.isArray(promises) || promises.length === 0) {
            return Promise.reject(new Error('No promises provided'));
        }
        
        if (typeof Promise.any === 'function') {
            return Promise.any(promises);
        }
        
        return new Promise((resolve, reject) => {
            let pending = promises.length;
            const errors = new Array(pending);
            
            promises.forEach((p, index) => {
                Promise.resolve(p).then(
                    value => resolve(value),
                    error => {
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
            new Promise((_, reject) => {
                safeSetTimeout(() => reject(new Error(errorMsg || '操作超时')), ms || 10000);
            })
        ]);
    }
    
    // ==================== HTTP 请求封装 ====================
    function httpFetch(url, options) {
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('Invalid URL'));
        }
        return new Promise((resolve, reject) => {
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
    
    async function httpRequestWithRetry(url, options, retries) {
        let lastError = null;
        const maxRetries = retries || 0;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                if (i > 0) {
                    console.log(`[聚合音源] 第${i}次重试: ${(url || '').substring(0, 80)}...`);
                    await delay(CONFIG.RETRY_DELAY * i);
                }
                
                const resp = await httpFetch(url, options);
                let body = resp.body;
                const contentType = safeGet(resp, 'headers.content-type', '');
                
                if (typeof body === 'string') {
                    const trimmed = body.trim();
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
            } catch (e) {
                lastError = e;
                console.warn(`[聚合音源] 请求失败 (${i+1}/${maxRetries+1}): ${e.message || e}`);
            }
        }
        
        throw lastError || new Error('所有重试均失败');
    }
    
    async function httpGet(url, params, timeout) {
        const queryStr = Object.entries(params || {})
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        
        const fullUrl = url + (queryStr ? ((url || '').includes('?') ? '&' : '?') + queryStr : '');
        const res = await httpRequestWithRetry(fullUrl, { method: 'GET', timeout });
        return res.body;
    }
    
    async function httpPost(url, body, timeout) {
        const res = await httpRequestWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body || {}),
            timeout
        });
        return res.body;
    }
    
    async function httpGetWithFallback(urls, params, timeout) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        let lastError = null;
        
        for (const baseUrl of urlArray) {
            if (!baseUrl) continue;
            try {
                const queryStr = Object.entries(params || {})
                    .filter(([, v]) => v !== undefined && v !== null)
                    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                    .join('&');
                
                const fullUrl = baseUrl + (queryStr ? ((baseUrl || '').includes('?') ? '&' : '?') + queryStr : '');
                const res = await httpRequestWithRetry(fullUrl, { method: 'GET', timeout });
                return res.body;
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError || new Error('所有请求地址均失败');
    }
    
    async function validateUrlWithHead(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const result = await withTimeout(
                httpFetch(url, { method: 'HEAD', timeout: CONFIG.URL_VALIDATION_TIMEOUT }),
                CONFIG.URL_VALIDATION_TIMEOUT,
                'URL验证超时'
            );
            
            const contentType = safeGet(result, 'headers.content-type', '');
            if (!contentType) return true;
            
            const isValidAudio = AUDIO_CONTENT_TYPES.some(t => safeStringIncludes(contentType, t));
            return isValidAudio;
        } catch (e) {
            return true;
        }
    }
    
    // ==================== LRU缓存 ====================
    class LRUCache {
        constructor(maxSize, ttl) {
            this.maxSize = maxSize || 100;
            this.ttl = ttl || 300000;
            this.cache = typeof Map !== 'undefined' ? new Map() : null;
        }
        get(key) {
            if (!this.cache || !key) return null;
            const item = this.cache.get(key);
            if (!item) return null;
            if (Date.now() > item.expiry) {
                this.cache.delete(key);
                return null;
            }
            this.cache.delete(key);
            this.cache.set(key, item);
            return item.value;
        }
        set(key, value) {
            if (!this.cache || !key) return;
            if (this.cache.size >= this.maxSize) {
                try {
                    const firstKey = this.cache.keys().next().value;
                    if (firstKey !== undefined) this.cache.delete(firstKey);
                } catch (e) {}
            }
            this.cache.set(key, { value, expiry: Date.now() + this.ttl });
        }
        delete(key) {
            if (!this.cache || !key) return false;
            return this.cache.delete(key);
        }
        clear() {
            if (this.cache) this.cache.clear();
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
            if (typeof fn !== 'function') {
                return Promise.reject(new Error('Invalid function'));
            }
            return new Promise((resolve, reject) => {
                const task = async () => {
                    try {
                        const result = await fn();
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    } finally {
                        this.running--;
                        this.next();
                    }
                };
                this.queue.push(task);
                this.next();
            });
        }
        next() {
            if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
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
        stats: { hits: 0, misses: 0, requests: 0, success: 0, fail: 0 },
        activeRequests: new Map(),
        initialized: false,
        juheInited: false,
        ikunChecked: false,
        wycloudCookie: CONFIG.NETEASE_CLOUD_COOKIE || "",
        cleanupTimer: null
    };
    
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
            
            state.cleanupTimer = safeSetTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
        };
        
        state.cleanupTimer = safeSetTimeout(cleanup, CONFIG.STATS_CLEANUP_INTERVAL);
    }
    
    // ==================== 网易云音乐云盘处理器 ====================
    
    // 搜索网易云音乐云盘
    async function wycloudSearch(keyword, page = 1, pageSize = 30) {
        if (!CONFIG.NETEASE_CLOUD_ENABLED) {
            return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        }
        
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        
        const cacheKey = `wycloud_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        try {
            const url = `${CONFIG.QORG_API_URL}${API_ENDPOINTS.qorg.endpoints.wycloud_search}`;
            const res = await httpPost(url, {
                keyword: keyword,
                page: page,
                pageSize: pageSize,
                cookie: state.wycloudCookie || undefined
            }, CONFIG.REQUEST_TIMEOUT);
            
            if (res && res.code === 200 && res.data) {
                const list = (res.data.list || []).map(item => ({
                    id: String(item.id || item.fileId || ''),
                    songmid: String(item.id || item.fileId || ''),
                    name: item.name || item.songName || '未知歌曲',
                    singer: item.singer || item.artist || '未知歌手',
                    albumName: item.album || '',
                    duration: item.duration || 0,
                    pic: item.pic || item.cover || item.albumPic || '',
                    _source: 'wycloud',
                    fileId: item.fileId || item.id,
                    fileSize: item.fileSize || item.size,
                    bitrate: item.bitrate || item.br,
                    ext: item.ext || item.extension
                }));
                
                const result = {
                    isEnd: list.length < pageSize,
                    list,
                    total: res.data.total || list.length,
                    page,
                    limit: pageSize
                };
                
                state.searchCache.set(cacheKey, result);
                return result;
            }
            
            return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        } catch (e) {
            console.warn('[网易云盘] 搜索失败:', e.message);
            return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        }
    }
    
    // 获取网易云音乐云盘歌曲URL
    async function wycloudGetMusicUrl(songInfo, quality) {
        if (!CONFIG.NETEASE_CLOUD_ENABLED) {
            throw new Error('网易云盘功能未启用');
        }
        
        const fileId = songInfo.fileId || songInfo.id || songInfo.songmid;
        if (!fileId) {
            throw new Error('网易云盘缺少文件ID');
        }
        
        const cacheKey = buildCacheKey('wycloud', songInfo, quality);
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        try {
            const url = `${CONFIG.QORG_API_URL}${API_ENDPOINTS.qorg.endpoints.wycloud_url}`;
            const res = await httpPost(url, {
                fileId: String(fileId),
                quality: quality || '320k',
                cookie: state.wycloudCookie || undefined
            }, CONFIG.REQUEST_TIMEOUT);
            
            if (res && res.code === 200 && res.data && res.data.url) {
                const resultUrl = res.data.url;
                if (!HTTP_REGEX.test(resultUrl)) {
                    throw new Error('网易云盘返回了非法的URL格式');
                }
                state.urlCache.set(cacheKey, resultUrl);
                return resultUrl;
            }
            
            throw new Error(res?.msg || '网易云盘获取URL失败');
        } catch (e) {
            console.warn('[网易云盘] 获取URL失败:', e.message);
            throw e;
        }
    }
    
    // 获取网易云音乐云盘歌词
    async function wycloudGetLyric(songInfo) {
        if (!CONFIG.NETEASE_CLOUD_ENABLED) {
            return { lyric: '' };
        }
        
        const fileId = songInfo.fileId || songInfo.id || songInfo.songmid;
        if (!fileId) return { lyric: '' };
        
        const cacheKey = `wycloud_lyric_${fileId}`;
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return { lyric: cached }; }
        state.stats.misses++;
        
        try {
            const url = `${CONFIG.QORG_API_URL}${API_ENDPOINTS.qorg.endpoints.wycloud_lyric}`;
            const res = await httpPost(url, {
                fileId: String(fileId),
                cookie: state.wycloudCookie || undefined
            }, CONFIG.REQUEST_TIMEOUT);
            
            if (res && res.code === 200 && res.data) {
                const lyric = res.data.lyric || '';
                state.urlCache.set(cacheKey, lyric);
                return { lyric };
            }
            
            return { lyric: '' };
        } catch (e) {
            console.warn('[网易云盘] 获取歌词失败:', e.message);
            return { lyric: '' };
        }
    }
    
    // 设置网易云Cookie
    function setWycloudCookie(cookie) {
        if (cookie && typeof cookie === 'string') {
            state.wycloudCookie = cookie;
            console.log('[网易云盘] Cookie已设置');
            return true;
        }
        return false;
    }
    
    // 获取网易云盘状态
    function getWycloudStatus() {
        return {
            enabled: CONFIG.NETEASE_CLOUD_ENABLED,
            hasCookie: !!state.wycloudCookie,
            cookieLength: state.wycloudCookie ? state.wycloudCookie.length : 0
        };
    }
    
    // ==================== ikun 音源处理器 ====================
    async function ikunCheckUpdate() {
        if (state.ikunChecked) return;
        state.ikunChecked = true;
        
        if (!CONFIG.IKUN_UPDATE_ENABLE) return;
        
        try {
            const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
            const url = `${CONFIG.IKUN_API_URL}/script/lxmusic?key=${CONFIG.IKUN_API_KEY}&checkUpdate=${CONFIG.IKUN_SCRIPT_MD5}`;
            
            const res = await httpFetch(url, {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": userAgent
                }
            });
            
            const body = res.body;
            if (body && body.code === 200 && body.data != null) {
                send(EVENT_NAMES.updateAlert, {
                    log: body.data.updateMsg,
                    updateUrl: body.data.updateUrl
                });
            }
        } catch (e) {
            console.warn('[聚合音源] ikun更新检查失败:', e.message || e);
        }
    }
    
    async function ikunGetMusicUrl(source, musicInfo, quality) {
        const songId = (musicInfo || {}).hash || (musicInfo || {}).songmid;
        if (!songId) throw new Error('缺少歌曲ID');
        
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(
            `${CONFIG.IKUN_API_URL}/url?source=${source}&songId=${songId}&quality=${quality || '320k'}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": userAgent,
                    "X-Request-Key": CONFIG.IKUN_API_KEY
                },
                follow_max: 5
            }
        );
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error("未知错误");
        
        switch (body.code) {
            case 200:
                return body.url;
            case 403:
                throw new Error("Key失效/鉴权失败");
            case 500:
                throw new Error(`获取URL失败: ${body.message || "未知错误"}`);
            case 429:
                throw new Error("请求过速");
            default:
                throw new Error(body.message || "未知错误");
        }
    }
    
    // ==================== 肥猫音源处理器 ====================
    async function feimaoGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(`${CONFIG.FEIMAO_API_URL}/url/${source}/${songId}/${quality}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.FEIMAO_API_KEY,
            },
            follow_max: 5,
        });
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
        
        switch (body.code) {
            case 0:
                return body.data;
            case 1:
                throw new Error('IP被封禁');
            case 2:
                throw new Error('获取音乐URL失败');
            case 4:
                throw new Error('远程服务器错误');
            case 5:
                throw new Error('请求过于频繁');
            case 6:
                throw new Error('请求参数错误');
            default:
                throw new Error(body.msg ?? '未知错误');
        }
    }
    
    // ==================== 肥猫不肥音源处理器 ====================
    async function feimaobufeiGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(`${CONFIG.FEIMAOBUFEI_API_URL}/url/${source}/${songId}/${quality}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.FEIMAOBUFEI_API_KEY,
            },
            follow_max: 5,
        });
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
        
        switch (body.code) {
            case 0:
                return body.data;
            case 1:
                throw new Error('IP被封禁');
            case 2:
                throw new Error('获取音乐URL失败');
            case 4:
                throw new Error('远程服务器错误');
            case 5:
                throw new Error('请求过于频繁');
            case 6:
                throw new Error('请求参数错误');
            default:
                throw new Error(body.msg ?? '未知错误');
        }
    }
    
    // ==================== 梓澄公益音源处理器 ====================
    async function zichengGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(`${CONFIG.ZICHENG_API_URL}/url/${source}/${songId}/${quality}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENG_API_KEY,
            },
        });
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
        
        switch (body.code) {
            case 0:
                return body.data;
            case 1:
                throw new Error('IP被封禁');
            case 2:
                throw new Error('获取音乐URL失败');
            case 4:
                throw new Error('远程服务器错误');
            case 5:
                throw new Error('请求过于频繁');
            default:
                throw new Error(body.msg ?? '未知错误');
        }
    }
    
    // ==================== 梓澄qwq音源处理器 ====================
    async function zichengqwqGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(`${CONFIG.ZICHENGQWQ_API_URL}/url/${source}/${songId}/${quality}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENGQWQ_API_KEY,
            },
            follow_max: 5,
        });
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
        
        switch (body.code) {
            case 0:
                return body.data;
            case 1:
                throw new Error('IP被封禁');
            case 2:
                throw new Error('获取音乐URL失败');
            case 4:
                throw new Error('远程服务器错误');
            case 5:
                throw new Error('请求过于频繁');
            case 6:
                throw new Error('请求参数错误');
            default:
                throw new Error(body.msg ?? '未知错误');
        }
    }
    
    // ==================== 梓澄公益音源2代处理器 ====================
    async function zicheng2GetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const userAgent = env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`;
        
        const res = await httpFetch(`${CONFIG.ZICHENG2_API_URL}/url/${source}/${songId}/${quality}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'X-Request-Key': CONFIG.ZICHENG2_API_KEY,
            },
        });
        
        const body = res.body;
        if (!body || isNaN(Number(body.code))) throw new Error('未知错误');
        
        switch (body.code) {
            case 0:
                return body.data;
            case 1:
                throw new Error('IP被封禁');
            case 2:
                throw new Error('获取音乐URL失败');
            case 4:
                throw new Error('远程服务器错误');
            case 5:
                throw new Error('请求过于频繁');
            case 6:
                throw new Error('请求参数错误');
            default:
                throw new Error(body.msg ?? '未知错误');
        }
    }
    
    // ==================== 聚合API (juhe) 处理器 ====================
    async function juheInit() {
        if (state.juheInited) return;
        
        try {
            const res = await httpFetch(CONFIG.JUHE_API_URL + '/init.conf', { method: 'GET' });
            const body = res.body;
            
            if (!body || body.code !== 200) {
                console.warn('[聚合音源] juhe初始化失败');
                return;
            }
            
            const data = body.data;
            if (data && data.update && data.update.version > version) {
                send(EVENT_NAMES.updateAlert, data.update);
            }
            
            state.juheInited = true;
        } catch (e) {
            console.warn('[聚合音源] juhe初始化错误:', e.message || e);
        }
    }
    
    async function juheGetMusicUrl(source, info) {
        const res = await httpPost(
            `${CONFIG.JUHE_API_URL}/${source}`,
            info || {},
            CONFIG.REQUEST_TIMEOUT
        );
        
        const body = res;
        if (!body) throw new Error('juhe返回空响应');
        
        if (body.code === 200) {
            return safeGet(body, 'data.url');
        }
        
        if (body.code === 303) {
            try {
                const data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
                const reqData = data.request || {};
                const respData = data.response || {};
                
                const nestedRes = await httpFetch(encodeURI(reqData.url || ''), reqData.options || {});
                
                let value = nestedRes;
                const checkKeys = safeArray(respData.check?.key);
                for (const key of checkKeys) {
                    if (value == null) break;
                    value = value[key];
                }
                
                if (value === safeGet(respData, 'check.value')) {
                    let url = nestedRes;
                    const urlKeys = safeArray(respData.url);
                    for (const key of urlKeys) {
                        if (url == null) break;
                        url = url[key];
                    }
                    if (url && safeStartsWith(url, 'http')) {
                        return url;
                    }
                }
            } catch (e) {
                throw new Error(`juhe 303处理失败: ${e.message || e}`);
            }
        }
        
        throw new Error(body.msg || "juhe请求失败");
    }
    
    // ==================== 無名音源处理器 ====================
    const WUMING_QUALITYS = {
        '128k': '128kmp3',
        '320k': '320kmp3',
        'flac': '2000kflac',
        'flac24bit': '4000kflac'
    };
    
    const WUMING_TX_CONFIG = {
        '128k': { s: 'M500', e: '.mp3', bitrate: '128kbps' },
        '320k': { s: 'M800', e: '.mp3', bitrate: '320kbps' },
        'flac': { s: 'F000', e: '.flac', bitrate: 'FLAC' }
    };
    
    const WUMING_WY_QUALITY = {
        '128k': 'standard',
        '320k': 'exhigh',
        'flac': 'lossless',
        'flac24bit': 'hires'
    };
    
    const WUMING_MG_QUALITY = {
        '128k': 'PQ',
        '320k': 'HQ',
        'flac': 'SQ',
        'flac24bit': 'ZQ'
    };
    
    async function wumingGetMusicUrl(source, musicInfo, quality) {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        
        switch (source) {
            case 'kw': {
                const br = WUMING_QUALITYS[quality] || '128kmp3';
                const url = `https://nmobi.kuwo.cn/mobi.s?br=${br}&f=web&source=kwplayer_ar_1.1.9_oppo_118980_320.apk&type=convert_url_with_sign&rid=${songId}`;
                const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
                if (res && res.code === 200 && res.data && res.data.url) {
                    return res.data.url.split('?')[0];
                }
                throw new Error('酷我获取失败');
            }
            case 'kg': {
                const sign = md5(songId + "57ae12eb6890223e355ccfcb74edf70d10051234560");
                const params = {
                    album_id: musicInfo.albumId || '',
                    userid: 0,
                    area_code: 1,
                    hash: songId,
                    module: "",
                    mid: 123456,
                    appid: "1005",
                    ssa_flag: "is_fromtrack",
                    clientver: "10086",
                    vipType: 6,
                    ptype: 0,
                    token: "",
                    auth: "",
                    mtype: 0,
                    album_audio_id: 0,
                    behavior: "play",
                    clienttime: Math.floor(Date.now() / 1000),
                    pid: 2,
                    key: sign,
                    dfid: "-",
                    pidversion: 3001,
                    quality: "128"
                };
                const queryStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
                const sign2 = md5("OIlwieks28dk2k092lksi2UIkp" + queryStr + "OIlwieks28dk2k092lksi2UIkp");
                const url = `https://gateway.kugou.com/v5/url?${queryStr}&signature=${sign2}`;
                const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
                if (res && res.status === 1 && res.url && res.url[0]) {
                    return res.url[0];
                }
                throw new Error('酷狗获取失败');
            }
            case 'tx': {
                const fileInfo = WUMING_TX_CONFIG[quality] || WUMING_TX_CONFIG['128k'];
                const filename = `${fileInfo.s}${musicInfo.strMediaMid || songId}${fileInfo.e}`;
                const reqData = {
                    req_0: {
                        module: "vkey.GetVkeyServer",
                        method: "CgiGetVkey",
                        param: {
                            filename: [filename],
                            guid: "0",
                            songmid: [songId],
                            songtype: [0],
                            uin: "",
                            loginflag: 1,
                            platform: "20"
                        }
                    },
                    comm: {
                        qq: "",
                        authst: "",
                        ct: "26",
                        cv: "2010101",
                        v: "2010101"
                    }
                };
                const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=${encodeURIComponent(JSON.stringify(reqData))}`;
                const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
                if (res && res.req_0 && res.req_0.data && res.req_0.data.midurlinfo && res.req_0.data.midurlinfo[0]) {
                    const purl = res.req_0.data.midurlinfo[0].purl;
                    if (purl && purl !== '') {
                        const sip = res.req_0.data.sip && res.req_0.data.sip[0] ? res.req_0.data.sip[0] : 'https://ws6.stream.qqmusic.qq.com/';
                        return sip + purl;
                    }
                }
                throw new Error('企鹅获取失败');
            }
            case 'wy': {
                const level = WUMING_WY_QUALITY[quality] || 'standard';
                const params = { ids: JSON.stringify([songId]), level: level, encodeType: "flac" };
                const eapiKey = 'e82ckenh8dichen8';
                const text = JSON.stringify(params);
                const message = `nobody/api/song/enhance/player/url/v1use${text}md5forencrypt`;
                const digest = md5(message);
                const data = `/api/song/enhance/player/url/v1-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
                let encrypted = aesEncrypt(data, eapiKey, '', 'aes-128-ecb');
                if (encrypted && typeof encrypted === 'object' && encrypted.buffer) {
                    encrypted = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
                }
                const postData = { params: (typeof encrypted === 'string' ? encrypted : '').toUpperCase() };
                const res = await httpPost('https://interface.music.163.com/eapi/song/enhance/player/url/v1', postData, CONFIG.REQUEST_TIMEOUT);
                if (res && res.data && res.data[0] && res.data[0].url) {
                    return res.data[0].url;
                }
                throw new Error('网易获取失败');
            }
            case 'mg': {
                const toneFlag = WUMING_MG_QUALITY[quality] || 'PQ';
                const url = `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.4?netType=01&resourceType=E&songId=${musicInfo.copyrightId || songId}&toneFlag=${toneFlag}`;
                const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
                if (res && res.data && res.data.url) {
                    let playUrl = res.data.url;
                    if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
                    return playUrl.replace(/\+/g, '%2B').split('?')[0];
                }
                throw new Error('咪咕获取失败');
            }
            default:
                throw new Error(`無名音源不支持平台: ${source}`);
        }
    }
    
    // ==================== 小熊猫音源处理器 ====================
    let xiaoxiongmao_token = '';
    let xiaoxiongmao_cookie = '';
    
    const XIAOXIONGMAO_QUALITYS = {
        '128k': '128kmp3',
        '320k': '320kmp3'
    };
    
    const XIAOXIONGMAO_TX_CONFIG = {
        '128k': { s: 'M500', e: '.mp3', bitrate: '128kbps' },
        '320k': { s: 'M800', e: '.mp3', bitrate: '320kbps' },
        'flac': { s: 'F000', e: '.flac', bitrate: 'FLAC' }
    };
    
    function xiaoxiongmaoEncrypt(str, pwd) {
        if (pwd == null || pwd.length <= 0) {
            return null;
        }
        let prand = '';
        for (let i = 0; i < pwd.length; i++) {
            prand += pwd.charCodeAt(i).toString();
        }
        let sPos = Math.floor(prand.length / 5);
        let mult = parseInt(prand.charAt(sPos) + prand.charAt(sPos * 2) + prand.charAt(sPos * 3) + prand.charAt(sPos * 4) + prand.charAt(sPos * 5));
        let incr = Math.ceil(pwd.length / 2);
        let modu = Math.pow(2, 31) - 1;
        if (mult < 2) {
            return null;
        }
        let salt = Math.round(Math.random() * 1000000000) % 100000000;
        prand += salt;
        while (prand.length > 10) {
            prand = (parseInt(prand.substring(0, 10)) + parseInt(prand.substring(10, prand.length))).toString();
        }
        prand = (mult * prand + incr) % modu;
        let enc_str = '';
        for (let i = 0; i < str.length; i++) {
            let enc_chr = parseInt(str.charCodeAt(i) ^ Math.floor((prand / modu) * 255));
            if (enc_chr < 16) {
                enc_str += '0' + enc_chr.toString(16);
            } else enc_str += enc_chr.toString(16);
            prand = (mult * prand + incr) % modu;
        }
        salt = salt.toString(16);
        while (salt.length < 8) salt = '0' + salt;
        enc_str += salt;
        return enc_str;
    }
    
    async function xiaoxiongmaoGetToken() {
        return new Promise((resolve, reject) => {
            let defaultKey = 'Hm_Iuvt_cdb524f42f0ce19b169a8071123a4700';
            request('http://www.kuwo.cn/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
                    Referer: 'http://www.kuwo.cn/',
                },
            }, function(error, response) {
                if (error) return reject(new Error('failed'));
                let cookieToken = '';
                if (response.headers['set-cookie']) {
                    let cookies = response.headers['set-cookie'];
                    let cookieStr = Array.isArray(cookies) ? cookies.find(str => str.startsWith('Hm_Iuvt_')) : cookies.match(/Hm_Iuvt_\w+=\w+;/);
                    if (cookieStr) {
                        cookieToken = cookieStr.split(';')[0];
                        xiaoxiongmao_cookie = cookieToken;
                        cookieToken = cookieToken.split('=')[1];
                    }
                }
                if (!cookieToken) return reject(new Error('Invalid cookie'));
                const result = response.body.match(/app\.\w+\.js/);
                if (result) {
                    request(`https://h5.static.kuwo.cn/www/kw-www/${result[0]}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
                            Referer: 'http://www.kuwo.cn/',
                        },
                    }, function(error, response) {
                        if (error) return resolve(xiaoxiongmaoEncrypt(cookieToken, defaultKey));
                        const result = response.body.match(/Hm_Iuvt_(\w+)/);
                        if (result) {
                            resolve(xiaoxiongmaoEncrypt(cookieToken, result[0]));
                        } else resolve(xiaoxiongmaoEncrypt(cookieToken, defaultKey));
                    });
                } else {
                    resolve(xiaoxiongmaoEncrypt(cookieToken, defaultKey));
                }
            });
        });
    }
    
    async function xiaoxiongmaoGetMusicUrl(source, musicInfo, quality) {
        if (source === 'kw') {
            const br = XIAOXIONGMAO_QUALITYS[quality] || '128kmp3';
            const target_url = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${musicInfo.songmid}&type=music&br=${br}`;
            
            if (!xiaoxiongmao_token) {
                xiaoxiongmao_token = await xiaoxiongmaoGetToken();
            }
            
            const res = await httpGet(target_url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.code === 200 && res.data && res.data.url) {
                return res.data.url;
            }
            throw new Error('小熊猫酷我获取失败');
        }
        
        if (source === 'kg') {
            const target_url = `https://www.api.kugou.com/yy/index.php?r=play/getdata&hash=${musicInfo.hash}&platid=4&album_id=${musicInfo.albumId}&mid=00000000000000000000000000000000`;
            const res = await httpGet(target_url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.status === 1 && res.data && res.data.play_backup_url) {
                if (res.data.privilege <= 9) {
                    return res.data.play_backup_url;
                }
            }
            throw new Error('小熊猫酷狗获取失败');
        }
        
        if (source === 'tx') {
            const fileInfo = XIAOXIONGMAO_TX_CONFIG[quality] || XIAOXIONGMAO_TX_CONFIG['128k'];
            const guid = '10000';
            const file = `${fileInfo.s}${musicInfo.strMediaMid}${fileInfo.e}`;
            const reqData = {
                req_0: {
                    module: 'vkey.GetVkeyServer',
                    method: 'CgiGetVkey',
                    param: {
                        filename: [file],
                        guid: guid,
                        songmid: [musicInfo.songmid],
                        songtype: [0],
                        uin: '0',
                        loginflag: 1,
                        platform: '20'
                    }
                },
                loginUin: '0',
                comm: {
                    uin: '0',
                    format: 'json',
                    ct: 24,
                    cv: 0
                }
            };
            const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(reqData))}`;
            const res = await httpGet(url, {}, CONFIG.REQUEST_TIMEOUT);
            if (res && res.req_0 && res.req_0.data && res.req_0.data.midurlinfo && res.req_0.data.midurlinfo[0]) {
                const purl = res.req_0.data.midurlinfo[0].purl;
                if (purl && purl !== '') {
                    const sip = res.req_0.data.sip && res.req_0.data.sip[0] ? res.req_0.data.sip[0] : 'https://ws6.stream.qqmusic.qq.com/';
                    return sip + purl;
                }
            }
            throw new Error('小熊猫企鹅获取失败');
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
            if (res && res.data && res.data[0] && res.data[0].url && !res.data[0].freeTrialInfo) {
                return res.data[0].url;
            }
            throw new Error('小熊猫网易获取失败');
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
            throw new Error('小熊猫咪咕获取失败');
        }
        
        throw new Error(`小熊猫音源不支持平台: ${source}`);
    }
    
    // ==================== Free listen音源处理器 ====================
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
    
    // ==================== 星海API ====================
    async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.main;
        if (!source) throw new Error('星海主API不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('缺少歌曲ID');
        
        const selectedQuality = selectQuality(quality, ['128k', '192k', '320k', 'flac', 'flac24bit']);
        const br = QUALITY_TO_BR[selectedQuality] || '320';
        
        const params = Object.assign({}, API_ENDPOINTS.xinghaiMain.params, {
            source, id: String(id), br
        });
        
        const res = await httpGet(API_ENDPOINTS.xinghaiMain.base, params);
        if (!res || typeof res !== 'object' || !res.url) {
            throw new Error(res?.message || '星海主API未返回URL');
        }
        return res.url;
    }
    
    async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_SOURCE[platform]?.backup;
        if (!source) throw new Error('星海备API不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('缺少歌曲ID');
        
        const selectedQuality = selectQuality(quality, ['128k', '192k', '320k', 'flac']);
        const res = await httpGet(API_ENDPOINTS.xinghaiBackup.base, {
            source, id: String(id), type: 'url', br: selectedQuality
        });
        
        if (typeof res === 'string' && HTTP_REGEX.test(res)) return res;
        if (res?.url) return res.url;
        throw new Error('星海备API未返回URL');
    }
    
    // ==================== 溯音API ====================
    async function suyinQQGetUrl(songInfo, quality) {
        const qqId = getQQSongId(songInfo);
        if (!qqId) throw new Error('溯音QQ缺少歌曲ID');
        
        const normalizedQuality = String(quality || '128k').toLowerCase();
        const startBr = SUYIN_QQ_BR[normalizedQuality] || 7;
        
        const brList = [startBr, 4, 5, 7]
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a - b);
        
        let lastError = null;
        for (const br of brList) {
            try {
                const params = { key: API_ENDPOINTS.suyin.qq.key, type: 'json', br, n: 1 };
                if (qqId.type === 'mid') params.mid = qqId.value;
                else params.songid = qqId.value;
                
                const res = await httpGet(API_ENDPOINTS.suyin.qq.url, params);
                if (res?.music) return res.music;
                if (res?.url) return res.url;
                throw new Error('溯音QQ未找到音频链接');
            } catch (e) {
                lastError = e;
            }
        }
        throw new Error(`溯音QQ失败: ${lastError?.message || lastError}`);
    }
    
    async function suyinWyGetUrl(songInfo) {
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        if (!id) throw new Error('溯音网易云缺少歌曲ID');
        
        const res = await httpGet(API_ENDPOINTS.suyin.wy.url, { id: String(id) });
        if (res?.code === 0 && res?.data) {
            const item = Array.isArray(res.data) ? res.data[0] : res.data;
            if (item?.url) return item.url;
        }
        if (res?.url) return res.url;
        throw new Error('溯音网易云获取失败');
    }
    
    async function suyinKwGetUrl(songInfo, quality) {
        const name = (songInfo || {}).name || (songInfo || {}).title;
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        
        if (!name && !id) throw new Error('溯音酷我需要歌曲名或ID');
        
        const cacheKey = buildCacheKey('suyin_kw', songInfo, quality);
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const params = id ? { id: String(id), n: 1, br: 1 } : { msg: name, n: 1, br: 1 };
        const res = await httpGet(API_ENDPOINTS.suyin.kw.url, params);
        
        if (res?.data?.url) {
            state.urlCache.set(cacheKey, res.data.url);
            return res.data.url;
        }
        if (res?.url) {
            state.urlCache.set(cacheKey, res.url);
            return res.url;
        }
        throw new Error('溯音酷我未找到链接');
    }
    
    async function suyinMgGetUrl(songInfo) {
        const name = (songInfo || {}).name || (songInfo || {}).title;
        const id = (songInfo || {}).songmid || (songInfo || {}).id;
        
        if (!name && !id) throw new Error('溯音咪咕需要歌曲名或ID');
        
        const cacheKey = buildCacheKey('suyin_mg', songInfo);
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const params = id ? { id: String(id), n: 1, num: 1, type: 'json' } : { gm: name, n: 1, num: 1, type: 'json' };
        const res = await httpGet(API_ENDPOINTS.suyin.mg.url, params);
        
        if (res?.code === 200 && res?.musicInfo) {
            state.urlCache.set(cacheKey, res.musicInfo);
            return res.musicInfo;
        }
        if (res?.url) {
            state.urlCache.set(cacheKey, res.url);
            return res.url;
        }
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
    
    // ==================== 长青SVIP ====================
    async function changqingGetUrl(platform, songId, quality, songInfo) {
        const template = API_ENDPOINTS.changqing[platform];
        if (!template) throw new Error('长青SVIP不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('长青SVIP缺少歌曲ID');
        
        const level = qualityToLevel(quality);
        return template.replace('{id}', encodeURIComponent(String(id))).replace('{level}', encodeURIComponent(level));
    }
    
    // ==================== 念心SVIP ====================
    async function nianxinGetUrl(platform, songId, quality, songInfo) {
        const template = API_ENDPOINTS.nianxin[platform];
        if (!template) throw new Error('念心SVIP不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('念心SVIP缺少歌曲ID');
        
        const level = qualityToLevel(quality);
        return template.replace('{id}', encodeURIComponent(String(id))).replace('{level}', encodeURIComponent(level));
    }
    
    // ==================== 汽水VIP ====================
    async function qishuiGetUrl(songInfo, quality) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) throw new Error('汽水VIP缺少歌曲ID');
        
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
        if (!data?.url) {
            throw new Error('汽水VIP未返回URL');
        }
        
        if (!data.ekey) {
            return String(data.url);
        }
        
        const proxyUrls = [API_ENDPOINTS.qishui.proxy, API_ENDPOINTS.qishui.backupProxy].filter(Boolean);
        
        for (const proxyUrl of proxyUrls) {
            for (let i = 0; i <= CONFIG.MAX_RETRIES; i++) {
                try {
                    if (i > 0) {
                        await delay(CONFIG.RETRY_DELAY * i * 1.5);
                    }
                    
                    const proxyRes = await httpPost(proxyUrl, {
                        url: data.url,
                        key: data.ekey,
                        filename: data.filename || 'KMusic',
                        ext: data.fileExtension || 'aac'
                    }, CONFIG.DECRYPT_TIMEOUT);
                    
                    if (Number(proxyRes?.code) === 200 && proxyRes?.url) {
                        return String(proxyRes.url);
                    }
                    
                    if (Number(proxyRes?.code) === 202) {
                        await delay(2000);
                        continue;
                    }
                } catch (e) {}
            }
        }
        
        return String(data.url);
    }
    
    async function qishuiSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [] };
        
        const cacheKey = `qishui_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const res = await httpGetWithFallback(
            [API_ENDPOINTS.qishui.https, API_ENDPOINTS.qishui.http].filter(Boolean),
            { act: 'search', keywords: keyword, page, pagesize: pageSize, type: 'music' },
            15000
        );
        
        const lists = safeArray(res?.data?.lists);
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
            page, limit: pageSize
        };
        
        state.searchCache.set(cacheKey, result);
        return result;
    }
    
    async function qishuiGetLyric(songInfo) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) return { lyric: '' };
        
        const res = await httpGetWithFallback(
            [API_ENDPOINTS.qishui.https, API_ENDPOINTS.qishui.http].filter(Boolean),
            { act: 'song', id: String(songId) },
            15000
        );
        
        const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
        return { lyric: data?.lyric ? String(data.lyric) : '' };
    }
    
    async function qishuiHandler(action, params) {
        if (action === 'musicSearch' || action === 'search') {
            const keyword = params?.keyword ? String(params.keyword) : '';
            const page = params?.page ? Number(params.page) : 1;
            const pageSize = params?.pagesize ? Number(params.pagesize) : 30;
            return qishuiSearch(keyword, page, pageSize);
        }
        if (action === 'musicUrl') {
            if (!params?.musicInfo) throw new Error('请求参数不完整');
            const url = await qishuiGetUrl(params.musicInfo, params.type);
            return validateUrl(url, '汽水VIP');
        }
        if (action === 'lyric') {
            return qishuiGetLyric(params?.musicInfo || {});
        }
        throw new Error(`不支持的操作: ${action}`);
    }
    
    // ==================== 六音音源 ====================
    async function sixyinGetUrl(platform, songId, quality, songInfo) {
        try {
            const id = songId || getHashOrMid(songInfo);
            if (!id) throw new Error('六音音源：缺少歌曲ID');
            
            let type;
            switch (platform) {
                case 'tx': type = 'qq'; break;
                case 'wy': type = 'netease'; break;
                case 'kw': type = 'kuwo'; break;
                case 'kg': type = 'kugou'; break;
                case 'mg': type = 'migu'; break;
                default: throw new Error('六音音源：不支持该平台');
            }
            
            const apiUrl = `${API_ENDPOINTS.sixyin}/url?type=${type}&id=${id}&quality=${quality || '320k'}`;
            const res = await httpGet(apiUrl);
            
            if (!res || !res.url) {
                throw new Error('六音音源：未返回有效播放地址');
            }
            
            return validateUrl(res.url, '六音音源');
        } catch (err) {
            console.warn('[六音音源] 请求失败：', err.message);
            throw err;
        }
    }
    
    // ==================== 独家音源获取URL ====================
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
                    
                    h = g;
                    g = f;
                    f = e;
                    e = (d + temp1) >>> 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (temp1 + temp2) >>> 0;
                }
                
                h0 = (h0 + a) >>> 0;
                h1 = (h1 + b) >>> 0;
                h2 = (h2 + c) >>> 0;
                h3 = (h3 + d) >>> 0;
                h4 = (h4 + e) >>> 0;
                h5 = (h5 + f) >>> 0;
                h6 = (h6 + g) >>> 0;
                h7 = (h7 + h) >>> 0;
            }
            
            function toHex(num) {
                return num.toString(16).padStart(8, '0');
            }
            
            return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + 
                   toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
        }
        
        return { sha256 };
    })();
    
    async function dusiyinyuanGetUrl(platform, songInfo, quality) {
        try {
            const source = PLATFORM_TO_SOURCE[platform]?.dusiyinyuan;
            if (!source) {
                throw new Error(`独家音源不支持平台: ${platform}`);
            }
            
            const songId = getSongId(platform, songInfo);
            if (!songId) {
                throw new Error('独家音源缺少歌曲ID');
            }
            
            const qualityMap = {
                '128k': '128',
                '192k': '192',
                '320k': '320',
                'flac': 'flac',
                '24bit': '24bit',
                'flac24bit': '24bit'
            };
            const br = qualityMap[quality] || '320';
            
            const timestamp = Date.now();
            const signData = `${source}${songId}${br}${timestamp}${CONFIG.IKUN_SCRIPT_MD5 || 'lxmusic'}`;
            const sign = DusiyinyuanSha256.sha256(signData);
            
            const endpoints = [API_ENDPOINTS.dusiyinyuan.base, API_ENDPOINTS.dusiyinyuan.fallback];
            let lastError = null;
            
            for (const baseUrl of endpoints) {
                try {
                    const url = `${baseUrl}/url`;
                    const response = await httpFetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': `lx-music/${version}`
                        },
                        body: JSON.stringify({
                            source: source,
                            songId: String(songId),
                            br: br,
                            timestamp: timestamp,
                            sign: sign
                        })
                    });
                    
                    const body = response.body;
                    if (body && body.code === 200 && body.data && body.data.url) {
                        const resultUrl = body.data.url;
                        if (HTTP_REGEX.test(resultUrl)) {
                            return resultUrl;
                        }
                    }
                    
                    if (body && body.code === 403) {
                        throw new Error('签名验证失败');
                    }
                } catch (e) {
                    lastError = e;
                    console.warn(`[独家音源] ${baseUrl} 请求失败:`, e.message);
                }
            }
            
            throw lastError || new Error('独家音源所有端点均失败');
        } catch (err) {
            console.warn('[独家音源] 获取URL失败:', err.message);
            throw err;
        }
    }
    
    // ==================== 野花野草 ====================
    async function flowerGrassGetUrl(platform, songId, quality, songInfo) {
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('缺少歌曲ID');
        
        const sources = [API_ENDPOINTS.flower, API_ENDPOINTS.grass].filter(Boolean);
        let lastError = null;
        
        for (const baseUrl of sources) {
            try {
                const url = `${baseUrl}/url/${platform}/${id}/${quality || '320k'}`;
                const res = await httpGet(url);
                if (res?.url) return res.url;
            } catch (e) {
                lastError = e;
            }
        }
        throw new Error(`野花野草失败: ${lastError?.message || lastError}`);
    }
    
    // ==================== Meting备用API ====================
    async function metingGetUrl(platform, songId, quality, songInfo) {
        const metingServer = PLATFORM_TO_SOURCE[platform]?.meting;
        if (!metingServer) throw new Error('Meting不支持该平台');
        
        const id = songId || getHashOrMid(songInfo);
        if (!id) throw new Error('Meting缺少歌曲ID');
        
        const br = qualityToBr(quality);
        const template = API_ENDPOINTS.backup[platform];
        if (!template) throw new Error('无Meting模板');
        
        const url = template.replace('{id}', id).replace('{br}', br);
        const res = await httpGet(url);
        
        if (res?.url) return res.url;
        if (typeof res === 'string' && HTTP_REGEX.test(res)) return res;
        throw new Error('Meting获取失败');
    }
    
    // ==================== qorg API 处理器（已启用） ====================
    async function qorgGetMusicUrl(platform, songInfo, quality) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) throw new Error('qorg 缺少歌曲ID');
        
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
            if (!HTTP_REGEX.test(resultUrl)) {
                throw new Error('qorg 返回了非法的URL格式');
            }
            return resultUrl;
        }
        
        throw new Error(res?.msg || 'qorg 获取失败');
    }
    
    async function qorgSearch(keyword, page, pageSize) {
        if (!keyword) return { isEnd: true, list: [], total: 0, page, limit: pageSize };
        
        const cacheKey = `qorg_search_${keyword}_${page}`;
        const cached = state.searchCache.get(cacheKey);
        if (cached) { state.stats.hits++; return cached; }
        state.stats.misses++;
        
        const url = `${CONFIG.QORG_API_URL}/music/search`;
        const res = await httpPost(url, {
            keyword: keyword,
            page: page,
            pageSize: pageSize
        }, CONFIG.REQUEST_TIMEOUT);
        
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
            
            const result = {
                isEnd: list.length < pageSize,
                list,
                total: res.data.total || list.length,
                page,
                limit: pageSize
            };
            
            state.searchCache.set(cacheKey, result);
            return result;
        }
        
        return { isEnd: true, list: [], total: 0, page, limit: pageSize };
    }
    
    async function qorgGetLyric(songInfo) {
        const songId = getHashOrMid(songInfo) || (songInfo || {}).id;
        if (!songId) return { lyric: '' };
        
        const cacheKey = `qorg_lyric_${songId}`;
        const cached = state.urlCache.get(cacheKey);
        if (cached) { state.stats.hits++; return { lyric: cached }; }
        state.stats.misses++;
        
        const url = `${CONFIG.QORG_API_URL}/music/lyric`;
        const res = await httpPost(url, {
            songId: String(songId)
        }, CONFIG.REQUEST_TIMEOUT);
        
        if (res && res.code === 200 && res.data) {
            const lyric = res.data.lyric || '';
            state.urlCache.set(cacheKey, lyric);
            return { lyric };
        }
        
        return { lyric: '' };
    }
    
    // ==================== 音源处理器注册表 ====================
    const SOURCE_HANDLERS = {
        ikun: { name: 'ikun', fn: ikunGetMusicUrl, priority: 1, timeout: 12000, requireSource: true },
        juhe: { name: '聚合API', fn: juheGetMusicUrl, priority: 2, timeout: 12000 },
        qorg: { name: 'qorg', fn: qorgGetMusicUrl, priority: 3, timeout: 10000, requireSource: false },
        wycloud: { name: '网易云盘', fn: wycloudGetMusicUrl, priority: 4, timeout: 12000, requireSource: false },
        xinghaiMain: { name: '星海主', fn: xinghaiMainGetUrl, priority: 5, timeout: 12000 },
        xinghaiBackup: { name: '星海备', fn: xinghaiBackupGetUrl, priority: 6, timeout: 12000 },
        suyin: { name: '溯音', fn: suyinGetUrl, priority: 7, timeout: 15000 },
        sixyin: { name: '六音', fn: sixyinGetUrl, priority: 8, timeout: 12000 },
        dusiyinyuan: { name: '独家音源', fn: dusiyinyuanGetUrl, priority: 9, timeout: 15000 },
        changqing: { name: '长青SVIP', fn: changqingGetUrl, priority: 10, timeout: 10000 },
        nianxin: { name: '念心SVIP', fn: nianxinGetUrl, priority: 11, timeout: 10000 },
        flowerGrass: { name: '野花野草', fn: flowerGrassGetUrl, priority: 12, timeout: 10000 },
        meting: { name: 'Meting', fn: metingGetUrl, priority: 13, timeout: 10000 },
        qishui: { name: '汽水VIP', fn: qishuiGetUrl, priority: 14, timeout: 20000 },
        feimao: { name: '肥猫', fn: feimaoGetMusicUrl, priority: 15, timeout: 12000, requireSource: true },
        feimaobufei: { name: '肥猫不肥', fn: feimaobufeiGetMusicUrl, priority: 16, timeout: 12000, requireSource: true },
        zicheng: { name: '梓澄公益', fn: zichengGetMusicUrl, priority: 17, timeout: 12000, requireSource: true },
        zichengqwq: { name: '梓澄qwq', fn: zichengqwqGetMusicUrl, priority: 18, timeout: 12000, requireSource: true },
        zicheng2: { name: '梓澄公益2代', fn: zicheng2GetMusicUrl, priority: 19, timeout: 12000, requireSource: true },
        wuming: { name: '無名', fn: wumingGetMusicUrl, priority: 20, timeout: 15000, requireSource: true },
        xiaoxiongmao: { name: '小熊猫', fn: xiaoxiongmaoGetMusicUrl, priority: 21, timeout: 15000, requireSource: true },
        freelisten: { name: 'Free listen', fn: freelistenGetMusicUrl, priority: 22, timeout: 15000, requireSource: true }
    };
    
    // 构建音源链
    function buildSourceChain(platform) {
        const chain = [];
        
        const handlerOrder = [
            'ikun', 'juhe', 'qorg', 'wycloud', 'xinghaiMain', 'xinghaiBackup', 'suyin', 'sixyin', 
            'dusiyinyuan', 'changqing', 'nianxin', 'flowerGrass', 'meting', 
            'qishui', 'feimao', 'feimaobufei', 'zicheng', 'zichengqwq', 
            'zicheng2', 'wuming', 'xiaoxiongmao', 'freelisten'
        ];
        
        for (const handlerName of handlerOrder) {
            const handler = SOURCE_HANDLERS[handlerName];
            if (handler) {
                let supportsPlatform = true;
                if (handlerName === 'ikun' && !PLATFORM_TO_SOURCE[platform]?.ikun) supportsPlatform = false;
                if (handlerName === 'suyin' && !['tx', 'wy', 'kw', 'mg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'sixyin' && !['tx', 'wy', 'kw', 'kg', 'mg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'dusiyinyuan' && !PLATFORM_TO_SOURCE[platform]?.dusiyinyuan) supportsPlatform = false;
                if (handlerName === 'changqing' && !API_ENDPOINTS.changqing[platform]) supportsPlatform = false;
                if (handlerName === 'nianxin' && !API_ENDPOINTS.nianxin[platform]) supportsPlatform = false;
                if (handlerName === 'meting' && !PLATFORM_TO_SOURCE[platform]?.meting) supportsPlatform = false;
                if (handlerName === 'wuming' && !['kw', 'kg', 'tx', 'wy', 'mg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'xiaoxiongmao' && !['kw', 'kg', 'tx', 'wy', 'mg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'freelisten' && !['kw', 'kg', 'tx', 'wy', 'mg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'qorg' && !['tx', 'wy', 'kw', 'kg', 'mg', 'qorg'].includes(platform)) supportsPlatform = false;
                if (handlerName === 'wycloud' && platform !== 'wycloud') supportsPlatform = false;
                
                if (supportsPlatform) {
                    chain.push(handler);
                }
            }
        }
        
        chain.sort((a, b) => a.priority - b.priority);
        return chain;
    }
    
    // ==================== 相似歌曲搜索 ====================
    async function searchSimilarSong(platform, songInfo, quality) {
        const name = (songInfo || {}).name || (songInfo || {}).title || '';
        const singer = (songInfo || {}).singer || (songInfo || {}).artist || '';
        
        if (!name) return null;
        
        const keyword = `${name} ${singer}`.trim();
        console.log(`[聚合音源] 搜索相似歌曲: ${keyword}`);
        
        try {
            const result = await qishuiSearch(keyword, 1, 5);
            if (result.list && result.list.length > 0) {
                const normalizedOriginal = normalizeKeyword(name + singer);
                let bestMatch = result.list[0];
                let bestScore = 0;
                
                for (const item of result.list) {
                    const normalizedItem = normalizeKeyword((item.name || '') + (item.singer || ''));
                    let score = 0;
                    if (normalizedItem === normalizedOriginal) score = 100;
                    else if (safeStringIncludes(normalizedItem, normalizedOriginal)) score = 80;
                    else if (safeStringIncludes(normalizedOriginal, normalizedItem)) score = 70;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = item;
                    }
                }
                
                if (bestScore > 50 && bestMatch) {
                    console.log(`[聚合音源] 找到相似歌曲: ${bestMatch.name} - ${bestMatch.singer} (匹配度: ${bestScore})`);
                    const url = await qishuiGetUrl(bestMatch, quality);
                    if (url) return url;
                }
            }
        } catch (e) {
            console.warn(`[聚合音源] 相似歌曲搜索失败: ${e.message || e}`);
        }
        
        return null;
    }
    
    // ==================== 主获取函数 ====================
    async function getUrlWithFallback(platform, songInfo, quality) {
        if (!platform || (!safeIncludes(PLATFORMS, platform) && platform !== 'qishui' && platform !== 'qorg' && platform !== 'wycloud')) {
            throw new Error(`不支持的平台: ${platform}`);
        }
        if (!songInfo || typeof songInfo !== 'object') {
            throw new Error('无效的歌曲信息');
        }
        
        const resolvedQuality = quality || '320k';
        const songId = getSongId(platform, songInfo);
        
        const cacheKey = buildCacheKey(platform, songInfo, resolvedQuality);
        const cached = state.urlCache.get(cacheKey);
        if (cached) {
            state.stats.hits++;
            console.log(`[聚合音源] 缓存命中: ${platform}`);
            const isValid = await validateUrlWithHead(cached);
            if (isValid) {
                return cached;
            } else {
                console.warn(`[聚合音源] 缓存URL已失效，删除缓存`);
                state.urlCache.delete(cacheKey);
            }
        }
        state.stats.misses++;
        
        const requestKey = `${platform}_${cacheKey}`;
        if (state.activeRequests.has(requestKey)) {
            console.log(`[聚合音源] 等待已有请求完成: ${requestKey}`);
            return state.activeRequests.get(requestKey);
        }
        
        if (platform === 'qishui') {
            const promise = (async () => {
                try {
                    const url = await SOURCE_HANDLERS.qishui.fn(songInfo, resolvedQuality);
                    const validated = validateUrl(url, '汽水VIP');
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    return validated;
                } catch (e) {
                    state.stats.fail++;
                    throw e;
                } finally {
                    state.activeRequests.delete(requestKey);
                }
            })();
            state.activeRequests.set(requestKey, promise);
            return promise;
        }
        
        if (platform === 'qorg') {
            const promise = (async () => {
                try {
                    const url = await SOURCE_HANDLERS.qorg.fn(platform, songInfo, resolvedQuality);
                    const validated = validateUrl(url, 'qorg');
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    return validated;
                } catch (e) {
                    state.stats.fail++;
                    throw e;
                } finally {
                    state.activeRequests.delete(requestKey);
                }
            })();
            state.activeRequests.set(requestKey, promise);
            return promise;
        }
        
        if (platform === 'wycloud') {
            const promise = (async () => {
                try {
                    const url = await SOURCE_HANDLERS.wycloud.fn(songInfo, resolvedQuality);
                    const validated = validateUrl(url, '网易云盘');
                    state.urlCache.set(cacheKey, validated);
                    state.stats.success++;
                    return validated;
                } catch (e) {
                    state.stats.fail++;
                    throw e;
                } finally {
                    state.activeRequests.delete(requestKey);
                }
            })();
            state.activeRequests.set(requestKey, promise);
            return promise;
        }
        
        const chain = buildSourceChain(platform);
        if (chain.length === 0) {
            throw new Error(`平台 ${platform} 没有可用的音源`);
        }
        
        const promise = (async () => {
            try {
                const promises = chain.map(handler => 
                    state.requestPool.execute(async () => {
                        try {
                            console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                            
                            let url;
                            if (handler.requireSource) {
                                const source = PLATFORM_TO_SOURCE[platform]?.ikun || platform;
                                url = await withTimeout(
                                    handler.fn(source, songInfo, resolvedQuality),
                                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                                    `${handler.name} 超时`
                                );
                            } else if (handler.name === '聚合API') {
                                const juheInfo = {
                                    musicInfo: songInfo,
                                    type: resolvedQuality
                                };
                                url = await withTimeout(
                                    handler.fn(platform, juheInfo),
                                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                                    `${handler.name} 超时`
                                );
                            } else if (handler.name === '汽水VIP' || handler.name === '网易云盘') {
                                url = await withTimeout(
                                    handler.fn(songInfo, resolvedQuality),
                                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                                    `${handler.name} 超时`
                                );
                            } else {
                                url = await withTimeout(
                                    handler.fn(platform, songId, resolvedQuality, songInfo),
                                    handler.timeout || CONFIG.REQUEST_TIMEOUT,
                                    `${handler.name} 超时`
                                );
                            }
                            
                            const validated = validateUrl(url, handler.name);
                            console.log(`[聚合音源] ${handler.name} 成功`);
                            return validated;
                        } catch (e) {
                            console.warn(`[聚合音源] ${handler.name} 失败: ${e.message || e}`);
                            throw e;
                        }
                    })
                );
                
                const url = await promiseAny(promises);
                state.urlCache.set(cacheKey, url);
                state.stats.success++;
                return url;
            } catch (e) {
                state.stats.fail++;
                const errorMsg = e.errors ? e.errors.map(err => err?.message || err).join('; ') : (e.message || e);
                throw new Error(`所有音源均失败: ${errorMsg}`);
            } finally {
                state.activeRequests.delete(requestKey);
            }
        })();
        
        state.activeRequests.set(requestKey, promise);
        return promise;
    }
    
    // ==================== 平台配置 ====================
    const platformQualityMap = {
        tx: ['24bit', 'flac', '320k', '192k', '128k'],
        wy: ['24bit', 'flac', '320k', '192k', '128k'],
        kw: ['24bit', 'flac', '320k', '192k', '128k'],
        kg: ['24bit', 'flac', '320k', '192k', '128k'],
        mg: ['24bit', 'flac', '320k', '192k', '128k'],
        qishui: ['128k', '320k', 'flac', 'flac24bit'],
        qorg: ['128k', '320k', 'flac', 'flac24bit'],
        wycloud: ['128k', '192k', '320k', 'flac', 'flac24bit']
    };
    
    const platformNames = {
        tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐',
        kg: '酷狗音乐', mg: '咪咕音乐', qishui: '汽水VIP',
        qorg: 'qorg音源', wycloud: '网易云盘'
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
            actions.push('musicSearch', 'lyric');
        }
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
            
            return new Promise(async (resolve, reject) => {
                try {
                    if (source === 'qishui') {
                        const result = await qishuiHandler(action, info);
                        return resolve(result);
                    }
                    
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
                            const result = await qorgGetLyric(info?.musicInfo || {});
                            return resolve(result);
                        }
                    }
                    
                    if (source === 'wycloud') {
                        if (action === 'musicSearch' || action === 'search') {
                            const keyword = info?.keyword ? String(info.keyword) : '';
                            const page = info?.page ? Number(info.page) : 1;
                            const pageSize = info?.pagesize ? Number(info.pagesize) : 30;
                            const result = await wycloudSearch(keyword, page, pageSize);
                            return resolve(result);
                        }
                        if (action === 'musicUrl') {
                            if (!info?.musicInfo) {
                                return reject(new Error('请求参数不完整'));
                            }
                            const url = await wycloudGetMusicUrl(info.musicInfo, info.type);
                            return resolve(validateUrl(url, '网易云盘'));
                        }
                        if (action === 'lyric') {
                            const result = await wycloudGetLyric(info?.musicInfo || {});
                            return resolve(result);
                        }
                        if (action === 'setCookie') {
                            const success = setWycloudCookie(info?.cookie);
                            return resolve({ success, message: success ? 'Cookie设置成功' : 'Cookie设置失败' });
                        }
                        if (action === 'getStatus') {
                            const status = getWycloudStatus();
                            return resolve(status);
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
                            console.warn(`[聚合音源] 主链失败，尝试相似歌曲: ${fallbackError.message || fallbackError}`);
                            
                            const similarUrl = await searchSimilarSong(platform, musicInfo, quality);
                            if (similarUrl) {
                                console.log(`[聚合音源] 使用相似歌曲URL`);
                                resolve(similarUrl);
                            } else {
                                reject(fallbackError);
                            }
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
    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('[聚合音源·超级整合版（完整版）] v7.0.3 初始化中...');
        console.log(`[聚合音源] 开源地址: ${ANNOUNCEMENT.repo}`);
        console.log(`[聚合音源] 交流群: ${ANNOUNCEMENT.qqGroup}`);
        console.log('[聚合音源] 已集成音源: ikun, 聚合API, qorg, 网易云盘, 星海, 溯音, 六音, 独家音源, 长青SVIP, 念心SVIP, 野花野草, Meting, 汽水VIP, 肥猫, 肥猫不肥, 梓澄公益, 梓澄qwq, 梓澄公益2代, 無名, 小熊猫, Free listen');
        console.log('[聚合音源] qorg API + 网易云音乐云盘已启用');
        
        startStatsCleanup();
        setupEventListener();
        
        try {
            if (typeof send === 'function') {
                send(EVENT_NAMES.updateAlert, {
                    log: ANNOUNCEMENT.content,
                    updateUrl: ANNOUNCEMENT.repo
                });
            }
        } catch (e) {}
        
        Promise.allSettled([
            ikunCheckUpdate(),
            juheInit()
        ]).then(() => {
            console.log('[聚合音源] 初始化完成');
        }).catch(e => {
            console.warn('[聚合音源] 初始化部分失败:', e);
        });
        
        try {
            if (typeof send === 'function') {
                send(EVENT_NAMES.inited, {
                    openDevTools: false,
                    sources: sourceConfig,
                    status: {
                        version: '7.0.3',
                        stats: state.stats,
                        config: {
                            timeout: CONFIG.REQUEST_TIMEOUT,
                            retries: CONFIG.MAX_RETRIES,
                            concurrentLimit: CONFIG.CONCURRENT_LIMIT,
                            qorgEnabled: CONFIG.QORG_ENABLED,
                            wycloudEnabled: CONFIG.NETEASE_CLOUD_ENABLED,
                            repo: ANNOUNCEMENT.repo,
                            qqGroup: ANNOUNCEMENT.qqGroup
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[聚合音源] send 事件失败:', e.message);
        }
        
        console.log('[聚合音源·超级整合版（完整版）] v7.0.3 已加载');
        console.log('[聚合音源] 支持平台:', Object.keys(sourceConfig).join(', '));
        console.log(`[聚合音源] 开源地址: ${ANNOUNCEMENT.repo} | 群号: ${ANNOUNCEMENT.qqGroup}`);
    }
    
    initialize();
})();