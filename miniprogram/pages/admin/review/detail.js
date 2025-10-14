const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    activity: null,
    photographer: null,
    student: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  async loadOrderDetail(orderId) {
    try {
      const db = wx.cloud.database();

      // 获取订单信息
      const { data: order } = await db.collection('activity_orders')
        .doc(orderId)
        .get();

      if (!order) {
        wx.showToast({ title: '订单不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      // 获取活动信息
      let activity = null;
      if (order.activityId) {
        const activityRes = await db.collection('activities')
          .doc(order.activityId)
          .get();
        activity = activityRes.data;
      }

      // 获取摄影师信息
      let photographer = null;
      if (order.photographerId) {
        const photographerRes = await db.collection('photographers')
          .doc(order.photographerId)
          .get();
        photographer = photographerRes.data;
      }

      // 获取学生信息
      let student = null;
      if (order.studentId) {
        const studentRes = await db.collection('students')
          .where({ studentId: order.studentId })
          .get();
        if (studentRes.data && studentRes.data.length > 0) {
          student = studentRes.data[0];
        }
      }

      this.setData({
        order,
        activity,
        photographer,
        student,
        loading: false
      });
    } catch (e) {
      console.error('加载订单详情失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 预览作品图片
  previewPhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.order.photos,
      current: this.data.order.photos[index]
    });
  },

  // 预览活动封面
  previewActivityCover() {
    if (this.data.activity && this.data.activity.image) {
      wx.previewImage({
        urls: [this.data.activity.image],
        current: this.data.activity.image
      });
    }
  },

  // 审核通过
  async approveWork() {
    const res = await wx.showModal({
      title: '审核通过',
      content: '确认作品质量符合要求？通过后将展示给用户确认。'
    });

    if (!res.confirm) return;

    try {
      wx.showLoading({ title: '处理中...' });

      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'pending_confirm',
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '审核通过',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } catch (e) {
      console.error('操作失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 审核拒绝
  async rejectWork() {
    const res = await wx.showModal({
      title: '审核拒绝',
      content: '确认拒绝此作品？摄影师需要重新拍摄。',
      editable: true,
      placeholderText: '请输入拒绝原因...'
    });

    if (!res.confirm) return;

    const rejectReason = res.content || '作品不符合要求，请重新拍摄';

    try {
      wx.showLoading({ title: '处理中...' });

      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'in_progress',
          adminRejectReason: rejectReason,
          adminRejectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '已拒绝，通知摄影师重拍',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } catch (e) {
      console.error('操作失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  }
});

