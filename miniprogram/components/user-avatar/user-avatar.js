// components/user-avatar/user-avatar.js - 统一头像组件
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
     * 根据OpenID加载头像（核心方法）
     */
    async loadAvatarByOpenId(newOpenId, oldOpenId) {
      if (!newOpenId || newOpenId === oldOpenId) {
        return;
      }

      console.log('🔍 [头像组件] 根据OpenID查询头像:', newOpenId);
      
      this.setData({ loading: true });

      try {
        const db = wx.cloud.database();
        const res = await db.collection('users')
          .where({ _openid: newOpenId })
          .field({ avatarUrl: true, nickName: true })
          .get();

        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          let avatarUrl = user.avatarUrl;
          
          console.log('✅ [头像组件] 查询到用户头像:', avatarUrl);

          // 处理云存储URL
          if (avatarUrl && avatarUrl.startsWith('cloud://')) {
            avatarUrl = await this.convertCloudUrl(avatarUrl);
          }

          this.setData({
            displayAvatar: avatarUrl || this.data.defaultAvatar,
            loading: false
          });
        } else {
          console.warn('⚠️ [头像组件] 未找到用户，使用默认头像');
          this.setData({
            displayAvatar: this.data.defaultAvatar,
            loading: false
          });
        }
      } catch (error) {
        console.error('❌ [头像组件] 查询头像失败:', error);
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

      console.log('🔍 [头像组件] 处理传入的avatarUrl:', newUrl);

      // 处理云存储URL
      if (newUrl.startsWith('cloud://')) {
        const convertedUrl = await this.convertCloudUrl(newUrl);
        this.setData({
          displayAvatar: convertedUrl || this.data.defaultAvatar
        });
      } else {
        this.setData({
          displayAvatar: newUrl
        });
      }
    },

    /**
     * 转换云存储URL为临时URL
     */
    async convertCloudUrl(cloudUrl) {
      try {
        console.log('☁️ [头像组件] 转换云存储URL:', cloudUrl);
        const res = await wx.cloud.getTempFileURL({
          fileList: [cloudUrl]
        });

        if (res.fileList && res.fileList.length > 0) {
          const tempUrl = res.fileList[0].tempFileURL;
          console.log('✅ [头像组件] 云存储URL已转换:', tempUrl);
          return tempUrl;
        }
      } catch (error) {
        console.error('❌ [头像组件] 转换云存储URL失败:', error);
      }
      return cloudUrl;
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
      console.log('✅ [头像组件] 头像加载成功');
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

