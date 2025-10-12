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

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
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
          wx.navigateTo({
            url: '/pages/login/login?type=parent'
          });
        }
      });
      return;
    }

    this.setData({
      userInfo: app.globalData.userInfo
    });
    this.loadRecords();
  },

  // 加载学生记录
  async loadRecords() {
    wx.showLoading({
      title: '加载中...'
    });

    try {
      const app = getApp();
      if (app.globalData.useCloud) {
        const res = await wx.cloud.callFunction({
          name: 'getRecords',
          data: {
            studentId: this.data.userInfo.studentId
          }
        });

        if (res.result && res.result.success) {
          this.setData({
            records: res.result.data,
            loading: false
          });
        } else {
          this.loadMockRecords();
        }
      } else {
        // 未启用云开发，直接使用本地模拟
        this.loadMockRecords();
      }
    } catch (error) {
      console.error('加载记录失败:', error);
      // 使用模拟数据
      this.loadMockRecords();
    } finally {
      wx.hideLoading();
    }
  },

  // 加载模拟数据
  loadMockRecords() {
    this.setData({
      records: {
        reportCards: [
          {
            term: '2024-2025 上学期',
            chinese: 92,
            math: 95,
            english: 90,
            physics: 88,
            chemistry: 90,
            average: 91
          },
          {
            term: '2023-2024 下学期',
            chinese: 88,
            math: 92,
            english: 85,
            physics: 90,
            chemistry: 87,
            average: 88.4
          }
        ],
        punishments: [
          {
            date: '2024-03-10',
            type: '警告',
            reason: '上课讲话影响他人学习'
          }
        ],
        images: []
      },
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
