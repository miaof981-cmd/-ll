// 申请订单管理页面逻辑

let currentPage = 1;
const pageSize = 10;
let allApplications = [];
let filteredApplications = [];
let currentApplicationId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;
  
  // 检查权限：摄影师不能访问
  const currentUser = Auth.getCurrentUser();
  if (currentUser.role === 'photographer') {
    alert('您没有权限访问此页面');
    window.location.href = 'photographer-dashboard.html';
    return;
  }
  document.getElementById('currentUser').textContent = currentUser.name;
  document.getElementById('currentRole').textContent = currentUser.role;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗?')) {
      Auth.logout();
    }
  });

  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchApplications();
    }
  });

  loadApplications();
  loadPhotographers();
});

function loadApplications() {
  allApplications = Storage.getApplications();
  filteredApplications = allApplications;
  renderApplications();
}

function loadPhotographers() {
  const photographers = Storage.getPhotographers();
  const select = document.getElementById('photographerSelect');
  
  select.innerHTML = '<option value="">请选择摄影师</option>' + 
    photographers.map(p => `<option value="${p.id}">${p.name} - ${p.specialty || '摄影师'}</option>`).join('');
}

function searchApplications() {
  const searchText = document.getElementById('searchInput').value.trim();
  
  if (!searchText) {
    filteredApplications = allApplications;
  } else {
    filteredApplications = Utils.searchFilter(allApplications, searchText, ['id', 'childName', 'parentName', 'phone']);
  }
  
  filterApplications();
}

function filterApplications() {
  const status = document.getElementById('statusFilter').value;
  
  if (status) {
    filteredApplications = filteredApplications.filter(app => app.status === status);
  }
  
  currentPage = 1;
  renderApplications();
}

function renderApplications() {
  const paginatedData = Utils.paginate(filteredApplications, currentPage, pageSize);
  const tbody = document.getElementById('applicationsTableBody');
  
  if (paginatedData.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无申请订单</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  tbody.innerHTML = paginatedData.items.map(app => {
    const photographer = app.photographerId ? Storage.getPhotographers().find(p => p.id === app.photographerId) : null;
    
    return `
      <tr>
        <td>${app.id}</td>
        <td>
          <div>${app.childName}</div>
          <small style="color: var(--text-tertiary);">${app.childGender || ''} ${app.childAge ? app.childAge + '岁' : ''}</small>
        </td>
        <td>
          <div>${app.parentName}</div>
          <small style="color: var(--text-tertiary);">${app.phone}</small>
        </td>
        <td>${photographer ? photographer.name : '<span style="color: var(--text-tertiary);">未分配</span>'}</td>
        <td><span class="status-badge ${Utils.getStatusClass(app.status)}">${Utils.getStatusText(app.status)}</span></td>
        <td>${Utils.formatRelativeTime(app.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewDetail('${app.id}')">详情</button>
          ${!app.photographerId ? `<button class="btn btn-sm btn-success" onclick="showAssignModal('${app.id}')">分配</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="showStatusModal('${app.id}')">状态</button>
          <button class="btn btn-sm btn-danger" onclick="deleteApplication('${app.id}')">删除</button>
        </td>
      </tr>
    `;
  }).join('');
  
  renderPagination(paginatedData);
}

function renderPagination(data) {
  const container = document.getElementById('pagination');
  
  if (data.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <button onclick="changePage(${data.page - 1})" ${data.page === 1 ? 'disabled' : ''}>上一页</button>
    <span class="page-info">第 ${data.page} / ${data.totalPages} 页，共 ${data.total} 条</span>
    <button onclick="changePage(${data.page + 1})" ${data.page === data.totalPages ? 'disabled' : ''}>下一页</button>
  `;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredApplications.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderApplications();
}

function viewDetail(id) {
  const app = Storage.getApplicationById(id);
  if (!app) return;
  
  const photographer = app.photographerId ? Storage.getPhotographers().find(p => p.id === app.photographerId) : null;
  
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div style="display: grid; gap: 16px;">
      <div class="card" style="padding: 16px;">
        <h3 style="margin-bottom: 12px;">订单信息</h3>
        <p><strong>订单号:</strong> ${app.id}</p>
        <p><strong>状态:</strong> <span class="status-badge ${Utils.getStatusClass(app.status)}">${Utils.getStatusText(app.status)}</span></p>
        <p><strong>申请时间:</strong> ${Utils.formatDate(app.createdAt)}</p>
        ${app.paidAt ? `<p><strong>支付时间:</strong> ${Utils.formatDate(app.paidAt)}</p>` : ''}
      </div>
      
      <div class="card" style="padding: 16px;">
        <h3 style="margin-bottom: 12px;">孩子信息</h3>
        <p><strong>姓名:</strong> ${app.childName}</p>
        <p><strong>性别:</strong> ${app.childGender || '-'}</p>
        <p><strong>年龄:</strong> ${app.childAge || '-'}岁</p>
        ${app.lifePhoto ? `<div style="margin-top: 12px;"><img src="${app.lifePhoto}" style="max-width: 200px; border-radius: 8px;"></div>` : ''}
      </div>
      
      <div class="card" style="padding: 16px;">
        <h3 style="margin-bottom: 12px;">家长信息</h3>
        <p><strong>姓名:</strong> ${app.parentName}</p>
        <p><strong>联系电话:</strong> ${app.phone}</p>
        <p><strong>微信号:</strong> ${app.wechat || '-'}</p>
        ${app.expectations ? `<p><strong>对孩子的期许:</strong><br>${app.expectations}</p>` : ''}
      </div>
      
      ${photographer ? `
        <div class="card" style="padding: 16px;">
          <h3 style="margin-bottom: 12px;">摄影师信息</h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${photographer.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
            <div>
              <p><strong>${photographer.name}</strong></p>
              <p style="color: var(--text-secondary);">${photographer.specialty || '摄影师'}</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  document.getElementById('detailModal').classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
}

function showAssignModal(id) {
  currentApplicationId = id;
  document.getElementById('photographerSelect').value = '';
  document.getElementById('assignModal').classList.add('active');
}

function closeAssignModal() {
  document.getElementById('assignModal').classList.remove('active');
  currentApplicationId = null;
}

function confirmAssign() {
  const photographerId = document.getElementById('photographerSelect').value;
  
  if (!photographerId) {
    Utils.showToast('请选择摄影师', 'error');
    return;
  }
  
  const photographer = Storage.getPhotographers().find(p => p.id === photographerId);
  
  Storage.updateApplication(currentApplicationId, {
    photographerId,
    photographerName: photographer.name,
    status: 'photographer_assigned',
    assignedAt: new Date().toISOString()
  });
  
  // 更新摄影师订单数
  const currentOrders = photographer.orderCount || 0;
  Storage.updatePhotographer(photographerId, {
    orderCount: currentOrders + 1
  });
  
  Utils.showToast('摄影师分配成功', 'success');
  closeAssignModal();
  loadApplications();
}

function showStatusModal(id) {
  currentApplicationId = id;
  const app = Storage.getApplicationById(id);
  
  if (app) {
    document.getElementById('newStatus').value = app.status;
  }
  
  document.getElementById('statusNote').value = '';
  document.getElementById('statusModal').classList.add('active');
}

function closeStatusModal() {
  document.getElementById('statusModal').classList.remove('active');
  currentApplicationId = null;
}

function confirmStatusUpdate() {
  const newStatus = document.getElementById('newStatus').value;
  const note = document.getElementById('statusNote').value.trim();
  
  Storage.updateApplication(currentApplicationId, {
    status: newStatus,
    lastUpdated: new Date().toISOString(),
    note: note || undefined
  });
  
  Utils.showToast('状态更新成功', 'success');
  closeStatusModal();
  loadApplications();
}

function deleteApplication(id) {
  Utils.confirm('确定要删除该申请订单吗？删除后将无法恢复！', () => {
    Storage.deleteApplication(id);
    Utils.showToast('订单已删除', 'success');
    loadApplications();
  });
}

function exportApplications() {
  const data = allApplications.map(app => {
    const photographer = app.photographerId ? Storage.getPhotographers().find(p => p.id === app.photographerId) : null;
    
    return {
      '订单号': app.id,
      '孩子姓名': app.childName,
      '性别': app.childGender || '',
      '年龄': app.childAge || '',
      '家长姓名': app.parentName,
      '联系电话': app.phone,
      '微信号': app.wechat || '',
      '摄影师': photographer ? photographer.name : '未分配',
      '状态': Utils.getStatusText(app.status),
      '申请时间': Utils.formatDate(app.createdAt),
      '支付时间': app.paidAt ? Utils.formatDate(app.paidAt) : ''
    };
  });
  
  Utils.exportToCSV(data, '申请订单列表');
}

