// pages/photographer/tasks.js
Page({
  data: {
    photographerInfo: null,
    orders: [],
    stats: {
      toUpload: 0,          // 待上传（进行中，无照片）
      pendingReview: 0,     // 待审核（已提交，等管理员审核）
      rejected: 0,          // 审核驳回（需要修改）
      pendingConfirm: 0,    // 待用户确认
      completed: 0,         // 已完成
      total: 0
    },
    statusFilter: 'all',  // all, to_upload, pending_review, rejected, pending_confirm, completed
    loading: false
  },

  onLoad() {
    this.loadPhotographerInfo();
  },

  onShow() {
    // 每次显示页面时刷新订单
    if (this.data.photographerInfo) {
      this.loadOrders();
    }
  },

  // 加载摄影师信息
  async loadPhotographerInfo() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'unifiedLogin' });
      const userOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;

      if (!userOpenId) {
        throw new Error('无法获取用户信息');
      }

      const db = wx.cloud.database();
      
      // 查询摄影师账号
      const { data: accounts } = await db.collection('photographer_accounts')
        .where({ openid: userOpenId })
        .get();

      if (accounts.length === 0) {
        wx.showModal({
          title: '提示',
          content: '您还不是摄影师，请联系管理员添加',
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/my/my' });
          }
        });
        return;
      }

      const account = accounts[0];

      // 获取摄影师详细信息
      const { data: photographers } = await db.collection('photographers')
        .doc(account.photographerId)
        .get();

      if (photographers) {
        this.setData({
          photographerInfo: {
            ...photographers,
            _id: account.photographerId
          }
        }, () => {
          // 摄影师信息加载完成后，立即加载订单
          this.loadOrders();
        });
      }
    } catch (e) {
      console.error('加载摄影师信息失败:', e);
      wx.showToast({
        title: '加载信息失败',
        icon: 'none'
      });
    }
  },

  // 加载订单列表
  async loadOrders() {
    if (!this.data.photographerInfo) {
      return;
    }

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 查询所有订单（排除已取消和已退款的）
      const { data: allOrders } = await db.collection('activity_orders')
        .where({
          photographerId: this.data.photographerInfo._id,
          status: _.nin(['cancelled', 'refunded'])
        })
        .orderBy('createdAt', 'desc')
        .get();

      // 根据筛选条件过滤订单
      let orders = allOrders;
      if (this.data.statusFilter === 'to_upload') {
        // 待上传：进行中且没有照片，或刚接单
        orders = allOrders.filter(o => 
          o.status === 'in_progress' && (!o.photos || o.photos.length === 0) && !o.adminRejectReason && !o.rejectReason
        );
      } else if (this.data.statusFilter === 'pending_review') {
        // 待审核：已提交，等管理员审核
        orders = allOrders.filter(o => o.status === 'pending_review');
      } else if (this.data.statusFilter === 'rejected') {
        // 审核驳回：被管理员或用户拒绝，需要修改
        orders = allOrders.filter(o => 
          o.status === 'in_progress' && (o.adminRejectReason || o.rejectReason) && o.photos && o.photos.length > 0
        );
      } else if (this.data.statusFilter === 'pending_confirm') {
        // 待用户确认：审核通过，等用户确认
        orders = allOrders.filter(o => o.status === 'pending_confirm');
      } else if (this.data.statusFilter === 'completed') {
        // 已完成
        orders = allOrders.filter(o => o.status === 'completed');
      }

      // 计算统计数据
      const stats = {
        toUpload: allOrders.filter(o => 
          o.status === 'in_progress' && (!o.photos || o.photos.length === 0) && !o.adminRejectReason && !o.rejectReason
        ).length,
        pendingReview: allOrders.filter(o => o.status === 'pending_review').length,
        rejected: allOrders.filter(o => 
          o.status === 'in_progress' && (o.adminRejectReason || o.rejectReason) && o.photos && o.photos.length > 0
        ).length,
        pendingConfirm: allOrders.filter(o => o.status === 'pending_confirm').length,
        completed: allOrders.filter(o => o.status === 'completed').length,
        total: allOrders.length
      };

      // 加载活动信息并添加订单的时间信息
      const ordersWithTime = await Promise.all(orders.map(async (order) => {
        const daysAgo = this.getDaysAgo(order.createdAt);
        const isUrgent = daysAgo >= 2; // 2天以上算紧急
        const hasPhotos = order.photos && order.photos.length > 0;
        
        // 加载活动信息
        let activityInfo = null;
        if (order.activityId) {
          try {
            const activityRes = await db.collection('activities').doc(order.activityId).get();
            activityInfo = activityRes.data;
          } catch (e) {
            console.error('加载活动信息失败:', e);
          }
        }
        
        // 判断订单显示状态和拒绝类型
        let displayStatus = '';
        let displayStatusColor = '';
        let rejectType = ''; // 'admin' 或 'user'
        let rejectByAdmin = null; // 管理员信息
        
        if (order.status === 'in_progress' && !hasPhotos) {
          displayStatus = '待上传';
          displayStatusColor = 'urgent';
        } else if (order.status === 'in_progress' && hasPhotos && order.adminRejectReason) {
          // 管理员驳回
          displayStatus = '管理员驳回';
          displayStatusColor = 'admin-reject';
          rejectType = 'admin';
        } else if (order.status === 'in_progress' && hasPhotos && order.rejectReason) {
          // 用户拒绝
          displayStatus = '用户要求修改';
          displayStatusColor = 'user-reject';
          rejectType = 'user';
        } else if (order.status === 'pending_review') {
          displayStatus = '待审核';
          displayStatusColor = 'review';
        } else if (order.status === 'pending_confirm') {
          displayStatus = '待用户确认';
          displayStatusColor = 'confirm';
        } else if (order.status === 'completed') {
          displayStatus = '已完成';
          displayStatusColor = 'success';
        }
        
        return {
          ...order,
          daysAgo,
          isUrgent,
          hasPhotos,
          photoCount: order.photos ? order.photos.length : 0,
          timeText: this.getTimeText(order.createdAt),
          activityInfo,
          displayStatus,
          displayStatusColor,
          rejectType,
          rejectReasonText: order.adminRejectReason || order.rejectReason || '',
          adminRejectReason: order.adminRejectReason || '',
          userRejectReason: order.rejectReason || ''
        };
      }));

      this.setData({
        orders: ordersWithTime,
        stats,
        loading: false
      });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载订单失败',
        icon: 'none'
      });
    }
  },

  // 切换状态筛选
  onStatusFilterChange(e) {
    this.setData({
      statusFilter: e.currentTarget.dataset.status
    });
    this.loadOrders();
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/photographer/order-detail?id=${orderId}`
    });
  },

  // 刷新
  onRefresh() {
    this.loadOrders();
  },

  // 计算距离现在多少天
  getDaysAgo(dateStr) {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  // 获取时间显示文本
  getTimeText(dateStr) {
    if (!dateStr) return '';
    const daysAgo = this.getDaysAgo(dateStr);
    
    if (daysAgo === 0) return '今天下单';
    if (daysAgo === 1) return '昨天下单';
    if (daysAgo < 7) return `${daysAgo}天前下单`;
    
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日下单`;
  },

  // 图片加载错误处理
  onImageError(e) {
    const { id, type } = e.currentTarget.dataset;
    console.error('❌ 图片加载失败:', {
      type: type,
      orderId: id,
      src: e.detail.errMsg
    });
    
    // 可以在这里添加重试逻辑或显示占位图
    wx.showToast({
      title: '部分图片加载失败',
      icon: 'none',
      duration: 2000
    });
  }
});

