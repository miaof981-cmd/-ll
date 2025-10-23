// cloudfunctions/createIndexes/index.js - 创建数据库索引
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  console.log('🔧 开始创建数据库索引...');
  
  const db = cloud.database();
  const results = [];
  
  try {
    // 1. activity_orders 集合：组合索引（userId + _openid + createdAt）
    console.log('📊 创建 activity_orders 索引...');
    try {
      await db.collection('activity_orders').createIndex({
        keys: {
          userId: 1,
          _openid: 1,
          createdAt: -1
        },
        name: 'idx_user_time',
        unique: false
      });
      results.push({ collection: 'activity_orders', index: 'idx_user_time', status: 'success' });
      console.log('✅ activity_orders 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'activity_orders', index: 'idx_user_time', status: 'exists' });
        console.log('ℹ️ activity_orders 索引已存在');
      } else {
        throw e;
      }
    }

    // 2. activity_orders 集合：photographerId 索引
    console.log('📊 创建 activity_orders photographerId 索引...');
    try {
      await db.collection('activity_orders').createIndex({
        keys: { photographerId: 1 },
        name: 'idx_photographer',
        unique: false
      });
      results.push({ collection: 'activity_orders', index: 'idx_photographer', status: 'success' });
      console.log('✅ photographerId 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'activity_orders', index: 'idx_photographer', status: 'exists' });
        console.log('ℹ️ photographerId 索引已存在');
      } else {
        console.warn('⚠️ photographerId 索引创建失败:', e.message);
      }
    }

    // 3. activity_orders 集合：status 索引
    console.log('📊 创建 activity_orders status 索引...');
    try {
      await db.collection('activity_orders').createIndex({
        keys: { status: 1 },
        name: 'idx_status',
        unique: false
      });
      results.push({ collection: 'activity_orders', index: 'idx_status', status: 'success' });
      console.log('✅ status 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'activity_orders', index: 'idx_status', status: 'exists' });
        console.log('ℹ️ status 索引已存在');
      } else {
        console.warn('⚠️ status 索引创建失败:', e.message);
      }
    }

    // 4. users 集合：_openid 索引
    console.log('📊 创建 users _openid 索引...');
    try {
      await db.collection('users').createIndex({
        keys: { _openid: 1 },
        name: 'idx_openid',
        unique: true  // OpenID唯一
      });
      results.push({ collection: 'users', index: 'idx_openid', status: 'success' });
      console.log('✅ users _openid 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'users', index: 'idx_openid', status: 'exists' });
        console.log('ℹ️ users _openid 索引已存在');
      } else {
        console.warn('⚠️ users _openid 索引创建失败:', e.message);
      }
    }

    // 5. photographers 集合：_openid 索引
    console.log('📊 创建 photographers _openid 索引...');
    try {
      await db.collection('photographers').createIndex({
        keys: { _openid: 1 },
        name: 'idx_openid',
        unique: false
      });
      results.push({ collection: 'photographers', index: 'idx_openid', status: 'success' });
      console.log('✅ photographers _openid 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'photographers', index: 'idx_openid', status: 'exists' });
        console.log('ℹ️ photographers _openid 索引已存在');
      } else {
        console.warn('⚠️ photographers _openid 索引创建失败:', e.message);
      }
    }

    // 6. banners 集合：_openid + order 索引
    console.log('📊 创建 banners 索引...');
    try {
      await db.collection('banners').createIndex({
        keys: {
          _openid: 1,
          order: 1
        },
        name: 'idx_openid_order',
        unique: false
      });
      results.push({ collection: 'banners', index: 'idx_openid_order', status: 'success' });
      console.log('✅ banners 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'banners', index: 'idx_openid_order', status: 'exists' });
        console.log('ℹ️ banners 索引已存在');
      } else {
        console.warn('⚠️ banners 索引创建失败:', e.message);
      }
    }

    // 7. announcements 集合：_openid + createdAt 索引
    console.log('📊 创建 announcements 索引...');
    try {
      await db.collection('announcements').createIndex({
        keys: {
          _openid: 1,
          createdAt: -1
        },
        name: 'idx_openid_time',
        unique: false
      });
      results.push({ collection: 'announcements', index: 'idx_openid_time', status: 'success' });
      console.log('✅ announcements 索引创建成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        results.push({ collection: 'announcements', index: 'idx_openid_time', status: 'exists' });
        console.log('ℹ️ announcements 索引已存在');
      } else {
        console.warn('⚠️ announcements 索引创建失败:', e.message);
      }
    }

    console.log('✅ 索引创建完成！');
    
    return {
      success: true,
      message: '索引创建完成',
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        exists: results.filter(r => r.status === 'exists').length
      }
    };

  } catch (error) {
    console.error('❌ 索引创建失败:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
};

