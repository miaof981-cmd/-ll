# 次元学校 - 完整版

这是一个完整的学校官网微信小程序项目 + Web后台管理系统，包含入学申请、学生档案、摄影师选择、订单管理等功能。

## 📱 小程序功能特性

### 🏠 首页
- 轮播图展示（完整显示，不裁剪）
- 学校公告（支持图文）
- 点击查看公告详情

### 👤 用户功能
- 学生登录（学号+密码）
- 查看个人档案（瀑布流展示）
- 入学申请流程
  - 填写孩子和家长信息
  - 预览学籍档案
  - 选择摄影师
  - 在线支付
  - 查看申请状态

### 👨‍🎓 学生档案
- 录取通知书
- 成绩单
- 处分记录
- 图片档案
- 瀑布流布局展示

### ⚙️ 小程序管理后台
- 管理员登录后直接进入管理界面
- 轮播图管理
- 公告管理
- 学生管理

## 💻 Web后台管理系统

### 🎯 核心功能
- **数据概览**：实时统计、最近订单、摄影师状态
- **学生管理**：添加/编辑/删除学生、查看档案、导出数据
- **申请订单管理**：查看申请、分配摄影师、更新状态
- **摄影师管理**：添加摄影师、上传作品、订单统计
- **公告管理**：发布/编辑公告、上传封面图
- **轮播图管理**：添加/删除轮播图

### 🔐 权限系统
- **管理员**：所有权限
- **摄影师**：查看和处理分配的订单
- **客服**：查看申请和学生信息

### 📊 数据共享
- 与小程序共享同一套数据存储（localStorage）
- 实时同步，无需刷新

## 🚀 快速开始

### 方式一：本地开发（推荐）

#### 1. 启动小程序
1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择本项目文件夹
4. 填入小程序AppID：`wxda495960c13e6f27`
5. 项目会自动使用本地mock数据，无需配置云开发

#### 2. 启动Web后台
```bash
# 方法1：使用VS Code Live Server
# 1. 在VS Code中打开项目
# 2. 安装Live Server扩展
# 3. 右键点击 admin/index.html
# 4. 选择 "Open with Live Server"

# 方法2：使用命令行
cd /Users/miaoooo/Desktop/学校官网小程序完整版
npx http-server -p 8080
# 访问 http://localhost:8080/admin/
```

#### 3. 登录后台
- 用户名：`admin`
- 密码：`admin123`
- 身份：管理员

### 方式二：云开发部署（可选）

如需使用云开发实现真正的云端存储：

1. 在微信开发者工具中点击"云开发"
2. 开通云开发服务
3. 创建云环境
4. 将环境ID填入 `miniprogram/app.js` 中的 `env` 参数
5. 创建数据库集合：`students`、`applications`、`photographers`、`announcements`、`banners`
6. 上传云函数

## 🎯 演示账号

### Web后台管理系统
- **管理员**：用户名 `admin` / 密码 `admin123`
- **摄影师**：用户名 `photographer` / 密码 `photo123`
- **客服**：用户名 `service` / 密码 `service123`

### 小程序
- **学生账号**：在后台添加学生后，使用生成的学号和密码登录
- **默认密码**：`123456`
- **管理员**：用户名 `admin` / 密码 `admin123`

## 📁 项目结构

```
学校官网小程序完整版/
├── miniprogram/              # 小程序前端代码
│   ├── app.js               # 应用入口
│   ├── app.json             # 全局配置
│   ├── app.wxss             # 全局样式
│   ├── utils/
│   │   └── storage.js       # 数据存储工具（与后台共享）
│   └── pages/               # 页面目录
│       ├── index/           # 首页（轮播图+公告）
│       ├── login/           # 登录页
│       ├── my/              # 我的页面（档案瀑布流）
│       ├── apply/           # 入学申请流程
│       │   ├── apply.wxml   # 步骤1：填写信息
│       │   ├── preview.wxml # 步骤2：预览档案
│       │   ├── photographer.wxml # 步骤3：选择摄影师
│       │   ├── payment.wxml # 步骤4：支付
│       │   └── status.wxml  # 申请状态
│       ├── announcement/    # 公告详情
│       └── admin/           # 小程序管理后台
│           ├── admin.wxml   # 管理首页
│           ├── banners/     # 轮播图管理
│           ├── announcements/ # 公告管理
│           └── students/    # 学生管理
├── admin/                   # Web后台管理系统 ⭐ 新增
│   ├── index.html           # 登录页
│   ├── dashboard.html       # 数据概览
│   ├── css/                 # 样式文件
│   │   ├── common.css       # 通用样式
│   │   ├── login.css        # 登录页样式
│   │   └── dashboard.css    # 后台样式
│   ├── js/                  # JavaScript文件
│   │   ├── storage.js       # 数据存储（与小程序共享）
│   │   ├── auth.js          # 权限验证
│   │   ├── utils.js         # 工具函数
│   │   ├── dashboard.js     # 数据概览
│   │   ├── students.js      # 学生管理
│   │   ├── applications.js  # 申请订单管理
│   │   ├── photographers.js # 摄影师管理
│   │   ├── announcements.js # 公告管理
│   │   └── banners.js       # 轮播图管理
│   ├── pages/               # 管理页面
│   │   ├── students.html    # 学生管理
│   │   ├── applications.html # 申请订单
│   │   ├── photographers.html # 摄影师管理
│   │   ├── announcements.html # 公告管理
│   │   └── banners.html     # 轮播图管理
│   ├── README.md            # 后台使用文档
│   └── 快速开始.md          # 快速上手指南
├── cloudfunctions/          # 云函数（可选）
│   ├── getHomeData/         # 获取首页数据
│   ├── userLogin/           # 用户登录
│   └── getRecords/          # 获取学生记录
├── project.config.json      # 项目配置
└── README.md               # 说明文档
```

## 🔧 开发说明

### 数据存储机制
项目目前使用localStorage存储数据，小程序和Web后台共享同一套`storage.js`：

#### 数据结构
- **students**：学生信息（学号、姓名、家长、密码等）
- **applications**：入学申请订单
- **photographers**：摄影师信息和作品
- **announcements**：公告内容
- **banners**：轮播图
- **records:{studentId}**：学生档案记录

### 技术栈

#### 小程序端
- 微信小程序原生开发
- 使用rpx作为尺寸单位
- 蓝白配色，现代简约风格
- 瀑布流布局（档案展示）

#### Web后台
- 纯HTML/CSS/JavaScript
- 无框架依赖，轻量级
- 响应式设计
- localStorage数据存储

### 样式规范
- **主色调**：蓝色 (#1f6feb) + 白色
- **圆角**：8px
- **阴影**：0 2px 8px rgba(0,0,0,0.08)
- **字体**：PingFang SC / Segoe UI

### 性能优化
- 启用按需注入：`"lazyCodeLoading": "requiredComponents"`
- 图片使用Base64存储（建议<2MB）
- 分页加载（每页10条）

## 📚 详细文档

- **Web后台使用文档**：[admin/README.md](admin/README.md)
- **快速开始指南**：[admin/快速开始.md](admin/快速开始.md)

## 🎨 界面预览

### 小程序
- 首页：轮播图 + 公告卡片
- 登录页：蓝白渐变，居中布局
- 我的页面：瀑布流档案展示
- 申请流程：4步进度条，表单填写

### Web后台
- 登录页：紫色渐变背景
- Dashboard：数据统计卡片 + 最近订单
- 管理页面：侧边栏导航 + 表格/卡片展示

## 🔄 数据同步

目前使用localStorage存储，数据在同一浏览器环境下自动共享。

**未来规划**：接入腾讯云数据库，实现真正的云端存储和跨设备同步。

## ⚠️ 注意事项

1. **数据安全**：localStorage数据存储在浏览器本地，清除浏览器数据会导致数据丢失
2. **图片大小**：建议控制在2MB以内
3. **浏览器兼容**：建议使用Chrome、Firefox、Safari、Edge等现代浏览器
4. **定期备份**：使用导出功能定期备份数据

## 📞 技术支持

如有问题或建议，请查看：
- [Web后台常见问题](admin/README.md#常见问题)
- [快速开始指南](admin/快速开始.md)

## 📄 许可证

MIT License

---

**次元学校 © 2025 版权所有**
