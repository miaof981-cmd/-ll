// 测试订阅消息页面
const notificationUtil = require('../../utils/notification');

Page({
  data: {
    testResult: '',
    userOpenid: '',
    debugLog: '', // 调试日志
    testOrderData: {
      orderId: 'test_order_001',
      orderNo: 'ORD20250118001',
      studentName: '张三',
      amount: 50,
      photographerName: '李摄影师'
    }
  },

  // 添加调试日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] ${message}\n${this.data.debugLog}`;
    this.setData({
      debugLog: newLog
    });
    console.log(message);
  },

  onLoad() {
    // 获取用户openid（从 unifiedUserInfo 中获取）
    const userInfo = wx.getStorageSync('unifiedUserInfo');
    const openid = userInfo ? (userInfo._openid || userInfo.openid) : '';
    
    this.addLog('页面加载完成');
    this.addLog('用户openid: ' + (openid || '未登录'));
    
    this.setData({
      userOpenid: openid || '未登录'
    });
  },

  // 测试1：请求订阅消息授权
  async testRequestAuth() {
    wx.showLoading({ title: '请求授权中...' });
    
    try {
      const result = await notificationUtil.requestSubscribeMessage([
        notificationUtil.TEMPLATE_IDS.ORDER_CREATED
      ]);
      
      console.log('✅ 授权结果:', result);
      
      this.setData({
        testResult: '授权成功！\n' + JSON.stringify(result, null, 2)
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '授权成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('❌ 授权失败:', err);
      this.setData({
        testResult: '授权失败：' + err.message
      });
      wx.hideLoading();
      wx.showToast({
        title: '授权失败',
        icon: 'error'
      });
    }
  },

  // 测试2：发送订单创建通知
  async testSendOrderNotification() {
    // 获取用户openid
    const userInfo = wx.getStorageSync('unifiedUserInfo');
    const openid = userInfo ? (userInfo._openid || userInfo.openid) : '';
    
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录小程序\n\n请先进入"我的"页面完成登录',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '发送通知中...' });

    try {
      // 先请求授权
      await notificationUtil.requestSubscribeMessage([
        notificationUtil.TEMPLATE_IDS.ORDER_CREATED
      ]);

      // 发送通知
      await notificationUtil.sendOrderCreatedNotification({
        openid: openid,
        orderId: this.data.testOrderData.orderId,
        orderNo: this.data.testOrderData.orderNo,
        studentName: this.data.testOrderData.studentName,
        amount: this.data.testOrderData.amount,
        photographerName: this.data.testOrderData.photographerName
      });

      console.log('✅ 订单创建通知发送成功');
      
      this.setData({
        testResult: '通知发送成功！\n请查看微信"服务通知"'
      });

      wx.hideLoading();
      wx.showModal({
        title: '发送成功',
        content: '请打开微信查看"服务通知"，应该收到一条订单创建通知',
        showCancel: false
      });
    } catch (err) {
      console.error('❌ 发送通知失败:', err);
      this.setData({
        testResult: '发送失败：' + err.message
      });
      wx.hideLoading();
      wx.showModal({
        title: '发送失败',
        content: err.message,
        showCancel: false
      });
    }
  },

  // 测试3：模拟完整下单流程（不涉及支付）
  async testFullPaymentFlow() {
    this.addLog('========== 开始测试 ==========');
    
    // 获取用户openid
    const userInfo = wx.getStorageSync('unifiedUserInfo');
    const openid = userInfo ? (userInfo._openid || userInfo.openid) : '';
    
    this.addLog('检查登录状态: ' + (openid ? '已登录' : '未登录'));
    
    if (!openid) {
      this.addLog('❌ 未登录，测试终止');
      wx.showModal({
        title: '提示',
        content: '请先登录小程序\n\n请先进入"我的"页面完成登录',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '模拟下单中...' });

    try {
      // 步骤1：请求订阅消息授权
      this.addLog('步骤1: 请求订阅消息授权');
      const authResult = await notificationUtil.requestSubscribeMessage([
        notificationUtil.TEMPLATE_IDS.ORDER_CREATED
      ]);
      this.addLog('授权结果: ' + JSON.stringify(authResult));

      // 步骤2：创建测试订单（模拟下单，不涉及支付）
      this.addLog('步骤2: 创建测试订单');
      const db = wx.cloud.database();
      const testOrderNo = 'TEST' + Date.now();
      
      const orderResult = await db.collection('activity_orders').add({
        data: {
          orderNo: testOrderNo,
          studentName: this.data.testOrderData.studentName,
          studentId: 'test_student_' + Date.now(),
          grade: '一年级',
          class: '1班',
          totalAmount: this.data.testOrderData.amount,
          status: 'paid',
          paymentStatus: 'paid',
          paymentMethod: 'test',
          userOpenid: openid,
          activityId: 'test_activity',
          activityName: '证件照拍摄测试',
          photographerId: 'test_photographer',
          photographerName: this.data.testOrderData.photographerName,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTest: true
        }
      });

      this.addLog('✅ 订单创建成功: ' + orderResult._id);

      // 步骤3：发送订阅消息
      this.addLog('步骤3: 发送订阅消息');
      this.addLog('模板ID: ' + notificationUtil.TEMPLATE_IDS.ORDER_CREATED);
      
      const sendResult = await notificationUtil.sendOrderCreatedNotification({
        openid: openid,
        orderId: orderResult._id,
        orderNo: testOrderNo,
        studentName: this.data.testOrderData.studentName,
        amount: this.data.testOrderData.amount,
        photographerName: this.data.testOrderData.photographerName
      });

      this.addLog('✅ 订阅消息发送完成');
      this.addLog('========== 测试完成 ==========');

      wx.hideLoading();
      
      this.setData({
        testResult: '✅ 测试成功！\n\n' +
                   '订单号: ' + testOrderNo + '\n' +
                   '订单ID: ' + orderResult._id + '\n\n' +
                   '请立即打开微信查看"服务通知"！'
      });

      wx.showModal({
        title: '测试完成',
        content: '模拟下单成功！\n\n✅ 测试订单已创建\n✅ 订阅消息已发送\n\n请立即打开微信查看"服务通知"',
        confirmText: '查看日志',
        cancelText: '知道了'
      });
    } catch (err) {
      this.addLog('❌ 错误: ' + err.message);
      this.addLog('错误详情: ' + JSON.stringify(err));
      
      this.setData({
        testResult: '❌ 测试失败\n\n' + 
                   '错误: ' + err.message
      });
      wx.hideLoading();
      wx.showModal({
        title: '测试失败',
        content: err.message + '\n\n请查看页面顶部的调试日志',
        showCancel: false
      });
    }
  },

  // 测试4：直接测试云函数（不需要授权）
  async testCloudFunction() {
    this.addLog('========== 测试云函数 ==========');
    
    const userInfo = wx.getStorageSync('unifiedUserInfo');
    const openid = userInfo ? (userInfo._openid || userInfo.openid) : '';
    
    if (!openid) {
      this.addLog('❌ 未登录');
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false
      });
      return;
    }

    this.addLog('用户openid: ' + openid);
    this.addLog('模板ID: ' + notificationUtil.TEMPLATE_IDS.ORDER_CREATED);

    wx.showLoading({ title: '测试中...' });

    try {
      this.addLog('调用云函数...');
      
      const result = await wx.cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          touser: openid,
          template_id: notificationUtil.TEMPLATE_IDS.ORDER_CREATED,
          page: '/pages/index/index',
          data: {
            // 正确的字段：thing2, amount3, character_string6
            thing2: { value: '证件照拍摄服务' },  // 商品名称
            amount3: { value: '50.00' },  // 订单金额（格式：50.00）
            character_string6: { value: 'TEST' + Date.now() }  // 订单编号
          }
        }
      });

      this.addLog('云函数返回: ' + JSON.stringify(result));
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        this.addLog('✅ 发送成功！');
        wx.showModal({
          title: '测试成功',
          content: '云函数调用成功！\n\n请打开微信查看"服务通知"',
          showCancel: false
        });
      } else {
        this.addLog('❌ 发送失败: ' + (result.result ? result.result.errMsg : '未知错误'));
        wx.showModal({
          title: '发送失败',
          content: result.result ? result.result.errMsg : '未知错误',
          showCancel: false
        });
      }
    } catch (err) {
      this.addLog('❌ 错误: ' + err.message);
      this.addLog('错误详情: ' + JSON.stringify(err));
      wx.hideLoading();
      wx.showModal({
        title: '测试失败',
        content: err.message,
        showCancel: false
      });
    }
  },

  // 清空测试结果
  clearResult() {
    this.setData({
      testResult: '',
      debugLog: ''
    });
  }
});

