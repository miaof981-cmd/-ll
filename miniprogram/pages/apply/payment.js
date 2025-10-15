// pages/apply/payment.js - 支付页面逻辑
const storage = require('../../utils/storage.js');
const orderNumber = require('../../utils/order-number.js');

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
  async submitPayment() {
    wx.showLoading({
      title: '提交中...'
    });

    try {
      // 获取当前用户的 openid
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedLogin'
      });
      
      const userOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;
      
      if (!userOpenId) {
        throw new Error('无法获取用户信息');
      }

      const db = wx.cloud.database();
      const createDate = wx.getStorageSync('createDate') || new Date().toISOString();

      // 1. 创建学生记录
      const studentData = {
        studentId: this.data.studentId,
        name: this.data.formData.childName,
        gender: this.data.formData.childGender,
        age: parseInt(this.data.formData.childAge) || 0,
        parentOpenid: userOpenId,
        parentName: this.data.formData.parentName,
        parentPhone: this.data.formData.parentPhone,
        lifePhotos: this.data.formData.childPhoto ? [this.data.formData.childPhoto] : [],
        status: 'waiting_photo', // 等待证件照拍摄
        createdAt: createDate,
        updatedAt: new Date().toISOString()
      };

      const studentRes = await db.collection('students').add({
        data: studentData
      });

      console.log('✅ 学生记录创建成功:', studentRes._id);

      // 2. 获取证件照活动ID（查找默认证件照活动）
      const activityRes = await db.collection('activities')
        .where({
          isDefault: true,
          category: '证件照'
        })
        .get();

      let activityId = '';
      if (activityRes.data && activityRes.data.length > 0) {
        activityId = activityRes.data[0]._id;
      }

      // 3. 创建证件照订单
      const generatedOrderNo = orderNumber.generateOrderNumber();
      console.log('✅ 生成订单号:', generatedOrderNo);
      
      const orderData = {
        orderNo: generatedOrderNo, // 订单号
        activityId: activityId,
        studentId: this.data.studentId,
        studentName: this.data.formData.childName,
        parentName: this.data.formData.parentName || '',
        parentPhone: this.data.formData.parentPhone || '',
        gender: this.data.formData.gender || '',
        age: this.data.formData.age || 0,
        class: this.data.formData.class || '待分配',
        photographerId: this.data.photographer._id || this.data.photographer.id,
        photographerName: this.data.photographer.name,
        lifePhotos: this.data.formData.childPhoto ? [this.data.formData.childPhoto] : [],
        remark: this.data.formData.expectations || '',
        totalPrice: this.data.photographer.price || 20,
        status: 'in_progress', // 进行中（拍摄中）
        paymentMethod: this.data.paymentMethod,
        rejectCount: 0, // 初始化拒绝次数为0
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const orderRes = await db.collection('activity_orders').add({
        data: orderData
      });

      console.log('✅ 订单创建成功:', orderRes._id);

      // 4. 本地也保存一份（兼容旧逻辑）
      const application = {
        id: orderRes._id,
        studentId: this.data.studentId,
        studentName: this.data.formData.childName,
        parentName: this.data.formData.parentName,
        parentPhone: this.data.formData.parentPhone,
        childPhoto: this.data.formData.childPhoto,
        photographerId: this.data.photographer.id || this.data.photographer._id,
        photographerName: this.data.photographer.name,
        price: this.data.photographer.price,
        paymentMethod: this.data.paymentMethod,
        status: 'photographing',
        formData: this.data.formData,
        createDate: createDate,
        paymentTime: new Date().toLocaleString('zh-CN'),
        idPhoto: ''
      };

      storage.saveApplication(application);

      // 清除临时数据
      wx.removeStorageSync('applyFormData');
      wx.removeStorageSync('selectedPhotographer');
      wx.removeStorageSync('studentId');
      wx.removeStorageSync('createDate');

      wx.hideLoading();

      // 显示成功提示
      wx.showModal({
        title: '申请成功',
        content: '您的入学申请已提交，摄影师将在3个工作日内完成拍摄。',
        showCancel: false,
        success: () => {
          // 跳转到我的订单页面
          wx.redirectTo({
            url: '/pages/user/orders/orders'
          });
        }
      });
    } catch (e) {
      console.error('❌ 提交失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败: ' + e.message,
        icon: 'none'
      });
    }
  }
});

