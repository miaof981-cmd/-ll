// pages/admin/admin.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    adminInfo: null,
    stats: {
      totalStudents: 0,
      totalAnnouncements: 0,
      totalBanners: 0
    }
  },

  onLoad() {
    this.checkAdminLogin();
  },

  onShow() {
    this.checkAdminLogin();
    this.loadStats();
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
  },

  // 加载统计数据 - 使用真实数据
  loadStats() {
    const stats = storage.getStats();
    this.setData({ stats });
  },

  // 管理轮播图
  manageBanners() {
    wx.navigateTo({
      url: '/pages/admin/banners/banners'
    });
  },

  // 管理公告
  manageAnnouncements() {
    wx.navigateTo({
      url: '/pages/admin/announcements/announcements'
    });
  },

  // 管理学生
  manageStudents() {
    wx.navigateTo({
      url: '/pages/admin/students/students'
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
