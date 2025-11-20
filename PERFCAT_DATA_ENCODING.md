# Perfcat 数据编码说明

## 概述

Perfcat API 要求上传的测试报告数据必须经过特殊编码处理，而不是直接上传原始 JSON 数据。

## 编码方式

使用 **LZ-String** 压缩算法 + **Base64** 编码：

```
原始JSON → JSON.stringify() → LZ-String压缩 → Base64编码 → 上传
```

## 实现代码

### 1. 安装依赖

```bash
npm install lz-string
```

### 2. 导入库

```typescript
import LZ from 'lz-string';
```

### 3. 编码数据

```typescript
// ❌ 错误方式（原始JSON）
body: JSON.stringify({ data: JSON.stringify(reportData) })

// ✅ 正确方式（LZ-String压缩 + Base64）
body: JSON.stringify({ data: LZ.compressToBase64(JSON.stringify(reportData)) })
```

## 完整示例

```typescript
async function uploadToPerfcat(reportData: any) {
    // 1. 将报告数据转为JSON字符串
    const jsonString = JSON.stringify(reportData);

    // 2. 使用LZ-String压缩并转为Base64
    const compressed = LZ.compressToBase64(jsonString);

    // 3. 构建请求体
    const requestBody = JSON.stringify({ data: compressed });

    // 4. 发送请求
    const response = await fetch('https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Cookie': perfcatConfig.cookie,
            // ... 其他headers
        },
        body: requestBody
    });

    // 5. 获取短链ID
    const result = await response.json() as { id: string };
    return result.id;
}
```

## 为什么需要压缩？

1. **减小数据大小**：性能测试报告的JSON通常很大（几百KB到几MB），压缩可以减少约50%的数据量
2. **提高传输速度**：更小的数据包传输更快
3. **API要求**：Perfcat API 明确要求上传压缩后的数据格式

## 压缩效果

典型的压缩比例：

```
原始JSON大小: 500 KB
压缩后大小:   250 KB
压缩率:       50%
```

## 数据格式示例

### 压缩前

```json
{
  "data": "{\"platform\":\"darwin\",\"benchmarkVersion\":\"2.1.2\",\"testResults\":[...]}"
}
```

### 压缩后

```json
{
  "data": "N4IgxgDgrgKgFgJwPYgCYEsDOBXAThASwBsIBjCAGhAGMA7CAY1JqgEYAGE..."
}
```

## 解码数据

如果需要从Perfcat下载数据并解码：

```typescript
import LZ from 'lz-string';

// 从Perfcat获取的压缩数据
const compressedData = "N4IgxgDgrgKgFgJwPY...";

// 解码
const jsonString = LZ.decompressFromBase64(compressedData);
const reportData = JSON.parse(jsonString);
```

## 故障排查

### 错误：上传失败 400 Bad Request

**原因**：数据未压缩或压缩格式错误

**解决**：
1. 确认已安装 `lz-string` 包
2. 确认导入语句正确：`import LZ from 'lz-string'`
3. 确认使用 `compressToBase64` 方法（不是 `compress` 或其他方法）

### 错误：Perfcat显示数据解析失败

**原因**：压缩前的JSON格式不正确

**解决**：
1. 确认 `reportData` 是有效的对象
2. 确认 `JSON.stringify(reportData)` 可以正常执行
3. 检查报告数据中是否包含无法序列化的内容（如循环引用）

## 相关文档

- [LZ-String 库文档](https://github.com/pieroxy/lz-string)
- [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) - Perfcat集成完整指南
- [TROUBLESHOOTING_PERFCAT.md](TROUBLESHOOTING_PERFCAT.md) - 故障排查指南

## 技术细节

### LZ-String 算法

- **类型**：LZ77变种
- **特点**：针对JavaScript字符串优化
- **编码方式**：compressToBase64 使用标准Base64字符集
- **压缩速度**：快速（约1-2ms处理100KB数据）
- **浏览器兼容性**：支持所有现代浏览器和Node.js

### Base64编码

- **字符集**：A-Z, a-z, 0-9, +, /
- **填充字符**：=
- **编码增长**：约33%（3字节→4字符）
- **目的**：确保数据可以安全地在JSON中传输

## 更新日志

- **2025-11-18**: 实现LZ-String压缩编码功能
- **初始版本**: 使用原始JSON上传（已废弃）

## 总结

✅ **必须使用** LZ-String压缩 + Base64编码
✅ **一行代码实现**: `LZ.compressToBase64(JSON.stringify(reportData))`
✅ **减小数据约50%**
✅ **符合Perfcat API要求**
