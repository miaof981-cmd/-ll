const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    photographers: []
  },

  onLoad() {
    this.loadPhotographers();
  },

  onShow() {
    this.loadPhotographers();
  },

  async loadPhotographers() {
    console.log('📡 开始加载摄影师列表...');
    wx.showLoading({ title: '加载中...' });

    try {
      const photographers = await cloudDB.getPhotographers();
      console.log('✅ 摄影师数量:', photographers.length);

      this.setData({
        photographers
      });

      wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载摄影师失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  addPhotographer() {
    wx.navigateTo({
      url: '/pages/admin/photographers/edit'
    });
  },

  editPhotographer(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/photographers/edit?id=${id}`
    });
  },

  async deletePhotographer(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该摄影师吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const success = await cloudDB.deletePhotographer(id);

            wx.hideLoading();

            if (success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadPhotographers();
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'error'
              });
            }
          } catch (e) {
            console.error('❌ 删除摄影师失败:', e);
            wx.hideLoading();
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
