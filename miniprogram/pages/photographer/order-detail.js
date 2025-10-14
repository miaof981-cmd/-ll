// pages/photographer/order-detail.js
Page({
  data: {
    orderId: '',
    order: null,
    activity: null,
    student: null,
    uploadedPhotos: [], // 已上传的作品
    uploading: false,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  // 加载订单详情
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
        student,
        uploadedPhotos: order.photos || [],
        loading: false
      });
    } catch (e) {
      console.error('加载订单详情失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 预览参考照片（生活照）
  previewLifePhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.order.lifePhotos || [],
      current: this.data.order.lifePhotos[index]
    });
  },

  // 上传作品
  async uploadPhotos() {
    const { uploadedPhotos } = this.data;
    
    if (uploadedPhotos.length >= 20) {
      wx.showToast({ title: '最多上传20张照片', icon: 'none' });
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: 20 - uploadedPhotos.length,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      // 兼容不同的返回格式
      const tempFilePaths = res.tempFiles ? res.tempFiles.map(f => f.tempFilePath) : res.tempFilePaths || [];

      if (!tempFilePaths || tempFilePaths.length === 0) {
        return;
      }

      wx.showLoading({ title: '上传中...' });
      this.setData({ uploading: true });

      const uploadPromises = tempFilePaths.map(async (filePath) => {
        const cloudPath = `photographer-works/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const result = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });
        return result.fileID;
      });

      const fileIDs = await Promise.all(uploadPromises);
      const newPhotos = [...uploadedPhotos, ...fileIDs];

      // 更新订单
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          photos: newPhotos,
          updatedAt: new Date().toISOString()
        }
      });

      this.setData({
        uploadedPhotos: newPhotos,
        uploading: false,
        'order.photos': newPhotos
      });

      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (e) {
      console.error('上传失败:', e);
      this.setData({ uploading: false });
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 预览已上传的作品
  previewUploadedPhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.uploadedPhotos,
      current: this.data.uploadedPhotos[index]
    });
  },

  // 删除已上传的作品
  async deletePhoto(e) {
    const { index } = e.currentTarget.dataset;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？'
    });

    if (!res.confirm) return;

    try {
      const newPhotos = this.data.uploadedPhotos.filter((_, i) => i !== index);

      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          photos: newPhotos,
          updatedAt: new Date().toISOString()
        }
      });

      this.setData({
        uploadedPhotos: newPhotos,
        'order.photos': newPhotos
      });

      wx.showToast({ title: '删除成功', icon: 'success' });
    } catch (e) {
      console.error('删除失败:', e);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 提交作品（等待管理员审核）
  async submitWork() {
    if (!this.data.uploadedPhotos || this.data.uploadedPhotos.length === 0) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    const res = await wx.showModal({
      title: '提交作品',
      content: `确认提交 ${this.data.uploadedPhotos.length} 张照片？提交后将由管理员审核。`
    });

    if (!res.confirm) return;

    try {
      wx.showLoading({ title: '提交中...' });

      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'pending_review', // 待管理员审核
          photos: this.data.uploadedPhotos,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showModal({
        title: '提交成功',
        content: '作品已提交，等待管理员审核通过后将展示给用户',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    } catch (e) {
      console.error('提交失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },

  // 联系用户
  contactUser() {
    wx.showModal({
      title: '联系用户',
      content: '此功能开发中，将支持发送消息通知用户',
      showCancel: false
    });
  },

  // 格式化时间
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
});

