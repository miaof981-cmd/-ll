// pages/apply/apply.js - 入学申请表单逻辑
Page({
  data: {
    currentStep: 1,
    formData: {
      childName: '',
      childGender: '男',
      childAge: '',
      childPhoto: '',
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

  // 上传孩子照片
  uploadChildPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          'formData.childPhoto': tempFilePath
        });
        wx.showToast({
          title: '照片上传成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择照片失败：', err);
      }
    });
  },

  // 预览照片
  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  // 删除照片
  deleteChildPhoto() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'formData.childPhoto': ''
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
    const { childName, childPhoto, parentName, parentPhone, parentWechat } = this.data.formData;

    if (!childName.trim()) {
      wx.showToast({
        title: '请输入孩子姓名',
        icon: 'none'
      });
      return false;
    }

    if (!childPhoto) {
      wx.showToast({
        title: '请上传孩子的生活照',
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

