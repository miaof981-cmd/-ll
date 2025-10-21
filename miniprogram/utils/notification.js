// 消息通知工具类
// 用于发送订阅消息通知

/**
 * 订阅消息模板ID配置
 * 需要在微信公众平台配置对应的模板
 */
const TEMPLATE_IDS = {
  // 用户端通知
  ORDER_CREATED: 'RWj4PBhIbcTzunNXYo-jJPTw9P_S7HQGCtqmDQTcqWg',        // 订单创建成功
  ORDER_ACCEPTED: '',       // 摄影师已接单
  PHOTO_UPLOADED: '',       // 照片已上传待审核
  PHOTO_APPROVED: '',       // 照片审核通过
  PHOTO_REJECTED: '',       // 照片被拒绝
  ORDER_COMPLETED: '',      // 订单已完成
  
  // 摄影师端通知
  NEW_ORDER: '',            // 新订单待处理
  PHOTO_REVIEW_PASS: '',    // 照片审核通过
  PHOTO_REVIEW_REJECT: '',  // 照片被拒绝需修改
  
  // 管理员端通知
  ADMIN_NEW_ORDER: '',      // 新订单待审核
  ADMIN_PHOTO_UPLOADED: '', // 摄影师已上传照片
};

/**
 * 请求订阅消息权限
 * @param {Array} templateIds - 模板ID数组
 * @returns {Promise}
 */
async function requestSubscribeMessage(templateIds) {
  try {
    const result = await wx.requestSubscribeMessage({
      tmplIds: templateIds
    });
    console.log('✅ 订阅消息授权结果:', result);
    return result;
  } catch (err) {
    console.error('❌ 订阅消息授权失败:', err);
    return null;
  }
}

/**
 * 发送订单创建通知（用户）
 * @param {Object} params
 * @param {string} params.openid - 用户openid
 * @param {string} params.orderNo - 订单号
 * @param {string} params.studentName - 学生姓名
 * @param {number} params.amount - 订单金额
 * @param {string} params.photographerName - 摄影师姓名
 */
async function sendOrderCreatedNotification(params) {
  if (!TEMPLATE_IDS.ORDER_CREATED) {
    const error = '⚠️ 未配置订单创建通知模板ID';
    console.warn(error);
    throw new Error(error);
  }

  console.log('📨 准备发送订单创建通知:', {
    touser: params.openid,
    template_id: TEMPLATE_IDS.ORDER_CREATED,
    orderNo: params.orderNo
  });

  try {
    const result = await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.openid,
        template_id: TEMPLATE_IDS.ORDER_CREATED,
        page: `/pages/user/orders/detail?id=${params.orderId}`,
        data: {
          // 正确的字段：thing2（商品名称）, amount3（订单金额）, character_string6（订单编号）
          thing2: { value: '证件照拍摄服务' },  // 商品名称
          amount3: { value: `${params.amount}.00` },  // 订单金额（格式：50.00）
          character_string6: { value: params.orderNo }  // 订单编号
        }
      }
    });
    console.log('✅ 订单创建通知发送成功:', result);
    return result;
  } catch (err) {
    console.error('❌ 订单创建通知发送失败:', err);
    throw err;
  }
}

/**
 * 发送照片上传通知（用户）
 * @param {Object} params
 */
async function sendPhotoUploadedNotification(params) {
  if (!TEMPLATE_IDS.PHOTO_UPLOADED) {
    console.warn('⚠️ 未配置照片上传通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.openid,
        template_id: TEMPLATE_IDS.PHOTO_UPLOADED,
        page: `/pages/user/orders/detail?id=${params.orderId}`,
        data: {
          thing1: { value: '证件照拍摄' },
          character_string2: { value: params.orderNo },
          thing3: { value: '摄影师已上传照片，请查看确认' },
          date4: { value: params.uploadTime }
        }
      }
    });
    console.log('✅ 照片上传通知发送成功');
  } catch (err) {
    console.error('❌ 照片上传通知发送失败:', err);
  }
}

/**
 * 发送照片审核通过通知（用户）
 * @param {Object} params
 */
async function sendPhotoApprovedNotification(params) {
  if (!TEMPLATE_IDS.PHOTO_APPROVED) {
    console.warn('⚠️ 未配置照片审核通过通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.openid,
        template_id: TEMPLATE_IDS.PHOTO_APPROVED,
        page: `/pages/user/orders/detail?id=${params.orderId}`,
        data: {
          thing1: { value: '证件照审核通过' },
          character_string2: { value: params.orderNo },
          thing3: { value: '照片已通过审核，请确认' },
          date4: { value: params.approveTime }
        }
      }
    });
    console.log('✅ 照片审核通过通知发送成功');
  } catch (err) {
    console.error('❌ 照片审核通过通知发送失败:', err);
  }
}

/**
 * 发送照片被拒绝通知（用户）
 * @param {Object} params
 */
async function sendPhotoRejectedNotification(params) {
  if (!TEMPLATE_IDS.PHOTO_REJECTED) {
    console.warn('⚠️ 未配置照片被拒绝通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.openid,
        template_id: TEMPLATE_IDS.PHOTO_REJECTED,
        page: `/pages/user/orders/detail?id=${params.orderId}`,
        data: {
          thing1: { value: '照片需要修改' },
          character_string2: { value: params.orderNo },
          thing3: { value: params.rejectReason || '照片不符合要求，请重新拍摄' },
          date4: { value: params.rejectTime }
        }
      }
    });
    console.log('✅ 照片被拒绝通知发送成功');
  } catch (err) {
    console.error('❌ 照片被拒绝通知发送失败:', err);
  }
}

/**
 * 发送订单完成通知（用户）
 * @param {Object} params
 */
async function sendOrderCompletedNotification(params) {
  if (!TEMPLATE_IDS.ORDER_COMPLETED) {
    console.warn('⚠️ 未配置订单完成通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.openid,
        template_id: TEMPLATE_IDS.ORDER_COMPLETED,
        page: `/pages/records/records?studentId=${params.studentId}`,
        data: {
          thing1: { value: '证件照拍摄' },
          character_string2: { value: params.orderNo },
          thing3: { value: '订单已完成，学生档案已创建' },
          date4: { value: params.completeTime }
        }
      }
    });
    console.log('✅ 订单完成通知发送成功');
  } catch (err) {
    console.error('❌ 订单完成通知发送失败:', err);
  }
}

/**
 * 发送新订单通知（摄影师）
 * @param {Object} params
 */
async function sendNewOrderToPhotographer(params) {
  if (!TEMPLATE_IDS.NEW_ORDER) {
    console.warn('⚠️ 未配置新订单通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.photographerOpenid,
        template_id: TEMPLATE_IDS.NEW_ORDER,
        page: `/pages/photographer/order-detail?id=${params.orderId}`,
        data: {
          thing1: { value: '证件照拍摄' },
          character_string2: { value: params.orderNo },
          name3: { value: params.studentName },
          amount4: { value: `¥${params.amount}` },
          thing5: { value: '新订单待处理，请及时拍摄' }
        }
      }
    });
    console.log('✅ 新订单通知（摄影师）发送成功');
  } catch (err) {
    console.error('❌ 新订单通知（摄影师）发送失败:', err);
  }
}

/**
 * 发送照片审核通过通知（摄影师）
 * @param {Object} params
 */
async function sendPhotoReviewPassToPhotographer(params) {
  if (!TEMPLATE_IDS.PHOTO_REVIEW_PASS) {
    console.warn('⚠️ 未配置照片审核通过通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.photographerOpenid,
        template_id: TEMPLATE_IDS.PHOTO_REVIEW_PASS,
        page: `/pages/photographer/order-detail?id=${params.orderId}`,
        data: {
          thing1: { value: '照片审核通过' },
          character_string2: { value: params.orderNo },
          thing3: { value: '您上传的照片已通过审核' },
          date4: { value: params.approveTime }
        }
      }
    });
    console.log('✅ 照片审核通过通知（摄影师）发送成功');
  } catch (err) {
    console.error('❌ 照片审核通过通知（摄影师）发送失败:', err);
  }
}

/**
 * 发送照片被拒绝通知（摄影师）
 * @param {Object} params
 */
async function sendPhotoReviewRejectToPhotographer(params) {
  if (!TEMPLATE_IDS.PHOTO_REVIEW_REJECT) {
    console.warn('⚠️ 未配置照片被拒绝通知模板ID');
    return;
  }

  try {
    await wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: {
        touser: params.photographerOpenid,
        template_id: TEMPLATE_IDS.PHOTO_REVIEW_REJECT,
        page: `/pages/photographer/order-detail?id=${params.orderId}`,
        data: {
          thing1: { value: '照片需要修改' },
          character_string2: { value: params.orderNo },
          thing3: { value: params.rejectReason || '照片不符合要求，请重新拍摄' },
          date4: { value: params.rejectTime }
        }
      }
    });
    console.log('✅ 照片被拒绝通知（摄影师）发送成功');
  } catch (err) {
    console.error('❌ 照片被拒绝通知（摄影师）发送失败:', err);
  }
}

module.exports = {
  TEMPLATE_IDS,
  requestSubscribeMessage,
  sendOrderCreatedNotification,
  sendPhotoUploadedNotification,
  sendPhotoApprovedNotification,
  sendPhotoRejectedNotification,
  sendOrderCompletedNotification,
  sendNewOrderToPhotographer,
  sendPhotoReviewPassToPhotographer,
  sendPhotoReviewRejectToPhotographer
};

