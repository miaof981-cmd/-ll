const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    userInfo: null,
    activityInfo: null,
    photographerInfo: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  async loadOrderDetail(orderId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      
      // 加载订单信息
      const orderRes = await db.collection('activity_orders').doc(orderId).get();
      const order = orderRes.data;

      // 加载用户信息
      let userInfo = null;
      try {
        const userRes = await db.collection('users')
          .where({ _openid: order._openid })
          .get();
        if (userRes.data && userRes.data.length > 0) {
          userInfo = userRes.data[0];
        }
      } catch (e) {
        console.error('加载用户信息失败:', e);
      }

      // 加载活动信息
      let activityInfo = null;
      try {
        const activityRes = await db.collection('activities').doc(order.activityId).get();
        activityInfo = activityRes.data;
      } catch (e) {
        console.error('加载活动信息失败:', e);
      }

      // 加载摄影师信息
      let photographerInfo = null;
      if (order.photographerId) {
        try {
          const photographerRes = await db.collection('photographers').doc(order.photographerId).get();
          photographerInfo = photographerRes.data;
        } catch (e) {
          console.error('加载摄影师信息失败:', e);
        }
      }

      // 添加状态信息
      order.statusText = orderStatus.getStatusText(order.status);
      order.statusColor = orderStatus.getStatusColor(order.status);
      order.statusIcon = orderStatus.getStatusIcon(order.status);
      order.adminActions = orderStatus.getAdminActions(order.status);

      this.setData({
        order,
        userInfo,
        activityInfo,
        photographerInfo,
        loading: false
      });

      wx.hideLoading();
    } catch (e) {
      console.error('加载订单详情失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 联系用户
  contactUser() {
    const { userInfo } = this.data;
    if (userInfo && userInfo.phone) {
      wx.makePhoneCall({
        phoneNumber: userInfo.phone
      });
    } else {
      wx.showToast({
        title: '用户未留电话',
        icon: 'none'
      });
    }
  },

  // 执行订单操作
  async handleAction(e) {
    const { action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'start':
        await this.startShooting();
        break;
      case 'complete':
        await this.completeOrder();
        break;
      case 'refund':
        await this.refundOrder();
        break;
      case 'reject':
        await this.rejectAfterSale();
        break;
      case 'cancel':
        await this.cancelOrder();
        break;
    }
  },

  // 开始拍摄
  async startShooting() {
    wx.showModal({
      title: '确认操作',
      content: '确定开始拍摄吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
    });
  },

  // 标记完成
  async completeOrder() {
    wx.showModal({
      title: '确认操作',
      content: '确定标记订单为已完成吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.COMPLETED);
        }
      }
    });
  },

  // 退款
  async refundOrder() {
    wx.showModal({
      title: '确认退款',
      content: '确定要退款吗？此操作不可撤销',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.REFUNDED);
        }
      }
    });
  },

  // 拒绝售后
  async rejectAfterSale() {
    wx.showModal({
      title: '确认操作',
      content: '确定拒绝售后申请吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
    });
  },

  // 取消订单
  async cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.CANCELLED);
        }
      }
    });
  },

  // 更新订单状态
  async updateOrderStatus(newStatus) {
    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
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

      // 重新加载订单详情
      this.loadOrderDetail(this.data.orderId);
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

