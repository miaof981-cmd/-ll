// 权限验证和用户管理

const Auth = {
  // 默认管理员账号
  defaultAccounts: {
    admin: {
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: '系统管理员'
    },
    photographer: {
      username: 'photographer',
      password: 'photo123',
      role: 'photographer',
      name: '摄影师'
    },
    service: {
      username: 'service',
      password: 'service123',
      role: 'service',
      name: '客服'
    }
  },

  // 登录
  login(username, password, role) {
    // 检查默认账号
    const account = this.defaultAccounts[role];
    if (account && account.username === username && account.password === password) {
      const user = {
        username: account.username,
        name: account.name,
        role: account.role,
        loginTime: new Date().toISOString()
      };
      Storage.set('currentUser', user);
      return { success: true, user };
    }

    // 检查摄影师账号
    if (role === 'photographer') {
      const photographers = Storage.getPhotographers();
      const photographer = photographers.find(p => 
        p.username === username && p.password === password
      );
      
      if (photographer) {
        const user = {
          username: photographer.username || photographer.name,
          name: photographer.name,
          role: 'photographer',
          photographerId: photographer.id,
          loginTime: new Date().toISOString()
        };
        Storage.set('currentUser', user);
        return { success: true, user };
      }
    }

    return { success: false, message: '用户名或密码错误' };
  },

  // 退出登录
  logout() {
    Storage.remove('currentUser');
    window.location.href = 'index.html';
  },

  // 获取当前用户
  getCurrentUser() {
    return Storage.get('currentUser');
  },

  // 检查是否已登录
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // 检查权限
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const permissions = {
      admin: ['all'],
      photographer: ['view_orders', 'update_orders', 'upload_photos'],
      service: ['view_applications', 'update_applications', 'view_students']
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  },

  // 要求登录
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  // 要求特定权限
  requirePermission(permission) {
    if (!this.requireLogin()) return false;
    
    if (!this.hasPermission(permission)) {
      alert('您没有权限访问此功能');
      return false;
    }
    return true;
  }
};

