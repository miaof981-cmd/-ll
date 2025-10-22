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
    loading: true, // 添加加载状态
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
      
      console.log('========================================');
      console.log('🔍 调试信息 - 我的页面加载:');
      console.log('========================================');
      console.log('📦 本地存储内容:');
      console.log('  userInfo:', JSON.stringify(userInfo, null, 2));
      console.log('  currentRole:', currentRole);
      console.log('  userRoles:', userRoles);
      console.log('');
      console.log('👤 用户信息详情:');
      if (userInfo) {
        console.log('  昵称 (nickName):', userInfo.nickName);
        console.log('  头像 (avatarUrl):', userInfo.avatarUrl);
        console.log('  OpenID (_openid):', userInfo._openid);
        console.log('  OpenID (openid):', userInfo.openid);
        console.log('  角色 (roles):', userInfo.roles);
      } else {
        console.log('  ❌ userInfo 为空！');
      }
      console.log('========================================');
      
      // 如果未登录，直接跳转到登录页面
      if (!userInfo) {
        console.log('❌ 未登录，跳转到登录页面');
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }
      
      if (userInfo) {
        // 判断用户拥有的角色
        const isAdmin = userRoles.includes('admin');
        const isPhotographer = userRoles.includes('photographer');
        const isParent = userRoles.includes('parent') || userRoles.length === 0; // 没有角色时默认为家长
        
        console.log('  isAdmin:', isAdmin);
        console.log('  isPhotographer:', isPhotographer);
        console.log('  isParent:', isParent);
        
        this.setData({
          userInfo,
          currentRole,
          userRoles,
          isLoggedIn: true,
          isAdmin,
          isPhotographer,
          isParent,
          loading: false
        });
        
        // 更新全局数据
        const app = getApp();
        app.globalData.userInfo = userInfo;
        app.globalData.currentRole = currentRole;
        app.globalData.userRoles = userRoles;
        app.globalData.isAdmin = isAdmin;
      } else {
        console.log('  未登录');
        this.setData({
          isLoggedIn: false,
          isAdmin: false,
          isPhotographer: false,
          isParent: false,
          loading: false
        });
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
      this.setData({
        isLoggedIn: false,
        isAdmin: false,
        isPhotographer: false,
        isParent: false,
        loading: false
      });
    }
  },

  // 加载孩子列表
  async loadChildren() {
    try {
      const db = wx.cloud.database();
      
      console.log('📡 开始加载孩子列表...');
      
      // 获取当前用户的 openid
      const userInfo = this.data.userInfo;
      const currentOpenId = userInfo?._openid || userInfo?.openid;
      
      if (!currentOpenId) {
        console.error('❌ 无法获取用户 openid');
        this.setData({ children: [] });
        return;
      }
      
      console.log('👤 当前用户 openid:', currentOpenId);
      
      // 从 students 集合查询当前用户的孩子
      // 必须明确使用 _openid 过滤，确保数据隔离
      const res = await db.collection('students')
        .where({
          _openid: currentOpenId
        })
        .get();
      
      console.log('✅ 查询到的孩子数量:', res.data ? res.data.length : 0);
      
      if (res.data && res.data.length > 0) {
        console.log('📋 孩子列表:', res.data);
        this.setData({
          children: res.data
        });
      } else {
        console.log('⚠️ 没有找到孩子记录');
        this.setData({
          children: []
        });
      }
    } catch (e) {
      console.error('❌ 加载孩子列表失败:', e);
      this.setData({
        children: []
      });
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

  // 刷新用户信息（重新编辑头像和昵称）
  refreshUserInfo() {
    wx.showModal({
      title: '更新资料',
      content: '将跳转到登录页重新选择头像和编辑昵称',
      confirmText: '去编辑',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页，让用户重新编辑
          wx.navigateTo({
            url: '/pages/login/login?mode=edit'
          });
        }
      }
    });
  },

  // 头像加载失败处理
  onAvatarError(e) {
    console.error('========================================');
    console.error('❌ 头像加载失败！');
    console.error('错误信息:', e.detail.errMsg);
    console.error('当前头像URL:', this.data.userInfo?.avatarUrl);
    console.error('========================================');
    
    // 使用默认头像
    this.setData({
      'userInfo.avatarUrl': 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    });
  },

  // 复制 OpenID（用于添加管理员配置）
  copyOpenId() {
    const openid = this.data.userInfo?.openid || this.data.userInfo?._openid;
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

  // 编辑生活照
  editPhotos(e) {
    const { studentid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/my/edit-photos?studentId=${studentid}`
    });
  },

  // 我的订单
  myOrders() {
    wx.navigateTo({
      url: '/pages/user/orders/orders'
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
