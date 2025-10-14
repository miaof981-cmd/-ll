const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    activityInfo: null,
    photographerInfo: null,
    loading: true,
    showRejectModal: false,
    rejectReason: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  // 右上角菜单
  onShareAppMessage() {
    return {
      title: '订单详情',
      path: `/pages/user/orders/detail?id=${this.data.orderId}`
    };
  },

  // 页面菜单按钮
  onShareTimeline() {
    return {
      title: '订单详情'
    };
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

  // 预览照片
  async previewPhoto(e) {
    const { index } = e.currentTarget.dataset;
    
    // 如果订单状态是待确认，添加水印后再预览
    if (this.data.order.status === 'pending_confirm') {
      wx.showLoading({ title: '加载中...' });
      
      try {
        const watermarkedImages = await this.addWatermarkToImages(this.data.order.photos);
        wx.hideLoading();
        
        wx.previewImage({
          urls: watermarkedImages,
          current: watermarkedImages[index]
        });
      } catch (e) {
        console.error('添加水印失败:', e);
        wx.hideLoading();
        // 失败则直接预览原图
        wx.previewImage({
          urls: this.data.order.photos,
          current: this.data.order.photos[index]
        });
      }
    } else {
      // 已确认，直接预览
      wx.previewImage({
        urls: this.data.order.photos,
        current: this.data.order.photos[index]
      });
    }
  },

  // 为图片添加水印
  async addWatermarkToImages(images) {
    const watermarkedImages = [];
    
    for (let i = 0; i < images.length; i++) {
      try {
        const watermarked = await this.addWatermark(images[i]);
        watermarkedImages.push(watermarked);
      } catch (e) {
        console.error('添加水印失败:', e);
        watermarkedImages.push(images[i]); // 失败则使用原图
      }
    }
    
    return watermarkedImages;
  },

  // 为单张图片添加水印
  addWatermark(imageUrl) {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('watermarkCanvas', this);
      
      // 下载图片
      wx.getImageInfo({
        src: imageUrl,
        success: (res) => {
          const imgWidth = res.width;
          const imgHeight = res.height;
          
          // 设置画布大小
          ctx.canvas.width = imgWidth;
          ctx.canvas.height = imgHeight;
          
          // 绘制原图
          ctx.drawImage(imageUrl, 0, 0, imgWidth, imgHeight);
          
          // 绘制水印
          const watermarkText = '待确认预览';
          const fontSize = Math.min(imgWidth, imgHeight) * 0.1; // 根据图片大小调整字体
          
          ctx.setFontSize(fontSize);
          ctx.setGlobalAlpha(0.3);
          ctx.setTextAlign('center');
          ctx.setTextBaseline('middle');
          
          // 旋转45度
          ctx.translate(imgWidth / 2, imgHeight / 2);
          ctx.rotate(-45 * Math.PI / 180);
          
          // 绘制多个水印
          ctx.setFillStyle('#ffffff');
          ctx.fillText(watermarkText, 0, 0);
          ctx.fillText(watermarkText, 0, -imgHeight * 0.3);
          ctx.fillText(watermarkText, 0, imgHeight * 0.3);
          
          ctx.draw(false, () => {
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'watermarkCanvas',
                success: (result) => {
                  resolve(result.tempFilePath);
                },
                fail: reject
              }, this);
            }, 500);
          });
        },
        fail: reject
      });
    });
  },

  // 确认作品满意
  async confirmWork() {
    const res = await wx.showModal({
      title: '确认收货',
      content: '确认对摄影师的作品满意吗？确认后订单将完成。',
      confirmText: '确认满意',
      cancelText: '再看看'
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '处理中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'completed',
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showModal({
        title: '确认成功',
        content: '感谢您的确认！订单已完成，期待您的评价。',
        showCancel: false,
        success: () => {
          this.loadOrderDetail(this.data.orderId);
        }
      });
    } catch (e) {
      console.error('确认失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 拒绝作品
  async rejectWork() {
    // 跳转到拒绝原因填写页面（使用页面路由传递数据）
    this.setData({
      showRejectModal: true,
      rejectReason: ''
    });
  },

  // 关闭拒绝弹窗
  closeRejectModal() {
    this.setData({
      showRejectModal: false,
      rejectReason: ''
    });
  },

  // 输入拒绝原因
  onRejectReasonInput(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },

  // 提交拒绝
  async submitReject() {
    const reason = this.data.rejectReason?.trim();
    
    if (!reason) {
      wx.showToast({ title: '请输入拒绝原因', icon: 'none' });
      return;
    }

    if (reason.length < 5) {
      wx.showToast({ title: '请详细说明原因（至少5个字）', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'in_progress', // 返回拍摄中状态
          rejectReason: reason,
          rejectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      
      this.setData({
        showRejectModal: false,
        rejectReason: ''
      });

      wx.showModal({
        title: '已提交',
        content: '已将您的意见反馈给摄影师，摄影师将重新拍摄。',
        showCancel: false,
        success: () => {
          this.loadOrderDetail(this.data.orderId);
        }
      });
    } catch (e) {
      console.error('提交失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 获取操作文本
  getActionText(action) {
    const textMap = {
      'pay': '立即支付',
      'cancel': '取消订单',
      'after_sale': '申请售后',
      'evaluate': '去评价',
      'confirm': '确认收货',
      'reject': '拒绝作品'
    };
    return textMap[action] || action;
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

