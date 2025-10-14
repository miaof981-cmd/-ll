// 云函数：学生管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  
  console.log('云函数调用:', action, '用户:', wxContext.OPENID);
  
  try {
    switch (action) {
      // 获取学生列表
      case 'list':
        return await db.collection('students')
          .orderBy('createdAt', 'desc')
          .get();
      
      // 添加学生
      case 'add':
        // 生成学号
        if (!data.studentId) {
          data.studentId = await generateStudentId();
        }
        
        return await db.collection('students').add({
          data: {
            ...data,
            password: data.password || '123456',
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      
      // 更新学生
      case 'update':
        const { _id, studentId, ...updateData } = data;
        return await db.collection('students').doc(_id).update({
          data: {
            ...updateData,
            updatedAt: db.serverDate()
          }
        });
      
      // 删除学生
      case 'delete':
        return await db.collection('students').doc(data._id).remove();
      
      // 根据学号获取学生
      case 'getByStudentId':
        return await db.collection('students')
          .where({
            studentId: data.studentId
          })
          .get();
      
      // 学生登录验证
      case 'login':
        const result = await db.collection('students')
          .where({
            studentId: data.studentId,
            password: data.password
          })
          .get();
        
        if (result.data.length > 0) {
          return {
            success: true,
            student: result.data[0]
          };
        } else {
          return {
            success: false,
            message: '学号或密码错误'
          };
        }
      
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (e) {
    console.error('云函数执行失败:', e);
    return {
      success: false,
      error: e.message
    };
  }
};

// 生成学号
async function generateStudentId() {
  const year = new Date().getFullYear();
  
  // 获取当前年份的学生
  const res = await db.collection('students')
    .where({
      studentId: db.RegExp({
        regexp: `^${year}`,
        options: 'i'
      })
    })
    .get();
  
  // 找出最大序号
  let maxNumber = 0;
  res.data.forEach(student => {
    const num = parseInt(student.studentId.substring(4));
    if (num > maxNumber) {
      maxNumber = num;
    }
  });
  
  const newNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${year}${newNumber}`;
}

