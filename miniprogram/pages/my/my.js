// pages/my/my.js
Page({
  data: {
    userInfo: null,
    isAdmin: false,
    leftColumn: [],
    rightColumn: []
  },

  onShow() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || null;
    const isAdmin = !!app.globalData.isAdmin;
    this.setData({ userInfo, isAdmin });
    if (userInfo) {
      this.loadWaterfall();
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          this.setData({ userInfo: null, isAdmin: false, leftColumn: [], rightColumn: [] });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  },

  // 进入管理后台（仅管理员）
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  // 快捷导航：学生/公告
  goStudents() { wx.navigateTo({ url: '/pages/admin/students/students' }); },
  goAnnouncements() { wx.navigateTo({ url: '/pages/admin/announcements/announcements' }); },

  // 加载瀑布流档案（优先读取本地存储 records:<studentId>；不注入任何预设）
  async loadWaterfall() {
    try {
      const app = getApp();
      if (app.globalData.useCloud) {
        // 预留云端：未来改为请求云端档案合并为统一流
        this.setData({ leftColumn: [], rightColumn: [] });
      } else {
        const storage = require('../../utils/storage');
        const key = `records:${this.data.userInfo.studentId}`;
        const items = storage.getArray(key) || [];
        this.buildColumns(items);
      }
    } catch (e) {
      console.error(e);
      this.setData({ leftColumn: [], rightColumn: [] });
    }
  },

  buildColumns(items) {
    const left = [];
    const right = [];
    let toggle = true;
    (items || []).forEach(item => {
      if (item.admission) { left.unshift(item); return; }
      if (item.type === 'image') {
        (left.length <= right.length ? left : right).push(item);
      } else {
        (toggle ? left : right).push(item);
        toggle = !toggle;
      }
    });
    this.setData({ leftColumn: left, rightColumn: right });
  },

  // 本地模拟数据并做简单的左右列平衡
  fillMockWaterfall() {
    const now = '2024-10-12';
    const items = [
      { _id: 'admit', type: 'image', title: '录取通知书', content: '', url: '', date: now, admission: true },
      { _id: 'g1', type: 'grade', title: '2024-2025 上学期平均分 91', content: '语文92 数学95 英语90 物理88 化学90', date: now },
      { _id: 'p1', type: 'punishment', title: '警告', content: '上课讲话影响他人学习', date: '2024-03-10' },
      { _id: 'img1', type: 'image', title: '获奖证书', content: '数学竞赛二等奖', url: '', date: '2024-10-01' },
      { _id: 'g2', type: 'grade', title: '2023-2024 下学期平均分 88.4', content: '语文88 数学92 英语85 物理90 化学87', date: '2024-06-30' },
      { _id: 'img2', type: 'image', title: '操行评语', content: '积极参加活动', url: '', date: '2024-05-20' }
    ];

    // 简易分列：图片项按较短列优先，其他交替
    const left = [];
    const right = [];
    let toggle = true;
    items.forEach((item) => {
      const leftLen = left.length;
      const rightLen = right.length;
      if (item.type === 'image') {
        if (leftLen <= rightLen) left.push(item); else right.push(item);
      } else {
        if (toggle) left.push(item); else right.push(item);
        toggle = !toggle;
      }
    });
    this.setData({ leftColumn: left, rightColumn: right });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = [...this.data.leftColumn, ...this.data.rightColumn]
      .filter(i => i.type === 'image')
      .map(i => i.url);
    wx.previewImage({ current: url, urls });
  },

  // 打开档案详情
  openRecord(e) {
    const record = e.currentTarget.dataset.record;
    if (record.type === 'image' && record.url) {
      const urls = [...this.data.leftColumn, ...this.data.rightColumn]
        .filter(i => i.type === 'image')
        .map(i => i.url);
      wx.previewImage({ current: record.url, urls });
      return;
    }
    const content = `${record.title || ''}\n\n${record.content || ''}`.trim();
    wx.showModal({ title: '详情', content: content || '无详情', showCancel: false });
  }
});

