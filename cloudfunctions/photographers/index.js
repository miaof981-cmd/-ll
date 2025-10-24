// 云函数：摄影师管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  
  console.log('云函数调用:', action, '用户:', wxContext.OPENID);
  
  try {
    switch (action) {
      // 获取摄影师列表
      case 'list':
        return await db.collection('photographers')
          .orderBy('createdAt', 'desc')
          .get();
      
      // 添加摄影师
      case 'add':
        // 🔥 检查 _openid 是否已存在，防止重复创建
        if (data._openid) {
          const existing = await db.collection('photographers')
            .where({ _openid: data._openid })
            .get();
          
          if (existing.data && existing.data.length > 0) {
            console.warn(`⚠️ 重复创建摄影师被阻止: ${data.name}, openid: ${data._openid}`);
            return {
              success: false,
              error: `该用户已是摄影师（姓名：${existing.data[0].name}），无法重复添加`,
              existingPhotographer: existing.data[0]
            };
          }
        }
        
        // 没有重复，可以添加
        const addResult = await db.collection('photographers').add({
          data: {
            ...data,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
        
        console.log(`✅ 创建摄影师成功: ${data.name}`);
        return addResult;
      
      // 更新摄影师
      case 'update':
        const { _id, ...updateData } = data;
        return await db.collection('photographers').doc(_id).update({
          data: {
            ...updateData,
            updatedAt: db.serverDate()
          }
        });
      
      // 删除摄影师
      case 'delete':
        return await db.collection('photographers').doc(data._id).remove();
      
      // 根据ID获取摄影师
      case 'getById':
        return await db.collection('photographers').doc(data._id).get();
      
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

