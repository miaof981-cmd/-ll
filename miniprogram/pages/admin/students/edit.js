// pages/admin/students/edit.js
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    studentId: '', // 编辑时的学号
    isEdit: false,
    formData: {
      name: '',
      gender: '',
      age: '',
      avatar: '', // 证件照
      parentName: '',
      parentPhone: '',
      parentWechat: '',
      expectations: ''
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
            gender: student.gender || '',
            age: student.age || '',
            avatar: student.avatar || '',
            parentName: student.parentName,
            parentPhone: student.parentPhone || '',
            parentWechat: student.parentWechat || '',
            expectations: student.expectations || ''
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

  // 选择性别
  selectGender(e) {
    this.setData({
      'formData.gender': e.currentTarget.dataset.gender
    });
  },

  // 输入年龄
  onAgeInput(e) {
    this.setData({
      'formData.age': e.detail.value
    });
  },

  // 上传证件照
  uploadAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...' });

        try {
          // 上传到云存储
          const timestamp = Date.now();
          const cloudPath = `avatars/${this.data.studentId || timestamp}_${Math.random().toString(36).slice(2)}.jpg`;

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          console.log('✅ 证件照上传成功:', uploadResult.fileID);

          this.setData({
            'formData.avatar': uploadResult.fileID
          });

          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch (e) {
          console.error('❌ 上传证件照失败:', e);
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 输入家长姓名
  onParentNameInput(e) {
    this.setData({
      'formData.parentName': e.detail.value
    });
  },

  // 输入家长电话
  onParentPhoneInput(e) {
    this.setData({
      'formData.parentPhone': e.detail.value
    });
  },

  // 输入家长微信
  onParentWechatInput(e) {
    this.setData({
      'formData.parentWechat': e.detail.value
    });
  },

  // 输入家长期许
  onExpectationsInput(e) {
    this.setData({
      'formData.expectations': e.detail.value
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
    const { name, gender, age, parentName, parentPhone } = this.data.formData;

    // 验证必填字段
    if (!name.trim()) {
      wx.showToast({
        title: '请输入学生姓名',
        icon: 'error'
      });
      return;
    }

    if (!gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'error'
      });
      return;
    }

    if (!age) {
      wx.showToast({
        title: '请输入年龄',
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

    if (!parentPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      if (this.data.isEdit) {
        // 更新学生信息
        const updateData = {
          name: this.data.formData.name,
          gender: this.data.formData.gender,
          age: this.data.formData.age,
          avatar: this.data.formData.avatar,
          parentName: this.data.formData.parentName,
          parentPhone: this.data.formData.parentPhone,
          parentWechat: this.data.formData.parentWechat,
          expectations: this.data.formData.expectations
        };
        
        const success = await cloudDB.updateStudent(this.data.studentId, updateData);
        
        if (!success) {
          throw new Error('更新失败');
        }
      } else {
        // 添加新学生
        const studentData = {
          name,
          gender,
          age,
          parentName,
          parentPhone,
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

      console.log('✅ 保存成功，准备返回...');
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1000
      });

      // Toast显示后自动返回
      setTimeout(() => {
        console.log('⏱️ 延迟结束，执行返回...');
        
        const pages = getCurrentPages();
        console.log('📚 当前页面栈长度:', pages.length);
        
        if (pages.length > 1) {
          // 有上一页，正常返回
          wx.navigateBack({
            success: () => {
              console.log('✅ 返回上一页成功');
            },
            fail: (err) => {
              console.error('❌ 返回失败:', err);
            }
          });
        } else {
          // 没有上一页，跳转到档案页或学生列表
          console.log('⚠️ 这是第一页，跳转到学生档案页');
          if (this.data.studentId) {
            wx.redirectTo({
              url: `/pages/records/records?studentId=${this.data.studentId}`,
              success: () => {
                console.log('✅ 跳转到档案页成功');
              }
            });
          } else {
            wx.switchTab({
              url: '/pages/my/my',
              success: () => {
                console.log('✅ 跳转到我的页面成功');
              }
            });
          }
        }
      }, 1200);

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
