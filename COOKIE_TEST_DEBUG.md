# Cookie配置后测试失败问题诊断

## 🐛 问题现象

```
[TaskManager] 🚪 进程退出事件触发: [测试] 🎬 示例2: B站视频页 - Runtime性能监控, 退出码: 1
[TaskManager] ❌ 任务失败: [测试] 🎬 示例2: B站视频页 - Runtime性能监控 (退出码: 1)
```

测试在配置Cookie后立即失败，退出码为1。

## 🔍 可能的原因

### 1. **Cookie格式不正确**

Benchmark SDK支持以下Cookie格式：

#### ✅ 正确格式1: 字符串格式
```javascript
"SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz"
```

#### ✅ 正确格式2: JSON对象格式
```javascript
{
  "SESSDATA": "xxx",
  "bili_jct": "yyy",
  "DedeUserID": "zzz"
}
```

#### ❌ 错误格式: JSON字符串（双重序列化）
```javascript
"{\"SESSDATA\":\"xxx\",\"bili_jct\":\"yyy\"}"  // 不要这样！
```

### 2. **Cookie值包含特殊字符**

Cookie值中的特殊字符可能导致解析失败：
- 不正确的引号
- 换行符
- 未转义的字符

### 3. **Cookie字段缺失**

B站登录需要以下关键字段：
- `SESSDATA` - 必需
- `bili_jct` - 必需（CSRF token）
- `DedeUserID` - 推荐（用户ID）

### 4. **Benchmark SDK配置问题**

配置传递给SDK时可能出现问题。

## 🛠️ 诊断步骤

### 步骤1: 检查自动获取的Cookie格式

在前端点击"🔄 自动获取"后，检查填充到文本框的内容：

**正确示例**:
```
SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=ec61384dc05b4ca1df81f26f79f9b25a; DedeUserID=110000233; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc
```

**错误示例**（如果看到这样的）:
```json
{
  "SESSDATA": "...",
  ...
}
```
如果看到JSON格式，说明选择了"JSON对象格式"，这也是支持的，但确保JSON格式正确。

### 步骤2: 手动测试Cookie

创建一个最简单的测试配置：

1. **使用字符串格式Cookie**
```
SESSDATA=test; bili_jct=test; DedeUserID=110000233
```

2. **创建最简单的测试用例**
   - 名称: Cookie测试
   - URL: https://www.bilibili.com
   - 测试类型: Initialization
   - Runner配置: 默认
   - Cookie: 上面的字符串

3. **运行测试**

如果这个简单配置能运行（即使Cookie无效），说明格式是对的。

### 步骤3: 查看生成的配置文件

虽然配置文件会被自动删除，但我们可以临时阻止删除来查看：

修改 `server/index.ts:445`，临时注释掉删除代码：
```typescript
// 临时禁用自动删除，用于调试
// await fs.unlink(tempConfigPath);
console.log('[DEBUG] 配置文件保留在:', tempConfigPath);
```

然后运行测试，查看生成的配置文件内容。

### 步骤4: 查看详细错误日志

测试失败时，前端应该会显示具体的错误信息。查看：
1. **浏览器Console** (F12)
2. **任务输出窗口**
3. **服务器控制台**

## 🔧 已知问题和解决方案

### 问题1: JSON格式Cookie未正确解析

**症状**: 选择JSON格式后测试失败

**原因**: Benchmark SDK可能需要字符串格式

**解决**: 使用字符串格式
```javascript
// 在自动获取Cookie时，选择"字符串格式"而不是"JSON对象格式"
```

### 问题2: Cookie字符串包含换行符

**症状**: 从其他地方复制的Cookie包含换行

**原因**: 文本框允许多行输入，但Cookie应该是单行

**解决**: 确保Cookie是单行
```javascript
// ✅ 正确
SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz

// ❌ 错误（包含换行）
SESSDATA=xxx;
bili_jct=yyy;
DedeUserID=zzz
```

### 问题3: Cookie值中包含分号

**症状**: Cookie值本身包含分号导致解析错误

**原因**: 分号是Cookie分隔符

**解决**: 使用JSON格式
```json
{
  "SESSDATA": "value;with;semicolons",
  "bili_jct": "normal_value"
}
```

### 问题4: 自动获取的Cookie格式错误

**检查后端日志**:
```
[Cookie] 成功构建Cookie: {
  cookiePreview: 'SESSDATA=09cd98b2,1765108117,0fe42161; bili_jct=...'
}
```

如果Cookie预览看起来正常，说明后端生成的Cookie是正确的。

## 💡 推荐配置流程

### 方法1: 使用自动获取（推荐）

1. 点击Cookie区域的 **"🔄 自动获取"**
2. 选择 **"UAT测试账号"** 或输入UID
3. 环境选择 **"UAT环境"** 或 **"生产环境"**
4. **Cookie格式选择 "字符串格式"** ⭐
5. 点击 **"获取并应用"**
6. **检查填充的Cookie**（应该是一行字符串）
7. 运行测试

### 方法2: 手动配置

1. 从浏览器获取Cookie
   - 打开 DevTools (F12)
   - Application → Cookies → bilibili.com
   - 复制 SESSDATA, bili_jct, DedeUserID

2. 按以下格式填入：
```
SESSDATA=你的值; bili_jct=你的值; DedeUserID=你的值
```

3. **确保是一行**，没有换行
4. 运行测试

## 🧪 测试Cookie有效性

### 快速验证Cookie

在浏览器Console中运行：
```javascript
// 复制你的Cookie字符串
const cookieStr = "SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz";

// 解析Cookie
const cookies = {};
cookieStr.split(';').forEach(item => {
    const [key, value] = item.trim().split('=');
    cookies[key] = value;
});

console.log('解析后的Cookie:', cookies);
console.log('必需字段检查:');
console.log('  SESSDATA:', !!cookies.SESSDATA);
console.log('  bili_jct:', !!cookies.bili_jct);
console.log('  DedeUserID:', !!cookies.DedeUserID);
```

### 验证Cookie是否有效

访问需要登录的B站页面，看是否能正常显示用户信息。

## 🔬 深度调试

### 启用配置文件保留

临时修改 `server/index.ts`，不删除配置文件：

```typescript
// 在 task.process.on('close', async (code) => { 中
// 注释掉删除逻辑
/*
try {
    await fs.unlink(tempConfigPath);
    console.log(`[TaskManager] 🗑️  已删除配置文件: ${tempConfigPath}`);
} catch (e) {
    console.error(`[TaskManager] ⚠️  删除配置文件失败: ${tempConfigPath}`, e);
}
*/
console.log(`[DEBUG] 配置文件路径: ${tempConfigPath}`);
```

重启服务器，运行测试，查看生成的配置文件：
```bash
cat benchmark.config.task_*.mts
```

检查Cookie配置部分是否正确。

### 直接运行Benchmark命令

```bash
# 使用保留的配置文件直接运行
npx @bilibili-player/benchmark --config benchmark.config.task_xxx.mts
```

查看详细的错误信息。

## 📋 问题报告清单

如果问题仍未解决，请提供以下信息：

- [ ] Cookie获取方式（自动获取/手动配置）
- [ ] 选择的Cookie格式（字符串/JSON）
- [ ] Cookie字符串示例（脱敏处理）
- [ ] 服务器控制台完整日志
- [ ] 浏览器Console错误信息
- [ ] 测试用例配置截图
- [ ] 生成的配置文件内容（如果保留了）

## 🎯 常见Cookie格式对比

### 格式1: 浏览器标准格式（推荐）
```
SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz; buvid3=aaa
```
- **优点**: 浏览器原生格式，兼容性最好
- **缺点**: 值中不能包含分号
- **适用**: 99%的场景

### 格式2: JSON对象格式
```json
{
  "SESSDATA": "xxx",
  "bili_jct": "yyy",
  "DedeUserID": "zzz",
  "buvid3": "aaa"
}
```
- **优点**: 结构化，值可以包含分号
- **缺点**: 需要SDK支持
- **适用**: 特殊场景

### 格式3: JSON字符串（不推荐）
```
"{\"SESSDATA\":\"xxx\",\"bili_jct\":\"yyy\"}"
```
- **问题**: 双重序列化，SDK无法正确解析
- **不要使用**

## 📚 相关文档

- [Cookie自动获取指南](COOKIE_AUTO_FETCH.md)
- [Cookie修复文档](COOKIE_FIX.md)
- [Benchmark SDK文档](https://www.npmjs.com/package/@bilibili-player/benchmark)

---

**更新时间**: 2025-11-20
**问题状态**: 调查中
**优先级**: 高
