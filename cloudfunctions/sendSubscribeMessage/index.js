// cloudfunctions/sendSubscribeMessage/index.js
// 发送订阅消息通知云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const {
    touser,      // 接收者openid
    template_id, // 模板ID
    page,        // 跳转页面
    data         // 模板数据
  } = event;

  console.log('📨 发送订阅消息:', {
    touser,
    template_id,
    page
  });

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: touser,
      templateId: template_id,
      page: page,
      data: data,
      miniprogramState: 'developer' // developer: 开发版, trial: 体验版, formal: 正式版
    });

    console.log('✅ 订阅消息发送成功:', result);
    console.log('返回值详情:', JSON.stringify(result));
    
    // 微信API返回的errCode为0表示成功
    const isSuccess = result.errCode === 0 || result.errcode === 0;
    
    return {
      success: isSuccess,
      result: result,
      errCode: result.errCode || result.errcode,
      errMsg: result.errMsg || result.errmsg || 'ok'
    };
  } catch (err) {
    console.error('❌ 订阅消息发送失败:', err);
    
    return {
      success: false,
      errMsg: err.message || err.errMsg,
      errCode: err.errCode || err.errcode,
      error: err
    };
  }
};

