# 测试记录显示修复说明

## 问题描述
之前的测试记录系统存在以下问题：
1. **失败的测试没有保存报告文件**：即使测试过程中生成了部分报告数据，失败时也不会保存reportFile字段
2. **失败的测试没有错误信息**：测试记录中缺少errorMessage字段，无法了解失败原因
3. **records.html无法显示失败测试的详情**：点击失败的测试记录时无法查看任何信息

## 修复内容

### 1. 后端修复 ([server/index.ts](server/index.ts))

#### 1.1 扩展TestRecord接口
```typescript
interface TestRecord {
    // ... 其他字段
    reportFile?: string; // 本地报告文件名
    errorMessage?: string; // 错误信息（失败时） ← 新增
}
```

#### 1.2 修改报告文件查找逻辑
**修改前**：只有成功的测试（code === 0）才会查找和保存reportFile

**修改后**：无论成功或失败都会查找reportFile
- 成功时：保存reportFile并上传到Perfcat
- 失败时：仅保存reportFile，不上传Perfcat

代码位置：[server/index.ts:489-573](server/index.ts#L489-L573)

#### 1.3 添加错误信息提取
在保存测试记录时，如果测试失败（code !== 0）：
- 从任务输出中提取包含关键词的错误行（Error, error, 失败, Exception, ELIFECYCLE）
- 提取最后10行错误信息
- 如果没有找到错误关键词，使用默认消息："测试失败，退出码: {code}"

代码位置：[server/index.ts:588-606](server/index.ts#L588-L606)

### 2. 前端修复 ([public/records.html](public/records.html))

#### 2.1 支持展开失败的测试记录
**修改前**：只有有reportFile的记录才能展开

**修改后**：有reportFile或errorMessage的记录都可以展开
```javascript
if (record.reportFile || record.errorMessage) {
    expandTd.innerHTML = `<span class="expand-icon">▶</span>`;
}
```

#### 2.2 显示错误信息
失败的测试展开后会显示：
- ❌ 测试失败标题（红色）
- 错误信息详情框（粉红背景，带边框）
- 如果有部分报告文件，显示文件名提示

代码位置：[public/records.html:666-684](public/records.html#L666-L684)

#### 2.3 优化展开逻辑
- 成功的测试：展开后加载并显示性能图表
- 失败的测试：展开后直接显示错误信息（无需加载）

## 测试效果

### 对于旧的测试记录
- 旧的失败记录（如"内存泄露对比测试"）仍然没有errorMessage和reportFile
- 这些记录在前端仍会显示为失败，但点击后只显示"无详细错误信息"

### 对于新的测试记录
未来所有的测试（无论成功失败）都会：
1. ✅ 保存reportFile（如果生成了报告）
2. ✅ 保存errorMessage（如果失败）
3. ✅ 在records.html中可以展开查看详情
4. ✅ 失败时显示清晰的错误信息

## 示例展示

### 成功的测试记录展开后
```
📊 Initialization/Runtime/MemoryLeak 性能指标
[性能图表...]
```

### 失败的测试记录展开后
```
❌ 测试失败

错误信息：
Error: Page crashed!
    at Page.<anonymous> (/path/to/file.js:123:45)
    ...

📄 部分报告数据可能已生成：2025-11-25T12-30-00-Runtime-Local.json
```

## 相关文件修改
1. [server/index.ts](server/index.ts) - 后端逻辑修复
   - TestRecord接口扩展（+1行）
   - 报告查找逻辑修改（~84行）
   - 错误信息提取（+19行）

2. [public/records.html](public/records.html) - 前端显示修复
   - 展开条件修改（2处）
   - 错误信息显示（+23行）
   - 展开逻辑优化（+4行）

## 验证方法

1. 启动服务器：`npm start`
2. 访问：http://localhost:3000/records.html
3. 查看失败的测试记录（红色❌标记）
4. 点击展开，应该能看到错误信息（如果有）
5. 运行一个新的测试并让它失败，验证错误信息是否正确保存和显示

## 注意事项

- 旧的测试记录不会自动更新，需要重新运行测试才能生成新格式的记录
- errorMessage字段最多保存10行错误信息，避免记录过大
- reportFile即使在失败时也会尝试保存，因为可能包含有价值的部分数据
