/**
 * 云数据库工具类
 * 封装云开发数据库操作，提供统一的数据访问接口
 */

const app = getApp();

// 检查是否启用云开发
function isCloudEnabled() {
  return app.globalData.useCloud && wx.cloud;
}

// 获取数据库实例
function getDB() {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用，请配置环境ID');
    return null;
  }
  return wx.cloud.database();
}

// ==================== 摄影师管理 ====================

/**
 * 获取所有摄影师
 */
async function getPhotographers() {
  if (!isCloudEnabled()) {
    // 降级到本地存储
    const storage = require('./storage.js');
    return storage.getPhotographers();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('photographers').get();
    console.log('✅ 云端获取摄影师成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取摄影师失败:', e);
    // 降级到本地存储
    const storage = require('./storage.js');
    return storage.getPhotographers();
  }
}

/**
 * 添加或更新摄影师
 */
async function savePhotographer(photographer) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.savePhotographer(photographer);
  }
  
  try {
    const db = getDB();
    
    if (photographer._id) {
      // 更新
      await db.collection('photographers').doc(photographer._id).update({
        data: photographer
      });
      console.log('✅ 云端更新摄影师成功');
    } else {
      // 新增
      const res = await db.collection('photographers').add({
        data: {
          ...photographer,
          createdAt: new Date().toISOString()
        }
      });
      photographer._id = res._id;
      console.log('✅ 云端添加摄影师成功');
    }
    
    return photographer;
  } catch (e) {
    console.error('❌ 保存摄影师失败:', e);
    const storage = require('./storage.js');
    return storage.savePhotographer(photographer);
  }
}

/**
 * 删除摄影师
 */
async function deletePhotographer(photographerId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.deletePhotographer(photographerId);
  }
  
  try {
    const db = getDB();
    await db.collection('photographers').doc(photographerId).remove();
    console.log('✅ 云端删除摄影师成功');
    return true;
  } catch (e) {
    console.error('❌ 删除摄影师失败:', e);
    return false;
  }
}

// ==================== 学生管理 ====================

/**
 * 获取所有学生
 */
async function getStudents() {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getStudents();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('students').get();
    console.log('✅ 云端获取学生成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取学生失败:', e);
    const storage = require('./storage.js');
    return storage.getStudents();
  }
}

/**
 * 添加学生
 */
async function addStudent(student) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.addStudent(student);
  }
  
  try {
    const db = getDB();
    
    // 生成学号
    if (!student.studentId) {
      student.studentId = await generateStudentId();
    }
    
    const res = await db.collection('students').add({
      data: {
        ...student,
        password: student.password || '123456',
        createdAt: new Date().toISOString()
      }
    });
    
    student._id = res._id;
    console.log('✅ 云端添加学生成功');
    return student;
  } catch (e) {
    console.error('❌ 添加学生失败:', e);
    const storage = require('./storage.js');
    return storage.addStudent(student);
  }
}

/**
 * 生成学号
 */
async function generateStudentId() {
  const year = new Date().getFullYear();
  
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.generateStudentId();
  }
  
  try {
    const db = getDB();
    // 获取当前年份的所有学生
    const res = await db.collection('students')
      .where({
        studentId: db.RegExp({
          regexp: `^${year}`,
          options: 'i'
        })
      })
      .get();
    
    const maxNumber = res.data.reduce((max, student) => {
      const num = parseInt(student.studentId.substring(4));
      return num > max ? num : max;
    }, 0);
    
    const newNumber = (maxNumber + 1).toString().padStart(4, '0');
    return `${year}${newNumber}`;
  } catch (e) {
    console.error('❌ 生成学号失败:', e);
    const storage = require('./storage.js');
    return storage.generateStudentId();
  }
}

// ==================== 订单管理 ====================

/**
 * 获取所有订单
 */
async function getApplications() {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getApplications();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('applications').get();
    console.log('✅ 云端获取订单成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取订单失败:', e);
    const storage = require('./storage.js');
    return storage.getApplications();
  }
}

/**
 * 保存订单
 */
async function saveApplication(application) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.saveApplication(application);
  }
  
  try {
    const db = getDB();
    
    if (application._id) {
      // 更新
      await db.collection('applications').doc(application._id).update({
        data: application
      });
      console.log('✅ 云端更新订单成功');
    } else {
      // 新增
      const res = await db.collection('applications').add({
        data: {
          ...application,
          createdAt: new Date().toISOString()
        }
      });
      application._id = res._id;
      console.log('✅ 云端添加订单成功');
    }
    
    return application;
  } catch (e) {
    console.error('❌ 保存订单失败:', e);
    const storage = require('./storage.js');
    return storage.saveApplication(application);
  }
}

// ==================== 公告管理 ====================

/**
 * 获取所有公告
 */
async function getAnnouncements() {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getAnnouncements();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('announcements')
      .orderBy('createdAt', 'desc')
      .get();
    console.log('✅ 云端获取公告成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取公告失败:', e);
    const storage = require('./storage.js');
    return storage.getAnnouncements();
  }
}

/**
 * 添加公告
 */
async function saveAnnouncement(announcement) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.saveAnnouncement(announcement);
  }
  
  try {
    const db = getDB();
    
    if (announcement._id) {
      // 更新
      await db.collection('announcements').doc(announcement._id).update({
        data: announcement
      });
      console.log('✅ 云端更新公告成功');
    } else {
      // 新增
      const res = await db.collection('announcements').add({
        data: {
          ...announcement,
          createdAt: new Date().toISOString()
        }
      });
      announcement._id = res._id;
      console.log('✅ 云端添加公告成功');
    }
    
    return announcement;
  } catch (e) {
    console.error('❌ 保存公告失败:', e);
    const storage = require('./storage.js');
    return storage.saveAnnouncement(announcement);
  }
}

/**
 * 删除公告
 */
async function deleteAnnouncement(id) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.deleteAnnouncement(id);
  }
  
  try {
    const db = getDB();
    await db.collection('announcements').doc(id).remove();
    console.log('✅ 云端删除公告成功');
    return true;
  } catch (e) {
    console.error('❌ 删除公告失败:', e);
    return false;
  }
}

// ==================== 轮播图管理 ====================

/**
 * 获取所有轮播图
 */
async function getBanners() {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getBanners();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('banners')
      .orderBy('order', 'asc')
      .get();
    console.log('✅ 云端获取轮播图成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取轮播图失败:', e);
    const storage = require('./storage.js');
    return storage.getBanners();
  }
}

/**
 * 添加轮播图
 */
async function addBanner(imageUrl) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.addBanner(imageUrl);
  }
  
  try {
    const db = getDB();
    const res = await db.collection('banners').add({
      data: {
        imageUrl: imageUrl,
        order: Date.now(),
        createdAt: new Date().toISOString()
      }
    });
    console.log('✅ 云端添加轮播图成功');
    return true;
  } catch (e) {
    console.error('❌ 添加轮播图失败:', e);
    const storage = require('./storage.js');
    return storage.addBanner(imageUrl);
  }
}

/**
 * 删除轮播图
 */
async function deleteBanner(id) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.deleteBanner(id);
  }
  
  try {
    const db = getDB();
    await db.collection('banners').doc(id).remove();
    console.log('✅ 云端删除轮播图成功');
    return true;
  } catch (e) {
    console.error('❌ 删除轮播图失败:', e);
    return false;
  }
}

// ==================== 学籍档案管理 ====================

/**
 * 获取所有档案
 */
async function getArchives() {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getArchives();
  }
  
  try {
    const db = getDB();
    const res = await db.collection('archives')
      .orderBy('createdAt', 'desc')
      .get();
    console.log('✅ 云端获取档案成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取档案失败:', e);
    const storage = require('./storage.js');
    return storage.getArchives();
  }
}

/**
 * 创建档案
 */
async function createArchive(applicationId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.createArchive(applicationId);
  }
  
  try {
    const db = getDB();
    
    // 获取申请信息
    const application = await db.collection('applications').doc(applicationId).get();
    if (!application.data) {
      throw new Error('申请不存在');
    }
    
    // 生成学号
    const studentId = await generateStudentId();
    
    // 创建档案
    const res = await db.collection('archives').add({
      data: {
        studentId: studentId,
        password: '123456',
        childName: application.data.childName,
        gender: application.data.gender,
        age: application.data.age,
        lifePhoto: application.data.lifePhoto,
        idPhoto: application.data.work, // 证件照
        parentName: application.data.parentName,
        parentPhone: application.data.phone,
        parentWechat: application.data.wechat,
        expectations: application.data.expectations,
        applicationId: applicationId,
        status: 'pending_admission_letter', // 待上传录取通知书
        createdAt: new Date().toISOString()
      }
    });
    
    console.log('✅ 云端创建档案成功');
    return {
      _id: res._id,
      studentId: studentId
    };
  } catch (e) {
    console.error('❌ 创建档案失败:', e);
    const storage = require('./storage.js');
    return storage.createArchive(applicationId);
  }
}

/**
 * 更新档案
 */
async function updateArchive(id, updates) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.updateArchive(id, updates);
  }
  
  try {
    const db = getDB();
    await db.collection('archives').doc(id).update({
      data: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
    console.log('✅ 云端更新档案成功');
    return true;
  } catch (e) {
    console.error('❌ 更新档案失败:', e);
    return false;
  }
}

/**
 * 根据ID获取档案
 */
async function getArchiveById(id) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getArchiveById(id);
  }
  
  try {
    const db = getDB();
    const res = await db.collection('archives').doc(id).get();
    return res.data;
  } catch (e) {
    console.error('❌ 获取档案失败:', e);
    return null;
  }
}

/**
 * 根据学号获取档案
 */
async function getArchiveByStudentId(studentId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getArchiveByStudentId(studentId);
  }
  
  try {
    const db = getDB();
    const res = await db.collection('archives')
      .where({
        studentId: studentId
      })
      .get();
    return res.data.length > 0 ? res.data[0] : null;
  } catch (e) {
    console.error('❌ 获取档案失败:', e);
    return null;
  }
}

// ==================== 导出接口 ====================

module.exports = {
  // 工具方法
  isCloudEnabled,
  
  // 摄影师
  getPhotographers,
  savePhotographer,
  deletePhotographer,
  
  // 学生
  getStudents,
  addStudent,
  generateStudentId,
  
  // 订单
  getApplications,
  saveApplication,
  
  // 公告
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  
  // 轮播图
  getBanners,
  addBanner,
  deleteBanner,
  
  // 学籍档案
  getArchives,
  createArchive,
  updateArchive,
  getArchiveById,
  getArchiveByStudentId
};

