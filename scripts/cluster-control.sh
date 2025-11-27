#!/bin/bash

################################################################################
# 🎮 集群控制脚本
# 功能: 一键启动/停止/重启/查看状态 所有节点
################################################################################

set -e

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==================== 全局变量 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_ROOT}/deploy-config.json"

# ==================== 工具函数 ====================

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}➤ $1${NC}"
}

# ==================== SSH 执行 ====================

ssh_exec() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local command=$5

    local ssh_opts="-o StrictHostKeyChecking=no -o ConnectTimeout=5"

    if [ -n "$key_file" ] && [ -f "${key_file/#\~/$HOME}" ]; then
        ssh_opts="$ssh_opts -i ${key_file/#\~/$HOME}"
    fi

    ssh $ssh_opts -p "$port" "$user@$host" "$command" 2>/dev/null
}

# ==================== 检查服务状态 ====================

check_service_status() {
    local host=$1
    local port=$2
    local user=$3
    local key_file=$4
    local service_port=$5
    local node_type=$6

    local status=$(ssh_exec "$host" "$port" "$user" "$key_file" \
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:$service_port/ --max-time 2")

    if [ "$status" == "200" ]; then
        echo -e "${GREEN}运行中${NC}"
        return 0
    else
        echo -e "${RED}已停止${NC}"
        return 1
    fi
}

# ==================== Master 控制 ====================

control_master() {
    local action=$1

    local host=$(jq -r '.master.host' "$CONFIG_FILE")
    local port=$(jq -r '.master.port' "$CONFIG_FILE")
    local user=$(jq -r '.master.user' "$CONFIG_FILE")
    local deploy_path=$(jq -r '.master.deploy_path' "$CONFIG_FILE")
    local service_port=$(jq -r '.master.service_port' "$CONFIG_FILE")
    local key_file=$(jq -r '.ssh.key_file' "$CONFIG_FILE")
    local use_pm2=$(jq -r '.pm2.enabled' "$CONFIG_FILE")

    case $action in
        start)
            print_step "启动 Master ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "cd $deploy_path && pm2 start benchmark-master 2>/dev/null || PORT=$service_port pm2 start npm --name benchmark-master -- start"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "cd $deploy_path && PORT=$service_port nohup npm start > logs/master.log 2>&1 &"
            fi
            sleep 2
            print_success "Master 已启动"
            ;;
        stop)
            print_step "停止 Master ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pm2 stop benchmark-master"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pkill -f 'node.*server/index'"
            fi
            print_success "Master 已停止"
            ;;
        restart)
            print_step "重启 Master ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pm2 restart benchmark-master"
            else
                control_master stop
                sleep 1
                control_master start
            fi
            print_success "Master 已重启"
            ;;
        status)
            printf "Master ($host): "
            check_service_status "$host" "$port" "$user" "$key_file" "$service_port" "master"
            ;;
        logs)
            print_info "Master 日志 ($host):"
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" "pm2 logs benchmark-master --lines 50"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" "tail -n 50 $deploy_path/logs/master.log"
            fi
            ;;
    esac
}

# ==================== Worker 控制 ====================

control_worker() {
    local action=$1
    local worker_index=$2
    local worker_data=$3

    local name=$(echo "$worker_data" | jq -r '.name')
    local host=$(echo "$worker_data" | jq -r '.host')
    local port=$(echo "$worker_data" | jq -r '.port')
    local user=$(echo "$worker_data" | jq -r '.user')
    local deploy_path=$(echo "$worker_data" | jq -r '.deploy_path')
    local perf_tier=$(echo "$worker_data" | jq -r '.performance_tier')
    local description=$(echo "$worker_data" | jq -r '.description')
    local tags=$(echo "$worker_data" | jq -r '.tags')
    local key_file=$(jq -r '.ssh.key_file' "$CONFIG_FILE")
    local use_pm2=$(jq -r '.pm2.enabled' "$CONFIG_FILE")

    local master_host=$(jq -r '.master.host' "$CONFIG_FILE")
    local master_port=$(jq -r '.master.service_port' "$CONFIG_FILE")
    local master_url="http://${master_host}:${master_port}"

    local env_vars="MASTER_URL=$master_url WORKER_NAME='$name' PERFORMANCE_TIER=$perf_tier"
    [ -n "$description" ] && env_vars="$env_vars WORKER_DESCRIPTION='$description'"
    [ -n "$tags" ] && env_vars="$env_vars WORKER_TAGS='$tags'"

    case $action in
        start)
            print_step "启动 Worker: $name ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "cd $deploy_path && $env_vars pm2 start 'npx tsx server/worker-client.ts' --name worker-${perf_tier} 2>/dev/null || pm2 restart worker-${perf_tier}"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "cd $deploy_path && $env_vars nohup npx tsx server/worker-client.ts > logs/worker.log 2>&1 &"
            fi
            print_success "$name 已启动"
            ;;
        stop)
            print_step "停止 Worker: $name ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pm2 stop worker-${perf_tier}"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pkill -f 'worker-client'"
            fi
            print_success "$name 已停止"
            ;;
        restart)
            print_step "重启 Worker: $name ($host)..."
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" \
                    "pm2 restart worker-${perf_tier}"
            else
                control_worker stop "$worker_index" "$worker_data"
                sleep 1
                control_worker start "$worker_index" "$worker_data"
            fi
            print_success "$name 已重启"
            ;;
        status)
            printf "Worker: $name ($host) - "
            if ssh_exec "$host" "$port" "$user" "$key_file" "pgrep -f worker-client" &>/dev/null; then
                echo -e "${GREEN}运行中${NC}"
            else
                echo -e "${RED}已停止${NC}"
            fi
            ;;
        logs)
            print_info "Worker 日志: $name ($host)"
            if [ "$use_pm2" == "true" ]; then
                ssh_exec "$host" "$port" "$user" "$key_file" "pm2 logs worker-${perf_tier} --lines 50"
            else
                ssh_exec "$host" "$port" "$user" "$key_file" "tail -n 50 $deploy_path/logs/worker.log"
            fi
            ;;
    esac
}

# ==================== 批量控制 ====================

control_all_workers() {
    local action=$1

    local workers_count=$(jq '.workers | length' "$CONFIG_FILE")

    for i in $(seq 0 $((workers_count - 1))); do
        local worker_data=$(jq ".workers[$i]" "$CONFIG_FILE")
        control_worker "$action" "$i" "$worker_data"
    done
}

# ==================== 集群控制 ====================

cluster_start() {
    print_header "🚀 启动集群"
    control_master start
    echo ""
    control_all_workers start
}

cluster_stop() {
    print_header "🛑 停止集群"
    control_all_workers stop
    echo ""
    control_master stop
}

cluster_restart() {
    print_header "🔄 重启集群"
    cluster_stop
    echo ""
    sleep 2
    cluster_start
}

cluster_status() {
    print_header "📊 集群状态"
    control_master status
    echo ""
    control_all_workers status
}

# ==================== 健康检查 ====================

health_check() {
    print_header "🏥 集群健康检查"

    local master_host=$(jq -r '.master.host' "$CONFIG_FILE")
    local master_port=$(jq -r '.master.service_port' "$CONFIG_FILE")

    # 检查 Master
    print_step "检查 Master 节点..."
    if curl -f -s "http://${master_host}:${master_port}/" > /dev/null; then
        print_success "Master 健康"

        # 获取 Worker 列表
        print_step "检查 Worker 连接状态..."
        local workers_online=$(curl -s "http://${master_host}:${master_port}/api/workers" | jq -r '. | length')
        print_info "在线 Worker 数量: $workers_online"

        # 显示详细信息
        curl -s "http://${master_host}:${master_port}/api/workers" | jq -r '.[] | "  - \(.name) [\(.performanceTier)] - \(.status)"'
    else
        print_error "Master 不可访问"
    fi
}

# ==================== 显示菜单 ====================

show_menu() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          🎮 Benchmark 集群控制面板                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "请选择操作:"
    echo ""
    echo "  集群操作:"
    echo "    1) 启动集群 (Master + Workers)"
    echo "    2) 停止集群"
    echo "    3) 重启集群"
    echo "    4) 查看集群状态"
    echo "    5) 健康检查"
    echo ""
    echo "  单独操作:"
    echo "    6) 仅启动 Master"
    echo "    7) 仅停止 Master"
    echo "    8) 查看 Master 日志"
    echo "    9) 启动所有 Workers"
    echo "   10) 停止所有 Workers"
    echo ""
    echo "    0) 退出"
    echo ""
    read -p "请输入选项: " choice

    case $choice in
        1) cluster_start ;;
        2) cluster_stop ;;
        3) cluster_restart ;;
        4) cluster_status ;;
        5) health_check ;;
        6) control_master start ;;
        7) control_master stop ;;
        8) control_master logs ;;
        9) control_all_workers start ;;
        10) control_all_workers stop ;;
        0) exit 0 ;;
        *)
            print_error "无效选项"
            show_menu
            ;;
    esac

    echo ""
    read -p "按 Enter 继续..."
    show_menu
}

# ==================== 命令行模式 ====================

if [ $# -gt 0 ]; then
    # 命令行模式
    case $1 in
        start) cluster_start ;;
        stop) cluster_stop ;;
        restart) cluster_restart ;;
        status) cluster_status ;;
        health) health_check ;;
        master-start) control_master start ;;
        master-stop) control_master stop ;;
        master-restart) control_master restart ;;
        master-logs) control_master logs ;;
        workers-start) control_all_workers start ;;
        workers-stop) control_all_workers stop ;;
        workers-restart) control_all_workers restart ;;
        *)
            echo "用法: $0 {start|stop|restart|status|health|master-*|workers-*}"
            exit 1
            ;;
    esac
else
    # 交互模式
    show_menu
fi
