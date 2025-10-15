// 修复订单的 activityId - 为没有活动ID的订单补充默认证件照活动
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('🔧 开始修复订单的 activityId...');
  
  try {
    // 1. 查找默认证件照活动
    const { data: activities } = await db.collection('activities')
      .where({
        isDefault: true,
        category: '证件照'
      })
      .get();
    
    if (!activities || activities.length === 0) {
      console.error('❌ 未找到默认证件照活动');
      return {
        success: false,
        message: '未找到默认证件照活动，请先在 activities 集合中创建'
      };
    }
    
    const defaultActivity = activities[0];
    console.log('✅ 找到默认证件照活动:', defaultActivity.name, '(_id:', defaultActivity._id, ')');
    
    // 2. 查找所有没有 activityId 或 activityId 为空的订单
    const { data: orders } = await db.collection('activity_orders')
      .where({
        activityId: db.command.or(
          db.command.eq(''),
          db.command.not(db.command.exists(true))
        )
      })
      .get();
    
    console.log(`📋 找到 ${orders.length} 个需要修复的订单`);
    
    if (orders.length === 0) {
      return {
        success: true,
        message: '所有订单都已有 activityId，无需修复',
        updatedCount: 0
      };
    }
    
    // 3. 批量更新订单
    const updatePromises = [];
    const updates = [];
    
    for (const order of orders) {
      console.log(`   修复订单: ${order.orderNo || order._id} (学生: ${order.studentName})`);
      
      updatePromises.push(
        db.collection('activity_orders').doc(order._id).update({
          data: {
            activityId: defaultActivity._id,
            updatedAt: new Date().toISOString()
          }
        })
      );
      
      updates.push({
        orderId: order._id,
        orderNo: order.orderNo,
        studentName: order.studentName,
        activityId: defaultActivity._id
      });
    }
    
    // 4. 执行批量更新
    await Promise.all(updatePromises);
    console.log(`✅ 成功修复 ${updatePromises.length} 个订单的 activityId`);
    
    return {
      success: true,
      message: `成功修复 ${updatePromises.length} 个订单`,
      updatedCount: updatePromises.length,
      activityInfo: {
        id: defaultActivity._id,
        name: defaultActivity.name,
        category: defaultActivity.category
      },
      updates: updates
    };
  } catch (e) {
    console.error('❌ 修复失败:', e);
    return {
      success: false,
      message: e.message,
      error: e
    };
  }
};

