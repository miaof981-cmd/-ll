// pages/records/records.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    userInfo: null,
    records: {
      reportCards: [],
      punishments: [],
      images: []
    },
    activeTab: 'grades', // grades, punishments, images
    loading: true,
    isEditing: false,     // 编辑模式
    isAdmin: false,       // 是否管理员
    studentId: '',        // 学生学号
    
    // 新增档案弹窗
    showAddDialog: false,
    addRecordType: 'grade',
    newRecord: {}
  },

  onLoad(options) {
    // 检查是否管理员
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || false;
    this.setData({ isAdmin });
    
    // 支持从URL参数传入studentId（管理员查看档案）
    if (options.studentId) {
      this.setData({ studentId: options.studentId });
      this.loadStudentRecords(options.studentId);
    } else {
      this.checkLogin();
    }
  },

  onShow() {
    // 不自动刷新，避免覆盖管理员查看的档案
  },

  // 检查登录状态
  checkLogin() {
    // 从持久化存储读取登录状态
    let userInfo = null;
    try {
      userInfo = wx.getStorageSync('userInfo');
    } catch (e) {
      console.error('读取登录状态失败:', e);
    }

    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/my/my'
          });
        }
      });
      return;
    }

    const app = getApp();
    app.globalData.userInfo = userInfo;

    this.setData({ userInfo });
    this.loadStudentRecords(userInfo.studentId);
  },

  // 加载指定学生的档案
  async loadStudentRecords(studentId) {
    console.log('📡 加载学生档案:', studentId);
    wx.showLoading({ title: '加载中...' });

    try {
      const student = await cloudDB.getStudentById(studentId);
      
      if (!student) {
        wx.hideLoading();
        wx.showToast({
          title: '学生不存在',
          icon: 'error'
        });
        return;
      }

      // 获取档案记录
      const allRecords = await cloudDB.getRecords(studentId);
      console.log('✅ 档案记录数量:', allRecords.length);
      
      // 分类档案
      const records = {
        reportCards: allRecords.filter(r => r.type === 'grade'),
        punishments: allRecords.filter(r => r.type === 'punishment'),
        images: allRecords.filter(r => r.type === 'image')
      };

      this.setData({
        userInfo: {
          studentId: student.studentId,
          name: student.name
        },
        student: student, // 完整的学生信息（包含证件照、性别、年龄、班级等）
        studentId: student.studentId,
        records,
        loading: false
      });

      wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载档案失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 切换编辑模式
  toggleEdit() {
    this.setData({
      isEditing: !this.data.isEditing
    });
  },

  // 显示添加档案弹窗
  showAddRecordDialog() {
    wx.showActionSheet({
      itemList: ['添加成绩', '添加处分', '添加图片档案'],
      success: (res) => {
        const types = ['grade', 'punishment', 'image'];
        this.setData({
          showAddDialog: true,
          addRecordType: types[res.tapIndex],
          newRecord: {}
        });
      }
    });
  },

  // 关闭添加弹窗
  closeAddDialog() {
    this.setData({
      showAddDialog: false,
      newRecord: {}
    });
  },

  // 输入新档案数据
  onRecordInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`newRecord.${field}`]: value
    });
  },

  // 上传档案图片
  uploadRecordImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });

        try {
          const timestamp = Date.now();
          const cloudPath = `records/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          this.setData({
            'newRecord.imageUrl': uploadResult.fileID
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

  // 保存新档案
  async saveNewRecord() {
    const { addRecordType, newRecord, studentId } = this.data;

    // 验证必填字段
    if (addRecordType === 'grade' && (!newRecord.term || !newRecord.chinese)) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (addRecordType === 'punishment' && !newRecord.reason) {
      wx.showToast({
        title: '请填写处分原因',
        icon: 'none'
      });
      return;
    }

    if (addRecordType === 'image' && (!newRecord.title || !newRecord.imageUrl)) {
      wx.showToast({
        title: '请填写标题并上传图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const recordData = {
        type: addRecordType,
        ...newRecord
      };

      // 补充字段
      if (addRecordType === 'grade') {
        recordData.chinese = parseFloat(newRecord.chinese) || 0;
        recordData.math = parseFloat(newRecord.math) || 0;
        recordData.english = parseFloat(newRecord.english) || 0;
        
        // 计算平均分
        const total = recordData.chinese + recordData.math + recordData.english;
        const count = [recordData.chinese, recordData.math, recordData.english].filter(s => s > 0).length;
        recordData.average = count > 0 ? (total / count).toFixed(1) : '-';
      }

      await cloudDB.addRecord(studentId, recordData);

      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      this.closeAddDialog();
      this.loadStudentRecords(studentId);
    } catch (e) {
      console.error('❌ 添加档案失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
    }
  },

  // 删除档案记录
  deleteRecord(e) {
    const { id, type } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条档案记录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            // 调用云数据库删除
            const db = wx.cloud.database();
            await db.collection(`records:${this.data.studentId}`)
              .doc(id)
              .remove();

            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            this.loadStudentRecords(this.data.studentId);
          } catch (e) {
            console.error('❌ 删除失败:', e);
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

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 查看图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.records.images.map(img => img.url);
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        }
      }
    });
  }
});
