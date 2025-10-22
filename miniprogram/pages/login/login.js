// pages/login/login.js - 统一微信授权登录
Page({
  data: {
    loading: false,
    hasAuthorized: false,
    avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0', // 默认头像
    nickName: '',
    isEditMode: false // 是否为编辑模式
  },

  onLoad(options) {
    console.log('📱 统一登录页加载');
    
    // 检查是否为编辑模式
    if (options && options.mode === 'edit') {
      console.log('🔧 进入编辑模式');
      this.setData({ isEditMode: true });
      
      // 加载当前用户信息
      const userInfo = wx.getStorageSync('unifiedUserInfo');
      if (userInfo) {
        console.log('加载用户信息:', userInfo);
        this.setData({
          avatarUrl: userInfo.avatarUrl || this.data.avatarUrl,
          nickName: userInfo.nickName || ''
        });
      }
    } else {
      this.checkLoginStatus();
    }
  },

  onShow() {
    // 编辑模式下不检查登录状态（避免自动跳转）
    if (!this.data.isEditMode) {
      this.checkLoginStatus();
    }
  },
  
  // 选择头像
  onChooseAvatar(e) {
    console.log('========================================');
    console.log('📸 用户选择头像');
    console.log('avatarUrl:', e.detail.avatarUrl);
    console.log('========================================');
    
    this.setData({
      avatarUrl: e.detail.avatarUrl
    });
  },

  // 输入昵称
  onNicknameInput(e) {
    console.log('========================================');
    console.log('✏️ 用户输入昵称');
    console.log('nickName:', e.detail.value);
    console.log('========================================');
    
    this.setData({
      nickName: e.detail.value
    });
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('unifiedUserInfo');
      const currentRole = wx.getStorageSync('currentRole');
      
      if (userInfo && currentRole) {
        console.log('✅ 已登录，角色:', currentRole);
        this.setData({ hasAuthorized: true });
        // 自动跳转到对应首页
        this.navigateToHomePage(currentRole);
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
    }
  },

  // 微信授权登录
  async wechatLogin() {
    const { avatarUrl, nickName } = this.data;
    
    // 验证昵称
    if (!nickName || nickName.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      console.log('========================================');
      console.log('🚀 开始微信登录流程...');
      console.log('📸 头像:', avatarUrl);
      console.log('✏️ 昵称:', nickName);
      console.log('========================================');
      
      wx.showLoading({ title: '上传头像中...' });
      
      // 1. 上传头像到云存储
      let uploadedAvatarUrl = avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        console.log('☁️ 上传头像到云存储...');
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: avatarUrl
        });
        uploadedAvatarUrl = uploadResult.fileID;
        console.log('✅ 头像上传成功:', uploadedAvatarUrl);
      }
      
      // 2. 调用云函数进行登录
      wx.showLoading({ title: '登录中...' });
      
      const res = await wx.cloud.callFunction({
        name: 'unifiedLogin',
        data: { 
          userInfo: {
            nickName: nickName.trim(),
            avatarUrl: uploadedAvatarUrl
          }
        }
      });
      
      console.log('☁️ unifiedLogin 返回:', res.result);
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const { user, roles } = res.result;
        
        console.log('✅ 登录成功');
        console.log('👤 用户信息:', user);
        console.log('👤 用户角色:', roles);
        console.log('📋 云函数完整返回:', res.result);
        
        // 3. 保存用户信息和所有角色
        wx.setStorageSync('unifiedUserInfo', user);
        wx.setStorageSync('userRoles', roles);
        
        // 4. 设置默认当前角色（优先级：admin > photographer > parent）
        let currentRole = 'parent'; // 默认为家长
        if (roles.includes('admin')) {
          currentRole = 'admin';
        } else if (roles.includes('photographer')) {
          currentRole = 'photographer';
        }
        wx.setStorageSync('currentRole', currentRole);
        
        console.log('💾 已保存到本地存储:');
        console.log('  currentRole:', currentRole);
        console.log('  userRoles:', roles);
        
        // 更新全局数据
        const app = getApp();
        app.globalData.userInfo = user;
        app.globalData.currentRole = currentRole;
        app.globalData.userRoles = roles;
        app.globalData.isAdmin = roles.includes('admin');
        
        wx.showToast({
          title: this.data.isEditMode ? '资料已更新' : '登录成功',
          icon: 'success'
        });
        
        // 5. 根据模式决定跳转
        setTimeout(() => {
          if (this.data.isEditMode) {
            // 编辑模式：返回上一页（我的页面）
            wx.navigateBack();
          } else {
            // 登录模式：跳转到"我的"页面
            wx.switchTab({
              url: '/pages/my/my'
            });
          }
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.error || '登录失败',
          icon: 'error'
        });
      }
      
    } catch (e) {
      console.error('❌ 登录失败:', e);
      wx.hideLoading();
      
      if (e.errMsg && e.errMsg.includes('cancel')) {
        wx.showToast({
          title: '已取消授权',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // 引导申请入学
  showEnrollmentGuide() {
    wx.showModal({
      title: '欢迎加入',
      content: '检测到您还未绑定孩子信息\n\n请先完成入学申请，审核通过后即可查看孩子档案',
      confirmText: '去申请',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/apply/apply'
          });
        } else {
          // 仍然进入个人中心，但会显示"未入学"状态
          wx.reLaunch({
            url: '/pages/my/my'
          });
        }
      }
    });
  },

  // 根据角色跳转到对应首页
  navigateToHomePage(role) {
    const homePageMap = {
      'parent': '/pages/my/my',
      'admin': '/pages/admin/admin',
      'photographer': '/pages/photographer/tasks'
    };
    
    const url = homePageMap[role] || '/pages/my/my';
    
    wx.reLaunch({ url });
  }
});
