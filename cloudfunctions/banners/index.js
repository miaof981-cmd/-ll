// 云函数：轮播图管理
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
      // 获取轮播图列表
      case 'list':
        return await db.collection('banners')
          .orderBy('order', 'asc')
          .get();
      
      // 添加轮播图
      case 'add':
        return await db.collection('banners').add({
          data: {
            ...data,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      
      // 更新轮播图
      case 'update':
        const { _id, ...updateData } = data;
        return await db.collection('banners').doc(_id).update({
          data: {
            ...updateData,
            updatedAt: db.serverDate()
          }
        });
      
      // 删除轮播图
      case 'delete':
        return await db.collection('banners').doc(data._id).remove();
      
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

