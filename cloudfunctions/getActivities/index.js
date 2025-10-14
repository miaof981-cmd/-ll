// 云函数：获取活动列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const { 
      category,      // 分类筛选
      status,        // 状态筛选
      keyword,       // 关键词搜索
      limit = 20,    // 每页数量
      skip = 0       // 跳过数量
    } = event;
    
    let query = {};
    
    // 构建查询条件
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (keyword) {
      query.title = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }
    
    // 查询活动列表
    const res = await db.collection('activities')
      .where(query)
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    // 获取总数
    const countRes = await db.collection('activities')
      .where(query)
      .count();
    
    return {
      success: true,
      data: res.data,
      total: countRes.total
    };
  } catch (err) {
    console.error('获取活动列表失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

