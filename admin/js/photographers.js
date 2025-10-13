// 摄影师管理页面逻辑

let editingPhotographer = null;
let avatarData = null;
let samplesData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireLogin()) return;

  const currentUser = Auth.getCurrentUser();
  document.getElementById('currentUser').textContent = currentUser.name;
  document.getElementById('currentRole').textContent = currentUser.role;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('确定要退出登录吗?')) {
      Auth.logout();
    }
  });

  loadPhotographers();
});

function loadPhotographers() {
  const photographers = Storage.getPhotographers();
  const applications = Storage.getApplications();
  const grid = document.getElementById('photographersGrid');
  
  if (photographers.length === 0) {
    grid.innerHTML = '<p class="empty-message" style="grid-column: 1/-1;">暂无摄影师</p>';
    return;
  }
  
  grid.innerHTML = photographers.map(photographer => {
    const orders = applications.filter(app => app.photographerId === photographer.id);
    const activeOrders = orders.filter(app => 
      ['photographer_assigned', 'shooting'].includes(app.status)
    );
    const completedOrders = orders.filter(app => app.status === 'completed');
    
    return `
      <div class="photographer-card">
        <div class="photographer-header">
          <img src="${photographer.avatar || generateDefaultAvatar(photographer.name)}" 
               alt="${photographer.name}" 
               class="photographer-avatar">
          <div class="photographer-info">
            <h3>${photographer.name}</h3>
            <p>${photographer.specialty || '摄影师'}</p>
          </div>
        </div>
        
        ${photographer.description ? `<p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">${photographer.description}</p>` : ''}
        
        <div class="photographer-stats">
          <div class="stat-item">
            <div class="number">${activeOrders.length}</div>
            <div class="label">进行中</div>
          </div>
          <div class="stat-item">
            <div class="number">${completedOrders.length}</div>
            <div class="label">已完成</div>
          </div>
          <div class="stat-item">
            <div class="number">${orders.length}</div>
            <div class="label">总订单</div>
          </div>
        </div>
        
        ${photographer.samples && photographer.samples.length > 0 ? `
          <div class="samples-grid">
            ${photographer.samples.slice(0, 3).map(sample => `
              <img src="${sample}" class="sample-image" onclick="previewImage('${sample}')">
            `).join('')}
          </div>
        ` : ''}
        
        <div class="photographer-actions">
          <button class="btn btn-sm btn-secondary" onclick="editPhotographer('${photographer.id}')" style="flex: 1;">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deletePhotographer('${photographer.id}')" style="flex: 1;">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function generateDefaultAvatar(name) {
  const colors = ['#1f6feb', '#28a745', '#6f42c1', '#fd7e14', '#dc3545'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initial = name.charAt(0);
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="${encodeURIComponent(color)}" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32"%3E${initial}%3C/text%3E%3C/svg%3E`;
}

function showAddPhotographerModal() {
  editingPhotographer = null;
  avatarData = null;
  samplesData = [];
  
  document.getElementById('modalTitle').textContent = '添加摄影师';
  document.getElementById('photographerForm').reset();
  document.getElementById('photographerId').value = '';
  document.getElementById('photographerPassword').value = 'photo123';
  
  document.getElementById('avatarPreview').style.display = 'none';
  document.getElementById('avatarUploadBtn').style.display = 'flex';
  
  renderSamples();
  
  document.getElementById('photographerModal').classList.add('active');
}

function editPhotographer(id) {
  editingPhotographer = Storage.getPhotographers().find(p => p.id === id);
  if (!editingPhotographer) return;
  
  avatarData = editingPhotographer.avatar || null;
  samplesData = editingPhotographer.samples || [];
  
  document.getElementById('modalTitle').textContent = '编辑摄影师';
  document.getElementById('photographerId').value = editingPhotographer.id;
  document.getElementById('photographerName').value = editingPhotographer.name;
  document.getElementById('specialty').value = editingPhotographer.specialty || '';
  document.getElementById('description').value = editingPhotographer.description || '';
  document.getElementById('username').value = editingPhotographer.username || '';
  document.getElementById('photographerPassword').value = editingPhotographer.password || 'photo123';
  
  if (avatarData) {
    document.getElementById('avatarImage').src = avatarData;
    document.getElementById('avatarPreview').style.display = 'block';
    document.getElementById('avatarUploadBtn').style.display = 'none';
  } else {
    document.getElementById('avatarPreview').style.display = 'none';
    document.getElementById('avatarUploadBtn').style.display = 'flex';
  }
  
  renderSamples();
  
  document.getElementById('photographerModal').classList.add('active');
}

function closePhotographerModal() {
  document.getElementById('photographerModal').classList.remove('active');
  editingPhotographer = null;
  avatarData = null;
  samplesData = [];
}

function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  Utils.imageToBase64(file, (base64) => {
    avatarData = base64;
    document.getElementById('avatarImage').src = base64;
    document.getElementById('avatarPreview').style.display = 'block';
    document.getElementById('avatarUploadBtn').style.display = 'none';
  });
}

function removeAvatar() {
  avatarData = null;
  document.getElementById('avatarPreview').style.display = 'none';
  document.getElementById('avatarUploadBtn').style.display = 'flex';
}

function uploadSamples(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  let processed = 0;
  files.forEach(file => {
    Utils.imageToBase64(file, (base64) => {
      samplesData.push(base64);
      processed++;
      if (processed === files.length) {
        renderSamples();
      }
    });
  });
}

function renderSamples() {
  const container = document.getElementById('samplesContainer');
  
  container.innerHTML = samplesData.map((sample, index) => `
    <div class="image-preview">
      <img src="${sample}" alt="样例${index + 1}">
      <button type="button" class="remove-btn" onclick="removeSample(${index})">&times;</button>
    </div>
  `).join('') + `
    <label class="upload-btn">
      <input type="file" accept="image/*" multiple onchange="uploadSamples(event)" style="display: none;">
      +
    </label>
  `;
}

function removeSample(index) {
  samplesData.splice(index, 1);
  renderSamples();
}

function savePhotographer() {
  const name = document.getElementById('photographerName').value.trim();
  
  if (!name) {
    Utils.showToast('请填写摄影师姓名', 'error');
    return;
  }
  
  const photographerData = {
    id: document.getElementById('photographerId').value || undefined,
    name,
    specialty: document.getElementById('specialty').value.trim(),
    description: document.getElementById('description').value.trim(),
    username: document.getElementById('username').value.trim() || name,
    password: document.getElementById('photographerPassword').value || 'photo123',
    avatar: avatarData,
    samples: samplesData,
    status: 'available',
    orderCount: editingPhotographer ? editingPhotographer.orderCount : 0
  };
  
  Storage.savePhotographer(photographerData);
  
  Utils.showToast(editingPhotographer ? '摄影师信息已更新' : '摄影师添加成功', 'success');
  closePhotographerModal();
  loadPhotographers();
}

function deletePhotographer(id) {
  // 检查是否有进行中的订单
  const applications = Storage.getApplications();
  const activeOrders = applications.filter(app => 
    app.photographerId === id && 
    ['photographer_assigned', 'shooting'].includes(app.status)
  );
  
  if (activeOrders.length > 0) {
    Utils.showToast('该摄影师还有进行中的订单，无法删除', 'error');
    return;
  }
  
  Utils.confirm('确定要删除该摄影师吗？', () => {
    Storage.deletePhotographer(id);
    Utils.showToast('摄影师已删除', 'success');
    loadPhotographers();
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

