const storage = require('../../../utils/storage.js');

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

  loadPhotographer(id) {
    const photographers = storage.getPhotographers();
    const photographer = photographers.find(p => p.id === id);
    if (photographer) {
      this.setData({
        name: photographer.name,
        specialty: photographer.specialty || '',
        description: photographer.description || '',
        avatar: photographer.avatar || ''
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
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const base64 = 'data:image/jpeg;base64,' + fileRes.data;
            this.setData({ avatar: base64 });
          }
        });
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

  save() {
    const { id, name, specialty, description, avatar } = this.data;

    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    const photographerData = {
      id: id || 'PHO' + Date.now(),
      name,
      specialty,
      description,
      avatar,
      status: 'available',
      orderCount: 0,
      createdAt: new Date().toISOString()
    };

    storage.savePhotographer(photographerData);

    wx.showToast({
      title: id ? '更新成功' : '添加成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});

