// pages/admin/students/students.js
const storage = require('../../../utils/storage.js');

const PAGE_SIZE = 10;

Page({
  data: {
    students: [],
    filteredStudents: [],
    keyword: '',
    pageIndex: 1,
    totalPages: 1,
    currentPageStudents: []
  },

  onLoad() {
    this.loadStudents();
  },

  onShow() {
    this.loadStudents();
  },

  // 加载学生列表
  loadStudents() {
    const students = storage.getStudents();
    this.setData({ students }, () => {
      this.applyFilter();
    });
  },

  // 搜索关键词输入
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 搜索
  search() {
    this.setData({ pageIndex: 1 }, () => {
      this.applyFilter();
    });
  },

  // 应用过滤和分页
  applyFilter() {
    const { students, keyword, pageIndex } = this.data;
    const kw = (keyword || '').trim();
    
    // 过滤学生
    const filteredStudents = kw 
      ? students.filter(s => 
          (s.studentId || '').includes(kw) || 
          (s.name || '').includes(kw) ||
          (s.parentName || '').includes(kw)
        )
      : students;
    
    // 计算分页
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
    const validPageIndex = Math.min(pageIndex, totalPages);
    const start = (validPageIndex - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const currentPageStudents = filteredStudents.slice(start, end);
    
    this.setData({
      filteredStudents,
      totalPages,
      pageIndex: validPageIndex,
      currentPageStudents
    });
  },

  // 上一页
  prevPage() {
    if (this.data.pageIndex > 1) {
      this.setData({
        pageIndex: this.data.pageIndex - 1
      }, () => {
        this.applyFilter();
      });
    }
  },

  // 下一页
  nextPage() {
    if (this.data.pageIndex < this.data.totalPages) {
      this.setData({
        pageIndex: this.data.pageIndex + 1
      }, () => {
        this.applyFilter();
      });
    }
  },

  // 显示操作面板（iOS风格）
  showActionSheet(e) {
    const { studentid } = e.currentTarget.dataset;
    
    wx.showActionSheet({
      itemList: ['查看档案', '编辑信息', '删除学生'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 查看档案
            this.viewRecords(studentid);
            break;
          case 1: // 编辑信息
            this.editStudent(studentid);
            break;
          case 2: // 删除学生
            this.deleteStudent(studentid);
            break;
        }
      }
    });
  },

  // 添加学生
  addStudent() {
    wx.navigateTo({
      url: '/pages/admin/students/edit'
    });
  },

  // 编辑学生
  editStudent(studentId) {
    wx.navigateTo({
      url: `/pages/admin/students/edit?studentId=${studentId}`
    });
  },

  // 查看档案
  viewRecords(studentId) {
    wx.navigateTo({
      url: `/pages/records/records?studentId=${studentId}`
    });
  },

  // 删除学生
  deleteStudent(studentId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个学生吗？这将同时删除该学生的所有档案记录。',
      success: (res) => {
        if (res.confirm) {
          const success = storage.deleteStudent(studentId);
          
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadStudents();
          } else {
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
