/**
 * 订单号生成工具
 * 格式: YYYYMMDDHHMMSS + 4位随机数
 * 例如: 20251014162530 + 8273 = 202510141625308273
 */

/**
 * 生成唯一订单号
 * @returns {string} 18位订单号
 */
function generateOrderNumber() {
  const now = new Date();
  
  // 年月日时分秒
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  // 4位随机数
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  // 组合订单号: YYYYMMDDHHMMSS + 4位随机数
  const orderNo = `${year}${month}${day}${hour}${minute}${second}${random}`;
  
  return orderNo;
}

/**
 * 格式化订单号显示（加空格分隔便于阅读）
 * @param {string} orderNo 订单号
 * @returns {string} 格式化后的订单号
 */
function formatOrderNumber(orderNo) {
  if (!orderNo || orderNo.length !== 18) {
    return orderNo;
  }
  
  // 格式: 2025-10-14 16:25:30-8273
  const year = orderNo.substring(0, 4);
  const month = orderNo.substring(4, 6);
  const day = orderNo.substring(6, 8);
  const hour = orderNo.substring(8, 10);
  const minute = orderNo.substring(10, 12);
  const second = orderNo.substring(12, 14);
  const random = orderNo.substring(14, 18);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}-${random}`;
}

/**
 * 获取订单号后4位
 * @param {string} orderNo 订单号
 * @returns {string} 后4位
 */
function getOrderLast4(orderNo) {
  if (!orderNo || orderNo.length < 4) {
    return orderNo;
  }
  return orderNo.slice(-4);
}

/**
 * 验证订单号格式
 * @param {string} orderNo 订单号
 * @returns {boolean} 是否有效
 */
function isValidOrderNumber(orderNo) {
  if (!orderNo || typeof orderNo !== 'string') {
    return false;
  }
  
  // 检查长度
  if (orderNo.length !== 18) {
    return false;
  }
  
  // 检查是否全为数字
  if (!/^\d{18}$/.test(orderNo)) {
    return false;
  }
  
  return true;
}

module.exports = {
  generateOrderNumber,
  formatOrderNumber,
  getOrderLast4,
  isValidOrderNumber
};

