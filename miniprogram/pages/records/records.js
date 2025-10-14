// pages/records/records.js
const cloudDB = require('../../utils/cloud-db.js');

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
    // 从持久化存储读取登录状态
    let userInfo = null;
    try {
      userInfo = wx.getStorageSync('userInfo');
    } catch (e) {
      console.error('读取登录状态失败:', e);
    }

    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/my/my'
          });
        }
      });
      return;
    }

    const app = getApp();
    app.globalData.userInfo = userInfo;

    this.setData({ userInfo });
    this.loadStudentRecords(userInfo.studentId);
  },

  // 加载指定学生的档案
  async loadStudentRecords(studentId) {
    console.log('📡 加载学生档案:', studentId);
    wx.showLoading({ title: '加载中...' });

    try {
      const student = await cloudDB.getStudentById(studentId);
      
      if (!student) {
        wx.hideLoading();
        wx.showToast({
          title: '学生不存在',
          icon: 'error'
        });
        return;
      }

      // 获取档案记录
      const allRecords = await cloudDB.getRecords(studentId);
      console.log('✅ 档案记录数量:', allRecords.length);
      
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

      wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载档案失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
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
