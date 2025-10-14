// pages/announcement/detail.js
Page({
  data: {
    announcement: {},
    canGoBack: true
  },

  onLoad(options) {
    // 从本地存储获取公告详情
    try {
      const announcementStr = wx.getStorageSync('currentAnnouncement');
      if (announcementStr) {
        const announcement = JSON.parse(announcementStr);
        this.setData({ announcement });
      }
    } catch (e) {
      console.error('获取公告详情失败:', e);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
    
    // 检查页面栈
    const pages = getCurrentPages();
    this.setData({
      canGoBack: pages.length > 1
    });
  },
  
  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  }
});
