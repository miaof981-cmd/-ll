// 权限验证和用户管理

const Auth = {
  // 默认管理员账号
  defaultAccounts: {
    admin: {
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: '系统管理员',
      avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ef4444" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32"%3E管%3C/text%3E%3C/svg%3E'
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
        avatar: account.avatar || '',
        loginTime: new Date().toISOString()
      };
      Storage.set('currentUser', user);
      return { success: true, user };
    }

    // 检查摄影师账号
    if (role === 'photographer') {
      const photographers = Storage.getPhotographers();
      console.log('尝试登录摄影师账号');
      console.log('输入用户名:', username);
      console.log('所有摄影师:', photographers);
      
      const photographer = photographers.find(p => 
        p.username === username && p.password === password
      );
      
      console.log('找到的摄影师:', photographer);
      
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
  
  // 检查并重定向到正确的页面
  redirectToCorrectDashboard() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    const currentPage = window.location.pathname.split('/').pop();
    
    // 摄影师只能访问摄影师页面
    if (user.role === 'photographer') {
      if (currentPage !== 'photographer-dashboard.html' && currentPage !== 'index.html') {
        window.location.href = 'photographer-dashboard.html';
      }
    } 
    // 管理员和客服不能访问摄影师页面
    else if (currentPage === 'photographer-dashboard.html') {
      window.location.href = 'dashboard.html';
    }
  },

  // 添加或更新摄影师账号
  addOrUpdatePhotographerAccount(userAccount) {
    // 从localStorage获取摄影师账号列表
    let photographerAccounts = JSON.parse(localStorage.getItem('photographerAccounts') || '[]');
    
    // 检查是否已存在
    const existingIndex = photographerAccounts.findIndex(acc => acc.photographerId === userAccount.photographerId);
    
    if (existingIndex >= 0) {
      // 更新现有账号
      photographerAccounts[existingIndex] = userAccount;
    } else {
      // 添加新账号
      photographerAccounts.push(userAccount);
    }
    
    // 保存到localStorage
    localStorage.setItem('photographerAccounts', JSON.stringify(photographerAccounts));
    
    return true;
  },
  
  // 获取所有摄影师账号（用于登录验证）
  getPhotographerAccounts() {
    return JSON.parse(localStorage.getItem('photographerAccounts') || '[]');
  },
  
  // 删除摄影师账号
  deletePhotographerAccount(photographerId) {
    let photographerAccounts = JSON.parse(localStorage.getItem('photographerAccounts') || '[]');
    photographerAccounts = photographerAccounts.filter(acc => acc.photographerId !== photographerId);
    localStorage.setItem('photographerAccounts', JSON.stringify(photographerAccounts));
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

