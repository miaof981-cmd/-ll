/**
 * 清除头像缓存工具
 * 用途：清除可能包含未转换 cloud:// URL 的旧缓存
 * 使用方法：在 app.js 的 onLaunch 中调用一次，或者在发现头像问题时手动调用
 */

const avatarManager = require('./avatar-manager.js');

/**
 * 清除所有头像缓存
 */
function clearAllAvatarCache() {
  try {
    avatarManager.clearCache();
    console.log('✅ 头像缓存已清除');
    return true;
  } catch (e) {
    console.error('❌ 清除头像缓存失败:', e);
    return false;
  }
}

/**
 * 检查并清除包含 cloud:// URL 的缓存
 */
function cleanInvalidCache() {
  try {
    const CACHE_KEY = 'avatar_cache';
    const stored = wx.getStorageSync(CACHE_KEY);
    
    if (!stored) {
      console.log('ℹ️ 没有头像缓存需要清理');
      return false;
    }
    
    const cache = JSON.parse(stored);
    let hasInvalid = false;
    let cleanedCache = {};
    
    Object.entries(cache).forEach(([openid, data]) => {
      if (data.avatarUrl && data.avatarUrl.startsWith('cloud://')) {
        hasInvalid = true;
        console.warn('⚠️ 发现未转换的 cloud:// URL 缓存:', openid);
      } else {
        cleanedCache[openid] = data;
      }
    });
    
    if (hasInvalid) {
      wx.setStorageSync(CACHE_KEY, JSON.stringify(cleanedCache));
      console.log('✅ 已清理包含 cloud:// URL 的缓存');
      return true;
    } else {
      console.log('✅ 缓存检查通过，无需清理');
      return false;
    }
  } catch (e) {
    console.error('❌ 清理缓存失败:', e);
    return false;
  }
}

module.exports = {
  clearAllAvatarCache,
  cleanInvalidCache
};

