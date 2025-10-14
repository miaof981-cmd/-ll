// 订单状态定义
const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',      // 待支付
  PAID: 'paid',                            // 已支付
  IN_PROGRESS: 'in_progress',              // 进行中（拍摄中）
  PENDING_CONFIRM: 'pending_confirm',      // 待用户确认
  COMPLETED: 'completed',                  // 已完成
  AFTER_SALE: 'after_sale',                // 售后中
  REFUNDED: 'refunded',                    // 已退款
  CANCELLED: 'cancelled'                   // 已取消
};

// 订单状态文本
const STATUS_TEXT = {
  [ORDER_STATUS.PENDING_PAYMENT]: '待支付',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.IN_PROGRESS]: '进行中',
  [ORDER_STATUS.PENDING_CONFIRM]: '待确认',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.AFTER_SALE]: '售后中',
  [ORDER_STATUS.REFUNDED]: '已退款',
  [ORDER_STATUS.CANCELLED]: '已取消'
};

// 订单状态颜色
const STATUS_COLOR = {
  [ORDER_STATUS.PENDING_PAYMENT]: '#f59e0b',   // 橙色
  [ORDER_STATUS.PAID]: '#3b82f6',              // 蓝色
  [ORDER_STATUS.IN_PROGRESS]: '#8b5cf6',       // 紫色
  [ORDER_STATUS.PENDING_CONFIRM]: '#f59e0b',   // 橙色
  [ORDER_STATUS.COMPLETED]: '#10b981',         // 绿色
  [ORDER_STATUS.AFTER_SALE]: '#ef4444',        // 红色
  [ORDER_STATUS.REFUNDED]: '#6b7280',          // 灰色
  [ORDER_STATUS.CANCELLED]: '#9ca3af'          // 浅灰色
};

// 订单状态图标
const STATUS_ICON = {
  [ORDER_STATUS.PENDING_PAYMENT]: '💰',
  [ORDER_STATUS.PAID]: '✅',
  [ORDER_STATUS.IN_PROGRESS]: '📸',
  [ORDER_STATUS.PENDING_CONFIRM]: '⏳',
  [ORDER_STATUS.COMPLETED]: '🎉',
  [ORDER_STATUS.AFTER_SALE]: '🔧',
  [ORDER_STATUS.REFUNDED]: '💸',
  [ORDER_STATUS.CANCELLED]: '❌'
};

// 用户端可用操作（底部按钮）
const USER_ACTIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: ['pay', 'cancel'],           // 支付、取消
  [ORDER_STATUS.PAID]: [],                                     // 无操作
  [ORDER_STATUS.IN_PROGRESS]: [],                              // 无操作（等待摄影师）
  [ORDER_STATUS.PENDING_CONFIRM]: ['confirm', 'reject'],       // 确认收货、拒绝
  [ORDER_STATUS.COMPLETED]: ['evaluate'],                      // 评价
  [ORDER_STATUS.AFTER_SALE]: [],                               // 无操作
  [ORDER_STATUS.REFUNDED]: [],                                 // 无操作
  [ORDER_STATUS.CANCELLED]: []                                 // 无操作
};

// 管理员可用操作
const ADMIN_ACTIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: ['cancel'],                  // 取消订单
  [ORDER_STATUS.PAID]: ['start', 'refund'],                    // 开始拍摄、退款
  [ORDER_STATUS.IN_PROGRESS]: ['complete', 'refund'],          // 标记完成、退款
  [ORDER_STATUS.PENDING_CONFIRM]: ['force_complete'],          // 强制完成
  [ORDER_STATUS.COMPLETED]: ['refund'],                        // 退款
  [ORDER_STATUS.AFTER_SALE]: ['refund', 'reject'],             // 同意退款、拒绝售后
  [ORDER_STATUS.REFUNDED]: [],                                 // 无操作
  [ORDER_STATUS.CANCELLED]: []                                 // 无操作
};

// 获取状态文本
function getStatusText(status) {
  return STATUS_TEXT[status] || '未知状态';
}

// 获取状态颜色
function getStatusColor(status) {
  return STATUS_COLOR[status] || '#6b7280';
}

// 获取状态图标
function getStatusIcon(status) {
  return STATUS_ICON[status] || '📋';
}

// 获取用户可用操作
function getUserActions(status) {
  return USER_ACTIONS[status] || [];
}

// 获取管理员可用操作
function getAdminActions(status) {
  return ADMIN_ACTIONS[status] || [];
}

// 订单操作文本
const ACTION_TEXT = {
  pay: '立即支付',
  cancel: '取消订单',
  contact: '联系摄影师',
  after_sale: '申请售后',
  evaluate: '评价',
  confirm: '确认收货',
  reject: '拒绝作品',
  start: '开始拍摄',
  complete: '标记完成',
  force_complete: '强制完成',
  refund: '同意退款'
};

function getActionText(action) {
  return ACTION_TEXT[action] || action;
}

module.exports = {
  ORDER_STATUS,
  STATUS_TEXT,
  STATUS_COLOR,
  STATUS_ICON,
  USER_ACTIONS,
  ADMIN_ACTIONS,
  getStatusText,
  getStatusColor,
  getStatusIcon,
  getUserActions,
  getAdminActions,
  getActionText
};

