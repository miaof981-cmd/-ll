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
    let photographers = storage.getPhotographers();
    
    // 如果没有数据，初始化默认摄影师数据
    if (photographers.length === 0) {
      const defaultPhotographers = [
        {
          id: 'PHO' + Date.now() + '001',
          name: '星空画师',
          specialty: '星空风格',
          description: '擅长星空、梦幻风格的证件照拍摄，10年儿童摄影经验',
          avatar: '',
          samples: [],
          status: 'available',
          orderCount: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: 'PHO' + Date.now() + '002',
          name: '清新画师',
          specialty: '清新自然',
          description: '擅长清新、自然风格的证件照拍摄，注重细节和光影',
          avatar: '',
          samples: [],
          status: 'available',
          orderCount: 0,
          createdAt: new Date().toISOString()
        }
      ];
      
      // 保存默认数据到存储
      defaultPhotographers.forEach(p => {
        storage.savePhotographer(p);
      });
      
      photographers = defaultPhotographers;
    }
    
    // 转换为小程序展示格式
    const displayPhotographers = photographers.map(p => ({
      id: p.id,
      name: p.name,
      title: p.specialty || '专业摄影师',
      level: p.orderCount > 50 ? '金牌' : p.orderCount > 20 ? '银牌' : '新星',
      avatar: p.avatar || this.generateDefaultAvatar(p.name),
      rating: '5.0',
      works: p.orderCount || 0,
      orders: p.orderCount || 0,
      description: p.description || '专业摄影师，为您提供优质服务',
      samples: p.samples && p.samples.length > 0 ? p.samples : [],
      price: 299
    }));
    
    this.setData({
      photographers: displayPhotographers
    });
  },
  
  // 生成默认头像
  generateDefaultAvatar(name) {
    const colors = ['#1f6feb', '#28a745', '#6f42c1', '#fd7e14', '#dc3545'];
    const color = colors[name.charCodeAt(0) % colors.length];
    const initial = name.charAt(0);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='${encodeURIComponent(color)}' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='40'%3E${initial}%3C/text%3E%3C/svg%3E`;
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

