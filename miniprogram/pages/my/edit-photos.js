// pages/my/edit-photos.js - 编辑生活照
Page({
  data: {
    studentId: '',
    student: null,
    lifePhotos: [], // 纯生活照（不包括证件照）
    certificatePhoto: '', // 证件照URL（锁定，不可编辑）
    uploading: false,
    isAdmin: false // 是否管理员
  },

  onLoad(options) {
    // 检查管理员权限
    const app = getApp();
    const isAdmin = app.globalData.isAdmin || false;
    this.setData({ isAdmin });
    
    console.log('📋 编辑生活照页面加载');
    console.log('   isAdmin:', isAdmin);
    
    if (options.studentId) {
      this.setData({ studentId: options.studentId });
      this.loadStudentPhotos(options.studentId);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载学生照片
  async loadStudentPhotos(studentId) {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('students')
        .where({ studentId: studentId })
        .get();
      
      if (res.data && res.data.length > 0) {
        const student = res.data[0];
        
        // 证件照：优先使用 avatar，其次 certificatePhoto
        const certificatePhoto = student.avatar || student.certificatePhoto || '';
        
        // 生活照：过滤掉证件照
        const allPhotos = student.lifePhotos || [];
        const lifePhotos = allPhotos.filter(p => p !== certificatePhoto && p !== student.avatar);
        
        this.setData({
          student: student,
          lifePhotos: lifePhotos, // 纯生活照
          certificatePhoto: certificatePhoto // 证件照
        });
        
        console.log('✅ 加载学生照片成功');
        console.log('   证件照:', certificatePhoto ? '有' : '无');
        console.log('   生活照数量:', lifePhotos.length);
      } else {
        wx.showToast({
          title: '学生不存在',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
      
      wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载学生照片失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 判断是否是证件照（锁定）
  isCertificatePhoto(photoUrl) {
    return photoUrl === this.data.certificatePhoto;
  },

  // 预览照片
  // 预览照片
  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    
    // 构建预览数组：证件照 + 生活照
    const previewUrls = [];
    if (this.data.certificatePhoto) {
      previewUrls.push(this.data.certificatePhoto);
    }
    previewUrls.push(...this.data.lifePhotos);
    
    wx.previewImage({
      urls: previewUrls,
      current: url
    });
  },

  // 上传新照片（替换）
  async uploadPhoto(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果是证件照，不允许替换
    if (this.isCertificatePhoto(this.data.lifePhotos[index])) {
      wx.showToast({
        title: '证件照不可替换',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showModal({
          title: '确认替换',
          content: '确定要替换这张照片吗？',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              this.setData({ uploading: true });
              wx.showLoading({ title: '上传中...' });

              try {
                // 上传到云存储
                const timestamp = Date.now();
                const cloudPath = `life_photos/${this.data.studentId}_${timestamp}.jpg`;
                
                const uploadResult = await wx.cloud.uploadFile({
                  cloudPath: cloudPath,
                  filePath: tempFilePath
                });

                // 更新本地数据
                const photos = [...this.data.lifePhotos];
                photos[index] = uploadResult.fileID;
                this.setData({ lifePhotos: photos });

                // 保存到数据库
                await this.savePhotos();

                wx.hideLoading();
                wx.showToast({
                  title: '替换成功',
                  icon: 'success'
                });
              } catch (e) {
                console.error('❌ 上传失败:', e);
                wx.hideLoading();
                wx.showToast({
                  title: '上传失败',
                  icon: 'error'
                });
              } finally {
                this.setData({ uploading: false });
              }
            }
          }
        });
      }
    });
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果是证件照，不允许删除
    if (this.isCertificatePhoto(this.data.lifePhotos[index])) {
      wx.showToast({
        title: '证件照不可删除',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const photos = [...this.data.lifePhotos];
            photos.splice(index, 1);
            this.setData({ lifePhotos: photos });

            // 保存到数据库
            await this.savePhotos();

            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (e) {
            console.error('❌ 删除失败:', e);
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 添加新照片
  async addPhoto() {
    const currentCount = this.data.lifePhotos.length;
    const certificateCount = this.data.certificatePhoto ? 1 : 0;
    const lifePhotoCount = currentCount - certificateCount;

    if (lifePhotoCount >= 4) {
      wx.showToast({
        title: '最多4张生活照',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });

        try {
          // 上传到云存储
          const timestamp = Date.now();
          const cloudPath = `life_photos/${this.data.studentId}_${timestamp}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          // 添加到数组（证件照前）
          const photos = [...this.data.lifePhotos];
          if (this.data.certificatePhoto) {
            // 如果有证件照，插入到倒数第二个位置
            photos.splice(photos.length - 1, 0, uploadResult.fileID);
          } else {
            // 没有证件照，直接添加到末尾
            photos.push(uploadResult.fileID);
          }
          
          this.setData({ lifePhotos: photos });

          // 保存到数据库
          await this.savePhotos();

          wx.hideLoading();
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        } catch (e) {
          console.error('❌ 上传失败:', e);
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          });
        } finally {
          this.setData({ uploading: false });
        }
      }
    });
  },

  // 保存照片到数据库
  async savePhotos() {
    const db = wx.cloud.database();
    await db.collection('students')
      .where({ studentId: this.data.studentId })
      .update({
        data: {
          lifePhotos: this.data.lifePhotos,
          updatedAt: new Date().toISOString()
        }
      });
    console.log('✅ 照片保存成功');
  },

  // 替换证件照（仅管理员）
  async replaceCertificatePhoto() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'error'
      });
      return;
    }

    const res = await wx.showModal({
      title: '替换证件照',
      content: '替换证件照会同步更新：\n• 学籍档案中的头像\n• 生活照相册第1张\n• 所有相关显示\n\n确定要替换吗？',
      confirmText: '确定替换',
      cancelText: '取消'
    });

    if (!res.confirm) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });

        try {
          // 上传到云存储
          const timestamp = Date.now();
          const cloudPath = `certificate_photos/${this.data.studentId}_${timestamp}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          });

          console.log('✅ 证件照上传成功:', uploadResult.fileID);

          // 更新本地状态
          this.setData({ certificatePhoto: uploadResult.fileID });

          // 同步更新数据库：avatar, certificatePhoto, lifePhotos
          await this.updateCertificatePhotoToDatabase(uploadResult.fileID);

          wx.hideLoading();
          wx.showToast({
            title: '替换成功',
            icon: 'success'
          });

          console.log('✅ 证件照替换成功，所有相关数据已同步');
        } catch (e) {
          console.error('❌ 替换证件照失败:', e);
          wx.hideLoading();
          wx.showToast({
            title: '替换失败',
            icon: 'error'
          });
        } finally {
          this.setData({ uploading: false });
        }
      }
    });
  },

  // 更新证件照到数据库（同步所有相关字段）
  async updateCertificatePhotoToDatabase(newPhotoUrl) {
    const db = wx.cloud.database();
    const oldPhotoUrl = this.data.student.avatar || this.data.student.certificatePhoto;
    
    console.log('🔄 同步更新证件照...');
    console.log('   旧证件照:', oldPhotoUrl);
    console.log('   新证件照:', newPhotoUrl);

    // 更新学生档案
    await db.collection('students')
      .where({ studentId: this.data.studentId })
      .update({
        data: {
          avatar: newPhotoUrl, // 学籍档案头像
          certificatePhoto: newPhotoUrl, // 证件照字段
          updatedAt: new Date().toISOString()
        }
      });

    console.log('✅ 学生档案已更新');
    console.log('   avatar: 已更新为新证件照');
    console.log('   certificatePhoto: 已更新为新证件照');
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});

