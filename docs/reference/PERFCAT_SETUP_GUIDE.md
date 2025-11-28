# Perfcat 快速配置指南

## 🚀 快速开始

### 1. 获取 Cookie

1. 访问 https://fe-perfcat.bilibili.co
2. 打开 Chrome DevTools (F12)
3. 切换到 **Network** 标签
4. 手动上传一个测试文件
5. 找到 `/api/v1/perfcat/shorten` 请求
6. 复制完整的 **Cookie** 请求头内容

### 2. 配置系统

创建或编辑 `perfcat-config.json` 文件:

```json
{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "cookie": "在这里粘贴你复制的完整Cookie"
}
```

**Cookie 示例格式**:
```
_gitlab_token=XXX; buvid3=XXX; b_nut=XXX; buvid_fp=XXX; _biz_uid=XXX; ...
```

### 3. 重启服务器

```bash
# 停止服务器 (Ctrl+C)

# 启动服务器
npm run dev
```

### 4. 验证配置

启动时检查日志输出:

```
📊 Perfcat: Enabled  ✅
```

如果显示 `Disabled`，说明 Cookie 未配置。

### 5. 测试上传

运行一个测试，完成后检查输出:

```
[系统] 正在上传测试报告到Perfcat...
[Perfcat] 开始上传测试报告...
[Perfcat] ✅ 上传成功，短链ID: 1TU_Qe
[系统] ✅ Perfcat上传成功！
[系统] 📊 查看报告: https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime
[系统] 📈 图表模式: https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime&viewType=chart
```

## 🔧 使用 API 配置

### 通过 API 设置 Cookie

```bash
curl -X POST http://localhost:3000/api/perfcat \
  -H "Content-Type: application/json" \
  -d '{
    "cookie": "你的Cookie内容"
  }'
```

### 测试 Perfcat 连接

```bash
curl -X POST http://localhost:3000/api/perfcat/test
```

成功响应:
```json
{
  "success": true,
  "message": "Perfcat测试上传成功",
  "perfcatId": "abc123",
  "perfcatUrl": "https://fe-perfcat.bilibili.co/utils/shorten/abc123"
}
```

## ❗ 常见问题

### 问题 1: Cookie 未配置

**症状**: 日志显示 `📊 Perfcat: Disabled`

**解决**:
1. 检查 `perfcat-config.json` 文件是否存在
2. 确认 `cookie` 字段不为空
3. 重启服务器

### 问题 2: 上传失败

**症状**: `[Perfcat] ❌ 上传失败: HTTP 401/403`

**解决**:
1. Cookie 可能已过期，重新获取
2. 确保 Cookie 完整，包含所有字段
3. 检查网络连接

### 问题 3: JSON 文件未找到

**症状**: `[系统] ⚠️ 未找到测试报告文件`

**解决**:
1. 确认测试成功完成（退出码 0）
2. 检查 `benchmark_report/` 目录是否存在
3. 确认测试确实生成了 JSON 文件

## 🔒 安全建议

1. **不要提交到版本控制**:
   ```bash
   echo "perfcat-config.json" >> .gitignore
   ```

2. **限制文件权限**:
   ```bash
   chmod 600 perfcat-config.json
   ```

3. **定期更新 Cookie**:
   - Cookie 会过期，建议每月更新一次
   - 如果上传失败，首先尝试更新 Cookie

## 📊 查看报告

测试完成后，在 Web 界面的任务列表中点击链接:

- **📊 查看报告**: 标准报告页面
- **📈 图表模式**: 可视化图表页面

或者从 Webhook 通知中获取链接。

## 💡 提示

- Cookie 只需要配置一次，除非过期
- 每次测试都会自动上传，无需手动操作
- Perfcat 链接可以直接分享给团队成员
- 如果不需要上传，清空 cookie 字段即可禁用

## 📚 更多信息

详细文档请参考 [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md)
