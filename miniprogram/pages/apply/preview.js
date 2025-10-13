// pages/apply/preview.js - 学籍档案预览逻辑
Page({
  data: {
    formData: {},
    studentId: '',
    createDate: ''
  },

  onLoad() {
    // 获取表单数据
    const savedData = wx.getStorageSync('applyFormData');
    if (savedData) {
      const formData = JSON.parse(savedData);
      
      // 生成学号（年份 + 4位随机数）
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const studentId = `${year}${randomNum}`;
      
      // 获取当前日期
      const now = new Date();
      const createDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      this.setData({
        formData,
        studentId,
        createDate
      });
    } else {
      // 如果没有数据，返回填写页面
      wx.showToast({
        title: '请先填写信息',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 预览生活照片
  previewLifePhoto() {
    wx.previewImage({
      urls: [this.data.formData.childPhoto],
      current: this.data.formData.childPhoto
    });
  },

  // 返回修改
  goBack() {
    wx.navigateBack();
  },

  // 前往选择摄影师
  goToPhotographer() {
    // 保存学号和建档日期
    wx.setStorageSync('studentId', this.data.studentId);
    wx.setStorageSync('createDate', this.data.createDate);
    
    wx.navigateTo({
      url: '/pages/apply/photographer'
    });
  }
});

