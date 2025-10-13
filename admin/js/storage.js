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
      application.status = application.status || 'pending';
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
      applications[index] = { ...applications[index], ...updates };
      this.set('applications', applications);
      return applications[index];
    }
    return null;
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

  // 统计数据
  getStats() {
    return {
      totalStudents: this.getStudents().length,
      totalApplications: this.getApplications().length,
      totalPhotographers: this.getPhotographers().length,
      totalAnnouncements: this.getAnnouncements().length,
      totalBanners: this.getBanners().length
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

