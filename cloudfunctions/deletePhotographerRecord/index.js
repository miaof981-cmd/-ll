// 云函数：删除指定的摄影师记录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { recordId } = event;
  
  if (!recordId) {
    return {
      success: false,
      error: '请提供要删除的记录 _id'
    };
  }
  
  try {
    console.log(`🗑️ 准备删除记录: ${recordId}`);
    
    // 先查询记录详情
    const record = await db.collection('photographers').doc(recordId).get();
    
    if (!record.data) {
      return {
        success: false,
        error: '记录不存在'
      };
    }
    
    console.log('📋 记录详情:', record.data);
    
    // 执行删除
    await db.collection('photographers').doc(recordId).remove();
    
    console.log('✅ 删除成功');
    
    return {
      success: true,
      message: '删除成功',
      deletedRecord: record.data
    };
    
  } catch (error) {
    console.error('❌ 删除失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

