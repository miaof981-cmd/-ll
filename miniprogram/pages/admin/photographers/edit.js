const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    id: null,
    name: '',
    specialty: '',
    description: '',
    avatar: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadPhotographer(options.id);
    }
  },

  async loadPhotographer(id) {
    console.log('📡 加载摄影师信息:', id);
    wx.showLoading({ title: '加载中...' });

    try {
      const photographer = await cloudDB.getPhotographerById(id);

      wx.hideLoading();

      if (photographer) {
        console.log('✅ 摄影师信息:', photographer);
        this.setData({
          name: photographer.name,
          specialty: photographer.specialty || '',
          description: photographer.description || '',
          avatar: photographer.avatar || ''
        });
      } else {
        wx.showToast({
          title: '摄影师不存在',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('❌ 加载摄影师失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onSpecialtyInput(e) {
    this.setData({ specialty: e.detail.value });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  uploadAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...' });

        try {
          // 上传到云存储
          const timestamp = Date.now();
          const cloudPath = `photographers/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          console.log('✅ 头像上传成功:', uploadResult.fileID);

          this.setData({ avatar: uploadResult.fileID });

          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch (e) {
          console.error('❌ 上传失败:', e);
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          });
        }
      }
    });
  },

  previewAvatar() {
    if (this.data.avatar) {
      wx.previewImage({
        urls: [this.data.avatar],
        current: this.data.avatar
      });
    }
  },

  cancel() {
    wx.navigateBack();
  },

  async save() {
    const { id, name, specialty, description, avatar } = this.data;

    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const photographerData = {
        _id: id || undefined,
        name,
        specialty,
        description,
        avatar,
        status: 'available',
        orderCount: 0
      };

      const result = await cloudDB.savePhotographer(photographerData);

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: id ? '更新成功' : '添加成功',
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
      console.error('❌ 保存摄影师失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  }
});

