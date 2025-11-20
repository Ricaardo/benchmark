# Cookie自动获取功能使用指南

## 🍪 功能简介

Cookie自动获取功能允许你根据用户UID和环境（生产/UAT）自动获取B站登录态Cookie，无需手动复制粘贴，提高测试效率。

## 🎯 使用场景

### 1. **不同环境测试**
- 生产环境（Prod）Cookie
- UAT环境（UAT）Cookie

### 2. **不同账号测试**
- 普通用户账号
- VIP用户账号
- UP主账号
- 不同等级用户

### 3. **快速切换登录态**
- 一键获取Cookie
- 支持预设账号
- 支持自定义UID

## 📝 使用方法

### 方式1：使用预设账号（最快）

1. **点击"🔄 自动获取"按钮**
2. **选择预设账号**
   ```
   - UAT测试账号 (110000233)
   - 生产测试账号 (3546793358919882)
   ```
3. **点击"获取并应用"**
4. **Cookie自动填充完成** ✅

### 方式2：自定义UID

1. **点击"🔄 自动获取"按钮**
2. **输入用户UID**
   ```
   例如: 3546793358919882
   ```
3. **选择环境**
   - 生产环境 (Prod) - 默认
   - UAT环境 (UAT)
4. **选择Cookie格式**
   - 字符串格式 (推荐) - 例如: `SESSDATA=xxx; bili_jct=yyy`
   - JSON对象格式 - 例如: `{"SESSDATA": "xxx", "bili_jct": "yyy"}`
5. **点击"获取并应用"**
6. **Cookie自动填充完成** ✅

## 🖥️ 界面说明

### Cookie配置区域

```
┌─────────────────────────────────────────┐
│ Cookie (JSON 或字符串)                   │
├─────────────────────────────────────────┤
│ [✨ 选择Cookie预设▼] [🔄 自动获取] [清空]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ SESSDATA=xxx; bili_jct=yyy; ...    │ │
│ └─────────────────────────────────────┘ │
│ 设置页面的 Cookie，点击"🔄 自动获取"可   │
│ 根据UID和环境自动获取B站登录态          │
└─────────────────────────────────────────┘
```

### 自动获取弹窗

```
┌──────────────────────────────────────────┐
│  🔄 自动获取Cookie                        │
├──────────────────────────────────────────┤
│  选择预设账号                             │
│  [自定义UID... ▼]                        │
│                                          │
│  UID *                                   │
│  [输入用户UID________________]           │
│                                          │
│  环境 *                                  │
│  [生产环境 (Prod) ▼]                     │
│  • 生产环境: http://melloi.bilibili.co   │
│  • UAT环境: http://hassan.bilibili.co    │
│                                          │
│  Cookie格式                              │
│  [字符串格式 (推荐) ▼]                    │
│                                          │
│  [取消]            [获取并应用]          │
└──────────────────────────────────────────┘
```

## 🔧 技术实现

### 后端API

#### 1. 获取Cookie接口

```http
POST /api/cookie/fetch
Content-Type: application/json

{
  "uid": 3546793358919882,
  "env": "prod"  // "prod" 或 "uat"
}
```

**响应示例：**
```json
{
  "success": true,
  "uid": 3546793358919882,
  "env": "prod",
  "cookieString": "SESSDATA=xxx; bili_jct=yyy; DedeUserID=3546793358919882; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc",
  "cookieJson": {
    "SESSDATA": "xxx",
    "bili_jct": "yyy",
    "DedeUserID": "3546793358919882",
    "buvid3": "FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc"
  },
  "tokenData": {
    "session": "xxx",
    "csrf": "yyy",
    "mid": "3546793358919882"
  }
}
```

#### 2. 获取预设账号列表

```http
GET /api/cookie/presets
```

**响应示例：**
```json
{
  "presets": [
    {
      "name": "UAT测试账号",
      "uid": 110000233,
      "env": "uat",
      "description": "UAT环境测试账号"
    },
    {
      "name": "生产测试账号",
      "uid": 3546793358919882,
      "env": "prod",
      "description": "生产环境测试账号"
    }
  ]
}
```

### 环境配置

#### 生产环境 (Prod)
```javascript
URL: http://melloi.bilibili.co/ep/admin/melloi/v3/out/prod/account/token?mid={uid}
Method: GET
```

#### UAT环境
```javascript
URL: http://hassan.bilibili.co/ep/admin/hassan/v2/uat/account/cookie/query
Method: POST
Body: {"mid": uid}
```

### Cookie字段说明

| 字段 | 说明 | 来源 |
|------|------|------|
| SESSDATA | 会话令牌 | tokenData.session |
| bili_jct | CSRF令牌 | tokenData.csrf |
| DedeUserID | 用户ID | tokenData.mid (UID) |
| buvid3 | 设备标识 | 固定值（测试用） |

## 💡 最佳实践

### 1. **使用预设账号**
```javascript
// 推荐：使用预设账号快速测试
预设 → UAT测试账号 → 获取并应用 ✅

// 不推荐：每次都手动输入UID
手动输入 → 110000233 → 选择UAT → 获取 ❌
```

### 2. **选择正确的环境**
```
测试UAT环境页面 → 选择"UAT环境"
测试生产环境页面 → 选择"生产环境"
```

### 3. **使用字符串格式**
```
推荐: 字符串格式 (更简洁，兼容性更好)
"SESSDATA=xxx; bili_jct=yyy; ..."

也可以: JSON格式 (结构化，便于修改)
{"SESSDATA": "xxx", "bili_jct": "yyy"}
```

### 4. **配合测试标记使用**
```bash
# 场景：对比不同登录态的性能差异

# 第1轮：未登录
Cookie: (留空)
测试标记: "未登录"
→ 运行测试

# 第2轮：普通用户
🔄 自动获取 → UID: 普通用户UID
测试标记: "普通用户"
→ 运行测试

# 第3轮：VIP用户
🔄 自动获取 → UID: VIP用户UID
测试标记: "VIP用户"
→ 运行测试
```

## 📊 实际应用示例

### 示例1：测试不同登录态下的页面性能

```javascript
// 测试用例：B站首页性能
测试URL: https://www.bilibili.com

// 第1轮：未登录态
Cookie: (不设置)
运行 → 记录数据

// 第2轮：登录态
点击"🔄 自动获取"
UID: 3546793358919882
环境: 生产环境
获取并应用 → 运行 → 对比数据
```

### 示例2：UAT环境功能验证

```javascript
// 测试用例：新功能验证
测试URL: https://uat-www.bilibili.co/xxx

// 使用UAT测试账号
点击"🔄 自动获取"
选择预设: "UAT测试账号 (110000233)"
获取并应用 → 运行测试
```

### 示例3：批量测试多个账号

```javascript
// 测试不同用户等级的性能差异

// 账号1：普通用户
🔄 自动获取 → UID: 1000001
测试标记: "普通用户-Lv1"
勾选测试用例 → 运行

// 账号2：VIP用户
🔄 自动获取 → UID: 2000002
测试标记: "VIP用户-Lv6"
勾选测试用例 → 运行

// 账号3：大会员
🔄 自动获取 → UID: 3000003
测试标记: "大会员"
勾选测试用例 → 运行

// 对比3组数据
```

## ⚠️ 注意事项

### 1. **网络访问**
- 需要能够访问 `melloi.bilibili.co` 和 `hassan.bilibili.co`
- 内网环境或VPN连接

### 2. **UID有效性**
- 确保UID存在且有效
- 生产UID和UAT UID是不同的

### 3. **Cookie有效期**
- 获取的Cookie有时效性
- 如果测试时Cookie失效，重新获取即可

### 4. **权限要求**
- 可能需要相应的内部系统权限
- 无权限时会返回错误信息

## 🐛 常见问题

### Q: 获取Cookie失败怎么办？
**A:** 检查以下几点：
1. UID是否正确
2. 网络是否通畅（内网/VPN）
3. 是否有访问权限
4. 环境选择是否正确（生产/UAT）

### Q: 获取的Cookie能用多久？
**A:** Cookie有效期取决于后端系统设置，通常为数小时到数天。失效后重新获取即可。

### Q: 字符串格式和JSON格式有什么区别？
**A:**
- **字符串格式**: `SESSDATA=xxx; bili_jct=yyy` - 浏览器标准格式，推荐使用
- **JSON格式**: `{"SESSDATA": "xxx"}` - 结构化格式，便于程序处理

两种格式功能相同，SDK会自动识别并转换。

### Q: 可以添加自定义预设账号吗？
**A:** 可以！修改后端代码 [server/index.ts:1836-1853](server/index.ts#L1836-L1853) 中的预设列表：

```typescript
presets: [
    {
        name: '我的测试账号',
        uid: 你的UID,
        env: 'prod', // 或 'uat'
        description: '描述信息'
    },
    // ... 更多预设
]
```

### Q: 获取Cookie时出现跨域错误？
**A:** 这是内部API，需要在内网环境或通过VPN访问。确保网络环境正确。

## 📚 相关文档

- [测试标记功能](TEST_LABEL_GUIDE.md)
- [并行执行功能](PARALLEL_EXECUTION.md)
- [性能测试最佳实践](README.md)

## 🎉 总结

Cookie自动获取功能的优势：
- ✅ **一键获取**：无需手动复制Cookie
- ✅ **环境切换**：支持生产/UAT环境
- ✅ **预设账号**：常用账号一键选择
- ✅ **格式灵活**：支持字符串/JSON格式
- ✅ **快速测试**：提高测试效率

配合测试标记和并行执行功能，让性能测试更加高效便捷！🚀
