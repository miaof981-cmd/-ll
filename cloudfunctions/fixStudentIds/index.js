// 修复学生学号 - 按创建时间顺序重新分配连续学号
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('🔧 开始修复学生学号...');
  
  try {
    // 1. 查询所有学生，按创建时间排序
    const { data: students } = await db.collection('students')
      .orderBy('createdAt', 'asc')
      .get();
    
    console.log(`📋 找到 ${students.length} 个学生记录`);
    
    if (students.length === 0) {
      return {
        success: true,
        message: '没有需要处理的学生记录',
        updatedCount: 0
      };
    }
    
    // 2. 重新分配学号（从0001开始）
    const updatePromises = [];
    const updates = [];
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const newStudentId = String(i + 1).padStart(4, '0');
      
      console.log(`   [${i + 1}/${students.length}] ${student.name}: ${student.studentId} → ${newStudentId}`);
      
      // 只有学号不同时才更新
      if (student.studentId !== newStudentId) {
        updatePromises.push(
          db.collection('students').doc(student._id).update({
            data: {
              studentId: newStudentId,
              updatedAt: new Date().toISOString()
            }
          })
        );
        
        updates.push({
          name: student.name,
          oldId: student.studentId,
          newId: newStudentId
        });
      }
    }
    
    // 3. 执行批量更新
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`✅ 成功更新 ${updatePromises.length} 个学生的学号`);
    } else {
      console.log('✅ 所有学号已经是连续的，无需更新');
    }
    
    return {
      success: true,
      message: `成功修复 ${updatePromises.length} 个学生学号`,
      totalStudents: students.length,
      updatedCount: updatePromises.length,
      updates: updates
    };
  } catch (e) {
    console.error('❌ 修复学号失败:', e);
    return {
      success: false,
      message: e.message,
      error: e
    };
  }
};

