// 档案创建测试工具
const studentIdUtil = require('../../utils/student-id.js');

Page({
  data: {
    testResult: '',
    logs: []
  },

  onLoad() {
    this.addLog('📋 档案创建测试工具已加载');
  },

  addLog(msg) {
    const logs = this.data.logs;
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.setData({ logs });
    console.log(msg);
  },

  clearLogs() {
    this.setData({ logs: [], testResult: '' });
  },

  // 测试1: 直接创建档案
  async testCreateArchive() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧪 测试：直接创建学生档案');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();

      // 1. 生成学号
      this.addLog('🔢 开始生成学号...');
      const studentId = await studentIdUtil.generateNextStudentId();
      this.addLog(`✅ 学号生成成功: ${studentId}`);

      // 2. 创建档案
      const studentData = {
        studentId: studentId,
        name: '测试学生_' + Date.now(),
        avatar: 'cloud://test-avatar.png',
        gender: '女',
        age: 5,
        class: '待分配',
        parentName: '测试家长',
        parentPhone: '13800138000',
        createdAt: now,
        updatedAt: now,
        source: 'test',
        sourceOrderId: 'test-order-' + Date.now()
      };

      this.addLog('🧾 准备写入档案数据:');
      this.addLog(JSON.stringify(studentData, null, 2));

      const addResult = await db.collection('students').add({
        data: studentData
      });

      this.addLog('✅ 档案创建成功！');
      this.addLog(`   档案ID: ${addResult._id}`);
      this.addLog(`   学号: ${studentId}`);

      this.setData({ 
        testResult: `✅ 成功！档案ID: ${addResult._id}, 学号: ${studentId}` 
      });

      wx.showToast({
        title: '档案创建成功',
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 档案创建失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog(`堆栈: ${e.stack}`);
      this.addLog('========================================');

      this.setData({ testResult: `❌ 失败: ${e.message}` });

      wx.showToast({
        title: '创建失败',
        icon: 'error'
      });
    }
  },

  // 测试2: 创建待确认订单（不自动确认，等用户手动确认）
  async testCreatePendingOrder() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧪 测试：创建待确认订单（需手动确认）');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();

      // 1. 查询活动信息，获取最新价格
      this.addLog('📊 正在查询活动信息...');
      const activityId = '43d365dc68ee129202af48e635a3651e';
      const activityRes = await db.collection('activities')
        .doc(activityId)
        .get();

      if (!activityRes.data) {
        this.addLog('❌ 活动不存在，无法创建订单');
        wx.showToast({ title: '活动不存在', icon: 'error' });
        return;
      }

      const activityPrice = activityRes.data.price || 0.01;
      this.addLog(`✅ 活动价格：¥${activityPrice}`);

      // 2. 创建测试订单（状态：pending_confirm）
      this.addLog('📝 创建待确认订单...');
      const orderData = {
        orderNo: 'TEST' + Date.now(),
        activityId: activityId, // 证件照活动ID
        studentName: '待确认学生_' + Date.now(),
        parentName: '测试家长',
        parentPhone: '13800138000',
        parentWechat: 'test_wechat_123', // 添加微信号
        gender: '女',
        age: 5,
        class: '待分配',
        photographerId: '4402541d68edd59f02a92fb31d00f57d', // 真实摄影师ID
        photographerName: 'miao',
        // 添加4张测试生活照（复用已有的测试图片）
        lifePhotos: [
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png',
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png', // 复用
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png'  // 复用
        ],
        photos: [
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png'
        ],
        remark: '测试订单-请手动确认',
        expectations: '希望孩子健康快乐成长，学业进步！', // 添加家长期许
        totalPrice: activityPrice,  // ✅ 使用活动的最新价格，不硬编码
        status: 'pending_confirm', // 待确认状态
        paymentMethod: 'wechat',
        rejectCount: 0,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
        photographerNote: '测试照片已上传，请确认'
      };

      const orderRes = await db.collection('activity_orders').add({
        data: orderData
      });

      this.addLog(`✅ 待确认订单创建成功！`);
      this.addLog(`   订单ID: ${orderRes._id}`);
      this.addLog(`   订单号: ${orderData.orderNo}`);
      this.addLog(`   学生姓名: ${orderData.studentName}`);
      this.addLog(`   订单状态: pending_confirm（待确认）`);
      this.addLog('');
      this.addLog('📱 请前往"我的订单"查看并手动确认');
      this.addLog('   点击底部"我的" → "我的订单" → 找到刚创建的订单 → 点击"确认满意"');

      this.setData({ 
        testResult: `✅ 待确认订单创建成功！\n订单ID: ${orderRes._id}\n\n请前往"我的订单"手动确认` 
      });

      wx.showModal({
        title: '订单创建成功',
        content: '待确认订单已创建，请前往"我的订单"手动确认收货',
        confirmText: '去确认',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            // 跳转到订单列表
            wx.navigateTo({
              url: '/pages/user/orders/orders'
            });
          }
        }
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 创建订单失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog(`堆栈: ${e.stack}`);
      this.addLog('========================================');

      this.setData({ testResult: `❌ 失败: ${e.message}` });

      wx.showToast({
        title: '创建失败',
        icon: 'error'
      });
    }
  },

  // 测试3: 模拟完整确认收货流程（自动确认）
  async testFullFlow() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧪 测试：模拟完整确认收货流程');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      const now = new Date().toISOString();

      // 1. 查询活动信息，获取最新价格
      this.addLog('📊 正在查询活动信息...');
      const activityId = '43d365dc68ee129202af48e635a3651e';
      const activityRes = await db.collection('activities')
        .doc(activityId)
        .get();

      if (!activityRes.data) {
        this.addLog('❌ 活动不存在，无法创建订单');
        wx.showToast({ title: '活动不存在', icon: 'error' });
        return;
      }

      const activityPrice = activityRes.data.price || 0.01;
      this.addLog(`✅ 活动价格：¥${activityPrice}`);

      // 2. 创建测试订单
      this.addLog('📝 创建测试订单...');
      const orderData = {
        orderNo: 'TEST' + Date.now(),
        activityId: activityId, // 证件照活动ID
        studentName: '测试学生_' + Date.now(),
        parentName: '测试家长',
        parentPhone: '13800138000',
        gender: '女',
        age: 5,
        class: '待分配',
        photographerId: 'test-photographer',
        photographerName: '测试摄影师',
        lifePhotos: [],
        photos: ['cloud://test-photo-1.png', 'cloud://test-photo-2.png'],
        remark: '测试订单',
        totalPrice: activityPrice,  // ✅ 使用活动的最新价格
        status: 'pending_confirm',
        paymentMethod: 'wechat',
        rejectCount: 0,
        createdAt: now,
        updatedAt: now,
        submittedAt: now
      };

      const orderRes = await db.collection('activity_orders').add({
        data: orderData
      });

      this.addLog(`✅ 测试订单创建成功: ${orderRes._id}`);

      // 3. 显示活动信息（重用之前查询的数据）
      const activity = activityRes.data;
      this.addLog(`✅ 活动名称: ${activity.title || activity.name}`);
      this.addLog(`   活动类别: ${activity.category}`);

      // 3. 模拟确认收货
      this.addLog('========================================');
      this.addLog('📋 开始确认收货流程...');
      this.addLog('========================================');

      // 3.1 更新订单状态
      await db.collection('activity_orders').doc(orderRes._id).update({
        data: {
          status: 'completed',
          confirmedAt: now,
          updatedAt: now
        }
      });
      this.addLog('✅ 订单状态已更新为 completed');

      // 3.2 检查条件
      this.addLog('🔍 检查档案创建条件:');
      this.addLog(`   活动类别: "${activity.category}"`);
      this.addLog(`   学生姓名: "${orderData.studentName}"`);
      this.addLog(`   类别类型: ${typeof activity.category}`);
      this.addLog(`   是否匹配 "证件照": ${activity.category === '证件照'}`);

      if (activity.category === '证件照' && orderData.studentName) {
        this.addLog('✅ 条件匹配！开始创建档案...');

        // 3.3 生成学号
        this.addLog('🔢 开始生成学号...');
        const studentId = await studentIdUtil.generateNextStudentId();
        this.addLog(`✅ 学号生成成功: ${studentId}`);

        // 3.4 创建档案
        const studentData = {
          studentId: studentId,
          name: orderData.studentName,
          avatar: orderData.photos[0],
          gender: orderData.gender,
          age: orderData.age,
          class: orderData.class || '待分配',
          parentName: orderData.parentName,
          parentPhone: orderData.parentPhone,
          createdAt: now,
          updatedAt: now,
          source: 'order',
          sourceOrderId: orderRes._id
        };

        this.addLog('🧾 准备写入档案:');
        this.addLog(JSON.stringify(studentData, null, 2));

        const addResult = await db.collection('students').add({
          data: studentData
        });

        this.addLog('✅ 档案创建成功！');
        this.addLog(`   档案ID: ${addResult._id}`);
        this.addLog(`   学号: ${studentId}`);

        // 3.5 创建学籍档案记录
        this.addLog('📝 创建学籍档案记录...');
        const recordData = {
          studentId: studentId,
          studentName: orderData.studentName,
          gender: orderData.gender,
          age: orderData.age,
          birthDate: '',
          idCard: '',
          phone: orderData.parentPhone,
          parentName: orderData.parentName,
          parentPhone: orderData.parentPhone,
          address: '',
          class: orderData.class,
          avatar: orderData.photos[0],
          lifePhotos: [],
          status: 'active',
          createdAt: now,
          updatedAt: now,
          source: 'order',
          sourceOrderId: orderRes._id
        };
        
        await db.collection('student_records').add({
          data: recordData
        });
        
        this.addLog('✅ 学籍档案记录创建成功！');

        // 3.6 更新订单关联学号
        await db.collection('activity_orders').doc(orderRes._id).update({
          data: {
            studentId: studentId,
            updatedAt: now
          }
        });
        this.addLog('✅ 订单已关联学号');

        this.setData({ 
          testResult: `✅ 完整流程成功！\n订单ID: ${orderRes._id}\n档案ID: ${addResult._id}\n学号: ${studentId}` 
        });

        wx.showToast({
          title: '完整流程成功',
          icon: 'success'
        });
      } else {
        this.addLog('❌ 条件不匹配，不创建档案');
        this.setData({ testResult: '❌ 条件不匹配' });
      }
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 测试失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog(`堆栈: ${e.stack}`);
      this.addLog('========================================');

      this.setData({ testResult: `❌ 失败: ${e.message}` });

      wx.showToast({
        title: '测试失败',
        icon: 'error'
      });
    }
  },

  // 测试4: 查询所有档案
  async testQueryArchives() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧪 测试：查询所有学生档案');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      this.addLog('📡 查询 students 集合...');
      const res = await db.collection('students').get();

      this.addLog(`✅ 查询成功，共 ${res.data.length} 条记录`);

      if (res.data.length > 0) {
        res.data.forEach((student, index) => {
          this.addLog(`\n档案 ${index + 1}:`);
          this.addLog(`  学号: ${student.studentId}`);
          this.addLog(`  姓名: ${student.name}`);
          this.addLog(`  来源: ${student.source}`);
          this.addLog(`  创建时间: ${student.createdAt}`);
        });
      } else {
        this.addLog('⚠️ 没有任何档案记录');
      }

      this.setData({ testResult: `共 ${res.data.length} 条档案` });
    } catch (e) {
      this.addLog('❌ 查询失败！');
      this.addLog(`错误: ${e.message}`);
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试5: 清空所有测试数据
  async testCleanup() {
    const res = await wx.showModal({
      title: '确认清空',
      content: '确定要删除所有测试数据吗？（仅删除 source=test 或 source=order 的测试记录）',
      confirmText: '确定删除',
      cancelText: '取消'
    });

    if (!res.confirm) return;

    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧪 测试：清空测试数据');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();

      // 删除测试档案
      this.addLog('🗑️ 删除测试档案...');
      const studentsRes = await db.collection('students')
        .where({ source: 'test' })
        .get();

      for (const student of studentsRes.data) {
        await db.collection('students').doc(student._id).remove();
        this.addLog(`  删除档案: ${student.name} (${student.studentId})`);
      }

      this.addLog(`✅ 已删除 ${studentsRes.data.length} 条测试档案`);

      this.setData({ testResult: `✅ 清理完成，删除 ${studentsRes.data.length} 条记录` });

      wx.showToast({
        title: '清理完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog('❌ 清理失败！');
      this.addLog(`错误: ${e.message}`);
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试6: 给现有学生添加生活照
  async addLifePhotosToStudent() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('📸 给现有学生添加生活照');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询学号为 20250002 的学生
      this.addLog('🔍 查询学号 20250002 的学生...');
      const res = await db.collection('students')
        .where({ studentId: '20250002' })
        .get();

      if (res.data.length === 0) {
        this.addLog('❌ 未找到学号为 20250002 的学生');
        wx.showToast({
          title: '学生不存在',
          icon: 'error'
        });
        return;
      }

      const student = res.data[0];
      this.addLog(`✅ 找到学生: ${student.name}`);
      this.addLog(`   当前头像/证件照: ${student.avatar ? '有' : '无'}`);
      this.addLog(`   当前certificatePhoto: ${student.certificatePhoto ? '有' : '无'}`);
      this.addLog(`   当前生活照数量: ${student.lifePhotos?.length || 0}`);

      // 确定证件照路径（优先使用已有的，否则使用avatar）
      const certificatePhoto = student.certificatePhoto || student.avatar;
      
      if (!certificatePhoto) {
        this.addLog('❌ 没有找到证件照（avatar和certificatePhoto都为空）');
        wx.showToast({
          title: '没有证件照',
          icon: 'error'
        });
        return;
      }

      this.addLog(`📸 使用证件照: ${certificatePhoto}`);

      // 添加4张测试生活照（复用已有的测试图片）
      const lifePhotos = [
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png',
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png', // 复用
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png'  // 复用
      ];

      // 更新学生档案
      this.addLog('📝 更新学生档案...');
      this.addLog('   设置4张生活照');
      this.addLog('   设置certificatePhoto字段');
      
      await db.collection('students')
        .doc(student._id)
        .update({
          data: {
            lifePhotos: lifePhotos,
            certificatePhoto: certificatePhoto, // 使用avatar作为证件照
            updatedAt: new Date().toISOString()
          }
        });

      this.addLog('✅ 生活照添加成功！');
      this.addLog(`   新的照片数量: ${lifePhotos.length}`);
      this.addLog('');
      this.addLog('📱 请前往"我的" → 点击学生卡片 → 查看档案');

      this.setData({ 
        testResult: `✅ 成功！已添加 ${lifePhotos.length} 张照片` 
      });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    } catch (e) {
      this.addLog('❌ 添加失败！');
      this.addLog(`错误: ${e.message}`);
      this.setData({ testResult: `❌ 失败: ${e.message}` });

      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
    }
  },

  // 测试7: 修复旧订单添加生活照
  async fixOldOrdersWithLifePhotos() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔧 修复旧订单：添加生活照数据');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 测试生活照（复用测试图片）
      const testLifePhotos = [
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png',
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
        'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png'
      ];

      // 1. 查询所有没有 lifePhotos 字段的订单
      this.addLog('🔍 查询没有生活照的订单...');
      const ordersRes = await db.collection('activity_orders')
        .where({
          lifePhotos: db.command.exists(false)
        })
        .get();

      const orders = ordersRes.data;
      this.addLog(`   找到 ${orders.length} 个需要修复的订单`);

      if (orders.length === 0) {
        this.addLog('✅ 所有订单都已有生活照数据！');
        wx.showToast({
          title: '无需修复',
          icon: 'success'
        });
        return;
      }

      // 2. 批量更新订单
      this.addLog('📝 开始批量更新...');
      let successCount = 0;
      let failCount = 0;

      for (const order of orders) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                lifePhotos: testLifePhotos
              }
            });
          successCount++;
          this.addLog(`   ✅ 订单 ${order.orderNo || order._id} 已更新`);
        } catch (e) {
          failCount++;
          this.addLog(`   ❌ 订单 ${order.orderNo || order._id} 更新失败: ${e.message}`);
        }
      }

      this.addLog('========================================');
      this.addLog('✅ 修复完成！');
      this.addLog(`   成功: ${successCount} 个`);
      this.addLog(`   失败: ${failCount} 个`);
      this.addLog('========================================');

      this.setData({ 
        testResult: `✅ 成功修复 ${successCount} 个订单，失败 ${failCount} 个` 
      });

      wx.showToast({
        title: `修复成功 ${successCount} 个`,
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 修复失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');

      this.setData({ testResult: `❌ 失败: ${e.message}` });

      wx.showToast({
        title: '修复失败',
        icon: 'error'
      });
    }
  },

  // 测试8: 检查订单审核状态
  async checkOrderReviewStatus() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试8: 检查订单审核状态');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有待审核的订单
      this.addLog('📋 查询待审核订单...');
      const pendingRes = await db.collection('activity_orders')
        .where({
          status: 'pending_review'
        })
        .get();

      this.addLog(`📊 待审核订单数量: ${pendingRes.data.length}`);
      
      if (pendingRes.data.length > 0) {
        pendingRes.data.forEach((order, index) => {
          this.addLog(`\n订单 ${index + 1}:`);
          this.addLog(`  订单号: ${order.orderNo}`);
          this.addLog(`  学生: ${order.studentName}`);
          this.addLog(`  状态: ${order.status}`);
          this.addLog(`  上传时间: ${order.submittedAt || '未知'}`);
          this.addLog(`  照片数量: ${order.photos ? order.photos.length : 0}`);
          this.addLog(`  订单ID: ${order._id}`);
        });
      }

      // 查询待确认的订单（审核通过的）
      this.addLog('\n📋 查询待确认订单（已审核通过）...');
      const confirmedRes = await db.collection('activity_orders')
        .where({
          status: 'pending_confirm'
        })
        .get();

      this.addLog(`📊 待确认订单数量: ${confirmedRes.data.length}`);
      
      if (confirmedRes.data.length > 0) {
        confirmedRes.data.forEach((order, index) => {
          this.addLog(`\n订单 ${index + 1}:`);
          this.addLog(`  订单号: ${order.orderNo}`);
          this.addLog(`  学生: ${order.studentName}`);
          this.addLog(`  状态: ${order.status}`);
          this.addLog(`  审核时间: ${order.reviewedAt || '未知'}`);
          this.addLog(`  订单ID: ${order._id}`);
        });
      }

      // 查询所有订单统计
      this.addLog('\n📊 查询所有订单统计...');
      const allOrders = await db.collection('activity_orders').get();
      const statusCount = {};
      allOrders.data.forEach(order => {
        statusCount[order.status] = (statusCount[order.status] || 0) + 1;
      });

      this.addLog('\n订单状态统计:');
      Object.keys(statusCount).forEach(status => {
        this.addLog(`  ${status}: ${statusCount[status]} 个`);
      });

      this.addLog('\n========================================');
      this.addLog('✅ 检查完成');
      this.addLog('========================================');

      wx.showToast({
        title: '检查完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog(`❌ 检查失败: ${e.message}`);
      console.error('检查失败:', e);
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  },

  // 测试9: 手动将订单改为待确认状态
  async manualApproveOrder() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔧 测试9: 手动审核通过订单');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有待审核的订单
      this.addLog('🔍 查询待审核订单...');
      const pendingRes = await db.collection('activity_orders')
        .where({
          status: 'pending_review'
        })
        .get();

      if (pendingRes.data.length === 0) {
        this.addLog('❌ 没有待审核的订单');
        wx.showToast({ title: '没有待审核订单', icon: 'none' });
        return;
      }

      this.addLog(`📊 找到 ${pendingRes.data.length} 个待审核订单`);
      
      // 显示订单列表
      pendingRes.data.forEach((order, index) => {
        this.addLog(`\n${index + 1}. ${order.orderNo}`);
        this.addLog(`   学生: ${order.studentName}`);
        this.addLog(`   照片: ${order.photos ? order.photos.length : 0} 张`);
      });

      // 询问是否批量审核通过
      const res = await wx.showModal({
        title: '批量审核',
        content: `发现 ${pendingRes.data.length} 个待审核订单，是否全部审核通过？`,
        confirmText: '全部通过',
        cancelText: '取消'
      });

      if (!res.confirm) {
        this.addLog('\n❌ 用户取消操作');
        return;
      }

      // 批量审核通过
      this.addLog('\n🔄 开始批量审核...');
      const now = new Date().toISOString();
      let successCount = 0;
      let failCount = 0;

      for (const order of pendingRes.data) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                status: 'pending_confirm',
                reviewedAt: now,
                updatedAt: now
              }
            });
          successCount++;
          this.addLog(`✅ ${order.orderNo} 审核通过`);
        } catch (e) {
          failCount++;
          this.addLog(`❌ ${order.orderNo} 失败: ${e.message}`);
        }
      }

      this.addLog('\n========================================');
      this.addLog(`✅ 批量审核完成！`);
      this.addLog(`   成功: ${successCount} 个`);
      this.addLog(`   失败: ${failCount} 个`);
      this.addLog('========================================');

      wx.showToast({
        title: `审核成功 ${successCount} 个`,
        icon: 'success'
      });
    } catch (e) {
      this.addLog(`❌ 操作失败: ${e.message}`);
      console.error('操作失败:', e);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 测试10: 检查参考图加载问题
  async checkLifePhotosIssue() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试10: 检查参考图加载问题');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有订单
      this.addLog('📋 查询所有订单...');
      const allOrders = await db.collection('activity_orders').get();
      
      this.addLog(`📊 总订单数: ${allOrders.data.length}`);
      
      // 统计生活照情况
      let withLifePhotos = 0;
      let withoutLifePhotos = 0;
      let emptyLifePhotos = 0;
      
      allOrders.data.forEach((order, index) => {
        if (order.lifePhotos && order.lifePhotos.length > 0) {
          withLifePhotos++;
          this.addLog(`\n✅ 订单 ${index + 1}: ${order.orderNo}`);
          this.addLog(`   学生: ${order.studentName}`);
          this.addLog(`   生活照数量: ${order.lifePhotos.length}`);
          this.addLog(`   生活照URL示例: ${order.lifePhotos[0].substring(0, 50)}...`);
        } else if (order.lifePhotos && order.lifePhotos.length === 0) {
          emptyLifePhotos++;
          this.addLog(`\n⚠️ 订单 ${index + 1}: ${order.orderNo}`);
          this.addLog(`   学生: ${order.studentName}`);
          this.addLog(`   生活照: 空数组 []`);
        } else {
          withoutLifePhotos++;
          this.addLog(`\n❌ 订单 ${index + 1}: ${order.orderNo}`);
          this.addLog(`   学生: ${order.studentName}`);
          this.addLog(`   生活照: 字段不存在`);
        }
      });
      
      this.addLog('\n========================================');
      this.addLog('📊 统计结果:');
      this.addLog(`   ✅ 有生活照: ${withLifePhotos} 个`);
      this.addLog(`   ⚠️ 空数组: ${emptyLifePhotos} 个`);
      this.addLog(`   ❌ 无字段: ${withoutLifePhotos} 个`);
      this.addLog('========================================');
      
      // 测试云存储访问
      if (withLifePhotos > 0) {
        this.addLog('\n🔍 测试云存储文件访问...');
        const firstOrderWithPhotos = allOrders.data.find(o => o.lifePhotos && o.lifePhotos.length > 0);
        const testUrl = firstOrderWithPhotos.lifePhotos[0];
        
        this.addLog(`   测试URL: ${testUrl}`);
        
        // 尝试获取临时链接
        try {
          const tempUrlRes = await wx.cloud.getTempFileURL({
            fileList: [testUrl]
          });
          
          if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
            const fileInfo = tempUrlRes.fileList[0];
            this.addLog(`   临时链接状态: ${fileInfo.status}`);
            this.addLog(`   临时链接: ${fileInfo.tempFileURL ? '✅ 成功获取' : '❌ 获取失败'}`);
            
            if (fileInfo.status !== 0) {
              this.addLog(`   ⚠️ 错误代码: ${fileInfo.errCode}`);
              this.addLog(`   ⚠️ 错误信息: ${fileInfo.errMsg}`);
            }
          }
        } catch (e) {
          this.addLog(`   ❌ 获取临时链接失败: ${e.message}`);
        }
      }
      
      this.addLog('\n========================================');
      this.addLog('✅ 检查完成');
      this.addLog('========================================');

      wx.showToast({
        title: '检查完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog(`❌ 检查失败: ${e.message}`);
      console.error('检查失败:', e);
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  },

  // 测试11: 检查具体订单的生活照
  async checkSpecificOrderLifePhotos() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试11: 检查具体订单的生活照');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询最近的订单
      this.addLog('📋 查询最近的订单...');
      const recentOrders = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      if (recentOrders.data.length === 0) {
        this.addLog('❌ 没有找到订单');
        wx.showToast({ title: '没有订单', icon: 'none' });
        return;
      }
      
      this.addLog(`📊 找到 ${recentOrders.data.length} 个最近订单\n`);
      
      recentOrders.data.forEach((order, index) => {
        this.addLog(`订单 ${index + 1}:`);
        this.addLog(`  订单号: ${order.orderNo}`);
        this.addLog(`  学生: ${order.studentName}`);
        this.addLog(`  状态: ${order.status}`);
        this.addLog(`  创建时间: ${order.createdAt}`);
        
        // 检查生活照字段
        if (order.lifePhotos === undefined) {
          this.addLog(`  ❌ lifePhotos: 字段不存在`);
        } else if (order.lifePhotos === null) {
          this.addLog(`  ⚠️ lifePhotos: null`);
        } else if (Array.isArray(order.lifePhotos)) {
          this.addLog(`  ✅ lifePhotos: 数组，长度 ${order.lifePhotos.length}`);
          if (order.lifePhotos.length > 0) {
            order.lifePhotos.forEach((url, i) => {
              this.addLog(`     [${i + 1}] ${url.substring(0, 60)}...`);
            });
          }
        } else {
          this.addLog(`  ⚠️ lifePhotos: 类型异常 (${typeof order.lifePhotos})`);
        }
        this.addLog('');
      });
      
      this.addLog('========================================');
      this.addLog('✅ 检查完成');
      this.addLog('========================================');

      wx.showToast({
        title: '检查完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog(`❌ 检查失败: ${e.message}`);
      console.error('检查失败:', e);
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  },

  // 测试12: 清理无效的生活照链接
  async cleanInvalidLifePhotos() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🧹 测试12: 清理无效的生活照链接');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有订单
      this.addLog('📋 查询所有订单...');
      const allOrders = await db.collection('activity_orders').get();
      this.addLog(`📊 总订单数: ${allOrders.data.length}\n`);
      
      let invalidCount = 0;
      let validCount = 0;
      let noPhotosCount = 0;
      const ordersToUpdate = [];
      
      // 检查每个订单
      allOrders.data.forEach((order, index) => {
        if (!order.lifePhotos || order.lifePhotos.length === 0) {
          noPhotosCount++;
          return;
        }
        
        // 检查是否有无效的链接（wxfile:// 开头）
        const hasInvalidLinks = order.lifePhotos.some(url => 
          typeof url === 'string' && (url.startsWith('wxfile://') || url.startsWith('http://tmp'))
        );
        
        if (hasInvalidLinks) {
          invalidCount++;
          this.addLog(`❌ 订单 ${index + 1}: ${order.orderNo}`);
          this.addLog(`   学生: ${order.studentName}`);
          this.addLog(`   状态: ${order.status}`);
          this.addLog(`   无效照片数: ${order.lifePhotos.length}`);
          order.lifePhotos.forEach((url, i) => {
            this.addLog(`     [${i + 1}] ${url.substring(0, 50)}...`);
          });
          this.addLog('');
          
          ordersToUpdate.push({
            _id: order._id,
            orderNo: order.orderNo,
            studentName: order.studentName
          });
        } else {
          validCount++;
        }
      });
      
      this.addLog('========================================');
      this.addLog('📊 统计结果:');
      this.addLog(`   ✅ 有效链接: ${validCount} 个`);
      this.addLog(`   ❌ 无效链接: ${invalidCount} 个`);
      this.addLog(`   ⚠️ 无照片: ${noPhotosCount} 个`);
      this.addLog('========================================\n');
      
      if (ordersToUpdate.length === 0) {
        this.addLog('✅ 没有需要清理的订单');
        wx.showToast({
          title: '没有需要清理的订单',
          icon: 'success'
        });
        return;
      }
      
      // 询问用户是否清理
      const res = await wx.showModal({
        title: '清理确认',
        content: `发现 ${ordersToUpdate.length} 个订单有无效的生活照链接。\n\n这些订单的生活照将被清空（设为空数组 []）。\n\n是否继续？`,
        confirmText: '清理',
        confirmColor: '#ff4d4f'
      });
      
      if (!res.confirm) {
        this.addLog('❌ 用户取消操作');
        return;
      }
      
      // 批量清理
      this.addLog('\n🧹 开始清理无效链接...\n');
      let successCount = 0;
      let failCount = 0;
      
      for (const order of ordersToUpdate) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                lifePhotos: [], // 清空无效的照片链接
                updatedAt: new Date().toISOString()
              }
            });
          successCount++;
          this.addLog(`✅ ${order.orderNo} (${order.studentName}) 已清理`);
        } catch (e) {
          failCount++;
          this.addLog(`❌ ${order.orderNo} 清理失败: ${e.message}`);
        }
      }
      
      this.addLog('\n========================================');
      this.addLog('🎉 清理完成！');
      this.addLog(`   成功: ${successCount} 个`);
      this.addLog(`   失败: ${failCount} 个`);
      this.addLog('========================================');
      
      wx.showToast({
        title: `清理完成 ${successCount}/${ordersToUpdate.length}`,
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 清理失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('清理失败:', e);
      wx.showToast({
        title: '清理失败',
        icon: 'error'
      });
    }
  },

  // 测试13: 修复 waiting_shoot 状态的订单
  async fixWaitingShootOrders() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔧 测试13: 修复 waiting_shoot 状态订单');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有 waiting_shoot 状态的订单
      this.addLog('📋 查询 waiting_shoot 状态的订单...');
      const waitingOrders = await db.collection('activity_orders')
        .where({ status: 'waiting_shoot' })
        .get();
      
      this.addLog(`📊 找到 ${waitingOrders.data.length} 个订单\n`);
      
      if (waitingOrders.data.length === 0) {
        this.addLog('✅ 没有需要修复的订单');
        wx.showToast({
          title: '没有需要修复的订单',
          icon: 'success'
        });
        return;
      }
      
      // 显示订单信息
      waitingOrders.data.forEach((order, index) => {
        this.addLog(`订单 ${index + 1}:`);
        this.addLog(`  订单号: ${order.orderNo || order._id}`);
        this.addLog(`  学生: ${order.studentName || order.childName}`);
        this.addLog(`  当前状态: ${order.status}`);
        this.addLog('');
      });
      
      // 询问用户是否修复
      const res = await wx.showModal({
        title: '修复确认',
        content: `找到 ${waitingOrders.data.length} 个 waiting_shoot 状态的订单。\n\n将全部改为 in_progress（进行中）状态。\n\n是否继续？`,
        confirmText: '修复',
        confirmColor: '#3b82f6'
      });
      
      if (!res.confirm) {
        this.addLog('❌ 用户取消操作');
        return;
      }
      
      // 批量修复
      this.addLog('\n🔧 开始修复订单状态...\n');
      let successCount = 0;
      let failCount = 0;
      
      for (const order of waitingOrders.data) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                status: 'in_progress',
                updatedAt: new Date().toISOString()
              }
            });
          successCount++;
          this.addLog(`✅ ${order.orderNo || order._id} 已修复`);
        } catch (e) {
          failCount++;
          this.addLog(`❌ ${order.orderNo || order._id} 修复失败: ${e.message}`);
        }
      }
      
      this.addLog('\n========================================');
      this.addLog('🎉 修复完成！');
      this.addLog(`   成功: ${successCount} 个`);
      this.addLog(`   失败: ${failCount} 个`);
      this.addLog('========================================');
      
      wx.showToast({
        title: `修复完成 ${successCount}/${waitingOrders.data.length}`,
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 修复失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('修复失败:', e);
      wx.showToast({
        title: '修复失败',
        icon: 'error'
      });
    }
  },

  // 测试14: 检查活动数据
  async checkActivityData() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试14: 检查活动数据');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 查询所有活动
      this.addLog('📋 查询所有活动...');
      const activitiesRes = await db.collection('activities').get();
      
      this.addLog(`📊 总活动数: ${activitiesRes.data.length}\n`);
      
      if (activitiesRes.data.length === 0) {
        this.addLog('❌ 没有找到任何活动');
        wx.showToast({
          title: '没有活动',
          icon: 'none'
        });
        return;
      }
      
      // 检查每个活动
      activitiesRes.data.forEach((activity, index) => {
        this.addLog(`活动 ${index + 1}: ${activity.title}`);
        this.addLog(`  活动ID: ${activity._id}`);
        this.addLog(`  价格: ${activity.price || '未设置'}`);
        this.addLog(`  原价: ${activity.originalPrice || '未设置'}`);
        this.addLog(`  摄影师IDs: ${activity.photographerIds ? JSON.stringify(activity.photographerIds) : '未设置'}`);
        this.addLog(`  状态: ${activity.status || '未设置'}`);
        this.addLog('');
      });
      
      wx.showToast({
        title: '检查完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 检查失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('检查失败:', e);
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  },

  // 测试15: 检查最新订单状态
  async checkLatestOrders() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试15: 检查最新订单状态');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 查询最新的5个订单
      const ordersRes = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      this.addLog(`📊 查询到最新 ${ordersRes.data.length} 个订单\n`);
      
      if (ordersRes.data.length === 0) {
        this.addLog('❌ 没有找到任何订单');
        wx.showToast({
          title: '没有订单',
          icon: 'none'
        });
        return;
      }
      
      // 统计状态
      const statusCount = {};
      ordersRes.data.forEach(order => {
        const status = order.status || '未设置';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      this.addLog('📊 状态统计:');
      Object.keys(statusCount).forEach(status => {
        this.addLog(`  ${status}: ${statusCount[status]} 个`);
      });
      this.addLog('');
      
      // 检查每个订单
      ordersRes.data.forEach((order, index) => {
        this.addLog(`订单 ${index + 1}:`);
        this.addLog(`  订单ID: ${order._id}`);
        this.addLog(`  活动标题: ${order.activityTitle || '未设置'}`);
        this.addLog(`  状态: ${order.status || '未设置'}`);
        this.addLog(`  价格: ${order.price !== undefined ? order.price : '未设置'}`);
        this.addLog(`  摄影师: ${order.photographerName || '未设置'}`);
        this.addLog(`  创建时间: ${order.createdAt || '未设置'}`);
        this.addLog('');
      });
      
      wx.showToast({
        title: '检查完成',
        icon: 'success'
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 检查失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('检查失败:', e);
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  },

  // 测试16: 批量修复所有 waiting_shoot 订单为 in_progress
  async fixAllWaitingShootToInProgress() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔧 测试16: 批量修复所有待拍摄订单');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 查询所有 waiting_shoot 状态的订单
      this.addLog('📋 查询所有 waiting_shoot 状态的订单...');
      const waitingOrders = await db.collection('activity_orders')
        .where({ status: 'waiting_shoot' })
        .get();
      
      this.addLog(`📊 找到 ${waitingOrders.data.length} 个待拍摄订单\n`);
      
      if (waitingOrders.data.length === 0) {
        this.addLog('✅ 没有需要修复的订单');
        wx.showToast({
          title: '没有需要修复的订单',
          icon: 'success'
        });
        return;
      }
      
      // 直接修复，不询问
      this.addLog('🔧 开始批量修复...\n');
      let successCount = 0;
      let failCount = 0;
      
      for (const order of waitingOrders.data) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                status: 'in_progress',
                updatedAt: new Date().toISOString()
              }
            });
          
          this.addLog(`✅ 订单 ${order._id.substring(0, 8)}... 已修复`);
          successCount++;
        } catch (err) {
          this.addLog(`❌ 订单 ${order._id.substring(0, 8)}... 修复失败: ${err.message}`);
          failCount++;
        }
      }
      
      this.addLog('');
      this.addLog('========================================');
      this.addLog('🎉 修复完成！');
      this.addLog(`✅ 成功: ${successCount} 个`);
      this.addLog(`❌ 失败: ${failCount} 个`);
      this.addLog('========================================');
      
      wx.showToast({
        title: `修复完成！成功${successCount}个`,
        icon: 'success',
        duration: 2000
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 修复失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('修复失败:', e);
      wx.showToast({
        title: '修复失败',
        icon: 'error'
      });
    }
  },

  // 测试21: 诊断支付问题（完整分析）
  async diagnosePaymentIssue() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试21: 诊断支付问题');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 1. 查询指定订单
      const orderNo = 'ACT17610461190310YKLL0';
      this.addLog(`\n📋 查询订单: ${orderNo}`);
      
      const orderResult = await db.collection('activity_orders')
        .where({ orderNo: orderNo })
        .get();
      
      if (orderResult.data.length === 0) {
        this.addLog('❌ 订单不存在！');
      } else {
        const order = orderResult.data[0];
        this.addLog('✅ 找到订单:');
        this.addLog(`   订单ID: ${order._id}`);
        this.addLog(`   活动ID: ${order.activityId}`);
        this.addLog(`   活动标题: ${order.activityTitle}`);
        this.addLog(`   price 字段: ${order.price} (类型: ${typeof order.price})`);
        this.addLog(`   totalPrice 字段: ${order.totalPrice || '不存在'}`);
        this.addLog(`   期望金额(分): ${Math.round((order.price || 0) * 100)}`);
        this.addLog(`   前端传递(分): 1`);
        this.addLog(`   是否匹配: ${Math.round((order.price || 0) * 100) === 1 ? '✅ 是' : '❌ 否'}`);
        
        // 2. 查询活动数据
        this.addLog(`\n📋 查询活动: ${order.activityId}`);
        const activityResult = await db.collection('activities')
          .doc(order.activityId)
          .get();
        
        if (activityResult.data) {
          const activity = activityResult.data;
          this.addLog('✅ 找到活动:');
          this.addLog(`   活动ID: ${activity._id}`);
          this.addLog(`   标题: ${activity.title}`);
          this.addLog(`   price 字段: ${activity.price} (类型: ${typeof activity.price})`);
          this.addLog(`   originalPrice 字段: ${activity.originalPrice || '不存在'}`);
        } else {
          this.addLog('❌ 活动不存在！');
        }
      }
      
      this.addLog('\n========================================');
      this.addLog('📊 诊断结论:');
      
      if (orderResult.data.length > 0) {
        const order = orderResult.data[0];
        const orderPrice = order.price || 0;
        const expectedFee = Math.round(orderPrice * 100);
        
        if (expectedFee === 1) {
          this.addLog('✅ 价格一致，问题可能在其他地方');
        } else {
          this.addLog(`❌ 价格不一致！`);
          this.addLog(`   订单保存的价格: ${orderPrice}元`);
          this.addLog(`   应该保存的价格: 0.01元`);
          this.addLog(`   问题原因: 创建订单时保存了错误的价格`);
          this.addLog(`   解决方案: 需要修复 createActivityOrder 云函数`);
        }
      }
      
      this.addLog('========================================');
      
      this.setData({ 
        testResult: '✅ 诊断完成，查看日志' 
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 诊断失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试20: 检查最新订单的价格
  async checkLatestOrderPrice() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试20: 检查最新订单价格');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 查询最新的订单
      this.addLog('📋 查询最新订单...');
      const result = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      this.addLog(`✅ 找到 ${result.data.length} 个订单\n`);
      
      if (result.data.length === 0) {
        this.addLog('⚠️ 没有找到订单');
        return;
      }
      
      result.data.forEach((order, index) => {
        this.addLog(`订单 ${index + 1}:`);
        this.addLog(`  订单号: ${order.orderNo || '未设置'}`);
        this.addLog(`  订单ID: ${order._id}`);
        this.addLog(`  活动: ${order.activityTitle}`);
        this.addLog(`  价格(price): ${order.price}`);
        this.addLog(`  价格(totalPrice): ${order.totalPrice || '未设置'}`);
        this.addLog(`  状态: ${order.status}`);
        this.addLog(`  支付状态: ${order.paymentStatus}`);
        this.addLog(`  创建时间: ${order.createdAt}`);
        this.addLog('');
      });
      
      this.addLog('========================================');
      this.addLog('✅ 检查完成！');
      this.addLog('========================================');
      
      this.setData({ 
        testResult: `✅ 检查了 ${result.data.length} 个订单` 
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 检查失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试19: 删除所有旧订单（清理数据库）
  async deleteAllOrders() {
    const that = this;
    
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定要删除所有订单吗？\n\n这将删除数据库中的所有订单数据，操作不可恢复！',
      confirmText: '确定删除',
      cancelText: '取消',
      confirmColor: '#e54d42',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }
        
        that.clearLogs();
        that.addLog('========================================');
        that.addLog('🗑️ 测试19: 删除所有订单');
        that.addLog('⚠️ 危险操作：将删除所有订单数据');
        that.addLog('========================================');
        
        try {
          const db = wx.cloud.database();
          
          // 查询所有订单
          that.addLog('📋 查询所有订单...');
          const allOrders = await db.collection('activity_orders').get();
          
          that.addLog(`📊 找到 ${allOrders.data.length} 个订单\n`);
          
          if (allOrders.data.length === 0) {
            that.addLog('✅ 数据库中没有订单');
            wx.showToast({
              title: '没有订单',
              icon: 'success'
            });
            return;
          }
          
          // 显示订单信息
          allOrders.data.forEach((order, index) => {
            that.addLog(`订单 ${index + 1}:`);
            that.addLog(`  ID: ${order._id}`);
            that.addLog(`  活动: ${order.activityTitle || '未知'}`);
            that.addLog(`  价格: ${order.price || 0}元`);
            that.addLog(`  状态: ${order.status}`);
            that.addLog(`  创建时间: ${order.createdAt}`);
            that.addLog('');
          });
          
          that.addLog('----------------------------------------');
          that.addLog('🔥 开始批量删除...');
          
          // 批量删除
          let successCount = 0;
          let failCount = 0;
          
          for (const order of allOrders.data) {
            try {
              await db.collection('activity_orders').doc(order._id).remove();
              successCount++;
              that.addLog(`✅ 已删除: ${order._id.substring(0, 10)}...`);
            } catch (err) {
              failCount++;
              that.addLog(`❌ 删除失败: ${order._id} - ${err.message}`);
            }
          }
          
          that.addLog('========================================');
          that.addLog('✅ 删除完成！');
          that.addLog(`   成功: ${successCount} 个`);
          that.addLog(`   失败: ${failCount} 个`);
          that.addLog('========================================');
          
          that.setData({ 
            testResult: `✅ 成功删除 ${successCount} 个订单，失败 ${failCount} 个` 
          });
          
          wx.showToast({
            title: `删除成功 ${successCount} 个`,
            icon: 'success'
          });
        } catch (e) {
          that.addLog('========================================');
          that.addLog('❌ 删除失败！');
          that.addLog(`错误: ${e.message}`);
          that.addLog('========================================');
          
          that.setData({ testResult: `❌ 失败: ${e.message}` });
          
          wx.showToast({
            title: '删除失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 测试18: 检查活动和摄影师数据
  async checkActivityPhotographers() {
    this.addLog('========================================');
    this.addLog('🔍 开始检查活动和摄影师数据...');
    this.addLog('========================================');

    try {
      const db = wx.cloud.database();
      
      // 1. 查询所有活动
      this.addLog('📋 查询所有活动...');
      const activityRes = await db.collection('activities').get();
      
      this.addLog(`✅ 找到 ${activityRes.data.length} 个活动`);
      
      for (const activity of activityRes.data) {
        this.addLog('----------------------------------------');
        this.addLog(`📌 活动: ${activity.title}`);
        this.addLog(`   ID: ${activity._id}`);
        this.addLog(`   价格: ${activity.price || '未设置'}`);
        this.addLog(`   摄影师ID数组: ${activity.photographerIds ? JSON.stringify(activity.photographerIds) : '未设置'}`);
        
        // 查询摄影师信息
        if (activity.photographerIds && activity.photographerIds.length > 0) {
          this.addLog(`   正在查询 ${activity.photographerIds.length} 个摄影师...`);
          
          const photographerRes = await db.collection('photographers')
            .where({
              _id: db.command.in(activity.photographerIds)
            })
            .get();
          
          this.addLog(`   ✅ 查询到 ${photographerRes.data.length} 个摄影师:`);
          photographerRes.data.forEach(p => {
            this.addLog(`      - ${p.name} (ID: ${p._id})`);
          });
          
          if (photographerRes.data.length !== activity.photographerIds.length) {
            this.addLog(`   ⚠️ 警告: 配置了 ${activity.photographerIds.length} 个摄影师，但只找到 ${photographerRes.data.length} 个！`);
          }
        } else {
          this.addLog(`   ⚠️ 未配置摄影师！`);
        }
      }
      
      this.addLog('========================================');
      this.addLog('✅ 检查完成！');
      this.addLog('========================================');
      
      this.setData({ 
        testResult: `✅ 检查了 ${activityRes.data.length} 个活动` 
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 检查失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试17: 删除所有测试订单
  async deleteTestOrders() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🗑️ 测试17: 删除所有测试订单');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 查询所有测试订单（activityId 为 test_activity）
      this.addLog('📋 查询所有测试订单...');
      const testOrders = await db.collection('activity_orders')
        .where({ activityId: 'test_activity' })
        .get();
      
      this.addLog(`📊 找到 ${testOrders.data.length} 个测试订单\n`);
      
      if (testOrders.data.length === 0) {
        this.addLog('✅ 没有测试订单');
        wx.showToast({
          title: '没有测试订单',
          icon: 'success'
        });
        return;
      }
      
      // 显示测试订单信息
      testOrders.data.forEach((order, index) => {
        this.addLog(`测试订单 ${index + 1}:`);
        this.addLog(`  订单ID: ${order._id}`);
        this.addLog(`  状态: ${order.status}`);
        this.addLog(`  创建时间: ${order.createdAt}`);
        this.addLog('');
      });
      
      // 直接删除，不询问
      this.addLog('🗑️ 开始删除测试订单...\n');
      let successCount = 0;
      let failCount = 0;
      
      for (const order of testOrders.data) {
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .remove();
          
          this.addLog(`✅ 订单 ${order._id.substring(0, 8)}... 已删除`);
          successCount++;
        } catch (err) {
          this.addLog(`❌ 订单 ${order._id.substring(0, 8)}... 删除失败: ${err.message}`);
          failCount++;
        }
      }
      
      this.addLog('');
      this.addLog('========================================');
      this.addLog('🎉 删除完成！');
      this.addLog(`✅ 成功: ${successCount} 个`);
      this.addLog(`❌ 失败: ${failCount} 个`);
      this.addLog('========================================');
      
      wx.showToast({
        title: `删除完成！成功${successCount}个`,
        icon: 'success',
        duration: 2000
      });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 删除失败！');
      this.addLog(`错误: ${e.message}`);
      console.error('删除失败:', e);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 测试24: 诊断订单归属问题
  async diagnoseOrderOwnership() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试24: 诊断订单归属问题');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 1. 获取当前用户信息
      this.addLog('\n📋 获取当前用户信息...');
      const { result } = await wx.cloud.callFunction({
        name: 'unifiedLogin'
      });
      
      const currentOpenId = result.userInfo?._openid || result.userInfo?.openid || result._openid || result.openid;
      const roles = result.roles || [];
      
      this.addLog(`✅ 当前用户OpenID: ${currentOpenId}`);
      this.addLog(`✅ 当前用户角色: ${roles.join(', ')}`);
      this.addLog(`✅ 角色数量: ${roles.length} 个`);
      
      // 特别强调多角色情况
      if (roles.length > 1) {
        this.addLog('\n🎯 检测到多角色用户！');
        this.addLog('✅ 查询逻辑使用 openid，不是角色');
        this.addLog('✅ 不管有几个角色，openid 永远相同');
        this.addLog('✅ 所以查询结果不受角色影响');
      }
      
      // 2. 查询所有订单
      this.addLog('\n📋 查询数据库中所有订单...');
      const allOrders = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      this.addLog(`✅ 找到 ${allOrders.data.length} 个订单\n`);
      
      // 3. 分析每个订单
      allOrders.data.forEach((order, index) => {
        this.addLog(`\n订单 ${index + 1}:`);
        this.addLog(`  订单ID: ${order._id.substring(0, 20)}...`);
        this.addLog(`  学生姓名: ${order.childName || order.studentName || '未知'}`);
        this.addLog(`  订单状态: ${order.status}`);
        this.addLog(`  创建时间: ${order.createdAt}`);
        
        // 检查 _openid
        if (order._openid) {
          this.addLog(`  _openid: ${order._openid.substring(0, 20)}...`);
          if (order._openid === currentOpenId) {
            this.addLog(`           ✅ 是当前用户`);
          } else {
            this.addLog(`           ❌ 不是当前用户`);
          }
        } else {
          this.addLog(`  _openid: ❌ 不存在`);
        }
        
        // 检查 userId
        if (order.userId) {
          this.addLog(`  userId: ${order.userId.substring(0, 20)}...`);
          if (order.userId === currentOpenId) {
            this.addLog(`         ✅ 是当前用户`);
          } else {
            this.addLog(`         ❌ 不是当前用户`);
          }
        } else {
          this.addLog(`  userId: ❌ 不存在`);
        }
        
        // 判断当前用户能否看到这个订单
        const canSee = (order.userId === currentOpenId) || (order._openid === currentOpenId);
        if (canSee) {
          this.addLog(`  📍 查询结果: ✅ 当前用户能看到`);
        } else {
          this.addLog(`  📍 查询结果: ❌ 当前用户看不到`);
        }
      });
      
      // 4. 使用查询逻辑验证
      this.addLog('\n========================================');
      this.addLog('🔍 使用订单列表查询逻辑验证...');
      this.addLog('========================================');
      
      const myOrders = await db.collection('activity_orders')
        .where(db.command.or([
          { userId: currentOpenId },
          { _openid: currentOpenId }
        ]))
        .orderBy('createdAt', 'desc')
        .get();
      
      this.addLog(`\n✅ 查询结果: 找到 ${myOrders.data.length} 个属于当前用户的订单`);
      
      if (myOrders.data.length > 0) {
        this.addLog('\n我的订单列表:');
        myOrders.data.forEach((order, index) => {
          this.addLog(`  ${index + 1}. ${order.childName || order.studentName} - ${order.status}`);
        });
      } else {
        this.addLog('\n❌ 没有找到任何订单！');
        this.addLog('\n可能的原因:');
        this.addLog('1. 所有订单的 _openid 和 userId 都不是当前用户');
        this.addLog('2. 订单是用其他账号创建的');
        this.addLog('3. 需要运行"测试23: 迁移订单userId字段"');
      }
      
      this.addLog('\n========================================');
      this.addLog('📊 诊断完成！');
      this.addLog('========================================');
      
      this.setData({ testResult: `✅ 诊断完成，找到 ${myOrders.data.length} 个订单` });
      
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 诊断失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试23: 迁移订单userId字段
  async migrateOrderUserId() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔄 测试23: 迁移订单userId字段');
    this.addLog('========================================');
    
    const res = await wx.showModal({
      title: '数据迁移确认',
      content: '将为所有缺少userId字段的订单添加userId字段（userId = _openid）。这是一个安全操作，不会删除任何数据。',
      confirmText: '开始迁移',
      cancelText: '取消'
    });
    
    if (!res.confirm) {
      this.addLog('❌ 用户取消操作');
      return;
    }
    
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      this.addLog('\n📋 查询需要迁移的订单...');
      
      // 查询所有订单（包括有userId和没有userId的）
      const allOrders = await db.collection('activity_orders')
        .get();
      
      this.addLog(`✅ 找到 ${allOrders.data.length} 个订单`);
      
      // 筛选出没有userId的订单
      const ordersToMigrate = allOrders.data.filter(order => !order.userId);
      
      this.addLog(`\n需要迁移的订单: ${ordersToMigrate.length} 个`);
      this.addLog(`已有userId的订单: ${allOrders.data.length - ordersToMigrate.length} 个`);
      
      if (ordersToMigrate.length === 0) {
        this.addLog('\n✅ 所有订单都已有userId字段，无需迁移！');
        this.setData({ testResult: '✅ 无需迁移' });
        return;
      }
      
      this.addLog('\n🔄 开始迁移...');
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < ordersToMigrate.length; i++) {
        const order = ordersToMigrate[i];
        try {
          await db.collection('activity_orders')
            .doc(order._id)
            .update({
              data: {
                userId: order._openid  // 设置userId为当前的_openid
              }
            });
          
          successCount++;
          
          if ((i + 1) % 10 === 0) {
            this.addLog(`   已处理 ${i + 1}/${ordersToMigrate.length} 个订单...`);
          }
        } catch (e) {
          this.addLog(`   ❌ 订单 ${order._id} 迁移失败: ${e.message}`);
          failCount++;
        }
      }
      
      this.addLog('\n========================================');
      this.addLog('✅ 迁移完成！');
      this.addLog(`   成功: ${successCount} 个`);
      if (failCount > 0) {
        this.addLog(`   失败: ${failCount} 个`);
      }
      this.addLog('========================================');
      
      // 验证迁移结果
      this.addLog('\n🔍 验证迁移结果...');
      const verifyRes = await db.collection('activity_orders')
        .limit(5)
        .get();
      
      verifyRes.data.forEach((order, index) => {
        this.addLog(`\n订单 ${index + 1}:`);
        this.addLog(`  订单ID: ${order._id.substring(0, 20)}...`);
        this.addLog(`  _openid: ${order._openid ? '✅ 存在' : '❌ 不存在'}`);
        this.addLog(`  userId: ${order.userId ? '✅ 存在' : '❌ 不存在'}`);
        if (order.userId) {
          this.addLog(`  userId == _openid: ${order.userId === order._openid ? '✅ 是' : '❌ 否'}`);
        }
      });
      
      this.setData({ 
        testResult: `✅ 迁移完成！成功: ${successCount}, 失败: ${failCount}` 
      });
      
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 迁移失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  },

  // 测试22: 检查订单photos字段
  async checkOrderPhotos() {
    this.clearLogs();
    this.addLog('========================================');
    this.addLog('🔍 测试22: 检查订单photos字段');
    this.addLog('========================================');
    
    try {
      const db = wx.cloud.database();
      
      // 查询最新5个订单
      this.addLog('\n📋 查询最新5个订单...');
      const result = await db.collection('activity_orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      if (result.data.length === 0) {
        this.addLog('❌ 没有订单数据！');
        return;
      }
      
      this.addLog(`✅ 找到 ${result.data.length} 个订单\n`);
      
      result.data.forEach((order, index) => {
        this.addLog(`\n订单 ${index + 1}:`);
        this.addLog(`  订单ID: ${order._id}`);
        this.addLog(`  学生姓名: ${order.childName || order.studentName || '未知'}`);
        this.addLog(`  订单状态: ${order.status}`);
        this.addLog(`  支付状态: ${order.paymentStatus || '未知'}`);
        
        // 检查photos字段
        if (!order.photos) {
          this.addLog(`  photos字段: ❌ 不存在`);
        } else if (Array.isArray(order.photos)) {
          this.addLog(`  photos字段: ✅ 存在 (数组)`);
          this.addLog(`  照片数量: ${order.photos.length}`);
          if (order.photos.length > 0) {
            this.addLog(`  第一张照片: ${order.photos[0].substring(0, 50)}...`);
          }
        } else {
          this.addLog(`  photos字段: ⚠️ 存在但类型错误 (${typeof order.photos})`);
        }
        
        // 检查其他相关字段
        this.addLog(`  photographerNote: ${order.photographerNote || '无'}`);
        this.addLog(`  submittedAt: ${order.submittedAt || '未提交'}`);
        this.addLog(`  reviewStatus: ${order.reviewStatus || '未知'}`);
      });
      
      this.addLog('\n========================================');
      this.addLog('📊 检查完成！');
      this.addLog('========================================');
      
      this.setData({ testResult: '✅ 检查完成，查看日志' });
    } catch (e) {
      this.addLog('========================================');
      this.addLog('❌ 检查失败！');
      this.addLog(`错误: ${e.message}`);
      this.addLog('========================================');
      
      this.setData({ testResult: `❌ 失败: ${e.message}` });
    }
  }
});

