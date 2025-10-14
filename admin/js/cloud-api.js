/**
 * Web管理后台 - 云开发API调用类
 * 通过云函数HTTP触发器调用云数据库
 */

const CloudAPI = {
  // TODO: 配置云函数HTTP触发器地址
  // 在微信开发者工具中，右键云函数 → 云函数详情 → HTTP触发器 → 获取地址
  baseURL: {
    photographers: 'https://your-env-id.service.tcloudbase.com/photographers',
    students: 'https://your-env-id.service.tcloudbase.com/students',
    applications: 'https://your-env-id.service.tcloudbase.com/applications'
  },
  
  // ==================== 摄影师管理 ====================
  
  /**
   * 获取摄影师列表
   */
  async getPhotographers() {
    try {
      const res = await this.callFunction('photographers', {
        action: 'list'
      });
      return res.data || [];
    } catch (e) {
      console.error('获取摄影师失败:', e);
      // 降级到localStorage
      return Storage.getPhotographers();
    }
  },
  
  /**
   * 添加摄影师
   */
  async addPhotographer(photographer) {
    try {
      const res = await this.callFunction('photographers', {
        action: 'add',
        data: photographer
      });
      return res;
    } catch (e) {
      console.error('添加摄影师失败:', e);
      return Storage.savePhotographer(photographer);
    }
  },
  
  /**
   * 更新摄影师
   */
  async updatePhotographer(photographer) {
    try {
      const res = await this.callFunction('photographers', {
        action: 'update',
        data: photographer
      });
      return res;
    } catch (e) {
      console.error('更新摄影师失败:', e);
      return Storage.savePhotographer(photographer);
    }
  },
  
  /**
   * 删除摄影师
   */
  async deletePhotographer(id) {
    try {
      const res = await this.callFunction('photographers', {
        action: 'delete',
        data: { _id: id }
      });
      return res;
    } catch (e) {
      console.error('删除摄影师失败:', e);
      return Storage.deletePhotographer(id);
    }
  },
  
  // ==================== 学生管理 ====================
  
  /**
   * 获取学生列表
   */
  async getStudents() {
    try {
      const res = await this.callFunction('students', {
        action: 'list'
      });
      return res.data || [];
    } catch (e) {
      console.error('获取学生失败:', e);
      return Storage.getStudents();
    }
  },
  
  /**
   * 添加学生
   */
  async addStudent(student) {
    try {
      const res = await this.callFunction('students', {
        action: 'add',
        data: student
      });
      return res;
    } catch (e) {
      console.error('添加学生失败:', e);
      return Storage.addStudent(student);
    }
  },
  
  // ==================== 订单管理 ====================
  
  /**
   * 获取订单列表
   */
  async getApplications(filter = {}) {
    try {
      const res = await this.callFunction('applications', {
        action: 'list',
        data: filter
      });
      return res.data || [];
    } catch (e) {
      console.error('获取订单失败:', e);
      return Storage.getApplications();
    }
  },
  
  /**
   * 更新订单
   */
  async updateApplication(application) {
    try {
      const res = await this.callFunction('applications', {
        action: 'update',
        data: application
      });
      return res;
    } catch (e) {
      console.error('更新订单失败:', e);
      return Storage.updateApplication(application._id, application);
    }
  },
  
  /**
   * 审核订单
   */
  async reviewApplication(id, approved, remark) {
    try {
      const res = await this.callFunction('applications', {
        action: 'review',
        data: {
          _id: id,
          approved: approved,
          remark: remark
        }
      });
      return res;
    } catch (e) {
      console.error('审核订单失败:', e);
      throw e;
    }
  },
  
  // ==================== 通用调用方法 ====================
  
  /**
   * 调用云函数
   */
  async callFunction(functionName, data) {
    const url = this.baseURL[functionName];
    
    // 如果未配置HTTP触发器，降级到localStorage
    if (!url || url.includes('your-env-id')) {
      console.warn(`未配置${functionName}云函数HTTP触发器，使用本地存储`);
      throw new Error('未配置云函数');
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (e) {
      console.error(`调用${functionName}云函数失败:`, e);
      throw e;
    }
  },
  
  /**
   * 检查是否启用云开发
   */
  isCloudEnabled() {
    return !this.baseURL.photographers.includes('your-env-id');
  }
};

// 如果定义了Storage（localStorage工具类），则云API失败时自动降级
if (typeof Storage === 'undefined') {
  console.warn('未找到Storage工具类，云API失败时将无法降级');
}

