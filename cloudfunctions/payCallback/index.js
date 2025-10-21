// cloudfunctions/payCallback/index.js
// 微信支付回调云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('💰 收到支付回调:', event);

  const {
    outTradeNo,    // 商户订单号
    resultCode,    // 支付结果：SUCCESS/FAIL
    transactionId, // 微信支付订单号
    totalFee,      // 支付金额（分）
    timeEnd        // 支付完成时间
  } = event;

  // 支付成功
  if (resultCode === 'SUCCESS') {
    try {
      console.log('✅ 支付成功，订单号:', outTradeNo);
      console.log('   微信订单号:', transactionId);
      console.log('   支付金额:', totalFee / 100, '元');

      // 1. 更新订单状态
      const updateResult = await db.collection('activity_orders')
        .where({
          orderNo: outTradeNo
        })
        .update({
          data: {
            status: 'pending_upload',      // 订单状态：待上传
            paymentStatus: 'paid',         // 支付状态：已支付
            transactionId: transactionId,  // 微信支付订单号
            paidAt: new Date().toISOString(), // 支付时间
            updatedAt: new Date().toISOString()
          }
        });

      console.log('✅ 订单状态更新成功:', updateResult);

      // 2. 发送支付成功通知给用户（可选）
      // await sendPaymentSuccessNotification(outTradeNo);

      // 3. 发送新订单通知给摄影师（可选）
      // await sendNewOrderNotificationToPhotographer(outTradeNo);

      return {
        errcode: 0,
        errmsg: 'success'
      };
    } catch (err) {
      console.error('❌ 更新订单失败:', err);
      return {
        errcode: -1,
        errmsg: err.message
      };
    }
  } else {
    // 支付失败
    console.error('❌ 支付失败:', event);
    
    try {
      // 更新订单为支付失败状态
      await db.collection('activity_orders')
        .where({
          orderNo: outTradeNo
        })
        .update({
          data: {
            paymentStatus: 'failed',
            updatedAt: new Date().toISOString()
          }
        });
    } catch (err) {
      console.error('❌ 更新失败状态失败:', err);
    }

    return {
      errcode: -1,
      errmsg: '支付失败'
    };
  }
};



