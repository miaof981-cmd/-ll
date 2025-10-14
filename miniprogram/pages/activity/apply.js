// pages/activity/apply.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    activityId: '',
    activity: null,
    photographers: [],
    children: [],
    selectedChild: null,
    selectedPhotographer: null,
    lifePhotos: [],
    remark: '',
    showAddChildTip: false
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
    this.loadChildren();
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

  // 加载孩子列表
  async loadChildren() {
    try {
      const db = wx.cloud.database();
      
      // 获取当前用户的 openid
      let userOpenId = '';
      
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'unifiedLogin'
        });
        
        console.log('登录结果:', result);
        
        // 兼容多种返回格式
        userOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;
        
        if (!userOpenId) {
          console.error('无法获取OpenID, result:', result);
          throw new Error('无法获取用户OpenID');
        }
        
        console.log('用户OpenID:', userOpenId);
      } catch (loginError) {
        console.error('登录失败:', loginError);
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/my/my'
          });
        }, 1500);
        return;
      }
      
      // 查询用户的孩子列表
      const res = await db.collection('students')
        .where({
          parentOpenid: userOpenId
        })
        .get();

      if (res.data && res.data.length > 0) {
        this.setData({
          children: res.data,
          showAddChildTip: false
        });
      } else {
        this.setData({
          children: [],
          showAddChildTip: true
        });
      }
    } catch (e) {
      console.error('加载孩子列表失败:', e);
    }
  },

  // 选择孩子
  selectChild(e) {
    const child = e.currentTarget.dataset.child;
    
    console.log('选中的孩子:', child);
    
    // 加载孩子的生活照
    const lifePhotos = child.lifePhotos || [];
    
    console.log('孩子的生活照:', lifePhotos);
    
    this.setData({
      selectedChild: child,
      lifePhotos: lifePhotos,
      showAddChildTip: false
    }, () => {
      console.log('设置后的数据:', {
        selectedChild: this.data.selectedChild,
        lifePhotos: this.data.lifePhotos
      });
    });
  },

  // 添加/编辑生活照
  async addLifePhoto() {
    wx.chooseMedia({
      count: 9 - this.data.lifePhotos.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });

        try {
          const uploadPromises = res.tempFiles.map(async (file) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).slice(2);
            const cloudPath = `life_photos/${timestamp}_${random}.jpg`;

            const uploadResult = await wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: file.tempFilePath
            });

            return uploadResult.fileID;
          });

          const fileIDs = await Promise.all(uploadPromises);

          this.setData({
            lifePhotos: [...this.data.lifePhotos, ...fileIDs]
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

  // 预览生活照
  previewLifePhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.lifePhotos,
      current: this.data.lifePhotos[index]
    });
  },

  // 删除生活照
  deleteLifePhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const lifePhotos = [...this.data.lifePhotos];
          lifePhotos.splice(index, 1);
          this.setData({ lifePhotos });
        }
      }
    });
  },

  // 选择摄影师
  selectPhotographer(e) {
    const photographer = e.currentTarget.dataset.photographer;
    this.setData({
      selectedPhotographer: photographer
    });
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  // 前往申请入学
  goToApply() {
    wx.navigateTo({
      url: '/pages/apply/apply'
    });
  },

  // 表单验证
  validateForm() {
    if (!this.data.selectedChild) {
      wx.showToast({
        title: '请选择孩子',
        icon: 'none'
      });
      return false;
    }

    if (this.data.lifePhotos.length === 0) {
      wx.showToast({
        title: '请至少上传一张生活照',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedPhotographer) {
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
      const db = wx.cloud.database();
      
      // 更新孩子的生活照
      if (this.data.lifePhotos.length > 0) {
        await db.collection('students').doc(this.data.selectedChild._id).update({
          data: {
            lifePhotos: this.data.lifePhotos
          }
        });
      }

      // 创建订单
      const orderData = {
        activityId: this.data.activityId,
        studentId: this.data.selectedChild.studentId,
        studentName: this.data.selectedChild.name,
        photographerId: this.data.selectedPhotographer._id,
        lifePhotos: this.data.lifePhotos,
        remark: this.data.remark,
        totalPrice: this.data.activity.price,
        status: 'pending_payment'
      };

      const result = await cloudDB.createActivityOrder(orderData);

      wx.hideLoading();

      if (result && result.success) {
        wx.showToast({
          title: '报名成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/user/orders/orders'
          });
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
