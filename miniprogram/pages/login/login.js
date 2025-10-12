// pages/login/login.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    studentId: '',
    password: '',
    loginType: 'parent',
    loading: false
  },

  onLoad() {
    console.log("登录页加载");
  },

  // 输入学号
  onStudentIdInput(e) {
    this.setData({
      studentId: e.detail.value
    });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换登录类型
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type,
      studentId: '',
      password: ''
    });
  },

  // 登录
  handleLogin() {
    const { studentId, password, loginType } = this.data;

    if (!studentId.trim()) {
      wx.showToast({
        title: loginType === 'parent' ? '请输入学号' : '请输入用户名',
        icon: 'error'
      });
      return;
    }

    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'error'
      });
      return;
    }

    this.setData({ loading: true });

    // 验证登录
    let isValid = false;
    let userInfo = null;
    
    if (loginType === 'admin') {
      // 管理员登录
      isValid = studentId === 'admin' && password === 'admin123';
      if (isValid) {
        userInfo = {
          studentId: 'admin',
          name: '管理员'
        };
      }
    } else {
      // 学生/家长登录 - 从本地存储验证
      const students = storage.getStudents();
      const student = students.find(s => s.studentId === studentId.trim());
      
      if (student) {
        // 验证密码（默认密码是123456，或用户修改后的密码）
        const correctPassword = student.password || '123456';
        isValid = password === correctPassword;
        
        if (isValid) {
          userInfo = {
            studentId: student.studentId,
            name: student.name,
            parentName: student.parentName
          };
        }
      }
    }

    this.setData({ loading: false });

    if (isValid && userInfo) {
      const app = getApp();
      app.globalData.userInfo = userInfo;
      app.globalData.isAdmin = loginType === 'admin';

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        if (loginType === 'admin') {
          // 管理员跳转到管理后台
          wx.navigateTo({
            url: '/pages/admin/admin'
          });
        } else {
          // 学生/家长跳转到档案页面
          wx.navigateTo({
            url: '/pages/records/records'
          });
        }
      }, 1500);
    } else {
      wx.showToast({
        title: '学号或密码错误',
        icon: 'error'
      });
    }
  },

  // 忘记密码
  forgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '学生默认密码为：123456\n\n如需修改密码，请联系学校管理员\n电话：0755-12345678',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
