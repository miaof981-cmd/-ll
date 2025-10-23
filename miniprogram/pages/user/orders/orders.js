const orderStatus = require('../../../utils/order-status.js');

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

      // 加载活动信息并处理超时取消
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

        // 加载摄影师信息
        if (order.photographerId) {
          try {
            const photographerRes = await db.collection('photographers')
              .doc(order.photographerId)
              .get();
            
            if (photographerRes.data) {
              order.photographerInfo = photographerRes.data;
              
              // 🔥 关键修复：从 users 集合读取摄影师头像（头像跟着 OpenID 走）
              if (photographerRes.data._openid) {
                console.log('📸 查询摄影师的 users 头像, OpenID:', photographerRes.data._openid);
                try {
                  const photographerUserRes = await db.collection('users')
                    .where({ _openid: photographerRes.data._openid })
                    .get();
                  
                  if (photographerUserRes.data && photographerUserRes.data.length > 0) {
                    const photographerUser = photographerUserRes.data[0];
                    let photographerAvatar = photographerUser.avatarUrl || photographerRes.data.avatar;
                    console.log('📸 摄影师原始头像:', photographerAvatar);
                    
                    // 如果是云存储URL，转换为临时URL
                    if (photographerAvatar && photographerAvatar.startsWith('cloud://')) {
                      try {
                        const tempRes = await wx.cloud.getTempFileURL({
                          fileList: [photographerAvatar]
                        });
                        if (tempRes.fileList && tempRes.fileList.length > 0) {
                          photographerAvatar = tempRes.fileList[0].tempFileURL;
                          console.log('📸 摄影师云存储URL已转换:', photographerAvatar);
                        }
                      } catch (err) {
                        console.warn('转换摄影师云存储URL失败:', err);
                      }
                    }
                    
                    // 覆盖摄影师头像（使用 users 集合的统一头像）
                    order.photographerInfo.avatar = photographerAvatar;
                    console.log('✅ 摄影师最终头像:', order.photographerInfo.avatar);
                  } else {
                    console.warn('⚠️ 未找到摄影师的 users 记录');
                  }
                } catch (err) {
                  console.warn('查询摄影师 users 头像失败:', err);
                }
              }
            }
          } catch (e) {
            console.warn('摄影师信息加载失败，使用订单中的信息:', order.photographerId);
            // 使用订单中已有的摄影师信息
            if (order.photographerName) {
              order.photographerInfo = {
                name: order.photographerName,
                _id: order.photographerId
              };
            }
          }
        }

        // 加载下单用户信息（如果订单中没有保存）
        if (!order.userAvatarUrl || !order.userNickName) {
          try {
            const userId = order.userId || order._openid;
            console.log('订单', order._id, '缺少用户信息，尝试查询 userId:', userId);
            
            if (userId) {
              const userRes = await db.collection('users')
                .where({ _openid: userId })
                .get();
              
              console.log('========== 用户信息查询结果 ==========');
              console.log('查询到的用户数量:', userRes.data.length);
              if (userRes.data.length > 0) {
                console.log('用户完整数据:', JSON.stringify(userRes.data[0], null, 2));
              }
              
              if (userRes.data && userRes.data.length > 0) {
                const user = userRes.data[0];
                console.log('用户原始 nickName:', user.nickName);
                console.log('用户原始 avatarUrl:', user.avatarUrl);
                
                order.userNickName = user.nickName || '微信用户';
                
                // 处理云存储URL
                let avatarUrl = user.avatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
                console.log('处理前的 avatarUrl:', avatarUrl);
                
                if (avatarUrl.startsWith('cloud://')) {
                  try {
                    // 转换云存储URL为临时URL
                    const tempRes = await wx.cloud.getTempFileURL({
                      fileList: [avatarUrl]
                    });
                    console.log('云存储转换结果:', tempRes);
                    if (tempRes.fileList && tempRes.fileList.length > 0) {
                      avatarUrl = tempRes.fileList[0].tempFileURL || avatarUrl;
                      console.log('云存储URL已转换:', avatarUrl);
                    }
                  } catch (err) {
                    console.error('转换云存储URL失败:', err);
                  }
                }
                order.userAvatarUrl = avatarUrl;
                console.log('最终设置的用户信息:');
                console.log('  nickName:', order.userNickName);
                console.log('  avatarUrl:', order.userAvatarUrl);
                console.log('=====================================');
              } else {
                console.log('未找到用户，使用默认值');
                // 如果查不到用户，使用默认值
                order.userNickName = order.userNickName || '用户';
                order.userAvatarUrl = order.userAvatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
              }
            } else {
              console.log('订单没有 userId，使用默认值');
              // 没有用户ID，使用默认值
              order.userNickName = '用户';
              order.userAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
            }
          } catch (e) {
            console.warn('加载用户信息失败:', e);
            order.userNickName = order.userNickName || '用户';
            order.userAvatarUrl = order.userAvatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
          }
        } else {
          console.log('订单', order._id, '已有用户信息:', order.userNickName, order.userAvatarUrl);
          
          // 如果已有头像URL是云存储格式，也需要转换
          if (order.userAvatarUrl && order.userAvatarUrl.startsWith('cloud://')) {
            try {
              const tempRes = await wx.cloud.getTempFileURL({
                fileList: [order.userAvatarUrl]
              });
              if (tempRes.fileList && tempRes.fileList.length > 0) {
                order.userAvatarUrl = tempRes.fileList[0].tempFileURL;
                console.log('已有云存储URL已转换:', order.userAvatarUrl);
              }
            } catch (err) {
              console.warn('转换已有云存储URL失败:', err);
            }
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
  }
});

