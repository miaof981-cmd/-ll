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
    loading: false,
    _isAttached: false, // 标记组件是否已挂载
    _lastOpenId: '', // 记录上次处理的 openId
    _lastAvatarUrl: '' // 记录上次处理的 avatarUrl
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 根据OpenID加载头像（优先从 globalData 获取）
     */
    async loadAvatarByOpenId(newOpenId, oldOpenId) {
      // 🔥 优化：防止重复触发
      if (!newOpenId || newOpenId === oldOpenId) {
        return;
      }
      
      // 🔥 优化：检查是否与上次处理的 openId 相同
      if (newOpenId === this.data._lastOpenId) {
        return;
      }
      
      // 🔥 优化：如果组件未挂载，不执行加载
      if (!this.data._isAttached) {
        return;
      }

      this.setData({ 
        loading: true,
        _lastOpenId: newOpenId 
      });

      try {
        // 🔥 优先从 globalData 获取当前用户头像
        const app = getApp();
        const globalUserInfo = app.globalData.userInfo;
        const globalOpenId = globalUserInfo?._openid || globalUserInfo?.openid;
        
        let avatarUrl = null;
        
        // 如果是当前登录用户，直接使用 globalData 的头像
        if (globalOpenId && globalOpenId === newOpenId && globalUserInfo?.avatarUrl) {
          avatarUrl = globalUserInfo.avatarUrl;
        } else {
          // 否则使用全局头像管理器从数据库查询
          avatarUrl = await avatarManager.getAvatar(newOpenId);
        }
        
        // 🔥 防御性检查：如果还是 cloud:// 格式，强制转换或使用默认头像
        if (avatarUrl && avatarUrl.startsWith('cloud://')) {
          try {
            avatarUrl = await avatarManager.convertCloudUrl(avatarUrl);
          } catch (e) {
            avatarUrl = this.data.defaultAvatar;
          }
        }
        
        // 🔥 优化：只有当新头像URL与当前不同时才更新
        if (avatarUrl !== this.data.displayAvatar) {
          wx.nextTick(() => {
            try {
              this.setData({
                displayAvatar: avatarUrl,
                loading: false
              });
            } catch (e) {
              // 组件可能已销毁，静默处理
            }
          });
        } else {
          // URL相同，只更新loading状态
          this.setData({ loading: false });
        }
      } catch (error) {
        console.error('❌ [头像组件] 加载失败:', error);
        const defaultUrl = this.data.defaultAvatar;
        // 🔥 优化：只有与当前不同时才更新
        if (defaultUrl !== this.data.displayAvatar) {
          wx.nextTick(() => {
            try {
              this.setData({
                displayAvatar: defaultUrl,
                loading: false
              });
            } catch (e) {
              // 组件可能已销毁，静默处理
            }
          });
        } else {
          this.setData({ loading: false });
        }
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
      
      // 🔥 优化：防止重复触发
      if (newUrl === oldUrl) {
        return;
      }
      
      // 🔥 优化：检查是否与上次处理的 avatarUrl 相同
      if (newUrl === this.data._lastAvatarUrl) {
        return;
      }
      
      // 🔥 优化：如果组件未挂载，不执行加载
      if (!this.data._isAttached) {
        return;
      }

      // 记录本次处理的 avatarUrl
      this.data._lastAvatarUrl = newUrl;
      
      // 如果没有URL，使用默认头像
      if (!newUrl) {
        const defaultUrl = this.data.defaultAvatar;
        // 🔥 优化：只有与当前不同时才更新
        if (defaultUrl !== this.data.displayAvatar) {
          try {
            this.setData({
              displayAvatar: defaultUrl
            });
          } catch (e) {
            // 组件可能已销毁，静默处理
          }
        }
        return;
      }

      // 处理云存储URL
      if (newUrl.startsWith('cloud://')) {
        try {
          const convertedUrl = await avatarManager.convertCloudUrl(newUrl);
          const finalUrl = convertedUrl || this.data.defaultAvatar;
          
          // 🔥 优化：只有与当前不同时才更新
          if (finalUrl !== this.data.displayAvatar) {
            wx.nextTick(() => {
              try {
                this.setData({
                  displayAvatar: finalUrl
                });
              } catch (e) {
                // 组件可能已销毁，静默处理
              }
            });
          }
        } catch (e) {
          const defaultUrl = this.data.defaultAvatar;
          // 🔥 优化：只有与当前不同时才更新
          if (defaultUrl !== this.data.displayAvatar) {
            wx.nextTick(() => {
              try {
                this.setData({
                  displayAvatar: defaultUrl
                });
              } catch (err) {
                // 组件可能已销毁，静默处理
              }
            });
          }
        }
      } else {
        // 🔥 优化：只有与当前不同时才更新
        if (newUrl !== this.data.displayAvatar) {
          wx.nextTick(() => {
            try {
              this.setData({
                displayAvatar: newUrl
              });
            } catch (e) {
              // 组件可能已销毁，静默处理
            }
          });
        }
      }
    },

    /**
     * 头像加载失败时的处理
     */
    onAvatarError(e) {
      const defaultUrl = this.data.defaultAvatar;
      
      // 🔥 优化：只有与当前不同时才更新
      if (defaultUrl !== this.data.displayAvatar) {
        try {
          this.setData({
            displayAvatar: defaultUrl
          });
        } catch (err) {
          // 组件可能已销毁，静默处理
        }
      }
      
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
      // 🔥 标记组件已挂载
      this.setData({ _isAttached: true });
      
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
    },
    
    detached() {
      // 🔥 组件销毁时清理状态，防止内存泄漏
      this.setData({
        _isAttached: false,
        _lastOpenId: '',
        _lastAvatarUrl: '',
        loading: false
      });
    }
  }
});

