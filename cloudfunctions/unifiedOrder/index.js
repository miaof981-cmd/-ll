// cloudfunctions/unifiedOrder/index.js
// 微信支付统一下单云函数
const cloud = require('wx-server-sdk');

// ✅ 明确指定环境ID（微信支付必须）
const ENV_ID = 'cloud1-9gdsq5jxb7e60ab4';

cloud.init({
  env: ENV_ID
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  console.log('========================================');
  console.log('📦 unifiedOrder 云函数被调用');
  console.log('   完整 event:', JSON.stringify(event, null, 2));
  console.log('========================================');
  
  const {
    totalFee,      // 订单金额（单位：分）
    orderNo,       // 订单号
    description    // 商品描述
  } = event;

  console.log('📋 解构后的参数:');
  console.log('   totalFee:', totalFee, '(类型:', typeof totalFee, ')');
  console.log('   orderNo:', orderNo);
  console.log('   description:', description);

  // 参数验证
  if (!orderNo) {
    console.error('❌ 订单号为空');
    return {
      success: false,
      errMsg: '订单号不能为空'
    };
  }

  if (!totalFee || totalFee <= 0) {
    console.error('❌ 订单金额无效:', totalFee);
    return {
      success: false,
      errMsg: `订单金额必须大于0（当前值：${totalFee}）`
    };
  }
  
  console.log('✅ 参数验证通过');

  try {
    // 1. 查询订单，验证订单状态和金额
    const orderRes = await db.collection('activity_orders')
      .where({
        orderNo: orderNo
      })
      .get();

    if (!orderRes.data || orderRes.data.length === 0) {
      console.error('❌ 订单不存在:', orderNo);
      return {
        success: false,
        errMsg: '订单不存在'
      };
    }

    const order = orderRes.data[0];
    
    // 验证订单是否已支付
    if (order.paymentStatus === 'paid') {
      console.warn('⚠️ 订单已支付:', orderNo);
      return {
        success: false,
        errMsg: '订单已支付，请勿重复支付'
      };
    }

    // 验证金额是否一致（防止篡改）
    // ✅ 只使用订单保存的价格，不查活动表（因为活动价格可能已变动）
    const orderPrice = order.lockedPrice !== undefined ? Number(order.lockedPrice) : 
                      (order.price !== undefined ? Number(order.price) : 
                      (order.totalPrice !== undefined ? Number(order.totalPrice) : 0));
    
    const expectedFee = Math.round(orderPrice * 100);
    
    console.log('========================================');
    console.log('💰 金额验证（使用订单锁定价格）:');
    console.log('   订单中的 lockedPrice:', order.lockedPrice);
    console.log('   订单中的 price:', order.price);
    console.log('   订单中的 totalPrice:', order.totalPrice);
    console.log('   最终使用的价格(元):', orderPrice);
    console.log('   期望的金额(分):', expectedFee);
    console.log('   请求的金额(分):', totalFee);
    console.log('   是否一致:', expectedFee === totalFee ? '✅ 是' : '❌ 否');
    console.log('========================================');
    
    if (totalFee !== expectedFee) {
      console.error('❌ 金额不一致！');
      console.error('   订单锁定价格:', orderPrice, '元 (', expectedFee, '分)');
      console.error('   前端请求金额:', totalFee / 100, '元 (', totalFee, '分)');
      console.error('   差额:', (totalFee - expectedFee) / 100, '元');
      return {
        success: false,
        errMsg: `订单金额不一致（订单价格${expectedFee}分，请求${totalFee}分）`
      };
    }

    console.log('✅ 订单验证通过，开始调用微信支付...');

    // 2. 调用微信支付统一下单
    console.log('📋 调用参数:');
    console.log('   orderNo:', orderNo);
    console.log('   totalFee:', totalFee);
    console.log('   description:', description);
    
    let payResult;
    try {
      // ✅ 读取商户配置（优先使用服务商模式 subMchId）
      const ENV_MCH_ID = process.env.WECHAT_MCHID || process.env.MCH_ID || '';
      const ENV_SUB_MCH_ID = process.env.WECHAT_SUB_MCHID || process.env.SUB_MCH_ID || '';

      // 优先服务商模式（subMchId），否则使用普通商户模式（mchId）
      const isServiceProviderMode = !!ENV_SUB_MCH_ID;

      const baseParams = {
        envId: ENV_ID,                 // 必填：云环境ID
        body: description || '次元学校-证件照拍摄',
        outTradeNo: orderNo,
        spbillCreateIp: '127.0.0.1',
        totalFee: totalFee,
        tradeType: 'JSAPI',
        functionName: 'payCallback'    // 支付回调云函数（可选）
      };

      const payParams = { ...baseParams };
      if (isServiceProviderMode) {
        payParams.subMchId = ENV_SUB_MCH_ID; // 服务商模式使用子商户号
      } else if (ENV_MCH_ID) {
        payParams.mchId = ENV_MCH_ID;        // 普通商户模式使用商户号
      }

      console.log('========================================');
      console.log('💳 准备调用微信支付:');
      console.log('   环境ID:', ENV_ID);
      console.log('   订单号:', orderNo);
      console.log('   金额(分):', totalFee);
      console.log('   模式:', isServiceProviderMode ? '服务商模式(subMchId)' : '普通商户模式(mchId)');
      console.log('   subMchId:', isServiceProviderMode ? ENV_SUB_MCH_ID : '(未启用)');
      console.log('   mchId:', !isServiceProviderMode ? ENV_MCH_ID : '(服务商模式不使用)');
      console.log('   最终参数:', JSON.stringify(payParams, null, 2));
      console.log('========================================');

      payResult = await cloud.cloudPay.unifiedOrder(payParams);

      console.log('✅ cloud.cloudPay.unifiedOrder 调用成功');
      console.log('   返回数据类型:', typeof payResult);
      console.log('   返回数据:', JSON.stringify(payResult, null, 2));
    } catch (payErr) {
      console.error('❌ cloud.cloudPay.unifiedOrder 调用失败:', payErr);
      // 常见错误提示增强
      const rawMsg = (typeof payErr === 'object' && payErr !== null) ? JSON.stringify(payErr) : String(payErr);
      if (rawMsg.includes('sub_mch_id is empty')) {
        console.error('👉 检测到服务商模式缺少 sub_mch_id。请在云函数环境变量中设置 WECHAT_SUB_MCHID 或 SUB_MCH_ID。');
      }
      if (rawMsg.includes('mch_id') && rawMsg.includes('不存在')) {
        console.error('👉 检测到商户号配置异常。请在云函数环境变量中设置 WECHAT_MCHID 或 MCH_ID，或在云开发控制台绑定商户号。');
      }
      console.error('   错误详情:', rawMsg);
      throw new Error(`微信支付调用失败: ${payErr.message || rawMsg}`);
    }

    console.log('========================================');
    console.log('✅ 统一下单成功，准备返回数据');
    console.log('   payResult:', JSON.stringify(payResult, null, 2));
    console.log('========================================');

    // ✅ 关键修改：返回 payment 参数
    if (payResult && payResult.payment) {
      console.log('✅ 找到 payment 字段，返回给前端');
      console.log('   payment:', JSON.stringify(payResult.payment, null, 2));
      return {
        success: true,
        payment: payResult.payment
      };
    } else {
      console.error('❌ unifiedOrder 返回缺少 payment 字段');
      console.error('   完整返回:', JSON.stringify(payResult, null, 2));
      return {
        success: false,
        errMsg: 'unifiedOrder 返回缺少 payment 字段',
        raw: payResult
      };
    }
  } catch (err) {
    console.error('❌ 统一下单失败:', err);
    return {
      success: false,
      errMsg: err.message || '统一下单失败'
    };
  }
};


