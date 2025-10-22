// pages/apply/payment.js - 支付页面逻辑
const storage = require('../../utils/storage.js');
const orderNumber = require('../../utils/order-number.js');

Page({
  data: {
    photographer: {},
    formData: {},
    studentId: '',
    submitting: false, // 防止重复提交
    orderCreating: false // 订单创建中标志
  },

  onLoad() {
    // 检查是否正在创建订单（全局锁）
    const isCreating = wx.getStorageSync('orderCreating');
    if (isCreating) {
      console.warn('⚠️ 检测到订单正在创建中，禁止重复进入');
      wx.showModal({
        title: '提示',
        content: '订单正在创建中，请稍候...',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
      return;
    }

    // 获取所有必要数据
    const photographerData = wx.getStorageSync('selectedPhotographer');
    const formDataStr = wx.getStorageSync('applyFormData');
    const studentId = wx.getStorageSync('studentId');

    // 检查是否有必要的数据
    if (!photographerData || !formDataStr) {
      console.warn('⚠️ 缺少必要数据，可能是重复进入或数据已清除');
      wx.showModal({
        title: '提示',
        content: '订单信息已失效，请重新提交申请',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
      return;
    }

    const formData = JSON.parse(formDataStr);

    if (photographerData && formData) {
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
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
    }
  },

  // 提交支付
  async submitPayment() {
    // 防止重复提交
    if (this.data.submitting || this.data.orderCreating) {
      console.warn('⚠️ 正在提交中，请勿重复点击');
      return;
    }

    // 设置全局锁
    console.log('🔒 设置全局锁，防止重复创建订单');
    wx.setStorageSync('orderCreating', true);
    this.setData({ submitting: true, orderCreating: true });

    wx.showLoading({
      title: '提交中...',
      mask: true // 添加遮罩，防止用户点击其他地方
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

      // 1. 获取证件照活动ID（查找证件照活动，优先默认，无默认则取第一个）
      const activityRes = await db.collection('activities')
        .where({
          category: '证件照'
        })
        .get();

      let activityId = '';
      if (activityRes.data && activityRes.data.length > 0) {
        // 优先选择默认活动，如果没有默认则取第一个
        const defaultActivity = activityRes.data.find(a => a.isDefault === true);
        activityId = defaultActivity ? defaultActivity._id : activityRes.data[0]._id;
        console.log('✅ 使用证件照活动:', activityId);
      } else {
        console.warn('⚠️ 未找到证件照活动');
      }

      // 2. 创建证件照订单
      const generatedOrderNo = orderNumber.generateOrderNumber();
      console.log('✅ 生成订单号:', generatedOrderNo);
      
      const orderData = {
        userId: userOpenId,  // 新增：订单归属用户
        orderNo: generatedOrderNo, // 订单号
        activityId: activityId,
        studentName: this.data.formData.childName,
        parentName: this.data.formData.parentName || '',
        parentPhone: this.data.formData.parentPhone || '',
        parentWechat: this.data.formData.parentWechat || '', // 家长微信号
        gender: this.data.formData.childGender || '', // 修正：使用 childGender
        age: parseInt(this.data.formData.childAge) || 0, // 修正：使用 childAge
        class: '待分配', // 暂时没有班级字段
        photographerId: this.data.photographer._id || this.data.photographer.id,
        photographerName: this.data.photographer.name,
        lifePhotos: this.data.formData.lifePhotos || [],
        remark: this.data.formData.expectations || '', // 对孩子的期许
        expectations: this.data.formData.expectations || '', // 对孩子的期许（冗余字段，确保兼容）
        totalPrice: this.data.photographer.price || 20,
        status: 'pending_payment', // 待支付
        paymentStatus: 'unpaid',   // 未支付
        paymentMethod: 'wechat',   // 固定使用微信支付
        rejectCount: 0, // 初始化拒绝次数为0
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const orderRes = await db.collection('activity_orders').add({
        data: orderData
      });

      console.log('✅ 订单创建成功:', orderRes._id);

      // 3. 调用微信支付
      await this.callWechatPay(generatedOrderNo, orderData.totalPrice, orderRes._id);
    } catch (e) {
      console.error('❌ 提交失败:', e);
      
      // 失败时清除全局锁，允许重试
      console.log('❌ 订单创建失败，清除全局锁，允许重试');
      wx.removeStorageSync('orderCreating');
      this.setData({ submitting: false, orderCreating: false });
      
      wx.hideLoading();
      wx.showToast({
        title: '提交失败: ' + e.message,
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 调用微信支付
  async callWechatPay(orderNo, totalPrice, orderId) {
    try {
      console.log('💳 调用微信支付...');
      console.log('   订单号:', orderNo);
      console.log('   金额:', totalPrice, '元');
      console.log('   订单ID:', orderId);

      // 调用统一下单云函数
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedOrder',
        data: {
          orderNo: orderNo,
          totalFee: Math.round(totalPrice * 100), // 转换为分
          description: '次元学校-证件照拍摄'
        }
      });

      console.log('📦 统一下单结果:', result);

      if (!result.success) {
        throw new Error(result.errMsg || '统一下单失败');
      }

      // 调起微信支付
      // 云函数返回结构：{ success: true, payment: {...} }
      const paymentResult = result.payment;
      
      if (!paymentResult || !paymentResult.timeStamp) {
        console.error('❌ 支付参数缺失:', result);
        throw new Error('支付参数格式错误');
      }

      console.log('💳 支付参数:', paymentResult);
      
      wx.hideLoading();
      
      const payRes = await wx.requestPayment({
        timeStamp: paymentResult.timeStamp,
        nonceStr: paymentResult.nonceStr,
        package: paymentResult.package,
        signType: paymentResult.signType,
        paySign: paymentResult.paySign
      });

      console.log('✅ 支付成功:', payRes);

      // 支付成功后清除全局锁和缓存数据
      console.log('✅ 支付成功，清除全局锁和缓存数据');
      wx.removeStorageSync('orderCreating');
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
          // 跳转到订单详情
          wx.redirectTo({
            url: `/pages/user/orders/detail?orderId=${orderId}`
          });
        }
      });

    } catch (err) {
      console.error('❌ 支付失败:', err);
      
      // 支付失败，清除锁
      wx.removeStorageSync('orderCreating');
      this.setData({ submitting: false, orderCreating: false });

      if (err.errMsg === 'requestPayment:fail cancel') {
        // 用户取消支付
        wx.showModal({
          title: '支付取消',
          content: '您取消了支付，订单已保存，可以稍后在"我的订单"中继续支付。',
          showCancel: false,
          success: () => {
            wx.redirectTo({
              url: '/pages/user/orders/orders'
            });
          }
        });
      } else {
        // 其他错误
        wx.showToast({
          title: '支付失败: ' + (err.errMsg || err.message),
          icon: 'none',
          duration: 3000
        });
      }
    }
  },

  // 页面卸载时清理
  onUnload() {
    // 如果订单还在创建中，不清除锁（让锁继续生效）
    // 如果订单已创建完成或失败，锁已被清除
    if (!this.data.orderCreating) {
      wx.removeStorageSync('orderCreating');
    }
  }
});

