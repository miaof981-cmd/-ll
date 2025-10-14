// pages/admin/admins/admins.js - 管理员管理
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    admins: [],
    filterStatus: 'all', // all | active | inactive
    searchKeyword: '',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'active', label: '启用中' },
      { key: 'inactive', label: '已禁用' }
    ]
  },

  onLoad() {
    this.loadAdmins();
  },

  onShow() {
    this.loadAdmins();
  },

  // 加载管理员列表
  async loadAdmins() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 构建查询条件
      let where = {};
      
      if (this.data.filterStatus === 'active') {
        where.isActive = true;
      } else if (this.data.filterStatus === 'inactive') {
        where.isActive = false;
      }
      
      if (this.data.searchKeyword) {
        where.name = db.RegExp({
          regexp: this.data.searchKeyword,
          options: 'i'
        });
      }
      
      const { data } = await db.collection('admin_list')
        .where(where)
        .orderBy('createdAt', 'desc')
        .get();
      
      this.setData({ admins: data });
      
      console.log('✅ 管理员列表:', data);
    } catch (error) {
      console.error('❌ 加载管理员失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换状态筛选
  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status }, () => {
      this.loadAdmins();
    });
  },

  // 搜索
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    this.loadAdmins();
  },

  // 添加管理员
  addAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admins/edit?mode=add'
    });
  },

  // 编辑管理员
  editAdmin(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/admins/edit?mode=edit&id=${id}`
    });
  },

  // 切换启用状态
  async toggleStatus(e) {
    const { id, active } = e.currentTarget.dataset;
    
    try {
      wx.showLoading({ title: '处理中...' });
      
      const db = wx.cloud.database();
      await db.collection('admin_list').doc(id).update({
        data: {
          isActive: !active
        }
      });
      
      wx.showToast({
        title: active ? '已禁用' : '已启用',
        icon: 'success'
      });
      
      this.loadAdmins();
    } catch (error) {
      console.error('❌ 切换状态失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除管理员
  deleteAdmin(e) {
    const { id, name } = e.currentTarget.dataset;
    
    // 获取当前登录用户信息
    const userInfo = wx.getStorageSync('unifiedUserInfo');
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除管理员"${name}"吗？此操作不可恢复。`,
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            const db = wx.cloud.database();
            
            // 检查是否删除自己
            const admin = await db.collection('admin_list').doc(id).get();
            if (admin.data.openid === userInfo.openid) {
              wx.showModal({
                title: '无法删除',
                content: '不能删除自己的管理员账号',
                showCancel: false
              });
              return;
            }
            
            await db.collection('admin_list').doc(id).remove();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            this.loadAdmins();
          } catch (error) {
            console.error('❌ 删除失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});

