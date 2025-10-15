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

  // 预览图片（阻止冒泡，不触发卡片点击）
  previewImage(e) {
    const { images, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls: images,
      current: current
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
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
    const that = this;

    const res = await wx.showModal({
      title: '审核拒绝',
      content: '', // 留空，不填充默认文字
      editable: true,
      placeholderText: '例如：光线不足、构图不佳、画面模糊等',
      confirmText: '确认拒绝',
      confirmColor: '#ff4d4f'
    });

    if (!res.confirm) return;

    const rejectReason = (res.content || '').trim();
    
    // 验证拒绝原因
    if (!rejectReason) {
      wx.showToast({
        title: '请输入拒绝原因',
        icon: 'none'
      });
      return;
    }
    
    if (rejectReason.length < 5) {
      wx.showToast({
        title: '拒绝原因至少5个字',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();
      
      // 获取订单信息以保存历史
      const orderRes = await db.collection('activity_orders').doc(id).get();
      const order = orderRes.data;
      
      // 保存历史记录（如果集合存在）
      try {
        console.log('💾 [快速审核] 准备保存历史记录...');
        console.log('   - orderId:', id);
        console.log('   - photos数量:', (order.photos || []).length);
        console.log('   - rejectType: admin');
        console.log('   - rejectReason:', rejectReason);
        
        const addRes = await db.collection('order_photo_history').add({
          data: {
            orderId: id,
            photos: order.photos || [],
            rejectType: 'admin',
            rejectReason: rejectReason,
            submittedAt: order.submittedAt || now,
            rejectedAt: now,
            createdAt: now
          }
        });
        console.log('✅ [快速审核] 历史记录保存成功！新记录ID:', addRes._id);
      } catch (historyErr) {
        console.warn('⚠️ [快速审核] 保存历史记录失败（集合可能不存在）:', historyErr.message);
        console.error('完整错误:', historyErr);
        // 不影响主流程继续执行
      }
      
      // 获取当前拒绝次数并累加
      const currentRejectCount = order.rejectCount || 0;
      
      await db.collection('activity_orders').doc(id).update({
        data: {
          status: 'in_progress',
          adminRejectReason: rejectReason,
          adminRejectedAt: now,
          rejectCount: currentRejectCount + 1, // 累加拒绝次数
          updatedAt: now
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
      url: `/pages/admin/review/detail?id=${id}`
    });
  }
});

