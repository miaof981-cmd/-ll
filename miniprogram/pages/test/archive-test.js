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

      // 1. 创建测试订单（状态：pending_confirm）
      this.addLog('📝 创建待确认订单...');
      const orderData = {
        orderNo: 'TEST' + Date.now(),
        activityId: '43d365dc68ee129202af48e635a3651e', // 证件照活动ID
        studentName: '待确认学生_' + Date.now(),
        parentName: '测试家长',
        parentPhone: '13800138000',
        gender: '女',
        age: 5,
        class: '待分配',
        photographerId: '4402541d68edd59f02a92fb31d00f57d', // 真实摄影师ID
        photographerName: 'miao',
        lifePhotos: [],
        photos: [
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-1.png',
          'cloud://cloud1-9gdsq5jxb7e60ab4.636c-cloud1-9gdsq5jxb7e60ab4-1330903800/test-photo-2.png'
        ],
        remark: '测试订单-请手动确认',
        totalPrice: 22,
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

      // 1. 先创建一个测试订单
      this.addLog('📝 创建测试订单...');
      const orderData = {
        orderNo: 'TEST' + Date.now(),
        activityId: '43d365dc68ee129202af48e635a3651e', // 证件照活动ID
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
        totalPrice: 20,
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

      // 2. 获取活动信息
      this.addLog('📡 获取活动信息...');
      const activityRes = await db.collection('activities')
        .doc(orderData.activityId)
        .get();

      const activity = activityRes.data;
      this.addLog(`✅ 活动名称: ${activity.name}`);
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
  }
});

