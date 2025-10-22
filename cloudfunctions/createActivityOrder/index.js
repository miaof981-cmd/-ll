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
    
    // 生成订单号（格式：ACT + 时间戳 + 6位随机数）
    const orderNo = 'ACT' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('📝 生成订单号:', orderNo);
    
    // 创建订单
    const orderRes = await db.collection('activity_orders').add({
      data: {
        _openid: wxContext.OPENID,
        userId: wxContext.OPENID,  // 新增：订单归属用户（默认为创建者）
        
        // 订单编号
        orderNo: orderNo,
        
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
        status: 'pending_payment',  // 待支付状态，必须完成支付后才能进入下一步
        reviewStatus: 'pending',
        
        // 作品信息（稍后上传）
        workImage: '',
        workRemark: '',
        reviewRemark: '',
        reviewedAt: null,
        confirmedAt: null,
        
        // 价格信息（锁定下单时的价格，不受活动价格变动影响）
        price: activity.price !== undefined && activity.price !== null ? Number(activity.price) : 20,
        lockedPrice: activity.price !== undefined && activity.price !== null ? Number(activity.price) : 20,  // 额外保存，用于审计
        originalActivityPrice: activity.originalPrice || activity.price,  // 原价（如果有的话）
        paymentStatus: 'unpaid',  // 未支付，必须通过微信支付回调才能改为 paid
        paymentTime: null,  // 支付时间为空，支付成功后由回调函数填写
        
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
    
    // 计算锁定的价格（与订单中保存的价格完全一致）
    const lockedPrice = activity.price !== undefined && activity.price !== null ? Number(activity.price) : 20;
    
    const returnData = {
      success: true,
      orderId: orderRes._id,
      orderNo: orderNo,  // 返回订单号，供前端调用支付时使用
      price: lockedPrice  // 返回订单锁定价格（订单创建时的价格，不受活动价格变动影响）
    };
    
    console.log('========================================');
    console.log('✅ 订单创建成功！');
    console.log('   返回数据:', JSON.stringify(returnData, null, 2));
    console.log('========================================');
    
    return returnData;
  } catch (err) {
    console.error('创建订单失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

