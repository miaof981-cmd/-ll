/**
 * 图片URL管理器 - 处理云存储临时URL转换和缓存
 * 
 * 核心功能：
 * 1. 将 cloud:// URL 转换为临时 HTTPS URL
 * 2. 缓存转换结果（12小时有效期）
 * 3. 批量转换优化（最多50个一批）
 * 4. 自动过期刷新
 * 5. 懒加载支持
 */

// 配置项
const CONFIG = {
  CACHE_KEY: 'image_url_cache_v2',
  CACHE_DURATION: 12 * 60 * 60 * 1000, // 12小时缓存（可根据需求调整）
  BATCH_SIZE: 50, // 微信云存储 getTempFileURL API 限制
  DEBUG_MODE: false, // 调试模式：true=详细日志，false=简洁日志
  DEFAULT_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjIwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Yqg6L295Lit4oCmPC90ZXh0Pjwvc3ZnPg=='
};

// 兼容旧变量名
const CACHE_KEY = CONFIG.CACHE_KEY;
const CACHE_DURATION = CONFIG.CACHE_DURATION;
const BATCH_SIZE = CONFIG.BATCH_SIZE;
const DEFAULT_IMAGE = CONFIG.DEFAULT_IMAGE;

/**
 * 图片URL缓存管理类
 */
class ImageUrlManager {
  constructor() {
    this.memoryCache = new Map(); // 内存缓存（最快）
    this.loadFromStorage(); // 启动时从本地存储加载
  }

  /**
   * 条件日志输出（仅在调试模式下输出详细日志）
   * @param {string} level - 日志级别：'log', 'warn', 'error'
   * @param  {...any} args - 日志内容
   */
  log(level, ...args) {
    if (CONFIG.DEBUG_MODE || level === 'error') {
      console[level](...args);
    }
  }

  /**
   * 简洁日志输出（总是显示）
   * @param  {...any} args - 日志内容
   */
  logAlways(...args) {
    console.log(...args);
  }

  /**
   * 校验 cloud:// URL 格式是否有效
   * @param {string} url - cloud:// URL
   * @returns {boolean} - 是否有效
   */
  isValidCloudUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('cloud://')) return false;
    
    // 检查是否包含环境ID（格式：cloud://env-id.xxxx-env-id-xxx/path）
    const pattern = /^cloud:\/\/[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-]+\/[^\s]+$/;
    if (!pattern.test(url)) {
      console.warn('⚠️ [路径异常] 格式不正确:', url);
      return false;
    }
    
    // 检查是否有重复的环境ID前缀（常见错误）
    if (url.includes('cloud://cloud://')) {
      console.warn('⚠️ [路径异常] 重复前缀:', url);
      return false;
    }
    
    return true;
  }

  /**
   * 校验 HTTPS URL 是否有效
   * @param {string} url - HTTPS URL
   * @returns {boolean} - 是否有效
   */
  isValidHttpsUrl(url) {
    return url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'));
  }

  /**
   * 从本地存储加载缓存
   */
  loadFromStorage() {
    try {
      const stored = wx.getStorageSync(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        let validCount = 0;
        
        Object.entries(parsed).forEach(([cloudUrl, data]) => {
          // 只加载未过期的缓存
          if (data.expireAt && data.expireAt > now) {
            this.memoryCache.set(cloudUrl, data);
            validCount++;
          }
        });
        
        if (validCount > 0) {
          this.log('log', '📦 [图片缓存] 加载', validCount, '个有效缓存');
        }
      }
    } catch (e) {
      this.log('warn', '⚠️ [图片缓存] 加载失败:', e);
    }
  }

  /**
   * 保存缓存到本地存储
   */
  saveToStorage() {
    try {
      const serializableCache = {};
      this.memoryCache.forEach((value, key) => {
        serializableCache[key] = value;
      });
      wx.setStorageSync(CACHE_KEY, JSON.stringify(serializableCache));
    } catch (e) {
      console.warn('⚠️ [图片缓存] 保存失败:', e);
    }
  }

  /**
   * 设置缓存
   * @param {string} cloudUrl - cloud:// URL
   * @param {string} httpsUrl - 转换后的 HTTPS URL
   */
  setCache(cloudUrl, httpsUrl) {
    const now = Date.now();
    this.memoryCache.set(cloudUrl, {
      httpsUrl: httpsUrl,
      cachedAt: now,
      expireAt: now + CACHE_DURATION
    });
    
    // 异步保存到本地存储（不阻塞主流程）
    setTimeout(() => {
      this.saveToStorage();
    }, 0);
  }

  /**
   * 获取缓存
   * @param {string} cloudUrl - cloud:// URL
   * @returns {string|null} - 缓存的 HTTPS URL 或 null
   */
  getCache(cloudUrl) {
    const cached = this.memoryCache.get(cloudUrl);
    if (!cached) return null;
    
    const now = Date.now();
    
    // 检查是否过期
    if (cached.expireAt > now) {
      // 验证缓存的 URL 是否有效（必须是 https://）
      if (this.isValidHttpsUrl(cached.httpsUrl)) {
        return cached.httpsUrl;
      } else {
        console.warn('⚠️ [缓存失效] 缓存的URL格式无效:', cached.httpsUrl);
        this.memoryCache.delete(cloudUrl);
        return null;
      }
    }
    
    // 过期则删除
    this.memoryCache.delete(cloudUrl);
    return null;
  }

  /**
   * 批量转换 cloud:// URL 为 HTTPS URL
   * @param {Array<string>} cloudUrls - cloud:// URL 数组
   * @param {Map} urlSourceMap - URL来源映射表（可选，用于失败时追踪）
   * @returns {Promise<Object>} - { 'cloud://xxx': 'https://xxx', ... }
   */
  async convertBatch(cloudUrls = [], urlSourceMap = null) {
    if (!Array.isArray(cloudUrls) || cloudUrls.length === 0) {
      return {};
    }
    
    // 保存来源信息供后续使用
    this._urlSourceMap = urlSourceMap;

    // 1. 过滤出有效的 cloud:// URL 并进行路径校验
    const validUrls = [];
    const invalidUrls = [];
    const emptyUrls = [];
    
    cloudUrls.forEach(url => {
      if (!url) {
        emptyUrls.push('(空值)');
        return;
      }
      
      if (typeof url !== 'string') {
        invalidUrls.push({ url, reason: '类型错误', type: typeof url });
        return;
      }
      
      if (!url.startsWith('cloud://')) {
        // 不是 cloud:// 开头，可能是已转换的 https:// 或本地路径
        if (this.isValidHttpsUrl(url) || url.startsWith('/')) {
          // 已经是有效的URL，直接使用
          validUrls.push(url);
        } else {
          invalidUrls.push({ url: url.substring(0, 50), reason: '格式无效' });
        }
      } else {
        // 是 cloud://，需要校验格式
        if (this.isValidCloudUrl(url)) {
          validUrls.push(url);
        } else {
          invalidUrls.push({ url: url.substring(0, 60), reason: '云路径格式错误' });
        }
      }
    });

    if (emptyUrls.length > 0) {
      console.warn(`⚠️ [数据异常] 跳过 ${emptyUrls.length} 个空URL`);
    }
    
    if (invalidUrls.length > 0) {
      console.warn(`⚠️ [路径异常] 跳过 ${invalidUrls.length} 个无效路径:`, invalidUrls);
    }

    if (validUrls.length === 0) {
      return {};
    }

    this.log('log', '📸 [图片转换] 开始处理', validUrls.length, '个图片URL');

    // 2. 去重
    const uniqueUrls = [...new Set(validUrls)];
    this.log('log', '📸 [图片转换] 去重后', uniqueUrls.length, '个唯一URL');

    // 3. 分类：需要转换的 vs 已缓存的 vs 非cloud的
    const urlMap = {};
    const needConvert = [];
    let cacheHits = 0;

    uniqueUrls.forEach(url => {
      if (!url.startsWith('cloud://')) {
        // 不是 cloud:// 开头的（https:// 或本地路径），直接使用
        urlMap[url] = url;
      } else {
        // 是 cloud://，检查缓存
        const cached = this.getCache(url);
        if (cached) {
          urlMap[url] = cached;
          cacheHits++;
        } else {
          needConvert.push(url);
        }
      }
    });

    // 4. 批量转换需要更新的URL
    let convertSuccess = 0;
    let convertFailed = 0;
    
    if (needConvert.length > 0) {
      try {
        // 按批次转换（每批最多50个）
        const chunks = [];
        for (let i = 0; i < needConvert.length; i += BATCH_SIZE) {
          chunks.push(needConvert.slice(i, i + BATCH_SIZE));
        }

        this.log('log', '📦 [图片转换] 分', chunks.length, '批处理');

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          this.log('log', `🔄 [批次 ${i + 1}/${chunks.length}] 转换 ${chunk.length} 个`);
          
          const res = await wx.cloud.getTempFileURL({
            fileList: chunk
          });

          if (res.fileList && res.fileList.length > 0) {
            res.fileList.forEach(file => {
              if (file.status === 0 && file.tempFileURL && this.isValidHttpsUrl(file.tempFileURL)) {
                // 转换成功，使用临时URL
                urlMap[file.fileID] = file.tempFileURL;
                // 更新缓存
                this.setCache(file.fileID, file.tempFileURL);
                convertSuccess++;
              } else {
                // 转换失败，记录详细原因
                let failReason = '未知原因';
                const debugInfo = {
                  fileID: file.fileID.substring(0, 80) + '...',
                  status: file.status,
                  errMsg: file.errMsg || 'none'
                };
                
                if (file.status === -1) {
                  failReason = '文件不存在';
                } else if (file.status === -2) {
                  failReason = '无权限访问';
                } else if (file.status === -3) {
                  failReason = '云存储错误';
                } else if (!file.tempFileURL) {
                  failReason = '临时URL为空';
                  debugInfo.warning = 'status=0但tempFileURL为空，文件可能已被删除';
                } else if (!this.isValidHttpsUrl(file.tempFileURL)) {
                  failReason = 'URL格式错误';
                  debugInfo.invalidUrl = file.tempFileURL;
                }
                
                console.warn(`⚠️ [图片转换失败] ${failReason}:`, debugInfo);
                
                // 输出来源信息（如果有）
                if (this._urlSourceMap && this._urlSourceMap.has(file.fileID)) {
                  const source = this._urlSourceMap.get(file.fileID);
                  console.warn(`   📍 来源: 订单 ${source.orderId}, 字段 ${source.field}, 创建时间 ${source.createdAt}`);
                }
                
                urlMap[file.fileID] = DEFAULT_IMAGE;
                convertFailed++;
                // 不缓存失败结果，下次可以重试
              }
            });
          }
        }
      } catch (error) {
        this.log('error', '❌ [图片转换] 批量转换失败:', error);
      }
    }

    // 输出简洁的统计信息（总是显示）
    this.logAlways(
      '✅ 使用缓存:', cacheHits, '张 |',
      '🔄 转换新图:', convertSuccess, '张 |',
      '⚠️ 转换失败:', convertFailed, '张 |',
      '✅ 总计:', Object.keys(urlMap).length, '张'
    );

    return urlMap;
  }

  /**
   * 转换单个 cloud:// URL
   * @param {string} cloudUrl - cloud:// URL
   * @returns {Promise<string>} - HTTPS URL 或默认图
   */
  async convertSingle(cloudUrl) {
    if (!cloudUrl || typeof cloudUrl !== 'string') {
      return '';
    }

    // 如果不是 cloud://，直接返回
    if (!cloudUrl.startsWith('cloud://')) {
      return cloudUrl;
    }

    // 先查缓存
    const cached = this.getCache(cloudUrl);
    if (cached) {
      return cached;
    }

    // 没有缓存则转换
    const urlMap = await this.convertBatch([cloudUrl]);
    return urlMap[cloudUrl] || DEFAULT_IMAGE;
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.memoryCache.clear();
    wx.removeStorageSync(CACHE_KEY);
    console.log('🗑️ [图片缓存] 已清除所有缓存');
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} - { total, valid, expired }
   */
  getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    this.memoryCache.forEach(data => {
      if (data.expireAt && data.expireAt > now) {
        valid++;
      } else {
        expired++;
      }
    });

    return {
      total: this.memoryCache.size,
      valid,
      expired
    };
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];

    this.memoryCache.forEach((data, key) => {
      if (!data.expireAt || data.expireAt <= now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log('🧹 [图片缓存] 清理', expiredKeys.length, '个过期缓存');
      this.saveToStorage();
    }

    return expiredKeys.length;
  }
}

// 导出单例
module.exports = new ImageUrlManager();

