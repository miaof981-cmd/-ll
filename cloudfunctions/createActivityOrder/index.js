// 云函数：创建活动订单
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    
    const {
      activityId,
      childName,
      childGender,
      childAge,
      childPhoto,
      parentName,
      parentPhone,
      parentWechat,
      expectations,
      photographerId
    } = event;
    
    // 验证必填字段
    if (!activityId || !childName || !parentName || !parentPhone || !photographerId) {
      return {
        success: false,
        error: '请填写完整信息'
      };
    }
    
    // 获取活动信息
    const activityRes = await db.collection('activities').doc(activityId).get();
    
    if (!activityRes.data) {
      return {
        success: false,
        error: '活动不存在'
      };
    }
    
    const activity = activityRes.data;
    
    if (activity.status !== 'active') {
      return {
        success: false,
        error: '活动已下架'
      };
    }
    
    // 获取摄影师信息
    const photographerRes = await db.collection('photographers').doc(photographerId).get();
    
    if (!photographerRes.data) {
      return {
        success: false,
        error: '摄影师不存在'
      };
    }
    
    const photographer = photographerRes.data;
    
    // 创建订单
    const orderRes = await db.collection('activity_orders').add({
      data: {
        _openid: wxContext.OPENID,
        
        // 活动信息
        activityId,
        activityTitle: activity.title,
        activityCover: activity.coverImage,
        
        // 用户信息
        childName,
        childGender: childGender || '男',
        childAge: childAge || '',
        childPhoto: childPhoto || '',
        parentName,
        parentPhone,
        parentWechat: parentWechat || '',
        expectations: expectations || '',
        
        // 摄影师信息
        photographerId,
        photographerName: photographer.name,
        photographerAvatar: photographer.avatar || '',
        
        // 订单状态
        status: 'waiting_shoot',
        reviewStatus: 'pending',
        
        // 作品信息（稍后上传）
        workImage: '',
        workRemark: '',
        reviewRemark: '',
        reviewedAt: null,
        confirmedAt: null,
        
        // 价格信息
        price: activity.price || 20,
        paymentStatus: 'paid',  // 暂时默认已支付
        paymentTime: new Date().toISOString(),
        
        // 时间戳
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    
    // 更新活动订单数
    await db.collection('activities').doc(activityId).update({
      data: {
        orderCount: db.command.inc(1)
      }
    });
    
    return {
      success: true,
      orderId: orderRes._id
    };
  } catch (err) {
    console.error('创建订单失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

