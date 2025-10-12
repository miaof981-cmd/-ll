// pages/index/index.js
Page({
  data: {
    announcements: [],
    articles: [],
    banners: [],
    loading: true,
    currentBanner: 0
  },

  onLoad() {
    this.loadHomeData();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadHomeData();
  },

  // 加载首页数据
  async loadHomeData() {
    wx.showLoading({
      title: '加载中...'
    });

    try {
      const app = getApp();
      if (app.globalData.useCloud) {
        // 调用云函数获取首页数据
        const res = await wx.cloud.callFunction({
          name: 'getHomeData'
        });

        if (res.result && res.result.success) {
          const data = res.result.data;
          this.setData({
            announcements: data.announcements || [],
            articles: data.articles || [],
            banners: data.banners || [],
            loading: false
          });
        } else {
          this.loadMockData();
        }
      } else {
        // 未启用云开发，直接使用本地模拟数据
        this.loadMockData();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 使用模拟数据
      this.loadMockData();
    } finally {
      wx.hideLoading();
    }
  },

  // 加载模拟数据（用于演示）
  loadMockData() {
    this.setData({
      announcements: [
        {
          id: '1',
          title: '新生发型管理注意事项',
          content: '为维护良好校风，请同学们注意发型规范，违者将记入档案。',
          pinned: true,
          createdAt: '2024-10-12'
        },
        {
          id: '2',
          title: '期中考试安排通知',
          content: '期中考试将于下周进行，请同学们做好复习准备。',
          pinned: false,
          createdAt: '2024-10-11'
        }
      ],
      articles: [
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
      ],
      banners: [],
      loading: false
    });
  },

  // 查看公告详情
  viewAnnouncement(e) {
    const announcement = e.currentTarget.dataset.announcement;
    wx.showModal({
      title: announcement.title,
      content: announcement.content,
      showCancel: false,
      confirmText: '知道了'
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
  },

  // 轮播图切换
  onBannerChange(e) {
    this.setData({
      currentBanner: e.detail.current
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHomeData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '学校官网',
      path: '/pages/index/index'
    };
  }
});
