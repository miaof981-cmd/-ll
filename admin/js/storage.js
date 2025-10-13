// 数据存储工具 - 与小程序共享
// 使用 localStorage 模拟小程序的 wx.setStorageSync/wx.getStorageSync

const Storage = {
  // 基础存储方法
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },

  // 获取数组数据
  getArray(key) {
    const data = this.get(key);
    return Array.isArray(data) ? data : [];
  },

  // 学生相关
  getStudents() {
    return this.getArray('students');
  },

  saveStudent(student) {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    
    if (index >= 0) {
      students[index] = { ...students[index], ...student };
    } else {
      students.push(student);
    }
    
    this.set('students', students);
    return student;
  },

  getStudentById(id) {
    const students = this.getStudents();
    return students.find(s => s.id === id);
  },

  deleteStudent(id) {
    const students = this.getStudents();
    const filtered = students.filter(s => s.id !== id);
    this.set('students', filtered);
    this.remove(`records:${id}`);
  },

  // 学生档案记录
  getRecords(studentId) {
    return this.getArray(`records:${studentId}`);
  },

  addRecord(studentId, record) {
    const records = this.getRecords(studentId);
    record.id = Date.now().toString();
    record.createdAt = new Date().toISOString();
    records.push(record);
    this.set(`records:${studentId}`, records);
    return record;
  },

  updateRecord(studentId, recordId, updates) {
    const records = this.getRecords(studentId);
    const index = records.findIndex(r => r.id === recordId);
    if (index >= 0) {
      records[index] = { ...records[index], ...updates };
      this.set(`records:${studentId}`, records);
    }
  },

  deleteRecord(studentId, recordId) {
    const records = this.getRecords(studentId);
    const filtered = records.filter(r => r.id !== recordId);
    this.set(`records:${studentId}`, filtered);
  },

  // 公告相关
  getAnnouncements() {
    return this.getArray('announcements');
  },

  saveAnnouncement(announcement) {
    const announcements = this.getAnnouncements();
    
    if (!announcement.id) {
      announcement.id = Date.now().toString();
      announcement.createdAt = new Date().toISOString();
      announcements.unshift(announcement);
    } else {
      const index = announcements.findIndex(a => a.id === announcement.id);
      if (index >= 0) {
        announcements[index] = { ...announcements[index], ...announcement };
      }
    }
    
    this.set('announcements', announcements);
    return announcement;
  },

  deleteAnnouncement(id) {
    const announcements = this.getAnnouncements();
    const filtered = announcements.filter(a => a.id !== id);
    this.set('announcements', filtered);
  },

  // 轮播图相关
  getBanners() {
    return this.getArray('banners');
  },

  saveBanner(banner) {
    const banners = this.getBanners();
    
    if (!banner.id) {
      banner.id = Date.now().toString();
      banner.createdAt = new Date().toISOString();
      banners.push(banner);
    }
    
    this.set('banners', banners);
    return banner;
  },

  deleteBanner(id) {
    const banners = this.getBanners();
    const filtered = banners.filter(b => b.id !== id);
    this.set('banners', filtered);
  },

  // 申请订单相关
  getApplications() {
    return this.getArray('applications');
  },

  saveApplication(application) {
    const applications = this.getApplications();
    
    if (!application.id) {
      application.id = 'APP' + Date.now();
      application.createdAt = new Date().toISOString();
      application.status = application.status || 'waiting_draw'; // 等待绘制
      application.statusHistory = [{
        status: 'waiting_draw',
        time: new Date().toISOString(),
        operator: 'system',
        note: '订单创建'
      }];
      applications.unshift(application);
    } else {
      const index = applications.findIndex(a => a.id === application.id);
      if (index >= 0) {
        applications[index] = { ...applications[index], ...application };
      }
    }
    
    this.set('applications', applications);
    return application;
  },

  updateApplication(id, updates) {
    const applications = this.getApplications();
    const index = applications.findIndex(a => a.id === id);
    
    if (index >= 0) {
      const app = applications[index];
      
      // 如果状态改变，记录历史
      if (updates.status && updates.status !== app.status) {
        if (!app.statusHistory) app.statusHistory = [];
        app.statusHistory.push({
          status: updates.status,
          time: new Date().toISOString(),
          operator: updates.operator || 'system',
          note: updates.statusNote || ''
        });
      }
      
      applications[index] = { ...app, ...updates, updatedAt: new Date().toISOString() };
      this.set('applications', applications);
      
      // 触发通知
      this.addNotification({
        type: 'status_change',
        applicationId: id,
        status: updates.status,
        targetRole: this.getNotificationTarget(updates.status)
      });
      
      return applications[index];
    }
    return null;
  },
  
  // 获取通知目标角色
  getNotificationTarget(status) {
    const targetMap = {
      'waiting_draw': 'photographer',
      'pending_review': 'service',
      'pending_confirm': 'parent',
      'confirmed': 'service',
      'archived': 'parent'
    };
    return targetMap[status] || 'admin';
  },

  deleteApplication(id) {
    const applications = this.getApplications();
    const filtered = applications.filter(a => a.id !== id);
    this.set('applications', filtered);
  },

  getApplicationById(id) {
    const applications = this.getApplications();
    return applications.find(a => a.id === id);
  },

  // 摄影师相关
  getPhotographers() {
    return this.getArray('photographers');
  },

  savePhotographer(photographer) {
    const photographers = this.getPhotographers();
    
    if (!photographer.id) {
      photographer.id = 'PHO' + Date.now();
      photographer.createdAt = new Date().toISOString();
      photographers.push(photographer);
    } else {
      const index = photographers.findIndex(p => p.id === photographer.id);
      if (index >= 0) {
        photographers[index] = { ...photographers[index], ...photographer };
      }
    }
    
    this.set('photographers', photographers);
    return photographer;
  },

  updatePhotographer(id, updates) {
    const photographers = this.getPhotographers();
    const index = photographers.findIndex(p => p.id === id);
    
    if (index >= 0) {
      photographers[index] = { ...photographers[index], ...updates };
      this.set('photographers', photographers);
      return photographers[index];
    }
    return null;
  },

  deletePhotographer(id) {
    const photographers = this.getPhotographers();
    const filtered = photographers.filter(p => p.id !== id);
    this.set('photographers', filtered);
  },

  // 学籍档案相关
  getArchives() {
    return this.getArray('archives');
  },
  
  createArchive(applicationId) {
    const app = this.getApplicationById(applicationId);
    if (!app || !app.idPhoto) {
      return null;
    }
    
    // 生成学号
    const studentId = this.generateStudentId();
    const password = '123456';
    
    const archive = {
      id: 'ARC' + Date.now(),
      studentId,
      password,
      childName: app.childName,
      childGender: app.childGender,
      childAge: app.childAge,
      parentName: app.parentName,
      phone: app.phone,
      wechat: app.wechat,
      expectations: app.expectations,
      lifePhoto: app.lifePhoto,
      idPhoto: app.idPhoto, // 证件照
      photographerId: app.photographerId,
      photographerName: app.photographerName,
      applicationId,
      status: 'pending_admission_letter', // 待上传录取通知书
      admissionLetter: null,
      createdAt: new Date().toISOString()
    };
    
    const archives = this.getArchives();
    archives.unshift(archive);
    this.set('archives', archives);
    
    return archive;
  },
  
  updateArchive(id, updates) {
    const archives = this.getArchives();
    const index = archives.findIndex(a => a.id === id);
    
    if (index >= 0) {
      archives[index] = { ...archives[index], ...updates, updatedAt: new Date().toISOString() };
      this.set('archives', archives);
      return archives[index];
    }
    return null;
  },
  
  getArchiveById(id) {
    const archives = this.getArchives();
    return archives.find(a => a.id === id);
  },
  
  getArchiveByStudentId(studentId) {
    const archives = this.getArchives();
    return archives.find(a => a.studentId === studentId);
  },
  
  // 生成学号
  generateStudentId() {
    const year = new Date().getFullYear();
    const students = this.getStudents();
    const archives = this.getArchives();
    
    // 合并已有学号
    const existingIds = [
      ...students.map(s => s.id),
      ...archives.map(a => a.studentId)
    ].filter(id => id && id.startsWith(year.toString()));
    
    let sequence = 1;
    let studentId;
    
    do {
      studentId = `${year}${String(sequence).padStart(4, '0')}`;
      sequence++;
    } while (existingIds.includes(studentId));
    
    return studentId;
  },
  
  // 通知系统
  getNotifications() {
    return this.getArray('notifications');
  },
  
  addNotification(notification) {
    const notifications = this.getNotifications();
    notification.id = 'NOT' + Date.now();
    notification.createdAt = new Date().toISOString();
    notification.read = false;
    notifications.unshift(notification);
    
    // 只保留最近100条
    if (notifications.length > 100) {
      notifications.length = 100;
    }
    
    this.set('notifications', notifications);
    return notification;
  },
  
  markNotificationAsRead(id) {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.set('notifications', notifications);
    }
  },
  
  getUnreadNotifications(role) {
    const notifications = this.getNotifications();
    return notifications.filter(n => !n.read && n.targetRole === role);
  },

  // 统计数据
  getStats() {
    return {
      totalStudents: this.getStudents().length,
      totalApplications: this.getApplications().length,
      totalPhotographers: this.getPhotographers().length,
      totalAnnouncements: this.getAnnouncements().length,
      totalBanners: this.getBanners().length,
      totalArchives: this.getArchives().length
    };
  },

  // 初始化示例数据
  initMockData() {
    // 检查是否已有数据
    if (this.getStudents().length > 0) {
      return;
    }

    // 初始化摄影师
    const photographers = [
      {
        id: 'PHO1',
        name: '星空画师',
        avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%236f42c1" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40"%3E星%3C/text%3E%3C/svg%3E',
        specialty: '星空风格',
        description: '擅长星空、梦幻风格的证件照拍摄',
        samples: [],
        status: 'available',
        orderCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'PHO2',
        name: '清新画师',
        avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%2328a745" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40"%3E清%3C/text%3E%3C/svg%3E',
        specialty: '清新自然',
        description: '擅长清新、自然风格的证件照拍摄',
        samples: [],
        status: 'available',
        orderCount: 0,
        createdAt: new Date().toISOString()
      }
    ];
    this.set('photographers', photographers);

    // 初始化公告
    const announcements = [
      {
        id: 'ANN1',
        title: '欢迎来到次元学校',
        content: '次元学校是一所充满创意和想象力的虚拟学校，我们致力于为每一位学生提供独特的学习体验。',
        coverImage: '',
        createdAt: new Date().toISOString()
      }
    ];
    this.set('announcements', announcements);

    console.log('Mock data initialized');
  }
};

// 页面加载时初始化数据
if (typeof window !== 'undefined') {
  Storage.initMockData();
}

