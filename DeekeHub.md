### DeekeHub项目部署

#### 手机安装DeekeHub客户端

> 安装前须知：因为Android端是基于局域网打包的，内部使用的地址是192.168.1.100，因此，你局域网的机器的ip地址也必须是192.168.1.100；如果确实无法调整你的机器ip，可以加群联系我们，会给你单独打包成你电脑的ip地址；另外docker/livekit.yaml文件里面的node_ip也一样必须是192.168.1.100

> 下载Android端APP：<a href='./github/v1.3.03-release.apk'>v1.3.03-release.apk</a>

#### 1.1 拉取deekeHub代码
```
sudo su
cd ~
mkdir deeketool
cd deeketool
git clone https://github.com/DeekeScript/deekeHub.git
```

#### 1.2 进入工具箱的deekeHub/docker目录
```
cd ~/deeketool/deekeHub/docker
```

#### 1.3 livekit实时画面监控服务配置
```
vim livekit.yaml

将node_ip字段改成你本机的局域网ip（如果是服务器上，直接使用外网ip）

```

#### 1.4 创建docker容器
> apt update
> apt install docker.io
> apt install docker-compose

> [如果docker没有安装成功请看这篇](./docker.md)

> nginx、mysql、php、redis、livekit、supervisor服务都已经有了，不需要服务器上额外安装相关服务（如果有安装，请停止相关服务）

> 主机只需要开启80/443/7780/9502端口（mysql通过ssh通道连接即可，3306端口千万不要对外）

```
# 执行下面的命令

> docker-compose up -d
```

#### 1.5 php环境配置

> docker exec -it php bash  # 进入php容器

> cd deekeHub/php

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

#### 1.6 配置nginx

> cd ~/deeketool/deeke/nginx/conf/conf.d
>
> 编辑default.conf
>
> 重启nginx：docker restart nginx

```

#服务器中的配置  如果是本地局域网，使用本地局域网ip即可（使用80端口）

server {
    listen 8080; #生产可以使用80或者443  局域网环境不用改这个值，否则APP请求不通
    server_name _;

    #443端口专用
    #listen 443 ssl http2;
    #server_name hub.deeke.cn;
    #ssl_certificate     /etc/nginx/cert/hub.deeke.cn.pem;
    #ssl_certificate_key /etc/nginx/cert/hub.deeke.cn.key;

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

#### 1.7 登录地址
```
#管理员登录入口

地址：https://xxx.xx/admin/login
账号：admin
密码：admin123

```

### 1.8 系统配置

```
管理员后台中，需要配置cos、支付宝支付等配置


定时任务：* * * * * docker exec php php /var/www/html/deekeHub/php/artisan schedule:run >> /dev/null 2>&1
```

#### 问题汇总

