#!/bin/bash

# 在 Mac 上构建 Linux x86_64 镜像的专用脚本
# 适用于在 Mac 上构建用于 Linux 服务器的镜像

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IMAGE_NAME="deeke/php"
IMAGE_TAG="8.3.10-fpm-alpine"
TARGET_PLATFORM="linux/amd64"

# 检测当前系统
CURRENT_ARCH=$(uname -m)
if [ "$CURRENT_ARCH" != "arm64" ] && [ "$CURRENT_ARCH" != "x86_64" ]; then
    echo -e "${RED}错误: 未知的系统架构: $CURRENT_ARCH${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}在 Mac 上构建 Linux x86_64 镜像${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "当前系统: Mac ($CURRENT_ARCH)"
echo "目标平台: $TARGET_PLATFORM (Linux x86_64)"
echo "镜像名称: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行，请启动 Docker Desktop${NC}"
    exit 1
fi

# 提示信息
if [ "$CURRENT_ARCH" = "arm64" ]; then
    echo -e "${YELLOW}提示: 在 Apple Silicon Mac 上构建 x86_64 镜像会使用 QEMU 模拟${NC}"
    echo -e "${YELLOW}构建速度可能较慢，这是正常现象${NC}"
    echo ""
    echo -e "${YELLOW}建议: 如果 Docker Desktop 支持，请启用 'Use Rosetta for x86/amd64 emulation'${NC}"
    echo -e "${YELLOW}位置: Docker Desktop -> Settings -> General -> Use Rosetta${NC}"
    echo ""
fi

# 检查是否使用 buildx（推荐用于跨平台构建）
USE_BUILDX=false
if docker buildx version &> /dev/null; then
    USE_BUILDX=true
    echo -e "${GREEN}检测到 Docker Buildx，将使用 buildx 进行构建（推荐）${NC}"
    
    # 检查是否有可用的 builder
    if ! docker buildx ls | grep -q "default\|multiarch"; then
        echo "设置 buildx builder..."
        docker buildx create --name multiarch-builder --use 2>/dev/null || docker buildx use default
    fi
    echo ""
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}开始构建...${NC}"
echo ""

# 使用 buildx 构建（如果可用）
if [ "$USE_BUILDX" = true ]; then
    echo -e "${YELLOW}使用 Docker Buildx 构建${NC}"
    docker buildx build \
        --platform "$TARGET_PLATFORM" \
        --tag "$FULL_IMAGE_NAME" \
        --load \
        --file Dockerfile \
        .
else
    echo -e "${YELLOW}使用标准 Docker build 构建${NC}"
    docker build \
        --platform "$TARGET_PLATFORM" \
        --build-arg TARGETPLATFORM="$TARGET_PLATFORM" \
        --tag "$FULL_IMAGE_NAME" \
        --file Dockerfile \
        .
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "镜像信息:"
echo "  名称: $FULL_IMAGE_NAME"
echo "  平台: $TARGET_PLATFORM"
echo ""
echo "验证镜像平台:"
echo "  docker inspect $FULL_IMAGE_NAME | grep Architecture"
echo ""
echo "在 Linux 服务器上使用:"
echo "  docker pull $FULL_IMAGE_NAME"
echo "  docker run $FULL_IMAGE_NAME"
echo ""
echo "在 Mac 上测试运行（需要模拟）:"
echo "  docker run --platform $TARGET_PLATFORM $FULL_IMAGE_NAME"

