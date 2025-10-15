/**
 * 学号生成工具
 * 规则：连续递增，从 0001 开始
 */

/**
 * 生成下一个学号
 * @returns {Promise<string>} 返回格式化的学号，如 "20250001", "20250002"
 */
async function generateNextStudentId() {
  try {
    const db = wx.cloud.database();
    const year = new Date().getFullYear(); // 当前年份，如 2025
    
    // 获取当前年份的所有学号
    const { data: students } = await db.collection('students')
      .where({
        studentId: db.RegExp({
          regexp: `^${year}`, // 匹配以当前年份开头的学号
          options: 'i'
        })
      })
      .orderBy('studentId', 'desc')
      .limit(1)
      .get();
    
    let nextNumber = 1;
    
    if (students && students.length > 0) {
      const lastStudentId = students[0].studentId;
      console.log('📝 当前最大学号:', lastStudentId);
      
      // 提取年份后面的数字部分（后4位）
      const lastNumber = parseInt(lastStudentId.substring(4));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // 格式化：年份(4位) + 序号(4位)，如 20250001
    const newStudentId = `${year}${String(nextNumber).padStart(4, '0')}`;
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

