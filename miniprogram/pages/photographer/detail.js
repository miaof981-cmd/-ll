Page({
  data: {
    photographerId: '',
    photographer: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ photographerId: options.id });
      this.loadPhotographerDetail(options.id);
    }
  },

  async loadPhotographerDetail(photographerId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('photographers').doc(photographerId).get();
      
      this.setData({
        photographer: res.data,
        loading: false
      });

      wx.hideLoading();
    } catch (e) {
      console.error('加载摄影师详情失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 预览作品
  previewWork(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.photographer.referenceImages,
      current: this.data.photographer.referenceImages[index]
    });
  }
});

