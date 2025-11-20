# Cookie功能 - 快速参考卡 🍪

## 🎯 三大核心功能

### 1️⃣ 自动获取Cookie
```
点击 "🔄 自动获取" → 选择账号 → 获取并应用 ✅
```
📖 详细文档: [COOKIE_AUTO_FETCH.md](COOKIE_AUTO_FETCH.md)

### 2️⃣ Cookie验证
```
点击 "🔍 验证Cookie" → 查看验证结果 ✅/❌
```
📖 详细文档: [COOKIE_VALIDATION_GUIDE.md](COOKIE_VALIDATION_GUIDE.md)

### 3️⃣ 问题诊断
```
测试失败 → 验证Cookie → 查看原因 → 重新获取 ✅
```
📖 详细文档: [COOKIE_TEST_DEBUG.md](COOKIE_TEST_DEBUG.md)

---

## 🚀 快速上手

### 方式1：使用预设账号（最快）
```
1. 点击 "🔄 自动获取"
2. 选择 "UAT测试账号 (110000233)"
3. 点击 "获取并应用"
4. ✅ 自动验证成功
5. 运行测试
```

### 方式2：自定义UID
```
1. 点击 "🔄 自动获取"
2. 输入 UID: 3546793358919882
3. 选择环境: 生产环境
4. 选择格式: 字符串格式
5. 点击 "获取并应用"
6. ✅ 自动验证成功
7. 运行测试
```

### 方式3：手动配置
```
1. 从浏览器复制Cookie
2. 粘贴到Cookie文本框
3. 点击 "🔍 验证Cookie"
4. 查看验证结果
5. 如果✅成功 → 运行测试
6. 如果❌失败 → 使用自动获取
```

---

## ⚡ 常用操作

### ✅ Cookie验证成功
```
✅ Cookie有效，已登录

用户信息：
• UID: 110000233
• 用户名: 测试账号
• VIP状态: 普通用户

→ 可以运行测试！
```

### ❌ Cookie验证失败
```
❌ Cookie无效或已过期

可能的原因：
• Cookie已过期
• Cookie格式不正确
• 缺少必需字段 (SESSDATA, bili_jct)
• 网络问题或权限不足

→ 点击 "🔄 自动获取" 重新获取Cookie
```

---

## 🔧 问题排查

### 问题1：自动获取返回 undefined
**原因**: UID类型错误（已修复）
**解决**: 确保使用最新版本

📖 参考: [COOKIE_FIX.md](COOKIE_FIX.md)

### 问题2：测试配置Cookie后失败
**排查步骤**:
```
1. 点击 "🔍 验证Cookie"
2. 如果❌失败 → Cookie过期，重新获取
3. 如果✅成功 → Cookie不是问题，检查其他配置
```

📖 参考: [COOKIE_TEST_DEBUG.md](COOKIE_TEST_DEBUG.md)

### 问题3：验证成功但测试仍失败
**可能原因**:
- 页面权限问题
- 测试配置错误
- URL不正确

**解决**:
- 检查测试URL
- 查看测试输出日志
- 验证Runner配置

---

## 📋 Cookie格式

### ✅ 字符串格式（推荐）
```
SESSDATA=xxx; bili_jct=yyy; DedeUserID=zzz
```

### ✅ JSON格式
```json
{
  "SESSDATA": "xxx",
  "bili_jct": "yyy",
  "DedeUserID": "zzz"
}
```

### ❌ 错误格式
```
❌ SESSDATA:xxx, bili_jct:yyy  （错误分隔符）
❌ {"SESSDATA":"xxx",...}的字符串  （双重序列化）
❌ 包含换行符的多行Cookie
```

---

## 🎯 最佳实践

### 实践1：每次测试前验证
```
自动获取 → 自动验证 ✅ → 运行测试
```

### 实践2：测试失败后诊断
```
测试失败 → 验证Cookie → 失败？重新获取 → 再次测试
```

### 实践3：定期刷新Cookie
```
长时间测试 → 定期验证 → 失效？重新获取
```

### 实践4：配合测试标记
```
优化前 → 验证✅ → 测试 → 记录
优化后 → 验证✅ → 测试 → 对比
```

---

## 📚 完整文档索引

| 文档 | 内容 | 场景 |
|-----|------|------|
| [COOKIE_AUTO_FETCH.md](COOKIE_AUTO_FETCH.md) | 自动获取功能详解 | 学习如何自动获取Cookie |
| [COOKIE_VALIDATION_GUIDE.md](COOKIE_VALIDATION_GUIDE.md) | 验证功能详解 | 学习如何验证Cookie |
| [COOKIE_FIX.md](COOKIE_FIX.md) | undefined问题修复 | 了解历史问题和解决方案 |
| [COOKIE_DEBUG_GUIDE.md](COOKIE_DEBUG_GUIDE.md) | 调试指南 | Cookie获取失败时参考 |
| [COOKIE_TEST_DEBUG.md](COOKIE_TEST_DEBUG.md) | 测试失败诊断 | 测试运行失败时参考 |
| [COOKIE_VALIDATION_SUMMARY.md](COOKIE_VALIDATION_SUMMARY.md) | 验证功能实现总结 | 开发者参考 |

---

## 🆘 快速帮助

### 需要获取Cookie？
```
点击 "🔄 自动获取" → 选择预设账号 → 获取并应用
```

### 需要验证Cookie？
```
点击 "🔍 验证Cookie" → 查看结果
```

### 测试失败？
```
验证Cookie → 检查结果 → 根据提示操作
```

### 想要手动配置？
```
浏览器DevTools → Application → Cookies → 复制
→ 粘贴到文本框 → 验证 → 测试
```

---

## 💡 提示

- ⭐ 推荐使用 **自动获取** 功能，最快最准确
- ⭐ 推荐选择 **字符串格式**，兼容性最好
- ⭐ 每次测试前 **验证一次**，确保Cookie有效
- ⭐ UAT和生产环境的Cookie **不能混用**

---

## 🎉 功能一览

✅ **自动获取Cookie** - 无需手动复制
✅ **自动验证Cookie** - 获取后自动检查
✅ **格式智能识别** - 字符串/JSON自动转换
✅ **详细结果显示** - 用户信息/失败原因
✅ **预设账号支持** - 一键选择常用账号
✅ **环境切换** - UAT/生产环境支持
✅ **实时反馈** - 即时显示验证状态

---

**版本**: v1.0 | **更新**: 2025-11-20 | **服务**: http://localhost:3000
