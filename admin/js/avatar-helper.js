// admin/js/avatar-helper.js - 统一头像处理工具
const AvatarHelper = {
  /**
   * 默认头像URL
   */
  DEFAULT_AVATAR: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',

  /**
   * 根据OpenID获取用户头像
   * @param {string} openid - 用户OpenID
   * @returns {Promise<string>} 头像URL
   */
  async getAvatarByOpenId(openid) {
    if (!openid) {
      return this.DEFAULT_AVATAR;
    }

    try {
      // 从localStorage中的users数据查询
      const users = Storage.getUsers() || [];
      const user = users.find(u => u._openid === openid || u.openid === openid);
      
      if (user && user.avatarUrl) {
        return user.avatarUrl;
      }
      
      console.warn(`未找到OpenID为 ${openid} 的用户头像`);
      return this.DEFAULT_AVATAR;
    } catch (error) {
      console.error('获取头像失败:', error);
      return this.DEFAULT_AVATAR;
    }
  },

  /**
   * 生成头像HTML元素
   * @param {string} openid - 用户OpenID
   * @param {Object} options - 配置选项
   * @param {number} options.size - 头像大小（px）
   * @param {string} options.className - 自定义CSS类名
   * @param {string} options.defaultAvatar - 自定义默认头像
   * @param {string} options.fallbackText - 头像加载失败时显示的文本
   * @returns {Promise<string>} 头像HTML
   */
  async renderAvatar(openid, options = {}) {
    const {
      size = 40,
      className = '',
      defaultAvatar = this.DEFAULT_AVATAR,
      fallbackText = ''
    } = options;

    const avatarUrl = await this.getAvatarByOpenId(openid) || defaultAvatar;
    
    return `
      <img 
        src="${avatarUrl}" 
        class="user-avatar ${className}"
        style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" 
        onerror="this.src='${defaultAvatar}'"
        alt="${fallbackText}"
      >
    `;
  },

  /**
   * 批量获取用户头像（用于列表渲染优化）
   * @param {Array<string>} openids - OpenID数组
   * @returns {Promise<Map<string, string>>} OpenID到头像URL的映射
   */
  async getAvatarsBatch(openids) {
    const avatarMap = new Map();
    
    if (!openids || openids.length === 0) {
      return avatarMap;
    }

    try {
      const users = Storage.getUsers() || [];
      const userMap = new Map(users.map(u => [u._openid || u.openid, u.avatarUrl || this.DEFAULT_AVATAR]));
      
      openids.forEach(openid => {
        avatarMap.set(openid, userMap.get(openid) || this.DEFAULT_AVATAR);
      });
      
      return avatarMap;
    } catch (error) {
      console.error('批量获取头像失败:', error);
      return avatarMap;
    }
  },

  /**
   * 同步用户头像（从云端同步到localStorage）
   * 应该在用户登录或数据刷新时调用
   */
  async syncAvatars() {
    try {
      console.log('开始同步用户头像...');
      // 这里可以添加从云端同步的逻辑
      // 目前依赖 Storage.js 中的同步机制
      return true;
    } catch (error) {
      console.error('同步头像失败:', error);
      return false;
    }
  },

  /**
   * 为订单卡片生成用户和摄影师头像HTML
   * @param {Object} order - 订单对象
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 包含用户和摄影师头像HTML的对象
   */
  async renderOrderAvatars(order, options = {}) {
    const { size = 40 } = options;
    
    // 获取下单用户头像
    const userOpenId = order.userId || order._openid;
    const userAvatar = await this.renderAvatar(userOpenId, {
      size,
      className: 'order-user-avatar',
      fallbackText: order.userNickName || '用户'
    });

    // 获取摄影师头像
    let photographerAvatar = '';
    if (order.photographerInfo && order.photographerInfo._openid) {
      photographerAvatar = await this.renderAvatar(order.photographerInfo._openid, {
        size,
        className: 'order-photographer-avatar',
        fallbackText: order.photographerInfo.name || '摄影师'
      });
    }

    return {
      userAvatar,
      photographerAvatar,
      userNickName: order.userNickName || '用户',
      photographerName: order.photographerInfo ? order.photographerInfo.name : '未分配'
    };
  }
};

// 如果是模块化环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvatarHelper;
}

