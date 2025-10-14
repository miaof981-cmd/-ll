// pages/photographer/tasks.js
Page({
  data: {
    photographerInfo: null,
    orders: [],
    stats: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      total: 0
    },
    statusFilter: 'all',
    loading: false
  },

  onLoad() {
    this.loadPhotographerInfo();
    this.loadOrders();
  },

  onShow() {
    this.loadOrders(); // 每次显示页面时刷新订单
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

      // 构建查询条件
      let where = {
        photographerId: this.data.photographerInfo._id
      };

      if (this.data.statusFilter !== 'all') {
        where.status = this.data.statusFilter;
      }

      const { data: orders } = await db.collection('activity_orders')
        .where(where)
        .orderBy('createdAt', 'desc')
        .get();

      // 计算统计数据
      const stats = {
        pending: orders.filter(o => o.status === 'pending_payment').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length,
        total: orders.length
      };

      this.setData({
        orders,
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

  // 上传作品
  uploadWork(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/photographer/upload?orderId=${orderId}`
    });
  },

  // 刷新
  onRefresh() {
    this.loadOrders();
  },

  // 获取状态显示文本
  getStatusText(status) {
    const statusMap = {
      'pending_payment': '待支付',
      'in_progress': '进行中',
      'completed': '已完成',
      'after_sale': '售后中',
      'refunded': '已退款',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  // 获取状态样式类
  getStatusClass(status) {
    const classMap = {
      'pending_payment': 'pending',
      'in_progress': 'processing',
      'completed': 'completed',
      'after_sale': 'aftersale',
      'refunded': 'refunded',
      'cancelled': 'cancelled'
    };
    return classMap[status] || '';
  }
});

