# Implementation Summary: Test Case & Execution State Decoupling + Per-URL Configuration

## 概述

本次实现完成了两个主要功能：

1. **测试用例与执行状态解耦** - 创建了独立的执行记录存储系统
2. **每个URL的独立配置** - 支持在同一测试用例中为不同URL设置不同的配置项

---

## ✅ 已完成的后端实现

### 1. 数据模型设计 ([server/testcase-storage.ts](server/testcase-storage.ts))

#### 新增接口

**TestCase（测试用例）**:
```typescript
interface TestCase {
  id: string;                    // 测试用例ID
  name: string;
  runners: RunnerConfig;
  urlsWithDesc: UrlConfig[];     // 支持每个URL的独立配置
  mode: string;
  repeatCount: number;
  anonymous: boolean;
  cpuThrottling: number;
  description: string;
  tags: string[];
  advancedConfig?: AdvancedConfig;  // 默认配置
  createdAt: string;
  updatedAt: string;
  executionHistory?: string[];   // 🆕 执行记录ID数组
}
```

**UrlConfig（URL配置）**:
```typescript
interface UrlConfig {
  url: string;
  description: string;
  config?: PerUrlConfig;  // 🆕 每个URL的独立配置，会覆盖测试用例级别的默认配置
}
```

**PerUrlConfig（单个URL的配置项）**:
```typescript
interface PerUrlConfig {
  cookie?: string | Record<string, any>;
  extraHTTPHeaders?: Record<string, string>;
  blockList?: string[];
  customCss?: string;
  deviceOptions?: [string, Record<string, any>];
  hooks?: { /* 生命周期钩子 */ };
  delayMs?: number;
}
```

**ExecutionRecord（执行记录）**:
```typescript
interface ExecutionRecord {
  id: string;
  testCaseId: string;  // 🆕 关联的测试用例ID
  name: string;
  runner: string;
  status: 'completed' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  perfcatId?: string;
  perfcatUrl?: string;
  perfcatChartUrl?: string;
  exitCode?: number;
}
```

### 2. 存储层实现 ([server/testcase-storage.ts](server/testcase-storage.ts))

#### 核心功能

- ✅ `loadTestCases()` - 从 `testcases.json` 加载测试用例
- ✅ `saveTestCases()` - 保存测试用例到文件
- ✅ `getAllTestCases()` - 获取所有测试用例
- ✅ `getTestCaseById(id)` - 根据ID获取测试用例
- ✅ `createTestCase(data)` - 创建新测试用例
- ✅ `updateTestCase(id, updates)` - 更新测试用例
- ✅ `deleteTestCase(id)` - 删除测试用例
- ✅ `addExecutionToHistory(testCaseId, executionRecordId)` - 添加执行记录到历史
- ✅ `getTestCasesByTags(tags)` - 按标签筛选
- ✅ `searchTestCases(query)` - 搜索测试用例

### 3. API端点实现 ([server/index.ts](server/index.ts))

#### 测试用例管理 API

```
GET    /api/testcases              - 获取所有测试用例（支持标签和搜索筛选）
GET    /api/testcases/:id          - 获取单个测试用例
POST   /api/testcases              - 创建测试用例
PUT    /api/testcases/:id          - 更新测试用例
DELETE /api/testcases/:id          - 删除测试用例
GET    /api/testcases/:id/executions - 获取测试用例的执行历史
```

#### 请求/响应示例

**创建测试用例 (POST /api/testcases)**:
```json
{
  "name": "性能测试 - 首页",
  "runners": {
    "Runtime": { "enabled": true, "durationMs": 60000, "delayMs": 10000 }
  },
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com",
      "description": "B站首页",
      "config": {
        "cookie": "DedeUserID=123456; ...",
        "extraHTTPHeaders": { "X-Custom": "value" }
      }
    },
    {
      "url": "https://www.bilibili.com/video/BV1xx411c7mD",
      "description": "视频页面",
      "config": {
        "cookie": "DedeUserID=654321; ...",
        "customCss": ".ad { display: none; }"
      }
    }
  ],
  "mode": "headless",
  "repeatCount": 3,
  "anonymous": false,
  "cpuThrottling": 1,
  "description": "测试首页和视频页性能",
  "tags": ["frontend", "performance"],
  "advancedConfig": {
    "delayMs": 5000,
    "cookie": "default_cookie=value"
  }
}
```

### 4. 执行历史关联 ([server/index.ts](server/index.ts))

#### 更新的接口

**Task**:
```typescript
interface Task {
  id: string;
  testCaseId?: string;  // 🆕 关联的测试用例ID
  name: string;
  runner: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  // ... 其他字段
}
```

**TestRecord**:
```typescript
interface TestRecord {
  id: string;
  testCaseId?: string;  // 🆕 关联的测试用例ID
  name: string;
  runner: string;
  // ... 其他字段
}
```

#### 关联流程

1. 前端调用 `POST /api/start` 时传入 `testCaseId`
2. `createTask()` 创建任务时保存 `testCaseId`
3. 任务完成时 `addTestRecord()` 保存测试记录，包含 `testCaseId`
4. `addTestRecord()` 自动调用 `TestCaseStorage.addExecutionToHistory()` 更新测试用例的执行历史

### 5. 每个URL的独立配置支持 ([server/index.ts](server/index.ts))

#### 配置合并逻辑 (generateTestCase 函数)

优先级规则：**per-URL config > global config > advancedConfig**

```typescript
// 示例：Cookie配置的优先级
const cookieData = tc.config?.cookie ?? tc.cookie ?? tc.advancedConfig?.cookie;

// 示例：extraHTTPHeaders配置的优先级
const extraHTTPHeaders = tc.config?.extraHTTPHeaders ?? tc.extraHTTPHeaders;

// 示例：hooks配置的优先级
const hooks = tc.config?.hooks ?? tc.hooks;
```

#### 支持的per-URL配置项

- ✅ `cookie` - Cookie字符串或对象
- ✅ `extraHTTPHeaders` - 自定义HTTP头
- ✅ `blockList` - 资源阻止列表
- ✅ `customCss` - 自定义CSS
- ✅ `deviceOptions` - 设备选项
- ✅ `hooks` - 生命周期钩子（beforePageLoad, onPageLoaded, onPageTesting, onPageCollecting, onPageUnload）
- ✅ `delayMs` - 页面加载延迟

---

## 📋 配置合并示例

### 示例：测试用例配置

```typescript
{
  name: "多URL测试",
  advancedConfig: {
    // 默认配置（应用于所有URL）
    cookie: "session=default",
    delayMs: 3000,
    extraHTTPHeaders: { "X-App": "BenchmarkTool" }
  },
  urlsWithDesc: [
    {
      url: "https://example.com/page1",
      description: "页面1",
      // 不覆盖任何配置，使用默认配置
    },
    {
      url: "https://example.com/page2",
      description: "页面2",
      config: {
        // 覆盖cookie，其他配置使用默认
        cookie: "session=page2_session",
        customCss: ".ad { display: none; }"
      }
    },
    {
      url: "https://example.com/page3",
      description: "页面3",
      config: {
        // 完全自定义配置
        cookie: "session=page3_session",
        delayMs: 5000,
        extraHTTPHeaders: { "X-Custom": "page3" },
        hooks: {
          onPageLoaded: "console.log('Page 3 loaded');"
        }
      }
    }
  ]
}
```

### 最终生成的配置

```typescript
// Page 1 - 使用默认配置
{
  target: "https://example.com/page1",
  cookie: "session=default",
  delayMs: 3000,
  extraHTTPHeaders: { "X-App": "BenchmarkTool" }
}

// Page 2 - Cookie被覆盖，添加了customCss
{
  target: "https://example.com/page2",
  cookie: "session=page2_session",  // 🔄 被覆盖
  delayMs: 3000,
  extraHTTPHeaders: { "X-App": "BenchmarkTool" },
  customCss: ".ad { display: none; }"  // ➕ 新增
}

// Page 3 - 完全自定义
{
  target: "https://example.com/page3",
  cookie: "session=page3_session",  // 🔄 被覆盖
  delayMs: 5000,  // 🔄 被覆盖
  extraHTTPHeaders: { "X-Custom": "page3" },  // 🔄 被覆盖
  hooks: { onPageLoaded: "..." }  // ➕ 新增
}
```

---

## 🔄 执行流程

### 1. 创建测试用例
```
Frontend → POST /api/testcases → TestCaseStorage.createTestCase()
                                ↓
                        testcases.json (持久化)
```

### 2. 执行测试
```
Frontend → POST /api/start {config, testCaseId}
           ↓
           createTask(name, runner, config, testCaseId)  // 创建Task，关联testCaseId
           ↓
           startTask(taskId)  // 启动任务
           ↓
           generateConfig()  // 生成benchmark配置
           ↓
           generateTestCase()  // 合并per-URL配置
           ↓
           执行benchmark
```

### 3. 保存执行记录
```
任务完成 → addTestRecord(record)
           ↓
           testRecords.push({...record, testCaseId})  // 保存到test-records.json
           ↓
           TestCaseStorage.addExecutionToHistory(testCaseId, recordId)  // 更新测试用例的执行历史
           ↓
           testcases.json 更新 (executionHistory数组)
```

### 4. 查询执行历史
```
Frontend → GET /api/testcases/:id/executions
           ↓
           获取TestCase.executionHistory
           ↓
           查找对应的TestRecord
           ↓
           返回执行历史列表
```

---

## ✅ 已完成的前端实现

### 1. 前端与后端存储同步
- ✅ 实现从后端加载测试用例 (`loadTestCasesFromBackend()`)
- ✅ 实现保存测试用例到后端 (`saveTestCaseToBackend()`)
- ✅ 迁移localStorage数据到后端 (`migrateLocalToBackend()`)
- ✅ 页面加载时自动同步后端数据
- ✅ 创建/更新/删除操作自动同步到后端

### 2. 每个URL的独立配置支持
- ✅ 支持在 `urlsWithDesc[].config` 中存储per-URL配置
- ✅ 运行测试时将per-URL配置传递给后端
- ✅ 后端自动合并per-URL配置和全局配置

### 3. 测试用例与执行历史关联
- ✅ 运行测试时发送 `testCaseId` 到后端
- ✅ 后端自动记录执行历史
- ✅ 可通过 `/api/testcases/:id/executions` 查询执行历史

### 4. Per-URL配置UI（新增！）
- ✅ 为每个URL添加可展开的"独立配置"面板
- ✅ 实现完整的per-URL配置编辑器
  - Cookie配置
  - 页面延迟配置
  - HTTP Headers配置
  - 自定义CSS配置
  - 资源阻止列表配置
- ✅ 配置状态可视化指示器（绿色边框 + "✓ 已配置"徽章）
- ✅ 配置继承说明（提示未设置项使用默认配置）
- ✅ JSON验证（实时检查HTTP Headers和BlockList格式）
- ✅ 保存/加载per-URL配置到后端

## 💡 未来增强功能（可选）

### 1. Per-URL配置增强
- [ ] 配置模板系统（保存常用配置为模板）
- [ ] 配置项复制/粘贴功能
- [ ] 批量应用配置到多个URL
- [ ] 配置差异对比视图

### 2. 执行历史展示UI
- [ ] 在测试用例详情页显示执行历史
- [ ] 执行历史列表（时间、状态、性能数据）
- [ ] 查看单次执行的详细报告
- [ ] 执行趋势图表

---

## 📁 文件清单

### 新增文件
- `server/testcase-storage.ts` - 测试用例存储层

### 修改文件
- `server/index.ts` - 添加API端点、更新配置生成逻辑

### 新增数据文件（运行时生成）
- `testcases.json` - 持久化的测试用例存储

---

## 🚀 使用示例

### 创建带有per-URL配置的测试用例

```bash
curl -X POST http://localhost:3000/api/testcases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "多页面性能测试",
    "runners": {
      "Runtime": {
        "enabled": true,
        "durationMs": 60000,
        "delayMs": 10000
      }
    },
    "urlsWithDesc": [
      {
        "url": "https://www.bilibili.com",
        "description": "首页（游客）",
        "config": {
          "anonymous": true
        }
      },
      {
        "url": "https://www.bilibili.com",
        "description": "首页（登录用户）",
        "config": {
          "cookie": "DedeUserID=123456; SESSDATA=xxx",
          "extraHTTPHeaders": {
            "X-Test": "logged-in-user"
          }
        }
      },
      {
        "url": "https://www.bilibili.com/video/BV1xx411c7mD",
        "description": "视频页面",
        "config": {
          "cookie": "DedeUserID=123456; SESSDATA=xxx",
          "hooks": {
            "onPageLoaded": "await page.click(\".video-play-button\");"
          }
        }
      }
    ],
    "mode": "headless",
    "repeatCount": 3,
    "anonymous": false,
    "cpuThrottling": 1,
    "description": "测试不同页面在不同登录状态下的性能",
    "tags": ["performance", "multi-url"],
    "advancedConfig": {
      "delayMs": 5000,
      "blockList": ["*.gif", "*.png"]
    }
  }'
```

### 执行测试用例

```bash
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "多页面性能测试",
    "testCaseId": "testcase_1700000000000_abcd1234",
    "config": { /* 测试用例配置 */ }
  }'
```

### 查询执行历史

```bash
curl http://localhost:3000/api/testcases/testcase_1700000000000_abcd1234/executions
```

响应：
```json
{
  "testCaseId": "testcase_1700000000000_abcd1234",
  "testCaseName": "多页面性能测试",
  "executions": [
    {
      "id": "task_1700000100000_xyz789",
      "testCaseId": "testcase_1700000000000_abcd1234",
      "name": "多页面性能测试",
      "runner": "Runtime",
      "status": "completed",
      "startTime": "2025-11-21T10:00:00.000Z",
      "endTime": "2025-11-21T10:05:30.000Z",
      "duration": 330000,
      "perfcatUrl": "https://fe-perfcat.bilibili.co/utils/shorten/abc123"
    }
  ],
  "total": 1
}
```

---

## 🔧 技术细节

### 配置优先级实现

在 `generateTestCase()` 函数中使用空值合并运算符 (`??`) 实现配置优先级：

```typescript
// 优先级: per-URL > global > fallback
const value = tc.config?.field ?? tc.field ?? tc.advancedConfig?.field;
```

### 执行历史限制

- 每个测试用例最多保留 **50条** 执行记录
- 测试记录总数限制为 **1000条**

### 数据同步策略

1. **加载时机**: 服务器启动时自动加载 `testcases.json`
2. **保存时机**: 每次创建/更新/删除操作后立即保存
3. **原子性**: 使用 `fs.writeFile` 确保文件写入的原子性

---

## 📝 总结

### 已实现功能

✅ **特性1：测试用例与执行状态解耦**
- 测试用例持久化存储 (`testcases.json`)
- 执行记录持久化存储 (`test-records.json`)
- 通过 `testCaseId` 建立关联
- 每个测试用例维护执行历史数组

✅ **特性2：每个URL的独立配置**
- 支持在 `urlsWithDesc[].config` 中设置per-URL配置
- 配置优先级：per-URL > global > default
- 支持所有配置项的独立覆盖
- 向后兼容旧的配置格式

### 技术亮点

1. **清晰的数据分层**: TestCase → Task → TestRecord
2. **灵活的配置系统**: 支持全局配置和per-URL覆盖
3. **完整的API接口**: RESTful设计，支持CRUD和查询
4. **执行历史追踪**: 自动关联测试用例和执行记录
5. **向后兼容**: 不影响现有功能

---

**实现者**: Claude Code
**日期**: 2025-11-21
**状态**: 后端实现完成 ✅ | 前端实现进行中 🚧
