// pages/activity/detail.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activityId: '',
    activity: null,
    photographers: [],
    loading: true,
    currentImageIndex: 0
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
  },

  // 加载活动详情
  async loadActivityDetail(activityId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await cloudDB.getActivityDetail(activityId);

      if (result && result.activity) {
        // 设置标题
        wx.setNavigationBarTitle({
          title: result.activity.title
        });

        this.setData({
          activity: result.activity,
          photographers: result.photographers || [],
          loading: false
        });

        wx.hideLoading();
      } else {
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

