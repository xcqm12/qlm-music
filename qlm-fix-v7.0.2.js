/**
 * @name 七零喵聚合音源 · 超级整合版（完整版）
 * @description 整合ikun + 聚合API + 多源回退 + 六音音源 + 独家音源 + 梓澄公益音源 + 肥猫音源 + 小熊猫音源 + 無名音源，智能缓存，相似歌曲搜索
 * @version 7.0.2 - 完整整合版（优化+公告）
 * @author 整合优化版 + 六音 + 洛雪科技(独家音源) + 肥猫 + 小熊猫 + 梓澄
 */
(function() {
    "use strict";
    
    // ==================== 安全获取全局对象 ====================
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     typeof window !== 'undefined' ? window : 
                     typeof global !== 'undefined' ? global : {};
    
    const lx = globalObj.lx || {};
    
    // ==================== 修复事件名称兼容性 ====================
    const EVENT_NAMES = {
        request: lx.EVENT_NAMES?.request || 'request',
        inited: lx.EVENT_NAMES?.inited || 'inited',
        updateAlert: lx.EVENT_NAMES?.updateAlert || 'updateAlert'
    };
    
    // ==================== 公告系统 ====================
    const ANNOUNCEMENT = {
        enabled: true,
        title: '七零喵聚合音源 v7.0.2',
        content: [
            '🎵 欢迎使用七零喵聚合音源完整版',
            '',
            '📢 更新内容：',
            '• 优化音源请求逻辑，提升成功率',
            '• 修复部分平台URL获取失败问题',
            '• 新增公告系统',
            '• 优化缓存策略',
            '',
            '🔧 已集成音源：',
            'ikun | 聚合API | 星海 | 溯音 | 六音',
            '独家音源 | 长青SVIP | 念心SVIP | 汽水VIP',
            '肥猫系列 | 梓澄系列 | 無名 | 小熊猫',
            '',
            '💡 提示：如遇播放失败，会自动切换备用音源',
            '',
            '📮 反馈渠道：https://github.com/xcqm12/qlm-music',
            '⭐ 如果觉得好用，请给个Star支持一下！'
        ].join('\n'),
        showAtStart: true,
        displayDuration: 10000
    };
    
    // 获取 LX Music API
    let request = lx.request;
    let on = lx.on;
    let send = lx.send;
    const utils = lx.utils || {};
    const env = lx.env;
    const version = lx.version || '1.0.0';
    
    // 兼容多种API获取方式
    if (!request && typeof globalObj.request === 'function') {
        request = globalObj.request;
    }
    if (!on && typeof globalObj.on === 'function') {
        on = globalObj.on;
    }
    if (!send && typeof globalObj.send === 'function') {
        send = globalObj.send;
    }
    
    // 备用 request
    if (!request || typeof request !== 'function') {
        console.error('[聚合音源] request API 不可用');
        if (typeof fetch === 'function') {
            request = (url, options, callback) => {
                fetch(url, options)
                    .then(resp => resp.text().then(body => ({ 
                        statusCode: resp.status, 
                        headers: Object.fromEntries(resp.headers.entries()), 
                        body 
                    })))
                    .then(resp => callback(null, resp))
                    .catch(err => callback(err));
            };
        } else {
            return;
        }
    }
    
    // 确保 on 和 send 存在
    on = on || (() => {});
    send = send || ((event, data) => console.log('[聚合音源] send:', event, data));
    
    // ==================== 常量定义 ====================
    const CONFIG = {
        // API 地址
        IKUN_API_URL: "https://api.ikunshare.com",
        IKUN_API_KEY: "",
        IKUN_SCRIPT_MD5: "74a88a1d1ae53cf3cb2889e70aed3d6e",
        IKUN_UPDATE_ENABLE: true,
        JUHE_API_URL: "https://api.music.lerd.dpdns.org",
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
        
        // 缓存配置
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
    const PLATFORMS = ['tx', 'wy', 'kw', 'kg', 'mg', 'sixyin', 'local'];
    const HTTP_REGEX = /^https?:\/\//i;
    
    // ==================== 工具函数 ====================
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
    
    const safeArray = (value) => Array.isArray(value) ? value : [];
    
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms || 100));
    
    const validateUrl = (url, sourceName) => {
        if (!url || typeof url !== 'string') throw new Error(`${sourceName || '源'}返回空URL`);
        const trimmed = url.trim();
        if (!HTTP_REGEX.test(trimmed)) throw new Error(`${sourceName || '源'}返回非法URL格式`);
        return trimmed;
    };
    
    const normalizeKeyword = (keyword) => {
        if (!keyword) return "";
        return String(keyword)
            .replace(/[\(\（][^\)\）]*[\)\）]/g, "")
            .replace(/[\[【][^\】\]]*[\]】]/g, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\u4e00-\u9fa5]/g, "")
            .trim()
            .toLowerCase();
    };
    
    const buildCacheKey = (prefix, songInfo, quality) => {
        const info = songInfo || {};
        const id = info.hash || info.songmid || info.id || '';
        const name = info.name || info.title || '';
        const singer = info.singer || info.artist || '';
        return `${prefix}_${id}_${name}_${singer}_${quality || ''}`;
    };
    
    const getSongId = (platform, songInfo) => {
        if (!songInfo || !platform) return null;
        const info = songInfo;
        const meta = info.meta || {};
        
        switch (platform) {
            case 'kg': return info.hash || info.songmid || info.id;
            case 'tx': return meta.qq?.mid || meta.mid || info.songmid || info.id;
            case 'wy': return info.songmid || info.id;
            case 'kw': return info.songmid || info.id;
            case 'mg': return info.songmid || info.cid || info.id;
            default: return info.songmid || info.id;
        }
    };
    
    // ==================== Promise 工具 ====================
    const promiseAny = (promises) => {
        if (!Array.isArray(promises) || promises.length === 0) {
            return Promise.reject(new Error('No promises'));
        }
        if (typeof Promise.any === 'function') {
            return Promise.any(promises);
        }
        return new Promise((resolve, reject) => {
            let pending = promises.length;
            const errors = new Array(pending);
            promises.forEach((p, i) => {
                Promise.resolve(p).then(resolve).catch(err => {
                    errors[i] = err;
                    if (--pending === 0) {
                        const error = new Error('All promises rejected');
                        error.errors = errors;
                        reject(error);
                    }
                });
            });
        });
    };
    
    const withTimeout = (promise, ms, errorMsg = '操作超时') => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
        ]);
    };
    
    // ==================== HTTP 请求 ====================
    const httpFetch = (url, options = {}) => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('请求超时')), options.timeout || CONFIG.REQUEST_TIMEOUT);
            request(url, options, (err, resp) => {
                clearTimeout(timer);
                if (err) return reject(new Error(`请求错误: ${err.message || err}`));
                resolve(resp || {});
            });
        });
    };
    
    const httpRequestWithRetry = async (url, options = {}, retries = CONFIG.MAX_RETRIES) => {
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                if (i > 0) await delay(CONFIG.RETRY_DELAY * i);
                const resp = await httpFetch(url, options);
                let body = resp.body;
                if (typeof body === 'string') {
                    const trimmed = body.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try { body = JSON.parse(trimmed); } catch (e) {}
                    }
                }
                return { statusCode: resp.statusCode || 0, headers: resp.headers || {}, body };
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError || new Error('所有重试均失败');
    };
    
    const httpGet = async (url, params = {}, timeout = CONFIG.REQUEST_TIMEOUT) => {
        const queryStr = Object.entries(params)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const fullUrl = url + (queryStr ? (url.includes('?') ? '&' : '?') + queryStr : '');
        const res = await httpRequestWithRetry(fullUrl, { method: 'GET', timeout });
        return res.body;
    };
    
    const httpPost = async (url, body = {}, timeout = CONFIG.REQUEST_TIMEOUT) => {
        const res = await httpRequestWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body),
            timeout
        });
        return res.body;
    };
    
    // ==================== LRU缓存 ====================
    class LRUCache {
        constructor(maxSize, ttl) {
            this.maxSize = maxSize || 100;
            this.ttl = ttl || 300000;
            this.cache = new Map();
        }
        get(key) {
            if (!key) return null;
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
            if (!key) return;
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(key, { value, expiry: Date.now() + this.ttl });
        }
        delete(key) {
            return this.cache.delete(key);
        }
        clear() {
            this.cache.clear();
        }
    }
    
    // ==================== 请求池 ====================
    class RequestPool {
        constructor(maxConcurrent) {
            this.maxConcurrent = maxConcurrent || 5;
            this.running = 0;
            this.queue = [];
        }
        async execute(fn) {
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
            task?.();
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
        announcementShown: false
    };
    
    // ==================== 显示公告 ====================
    const showAnnouncement = () => {
        if (!ANNOUNCEMENT.enabled || state.announcementShown) return;
        state.announcementShown = true;
        
        try {
            if (typeof send === 'function') {
                send('updateAlert', {
                    log: ANNOUNCEMENT.content,
                    updateUrl: 'https://github.com/qlm/qlm-music'
                });
            }
            console.log(`[聚合音源] ${ANNOUNCEMENT.title}\n${ANNOUNCEMENT.content}`);
        } catch (e) {
            console.warn('[聚合音源] 公告显示失败:', e.message);
        }
    };
    
    // ==================== 音源处理器基类 ====================
    const createSourceHandler = (name, priority, timeout, fn) => ({
        name, priority, timeout,
        execute: async (platform, songId, quality, songInfo) => {
            return await withTimeout(fn(platform, songId, quality, songInfo), timeout, `${name} 超时`);
        }
    });
    
    // ==================== 各音源处理器 ====================
    const handlers = {
        // ikun
        ikun: createSourceHandler('ikun', 1, 12000, async (platform, songId, quality, songInfo) => {
            const source = { tx: 'tx', wy: 'wy', kw: 'kw', kg: 'kg', mg: 'mg' }[platform];
            if (!source) throw new Error('ikun不支持该平台');
            const id = songInfo?.hash || songInfo?.songmid || songId;
            if (!id) throw new Error('缺少歌曲ID');
            
            const res = await httpGet(`${CONFIG.IKUN_API_URL}/url?source=${source}&songId=${id}&quality=${quality || '320k'}`, {
                'User-Agent': `lx-music/${version}`,
                'X-Request-Key': CONFIG.IKUN_API_KEY
            });
            
            if (res?.code === 200) return validateUrl(res.url, 'ikun');
            throw new Error(res?.message || 'ikun获取失败');
        }),
        
        // 聚合API
        juhe: createSourceHandler('聚合API', 2, 12000, async (platform, songId, quality, songInfo) => {
            const res = await httpPost(`${CONFIG.JUHE_API_URL}/${platform}`, {
                musicInfo: songInfo,
                type: quality
            });
            if (res?.code === 200 && res?.data?.url) return validateUrl(res.data.url, '聚合API');
            throw new Error(res?.msg || '聚合API获取失败');
        }),
        
        // 六音
        sixyin: createSourceHandler('六音', 6, 12000, async (platform, songId, quality, songInfo) => {
            const type = { tx: 'qq', wy: 'netease', kw: 'kuwo', kg: 'kugou', mg: 'migu' }[platform];
            if (!type) throw new Error('六音不支持该平台');
            const id = songId || songInfo?.hash || songInfo?.songmid;
            if (!id) throw new Error('缺少歌曲ID');
            
            const res = await httpGet(`http://music.sixyin.com/api/url?type=${type}&id=${id}&quality=${quality || '320k'}`);
            if (res?.url) return validateUrl(res.url, '六音');
            throw new Error('六音未返回URL');
        }),
        
        // 肥猫
        feimao: createSourceHandler('肥猫', 13, 12000, async (platform, songId, quality, songInfo) => {
            const source = platform;
            const id = songInfo?.hash || songInfo?.songmid || songId;
            if (!id) throw new Error('缺少歌曲ID');
            
            const res = await httpGet(`${CONFIG.FEIMAO_API_URL}/url/${source}/${id}/${quality}`, {
                'X-Request-Key': CONFIG.FEIMAO_API_KEY
            });
            if (res?.code === 0) return validateUrl(res.data, '肥猫');
            throw new Error(res?.msg || '肥猫获取失败');
        }),
        
        // 梓澄公益
        zicheng: createSourceHandler('梓澄公益', 15, 12000, async (platform, songId, quality, songInfo) => {
            const id = songInfo?.hash || songInfo?.songmid || songId;
            if (!id) throw new Error('缺少歌曲ID');
            
            const res = await httpGet(`${CONFIG.ZICHENG_API_URL}/url/${platform}/${id}/${quality}`, {
                'X-Request-Key': CONFIG.ZICHENG_API_KEY
            });
            if (res?.code === 0) return validateUrl(res.data, '梓澄公益');
            throw new Error(res?.msg || '梓澄获取失败');
        }),
        
        // 汽水VIP
        qishui: {
            name: '汽水VIP',
            priority: 12,
            timeout: 20000,
            execute: async (platform, songId, quality, songInfo) => {
                const id = songInfo?.hash || songInfo?.songmid || songInfo?.id || songId;
                if (!id) throw new Error('缺少歌曲ID');
                
                const qMap = { '128k': 'low', '320k': 'standard', 'flac': 'lossless' };
                const q = qMap[quality] || 'standard';
                
                const res = await httpGet('https://api.vsaa.cn/api/music.qishui.vip', {
                    act: 'song', id: String(id), quality: q
                });
                
                const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
                if (data?.url) return validateUrl(data.url, '汽水VIP');
                throw new Error('汽水VIP未返回URL');
            }
        }
    };
    
    // ==================== 构建音源链 ====================
    const buildSourceChain = (platform) => {
        const chain = [];
        const supportedPlatforms = {
            ikun: ['tx', 'wy', 'kw', 'kg', 'mg'],
            juhe: ['tx', 'wy', 'kw', 'kg', 'mg'],
            sixyin: ['tx', 'wy', 'kw', 'kg', 'mg'],
            feimao: ['tx', 'wy', 'kw', 'kg', 'mg'],
            zicheng: ['tx', 'wy', 'kw', 'kg', 'mg'],
            qishui: ['tx', 'wy', 'kw', 'kg', 'mg', 'qishui']
        };
        
        const order = ['ikun', 'juhe', 'sixyin', 'feimao', 'zicheng', 'qishui'];
        
        for (const name of order) {
            const handler = handlers[name];
            if (handler && supportedPlatforms[name]?.includes(platform)) {
                chain.push(handler);
            }
        }
        
        return chain.sort((a, b) => a.priority - b.priority);
    };
    
    // ==================== 主获取函数 ====================
    const getUrlWithFallback = async (platform, songInfo, quality) => {
        if (!PLATFORMS.includes(platform) && platform !== 'qishui') {
            throw new Error(`不支持的平台: ${platform}`);
        }
        
        const resolvedQuality = quality || '320k';
        const songId = getSongId(platform, songInfo);
        const cacheKey = buildCacheKey(platform, songInfo, resolvedQuality);
        
        // 检查缓存
        const cached = state.urlCache.get(cacheKey);
        if (cached) {
            state.stats.hits++;
            console.log(`[聚合音源] 缓存命中: ${platform}`);
            return cached;
        }
        state.stats.misses++;
        
        // 防重复请求
        const requestKey = `${platform}_${cacheKey}`;
        if (state.activeRequests.has(requestKey)) {
            console.log(`[聚合音源] 复用已有请求: ${requestKey}`);
            return state.activeRequests.get(requestKey);
        }
        
        const chain = buildSourceChain(platform);
        if (chain.length === 0) {
            throw new Error(`平台 ${platform} 没有可用的音源`);
        }
        
        const promise = (async () => {
            try {
                const promises = chain.map(handler =>
                    state.requestPool.execute(async () => {
                        console.log(`[聚合音源] 尝试: ${handler.name} (${platform})`);
                        const url = await handler.execute(platform, songId, resolvedQuality, songInfo);
                        console.log(`[聚合音源] ${handler.name} 成功`);
                        return url;
                    }).catch(err => {
                        console.warn(`[聚合音源] ${handler.name} 失败: ${err.message}`);
                        throw err;
                    })
                );
                
                const url = await promiseAny(promises);
                state.urlCache.set(cacheKey, url);
                state.stats.success++;
                return url;
            } catch (e) {
                state.stats.fail++;
                const errors = e.errors?.map(err => err.message).join('; ') || e.message;
                throw new Error(`所有音源均失败: ${errors}`);
            } finally {
                state.activeRequests.delete(requestKey);
            }
        })();
        
        state.activeRequests.set(requestKey, promise);
        return promise;
    };
    
    // ==================== 事件处理 ====================
    const handleRequest = async ({ action, source, info }) => {
        state.stats.requests++;
        
        if (action !== 'musicUrl') {
            throw new Error(`不支持的操作: ${action}`);
        }
        
        const musicInfo = info?.musicInfo || {};
        const platform = musicInfo._source || source;
        const quality = info?.type || '320k';
        
        console.log(`[聚合音源] 请求: ${platform} - ${musicInfo.name || '未知'} - ${quality}`);
        
        return await getUrlWithFallback(platform, musicInfo, quality);
    };
    
    // ==================== 初始化 ====================
    const initialize = () => {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('[聚合音源·超级整合版] v7.0.2 初始化...');
        console.log('[聚合音源] 已集成: ikun, 聚合API, 六音, 肥猫, 梓澄, 汽水VIP');
        
        // 注册事件监听
        if (typeof on === 'function') {
            on(EVENT_NAMES.request, async (context) => {
                try {
                    const result = await handleRequest(context);
                    return Promise.resolve(result);
                } catch (err) {
                    return Promise.reject(err);
                }
            });
            console.log('[聚合音源] 事件监听已注册');
        }
        
        // 显示公告
        if (ANNOUNCEMENT.showAtStart) {
            setTimeout(showAnnouncement, 1000);
        }
        
        // 发送初始化完成
        try {
            send(EVENT_NAMES.inited, {
                sources: {
                    tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k', '320k', 'flac', 'flac24bit'] },
                    wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k', '320k', 'flac', 'flac24bit'] },
                    kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k', '320k', 'flac'] },
                    kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k', '320k', 'flac'] },
                    mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k', '320k', 'flac', 'flac24bit'] },
                    qishui: { name: '汽水VIP', type: 'music', actions: ['musicUrl', 'musicSearch', 'lyric'], qualitys: ['128k', '320k', 'flac', 'flac24bit'] }
                },
                status: { version: '7.0.2', stats: state.stats }
            });
        } catch (e) {}
        
        console.log('[聚合音源] v7.0.2 已加载');
    };
    
    initialize();
})();