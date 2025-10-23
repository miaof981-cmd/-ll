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
    userOpenId: '',
    // 分页配置
    pageSize: 20, // 每页加载订单数
    currentPage: 1,
    hasMore: true,
    loadingMore: false
  },

  // 节流标记
  _loadingOrders: false,
  _lastLoadTime: 0,
  _throttleDelay: 500, // 节流延迟（毫秒）
  _lastReachBottomTime: 0, // 触底加载节流
  _reachBottomThrottle: 1000, // 触底节流延迟（1秒）
  _deletedActivityIds: new Set(), // 已知不存在的活动ID缓存

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
    this.loadOrders(true);
  },

  onShow() {
    // 避免短时间内重复加载（从其他页面返回时）
    const now = Date.now();
    if (now - this._lastLoadTime < 5000) {
      console.log('⏸️ 距离上次加载不足5秒，跳过重复加载');
      return;
    }
    this.loadOrders(true);
  },

  /**
   * 加载订单（支持节流和分页）
   * @param {boolean} reset - 是否重置为首页
   */
  async loadOrders(reset = false) {
    // 节流控制：防止短时间内重复触发
    const now = Date.now();
    if (this._loadingOrders) {
      console.log('⏸️ 正在加载中，跳过重复请求');
      return;
    }
    
    if (now - this._lastLoadTime < this._throttleDelay) {
      console.log('⏸️ 节流中，请稍后');
      return;
    }

    this._loadingOrders = true;
    this._lastLoadTime = now;

    // 性能计时开始
    const perfStart = Date.now();

    if (reset) {
      this.setData({ loading: true, currentPage: 1, hasMore: true });
    } else {
      this.setData({ loadingMore: true });
    }

    try {
      const db = wx.cloud.database();
      
      // 获取当前用户的 openid
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedLogin'
      });
      
      const userOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;
      
      if (!userOpenId) {
        throw new Error('无法获取用户OpenID');
      }
      
      // 分页参数
      const { pageSize, currentPage } = this.data;
      const skip = (currentPage - 1) * pageSize;
      
      console.log(`📄 [分页加载] 第${currentPage}页，每页${pageSize}条，跳过${skip}条`);
      
      // 查询当前用户的订单（支持分页）
      // 使用 userId 字段查询（订单归属用户），兼容旧数据使用 _openid
      const res = await db.collection('activity_orders')
        .where(db.command.or([
          { userId: userOpenId },      // 新字段：订单归属用户
          { _openid: userOpenId }      // 旧字段：兼容历史数据
        ]))
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();

      // 判断是否还有更多数据
      const hasMore = res.data.length === pageSize;

      const TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

      // 🔥 性能优化：批量查询用户和摄影师信息
      const allUserOpenIds = new Set();
      const allPhotographerIds = new Set();
      
      res.data.forEach(order => {
        const userId = order.userId || order._openid;
        if (userId) allUserOpenIds.add(userId);
        if (order.photographerId) allPhotographerIds.add(order.photographerId);
      });

      // 批量查询用户信息（头像+昵称）
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
        } catch (e) {
          console.error('❌ 批量查询用户失败:', e);
        }
      }

      // 批量查询摄影师信息
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
        } catch (e) {
          console.error('❌ 批量查询摄影师失败:', e);
        }
      }

      // 预加载所有头像到缓存
      const allAvatarOpenIds = new Set([...allUserOpenIds]);
      photographerInfoMap.forEach(p => {
        if (p._openid) allAvatarOpenIds.add(p._openid);
      });
      
      if (allAvatarOpenIds.size > 0) {
        await avatarManager.preloadAvatars([...allAvatarOpenIds]);
      }

      // 🚀 性能优化：批量加载活动信息（减少数据库查询95%）
      // 1. 收集所有唯一的活动ID（排除已知不存在的）
      const activityIds = new Set();
      res.data.forEach(order => {
        if (order.activityId && !this._deletedActivityIds.has(order.activityId)) {
          activityIds.add(order.activityId);
        }
      });

      // 2. 一次性批量查询所有活动（20次查询 → 1次查询）
      const activityMap = new Map();
      if (activityIds.size > 0) {
        try {
          console.log(`📊 [活动批量查询] 查询 ${activityIds.size} 个活动`);
          const activitiesRes = await db.collection('activities')
            .where({
              _id: db.command.in([...activityIds])
            })
            .get();
          
          activitiesRes.data.forEach(activity => {
            activityMap.set(activity._id, activity);
          });
          
          console.log(`✅ [活动批量查询] 成功加载 ${activityMap.size} 个活动`);
        } catch (e) {
          console.error('❌ [活动批量查询] 失败:', e);
        }
      }

      // 3. 处理订单（同步部分 + 异步超时检查）
      const orders = await Promise.all(res.data.map(async (order) => {
        // 从映射表中获取活动信息
        if (activityMap.has(order.activityId)) {
          order.activityInfo = activityMap.get(order.activityId);
        } else if (this._deletedActivityIds.has(order.activityId)) {
          // 已知不存在，静默使用快照
          order.activityInfo = {
            name: order.activityName || '已归档活动',
            coverImage: order.activityCover || '',
            price: order.price || order.totalPrice || 0
          };
        } else {
          // 未查询到且非已知不存在，记录并使用快照
          this._deletedActivityIds.add(order.activityId);
          
          // 判断是测试数据还是已删除活动
          const isTestData = order.activityId && (
            order.activityId.includes('test') || 
            order.activityId.length < 20
          );
          
          if (isTestData) {
            console.warn(`⚠️ [测试订单] 检测到测试活动引用 "${order.activityId.substring(0, 30)}"，建议清理测试数据`);
          } else {
            console.warn(`⚠️ [活动缺失] 活动已下架或删除，ID: ${order.activityId.substring(0, 32)}...，已使用订单快照展示`);
          }
          
          order.activityInfo = {
            name: order.activityName || (isTestData ? '测试活动' : '已归档活动'),
            coverImage: order.activityCover || '',
            price: order.price || order.totalPrice || 0
          };
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

      // 显示加载进度
      if (orders.length > 0) {
        console.log(`✅ [加载完成] 第${currentPage}页，本次加载 ${orders.length} 条订单`);
      } else {
        console.log('ℹ️ [加载完成] 无更多订单');
      }

      // 🚀 性能优化：并发批量转换图片 URL（提升70%）
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

      // 并发批量转换（每批10张，多批并行）
      if (allImageUrls.length > 0) {
        try {
          const urlMap = await imageUrlManager.convertBatch(allImageUrls);
          
          const stats = {
            total: allImageUrls.length,
            converted: Object.keys(urlMap).length,
            cached: 0,
            failed: 0
          };
          
          // 统计缓存命中和失败
          allImageUrls.forEach(url => {
            if (!urlMap[url]) {
              stats.failed++;
            }
          });
          
          console.log(`✅ [图片转换] 总计 ${stats.total} 张，成功 ${stats.converted} 张，失败 ${stats.failed} 张`);
          
          // 替换订单中的图片 URL
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
            
            // 替换作品照片
            if (order.photos && Array.isArray(order.photos)) {
              order.photos = order.photos.map(url => 
                urlMap.hasOwnProperty(url) ? urlMap[url] : url
              );
            }
          });
          
        } catch (err) {
          console.error('❌ [图片转换] 批量转换失败:', err);
        }
      }

      // 分页数据合并或替换
      const existingOrders = reset ? [] : this.data.orders;
      const newOrders = [...existingOrders, ...orders];

      this.setData({
        orders: newOrders,
        filteredOrders: newOrders,
        userOpenId,
        loading: false,
        loadingMore: false,
        hasMore,
        currentPage: reset ? 1 : currentPage
      }, () => {
        // setData 回调：确保数据已更新到视图
        wx.nextTick(() => {
          // 性能计时结束
          const perfEnd = Date.now();
          const perfTime = perfEnd - perfStart;
          
          // 等待 DOM 渲染完成后执行
          const pageNum = reset ? 1 : currentPage;
          console.log(`✅ [分页加载完成] 第 ${pageNum} 页，总计 ${newOrders.length} 条订单`);
          console.log(`📊 [订单状态] ${hasMore ? '可加载更多' : '已全部加载'}`);
          console.log(`⏱️ [性能统计] 总耗时: ${perfTime}ms`);
        });
      });
    } catch (e) {
      console.error('❌ 加载订单失败:', e);
      this.setData({ loading: false, loadingMore: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this._loadingOrders = false; // 解除节流标记
    }
  },

  /**
   * 加载更多订单（分页）
   */
  loadMoreOrders() {
    // 多重检查，确保加载安全
    if (!this.data.hasMore) {
      console.log('ℹ️ [懒加载] 已无更多数据');
      return;
    }
    
    if (this.data.loadingMore || this._loadingOrders) {
      console.log('⏸️ [懒加载] 正在加载中，跳过');
      return;
    }
    
    console.log(`📄 [懒加载] 准备加载第 ${this.data.currentPage + 1} 页`);
    
    const nextPage = this.data.currentPage + 1;
    this.setData({ currentPage: nextPage }, () => {
      // 在 setData 回调中执行加载，确保状态已更新
      wx.nextTick(() => {
        this.loadOrders(false);
      });
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOrders(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 触底加载更多（带节流保护）
   */
  onReachBottom() {
    const now = Date.now();
    
    // 触底事件节流：1秒内只触发一次
    if (now - this._lastReachBottomTime < this._reachBottomThrottle) {
      console.log('⏸️ [触底节流] 触发过于频繁，跳过');
      return;
    }
    
    this._lastReachBottomTime = now;
    
    console.log('📍 [触底事件] 检测到页面触底');
    
    // 延迟执行，避免与渲染冲突
    setTimeout(() => {
      this.loadMoreOrders();
    }, 100);
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

