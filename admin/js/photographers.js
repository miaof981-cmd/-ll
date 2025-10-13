// 摄影师管理页面逻辑

let editingPhotographer = null;
let avatarData = null;
let samplesData = [];

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

  loadPhotographers();
  
  // 监听localStorage变化，自动刷新列表（跨标签页）
  window.addEventListener('storage', (e) => {
    if (e.key === 'photographers') {
      console.log('🔄 检测到摄影师数据变化（其他标签页），自动刷新列表');
      loadPhotographers();
    }
  });
  
  // 监听页面获得焦点，刷新数据
  window.addEventListener('focus', () => {
    console.log('🔄 页面获得焦点，刷新摄影师列表');
    loadPhotographers();
  });
  
  // 监听自定义同步事件
  window.addEventListener('pageVisible', () => {
    console.log('🔄 收到同步信号，刷新摄影师列表');
    loadPhotographers();
  });
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
        
        ${photographer.price ? `
          <div style="text-align: center; padding: 8px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 12px;">
            <span style="color: var(--text-secondary); font-size: 12px;">服务价格：</span>
            <span style="color: var(--primary-color); font-size: 18px; font-weight: 600;">¥${photographer.price}</span>
          </div>
        ` : ''}
        
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
  document.getElementById('price').value = '';
  
  document.getElementById('avatarPreview').style.display = 'none';
  document.getElementById('avatarUploadBtn').style.display = 'flex';
  
  renderSamples();
  
  document.getElementById('photographerModal').classList.add('active');
}

function editPhotographer(id) {
  const allPhotographers = Storage.getPhotographers();
  console.log('尝试编辑摄影师 ID:', id);
  console.log('所有摄影师:', allPhotographers);
  
  editingPhotographer = allPhotographers.find(p => p.id === id);
  if (!editingPhotographer) {
    console.error('未找到摄影师，ID:', id);
    Utils.showToast('摄影师不存在', 'error');
    return;
  }
  
  console.log('找到摄影师:', editingPhotographer);
  
  avatarData = editingPhotographer.avatar || null;
  samplesData = editingPhotographer.samples || [];
  
  document.getElementById('modalTitle').textContent = '编辑摄影师';
  document.getElementById('photographerId').value = editingPhotographer.id;
  document.getElementById('photographerName').value = editingPhotographer.name;
  document.getElementById('specialty').value = editingPhotographer.specialty || '';
  document.getElementById('description').value = editingPhotographer.description || '';
  document.getElementById('price').value = editingPhotographer.price || '';
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
  const username = document.getElementById('username').value.trim();
  const price = document.getElementById('price').value.trim();
  
  if (!name) {
    Utils.showToast('请填写摄影师姓名', 'error');
    return;
  }
  
  if (!username) {
    Utils.showToast('请填写登录用户名', 'error');
    return;
  }
  
  if (!price || parseFloat(price) < 0) {
    Utils.showToast('请填写有效的服务价格', 'error');
    return;
  }
  
  const photographerData = {
    id: document.getElementById('photographerId').value || undefined,
    name,
    specialty: document.getElementById('specialty').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: parseFloat(price),
    username,
    password: document.getElementById('photographerPassword').value || 'photo123',
    avatar: avatarData,
    samples: samplesData,
    status: 'available',
    orderCount: editingPhotographer ? editingPhotographer.orderCount : 0
  };
  
  const savedPhotographer = Storage.savePhotographer(photographerData);
  
  console.log('保存的摄影师数据:', savedPhotographer);
  console.log('当前所有摄影师:', Storage.getPhotographers());
  
  if (savedPhotographer) {
    Utils.showToast(
      editingPhotographer ? '摄影师信息已更新，可使用用户名和密码登录' : '摄影师添加成功，可使用用户名和密码登录', 
      'success'
    );
  }
  
  closePhotographerModal();
  loadPhotographers();
}

function deletePhotographer(id) {
  // 检查是否有进行中的订单
  const applications = Storage.getApplications();
  const activeOrders = applications.filter(app => 
    app.photographerId === id && 
    ['waiting_draw', 'pending_review', 'pending_confirm'].includes(app.status)
  );
  
  if (activeOrders.length > 0) {
    Utils.showToast('该摄影师还有进行中的订单，无法删除', 'error');
    return;
  }
  
  Utils.confirm('确定要删除该摄影师吗？删除后其登录账号也将失效。', () => {
    Storage.deletePhotographer(id);
    Utils.showToast('摄影师及其登录账号已删除', 'success');
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

