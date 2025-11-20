# Cookie获取undefined问题 - 已修复 ✅

## 🐛 问题根因

**错误信息**:
```
json: cannot unmarshal string into Go struct field .mid of type int64
```

**根本原因**: UAT API（hassan.bilibili.co）要求`mid`字段必须是**数字类型**，但前端发送的是**字符串类型**。

## ✅ 修复方案

### 后端修复 (server/index.ts)

#### 修改前
```typescript
app.post('/api/cookie/fetch', async (req, res) => {
    const { uid, env = 'prod' } = req.body;

    // 直接使用uid（可能是字符串）
    const response = await fetch(cookieEnvConfig.uatUrl, {
        method: 'POST',
        body: JSON.stringify({ mid: uid })  // ❌ uid可能是字符串
    });
});
```

#### 修改后
```typescript
app.post('/api/cookie/fetch', async (req, res) => {
    const { uid, env = 'prod' } = req.body;

    // ✅ 确保UID是数字类型
    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

    if (isNaN(numericUid)) {
        return res.status(400).json({ error: 'Invalid UID: must be a number' });
    }

    const response = await fetch(cookieEnvConfig.uatUrl, {
        method: 'POST',
        body: JSON.stringify({ mid: numericUid })  // ✅ 数字类型
    });
});
```

### 前端修复 (public/index.html)

#### 修改前
```javascript
async function fetchAndApplyCookie() {
    const uid = document.getElementById('cookie-uid').value.trim();

    // ❌ uid是字符串
    const response = await fetch('/api/cookie/fetch', {
        body: JSON.stringify({ uid, env })
    });
}
```

#### 修改后
```javascript
async function fetchAndApplyCookie() {
    const uidInput = document.getElementById('cookie-uid').value.trim();

    // ✅ 转换为数字类型
    const uid = parseInt(uidInput, 10);
    if (isNaN(uid)) {
        showToast('UID必须是数字', 'error');
        return;
    }

    const response = await fetch('/api/cookie/fetch', {
        body: JSON.stringify({ uid, env })  // ✅ 数字类型
    });
}
```

## 📝 修改文件清单

### 1. server/index.ts
- 第1767-1772行: 添加UID类型转换和验证
- 第1779行: 使用`numericUid`而不是`uid`
- 第1798行: 使用`numericUid`
- 第1853行: 使用`numericUid`
- 第1861行: 使用`numericUid`

### 2. public/index.html
- 第2613-2627行: 添加UID类型转换和验证
- 第2635行: 使用数字类型的`uid`

## 🧪 测试验证

### 测试1: UAT环境
```bash
curl -X POST http://localhost:3000/api/cookie/fetch \
  -H 'Content-Type: application/json' \
  -d '{"uid": 110000233, "env": "uat"}'
```

**预期响应**:
```json
{
  "success": true,
  "uid": 110000233,
  "env": "uat",
  "cookieString": "SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=ec61384dc05b4ca1df81f26f79f9b25a; DedeUserID=110000233; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc",
  "cookieJson": {
    "SESSDATA": "09cd98b2,1765108117,0fe42161",
    "bili_jct": "ec61384dc05b4ca1df81f26f79f9b25a",
    "DedeUserID": "110000233",
    "buvid3": "FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc"
  }
}
```

### 测试2: 生产环境
```bash
curl -X POST http://localhost:3000/api/cookie/fetch \
  -H 'Content-Type: application/json' \
  -d '{"uid": 3546793358919882, "env": "prod"}'
```

### 测试3: 前端UI测试
1. 打开浏览器到 http://localhost:3000
2. 添加/编辑测试用例
3. 点击Cookie区域的 "🔄 自动获取"
4. 选择 "UAT测试账号 (110000233)"
5. 点击 "获取并应用"
6. ✅ Cookie文本框应正确填充

## 📊 服务器日志输出

修复后，你应该看到类似这样的日志：

```
[Cookie] UAT API 原始响应: {
  "code": 0,
  "data": {
    "session": "09cd98b2,1765108117,0fe42161",
    "csrf": "ec61384dc05b4ca1df81f26f79f9b25a",
    "expires": null
  }
}

[Cookie] 成功构建Cookie: {
  env: 'uat',
  uid: 110000233,
  hasSession: true,
  hasCsrf: true,
  cookiePreview: 'SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=ec61384dc05b4ca1df81f26f79f9b25a; DedeUserID=...'
}
```

## 🔍 问题对比

### 修复前
```
[Cookie] UAT API 原始响应: {
  "code": -400,
  "message": "json: cannot unmarshal string into Go struct field .mid of type int64",
  "ttl": 1
}
❌ SESSDATA=undefined; bili_jct=undefined; ...
```

### 修复后
```
[Cookie] UAT API 原始响应: {
  "code": 0,
  "data": {
    "session": "...",
    "csrf": "..."
  }
}
✅ SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=ec61384dc05b4ca1df81f26f79f9b25a; ...
```

## 💡 关键要点

1. **Go后端类型严格**: UAT API是Go语言编写的，对JSON类型要求严格
2. **JavaScript隐式类型**: 前端输入框的值默认是字符串，需要显式转换
3. **JSON序列化**: `JSON.stringify({ mid: 123 })` → `{"mid":123}` (数字)
4. **JSON序列化**: `JSON.stringify({ mid: "123" })` → `{"mid":"123"}` (字符串)

## 🎯 最佳实践

### API设计建议
```typescript
// 后端：始终验证和转换类型
const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
if (isNaN(numericValue)) {
    return res.status(400).json({ error: 'Invalid input' });
}
```

### 前端建议
```javascript
// 前端：发送数字类型字段时显式转换
const uid = parseInt(uidInput, 10);
if (isNaN(uid)) {
    showToast('请输入有效的数字', 'error');
    return;
}
```

## 🚀 部署步骤

1. **确认修改已保存**
   ```bash
   git diff server/index.ts
   git diff public/index.html
   ```

2. **重启服务器**（如果使用tsx --watch会自动重载）
   ```bash
   npm run dev
   ```

3. **清除浏览器缓存**（Ctrl+Shift+R / Cmd+Shift+R）

4. **测试功能**
   - 使用curl测试API
   - 使用前端UI测试

## ✅ 验收标准

- [ ] UAT环境Cookie获取成功
- [ ] 生产环境Cookie获取成功
- [ ] Cookie字符串不包含`undefined`
- [ ] 服务器日志显示正确的API响应
- [ ] 前端UI能正确填充Cookie

## 📚 相关文档

- [Cookie自动获取功能指南](COOKIE_AUTO_FETCH.md)
- [Cookie调试指南](COOKIE_DEBUG_GUIDE.md)

---

**修复完成时间**: 2025-11-20
**问题类型**: 数据类型不匹配
**严重程度**: 高（功能完全不可用）
**修复状态**: ✅ 已完成
