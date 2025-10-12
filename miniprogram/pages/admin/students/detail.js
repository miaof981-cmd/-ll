const storage = require('../../../utils/storage');

Page({
  data: {
    student: null,
    records: { reportCards: [], punishments: [], images: [] },
    leftColumn: [],
    rightColumn: []
  },

  onLoad(query) {
    const id = query && query.id;
    const student = storage.getArray('students').find(s => s.studentId === id) || null;
    // 这里可扩展从存储读取该学生档案集合
    const records = storage.getArray(`records:${id}`) || [];
    this.buildWaterfall(records);
    this.setData({ student });
  },

  buildWaterfall(items) {
    const left = [], right = [];
    let toggle = true;
    items.forEach((item) => {
      // 录取通知书优先排到最前（左列）
      if (item.admission) { left.unshift(item); return; }
      if (item.type === 'image') { (left.length <= right.length ? left : right).push(item); }
      else { (toggle ? left : right).push(item); toggle = !toggle; }
    });
    this.setData({ leftColumn: left, rightColumn: right });
  },

  preview(e) {
    const url = e.currentTarget.dataset.url;
    const urls = [...this.data.leftColumn, ...this.data.rightColumn]
      .filter(i => i.type === 'image')
      .map(i => i.url);
    wx.previewImage({ current: url, urls });
  }
});


