#!/bin/bash

################################################################################
# 🚀 分布式一键部署脚本
# 功能: 自动部署 Master + 多个 Worker 节点
# 支持: Linux / macOS / Windows (WSL)
################################################################################

set -e

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ==================== 全局变量 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_ROOT}/deploy-config.json"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_LOG="${LOG_DIR}/deploy_${TIMESTAMP}.log"

# 统计变量
TOTAL_NODES=0
SUCCESS_NODES=0
FAILED_NODES=0

# ==================== 工具函数 ====================

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                        ║${NC}"
    echo -e "${CYAN}║     🚀 Benchmark 分布式一键部署系统                    ║${NC}"
    echo -e "${CYAN}║                                                        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$DEPLOYMENT_LOG"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$DEPLOYMENT_LOG"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$DEPLOYMENT_LOG"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$DEPLOYMENT_LOG"
}

print_step() {
    echo -e "${MAGENTA}➤ $1${NC}"
}

# ==================== 环境检查 ====================

check_dependencies() {
    print_step "检查本地依赖..."

    local missing_deps=()

    # 检查 jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    # 检查 rsync (可选)
    if ! command -v rsync &> /dev/null; then
        print_warning "rsync 未安装，将使用 scp 传输文件（速度较慢）"
    fi

    # 检查 ssh
    if ! command -v ssh &> /dev/null; then
        missing_deps+=("ssh")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少必要依赖: ${missing_deps[*]}"
        echo ""
        echo "安装方法:"
        echo "  macOS:   brew install ${missing_deps[*]}"
        echo "  Ubuntu:  sudo apt-get install ${missing_deps[*]}"
        echo "  CentOS:  sudo yum install ${missing_deps[*]}"
        echo ""
        exit 1
    fi

    print_success "依赖检查通过"
}

check_config_file() {
    print_step "检查配置文件..."

    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "配置文件不存在: $CONFIG_FILE"
        echo ""
        echo "请先创建配置文件 deploy-config.json"
        exit 1
    fi

    # 验证 JSON 格式
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        print_error "配置文件格式错误，请检查 JSON 语法"
        exit 1
    fi

    print_success "配置文件有效"
}

create_log_dir() {
    mkdir -p "$LOG_DIR"
    print_info "日志文件: $DEPLOYMENT_LOG"
}

# ==================== SSH 连接测试 ====================

test_ssh_connection() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4

    local ssh_opts="-o ConnectTimeout=5 -o StrictHostKeyChecking=no"

    if [ -n "$key_file" ] && [ -f "${key_file/#\~/$HOME}" ]; then
        ssh_opts="$ssh_opts -i ${key_file/#\~/$HOME}"
    fi

    if ssh $ssh_opts -p "$port" "$user@$host" "echo 'SSH OK'" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# ==================== 远程命令执行 ====================

ssh_exec() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local command=$5

    local ssh_opts="-o StrictHostKeyChecking=no"

    if [ -n "$key_file" ] && [ -f "${key_file/#\~/$HOME}" ]; then
        ssh_opts="$ssh_opts -i ${key_file/#\~/$HOME}"
    fi

    ssh $ssh_opts -p "$port" "$user@$host" "$command"
}

# ==================== 文件同步 ====================

sync_files() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local remote_path=$5

    print_step "同步项目文件到 $host..."

    local ssh_opts="-o StrictHostKeyChecking=no"
    if [ -n "$key_file" ] && [ -f "${key_file/#\~/$HOME}" ]; then
        ssh_opts="$ssh_opts -i ${key_file/#\~/$HOME}"
    fi

    # 创建远程目录
    ssh_exec "$host" "$port" "$user" "$key_file" "mkdir -p $remote_path"

    # 读取排除模式
    local exclude_opts=""
    local exclude_patterns=$(jq -r '.deployment.exclude_patterns[]' "$CONFIG_FILE")
    while IFS= read -r pattern; do
        exclude_opts="$exclude_opts --exclude=$pattern"
    done <<< "$exclude_patterns"

    # 使用 rsync 或 scp
    if command -v rsync &> /dev/null; then
        rsync -avz --delete \
            -e "ssh $ssh_opts -p $port" \
            $exclude_opts \
            "$PROJECT_ROOT/" \
            "$user@$host:$remote_path/" 2>&1 | tee -a "$DEPLOYMENT_LOG"
    else
        # 创建临时归档
        local tmp_archive="/tmp/benchmark_${TIMESTAMP}.tar.gz"
        tar -czf "$tmp_archive" \
            --exclude=node_modules \
            --exclude=.git \
            --exclude=data \
            --exclude=logs \
            -C "$PROJECT_ROOT" .

        scp $ssh_opts -P "$port" "$tmp_archive" "$user@$host:/tmp/"
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $remote_path && tar -xzf /tmp/$(basename $tmp_archive) && rm /tmp/$(basename $tmp_archive)"

        rm "$tmp_archive"
    fi

    print_success "文件同步完成"
}

# ==================== Node.js 环境检查 ====================

check_node_on_remote() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4

    print_step "检查 Node.js 环境..."

    if ssh_exec "$host" "$port" "$user" "$key_file" "command -v node" &>/dev/null; then
        local node_version=$(ssh_exec "$host" "$port" "$user" "$key_file" "node -v" | sed 's/v//')
        local major_version=$(echo "$node_version" | cut -d'.' -f1)

        if [ "$major_version" -lt 18 ]; then
            print_error "Node.js 版本过低: v$node_version (需要 >= v18.0.0)"
            return 1
        fi

        print_success "Node.js v$node_version"
        return 0
    else
        print_error "Node.js 未安装"
        return 1
    fi
}

# ==================== 安装依赖 ====================

install_dependencies_on_remote() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local remote_path=$5

    print_step "安装 npm 依赖..."

    ssh_exec "$host" "$port" "$user" "$key_file" \
        "cd $remote_path && npm install --production" 2>&1 | tee -a "$DEPLOYMENT_LOG"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "依赖安装完成"
        return 0
    else
        print_error "依赖安装失败"
        return 1
    fi
}

# ==================== 构建项目 ====================

build_project_on_remote() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local remote_path=$5

    print_step "构建 TypeScript 项目..."

    ssh_exec "$host" "$port" "$user" "$key_file" \
        "cd $remote_path && npm run build" 2>&1 | tee -a "$DEPLOYMENT_LOG"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "构建完成"
        return 0
    else
        print_error "构建失败"
        return 1
    fi
}

# ==================== PM2 管理 ====================

install_pm2_on_remote() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4

    print_step "安装 PM2..."

    if ssh_exec "$host" "$port" "$user" "$key_file" "command -v pm2" &>/dev/null; then
        print_info "PM2 已安装"
        return 0
    fi

    ssh_exec "$host" "$port" "$user" "$key_file" "npm install -g pm2" 2>&1 | tee -a "$DEPLOYMENT_LOG"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "PM2 安装完成"
        return 0
    else
        print_warning "PM2 安装失败，将使用 npm start 启动"
        return 1
    fi
}

# ==================== Master 部署 ====================

deploy_master() {
    print_header "📡 部署 Master 节点"

    local host=$(jq -r '.master.host' "$CONFIG_FILE")
    local port=$(jq -r '.master.port' "$CONFIG_FILE")
    local user=$(jq -r '.master.user' "$CONFIG_FILE")
    local deploy_path=$(jq -r '.master.deploy_path' "$CONFIG_FILE")
    local service_port=$(jq -r '.master.service_port' "$CONFIG_FILE")
    local key_file=$(jq -r '.ssh.key_file' "$CONFIG_FILE")

    print_info "目标: $user@$host:$port"
    print_info "路径: $deploy_path"

    # SSH 连接测试
    print_step "测试 SSH 连接..."
    if ! test_ssh_connection "$host" "$port" "$user" "$key_file"; then
        print_error "无法连接到 Master 节点: $host"
        return 1
    fi
    print_success "SSH 连接成功"

    # 检查 Node.js
    if ! check_node_on_remote "$host" "$port" "$user" "$key_file"; then
        print_error "Master 节点环境检查失败"
        return 1
    fi

    # 同步文件
    if ! sync_files "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "文件同步失败"
        return 1
    fi

    # 安装依赖
    if ! install_dependencies_on_remote "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "依赖安装失败"
        return 1
    fi

    # 构建项目
    if ! build_project_on_remote "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "项目构建失败"
        return 1
    fi

    # 安装 PM2
    local use_pm2=false
    if [ "$(jq -r '.pm2.enabled' "$CONFIG_FILE")" == "true" ]; then
        if install_pm2_on_remote "$host" "$port" "$user" "$key_file"; then
            use_pm2=true
        fi
    fi

    # 停止旧服务
    print_step "停止旧服务..."
    if [ "$use_pm2" == "true" ]; then
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && pm2 delete benchmark-master 2>/dev/null || true"
    else
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "pkill -f 'node.*server/index' || true"
    fi

    # 启动服务
    print_step "启动 Master 服务..."
    if [ "$use_pm2" == "true" ]; then
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && PORT=$service_port pm2 start npm --name benchmark-master -- start"

        if [ "$(jq -r '.pm2.startup' "$CONFIG_FILE")" == "true" ]; then
            ssh_exec "$host" "$port" "$user" "$key_file" "pm2 save && pm2 startup" || true
        fi
    else
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && PORT=$service_port nohup npm start > logs/master.log 2>&1 &"
    fi

    # 等待服务启动
    sleep 3

    # 健康检查
    print_step "健康检查..."
    if ssh_exec "$host" "$port" "$user" "$key_file" \
        "curl -f http://localhost:$service_port/ &>/dev/null"; then
        print_success "Master 节点部署成功 ✨"
        print_info "访问地址: http://$host:$service_port"
        return 0
    else
        print_error "Master 服务启动失败"
        return 1
    fi
}

# ==================== Worker 部署 ====================

deploy_worker() {
    local worker_index=$1
    local worker_data=$2

    local name=$(echo "$worker_data" | jq -r '.name')
    local host=$(echo "$worker_data" | jq -r '.host')
    local port=$(echo "$worker_data" | jq -r '.port')
    local user=$(echo "$worker_data" | jq -r '.user')
    local deploy_path=$(echo "$worker_data" | jq -r '.deploy_path')
    local perf_tier=$(echo "$worker_data" | jq -r '.performance_tier')
    local description=$(echo "$worker_data" | jq -r '.description')
    local tags=$(echo "$worker_data" | jq -r '.tags')
    local key_file=$(jq -r '.ssh.key_file' "$CONFIG_FILE")

    local master_host=$(jq -r '.master.host' "$CONFIG_FILE")
    local master_port=$(jq -r '.master.service_port' "$CONFIG_FILE")
    local master_url="http://${master_host}:${master_port}"

    print_header "🔧 部署 Worker #$((worker_index + 1)): $name"

    print_info "目标: $user@$host:$port"
    print_info "性能等级: $perf_tier"
    print_info "Master: $master_url"

    # SSH 连接测试
    print_step "测试 SSH 连接..."
    if ! test_ssh_connection "$host" "$port" "$user" "$key_file"; then
        print_error "无法连接到 Worker: $host"
        ((FAILED_NODES++))
        return 1
    fi
    print_success "SSH 连接成功"

    # 检查 Node.js
    if ! check_node_on_remote "$host" "$port" "$user" "$key_file"; then
        print_error "Worker 节点环境检查失败"
        ((FAILED_NODES++))
        return 1
    fi

    # 同步文件
    if ! sync_files "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "文件同步失败"
        ((FAILED_NODES++))
        return 1
    fi

    # 安装依赖
    if ! install_dependencies_on_remote "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "依赖安装失败"
        ((FAILED_NODES++))
        return 1
    fi

    # 构建项目
    if ! build_project_on_remote "$host" "$port" "$user" "$key_file" "$deploy_path"; then
        print_error "项目构建失败"
        ((FAILED_NODES++))
        return 1
    fi

    # 安装 PM2
    local use_pm2=false
    if [ "$(jq -r '.pm2.enabled' "$CONFIG_FILE")" == "true" ]; then
        if install_pm2_on_remote "$host" "$port" "$user" "$key_file"; then
            use_pm2=true
        fi
    fi

    # 停止旧服务
    print_step "停止旧服务..."
    if [ "$use_pm2" == "true" ]; then
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && pm2 delete worker-${perf_tier} 2>/dev/null || true"
    else
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "pkill -f 'node.*worker-client' || true"
    fi

    # 启动 Worker
    print_step "启动 Worker 服务..."

    local env_vars="MASTER_URL=$master_url WORKER_NAME='$name' PERFORMANCE_TIER=$perf_tier"
    [ -n "$description" ] && env_vars="$env_vars WORKER_DESCRIPTION='$description'"
    [ -n "$tags" ] && env_vars="$env_vars WORKER_TAGS='$tags'"

    if [ "$use_pm2" == "true" ]; then
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && $env_vars pm2 start 'npx tsx server/worker-client.ts' --name worker-${perf_tier}"

        if [ "$(jq -r '.pm2.startup' "$CONFIG_FILE")" == "true" ]; then
            ssh_exec "$host" "$port" "$user" "$key_file" "pm2 save && pm2 startup" || true
        fi
    else
        ssh_exec "$host" "$port" "$user" "$key_file" \
            "cd $deploy_path && $env_vars nohup npx tsx server/worker-client.ts > logs/worker.log 2>&1 &"
    fi

    sleep 2

    print_success "Worker 节点部署成功 ✨"
    ((SUCCESS_NODES++))
    return 0
}

# ==================== 批量部署 Workers ====================

deploy_all_workers() {
    print_header "🚀 批量部署 Worker 节点"

    local workers_count=$(jq '.workers | length' "$CONFIG_FILE")
    TOTAL_NODES=$workers_count

    print_info "总共 $workers_count 个 Worker 节点"
    echo ""

    for i in $(seq 0 $((workers_count - 1))); do
        local worker_data=$(jq ".workers[$i]" "$CONFIG_FILE")
        deploy_worker "$i" "$worker_data"
        echo ""
    done
}

# ==================== 部署摘要 ====================

print_summary() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    部署完成报告                        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local master_host=$(jq -r '.master.host' "$CONFIG_FILE")
    local master_port=$(jq -r '.master.service_port' "$CONFIG_FILE")

    echo -e "${GREEN}📡 Master 节点:${NC}"
    echo -e "   访问地址: ${BLUE}http://${master_host}:${master_port}${NC}"
    echo ""

    echo -e "${GREEN}🔧 Worker 节点统计:${NC}"
    echo -e "   总数: ${TOTAL_NODES}"
    echo -e "   成功: ${GREEN}${SUCCESS_NODES}${NC}"
    echo -e "   失败: ${RED}${FAILED_NODES}${NC}"
    echo ""

    if [ $FAILED_NODES -eq 0 ]; then
        echo -e "${GREEN}✨ 所有节点部署成功！${NC}"
    else
        echo -e "${YELLOW}⚠️  部分节点部署失败，请查看日志${NC}"
    fi

    echo ""
    echo -e "${CYAN}📋 详细日志:${NC} $DEPLOYMENT_LOG"
    echo ""
}

# ==================== 主流程 ====================

show_menu() {
    echo ""
    echo "请选择部署模式:"
    echo "  1) 完整部署 (Master + 所有 Workers)"
    echo "  2) 仅部署 Master"
    echo "  3) 仅部署 Workers"
    echo "  4) 退出"
    echo ""
    read -p "请输入选项 [1-4]: " choice

    case $choice in
        1)
            return 1
            ;;
        2)
            return 2
            ;;
        3)
            return 3
            ;;
        4)
            exit 0
            ;;
        *)
            print_error "无效选项"
            show_menu
            ;;
    esac
}

main() {
    print_banner

    # 前置检查
    check_dependencies
    check_config_file
    create_log_dir

    # 显示菜单
    show_menu
    local mode=$?

    case $mode in
        1)
            # 完整部署
            if deploy_master; then
                deploy_all_workers
            else
                print_error "Master 部署失败，跳过 Worker 部署"
            fi
            ;;
        2)
            # 仅 Master
            deploy_master
            ;;
        3)
            # 仅 Workers
            deploy_all_workers
            ;;
    esac

    # 显示摘要
    print_summary
}

# 执行主流程
main
