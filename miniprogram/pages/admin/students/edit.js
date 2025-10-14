// pages/admin/students/edit.js
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    studentId: '', // 编辑时的学号
    isEdit: false,
    formData: {
      name: '',
      parentName: '',
      admissionLetter: ''
    },
    initRecords: [] // 初始档案记录
  },

  onLoad(options) {
    if (options.studentId) {
      // 编辑模式
      this.setData({
        studentId: options.studentId,
        isEdit: true
      });
      this.loadStudent(options.studentId);
    }
  },

  // 加载学生信息
  async loadStudent(studentId) {
    console.log('📡 加载学生信息:', studentId);
    wx.showLoading({ title: '加载中...' });

    try {
      const student = await cloudDB.getStudentById(studentId);

      wx.hideLoading();

      if (student) {
        console.log('✅ 学生信息:', student);
        this.setData({
          formData: {
            name: student.name,
            parentName: student.parentName,
            admissionLetter: student.admissionLetter || ''
          }
        });
      } else {
        wx.showToast({
          title: '学生不存在',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('❌ 加载学生失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 输入学生姓名
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  // 输入家长姓名
  onParentNameInput(e) {
    this.setData({
      'formData.parentName': e.detail.value
    });
  },

  // 上传录取通知书
  uploadAdmissionLetter() {
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
          const cloudPath = `admissions/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          console.log('✅ 录取通知书上传成功:', uploadResult.fileID);

          this.setData({
            'formData.admissionLetter': uploadResult.fileID
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

  // 添加档案记录
  addRecord() {
    wx.showActionSheet({
      itemList: ['成绩单', '图片档案', '处分单'],
      success: (res) => {
        const types = ['grade', 'image', 'punishment'];
        const type = types[res.tapIndex];
        
        const record = {
          tempId: Date.now().toString(),
          type: type,
          data: {}
        };
        
        const initRecords = this.data.initRecords;
        initRecords.push(record);
        this.setData({ initRecords });
      }
    });
  },

  // 删除档案记录
  deleteRecord(e) {
    const { index } = e.currentTarget.dataset;
    const initRecords = this.data.initRecords;
    initRecords.splice(index, 1);
    this.setData({ initRecords });
  },

  // 设置档案字段值
  setRecordField(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    const updateKey = `initRecords[${index}].data.${field}`;
    const updateData = {};
    updateData[updateKey] = value;
    
    this.setData(updateData);
  },

  // 上传档案图片
  uploadRecordImage(e) {
    const { index } = e.currentTarget.dataset;
    
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
          const cloudPath = `records/${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          console.log('✅ 档案图片上传成功:', uploadResult.fileID);

          const updateKey = `initRecords[${index}].data.imageUrl`;
          const updateData = {};
          updateData[updateKey] = uploadResult.fileID;

          this.setData(updateData);

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

  // 保存学生
  async saveStudent() {
    const { name, parentName, admissionLetter } = this.data.formData;

    // 验证必填字段
    if (!name.trim()) {
      wx.showToast({
        title: '请输入学生姓名',
        icon: 'error'
      });
      return;
    }

    if (!parentName.trim()) {
      wx.showToast({
        title: '请输入家长姓名',
        icon: 'error'
      });
      return;
    }

    if (!this.data.isEdit && !admissionLetter) {
      wx.showToast({
        title: '请上传录取通知书',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      if (this.data.isEdit) {
        // 更新学生信息
        const success = await cloudDB.updateStudent(this.data.studentId, this.data.formData);
        
        if (!success) {
          throw new Error('更新失败');
        }
      } else {
        // 添加新学生
        const studentData = {
          name,
          parentName,
          admissionLetter,
          password: '123456'
        };

        const newStudent = await cloudDB.saveStudent(studentData);
        
        if (!newStudent) {
          throw new Error('添加失败');
        }

        console.log('✅ 新学生添加成功:', newStudent);

        // 添加初始档案记录
        for (const record of this.data.initRecords) {
          const recordData = {
            type: record.type,
            ...record.data
          };

          // 根据类型补充必要字段
          if (record.type === 'grade') {
            recordData.term = record.data.term || '';
            recordData.chinese = parseFloat(record.data.chinese) || 0;
            recordData.math = parseFloat(record.data.math) || 0;
            recordData.english = parseFloat(record.data.english) || 0;
          } else if (record.type === 'image') {
            recordData.title = record.data.title || '';
            recordData.imageUrl = record.data.imageUrl || '';
            recordData.description = record.data.description || '';
          } else if (record.type === 'punishment') {
            recordData.type = record.data.type || '';
            recordData.reason = record.data.reason || '';
          }

          await cloudDB.addRecord(newStudent.studentId, recordData);
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('❌ 保存学生失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      });
    }
  }
});
