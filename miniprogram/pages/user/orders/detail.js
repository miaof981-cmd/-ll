const orderStatus = require('../../../utils/order-status.js');
const studentIdUtil = require('../../../utils/student-id.js');
const imageUrlManager = require('../../../utils/image-url-manager.js');

Page({
  data: {
    orderId: '',
    order: null,
    activityInfo: null,
    photographerInfo: null,
    historyPhotos: [], // 历史提交记录
    loading: true,
    showRejectModal: false,
    rejectReason: '',
    canGoBack: true, // 是否可以返回
    // 支付倒计时
    countdownText: '',
    payDisabled: false,
    _countdownTimer: null
  },

  // 工具：格式化为北京时间 YYYY-MM-DD HH:mm:ss
  formatBeijing(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hour = pad(d.getHours());
      const minute = pad(d.getMinutes());
      const second = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (_) {
      return ts;
    }
  },

  onLoad(options) {
    console.log('🎯 [用户订单详情页] 页面加载');
    console.log('📄 当前页面路径:', getCurrentPages()[getCurrentPages().length - 1].route);
    console.log('📋 参数:', options);
    
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
      
      // 如果有 autoConfirm 参数，自动触发确认
      if (options.autoConfirm === 'true') {
        console.log('🔔 检测到自动确认参数，将在页面加载后自动确认...');
        setTimeout(() => {
          this.confirmWork();
        }, 500); // 延迟500ms确保页面数据已加载
      }
    }
    
    // 检查页面栈，判断是否可以返回
    const pages = getCurrentPages();
    this.setData({
      canGoBack: pages.length > 1
    });
  },

  // 启动/停止支付倒计时（仅待支付）
  startPaymentCountdown(order) {
    this.stopPaymentCountdown();
    if (!order || order.status !== 'pending_payment') return;

    const TIMEOUT_MS = 30 * 60 * 1000; // 30分钟
    const created = new Date(order.createdAt).getTime();
    const expireAt = created + TIMEOUT_MS;

    const tick = async () => {
      const now = Date.now();
      let remainMs = expireAt - now;
      if (remainMs <= 0) {
        this.setData({ countdownText: '已超时', payDisabled: true });
        this.stopPaymentCountdown();
        // 自动关闭订单
        try {
          await this.autoCloseOrder();
          // 重新加载，刷新状态
          this.loadOrderDetail(this.data.orderId);
        } catch (_) {
        }
        return;
      }
      const remainSec = Math.floor(remainMs / 1000);
      const hh = Math.floor(remainSec / 3600);
      const mm = Math.floor((remainSec % 3600) / 60);
      const ss = remainSec % 60;
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      const text = hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
      this.setData({ countdownText: text, payDisabled: false });
    };

    tick();
    const timer = setInterval(tick, 1000);
    this.setData({ _countdownTimer: timer });
  },

  stopPaymentCountdown() {
    const t = this.data._countdownTimer;
    if (t) {
      clearInterval(t);
      this.setData({ _countdownTimer: null });
    }
  },

  async autoCloseOrder() {
    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'cancelled',
          cancelReason: '支付超时自动关闭',
          cancelledAt: now,
          updatedAt: now
        }
      });
    } catch (e) {
      console.error('自动关闭订单失败:', e);
    }
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
      if (order.activityId) {
        try {
          console.log('🔍 [用户订单] 加载活动信息, activityId:', order.activityId);
          const activityRes = await db.collection('activities').doc(order.activityId).get();
          activityInfo = activityRes.data;
          console.log('✅ [用户订单] 活动信息加载成功:', activityInfo?.name, '类别:', activityInfo?.category);
          
          // 🔥 转换活动封面 cloud:// URL（带2小时缓存）
          if (activityInfo && activityInfo.coverImage) {
            try {
              activityInfo.coverImage = await imageUrlManager.convertSingle(activityInfo.coverImage);
              console.log('✅ [图片转换] 活动封面转换成功');
            } catch (err) {
              console.warn('⚠️ [图片转换] 活动封面转换失败:', err);
            }
          }
        } catch (e) {
          console.error('❌ [用户订单] 加载活动信息失败:', e);
          console.error('   订单的 activityId:', order.activityId);
        }
      } else {
        console.warn('⚠️ [用户订单] 订单没有 activityId');
      }

      // 加载摄影师信息
      let photographerInfo = null;
      if (order.photographerId) {
        try {
          // 从 photographers 集合获取基本信息（name, status等）
          const photographerRes = await db.collection('photographers').doc(order.photographerId).get();
          photographerInfo = photographerRes.data;
          
          // 🔥 统一从 users 集合获取最新头像
          if (photographerInfo && photographerInfo._openid) {
            try {
              const userRes = await db.collection('users')
                .where({ _openid: photographerInfo._openid })
                .get();
              
              if (userRes.data && userRes.data.length > 0) {
                const userData = userRes.data[0];
                // 使用 users 集合的 avatarUrl，而不是 photographers 集合的 avatar
                photographerInfo.avatarUrl = userData.avatarUrl || photographerInfo.avatar || '';
                console.log('✅ [订单详情] 从 users 集合获取摄影师头像:', userData.avatarUrl);
              } else {
                console.warn('⚠️ [订单详情] 未找到摄影师的 users 记录，使用 photographers 的 avatar');
                photographerInfo.avatarUrl = photographerInfo.avatar || '';
              }
            } catch (userErr) {
              console.error('❌ [订单详情] 从 users 集合查询摄影师头像失败:', userErr);
              photographerInfo.avatarUrl = photographerInfo.avatar || '';
            }
          } else {
            console.warn('⚠️ [订单详情] 摄影师没有 _openid，使用 photographers 的 avatar');
            photographerInfo.avatarUrl = photographerInfo.avatar || '';
          }
        } catch (e) {
          console.error('加载摄影师信息失败:', e);
        }
      }

      // 查询历史记录（用户只能看到自己的拒绝记录，不显示管理员内部审核流程）
      let historyPhotos = [];
      try {
        console.log('🔍 [用户订单] 查询历史记录（仅用户拒绝），订单ID:', orderId);
        const historyRes = await db.collection('order_photo_history')
          .where({ 
            orderId: orderId,
            rejectType: 'user' // 只查询用户自己的拒绝记录
          })
          .orderBy('createdAt', 'desc')
          .get();
        
        console.log('📋 [用户订单] 历史记录查询结果:', historyRes.data ? historyRes.data.length : 0, '条（仅用户拒绝）');
        
        if (historyRes.data && historyRes.data.length > 0) {
          historyPhotos = historyRes.data;
          historyPhotos.forEach((h, idx) => {
            console.log(`   [${idx + 1}] 时间:${h.rejectedAt}, 原因:${h.rejectReason}`);
          });
        }
      } catch (e) {
        console.error('❌ [用户订单] 查询历史记录失败:', e);
      }

      // 兼容价格字段并补充展示时间
      if (order.totalPrice === undefined && order.price !== undefined) {
        order.totalPrice = order.price;
      }
      order.createdAtText = this.formatBeijing(order.createdAt);
      order.updatedAtText = this.formatBeijing(order.updatedAt || order.createdAt);
      order.submittedAtText = this.formatBeijing(order.submittedAt);
      order.confirmedAtText = this.formatBeijing(order.confirmedAt);
      order.rejectedAtText = this.formatBeijing(order.rejectedAt);

      // 添加状态信息
      order.statusText = orderStatus.getStatusText(order.status);
      order.statusColor = orderStatus.getStatusColor(order.status);
      order.statusIcon = orderStatus.getStatusIcon(order.status);
      order.userActions = orderStatus.getUserActions(order.status);
      
      // 确保 rejectCount 有默认值（新订单可能没有这个字段）
      if (order.rejectCount === undefined || order.rejectCount === null) {
        order.rejectCount = 0;
      }

      console.log('=== [用户订单] 页面数据设置 ===');
      console.log('订单信息:', order);
      console.log('拒绝次数:', order.rejectCount);
      console.log('历史记录数量:', historyPhotos.length);

      // 🔥 批量转换所有图片 URL (cloud:// -> https://) 带2小时缓存
      try {
        const urlsToConvert = [];
        
        // 收集订单照片
        if (order.photos && Array.isArray(order.photos)) {
          order.photos.forEach(url => {
            if (url) urlsToConvert.push(url);
          });
        }
        
        // 收集生活照
        if (order.lifePhotos && Array.isArray(order.lifePhotos)) {
          order.lifePhotos.forEach(url => {
            if (url) urlsToConvert.push(url);
          });
        }
        
        // 收集孩子照片
        if (order.childPhoto) {
          urlsToConvert.push(order.childPhoto);
        }
        
        // 收集活动封面快照
        if (order.activityCover) {
          urlsToConvert.push(order.activityCover);
        }
        
        // 收集历史记录中的照片
        historyPhotos.forEach(history => {
          if (history.photos && Array.isArray(history.photos)) {
            history.photos.forEach(url => {
              if (url) urlsToConvert.push(url);
            });
          }
        });
        
        // 批量转换（自动使用缓存）
        if (urlsToConvert.length > 0) {
          console.log('📸 [图片转换] 收集到', urlsToConvert.length, '张图片');
          const urlMap = await imageUrlManager.convertBatch(urlsToConvert);
          console.log('✅ [图片转换] 映射完成，共', Object.keys(urlMap).length, '个');
          
          // 替换订单照片（转换失败的会显示默认图）
          if (order.photos) {
            order.photos = order.photos.map(url => 
              urlMap.hasOwnProperty(url) ? urlMap[url] : url
            );
          }
          
          // 替换生活照
          if (order.lifePhotos) {
            order.lifePhotos = order.lifePhotos.map(url => 
              urlMap.hasOwnProperty(url) ? urlMap[url] : url
            );
          }
          
          // 替换孩子照片
          if (order.childPhoto && urlMap.hasOwnProperty(order.childPhoto)) {
            order.childPhoto = urlMap[order.childPhoto];
          }
          
          // 替换活动封面快照
          if (order.activityCover && urlMap.hasOwnProperty(order.activityCover)) {
            order.activityCover = urlMap[order.activityCover];
          }
          
          // 替换历史记录照片
          historyPhotos.forEach(history => {
            if (history.photos) {
              history.photos = history.photos.map(url => 
                urlMap.hasOwnProperty(url) ? urlMap[url] : url
              );
            }
          });
          
          console.log('✅ [图片转换] 所有图片URL已更新');
        }
      } catch (err) {
        console.warn('⚠️ [图片转换] 批量转换失败:', err);
      }

      this.setData({
        order,
        activityInfo,
        photographerInfo,
        historyPhotos,
        loading: false
      });

      // 启动倒计时（待支付）
      this.startPaymentCountdown(order);

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

  onUnload() {
    this.stopPaymentCountdown();
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
    try {
      const order = this.data.order;
      if (!order || !order.orderNo) {
        wx.showToast({ title: '订单信息异常', icon: 'none' });
        return;
      }

      if (!order.totalPrice && order.price !== undefined) {
        order.totalPrice = order.price;
      }

      const totalFee = Math.round(Number(order.totalPrice) * 100);
      if (!(totalFee > 0)) {
        wx.showToast({ title: '订单金额无效', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '拉起支付...', mask: true });

      const { result } = await wx.cloud.callFunction({
        name: 'unifiedOrder',
        data: {
          orderNo: order.orderNo,
          totalFee: totalFee,
          description: this.data.activityInfo?.title || '次元学校-证件照拍摄'
        }
      });

      if (!result || !result.success) {
        wx.hideLoading();
        wx.showToast({ title: result?.errMsg || '统一下单失败', icon: 'none' });
        return;
      }

      // 兼容不同返回结构
      let payment = result.payment || result.result?.payment || result.result;
      if (!payment || !payment.timeStamp) {
        wx.hideLoading();
        wx.showToast({ title: '支付参数缺失', icon: 'none' });
        return;
      }

      wx.hideLoading();
      await wx.requestPayment({
        timeStamp: payment.timeStamp,
        nonceStr: payment.nonceStr,
        package: payment.package,
        signType: payment.signType || 'MD5',
        paySign: payment.paySign
      });

      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => this.loadOrderDetail(this.data.orderId), 1200);
    } catch (e) {
      wx.hideLoading();
      if (e && e.errMsg && e.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' });
      } else {
        wx.showToast({ title: e.message || '支付失败', icon: 'none' });
      }
    }
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

  // 预览历史照片（历史记录始终带水印）
  async previewHistoryPhoto(e) {
    const { photos, index } = e.currentTarget.dataset;
    
    console.log('预览历史照片，共', photos.length, '张');
    
    wx.showLoading({ title: '添加水印中...' });
    
    try {
      const watermarkedImages = await this.addWatermarkToImages(photos);
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
        urls: photos,
        current: photos[index]
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
    console.log('========================================');
    console.log('🎯 confirmWork() 点击触发！！！');
    console.log('========================================');
    console.log('📦 当前订单数据:', JSON.stringify(this.data.order, null, 2));
    console.log('📦 当前活动数据:', JSON.stringify(this.data.activityInfo, null, 2));
    console.log('📦 订单ID:', this.data.orderId);
    
    try {
      const res = await wx.showModal({
        title: '确认收货',
        content: '确认对摄影师的作品满意吗？确认后订单将完成，并自动创建学生档案。',
        confirmText: '确认满意',
        cancelText: '再看看'
      });

      console.log('💬 用户选择:', res.confirm ? '确认' : '取消');

      if (!res.confirm) {
        console.log('⏹ 用户取消确认');
        return;
      }

      wx.showLoading({ title: '处理中...' });

      const db = wx.cloud.database();
      const now = new Date().toISOString();
      console.log('⏰ 当前时间:', now);
      
      // 1. 更新订单状态
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: 'completed',
          confirmedAt: now,
          updatedAt: now
        }
      });

      console.log('✅ 订单状态已更新为 completed');

      // 2. 处理档案创建逻辑
      const order = this.data.order;
      const activity = this.data.activityInfo;
      
      console.log('========================================');
      console.log('📋 开始处理档案创建...');
      console.log('   订单信息:');
      console.log('     - 学生姓名:', order?.studentName);
      console.log('     - 性别:', order?.gender);
      console.log('     - 年龄:', order?.age);
      console.log('     - 照片数量:', order?.photos?.length);
      console.log('   活动信息:');
      console.log('     - 活动ID:', activity?._id);
      console.log('     - 活动名称:', activity?.name);
      console.log('     - 活动类别:', activity?.category);
      console.log('========================================');
      
      // 2.1 如果是证件照订单，创建学生档案（学籍档案）
      if (activity?.category === '证件照' && order?.studentName) {
        console.log('✅ 这是证件照订单，开始创建学生档案...');
        
        try {
          // 2.1 检查该学生是否已有档案
          const existingStudent = await db.collection('students')
            .where({ 
              name: order.studentName,
              _openid: order._openid 
            })
            .get();
          
          console.log('🔍 检查学生档案是否已存在...');
          console.log('   查询条件: name =', order.studentName, ', _openid =', order._openid);
          console.log('   查询结果数量:', existingStudent.data?.length);

          if (existingStudent.data && existingStudent.data.length > 0) {
            console.log('⚠️ 学生档案已存在，跳过创建');
            console.log('   已存在的档案:', existingStudent.data[0]);
          } else {
            console.log('📝 档案不存在，开始创建新档案...');
            
            // 2.2 生成新学号
            console.log('🔢 开始生成学号...');
            const studentId = await studentIdUtil.generateNextStudentId();
            console.log('✅ 学号生成成功:', studentId);
            
            // 2.3 创建学生档案
            // 将证件照添加到生活照数组（作为第5张，锁定）
            const certificatePhoto = order.photos && order.photos.length > 0 ? order.photos[0] : '';
            const lifePhotos = [...(order.lifePhotos || [])];
            if (certificatePhoto) {
              lifePhotos.push(certificatePhoto); // 证件照作为最后一张
            }
            
            const studentData = {
              studentId: studentId,
              name: order.studentName,
              avatar: certificatePhoto, // 使用证件照作为头像
              gender: order.gender || '',
              age: order.age || 0,
              class: order.class || '待分配',
              parentName: order.parentName || '',
              parentPhone: order.parentPhone || '',
              parentWechat: order.parentWechat || '', // 家长微信号
              expectations: order.remark || order.expectations || '', // 对孩子的期许
              lifePhotos: lifePhotos, // 生活照 + 证件照
              certificatePhoto: certificatePhoto, // 单独保存证件照，用于锁定
              createdAt: now,
              updatedAt: now,
              source: 'order', // 标记来源：订单自动创建
              sourceOrderId: this.data.orderId // 来源订单ID
            };
            
            console.log('🧾 准备写入档案数据:', JSON.stringify(studentData, null, 2));
            
            const addResult = await db.collection('students').add({
              data: studentData
            });
            
            console.log('✅ 学生档案创建成功！');
            console.log('   档案ID:', addResult._id);
            console.log('   学号:', studentId);
            
            // 2.4 创建学籍档案记录（student_records）
            console.log('📝 创建学籍档案记录...');
            const recordData = {
              studentId: studentId,
              studentName: order.studentName,
              gender: order.gender || '',
              age: order.age || 0,
              birthDate: '',
              idCard: '',
              phone: order.parentPhone || '',
              parentName: order.parentName || '',
              parentPhone: order.parentPhone || '',
              address: '',
              class: order.class || '待分配',
              avatar: order.photos && order.photos.length > 0 ? order.photos[0] : '', // 证件照
              lifePhotos: order.lifePhotos || [],
              status: 'active',
              createdAt: now,
              updatedAt: now,
              source: 'order', // 标记来源：订单自动创建
              sourceOrderId: this.data.orderId
            };
            
            await db.collection('student_records').add({
              data: recordData
            });
            
            console.log('✅ 学籍档案记录创建成功！');
            
            // 2.5 更新订单，关联学号
            await db.collection('activity_orders').doc(this.data.orderId).update({
              data: {
                studentId: studentId,
                updatedAt: now
              }
            });
            
            wx.hideLoading();
            wx.showModal({
              title: '确认成功',
              content: `订单已完成！已为 ${order.studentName} 自动创建学生档案，学号：${studentId}`,
              showCancel: false,
              success: () => {
                this.loadOrderDetail(this.data.orderId);
              }
            });
            return;
          }
        } catch (archiveError) {
          console.error('========================================');
          console.error('❌ 创建学生档案失败！');
          console.error('错误信息:', archiveError);
          console.error('错误堆栈:', archiveError.stack);
          console.error('========================================');
          // 档案创建失败不影响订单完成，只是提示用户
          wx.showToast({
            title: '档案创建失败: ' + archiveError.message,
            icon: 'none',
            duration: 3000
          });
        }
      } else {
        console.log('⚠️ 不是证件照订单，不创建学生档案');
      }

      // 2.2 为所有订单创建活动图片档案（如果有照片）
      if (order?.photos && order.photos.length > 0 && order?.studentName) {
        console.log('📸 开始创建活动图片档案...');
        console.log('   照片数量:', order.photos.length);
        
        try {
          // 查找学生（可能是刚创建的，也可能是已存在的）
          const studentRes = await db.collection('students')
            .where({ 
              name: order.studentName,
              _openid: order._openid 
            })
            .get();
          
          if (studentRes.data && studentRes.data.length > 0) {
            const student = studentRes.data[0];
            console.log('✅ 找到学生档案，学号:', student.studentId);
            
            // 为每张照片创建一个图片档案记录
            for (let i = 0; i < order.photos.length; i++) {
              const photo = order.photos[i];
              const imageRecordData = {
                studentId: student.studentId,
                type: 'image', // 档案类型：图片
                title: `${activity.name || '活动照片'} - ${i + 1}`,
                imageUrl: photo,
                activityName: activity.name || '未知活动',
                activityId: activity._id,
                orderId: this.data.orderId,
                description: `来自活动：${activity.name || '未知活动'}`,
                createdAt: now,
                updatedAt: now,
                source: 'order', // 来源：订单自动创建
                status: 'active'
              };
              
              await db.collection('student_records').add({
                data: imageRecordData
              });
              
              console.log(`✅ 图片档案 ${i + 1} 创建成功`);
            }
            
            console.log('✅ 所有活动图片档案创建完成！');
          } else {
            console.log('⚠️ 未找到学生档案，跳过图片档案创建');
          }
        } catch (imageError) {
          console.error('❌ 创建活动图片档案失败:', imageError);
          // 图片档案创建失败不影响订单完成
        }
      } else {
        console.log('⚠️ 订单无照片或无学生姓名，跳过图片档案创建');
      }

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
      console.error('========================================');
      console.error('❌ confirmWork 执行出错！');
      console.error('错误类型:', e.name);
      console.error('错误信息:', e.message);
      console.error('错误堆栈:', e.stack);
      console.error('========================================');
      wx.hideLoading();
      wx.showToast({ 
        title: '操作失败: ' + e.message, 
        icon: 'none',
        duration: 3000
      });
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
        console.warn('⚠️ 保存历史记录失败（集合可能不存在）:', historyErr.message);
        // 不影响主流程继续执行
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

