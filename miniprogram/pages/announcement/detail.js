Page({
  data: { item: {}, expanded: false, shortContent: '' },
  onLoad() {
    try {
      const item = wx.getStorageSync('announcement:detail') || {};
      const shortContent = (item.content || '').length > 100 ? (item.content || '').slice(0, 100) + '…' : (item.content || '');
      this.setData({ item, shortContent });
    } catch (e) {
      console.error('load announcement failed', e);
    }
  },
  toggle() { this.setData({ expanded: !this.data.expanded }); }
});


