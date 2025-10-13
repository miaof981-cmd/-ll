// Dashboard 页面逻辑

document.addEventListener('DOMContentLoaded', () => {
  // 检查登录状态
  if (!Auth.requireLogin()) return;
  
  // 检查权限：摄影师不能访问管理后台
  Auth.redirectToCorrectDashboard();

  const currentUser = Auth.getCurrentUser();
  
  if (currentUser.role === 'photographer') {
    alert('摄影师请使用专用工作台');
    window.location.href = 'photographer-dashboard.html';
    return;
  }
  
  // 显示当前用户信息
  document.getElementById('currentUser').textContent = currentUser.name;
  document.getElementById('currentRole').textContent = currentUser.role;

  // 退出登录
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗?')) {
      Auth.logout();
    }
  });

  // 加载数据
  loadDashboard();
});

function loadDashboard() {
  const stats = Storage.getStats();
  
  // 更新统计数据
  document.getElementById('totalStudents').textContent = stats.totalStudents;
  document.getElementById('totalApplications').textContent = stats.totalApplications;
  document.getElementById('totalPhotographers').textContent = stats.totalPhotographers;
  document.getElementById('totalAnnouncements').textContent = stats.totalAnnouncements;

  // 加载最近申请订单
  loadRecentApplications();
  
  // 加载摄影师状态
  loadPhotographersStatus();
}

function loadRecentApplications() {
  const applications = Storage.getApplications();
  const recent = applications.slice(0, 5);
  
  const tbody = document.getElementById('recentApplications');
  
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无申请订单</td></tr>';
    return;
  }
  
  tbody.innerHTML = recent.map(app => `
    <tr>
      <td>${app.id}</td>
      <td>${app.childName}</td>
      <td>${app.parentName}</td>
      <td>${app.phone}</td>
      <td><span class="status-badge ${Utils.getStatusClass(app.status)}">${Utils.getStatusText(app.status)}</span></td>
      <td>${Utils.formatRelativeTime(app.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewApplication('${app.id}')">查看</button>
      </td>
    </tr>
  `).join('');
}

function loadPhotographersStatus() {
  const photographers = Storage.getPhotographers();
  const applications = Storage.getApplications();
  
  const container = document.getElementById('photographersStatus');
  
  if (photographers.length === 0) {
    container.innerHTML = '<p class="empty-message">暂无摄影师</p>';
    return;
  }
  
  container.innerHTML = photographers.map(photographer => {
    const orders = applications.filter(app => app.photographerId === photographer.id);
    const activeOrders = orders.filter(app => 
      ['photographer_assigned', 'shooting'].includes(app.status)
    );
    
    return `
      <div class="photographer-card">
        <img src="${photographer.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%236f42c1" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32"%3E${photographer.name.charAt(0)}%3C/text%3E%3C/svg%3E'}" alt="${photographer.name}">
        <h3>${photographer.name}</h3>
        <div class="status">${photographer.specialty || '摄影师'}</div>
        <div class="orders-count">
          ${activeOrders.length > 0 ? `进行中: ${activeOrders.length}单` : '空闲中'}
        </div>
      </div>
    `;
  }).join('');
}

function viewApplication(id) {
  window.location.href = `pages/applications.html?id=${id}`;
}

