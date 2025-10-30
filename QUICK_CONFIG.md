# 快速配置测试用例

## ⚠️ 错误：No test case found

### 问题原因

如果你看到这个错误：
```
Error: No test case found
Benchmark process exited with code 1
```

**原因**：你还没有添加任何测试用例！

配置文件中 `testCases` 是空数组：
```typescript
runners: {
    Initialization: {
        testCases: []  // ❌ 空的，无法运行
    }
}
```

### 解决方案

## 🚀 3 步快速配置

### 第 1 步：打开配置页面

访问：http://localhost:3000/config.html

### 第 2 步：启用测试模式并添加用例

#### 方式 A：使用默认示例（最快）

1. **勾选** Initialization（或任意测试模式）
2. **点击** "添加测试用例"
3. **填写**：
   - URL: `https://www.bilibili.com`
   - 描述: `B站首页`
4. **点击** "保存配置"

#### 方式 B：使用你自己的 URL

1. **勾选** 需要的测试模式
2. **点击** "添加测试用例"
3. **填写** 你要测试的 URL 和描述
4. **点击** "保存配置"

### 第 3 步：运行测试

1. 返回控制台：http://localhost:3000
2. 从下拉菜单选择测试模式
3. 点击"启动测试"
4. ✅ 现在应该可以正常运行了！

## 📝 详细配置说明

### Initialization - 初始化性能测试

**用途**：测试页面首次加载性能

**必需配置**：
- ✅ 至少 1 个测试用例

**配置示例**：
```
测试用例 #1:
  URL: https://www.bilibili.com
  描述: B站首页

测试用例 #2:
  URL: https://search.bilibili.com
  描述: B站搜索页
```

### Runtime - 运行时性能测试

**用途**：测试页面长时间运行表现

**必需配置**：
- ✅ 至少 1 个测试用例
- ⚙️ 运行时长（默认 60000ms）
- ⚙️ 延迟时间（默认 10000ms）

**配置示例**：
```
运行时长: 60000 (60秒)
延迟时间: 10000 (10秒)

测试用例 #1:
  URL: https://www.bilibili.com
  描述: B站首页长时间运行
```

### MemoryLeak - 内存泄漏测试

**用途**：检测内存泄漏问题

**必需配置**：
- ✅ 至少 1 个测试用例
- ⚙️ 迭代间隔（默认 60000ms）
- ⚙️ 迭代次数（默认 3）
- 📝 页面操作代码（可选，留空表示静置）

**配置示例**：
```
迭代间隔: 60000 (60秒)
迭代次数: 3

页面操作代码: (留空或填入)
await page.click('.play-button');

测试用例 #1:
  URL: https://www.bilibili.com
  描述: B站首页内存测试
```

## 🎯 最小配置示例

### 最简单的可运行配置

**只需 3 个字段**：

1. ✅ 启用一个测试模式（勾选开关）
2. ✅ 添加一个测试用例
3. ✅ 点击保存

**配置页面操作**：
```
1. 勾选 "Initialization" 开关
2. 点击 "添加测试用例"
3. 填写：
   URL: https://www.bilibili.com
   描述: 测试
4. 点击 "保存配置"
```

**生成的配置**：
```typescript
const config: UserOptions = {
    mode: {
        anonymous: true,
        headless: false
    },
    runners: {
        Initialization: {
            testCases: [
                {
                    target: 'https://www.bilibili.com',
                    description: '测试'
                }
            ]
        }
    }
};
```

## 💡 常见测试 URL

### B站页面

```
首页: https://www.bilibili.com
搜索: https://search.bilibili.com
视频页: https://www.bilibili.com/video/BV1xx411c7mD
直播间: https://live.bilibili.com/460689
```

### 其他页面

```
你自己的页面: https://your-domain.com
测试环境: https://test.your-domain.com
开发环境: http://localhost:8080
```

## 🔍 验证配置

### 方法 1：查看配置文件

```bash
cat benchmark.config.mts
```

应该看到 `testCases` 数组有内容：
```typescript
testCases: [
    {
        target: 'https://www.bilibili.com',
        description: 'B站首页'
    }
]
```

### 方法 2：查看 JSON 配置

```bash
cat benchmark.dynamic.json
```

检查对应的 runner 是否有 testCases：
```json
{
  "runners": {
    "Initialization": {
      "enabled": true,
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页"
        }
      ]
    }
  }
}
```

### 方法 3：在界面确认

配置页面应该显示：
- ✅ 模式开关已开启（蓝色）
- ✅ 显示测试用例卡片
- ✅ 卡片中有 URL 和描述

## ⚙️ 完整配置流程

### 详细步骤（含所有选项）

#### 1. 基础配置

- [ ] **匿名模式**：勾选（推荐）
- [ ] **无头模式**：不勾选（调试时建议显示浏览器）

#### 2. Initialization 配置

- [ ] 开启开关
- [ ] 添加至少 1 个测试用例
- [ ] 填写 URL 和描述

#### 3. Runtime 配置

- [ ] 开启开关
- [ ] 设置运行时长（如 60000）
- [ ] 设置延迟时间（如 10000）
- [ ] 添加至少 1 个测试用例

#### 4. MemoryLeak 配置

- [ ] 开启开关
- [ ] 设置迭代间隔（如 60000）
- [ ] 设置迭代次数（如 3）
- [ ] （可选）填写页面操作代码
- [ ] 添加至少 1 个测试用例

#### 5. 保存并测试

- [ ] 点击"保存配置"按钮
- [ ] 看到成功提示
- [ ] 返回控制台
- [ ] 选择模式并启动测试

## 🐛 故障排查

### 问题：保存配置失败

**原因**：至少需要启用一个测试模式

**解决**：确保勾选了至少一个模式的开关

### 问题：启动测试失败

**检查清单**：

1. [ ] 是否启用了测试模式？
2. [ ] 是否添加了测试用例？
3. [ ] URL 是否正确（包含 http:// 或 https://）？
4. [ ] 是否点击了"保存配置"？

### 问题：测试用例看不到

**解决**：

1. 确认模式开关已开启（变成蓝色）
2. 滚动页面查看测试用例区域
3. 如果没有，点击"添加测试用例"按钮

## 📚 相关文档

- [START_HERE.md](START_HERE.md) - 新手入门
- [QUICKSTART.md](QUICKSTART.md) - 5分钟教程
- [README.md](README.md) - 完整功能说明
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 问题排查

## ✅ 检查清单

配置完成后，确认：

- [ ] 至少启用了一个测试模式
- [ ] 每个启用的模式都有至少 1 个测试用例
- [ ] 每个测试用例都填写了 URL 和描述
- [ ] 点击了"保存配置"按钮
- [ ] 看到了成功提示
- [ ] benchmark.config.mts 文件已更新
- [ ] 可以在控制台启动测试

## 🎉 快速开始模板

### 复制这个配置开始

**最小可运行配置**：

```
1. 访问配置页面
2. 勾选 Initialization
3. 添加测试用例：
   - URL: https://www.bilibili.com
   - 描述: B站首页
4. 保存配置
5. 返回控制台
6. 选择 Initialization
7. 启动测试 ✅
```

---

**记住**：必须添加测试用例才能运行测试！

**最后更新**: 2025-10-30
