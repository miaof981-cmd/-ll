// app.js
const avatarCacheCleaner = require('./utils/clear-avatar-cache.js');

App({
  onLaunch() {
    // 根据是否正确配置环境 ID 决定是否启用云开发
    const envId = 'cloud1-9gdsq5jxb7e60ab4'; // 已配置云环境 ID
    const canUseCloud = !!wx.cloud && envId && !/xxxxx/i.test(envId);

    if (canUseCloud) {
      wx.cloud.init({
        env: envId,
        traceUser: true,
      });
      this.globalData.useCloud = true;
      console.log('✅ 云开发初始化成功，环境ID:', envId);
      
      // 🔥 清理可能包含 cloud:// URL 的旧头像缓存
      setTimeout(() => {
        avatarCacheCleaner.cleanInvalidCache();
      }, 1000);
      
      // 关闭云数据库实时推送（避免 sync-0 错误）
      try {
        const db = wx.cloud.database();
        if (db && db.close) {
          // 某些版本的云数据库有 close 方法
        }
      } catch (e) {
        // 忽略错误
      }
    } else {
      this.globalData.useCloud = false;
      console.warn('⚠️ 云环境未配置，将使用本地模拟数据运行。请在 app.js 中填写 envId 并在开发者工具中开启云开发。');
    }

    // 获取系统信息（使用新API）
    try {
      const windowInfo = wx.getWindowInfo();
      const deviceInfo = wx.getDeviceInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      this.globalData.systemInfo = {
        ...windowInfo,
        ...deviceInfo,
        ...appBaseInfo
      };
    } catch (e) {
      console.warn('获取系统信息失败，使用默认值:', e);
      this.globalData.systemInfo = {};
    }
  },

  globalData: {
    userInfo: null,
    isAdmin: false,
    systemInfo: null,
    useCloud: false
  }
});
