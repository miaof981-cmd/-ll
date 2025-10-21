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
      
      this.setData({
        formData,
        studentId: '待分配', // 学号在确认收货后才分配
        createDate: ''
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
  previewLifePhoto(e) {
    const index = e.currentTarget.dataset.index || 0;
    wx.previewImage({
      urls: this.data.formData.lifePhotos,
      current: this.data.formData.lifePhotos[index]
    });
  },

  // 返回修改
  goBack() {
    wx.navigateBack();
  },

  // 前往选择摄影师
  goToPhotographer() {
    // 不再保存学号和建档日期（将在确认收货后自动生成）
    wx.navigateTo({
      url: '/pages/apply/photographer'
    });
  }
});

