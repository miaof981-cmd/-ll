// 云函数：学籍档案管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  
  console.log('云函数调用:', action, '用户:', wxContext.OPENID);
  
  try {
    switch (action) {
      // 获取档案列表
      case 'list':
        return await db.collection('archives')
          .orderBy('createdAt', 'desc')
          .get();
      
      // 创建档案
      case 'create':
        return await db.collection('archives').add({
          data: {
            ...data,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      
      // 更新档案
      case 'update':
        const { _id, ...updateData } = data;
        return await db.collection('archives').doc(_id).update({
          data: {
            ...updateData,
            updatedAt: db.serverDate()
          }
        });
      
      // 删除档案
      case 'delete':
        return await db.collection('archives').doc(data._id).remove();
      
      // 根据ID获取档案
      case 'getById':
        return await db.collection('archives').doc(data._id).get();
      
      // 根据学号获取档案
      case 'getByStudentId':
        return await db.collection('archives')
          .where({
            studentId: data.studentId
          })
          .get();
      
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (e) {
    console.error('云函数执行失败:', e);
    return {
      success: false,
      error: e.message
    };
  }
};

