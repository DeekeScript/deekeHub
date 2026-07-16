#!/bin/bash

# 快速本地构建脚本（当前平台）
# 用于在 Mac 或 Linux 上快速构建当前架构的镜像

set -e

IMAGE_NAME="deeke/php"
IMAGE_TAG="8.3.10-fpm-alpine"

# 自动检测当前平台
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        PLATFORM="linux/amd64"
        ;;
    arm64|aarch64)
        PLATFORM="linux/arm64"
        ;;
    *)
        PLATFORM="linux/amd64"
        ;;
esac

echo "构建 Docker 镜像..."
echo "平台: $PLATFORM ($ARCH)"
echo "镜像: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

docker build \
    --platform "$PLATFORM" \
    --build-arg TARGETPLATFORM="$PLATFORM" \
    --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
    --file Dockerfile \
    .

echo ""
echo "构建完成!"
echo "运行镜像: docker run --platform $PLATFORM ${IMAGE_NAME}:${IMAGE_TAG}"

