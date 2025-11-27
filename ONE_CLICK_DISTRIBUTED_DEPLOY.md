# 一键分布式部署指南

## 概述

本指南介绍如何使用**一键部署脚本**快速部署 Benchmark 分布式测试系统到多台机器。

## 🎯 适用场景

- ✅ 5台左右的内网机器
- ✅ 各系统兼容 (Linux/macOS/Windows WSL)
- ✅ 不使用 Docker
- ✅ 基于 SSH 的自动化部署

## 📋 前置准备

### 1. 本地机器（部署控制端）

安装必要工具：

**macOS:**
```bash
brew install jq rsync
```

**Ubuntu/Debian:**
```bash
sudo apt-get install jq rsync openssh-client
```

**CentOS/RHEL:**
```bash
sudo yum install jq rsync openssh-clients
```

### 2. 所有目标机器（Master + Workers）

**安装 Node.js >= 18.0.0:**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# macOS
brew install node
```

**创建部署用户（推荐）:**

```bash
# 创建专用部署用户
sudo useradd -m -s /bin/bash deploy

# 设置 sudo 权限（可选）
sudo usermod -aG sudo deploy

# 切换到部署用户
sudo su - deploy
```

### 3. 配置 SSH 免密登录

**在本地生成 SSH 密钥（如果没有）:**

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

**分发公钥到所有目标机器:**

```bash
# 方式1: 使用 ssh-copy-id
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@192.168.1.100
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@192.168.1.101
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@192.168.1.102
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@192.168.1.103
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@192.168.1.104

# 方式2: 手动复制
cat ~/.ssh/id_rsa.pub | ssh deploy@192.168.1.100 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'
```

**验证免密登录:**

```bash
ssh deploy@192.168.1.100
# 应该无需密码直接登录
```

### 4. 创建部署目录

在所有目标机器上：

```bash
# 创建部署目录
sudo mkdir -p /opt/benchmark
sudo chown deploy:deploy /opt/benchmark

# 创建日志目录
mkdir -p /opt/benchmark/logs
```

## 🚀 快速开始

### 第一步：配置部署信息

编辑 [deploy-config.json](deploy-config.json) 文件：

```json
{
  "master": {
    "host": "192.168.1.100",        // Master 节点 IP
    "port": 22,                     // SSH 端口
    "user": "deploy",               // SSH 用户
    "deploy_path": "/opt/benchmark", // 部署路径
    "service_port": 3000            // Web 服务端口
  },
  "workers": [
    {
      "name": "高配测试机-1",
      "host": "192.168.1.101",
      "port": 22,
      "user": "deploy",
      "deploy_path": "/opt/benchmark",
      "performance_tier": "high",
      "description": "16核32GB - Ubuntu 22.04",
      "tags": "high-performance,production",
      "os": "linux"
    },
    {
      "name": "中配测试机-1",
      "host": "192.168.1.102",
      "port": 22,
      "user": "deploy",
      "deploy_path": "/opt/benchmark",
      "performance_tier": "medium",
      "description": "8核16GB - Ubuntu 22.04",
      "tags": "medium-performance,testing",
      "os": "linux"
    },
    {
      "name": "中配测试机-2",
      "host": "192.168.1.103",
      "port": 22,
      "user": "deploy",
      "deploy_path": "/opt/benchmark",
      "performance_tier": "medium",
      "description": "8核16GB - macOS",
      "tags": "medium-performance,macos",
      "os": "macos"
    },
    {
      "name": "低配测试机-1",
      "host": "192.168.1.104",
      "port": 22,
      "user": "deploy",
      "deploy_path": "/opt/benchmark",
      "performance_tier": "low",
      "description": "4核8GB - Ubuntu 20.04",
      "tags": "low-performance,compatibility",
      "os": "linux"
    }
  ],
  "ssh": {
    "key_file": "~/.ssh/id_rsa",
    "connection_timeout": 10,
    "strict_host_key_checking": false
  },
  "pm2": {
    "enabled": true,
    "auto_install": true,
    "startup": true
  }
}
```

**配置说明:**

- `master`: Master 节点配置
- `workers`: Worker 节点列表（可添加任意数量）
- `performance_tier`: 性能等级 (`high`/`medium`/`low`/`custom`)
- `ssh.key_file`: SSH 私钥路径
- `pm2.enabled`: 是否使用 PM2 管理进程（推荐）

### 第二步：执行一键部署

```bash
cd /path/to/benchmark

# 执行部署脚本
./scripts/distributed-deploy.sh
```

**交互式菜单:**

```
请选择部署模式:
  1) 完整部署 (Master + 所有 Workers)
  2) 仅部署 Master
  3) 仅部署 Workers
  4) 退出

请输入选项 [1-4]:
```

选择 `1` 进行完整部署。

### 第三步：查看部署进度

脚本会自动执行以下步骤：

1. ✅ 检查本地依赖 (jq, ssh, rsync)
2. ✅ 验证配置文件
3. ✅ 测试所有节点的 SSH 连接
4. ✅ 检查远程 Node.js 环境
5. ✅ 同步项目文件到所有节点
6. ✅ 安装 npm 依赖
7. ✅ 构建 TypeScript 项目
8. ✅ 安装并配置 PM2
9. ✅ 启动 Master 服务
10. ✅ 启动所有 Worker 服务
11. ✅ 健康检查

### 第四步：验证部署

部署完成后，访问 Master Web UI：

```
http://192.168.1.100:3000
```

在页面上应该能看到所有 Worker 节点已连接。

## 🎮 集群管理

### 使用集群控制脚本

```bash
# 交互式菜单
./scripts/cluster-control.sh

# 命令行模式
./scripts/cluster-control.sh start      # 启动集群
./scripts/cluster-control.sh stop       # 停止集群
./scripts/cluster-control.sh restart    # 重启集群
./scripts/cluster-control.sh status     # 查看状态
./scripts/cluster-control.sh health     # 健康检查
```

### 常用操作

**启动集群:**
```bash
./scripts/cluster-control.sh start
```

**停止集群:**
```bash
./scripts/cluster-control.sh stop
```

**查看集群状态:**
```bash
./scripts/cluster-control.sh status
```

**健康检查:**
```bash
./scripts/cluster-control.sh health
```

**查看 Master 日志:**
```bash
./scripts/cluster-control.sh master-logs
```

**仅重启 Workers:**
```bash
./scripts/cluster-control.sh workers-restart
```

## 📊 部署日志

所有部署日志保存在：

```
logs/deployment/deploy_YYYYMMDD_HHMMSS.log
```

查看最新日志：

```bash
tail -f logs/deployment/deploy_*.log | tail -1
```

## 🔧 进阶配置

### 使用 Git 仓库部署

编辑 `deploy-config.json`:

```json
{
  "deployment": {
    "git_repo": "https://github.com/your-org/benchmark.git",
    "git_branch": "main",
    "use_git": true,
    "sync_method": "git"
  }
}
```

部署时会从 Git 拉取代码而不是本地同步。

### 自定义排除文件

```json
{
  "deployment": {
    "exclude_patterns": [
      "node_modules",
      ".git",
      "data",
      "benchmark_report",
      "logs",
      "*.log",
      "*.tmp"
    ]
  }
}
```

### Windows 节点配置

对于 Windows 机器（使用 WSL）：

```json
{
  "name": "Windows测试机",
  "host": "192.168.1.105",
  "port": 22,
  "user": "wsl-user",
  "deploy_path": "/home/wsl-user/benchmark",
  "os": "windows"
}
```

## 🛠️ 故障排查

### SSH 连接失败

**问题:** `无法连接到节点`

**解决方案:**

1. 检查网络连通性:
   ```bash
   ping 192.168.1.101
   ```

2. 检查 SSH 服务:
   ```bash
   ssh deploy@192.168.1.101
   ```

3. 检查防火墙:
   ```bash
   # 在目标机器上
   sudo ufw status
   sudo ufw allow 22/tcp
   ```

### Node.js 版本过低

**问题:** `Node.js 版本过低: v16.x.x (需要 >= v18.0.0)`

**解决方案:**

```bash
# 在目标机器上升级 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 依赖安装失败

**问题:** `依赖安装失败`

**解决方案:**

```bash
# 在目标机器上手动安装
ssh deploy@192.168.1.101
cd /opt/benchmark
npm install
```

### Worker 无法连接到 Master

**问题:** Worker 启动但无法连接到 Master

**解决方案:**

1. 检查 Master 服务是否运行:
   ```bash
   curl http://192.168.1.100:3000/api/workers
   ```

2. 检查防火墙:
   ```bash
   # 在 Master 机器上
   sudo ufw allow 3000/tcp
   ```

3. 查看 Worker 日志:
   ```bash
   ssh deploy@192.168.1.101
   pm2 logs worker-high
   ```

### PM2 启动失败

**问题:** `PM2 安装失败或无法启动`

**解决方案:**

修改 `deploy-config.json`:

```json
{
  "pm2": {
    "enabled": false
  }
}
```

将使用 `nohup` 方式启动服务。

## 📝 部署检查清单

部署前确认：

- [ ] 所有机器已安装 Node.js >= 18.0.0
- [ ] SSH 免密登录已配置
- [ ] 部署目录已创建且有写权限
- [ ] 网络连通性正常
- [ ] 防火墙规则已配置
- [ ] `deploy-config.json` 配置正确

## 🚀 快速命令参考

```bash
# 一键部署
./scripts/distributed-deploy.sh

# 启动集群
./scripts/cluster-control.sh start

# 停止集群
./scripts/cluster-control.sh stop

# 查看状态
./scripts/cluster-control.sh status

# 健康检查
./scripts/cluster-control.sh health

# 查看日志
./scripts/cluster-control.sh master-logs
tail -f logs/deployment/deploy_*.log
```

## 🔄 更新部署

当代码更新后重新部署：

```bash
# 方式1: 完整重新部署
./scripts/distributed-deploy.sh

# 方式2: 仅重启服务
./scripts/cluster-control.sh restart
```

## 📞 技术支持

遇到问题请查看：

1. 部署日志: `logs/deployment/deploy_*.log`
2. 主文档: [README.md](README.md)
3. 部署指南: [DEPLOYMENT.md](DEPLOYMENT.md)
4. 故障排查: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 🎉 部署成功后

访问 Master Web UI 开始使用：

```
http://192.168.1.100:3000
```

功能：
- ✅ 创建测试用例
- ✅ 选择 Worker 执行测试
- ✅ 实时查看测试进度
- ✅ 查看测试报告
- ✅ 批量分发任务
- ✅ 监控 Worker 状态

---

**祝你部署顺利！** 🚀
