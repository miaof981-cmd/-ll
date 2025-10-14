const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orders: [],
    filteredOrders: [],
    activeStatus: 'all',
    statusFilters: [
      { id: 'all', name: '全部' },
      { id: orderStatus.ORDER_STATUS.PENDING_PAYMENT, name: '待支付' },
      { id: orderStatus.ORDER_STATUS.IN_PROGRESS, name: '进行中' },
      { id: orderStatus.ORDER_STATUS.COMPLETED, name: '已完成' },
      { id: orderStatus.ORDER_STATUS.AFTER_SALE, name: '售后中' }
    ],
    loading: true,
    userOpenId: ''
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
      
      // 获取当前用户的 openid
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedLogin'
      });
      
      const userOpenId = result.userInfo._openid;
      
      // 查询当前用户的订单
      const res = await db.collection('activity_orders')
        .where({
          _openid: userOpenId
        })
        .orderBy('createdAt', 'desc')
        .get();

      // 加载活动信息
      const orders = await Promise.all(res.data.map(async (order) => {
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

        // 加载摄影师信息
        if (order.photographerId) {
          try {
            const photographerRes = await db.collection('photographers')
              .doc(order.photographerId)
              .get();
            
            if (photographerRes.data) {
              order.photographerInfo = photographerRes.data;
            }
          } catch (e) {
            console.error('加载摄影师信息失败:', e);
          }
        }

        // 添加状态信息
        order.statusText = orderStatus.getStatusText(order.status);
        order.statusColor = orderStatus.getStatusColor(order.status);
        order.statusIcon = orderStatus.getStatusIcon(order.status);
        order.userActions = orderStatus.getUserActions(order.status);

        return order;
      }));

      this.setData({
        orders,
        filteredOrders: orders,
        userOpenId,
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
      url: `/pages/user/orders/detail?id=${id}`
    });
  },

  // 执行订单操作
  async handleAction(e) {
    const { id, action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'pay':
        await this.payOrder(id);
        break;
      case 'cancel':
        await this.cancelOrder(id);
        break;
      case 'contact':
        await this.contactPhotographer(id);
        break;
      case 'after_sale':
        await this.applyAfterSale(id);
        break;
      case 'evaluate':
        await this.evaluateOrder(id);
        break;
    }
  },

  // 支付订单
  async payOrder(orderId) {
    wx.showToast({
      title: '支付功能开发中',
      icon: 'none'
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

  // 联系摄影师
  async contactPhotographer(orderId) {
    const order = this.data.orders.find(o => o._id === orderId);
    if (order && order.photographerInfo && order.photographerInfo.phone) {
      wx.makePhoneCall({
        phoneNumber: order.photographerInfo.phone
      });
    } else {
      wx.showToast({
        title: '摄影师未留联系方式',
        icon: 'none'
      });
    }
  },

  // 申请售后
  async applyAfterSale(orderId) {
    wx.showModal({
      title: '申请售后',
      content: '请描述您遇到的问题',
      editable: true,
      placeholderText: '请输入售后原因',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.AFTER_SALE, res.content);
        }
      }
    });
  },

  // 评价订单
  async evaluateOrder(orderId) {
    wx.navigateTo({
      url: `/pages/user/orders/evaluate?id=${orderId}`
    });
  },

  // 更新订单状态
  async updateOrderStatus(orderId, newStatus, remark = '') {
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

      await db.collection('activity_orders').doc(orderId).update({
        data: updateData
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

