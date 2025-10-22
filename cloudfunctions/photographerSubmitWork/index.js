// 云函数：摄影师提交作品
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { orderId, photos, photographerNote } = event;

  console.log('========================================');
  console.log('📸 摄影师提交作品');
  console.log('   摄影师OpenID:', wxContext.OPENID);
  console.log('   订单ID:', orderId);
  console.log('   照片数量:', photos ? photos.length : 0);
  console.log('========================================');

  try {
    // 1. 验证参数
    if (!orderId) {
      return { success: false, error: '订单ID不能为空' };
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { success: false, error: '请至少上传一张照片' };
    }

    // 2. 查询订单，验证摄影师权限
    const orderRes = await db.collection('activity_orders')
      .doc(orderId)
      .get();

    if (!orderRes.data) {
      return { success: false, error: '订单不存在' };
    }

    const order = orderRes.data;

    // 3. 验证摄影师权限（必须是订单指定的摄影师）
    const photographerRes = await db.collection('photographers')
      .where({ _openid: wxContext.OPENID })
      .get();

    if (!photographerRes.data || photographerRes.data.length === 0) {
      console.error('❌ 当前用户不是摄影师');
      return { success: false, error: '无权限：您不是注册的摄影师' };
    }

    const photographer = photographerRes.data[0];

    // 验证是否是订单指定的摄影师
    if (order.photographerId !== photographer._id) {
      console.error('❌ 不是订单指定的摄影师');
      console.error('   订单摄影师ID:', order.photographerId);
      console.error('   当前摄影师ID:', photographer._id);
      return { success: false, error: '无权限：您不是该订单的指定摄影师' };
    }

    // 4. 验证订单状态（只有进行中的订单才能提交作品）
    if (order.status !== 'in_progress') {
      console.warn('⚠️ 订单状态不是in_progress');
      console.warn('   当前状态:', order.status);
      // 允许pending_review状态重新提交（用于修改作品）
      if (order.status !== 'pending_review') {
        return { 
          success: false, 
          error: `订单状态错误（${order.status}），无法提交作品` 
        };
      }
    }

    console.log('✅ 权限验证通过，开始更新订单');

    // 5. 更新订单
    await db.collection('activity_orders').doc(orderId).update({
      data: {
        status: 'pending_review', // 待管理员审核
        photos: photos,
        photographerNote: photographerNote || '',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // 清除之前的拒绝原因
        adminRejectReason: _.remove(),
        adminRejectedAt: _.remove(),
        rejectReason: _.remove(),
        rejectedAt: _.remove()
      }
    });

    console.log('✅ 订单更新成功');
    console.log('   新状态: pending_review');
    console.log('   照片数量:', photos.length);

    return {
      success: true,
      message: '作品提交成功，等待管理员审核'
    };

  } catch (err) {
    console.error('❌ 提交作品失败:', err);
    return {
      success: false,
      error: err.message || '提交失败'
    };
  }
};

