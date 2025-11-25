#!/bin/bash

################################################################################
# Docker 部署测试脚本
# 用于验证 Docker 配置是否正确
################################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                   ║${NC}"
echo -e "${CYAN}║        Docker 部署测试脚本                         ║${NC}"
echo -e "${CYAN}║                                                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# 检查 Docker 是否安装
print_step "检查 Docker 环境..."

if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    echo ""
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
print_success "Docker 已安装: $DOCKER_VERSION"

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_warning "Docker Compose 未安装"
    echo ""
    echo "建议安装 Docker Compose: https://docs.docker.com/compose/install/"
    echo ""
    read -p "是否继续使用 Docker 命令测试? [y/N]: " continue_test
    if [[ ! "$continue_test" =~ ^[Yy]$ ]]; then
        exit 0
    fi
    USE_COMPOSE=false
else
    COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || docker compose version)
    print_success "Docker Compose 已安装: $COMPOSE_VERSION"
    USE_COMPOSE=true
fi

# 检查 Docker 是否运行
print_step "检查 Docker 服务状态..."

if ! docker info &> /dev/null; then
    print_error "Docker 服务未运行"
    echo ""
    echo "请启动 Docker Desktop 或 Docker 服务"
    exit 1
fi

print_success "Docker 服务正常运行"

# 检查端口是否占用
print_step "检查端口 3000 是否可用..."

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "端口 3000 已被占用"
    echo ""
    read -p "是否终止占用端口的进程? [y/N]: " kill_port
    if [[ "$kill_port" =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "端口已释放"
    else
        print_info "测试取消"
        exit 0
    fi
else
    print_success "端口 3000 可用"
fi

# 检查必要文件
print_step "检查 Docker 配置文件..."

if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile 不存在"
    exit 1
fi
print_success "Dockerfile 存在"

if [ ! -f "docker-compose.yml" ]; then
    print_warning "docker-compose.yml 不存在"
    if [ "$USE_COMPOSE" = true ]; then
        print_error "无法使用 Docker Compose"
        exit 1
    fi
else
    print_success "docker-compose.yml 存在"
fi

if [ ! -f ".dockerignore" ]; then
    print_warning ".dockerignore 不存在"
else
    print_success ".dockerignore 存在"
fi

echo ""
print_info "配置文件检查完成"
echo ""

# 询问是否构建镜像
echo "接下来可以进行以下测试:"
echo "  1) 仅验证 Dockerfile 语法"
echo "  2) 构建 Docker 镜像（需要几分钟）"
echo "  3) 构建并运行容器（完整测试）"
echo "  4) 使用 Docker Compose 部署"
echo ""
read -p "请选择测试类型 [1-4]: " test_type

case $test_type in
    1)
        print_step "验证 Dockerfile 语法..."
        if docker build --no-cache --target builder -t benchmark-web-test . > /dev/null 2>&1; then
            print_success "Dockerfile 语法正确"
        else
            print_error "Dockerfile 语法错误"
            exit 1
        fi
        ;;
    2)
        print_step "构建 Docker 镜像..."
        echo ""
        if docker build -t benchmark-web:test .; then
            echo ""
            print_success "镜像构建成功"
            echo ""
            print_info "镜像信息:"
            docker images benchmark-web:test
        else
            echo ""
            print_error "镜像构建失败"
            exit 1
        fi
        ;;
    3)
        print_step "构建 Docker 镜像..."
        echo ""
        if docker build -t benchmark-web:test .; then
            echo ""
            print_success "镜像构建成功"

            print_step "启动容器..."
            docker run -d \
                --name benchmark-web-test \
                -p 3000:3000 \
                benchmark-web:test

            sleep 5

            print_step "检查容器状态..."
            if docker ps | grep benchmark-web-test > /dev/null; then
                print_success "容器正在运行"

                print_step "测试健康检查..."
                sleep 10

                if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                    print_success "健康检查通过"
                    echo ""
                    print_info "测试成功！服务已启动："
                    echo "   - 访问地址: http://localhost:3000"
                    echo ""
                    read -p "按任意键停止并删除测试容器..."
                else
                    print_warning "健康检查失败，查看日志："
                    docker logs benchmark-web-test
                fi

                print_step "清理测试容器..."
                docker stop benchmark-web-test > /dev/null 2>&1
                docker rm benchmark-web-test > /dev/null 2>&1
                docker rmi benchmark-web:test > /dev/null 2>&1
                print_success "清理完成"
            else
                print_error "容器启动失败"
                docker logs benchmark-web-test
                docker rm benchmark-web-test > /dev/null 2>&1
                exit 1
            fi
        else
            print_error "镜像构建失败"
            exit 1
        fi
        ;;
    4)
        if [ "$USE_COMPOSE" = false ]; then
            print_error "Docker Compose 未安装"
            exit 1
        fi

        print_step "使用 Docker Compose 部署..."
        echo ""

        if docker-compose up -d 2>/dev/null || docker compose up -d; then
            echo ""
            print_success "服务启动成功"

            sleep 5

            print_step "检查服务状态..."
            docker-compose ps 2>/dev/null || docker compose ps

            echo ""
            print_step "测试健康检查..."
            sleep 10

            if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                print_success "健康检查通过"
                echo ""
                print_info "部署成功！服务已启动："
                echo "   - 访问地址: http://localhost:3000"
                echo ""
                print_warning "提示: 使用以下命令管理服务："
                echo "   - 查看日志: docker-compose logs -f"
                echo "   - 停止服务: docker-compose down"
                echo "   - 重启服务: docker-compose restart"
            else
                print_warning "健康检查失败，查看日志："
                docker-compose logs 2>/dev/null || docker compose logs
            fi
        else
            print_error "服务启动失败"
            exit 1
        fi
        ;;
    *)
        print_info "取消测试"
        exit 0
        ;;
esac

echo ""
print_success "Docker 测试完成！"
echo ""
