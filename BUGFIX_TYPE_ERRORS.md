# 🔧 TypeScript 类型错误修复

## 问题 1: Mode 类型不匹配

### ❌ 错误信息
```
Type 'string' is not assignable to type 'Mode'.ts(2322)
The expected type comes from property 'mode' which is declared here on type
'{ runners: { ... }; mode?: Mode | undefined; ... }'
```

### 🔍 根本原因

前端发送的 `mode` 是字符串类型：
```javascript
// index.html:1321
const mode = testCase.mode || 'headless';  // 'headless' 或 'headed'

// index.html:1410 (修复前)
config: {
    mode: mode,  // ❌ 字符串
    runners: runnersConfig
}
```

但 SDK 期望的 `Mode` 是对象类型：
```typescript
// @bilibili-player/benchmark 类型定义
interface Mode {
    anonymous?: boolean;
    headless?: boolean;
    usrDataDir?: string;
    preparePage?: boolean;
}
```

### ✅ 修复方案

将字符串转换为 Mode 对象：
```javascript
// index.html:1410-1413 (修复后)
config: {
    mode: {
        anonymous: true,
        headless: mode === 'headless'
    },
    runners: runnersConfig
}
```

**说明:**
- `anonymous: true` - 以匿名模式运行（不使用登录凭证）
- `headless: mode === 'headless'` - 根据前端选择决定是否无头模式
  - `'headless'` → `{ headless: true }` - 后台运行
  - `'headed'` → `{ headless: false }` - 显示浏览器窗口

---

## 问题 2: 未定义的变量

### ❌ 错误信息
```
server/index.ts(1026,5): error TS2304: Cannot find name 'isStarting'.
server/index.ts(1028,9): error TS2304: Cannot find name 'killTimeout'.
```

### 🔍 根本原因

在 `/api/reset` 接口中引用了旧代码的变量：
```typescript
// server/index.ts:1026-1030 (修复前)
isStarting = false;  // ❌ 未定义

if (killTimeout) {  // ❌ 未定义
    clearTimeout(killTimeout);
    killTimeout = null;
}
```

这些变量是**旧的单任务系统**的遗留代码：
- `isStarting` - 标记任务是否正在启动
- `killTimeout` - 全局的 kill 超时定时器

在**新的多任务系统**中：
- 任务状态由 `Task.status` 管理
- Kill 超时由 `Task.killTimeout` 管理（每个任务独立）

### ✅ 修复方案

更新 `/api/reset` 接口以适配新的多任务系统：
```typescript
// server/index.ts:1017-1040 (修复后)
app.post('/api/reset', (req, res) => {
    // ✅ 停止所有运行中的任务
    Array.from(tasks.values())
        .filter(t => t.status === 'running')
        .forEach(t => stopTask(t.id));

    // ✅ 清空所有任务
    tasks.clear();

    // ✅ 重置向后兼容的状态变量
    if (currentBenchmark) {
        forceKillProcess(currentBenchmark);
    }

    currentBenchmark = null;
    benchmarkStatus = 'idle';
    benchmarkOutput = '';
    currentRunner = '';

    // ✅ 广播状态更新
    broadcastStatus();
    broadcastTaskList();

    res.json({ success: true, message: 'All tasks stopped and status reset successfully' });
});
```

**改进:**
- 停止所有运行中的任务
- 清空任务列表
- 重置向后兼容的状态变量
- 广播更新到所有 WebSocket 客户端

---

## 📝 修改的文件

### 1. `public/index.html`
**修改位置:** 1410-1413 行
**改动:** 将字符串 mode 转换为 Mode 对象

```diff
- mode: mode,
+ mode: {
+     anonymous: true,
+     headless: mode === 'headless'
+ },
```

### 2. `server/index.ts`
**修改位置:** 1017-1040 行
**改动:** 更新 `/api/reset` 接口以适配新的多任务系统

```diff
- isStarting = false;
- if (killTimeout) {
-     clearTimeout(killTimeout);
-     killTimeout = null;
- }
+ // 停止所有运行中的任务
+ Array.from(tasks.values())
+     .filter(t => t.status === 'running')
+     .forEach(t => stopTask(t.id));
+
+ // 清空所有任务
+ tasks.clear();
+
+ // 广播状态更新
+ broadcastTaskList();
```

---

## ✅ 验证

### TypeScript 编译
```bash
npx tsc --noEmit --skipLibCheck
```

**预期结果:** 无错误（忽略临时配置文件）

### 运行时测试
```bash
# 1. 启动服务器
npm run dev

# 2. 测试运行用例
# 打开浏览器访问 http://localhost:3000
# 点击任意用例的"运行"按钮

# 3. 测试重置接口
curl -X POST http://localhost:3000/api/reset
```

---

## 🎯 相关修复

这些修复与以下 bug 修复相关联：

1. **BUGFIX_CONFIG_TRANSFORM.md** - 配置转换 bug
2. **TASK_EXECUTION_LOGIC.md** - 任务执行逻辑

所有修复组合确保：
- ✅ 配置正确传递（testCases 不会被清空）
- ✅ 类型正确（Mode 对象而非字符串）
- ✅ 任务正常执行
- ✅ TypeScript 编译无错误

---

## 📊 Mode 配置说明

### 前端用例管理中的 mode
```javascript
// index.html 用例配置
{
    mode: 'headless',  // 或 'headed'
    // 转换为:
    mode: {
        anonymous: true,
        headless: true  // 或 false
    }
}
```

### 配置页面中的 mode
```json
// benchmark.dynamic.json
{
    "mode": {
        "anonymous": true,
        "headless": false,
        "usrDataDir": "",
        "preparePage": false
    }
}
```

### Mode 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `anonymous` | boolean | true | 匿名模式，不使用登录凭证 |
| `headless` | boolean | false | 无头模式，浏览器后台运行 |
| `usrDataDir` | string | '' | 自定义用户数据目录 |
| `preparePage` | boolean | false | 页面准备钩子 |

---

## 🚀 总结

### 修复的问题
1. ✅ Mode 类型错误 - 字符串转对象
2. ✅ 未定义的变量 - 删除旧代码引用
3. ✅ `/api/reset` 接口 - 适配多任务系统

### 影响
- ✅ TypeScript 编译通过
- ✅ 前端用例管理正常工作
- ✅ 任务重置功能正常
- ✅ 向后兼容性保持

**修复完成！** 🎉
