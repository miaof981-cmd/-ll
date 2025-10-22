// 云函数：同步摄影师头像（从users集合同步到photographers集合）
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('开始同步摄影师头像...');
    
    // 1. 获取所有摄影师
    const photographersRes = await db.collection('photographers').get();
    const photographers = photographersRes.data;
    
    console.log(`找到 ${photographers.length} 个摄影师`);
    
    const results = [];
    
    // 2. 遍历每个摄影师
    for (const photographer of photographers) {
      // 如果摄影师有 _openid，从 users 集合查询该用户的头像
      if (photographer._openid) {
        const userRes = await db.collection('users')
          .where({ _openid: photographer._openid })
          .get();
        
        if (userRes.data && userRes.data.length > 0) {
          const user = userRes.data[0];
          
          // 更新摄影师头像（如果用户有头像）
          if (user.avatarUrl) {
            await db.collection('photographers').doc(photographer._id).update({
              data: {
                avatar: user.avatarUrl,
                name: user.nickName || photographer.name,
                updatedAt: new Date().toISOString()
              }
            });
            
            results.push({
              photographerId: photographer._id,
              photographerName: photographer.name,
              openid: photographer._openid,
              success: true,
              message: `已同步头像: ${user.nickName}`
            });
            
            console.log(`✅ 更新摄影师 ${photographer.name} 的头像`);
          } else {
            results.push({
              photographerId: photographer._id,
              photographerName: photographer.name,
              openid: photographer._openid,
              success: false,
              message: '用户没有头像'
            });
          }
        } else {
          results.push({
            photographerId: photographer._id,
            photographerName: photographer.name,
            openid: photographer._openid,
            success: false,
            message: '找不到对应的用户'
          });
        }
      } else {
        results.push({
          photographerId: photographer._id,
          photographerName: photographer.name,
          success: false,
          message: '摄影师没有关联 OpenID'
        });
      }
    }
    
    return {
      success: true,
      total: photographers.length,
      results: results
    };
    
  } catch (err) {
    console.error('同步失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

