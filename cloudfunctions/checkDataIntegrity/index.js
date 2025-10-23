// cloudfunctions/checkDataIntegrity/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  console.log('🔍 开始数据完整性检查...');
  
  const issues = [];
  
  try {
    // 1. 检查订单中的空图片URL
    console.log('📊 检查订单图片URL...');
    const ordersRes = await db.collection('activity_orders')
      .where({ photos: _.exists(true) })
      .limit(1000)
      .get();
    
    ordersRes.data.forEach(order => {
      if (order.photos && Array.isArray(order.photos)) {
        const emptyPhotos = order.photos.filter(url => !url || url.trim() === '');
        if (emptyPhotos.length > 0) {
          issues.push({
            type: '空图片URL',
            collection: 'activity_orders',
            docId: order._id,
            field: 'photos',
            problem: `包含 ${emptyPhotos.length} 个空URL，共 ${order.photos.length} 张`,
            severity: 'medium',
            fix: '移除空值'
          });
        }
        
        // 检查异常短的 fileID
        order.photos.forEach((url, index) => {
          if (url && typeof url === 'string' && url.startsWith('cloud://') && url.length < 60) {
            issues.push({
              type: '异常fileID',
              collection: 'activity_orders',
              docId: order._id,
              field: `photos[${index}]`,
              problem: `fileID长度异常: ${url.length} 字符`,
              severity: 'high',
              fix: '可能被截断，需人工检查'
            });
          }
        });
      }
      
      // 检查其他图片字段
      ['childPhoto', 'activityCover'].forEach(field => {
        const url = order[field];
        if (url && typeof url === 'string') {
          if (url === '' || url.trim() === '') {
            issues.push({
              type: '空图片URL',
              collection: 'activity_orders',
              docId: order._id,
              field,
              problem: '图片URL为空字符串',
              severity: 'low',
              fix: '设置为 null 或删除该字段'
            });
          } else if (url.startsWith('cloud://') && url.length < 60) {
            issues.push({
              type: '异常fileID',
              collection: 'activity_orders',
              docId: order._id,
              field,
              problem: `fileID长度异常: ${url.length} 字符`,
              severity: 'high',
              fix: '可能被截断，需人工检查'
            });
          }
        }
      });
    });
    
    // 2. 检查缺少快照字段的订单
    console.log('📊 检查订单快照字段...');
    const noSnapshotOrders = await db.collection('activity_orders')
      .where({
        activityName: _.or(_.eq(''), _.eq(null), _.exists(false))
      })
      .limit(500)
      .get();
    
    noSnapshotOrders.data.forEach(order => {
      issues.push({
        type: '缺少活动快照',
        collection: 'activity_orders',
        docId: order._id,
        field: 'activityName',
        problem: '活动删除后将显示"未知活动"',
        severity: 'medium',
        fix: '从 activities 集合补全快照（如活动仍存在）'
      });
    });
    
    // 3. 检查测试数据
    console.log('📊 检查测试数据...');
    const testOrders = await db.collection('activity_orders')
      .where({
        activityId: db.RegExp({ regexp: 'test', options: 'i' })
      })
      .limit(100)
      .get();
    
    testOrders.data.forEach(order => {
      issues.push({
        type: '测试数据',
        collection: 'activity_orders',
        docId: order._id,
        field: 'activityId',
        problem: `引用测试活动: ${order.activityId}`,
        severity: 'low',
        fix: '删除或标记为归档'
      });
    });
    
    // 4. 检查学号为测试数据的学生
    console.log('📊 检查学生测试数据...');
    const testStudents = await db.collection('students')
      .where({
        studentId: db.RegExp({ regexp: '^(111|test)', options: 'i' })
      })
      .limit(100)
      .get();
    
    testStudents.data.forEach(student => {
      issues.push({
        type: '测试数据',
        collection: 'students',
        docId: student._id,
        field: 'studentId',
        problem: `测试学号: ${student.studentId}`,
        severity: 'low',
        fix: '删除或修改为正式学号'
      });
    });
    
    // 5. 检查价格异常的订单（测试价格）
    console.log('📊 检查价格异常订单...');
    const abnormalPriceOrders = await db.collection('activity_orders')
      .where({
        totalPrice: _.or(_.eq(0.01), _.eq(0), _.eq(null))
      })
      .limit(100)
      .get();
    
    abnormalPriceOrders.data.forEach(order => {
      if (order.totalPrice === 0.01 || order.totalPrice === 0) {
        issues.push({
          type: '价格异常',
          collection: 'activity_orders',
          docId: order._id,
          field: 'totalPrice',
          problem: `测试价格: ${order.totalPrice} 元`,
          severity: 'low',
          fix: '可能是测试订单，确认后删除或修正价格'
        });
      }
    });
    
    // 6. 按严重程度排序
    issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    // 7. 统计汇总
    const summary = {
      total: issues.length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      byType: {
        emptyUrls: issues.filter(i => i.type === '空图片URL').length,
        abnormalFileIds: issues.filter(i => i.type === '异常fileID').length,
        missingSnapshots: issues.filter(i => i.type === '缺少活动快照').length,
        testData: issues.filter(i => i.type === '测试数据').length,
        priceAbnormal: issues.filter(i => i.type === '价格异常').length
      }
    };
    
    console.log(`✅ 检查完成，发现 ${issues.length} 个问题`);
    console.log('   - 高优先级:', summary.high);
    console.log('   - 中优先级:', summary.medium);
    console.log('   - 低优先级:', summary.low);
    
    return {
      success: true,
      issueCount: issues.length,
      issues: issues.slice(0, 100), // 最多返回100个问题
      summary
    };
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    return {
      success: false,
      error: error.message,
      issues: []
    };
  }
};

