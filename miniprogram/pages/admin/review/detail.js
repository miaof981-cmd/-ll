const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    activity: null,
    photographer: null,
    student: null,
    historyPhotos: [], // 历史上传的照片（被拒绝的）
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
        try {
          const activityRes = await db.collection('activities')
            .doc(order.activityId)
            .get();
          activity = activityRes.data;
          console.log('✅ 活动信息:', activity);
          console.log('📷 活动图片字段:', {
            image: activity.image,
            coverImage: activity.coverImage,
            images: activity.images
          });
          
          // 尝试多个可能的图片字段
          if (!activity.image && activity.coverImage) {
            activity.image = activity.coverImage;
            console.log('使用 coverImage 字段');
          } else if (!activity.image && activity.images && activity.images.length > 0) {
            activity.image = activity.images[0];
            console.log('使用 images[0] 字段');
          }
          
          if (activity.image) {
            console.log('✅ 最终使用的图片URL:', activity.image);
          } else {
            console.warn('⚠️ 活动没有图片');
          }
        } catch (e) {
          console.error('获取活动信息失败:', e);
        }
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

      // 查询历史照片记录（从order_history集合或者从photos字段判断）
      // 如果当前状态是pending_review但有历史拒绝记录，说明之前上传过
      let historyPhotos = [];
      
      // 尝试从数据库查询该订单的历史记录
      try {
        console.log('🔍 查询历史记录，订单ID:', orderId);
        const historyRes = await db.collection('order_photo_history')
          .where({ orderId: orderId })
          .orderBy('createdAt', 'desc')
          .get();
        
        console.log('📋 历史记录查询结果:', historyRes.data);
        
        if (historyRes.data && historyRes.data.length > 0) {
          historyPhotos = historyRes.data;
          console.log('✅ 找到历史记录', historyPhotos.length, '条');
        } else {
          console.log('⚠️ 没有找到历史记录');
        }
      } catch (e) {
        console.error('❌ 查询历史记录失败:', e);
      }

      console.log('=== 页面数据设置 ===');
      console.log('订单信息:', order);
      console.log('活动信息:', activity);
      console.log('活动图片URL:', activity?.image);
      console.log('摄影师信息:', photographer);
      console.log('学生信息:', student);
      console.log('历史记录数量:', historyPhotos.length);

      this.setData({
        order,
        activity,
        photographer,
        student,
        historyPhotos,
        loading: false
      }, () => {
        console.log('✅ setData 完成');
        console.log('当前 activity.image:', this.data.activity?.image);
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

  // 图片加载错误
  onImageError(e) {
    console.error('❌ 活动图片加载失败:', e);
    console.log('📷 图片URL:', this.data.activity?.image);
  },

  // 查看活动详情
  viewActivityDetail() {
    if (this.data.order && this.data.order.activityId) {
      wx.navigateTo({
        url: `/pages/activity/detail?id=${this.data.order.activityId}`
      });
    }
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

  // 预览历史照片
  previewHistoryPhoto(e) {
    const { photos, index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: photos,
      current: photos[index]
    });
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
    const that = this;
    
    // 使用自定义弹窗或者系统弹窗
    const res = await wx.showModal({
      title: '审核拒绝',
      content: '', // 留空，不填充默认文字
      editable: true,
      placeholderText: '例如：光线不足、构图不佳、画面模糊等'
    });

    if (!res.confirm) return;

    const rejectReason = (res.content || '').trim();
    
    // 验证拒绝原因
    if (!rejectReason) {
      wx.showToast({
        title: '请输入拒绝原因',
        icon: 'none'
      });
      // 重新调用
      setTimeout(() => {
        that.rejectWork();
      }, 1500);
      return;
    }
    
    if (rejectReason.length < 5) {
      wx.showToast({
        title: '拒绝原因至少5个字',
        icon: 'none'
      });
      setTimeout(() => {
        that.rejectWork();
      }, 1500);
      return;
    }

    try {
      wx.showLoading({ title: '处理中...' });

      const db = wx.cloud.database();
      const now = new Date().toISOString();

      // 保存历史记录（包含提交时间和拒绝时间）
      try {
        await db.collection('order_photo_history').add({
          data: {
            orderId: this.data.orderId,
            photos: this.data.order.photos || [],
            rejectType: 'admin',
            rejectReason: rejectReason,
            submittedAt: this.data.order.submittedAt || now, // 提交时间
            rejectedAt: now, // 拒绝时间
            createdAt: now
          }
        });
        console.log('✅ 历史记录已保存');
      } catch (historyErr) {
        console.warn('⚠️ 保存历史记录失败（集合可能不存在）:', historyErr.message);
        // 不影响主流程继续执行
      }

      // 更新订单状态
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'in_progress',
          adminRejectReason: rejectReason,
          adminRejectedAt: now,
          updatedAt: now
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

