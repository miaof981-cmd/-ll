const storage = require('../../../utils/storage');

const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    keyword: '',
    pageIndex: 1,
    totalPages: 1,
    filteredTotal: 0,
    pageList: []
  },

  onShow() { this.load(); },

  load() {
    const list = storage.getArray('students');
    this.setData({ list }, () => this.applyFilter());
  },

  onKeyword(e) { this.setData({ keyword: e.detail.value }); },
  search() { this.setData({ pageIndex: 1 }, () => this.applyFilter()); },

  applyFilter() {
    const { list, keyword, pageIndex } = this.data;
    const kw = (keyword || '').trim();
    const filtered = kw ? list.filter(s => (s.studentId || '').includes(kw) || (s.name || '').includes(kw)) : list;
    const filteredTotal = filtered.length;
    const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
    const start = (pageIndex - 1) * PAGE_SIZE;
    const pageList = filtered.slice(start, start + PAGE_SIZE);
    this.setData({ filteredTotal, totalPages, pageList });
  },

  prev() { if (this.data.pageIndex > 1) { this.setData({ pageIndex: this.data.pageIndex - 1 }, () => this.applyFilter()); } },
  next() { if (this.data.pageIndex < this.data.totalPages) { this.setData({ pageIndex: this.data.pageIndex + 1 }, () => this.applyFilter()); } },

  create() { wx.navigateTo({ url: '/pages/admin/students/edit' }); },
  edit(e) { wx.navigateTo({ url: `/pages/admin/students/edit?id=${e.currentTarget.dataset.id}` }); },
  viewDetail(e) { wx.navigateTo({ url: `/pages/admin/students/detail?id=${e.currentTarget.dataset.id}` }); },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该学生吗？',
      success: (res) => {
        if (res.confirm) {
          storage.removeById('students', id, 'studentId');
          this.load();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  }
});


