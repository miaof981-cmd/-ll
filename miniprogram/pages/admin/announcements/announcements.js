// pages/admin/announcements/announcements.js
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    announcements: [],
    showDialog: false,
    editingId: null,
    formData: {
      title: '',
      content: '',
      coverImage: '',
      pinned: false
    }
  },

  onLoad() {
    this.loadAnnouncements();
  },

  onShow() {
    this.loadAnnouncements();
  },

  // 加载公告列表
  async loadAnnouncements() {
    wx.showLoading({ title: '加载中...' });
    const announcements = await cloudDB.getAnnouncements();
    wx.hideLoading();
    this.setData({ announcements });
  },

  // 显示添加对话框
  showAddDialog() {
    this.setData({
      showDialog: true,
      editingId: null,
      formData: {
        title: '',
        content: '',
        coverImage: '',
        pinned: false
      }
    });
  },

  // 隐藏对话框
  hideDialog() {
    this.setData({ showDialog: false });
  },

  // 阻止冒泡
  stopPropagation() {},

  // 输入标题
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  // 输入内容
  onContentInput(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  // 切换置顶
  togglePinned() {
    this.setData({
      'formData.pinned': !this.data.formData.pinned
    });
  },

  // 上传封面图
  uploadCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({ title: '上传中...' });
        
        try {
          // 上传到云存储
          const timestamp = Date.now();
          const cloudPath = `announcements/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });
          
          console.log('✅ 封面上传成功:', uploadResult.fileID);
          
          this.setData({
            'formData.coverImage': uploadResult.fileID
          });
          
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch (e) {
          console.error('❌ 上传失败:', e);
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 保存公告
  async saveAnnouncement() {
    const { title, content } = this.data.formData;

    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'error'
      });
      return;
    }

    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    try {
      const announcementData = {
        ...this.data.formData,
        _id: this.data.editingId || undefined
      };
      
      const result = await cloudDB.saveAnnouncement(announcementData);
      
      wx.hideLoading();
      
      if (result) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        this.hideDialog();
        this.loadAnnouncements();
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('❌ 保存公告失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 编辑公告
  editAnnouncement(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showDialog: true,
      editingId: item._id,  // 使用云数据库的_id
      formData: {
        title: item.title,
        content: item.content,
        coverImage: item.coverImage || '',
        pinned: item.pinned || false
      }
    });
  },

  // 删除公告
  deleteAnnouncement(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          const success = await cloudDB.deleteAnnouncement(id);
          wx.hideLoading();

          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadAnnouncements();
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
});
