// pages/admin/admin.js
Page({
  data: {
    adminInfo: null,
    stats: {
      totalStudents: 0,
      totalAnnouncements: 0,
      totalArticles: 0
    }
  },

  onLoad() {
    this.checkAdminLogin();
  },

  onShow() {
    this.checkAdminLogin();
  },

  // 检查管理员登录状态
  checkAdminLogin() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.isAdmin) {
      wx.showModal({
        title: '提示',
        content: '请先以管理员身份登录',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login?type=admin'
          });
        }
      });
      return;
    }

    this.setData({
      adminInfo: app.globalData.userInfo
    });
    this.loadStats();
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 这里可以调用云函数获取统计数据
      // 暂时使用模拟数据
      this.setData({
        stats: {
          totalStudents: 156,
          totalAnnouncements: 12,
          totalArticles: 28
        }
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 管理公告
  manageAnnouncements() {
    wx.showModal({
      title: '功能开发中',
      content: '公告管理功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  // 管理文章
  manageArticles() {
    wx.showModal({
      title: '功能开发中',
      content: '文章管理功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  // 管理学生
  manageStudents() {
    wx.showModal({
      title: '功能开发中',
      content: '学生管理功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  // 查看日志
  viewLogs() {
    wx.showModal({
      title: '功能开发中',
      content: '操作日志功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  // 系统设置
  systemSettings() {
    wx.showModal({
      title: '功能开发中',
      content: '系统设置功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出管理员登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        }
      }
    });
  }
});
