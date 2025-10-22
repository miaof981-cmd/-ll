// cloudfunctions/unifiedLogin/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    const { userInfo } = event;
    
    console.log('========================================');
    console.log('☁️ unifiedLogin 云函数被调用');
    console.log('📥 接收到的 userInfo:', JSON.stringify(userInfo, null, 2));
    console.log('  nickName:', userInfo?.nickName);
    console.log('  avatarUrl:', userInfo?.avatarUrl);
    console.log('========================================');
    
    // 1. 识别用户角色
    const roles = await identifyUserRoles(openid);
    
    // 2. 查找或创建用户记录
    const userRecord = await findOrCreateUser(openid, userInfo, roles);
    
    console.log('========================================');
    console.log('📤 准备返回的 userRecord:');
    console.log('  nickName:', userRecord.nickName);
    console.log('  avatarUrl:', userRecord.avatarUrl);
    console.log('  openid:', userRecord.openid);
    console.log('  roles:', roles);
    console.log('========================================');
    
    // 3. 更新最后登录时间
    await db.collection('users').doc(userRecord._id).update({
      data: {
        lastLoginAt: new Date().toISOString()
      }
    });
    
    return {
      success: true,
      user: userRecord,
      roles: roles,
      openid: openid
    };
    
  } catch (error) {
    console.error('❌ 登录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 识别用户角色
 */
async function identifyUserRoles(openid) {
  const roles = [];
  
  // 1. 检查是否为管理员
  const adminCheck = await db.collection('admin_list')
    .where({
      openid: openid,
      isActive: true
    })
    .get();
  
  if (adminCheck.data && adminCheck.data.length > 0) {
    roles.push('admin');
  }
  
  // 2. 检查是否为摄影师
  const photographerCheck = await db.collection('photographer_accounts')
    .where({
      openid: openid,
      isActive: true
    })
    .get();
  
  if (photographerCheck.data && photographerCheck.data.length > 0) {
    roles.push('photographer');
  }
  
  // 3. 默认都有家长角色
  if (!roles.includes('parent')) {
    roles.push('parent');
  }
  
  return roles;
}

/**
 * 查找或创建用户记录
 */
async function findOrCreateUser(openid, userInfo, roles) {
  // 确保 userInfo 存在，如果不存在则使用默认值
  const safeUserInfo = userInfo || {};
  const nickName = safeUserInfo.nickName || '微信用户';
  const avatarUrl = safeUserInfo.avatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
  
  console.log('🔧 处理后的用户信息:');
  console.log('  nickName:', nickName);
  console.log('  avatarUrl:', avatarUrl);
  
  // 查找现有用户
  const existingUser = await db.collection('users')
    .where({ _openid: openid })
    .get();
  
  if (existingUser.data && existingUser.data.length > 0) {
    // 更新用户信息和角色
    const userId = existingUser.data[0]._id;
    await db.collection('users').doc(userId).update({
      data: {
        nickName: nickName,
        avatarUrl: avatarUrl,
        roles: roles
      }
    });
    
    // 返回更新后的用户信息
    return {
      ...existingUser.data[0],
      nickName: nickName,               // ✅ 使用处理后的昵称
      avatarUrl: avatarUrl,             // ✅ 使用处理后的头像
      openid: openid,                   // ✅ 添加 openid 字段
      roles: roles
    };
  } else {
    // 创建新用户
    const newUser = {
      _openid: openid,
      openid: openid,                   // ✅ 同时保存 openid 字段
      nickName: nickName,
      avatarUrl: avatarUrl,
      roles: roles,
      currentRole: roles[0],  // 默认第一个角色
      children: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    const res = await db.collection('users').add({
      data: newUser
    });
    
    return {
      ...newUser,
      _id: res._id
    };
  }
}

