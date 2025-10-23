const orderStatus = require('../../../utils/order-status.js');
const avatarManager = require('../../../utils/avatar-manager.js');
const imageUrlManager = require('../../../utils/image-url-manager.js');

Page({
  data: {
    orders: [],
    filteredOrders: [],
    activeStatus: 'all',
    statusFilters: [
      { id: 'all', name: '全部' },
      { id: orderStatus.ORDER_STATUS.PENDING_PAYMENT, name: '待支付' },
      { id: orderStatus.ORDER_STATUS.IN_PROGRESS, name: '进行中' },
      { id: orderStatus.ORDER_STATUS.PENDING_REVIEW, name: '待审核' },
      { id: orderStatus.ORDER_STATUS.PENDING_CONFIRM, name: '待确认' },
      { id: orderStatus.ORDER_STATUS.COMPLETED, name: '已完成' }
    ],
    loading: true,
    userOpenId: ''
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

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      
      // 获取当前用户的 openid
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedLogin'
      });
      
      console.log('登录结果:', result);
      
      const userOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;
      
      if (!userOpenId) {
        throw new Error('无法获取用户OpenID');
      }
      
      console.log('用户OpenID:', userOpenId);
      
      // 查询当前用户的订单
      // 使用 userId 字段查询（订单归属用户），兼容旧数据使用 _openid
      const res = await db.collection('activity_orders')
        .where(db.command.or([
          { userId: userOpenId },      // 新字段：订单归属用户
          { _openid: userOpenId }      // 旧字段：兼容历史数据
        ]))
        .orderBy('createdAt', 'desc')
        .get();

      const TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

      // 🔥 性能优化：一次性批量查询所有用户和摄影师信息
      console.log('📊 [性能优化] 开始批量查询用户信息');
      
      // 1. 收集所有唯一的OpenID
      const allUserOpenIds = new Set();
      const allPhotographerIds = new Set();
      
      res.data.forEach(order => {
        const userId = order.userId || order._openid;
        if (userId) allUserOpenIds.add(userId);
        if (order.photographerId) allPhotographerIds.add(order.photographerId);
      });

      // 2. 批量查询用户信息（头像+昵称）
      const userInfoMap = new Map();
      if (allUserOpenIds.size > 0) {
        try {
          const usersRes = await db.collection('users')
            .where({
              _openid: db.command.in([...allUserOpenIds])
            })
            .field({ _openid: true, avatarUrl: true, nickName: true })
            .get();
          
          usersRes.data.forEach(user => {
            userInfoMap.set(user._openid, {
              nickName: user.nickName || '微信用户',
              avatarUrl: user.avatarUrl
            });
          });
          console.log('✅ [批量查询] 用户信息:', userInfoMap.size, '个');
        } catch (e) {
          console.error('批量查询用户失败:', e);
        }
      }

      // 3. 批量查询摄影师信息
      const photographerInfoMap = new Map();
      if (allPhotographerIds.size > 0) {
        try {
          const photographersRes = await db.collection('photographers')
            .where({
              _id: db.command.in([...allPhotographerIds])
            })
            .get();
          
          photographersRes.data.forEach(photographer => {
            photographerInfoMap.set(photographer._id, photographer);
          });
          console.log('✅ [批量查询] 摄影师信息:', photographerInfoMap.size, '个');
        } catch (e) {
          console.error('批量查询摄影师失败:', e);
        }
      }

      // 4. 预加载所有头像到缓存（一次性）
      const allAvatarOpenIds = new Set([...allUserOpenIds]);
      photographerInfoMap.forEach(p => {
        if (p._openid) allAvatarOpenIds.add(p._openid);
      });
      
      if (allAvatarOpenIds.size > 0) {
        await avatarManager.preloadAvatars([...allAvatarOpenIds]);
      }

      // 加载活动信息（先不转换图片）
      const orders = await Promise.all(res.data.map(async (order) => {
        // 加载活动信息
        try {
          const activityRes = await db.collection('activities')
            .doc(order.activityId)
            .get();
          
          if (activityRes.data) {
            order.activityInfo = activityRes.data;
          }
        } catch (e) {
          console.error('加载活动信息失败:', e);
        }

        // 🔥 从批量查询结果中获取摄影师信息（无需单独查询）
        if (order.photographerId) {
          const photographer = photographerInfoMap.get(order.photographerId);
          if (photographer) {
            order.photographerInfo = photographer;
          } else if (order.photographerName) {
            // 兼容：使用订单中已有的摄影师信息
            order.photographerInfo = {
              name: order.photographerName,
              _id: order.photographerId
            };
          }
        }

        // 🔥 从批量查询结果中获取用户昵称（无需单独查询）
        const userId = order.userId || order._openid;
        if (userId) {
          const userInfo = userInfoMap.get(userId);
          if (userInfo) {
            order.userNickName = userInfo.nickName;
            // 头像已在缓存中，组件会自动使用
          } else {
            order.userNickName = order.userNickName || '用户';
          }
        }

        // 兼容价格字段
        order.statusText = orderStatus.getStatusText(order.status);
        order.statusColor = orderStatus.getStatusColor(order.status);
        order.statusIcon = orderStatus.getStatusIcon(order.status);
        order.userActions = orderStatus.getUserActions(order.status);
        
        // 添加价格字段映射（兼容不同字段名）
        if (!order.totalPrice && order.price !== undefined) {
          order.totalPrice = order.price;
        }

        // 显示北京时间
        order.createdAtText = this.formatBeijing(order.createdAt);
        order.updatedAtText = this.formatBeijing(order.updatedAt || order.createdAt);

        // 列表级自动过期取消（仅待支付）
        try {
          if (order.status === orderStatus.ORDER_STATUS.PENDING_PAYMENT && order.createdAt) {
            const created = new Date(order.createdAt).getTime();
            if (!isNaN(created)) {
              const expireAt = created + TIMEOUT_MS;
              if (Date.now() >= expireAt) {
                const nowISO = new Date().toISOString();
                await db.collection('activity_orders').doc(order._id).update({
                  data: {
                    status: 'cancelled',
                    cancelReason: '支付超时自动关闭',
                    cancelledAt: nowISO,
                    updatedAt: nowISO
                  }
                });
                // 本地对象同步
                order.status = 'cancelled';
                order.statusText = orderStatus.getStatusText(order.status);
                order.statusColor = orderStatus.getStatusColor(order.status);
                order.statusIcon = orderStatus.getStatusIcon(order.status);
                order.userActions = orderStatus.getUserActions(order.status);
              }
            }
          }
        } catch (e) {
          console.warn('自动关闭超时订单失败(忽略继续):', e?.message || e);
        }

        return order;
      }));

      // 显示最终统计
      console.log('✅ [完成] 加载', orders.length, '个订单');

      // 🔥 批量转换所有订单中的图片 URL（带2小时缓存）
      console.log('📸 [图片转换] 开始收集所有图片 URL...');
      const allImageUrls = [];
      
      // 收集所有需要转换的 cloud:// URL
      orders.forEach(order => {
        // 1. 活动封面（activityInfo 中）
        if (order.activityInfo?.coverImage) {
          allImageUrls.push(order.activityInfo.coverImage);
        }
        
        // 2. 活动封面（订单快照中）
        if (order.activityCover) {
          allImageUrls.push(order.activityCover);
        }
        
        // 3. 孩子照片
        if (order.childPhoto) {
          allImageUrls.push(order.childPhoto);
        }
        
        // 4. 作品照片数组
        if (order.photos && Array.isArray(order.photos)) {
          order.photos.forEach(url => {
            if (url) allImageUrls.push(url);
          });
        }
      });

      console.log('📸 [图片转换] 收集到', allImageUrls.length, '个图片URL');

      // 批量转换（自动使用缓存，2小时有效期）
      if (allImageUrls.length > 0) {
        try {
          const urlMap = await imageUrlManager.convertBatch(allImageUrls);
          console.log('✅ [图片转换] 映射完成，共', Object.keys(urlMap).length, '个');
          
          // 替换订单中的图片 URL（包括转换失败的默认图）
          orders.forEach(order => {
            // 替换活动封面
            if (order.activityInfo?.coverImage && urlMap.hasOwnProperty(order.activityInfo.coverImage)) {
              order.activityInfo.coverImage = urlMap[order.activityInfo.coverImage];
            }
            
            // 替换活动封面快照
            if (order.activityCover && urlMap.hasOwnProperty(order.activityCover)) {
              order.activityCover = urlMap[order.activityCover];
            }
            
            // 替换孩子照片
            if (order.childPhoto && urlMap.hasOwnProperty(order.childPhoto)) {
              order.childPhoto = urlMap[order.childPhoto];
            }
            
            // 替换作品照片（转换失败的会显示默认图）
            if (order.photos && Array.isArray(order.photos)) {
              order.photos = order.photos.map(url => 
                urlMap.hasOwnProperty(url) ? urlMap[url] : url
              );
            }
          });
          
          console.log('✅ [图片转换] 所有订单图片URL已更新');
        } catch (err) {
          console.error('❌ [图片转换] 批量转换失败:', err);
        }
      } else {
        console.log('ℹ️ [图片转换] 无需转换的图片');
      }

      this.setData({
        orders,
        filteredOrders: orders,
        userOpenId,
        loading: false
      });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 切换状态筛选
  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    // 将筛选器与状态集合严格关联：
    // 进行中 = 待上传/待拍摄/进行中；其余一一对应
    const FILTER_STATUS_MAP = {
      all: null,
      [orderStatus.ORDER_STATUS.PENDING_PAYMENT]: [orderStatus.ORDER_STATUS.PENDING_PAYMENT],
      [orderStatus.ORDER_STATUS.IN_PROGRESS]: [
        orderStatus.ORDER_STATUS.PAID,
        orderStatus.ORDER_STATUS.PENDING_UPLOAD,
        orderStatus.ORDER_STATUS.WAITING_SHOOT,
        orderStatus.ORDER_STATUS.IN_PROGRESS
      ],
      [orderStatus.ORDER_STATUS.PENDING_REVIEW]: [orderStatus.ORDER_STATUS.PENDING_REVIEW],
      [orderStatus.ORDER_STATUS.PENDING_CONFIRM]: [orderStatus.ORDER_STATUS.PENDING_CONFIRM],
      [orderStatus.ORDER_STATUS.COMPLETED]: [orderStatus.ORDER_STATUS.COMPLETED]
    };

    const targetStatuses = FILTER_STATUS_MAP[status];
    const filteredOrders = !targetStatuses
      ? this.data.orders
      : this.data.orders.filter(order => targetStatuses.includes(order.status));

    this.setData({
      activeStatus: status,
      filteredOrders
    });
  },

  // 查看订单详情
  viewOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/user/orders/detail?id=${id}`
    });
  },

  // 执行订单操作
  async handleAction(e) {
    const { id, action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'pay':
        await this.payOrder(id);
        break;
      case 'cancel':
        await this.cancelOrder(id);
        break;
      case 'contact':
        await this.contactPhotographer(id);
        break;
      case 'after_sale':
        await this.applyAfterSale(id);
        break;
      case 'evaluate':
        await this.evaluateOrder(id);
        break;
    }
  },

  // 支付订单（继续支付）
  async payOrder(orderId) {
    const order = this.data.orders.find(o => o._id === orderId);
    
    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '加载中...', mask: true });
    
    try {
      console.log('💳 继续支付订单:', order.orderNo);
      
      // 调用统一下单云函数
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedOrder',
        data: {
          orderNo: order.orderNo,
          totalFee: Math.round(order.totalPrice * 100), // 转换为分
          description: '次元学校-证件照拍摄'
        }
      });

      console.log('📦 统一下单结果:', result);

      if (!result.success) {
        throw new Error(result.errMsg || '统一下单失败');
      }

      // 云函数返回结构：{ success: true, payment: {...} }
      const paymentResult = result.payment;
      
      if (!paymentResult || !paymentResult.timeStamp) {
        console.error('❌ 支付参数缺失:', result);
        throw new Error('支付参数格式错误');
      }

      console.log('💳 支付参数:', paymentResult);
      
      wx.hideLoading();
      
      // 调起微信支付
      await wx.requestPayment({
        timeStamp: paymentResult.timeStamp,
        nonceStr: paymentResult.nonceStr,
        package: paymentResult.package,
        signType: paymentResult.signType,
        paySign: paymentResult.paySign
      });

      console.log('✅ 支付成功');

      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });

      // 刷新订单列表
      setTimeout(() => {
        this.loadOrders();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      
      console.error('❌ 支付失败:', err);
      
      if (err.errMsg === 'requestPayment:fail cancel') {
        wx.showToast({
          title: '支付已取消',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '支付失败',
          icon: 'none'
        });
      }
    }
  },

  // 取消订单
  async cancelOrder(orderId) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.CANCELLED);
        }
      }
    });
  },

  // 联系摄影师
  async contactPhotographer(orderId) {
    const order = this.data.orders.find(o => o._id === orderId);
    if (order && order.photographerInfo && order.photographerInfo.phone) {
      wx.makePhoneCall({
        phoneNumber: order.photographerInfo.phone
      });
    } else {
      wx.showToast({
        title: '摄影师未留联系方式',
        icon: 'none'
      });
    }
  },

  // 申请售后
  async applyAfterSale(orderId) {
    wx.showModal({
      title: '申请售后',
      content: '请描述您遇到的问题',
      editable: true,
      placeholderText: '请输入售后原因',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderId, orderStatus.ORDER_STATUS.AFTER_SALE, res.content);
        }
      }
    });
  },

  // 评价订单
  async evaluateOrder(orderId) {
    wx.navigateTo({
      url: `/pages/user/orders/evaluate?id=${orderId}`
    });
  },

  // 确认订单（从列表快速确认）
  async confirmOrder(e) {
    const { id } = e.currentTarget.dataset;
    
    console.log('🎯 [订单列表] 确认订单，ID:', id);
    
    const res = await wx.showModal({
      title: '确认收货',
      content: '确认对摄影师的作品满意吗？确认后订单将完成，并自动创建学生档案。',
      confirmText: '确认满意',
      cancelText: '查看详情'
    });

    if (res.cancel) {
      // 跳转到详情页查看
      console.log('📋 用户选择查看详情');
      wx.navigateTo({
        url: `/pages/user/orders/detail?id=${id}`
      });
      return;
    }

    if (res.confirm) {
      console.log('✅ 用户确认，开始处理...');
      wx.showLoading({ title: '处理中...' });
      
      try {
        // ⚠️ 重要：直接跳转到详情页，让详情页的 confirmWork() 处理
        // 因为详情页已经有完整的档案创建逻辑
        console.log('🔄 跳转到详情页处理确认逻辑...');
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/user/orders/detail?id=${id}&autoConfirm=true`
        });
      } catch (e) {
        console.error('❌ 确认失败:', e);
        wx.hideLoading();
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }
  },

  // 拒绝订单（从列表快速拒绝）
  async rejectOrder(e) {
    const { id } = e.currentTarget.dataset;
    
    // 跳转到详情页进行拒绝（需要填写原因）
    wx.navigateTo({
      url: `/pages/user/orders/detail?id=${id}`
    });
  },

  // 获取操作文本
  getActionText(action) {
    const textMap = {
      'pay': '立即支付',
      'cancel': '取消订单',
      'after_sale': '申请售后',
      'evaluate': '去评价'
    };
    return textMap[action] || action;
  },

  // 更新订单状态
  async updateOrderStatus(orderId, newStatus, remark = '') {
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

      await db.collection('activity_orders').doc(orderId).update({
        data: updateData
      });

      wx.hideLoading();
      wx.showToast({
        title: '操作成功',
        icon: 'success'
      });

      // 重新加载订单列表
      this.loadOrders();
    } catch (e) {
      console.error('更新订单状态失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  /**
   * 图片加载失败处理（静默处理，避免控制台刷屏）
   */
  onImageError(e) {
    // 图片加载失败时，会自动隐藏，不需要额外处理
    // 静默失败，不输出日志，避免控制台刷屏
    // 如果需要调试，可以取消下面的注释：
    // console.warn('⚠️ 图片加载失败:', e.detail);
  }
});

