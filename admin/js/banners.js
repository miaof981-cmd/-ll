// 轮播图管理页面逻辑

let bannerImageData = null;

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

  loadBanners();
});

function loadBanners() {
  const banners = Storage.getBanners();
  const grid = document.getElementById('bannersGrid');
  
  if (banners.length === 0) {
    grid.innerHTML = '<p class="empty-message" style="grid-column: 1/-1;">暂无轮播图</p>';
    return;
  }
  
  grid.innerHTML = banners.map((banner, index) => `
    <div class="banner-card">
      <img src="${banner.image}" alt="轮播图${index + 1}" class="banner-image">
      <div class="banner-info">
        <p style="color: var(--text-secondary); font-size: 13px;">
          添加于 ${Utils.formatDate(banner.createdAt, 'YYYY-MM-DD HH:mm')}
        </p>
        <div class="banner-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteBanner('${banner.id}')" style="flex: 1;">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function showAddBannerModal() {
  bannerImageData = null;
  
  document.getElementById('bannerPreview').style.display = 'none';
  document.getElementById('bannerUploadBtn').style.display = 'flex';
  
  document.getElementById('bannerModal').classList.add('active');
}

function closeBannerModal() {
  document.getElementById('bannerModal').classList.remove('active');
  bannerImageData = null;
}

function uploadBanner(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  Utils.imageToBase64(file, (base64) => {
    bannerImageData = base64;
    document.getElementById('bannerImage').src = base64;
    document.getElementById('bannerPreview').style.display = 'block';
    document.getElementById('bannerUploadBtn').style.display = 'none';
  });
}

function removeBanner() {
  bannerImageData = null;
  document.getElementById('bannerPreview').style.display = 'none';
  document.getElementById('bannerUploadBtn').style.display = 'flex';
}

function saveBanner() {
  if (!bannerImageData) {
    Utils.showToast('请上传轮播图图片', 'error');
    return;
  }
  
  const bannerData = {
    image: bannerImageData
  };
  
  Storage.saveBanner(bannerData);
  
  Utils.showToast('轮播图添加成功', 'success');
  closeBannerModal();
  loadBanners();
}

function deleteBanner(id) {
  Utils.confirm('确定要删除该轮播图吗？', () => {
    Storage.deleteBanner(id);
    Utils.showToast('轮播图已删除', 'success');
    loadBanners();
  });
}

