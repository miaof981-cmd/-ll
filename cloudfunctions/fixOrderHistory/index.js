/**
 * 补充历史记录云函数
 * Fix Order History - 从现有订单中推断并补充历史记录
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('🔧 开始补充历史记录...');
    
    // 查询所有 in_progress 状态且有拒绝记录的订单
    const orders = await db.collection('activity_orders')
      .where({
        status: 'in_progress'
      })
      .get();
    
    console.log('📋 找到订单数量:', orders.data.length);
    
    let addedCount = 0;
    let skippedCount = 0;
    const results = [];
    
    for (const order of orders.data) {
      try {
        // 检查是否已经有历史记录
        const existingHistory = await db.collection('order_photo_history')
          .where({ orderId: order._id })
          .count();
        
        if (existingHistory.total > 0) {
          console.log('✓ 订单已有历史记录，跳过:', order._id);
          skippedCount++;
          results.push({
            orderId: order._id,
            status: 'skipped',
            reason: '已有历史记录'
          });
          continue;
        }
        
        // 如果订单有照片且有拒绝原因
        if (order.photos && order.photos.length > 0 && 
            (order.adminRejectReason || order.rejectReason)) {
          
          const historyRecord = {
            orderId: order._id,
            photos: order.photos,
            rejectType: '',
            rejectReason: '',
            submittedAt: order.submittedAt || order.createdAt,
            rejectedAt: '',
            createdAt: new Date().toISOString()
          };
          
          // 判断拒绝类型
          if (order.adminRejectReason) {
            historyRecord.rejectType = 'admin';
            historyRecord.rejectReason = order.adminRejectReason;
            historyRecord.rejectedAt = order.adminRejectedAt || order.updatedAt;
          } else if (order.rejectReason) {
            historyRecord.rejectType = 'user';
            historyRecord.rejectReason = order.rejectReason;
            historyRecord.rejectedAt = order.rejectedAt || order.updatedAt;
            historyRecord.rejectCount = order.rejectCount || 1;
          }
          
          // 添加历史记录
          await db.collection('order_photo_history').add({
            data: historyRecord
          });
          
          console.log('✅ 添加历史记录:', order._id);
          addedCount++;
          results.push({
            orderId: order._id,
            status: 'added',
            rejectType: historyRecord.rejectType
          });
        } else {
          skippedCount++;
          results.push({
            orderId: order._id,
            status: 'skipped',
            reason: '无拒绝记录或无照片'
          });
        }
      } catch (err) {
        console.error('❌ 处理订单失败:', order._id, err);
        results.push({
          orderId: order._id,
          status: 'error',
          error: err.message
        });
        skippedCount++;
      }
    }
    
    console.log('🎉 补充完成！');
    console.log('添加:', addedCount, '条');
    console.log('跳过:', skippedCount, '条');
    
    return {
      success: true,
      message: `补充完成！添加 ${addedCount} 条，跳过 ${skippedCount} 条`,
      addedCount,
      skippedCount,
      totalOrders: orders.data.length,
      details: results
    };
    
  } catch (error) {
    console.error('❌ 补充历史记录失败:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

