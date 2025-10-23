/**
 * 云存储 URL 批量转换工具
 * 用途：将 cloud:// URL 批量转换为 HTTPS 临时 URL
 * 
 * 为什么需要？
 * - <image> 标签不支持直接渲染 cloud:// 格式
 * - 必须转换为 HTTPS 临时 URL
 * - 批量转换比逐个转换性能更好
 */

const CACHE_KEY = 'temp_url_cache_v1';
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2小时

/**
 * 从缓存获取临时 URL
 */
function getCached(url) {
  const now = Date.now();
  try {
    const cache = wx.getStorageSync(CACHE_KEY) || {};
    const hit = cache[url];
    if (hit && hit.expireAt > now) {
      return hit.val;
    }
  } catch (e) {
    // 忽略缓存读取错误
  }
  return '';
}

/**
 * 批量设置缓存
 */
function setCachedBatch(map) {
  const now = Date.now();
  try {
    const cache = wx.getStorageSync(CACHE_KEY) || {};
    Object.keys(map).forEach(cloudUrl => {
      cache[cloudUrl] = {
        val: map[cloudUrl],
        expireAt: now + CACHE_TTL
      };
    });
    wx.setStorageSync(CACHE_KEY, cache);
  } catch (e) {
    console.warn('缓存写入失败:', e);
  }
}

/**
 * 批量转换 cloud:// URL 为 HTTPS URL
 * @param {string[]} fileIds - cloud:// URL 数组
 * @returns {Promise<Object>} - { 'cloud://xxx': 'https://xxx', ... }
 */
export async function toHttpsBatch(fileIds = []) {
  // 1. 过滤和去重
  const list = [...new Set(
    fileIds
      .filter(Boolean)
      .map(v => String(v).trim())
      .filter(v => v.startsWith('cloud://'))
  )];

  if (!list.length) {
    return {};
  }

  const result = {};

  // 2. 先从缓存读取
  const needQuery = [];
  list.forEach(url => {
    const cached = getCached(url);
    if (cached) {
      result[url] = cached;
    } else {
      needQuery.push(url);
    }
  });

  if (needQuery.length > 0) {
    console.log(`🔄 [云存储转换] 缓存命中 ${list.length - needQuery.length}/${list.length}, 需查询 ${needQuery.length}`);
  }

  // 3. 批量转换（每次最多 50 个）
  const chunks = [];
  for (let i = 0; i < needQuery.length; i += 50) {
    chunks.push(needQuery.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: chunk });
      const newCache = {};
      
      res.fileList.forEach(item => {
        // 只接受有效的 HTTPS 链接
        if (item.tempFileURL && item.tempFileURL.startsWith('https://')) {
          result[item.fileID] = item.tempFileURL;
          newCache[item.fileID] = item.tempFileURL;
        }
      });

      // 写入缓存
      if (Object.keys(newCache).length > 0) {
        setCachedBatch(newCache);
      }
    } catch (error) {
      console.error('批量转换云存储 URL 失败:', error);
      // 失败的 URL 使用原值
      chunk.forEach(url => {
        if (!result[url]) {
          result[url] = url;
        }
      });
    }
  }

  return result;
}

/**
 * 单个 URL 转换（兜底用）
 * @param {string} url - 可能是 cloud:// 的 URL
 * @returns {Promise<string>} - HTTPS URL 或原值
 */
export async function toHttps(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('cloud://')) {
    return url || '';
  }

  // 先查缓存
  const cached = getCached(url);
  if (cached) {
    return cached;
  }

  // 转换
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: [url] });
    const tempUrl = res.fileList?.[0]?.tempFileURL;
    
    if (tempUrl && tempUrl.startsWith('https://')) {
      // 写入缓存
      setCachedBatch({ [url]: tempUrl });
      return tempUrl;
    }
  } catch (error) {
    console.error('转换云存储 URL 失败:', error);
  }

  return url; // 失败时返回原值
}

/**
 * 清除过期缓存
 */
export function cleanExpiredCache() {
  const now = Date.now();
  try {
    const cache = wx.getStorageSync(CACHE_KEY) || {};
    let cleaned = 0;
    
    Object.keys(cache).forEach(key => {
      if (cache[key].expireAt <= now) {
        delete cache[key];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      wx.setStorageSync(CACHE_KEY, cache);
      console.log(`🧹 清理了 ${cleaned} 个过期的云存储 URL 缓存`);
    }
  } catch (e) {
    console.warn('清理缓存失败:', e);
  }
}

/**
 * 清除所有缓存
 */
export function clearCache() {
  try {
    wx.removeStorageSync(CACHE_KEY);
    console.log('✅ 已清除云存储 URL 缓存');
  } catch (e) {
    console.warn('清除缓存失败:', e);
  }
}

