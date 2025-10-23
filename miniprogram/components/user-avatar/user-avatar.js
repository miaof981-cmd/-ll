// components/user-avatar/user-avatar.js - 统一头像组件
const avatarManager = require('../../utils/avatar-manager.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 用户OpenID（优先级最高，用于从users集合查询）
    openid: {
      type: String,
      value: '',
      observer: 'loadAvatarByOpenId'
    },
    // 直接传入的头像URL（如果没有openid，使用此URL）
    avatarUrl: {
      type: String,
      value: '',
      observer: 'processAvatarUrl'
    },
    // 头像大小（rpx）
    size: {
      type: Number,
      value: 80
    },
    // 是否圆形
    round: {
      type: Boolean,
      value: true
    },
    // 边框圆角（当round=false时生效）
    borderRadius: {
      type: String,
      value: '8rpx'
    },
    // 图片裁剪模式
    mode: {
      type: String,
      value: 'aspectFill'
    },
    // 自定义class
    customClass: {
      type: String,
      value: ''
    },
    // 是否懒加载
    lazyLoad: {
      type: Boolean,
      value: false
    },
    // 默认头像
    defaultAvatar: {
      type: String,
      value: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    displayAvatar: '', // 最终显示的头像URL
    loading: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 根据OpenID加载头像（使用全局管理器）
     */
    async loadAvatarByOpenId(newOpenId, oldOpenId) {
      if (!newOpenId || newOpenId === oldOpenId) {
        return;
      }

      this.setData({ loading: true });

      try {
        // 使用全局头像管理器获取头像
        const avatarUrl = await avatarManager.getAvatar(newOpenId);
        
        this.setData({
          displayAvatar: avatarUrl,
          loading: false
        });
      } catch (error) {
        console.error('❌ [头像组件] 加载失败:', error);
        this.setData({
          displayAvatar: this.data.defaultAvatar,
          loading: false
        });
      }
    },

    /**
     * 处理直接传入的avatarUrl
     */
    async processAvatarUrl(newUrl, oldUrl) {
      // 如果有openid，优先使用openid查询
      if (this.data.openid) {
        return;
      }

      if (!newUrl || newUrl === oldUrl) {
        this.setData({
          displayAvatar: this.data.defaultAvatar
        });
        return;
      }

      // 处理云存储URL
      if (newUrl.startsWith('cloud://')) {
        try {
          const convertedUrl = await avatarManager.convertCloudUrl(newUrl);
          this.setData({
            displayAvatar: convertedUrl || this.data.defaultAvatar
          });
        } catch (e) {
          this.setData({
            displayAvatar: this.data.defaultAvatar
          });
        }
      } else {
        this.setData({
          displayAvatar: newUrl
        });
      }
    },

    /**
     * 头像加载失败时的处理
     */
    onAvatarError(e) {
      console.warn('⚠️ [头像组件] 头像加载失败:', e.detail);
      this.setData({
        displayAvatar: this.data.defaultAvatar
      });
      this.triggerEvent('error', { error: e.detail });
    },

    /**
     * 头像加载成功时的处理
     */
    onAvatarLoad(e) {
      // 静默加载成功，不输出日志（避免控制台刷屏）
      this.triggerEvent('load', { detail: e.detail });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时，根据传入的参数决定加载方式
      if (this.data.openid) {
        this.loadAvatarByOpenId(this.data.openid);
      } else if (this.data.avatarUrl) {
        this.processAvatarUrl(this.data.avatarUrl);
      } else {
        this.setData({
          displayAvatar: this.data.defaultAvatar
        });
      }
    }
  }
});

