// 云函数：订单/申请管理
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
      // 获取订单列表
      case 'list':
        let query = db.collection('applications');
        
        // 如果指定了摄影师ID，只返回该摄影师的订单
        if (data && data.photographerId) {
          query = query.where({
            photographerId: data.photographerId
          });
        }
        
        // 如果指定了状态，筛选状态
        if (data && data.status) {
          query = query.where({
            status: data.status
          });
        }
        
        return await query.orderBy('createdAt', 'desc').get();
      
      // 添加订单
      case 'add':
        return await db.collection('applications').add({
          data: {
            ...data,
            status: data.status || 'waiting_draw',
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
            statusHistory: [{
              status: 'waiting_draw',
              timestamp: db.serverDate(),
              operator: 'system'
            }]
          }
        });
      
      // 更新订单
      case 'update':
        const { _id, ...updateData } = data;
        const updateObj = {
          ...updateData,
          updatedAt: db.serverDate()
        };
        
        // 如果更新了状态，记录历史
        if (updateData.status) {
          updateObj.statusHistory = db.command.push({
            status: updateData.status,
            timestamp: db.serverDate(),
            operator: updateData.operator || 'system',
            remark: updateData.statusRemark || ''
          });
        }
        
        return await db.collection('applications').doc(_id).update({
          data: updateObj
        });
      
      // 删除订单
      case 'delete':
        return await db.collection('applications').doc(data._id).remove();
      
      // 根据ID获取订单
      case 'getById':
        return await db.collection('applications').doc(data._id).get();
      
      // 摄影师上传作品
      case 'uploadWork':
        return await db.collection('applications').doc(data._id).update({
          data: {
            work: data.work,
            workRemark: data.workRemark,
            status: 'pending_review',
            updatedAt: db.serverDate(),
            statusHistory: db.command.push({
              status: 'pending_review',
              timestamp: db.serverDate(),
              operator: 'photographer',
              remark: '摄影师已提交作品'
            })
          }
        });
      
      // 客服审核
      case 'review':
        const newStatus = data.approved ? 'pending_confirm' : 'waiting_draw';
        return await db.collection('applications').doc(data._id).update({
          data: {
            reviewResult: data.approved,
            reviewRemark: data.remark,
            status: newStatus,
            updatedAt: db.serverDate(),
            statusHistory: db.command.push({
              status: newStatus,
              timestamp: db.serverDate(),
              operator: 'service',
              remark: data.remark || (data.approved ? '审核通过' : '需要修改')
            })
          }
        });
      
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

