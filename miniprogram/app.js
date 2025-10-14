// app.js
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
    } else {
      this.globalData.useCloud = false;
      console.warn('云环境未配置，将使用本地模拟数据运行。请在 app.js 中填写 envId 并在开发者工具中开启云开发。');
    }

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
  },

  globalData: {
    userInfo: null,
    isAdmin: false,
    systemInfo: null,
    useCloud: false
  }
});
