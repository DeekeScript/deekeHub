### DeekeHub项目部署

#### 1.1 拉取DeekeScript工具箱代码
```
sudo su
cd ~
mkdir deeketool
cd deeketool
git clone https://gitee.com/DeekeScript/tool.git ./
```

#### 1.2 进入项目下的文件
```
cd deekeHub/nginx/html
```

#### 1.3 创建项目目录
```
mkdir deeke # 这个文件夹根据实际情况，后续可能还会部署更多项目
cd deeke
```

#### 1.4 拉取源码切换到master-deeke分支
```
# 这里一般给你提供源代码，需要你自己copy到服务器，不需要执行下面两个命令

git clone https://gitee.com/DeekeScript/dke.git ./

git checkout master-deeke-laravel-swoole-deviceHub
```

#### 1.5 进入工具箱的deekeHub/docker目录
```
cd ~/deeketool/deekeHub/docker
```

#### 1.6 创建docker容器
> apt update
> apt install docker.io
> apt install docker-compose

> [如果docker没有安装成功请看这篇](./docker.md)

> nginx、mysql、php、redis、livekit、supervisor、Ubuntu服务都已经有了，不需要服务器上额外安装相关服务（如果有安装，请停止相关服务）

> 主机只需要开启80和443端口（mysql通过ssh通道连接即可，3306端口千万不要对外）
```
# 执行下面的命令

> docker-compose up -d
```

#### 1.7 php环境配置

> docker exec -it php bash  # 进入php容器

> cd deeke/php

> cp .env.example .env       # 复制.env.example文件
>
> php artisan key:generate   # 生成app_key
>
> php artisan migrate        # 创建数据库表，安装过程都选择yes执行
>
> php artisan db:seed        # 创建初始数据，包括登录账号和密码，安装过程都选择yes执行
>
> chmod -R 777 storage
>
> chmod -R 777 bootstrap/cache

#### 1.8 配置nginx

> cd ~/deeketool/deeke/nginx/conf/conf.d
>
> 编辑default.conf
>
> 重启nginx：docker restart nginx

```
server {
    listen 80;
    server_name hub.deeke.cn;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hub.deeke.cn;

    ssl_certificate     /etc/nginx/cert/hub.deeke.cn.pem;
    ssl_certificate_key /etc/nginx/cert/hub.deeke.cn.key;

    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 9;
    gzip_types
        text/plain
        application/javascript
        application/x-javascript
        text/css
        application/xml
        text/javascript
        application/json
        image/jpeg
        image/gif
        image/png;
    gzip_vary on;

    # ======================
    # 前端 Vue/React SPA
    # ======================
    root /usr/share/nginx/html/deekeHub/antd/app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # ======================
    # API -> PHP
    # ======================
    location /api/ {
        root /var/www/html/deekeHub/php/public;

        # 去掉 /api 前缀
        rewrite ^/api/(.*)$ /$1 break;

        include fastcgi_params;
        fastcgi_pass php:9000;

        fastcgi_param SCRIPT_FILENAME /var/www/html/deekeHub/php/public/index.php;
        fastcgi_param SCRIPT_NAME index.php;
    }

    # ======================
    # PHP（如果你有直接访问 php 文件的需求）
    # ======================
    location ~ \.php$ {
        root /var/www/html/deekeHub/php/public;
        include fastcgi_params;
        fastcgi_pass php:9000;

        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}

```

#### 1.9 登录地址
```
#管理员登录入口

地址：https://xxx.xx/admin/login
账号：admin
密码：admin123

```

### 2.0 系统配置

```
管理员后台中，需要配置cos、支付宝支付等配置


定时任务：* * * * * docker exec php php /var/www/html/deekeHub/php/artisan schedule:run >> /dev/null 2>&1
```

#### 问题汇总

