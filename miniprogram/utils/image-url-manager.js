/**
 * 图片URL管理器 - 处理云存储临时URL转换和缓存
 * 
 * 核心功能：
 * 1. 将 cloud:// URL 转换为临时 HTTPS URL
 * 2. 缓存转换结果（2小时有效期）
 * 3. 批量转换优化（最多50个一批）
 * 4. 自动过期刷新
 */

const CACHE_KEY = 'image_url_cache_v1';
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时缓存（临时URL官方1小时有效期，我们设置2小时兜底）
const BATCH_SIZE = 50; // 微信云存储 getTempFileURL API 限制

/**
 * 图片URL缓存管理类
 */
class ImageUrlManager {
  constructor() {
    this.memoryCache = new Map(); // 内存缓存（最快）
    this.loadFromStorage(); // 启动时从本地存储加载
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
          console.log('📦 [图片缓存] 加载', validCount, '个有效缓存');
        }
      }
    } catch (e) {
      console.warn('⚠️ [图片缓存] 加载失败:', e);
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
    if (cached.expireAt > now) {
      return cached.httpsUrl;
    }
    
    // 过期则删除
    this.memoryCache.delete(cloudUrl);
    return null;
  }

  /**
   * 批量转换 cloud:// URL 为 HTTPS URL
   * @param {Array<string>} cloudUrls - cloud:// URL 数组
   * @returns {Promise<Object>} - { 'cloud://xxx': 'https://xxx', ... }
   */
  async convertBatch(cloudUrls = []) {
    if (!Array.isArray(cloudUrls) || cloudUrls.length === 0) {
      return {};
    }

    // 1. 过滤出有效的 cloud:// URL
    const validUrls = cloudUrls.filter(url => 
      url && typeof url === 'string' && url.startsWith('cloud://')
    );

    if (validUrls.length === 0) {
      return {};
    }

    console.log('📸 [图片转换] 开始处理', validUrls.length, '个图片URL');

    // 2. 去重
    const uniqueUrls = [...new Set(validUrls)];
    console.log('📸 [图片转换] 去重后', uniqueUrls.length, '个唯一URL');

    // 3. 分类：需要转换的 vs 已缓存的
    const urlMap = {};
    const needConvert = [];

    uniqueUrls.forEach(url => {
      const cached = this.getCache(url);
      if (cached) {
        urlMap[url] = cached;
      } else {
        needConvert.push(url);
      }
    });

    console.log('✅ [图片缓存] 命中', uniqueUrls.length - needConvert.length, '个');
    
    if (needConvert.length > 0) {
      console.log('🔄 [图片转换] 需要转换', needConvert.length, '个');
    }

    // 4. 批量转换需要更新的URL
    if (needConvert.length > 0) {
      try {
        // 按批次转换（每批最多50个）
        const chunks = [];
        for (let i = 0; i < needConvert.length; i += BATCH_SIZE) {
          chunks.push(needConvert.slice(i, i + BATCH_SIZE));
        }

        console.log('📦 [图片转换] 分', chunks.length, '批处理');

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`🔄 [批次 ${i + 1}/${chunks.length}] 转换 ${chunk.length} 个`);
          
          const res = await wx.cloud.getTempFileURL({
            fileList: chunk
          });

          if (res.fileList && res.fileList.length > 0) {
            res.fileList.forEach(file => {
              if (file.tempFileURL && (file.tempFileURL.startsWith('https://') || file.tempFileURL.startsWith('http://'))) {
                urlMap[file.fileID] = file.tempFileURL;
                // 更新缓存
                this.setCache(file.fileID, file.tempFileURL);
              } else {
                console.warn('⚠️ [图片转换] 转换失败:', file.fileID);
              }
            });
          }
        }

        console.log('✅ [图片转换] 完成，共转换', Object.keys(urlMap).length, '个');
      } catch (error) {
        console.error('❌ [图片转换] 批量转换失败:', error);
      }
    }

    return urlMap;
  }

  /**
   * 转换单个 cloud:// URL
   * @param {string} cloudUrl - cloud:// URL
   * @returns {Promise<string>} - HTTPS URL 或原 URL
   */
  async convertSingle(cloudUrl) {
    if (!cloudUrl || typeof cloudUrl !== 'string' || !cloudUrl.startsWith('cloud://')) {
      return cloudUrl || '';
    }

    // 先查缓存
    const cached = this.getCache(cloudUrl);
    if (cached) {
      return cached;
    }

    // 没有缓存则转换
    const urlMap = await this.convertBatch([cloudUrl]);
    return urlMap[cloudUrl] || cloudUrl;
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

