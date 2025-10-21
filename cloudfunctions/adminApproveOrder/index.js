// 云函数 - 管理员审核订单
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId, action, rejectReason } = event;
  const wxContext = cloud.getWXContext();
  
  console.log('========================================');
  console.log('🔍 [云函数] adminApproveOrder 被调用');
  console.log('   订单ID:', orderId);
  console.log('   操作类型:', action);
  console.log('   操作人openid:', wxContext.OPENID);
  console.log('========================================');
  
  try {
    // 1. 验证管理员权限
    console.log('🔐 验证管理员权限...');
    const adminCheck = await db.collection('admin_list')
      .where({
        openid: wxContext.OPENID
      })
      .get();
    
    if (adminCheck.data.length === 0) {
      console.error('❌ 权限验证失败：不是管理员');
      return {
        success: false,
        errMsg: '无权限：您不是管理员'
      };
    }
    
    console.log('✅ 管理员权限验证通过');
    
    // 2. 验证订单是否存在
    console.log('🔍 查询订单信息...');
    const orderResult = await db.collection('activity_orders')
      .doc(orderId)
      .get();
    
    if (!orderResult.data) {
      console.error('❌ 订单不存在');
      return {
        success: false,
        errMsg: '订单不存在'
      };
    }
    
    console.log('✅ 订单存在，当前状态:', orderResult.data.status);
    
    // 3. 根据操作类型更新订单
    let updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (action === 'approve') {
      // 审核通过
      updateData.status = 'pending_confirm';
      updateData.reviewedAt = new Date().toISOString();
      console.log('✅ 执行审核通过操作');
    } else if (action === 'reject') {
      // 审核拒绝
      updateData.status = 'in_progress';
      updateData.rejectReason = rejectReason || '作品不符合要求，请重新拍摄';
      updateData.rejectedAt = new Date().toISOString();
      console.log('❌ 执行审核拒绝操作');
    } else {
      console.error('❌ 未知操作类型:', action);
      return {
        success: false,
        errMsg: '未知操作类型'
      };
    }
    
    console.log('📝 准备更新数据:', updateData);
    
    // 4. 执行更新（云函数有完全权限）
    const updateResult = await db.collection('activity_orders')
      .doc(orderId)
      .update({
        data: updateData
      });
    
    console.log('✅ 数据库更新结果:', updateResult);
    console.log('   更新记录数:', updateResult.stats.updated);
    
    // 5. 验证更新是否成功
    if (updateResult.stats.updated === 0) {
      console.error('⚠️ 警告：没有记录被更新');
      return {
        success: false,
        errMsg: '订单状态未更新'
      };
    }
    
    // 6. 再次查询确认
    console.log('🔍 验证更新结果...');
    const verifyResult = await db.collection('activity_orders')
      .doc(orderId)
      .get();
    
    console.log('📊 验证结果 - 订单状态:', verifyResult.data.status);
    
    if (verifyResult.data.status !== updateData.status) {
      console.error('❌ 验证失败：状态未正确更新');
      return {
        success: false,
        errMsg: '状态更新异常'
      };
    }
    
    console.log('========================================');
    console.log('✅ [云函数] adminApproveOrder 执行成功');
    console.log('========================================');
    
    return {
      success: true,
      data: {
        orderId: orderId,
        newStatus: updateData.status,
        updatedAt: updateData.updatedAt
      }
    };
    
  } catch (err) {
    console.error('========================================');
    console.error('❌ [云函数] adminApproveOrder 执行失败');
    console.error('错误信息:', err);
    console.error('错误代码:', err.errCode);
    console.error('错误消息:', err.errMsg);
    console.error('========================================');
    
    return {
      success: false,
      errMsg: err.message || err.errMsg || '操作失败',
      error: err
    };
  }
};


