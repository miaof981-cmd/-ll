// pages/activities/activities.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activities: [],
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' }
    ],
    loading: true
  },

  onLoad() {
    this.loadCategories();
    this.loadActivities();
  },

  onShow() {
    // 每次显示时刷新
    this.loadCategories();
    this.loadActivities();
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('activity_categories')
        .orderBy('sort', 'asc')
        .get();

      const categories = [
        { id: 'all', name: '全部' },
        ...res.data.map(c => ({ id: c.name, name: c.name, icon: c.icon }))
      ];

      this.setData({ categories });
    } catch (e) {
      console.error('加载分类失败:', e);
    }
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
      
      // 前端过滤，不显示默认活动（如证件照）
      activities = activities.filter(item => !item.isDefault);

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

