# Cookie 自动刷新功能 - 使用指南 🔄

## 🎉 新功能亮点

**无需手动更新 Cookie！** 每次运行测试时，系统自动根据配置的环境和 UID 获取最新 Cookie。

### ✨ 核心优势

- ✅ **自动刷新** - 每次执行测试时自动获取最新 Cookie
- ✅ **无需维护** - 配置一次，永久使用，不用担心 Cookie 过期
- ✅ **多环境支持** - 支持 UAT 和生产环境自动切换
- ✅ **多账号支持** - 可为不同测试用例配置不同账号
- ✅ **三种模式** - 不登录 / 自动获取 / 手动配置，灵活选择

## 🚀 快速开始

### 1. 打开测试用例配置

访问 http://localhost:3000，点击"添加测试用例"或编辑现有用例。

### 2. 配置登录态

在 **"🍪 登录态配置"** 区域：

#### **模式 1：自动获取（推荐）✨**

```
1. 登录模式选择：🔄 自动获取
2. 账号预设：选择 "UAT测试账号 (110000233)" 或自定义
3. UID：110000233（或你的账号 UID）
4. 环境：UAT环境 或 生产环境
5. 保存测试用例
```

#### **模式 2：不登录**

```
1. 登录模式选择：🚫 不登录（匿名访问）
2. 保存测试用例
```

#### **模式 3：手动配置**

```
1. 登录模式选择：✍️ 手动配置
2. 输入固定的 Cookie 字符串
3. 保存测试用例
```

### 3. 运行测试

点击"运行测试"，系统会：

1. ✅ 自动获取最新 Cookie（如果是自动模式）
2. ✅ 将 Cookie 转换为 Playwright 格式
3. ✅ 执行测试

## 📖 详细说明

### 登录模式对比

| 模式 | 适用场景 | Cookie 来源 | 是否自动更新 |
|------|---------|-------------|-------------|
| 🚫 不登录 | 测试公开页面 | 无 | - |
| 🔄 自动获取 | 需要登录态的页面 | 每次运行时自动获取 | ✅ 是 |
| ✍️ 手动配置 | 使用固定 Cookie | 手动输入 | ❌ 否 |

### 自动获取模式详解

#### 配置项说明

**账号预设**
- UAT测试账号 (110000233)
- 生产测试账号 (3546793358919882)
- 自定义UID...

**UID（必需）**
- 用户的唯一标识符
- 必须是数字格式
- 例如：110000233

**环境（必需）**
- **生产环境** - 从 melloi.bilibili.co 获取
- **UAT环境** - 从 hassan.bilibili.co 获取

#### 工作流程

```
运行测试
    ↓
检测到 autoCookie 配置
    ↓
调用内部 Cookie API
    ↓
获取最新的 SESSDATA、bili_jct
    ↓
转换为 Playwright Cookie 格式
    ↓
注入到测试页面
    ↓
执行测试 ✅
```

## 🎯 使用场景

### 场景1：对比登录/未登录性能

```javascript
// 测试用例1：未登录
名称: B站首页 - 未登录
登录模式: 🚫 不登录
→ 运行测试

// 测试用例2：已登录
名称: B站首页 - 已登录
登录模式: 🔄 自动获取
UID: 110000233
环境: UAT环境
→ 运行测试

// 对比两次测试结果
```

### 场景2：测试不同账号的体验

```javascript
// 测试用例1：普通用户
登录模式: 🔄 自动获取
UID: 普通用户UID
环境: 生产环境
→ 运行

// 测试用例2：VIP用户
登录模式: 🔄 自动获取
UID: VIP用户UID
环境: 生产环境
→ 运行

// 对比不同用户等级的性能差异
```

### 场景3：UAT 环境测试

```javascript
// UAT 环境新功能测试
登录模式: 🔄 自动获取
UID: 110000233
环境: UAT环境
→ 每次测试都使用最新的 UAT Cookie
```

### 场景4：长期性能监控

```javascript
// 设置定时任务每天运行
登录模式: 🔄 自动获取
UID: 监控账号UID
环境: 生产环境

// 优势：
// ✅ Cookie 永不过期（自动刷新）
// ✅ 无需人工干预
// ✅ 数据准确可靠
```

## 💡 最佳实践

### 实践1：使用预设账号

```
✅ 推荐：选择预设账号
→ 快速，不易出错

❌ 不推荐：每次手动输入 UID
→ 慢，容易输错
```

### 实践2：环境与 URL 匹配

```
✅ 正确：
UAT 页面 (uat-www.bilibili.co) → UAT环境
生产页面 (www.bilibili.com) → 生产环境

❌ 错误：
UAT 页面 → 生产环境 Cookie ❌ 登录失败
生产页面 → UAT Cookie ❌ 登录失败
```

### 实践3：配合测试标记使用

```
测试用例: B站视频页
登录模式: 🔄 自动获取
UID: 110000233
环境: UAT环境

运行1: 标记 "优化前"
运行2: 标记 "优化后"
→ 对比同一账号优化前后的性能
```

### 实践4：避免混用模式

```
❌ 不推荐：
测试用例A: 自动获取
测试用例B: 手动配置
测试用例C: 自动获取
→ 难以管理，容易混淆

✅ 推荐：
统一使用自动获取模式
→ 简洁，易维护
```

## 🔍 调试和日志

### 查看自动获取日志

运行测试时，任务输出会显示详细日志：

```
[系统] 任务开始执行: 测试用例名称
[系统] Runner: Runtime
[Cookie] 🔄 自动获取Cookie: UID=110000233, 环境=uat
[Cookie] ✅ Cookie获取成功: UID=110000233
```

### 失败时的日志

```
[Cookie] 🔄 自动获取Cookie: UID=110000233, 环境=uat
[Cookie] ❌ Cookie获取失败: UAT Cookie获取失败: Network error
```

### 常见问题排查

**问题1：Cookie获取失败**

```
原因：
- 网络问题（无法访问内部 API）
- UID 不存在
- 环境选择错误

解决：
- 检查网络连接（VPN/内网）
- 验证 UID 是否正确
- 确认环境选择匹配页面 URL
```

**问题2：测试仍然失败**

```
原因：
- Cookie 获取成功，但页面需要其他权限
- 测试配置有其他问题

调试：
1. 查看任务输出，确认 Cookie 获取成功
2. 检查测试 URL 是否正确
3. 查看 Benchmark SDK 错误信息
```

## 📊 技术实现

### 前端配置保存

```javascript
// 保存到 testCase 配置
advancedConfig: {
    autoCookie: {
        uid: 110000233,    // 数字类型
        env: 'uat'         // 'uat' 或 'prod'
    }
}
```

### 后端自动处理

```typescript
// server/index.ts 中的处理流程

async function processAutoCookies(config, taskId) {
    // 1. 遍历所有 testCases
    for (const testCase of testCases) {
        if (testCase.advancedConfig?.autoCookie) {
            const { uid, env } = testCase.advancedConfig.autoCookie;

            // 2. 调用 Cookie API 获取最新 Cookie
            const cookieString = await fetchCookie(uid, env);

            // 3. 替换 autoCookie 为实际的 cookie
            delete testCase.advancedConfig.autoCookie;
            testCase.advancedConfig.cookie = cookieString;
        }
    }

    // 4. 生成配置文件并执行测试
}
```

### Cookie API 调用

**UAT 环境：**
```
POST http://hassan.bilibili.co/ep/admin/hassan/v2/uat/account/cookie/query
Body: { "mid": 110000233 }
```

**生产环境：**
```
GET http://melloi.bilibili.co/ep/admin/melloi/v3/out/prod/account/token?mid=3546793358919882
```

### Playwright Cookie 格式转换

```typescript
// 字符串格式
"SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz"

// 自动转换为 Playwright 格式
[
    { name: "SESSDATA", value: "xxx", domain: ".bilibili.com", path: "/" },
    { name: "bili_jct", value: "yyy", domain: ".bilibili.com", path: "/" },
    { name: "DedeUserID", value: "zzz", domain: ".bilibili.com", path: "/" }
]
```

## 🔗 相关功能

### 配合其他功能使用

**1. 测试标记**
```
自动 Cookie + 测试标记
→ 对比同一账号不同版本的性能
```

**2. 并行执行**
```
多个测试用例使用自动 Cookie
→ 并行运行，每个都自动获取最新 Cookie
```

**3. Cookie 验证**
```
自动获取后自动验证
→ 确保 Cookie 有效
```

## ⚠️ 注意事项

### 1. **网络要求**
- 需要能够访问内部 Cookie API
- UAT: hassan.bilibili.co
- Prod: melloi.bilibili.co

### 2. **UID 格式**
- 必须是有效的数字
- UAT 和生产环境的 UID 不同

### 3. **环境匹配**
- UAT Cookie 只能用于 UAT 页面
- 生产 Cookie 只能用于生产页面

### 4. **权限要求**
- 可能需要内部系统权限
- 无权限时会返回错误

### 5. **执行时机**
- Cookie 在测试启动前获取
- 每次运行都会重新获取
- 不会缓存 Cookie

## 📚 文档索引

- [Cookie Playwright 格式修复](COOKIE_PLAYWRIGHT_FORMAT_FIX.md)
- [Cookie 自动获取功能](COOKIE_AUTO_FETCH.md)
- [Cookie 验证功能](COOKIE_VALIDATION_GUIDE.md)
- [Cookie 快速参考](COOKIE_QUICK_REFERENCE.md)

## 🎉 总结

自动 Cookie 刷新功能让性能测试更加智能和可靠：

### 之前 ❌
```
1. 手动获取 Cookie
2. 复制粘贴到配置
3. Cookie 过期
4. 测试失败
5. 重新获取 Cookie
6. 重复步骤...
```

### 现在 ✅
```
1. 配置 UID 和环境（一次）
2. 运行测试
3. 系统自动获取最新 Cookie
4. 测试成功
5. 下次运行，自动刷新 Cookie
6. 永远有效！
```

**关键优势：**
- ✅ 配置一次，永久使用
- ✅ 无需担心 Cookie 过期
- ✅ 多环境、多账号灵活切换
- ✅ 适合长期性能监控
- ✅ 完全自动化，零维护

---

**功能版本**: v1.0
**发布日期**: 2025-11-20
**文档状态**: ✅ 完整
