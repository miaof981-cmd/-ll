// pages/photographer/order-detail.js
Page({
  data: {
    orderId: '',
    order: null,
    activity: null,
    student: null,
    uploadedPhotos: [], // 当前编辑区的照片
    historyPhotos: [], // 当前被拒绝的照片（显示在历史卡片中）
    allHistoryPhotos: [], // 数据库中的完整历史记录（所有提交和拒绝）
    photographerNote: '', // 摄影师给用户的备注
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

      // 判断照片放在哪里
      // 如果订单状态是in_progress且有photos，说明是被拒绝的历史照片
      // 如果订单状态是pending_review/pending_confirm/completed，photos是已提交的作品
      let uploadedPhotos = [];
      let currentHistoryPhotos = []; // 当前订单上被拒绝的照片
      
      if (order.status === 'in_progress' && order.photos && order.photos.length > 0) {
        // 被拒绝，照片放到历史记录
        currentHistoryPhotos = order.photos;
        uploadedPhotos = []; // 当前编辑区为空，可以重新上传
      } else if (order.photos && order.photos.length > 0) {
        // 已提交或审核中，照片显示在当前区域
        uploadedPhotos = order.photos;
      }

      // 查询完整的历史记录（从数据库）
      let historyPhotos = [];
      try {
        console.log('🔍 [摄影师订单] 查询历史记录，订单ID:', orderId);
        const historyRes = await db.collection('order_photo_history')
          .where({ orderId: orderId })
          .orderBy('createdAt', 'desc')
          .get();
        
        console.log('📋 [摄影师订单] 历史记录查询结果:', historyRes.data ? historyRes.data.length : 0, '条');
        
        if (historyRes.data && historyRes.data.length > 0) {
          historyPhotos = historyRes.data;
          historyPhotos.forEach((h, idx) => {
            console.log(`   [${idx + 1}] 类型:${h.rejectType}, 时间:${h.rejectedAt}, 原因:${h.rejectReason}`);
          });
        }
      } catch (e) {
        console.error('❌ [摄影师订单] 查询历史记录失败:', e);
      }

      console.log('=== [摄影师订单] 页面数据设置 ===');
      console.log('当前编辑区照片数:', uploadedPhotos.length);
      console.log('当前被拒照片数:', currentHistoryPhotos.length);
      console.log('数据库历史记录数:', historyPhotos.length);
      console.log('📷 参考照片（生活照）数量:', order.lifePhotos ? order.lifePhotos.length : 0);
      if (order.lifePhotos && order.lifePhotos.length > 0) {
        console.log('   生活照列表:', order.lifePhotos);
      } else {
        console.warn('⚠️ 订单中没有生活照数据！');
      }

      // 转换生活照的云存储URL为临时链接
      if (order.lifePhotos && order.lifePhotos.length > 0) {
        try {
          console.log('🔄 开始转换生活照云存储URL为临时链接...');
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: order.lifePhotos
          });
          console.log('✅ 临时链接转换结果:', tempUrlResult);
          
          if (tempUrlResult.fileList) {
            order.lifePhotos = tempUrlResult.fileList.map((file, index) => {
              if (file.status === 0 && file.tempFileURL) {
                console.log(`   [${index + 1}] 转换成功: ${file.tempFileURL}`);
                return file.tempFileURL;
              } else {
                console.warn(`   [${index + 1}] 转换失败: ${file.errMsg}`);
                return file.fileID; // 失败时使用原URL
              }
            });
          }
        } catch (err) {
          console.error('❌ 生活照临时链接转换失败:', err);
          // 失败不影响其他功能，继续使用原URL
        }
      }

      this.setData({
        order,
        activity,
        student,
        uploadedPhotos,
        historyPhotos: currentHistoryPhotos, // 保持原有逻辑：显示当前被拒的照片
        allHistoryPhotos: historyPhotos, // 新增：数据库中的完整历史
        photographerNote: order.photographerNote || '',
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

  // 预览历史照片（从数据库历史记录）
  previewHistoryPhoto(e) {
    const { photos, index } = e.currentTarget.dataset;
    console.log('[摄影师] 预览历史照片，共', photos.length, '张');
    wx.previewImage({
      urls: photos,
      current: photos[index]
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
  // 备注输入
  onPhotographerNoteInput(e) {
    this.setData({
      photographerNote: e.detail.value
    });
  },

  async submitWork() {
    if (!this.data.uploadedPhotos || this.data.uploadedPhotos.length === 0) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    const noteText = this.data.photographerNote.trim() 
      ? `\n\n摄影师说明：${this.data.photographerNote.trim()}`
      : '';

    const res = await wx.showModal({
      title: '提交作品',
      content: `确认提交 ${this.data.uploadedPhotos.length} 张照片？提交后将由管理员审核。${noteText}`
    });

    if (!res.confirm) return;

    try {
      wx.showLoading({ title: '提交中...' });

      const db = wx.cloud.database();
      const _ = db.command;
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'pending_review', // 待管理员审核
          photos: this.data.uploadedPhotos,
          photographerNote: this.data.photographerNote.trim() || '',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // 清除之前的拒绝原因（但保留 rejectCount 用于历史记录重建）
          adminRejectReason: _.remove(),
          adminRejectedAt: _.remove(),
          rejectReason: _.remove(),
          rejectedAt: _.remove()
          // 注意：不删除 rejectCount，保留用于统计和历史记录
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

