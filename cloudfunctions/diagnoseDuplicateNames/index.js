// 云函数：诊断重复姓名的摄影师数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('🔍 开始诊断摄影师数据...');
    
    // 获取所有摄影师记录
    const allPhotographers = await db.collection('photographers').get();
    
    console.log(`📊 总共 ${allPhotographers.data.length} 条摄影师记录`);
    
    // 详细输出每条记录
    console.log('\n📋 所有摄影师记录详情：');
    allPhotographers.data.forEach((p, index) => {
      console.log(`\n--- 记录 ${index + 1} ---`);
      console.log(`_id: ${p._id}`);
      console.log(`姓名: ${p.name}`);
      console.log(`_openid: ${p._openid || '❌ 未设置'}`);
      console.log(`创建时间: ${p.createdAt}`);
      console.log(`状态: ${p.status || '未设置'}`);
    });
    
    // 按姓名分组，找出重复的姓名
    const nameMap = new Map();
    allPhotographers.data.forEach(p => {
      if (!nameMap.has(p.name)) {
        nameMap.set(p.name, []);
      }
      nameMap.get(p.name).push(p);
    });
    
    // 找出重复的姓名
    const duplicateNames = [];
    nameMap.forEach((records, name) => {
      if (records.length > 1) {
        duplicateNames.push({
          name: name,
          count: records.length,
          records: records.map(r => ({
            _id: r._id,
            _openid: r._openid || '❌ 未设置',
            createdAt: r.createdAt,
            status: r.status
          }))
        });
      }
    });
    
    console.log('\n⚠️ 重复姓名统计：');
    if (duplicateNames.length === 0) {
      console.log('✅ 没有发现重复姓名');
    } else {
      duplicateNames.forEach(dup => {
        console.log(`\n姓名: ${dup.name} (共 ${dup.count} 条记录)`);
        dup.records.forEach((r, i) => {
          console.log(`  ${i + 1}. _id: ${r._id}`);
          console.log(`     _openid: ${r._openid}`);
          console.log(`     创建时间: ${r.createdAt}`);
        });
      });
    }
    
    // 检查 _openid 重复情况
    const openidMap = new Map();
    allPhotographers.data.forEach(p => {
      if (p._openid) {
        if (!openidMap.has(p._openid)) {
          openidMap.set(p._openid, []);
        }
        openidMap.get(p._openid).push(p);
      }
    });
    
    const duplicateOpenids = [];
    openidMap.forEach((records, openid) => {
      if (records.length > 1) {
        duplicateOpenids.push({
          openid: openid,
          count: records.length,
          records: records.map(r => ({
            _id: r._id,
            name: r.name,
            createdAt: r.createdAt
          }))
        });
      }
    });
    
    console.log('\n⚠️ 重复 OpenID 统计：');
    if (duplicateOpenids.length === 0) {
      console.log('✅ 没有发现重复 OpenID');
    } else {
      duplicateOpenids.forEach(dup => {
        console.log(`\nOpenID: ${dup.openid} (共 ${dup.count} 条记录)`);
        dup.records.forEach((r, i) => {
          console.log(`  ${i + 1}. 姓名: ${r.name}, _id: ${r._id}`);
        });
      });
    }
    
    // 查找没有 _openid 的记录
    const noOpenid = allPhotographers.data.filter(p => !p._openid);
    if (noOpenid.length > 0) {
      console.log('\n⚠️ 没有 _openid 的记录：');
      noOpenid.forEach(p => {
        console.log(`  - 姓名: ${p.name}, _id: ${p._id}, 创建时间: ${p.createdAt}`);
      });
    }
    
    // 构建返回结果
    return {
      success: true,
      summary: {
        totalCount: allPhotographers.data.length,
        duplicateNames: duplicateNames.length,
        duplicateOpenids: duplicateOpenids.length,
        noOpenidCount: noOpenid.length
      },
      allRecords: allPhotographers.data.map(p => ({
        _id: p._id,
        name: p.name,
        _openid: p._openid || '❌ 未设置',
        createdAt: p.createdAt,
        status: p.status
      })),
      duplicateNames: duplicateNames,
      duplicateOpenids: duplicateOpenids,
      noOpenidRecords: noOpenid.map(p => ({
        _id: p._id,
        name: p.name,
        createdAt: p.createdAt
      }))
    };
    
  } catch (error) {
    console.error('❌ 诊断失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

