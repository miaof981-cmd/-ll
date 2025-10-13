// 登录页面逻辑

document.addEventListener('DOMContentLoaded', () => {
  // 如果已登录，跳转到dashboard
  if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    if (!username || !password) {
      alert('请输入用户名和密码');
      return;
    }
    
    const result = Auth.login(username, password, role);
    
    if (result.success) {
      // 根据角色跳转到不同页面
      if (result.user.role === 'photographer') {
        window.location.href = 'photographer-dashboard.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      alert(result.message || '登录失败');
    }
  });
});

