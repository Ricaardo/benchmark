#!/bin/bash

################################################################################
# 🚀 同机部署脚本 (Master + Worker)
# 功能: 在同一台机器上部署 Master 和 Worker
# 适用: Linux / macOS
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
DEFAULT_PORT=3000
DEFAULT_PERF_TIER="medium"

# ==================== 工具函数 ====================

print_banner() {
    clear
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                        ║${NC}"
    echo -e "${CYAN}║     🚀 Benchmark 同机部署 (Master + Worker)           ║${NC}"
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
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}➤ $1${NC}"
}

# ==================== 环境检测 ====================

detect_os() {
    OS_TYPE=$(uname -s)
    case "$OS_TYPE" in
        Darwin*)
            OS_NAME="macOS"
            ;;
        Linux*)
            OS_NAME="Linux"
            if grep -qi microsoft /proc/version 2>/dev/null; then
                OS_NAME="WSL"
            fi
            ;;
        *)
            OS_NAME="Unknown"
            ;;
    esac
    print_info "操作系统: $OS_NAME"
}

check_node() {
    print_step "检查 Node.js 环境..."

    if ! command -v node &> /dev/null; then
        print_error "未检测到 Node.js"
        echo ""
        echo "请先安装 Node.js >= 18.0.0"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//')
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低: v$NODE_VERSION (需要 >= v18.0.0)"
        exit 1
    fi

    print_success "Node.js v$NODE_VERSION"
}

check_port() {
    local port=$1
    print_step "检查端口 $port..."

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用"
        echo ""
        read -p "是否终止占用进程? [y/n]: " kill_process
        if [[ $kill_process =~ ^[Yy]$ ]]; then
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
            print_success "端口已释放"
        else
            print_error "端口被占用，无法继续部署"
            exit 1
        fi
    else
        print_success "端口 $port 可用"
    fi
}

# ==================== 配置 ====================

configure() {
    print_header "配置部署参数"

    # 服务端口
    read -p "Master 服务端口 [默认: $DEFAULT_PORT]: " SERVICE_PORT
    SERVICE_PORT=${SERVICE_PORT:-$DEFAULT_PORT}

    # Worker 性能等级
    echo ""
    echo "Worker 性能等级:"
    echo "  1) high   - 高配 (16核+, 32GB+)"
    echo "  2) medium - 中配 (4-8核, 8-16GB) [推荐]"
    echo "  3) low    - 低配 (2-4核, 4-8GB)"
    echo ""

    while true; do
        read -p "请选择 [1-3, 默认: 2]: " perf_choice
        perf_choice=${perf_choice:-2}
        case $perf_choice in
            1) PERF_TIER="high"; break;;
            2) PERF_TIER="medium"; break;;
            3) PERF_TIER="low"; break;;
            *) print_error "无效选项";;
        esac
    done

    # Worker 名称
    DEFAULT_WORKER_NAME="LocalWorker-$(hostname)"
    read -p "Worker 名称 [默认: $DEFAULT_WORKER_NAME]: " WORKER_NAME
    WORKER_NAME=${WORKER_NAME:-$DEFAULT_WORKER_NAME}

    # 检测本机 IP
    if [[ "$OS_NAME" == "macOS" ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
    else
        LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
    fi

    echo ""
    print_success "配置完成"
    echo ""
    echo "  服务端口: $SERVICE_PORT"
    echo "  本机 IP:  $LOCAL_IP"
    echo "  Worker 名称: $WORKER_NAME"
    echo "  性能等级: $PERF_TIER"
    echo ""
}

# ==================== 安装和构建 ====================

install_dependencies() {
    print_header "安装依赖"

    cd "$PROJECT_ROOT"

    if [ ! -d "node_modules" ]; then
        print_step "安装 npm 依赖..."
        npm install
        print_success "依赖安装完成"
    else
        print_info "依赖已存在"
    fi
}

build_project() {
    print_header "构建项目"

    cd "$PROJECT_ROOT"

    print_step "编译 TypeScript..."
    npm run build
    print_success "构建完成"
}

# ==================== PM2 设置 ====================

setup_pm2() {
    print_header "配置 PM2"

    if ! command -v pm2 &> /dev/null; then
        print_step "PM2 未安装"
        read -p "是否全局安装 PM2? [y/n]: " install_pm2
        if [[ $install_pm2 =~ ^[Yy]$ ]]; then
            npm install -g pm2
            print_success "PM2 安装完成"
            USE_PM2=true
        else
            print_info "将使用前台运行模式"
            USE_PM2=false
        fi
    else
        print_success "PM2 已安装"
        USE_PM2=true
    fi
}

# ==================== 启动服务 ====================

start_master() {
    print_header "启动 Master 服务"

    cd "$PROJECT_ROOT"

    # 停止旧服务
    if [ "$USE_PM2" = true ]; then
        pm2 delete benchmark-master 2>/dev/null || true
    fi

    # 启动 Master
    if [ "$USE_PM2" = true ]; then
        print_step "使用 PM2 启动 Master..."
        PORT=$SERVICE_PORT pm2 start "npm start" --name benchmark-master
        pm2 save
    else
        print_step "在后台启动 Master..."
        PORT=$SERVICE_PORT nohup npm start > logs/master.log 2>&1 &
        MASTER_PID=$!
        echo $MASTER_PID > .master.pid
    fi

    sleep 3

    # 验证启动
    if curl -f -s "http://localhost:${SERVICE_PORT}/" > /dev/null 2>&1; then
        print_success "Master 启动成功！"
    else
        print_error "Master 启动失败"
        exit 1
    fi
}

start_worker() {
    print_header "启动 Worker 服务"

    cd "$PROJECT_ROOT"

    # 等待 Master 完全就绪
    print_step "等待 Master 完全启动..."
    sleep 3

    local retry_count=0
    while [ $retry_count -lt 10 ]; do
        if curl -f -s "http://localhost:${SERVICE_PORT}/" > /dev/null 2>&1; then
            print_success "Master 已就绪"
            break
        fi
        sleep 1
        retry_count=$((retry_count + 1))
    done

    # 停止旧服务
    if [ "$USE_PM2" = true ]; then
        pm2 delete benchmark-worker-local 2>/dev/null || true
    fi

    # 环境变量
    export MASTER_URL="http://localhost:${SERVICE_PORT}"
    export WORKER_NAME="$WORKER_NAME"
    export PERFORMANCE_TIER="$PERF_TIER"
    export WORKER_DESCRIPTION="本机 Worker - $OS_NAME $(uname -m)"
    export WORKER_TAGS="local,same-machine,$PERF_TIER"

    # 启动 Worker
    if [ "$USE_PM2" = true ]; then
        print_step "使用 PM2 启动 Worker..."
        pm2 start "npx tsx server/worker-client.ts" --name benchmark-worker-local
        pm2 save
    else
        print_step "在后台启动 Worker..."
        nohup npx tsx server/worker-client.ts > logs/worker.log 2>&1 &
        WORKER_PID=$!
        echo $WORKER_PID > .worker.pid
    fi

    sleep 2
    print_success "Worker 启动成功！"
}

# ==================== 显示结果 ====================

show_result() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║     🎉 同机部署成功！                                 ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📡 访问地址:${NC}"
    echo -e "   本机: ${BLUE}http://localhost:${SERVICE_PORT}${NC}"
    echo -e "   局域网: ${BLUE}http://${LOCAL_IP}:${SERVICE_PORT}${NC}"
    echo ""
    echo -e "${CYAN}🖥️  节点管理:${NC}"
    echo -e "   访问 ${BLUE}http://localhost:${SERVICE_PORT}/workers.html${NC}"
    echo -e "   可在 Web 界面编辑 Worker 配置"
    echo ""
    echo -e "${CYAN}💡 提示:${NC}"
    echo -e "   Master 和 Worker 都在本机运行"
    echo -e "   可以同时处理 Web 管理和测试执行任务"
    echo ""
    echo -e "${CYAN}🎮 管理命令:${NC}"
    if [ "$USE_PM2" = true ]; then
        echo -e "   查看状态: ${YELLOW}pm2 status${NC}"
        echo -e "   查看日志: ${YELLOW}pm2 logs${NC}"
        echo -e "   重启服务: ${YELLOW}pm2 restart all${NC}"
        echo -e "   停止服务: ${YELLOW}pm2 stop all${NC}"
    else
        echo -e "   Master 日志: ${YELLOW}tail -f logs/master.log${NC}"
        echo -e "   Worker 日志: ${YELLOW}tail -f logs/worker.log${NC}"
        echo -e "   停止 Master: ${YELLOW}kill \$(cat .master.pid)${NC}"
        echo -e "   停止 Worker: ${YELLOW}kill \$(cat .worker.pid)${NC}"
    fi
    echo ""
}

# ==================== 主流程 ====================

main() {
    print_banner

    # 环境检测
    print_header "环境检测"
    detect_os
    check_node

    # 配置
    configure

    # 检查端口
    check_port $SERVICE_PORT

    # 安装依赖
    install_dependencies

    # 构建项目
    build_project

    # 设置 PM2
    setup_pm2

    # 启动服务
    start_master
    start_worker

    # 显示结果
    show_result
}

# 执行主流程
main
