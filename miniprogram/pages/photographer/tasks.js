// pages/photographer/tasks.js
Page({
  data: {
    photographerInfo: null,
    orders: [],
    stats: {
      notUploaded: 0,      // 未上传作品
      uploaded: 0,          // 已上传待确认
      confirmed: 0,         // 已确认完成
      total: 0
    },
    statusFilter: 'all',  // all, not_uploaded, uploaded, confirmed
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
      if (this.data.statusFilter === 'not_uploaded') {
        // 未上传作品：进行中且没有照片
        orders = allOrders.filter(o => 
          o.status === 'in_progress' && (!o.photos || o.photos.length === 0)
        );
      } else if (this.data.statusFilter === 'uploaded') {
        // 已上传待确认：有照片但还未完成
        orders = allOrders.filter(o => 
          o.status === 'pending_confirm' || (o.status === 'in_progress' && o.photos && o.photos.length > 0)
        );
      } else if (this.data.statusFilter === 'confirmed') {
        // 已确认完成
        orders = allOrders.filter(o => o.status === 'completed');
      }

      // 计算统计数据
      const stats = {
        notUploaded: allOrders.filter(o => 
          o.status === 'in_progress' && (!o.photos || o.photos.length === 0)
        ).length,
        uploaded: allOrders.filter(o => 
          o.status === 'pending_confirm' || (o.status === 'in_progress' && o.photos && o.photos.length > 0)
        ).length,
        confirmed: allOrders.filter(o => o.status === 'completed').length,
        total: allOrders.length
      };

      // 添加订单的时间信息
      const ordersWithTime = orders.map(order => {
        const daysAgo = this.getDaysAgo(order.createdAt);
        const isUrgent = daysAgo >= 2; // 2天以上算紧急
        const hasPhotos = order.photos && order.photos.length > 0;
        
        return {
          ...order,
          daysAgo,
          isUrgent,
          hasPhotos,
          photoCount: order.photos ? order.photos.length : 0,
          timeText: this.getTimeText(order.createdAt)
        };
      });

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
  }
});

