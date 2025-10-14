// pages/role-select/role-select.js - 角色选择页面
Page({
  data: {
    userInfo: null,
    roles: [],
    roleConfig: {
      'parent': {
        name: '家长',
        icon: '👨‍👩‍👧‍👦',
        desc: '查看孩子档案、申请入学、活动报名',
        color: '#3b82f6'
      },
      'admin': {
        name: '管理员',
        icon: '⚙️',
        desc: '管理后台、活动管理、数据统计',
        color: '#ef4444'
      },
      'photographer': {
        name: '摄影师',
        icon: '📷',
        desc: '查看订单、上传作品、管理任务',
        color: '#10b981'
      }
    }
  },

  onLoad() {
    this.loadUserRoles();
  },

  // 加载用户角色
  loadUserRoles() {
    try {
      const userInfo = wx.getStorageSync('unifiedUserInfo');
      const roles = wx.getStorageSync('userRoles') || [];
      
      this.setData({
        userInfo,
        roles
      });
      
      console.log('✅ 用户拥有角色:', roles);
    } catch (e) {
      console.error('❌ 加载角色失败:', e);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 选择角色
  selectRole(e) {
    const { role } = e.currentTarget.dataset;
    
    wx.showLoading({ title: '切换中...' });
    
    try {
      // 保存当前选择的角色
      wx.setStorageSync('currentRole', role);
      
      // 更新全局数据
      const app = getApp();
      app.globalData.currentRole = role;
      app.globalData.isAdmin = role === 'admin';
      app.globalData.userInfo = this.data.userInfo;
      
      wx.hideLoading();
      
      wx.showToast({
        title: '切换成功',
        icon: 'success'
      });
      
      // 跳转到对应首页
      setTimeout(() => {
        this.navigateToHomePage(role);
      }, 1500);
      
    } catch (e) {
      console.error('❌ 切换角色失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '切换失败',
        icon: 'error'
      });
    }
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

