// pages/admin/banners/banners.js
const storage = require('../../../utils/storage.js');

Page({
  data: {
    banners: []
  },

  onLoad() {
    this.loadBanners();
  },

  onShow() {
    this.loadBanners();
  },

  // 加载轮播图列表
  loadBanners() {
    const banners = storage.getBanners();
    this.setData({ banners });
  },

  // 添加轮播图
  addBanner() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({ title: '上传中...' });
        
        // 这里使用本地路径，实际项目中应该上传到服务器
        // 为了演示，直接使用临时路径
        const success = storage.addBanner(tempFilePath);
        
        wx.hideLoading();
        
        if (success) {
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
          this.loadBanners();
        } else {
          wx.showToast({
            title: '添加失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 删除轮播图
  deleteBanner(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张轮播图吗？',
      success: (res) => {
        if (res.confirm) {
          const success = storage.deleteBanner(id);
          
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadBanners();
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
});
