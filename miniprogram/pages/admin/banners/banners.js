const storage = require('../../../utils/storage');

Page({
  data: {
    list: [],
    url: ''
  },

  onShow() { this.load(); },

  load() {
    const list = storage.getArray('banners');
    this.setData({ list });
  },

  onUrl(e) { this.setData({ url: e.detail.value }); },

  choose() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (path) { this.setData({ url: path }); }
    }});
  },

  add() {
    const { url } = this.data;
    if (!url) { wx.showToast({ title: '请先选择或填写图片', icon: 'error' }); return; }
    const item = { _id: `${Date.now()}`, url };
    storage.pushToArray('banners', item);
    this.setData({ url: '' });
    this.load();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    storage.removeById('banners', id);
    this.load();
  }
});


