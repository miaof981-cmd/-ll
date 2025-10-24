// utils/system-info.js
// 替代 wx.getSystemInfoSync()，使用新版API

/**
 * 获取完整的系统信息（兼容新版API）
 * 替代过时的 wx.getSystemInfoSync()
 * 
 * @returns {Object} 系统信息对象
 */
function getSystemInfo() {
  try {
    // 使用新版分离的API
    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
    const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
    const systemSetting = wx.getSystemSetting ? wx.getSystemSetting() : {};
    
    // 合并所有信息，保持与旧API兼容的结构
    return {
      // 设备信息 (wx.getDeviceInfo)
      brand: deviceInfo.brand || '',                    // 设备品牌
      model: deviceInfo.model || '',                    // 设备型号
      system: deviceInfo.system || '',                  // 操作系统及版本
      platform: deviceInfo.platform || '',              // 客户端平台
      benchmarkLevel: deviceInfo.benchmarkLevel || 0,   // 设备性能等级
      
      // 窗口信息 (wx.getWindowInfo)
      pixelRatio: windowInfo.pixelRatio || 1,           // 设备像素比
      screenWidth: windowInfo.screenWidth || 0,         // 屏幕宽度（像素）
      screenHeight: windowInfo.screenHeight || 0,       // 屏幕高度（像素）
      windowWidth: windowInfo.windowWidth || 0,         // 可使用窗口宽度（像素）
      windowHeight: windowInfo.windowHeight || 0,       // 可使用窗口高度（像素）
      statusBarHeight: windowInfo.statusBarHeight || 0, // 状态栏高度（像素）
      safeArea: windowInfo.safeArea || {},              // 安全区域
      
      // 应用信息 (wx.getAppBaseInfo)
      SDKVersion: appBaseInfo.SDKVersion || '',         // 基础库版本
      version: appBaseInfo.version || '',               // 微信版本号
      language: appBaseInfo.language || '',             // 微信设置的语言
      theme: appBaseInfo.theme || 'light',              // 系统主题
      
      // 系统设置 (wx.getSystemSetting)
      bluetoothEnabled: systemSetting.bluetoothEnabled, // 蓝牙是否开启
      locationEnabled: systemSetting.locationEnabled,   // 位置信息是否开启
      wifiEnabled: systemSetting.wifiEnabled,           // Wi-Fi 是否开启
      deviceOrientation: systemSetting.deviceOrientation || 'portrait', // 设备方向
      
      // 标记这是新版API
      _isNewAPI: true
    };
  } catch (error) {
    console.warn('⚠️ 获取系统信息失败，降级使用旧API:', error);
    
    // 降级方案：如果新API不可用，使用旧API
    try {
      const oldInfo = wx.getSystemInfoSync();
      return {
        ...oldInfo,
        _isNewAPI: false
      };
    } catch (e) {
      console.error('❌ 获取系统信息失败:', e);
      return {};
    }
  }
}

/**
 * 获取设备信息
 * @returns {Object} 设备信息
 */
function getDeviceInfo() {
  try {
    return wx.getDeviceInfo ? wx.getDeviceInfo() : {};
  } catch (error) {
    console.error('❌ 获取设备信息失败:', error);
    return {};
  }
}

/**
 * 获取窗口信息
 * @returns {Object} 窗口信息
 */
function getWindowInfo() {
  try {
    return wx.getWindowInfo ? wx.getWindowInfo() : {};
  } catch (error) {
    console.error('❌ 获取窗口信息失败:', error);
    return {};
  }
}

/**
 * 获取应用基础信息
 * @returns {Object} 应用基础信息
 */
function getAppBaseInfo() {
  try {
    return wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
  } catch (error) {
    console.error('❌ 获取应用基础信息失败:', error);
    return {};
  }
}

/**
 * 获取系统设置
 * @returns {Object} 系统设置
 */
function getSystemSetting() {
  try {
    return wx.getSystemSetting ? wx.getSystemSetting() : {};
  } catch (error) {
    console.error('❌ 获取系统设置失败:', error);
    return {};
  }
}

/**
 * 获取授权设置
 * @returns {Object} 授权设置
 */
function getAppAuthorizeSetting() {
  try {
    return wx.getAppAuthorizeSetting ? wx.getAppAuthorizeSetting() : {};
  } catch (error) {
    console.error('❌ 获取授权设置失败:', error);
    return {};
  }
}

/**
 * 检测是否支持新版API
 * @returns {Boolean} 是否支持
 */
function isSupportNewAPI() {
  return !!(
    wx.getDeviceInfo && 
    wx.getWindowInfo && 
    wx.getAppBaseInfo && 
    wx.getSystemSetting
  );
}

module.exports = {
  getSystemInfo,        // 获取完整系统信息（推荐）
  getDeviceInfo,        // 获取设备信息
  getWindowInfo,        // 获取窗口信息
  getAppBaseInfo,       // 获取应用基础信息
  getSystemSetting,     // 获取系统设置
  getAppAuthorizeSetting, // 获取授权设置
  isSupportNewAPI       // 检测是否支持新API
};

