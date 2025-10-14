// pages/activity/apply.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activityId: '',
    activity: null,
    photographers: [],
    
    // 表单数据
    formData: {
      childName: '',
      childGender: '男',
      childAge: '',
      childPhoto: '',
      parentName: '',
      parentPhone: '',
      parentWechat: '',
      expectations: '',
      photographerId: ''
    },
    
    selectedPhotographer: null
  },

  onLoad(options) {
    const { activityId } = options;
    
    if (!activityId) {
      wx.showToast({
        title: '活动不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ activityId });
    this.loadActivityInfo(activityId);
  },

  // 加载活动信息
  async loadActivityInfo(activityId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await cloudDB.getActivityDetail(activityId);

      if (result && result.activity) {
        this.setData({
          activity: result.activity,
          photographers: result.photographers || []
        });

        // 如果只有一个摄影师，自动选中
        if (result.photographers && result.photographers.length === 1) {
          this.selectPhotographer({
            currentTarget: {
              dataset: {
                photographer: result.photographers[0]
              }
            }
          });
        }

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
      console.error('加载活动失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
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
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });

        try {
          const timestamp = Date.now();
          const cloudPath = `activity_orders/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          this.setData({
            'formData.childPhoto': uploadResult.fileID
          });

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
        }
      }
    });
  },

  // 选择摄影师
  selectPhotographer(e) {
    const photographer = e.currentTarget.dataset.photographer;
    this.setData({
      selectedPhotographer: photographer,
      'formData.photographerId': photographer._id
    });
  },

  // 表单验证
  validateForm() {
    const { childName, childPhoto, parentName, parentPhone, parentWechat, photographerId } = this.data.formData;

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

    if (!photographerId) {
      wx.showToast({
        title: '请选择摄影师',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 提交订单
  async submitOrder() {
    if (!this.validateForm()) {
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const orderData = {
        activityId: this.data.activityId,
        ...this.data.formData
      };

      const result = await cloudDB.createActivityOrder(orderData);

      wx.hideLoading();

      if (result && result.success) {
        wx.showToast({
          title: '报名成功',
          icon: 'success'
        });

        setTimeout(() => {
          // 跳转到订单状态页（后续开发）
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.error || '报名失败',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('提交订单失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      });
    }
  }
});

