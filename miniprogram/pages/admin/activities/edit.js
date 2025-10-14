// pages/admin/activities/edit.js
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    activityId: '',
    isEdit: false,
    
    // 表单数据
    formData: {
      title: '',
      subtitle: '',
      coverImage: '',
      images: [],
      description: '',
      details: '',
      price: '',
      originalPrice: '',
      category: '校园活动',
      photographerIds: [],
      tags: [],
      status: 'active',
      isHot: false,
      isNew: false,
      sortOrder: 1
    },
    
    // 分类选项
    categories: [],
    categoryIndex: 0,
    
    // 所有摄影师
    allPhotographers: [],
    selectedPhotographers: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ 
        activityId: options.id,
        isEdit: true 
      });
      this.loadActivity(options.id);
    }
    
    this.loadCategories();
    this.loadPhotographers();
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('activity_categories')
        .orderBy('sort', 'asc')
        .get();

      const categories = res.data.map(c => c.name);
      this.setData({
        categories: categories.length > 0 ? categories : ['未分类']
      });
    } catch (e) {
      console.error('加载分类失败:', e);
      this.setData({
        categories: ['未分类']
      });
    }
  },

  // 加载活动信息
  async loadActivity(id) {
    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('activities').doc(id).get();

      if (res.data) {
        const activity = res.data;
        
        // 查找分类索引
        const categoryIndex = this.data.categories.indexOf(activity.category);
        
        this.setData({
          formData: activity,
          categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
        });

        // 加载选中的摄影师
        if (activity.photographerIds && activity.photographerIds.length > 0) {
          this.loadSelectedPhotographers(activity.photographerIds);
        }
      }

      wx.hideLoading();
    } catch (e) {
      console.error('加载活动失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 加载所有摄影师
  async loadPhotographers() {
    try {
      const photographers = await cloudDB.getPhotographers();
      this.setData({ allPhotographers: photographers });
    } catch (e) {
      console.error('加载摄影师失败:', e);
    }
  },

  // 加载选中的摄影师
  async loadSelectedPhotographers(ids) {
    const selected = this.data.allPhotographers.filter(p => 
      ids.includes(p._id)
    );
    this.setData({ selectedPhotographers: selected });
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择分类
  onCategoryChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categories[index]
    });
  },

  // 开关变化
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 上传封面图
  uploadCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        await this.uploadImage(tempFilePath, 'coverImage');
      }
    });
  },

  // 上传活动图片
  uploadImages() {
    wx.chooseMedia({
      count: 9 - this.data.formData.images.length,
      mediaType: ['image'],
      sourceType: ['album'],
      success: async (res) => {
        for (const file of res.tempFiles) {
          await this.uploadImage(file.tempFilePath, 'images');
        }
      }
    });
  },

  // 上传图片到云存储
  async uploadImage(tempFilePath, type) {
    wx.showLoading({ title: '上传中...' });

    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2);
      const cloudPath = `activities/${timestamp}_${random}.jpg`;

      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      if (type === 'coverImage') {
        this.setData({
          'formData.coverImage': uploadResult.fileID
        });
      } else if (type === 'images') {
        const images = this.data.formData.images || [];
        images.push(uploadResult.fileID);
        this.setData({
          'formData.images': images
        });
      }

      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (e) {
      console.error('上传失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      });
    }
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.formData.images;
    images.splice(index, 1);
    this.setData({
      'formData.images': images
    });
  },

  // 选择摄影师
  selectPhotographers() {
    const { allPhotographers, formData } = this.data;
    const selected = formData.photographerIds || [];

    wx.showActionSheet({
      itemList: allPhotographers.map(p => 
        `${selected.includes(p._id) ? '✓ ' : ''}${p.name}`
      ),
      success: (res) => {
        const photographer = allPhotographers[res.tapIndex];
        const photographerIds = [...selected];

        if (photographerIds.includes(photographer._id)) {
          // 取消选择
          const index = photographerIds.indexOf(photographer._id);
          photographerIds.splice(index, 1);
        } else {
          // 添加选择
          photographerIds.push(photographer._id);
        }

        this.setData({
          'formData.photographerIds': photographerIds
        });

        this.loadSelectedPhotographers(photographerIds);
      }
    });
  },

  // 表单验证
  validateForm() {
    const { title, coverImage, price, category } = this.data.formData;

    if (!title.trim()) {
      wx.showToast({
        title: '请输入活动标题',
        icon: 'none'
      });
      return false;
    }

    if (!coverImage) {
      wx.showToast({
        title: '请上传封面图',
        icon: 'none'
      });
      return false;
    }

    if (!price || parseFloat(price) <= 0) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      });
      return false;
    }

    if (!category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 保存活动
  async saveActivity() {
    if (!this.validateForm()) {
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const activityData = {
        ...this.data.formData,
        price: parseFloat(this.data.formData.price),
        sortOrder: parseInt(this.data.formData.sortOrder) || 1
      };

      const result = await cloudDB.saveActivity(activityData);

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('保存失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  }
});

