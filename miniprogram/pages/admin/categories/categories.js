Page({
  data: {
    categories: [],
    showAddModal: false,
    showEditModal: false,
    currentCategory: null,
    categoryName: '',
    categoryIcon: '',
    categorySort: 0
  },

  onLoad() {
    this.loadCategories();
  },

  onShow() {
    this.loadCategories();
  },

  async loadCategories() {
    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('activity_categories')
        .orderBy('sort', 'asc')
        .get();

      this.setData({
        categories: res.data || []
      });

      wx.hideLoading();
    } catch (e) {
      console.error('❌ 加载分类失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 显示添加分类弹窗
  showAddCategory() {
    this.setData({
      showAddModal: true,
      categoryName: '',
      categoryIcon: '📁',
      categorySort: this.data.categories.length
    });
  },

  // 隐藏添加分类弹窗
  hideAddModal() {
    this.setData({
      showAddModal: false
    });
  },

  // 输入分类名称
  onNameInput(e) {
    this.setData({ categoryName: e.detail.value });
  },

  // 输入图标
  onIconInput(e) {
    this.setData({ categoryIcon: e.detail.value });
  },

  // 输入排序
  onSortInput(e) {
    this.setData({ categorySort: parseInt(e.detail.value) || 0 });
  },

  // 保存分类
  async saveCategory() {
    const { categoryName, categoryIcon, categorySort } = this.data;

    if (!categoryName || !categoryName.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const db = wx.cloud.database();
      
      await db.collection('activity_categories').add({
        data: {
          name: categoryName.trim(),
          icon: categoryIcon || '📁',
          sort: categorySort,
          createdAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      this.setData({
        showAddModal: false
      });

      this.loadCategories();
    } catch (e) {
      console.error('❌ 保存分类失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 编辑分类
  editCategory(e) {
    const { id } = e.currentTarget.dataset;
    const category = this.data.categories.find(c => c._id === id);

    if (category) {
      this.setData({
        showEditModal: true,
        currentCategory: category,
        categoryName: category.name,
        categoryIcon: category.icon,
        categorySort: category.sort
      });
    }
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({
      showEditModal: false,
      currentCategory: null
    });
  },

  // 更新分类
  async updateCategory() {
    const { currentCategory, categoryName, categoryIcon, categorySort } = this.data;

    if (!categoryName || !categoryName.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '更新中...' });

    try {
      const db = wx.cloud.database();
      
      await db.collection('activity_categories').doc(currentCategory._id).update({
        data: {
          name: categoryName.trim(),
          icon: categoryIcon || '📁',
          sort: categorySort,
          updatedAt: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });

      this.setData({
        showEditModal: false,
        currentCategory: null
      });

      this.loadCategories();
    } catch (e) {
      console.error('❌ 更新分类失败:', e);
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },

  // 删除分类
  async deleteCategory(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '删除分类后，该分类下的活动将变为未分类',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const db = wx.cloud.database();
            await db.collection('activity_categories').doc(id).remove();

            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            this.loadCategories();
          } catch (e) {
            console.error('❌ 删除分类失败:', e);
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
});

