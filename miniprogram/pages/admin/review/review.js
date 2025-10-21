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
    
    console.log('========================================');
    console.log('🔘 [快速审核] quickApprove 被点击');
    console.log('   订单ID:', id);
    console.log('   事件对象:', e);
    console.log('========================================');
    
    wx.showLoading({ title: '处理中...', mask: true });

    try {
      console.log('☁️ 调用云函数: adminApproveOrder');
      
      // 调用云函数处理审核（云函数有完全的数据库权限）
      const result = await wx.cloud.callFunction({
        name: 'adminApproveOrder',
        data: {
          orderId: id,
          action: 'approve'
        }
      });
      
      console.log('☁️ 云函数返回结果:', result);
      
      if (!result.result.success) {
        console.error('❌ 云函数执行失败:', result.result.errMsg);
        wx.hideLoading();
        wx.showModal({
          title: '审核失败',
          content: result.result.errMsg || '操作失败，请重试',
          showCancel: false
        });
        return;
      }
      
      console.log('✅ 审核成功，新状态:', result.result.data.newStatus);

      wx.hideLoading();
      wx.showToast({
        title: '审核通过',
        icon: 'success',
        duration: 2000
      });

      console.log('🔄 重新加载订单列表...');
      // 延迟一下再加载，确保数据已更新
      setTimeout(() => {
        this.loadPendingReviews();
      }, 500);
      
      console.log('========================================');
      console.log('✅ [快速审核] 执行完成');
      console.log('========================================');
    } catch (e) {
      console.error('========================================');
      console.error('❌ [快速审核] 执行失败');
      console.error('错误信息:', e);
      console.error('错误代码:', e.errCode);
      console.error('错误消息:', e.errMsg);
      console.error('========================================');
      
      wx.hideLoading();
      wx.showModal({
        title: '操作失败',
        content: `审核失败：${e.errMsg || e.message}`,
        showCancel: false
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

    wx.showLoading({ title: '处理中...', mask: true });

    try {
      console.log('========================================');
      console.log('❌ [快速拒绝] 开始执行');
      console.log('   订单ID:', id);
      console.log('   拒绝原因:', rejectReason);
      console.log('========================================');
      
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
      
      // 调用云函数处理审核拒绝
      console.log('☁️ 调用云函数: adminApproveOrder (reject)');
      const result = await wx.cloud.callFunction({
        name: 'adminApproveOrder',
        data: {
          orderId: id,
          action: 'reject',
          rejectReason: rejectReason
        }
      });
      
      console.log('☁️ 云函数返回结果:', result);
      
      if (!result.result.success) {
        console.error('❌ 云函数执行失败:', result.result.errMsg);
        wx.hideLoading();
        wx.showModal({
          title: '拒绝失败',
          content: result.result.errMsg || '操作失败，请重试',
          showCancel: false
        });
        return;
      }
      
      console.log('✅ 拒绝成功，新状态:', result.result.data.newStatus);

      wx.hideLoading();
      wx.showToast({
        title: '已拒绝',
        icon: 'success',
        duration: 2000
      });

      console.log('🔄 重新加载订单列表...');
      // 延迟一下再加载，确保数据已更新
      setTimeout(() => {
        this.loadPendingReviews();
      }, 500);
      
      console.log('========================================');
      console.log('✅ [快速拒绝] 执行完成');
      console.log('========================================');
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

