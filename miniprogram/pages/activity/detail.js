// pages/activity/detail.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activityId: '',
    activity: null,
    photographers: [],
    loading: true,
    currentImageIndex: 0,
    canGoBack: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ activityId: id });
      this.loadActivityDetail(id);
    } else {
      wx.showToast({
        title: '活动不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
    
    // 检查页面栈
    const pages = getCurrentPages();
    this.setData({
      canGoBack: pages.length > 1
    });
  },
  
  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/activities/activities'
      });
    }
  },

  // 加载活动详情
  async loadActivityDetail(activityId) {
    console.log('========================================');
    console.log('📖 加载活动详情...');
    console.log('   活动ID:', activityId);
    console.log('========================================');
    
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await cloudDB.getActivityDetail(activityId);
      
      console.log('☁️ 云函数返回结果:', result);

      if (result && result.activity) {
        console.log('✅ 活动数据加载成功:');
        console.log('   标题:', result.activity.title);
        console.log('   价格:', result.activity.price);
        console.log('   原价:', result.activity.originalPrice);
        console.log('   摄影师数量:', result.photographers ? result.photographers.length : 0);
        if (result.photographers && result.photographers.length > 0) {
          console.log('   摄影师列表:', result.photographers.map(p => p.name));
        }
        
        // 设置标题
        wx.setNavigationBarTitle({
          title: result.activity.title
        });

        this.setData({
          activity: result.activity,
          photographers: result.photographers || [],
          loading: false
        });
        
        console.log('📊 页面数据已设置:');
        console.log('   activity.price:', this.data.activity.price);
        console.log('   photographers.length:', this.data.photographers.length);

        // 增加浏览量
        this.incrementViewCount(activityId);

        wx.hideLoading();
      } else {
        console.error('❌ 活动数据加载失败，result:', result);
        wx.hideLoading();
        wx.showToast({
          title: '活动不存在',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (e) {
      console.error('加载活动详情失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 增加浏览量
  async incrementViewCount(activityId) {
    try {
      await cloudDB.incrementActivityViewCount(activityId);
      console.log('✅ 浏览量+1');
    } catch (e) {
      console.error('❌ 增加浏览量失败:', e);
    }
  },

  // 轮播图切换
  onSwiperChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  // 预览图片
  previewImages() {
    const { activity, currentImageIndex } = this.data;
    const images = activity.images || [activity.coverImage];

    wx.previewImage({
      urls: images,
      current: images[currentImageIndex]
    });
  },

  // 立即参加
  joinActivity() {
    const { activityId, activity } = this.data;

    // 保存活动信息到本地
    wx.setStorageSync('currentActivity', JSON.stringify(activity));

    // 跳转到报名页
    wx.navigateTo({
      url: `/pages/activity/apply?activityId=${activityId}`
    });
  },

  // 分享
  onShareAppMessage() {
    const { activity } = this.data;
    return {
      title: activity ? activity.title : '精彩活动',
      path: `/pages/activity/detail?id=${this.data.activityId}`,
      imageUrl: activity ? activity.coverImage : ''
    };
  }
});

