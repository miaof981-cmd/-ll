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
  const appSelect = document.getElementById('applicationPhotographerSelect');
  
  const options = '<option value="">请选择摄影师</option>' + 
    photographers.map(p => `<option value="${p.id}">${p.name} - ${p.specialty || '摄影师'}</option>`).join('');
  
  select.innerHTML = options;
  if (appSelect) {
    appSelect.innerHTML = options;
  }
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
  const container = document.getElementById('applicationsContainer');
  
  if (paginatedData.items.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-tertiary); padding: 40px;">暂无申请订单</div>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  container.innerHTML = paginatedData.items.map(app => {
    const photographer = app.photographerId ? Storage.getPhotographers().find(p => p.id === app.photographerId) : null;
    const userAvatar = app.userAvatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
    const userNickName = app.userNickName || '微信用户';
    
    return `
      <div class="card" style="padding: 20px; background: var(--bg-primary); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.3s; cursor: pointer;" onclick="viewDetail('${app.id}')" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'">
        
        <!-- 订单头部：订单号和状态 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
          <div>
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">#${app.id}</div>
            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">${Utils.formatRelativeTime(app.createdAt)}</div>
          </div>
          <span class="status-badge ${Utils.getStatusClass(app.status)}">${Utils.getStatusText(app.status)}</span>
        </div>
        
        <!-- 用户和摄影师信息 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <!-- 下单用户 -->
          <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
            <img src="${userAvatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.src='https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 2px;">下单用户</div>
              <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userNickName}</div>
            </div>
          </div>
          
          <!-- 摄影师 -->
          <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
            ${photographer ? `
              <img src="${photographer.avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.src='https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'">
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 2px;">摄影师</div>
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${photographer.name}</div>
              </div>
            ` : `
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 18px;">?</div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 2px;">摄影师</div>
                <div style="font-size: 13px; color: var(--text-tertiary);">未分配</div>
              </div>
            `}
          </div>
        </div>
        
        <!-- 孩子和家长信息 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px;">
          <div>
            <span style="color: var(--text-tertiary);">孩子：</span>
            <span style="color: var(--text-primary); font-weight: 500;">${app.childName}</span>
            <span style="color: var(--text-tertiary); margin-left: 4px;">${app.childGender || ''} ${app.childAge ? app.childAge + '岁' : ''}</span>
          </div>
          <div>
            <span style="color: var(--text-tertiary);">家长：</span>
            <span style="color: var(--text-primary); font-weight: 500;">${app.parentName}</span>
            <span style="color: var(--text-tertiary); margin-left: 4px;">${app.phone}</span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-color);" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-primary" onclick="viewDetail('${app.id}')" style="flex: 1;">详情</button>
          ${!app.photographerId ? `<button class="btn btn-sm btn-success" onclick="showAssignModal('${app.id}')" style="flex: 1;">分配</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="showStatusModal('${app.id}')" style="flex: 1;">状态</button>
          <button class="btn btn-sm btn-danger" onclick="deleteApplication('${app.id}')">删除</button>
        </div>
      </div>
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

// 显示创建订单模态框
function showAddApplicationModal() {
  // 重置表单
  document.getElementById('applicationForm').reset();
  
  // 加载摄影师列表
  loadPhotographers();
  
  // 显示模态框
  document.getElementById('addApplicationModal').classList.add('active');
}

// 关闭创建订单模态框
function closeAddApplicationModal() {
  document.getElementById('addApplicationModal').classList.remove('active');
}

// 确认创建订单
function confirmAddApplication() {
  // 获取表单数据
  const childName = document.getElementById('childName').value.trim();
  const childGender = document.getElementById('childGender').value;
  const childAge = document.getElementById('childAge').value;
  const parentName = document.getElementById('parentName').value.trim();
  const parentPhone = document.getElementById('parentPhone').value.trim();
  const parentWechat = document.getElementById('parentWechat').value.trim();
  const photographerId = document.getElementById('applicationPhotographerSelect').value;
  const expectations = document.getElementById('expectations').value.trim();
  
  // 验证必填字段
  if (!childName) {
    Utils.showToast('请输入孩子姓名', 'error');
    return;
  }
  
  if (!parentName) {
    Utils.showToast('请输入家长姓名', 'error');
    return;
  }
  
  if (!parentPhone) {
    Utils.showToast('请输入联系电话', 'error');
    return;
  }
  
  if (!photographerId) {
    Utils.showToast('请选择摄影师', 'error');
    return;
  }
  
  // 获取管理员信息作为下单用户
  const currentUser = Auth.getCurrentUser();
  const userNickName = currentUser.name || '管理员';
  const userAvatarUrl = currentUser.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
  
  // 获取摄影师信息
  const photographer = Storage.getPhotographers().find(p => p.id === photographerId);
  
  if (!photographer) {
    Utils.showToast('摄影师不存在', 'error');
    return;
  }
  
  // 创建订单数据
  const application = {
    childName,
    childGender,
    childAge: childAge ? parseInt(childAge) : '',
    parentName,
    phone: parentPhone,
    wechat: parentWechat,
    expectations,
    photographerId,
    photographerName: photographer.name,
    // 使用管理员的头像和名字
    userNickName: userNickName,
    userAvatarUrl: userAvatarUrl,
    status: 'waiting_draw',
    lifePhoto: '' // 可以后续上传
  };
  
  // 保存订单
  Storage.saveApplication(application);
  
  // 更新摄影师订单数
  const currentOrders = photographer.orderCount || 0;
  Storage.updatePhotographer(photographerId, {
    orderCount: currentOrders + 1
  });
  
  Utils.showToast('订单创建成功', 'success');
  closeAddApplicationModal();
  loadApplications();
}

