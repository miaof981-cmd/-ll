// 摄影师专用Dashboard

let currentPhotographerId = null;
let currentPhotographer = null;
let currentTaskId = null;
let workImageData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;

  const currentUser = Auth.getCurrentUser();
  
  // 严格检查：只允许摄影师访问
  if (currentUser.role !== 'photographer') {
    alert('此页面仅供摄影师使用');
    window.location.href = 'dashboard.html';
    return;
  }
  
  currentPhotographerId = currentUser.photographerId;
  
  // 获取摄影师详细信息
  const photographers = Storage.getPhotographers();
  currentPhotographer = photographers.find(p => p.id === currentPhotographerId);
  
  if (!currentPhotographer) {
    alert('摄影师信息不存在');
    Auth.logout();
    return;
  }
  
  // 显示摄影师信息
  document.getElementById('photographerName').textContent = currentPhotographer.name;
  document.getElementById('photographerSpecialty').textContent = currentPhotographer.specialty || '专业摄影师';
  
  if (currentPhotographer.avatar) {
    document.getElementById('photographerAvatar').innerHTML = `<img src="${currentPhotographer.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
  }
  
  loadTasks();
});

function loadTasks() {
  const applications = Storage.getApplications();
  
  // 只显示分配给当前摄影师的任务
  const myTasks = applications.filter(app => app.photographerId === currentPhotographerId);
  
  // 统计数据
  const waitingCount = myTasks.filter(t => t.status === 'waiting_draw').length;
  const reviewingCount = myTasks.filter(t => t.status === 'pending_review').length;
  const completedCount = myTasks.filter(t => ['pending_confirm', 'confirmed', 'archived'].includes(t.status)).length;
  
  document.getElementById('waitingCount').textContent = waitingCount;
  document.getElementById('reviewingCount').textContent = reviewingCount;
  document.getElementById('completedCount').textContent = completedCount;
  
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
  
  container.innerHTML = tasks.map(task => {
    const statusColor = Utils.getStatusColor(task.status);
    
    return `
    <div class="task-card">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
        <div>
          <h3 style="font-size: 20px; margin-bottom: 8px;">订单 ${task.id}</h3>
          <div style="color: var(--text-secondary); font-size: 14px;">
            创建时间: ${Utils.formatDate(task.createdAt, 'YYYY-MM-DD HH:mm')}
          </div>
        </div>
        <span class="status-badge ${Utils.getStatusClass(task.status)}" style="background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor};">
          ${Utils.getStatusText(task.status)}
        </span>
      </div>
      
      <div style="display: grid; grid-template-columns: 140px 1fr; gap: 20px; margin-bottom: 20px;">
        ${task.lifePhoto ? `
          <img src="${task.lifePhoto}" 
               style="width: 140px; height: 140px; border-radius: 12px; object-fit: cover; cursor: pointer;" 
               onclick="previewImage('${task.lifePhoto}')" 
               alt="生活照">
        ` : '<div style="width: 140px; height: 140px; background: var(--bg-secondary); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">无照片</div>'}
        
        <div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div>
              <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">孩子姓名</div>
              <div style="font-weight: 500; font-size: 16px;">${task.childName}</div>
            </div>
            <div>
              <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">性别年龄</div>
              <div style="font-weight: 500; font-size: 16px;">${task.childGender || '-'} / ${task.childAge || '-'}岁</div>
            </div>
            <div>
              <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">家长姓名</div>
              <div style="font-weight: 500; font-size: 16px;">${task.parentName}</div>
            </div>
            <div>
              <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">联系电话</div>
              <div style="font-weight: 500; font-size: 16px;">${task.phone}</div>
            </div>
          </div>
        </div>
      </div>
      
      ${task.expectations ? `
        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <div style="font-weight: 500; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">💭 家长期许</div>
          <div style="color: var(--text-secondary); line-height: 1.6; font-size: 14px;">${task.expectations}</div>
        </div>
      ` : ''}
      
      ${task.idPhoto ? `
        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <div style="font-weight: 500; margin-bottom: 12px; color: var(--text-primary); font-size: 14px;">📸 已上传作品</div>
          <div style="display: flex; gap: 16px; align-items: start;">
            <img src="${task.idPhoto}" 
                 style="width: 120px; height: 120px; border-radius: 8px; object-fit: cover; cursor: pointer;" 
                 onclick="previewImage('${task.idPhoto}')" 
                 alt="作品">
            <div style="flex: 1;">
              <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                上传时间: ${Utils.formatDate(task.idPhotoUploadedAt, 'YYYY-MM-DD HH:mm')}
              </div>
              ${task.photographerNote ? `
                <div style="font-size: 13px; color: var(--text-secondary);">
                  <strong>备注:</strong> ${task.photographerNote}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        ${task.status === 'waiting_draw' && !task.idPhoto ? `
          <button class="btn btn-primary" onclick="showUploadModal('${task.id}')" style="flex: 1;">
            📤 上传作品
          </button>
        ` : ''}
        ${task.status === 'waiting_draw' && task.idPhoto ? `
          <button class="btn btn-secondary" onclick="showUploadModal('${task.id}')" style="flex: 1;">
            🔄 重新上传
          </button>
          <button class="btn btn-success" onclick="submitForReview('${task.id}')" style="flex: 1;">
            ✅ 提交审核
          </button>
        ` : ''}
        ${task.status === 'pending_review' ? `
          <button class="btn btn-secondary" disabled style="flex: 1;">
            ⏳ 等待客服审核中...
          </button>
        ` : ''}
        ${task.status === 'pending_confirm' ? `
          <button class="btn btn-secondary" disabled style="flex: 1;">
            ⏳ 等待客户确认中...
          </button>
        ` : ''}
        ${['confirmed', 'archived'].includes(task.status) ? `
          <button class="btn btn-success" disabled style="flex: 1;">
            ✅ 客户已确认
          </button>
        ` : ''}
      </div>
    </div>
  `;
  }).join('');
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

function logout() {
  if (confirm('确定要退出登录吗？')) {
    Auth.logout();
  }
}

