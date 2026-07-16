# ===============================
# Stage 1: Build extensions
# ===============================
# 支持多架构构建（ARM64 和 x86_64）
# 注意：TARGETPLATFORM 在使用 docker buildx 时自动设置，否则需要手动传递
ARG TARGETPLATFORM=linux/amd64
ARG BUILDPLATFORM
FROM --platform=${TARGETPLATFORM} php:8.3.10-fpm-alpine AS build-stage

ARG IMAGICK_VERSION=3.7.0
ARG SWOOLE_VERSION=5.1.2
ARG REDIS_VERSION=6.0.2
ARG APCU_VERSION=5.1.24

# 安装构建依赖
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    gcc g++ autoconf make libtool \
    git curl curl-dev \
    imagemagick-dev \
    freetype-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libavif-dev \
    bzip2-dev \
    gettext-dev \
    icu-dev \
    libzip-dev \
    openldap-dev \
    postgresql-dev \
    rabbitmq-c-dev \
    oniguruma-dev \
    aspell-dev \
    libxml2-dev \
    openssl-dev \
    linux-headers

# GD
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp \
    --with-avif \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        bz2 \
        calendar \
        exif \
        gd \
        gettext \
        opcache \
        pcntl \
        mysqli \
        pdo_mysql \
        pspell \
        shmop \
        soap

# APCu
RUN pecl install apcu-${APCU_VERSION} \
    && docker-php-ext-enable apcu

# Redis
RUN pecl install redis-${REDIS_VERSION} \
    && docker-php-ext-enable redis

# Swoole (自动检测并启用 openssl 和 curl 支持)
RUN pecl install swoole-${SWOOLE_VERSION} \
    && docker-php-ext-enable swoole

# Imagick
RUN curl -L https://github.com/Imagick/imagick/archive/refs/tags/${IMAGICK_VERSION}.tar.gz \
    | tar xz \
    && cd imagick-${IMAGICK_VERSION} \
    && phpize \
    && ./configure \
    && make -j$(nproc) \
    && make install \
    && docker-php-ext-enable imagick

# 清理
RUN apk del .build-deps \
    && rm -rf /tmp/* /var/cache/apk/*


# ===============================
# Stage 2: Runtime
# ===============================
# 支持多架构构建（ARM64 和 x86_64）
# 注意：TARGETPLATFORM 在使用 docker buildx 时自动设置，否则需要手动传递
ARG TARGETPLATFORM=linux/amd64
FROM --platform=${TARGETPLATFORM} php:8.3.10-fpm-alpine

LABEL org.opencontainers.image.authors="DeekeScript <miniphper@gmail.com>"

# 复制扩展
COPY --from=build-stage /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=build-stage /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

# 安装运行时依赖（⚠️ 无 dev）
RUN apk add --no-cache \
    aspell \
    aspell-libs \
    bash \
    ca-certificates \
    curl \
    freetype \
    gettext-libs \
    imagemagick \
    imagemagick-libs \
    libavif \
    libintl \
    libjpeg-turbo \
    libpng \
    libstdc++ \
    libwebp \
    libxml2 \
    libxslt \
    libzip \
    openssl \
    openssh \
    sudo \
    shadow \
    rsync \
    wget \
    zip \
    jpegoptim \
    pngquant

# PHP 配置
ADD ./php.ini /usr/local/etc/php/php.ini
ADD ./php-fpm.d/zz-docker.conf /usr/local/etc/php-fpm.d/zz-docker.conf

# Composer（官方镜像方式，使用相同平台）
# 注意：COPY --from 会自动使用相同平台的基础镜像
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

CMD ["php-fpm"]
