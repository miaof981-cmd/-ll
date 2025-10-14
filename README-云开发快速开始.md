# 🚀 云开发快速开始

## 一、为什么要用云开发？

目前系统使用浏览器 `localStorage` 存储数据，存在以下问题：
- ❌ **数据隔离**：小程序和Web后台无法共享数据
- ❌ **数据丢失**：清除缓存后数据消失
- ❌ **多端不同步**：不同设备、浏览器数据独立

使用**微信云开发**后：
- ✅ **统一数据库**：小程序和Web后台共享同一个云数据库
- ✅ **数据持久化**：数据永久保存，不会丢失
- ✅ **实时同步**：所有端的数据自动同步
- ✅ **免费额度充足**：每天免费调用4万次，完全够用

---

## 二、系统架构

```
┌─────────────────┐         ┌─────────────────┐
│   微信小程序     │         │  Web管理后台     │
│                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │
│  │ cloud-db  │  │         │  │ cloud-api │  │
│  └─────┬─────┘  │         │  └─────┬─────┘  │
└────────┼────────┘         └────────┼────────┘
         │                           │
         │        调用云函数           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │      微信云开发         │
         │  ┌─────────────────┐  │
         │  │   云函数服务      │  │
         │  └────────┬────────┘  │
         │           │           │
         │  ┌────────▼────────┐  │
         │  │   云数据库       │  │
         │  │ photographers   │  │
         │  │ students        │  │
         │  │ applications    │  │
         │  │ announcements   │  │
         │  │ banners         │  │
         │  │ archives        │  │
         │  └─────────────────┘  │
         └───────────────────────┘
```

---

## 三、开通步骤（5分钟）

### 步骤1: 打开微信开发者工具
在您的小程序项目中，点击顶部菜单 **"云开发"** 按钮

### 步骤2: 创建云环境
- 点击 **"开通云开发"**
- 环境名称：系统自动生成
- 付费方式：选择 **"按量计费"**（有免费额度）
- 点击 **"创建"**

### 步骤3: 记录环境ID
创建成功后会显示环境ID，格式如：`cloud-xxxxx`

**⚠️ 请记录这个ID，后面要用！**

---

## 四、创建数据库（2分钟）

在云开发控制台 → 数据库 → 点击"添加集合"，创建以下6个集合：

| 集合名称 | 说明 |
|---------|------|
| `photographers` | 摄影师信息 |
| `students` | 学生信息 |
| `applications` | 申请订单 |
| `announcements` | 公告 |
| `banners` | 轮播图 |
| `archives` | 学籍档案 |

权限设置：选择 **"仅创建者可读写"**

---

## 五、上传云函数（3分钟）

在微信开发者工具中，右键以下3个文件夹，选择 **"上传并部署：云端安装依赖"**：

```
cloudfunctions/
  ├── photographers/   （右键上传）
  ├── students/        （右键上传）
  └── applications/    （右键上传）
```

等待上传完成，在云开发控制台应该能看到3个云函数。

---

## 六、开启HTTP触发器（重要！）

这一步让Web管理后台能调用云函数！

1. 在云开发控制台 → 云函数 → 点击 `photographers`
2. 找到 **"触发器配置"** → 点击 **"添加触发器"**
3. 类型选择：**HTTP**
4. 点击 **"确定"**
5. **复制生成的HTTP地址**

对 `students` 和 `applications` 重复上述操作。

你会得到3个HTTP地址，格式如：
```
https://cloud-xxxxx.service.tcloudbase.com/photographers
https://cloud-xxxxx.service.tcloudbase.com/students
https://cloud-xxxxx.service.tcloudbase.com/applications
```

**⚠️ 请记录这3个地址！**

---

## 七、配置环境ID（1分钟）

### 配置小程序端

打开 `miniprogram/app.js`，第5行：

```javascript
const envId = 'school-env-xxxxx'; // 👈 替换为您的环境ID
```

改为：

```javascript
const envId = 'cloud-xxxxx'; // 👈 填入步骤3记录的ID
```

### 配置Web管理后台

打开 `admin/js/cloud-api.js`，第8行：

```javascript
baseURL: {
  photographers: 'https://your-env-id.service.tcloudbase.com/photographers',
  students: 'https://your-env-id.service.tcloudbase.com/students',
  applications: 'https://your-env-id.service.tcloudbase.com/applications'
}
```

改为：

```javascript
baseURL: {
  photographers: 'https://cloud-xxxxx.service.tcloudbase.com/photographers',
  students: 'https://cloud-xxxxx.service.tcloudbase.com/students',
  applications: 'https://cloud-xxxxx.service.tcloudbase.com/applications'
}
```

**👆 填入步骤6记录的3个HTTP地址**

---

## 八、测试（2分钟）

### 测试小程序
1. 在微信开发者工具中运行小程序
2. 打开控制台Console
3. 应该看到：`✅ 云开发初始化成功，环境ID: cloud-xxxxx`

### 测试Web后台
1. 打开 `admin/index.html`
2. 登录管理员账号（admin/admin123）
3. 进入"摄影师管理"，添加一个测试摄影师
4. 成功后，刷新页面，数据不会丢失！

---

## 九、成本说明

### 免费额度（每天）
- 云函数调用：**40,000次**
- 数据库读操作：**50,000次**
- 数据库写操作：**30,000次**
- 存储空间：**2GB**

### 预估成本
对于学校小程序（假设100个学生，10个管理员）：
- 每天云函数调用：约500次
- 数据库读写：约1000次

**结论：完全在免费额度内！** 💰

---

## 十、完成检查清单

请确认以下步骤都已完成：

```
□ 开通云开发，记录环境ID
□ 创建6个数据库集合
□ 上传3个云函数
□ 开启3个云函数的HTTP触发器
□ 配置小程序端环境ID（app.js）
□ 配置Web后台HTTP地址（cloud-api.js）
□ 测试小程序端，控制台显示"云开发初始化成功"
□ 测试Web后台，能正常添加数据且不丢失
```

---

## 🎉 恭喜！

全部完成后，您的系统将：
- ✅ 数据永久保存，不会丢失
- ✅ 小程序和Web后台数据实时同步
- ✅ 支持多设备、多管理员同时使用
- ✅ 完全免费（在合理使用范围内）

---

## ❓ 常见问题

### Q: 控制台显示"未配置云开发环境ID"
A: 检查 `app.js` 中的 `envId` 是否正确配置

### Q: Web后台提示"未配置云函数HTTP触发器"
A: 检查 `cloud-api.js` 中的 `baseURL` 是否配置了正确的HTTP地址

### Q: 云函数调用失败
A: 
1. 确认云函数已上传
2. 确认HTTP触发器已开启
3. 查看云函数日志排查错误

### Q: 数据不同步
A: 确认小程序和Web后台使用**同一个环境ID**

---

## 📖 详细文档

如需更详细的说明，请查看：
- `云开发部署指南.md` - 完整部署步骤
- `混合架构实施方案.md` - 技术架构说明

---

**有问题随时问我！** 🙋‍♂️

