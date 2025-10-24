# wx.getSystemInfoSync() 替换指南

## 📊 问题说明

微信官方在基础库 ≥ 3.10.2 版本中，将 `wx.getSystemInfoSync()` 标记为 **deprecated**（已过时），并建议使用更细化的新API。

**控制台警告**：
```
wx.getSystemInfoSync is deprecated.
Please use wx.getSystemSetting/wx.getAppAuthorizeSetting/
wx.getDeviceInfo/wx.getWindowInfo/wx.getAppBaseInfo instead.
```

---

## ✅ 解决方案

已创建 `utils/system-info.js` 工具模块，封装了新版API。

---

## 🚀 使用方法

### 方法1：获取完整系统信息（推荐）

**旧代码**（会产生警告）：
```javascript
const systemInfo = wx.getSystemInfoSync();
console.log(systemInfo);
```

**新代码**（推荐）：
```javascript
const systemInfo = require('../../utils/system-info.js');
const info = systemInfo.getSystemInfo();
console.log(info);
```

**返回数据结构**：
```javascript
{
  // 设备信息
  brand: 'Apple',
  model: 'iPhone 12',
  system: 'iOS 16.0',
  platform: 'ios',
  benchmarkLevel: 50,
  
  // 窗口信息
  pixelRatio: 3,
  screenWidth: 390,
  screenHeight: 844,
  windowWidth: 390,
  windowHeight: 844,
  statusBarHeight: 44,
  safeArea: { ... },
  
  // 应用信息
  SDKVersion: '3.10.2',
  version: '8.0.50',
  language: 'zh_CN',
  theme: 'light',
  
  // 系统设置
  bluetoothEnabled: true,
  locationEnabled: true,
  wifiEnabled: true,
  deviceOrientation: 'portrait',
  
  _isNewAPI: true  // 标记是否使用新API
}
```

---

### 方法2：按需获取特定信息（更高效）

根据实际需求，只获取需要的信息：

#### 📱 获取设备信息
```javascript
const systemInfo = require('../../utils/system-info.js');
const deviceInfo = systemInfo.getDeviceInfo();

console.log(deviceInfo);
// {
//   brand: 'Apple',
//   model: 'iPhone 12',
//   system: 'iOS 16.0',
//   platform: 'ios',
//   benchmarkLevel: 50
// }
```

**常见用途**：
- 判断设备型号
- 判断操作系统版本
- 性能分级

---

#### 🖼️ 获取窗口信息
```javascript
const systemInfo = require('../../utils/system-info.js');
const windowInfo = systemInfo.getWindowInfo();

console.log(windowInfo);
// {
//   pixelRatio: 3,
//   screenWidth: 390,
//   screenHeight: 844,
//   windowWidth: 390,
//   windowHeight: 844,
//   statusBarHeight: 44,
//   safeArea: { top: 44, bottom: 34, ... }
// }
```

**常见用途**：
- 计算自定义导航栏高度
- 适配刘海屏/安全区域
- 响应式布局

---

#### 📦 获取应用基础信息
```javascript
const systemInfo = require('../../utils/system-info.js');
const appInfo = systemInfo.getAppBaseInfo();

console.log(appInfo);
// {
//   SDKVersion: '3.10.2',
//   version: '8.0.50',
//   language: 'zh_CN',
//   theme: 'light'
// }
```

**常见用途**：
- 检查基础库版本兼容性
- 获取微信版本
- 多语言适配

---

#### ⚙️ 获取系统设置
```javascript
const systemInfo = require('../../utils/system-info.js');
const systemSetting = systemInfo.getSystemSetting();

console.log(systemSetting);
// {
//   bluetoothEnabled: true,
//   locationEnabled: true,
//   wifiEnabled: true,
//   deviceOrientation: 'portrait'
// }
```

**常见用途**：
- 检查定位权限
- 检查蓝牙状态
- 检查Wi-Fi连接

---

#### 🔐 获取授权设置
```javascript
const systemInfo = require('../../utils/system-info.js');
const authSetting = systemInfo.getAppAuthorizeSetting();

console.log(authSetting);
// {
//   'scope.userLocation': 'authorized',
//   'scope.camera': 'not determined',
//   ...
// }
```

**常见用途**：
- 检查授权状态
- 引导用户授权

---

## 📋 实际应用场景

### 场景1：适配刘海屏（自定义导航栏）

**旧代码**：
```javascript
const systemInfo = wx.getSystemInfoSync();
const statusBarHeight = systemInfo.statusBarHeight;
const navBarHeight = statusBarHeight + 44;
```

**新代码**：
```javascript
const systemInfo = require('../../utils/system-info.js');
const windowInfo = systemInfo.getWindowInfo();
const statusBarHeight = windowInfo.statusBarHeight;
const navBarHeight = statusBarHeight + 44;
```

---

### 场景2：检查基础库版本

**旧代码**：
```javascript
const systemInfo = wx.getSystemInfoSync();
const SDKVersion = systemInfo.SDKVersion;
if (compareVersion(SDKVersion, '2.21.0') >= 0) {
  // 支持新功能
}
```

**新代码**：
```javascript
const systemInfo = require('../../utils/system-info.js');
const appInfo = systemInfo.getAppBaseInfo();
const SDKVersion = appInfo.SDKVersion;
if (compareVersion(SDKVersion, '2.21.0') >= 0) {
  // 支持新功能
}
```

---

### 场景3：判断设备性能

**旧代码**：
```javascript
const systemInfo = wx.getSystemInfoSync();
const benchmarkLevel = systemInfo.benchmarkLevel;
if (benchmarkLevel > 30) {
  // 高性能设备，启用高质量图片
}
```

**新代码**：
```javascript
const systemInfo = require('../../utils/system-info.js');
const deviceInfo = systemInfo.getDeviceInfo();
const benchmarkLevel = deviceInfo.benchmarkLevel;
if (benchmarkLevel > 30) {
  // 高性能设备，启用高质量图片
}
```

---

### 场景4：响应式rpx转px

**旧代码**：
```javascript
const systemInfo = wx.getSystemInfoSync();
const screenWidth = systemInfo.screenWidth;
const rpx2px = (rpx) => rpx * screenWidth / 750;
```

**新代码**：
```javascript
const systemInfo = require('../../utils/system-info.js');
const windowInfo = systemInfo.getWindowInfo();
const screenWidth = windowInfo.screenWidth;
const rpx2px = (rpx) => rpx * screenWidth / 750;
```

---

## 🔧 迁移检查清单

如果你的项目中有使用 `wx.getSystemInfoSync()`，请按以下步骤迁移：

- [ ] **Step 1**: 全局搜索 `wx.getSystemInfoSync`
  ```bash
  # 在微信开发者工具中按 Ctrl+Shift+F 搜索
  wx.getSystemInfoSync
  ```

- [ ] **Step 2**: 逐个替换为新API
  ```javascript
  // 引入工具模块
  const systemInfo = require('path/to/utils/system-info.js');
  
  // 替换调用
  const info = systemInfo.getSystemInfo();
  ```

- [ ] **Step 3**: 测试功能是否正常
  - 在不同设备上测试
  - 检查是否还有警告

- [ ] **Step 4**: 清除控制台警告
  - 重新编译
  - 确认无 deprecated 警告

---

## ⚠️ 注意事项

### 1. 兼容性处理

`system-info.js` 已内置降级方案：
- 优先使用新API
- 如果新API不可用，自动降级到旧API
- 确保在所有基础库版本都能正常工作

### 2. 性能考虑

**按需获取更高效**：
```javascript
// ❌ 不推荐：获取全部信息（如果只需要部分）
const info = systemInfo.getSystemInfo();
const statusBarHeight = info.statusBarHeight;

// ✅ 推荐：只获取需要的信息
const windowInfo = systemInfo.getWindowInfo();
const statusBarHeight = windowInfo.statusBarHeight;
```

### 3. 缓存建议

如果需要多次使用，建议缓存：
```javascript
Page({
  data: {
    windowInfo: null
  },
  
  onLoad() {
    const systemInfo = require('../../utils/system-info.js');
    this.setData({
      windowInfo: systemInfo.getWindowInfo()
    });
  }
});
```

---

## 📊 新旧API对照表

| 旧API | 新API | 获取内容 |
|-------|-------|---------|
| `wx.getSystemInfoSync()` | `wx.getDeviceInfo()` | 设备品牌、型号、系统版本 |
| `wx.getSystemInfoSync()` | `wx.getWindowInfo()` | 窗口尺寸、状态栏高度、安全区域 |
| `wx.getSystemInfoSync()` | `wx.getAppBaseInfo()` | 基础库版本、微信版本、语言 |
| `wx.getSystemInfoSync()` | `wx.getSystemSetting()` | 蓝牙、定位、Wi-Fi状态 |
| - | `wx.getAppAuthorizeSetting()` | 授权状态 |

---

## ✅ 验证修复

修改完成后，按以下步骤验证：

1. **清除编译缓存**
   ```
   微信开发者工具 → 清缓存 → 清除编译缓存
   ```

2. **重新编译**
   ```
   保存文件 → 自动编译
   ```

3. **检查控制台**
   - 应该**不再出现** `wx.getSystemInfoSync is deprecated` 警告
   - 功能正常工作

4. **多设备测试**
   - iOS 设备
   - Android 设备
   - 不同基础库版本

---

## 🎯 当前项目状态

✅ **已完成**：
- 创建 `utils/system-info.js` 工具模块
- 封装所有新版API
- 提供兼容性降级方案

⏸️ **待确认**：
- 项目代码中是否有直接使用 `wx.getSystemInfoSync()`
- 如果没有，警告可能来自：
  - 微信开发者工具内部
  - vconsole 调试工具
  - 第三方库

💡 **建议**：
- 在所有新代码中使用 `utils/system-info.js`
- 逐步替换旧代码（如果有）
- 避免直接调用 `wx.getSystemInfoSync()`

---

## 📚 参考资料

- [微信官方文档 - wx.getDeviceInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getDeviceInfo.html)
- [微信官方文档 - wx.getWindowInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getWindowInfo.html)
- [微信官方文档 - wx.getAppBaseInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getAppBaseInfo.html)
- [微信官方文档 - wx.getSystemSetting](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemSetting.html)

---

**创建时间**：2025-10-24  
**适用基础库版本**：≥ 3.10.2  
**向后兼容**：✅ 是（自动降级到旧API）

