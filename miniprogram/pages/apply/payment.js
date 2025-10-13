// pages/apply/payment.js - 支付页面逻辑
const storage = require('../../utils/storage.js');

Page({
  data: {
    photographer: {},
    formData: {},
    studentId: '',
    paymentMethod: 'wechat'
  },

  onLoad() {
    // 获取所有必要数据
    const photographerData = wx.getStorageSync('selectedPhotographer');
    const formData = JSON.parse(wx.getStorageSync('applyFormData'));
    const studentId = wx.getStorageSync('studentId');

    if (photographerData) {
      this.setData({
        photographer: JSON.parse(photographerData),
        formData,
        studentId
      });
    } else {
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 选择支付方式
  selectPaymentMethod(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({
      paymentMethod: method
    });
  },

  // 提交支付
  submitPayment() {
    wx.showLoading({
      title: '支付处理中...'
    });

    // 模拟支付过程
    setTimeout(() => {
      wx.hideLoading();

      // 创建申请记录
      const application = {
        id: 'app_' + Date.now(),
        studentId: this.data.studentId,
        studentName: this.data.formData.childName,
        parentName: this.data.formData.parentName,
        parentPhone: this.data.formData.parentPhone,
        childPhoto: this.data.formData.childPhoto,
        photographerId: this.data.photographer.id,
        photographerName: this.data.photographer.name,
        price: this.data.photographer.price,
        paymentMethod: this.data.paymentMethod,
        status: 'photographing', // photographing: 摄影师拍摄中
        formData: this.data.formData,
        createDate: wx.getStorageSync('createDate'),
        paymentTime: new Date().toLocaleString('zh-CN'),
        idPhoto: '' // 证件照，待摄影师上传
      };

      // 保存申请记录
      storage.saveApplication(application);

      // 清除临时数据
      wx.removeStorageSync('applyFormData');
      wx.removeStorageSync('selectedPhotographer');
      wx.removeStorageSync('studentId');
      wx.removeStorageSync('createDate');

      // 显示成功提示
      wx.showModal({
        title: '支付成功',
        content: '您的入学申请已提交，摄影师将在3个工作日内完成拍摄。',
        showCancel: false,
        success: () => {
          // 跳转到状态查看页面
          wx.redirectTo({
            url: '/pages/apply/status?id=' + application.id
          });
        }
      });
    }, 2000);
  }
});

