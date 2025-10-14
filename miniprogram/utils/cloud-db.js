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
      // 更新 - 需要排除 _id 字段
      const updateData = { ...photographer };
      delete updateData._id;
      
      await db.collection('photographers').doc(photographer._id).update({
        data: updateData
      });
      console.log('✅ 云端更新摄影师成功');
    } else {
      // 新增
      const addData = { ...photographer };
      delete addData._id; // 确保没有 _id 字段
      
      const res = await db.collection('photographers').add({
        data: {
          ...addData,
          createdAt: new Date().toISOString()
        }
      });
      photographer._id = res._id;
      console.log('✅ 云端添加摄影师成功');
    }
    
    return photographer;
  } catch (e) {
    console.error('❌ 保存摄影师失败:', e);
    throw e;
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

/**
 * 根据ID获取摄影师信息
 */
async function getPhotographerById(id) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    const photographers = storage.getPhotographers();
    return photographers.find(p => p.id === id || p._id === id);
  }
  
  try {
    const db = getDB();
    const res = await db.collection('photographers').doc(id).get();
    
    if (res.data) {
      console.log('✅ 云端获取摄影师信息成功');
      return res.data;
    }
    return null;
  } catch (e) {
    console.error('❌ 获取摄影师信息失败:', e);
    return null;
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

/**
 * 保存/更新学生信息
 */
async function saveStudent(student) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.saveStudent(student);
  }
  
  try {
    const db = getDB();
    
    if (student._id) {
      // 更新 - 需要排除 _id 字段
      const updateData = { ...student };
      delete updateData._id;
      
      await db.collection('students').doc(student._id).update({
        data: updateData
      });
      console.log('✅ 云端更新学生成功');
      return student;
    } else {
      // 新增
      // 生成学号
      if (!student.studentId) {
        student.studentId = await generateStudentId();
      }
      
      const addData = { ...student };
      delete addData._id;
      
      const res = await db.collection('students').add({
        data: {
          ...addData,
          password: addData.password || '123456',
          createdAt: new Date().toISOString()
        }
      });
      
      student._id = res._id;
      console.log('✅ 云端添加学生成功, 学号:', student.studentId);
      return student;
    }
  } catch (e) {
    console.error('❌ 保存学生失败:', e);
    throw e;
  }
}

/**
 * 根据学号获取学生信息
 */
async function getStudentById(studentId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getStudentById(studentId);
  }
  
  try {
    const db = getDB();
    const res = await db.collection('students')
      .where({
        studentId: studentId
      })
      .get();
    
    if (res.data.length > 0) {
      console.log('✅ 云端获取学生信息成功');
      return res.data[0];
    }
    return null;
  } catch (e) {
    console.error('❌ 获取学生信息失败:', e);
    const storage = require('./storage.js');
    return storage.getStudentById(studentId);
  }
}

/**
 * 更新学生信息
 */
async function updateStudent(studentId, updates) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.updateStudent(studentId, updates);
  }
  
  try {
    const db = getDB();
    
    // 先获取学生文档ID
    const student = await getStudentById(studentId);
    if (!student) {
      throw new Error('学生不存在');
    }
    
    // 排除 _id 和 studentId
    const updateData = { ...updates };
    delete updateData._id;
    delete updateData.studentId;
    
    await db.collection('students').doc(student._id).update({
      data: updateData
    });
    
    console.log('✅ 云端更新学生成功');
    return true;
  } catch (e) {
    console.error('❌ 更新学生失败:', e);
    throw e;
  }
}

/**
 * 删除学生
 */
async function deleteStudent(studentId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.deleteStudent(studentId);
  }
  
  try {
    const db = getDB();
    
    // 先获取学生文档ID
    const student = await getStudentById(studentId);
    if (!student) {
      throw new Error('学生不存在');
    }
    
    await db.collection('students').doc(student._id).remove();
    
    console.log('✅ 云端删除学生成功');
    return true;
  } catch (e) {
    console.error('❌ 删除学生失败:', e);
    throw e;
  }
}

/**
 * 获取学生档案记录
 */
async function getRecords(studentId) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.getRecords(studentId);
  }
  
  try {
    const db = getDB();
    const res = await db.collection(`records:${studentId}`).get();
    console.log('✅ 云端获取档案成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取档案失败:', e);
    // 如果集合不存在，返回空数组
    return [];
  }
}

/**
 * 添加档案记录
 */
async function addRecord(studentId, record) {
  if (!isCloudEnabled()) {
    const storage = require('./storage.js');
    return storage.addRecord(studentId, record);
  }
  
  try {
    const db = getDB();
    const res = await db.collection(`records:${studentId}`).add({
      data: {
        ...record,
        createdAt: new Date().toISOString()
      }
    });
    
    console.log('✅ 云端添加档案成功');
    return { _id: res._id, ...record };
  } catch (e) {
    console.error('❌ 添加档案失败:', e);
    throw e;
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
      // 更新 - 需要排除 _id 字段
      const updateData = { ...announcement };
      delete updateData._id;
      
      await db.collection('announcements').doc(announcement._id).update({
        data: updateData
      });
      console.log('✅ 云端更新公告成功');
    } else {
      // 新增
      const addData = { ...announcement };
      delete addData._id; // 确保没有 _id 字段
      
      const res = await db.collection('announcements').add({
        data: {
          ...addData,
          createdAt: new Date().toISOString()
        }
      });
      announcement._id = res._id;
      console.log('✅ 云端添加公告成功');
    }
    
    return announcement;
  } catch (e) {
    console.error('❌ 保存公告失败:', e);
    // 如果云端失败，不要回退到 localStorage
    throw e;
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

// ==================== 活动管理 ====================

/**
 * 获取活动列表
 */
async function getActivities(options = {}) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用，活动功能需要云开发支持');
    return [];
  }
  
  try {
    const { category, status, keyword, limit = 20, skip = 0 } = options;
    
    const res = await wx.cloud.callFunction({
      name: 'getActivities',
      data: { category, status, keyword, limit, skip }
    });
    
    if (res.result && res.result.success) {
      console.log('✅ 云端获取活动成功:', res.result.data.length);
      return res.result.data;
    }
    
    return [];
  } catch (e) {
    console.error('❌ 获取活动失败:', e);
    return [];
  }
}

/**
 * 获取活动详情
 */
async function getActivityDetail(activityId) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用');
    return null;
  }
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'getActivityDetail',
      data: { activityId }
    });
    
    if (res.result && res.result.success) {
      console.log('✅ 云端获取活动详情成功');
      return res.result;
    }
    
    return null;
  } catch (e) {
    console.error('❌ 获取活动详情失败:', e);
    return null;
  }
}

/**
 * 创建活动订单
 */
async function createActivityOrder(orderData) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用');
    return { success: false, error: '云开发未启用' };
  }
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'createActivityOrder',
      data: orderData
    });
    
    if (res.result && res.result.success) {
      console.log('✅ 云端创建订单成功');
      return res.result;
    }
    
    return res.result || { success: false, error: '创建订单失败' };
  } catch (e) {
    console.error('❌ 创建订单失败:', e);
    return { success: false, error: e.message };
  }
}

/**
 * 保存活动（后台用）
 */
async function saveActivity(activity) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用');
    return false;
  }
  
  try {
    const db = getDB();
    
    if (activity._id) {
      // 更新
      const updateData = { ...activity };
      delete updateData._id;
      updateData.updatedAt = new Date().toISOString();
      
      await db.collection('activities').doc(activity._id).update({
        data: updateData
      });
      console.log('✅ 云端更新活动成功');
    } else {
      // 新增
      const addData = { ...activity };
      delete addData._id;
      addData.createdAt = new Date().toISOString();
      addData.updatedAt = new Date().toISOString();
      addData.viewCount = 0;
      addData.orderCount = 0;
      
      const res = await db.collection('activities').add({
        data: addData
      });
      activity._id = res._id;
      console.log('✅ 云端添加活动成功');
    }
    
    return activity;
  } catch (e) {
    console.error('❌ 保存活动失败:', e);
    return false;
  }
}

/**
 * 删除活动
 */
async function deleteActivity(activityId) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用');
    return false;
  }
  
  try {
    const db = getDB();
    // 检查是否为证件照活动
    const activity = await db.collection('activities').doc(activityId).get();
    if (activity.data && activity.data.category === '证件照' && activity.data.isDefault) {
      console.warn('⚠️ 证件照默认活动不可删除');
      return { success: false, error: '证件照默认活动不可删除' };
    }
    
    await db.collection('activities').doc(activityId).remove();
    console.log('✅ 云端删除活动成功');
    return { success: true };
  } catch (e) {
    console.error('❌ 删除活动失败:', e);
    return { success: false, error: e.message };
  }
}

/**
 * 初始化证件照默认活动
 */
async function initDefaultIDPhotoActivity() {
  if (!isCloudEnabled()) {
    return null;
  }
  
  try {
    const db = getDB();
    
    // 检查是否已存在证件照活动
    const existing = await db.collection('activities')
      .where({
        category: '证件照',
        isDefault: true
      })
      .get();
    
    if (existing.data && existing.data.length > 0) {
      console.log('✅ 证件照活动已存在');
      return existing.data[0];
    }
    
    // 创建默认证件照活动
    const defaultActivity = {
      title: '校园证件照拍摄',
      subtitle: '专业证件照，一寸/两寸可选',
      coverImage: '',  // 需要管理员上传
      images: [],
      description: '专业摄影师为您拍摄标准证件照，包含精修、底片等服务。',
      details: '【服务内容】\n✅ 专业摄影师拍摄\n✅ 5张精修照片\n✅ 电子底片\n✅ 一寸/两寸可选',
      price: 20,
      originalPrice: 30,
      photographerIds: [],
      tags: ['证件照', '必备'],
      category: '证件照',
      status: 'active',
      isHot: true,
      isNew: false,
      isDefault: true,  // 标记为默认活动
      sortOrder: 0,
      viewCount: 0,
      orderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const res = await db.collection('activities').add({
      data: defaultActivity
    });
    
    console.log('✅ 创建默认证件照活动成功');
    return { ...defaultActivity, _id: res._id };
  } catch (e) {
    console.error('❌ 初始化证件照活动失败:', e);
    return null;
  }
}

/**
 * 获取活动订单列表
 */
async function getActivityOrders(options = {}) {
  if (!isCloudEnabled()) {
    console.warn('云开发未启用');
    return [];
  }
  
  try {
    const db = getDB();
    const { status, keyword, limit = 20, skip = 0 } = options;
    
    let query = {};
    if (status) query.status = status;
    if (keyword) {
      query.childName = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }
    
    const res = await db.collection('activity_orders')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    console.log('✅ 云端获取订单成功:', res.data.length);
    return res.data;
  } catch (e) {
    console.error('❌ 获取订单失败:', e);
    return [];
  }
}

/**
 * 获取订单详情
 */
async function getActivityOrderById(orderId) {
  if (!isCloudEnabled()) {
    return null;
  }
  
  try {
    const db = getDB();
    const res = await db.collection('activity_orders').doc(orderId).get();
    console.log('✅ 云端获取订单详情成功');
    return res.data;
  } catch (e) {
    console.error('❌ 获取订单详情失败:', e);
    return null;
  }
}

/**
 * 更新订单状态
 */
async function updateActivityOrder(orderId, updates) {
  if (!isCloudEnabled()) {
    return false;
  }
  
  try {
    const db = getDB();
    updates.updatedAt = new Date().toISOString();
    
    await db.collection('activity_orders').doc(orderId).update({
      data: updates
    });
    
    console.log('✅ 云端更新订单成功');
    return true;
  } catch (e) {
    console.error('❌ 更新订单失败:', e);
    return false;
  }
}

// ==================== 导出接口 ====================

module.exports = {
  // 工具方法
  isCloudEnabled,
  
  // 摄影师
  getPhotographers,
  getPhotographerById,
  savePhotographer,
  deletePhotographer,
  
  // 学生
  getStudents,
  getStudentById,
  saveStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  generateStudentId,
  
  // 档案记录
  getRecords,
  addRecord,
  
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
  getArchiveByStudentId,
  
  // 活动管理
  getActivities,
  getActivityDetail,
  createActivityOrder,
  saveActivity,
  deleteActivity,
  initDefaultIDPhotoActivity,
  
  // 活动订单
  getActivityOrders,
  getActivityOrderById,
  updateActivityOrder
};

