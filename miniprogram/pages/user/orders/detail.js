const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    activityInfo: null,
    photographerInfo: null,
    loading: true,
    showRejectModal: false,
    rejectReason: '',
    canGoBack: true // 是否可以返回
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
    
    // 检查页面栈，判断是否可以返回
    const pages = getCurrentPages();
    this.setData({
      canGoBack: pages.length > 1
    });
  },
  
  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 如果没有上一页，跳转到订单列表
      wx.redirectTo({
        url: '/pages/user/orders/orders'
      });
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

  // 查看活动详情
  viewActivity() {
    if (this.data.order && this.data.order.activityId) {
      wx.navigateTo({
        url: `/pages/activity/detail?id=${this.data.order.activityId}`
      });
    }
  },

  // 查看摄影师详情
  viewPhotographer() {
    if (this.data.order && this.data.order.photographerId) {
      wx.navigateTo({
        url: `/pages/photographer/detail?id=${this.data.order.photographerId}`
      });
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
    
    console.log('当前订单状态:', this.data.order.status);
    
    // 只有订单已完成(completed)、已退款(refunded)或已取消(cancelled)时才显示无水印原图
    // 其他所有状态（pending_review、pending_confirm、in_progress等）都需要水印，防止白嫖
    const needWatermark = !['completed', 'refunded', 'cancelled'].includes(this.data.order.status);
    
    console.log('是否需要水印:', needWatermark);
    
    if (needWatermark && this.data.order.photos && this.data.order.photos.length > 0) {
      console.log('开始添加水印...');
      wx.showLoading({ title: '添加水印中...' });
      
      try {
        const watermarkedImages = await this.addWatermarkToImages(this.data.order.photos);
        console.log('水印添加完成，图片数量:', watermarkedImages.length);
        wx.hideLoading();
        
        wx.previewImage({
          urls: watermarkedImages,
          current: watermarkedImages[index]
        });
      } catch (e) {
        console.error('添加水印失败:', e);
        wx.hideLoading();
        wx.showToast({
          title: '水印添加失败，显示原图',
          icon: 'none'
        });
        // 失败则直接预览原图
        wx.previewImage({
          urls: this.data.order.photos,
          current: this.data.order.photos[index]
        });
      }
    } else {
      console.log('订单已完成/退款/取消，直接预览无水印原图');
      // 已完成/退款/取消，直接预览无水印原图
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
      // 使用新版Canvas 2D
      const query = wx.createSelectorQuery().in(this);
      query.select('#watermarkCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0]) {
            console.error('Canvas节点未找到');
            reject(new Error('Canvas节点未找到'));
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          // 下载图片
          wx.getImageInfo({
            src: imageUrl,
            success: (imgInfo) => {
              const imgWidth = imgInfo.width;
              const imgHeight = imgInfo.height;
              
              // 设置画布大小
              const dpr = wx.getWindowInfo().pixelRatio || 2;
              canvas.width = imgWidth * dpr;
              canvas.height = imgHeight * dpr;
              ctx.scale(dpr, dpr);
              
              // 创建图片对象
              const img = canvas.createImage();
              img.onload = () => {
                // 绘制原图
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
                
                // 绘制水印
                const watermarkText = '确认收图后水印自动消除';
                const fontSize = Math.min(imgWidth, imgHeight) * 0.05; // 适中字体大小
                
                ctx.font = `bold ${fontSize}px sans-serif`; // 加粗字体
                ctx.globalAlpha = 0.65; // 略微提高透明度
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FF0000'; // 大红色
                
                // 保存当前状态
                ctx.save();
                
                // 旋转45度
                ctx.translate(imgWidth / 2, imgHeight / 2);
                ctx.rotate(-45 * Math.PI / 180);
                
                // 计算水印间距（密集但不重叠）
                const spacingX = Math.min(imgWidth, imgHeight) * 0.55; // 横向间距
                const spacingY = Math.min(imgWidth, imgHeight) * 0.32; // 纵向间距
                
                // 密集覆盖整个画面
                for (let x = -imgWidth * 1.5; x <= imgWidth * 1.5; x += spacingX) {
                  for (let y = -imgHeight * 1.5; y <= imgHeight * 1.5; y += spacingY) {
                    ctx.fillText(watermarkText, x, y);
                  }
                }
                
                // 恢复状态
                ctx.restore();
                
                // 导出图片
                setTimeout(() => {
                  wx.canvasToTempFilePath({
                    canvas: canvas,
                    success: (result) => {
                      console.log('水印添加成功:', result.tempFilePath);
                      resolve(result.tempFilePath);
                    },
                    fail: (err) => {
                      console.error('导出图片失败:', err);
                      reject(err);
                    }
                  }, this);
                }, 300);
              };
              
              img.onerror = (err) => {
                console.error('图片加载失败:', err);
                reject(err);
              };
              
              img.src = imgInfo.path;
            },
            fail: (err) => {
              console.error('获取图片信息失败:', err);
              reject(err);
            }
          });
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
    // 检查拒绝次数
    const rejectCount = this.data.order.rejectCount || 0;
    if (rejectCount >= 3) {
      wx.showModal({
        title: '无法拒绝',
        content: '您的修改机会已用完（3次），只能选择确认收货。如有问题请联系客服申请售后。',
        showCancel: false
      });
      return;
    }

    // 显示拒绝弹窗
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
      const currentRejectCount = this.data.order.rejectCount || 0;
      const now = new Date().toISOString();

      // 保存历史记录（包含提交时间和拒绝时间）
      try {
        await db.collection('order_photo_history').add({
          data: {
            orderId: this.data.orderId,
            photos: this.data.order.photos || [],
            rejectType: 'user',
            rejectReason: reason,
            rejectCount: currentRejectCount + 1, // 记录是第几次拒绝
            submittedAt: this.data.order.submittedAt || now, // 提交时间
            rejectedAt: now, // 拒绝时间
            createdAt: now
          }
        });
        console.log('✅ 用户拒绝历史记录已保存');
      } catch (historyErr) {
        console.error('⚠️ 保存历史记录失败:', historyErr);
        // 不影响主流程
      }
      
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'in_progress', // 返回拍摄中状态，但保留照片
          rejectReason: reason,
          rejectedAt: now,
          rejectCount: currentRejectCount + 1, // 增加拒绝次数
          updatedAt: now
          // 注意：不删除photos字段，让摄影师可以基于原照片修改
        }
      });

      wx.hideLoading();
      
      this.setData({
        showRejectModal: false,
        rejectReason: ''
      });

      const remainingChances = 3 - (currentRejectCount + 1);
      const tipContent = remainingChances > 0 
        ? `已将您的意见反馈给摄影师。您还有${remainingChances}次修改机会。`
        : '已将您的意见反馈给摄影师。这是最后一次修改机会。';

      wx.showModal({
        title: '已提交',
        content: tipContent,
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

