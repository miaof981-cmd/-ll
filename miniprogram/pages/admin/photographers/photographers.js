const storage = require('../../../utils/storage.js');

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

  loadPhotographers() {
    const photographers = storage.getPhotographers();
    this.setData({
      photographers
    });
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

  deletePhotographer(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该摄影师吗？',
      success: (res) => {
        if (res.confirm) {
          storage.deletePhotographer(id);
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          this.loadPhotographers();
        }
      }
    });
  }
});
