// cloudfunctions/fixDataIssues/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, dryRun = true } = event;
  
  console.log(`🔧 开始数据修复... 模式: ${dryRun ? '预览' : '执行'}`);
  
  const results = {
    success: true,
    mode: dryRun ? '预览模式' : '执行模式',
    actions: []
  };
  
  try {
    // ==================== 1. 处理异常fileID（高优先级） ====================
    if (!action || action === 'fixAbnormalFileIds') {
      console.log('🔴 处理异常fileID...');
      
      const abnormalOrders = [
        'a292647f68ef2ce602cca0261d6c5378',
        'c4a9204c68ef2d9102d2929b1db3b305'
      ];
      
      for (const orderId of abnormalOrders) {
        const order = await db.collection('activity_orders').doc(orderId).get();
        
        if (order.data && order.data.photos) {
          const photos = order.data.photos;
          const abnormalPhotos = photos.filter(url => 
            url && url.startsWith('cloud://') && url.length < 60
          );
          
          if (abnormalPhotos.length > 0) {
            results.actions.push({
              type: 'abnormalFileId',
              orderId,
              issue: `发现 ${abnormalPhotos.length} 个异常fileID`,
              abnormalPhotos,
              recommendation: '需要人工检查：重新上传图片或删除异常URL'
            });
            
            if (!dryRun) {
              // 方案1: 删除异常URL（推荐）
              const cleanPhotos = photos.filter(url => 
                !url || !url.startsWith('cloud://') || url.length >= 60
              );
              
              await db.collection('activity_orders').doc(orderId).update({
                data: {
                  photos: cleanPhotos,
                  _fixNote: `已清理 ${abnormalPhotos.length} 个异常fileID，时间: ${new Date().toISOString()}`
                }
              });
              
              results.actions[results.actions.length - 1].fixed = true;
            }
          }
        }
      }
    }
    
    // ==================== 2. 补全活动快照（中优先级） ====================
    if (!action || action === 'fillActivitySnapshots') {
      console.log('🟡 补全活动快照...');
      
      const missingSnapshotOrders = await db.collection('activity_orders')
        .where({
          activityName: _.or(_.eq(''), _.eq(null), _.exists(false))
        })
        .limit(100)
        .get();
      
      console.log(`找到 ${missingSnapshotOrders.data.length} 个缺少快照的订单`);
      
      // 收集所有活动ID
      const activityIds = [...new Set(
        missingSnapshotOrders.data
          .map(order => order.activityId)
          .filter(id => id)
      )];
      
      // 批量查询活动信息
      let activities = [];
      if (activityIds.length > 0) {
        const activityRes = await db.collection('activities')
          .where({ _id: _.in(activityIds) })
          .get();
        activities = activityRes.data;
      }
      
      const activityMap = new Map(activities.map(a => [a._id, a]));
      
      for (const order of missingSnapshotOrders.data) {
        const activity = activityMap.get(order.activityId);
        
        if (activity) {
          results.actions.push({
            type: 'fillSnapshot',
            orderId: order._id,
            activityId: order.activityId,
            activityName: activity.name,
            action: '补全活动快照'
          });
          
          if (!dryRun) {
            await db.collection('activity_orders').doc(order._id).update({
              data: {
                activityName: activity.name,
                activityCover: activity.coverImage || '',
                price: activity.price || order.totalPrice || 0
              }
            });
          }
        } else {
          results.actions.push({
            type: 'fillSnapshot',
            orderId: order._id,
            activityId: order.activityId,
            issue: '活动不存在',
            action: '无法补全快照，建议标记为"已归档活动"'
          });
          
          if (!dryRun) {
            await db.collection('activity_orders').doc(order._id).update({
              data: {
                activityName: '已归档活动',
                activityCover: '',
                price: order.totalPrice || 0
              }
            });
          }
        }
      }
    }
    
    // ==================== 3. 归档测试数据（低优先级） ====================
    if (!action || action === 'archiveTestData') {
      console.log('🟢 归档测试数据...');
      
      // 3.1 归档 test_activity 订单
      const testActivityOrders = await db.collection('activity_orders')
        .where({
          activityId: db.RegExp({ regexp: 'test', options: 'i' })
        })
        .limit(50)
        .get();
      
      for (const order of testActivityOrders.data) {
        results.actions.push({
          type: 'archiveTestOrder',
          orderId: order._id,
          activityId: order.activityId,
          action: '标记为归档'
        });
        
        if (!dryRun) {
          await db.collection('activity_orders').doc(order._id).update({
            data: {
              isArchived: true,
              archivedAt: new Date().toISOString(),
              archivedReason: '测试订单自动归档'
            }
          });
        }
      }
      
      // 3.2 归档测试学生
      const testStudents = await db.collection('students')
        .where({
          studentId: db.RegExp({ regexp: '^(111|test)', options: 'i' })
        })
        .limit(50)
        .get();
      
      for (const student of testStudents.data) {
        results.actions.push({
          type: 'archiveTestStudent',
          studentId: student.studentId,
          name: student.name,
          action: '标记为归档'
        });
        
        if (!dryRun) {
          await db.collection('students').doc(student._id).update({
            data: {
              isArchived: true,
              archivedAt: new Date().toISOString()
            }
          });
        }
      }
    }
    
    // ==================== 4. 清理空URL（附加优化） ====================
    if (!action || action === 'cleanEmptyUrls') {
      console.log('🧹 清理空URL...');
      
      const ordersWithPhotos = await db.collection('activity_orders')
        .where({ photos: _.exists(true) })
        .limit(200)
        .get();
      
      for (const order of ordersWithPhotos.data) {
        if (order.photos && Array.isArray(order.photos)) {
          const originalLength = order.photos.length;
          const cleanPhotos = order.photos.filter(url => 
            url && typeof url === 'string' && url.trim() !== ''
          );
          
          if (cleanPhotos.length !== originalLength) {
            results.actions.push({
              type: 'cleanEmptyUrl',
              orderId: order._id,
              before: originalLength,
              after: cleanPhotos.length,
              removed: originalLength - cleanPhotos.length
            });
            
            if (!dryRun) {
              await db.collection('activity_orders').doc(order._id).update({
                data: { photos: cleanPhotos }
              });
            }
          }
        }
      }
    }
    
    // 统计
    results.summary = {
      total: results.actions.length,
      byType: {
        abnormalFileId: results.actions.filter(a => a.type === 'abnormalFileId').length,
        fillSnapshot: results.actions.filter(a => a.type === 'fillSnapshot').length,
        archiveTestOrder: results.actions.filter(a => a.type === 'archiveTestOrder').length,
        archiveTestStudent: results.actions.filter(a => a.type === 'archiveTestStudent').length,
        cleanEmptyUrl: results.actions.filter(a => a.type === 'cleanEmptyUrl').length
      }
    };
    
    console.log('✅ 数据修复完成');
    console.log(`   处理动作数: ${results.actions.length}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ 数据修复失败:', error);
    return {
      success: false,
      error: error.message,
      actions: results.actions
    };
  }
};

