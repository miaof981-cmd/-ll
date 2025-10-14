// pages/admin/admins/edit.js - 管理员编辑
Page({
  data: {
    mode: 'add', // add | edit
    adminId: '',
    formData: {
      openid: '',
      name: '',
      phone: '',
      permissions: ['all'],
      isActive: true
    },
    permissionOptions: [
      { value: 'all', label: '所有权限', checked: true },
      { value: 'student', label: '学生管理', checked: false },
      { value: 'photographer', label: '摄影师管理', checked: false },
      { value: 'activity', label: '活动管理', checked: false },
      { value: 'content', label: '内容管理', checked: false }
    ],
    showOpenidTip: false
  },

  onLoad(options) {
    const { mode, id } = options;
    this.setData({ 
      mode,
      adminId: id || ''
    });

    if (mode === 'edit' && id) {
      this.loadAdminData(id);
    }

    // 设置标题
    wx.setNavigationBarTitle({
      title: mode === 'add' ? '添加管理员' : '编辑管理员'
    });
  },

  // 加载管理员数据
  async loadAdminData(id) {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      const { data } = await db.collection('admin_list').doc(id).get();
      
      // 更新权限选项
      const permissionOptions = this.data.permissionOptions.map(opt => ({
        ...opt,
        checked: data.permissions.includes(opt.value)
      }));
      
      this.setData({
        formData: data,
        permissionOptions
      });
      
      console.log('✅ 管理员数据:', data);
    } catch (error) {
      console.error('❌ 加载失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 表单输入
  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ 'formData.phone': e.detail.value });
  },

  onOpenidInput(e) {
    this.setData({ 'formData.openid': e.detail.value });
  },

  // 显示 OpenID 提示
  showOpenidHelp() {
    this.setData({ showOpenidTip: true });
  },

  hideOpenidTip() {
    this.setData({ showOpenidTip: false });
  },

  // 权限选择
  onPermissionChange(e) {
    const values = e.detail.value;
    const permissionOptions = this.data.permissionOptions.map(opt => ({
      ...opt,
      checked: values.includes(opt.value)
    }));
    
    this.setData({
      'formData.permissions': values,
      permissionOptions
    });
  },

  // 状态切换
  onStatusChange(e) {
    this.setData({ 'formData.isActive': e.detail.value });
  },

  // 保存
  async saveAdmin() {
    const { mode, adminId, formData } = this.data;

    // 验证
    if (!formData.name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    if (mode === 'add' && !formData.openid.trim()) {
      wx.showToast({
        title: '请输入OpenID',
        icon: 'none'
      });
      return;
    }

    if (!formData.permissions || formData.permissions.length === 0) {
      wx.showToast({
        title: '请选择至少一个权限',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      const db = wx.cloud.database();
      
      if (mode === 'add') {
        // 检查 OpenID 是否已存在
        const { data: existing } = await db.collection('admin_list')
          .where({ openid: formData.openid })
          .get();
        
        if (existing.length > 0) {
          wx.showModal({
            title: '添加失败',
            content: '该OpenID已经是管理员',
            showCancel: false
          });
          return;
        }
        
        // 添加新管理员
        await db.collection('admin_list').add({
          data: {
            ...formData,
            createdAt: new Date().toISOString()
          }
        });
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        // 更新管理员
        const updateData = { ...formData };
        delete updateData._id;
        delete updateData._openid;
        delete updateData.openid; // 不允许修改 openid
        
        await db.collection('admin_list').doc(adminId).update({
          data: updateData
        });
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('❌ 保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 复制 OpenID（用于添加时参考）
  copyExampleOpenid() {
    wx.setClipboardData({
      data: 'o5_xU4wY1pz-JxOi8XdAX_O0bbHw',
      success: () => {
        wx.showToast({
          title: '示例已复制',
          icon: 'success'
        });
      }
    });
  }
});

