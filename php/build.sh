#!/bin/bash

# Docker 镜像构建脚本
# 支持 Mac (ARM64) 和 Linux (x86_64/ARM64) 多架构构建

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
IMAGE_NAME="deeke/php"
IMAGE_TAG="8.3.10-fpm-alpine"
BUILD_PLATFORM=""  # 空值表示自动检测
PUSH_IMAGE=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --platform)
            BUILD_PLATFORM="$2"
            shift 2
            ;;
        --push)
            PUSH_IMAGE=true
            shift
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --tag TAG        镜像标签 (默认: 8.3.10-fpm-alpine)"
            echo "  --platform ARCH  目标平台 (linux/amd64, linux/arm64, 或留空自动检测)"
            echo "  --push           构建后推送到仓库"
            echo "  --help           显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  $0                                    # 在当前平台构建"
            echo "  $0 --platform linux/amd64            # 构建 x86_64 镜像"
            echo "  $0 --platform linux/arm64            # 构建 ARM64 镜像"
            echo "  $0 --platform linux/amd64,linux/arm64 --push  # 构建多架构并推送"
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 未知参数 $1${NC}"
            exit 1
            ;;
    esac
done

# 检测当前平台
detect_platform() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "linux/amd64"
            ;;
        arm64|aarch64)
            echo "linux/arm64"
            ;;
        *)
            echo "linux/amd64"  # 默认
            ;;
    esac
}

# 如果没有指定平台，自动检测
if [ -z "$BUILD_PLATFORM" ]; then
    BUILD_PLATFORM=$(detect_platform)
    echo -e "${YELLOW}自动检测到平台: $BUILD_PLATFORM${NC}"
    echo -e "${YELLOW}提示: 如需构建 Linux x86_64 镜像，请使用: $0 --platform linux/amd64${NC}"
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}开始构建 Docker 镜像...${NC}"
echo "镜像名称: $FULL_IMAGE_NAME"
echo "目标平台: $BUILD_PLATFORM"
echo ""

# 检查是否支持多架构构建
if [[ "$BUILD_PLATFORM" == *","* ]]; then
    # 多架构构建（需要 buildx）
    echo -e "${YELLOW}使用多架构构建模式${NC}"
    
    # 检查 buildx 是否可用
    if ! docker buildx version &> /dev/null; then
        echo -e "${RED}错误: 需要 Docker Buildx 来构建多架构镜像${NC}"
        echo "请运行: docker buildx create --use"
        exit 1
    fi
    
    # 创建并使用 buildx builder（如果不存在）
    if ! docker buildx inspect multiarch-builder &> /dev/null; then
        echo "创建 buildx builder..."
        docker buildx create --name multiarch-builder --use
    else
        docker buildx use multiarch-builder
    fi
    
    # 构建并推送多架构镜像
    # 注意：buildx 会自动设置 TARGETPLATFORM，但为了兼容性也显式传递
    docker buildx build \
        --platform "$BUILD_PLATFORM" \
        --tag "$FULL_IMAGE_NAME" \
        --file Dockerfile \
        .
    
    if [ "$PUSH_IMAGE" = true ]; then
        echo -e "${GREEN}推送多架构镜像...${NC}"
        docker buildx build \
            --platform "$BUILD_PLATFORM" \
            --tag "$FULL_IMAGE_NAME" \
            --push \
            --file Dockerfile \
            .
    fi
else
    # 单架构构建
    echo -e "${YELLOW}使用单架构构建模式${NC}"
    
    # 检查是否在 Mac 上构建 Linux 镜像（跨平台）
    CURRENT_ARCH=$(uname -m)
    if [ "$CURRENT_ARCH" = "arm64" ] && [ "$BUILD_PLATFORM" = "linux/amd64" ]; then
        echo -e "${YELLOW}提示: 在 Apple Silicon Mac 上构建 x86_64 镜像，将使用 QEMU 模拟${NC}"
        echo -e "${YELLOW}建议使用 buildx 以获得更好的性能: docker buildx build --platform $BUILD_PLATFORM ...${NC}"
        echo ""
    fi
    
    # 尝试使用 buildx（如果可用且是跨平台构建）
    if docker buildx version &> /dev/null && [ "$CURRENT_ARCH" = "arm64" ] && [ "$BUILD_PLATFORM" = "linux/amd64" ]; then
        echo -e "${GREEN}使用 Docker Buildx 进行跨平台构建${NC}"
        docker buildx build \
            --platform "$BUILD_PLATFORM" \
            --tag "$FULL_IMAGE_NAME" \
            --load \
            --file Dockerfile \
            .
    else
        docker build \
            --platform "$BUILD_PLATFORM" \
            --build-arg TARGETPLATFORM="$BUILD_PLATFORM" \
            --tag "$FULL_IMAGE_NAME" \
            --file Dockerfile \
            .
    fi
    
    if [ "$PUSH_IMAGE" = true ]; then
        echo -e "${GREEN}推送镜像...${NC}"
        docker push "$FULL_IMAGE_NAME"
    fi
fi

echo ""
echo -e "${GREEN}构建完成!${NC}"
echo "镜像: $FULL_IMAGE_NAME"
echo "平台: $BUILD_PLATFORM"
echo ""
echo "运行镜像:"
echo "  docker run --platform $BUILD_PLATFORM $FULL_IMAGE_NAME"

