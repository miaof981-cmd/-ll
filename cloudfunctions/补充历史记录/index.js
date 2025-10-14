/**
 * 补充历史记录云函数
 * 从现有订单中推断并补充历史记录到 order_photo_history
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('开始补充历史记录...');
    
    // 查询所有有拒绝记录但状态不是 pending_review 的订单
    const orders = await db.collection('activity_orders')
      .where({
        status: 'in_progress'
      })
      .get();
    
    console.log('找到订单数量:', orders.data.length);
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const order of orders.data) {
      // 检查是否已经有历史记录
      const existingHistory = await db.collection('order_photo_history')
        .where({ orderId: order._id })
        .count();
      
      if (existingHistory.total > 0) {
        console.log('订单已有历史记录，跳过:', order._id);
        skippedCount++;
        continue;
      }
      
      // 如果订单有照片且有拒绝原因，说明至少被拒绝过一次
      if (order.photos && order.photos.length > 0) {
        const historyRecord = {
          orderId: order._id,
          photos: order.photos,
          rejectType: '',
          rejectReason: '',
          submittedAt: order.submittedAt || order.createdAt,
          rejectedAt: '',
          createdAt: new Date().toISOString()
        };
        
        // 判断是管理员拒绝还是用户拒绝
        if (order.adminRejectReason) {
          historyRecord.rejectType = 'admin';
          historyRecord.rejectReason = order.adminRejectReason;
          historyRecord.rejectedAt = order.adminRejectedAt || order.updatedAt;
        } else if (order.rejectReason) {
          historyRecord.rejectType = 'user';
          historyRecord.rejectReason = order.rejectReason;
          historyRecord.rejectedAt = order.rejectedAt || order.updatedAt;
          historyRecord.rejectCount = order.rejectCount || 1;
        } else {
          // 没有拒绝原因，可能是正在进行中，跳过
          skippedCount++;
          continue;
        }
        
        // 添加历史记录
        await db.collection('order_photo_history').add({
          data: historyRecord
        });
        
        console.log('添加历史记录成功:', order._id);
        addedCount++;
      } else {
        skippedCount++;
      }
    }
    
    return {
      success: true,
      message: `补充完成！添加${addedCount}条，跳过${skippedCount}条`,
      addedCount,
      skippedCount,
      totalOrders: orders.data.length
    };
    
  } catch (error) {
    console.error('补充历史记录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

