# Cookie获取问题调试指南

## 🐛 问题现象

获取到的Cookie显示 `undefined`:
```
SESSDATA=undefined; bili_jct=undefined; DedeUserID=110000233; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc
```

## 🔍 可能的原因

### 1. **API响应数据结构不匹配**

#### UAT环境预期结构
```json
{
  "data": {
    "session": "xxx",
    "csrf": "yyy"
  }
}
```

#### 生产环境预期结构
```json
{
  "code": 0,
  "data": {
    "session": "xxx",
    "csrf": "yyy",
    "mid": "uid"
  }
}
```

### 2. **网络问题**
- 无法访问内部API（melloi.bilibili.co 或 hassan.bilibili.co）
- 需要VPN或内网环境

### 3. **权限问题**
- 账号无权访问Cookie获取接口
- UID不存在或无效

## 🛠️ 调试步骤

### 步骤1: 查看服务器日志

服务器现在会输出详细的调试日志：

```bash
# 查看服务器日志
# 你应该能看到类似这样的输出：

[Cookie] UAT API 原始响应: {
  "code": 0,
  "data": {
    "session": "09cd98b2,1765108117,0fe42161",
    "csrf": "ec61384dc05b4ca1df81f26f79f9b25a"
  }
}

[Cookie] 成功构建Cookie: {
  env: 'uat',
  uid: 110000233,
  hasSession: true,
  hasCsrf: true,
  cookiePreview: 'SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=ec61384dc05b4ca1df81f26f79f9b25a; ...'
}
```

### 步骤2: 手动测试API

#### 测试UAT环境
```bash
curl -X POST http://localhost:3000/api/cookie/fetch \
  -H 'Content-Type: application/json' \
  -d '{"uid": 110000233, "env": "uat"}'
```

#### 测试生产环境
```bash
curl -X POST http://localhost:3000/api/cookie/fetch \
  -H 'Content-Type: application/json' \
  -d '{"uid": 3546793358919882, "env": "prod"}'
```

#### 预期响应
```json
{
  "success": true,
  "uid": 110000233,
  "env": "uat",
  "cookieString": "SESSDATA=xxx; bili_jct=yyy; ...",
  "cookieJson": {
    "SESSDATA": "xxx",
    "bili_jct": "yyy",
    "DedeUserID": "110000233",
    "buvid3": "..."
  },
  "tokenData": {
    "session": "xxx",
    "csrf": "yyy",
    "mid": 110000233
  }
}
```

### 步骤3: 检查实际API响应

直接测试上游API：

#### UAT环境
```bash
curl -X POST http://hassan.bilibili.co/ep/admin/hassan/v2/uat/account/cookie/query \
  -H 'Content-Type: application/json' \
  -d '{"mid": 110000233}'
```

#### 生产环境
```bash
curl -X GET 'http://melloi.bilibili.co/ep/admin/melloi/v3/out/prod/account/token?mid=3546793358919882' \
  -H 'Content-Type: application/json'
```

### 步骤4: 检查浏览器Console

在前端点击"🔄 自动获取"后，打开浏览器Console（F12），查看：

```javascript
// 成功的日志
[Cookie] 获取成功: {
  success: true,
  cookieString: "SESSDATA=xxx; bili_jct=yyy; ...",
  cookieJson: {...}
}

// 失败的日志
[Cookie] 获取失败: Error: ...
```

## 🔧 修复方案

### 方案1: 检查API响应格式

如果上游API返回的数据结构不同，修改后端代码 [server/index.ts:1789-1794](server/index.ts#L1789-L1794):

```typescript
// 当前代码
tokenData = {
    session: result.data.session,  // 可能是 result.session
    csrf: result.data.csrf,        // 可能是 result.csrf
    mid: uid,
    expires: result.data.expires || null
};

// 如果API直接返回数据（没有data包装）
tokenData = {
    session: result.session,
    csrf: result.csrf,
    mid: uid,
    expires: result.expires || null
};
```

### 方案2: 添加字段映射

如果字段名不同，添加映射：

```typescript
// 例如：如果返回的是 SESSDATA 而不是 session
tokenData = {
    session: result.data.SESSDATA || result.data.session,
    csrf: result.data.bili_jct || result.data.csrf,
    mid: uid,
    expires: null
};
```

### 方案3: 使用Mock数据测试

如果无法访问内部API，临时使用Mock数据：

```typescript
// 在 server/index.ts 的 /api/cookie/fetch 接口中添加Mock模式

app.post('/api/cookie/fetch', async (req, res) => {
    const { uid, env = 'prod', mock = false } = req.body;

    // Mock模式（用于测试）
    if (mock) {
        const mockCookie = {
            success: true,
            uid: uid,
            env: env,
            cookieString: `SESSDATA=mock_session_${Date.now()}; bili_jct=mock_csrf_${Date.now()}; DedeUserID=${uid}; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc`,
            cookieJson: {
                SESSDATA: `mock_session_${Date.now()}`,
                bili_jct: `mock_csrf_${Date.now()}`,
                DedeUserID: String(uid),
                buvid3: 'FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc'
            },
            tokenData: {
                session: `mock_session_${Date.now()}`,
                csrf: `mock_csrf_${Date.now()}`,
                mid: uid
            }
        };
        return res.json(mockCookie);
    }

    // ... 原有代码
});
```

## 📊 调试Checklist

- [ ] 服务器是否在运行？(`pgrep -f tsx`)
- [ ] 服务器日志显示了什么？
- [ ] 手动curl测试返回什么？
- [ ] 上游API是否可访问？
- [ ] 浏览器Console有什么错误？
- [ ] 返回的数据结构是否正确？
- [ ] session和csrf字段是否存在？

## 💡 常见错误及解决

### 错误1: `SESSDATA=undefined`

**原因**: API响应中session字段不存在或字段名不匹配

**解决**:
1. 查看服务器日志中的"原始响应"
2. 确认字段名（可能是`SESSDATA`而不是`session`）
3. 修改代码中的字段映射

### 错误2: `HTTP 403/401`

**原因**: 无权访问Cookie获取接口

**解决**:
1. 确认在内网或VPN环境
2. 检查账号权限
3. 联系系统管理员

### 错误3: `HTTP 500`

**原因**: 上游API错误

**解决**:
1. 查看上游API返回的错误信息
2. 确认UID有效性
3. 检查环境选择是否正确

### 错误4: Cookie获取成功但无法使用

**原因**: Cookie格式不正确或已过期

**解决**:
1. 检查Cookie字符串格式
2. 重新获取新的Cookie
3. 确认使用正确的环境Cookie

## 🎯 完整测试流程

```bash
# 1. 测试本地API
curl -X POST http://localhost:3000/api/cookie/fetch \
  -H 'Content-Type: application/json' \
  -d '{"uid": 110000233, "env": "uat"}'

# 2. 查看响应是否包含完整的Cookie

# 3. 在前端测试
# - 打开浏览器到 http://localhost:3000
# - 添加或编辑测试用例
# - 点击Cookie区域的"🔄 自动获取"
# - 选择预设账号或输入UID
# - 点击"获取并应用"
# - 检查Cookie文本框是否正确填充

# 4. 查看服务器控制台输出的调试日志
```

## 📝 需要提供的调试信息

如果问题仍未解决，请提供以下信息：

1. **服务器日志输出**（包含调试信息）
2. **curl测试结果**
3. **浏览器Console输出**
4. **上游API直接访问结果**（如果可以）
5. **具体的UID和环境**

## 🚀 快速修复

如果急需使用，可以手动复制Cookie：

1. 访问 http://hassan.bilibili.co 或 http://melloi.bilibili.co
2. 打开浏览器开发者工具（F12）
3. Application → Cookies
4. 复制 `SESSDATA`, `bili_jct`, `DedeUserID` 的值
5. 手动填入测试用例的Cookie配置

格式：
```
SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc
```

---

**注**: 确保服务器使用 `tsx --watch` 运行，代码修改会自动重载。
