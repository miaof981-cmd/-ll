const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    id: null,
    name: '',
    specialty: '',
    description: '',
    avatar: '',
    wechatOpenid: '',
    referenceImages: [], // 参考作品图片
    showOpenidHelp: false,
    showBindQRCode: false,
    bindToken: '',
    // 活动多选
    showActivityPicker: false,
    activityKeyword: '',
    allActivities: [],
    filteredActivities: [],
    selectedActivityIds: [],
    tempSelectedActivityIds: [],
    selectedActivities: [],
    isAllActivitySelected: false,
    hasMoreActivities: false
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
          avatar: photographer.avatar || '',
          wechatOpenid: photographer.wechatOpenid || '',
          referenceImages: photographer.referenceImages || [],
          selectedActivityIds: photographer.activityIds || []
        });
        // 预加载活动列表用于展示chips
        await this.ensureActivitiesLoaded();
        this.syncSelectedActivities();
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

  async ensureActivitiesLoaded() {
    if (this.data.allActivities.length > 0) return;
    try {
      const activities = await cloudDB.getActivities({ limit: 200 });
      this.setData({ allActivities: activities, filteredActivities: activities });
    } catch (e) {
      console.error('加载活动列表失败:', e);
    }
  },

  syncSelectedActivities() {
    const map = new Map(this.data.allActivities.map(a => [a._id, a]));
    const list = (this.data.selectedActivityIds || []).map(id => map.get(id)).filter(Boolean);
    this.setData({ selectedActivities: list });
  },

  openActivityPicker: async function () {
    await this.ensureActivitiesLoaded();
    this.setData({
      showActivityPicker: true,
      activityKeyword: '',
      filteredActivities: this.data.allActivities,
      tempSelectedActivityIds: [...(this.data.selectedActivityIds || [])],
      isAllActivitySelected: (this.data.selectedActivityIds || []).length > 0 && (this.data.selectedActivityIds || []).length === this.data.allActivities.length
    });
  },

  closeActivityPicker() {
    this.setData({ showActivityPicker: false });
  },

  onActivitySearch(e) {
    const kw = (e.detail.value || '').trim();
    const list = this.data.allActivities.filter(a => !kw || (a.title && a.title.includes(kw)));
    this.setData({ activityKeyword: kw, filteredActivities: list });
  },

  toggleActivity(e) {
    const id = e.currentTarget.dataset.id;
    const temp = [...this.data.tempSelectedActivityIds];
    const i = temp.indexOf(id);
    if (i >= 0) temp.splice(i, 1); else temp.push(id);
    this.setData({ 
      tempSelectedActivityIds: temp,
      isAllActivitySelected: temp.length > 0 && temp.length === this.data.allActivities.length
    });
  },

  toggleSelectAllActivities() {
    if (this.data.isAllActivitySelected) {
      this.setData({ tempSelectedActivityIds: [], isAllActivitySelected: false });
    } else {
      this.setData({ tempSelectedActivityIds: this.data.allActivities.map(a => a._id), isAllActivitySelected: true });
    }
  },

  confirmActivityPicker() {
    const ids = [...this.data.tempSelectedActivityIds];
    this.setData({
      selectedActivityIds: ids,
      showActivityPicker: false
    });
    this.syncSelectedActivities();
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

  onOpenidInput(e) {
    this.setData({ wechatOpenid: e.detail.value });
  },

  showOpenidHelp() {
    this.setData({ showOpenidHelp: true });
  },

  hideOpenidHelp() {
    this.setData({ showOpenidHelp: false });
  },

  // 生成绑定二维码
  generateBindQRCode() {
    // 生成唯一的绑定token
    const token = `photographer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    this.setData({ 
      bindToken: token,
      showBindQRCode: true 
    });
    
    // 这里可以将token保存到云数据库，设置30分钟过期
    // 摄影师扫码后，通过token将其openid绑定到这个摄影师
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  hideBindQRCode() {
    this.setData({ showBindQRCode: false });
  },

  // 手动输入OpenID
  manualInputOpenid() {
    wx.showModal({
      title: '输入OpenID',
      editable: true,
      placeholderText: '请粘贴OpenID',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ wechatOpenid: res.content.trim() });
        }
      }
    });
  },

  unbindOpenid() {
    wx.showModal({
      title: '确认解绑',
      content: '解绑后该用户将失去摄影师权限',
      success: (res) => {
        if (res.confirm) {
          this.setData({ wechatOpenid: '' });
          wx.showToast({
            title: '已解绑',
            icon: 'success'
          });
        }
      }
    });
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

  // 上传参考图
  uploadReferenceImage() {
    const { referenceImages } = this.data;
    
    if (referenceImages.length >= 9) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 9 - referenceImages.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });

        try {
          const uploadPromises = res.tempFiles.map(async (file) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).slice(2);
            const cloudPath = `photographers/reference/${timestamp}_${random}.jpg`;

            const uploadResult = await wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: file.tempFilePath
            });

            return uploadResult.fileID;
          });

          const fileIDs = await Promise.all(uploadPromises);

          this.setData({
            referenceImages: [...this.data.referenceImages, ...fileIDs]
          });

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

  // 预览参考图
  previewReferenceImage(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.referenceImages,
      current: this.data.referenceImages[index]
    });
  },

  // 删除参考图
  deleteReferenceImage(e) {
    const { index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张参考图吗？',
      success: (res) => {
        if (res.confirm) {
          const referenceImages = [...this.data.referenceImages];
          referenceImages.splice(index, 1);
          this.setData({ referenceImages });
        }
      }
    });
  },

  cancel() {
    wx.navigateBack();
  },

  async save() {
    const { id, name, specialty, description, avatar, wechatOpenid, referenceImages, selectedActivityIds } = this.data;

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
        wechatOpenid: wechatOpenid || '',
        referenceImages: referenceImages || [],
        status: 'available',
        orderCount: 0,
        activityIds: selectedActivityIds || []
      };

      const result = await cloudDB.savePhotographer(photographerData);

      // 如果绑定了微信OpenID，同时创建摄影师账号记录
      if (result && wechatOpenid && wechatOpenid.trim()) {
        try {
          const db = wx.cloud.database();
          
          // 检查是否已存在
          const { data: existing } = await db.collection('photographer_accounts')
            .where({ openid: wechatOpenid.trim() })
            .get();
          
          if (existing.length === 0) {
            // 添加到摄影师账号表
            await db.collection('photographer_accounts').add({
              data: {
                openid: wechatOpenid.trim(),
                photographerId: result._id || id,
                name: name,
                isActive: true,
                createdAt: new Date().toISOString()
              }
            });
            console.log('✅ 摄影师账号绑定成功');
          } else {
            console.log('ℹ️ 该OpenID已绑定摄影师账号');
          }
        } catch (accountErr) {
          console.error('⚠️ 绑定摄影师账号失败（不影响摄影师保存）:', accountErr);
        }
      }

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

