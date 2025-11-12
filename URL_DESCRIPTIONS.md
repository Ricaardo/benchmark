# 📝 URL 描述功能说明

## 概述

从现在开始，每个测试 URL 都可以有独立的描述字段，让您更容易区分不同的测试场景。

---

## ✨ 新功能特性

### 1. **独立的 URL 描述**

每个 URL 现在都可以添加有意义的描述，而不是仅显示 URL 本身。

#### 之前：
```
https://www.bilibili.com
https://www.bilibili.com/video/BV1xx411c7mD
https://t.bilibili.com
```
❌ 难以快速识别每个 URL 的测试目的

#### 现在：
```
URL 1: https://www.bilibili.com
描述:  B站首页

URL 2: https://www.bilibili.com/video/BV1xx411c7mD
描述:  视频播放页

URL 3: https://t.bilibili.com
描述:  动态页面
```
✅ 一目了然，清晰明确

---

## 🎯 使用方式

### 添加/编辑测试用例

1. **点击"➕ 添加URL"按钮**
   - 会自动添加一个新的 URL 输入框

2. **填写 URL 和描述**
   - **URL 字段**：输入完整的测试 URL
   - **描述字段**：输入该 URL 的描述（例如：首页、播放页、个人中心）

3. **添加更多 URL**
   - 点击"➕ 添加URL"继续添加
   - 每个 URL 可以有独立的描述

4. **删除不需要的 URL**
   - 点击每个 URL 项右侧的 🗑️ 按钮

---

## 📊 数据格式

### 新格式（带描述）

测试用例现在保存为：

```javascript
{
    "id": 1234567890,
    "name": "B站测试",
    "urlsWithDesc": [
        {
            "url": "https://www.bilibili.com",
            "description": "B站首页"
        },
        {
            "url": "https://www.bilibili.com/video/BV1xx411c7mD",
            "description": "视频播放页"
        }
    ],
    // ... 其他配置
}
```

### 兼容旧格式

旧的测试用例仍然可以正常工作：

```javascript
{
    "urls": [
        "https://www.bilibili.com",
        "https://www.bilibili.com/video/BV1xx411c7mD"
    ]
}
```

系统会自动将旧格式转换为新格式，描述默认使用 URL 本身。

---

## 🔄 配置文件生成

生成的 `benchmark.config.mts` 会使用您提供的描述：

```typescript
const config: UserOptions = {
    mode: {
        anonymous: true,
        headless: true
    },
    runners: {
        Initialization: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "B站首页"  // 使用自定义描述
                },
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "视频播放页"  // 使用自定义描述
                }
            ]
        }
    }
};
```

---

## 💡 最佳实践

### 1. **使用有意义的描述**

✅ **好的描述**：
- "首页 - 未登录状态"
- "视频播放 - 1080P"
- "个人中心 - 关注列表"
- "搜索结果 - 视频类型"

❌ **不好的描述**：
- "测试1"
- "url1"
- 留空（虽然可以，但不推荐）

### 2. **描述格式建议**

```
<页面名称> - <测试场景>
```

示例：
```
URL: https://www.bilibili.com
描述: 首页 - 匿名用户

URL: https://www.bilibili.com
描述: 首页 - 登录用户

URL: https://www.bilibili.com/video/BV1xx411c7mD
描述: 视频播放 - 720P清晰度

URL: https://www.bilibili.com/video/BV1xx411c7mD
描述: 视频播放 - 1080P清晰度
```

### 3. **相同 URL 不同场景**

可以多次添加同一个 URL，用不同的描述区分：

```
URL 1: https://www.bilibili.com
描述:  首页 - 初次访问

URL 2: https://www.bilibili.com
描述:  首页 - 二次访问（有缓存）

URL 3: https://www.bilibili.com
描述:  首页 - 弱网环境
```

---

## 🎬 实战示例

### 场景：测试B站视频播放性能

```
用例名称: B站视频播放性能测试

URL 1: https://www.bilibili.com/video/BV1xx411c7mD
描述:  标准视频 - 自动清晰度

URL 2: https://www.bilibili.com/video/BV1xx411c7mD
描述:  标准视频 - 1080P 60FPS

URL 3: https://www.bilibili.com/video/BV1yy411c8mM
描述:  互动视频 - 选择分支

URL 4: https://www.bilibili.com/bangumi/play/ss12345
描述:  番剧播放 - 第1话
```

### 场景：测试不同页面的内存泄漏

```
用例名称: B站主要页面内存泄漏检测

URL 1: https://www.bilibili.com
描述:  首页 - 推荐流

URL 2: https://t.bilibili.com
描述:  动态页 - 关注动态

URL 3: https://www.bilibili.com/v/popular/all
描述:  热门页 - 综合热门

URL 4: https://space.bilibili.com/123456
描述:  个人空间 - UP主主页
```

---

## 🔍 在报告中查看

测试完成后，生成的报告会显示您自定义的描述：

```
✅ Initialization 测试完成

  ✓ B站首页                    - 加载时间: 1.2s
  ✓ 视频播放页                 - 加载时间: 1.5s
  ✓ 动态页面                   - 加载时间: 1.1s
```

而不是：

```
✅ Initialization 测试完成

  ✓ https://www.bilibili.com                      - 加载时间: 1.2s
  ✓ https://www.bilibili.com/video/BV1xx411c7mD   - 加载时间: 1.5s
  ✓ https://t.bilibili.com                         - 加载时间: 1.1s
```

---

## 🛠️ 技术细节

### 数据结构

```typescript
interface UrlWithDescription {
    url: string;          // 完整的测试 URL
    description: string;  // 自定义描述（如果为空，使用 URL 本身）
}

interface TestCase {
    id: number;
    name: string;
    urlsWithDesc: UrlWithDescription[];  // 新增字段
    urls: string[];                       // 保留以兼容旧版本
    // ... 其他字段
}
```

### 向后兼容

- ✅ 旧的测试用例会自动升级
- ✅ 没有描述时自动使用 URL
- ✅ 编辑旧用例时会转换为新格式
- ✅ 不影响现有功能

---

## 📚 相关文档

- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md) - 配置预设指南
- [README.md](README.md) - 主文档

---

**最后更新**: 2025-10-29
