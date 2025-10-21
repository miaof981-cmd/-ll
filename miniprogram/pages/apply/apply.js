// pages/apply/apply.js - 入学申请表单逻辑
Page({
  data: {
    currentStep: 1,
    formData: {
      childName: '',
      childGender: '男',
      childAge: '',
      lifePhotos: [], // 生活照片数组，最多4张
      parentName: '',
      parentPhone: '',
      parentWechat: '',
      expectations: ''
    }
  },

  onLoad(options) {
    // 如果是从其他页面返回，恢复表单数据
    const savedData = wx.getStorageSync('applyFormData');
    if (savedData) {
      this.setData({
        formData: JSON.parse(savedData)
      });
    }
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const updateData = {};
    updateData['formData.' + field] = value;
    this.setData(updateData);
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      'formData.childGender': e.detail.value
    });
  },

  // 上传生活照片（最多4张）
  uploadLifePhotos() {
    const currentCount = this.data.formData.lifePhotos.length;
    const remainingCount = 4 - currentCount;
    
    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多上传4张照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        console.log('📷 选择了', res.tempFiles.length, '张照片');
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        
        try {
          // 上传到云存储
          const uploadPromises = res.tempFiles.map((file, index) => {
            const cloudPath = `life-photos/${Date.now()}_${index}_${Math.random().toString(36).slice(2)}.${file.tempFilePath.split('.').pop()}`;
            console.log(`📤 开始上传第 ${index + 1} 张照片到云存储:`, cloudPath);
            
            return wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: file.tempFilePath
            });
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          console.log('✅ 所有照片上传完成:', uploadResults);
          
          // 获取云存储的 fileID
          const newPhotos = uploadResults.map((result, index) => {
            console.log(`   [${index + 1}] fileID:`, result.fileID);
            return result.fileID;
          });
          
          const updatedPhotos = [...this.data.formData.lifePhotos, ...newPhotos];
          this.setData({
            'formData.lifePhotos': updatedPhotos
          });
          
          wx.hideLoading();
          wx.showToast({
            title: `已上传${newPhotos.length}张照片`,
            icon: 'success'
          });
        } catch (err) {
          console.error('❌ 上传照片到云存储失败:', err);
          wx.hideLoading();
          wx.showModal({
            title: '上传失败',
            content: '照片上传失败，请重试：' + (err.errMsg || err.message),
            showCancel: false
          });
        }
      },
      fail: (err) => {
        console.error('❌ 选择照片失败：', err);
      }
    });
  },

  // 预览生活照
  previewLifePhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      urls: this.data.formData.lifePhotos,
      current: this.data.formData.lifePhotos[index]
    });
  },

  // 删除生活照
  deleteLifePhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const photos = [...this.data.formData.lifePhotos];
          photos.splice(index, 1);
          this.setData({
            'formData.lifePhotos': photos
          });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 表单验证
  validateForm() {
    const { childName, lifePhotos, parentName, parentPhone, parentWechat } = this.data.formData;

    if (!childName.trim()) {
      wx.showToast({
        title: '请输入孩子姓名',
        icon: 'none'
      });
      return false;
    }

    if (!lifePhotos || lifePhotos.length === 0) {
      wx.showToast({
        title: '请至少上传1张生活照',
        icon: 'none'
      });
      return false;
    }

    if (!parentName.trim()) {
      wx.showToast({
        title: '请输入家长姓名',
        icon: 'none'
      });
      return false;
    }

    if (!parentPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return false;
    }

    // 简单的手机号验证
    if (!/^1[3-9]\d{9}$/.test(parentPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }

    if (!parentWechat.trim()) {
      wx.showToast({
        title: '请输入联系微信',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 提交表单
  submitForm() {
    if (!this.validateForm()) {
      return;
    }

    // 保存表单数据到本地
    wx.setStorageSync('applyFormData', JSON.stringify(this.data.formData));

    // 跳转到预览页面
    wx.navigateTo({
      url: '/pages/apply/preview'
    });
  }
});

