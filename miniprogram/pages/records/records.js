// pages/records/records.js
Page({
  data: {
    userInfo: null,
    records: {
      reportCards: [],
      punishments: [],
      images: []
    },
    activeTab: 'grades', // grades, punishments, images
    loading: true
  },

  onLoad(options) {
    // 支持从URL参数传入studentId（管理员查看档案）
    if (options.studentId) {
      this.loadStudentRecords(options.studentId);
    } else {
      this.checkLogin();
    }
  },

  onShow() {
    // 不自动刷新，避免覆盖管理员查看的档案
  },

  // 检查登录状态
  checkLogin() {
    const app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/login/login'
          });
        }
      });
      return;
    }

    const userInfo = app.globalData.userInfo;
    this.setData({ userInfo });
    this.loadStudentRecords(userInfo.studentId);
  },

  // 加载指定学生的档案
  loadStudentRecords(studentId) {
    const storage = require('../../utils/storage.js');
    const student = storage.getStudentById(studentId);
    
    if (!student) {
      wx.showToast({
        title: '学生不存在',
        icon: 'error'
      });
      return;
    }

    // 获取档案记录
    const allRecords = storage.getRecords(studentId);
    
    // 分类档案
    const records = {
      reportCards: allRecords.filter(r => r.type === 'grade'),
      punishments: allRecords.filter(r => r.type === 'punishment'),
      images: allRecords.filter(r => r.type === 'image')
    };

    this.setData({
      userInfo: {
        studentId: student.studentId,
        name: student.name
      },
      records,
      loading: false
    });
  },


  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 查看图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.records.images.map(img => img.url);
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
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
