// 工具函数

const Utils = {
  // 格式化日期
  formatDate(dateString, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  // 格式化相对时间
  formatRelativeTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return this.formatDate(dateString, 'YYYY-MM-DD');
  },

  // 状态文本映射
  getStatusText(status) {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      photographer_assigned: '已分配摄影师',
      shooting: '拍摄中',
      photo_uploaded: '照片已上传',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  // 状态样式类
  getStatusClass(status) {
    const classMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      photographer_assigned: 'status-processing',
      shooting: 'status-processing',
      photo_uploaded: 'status-processing',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classMap[status] || 'status-pending';
  },

  // 显示提示消息
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // 确认对话框
  confirm(message, callback) {
    if (window.confirm(message)) {
      callback();
    }
  },

  // 图片转Base64
  imageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
  },

  // 生成学号
  generateStudentId() {
    const year = new Date().getFullYear();
    const students = Storage.getStudents();
    const yearStudents = students.filter(s => s.id && s.id.startsWith(year.toString()));
    const sequence = yearStudents.length + 1;
    return `${year}${String(sequence).padStart(4, '0')}`;
  },

  // 搜索过滤
  searchFilter(items, searchText, fields) {
    if (!searchText) return items;
    
    const lowerSearch = searchText.toLowerCase();
    return items.filter(item => {
      return fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(lowerSearch);
      });
    });
  },

  // 分页
  paginate(items, page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: items.slice(start, end),
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize)
    };
  },

  // 防抖
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 导出CSV
  exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      this.showToast('没有数据可导出', 'error');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${this.formatDate(new Date(), 'YYYYMMDD')}.csv`;
    link.click();
  }
};

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

