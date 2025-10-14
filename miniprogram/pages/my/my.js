// pages/my/my.js - 个人中心（统一登录版本）
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    userInfo: null,
    currentRole: 'parent',
    userRoles: [],
    isLoggedIn: false,
    children: [],
    isAdmin: false,
    isPhotographer: false,
    isParent: false,
    roleConfig: {
      'parent': { name: '家长', icon: '👨‍👩‍👧‍👦', color: '#3b82f6' },
      'admin': { name: '管理员', icon: '⚙️', color: '#ef4444' },
      'photographer': { name: '摄影师', icon: '📷', color: '#10b981' }
    }
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      // 加载孩子列表（如果是家长角色）
      if (this.data.userRoles.includes('parent')) {
        this.loadChildren();
      }
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('unifiedUserInfo');
      const currentRole = wx.getStorageSync('currentRole') || 'parent';
      const userRoles = wx.getStorageSync('userRoles') || [];
      
      if (userInfo) {
        // 判断用户拥有的角色
        const isAdmin = userRoles.includes('admin');
        const isPhotographer = userRoles.includes('photographer');
        const isParent = userRoles.includes('parent') || userRoles.length === 0; // 没有角色时默认为家长
        
        this.setData({
          userInfo,
          currentRole,
          userRoles,
          isLoggedIn: true,
          isAdmin,
          isPhotographer,
          isParent
        });
        
        // 更新全局数据
        const app = getApp();
        app.globalData.userInfo = userInfo;
        app.globalData.currentRole = currentRole;
        app.globalData.userRoles = userRoles;
        app.globalData.isAdmin = isAdmin;
      } else {
        this.setData({
          isLoggedIn: false,
          isAdmin: false,
          isPhotographer: false,
          isParent: false
        });
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
      this.setData({
        isLoggedIn: false,
        isAdmin: false,
        isPhotographer: false,
        isParent: false
      });
    }
  },

  // 加载孩子列表
  async loadChildren() {
    try {
      const userInfo = this.data.userInfo;
      if (userInfo && userInfo.children) {
        this.setData({
          children: userInfo.children
        });
      }
    } catch (e) {
      console.error('加载孩子列表失败:', e);
    }
  },

  // 切换角色
  switchRole() {
    const { userRoles } = this.data;
    
    if (userRoles.length <= 1) {
      wx.showToast({
        title: '只有一个角色',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到角色选择页
    wx.navigateTo({
      url: '/pages/role-select/role-select'
    });
  },

  // 复制 OpenID（用于添加管理员配置）
  copyOpenId() {
    const openid = this.data.userInfo?.openid;
    if (!openid) {
      wx.showToast({
        title: 'OpenID 不存在',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: openid,
      success: () => {
        wx.showToast({
          title: 'OpenID 已复制到剪贴板',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },

  // 添加孩子（跳转到入学申请）
  addChild() {
    wx.navigateTo({
      url: '/pages/apply/apply'
    });
  },

  // 查看孩子档案
  viewChildRecord(e) {
    const { studentid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/records/records?studentId=${studentid}`
    });
  },

  // 我的订单
  myOrders() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 我的活动
  myActivities() {
    wx.navigateTo({
      url: '/pages/activities/activities'
    });
  },

  // 设置
  settings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除所有登录信息
          wx.removeStorageSync('unifiedUserInfo');
          wx.removeStorageSync('currentRole');
          wx.removeStorageSync('userRoles');
          
          // 清除全局数据
          const app = getApp();
          app.globalData.userInfo = null;
          app.globalData.currentRole = null;
          app.globalData.isAdmin = false;
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  },

  // 未登录时去登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
});
