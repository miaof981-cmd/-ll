// pages/index/index.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    announcements: [],
    banners: [],
    bannerHeight: 400, // 默认高度
    bannerHeights: {}, // 存储每张图片的高度
    currentBanner: 0 // 当前轮播图索引
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

    console.log('✅ 轮播图数量:', banners.length);
    console.log('✅ 公告数量:', announcements.length);

    this.setData({
      banners,
      announcements: announcements.length > 0 ? announcements : []
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
