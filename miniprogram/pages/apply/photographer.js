// pages/apply/photographer.js - 选择摄影师逻辑
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    photographers: [],
    selectedId: null
  },

  onLoad() {
    this.loadPhotographers();
  },

  // 加载摄影师列表
  async loadPhotographers() {
    console.log('📡 开始加载摄影师列表...');
    wx.showLoading({ title: '加载中...' });

    try {
      // 获取证件照活动价格
      const idPhotoPrice = await this.getIDPhotoPrice();
      
      // 从云数据库获取摄影师数据
      let photographers = await cloudDB.getPhotographers();
    
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
      
      // 保存默认数据到云数据库
      for (const p of defaultPhotographers) {
        await cloudDB.savePhotographer(p);
      }
      
      photographers = defaultPhotographers;
    }

    console.log('✅ 摄影师数量:', photographers.length);
    
    // 转换为小程序展示格式
    const displayPhotographers = photographers.map(p => ({
      id: p._id || p.id,
      name: p.name,
      title: p.specialty || '专业摄影师',
      level: p.orderCount > 50 ? '金牌' : p.orderCount > 20 ? '银牌' : '新星',
      avatar: p.avatar || this.generateDefaultAvatar(p.name),
      rating: '5.0',
      works: p.orderCount || 0,
      orders: p.orderCount || 0,
      description: p.description || '专业摄影师，为您提供优质服务',
      samples: p.samples && p.samples.length > 0 ? p.samples : [],
      price: idPhotoPrice // 使用证件照活动价格
    }));
    
    this.setData({
      photographers: displayPhotographers
    });

    wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载摄影师失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },
  
  // 获取证件照活动价格
  async getIDPhotoPrice() {
    try {
      // 获取证件照默认活动
      const activities = await cloudDB.getActivities({ 
        category: '证件照'
      });
      
      if (activities && activities.length > 0) {
        const idPhotoActivity = activities.find(a => a.isDefault);
        if (idPhotoActivity) {
          console.log('✅ 获取证件照价格:', idPhotoActivity.price);
          return idPhotoActivity.price;
        }
      }
      
      // 如果没有找到，返回默认价格
      console.warn('⚠️ 未找到证件照活动，使用默认价格');
      return 20;
    } catch (e) {
      console.error('❌ 获取证件照价格失败:', e);
      return 20; // 返回默认价格
    }
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

