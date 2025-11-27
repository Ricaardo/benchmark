#!/bin/bash

################################################################################
# 🚀 单机一键部署脚本
# 功能: 在当前机器上快速部署 Master 或 Worker 节点
# 支持: Linux / macOS / Windows WSL
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
CONFIG_FILE="${PROJECT_ROOT}/.deploy-local.json"

# ==================== 工具函数 ====================

print_banner() {
    clear
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                        ║${NC}"
    echo -e "${CYAN}║     🚀 Benchmark 单机一键部署                          ║${NC}"
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
        MINGW*|MSYS*|CYGWIN*)
            OS_NAME="Git Bash"
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
        echo "请先安装 Node.js >= 18.0.0:"
        echo ""
        if [[ "$OS_NAME" == "macOS" ]]; then
            echo "  brew install node"
        elif [[ "$OS_NAME" == "Linux" ]] || [[ "$OS_NAME" == "WSL" ]]; then
            echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "  sudo apt-get install -y nodejs"
        fi
        echo ""
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

# ==================== 角色选择 ====================

select_role() {
    print_header "选择部署角色"

    echo "请选择要部署的角色:"
    echo ""
    echo "  1) Master 节点 (主控服务器 + Web UI)"
    echo "  2) Worker 节点 (测试执行节点)"
    echo "  3) Master + Worker (同机部署)"
    echo "  4) 取消"
    echo ""

    while true; do
        read -p "请输入选项 [1-4]: " role_choice
        case $role_choice in
            1)
                DEPLOY_ROLE="master"
                break
                ;;
            2)
                DEPLOY_ROLE="worker"
                break
                ;;
            3)
                DEPLOY_ROLE="both"
                break
                ;;
            4)
                print_info "已取消"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
    done
}

# ==================== Master 配置 ====================

configure_master() {
    print_header "配置 Master 节点"

    # 服务端口
    read -p "Web 服务端口 [默认: 3000]: " service_port
    service_port=${service_port:-3000}

    # 检测本机 IP
    if [[ "$OS_NAME" == "macOS" ]]; then
        local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
    else
        local_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
    fi

    print_info "检测到本机 IP: $local_ip"

    # 保存配置
    cat > "$CONFIG_FILE" <<EOF
{
  "role": "master",
  "service_port": $service_port,
  "local_ip": "$local_ip",
  "configured_at": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

    print_success "Master 配置已保存"
}

# ==================== Worker 配置 ====================

configure_worker() {
    print_header "配置 Worker 节点"

    # 自动扫描局域网寻找 Master
    echo ""
    print_step "正在扫描局域网，寻找 Master 服务器..."
    echo ""

    local found_masters=()
    local local_subnet=""

    # 获取本机所在网段
    if [[ "$OS_NAME" == "macOS" ]]; then
        local_subnet=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
    else
        local_subnet=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
    fi

    if [ -n "$local_subnet" ]; then
        # 提取网段前缀 (例如: 192.168.1)
        local subnet_prefix=$(echo "$local_subnet" | cut -d'.' -f1-3)

        print_info "检测到本机网段: ${subnet_prefix}.x"
        print_info "正在扫描常见 IP..."

        # 扫描常见的 IP 地址 (优化版，只扫描常用段)
        local common_ips=("100" "101" "102" "103" "104" "105" "1" "2" "10" "20" "50")

        for ip_suffix in "${common_ips[@]}"; do
            local test_ip="${subnet_prefix}.${ip_suffix}"
            if curl -f -s --max-time 1 "http://${test_ip}:3000/" > /dev/null 2>&1; then
                found_masters+=("${test_ip}:3000")
                echo -e "  ${GREEN}✓${NC} 发现 Master: http://${test_ip}:3000"
            fi
        done
    fi

    # 显示扫描结果
    echo ""
    if [ ${#found_masters[@]} -gt 0 ]; then
        print_success "找到 ${#found_masters[@]} 个 Master 服务器"
        echo ""
        echo "请选择要连接的 Master:"
        for i in "${!found_masters[@]}"; do
            echo "  $((i+1))) http://${found_masters[$i]}"
        done
        echo "  $((${#found_masters[@]}+1))) 手动输入其他地址"
        echo ""

        while true; do
            read -p "请选择 [1-$((${#found_masters[@]}+1))]: " master_choice
            if [[ "$master_choice" =~ ^[0-9]+$ ]] && [ "$master_choice" -ge 1 ] && [ "$master_choice" -le $((${#found_masters[@]}+1)) ]; then
                if [ "$master_choice" -le "${#found_masters[@]}" ]; then
                    # 使用扫描到的 Master
                    local selected="${found_masters[$((master_choice-1))]}"
                    master_ip=$(echo "$selected" | cut -d':' -f1)
                    master_port=$(echo "$selected" | cut -d':' -f2)
                    MASTER_URL="http://${selected}"
                    print_success "已选择: $MASTER_URL"
                    break
                else
                    # 手动输入
                    print_info "手动输入 Master 地址"
                    break
                fi
            else
                print_error "无效选项"
            fi
        done
    else
        print_warning "未找到 Master 服务器（可能不在同一网段）"
        echo ""
    fi

    # 如果没有找到或选择手动输入
    if [ -z "$MASTER_URL" ]; then
        echo ""
        echo "请手动输入 Master 服务器信息:"
        echo ""

        while true; do
            read -p "Master IP 地址: " master_ip
            read -p "Master 端口 [默认: 3000]: " master_port
            master_port=${master_port:-3000}

            MASTER_URL="http://${master_ip}:${master_port}"

            print_step "测试连接到 Master: $MASTER_URL"

            if curl -f -s --max-time 5 "${MASTER_URL}/" > /dev/null 2>&1; then
                print_success "连接成功！"
                break
            else
                print_error "无法连接到 Master"
                echo ""
                read -p "是否重新输入？[y/n]: " retry
                if [[ ! $retry =~ ^[Yy]$ ]]; then
                    print_warning "将使用此配置继续（可能无法连接）"
                    break
                fi
            fi
        done
    fi

    # Worker 名称
    default_name="Worker-$(hostname)"
    read -p "Worker 名称 [默认: $default_name]: " worker_name
    worker_name=${worker_name:-$default_name}

    # 性能等级
    echo ""
    echo "请选择性能等级:"
    echo "  1) high   - 高配 (16核+, 32GB+)"
    echo "  2) medium - 中配 (4-8核, 8-16GB) [推荐]"
    echo "  3) low    - 低配 (2-4核, 4-8GB)"
    echo "  4) custom - 自定义"
    echo ""
    echo -e "${BLUE}💡 提示: 部署后可在 Web 界面随时修改此配置${NC}"
    echo ""

    while true; do
        read -p "请选择 [1-4]: " perf_choice
        case $perf_choice in
            1) performance_tier="high"; break;;
            2) performance_tier="medium"; break;;
            3) performance_tier="low"; break;;
            4) performance_tier="custom"; break;;
            *) print_error "无效选项";;
        esac
    done

    # 描述信息
    default_desc="$(uname -m) - $OS_NAME"
    read -p "描述信息 [默认: $default_desc]: " worker_desc
    worker_desc=${worker_desc:-$default_desc}

    # 标签
    read -p "标签 (逗号分隔) [可选]: " worker_tags

    # 保存配置
    cat > "$CONFIG_FILE" <<EOF
{
  "role": "worker",
  "master_url": "$MASTER_URL",
  "worker_name": "$worker_name",
  "performance_tier": "$performance_tier",
  "description": "$worker_desc",
  "tags": "$worker_tags",
  "configured_at": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

    print_success "Worker 配置已保存"
}

# ==================== 安装依赖 ====================

install_dependencies() {
    print_header "安装依赖"

    cd "$PROJECT_ROOT"

    if [ ! -d "node_modules" ]; then
        print_step "安装 npm 依赖..."
        npm install
        print_success "依赖安装完成"
    else
        print_info "依赖已存在，跳过安装"
        read -p "是否重新安装依赖？[y/n]: " reinstall
        if [[ $reinstall =~ ^[Yy]$ ]]; then
            npm install
            print_success "依赖重新安装完成"
        fi
    fi
}

# ==================== 构建项目 ====================

build_project() {
    print_header "构建项目"

    cd "$PROJECT_ROOT"

    print_step "编译 TypeScript..."
    npm run build
    print_success "构建完成"
}

# ==================== 安装 PM2 ====================

setup_pm2() {
    print_header "配置 PM2"

    if ! command -v pm2 &> /dev/null; then
        print_step "安装 PM2..."
        read -p "是否全局安装 PM2？[y/n]: " install_pm2
        if [[ $install_pm2 =~ ^[Yy]$ ]]; then
            npm install -g pm2
            print_success "PM2 安装完成"
            USE_PM2=true
        else
            print_info "跳过 PM2，将使用 npm start"
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

    local service_port=$(jq -r '.service_port' "$CONFIG_FILE" 2>/dev/null || echo "3000")

    cd "$PROJECT_ROOT"

    # 停止旧服务
    if [ "$USE_PM2" = true ]; then
        pm2 delete benchmark-master 2>/dev/null || true
    else
        pkill -f "node.*server/index" 2>/dev/null || true
    fi

    # 启动新服务
    if [ "$USE_PM2" = true ]; then
        print_step "使用 PM2 启动 Master..."
        # 创建临时启动脚本
        cat > /tmp/start-master.sh <<EOF
#!/bin/bash
export PORT=$service_port
npm start
EOF
        chmod +x /tmp/start-master.sh
        pm2 start /tmp/start-master.sh --name benchmark-master
        pm2 save

        print_info "设置开机自启动"
        pm2 startup || print_warning "需要管理员权限设置开机自启"
    else
        print_step "使用 npm 启动 Master..."
        PORT=$service_port nohup npm start > logs/master.log 2>&1 &
        echo $! > .master.pid
    fi

    sleep 3

    # 验证
    local local_ip=$(jq -r '.local_ip' "$CONFIG_FILE" 2>/dev/null || echo "127.0.0.1")
    if curl -f -s "http://localhost:${service_port}/" > /dev/null 2>&1; then
        print_success "Master 启动成功！"
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                    部署成功！                          ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}📡 访问地址:${NC}"
        echo -e "   本机: ${BLUE}http://localhost:${service_port}${NC}"
        echo -e "   局域网: ${BLUE}http://${local_ip}:${service_port}${NC}"
        echo ""
        echo -e "${CYAN}🖥️  节点管理:${NC}"
        echo -e "   访问 ${BLUE}http://localhost:${service_port}/workers.html${NC}"
        echo -e "   可在 Web 界面编辑节点配置（性能等级、描述等）"
        echo ""
        echo -e "${CYAN}🎮 管理命令:${NC}"
        if [ "$USE_PM2" = true ]; then
            echo -e "   查看状态: ${YELLOW}pm2 status${NC}"
            echo -e "   查看日志: ${YELLOW}pm2 logs benchmark-master${NC}"
            echo -e "   重启服务: ${YELLOW}pm2 restart benchmark-master${NC}"
            echo -e "   停止服务: ${YELLOW}pm2 stop benchmark-master${NC}"
        else
            echo -e "   查看日志: ${YELLOW}tail -f logs/master.log${NC}"
            echo -e "   停止服务: ${YELLOW}kill \$(cat .master.pid)${NC}"
        fi
        echo ""
        echo -e "${CYAN}📋 下一步:${NC}"
        echo -e "   在其他机器上运行此脚本，选择 Worker 模式"
        echo -e "   Worker 连接到: ${BLUE}http://${local_ip}:${service_port}${NC}"
        echo ""
    else
        print_error "Master 启动失败，请检查日志"
    fi
}

start_worker() {
    print_header "启动 Worker 服务"

    local master_url=$(jq -r '.master_url' "$CONFIG_FILE")
    local worker_name=$(jq -r '.worker_name' "$CONFIG_FILE")
    local perf_tier=$(jq -r '.performance_tier' "$CONFIG_FILE")
    local description=$(jq -r '.description' "$CONFIG_FILE")
    local tags=$(jq -r '.tags' "$CONFIG_FILE")

    cd "$PROJECT_ROOT"

    # 停止旧服务
    if [ "$USE_PM2" = true ]; then
        pm2 delete "benchmark-worker-${perf_tier}" 2>/dev/null || true
    else
        pkill -f "worker-client" 2>/dev/null || true
    fi

    # 环境变量
    export MASTER_URL="$master_url"
    export WORKER_NAME="$worker_name"
    export PERFORMANCE_TIER="$perf_tier"
    export WORKER_DESCRIPTION="$description"
    export WORKER_TAGS="$tags"

    # 启动新服务
    if [ "$USE_PM2" = true ]; then
        print_step "使用 PM2 启动 Worker..."
        pm2 start "npx tsx server/worker-client.ts" --name "benchmark-worker-${perf_tier}"
        pm2 save

        print_info "设置开机自启动"
        pm2 startup || print_warning "需要管理员权限设置开机自启"
    else
        print_step "使用 npm 启动 Worker..."
        nohup npx tsx server/worker-client.ts > logs/worker.log 2>&1 &
        echo $! > .worker.pid
    fi

    sleep 3

    print_success "Worker 启动成功！"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    部署成功！                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🔧 Worker 信息:${NC}"
    echo -e "   名称: ${BLUE}$worker_name${NC}"
    echo -e "   性能等级: ${BLUE}$perf_tier${NC}"
    echo ""
    echo -e "${CYAN}💡 提示:${NC}"
    echo -e "   可在 Master Web 界面修改节点配置"
    echo -e "   访问: ${BLUE}${MASTER_URL}/workers.html${NC}"
    echo -e "   即使 Worker 重启，配置也会保留"
    echo -e "   连接到: ${BLUE}$master_url${NC}"
    echo ""
    echo -e "${CYAN}🎮 管理命令:${NC}"
    if [ "$USE_PM2" = true ]; then
        echo -e "   查看状态: ${YELLOW}pm2 status${NC}"
        echo -e "   查看日志: ${YELLOW}pm2 logs benchmark-worker-${perf_tier}${NC}"
        echo -e "   重启服务: ${YELLOW}pm2 restart benchmark-worker-${perf_tier}${NC}"
        echo -e "   停止服务: ${YELLOW}pm2 stop benchmark-worker-${perf_tier}${NC}"
    else
        echo -e "   查看日志: ${YELLOW}tail -f logs/worker.log${NC}"
        echo -e "   停止服务: ${YELLOW}kill \$(cat .worker.pid)${NC}"
    fi
    echo ""
    echo -e "${CYAN}💡 提示:${NC}"
    echo -e "   访问 Master Web UI 查看此 Worker 是否已连接"
    echo ""
}

# ==================== 重新配置 ====================

reconfigure() {
    if [ -f "$CONFIG_FILE" ]; then
        print_warning "检测到已有配置"
        cat "$CONFIG_FILE" | jq '.' 2>/dev/null || cat "$CONFIG_FILE"
        echo ""
        read -p "是否重新配置？[y/n]: " reconfig
        if [[ ! $reconfig =~ ^[Yy]$ ]]; then
            DEPLOY_ROLE=$(jq -r '.role' "$CONFIG_FILE" 2>/dev/null)
            return
        fi
    fi

    select_role

    if [ "$DEPLOY_ROLE" = "master" ]; then
        configure_master
    elif [ "$DEPLOY_ROLE" = "worker" ]; then
        configure_worker
    else
        # both: 先配置 Master，Worker 自动连接本机
        configure_master
        local master_port=$(jq -r '.service_port' "$CONFIG_FILE" 2>/dev/null || echo "3000")

        # 自动配置 Worker
        local worker_name="Worker-$(hostname)"
        local performance_tier="medium"
        local description="本机 Worker - $OS_NAME"

        # 保存 both 配置
        cat > "$CONFIG_FILE" <<EOF
{
  "role": "both",
  "service_port": $master_port,
  "local_ip": "$(jq -r '.local_ip' "$CONFIG_FILE" 2>/dev/null)",
  "worker_name": "$worker_name",
  "performance_tier": "$performance_tier",
  "worker_description": "$description",
  "configured_at": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF
        print_success "同机部署配置已保存"
    fi
}

# ==================== 主流程 ====================

main() {
    print_banner

    print_header "环境检测"
    detect_os
    check_node

    # 配置
    reconfigure

    # 依赖安装
    install_dependencies

    # 构建
    build_project

    # PM2
    setup_pm2

    # 启动服务
    if [ "$DEPLOY_ROLE" = "master" ]; then
        start_master
    elif [ "$DEPLOY_ROLE" = "worker" ]; then
        start_worker
    else
        # both: 先启动 Master，再启动 Worker
        start_master
        echo ""
        print_header "启动 Worker 服务 (本机)"

        local master_port=$(jq -r '.service_port' "$CONFIG_FILE")
        local worker_name=$(jq -r '.worker_name' "$CONFIG_FILE")
        local perf_tier=$(jq -r '.performance_tier' "$CONFIG_FILE")
        local description=$(jq -r '.worker_description' "$CONFIG_FILE")

        cd "$PROJECT_ROOT"

        # 环境变量
        export MASTER_URL="http://localhost:${master_port}"
        export WORKER_NAME="$worker_name"
        export PERFORMANCE_TIER="$perf_tier"
        export WORKER_DESCRIPTION="$description"
        export WORKER_TAGS="local,same-machine"

        # 等待 Master 启动
        print_step "等待 Master 完全启动..."
        sleep 5

        # 验证 Master 是否启动成功
        local retry_count=0
        while [ $retry_count -lt 10 ]; do
            if curl -f -s "http://localhost:${master_port}/" > /dev/null 2>&1; then
                print_success "Master 已就绪"
                break
            fi
            sleep 1
            retry_count=$((retry_count + 1))
        done

        # 启动 Worker
        if [ "$USE_PM2" = true ]; then
            print_step "使用 PM2 启动 Worker..."
            pm2 start "npx tsx server/worker-client.ts" --name "benchmark-worker-local"
            pm2 save
        else
            print_step "启动 Worker..."
            nohup npx tsx server/worker-client.ts > logs/worker-local.log 2>&1 &
            echo $! > .worker-local.pid
        fi

        sleep 2

        print_success "Worker 已启动（连接到本机 Master）"
        echo ""
        echo -e "${CYAN}💡 提示:${NC}"
        echo -e "   Master 和 Worker 都在本机运行"
        echo -e "   可以同时处理 Web 管理和测试执行任务"
        echo ""
    fi
}

# 执行主流程
main
