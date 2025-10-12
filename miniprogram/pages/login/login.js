// pages/login/login.js
Page({
  data: {
    studentId: '',
    password: '',
    loginType: 'parent', // parent 或 admin
    loading: false
  },

  onLoad(options) {
    // 如果从其他页面传来登录类型
    if (options.type) {
      this.setData({
        loginType: options.type
      });
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

    try {
      const app = getApp();
      if (app.globalData.useCloud) {
        // 调用云函数进行登录
        const res = await wx.cloud.callFunction({
          name: 'userLogin',
          data: {
            studentId: studentId.trim(),
            password: password.trim(),
            type: loginType
          }
        });

        if (res.result && res.result.success) {
          // 登录成功
          const app = getApp();
          app.globalData.userInfo = res.result.userInfo;
          app.globalData.isAdmin = loginType === 'admin';

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });

          // 跳转到相应页面
          setTimeout(() => {
            if (loginType === 'admin') {
              wx.navigateTo({
                url: '/pages/admin/admin'
              });
            } else {
              wx.navigateTo({
                url: '/pages/records/records'
              });
            }
          }, 1500);

        } else {
          // 登录失败 - 使用模拟登录
          this.mockLogin();
        }
      } else {
        // 登录成功
        this.mockLogin();
      }
    } catch (error) {
      console.error('登录失败:', error);
      // 使用模拟登录
      this.mockLogin();
    } finally {
      this.setData({ loading: false });
    }
  },

  // 模拟登录（用于演示）
  mockLogin() {
    const { studentId, password, loginType } = this.data;

    // 模拟验证
    let isValid = false;
    if (loginType === 'admin') {
      isValid = studentId === 'admin' && password === 'admin123';
    } else {
      isValid = studentId === '20230001' && password === '123456';
    }

    if (isValid) {
      const app = getApp();
      app.globalData.userInfo = {
        studentId: studentId,
        name: loginType === 'admin' ? '管理员' : '张三家长'
      };
      app.globalData.isAdmin = loginType === 'admin';

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        if (loginType === 'admin') {
          wx.navigateTo({
            url: '/pages/admin/admin'
          });
        } else {
          wx.navigateTo({
            url: '/pages/records/records'
          });
        }
      }, 1500);
    } else {
      wx.showToast({
        title: '用户名或密码错误',
        icon: 'error'
      });
    }
  },

  // 忘记密码
  forgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系学校管理员重置密码\n电话：0755-12345678',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
