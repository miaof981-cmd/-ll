const storage = require('../../../utils/storage');

Page({
  data: {
    id: '', studentId: '', name: '', password: '',
    // 可配置：学号前缀与起始序号、默认初始密码
    prefix: '2025',
    nextSeq: 1,
    defaultPassword: '123456',
    // 初始化档案编辑
    initRecords: [],
    admitTitle: '',
    admitUrl: ''
  },
  onLoad(query) {
    if (query && query.id) {
      const item = storage.getArray('students').find(s => s.studentId === query.id);
      if (item) this.setData({ id: item.studentId, studentId: item.studentId, name: item.name, password: item.password });
      wx.setNavigationBarTitle({ title: '编辑学生' });
    } else {
      wx.setNavigationBarTitle({ title: '新建学生' });
      // 系统自动分配学号与默认密码
      const studentId = `${this.data.prefix}${String(this.data.nextSeq).padStart(4,'0')}`;
      this.setData({ studentId, password: this.data.defaultPassword });
    }
  },
  onStudentId(e) { this.setData({ studentId: e.detail.value }); },
  onName(e) { this.setData({ name: e.detail.value }); },
  onPassword(e) { this.setData({ password: e.detail.value }); },
  // 初始化档案操作
  setRecordType(e) {
    const idx = e.currentTarget.dataset.idx;
    const map = ['image','punishment','grade'];
    const val = map[Number(e.detail.value)] || 'image';
    const key = `initRecords[${idx}].type`;
    const obj = {};
    obj[key] = val;
    this.setData(obj);
  },
  setRecordField(e) { const { idx, field } = e.currentTarget.dataset; const key = `initRecords[${idx}][${field}]`; const obj = {}; obj[key] = e.detail.value; this.setData(obj); },
  addRecord() { this.setData({ initRecords: [...this.data.initRecords, { type: 'image', title: '', description: '', url: '' }] }); },
  removeRecord(e) { const idx = e.currentTarget.dataset.idx; const arr = this.data.initRecords.slice(); arr.splice(idx,1); this.setData({ initRecords: arr }); },
  chooseRecordImage(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (path) { const key = `initRecords[${idx}].url`; const obj = {}; obj[key] = path; this.setData(obj); }
    }});
  },

  onAdmitTitle(e) { this.setData({ admitTitle: e.detail.value }); },
  onAdmitUrl(e) { this.setData({ admitUrl: e.detail.value }); },
  chooseAdmitImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (path) this.setData({ admitUrl: path });
    }});
  },

  save() {
    const { id, studentId, name, password, initRecords, admitTitle, admitUrl } = this.data;
    if (!studentId.trim() || !name.trim() || !password.trim()) { wx.showToast({ title: '请填写完整', icon: 'error' }); return; }
    const item = { studentId: studentId.trim(), name: name.trim(), password: password.trim() };
    storage.upsertById('students', item, 'studentId');
    // 初始化档案与录取通知书（存入 records:studentId）
    const recordsKey = `records:${studentId}`;
    const existing = storage.getArray(recordsKey);
    const normalized = (initRecords || []).filter(r => r.title || r.url || r.description).map((r, i) => ({
      _id: `${Date.now()}-${i}`,
      type: r.type,
      title: r.title,
      content: r.description,
      url: r.url,
      date: new Date().toISOString().slice(0,10)
    }));
    let admission = [];
    if (admitTitle || admitUrl) {
      admission = [{ _id: `${Date.now()}-admit`, type: 'image', title: admitTitle || '录取通知书', content: '', url: admitUrl, date: new Date().toISOString().slice(0,10), admission: true }];
    }
    // 只写入录取通知书 + 初始化档案，不注入任何其它预设
    storage.setArray(recordsKey, [...admission, ...normalized, ...existing]);
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 500);
  }
});


