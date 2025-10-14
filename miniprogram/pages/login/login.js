// pages/login/login.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    studentId: '',
    password: '',
    loginType: 'parent',
    loading: false,
    hasApplication: false, // 是否已有申请
    applicationId: '' // 申请ID
  },

  onLoad() {
    console.log("登录页加载");
    this.checkApplication();
  },

  onShow() {
    // 每次显示时检查是否有申请
    this.checkApplication();
  },

  // 检查是否有申请记录
  async checkApplication() {
    try {
      const applications = await cloudDB.getApplications();
      if (applications.length > 0) {
        // 获取最新的申请
        const latestApp = applications[applications.length - 1];
        this.setData({
          hasApplication: true,
          applicationId: latestApp._id || latestApp.id
        });
      } else {
        this.setData({
          hasApplication: false,
          applicationId: ''
        });
      }
    } catch (e) {
      console.error('❌ 检查申请记录失败:', e);
    }
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
  async handleLogin() {
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
    wx.showLoading({ title: '登录中...' });

    try {
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
        // 学生/家长登录 - 从云数据库验证
        const students = await cloudDB.getStudents();
        
        console.log('✅ 获取学生数据:', students.length);
        
        const student = students.find(s => s.studentId === studentId.trim());
        
        if (student) {
          console.log('✅ 找到学生:', student);
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
        } else {
          console.log('❌ 未找到学生:', studentId);
        }
      }

      this.setData({ loading: false });
      wx.hideLoading();

      if (isValid && userInfo) {
        const app = getApp();
        app.globalData.userInfo = userInfo;
        app.globalData.isAdmin = loginType === 'admin';

        // 持久化存储登录状态
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('isAdmin', loginType === 'admin');

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
    } catch (e) {
      console.error('❌ 登录失败:', e);
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({
        title: '登录失败',
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
  },

  // 跳转到申请入学页面或查看进度
  goToApply() {
    if (this.data.hasApplication) {
      // 如果已有申请，跳转到状态查看页面
      wx.navigateTo({
        url: '/pages/apply/status?id=' + this.data.applicationId
      });
    } else {
      // 否则跳转到申请页面
      wx.navigateTo({
        url: '/pages/apply/apply'
      });
    }
  }
});
