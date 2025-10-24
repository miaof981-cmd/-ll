# 新增 order_photo_history 集合索引

## 问题背景

在查询订单照片历史记录时，控制台提示需要创建索引：

```javascript
db.collection('order_photo_history').where({
  orderId: '4798591468f8e5d1003bc3f37b41',
  rejectType: 'user'
})
.orderBy('createdAt', 'desc')
.get()
```

**控制台建议**：
```
组合索引：
  orderId: 升序
  rejectType: 升序
  createdAt: 降序
```

## 查询场景分析

这个查询用于获取某个订单的用户拒绝历史记录，具体场景：
- **WHERE 条件**：
  - `orderId`: 订单ID（必须匹配）
  - `rejectType: 'user'`: 拒绝类型为用户拒绝（排除管理员拒绝）
- **排序**：按创建时间降序（最新的在前）

## 索引设计

### 组合索引字段

```javascript
{
  orderId: 1,        // WHERE 条件字段（升序）
  rejectType: 1,     // WHERE 条件字段（升序）
  createdAt: -1      // 排序字段（降序）
}
```

### 索引名称
`idx_order_reject_time`

### 设计原则

1. **WHERE 条件字段在前**
   - `orderId` 和 `rejectType` 都是 WHERE 条件
   - 放在索引的前面，提高筛选效率

2. **排序字段在后**
   - `createdAt` 用于排序
   - 放在索引的最后，支持高效排序

3. **字段顺序很重要**
   - WHERE 条件 → 排序条件
   - 这是数据库索引的最佳实践

## 性能提升

### 优化前（无索引）
- 需要全表扫描 `order_photo_history` 集合
- 然后过滤 `orderId` 和 `rejectType`
- 最后在内存中排序
- **性能**：❌ 慢（数据量大时明显）

### 优化后（有索引）
- 直接通过索引定位到符合条件的记录
- 索引本身已排序，无需额外排序
- **性能**：✅ 快（毫秒级响应）

### 预期提升

| 数据量 | 无索引耗时 | 有索引耗时 | 提升倍数 |
|--------|-----------|-----------|---------|
| 100条 | ~50ms | ~5ms | 10x |
| 1000条 | ~500ms | ~10ms | 50x |
| 10000条 | ~5s | ~15ms | 300x+ |

## 使用场景

这个索引支持以下查询场景：

### 场景1：查询某订单的用户拒绝记录（完全匹配）
```javascript
db.collection('order_photo_history').where({
  orderId: 'xxx',
  rejectType: 'user'
})
.orderBy('createdAt', 'desc')
.get()
```
✅ **完美匹配索引，性能最优**

### 场景2：查询某订单的所有拒绝记录（部分匹配）
```javascript
db.collection('order_photo_history').where({
  orderId: 'xxx'
})
.orderBy('createdAt', 'desc')
.get()
```
✅ **可以利用索引前缀（orderId），性能良好**

### 场景3：查询某订单的管理员拒绝记录（完全匹配）
```javascript
db.collection('order_photo_history').where({
  orderId: 'xxx',
  rejectType: 'admin'
})
.orderBy('createdAt', 'desc')
.get()
```
✅ **完美匹配索引，性能最优**

### 不支持的场景

```javascript
// ❌ 只按 rejectType 查询（跳过了索引前缀 orderId）
db.collection('order_photo_history').where({
  rejectType: 'user'
})
.get()
```
这种查询**无法使用此索引**，需要单独为 `rejectType` 创建索引（如果有这种查询需求）

## 创建方法

### 方式1：使用云函数（推荐）

1. 上传并部署 `createIndexes` 云函数
2. 在云开发控制台运行：
```javascript
// 测试环境
云开发 → 云函数 → createIndexes → 测试

// 返回结果
{
  success: true,
  results: [
    { collection: 'order_photo_history', index: 'idx_order_reject_time', status: 'success' }
  ]
}
```

### 方式2：手动创建（云开发控制台）

1. 进入：云开发 → 数据库 → order_photo_history 集合
2. 点击"索引"标签
3. 点击"添加索引"
4. 填写：
   - 索引名称：`idx_order_reject_time`
   - 字段1：`orderId` (升序)
   - 字段2：`rejectType` (升序)
   - 字段3：`createdAt` (降序)
5. 点击"确定"

## 验证索引

创建后，再次执行同样的查询，控制台将不再提示索引建议，说明索引已生效。

### 检查方法
```javascript
// 在云开发控制台执行
db.collection('order_photo_history')
  .where({ orderId: 'test', rejectType: 'user' })
  .orderBy('createdAt', 'desc')
  .get()
```

如果不再显示 `索引建议` 的绿色提示框，说明索引正在被使用。

## 注意事项

1. **索引大小**
   - 每个索引都会占用存储空间
   - 但相比性能提升，这点空间消耗可以忽略

2. **写入性能**
   - 索引会略微降低写入速度（需要维护索引）
   - 但查询性能提升远大于写入的微小损失

3. **索引数量**
   - 单个集合建议不超过 10 个索引
   - 当前 `order_photo_history` 只有 1 个索引，完全合理

4. **索引维护**
   - 索引会自动维护，无需手动操作
   - 数据插入/更新/删除时会自动更新索引

## 相关文件

- `cloudfunctions/createIndexes/index.js` - 索引创建云函数（已更新）
- 本文档：`新增order_photo_history索引说明.md`

## 版本信息

- 创建时间：2025-10-24
- 索引名称：`idx_order_reject_time`
- 支持的集合：`order_photo_history`
- 索引字段：`orderId`, `rejectType`, `createdAt`

