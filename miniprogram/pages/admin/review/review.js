const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orders: [],
    loading: true
  },

  onLoad() {
    this.loadPendingReviews();
  },

  onShow() {
    this.loadPendingReviews();
  },

  async loadPendingReviews() {
    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('activity_orders')
        .where({
          status: 'pending_review'
        })
        .orderBy('submittedAt', 'desc')
        .get();

      // 加载相关信息
      const orders = await Promise.all(res.data.map(async (order) => {
        // 加载活动信息
        try {
          const activityRes = await db.collection('activities').doc(order.activityId).get();
          order.activityInfo = activityRes.data;
        } catch (e) {
          console.error('加载活动信息失败:', e);
        }

        // 加载摄影师信息
        if (order.photographerId) {
          try {
            const photographerRes = await db.collection('photographers').doc(order.photographerId).get();
            order.photographerInfo = photographerRes.data;
          } catch (e) {
            console.error('加载摄影师信息失败:', e);
          }
        }

        return order;
      }));

      this.setData({
        orders,
        loading: false
      });
    } catch (e) {
      console.error('加载待审核订单失败:', e);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 预览图片
  previewImage(e) {
    const { images, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls: images,
      current: current
    });
  },

  // 快速审核通过
  async quickApprove(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(id).update({
        data: {
          status: 'pending_confirm',
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '审核通过',
        icon: 'success'
      });

      // 重新加载列表
      this.loadPendingReviews();
    } catch (e) {
      console.error('审核失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 快速拒绝
  async quickReject(e) {
    const { id } = e.currentTarget.dataset;

    const res = await wx.showModal({
      title: '审核拒绝',
      content: '确认拒绝此作品？',
      editable: true,
      placeholderText: '请输入拒绝原因（可选）',
      confirmText: '确认拒绝',
      confirmColor: '#ff4d4f'
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '处理中...' });

    try {
      const rejectReason = res.content || '作品不符合要求';
      const db = wx.cloud.database();
      
      await db.collection('activity_orders').doc(id).update({
        data: {
          status: 'in_progress',
          adminRejectReason: rejectReason,
          adminRejectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '已拒绝',
        icon: 'success'
      });

      // 重新加载列表
      this.loadPendingReviews();
    } catch (e) {
      console.error('操作失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/orders/detail?id=${id}`
    });
  }
});

