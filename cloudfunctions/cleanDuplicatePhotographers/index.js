// 云函数：清理重复的摄影师记录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('🔍 开始检查重复的摄影师记录...');
    
    // 获取所有摄影师记录
    const allPhotographers = await db.collection('photographers')
      .get();
    
    console.log(`📊 总共 ${allPhotographers.data.length} 条摄影师记录`);
    
    // 按 _openid 分组
    const openidMap = new Map();
    allPhotographers.data.forEach(p => {
      if (p._openid) {
        if (!openidMap.has(p._openid)) {
          openidMap.set(p._openid, []);
        }
        openidMap.get(p._openid).push(p);
      }
    });
    
    // 找出重复的记录
    const duplicates = [];
    openidMap.forEach((records, openid) => {
      if (records.length > 1) {
        duplicates.push({
          openid: openid,
          count: records.length,
          records: records
        });
      }
    });
    
    console.log(`⚠️ 发现 ${duplicates.length} 个重复的 OpenID`);
    
    if (duplicates.length === 0) {
      return {
        success: true,
        message: '✅ 没有发现重复的摄影师记录',
        duplicates: []
      };
    }
    
    // 输出重复详情
    const report = duplicates.map(dup => {
      return {
        openid: dup.openid,
        count: dup.count,
        records: dup.records.map(r => ({
          _id: r._id,
          name: r.name,
          createdAt: r.createdAt
        }))
      };
    });
    
    console.log('📋 重复记录详情:', JSON.stringify(report, null, 2));
    
    // 如果传入 autoClean=true，自动清理（保留最早创建的）
    if (event.autoClean === true) {
      console.log('🧹 开始自动清理重复记录...');
      
      let cleanedCount = 0;
      for (const dup of duplicates) {
        // 按创建时间排序，保留最早的
        const sorted = dup.records.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });
        
        const keepRecord = sorted[0]; // 保留第一条（最早的）
        const removeRecords = sorted.slice(1); // 删除其他的
        
        console.log(`📌 保留: ${keepRecord.name} (${keepRecord._id})`);
        
        for (const record of removeRecords) {
          try {
            await db.collection('photographers').doc(record._id).remove();
            console.log(`🗑️ 删除: ${record.name} (${record._id})`);
            cleanedCount++;
          } catch (e) {
            console.error(`❌ 删除失败: ${record._id}`, e);
          }
        }
      }
      
      return {
        success: true,
        message: `✅ 清理完成，删除了 ${cleanedCount} 条重复记录`,
        duplicates: report,
        cleaned: cleanedCount
      };
    }
    
    // 不自动清理，只返回报告
    return {
      success: true,
      message: `⚠️ 发现 ${duplicates.length} 个重复的 OpenID，共 ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} 条重复记录`,
      duplicates: report,
      suggestion: '传入 autoClean: true 可自动清理（保留最早创建的记录）'
    };
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

