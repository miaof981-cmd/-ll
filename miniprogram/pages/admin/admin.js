// pages/admin/admin.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    adminInfo: null,
    stats: {
      totalStudents: 0,
      totalPhotographers: 0,
      totalAnnouncements: 0,
      totalBanners: 0,
      totalActivities: 0
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

  // 加载统计数据 - 从云数据库获取
  async loadStats() {
    console.log('📊 开始加载统计数据...');
    
    try {
      // 从云数据库获取实时统计
      const [students, photographers, announcements, banners, activities] = await Promise.all([
        cloudDB.getStudents(),
        cloudDB.getPhotographers(),
        cloudDB.getAnnouncements(),
        cloudDB.getBanners(),
        cloudDB.getActivities()
      ]);

      const stats = {
        totalStudents: Array.isArray(students) ? students.length : 0,
        totalPhotographers: Array.isArray(photographers) ? photographers.length : 0,
        totalAnnouncements: Array.isArray(announcements) ? announcements.length : 0,
        totalBanners: Array.isArray(banners) ? banners.length : 0,
        totalActivities: Array.isArray(activities) ? activities.length : 0
      };

      console.log('✅ 统计数据:', stats);
      
      this.setData({ stats });
    } catch (e) {
      console.error('❌ 加载统计数据失败:', e);
      // 设置默认值避免白屏
      this.setData({ 
        stats: {
          totalStudents: 0,
          totalPhotographers: 0,
          totalAnnouncements: 0,
          totalBanners: 0,
          totalActivities: 0
        }
      });
    }
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

  // 管理摄影师
  managePhotographers() {
    wx.navigateTo({
      url: '/pages/admin/photographers/photographers'
    });
  },

  // 管理活动
  manageActivities() {
    wx.navigateTo({
      url: '/pages/admin/activities/activities'
    });
  },

  // 管理管理员
  manageAdmins() {
    wx.navigateTo({
      url: '/pages/admin/admins/admins'
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
