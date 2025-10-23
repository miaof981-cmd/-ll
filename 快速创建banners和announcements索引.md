# 快速创建 banners 和 announcements 索引

## 问题说明

控制台出现索引警告：

```
db.collection('banners').where({
  _openid: 'xxx'
})
.orderBy('order', 'asc')
.get()

db.collection('announcements').where({
  _openid: 'xxx'
})
.orderBy('createdAt', 'desc')
.get()
```

需要创建对应的组合索引来优化查询。

---

## 快速创建步骤

### 方式一：云开发控制台（3分钟）⭐

#### 1. 创建 banners 索引

1. **打开云数据库控制台**
   - 微信开发者工具 → 云开发 → 数据库

2. **点击 `banners` 集合**

3. **点击"索引管理"标签**

4. **点击"添加索引"按钮**

5. **填写索引信息：**
   ```
   索引名称：idx_openid_order
   
   索引字段：
     - _openid: 升序 ↑
     - order: 升序 ↑
   
   索引属性：非唯一（不勾选唯一）
   ```

6. **点击"确定"** ✅

---

#### 2. 创建 announcements 索引

1. **点击 `announcements` 集合**

2. **点击"索引管理"标签**

3. **点击"添加索引"按钮**

4. **填写索引信息：**
   ```
   索引名称：idx_openid_time
   
   索引字段：
     - _openid: 升序 ↑
     - createdAt: 降序 ↓
   
   索引属性：非唯一（不勾选唯一）
   ```

5. **点击"确定"** ✅

---

### 方式二：使用云函数（1分钟）🚀

#### 1. 上传云函数

```bash
右键 cloudfunctions/createIndexes 文件夹
选择"上传并部署：云端安装依赖"
```

#### 2. 测试运行

1. 右键 `createIndexes` 云函数
2. 选择"云函数测试"
3. 点击"调用"
4. 查看返回结果

**成功示例：**
```json
{
  "success": true,
  "message": "索引创建完成",
  "results": [
    { "collection": "banners", "index": "idx_openid_order", "status": "success" },
    { "collection": "announcements", "index": "idx_openid_time", "status": "success" }
  ]
}
```

---

## 验证索引

### 1. 控制台验证

重新编译小程序 → 进入首页

**查看控制台：**
- ✅ 不再有 banners 的索引警告
- ✅ 不再有 announcements 的索引警告

### 2. 查看索引列表

**banners 集合索引：**
```
✅ idx_openid_order (_openid↑, order↑)
✅ _id_ (系统默认)
```

**announcements 集合索引：**
```
✅ idx_openid_time (_openid↑, createdAt↓)
✅ _id_ (系统默认)
```

---

## 预期效果

| 集合 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| banners | 全表扫描 | 索引查询 | **10-50倍** |
| announcements | 全表扫描 | 索引查询 | **10-50倍** |

### 控制台优化
- ✅ 消除黄色索引警告
- ✅ 首页加载更流畅
- ✅ 数据库查询更高效

---

## 常见问题

### Q1: 创建索引后还有警告？

**解决方案：**
1. 等待1-2分钟让索引生效
2. 重新编译小程序
3. 清除缓存后重试

### Q2: 索引名称显示不一样？

**正常现象！** 微信云开发会自动调整索引名称：
- 您创建：`idx_openid_order`
- 系统显示：`_openid_1_order_1`

这是系统的命名规则，功能完全正常！

### Q3: 如何删除旧索引？

如果系统提示有多余的索引可以删除：

1. 点击对应索引
2. 点击"删除"按钮
3. 确认删除

**注意：** 只删除系统提示的多余索引，不要删除新创建的！

---

## 总结

✅ **创建的索引：**
1. `banners.idx_openid_order` (_openid + order)
2. `announcements.idx_openid_time` (_openid + createdAt)

⚡ **效果：**
- 首页加载更快
- 控制台无警告
- 数据库查询优化

🎯 **下一步：**
重新编译小程序 → 测试首页 → 确认无警告 ✅

---

**最后更新：2025-10-23**

