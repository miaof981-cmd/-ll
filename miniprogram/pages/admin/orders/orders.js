const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orders: [],
    filteredOrders: [],
    activeStatus: 'all',
    statusFilters: [
      { id: 'all', name: '全部' },
      { id: orderStatus.ORDER_STATUS.PENDING_REVIEW, name: '待审核' },
      { id: orderStatus.ORDER_STATUS.PENDING_PAYMENT, name: '待支付' },
      { id: orderStatus.ORDER_STATUS.PAID, name: '已支付' },
      { id: orderStatus.ORDER_STATUS.IN_PROGRESS, name: '进行中' },
      { id: orderStatus.ORDER_STATUS.PENDING_CONFIRM, name: '待确认' },
      { id: orderStatus.ORDER_STATUS.COMPLETED, name: '已完成' },
      { id: orderStatus.ORDER_STATUS.AFTER_SALE, name: '售后中' },
      { id: orderStatus.ORDER_STATUS.REFUNDED, name: '已退款' },
      { id: orderStatus.ORDER_STATUS.CANCELLED, name: '已取消' }
    ],
    loading: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .get();

      // 加载用户和活动信息
      const orders = await Promise.all(res.data.map(async (order) => {
        // 加载用户信息
        try {
          const userRes = await db.collection('users')
            .where({ _openid: order._openid })
            .get();
          
          if (userRes.data && userRes.data.length > 0) {
            order.userInfo = userRes.data[0];
          }
        } catch (e) {
          console.error('加载用户信息失败:', e);
        }

        // 加载活动信息
        try {
          const activityRes = await db.collection('activities')
            .doc(order.activityId)
            .get();
          
          if (activityRes.data) {
            order.activityInfo = activityRes.data;
          }
        } catch (e) {
          console.error('加载活动信息失败:', e);
        }

        // 添加状态信息
        order.statusText = orderStatus.getStatusText(order.status);
        order.statusColor = orderStatus.getStatusColor(order.status);
        order.statusIcon = orderStatus.getStatusIcon(order.status);
        order.adminActions = orderStatus.getAdminActions(order.status);

        return order;
      }));

      this.setData({
        orders,
        filteredOrders: orders,
        loading: false
      });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 切换状态筛选
  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    const filteredOrders = status === 'all' 
      ? this.data.orders 
      : this.data.orders.filter(order => order.status === status);

    this.setData({
      activeStatus: status,
      filteredOrders
    });
  },

  // 查看订单详情
  viewOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/orders/detail?id=${id}`
    });
  },

  // 执行订单操作
  async handleAction(e) {
    const { id, action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'start':
        await this.startShooting(id);
        break;
      case 'complete':
        await this.completeOrder(id);
        break;
      case 'refund':
        await this.refundOrder(id);
        break;
      case 'reject':
        await this.rejectAfterSale(id);
        break;
      case 'cancel':
        await this.cancelOrder(id);
        break;
    }
  },

  // 开始拍摄
  async startShooting(orderId) {
    wx.showModal({
      title: '确认操作',
      content: '确定开始拍摄吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
    });
  },

  // 标记完成
  async completeOrder(orderId) {
    wx.showModal({
      title: '确认操作',
      content: '确定标记订单为已完成吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.COMPLETED);
        }
      }
    });
  },

  // 退款
  async refundOrder(orderId) {
    wx.showModal({
      title: '确认退款',
      content: '确定要退款吗？此操作不可撤销',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.REFUNDED);
        }
      }
    });
  },

  // 拒绝售后
  async rejectAfterSale(orderId) {
    wx.showModal({
      title: '确认操作',
      content: '确定拒绝售后申请吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
    });
  },

  // 取消订单
  async cancelOrder(orderId) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.CANCELLED);
        }
      }
    });
  },

  // 更新订单状态
  async updateOrderStatus(orderId, newStatus) {
    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(orderId).update({
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '操作成功',
        icon: 'success'
      });

      // 重新加载订单列表
      this.loadOrders();
    } catch (e) {
      console.error('更新订单状态失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  }
});

