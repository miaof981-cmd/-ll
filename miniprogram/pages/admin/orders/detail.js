const orderStatus = require('../../../utils/order-status.js');

Page({
  data: {
    orderId: '',
    order: null,
    userInfo: null,
    activityInfo: null,
    photographerInfo: null,
    historyPhotos: [],  // 添加历史记录
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail(options.id);
    }
  },

  async loadOrderDetail(orderId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      
      // 加载订单信息
      const orderRes = await db.collection('activity_orders').doc(orderId).get();
      const order = orderRes.data;

      // 加载用户信息
      let userInfo = null;
      try {
        const userRes = await db.collection('users')
          .where({ _openid: order._openid })
          .get();
        if (userRes.data && userRes.data.length > 0) {
          userInfo = userRes.data[0];
        }
      } catch (e) {
        console.error('加载用户信息失败:', e);
      }

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

      // 查询历史照片记录
      let historyPhotos = [];
      try {
        console.log('🔍 [订单管理] 查询历史记录，订单ID:', orderId);
        console.log('📊 查询条件: where({ orderId:', orderId, '})');
        
        const historyRes = await db.collection('order_photo_history')
          .where({ orderId: orderId })
          .orderBy('createdAt', 'desc')
          .get();
        
        console.log('📋 [订单管理] 历史记录查询结果:');
        console.log('   - 查询到记录数:', historyRes.data ? historyRes.data.length : 0);
        console.log('   - 完整数据:', historyRes.data);
        
        if (historyRes.data && historyRes.data.length > 0) {
          historyPhotos = historyRes.data;
          console.log('✅ [订单管理] 找到历史记录', historyPhotos.length, '条');
          historyPhotos.forEach((h, idx) => {
            console.log(`   [${idx + 1}] 类型:${h.rejectType}, 时间:${h.rejectedAt}, 原因:${h.rejectReason}`);
          });
        } else {
          console.log('⚠️ 数据库中没有找到历史记录');
          
          // 如果数据库没有历史记录，但订单本身有拒绝信息，尝试从订单字段重建
          const hasRejectInfo = order.rejectCount > 0 || order.adminRejectReason || order.rejectReason;
          
          if (hasRejectInfo) {
            console.log('🔄 尝试从订单字段重建历史记录...');
            console.log('订单拒绝次数:', order.rejectCount);
            console.log('管理员拒绝原因:', order.adminRejectReason);
            console.log('用户拒绝原因:', order.rejectReason);
            
            // 如果有管理员拒绝记录
            if (order.adminRejectReason && order.adminRejectedAt) {
              historyPhotos.push({
                orderId: orderId,
                photos: order.photos || [],
                rejectType: 'admin',
                rejectReason: order.adminRejectReason,
                submittedAt: order.submittedAt || order.adminRejectedAt,
                rejectedAt: order.adminRejectedAt,
                createdAt: order.adminRejectedAt,
                _fromOrderField: true
              });
              console.log('✅ 从订单字段重建了管理员拒绝记录');
            }
            
            // 如果有用户拒绝记录
            if (order.rejectReason && order.rejectedAt) {
              historyPhotos.push({
                orderId: orderId,
                photos: order.photos || [],
                rejectType: 'user',
                rejectReason: order.rejectReason,
                submittedAt: order.submittedAt || order.rejectedAt,
                rejectedAt: order.rejectedAt,
                rejectCount: order.rejectCount,
                createdAt: order.rejectedAt,
                _fromOrderField: true
              });
              console.log('✅ 从订单字段重建了用户拒绝记录');
            }
            
            // 按时间排序（最新的在前）
            historyPhotos.sort((a, b) => {
              const timeA = new Date(a.rejectedAt || a.createdAt).getTime();
              const timeB = new Date(b.rejectedAt || b.createdAt).getTime();
              return timeB - timeA;
            });
            
            console.log('✅ 重建历史记录完成，共', historyPhotos.length, '条');
          }
        }
      } catch (e) {
        console.error('❌ 查询历史记录失败:', e);
      }

      // 添加状态信息
      order.statusText = orderStatus.getStatusText(order.status);
      order.statusColor = orderStatus.getStatusColor(order.status);
      order.statusIcon = orderStatus.getStatusIcon(order.status);
      order.adminActions = orderStatus.getAdminActions(order.status);

      console.log('========================================');
      console.log('=== [订单管理] 页面数据设置 ===');
      console.log('订单信息:', order);
      console.log('订单状态:', order.status);
      console.log('管理员操作:', order.adminActions);
      console.log('历史记录数量:', historyPhotos.length);
      console.log('========================================');

      this.setData({
        order,
        userInfo,
        activityInfo,
        photographerInfo,
        historyPhotos,
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

  // 预览照片
  previewPhoto(e) {
    const { url } = e.currentTarget.dataset;
    const { order } = this.data;
    
    // 收集所有照片URL
    let urls = [];
    if (order.photos && order.photos.length > 0) {
      urls = [...order.photos];
    }
    
    wx.previewImage({
      urls: urls.length > 0 ? urls : [url],
      current: url
    });
  },

  // 联系用户
  contactUser() {
    const { userInfo } = this.data;
    if (userInfo && userInfo.phone) {
      wx.makePhoneCall({
        phoneNumber: userInfo.phone
      });
    } else {
      wx.showToast({
        title: '用户未留电话',
        icon: 'none'
      });
    }
  },

  // 执行订单操作
  async handleAction(e) {
    const { action } = e.currentTarget.dataset;
    
    console.log('========================================');
    console.log('🔘 [按钮点击] handleAction 被触发');
    console.log('   操作类型:', action);
    console.log('   事件对象:', e);
    console.log('========================================');
    
    switch (action) {
      case 'approve':
        console.log('✅ 执行审核通过操作...');
        await this.approveWork();
        break;
      case 'reject_review':
        await this.rejectWork();
        break;
      case 'start':
        await this.startShooting();
        break;
      case 'complete':
        await this.completeOrder();
        break;
      case 'refund':
        await this.refundOrder();
        break;
      case 'reject_after_sale':
        await this.rejectAfterSale();
        break;
      case 'cancel':
        await this.cancelOrder();
        break;
    }
  },

  // 审核通过
  async approveWork() {
    console.log('========================================');
    console.log('🔍 [订单管理-审核通过] 开始执行...');
    console.log('   订单ID:', this.data.orderId);
    console.log('   当前状态:', this.data.order.status);
    console.log('========================================');

    const res = await wx.showModal({
      title: '审核通过',
      content: '确认摄影师作品已达标？审核通过后将展示给用户确认。'
    });

    if (!res.confirm) {
      console.log('❌ 用户取消审核');
      return;
    }

    console.log('✅ 用户确认审核，开始更新订单状态...');
    await this.updateOrderStatus(orderStatus.ORDER_STATUS.PENDING_CONFIRM);
  },

  // 审核拒绝
  async rejectWork() {
    const that = this;
    
    const modalRes = await wx.showModal({
      title: '审核拒绝',
      content: '',
      editable: true,
      placeholderText: '例如：光线不足、构图不佳、画面模糊等',
      confirmText: '确认拒绝',
      confirmColor: '#ff4d4f'
    });

    if (!modalRes.confirm) return;

    const rejectReason = (modalRes.content || '').trim();
    
    // 验证拒绝原因
    if (!rejectReason) {
      wx.showToast({
        title: '请输入拒绝原因',
        icon: 'none'
      });
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
    
    wx.showLoading({ title: '处理中...' });
    
    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();
      
      // 保存历史记录
      try {
        console.log('💾 [订单管理-拒绝] 准备保存历史记录...');
        console.log('   - orderId:', this.data.orderId);
        console.log('   - photos数量:', (this.data.order.photos || []).length);
        console.log('   - rejectType: admin');
        console.log('   - rejectReason:', rejectReason);
        
        const addRes = await db.collection('order_photo_history').add({
          data: {
            orderId: this.data.orderId,
            photos: this.data.order.photos || [],
            rejectType: 'admin',
            rejectReason: rejectReason,
            submittedAt: this.data.order.submittedAt || now,
            rejectedAt: now,
            createdAt: now
          }
        });
        console.log('✅ [订单管理-拒绝] 历史记录保存成功！新记录ID:', addRes._id);
      } catch (historyErr) {
        console.warn('⚠️ [订单管理-拒绝] 保存历史记录失败（集合可能不存在）:', historyErr.message);
        console.error('完整错误:', historyErr);
        // 不影响主流程继续执行
      }
      
      // 注意：管理员拒绝不消耗用户的修改机会，不递增 rejectCount
      await db.collection('activity_orders').doc(this.data.orderId).update({
        data: {
          status: orderStatus.ORDER_STATUS.IN_PROGRESS,
          adminRejectReason: rejectReason,
          adminRejectedAt: now,
          updatedAt: now
          // 不修改 rejectCount，只有用户拒绝才消耗修改机会
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '已拒绝，通知摄影师重拍',
        icon: 'success',
        duration: 2000
      });

      // 重新加载订单详情
      setTimeout(() => {
        this.loadOrderDetail(this.data.orderId);
      }, 500);
    } catch (e) {
      console.error('操作失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 开始拍摄
  async startShooting() {
    wx.showModal({
      title: '确认操作',
      content: '确定开始拍摄吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
    });
  },

  // 标记完成
  async completeOrder() {
    wx.showModal({
      title: '确认操作',
      content: '确定标记订单为已完成吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.COMPLETED);
        }
      }
    });
  },

  // 退款
  async refundOrder() {
    wx.showModal({
      title: '确认退款',
      content: '确定要退款吗？此操作不可撤销',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.REFUNDED);
        }
      }
    });
  },

  // 拒绝售后
  async rejectAfterSale() {
    wx.showModal({
      title: '确认操作',
      content: '确定拒绝售后申请吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.updateOrderStatus(orderStatus.ORDER_STATUS.IN_PROGRESS);
        }
      }
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

  // 更新订单状态
  async updateOrderStatus(newStatus) {
    console.log('========================================');
    console.log('🔍 [更新订单状态] 开始执行...');
    console.log('   订单ID:', this.data.orderId);
    console.log('   当前状态:', this.data.order.status);
    console.log('   目标状态:', newStatus);
    console.log('========================================');

    wx.showLoading({ title: '处理中...', mask: true });

    try {
      const db = wx.cloud.database();
      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      // 如果是审核通过，添加审核时间
      if (newStatus === orderStatus.ORDER_STATUS.PENDING_CONFIRM) {
        updateData.reviewedAt = new Date().toISOString();
      }

      console.log('📝 准备更新数据:', updateData);

      const updateResult = await db.collection('activity_orders')
        .doc(this.data.orderId)
        .update({
          data: updateData
        });

      console.log('✅ 数据库更新结果:', updateResult);
      console.log('   更新记录数:', updateResult.stats.updated);

      if (updateResult.stats.updated === 0) {
        console.error('⚠️ 警告：没有记录被更新！');
        wx.hideLoading();
        wx.showModal({
          title: '更新失败',
          content: '订单状态未更新，请查看控制台。',
          showCancel: false
        });
        return;
      }

      // 验证更新是否成功
      console.log('🔍 验证更新结果...');
      const verifyResult = await db.collection('activity_orders')
        .doc(this.data.orderId)
        .get();
      
      console.log('📊 验证结果 - 订单状态:', verifyResult.data.status);
      
      if (verifyResult.data.status !== newStatus) {
        console.error('❌ 验证失败：状态未正确更新！');
        console.error('   期望状态:', newStatus);
        console.error('   实际状态:', verifyResult.data.status);
        
        wx.hideLoading();
        wx.showModal({
          title: '状态异常',
          content: `订单状态未正确更新。\n期望：${newStatus}\n实际：${verifyResult.data.status}`,
          showCancel: false
        });
        return;
      }

      console.log('========================================');
      console.log('✅ [更新订单状态] 执行成功！');
      console.log('========================================');

      wx.hideLoading();
      wx.showToast({
        title: '操作成功',
        icon: 'success',
        duration: 2000
      });

      // 重新加载订单详情
      setTimeout(() => {
        this.loadOrderDetail(this.data.orderId);
      }, 500);
    } catch (e) {
      console.error('========================================');
      console.error('❌ [更新订单状态] 执行失败！');
      console.error('错误信息:', e);
      console.error('错误代码:', e.errCode);
      console.error('错误消息:', e.errMsg);
      console.error('========================================');

      wx.hideLoading();
      wx.showModal({
        title: '操作失败',
        content: `更新失败：${e.errMsg || e.message}\n错误代码：${e.errCode || '未知'}`,
        showCancel: false
      });
    }
  }
});

