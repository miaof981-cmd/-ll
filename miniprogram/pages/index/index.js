// pages/index/index.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    announcements: [],
    banners: [],
    bannerHeight: 400,
    bannerHeights: {},
    currentBanner: 0,
    
    // 活动相关数据
    activities: [],
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: '证件照', name: '证件照' },
      { id: '校园活动', name: '校园活动' },
      { id: '毕业照', name: '毕业照' },
      { id: '节日活动', name: '节日活动' }
    ]
  },

  onLoad() {
    console.log("首页加载");
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadData();
  },

  // 加载数据
  async loadData() {
    console.log('📡 开始加载首页数据...');
    
    // 从云数据库获取数据
    const banners = await cloudDB.getBanners();
    const announcements = await cloudDB.getAnnouncements();
    const activities = await cloudDB.getActivities({ status: 'active' });

    console.log('✅ 轮播图数量:', banners.length);
    console.log('✅ 公告数量:', announcements.length);
    console.log('✅ 活动数量:', activities.length);

    this.setData({
      banners,
      announcements: announcements.length > 0 ? announcements : [],
      activities: activities || []
    });
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category });
    this.loadActivities(category);
  },

  // 加载活动（按分类）
  async loadActivities(category) {
    wx.showLoading({ title: '加载中...' });
    
    const options = { status: 'active' };
    if (category !== 'all') {
      options.category = category;
    }
    
    const activities = await cloudDB.getActivities(options);
    
    this.setData({ activities: activities || [] });
    wx.hideLoading();
  },

  // 查看活动详情
  viewActivity(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity/detail?id=${id}`
    });
  },

  // 轮播图图片加载完成
  onBannerImageLoad(e) {
    const { index } = e.currentTarget.dataset;
    const { width, height } = e.detail;
    
    // 获取屏幕宽度
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth;
    
    // 计算图片实际显示高度
    const actualHeight = (height / width) * screenWidth;
    
    // 存储每张图片的高度
    const bannerHeights = this.data.bannerHeights;
    bannerHeights[index] = actualHeight;
    
    // 如果是第一张图片，立即更新高度
    if (index === 0) {
      this.setData({
        bannerHeight: actualHeight,
        bannerHeights
      });
    }
  },

  // 轮播图切换
  onBannerChange(e) {
    const current = e.detail.current;
    const bannerHeights = this.data.bannerHeights;
    
    // 更新当前索引
    this.setData({
      currentBanner: current
    });
    
    // 如果有对应图片的高度，更新swiper高度
    if (bannerHeights[current]) {
      this.setData({
        bannerHeight: bannerHeights[current]
      });
    }
  },

  // 查看公告详情
  viewAnnouncement(e) {
    const announcement = e.currentTarget.dataset.announcement;
    
    // 将公告数据存储到本地，供详情页使用
    wx.setStorageSync('currentAnnouncement', JSON.stringify(announcement));
    
    // 跳转到详情页
    wx.navigateTo({
      url: '/pages/announcement/detail'
    });
  }
});
