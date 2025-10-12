// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取公告数据
    const announcementsResult = await db.collection('announcements')
      .orderBy('pinned', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    // 获取文章数据
    const articlesResult = await db.collection('articles')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    // 获取轮播图数据
    const siteResult = await db.collection('site')
      .doc('config')
      .get()

    // 格式化时间
    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // 处理公告数据
    const announcements = announcementsResult.data.map(item => ({
      ...item,
      createdAt: formatTime(item.createdAt)
    }))

    // 处理文章数据
    const articles = articlesResult.data.map(item => ({
      ...item,
      createdAt: formatTime(item.createdAt)
    }))

    // 处理轮播图数据
    const banners = siteResult.data ? (siteResult.data.banners || []) : []

    return {
      success: true,
      data: {
        announcements,
        articles,
        banners
      }
    }
  } catch (error) {
    console.error('获取首页数据失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
