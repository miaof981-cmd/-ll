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
    console.log('========================================');
    console.log('📖 [报名页] 加载活动信息...');
    console.log('   活动ID:', activityId);
    console.log('========================================');
    
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await cloudDB.getActivityDetail(activityId);
      
      console.log('☁️ [报名页] 云函数返回结果:', result);

      if (result && result.activity) {
        console.log('✅ [报名页] 活动数据加载成功:');
        console.log('   标题:', result.activity.title);
        console.log('   价格:', result.activity.price);
        console.log('   摄影师数量:', result.photographers ? result.photographers.length : 0);
        if (result.photographers && result.photographers.length > 0) {
          console.log('   摄影师列表:', result.photographers);
        } else {
          console.warn('⚠️ [报名页] 没有可选摄影师！');
        }
        
        this.setData({
          activity: result.activity,
          photographers: result.photographers || []
        });
        
        console.log('📊 [报名页] 页面数据已设置:');
        console.log('   activity:', this.data.activity);
        console.log('   photographers:', this.data.photographers);

        // 如果只有一个摄影师，自动选中
        if (result.photographers && result.photographers.length === 1) {
          console.log('🎯 [报名页] 自动选中唯一的摄影师');
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
        console.error('❌ [报名页] 活动数据加载失败，result:', result);
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
      // 注意：students 集合使用 _openid 字段（云数据库自动添加）
      const res = await db.collection('students')
        .where({
          _openid: userOpenId
        })
        .get();

      console.log('📋 查询到的孩子数量:', res.data ? res.data.length : 0);
      if (res.data && res.data.length > 0) {
        console.log('   孩子列表:', res.data.map(c => ({ name: c.name, studentId: c.studentId })));
        this.setData({
          children: res.data,
          showAddChildTip: false
        });
      } else {
        console.log('⚠️ 没有找到孩子信息');
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

    // 生活照改为选填，不强制要求
    // if (this.data.lifePhotos.length === 0) {
    //   wx.showToast({
    //     title: '请至少上传一张生活照',
    //     icon: 'none'
    //   });
    //   return false;
    // }

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
    console.log('========================================');
    console.log('📝 开始提交订单...');
    console.log('========================================');
    
    if (!this.validateForm()) {
      console.log('❌ 表单验证失败');
      return;
    }
    
    console.log('✅ 表单验证通过');
    console.log('   选中的孩子:', this.data.selectedChild);
    console.log('   选中的摄影师:', this.data.selectedPhotographer);
    console.log('   生活照数量:', this.data.lifePhotos.length);

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
        // 云函数需要的字段
        childName: this.data.selectedChild.name,
        childGender: this.data.selectedChild.gender || '男',
        childAge: this.data.selectedChild.age || '',
        childPhoto: this.data.selectedChild.avatar || '',
        parentName: this.data.selectedChild.parentName || '',
        parentPhone: this.data.selectedChild.parentPhone || '',
        parentWechat: this.data.selectedChild.parentWechat || '',
        expectations: this.data.remark || '',
        // 其他字段
        photographerId: this.data.selectedPhotographer._id,
        lifePhotos: this.data.lifePhotos,
        remark: this.data.remark,
        totalPrice: this.data.activity.price,
        status: 'pending_payment'
      };

      console.log('📤 准备调用云函数创建订单...');
      console.log('   订单数据:', orderData);
      
      const result = await cloudDB.createActivityOrder(orderData);

      console.log('========================================');
      console.log('☁️ 云函数返回结果:');
      console.log('   完整结果:', JSON.stringify(result, null, 2));
      console.log('   result.success:', result.success);
      console.log('   result.orderId:', result.orderId);
      console.log('   result.orderNo:', result.orderNo);
      console.log('========================================');
      
      wx.hideLoading();

      if (result && result.success) {
        console.log('✅ 订单创建成功');
        console.log('   订单ID:', result.orderId);
        console.log('   订单号:', result.orderNo);
        console.log('   订单价格:', result.price);
        
        // 检查必要字段
        if (!result.orderNo) {
          console.error('❌ 云函数没有返回 orderNo！');
          wx.showModal({
            title: '订单创建失败',
            content: '云函数没有返回订单号，请联系管理员',
            showCancel: false
          });
          return;
        }
        
        if (!result.price) {
          console.error('❌ 云函数没有返回 price！');
          wx.showModal({
            title: '订单创建失败',
            content: '云函数没有返回订单价格，请联系管理员',
            showCancel: false
          });
          return;
        }
        
        // 调用微信支付，使用订单创建时保存的价格（不是当前活动价格）
        console.log('💡 使用订单价格发起支付:', result.price, '元');
        await this.callWechatPay(result.orderId, result.orderNo, result.price);
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
  },

  // 调用微信支付
  async callWechatPay(orderId, orderNo, totalPrice) {
    console.log('========================================');
    console.log('💰 开始调用微信支付...');
    console.log('   订单ID:', orderId);
    console.log('   订单号:', orderNo);
    console.log('   金额(元):', totalPrice);
    console.log('   金额类型:', typeof totalPrice);
    console.log('   转换后的金额(分):', Math.round(totalPrice * 100));
    console.log('========================================');

    // 真实支付流程
    try {
      wx.showLoading({ title: '正在调起支付...', mask: true });

      const totalFee = Math.round(totalPrice * 100); // 转换为分
      
      // 准备云函数参数
      const unifiedOrderParams = {
        orderNo: orderNo,
        totalFee: totalFee,  // 必须是数字，单位：分
        description: this.data.activity.title || '次元学校-证件照拍摄'
      };
      
      console.log('========================================');
      console.log('☁️ 准备调用 unifiedOrder 云函数');
      console.log('   参数类型检查:');
      console.log('   - orderNo:', typeof orderNo, '=', orderNo);
      console.log('   - totalFee:', typeof totalFee, '=', totalFee);
      console.log('   - description:', typeof unifiedOrderParams.description, '=', unifiedOrderParams.description);
      console.log('   完整参数:', JSON.stringify(unifiedOrderParams, null, 2));
      console.log('========================================');
      
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedOrder',
        data: unifiedOrderParams
      });

      console.log('========================================');
      console.log('☁️ unifiedOrder 返回结果:');
      console.log('   result.success:', result.success);
      console.log('   result.result:', result.result);
      console.log('   完整 JSON:', JSON.stringify(result, null, 2));
      
      // 展开 result.result 的所有键
      if (result.result) {
        console.log('   result.result 的所有键:', Object.keys(result.result));
        for (let key in result.result) {
          console.log(`   result.result.${key}:`, result.result[key]);
        }
      }
      console.log('========================================');

      if (!result.success) {
        throw new Error(result.errMsg || '统一下单失败');
      }

      // 兼容不同的返回结构
      let paymentResult;
      
      if (result.result && result.result.payment) {
        // 结构1: { success: true, result: { payment: {...} } }
        paymentResult = result.result.payment;
        console.log('📦 支付参数来源: result.result.payment');
      } else if (result.result && result.result.timeStamp) {
        // 结构2: { success: true, result: { timeStamp, nonceStr, ... } }
        paymentResult = result.result;
        console.log('📦 支付参数来源: result.result');
      } else if (result.payment) {
        // 结构3: { success: true, payment: {...} }
        paymentResult = result.payment;
        console.log('📦 支付参数来源: result.payment');
      } else {
        console.error('❌ 无法找到支付参数！');
        console.error('   返回结构:', result);
        throw new Error('云函数返回的支付参数格式错误');
      }

      console.log('💳 支付参数:', paymentResult);
      console.log('   timeStamp:', paymentResult.timeStamp);
      console.log('   nonceStr:', paymentResult.nonceStr);
      console.log('   package:', paymentResult.package);

      // 验证支付参数完整性
      if (!paymentResult.timeStamp || !paymentResult.nonceStr || !paymentResult.package) {
        console.error('❌ 支付参数不完整！');
        throw new Error('支付参数缺失必要字段');
      }

      wx.hideLoading();

      // 调起微信支付
      console.log('💰 调起微信支付...');
      await wx.requestPayment({
        timeStamp: paymentResult.timeStamp,
        nonceStr: paymentResult.nonceStr,
        package: paymentResult.package,
        signType: paymentResult.signType || 'MD5',
        paySign: paymentResult.paySign
      });

      console.log('✅ 支付成功！');
      
      // 支付成功后跳转
      wx.showToast({
        title: '支付成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/user/orders/orders'
        });
      }, 2000);

    } catch (err) {
      console.error('❌ 支付失败:', err);
      wx.hideLoading();

      // 用户取消支付
      if (err.errMsg && err.errMsg.includes('cancel')) {
        wx.showModal({
          title: '支付取消',
          content: '您取消了支付，订单已创建但未支付。\n\n可在"我的订单"中继续支付。',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            wx.navigateTo({
              url: '/pages/user/orders/orders'
            });
          }
        });
      } else {
        // 支付失败
        wx.showModal({
          title: '支付失败',
          content: err.errMsg || '支付过程中出现错误，请稍后重试。\n\n订单已创建，可在"我的订单"中继续支付。',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            wx.navigateTo({
              url: '/pages/user/orders/orders'
            });
          }
        });
      }
    }
  }
});
