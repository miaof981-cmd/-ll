/**
 * localStorage跨标签页同步助手
 * 解决多个标签页之间数据不同步的问题
 */

// 在页面加载时立即刷新数据
window.addEventListener('focus', () => {
  console.log('页面获得焦点，刷新数据...');
  
  // 触发自定义事件，让各个页面刷新数据
  window.dispatchEvent(new CustomEvent('pageVisible', {
    detail: { timestamp: Date.now() }
  }));
});

// 监听localStorage变化（跨标签页）
window.addEventListener('storage', (e) => {
  console.log('检测到localStorage变化:', e.key);
  
  // 触发自定义事件
  window.dispatchEvent(new CustomEvent('storageChanged', {
    detail: {
      key: e.key,
      oldValue: e.oldValue,
      newValue: e.newValue
    }
  }));
});

// 定期同步数据（每3秒）
let lastSyncTime = Date.now();
setInterval(() => {
  const now = Date.now();
  if (now - lastSyncTime > 3000) {
    console.log('定期同步检查...');
    window.dispatchEvent(new CustomEvent('periodicSync', {
      detail: { timestamp: now }
    }));
    lastSyncTime = now;
  }
}, 3000);

console.log('✅ localStorage同步助手已加载');

