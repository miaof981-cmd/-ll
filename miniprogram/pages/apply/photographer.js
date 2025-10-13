// pages/apply/photographer.js - 选择摄影师逻辑
const storage = require('../../utils/storage.js');

Page({
  data: {
    photographers: [],
    selectedId: null
  },

  onLoad() {
    this.loadPhotographers();
  },

  // 加载摄影师列表
  loadPhotographers() {
    // 从本地存储获取摄影师数据
    const photographers = storage.getPhotographers();
    
    // 如果没有数据，使用模拟数据
    if (photographers.length === 0) {
      const mockData = [
        {
          id: 'p001',
          name: '张艺术',
          title: '资深儿童摄影师',
          level: '金牌',
          avatar: '/images/photographer1.png',
          rating: '4.9',
          works: 156,
          orders: 328,
          description: '10年儿童摄影经验，擅长捕捉孩子最自然的笑容',
          samples: [
            '/images/sample1.jpg',
            '/images/sample2.jpg',
            '/images/sample3.jpg'
          ],
          price: 299
        },
        {
          id: 'p002',
          name: '李画师',
          title: '专业证件照摄影师',
          level: '银牌',
          avatar: '/images/photographer2.png',
          rating: '4.8',
          works: 98,
          orders: 215,
          description: '专注证件照拍摄，注重细节和光影效果',
          samples: [
            '/images/sample4.jpg',
            '/images/sample5.jpg',
            '/images/sample6.jpg'
          ],
          price: 199
        },
        {
          id: 'p003',
          name: '王摄影',
          title: '创意儿童摄影师',
          level: '金牌',
          avatar: '/images/photographer3.png',
          rating: '5.0',
          works: 203,
          orders: 456,
          description: '创意拍摄，让每一张照片都充满故事',
          samples: [
            '/images/sample7.jpg',
            '/images/sample8.jpg',
            '/images/sample9.jpg'
          ],
          price: 399
        }
      ];
      
      this.setData({
        photographers: mockData
      });
    } else {
      this.setData({
        photographers
      });
    }
  },

  // 选择摄影师
  selectPhotographer(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedId: id
    });
  },

  // 预览作品
  previewWork(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      urls: urls,
      current: current
    });
  },

  // 返回上一步
  goBack() {
    wx.navigateBack();
  },

  // 确认选择并支付
  confirmSelection() {
    if (!this.data.selectedId) {
      wx.showToast({
        title: '请选择摄影师',
        icon: 'none'
      });
      return;
    }

    // 找到选中的摄影师
    const selectedPhotographer = this.data.photographers.find(
      p => p.id === this.data.selectedId
    );

    // 保存选中的摄影师信息
    wx.setStorageSync('selectedPhotographer', JSON.stringify(selectedPhotographer));

    // 跳转到支付页面
    wx.navigateTo({
      url: '/pages/apply/payment'
    });
  }
});

