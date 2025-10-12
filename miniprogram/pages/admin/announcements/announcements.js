// pages/admin/announcements/announcements.js
const storage = require('../../../utils/storage.js');

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
  loadAnnouncements() {
    const announcements = storage.getAnnouncements();
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
      success: (res) => {
        this.setData({
          'formData.coverImage': res.tempFiles[0].tempFilePath
        });
      }
    });
  },

  // 保存公告
  saveAnnouncement() {
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

    let success = false;
    
    if (this.data.editingId) {
      // 更新公告
      success = storage.updateAnnouncement(this.data.editingId, this.data.formData);
    } else {
      // 添加公告
      success = storage.addAnnouncement(this.data.formData);
    }

    if (success) {
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
  },

  // 编辑公告
  editAnnouncement(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showDialog: true,
      editingId: item.id,
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
      success: (res) => {
        if (res.confirm) {
          const success = storage.deleteAnnouncement(id);

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
