const storage = require('../../../utils/storage');

Page({
  data: {
    list: [],
    title: '',
    content: '',
    cover: '',
    pinned: false,
    editingId: ''
  },

  onShow() {
    this.load();
  },

  load() {
    const list = storage.getArray('announcements');
    this.setData({ list });
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },
  onPinned(e) { this.setData({ pinned: e.detail.value }); },
  onCover(e) { this.setData({ cover: e.detail.value }); },
  chooseCover() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (path) { this.setData({ cover: path }); }
    }});
  },

  save() {
    const { title, content, cover, pinned, editingId } = this.data;
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'error' }); return; }
    // 规范封面尺寸：750x300，超出按中心裁剪显示（前端通过样式限制展示区域）
    const item = {
      _id: editingId || `${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      cover: cover || '',
      pinned: !!pinned,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    storage.upsertById('announcements', item);
    this.setData({ title: '', content: '', pinned: false, editingId: '' });
    this.load();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  edit(e) {
    const id = e.currentTarget.dataset.id;
    const item = storage.getArray('announcements').find(i => i._id === id);
    if (item) {
      this.setData({ title: item.title, content: item.content, pinned: item.pinned, editingId: id });
    }
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      success: (res) => {
        if (res.confirm) {
          storage.removeById('announcements', id);
          this.load();
          wx.showToast({ title: '已删除' });
        }
      }
    })
  }
});


