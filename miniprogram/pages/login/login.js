// pages/login/login.js - 统一微信授权登录
Page({
  data: {
    loading: false,
    hasAuthorized: false
  },

  onLoad() {
    console.log('📱 统一登录页加载');
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
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
    this.setData({ loading: true });
    
    try {
      // 1. 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      
      console.log('✅ 获取微信信息成功:', userInfo.nickName);
      
      // 2. 调用云函数进行登录和角色识别
      wx.showLoading({ title: '登录中...' });
      
      const res = await wx.cloud.callFunction({
        name: 'unifiedLogin',
        data: { userInfo }
      });
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const { user, roles } = res.result;
        
        console.log('✅ 登录成功');
        console.log('👤 用户角色:', roles);
        
        // 3. 保存用户信息
        wx.setStorageSync('unifiedUserInfo', user);
        wx.setStorageSync('userRoles', roles);
        
        // 4. 处理角色跳转
        if (roles.length === 1) {
          // 单一角色
          const role = roles[0];
          wx.setStorageSync('currentRole', role);
          
          // 更新全局数据
          const app = getApp();
          app.globalData.userInfo = user;
          app.globalData.currentRole = role;
          app.globalData.isAdmin = role === 'admin';
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            // 家长角色检查是否有孩子
            if (role === 'parent' && (!user.children || user.children.length === 0)) {
              // 未入学，引导申请
              this.showEnrollmentGuide();
            } else {
              // 已入学或其他角色，正常跳转
              this.navigateToHomePage(role);
            }
          }, 1500);
        } else {
          // 多角色，跳转到角色选择页
          wx.navigateTo({
            url: '/pages/role-select/role-select'
          });
        }
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
