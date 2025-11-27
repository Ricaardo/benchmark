#!/bin/bash

################################################################################
# 🚀 Benchmark Web Server - 智能一键部署脚本
# 适用平台: macOS / Linux / WSL
# 功能: 自动检测环境、安装依赖、启动服务
################################################################################

set -e  # 遇到错误立即退出

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==================== 工具函数 ====================

print_header() {
    echo ""
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}"
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
    echo -e "${CYAN}➤ $1${NC}"
}

# ==================== 环境检测 ====================

check_os() {
    print_step "检测操作系统..."

    OS_TYPE=$(uname -s)
    case "$OS_TYPE" in
        Darwin*)
            OS_NAME="macOS"
            BROWSER_CMD="open"
            ;;
        Linux*)
            OS_NAME="Linux"
            BROWSER_CMD="xdg-open"
            # 检测是否为WSL
            if grep -qi microsoft /proc/version 2>/dev/null; then
                OS_NAME="WSL (Windows Subsystem for Linux)"
                BROWSER_CMD="wslview"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS_NAME="Git Bash (Windows)"
            BROWSER_CMD="start"
            ;;
        *)
            OS_NAME="Unknown"
            BROWSER_CMD="xdg-open"
            ;;
    esac

    print_success "检测到操作系统: $OS_NAME"
}

check_node() {
    print_step "检查 Node.js 环境..."

    if ! command -v node &> /dev/null; then
        print_error "未检测到 Node.js"
        echo ""
        echo "请先安装 Node.js >= 18.0.0:"
        echo ""
        if [[ "$OS_NAME" == "macOS" ]]; then
            echo "  方式1 (推荐): brew install node"
            echo "  方式2: 访问 https://nodejs.org 下载安装"
        else
            echo "  方式1: 访问 https://nodejs.org 下载安装"
            echo "  方式2: 使用包管理器:"
            echo "    Ubuntu/Debian: sudo apt install nodejs npm"
            echo "    CentOS/RHEL:   sudo yum install nodejs npm"
        fi
        echo ""
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//')
    NPM_VERSION=$(npm -v)

    # 检查 Node 版本（要求 >= 18.0.0）
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低: v$NODE_VERSION (需要 >= v18.0.0)"
        echo ""
        echo "请升级 Node.js:"
        if [[ "$OS_NAME" == "macOS" ]]; then
            echo "  brew upgrade node"
        else
            echo "  访问 https://nodejs.org 下载最新 LTS 版本"
        fi
        echo ""
        exit 1
    fi

    print_success "Node.js: v$NODE_VERSION"
    print_success "npm: v$NPM_VERSION"
}

check_port() {
    print_step "检查端口 3000 是否可用..."

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 3000 已被占用"
        echo ""
        echo "请选择操作:"
        echo "  1) 终止占用端口的进程"
        echo "  2) 取消部署"
        echo ""
        read -p "请输入选项 [1/2]: " choice

        if [ "$choice" == "1" ]; then
            print_step "终止占用端口 3000 的进程..."
            lsof -ti:3000 | xargs kill -9 2>/dev/null || true
            sleep 1
            print_success "端口已释放"
        else
            print_info "部署已取消"
            exit 0
        fi
    else
        print_success "端口 3000 可用"
    fi
}

# ==================== 依赖安装 ====================

install_dependencies() {
    print_step "检查项目依赖..."

    if [ ! -d "node_modules" ]; then
        print_warning "未检测到 node_modules，开始安装依赖..."
        echo ""

        # 尝试使用 npm ci (更快)，如果失败则使用 npm install
        if [ -f "package-lock.json" ]; then
            print_info "使用 npm ci 安装依赖 (更快)..."
            npm ci || npm install
        else
            print_info "使用 npm install 安装依赖..."
            npm install
        fi

        echo ""
        print_success "依赖安装完成"
    else
        print_success "依赖已安装"

        # 检查是否需要更新依赖
        if [ -f "package-lock.json" ]; then
            if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
                print_warning "检测到 package.json 更新，建议更新依赖"
                read -p "是否更新依赖? [y/N]: " update_deps
                if [[ "$update_deps" =~ ^[Yy]$ ]]; then
                    npm install
                    print_success "依赖已更新"
                fi
            fi
        fi
    fi
}

handle_benchmark_package() {
    print_step "检查 @bilibili-player/benchmark 包..."

    # 检查是否已安装
    if npm list @bilibili-player/benchmark >/dev/null 2>&1; then
        print_success "@bilibili-player/benchmark 已安装"
        return
    fi

    print_warning "@bilibili-player/benchmark 包未安装 (这是正常的)"
    echo ""
    echo "📝 说明:"
    echo "  • 这是 B站内部私有包，无法从公共 npm 获取"
    echo "  • 不影响 Web 服务器运行"
    echo "  • 你仍然可以使用配置管理功能"
    echo "  • 但无法运行实际的性能测试"
    echo ""
    echo "💡 如果需要运行测试，请查看: INSTALL.md"
    echo ""
}

# ==================== 编译构建 ====================

build_project() {
    print_step "编译 TypeScript 代码..."

    if [ ! -d "dist" ] || [ "server/index.ts" -nt "dist/index.js" ] 2>/dev/null; then
        npm run build
        print_success "编译完成"
    else
        print_success "代码已是最新"
    fi
}

# ==================== 启动服务 ====================

start_server() {
    print_step "启动服务器..."
    echo ""

    # 在后台启动服务器
    npm run dev &
    SERVER_PID=$!

    # 等待服务器启动
    print_info "等待服务器启动..."
    sleep 3

    # 检查服务器是否成功启动
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "服务器启动失败"
        echo ""
        echo "请检查错误日志并手动运行: npm run dev"
        exit 1
    fi

    # 验证端口是否正常监听
    if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "服务器可能未正常启动，请等待..."
        sleep 2
    fi

    print_success "服务器已启动 (PID: $SERVER_PID)"
}

open_browser() {
    print_step "打开浏览器..."

    URL="http://localhost:3000"

    # 等待服务器完全就绪
    sleep 2

    # 尝试打开浏览器
    if command -v $BROWSER_CMD &> /dev/null; then
        $BROWSER_CMD "$URL" 2>/dev/null &
        print_success "浏览器已打开"
    else
        print_warning "无法自动打开浏览器"
        echo ""
        echo "请手动访问: $URL"
    fi
}

# ==================== 显示信息 ====================

show_success_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}║     🎉 部署成功！服务器正在运行中...         ║${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📍 访问地址:${NC}"
    echo -e "   ${BLUE}http://localhost:3000${NC}           - 主页"
    echo -e "   ${BLUE}http://localhost:3000/config.html${NC}  - 配置管理"
    echo -e "   ${BLUE}http://localhost:3000/workers.html${NC} - 节点管理"
    echo ""
    echo -e "${CYAN}🎮 功能快速入口:${NC}"
    echo -e "   • 配置测试用例"
    echo -e "   • 管理 Worker 节点（编辑性能等级、描述等）"
    echo -e "   • 管理测试任务"
    echo -e "   • 查看实时输出"
    echo -e "   • 查看测试报告"
    echo ""
    echo -e "${CYAN}📚 文档:${NC}"
    echo -e "   • QUICKSTART.md          - 快速开始指南"
    echo -e "   • CONFIG_PRESETS_GUIDE.md - 配置预设指南"
    echo -e "   • BILIBILI_LIVE_PRESETS.md - B站直播预设"
    echo ""
    echo -e "${CYAN}🛑 停止服务:${NC}"
    echo -e "   按 ${YELLOW}Ctrl+C${NC} 停止服务器"
    echo ""
    echo -e "${YELLOW}⚠️  提示: 服务器正在前台运行，关闭此终端窗口将停止服务${NC}"
    echo ""
}

cleanup_on_exit() {
    echo ""
    print_info "正在停止服务器..."

    # 终止所有相关进程
    pkill -P $$ 2>/dev/null || true

    print_success "服务器已停止"
    exit 0
}

# ==================== 主流程 ====================

main() {
    # 显示欢迎信息
    clear
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                   ║${NC}"
    echo -e "${CYAN}║   🚀 Benchmark Web Server - 一键部署脚本          ║${NC}"
    echo -e "${CYAN}║                                                   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""

    # 注册退出处理
    trap cleanup_on_exit INT TERM

    # 执行部署步骤
    print_header "1️⃣  环境检测"
    check_os
    check_node
    check_port

    print_header "2️⃣  依赖管理"
    install_dependencies
    handle_benchmark_package

    print_header "3️⃣  编译构建"
    build_project

    print_header "4️⃣  启动服务"
    start_server
    open_browser

    # 显示成功信息
    show_success_info

    # 保持运行，等待用户中断
    wait
}

# 执行主流程
main
