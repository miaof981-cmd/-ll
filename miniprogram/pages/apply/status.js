// pages/apply/status.js - 申请状态查看
const storage = require('../../utils/storage.js');

Page({
  data: {
    application: {}
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      const application = storage.getApplicationById(id);
      if (application) {
        this.setData({ application });
      } else {
        wx.showToast({
          title: '申请记录不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      }
    }
  },

  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  viewArchive() {
    // 跳转到学生档案页面（如果已完成）
    wx.showToast({
      title: '档案查看功能开发中',
      icon: 'none'
    });
  }
});

