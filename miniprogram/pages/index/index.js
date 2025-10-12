// pages/index/index.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    announcements: [],
    articles: [],
    banners: [],
    bannerHeight: 400, // 默认高度
    bannerHeights: {} // 存储每张图片的高度
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
  loadData() {
    // 从本地存储获取真实数据
    const banners = storage.getBanners();
    const announcements = storage.getAnnouncements();
    
    // 如果没有数据，使用模拟数据
    const articles = [
      {
        id: '1',
        title: '我校举办科技创新大赛',
        content: '为培养学生创新精神，我校成功举办了第五届科技创新大赛，共有200多名学生参与。',
        createdAt: '2024-10-10'
      },
      {
        id: '2',
        title: '校园文化艺术节圆满落幕',
        content: '历时一周的校园文化艺术节圆满结束，展现了同学们的才华和创造力。',
        createdAt: '2024-10-09'
      }
    ];

    this.setData({
      banners,
      announcements: announcements.length > 0 ? announcements : [],
      articles
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
  },

  // 查看文章详情
  viewArticle(e) {
    const article = e.currentTarget.dataset.article;
    wx.showModal({
      title: article.title,
      content: article.content,
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
