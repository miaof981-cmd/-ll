// 摄影师任务页面逻辑

let currentPhotographerId = null;
let currentTaskId = null;
let workImageData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;

  const currentUser = Auth.getCurrentUser();
  
  // 检查是否是摄影师
  if (currentUser.role !== 'photographer') {
    alert('此页面仅供摄影师使用');
    window.location.href = '../dashboard.html';
    return;
  }
  
  currentPhotographerId = currentUser.photographerId;
  
  document.getElementById('currentUser').textContent = currentUser.name;
  document.getElementById('currentRole').textContent = '摄影师';

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗?')) {
      Auth.logout();
    }
  });

  loadTasks();
});

function loadTasks() {
  const applications = Storage.getApplications();
  
  // 只显示分配给当前摄影师的任务
  const myTasks = applications.filter(app => app.photographerId === currentPhotographerId);
  
  renderTasks(myTasks);
}

function filterTasks() {
  const status = document.getElementById('statusFilter').value;
  const applications = Storage.getApplications();
  
  let myTasks = applications.filter(app => app.photographerId === currentPhotographerId);
  
  if (status) {
    myTasks = myTasks.filter(app => app.status === status);
  }
  
  renderTasks(myTasks);
}

function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  const emptyMessage = document.getElementById('emptyMessage');
  
  if (tasks.length === 0) {
    container.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }
  
  emptyMessage.style.display = 'none';
  
  container.innerHTML = tasks.map(task => `
    <div class="task-card">
      <div class="task-header">
        <div>
          <h3>订单号: ${task.id}</h3>
          <small style="color: var(--text-tertiary);">创建时间: ${Utils.formatDate(task.createdAt)}</small>
        </div>
        <span class="status-badge ${Utils.getStatusClass(task.status)}">${Utils.getStatusText(task.status)}</span>
      </div>
      
      <div class="child-info">
        ${task.lifePhoto ? `<img src="${task.lifePhoto}" class="life-photo" onclick="previewImage('${task.lifePhoto}')" alt="生活照">` : ''}
        <div class="info-details">
          <div class="info-row">
            <span class="info-label">孩子姓名:</span>
            <strong>${task.childName}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">性别:</span>
            ${task.childGender || '-'}
          </div>
          <div class="info-row">
            <span class="info-label">年龄:</span>
            ${task.childAge || '-'}岁
          </div>
          <div class="info-row">
            <span class="info-label">家长:</span>
            ${task.parentName}
          </div>
          <div class="info-row">
            <span class="info-label">联系电话:</span>
            ${task.phone}
          </div>
        </div>
      </div>
      
      ${task.expectations ? `
        <div class="expectations-box">
          <div style="font-weight: 500; margin-bottom: 8px; color: var(--text-primary);">家长期许:</div>
          <div style="color: var(--text-secondary); line-height: 1.6;">${task.expectations}</div>
        </div>
      ` : ''}
      
      ${task.idPhoto ? `
        <div class="upload-section">
          <div style="font-weight: 500; margin-bottom: 12px;">已上传作品:</div>
          <div class="uploaded-work">
            <img src="${task.idPhoto}" class="work-preview" onclick="previewImage('${task.idPhoto}')" alt="作品">
            <div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">
                上传时间: ${Utils.formatDate(task.idPhotoUploadedAt)}
              </div>
              ${task.photographerNote ? `<div style="font-size: 14px; color: var(--text-secondary);">备注: ${task.photographerNote}</div>` : ''}
            </div>
          </div>
        </div>
      ` : ''}
      
      <div style="margin-top: 16px; display: flex; gap: 12px;">
        ${task.status === 'waiting_draw' && !task.idPhoto ? `
          <button class="btn btn-primary" onclick="showUploadModal('${task.id}')">上传作品</button>
        ` : ''}
        ${task.status === 'waiting_draw' && task.idPhoto ? `
          <button class="btn btn-primary" onclick="showUploadModal('${task.id}')">重新上传</button>
          <button class="btn btn-success" onclick="submitForReview('${task.id}')">提交审核</button>
        ` : ''}
        ${task.status === 'pending_review' ? `
          <button class="btn btn-secondary" disabled>等待客服审核中...</button>
        ` : ''}
        ${task.status === 'pending_confirm' ? `
          <button class="btn btn-secondary" disabled>等待客户确认中...</button>
        ` : ''}
        ${task.status === 'confirmed' ? `
          <button class="btn btn-success" disabled>客户已确认</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function showUploadModal(taskId) {
  currentTaskId = taskId;
  workImageData = null;
  
  const task = Storage.getApplicationById(taskId);
  if (task && task.idPhoto) {
    workImageData = task.idPhoto;
    document.getElementById('workImage').src = task.idPhoto;
    document.getElementById('workPreview').style.display = 'block';
    document.getElementById('workUploadBtn').style.display = 'none';
  } else {
    document.getElementById('workPreview').style.display = 'none';
    document.getElementById('workUploadBtn').style.display = 'flex';
  }
  
  document.getElementById('workNote').value = task?.photographerNote || '';
  document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('active');
  currentTaskId = null;
  workImageData = null;
}

function uploadWork(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    workImageData = e.target.result;
    document.getElementById('workImage').src = workImageData;
    document.getElementById('workPreview').style.display = 'block';
    document.getElementById('workUploadBtn').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function removeWork() {
  workImageData = null;
  document.getElementById('workPreview').style.display = 'none';
  document.getElementById('workUploadBtn').style.display = 'flex';
}

function submitWork() {
  if (!workImageData) {
    Utils.showToast('请上传作品文件', 'error');
    return;
  }
  
  const note = document.getElementById('workNote').value.trim();
  
  Storage.updateApplication(currentTaskId, {
    idPhoto: workImageData,
    photographerNote: note,
    idPhotoUploadedAt: new Date().toISOString(),
    operator: 'photographer'
  });
  
  Utils.showToast('作品已保存，请点击"提交审核"', 'success');
  closeUploadModal();
  loadTasks();
}

function submitForReview(taskId) {
  const task = Storage.getApplicationById(taskId);
  
  if (!task.idPhoto) {
    Utils.showToast('请先上传作品', 'error');
    return;
  }
  
  Utils.confirm('确定提交审核吗？提交后将由客服审核作品。', () => {
    Storage.updateApplication(taskId, {
      status: 'pending_review',
      submittedForReviewAt: new Date().toISOString(),
      operator: 'photographer',
      statusNote: '摄影师已提交作品'
    });
    
    Utils.showToast('已提交审核，请等待客服审核', 'success');
    loadTasks();
  });
}

function previewImage(src) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
  
  modal.appendChild(img);
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

