// pages/admin/activities/activities.js
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    activities: [],
    loading: true,
    statusFilter: 'all' // all, active, inactive
  },

  async onLoad() {
    // 初始化证件照默认活动
    await cloudDB.initDefaultIDPhotoActivity();
    this.loadActivities();
  },

  onShow() {
    this.loadActivities();
  },

  // 加载活动列表（包含证件照）
  async loadActivities() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const { statusFilter } = this.data;
      const options = {};
      
      if (statusFilter !== 'all') {
        options.status = statusFilter;
      }
      
      const activities = await cloudDB.getActivities(options);
      
      this.setData({
        activities: activities || [],
        loading: false
      });
      
      wx.hideLoading();
    } catch (e) {
      console.error('加载活动失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 筛选状态
  filterStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status });
    this.loadActivities();
  },

  // 创建活动
  createActivity() {
    wx.navigateTo({
      url: '/pages/admin/activities/edit'
    });
  },

  // 编辑活动
  editActivity(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/activities/edit?id=${id}`
    });
  },

  // 删除活动
  deleteActivity(e) {
    const { id, title, isdefault } = e.currentTarget.dataset;
    
    // 检查是否为默认活动
    if (isdefault === 'true' || isdefault === true) {
      wx.showModal({
        title: '无法删除',
        content: '证件照是默认活动，不可删除。您可以编辑其价格和摄影师。',
        showCancel: false
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除活动"${title}"吗？删除后无法恢复。`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          try {
            const result = await cloudDB.deleteActivity(id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadActivities();
            } else {
              wx.showToast({
                title: result.error || '删除失败',
                icon: 'none'
              });
            }
          } catch (e) {
            console.error('删除失败:', e);
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 切换上下架状态
  toggleStatus(e) {
    const { id, status, title } = e.currentTarget.dataset;
    const newStatus = status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? '上架' : '下架';
    
    wx.showModal({
      title: `确认${actionText}`,
      content: `确定要${actionText}活动"${title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: `${actionText}中...` });
          
          try {
            const db = wx.cloud.database();
            await db.collection('activities').doc(id).update({
              data: {
                status: newStatus,
                updatedAt: new Date().toISOString()
              }
            });
            
            wx.hideLoading();
            wx.showToast({
              title: `${actionText}成功`,
              icon: 'success'
            });
            
            this.loadActivities();
          } catch (e) {
            console.error(`${actionText}失败:`, e);
            wx.hideLoading();
            wx.showToast({
              title: `${actionText}失败`,
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 查看活动详情
  viewActivity(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity/detail?id=${id}`
    });
  }
});

