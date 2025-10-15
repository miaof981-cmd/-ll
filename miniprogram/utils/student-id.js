/**
 * 学号生成工具
 * 规则：连续递增，从 0001 开始
 */

/**
 * 生成下一个学号
 * @returns {Promise<string>} 返回格式化的学号，如 "0001", "0002"
 */
async function generateNextStudentId() {
  try {
    const db = wx.cloud.database();
    
    // 获取当前最大的学号
    const { data: students } = await db.collection('students')
      .orderBy('studentId', 'desc')
      .limit(1)
      .get();
    
    let nextNumber = 1;
    
    if (students && students.length > 0) {
      const lastStudentId = students[0].studentId;
      console.log('📝 当前最大学号:', lastStudentId);
      
      // 解析最后一个学号的数字部分
      const lastNumber = parseInt(lastStudentId);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // 格式化为4位数字，前面补0
    const newStudentId = String(nextNumber).padStart(4, '0');
    console.log('✅ 生成新学号:', newStudentId);
    
    return newStudentId;
  } catch (e) {
    console.error('❌ 生成学号失败:', e);
    throw e;
  }
}

/**
 * 检查学号是否已存在
 * @param {string} studentId 学号
 * @returns {Promise<boolean>} 是否已存在
 */
async function checkStudentIdExists(studentId) {
  try {
    const db = wx.cloud.database();
    const { data } = await db.collection('students')
      .where({ studentId })
      .count();
    
    return data.total > 0;
  } catch (e) {
    console.error('❌ 检查学号失败:', e);
    return false;
  }
}

/**
 * 格式化学号
 * @param {number|string} num 数字
 * @returns {string} 格式化后的学号
 */
function formatStudentId(num) {
  return String(num).padStart(4, '0');
}

module.exports = {
  generateNextStudentId,
  checkStudentIdExists,
  formatStudentId
};

