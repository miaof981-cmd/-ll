// pages/activities/activities.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activities: [],
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: '校园活动', name: '校园活动' },
      { id: '毕业照', name: '毕业照' },
      { id: '节日活动', name: '节日活动' }
    ],
    loading: true
  },

  onLoad() {
    this.loadActivities();
  },

  onShow() {
    // 每次显示时刷新
    this.loadActivities();
  },

  // 加载活动列表
  async loadActivities(category = 'all') {
    this.setData({ loading: true });

    try {
      const options = { 
        status: 'active',
        // 排除证件照类活动
        category: category === 'all' ? undefined : category
      };

      let activities = await cloudDB.getActivities(options);
      
      // 前端再次过滤，确保不显示证件照
      activities = activities.filter(item => item.category !== '证件照');

      this.setData({
        activities: activities || [],
        loading: false
      });
    } catch (e) {
      console.error('加载活动失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category });
    this.loadActivities(category);
  },

  // 查看活动详情
  viewActivity(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity/detail?id=${id}`
    });
  }
});

