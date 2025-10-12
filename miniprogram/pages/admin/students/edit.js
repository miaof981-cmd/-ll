// pages/admin/students/edit.js
const storage = require('../../../utils/storage.js');

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
  loadStudent(studentId) {
    const student = storage.getStudentById(studentId);
    if (student) {
      this.setData({
        formData: {
          name: student.name,
          parentName: student.parentName,
          admissionLetter: student.admissionLetter || ''
        }
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
      success: (res) => {
        this.setData({
          'formData.admissionLetter': res.tempFiles[0].tempFilePath
        });
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
      success: (res) => {
        const updateKey = `initRecords[${index}].data.imageUrl`;
        const updateData = {};
        updateData[updateKey] = res.tempFiles[0].tempFilePath;
        
        this.setData(updateData);
      }
    });
  },

  // 保存学生
  saveStudent() {
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
        const success = storage.updateStudent(this.data.studentId, this.data.formData);
        
        if (!success) {
          throw new Error('更新失败');
        }
      } else {
        // 添加新学生
        const newStudent = storage.addStudent(this.data.formData);
        
        if (!newStudent) {
          throw new Error('添加失败');
        }

        // 添加初始档案记录
        this.data.initRecords.forEach(record => {
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

          storage.addRecord(newStudent.studentId, recordData);
        });
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
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      });
    }
  }
});
