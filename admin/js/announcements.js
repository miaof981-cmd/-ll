// 公告管理页面逻辑

let editingAnnouncement = null;
let coverImageData = null;

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

  loadAnnouncements();
});

function loadAnnouncements() {
  const announcements = Storage.getAnnouncements();
  const tbody = document.getElementById('announcementsTableBody');
  
  if (announcements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-message">暂无公告</td></tr>';
    return;
  }
  
  tbody.innerHTML = announcements.map(announcement => `
    <tr>
      <td>
        ${announcement.coverImage ? 
          `<img src="${announcement.coverImage}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px;">` : 
          '<div style="width: 60px; height: 45px; background: var(--bg-secondary); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">无</div>'
        }
      </td>
      <td><strong>${announcement.title}</strong></td>
      <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${announcement.content.substring(0, 50)}${announcement.content.length > 50 ? '...' : ''}
      </td>
      <td>${Utils.formatDate(announcement.createdAt, 'YYYY-MM-DD HH:mm')}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editAnnouncement('${announcement.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${announcement.id}')">删除</button>
      </td>
    </tr>
  `).join('');
}

function showAddAnnouncementModal() {
  editingAnnouncement = null;
  coverImageData = null;
  
  document.getElementById('modalTitle').textContent = '发布公告';
  document.getElementById('announcementForm').reset();
  document.getElementById('announcementId').value = '';
  
  document.getElementById('coverPreview').style.display = 'none';
  document.getElementById('coverUploadBtn').style.display = 'flex';
  
  document.getElementById('announcementModal').classList.add('active');
}

function editAnnouncement(id) {
  const announcements = Storage.getAnnouncements();
  editingAnnouncement = announcements.find(a => a.id === id);
  
  if (!editingAnnouncement) return;
  
  coverImageData = editingAnnouncement.coverImage || null;
  
  document.getElementById('modalTitle').textContent = '编辑公告';
  document.getElementById('announcementId').value = editingAnnouncement.id;
  document.getElementById('title').value = editingAnnouncement.title;
  document.getElementById('content').value = editingAnnouncement.content;
  
  if (coverImageData) {
    document.getElementById('coverImage').src = coverImageData;
    document.getElementById('coverPreview').style.display = 'block';
    document.getElementById('coverUploadBtn').style.display = 'none';
  } else {
    document.getElementById('coverPreview').style.display = 'none';
    document.getElementById('coverUploadBtn').style.display = 'flex';
  }
  
  document.getElementById('announcementModal').classList.add('active');
}

function closeAnnouncementModal() {
  document.getElementById('announcementModal').classList.remove('active');
  editingAnnouncement = null;
  coverImageData = null;
}

function uploadCover(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  Utils.imageToBase64(file, (base64) => {
    coverImageData = base64;
    document.getElementById('coverImage').src = base64;
    document.getElementById('coverPreview').style.display = 'block';
    document.getElementById('coverUploadBtn').style.display = 'none';
  });
}

function removeCover() {
  coverImageData = null;
  document.getElementById('coverPreview').style.display = 'none';
  document.getElementById('coverUploadBtn').style.display = 'flex';
}

function saveAnnouncement() {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  
  if (!title || !content) {
    Utils.showToast('请填写标题和内容', 'error');
    return;
  }
  
  const announcementData = {
    id: document.getElementById('announcementId').value || undefined,
    title,
    content,
    coverImage: coverImageData
  };
  
  Storage.saveAnnouncement(announcementData);
  
  Utils.showToast(editingAnnouncement ? '公告已更新' : '公告发布成功', 'success');
  closeAnnouncementModal();
  loadAnnouncements();
}

function deleteAnnouncement(id) {
  Utils.confirm('确定要删除该公告吗？', () => {
    Storage.deleteAnnouncement(id);
    Utils.showToast('公告已删除', 'success');
    loadAnnouncements();
  });
}

