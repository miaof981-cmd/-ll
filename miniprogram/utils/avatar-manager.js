// utils/avatar-manager.js - 全局头像管理器
// 使用 app.globalData 和本地缓存实现跨页面共享

const DEFAULT_AVATAR = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
const CACHE_KEY = 'avatar_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 缓存24小时

class AvatarManager {
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
        Object.entries(parsed).forEach(([openid, data]) => {
          // 只加载未过期的缓存
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            this.memoryCache.set(openid, data);
          }
        });
        console.log('📦 [头像管理器] 从本地存储加载', this.memoryCache.size, '个头像缓存');
      }
    } catch (e) {
      console.warn('加载头像缓存失败:', e);
    }
  }

  /**
   * 保存缓存到本地存储
   */
  saveToStorage() {
    try {
      const obj = {};
      this.memoryCache.forEach((value, key) => {
        obj[key] = value;
      });
      wx.setStorageSync(CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('保存头像缓存失败:', e);
    }
  }

  /**
   * 获取头像（优先从缓存读取）
   */
  async getAvatar(openid) {
    if (!openid) {
      return DEFAULT_AVATAR;
    }

    // 1. 检查内存缓存
    const cached = this.memoryCache.get(openid);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('💾 [头像管理器] 命中缓存:', openid.substring(0, 10) + '...');
      return cached.avatarUrl;
    }

    // 2. 缓存未命中，查询数据库
    console.log('🔍 [头像管理器] 查询数据库:', openid.substring(0, 10) + '...');
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users')
        .where({ _openid: openid })
        .field({ avatarUrl: true })
        .get();

      if (res.data && res.data.length > 0) {
        let avatarUrl = res.data[0].avatarUrl;

        // 处理云存储URL
        if (avatarUrl && avatarUrl.startsWith('cloud://')) {
          avatarUrl = await this.convertCloudUrl(avatarUrl);
        }

        const finalUrl = avatarUrl || DEFAULT_AVATAR;

        // 3. 存入缓存
        this.setCache(openid, finalUrl);

        return finalUrl;
      } else {
        console.warn('⚠️ [头像管理器] 未找到用户:', openid);
        return DEFAULT_AVATAR;
      }
    } catch (error) {
      console.error('❌ [头像管理器] 查询失败:', error);
      return DEFAULT_AVATAR;
    }
  }

  /**
   * 批量获取头像（性能优化）
   */
  async getAvatarsBatch(openids) {
    if (!openids || openids.length === 0) {
      return new Map();
    }

    const result = new Map();
    const needQuery = [];

    // 1. 先从缓存获取
    openids.forEach(openid => {
      const cached = this.memoryCache.get(openid);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        result.set(openid, cached.avatarUrl);
      } else {
        needQuery.push(openid);
      }
    });

    console.log(`📊 [头像管理器] 批量获取: 缓存命中 ${result.size}/${openids.length}, 需查询 ${needQuery.length}`);

    // 2. 批量查询剩余的
    if (needQuery.length > 0) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('users')
          .where({
            _openid: db.command.in(needQuery)
          })
          .field({ _openid: true, avatarUrl: true })
          .get();

        // 处理查询结果
        const cloudUrls = [];
        const urlMap = new Map();

        res.data.forEach(user => {
          if (user.avatarUrl) {
            if (user.avatarUrl.startsWith('cloud://')) {
              cloudUrls.push(user.avatarUrl);
              urlMap.set(user.avatarUrl, user._openid);
            } else {
              result.set(user._openid, user.avatarUrl);
              this.setCache(user._openid, user.avatarUrl);
            }
          } else {
            result.set(user._openid, DEFAULT_AVATAR);
            this.setCache(user._openid, DEFAULT_AVATAR);
          }
        });

        // 3. 批量转换云存储URL
        if (cloudUrls.length > 0) {
          const convertedUrls = await this.convertCloudUrlsBatch(cloudUrls);
          convertedUrls.forEach((httpsUrl, cloudUrl) => {
            const openid = urlMap.get(cloudUrl);
            if (openid) {
              result.set(openid, httpsUrl);
              this.setCache(openid, httpsUrl);
            }
          });
        }

        // 4. 处理未找到的用户
        needQuery.forEach(openid => {
          if (!result.has(openid)) {
            result.set(openid, DEFAULT_AVATAR);
            this.setCache(openid, DEFAULT_AVATAR);
          }
        });

      } catch (error) {
        console.error('❌ [头像管理器] 批量查询失败:', error);
        // 失败的使用默认头像
        needQuery.forEach(openid => {
          if (!result.has(openid)) {
            result.set(openid, DEFAULT_AVATAR);
          }
        });
      }
    }

    return result;
  }

  /**
   * 转换单个云存储URL
   */
  async convertCloudUrl(cloudUrl) {
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [cloudUrl]
      });

      if (res.fileList && res.fileList.length > 0) {
        return res.fileList[0].tempFileURL;
      }
    } catch (error) {
      console.error('转换云存储URL失败:', error);
    }
    return cloudUrl;
  }

  /**
   * 批量转换云存储URL
   */
  async convertCloudUrlsBatch(cloudUrls) {
    const result = new Map();
    
    if (cloudUrls.length === 0) {
      return result;
    }

    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: cloudUrls
      });

      res.fileList.forEach(item => {
        result.set(item.fileID, item.tempFileURL || item.fileID);
      });
    } catch (error) {
      console.error('批量转换云存储URL失败:', error);
      // 失败时返回原URL
      cloudUrls.forEach(url => {
        result.set(url, url);
      });
    }

    return result;
  }

  /**
   * 设置缓存
   */
  setCache(openid, avatarUrl) {
    this.memoryCache.set(openid, {
      avatarUrl,
      timestamp: Date.now()
    });

    // 异步保存到本地存储（不阻塞主流程）
    setTimeout(() => {
      this.saveToStorage();
    }, 100);
  }

  /**
   * 清除指定用户的缓存
   */
  clearCache(openid) {
    if (openid) {
      this.memoryCache.delete(openid);
      this.saveToStorage();
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    this.memoryCache.clear();
    wx.removeStorageSync(CACHE_KEY);
    console.log('🗑️ [头像管理器] 已清除所有缓存');
  }

  /**
   * 预加载头像（用于列表页优化）
   */
  async preloadAvatars(openids) {
    console.log('🚀 [头像管理器] 预加载', openids.length, '个头像');
    await this.getAvatarsBatch(openids);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    this.memoryCache.forEach((value) => {
      if (now - value.timestamp < CACHE_DURATION) {
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
}

// 创建全局单例
const avatarManager = new AvatarManager();

module.exports = avatarManager;

