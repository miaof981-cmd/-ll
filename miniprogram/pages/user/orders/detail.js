const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
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
      order.userActions = orderStatus.getUserActions(order.status);

      this.setData({
        order,
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

  // 执行订单操作
  async handleAction(e) {
    const { action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'pay':
        await this.payOrder();
        break;
      case 'cancel':
        await this.cancelOrder();
        break;
      case 'contact':
        await this.contactPhotographer();
        break;
      case 'after_sale':
        await this.applyAfterSale();
        break;
      case 'evaluate':
        await this.evaluateOrder();
        break;
    }
  },

  // 支付订单
  async payOrder() {
    wx.showToast({
      title: '支付功能开发中',
      icon: 'none'
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

  // 联系摄影师
  async contactPhotographer() {
    const { photographerInfo } = this.data;
    if (photographerInfo && photographerInfo.phone) {
      wx.makePhoneCall({
        phoneNumber: photographerInfo.phone
      });
    } else {
      wx.showToast({
        title: '摄影师未留联系方式',
        icon: 'none'
      });
    }
  },

  // 申请售后
  async applyAfterSale() {
    wx.showModal({
      title: '申请售后',
      content: '请描述您遇到的问题',
      editable: true,
      placeholderText: '请输入售后原因',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.AFTER_SALE, res.content);
        }
      }
    });
  },

  // 评价订单
  async evaluateOrder() {
    wx.navigateTo({
      url: `/pages/user/orders/evaluate?id=${this.data.orderId}`
    });
  },

  // 更新订单状态
  async updateOrderStatus(newStatus, remark = '') {
    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (remark) {
        updateData.afterSaleReason = remark;
      }

      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: updateData
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

