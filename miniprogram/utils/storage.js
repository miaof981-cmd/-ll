// utils/storage.js - 本地数据存储工具

const STORAGE_KEYS = {
  BANNERS: 'banners',
  ANNOUNCEMENTS: 'announcements',
  ARTICLES: 'articles',
  STUDENTS: 'students',
  RECORDS_PREFIX: 'records_' // records_学号
};

// ==================== 轮播图管理 ====================

// 获取轮播图列表
function getBanners() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.BANNERS) || [];
  } catch (e) {
    console.error('获取轮播图失败:', e);
    return [];
  }
}

// 保存轮播图列表
function saveBanners(banners) {
  try {
    wx.setStorageSync(STORAGE_KEYS.BANNERS, banners);
    return true;
  } catch (e) {
    console.error('保存轮播图失败:', e);
    return false;
  }
}

// 添加轮播图
function addBanner(imageUrl) {
  const banners = getBanners();
  banners.push({
    id: Date.now().toString(),
    imageUrl: imageUrl,
    createdAt: new Date().toISOString()
  });
  return saveBanners(banners);
}

// 删除轮播图
function deleteBanner(id) {
  const banners = getBanners();
  const filtered = banners.filter(item => item.id !== id);
  return saveBanners(filtered);
}

// ==================== 公告管理 ====================

// 获取公告列表
function getAnnouncements() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.ANNOUNCEMENTS) || [];
  } catch (e) {
    console.error('获取公告失败:', e);
    return [];
  }
}

// 保存公告列表
function saveAnnouncements(announcements) {
  try {
    wx.setStorageSync(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
    return true;
  } catch (e) {
    console.error('保存公告失败:', e);
    return false;
  }
}

// 添加公告
function addAnnouncement(announcement) {
  const announcements = getAnnouncements();
  const newAnnouncement = {
    id: Date.now().toString(),
    title: announcement.title,
    content: announcement.content,
    coverImage: announcement.coverImage || '',
    pinned: announcement.pinned || false,
    createdAt: new Date().toLocaleDateString('zh-CN')
  };
  announcements.unshift(newAnnouncement);
  return saveAnnouncements(announcements);
}

// 更新公告
function updateAnnouncement(id, announcement) {
  const announcements = getAnnouncements();
  const index = announcements.findIndex(item => item.id === id);
  if (index !== -1) {
    announcements[index] = {
      ...announcements[index],
      ...announcement
    };
    return saveAnnouncements(announcements);
  }
  return false;
}

// 删除公告
function deleteAnnouncement(id) {
  const announcements = getAnnouncements();
  const filtered = announcements.filter(item => item.id !== id);
  return saveAnnouncements(filtered);
}

// ==================== 学生管理 ====================

// 获取学生列表
function getStudents() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.STUDENTS) || [];
  } catch (e) {
    console.error('获取学生列表失败:', e);
    return [];
  }
}

// 保存学生列表
function saveStudents(students) {
  try {
    wx.setStorageSync(STORAGE_KEYS.STUDENTS, students);
    return true;
  } catch (e) {
    console.error('保存学生列表失败:', e);
    return false;
  }
}

// 生成学号（当年年份 + 序号）
function generateStudentId() {
  const students = getStudents();
  const currentYear = new Date().getFullYear();
  
  // 找出当前年份的最大序号
  const currentYearStudents = students.filter(s => s.studentId.startsWith(currentYear.toString()));
  let maxNumber = 0;
  
  currentYearStudents.forEach(student => {
    const number = parseInt(student.studentId.substring(4)); // 去掉年份前缀
    if (number > maxNumber) {
      maxNumber = number;
    }
  });
  
  // 生成新学号：年份 + 四位序号（补零）
  const newNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${currentYear}${newNumber}`;
}

// 添加学生
function addStudent(student) {
  const students = getStudents();
  
  const newStudent = {
    studentId: generateStudentId(),
    name: student.name,
    parentName: student.parentName,
    password: '123456', // 默认密码
    admissionLetter: student.admissionLetter || '', // 录取通知书
    createdAt: new Date().toLocaleDateString('zh-CN')
  };
  
  students.push(newStudent);
  
  // 初始化学生档案（如果有录取通知书，添加到档案）
  if (newStudent.admissionLetter) {
    const records = [{
      id: Date.now().toString(),
      type: 'image',
      title: '录取通知书',
      imageUrl: newStudent.admissionLetter,
      description: '学生录取通知书',
      createdAt: newStudent.createdAt
    }];
    saveRecords(newStudent.studentId, records);
  }
  
  return saveStudents(students) ? newStudent : null;
}

// 更新学生信息
function updateStudent(studentId, student) {
  const students = getStudents();
  const index = students.findIndex(s => s.studentId === studentId);
  if (index !== -1) {
    students[index] = {
      ...students[index],
      ...student,
      studentId: students[index].studentId // 学号不可修改
    };
    return saveStudents(students);
  }
  return false;
}

// 删除学生
function deleteStudent(studentId) {
  const students = getStudents();
  const filtered = students.filter(s => s.studentId !== studentId);
  
  // 同时删除学生档案
  deleteRecords(studentId);
  
  return saveStudents(filtered);
}

// 根据学号获取学生信息
function getStudentById(studentId) {
  const students = getStudents();
  return students.find(s => s.studentId === studentId) || null;
}

// ==================== 学生档案管理 ====================

// 获取学生档案
function getRecords(studentId) {
  try {
    const key = STORAGE_KEYS.RECORDS_PREFIX + studentId;
    return wx.getStorageSync(key) || [];
  } catch (e) {
    console.error('获取学生档案失败:', e);
    return [];
  }
}

// 保存学生档案
function saveRecords(studentId, records) {
  try {
    const key = STORAGE_KEYS.RECORDS_PREFIX + studentId;
    wx.setStorageSync(key, records);
    return true;
  } catch (e) {
    console.error('保存学生档案失败:', e);
    return false;
  }
}

// 添加档案记录
function addRecord(studentId, record) {
  const records = getRecords(studentId);
  
  const newRecord = {
    id: Date.now().toString(),
    type: record.type, // 'grade', 'image', 'punishment'
    createdAt: new Date().toLocaleDateString('zh-CN'),
    ...record
  };
  
  records.unshift(newRecord);
  return saveRecords(studentId, records);
}

// 删除档案记录
function deleteRecord(studentId, recordId) {
  const records = getRecords(studentId);
  const filtered = records.filter(r => r.id !== recordId);
  return saveRecords(studentId, filtered);
}

// 删除学生所有档案
function deleteRecords(studentId) {
  try {
    const key = STORAGE_KEYS.RECORDS_PREFIX + studentId;
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error('删除学生档案失败:', e);
    return false;
  }
}

// ==================== 统计数据 ====================

// 获取统计数据
function getStats() {
  return {
    totalStudents: getStudents().length,
    totalAnnouncements: getAnnouncements().length,
    totalBanners: getBanners().length
  };
}

module.exports = {
  // 轮播图
  getBanners,
  saveBanners,
  addBanner,
  deleteBanner,
  
  // 公告
  getAnnouncements,
  saveAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  
  // 学生
  getStudents,
  saveStudents,
  generateStudentId,
  addStudent,
  updateStudent,
  deleteStudent,
  getStudentById,
  
  // 档案
  getRecords,
  saveRecords,
  addRecord,
  deleteRecord,
  deleteRecords,
  
  // 统计
  getStats
};
