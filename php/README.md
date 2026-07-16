# PHP Docker 镜像构建说明

## 问题解决

此 Dockerfile 已修改以支持多架构构建，解决了在 Mac (ARM64) 和 Linux 服务器上的架构不匹配问题。

### 错误原因
`exec format error` 通常是因为：
- 在 ARM64 Mac 上运行了 x86_64 镜像
- 在 x86_64 Linux 上运行了 ARM64 镜像
- 镜像与运行环境架构不匹配

## 使用方法

### 方法 1: 在 Mac 上构建 Linux 镜像（推荐）

如果你在 Mac 上需要构建用于 Linux 服务器的 x86_64 镜像：

```bash
./build-for-linux.sh
```

这个脚本专门用于在 Mac 上构建 Linux x86_64 镜像，会自动：
- 检测当前系统架构
- 使用 Docker Buildx（如果可用）以获得更好的性能
- 提供构建进度和提示信息

### 方法 2: 快速本地构建

在当前平台（Mac 或 Linux）上快速构建当前架构的镜像：

```bash
./build-local.sh
```

这会自动检测当前平台并构建对应架构的镜像。

### 方法 3: 指定平台构建

使用 `build.sh` 脚本指定目标平台：

```bash
# 构建 x86_64 镜像（适用于 Linux 服务器）
./build.sh --platform linux/amd64

# 构建 ARM64 镜像（适用于 Apple Silicon Mac）
./build.sh --platform linux/arm64

# 构建多架构镜像（需要 Docker Buildx）
./build.sh --platform linux/amd64,linux/arm64 --push
```

### 方法 4: 直接使用 Docker 命令

```bash
# 在 Mac (ARM64) 上构建
docker build --platform linux/arm64 -t deeke/php:8.3.10-fpm-alpine .

# 在 Linux (x86_64) 上构建
docker build --platform linux/amd64 -t deeke/php:8.3.10-fpm-alpine .

# 运行镜像（重要：指定平台）
docker run --platform linux/amd64 deeke/php:8.3.10-fpm-alpine
```

## 运行镜像时的注意事项

**重要**: 运行镜像时，如果目标平台与当前系统不同，必须使用 `--platform` 标志：

```bash
# 在 Mac 上运行 Linux x86_64 镜像
docker run --platform linux/amd64 deeke/php:8.3.10-fpm-alpine

# 在 Linux 上运行 ARM64 镜像
docker run --platform linux/arm64 deeke/php:8.3.10-fpm-alpine
```

## Docker Compose 配置

如果使用 `docker-compose.yml`，需要添加平台配置：

```yaml
services:
  php:
    build:
      context: .
      dockerfile: Dockerfile
    platform: linux/amd64  # 或 linux/arm64
    # ... 其他配置
```

或者使用环境变量：

```yaml
services:
  php:
    build:
      context: .
      dockerfile: Dockerfile
    platform: ${DOCKER_PLATFORM:-linux/amd64}
    # ... 其他配置
```

## 多架构构建（高级）

如果需要同时支持多个架构，需要设置 Docker Buildx：

```bash
# 创建 buildx builder
docker buildx create --name multiarch-builder --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag deeke/php:8.3.10-fpm-alpine \
  --push \
  .
```

## 在 Mac 上构建 Linux 镜像的注意事项

### 性能优化

1. **启用 Rosetta 模拟**（Docker Desktop）
   - 打开 Docker Desktop
   - 进入 Settings -> General
   - 启用 "Use Rosetta for x86/amd64 emulation on Apple Silicon"
   - 这可以显著提升构建速度

2. **使用 Docker Buildx**
   - Buildx 对跨平台构建有更好的优化
   - 脚本会自动检测并使用 buildx（如果可用）

3. **构建时间**
   - 在 Mac 上构建 Linux x86_64 镜像会比原生构建慢
   - 这是正常的，因为使用了 QEMU 模拟
   - 预计构建时间：10-30 分钟（取决于网络和系统性能）

### 常见问题

**Q: 构建很慢怎么办？**  
A: 这是正常的。建议：
- 启用 Docker Desktop 的 Rosetta 支持
- 确保网络连接稳定（需要下载基础镜像和依赖）
- 考虑在 Linux 服务器上直接构建

**Q: 构建失败怎么办？**  
A: 检查：
- Docker Desktop 是否正常运行
- 是否有足够的磁盘空间
- 网络连接是否正常
- 查看构建日志中的具体错误信息

## 故障排除

### 1. 仍然出现 "exec format error"

确保：
- 构建时使用了 `--platform` 标志
- 运行镜像时也使用了 `--platform` 标志
- Docker Desktop 已启用 "Use Rosetta for x86/amd64 emulation"（如果需要在 Mac 上运行 x86_64 镜像）

### 2. 构建速度慢

在 Mac 上构建 x86_64 镜像会使用模拟，速度较慢。建议：
- 在 Linux 服务器上构建 x86_64 镜像
- 在 Mac 上只构建 ARM64 镜像

### 3. 扩展编译失败

某些扩展可能不支持某些架构。如果遇到编译错误：
- 检查扩展是否支持目标架构
- 查看构建日志中的具体错误信息

## 镜像信息

- **基础镜像**: `php:8.3.10-fpm-alpine`
- **包含扩展**: 
  - APCu
  - Redis
  - Swoole
  - Imagick
  - GD (支持 freetype, jpeg, webp, avif)
  - 以及其他常用扩展

## 支持的平台

- ✅ Linux x86_64 (amd64)
- ✅ Linux ARM64 (aarch64)
- ✅ macOS ARM64 (Apple Silicon)
- ✅ macOS x86_64 (Intel Mac)

