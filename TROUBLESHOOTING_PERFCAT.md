# Perfcat 和测试记录故障排查指南

## 常见问题及解决方案

### 1. "Cannot read properties of null (reading 'platform')"

**症状**:
- 测试完成后上传 Perfcat 时报错
- 错误信息：`Cannot read properties of null (reading 'platform')`

**可能原因**:
1. 测试报告 JSON 文件格式不正确
2. JSON 文件内容为空或损坏
3. 文件编码问题

**解决方法**:

**步骤 1**: 检查报告文件
```bash
# 查看最新的报告文件
ls -lt benchmark_report/*.json | head -5

# 检查文件内容
cat benchmark_report/[最新文件名].json | head -50
```

**步骤 2**: 验证 JSON 格式
```bash
# 使用 jq 验证 JSON（需要安装 jq）
cat benchmark_report/[文件名].json | jq . > /dev/null && echo "JSON 格式正确" || echo "JSON 格式错误"

# 或使用 Node.js
node -e "console.log(JSON.parse(require('fs').readFileSync('benchmark_report/[文件名].json', 'utf-8')).platform)"
```

**步骤 3**: 清理损坏的文件
```bash
# 备份现有报告
mkdir -p benchmark_report_backup
cp benchmark_report/*.json benchmark_report_backup/

# 删除损坏的文件
rm benchmark_report/[损坏文件名].json
```

**步骤 4**: 重新运行测试
- 重新运行一次测试
- 观察是否还有错误

### 2. Perfcat 上传失败

**症状**:
- 显示 "Perfcat上传失败"
- 或 "Cookie not configured"

**解决方法**:

**检查 Cookie 配置**:
```bash
# 查看配置文件
cat perfcat-config.json

# 应该包含：
# {
#   "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
#   "cookie": "你的cookie..."
# }
```

**更新 Cookie**:
1. 访问 https://fe-perfcat.bilibili.co
2. 打开开发者工具 (F12)
3. 上传一个测试文件
4. 在 Network 标签找到 `/api/v1/perfcat/shorten` 请求
5. 复制 Cookie 请求头
6. 更新 perfcat-config.json

**测试连接**:
```bash
curl -X POST http://localhost:3000/api/perfcat/test
```

### 3. 测试记录不显示

**症状**:
- 访问 /records.html 显示"暂无测试记录"
- 但测试已经完成

**解决方法**:

**步骤 1**: 检查数据文件
```bash
# 查看记录文件
cat test-records.json

# 如果文件不存在或为空，创建它
echo "[]" > test-records.json
```

**步骤 2**: 检查服务器日志
```bash
# 查看启动日志
npm run dev

# 应该看到：
# 📝 Test Records: X records loaded
```

**步骤 3**: 手动添加测试记录（测试）
```bash
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试任务",
    "runner": "Initialization",
    "config": {}
  }'
```

**步骤 4**: 检查浏览器控制台
- 打开 /records.html
- 按 F12 打开开发者工具
- 查看 Console 标签是否有错误
- 查看 Network 标签，检查 API 请求是否成功

### 4. 数据文件损坏

**症状**:
- 服务器无法启动
- 或显示 "Failed to load test records"

**解决方法**:

**重置测试记录**:
```bash
# 备份现有数据
cp test-records.json test-records.backup.json

# 重置为空数组
echo "[]" > test-records.json

# 重启服务器
npm run dev
```

**恢复数据**:
如果备份文件存在且有效：
```bash
# 验证备份
cat test-records.backup.json | jq . > /dev/null

# 恢复
cp test-records.backup.json test-records.json
```

### 5. Perfcat 链接无效

**症状**:
- 点击 Perfcat 链接显示 404
- 或链接无法打开

**可能原因**:
1. Perfcat 短链已过期
2. 上传时网络错误
3. Perfcat 服务问题

**解决方法**:

**检查链接格式**:
正确格式：`https://fe-perfcat.bilibili.co/utils/shorten/{短链ID}?runner=Runtime`

**重新上传**:
1. 找到对应的 JSON 报告文件
2. 手动上传到 Perfcat 网站
3. 获取新的短链ID

**更新记录中的链接**:
```bash
# 编辑 test-records.json
# 找到对应记录，更新 perfcatUrl 和 perfcatChartUrl
```

### 6. 服务器启动失败

**症状**:
- 运行 `npm run dev` 失败
- TypeScript 编译错误

**解决方法**:

**检查 TypeScript 错误**:
```bash
npm run build
```

**常见错误修复**:

**端口被占用**:
```bash
# 查找占用 3000 端口的进程
lsof -ti :3000

# 终止进程
lsof -ti :3000 | xargs kill -9

# 或使用其他端口
PORT=3001 npm run dev
```

**依赖问题**:
```bash
# 清除并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 7. 性能问题

**症状**:
- 测试记录页面加载慢
- 记录数据过多

**解决方法**:

**清理旧记录**:
```bash
# 清空失败的测试
curl -X POST http://localhost:3000/api/test-records/clear \
  -H "Content-Type: application/json" \
  -d '{"status":"error"}'

# 或清空所有记录（注意：不可恢复）
curl -X POST http://localhost:3000/api/test-records/clear \
  -H "Content-Type: application/json" \
  -d '{}'
```

**导出数据后清空**:
```bash
# 导出数据
cp test-records.json test-records-$(date +%Y%m%d).json

# 清空
echo "[]" > test-records.json
```

**限制记录数量**:
系统默认保留最近 1000 条记录。如需调整：

编辑 [server/index.ts:157-160](server/index.ts#L157-L160):
```typescript
// 只保留最近1000条记录
if (testRecords.length > 1000) {
    testRecords = testRecords.slice(0, 1000);
}
```

改为你需要的数量。

### 8. 网络问题

**症状**:
- Perfcat 上传超时
- API 请求失败

**解决方法**:

**检查网络连接**:
```bash
# 测试 Perfcat 服务
curl -I https://fe-perfcat.bilibili.co

# 测试本地服务
curl http://localhost:3000/api/health
```

**配置代理**（如需要）:
```bash
# 设置环境变量
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 启动服务器
npm run dev
```

**增加超时时间**:
如果网络较慢，可以在 uploadToPerfcat 函数中增加超时设置。

### 9. 权限问题

**症状**:
- 无法写入文件
- "Permission denied" 错误

**解决方法**:

**检查文件权限**:
```bash
# 查看权限
ls -la test-records.json
ls -la perfcat-config.json
ls -la benchmark_report/

# 修复权限
chmod 644 test-records.json
chmod 644 perfcat-config.json
chmod 755 benchmark_report/
```

**修复所有权**:
```bash
# 确保当前用户拥有文件
chown $USER:$USER test-records.json perfcat-config.json
chown -R $USER:$USER benchmark_report/
```

### 10. 浏览器兼容性问题

**症状**:
- UI 显示异常
- 功能无法使用

**解决方法**:

**使用推荐的浏览器**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**清除浏览器缓存**:
1. 按 Ctrl+Shift+Delete (或 Cmd+Shift+Delete)
2. 选择"缓存的图像和文件"
3. 点击"清除数据"
4. 刷新页面

**禁用浏览器扩展**:
某些广告拦截器或隐私扩展可能影响功能。

## 调试技巧

### 启用详细日志

在 [server/index.ts](server/index.ts) 中添加更多日志：

```typescript
// 在 uploadToPerfcat 函数中
console.log('[Perfcat] Uploading data:', JSON.stringify(reportData).substring(0, 200));

// 在 addTestRecord 函数中
console.log('[TestRecords] Saving record:', record.id, record.name);
```

### 使用浏览器开发者工具

1. **Console**: 查看 JavaScript 错误
2. **Network**: 检查 API 请求和响应
3. **Application**: 查看本地存储和 Cookie

### 查看服务器日志

```bash
# 实时查看日志
npm run dev | tee server.log

# 或使用 PM2
pm2 logs benchmark-web
```

### 测试单个功能

**测试记录保存**:
```bash
# 创建测试记录
curl -X POST http://localhost:3000/api/test-records/test \
  -H "Content-Type: application/json"
```

**测试 Perfcat 上传**:
```bash
curl -X POST http://localhost:3000/api/perfcat/test
```

## 获取帮助

如果以上方法都无法解决问题：

1. **收集信息**:
   - 错误信息截图
   - 服务器日志
   - 浏览器控制台输出
   - 测试报告文件示例

2. **检查文档**:
   - [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md)
   - [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md)
   - [README.md](README.md)

3. **提交 Issue**:
   提供以上收集的信息，详细描述问题。

## 预防措施

### 定期维护

```bash
# 每周执行
# 1. 清理失败的测试记录
curl -X POST http://localhost:3000/api/test-records/clear \
  -H "Content-Type: application/json" \
  -d '{"status":"error"}'

# 2. 备份数据
cp test-records.json backups/test-records-$(date +%Y%m%d).json

# 3. 清理旧的报告文件（保留最近30天）
find benchmark_report/ -name "*.json" -mtime +30 -delete
```

### 监控健康状态

定期检查：
```bash
# API 健康检查
curl http://localhost:3000/api/health

# 统计信息
curl http://localhost:3000/api/test-records/stats
```

### 最佳实践

1. **定期更新 Perfcat Cookie**（每月）
2. **备份重要测试记录**
3. **监控磁盘空间**（benchmark_report 目录）
4. **使用有意义的测试名称**
5. **及时清理失败的测试**

## 快速修复清单

遇到问题时，按顺序尝试：

- [ ] 重启服务器 (`npm run dev`)
- [ ] 清除浏览器缓存并刷新
- [ ] 检查 perfcat-config.json 配置
- [ ] 检查 test-records.json 文件格式
- [ ] 查看服务器启动日志
- [ ] 查看浏览器控制台错误
- [ ] 重新编译 TypeScript (`npm run build`)
- [ ] 清理 node_modules 重新安装
- [ ] 检查文件权限
- [ ] 查看本故障排查指南的详细说明

## 总结

大多数问题都可以通过以下方式解决：
1. 检查配置文件
2. 验证数据文件格式
3. 查看日志和错误信息
4. 重启服务器
5. 清除缓存

如果问题持续存在，参考本指南的详细排查步骤。
