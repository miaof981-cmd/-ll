// pages/admin/banners/banners.js
const cloudDB = require('../../../utils/cloud-db.js');

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
  async loadBanners() {
    wx.showLoading({ title: '加载中...' });
    const banners = await cloudDB.getBanners();
    wx.hideLoading();
    this.setData({ banners });
  },

  // 添加轮播图
  addBanner() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({ title: '上传中...' });
        
        // 使用云数据库保存
        const success = await cloudDB.addBanner(tempFilePath);
        
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
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          const success = await cloudDB.deleteBanner(id);
          wx.hideLoading();
          
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
