// 云函数：获取活动详情
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { activityId } = event;
    
    if (!activityId) {
      return {
        success: false,
        error: '活动ID不能为空'
      };
    }
    
    // 获取活动信息
    const activityRes = await db.collection('activities')
      .doc(activityId)
      .get();
    
    if (!activityRes.data) {
      return {
        success: false,
        error: '活动不存在'
      };
    }
    
    const activity = activityRes.data;
    
    // 增加浏览次数
    await db.collection('activities')
      .doc(activityId)
      .update({
        data: {
          viewCount: db.command.inc(1)
        }
      });
    
    // 获取摄影师信息
    let photographers = [];
    try {
      if (activity.photographerIds && activity.photographerIds.length > 0) {
        // 🔥 先对 photographerIds 去重，避免重复ID
        const uniqueIds = [...new Set(activity.photographerIds)];
        
        const photographersRes = await db.collection('photographers')
          .where({ _id: db.command.in(uniqueIds) })
          .limit(100)
          .get();
        photographers = photographersRes.data || [];
      }

      // 兜底策略：若未配置或数量过少，则展示可用摄影师（status=available）供用户选择
      if (!photographers || photographers.length === 0) {
        const fallbackRes = await db.collection('photographers')
          .where({ status: 'available' })
          .limit(100)
          .get();
        photographers = fallbackRes.data || [];
      }
      
      // 🔥 最后再根据 _openid 去重，防止数据库中有重复记录
      const seenOpenIds = new Set();
      photographers = photographers.filter(p => {
        if (!p._openid) return true; // 保留没有 openid 的记录
        if (seenOpenIds.has(p._openid)) {
          console.warn(`⚠️ 发现重复摄影师: ${p.name} (openid: ${p._openid})`);
          return false; // 过滤掉重复的
        }
        seenOpenIds.add(p._openid);
        return true;
      });
      
      console.log(`✅ 加载摄影师列表成功，共 ${photographers.length} 位（已去重）`);
    } catch (e) {
      console.error('加载摄影师列表失败:', e);
      photographers = [];
    }
    
    return {
      success: true,
      activity: activity,
      photographers: photographers
    };
  } catch (err) {
    console.error('获取活动详情失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

